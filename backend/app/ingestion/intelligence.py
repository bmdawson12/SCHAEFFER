"""
intelligence.py — Source Intelligence Engine

Analyzes past approved/rejected citations and review queue outcomes to:
1. Score existing sources by yield and approval rate
2. Discover domains that produce citations but aren't configured as sources
3. Learn URL patterns that lead to successful citations
4. Prioritize sources for ingestion based on historical performance
5. Suggest new deep-scraping rules based on citation URL structures
"""

import re
import logging
from collections import defaultdict
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text

from ..models import Citation, ReviewQueueItem, Source, IngestionLog

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _extract_domain(url: str) -> str:
    """Pull the domain from a URL, stripping www."""
    if not url:
        return "unknown"
    try:
        parsed = urlparse(url)
        return (parsed.netloc or "unknown").replace("www.", "")
    except Exception:
        return "unknown"


def _extract_path_pattern(url: str) -> str:
    """
    Extract a generalized path pattern from a URL.
    e.g. /sites/default/files/report-2024.pdf -> /sites/default/files/*.pdf
    """
    try:
        parsed = urlparse(url)
        path = parsed.path or "/"
        # Replace year-like numbers with wildcard
        path = re.sub(r'/\d{4}/', '/YEAR/', path)
        # Replace specific filenames but keep extension
        path = re.sub(r'/[^/]+\.pdf$', '/*.pdf', path, flags=re.I)
        path = re.sub(r'/[^/]+\.html?$', '/*.html', path, flags=re.I)
        # Replace long numeric IDs
        path = re.sub(r'/\d{3,}', '/ID', path)
        return path
    except Exception:
        return "/"


# ── Main Analysis Functions ──────────────────────────────────────────────────

async def analyze_source_performance(db: AsyncSession) -> list:
    """
    Score each configured source by how well it produces approved citations.

    Returns a list of dicts with:
    - source_id, source_name, source_url
    - total_review_items, approved, rejected, pending
    - approval_rate (0-100)
    - citation_count (confirmed citations matching this source's domain)
    - yield_score (composite score: higher = more productive)
    """
    sources = (await db.execute(select(Source).order_by(Source.name))).scalars().all()

    # Get review queue stats per source
    rq_stats = (await db.execute(
        select(
            ReviewQueueItem.source_id,
            func.count(ReviewQueueItem.id).label("total"),
            func.sum(case((ReviewQueueItem.status == "approved", 1), else_=0)).label("approved"),
            func.sum(case((ReviewQueueItem.status == "rejected", 1), else_=0)).label("rejected"),
            func.sum(case((ReviewQueueItem.status == "pending", 1), else_=0)).label("pending"),
        )
        .group_by(ReviewQueueItem.source_id)
    )).all()
    rq_map = {r[0]: r for r in rq_stats}

    # Get citation counts by domain for matching
    citations_by_domain = defaultdict(int)
    citation_links = (await db.execute(
        select(Citation.link).where(Citation.link.isnot(None))
    )).scalars().all()
    for link in citation_links:
        domain = _extract_domain(link)
        citations_by_domain[domain] += 1

    # Get latest ingestion stats per source
    ingestion_stats = (await db.execute(
        select(
            IngestionLog.source_id,
            func.sum(IngestionLog.documents_checked).label("total_docs"),
            func.sum(IngestionLog.matches_found).label("total_matches"),
            func.count(IngestionLog.id).label("run_count"),
        )
        .where(IngestionLog.source_id.isnot(None))
        .group_by(IngestionLog.source_id)
    )).all()
    ing_map = {r[0]: r for r in ingestion_stats}

    results = []
    for source in sources:
        domain = _extract_domain(source.url)
        rq = rq_map.get(source.id)
        ing = ing_map.get(source.id)

        total_rq = rq[1] if rq else 0
        approved = rq[2] if rq else 0
        rejected = rq[3] if rq else 0
        pending = rq[4] if rq else 0
        approval_rate = round((approved / (approved + rejected) * 100)) if (approved + rejected) > 0 else None

        # Count citations whose domain matches this source
        citation_count = citations_by_domain.get(domain, 0)
        # Also check partial domain matches (e.g., aging.senate.gov matches senate.gov)
        for cdom, cnt in citations_by_domain.items():
            if domain != cdom and domain in cdom:
                citation_count += cnt

        total_docs_checked = ing[1] if ing else 0
        total_matches_found = ing[2] if ing else 0
        run_count = ing[3] if ing else 0

        # Composite yield score (0-100):
        # Weighted combination of citation count, approval rate, and match rate
        yield_score = 0
        if citation_count > 0:
            yield_score += min(citation_count * 2, 50)  # up to 50 pts from historical citations
        if approval_rate is not None:
            yield_score += approval_rate * 0.3  # up to 30 pts from approval rate
        if total_rq > 0:
            yield_score += min(total_rq * 2, 20)  # up to 20 pts from review queue activity

        results.append({
            "source_id": source.id,
            "source_name": source.name,
            "source_url": source.url,
            "is_enabled": source.is_enabled,
            "domain": domain,
            # Review queue stats
            "total_review_items": total_rq,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "approval_rate": approval_rate,
            # Citation stats
            "citation_count": citation_count,
            # Ingestion stats
            "total_docs_checked": total_docs_checked,
            "total_matches_found": total_matches_found,
            "run_count": run_count,
            # Composite score
            "yield_score": round(yield_score, 1),
        })

    # Sort by yield score descending
    results.sort(key=lambda x: x["yield_score"], reverse=True)
    return results


async def discover_uncovered_domains(db: AsyncSession) -> list:
    """
    Find domains that appear in confirmed citations but don't have
    a configured source. These are missed opportunities.

    Returns list of dicts with:
    - domain, citation_count, sample_urls, sample_publishers
    - suggested_source_type, suggested_name
    """
    # Get all configured source domains
    sources = (await db.execute(select(Source))).scalars().all()
    source_domains = set()
    for s in sources:
        d = _extract_domain(s.url)
        source_domains.add(d)
        # Also add parent domains (e.g., aging.senate.gov -> senate.gov)
        parts = d.split(".")
        if len(parts) > 2:
            source_domains.add(".".join(parts[-2:]))

    # Get all citation links grouped by domain
    citations = (await db.execute(
        select(Citation.link, Citation.publisher, Citation.cited_in)
        .where(Citation.link.isnot(None))
    )).all()

    domain_data = defaultdict(lambda: {"count": 0, "urls": set(), "publishers": set()})
    for link, publisher, cited_in in citations:
        domain = _extract_domain(link)
        if domain == "unknown":
            continue

        # Check if this domain is covered by any configured source
        is_covered = False
        for sd in source_domains:
            if sd in domain or domain in sd:
                is_covered = True
                break

        if not is_covered:
            domain_data[domain]["count"] += 1
            if len(domain_data[domain]["urls"]) < 5:
                domain_data[domain]["urls"].add(link)
            if publisher:
                domain_data[domain]["publishers"].add(publisher)

    # Build results, sorted by citation count
    results = []
    for domain, data in sorted(domain_data.items(), key=lambda x: x[1]["count"], reverse=True):
        if data["count"] < 1:
            continue

        # Guess the best source type
        is_gov = domain.endswith((".gov", ".senate.gov", ".house.gov"))
        suggested_type = "scrape" if is_gov else "scrape"

        # Suggest a name from publisher or domain
        publishers = list(data["publishers"])
        suggested_name = publishers[0] if publishers else domain.replace(".", " ").title()

        # Analyze URL patterns to suggest deep scraping rules
        url_patterns = set()
        for url in data["urls"]:
            pattern = _extract_path_pattern(url)
            url_patterns.add(pattern)

        results.append({
            "domain": domain,
            "citation_count": data["count"],
            "sample_urls": list(data["urls"])[:3],
            "publishers": publishers[:3],
            "suggested_name": suggested_name,
            "suggested_type": suggested_type,
            "suggested_url": f"https://{domain}/",
            "url_patterns": list(url_patterns)[:5],
        })

    return results


async def analyze_url_patterns(db: AsyncSession) -> list:
    """
    Analyze URL path patterns in confirmed citations to identify
    the most productive document locations.

    Groups citations by path pattern and returns the most productive ones.
    This helps tune deep scraper configs.
    """
    citations = (await db.execute(
        select(Citation.link, Citation.publisher)
        .where(Citation.link.isnot(None))
    )).all()

    pattern_data = defaultdict(lambda: {"count": 0, "domains": set(), "publishers": set()})
    for link, publisher in citations:
        domain = _extract_domain(link)
        pattern = _extract_path_pattern(link)
        key = f"{domain}{pattern}"

        pattern_data[key]["count"] += 1
        pattern_data[key]["domains"].add(domain)
        if publisher:
            pattern_data[key]["publishers"].add(publisher)

    results = []
    for pattern, data in sorted(pattern_data.items(), key=lambda x: x[1]["count"], reverse=True):
        if data["count"] < 2:
            continue
        results.append({
            "pattern": pattern,
            "citation_count": data["count"],
            "domains": list(data["domains"]),
            "publishers": list(data["publishers"])[:3],
        })

    return results[:30]


async def get_ingestion_priority_order(db: AsyncSession) -> list:
    """
    Return source IDs in optimal processing order for ingestion.

    Priority factors:
    1. Historical citation yield (more citations = higher priority)
    2. Approval rate (higher approval = more valuable)
    3. Time since last check (stale sources get a boost)
    4. Pending items (sources with pending items may have more to find)
    """
    performance = await analyze_source_performance(db)

    # Filter to enabled sources only
    enabled = [p for p in performance if p["is_enabled"]]

    # Already sorted by yield_score from analyze_source_performance
    return [p["source_id"] for p in enabled]


async def get_full_intelligence_report(db: AsyncSession) -> dict:
    """
    Generate a comprehensive intelligence report combining all analyses.
    This is the main entry point for the API.
    """
    source_performance = await analyze_source_performance(db)
    uncovered_domains = await discover_uncovered_domains(db)
    url_patterns = await analyze_url_patterns(db)
    priority_order = await get_ingestion_priority_order(db)

    # Compute summary stats
    total_sources = len(source_performance)
    active_sources = sum(1 for s in source_performance if s["yield_score"] > 0)
    top_performers = [s for s in source_performance if s["yield_score"] >= 30]
    underperformers = [s for s in source_performance if s["is_enabled"] and s["yield_score"] == 0]

    total_uncovered = sum(d["citation_count"] for d in uncovered_domains)

    return {
        "summary": {
            "total_sources": total_sources,
            "active_sources": active_sources,
            "top_performers_count": len(top_performers),
            "underperformer_count": len(underperformers),
            "uncovered_domains": len(uncovered_domains),
            "uncovered_citations": total_uncovered,
        },
        "source_performance": source_performance,
        "uncovered_domains": uncovered_domains,
        "url_patterns": url_patterns,
        "priority_order": priority_order,
    }
