from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from typing import Optional
from datetime import datetime, timedelta

from ..database import get_db
<<<<<<< HEAD
from ..models import Citation, ReviewQueueItem, Person, Source
=======
from ..models import Citation, ReviewQueueItem, Person, Source, IngestionLog
>>>>>>> f3759bd (initial commit)
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

<<<<<<< HEAD
=======
    # Last ingestion run
    last_ingestion_result = await db.execute(
        select(IngestionLog)
        .where(IngestionLog.status.in_(["completed", "failed"]))
        .order_by(IngestionLog.completed_at.desc())
        .limit(1)
    )
    last_ingestion_row = last_ingestion_result.scalar_one_or_none()
    last_ingestion = None
    if last_ingestion_row:
        last_ingestion = {
            "completed_at": last_ingestion_row.completed_at.isoformat() if last_ingestion_row.completed_at else None,
            "status": last_ingestion_row.status,
            "documents_checked": last_ingestion_row.documents_checked,
            "matches_found": last_ingestion_row.matches_found,
        }

>>>>>>> f3759bd (initial commit)
    return {
        "total_citations": total_citations,
        "pending_review": pending_review,
        "total_people": total_people,
        "total_sources": total_sources,
        "recent_citations": recent_citations,
        "top_faculty": top_faculty,
<<<<<<< HEAD
=======
        "last_ingestion": last_ingestion,
>>>>>>> f3759bd (initial commit)
    }


@router.get("/citations-over-time")
async def citations_over_time(
    period: Optional[str] = Query("12m", description="12m, 24m, or 5y"),
    db: AsyncSession = Depends(get_db),
):
<<<<<<< HEAD
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
=======
    """
    Return citation counts grouped by year_of_government_publication.
    This shows when government documents cited our research, NOT when
    we imported them into the database.
    """
    now = datetime.utcnow()

    if period == "all":
        start_year = None
    elif period == "10y":
        start_year = now.year - 10
    elif period == "5y":
        start_year = now.year - 5
    else:  # 1y
        start_year = now.year - 1

    # Group by government publication year
    query = (
        select(
            Citation.year_of_government_publication.label("yr"),
            func.count(Citation.id).label("cnt"),
        )
        .where(Citation.year_of_government_publication.isnot(None))
        .group_by(Citation.year_of_government_publication)
        .order_by(Citation.year_of_government_publication)
    )
    if start_year is not None:
        query = query.where(Citation.year_of_government_publication >= start_year)

    result = await db.execute(query)
    rows = result.all()

    labels = []
    data = []
    for r in rows:
        labels.append(str(int(r.yr)))
        data.append(r.cnt)
>>>>>>> f3759bd (initial commit)

    return {"labels": labels, "data": data}


@router.get("/filter-options")
async def get_filter_options(db: AsyncSession = Depends(get_db)):
    """Return distinct values for filter dropdowns."""
    faculty = (await db.execute(select(Citation.faculty).distinct().order_by(Citation.faculty))).scalars().all()
    publishers = (await db.execute(select(Citation.publisher).distinct().where(Citation.publisher.isnot(None)).order_by(Citation.publisher))).scalars().all()
    policy_areas = (await db.execute(select(Citation.policy_area).distinct().where(Citation.policy_area.isnot(None)).order_by(Citation.policy_area))).scalars().all()
    types = (await db.execute(select(Citation.citation_type).distinct().where(Citation.citation_type.isnot(None)).order_by(Citation.citation_type))).scalars().all()

<<<<<<< HEAD
    return {
        "faculty": list(faculty),
        "publishers": list(publishers),
        "policy_areas": list(policy_areas),
        "types": list(types),
=======
    tags = (await db.execute(select(Citation.short_research_tag).distinct().where(Citation.short_research_tag.isnot(None)).order_by(Citation.short_research_tag))).scalars().all()
    years_gov = (await db.execute(select(Citation.year_of_government_publication).distinct().where(Citation.year_of_government_publication.isnot(None)).order_by(Citation.year_of_government_publication.desc()))).scalars().all()
    years_pub = (await db.execute(select(Citation.year_of_publication_cited).distinct().where(Citation.year_of_publication_cited.isnot(None)).order_by(Citation.year_of_publication_cited.desc()))).scalars().all()

    # Filter out empty strings from all lists
    def clean(lst):
        return [x for x in lst if x and str(x).strip()]

    return {
        "faculty": clean(faculty),
        "publishers": clean(publishers),
        "policy_areas": clean(policy_areas),
        "types": clean(types),
        "tags": clean(tags),
        "years_gov": [int(y) for y in years_gov if y],
        "years_pub": [int(y) for y in years_pub if y],
>>>>>>> f3759bd (initial commit)
    }
