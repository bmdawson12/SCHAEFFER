from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from typing import Optional
from datetime import datetime, timedelta

from ..database import get_db
from ..models import Citation, ReviewQueueItem, Person, Source
from ..schemas import CitationOut

router = APIRouter()


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    total_citations = (await db.execute(select(func.count(Citation.id)))).scalar()
    pending_review = (
        await db.execute(
            select(func.count(ReviewQueueItem.id)).where(ReviewQueueItem.status == "pending")
        )
    ).scalar()
    total_people = (
        await db.execute(select(func.count(Person.id)).where(Person.is_active == True))
    ).scalar()
    total_sources = (
        await db.execute(select(func.count(Source.id)).where(Source.is_enabled == True))
    ).scalar()

    recent_result = await db.execute(
        select(Citation).order_by(Citation.created_at.desc()).limit(10)
    )
    recent_citations = [CitationOut.model_validate(c) for c in recent_result.scalars().all()]

    top_faculty_result = await db.execute(
        select(Citation.faculty, func.count(Citation.id).label("count"))
        .group_by(Citation.faculty)
        .order_by(func.count(Citation.id).desc())
        .limit(10)
    )
    top_faculty = [{"faculty": r[0], "count": r[1]} for r in top_faculty_result]

    return {
        "total_citations": total_citations,
        "pending_review": pending_review,
        "total_people": total_people,
        "total_sources": total_sources,
        "recent_citations": recent_citations,
        "top_faculty": top_faculty,
    }


@router.get("/citations-over-time")
async def citations_over_time(
    period: Optional[str] = Query("12m", description="12m, 24m, or 5y"),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()

    if period == "5y":
        months = 60
    elif period == "24m":
        months = 24
    else:
        months = 12

    start = now - timedelta(days=months * 30)

    result = await db.execute(
        select(
            extract("year", Citation.created_at).label("yr"),
            extract("month", Citation.created_at).label("mo"),
            func.count(Citation.id).label("cnt"),
        )
        .where(Citation.created_at >= start)
        .group_by("yr", "mo")
        .order_by("yr", "mo")
    )
    rows = result.all()

    row_map = {(int(r.yr), int(r.mo)): r.cnt for r in rows}
    labels = []
    data = []
    cursor = start.replace(day=1)
    while cursor <= now:
        labels.append(cursor.strftime("%b %Y"))
        data.append(row_map.get((cursor.year, cursor.month), 0))
        # advance one month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    return {"labels": labels, "data": data}


@router.get("/filter-options")
async def get_filter_options(db: AsyncSession = Depends(get_db)):
    """Return distinct values for filter dropdowns."""
    faculty = (await db.execute(select(Citation.faculty).distinct().order_by(Citation.faculty))).scalars().all()
    publishers = (await db.execute(select(Citation.publisher).distinct().where(Citation.publisher.isnot(None)).order_by(Citation.publisher))).scalars().all()
    policy_areas = (await db.execute(select(Citation.policy_area).distinct().where(Citation.policy_area.isnot(None)).order_by(Citation.policy_area))).scalars().all()
    types = (await db.execute(select(Citation.citation_type).distinct().where(Citation.citation_type.isnot(None)).order_by(Citation.citation_type))).scalars().all()

    return {
        "faculty": list(faculty),
        "publishers": list(publishers),
        "policy_areas": list(policy_areas),
        "types": list(types),
    }
