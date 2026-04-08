from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional
import io
import csv

from ..database import get_db
from ..models import Citation
from ..schemas import CitationCreate, CitationUpdate, CitationOut

router = APIRouter()


def build_filters(
    faculty: Optional[str],
    publisher: Optional[str],
    policy_area: Optional[str],
    citation_type: Optional[str],
    year_gov: Optional[int],
    year_pub: Optional[int],
    search: Optional[str],
):
    filters = []
    if faculty:
        filters.append(Citation.faculty.ilike(f"%{faculty}%"))
    if publisher:
        filters.append(Citation.publisher.ilike(f"%{publisher}%"))
    if policy_area:
        filters.append(Citation.policy_area.ilike(f"%{policy_area}%"))
    if citation_type:
        filters.append(Citation.citation_type.ilike(f"%{citation_type}%"))
    if year_gov:
        filters.append(Citation.year_of_government_publication == year_gov)
    if year_pub:
        filters.append(Citation.year_of_publication_cited == year_pub)
    if search:
        filters.append(or_(
            Citation.title_of_paper.ilike(f"%{search}%"),
            Citation.cited_in.ilike(f"%{search}%"),
            Citation.faculty.ilike(f"%{search}%"),
            Citation.short_research_tag.ilike(f"%{search}%"),
        ))
    return filters


@router.get("/", response_model=dict)
async def list_citations(
    faculty: Optional[str] = None,
    publisher: Optional[str] = None,
    policy_area: Optional[str] = None,
    citation_type: Optional[str] = None,
    year_gov: Optional[int] = None,
    year_pub: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    filters = build_filters(faculty, publisher, policy_area, citation_type, year_gov, year_pub, search)
    query = select(Citation)
    if filters:
        query = query.where(and_(*filters))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Citation.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [CitationOut.model_validate(c) for c in items],
    }


@router.post("/", response_model=CitationOut, status_code=201)
async def create_citation(data: CitationCreate, db: AsyncSession = Depends(get_db)):
    citation = Citation(**data.model_dump())
    db.add(citation)
    await db.commit()
    await db.refresh(citation)
    return citation


@router.get("/export")
async def export_citations(
    faculty: Optional[str] = None,
    publisher: Optional[str] = None,
    policy_area: Optional[str] = None,
    citation_type: Optional[str] = None,
    year_gov: Optional[int] = None,
    year_pub: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    filters = build_filters(faculty, publisher, policy_area, citation_type, year_gov, year_pub, search)
    query = select(Citation)
    if filters:
        query = query.where(and_(*filters))
    result = await db.execute(query.order_by(Citation.created_at.desc()))
    citations = result.scalars().all()

    fields = [
        "id", "short_research_tag", "citation_type", "title_of_paper",
        "publication_cited", "year_of_publication_cited", "faculty",
        "cited_in", "year_of_government_publication", "publisher",
        "link", "policy_area", "notes", "created_at",
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for c in citations:
        writer.writerow({
            "id": c.id,
            "short_research_tag": c.short_research_tag or "",
            "citation_type": c.citation_type or "",
            "title_of_paper": c.title_of_paper or "",
            "publication_cited": c.publication_cited or "",
            "year_of_publication_cited": c.year_of_publication_cited or "",
            "faculty": c.faculty,
            "cited_in": c.cited_in or "",
            "year_of_government_publication": c.year_of_government_publication or "",
            "publisher": c.publisher or "",
            "link": c.link or "",
            "policy_area": c.policy_area or "",
            "notes": c.notes or "",
            "created_at": c.created_at.isoformat() if c.created_at else "",
        })

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="citations_export.csv"'},
    )


@router.get("/{citation_id}", response_model=CitationOut)
async def get_citation(citation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Citation).where(Citation.id == citation_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Citation not found")
    return c


@router.put("/{citation_id}", response_model=CitationOut)
async def update_citation(citation_id: int, data: CitationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Citation).where(Citation.id == citation_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Citation not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(c, key, value)
    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/{citation_id}")
async def delete_citation(citation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Citation).where(Citation.id == citation_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Citation not found")
    await db.delete(c)
    await db.commit()
    return {"ok": True}
