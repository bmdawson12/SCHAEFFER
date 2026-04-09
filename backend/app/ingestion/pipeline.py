"""
pipeline.py — Runs the 3-phase citation ingestion pipeline.

Phase 1: RSS feeds + shallow scrape  (fast, covers all sources)
Phase 2: Deep scraping               (follows links, reads PDFs per source)
Phase 3: Google search               (optional, disabled by default)

All matches go to the review_queue table — nothing is auto-approved.
A human must approve each match in the Review Queue before it becomes a Citation.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import logging

import httpx
from bs4 import BeautifulSoup

from ..models import Source, ReviewQueueItem, IngestionLog, Person, Citation
from .fetchers import get_fetcher, make_fingerprint
from .deep_scraper import deep_scrape_source
from .pdf_parser import extract_text_from_pdf
from .name_matcher import find_name_matches

logger = logging.getLogger(__name__)

# ── Config flags ───────────────────────────────────────────────────────────────
# Set ENABLE_GOOGLE_SEARCH = True to enable Phase 3 (Google search).
# Keep it False by default — Google will block/rate-limit heavy use.
ENABLE_GOOGLE_SEARCH = False

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CitationMonitor/2.0)"
}


# ── Deduplication ──────────────────────────────────────────────────────────────

async def _is_duplicate(db: AsyncSession, faculty: str, url: str) -> bool:
    """
    Check whether we already have this faculty+URL in the review queue or citations.
    We use the fingerprint (normalized URL hash) for comparison.
    """
    if not url:
        return False

    fp = make_fingerprint(url)

    # Check review queue
    rq = (await db.execute(
        select(ReviewQueueItem).where(
            ReviewQueueItem.faculty == faculty,
            ReviewQueueItem.link == url,
        )
    )).scalar_one_or_none()
    if rq:
        return True

    # Check confirmed citations
    ct = (await db.execute(
        select(Citation).where(
            Citation.faculty == faculty,
            Citation.link == url,
        )
    )).scalar_one_or_none()
    return ct is not None


# ── Document processing ────────────────────────────────────────────────────────

async def _fetch_html_text(url: str) -> str:
    """
    Download a web page and return the visible text content.
    Strips nav/header/footer/script/style tags to get just the body.
    Returns empty string on any failure.
    """
    try:
        async with httpx.AsyncClient(
            timeout=25, follow_redirects=True, headers=HTTP_HEADERS
        ) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return ""
            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type:
                return ""
            soup = BeautifulSoup(resp.text, "lxml")
            # Remove boilerplate sections
            for tag in soup.select("nav, header, footer, script, style, aside"):
                tag.decompose()
            return soup.get_text(separator=" ", strip=True)
    except Exception as e:
        logger.debug(f"  HTML fetch failed: {url[:80]}: {e}")
        return ""


async def _process_document(
    db: AsyncSession,
    doc: dict,
    people: List[dict],
    source_name: str,
    source_id: Optional[int],
) -> int:
    """
    Process a single document through the full pipeline:
    1. Get text (from doc dict, or fetch PDF/HTML if needed)
    2. Run fuzzy name matching
    3. Save new matches to the review queue

    Returns the number of new matches added.
    """
    url = doc.get("url", "")
    text = doc.get("text_content", "") or ""

    # Determine if this is a PDF (from flag or URL pattern)
    is_pdf = doc.get("is_pdf", False)

    # ── Step 1: Get text content ───────────────────────────────────────────
    if is_pdf and not text:
        # Download and extract PDF text
        try:
            pdf_text = await extract_text_from_pdf(url)
            if pdf_text:
                text = pdf_text
                logger.info(f"  PDF extracted: {url[:80]} ({len(pdf_text):,} chars)")
        except Exception as e:
            logger.warning(f"  PDF extraction failed: {url[:80]}: {e}")

    elif doc.get("needs_fetch") and not text:
        # Download HTML page and strip boilerplate
        text = await _fetch_html_text(url)
        if text:
            logger.debug(f"  HTML fetched: {url[:80]} ({len(text):,} chars)")

    # Skip documents with too little text — not worth matching
    if not text or len(text.strip()) < 50:
        return 0

    # ── Step 2: Run name matching ──────────────────────────────────────────
    matches = find_name_matches(text, people)

    # ── Step 3: Save new matches to review queue ───────────────────────────
    new_matches = 0
    for match in matches:
        # Skip if this person+document is already queued or confirmed
        if await _is_duplicate(db, match["faculty"], url):
            continue

        item = ReviewQueueItem(
            # Who was found
            faculty=match["faculty"],
            person_id=match.get("person_id"),
            # Where they were found
            cited_in=(doc.get("title") or "")[:500],
            year_of_government_publication=doc.get("year"),
            publisher=doc.get("publisher") or source_name,
            link=url,
            # Detection evidence
            matched_text=(match.get("matched_text") or "")[:2000],
            confidence_score=match["confidence_score"],
            source_id=source_id,
            status="pending",
        )
        db.add(item)
        new_matches += 1
        logger.info(
            f"  MATCH: {match['faculty']} in '{(doc.get('title') or url)[:60]}' "
            f"(score={match['confidence_score']:.0f}, via: {match.get('context_reason', '')})"
        )

    if new_matches > 0:
        await db.commit()

    return new_matches


# ── Main pipeline ──────────────────────────────────────────────────────────────

async def run_ingestion_pipeline(
    db: AsyncSession,
    source_ids: Optional[list] = None,
) -> dict:
    """
    Run the full ingestion pipeline for all enabled sources (or a subset).
    Returns a summary dict with counts per phase.
    """

    # ── Load sources ───────────────────────────────────────────────────────
    query = select(Source).where(Source.is_enabled == True)
    if source_ids:
        query = query.where(Source.id.in_(source_ids))
    sources = (await db.execute(query)).scalars().all()

    if not sources:
        logger.warning("No enabled sources found — nothing to do")
        return {"sources_processed": 0, "documents_checked": 0, "matches_found": 0}

    # ── Load active people ─────────────────────────────────────────────────
    people_rows = (
        await db.execute(select(Person).where(Person.is_active == True))
    ).scalars().all()
    people = [
        {
            "id": p.id,
            "full_name": p.full_name,
            "name_variations": p.name_variations or [],
            "title": p.title,
        }
        for p in people_rows
    ]

    if not people:
        logger.warning("No active people in database — skipping ingestion")
        return {"error": "No people configured"}

    logger.info(
        f"Starting ingestion: {len(sources)} sources, {len(people)} people"
    )

    # Track counts per phase
    p1_docs = p1_matches = 0
    p2_docs = p2_matches = 0
    p3_docs = p3_matches = 0

    # ══════════════════════════════════════════════════════════════════════
    # PHASE 1 — RSS feeds + shallow scrape (one log entry per source)
    # ══════════════════════════════════════════════════════════════════════
    logger.info(f"=== Phase 1: RSS/scrape ({len(sources)} sources) ===")

    for source in sources:
        # Create a log entry so the UI can show progress
        log = IngestionLog(
            source_id=source.id,
            source_name=source.name,
            started_at=datetime.utcnow(),
            status="running",
        )
        db.add(log)
        await db.commit()

        docs_count = 0
        matches_count = 0

        try:
            cfg = {
                "db_id": source.id,
                "name": source.name,
                "url": source.url,
                "source_type": source.source_type,
                "config": source.config or {},
            }
            fetcher = get_fetcher(cfg)
            documents = await fetcher.fetch()
            docs_count = len(documents)
            logger.info(f"  [{source.name}] {docs_count} documents found")

            for doc in documents:
                m = await _process_document(
                    db, doc, people, source.name, source.id
                )
                matches_count += m

            # Mark source as checked
            source.last_checked = datetime.utcnow()
            log.status = "completed"
            log.completed_at = datetime.utcnow()
            log.documents_checked = docs_count
            log.matches_found = matches_count
            await db.commit()

        except Exception as e:
            logger.error(f"  Phase 1 error [{source.name}]: {e}", exc_info=True)
            log.status = "failed"
            log.error_message = str(e)[:500]
            log.completed_at = datetime.utcnow()
            await db.commit()
            # Continue with next source — one failure shouldn't stop everything
            continue

        p1_docs += docs_count
        p1_matches += matches_count

    logger.info(f"  Phase 1 done: {p1_docs} docs, {p1_matches} matches")

    # ══════════════════════════════════════════════════════════════════════
    # PHASE 2 — Deep scraping (follows links inside high-value sources)
    # ══════════════════════════════════════════════════════════════════════
    logger.info("=== Phase 2: Deep scraping ===")

    deep_log = IngestionLog(
        source_name="Deep Scraper",
        started_at=datetime.utcnow(),
        status="running",
    )
    db.add(deep_log)
    await db.commit()

    try:
        for source in sources:
            try:
                docs = await deep_scrape_source(
                    source.name, source.url, source.id, source.config or {}
                )
                p2_docs += len(docs)
                logger.info(f"  [{source.name}] deep: {len(docs)} docs")

                for doc in docs:
                    m = await _process_document(
                        db, doc, people, source.name, source.id
                    )
                    p2_matches += m

            except Exception as e:
                # Log but keep going — one broken source shouldn't stop others
                logger.warning(f"  Deep scrape error [{source.name}]: {e}")
                continue

        deep_log.status = "completed"
        deep_log.completed_at = datetime.utcnow()
        deep_log.documents_checked = p2_docs
        deep_log.matches_found = p2_matches
        await db.commit()

    except Exception as e:
        logger.error(f"Phase 2 error: {e}", exc_info=True)
        deep_log.status = "failed"
        deep_log.error_message = str(e)[:500]
        deep_log.completed_at = datetime.utcnow()
        await db.commit()

    logger.info(f"  Phase 2 done: {p2_docs} docs, {p2_matches} matches")

    # ══════════════════════════════════════════════════════════════════════
    # PHASE 3 — Google search (disabled by default)
    # ══════════════════════════════════════════════════════════════════════
    if ENABLE_GOOGLE_SEARCH:
        logger.info(f"=== Phase 3: Google search ({len(people)} people) ===")
        from .google_search import run_google_search

        google_log = IngestionLog(
            source_name="Google Search",
            started_at=datetime.utcnow(),
            status="running",
        )
        db.add(google_log)
        await db.commit()

        try:
            google_results = await run_google_search(people)
            p3_docs = len(google_results)

            for doc in google_results:
                m = await _process_document(
                    db, doc, people, "Google Search", None
                )
                p3_matches += m

            google_log.status = "completed"
            google_log.completed_at = datetime.utcnow()
            google_log.documents_checked = p3_docs
            google_log.matches_found = p3_matches
            await db.commit()

        except Exception as e:
            logger.error(f"Phase 3 error: {e}", exc_info=True)
            google_log.status = "failed"
            google_log.error_message = str(e)[:500]
            google_log.completed_at = datetime.utcnow()
            await db.commit()

        logger.info(f"  Phase 3 done: {p3_docs} docs, {p3_matches} matches")
    else:
        logger.info("=== Phase 3: Google search disabled (ENABLE_GOOGLE_SEARCH=False) ===")

    # ══════════════════════════════════════════════════════════════════════
    # Summary
    # ══════════════════════════════════════════════════════════════════════
    total_docs = p1_docs + p2_docs + p3_docs
    total_matches = p1_matches + p2_matches + p3_matches

    logger.info(
        f"=== Ingestion complete: {total_docs} docs checked, "
        f"{total_matches} new matches added to review queue ==="
    )

    return {
        "sources_processed": len(sources),
        "documents_checked": total_docs,
        "matches_found": total_matches,
        "breakdown": {
            "phase1_rss_scrape":  {"docs": p1_docs,  "matches": p1_matches},
            "phase2_deep_scrape": {"docs": p2_docs,  "matches": p2_matches},
            "phase3_google":      {"docs": p3_docs,  "matches": p3_matches},
        },
    }
