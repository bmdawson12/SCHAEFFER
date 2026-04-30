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

<<<<<<< HEAD
_running = False
=======
_progress = {
    "running": False,
    "phase": "",
    "current_source": "",
    "sources_done": 0,
    "sources_total": 0,
    "docs_checked": 0,
    "matches_found": 0,
}


def _update_progress(**kwargs):
    _progress.update(kwargs)
>>>>>>> f3759bd (initial commit)


@router.post("/run")
async def trigger_ingestion(
    data: IngestionRunRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
<<<<<<< HEAD
    global _running
    if _running:
=======
    if _progress["running"]:
>>>>>>> f3759bd (initial commit)
        return {"status": "already_running", "message": "Ingestion is already in progress"}

    background_tasks.add_task(run_ingestion_background, data.source_ids)
    return {"status": "started", "message": "Ingestion pipeline started in background"}


async def run_ingestion_background(source_ids=None):
<<<<<<< HEAD
    global _running
    _running = True
    try:
        async with AsyncSessionLocal() as db:
            await run_ingestion_pipeline(db, source_ids)
    finally:
        _running = False
=======
    _progress.update(running=True, phase="starting", current_source="",
                     sources_done=0, sources_total=0, docs_checked=0, matches_found=0)
    try:
        async with AsyncSessionLocal() as db:
            await run_ingestion_pipeline(db, source_ids, progress_cb=_update_progress)
    finally:
        _progress.update(running=False, phase="done", current_source="")
>>>>>>> f3759bd (initial commit)


@router.get("/status")
async def ingestion_status():
<<<<<<< HEAD
    return {"running": _running}
=======
    return _progress
>>>>>>> f3759bd (initial commit)


@router.get("/logs", response_model=List[IngestionLogOut])
async def get_ingestion_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IngestionLog).order_by(IngestionLog.started_at.desc()).limit(100)
    )
    return result.scalars().all()
