from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional

from ..database import get_db
from ..models import ReviewQueueItem, Citation
from ..schemas import ReviewQueueItemOut, ReviewQueueItemUpdate

router = APIRouter()


@router.get("/", response_model=dict)
async def list_review_queue(
    status: Optional[str] = "pending",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(ReviewQueueItem)
    if status:
        query = query.where(ReviewQueueItem.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

<<<<<<< HEAD
    query = query.order_by(ReviewQueueItem.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
=======
    query = query.order_by(ReviewQueueItem.confidence_score.desc().nullslast(), ReviewQueueItem.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
>>>>>>> f3759bd (initial commit)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [ReviewQueueItemOut.model_validate(i) for i in items],
    }


@router.get("/{item_id}", response_model=ReviewQueueItemOut)
async def get_review_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReviewQueueItem).where(ReviewQueueItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Review queue item not found")
    return item


@router.put("/{item_id}", response_model=ReviewQueueItemOut)
async def update_review_item(item_id: int, data: ReviewQueueItemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReviewQueueItem).where(ReviewQueueItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Review queue item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/{item_id}/approve", response_model=dict)
async def approve_review_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Approve a review queue item — promotes it to a confirmed citation."""
    result = await db.execute(select(ReviewQueueItem).where(ReviewQueueItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Review queue item not found")

    citation = Citation(
        short_research_tag=item.short_research_tag,
        citation_type=item.citation_type,
        title_of_paper=item.title_of_paper,
        publication_cited=item.publication_cited,
        year_of_publication_cited=item.year_of_publication_cited,
        faculty=item.faculty,
        cited_in=item.cited_in,
        year_of_government_publication=item.year_of_government_publication,
        publisher=item.publisher,
        link=item.link,
        policy_area=item.policy_area,
        notes=item.notes,
        is_auto_detected=True,
    )
    db.add(citation)
    item.status = "approved"
    await db.commit()
    await db.refresh(citation)
    return {"ok": True, "citation_id": citation.id}


@router.post("/{item_id}/reject")
async def reject_review_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReviewQueueItem).where(ReviewQueueItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Review queue item not found")
    item.status = "rejected"
    await db.commit()
    return {"ok": True}
