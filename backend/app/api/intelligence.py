"""
API endpoints for the Source Intelligence engine.
Exposes insights about source performance and discovery recommendations.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Source
from ..ingestion.intelligence import (
    get_full_intelligence_report,
    analyze_source_performance,
    discover_uncovered_domains,
    get_ingestion_priority_order,
)

router = APIRouter()


@router.get("/report")
async def intelligence_report(db: AsyncSession = Depends(get_db)):
    """Full intelligence report — source scores, gaps, and recommendations."""
    return await get_full_intelligence_report(db)


@router.get("/source-scores")
async def source_scores(db: AsyncSession = Depends(get_db)):
    """Score each configured source by historical performance."""
    return await analyze_source_performance(db)


@router.get("/gaps")
async def discovery_gaps(db: AsyncSession = Depends(get_db)):
    """Find domains producing citations that aren't configured as sources."""
    return await discover_uncovered_domains(db)


@router.get("/priority")
async def ingestion_priority(db: AsyncSession = Depends(get_db)):
    """Get optimal source processing order for next ingestion run."""
    return await get_ingestion_priority_order(db)


@router.post("/add-suggested-source")
async def add_suggested_source(
    domain: str,
    name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Quick-add a source from an intelligence suggestion.
    Accepts a domain and optional name, creates a new scrape source.
    """
    # Check if source already exists for this domain
    existing = (await db.execute(select(Source))).scalars().all()
    for s in existing:
        if domain in s.url:
            raise HTTPException(400, f"Source already exists for this domain: {s.name}")

    url = f"https://{domain}/"
    source = Source(
        name=name or domain.replace(".", " ").title(),
        url=url,
        source_type="scrape",
        agency_group="federal" if domain.endswith(".gov") else "other",
        is_enabled=True,
        check_frequency="daily",
        config={},
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return {"ok": True, "source_id": source.id, "name": source.name}
