from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import asyncio

from ..database import get_db, AsyncSessionLocal
from ..models import IngestionLog
from ..schemas import IngestionLogOut, IngestionRunRequest
from ..ingestion import run_ingestion_pipeline

router = APIRouter()

_running = False


@router.post("/run")
async def trigger_ingestion(
    data: IngestionRunRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    global _running
    if _running:
        return {"status": "already_running", "message": "Ingestion is already in progress"}

    background_tasks.add_task(run_ingestion_background, data.source_ids)
    return {"status": "started", "message": "Ingestion pipeline started in background"}


async def run_ingestion_background(source_ids=None):
    global _running
    _running = True
    try:
        async with AsyncSessionLocal() as db:
            await run_ingestion_pipeline(db, source_ids)
    finally:
        _running = False


@router.get("/status")
async def ingestion_status():
    return {"running": _running}


@router.get("/logs", response_model=List[IngestionLogOut])
async def get_ingestion_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IngestionLog).order_by(IngestionLog.started_at.desc()).limit(100)
    )
    return result.scalars().all()
