from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import logging

from ..models import Source, ReviewQueueItem, IngestionLog, Person
from .fetchers import get_fetcher
from .pdf_parser import extract_text_from_pdf
from .name_matcher import find_name_matches

logger = logging.getLogger(__name__)


async def run_ingestion_pipeline(db: AsyncSession, source_ids: Optional[list] = None) -> dict:
    """
    Run the ingestion pipeline for all enabled sources (or a specific subset).
    For each document fetched:
      1. Optionally extract PDF text
      2. Run fuzzy name matching against all active people
      3. Push new matches to the review queue
    """
    # Load sources
    query = select(Source).where(Source.is_enabled == True)
    if source_ids:
        query = query.where(Source.id.in_(source_ids))
    sources = (await db.execute(query)).scalars().all()

    if not sources:
        return {"sources_processed": 0, "documents_checked": 0, "matches_found": 0}

    # Load people
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

    total_docs = 0
    total_matches = 0

    for source in sources:
        log = IngestionLog(
            source_id=source.id,
            source_name=source.name,
            started_at=datetime.utcnow(),
            status="running",
        )
        db.add(log)
        await db.commit()

        docs_this_source = 0
        matches_this_source = 0

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
            docs_this_source = len(documents)

            for doc in documents:
                text = doc.get("text_content", "")

                # Extract PDF text if configured
                url = doc.get("url", "")
                should_extract_pdf = (
                    source.config.get("pdf_extract", False)
                    and url.lower().endswith(".pdf")
                )
                if should_extract_pdf:
                    try:
                        pdf_text = await extract_text_from_pdf(url)
                        if pdf_text:
                            text = pdf_text
                    except Exception as e:
                        logger.warning(f"PDF extraction failed for {url}: {e}")

                if not text.strip():
                    continue

                name_matches = find_name_matches(text, people)

                for match in name_matches:
                    # Deduplicate: skip if same person + link already in queue
                    existing = (
                        await db.execute(
                            select(ReviewQueueItem).where(
                                ReviewQueueItem.faculty == match["faculty"],
                                ReviewQueueItem.link == url,
                            )
                        )
                    ).scalar_one_or_none()
                    if existing:
                        continue

                    item = ReviewQueueItem(
                        faculty=match["faculty"],
                        cited_in=doc.get("title", ""),
                        year_of_government_publication=doc.get("year"),
                        publisher=source.name,
                        link=url,
                        matched_text=match["matched_text"][:2000] if match["matched_text"] else None,
                        confidence_score=match["confidence_score"],
                        source_id=source.id,
                        status="pending",
                    )
                    db.add(item)
                    matches_this_source += 1

            await db.commit()

            source.last_checked = datetime.utcnow()
            log.status = "completed"
            log.completed_at = datetime.utcnow()
            log.documents_checked = docs_this_source
            log.matches_found = matches_this_source
            await db.commit()

            total_docs += docs_this_source
            total_matches += matches_this_source
            logger.info(
                f"[{source.name}] {docs_this_source} docs, {matches_this_source} matches"
            )

        except Exception as e:
            logger.error(f"Error processing source '{source.name}': {e}", exc_info=True)
            log.status = "failed"
            log.error_message = str(e)
            log.completed_at = datetime.utcnow()
            await db.commit()

    return {
        "sources_processed": len(sources),
        "documents_checked": total_docs,
        "matches_found": total_matches,
    }
