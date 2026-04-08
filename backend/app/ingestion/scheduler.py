from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

from ..database import AsyncSessionLocal
from .pipeline import run_ingestion_pipeline

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


def setup_scheduler():
    scheduler.add_job(
        _daily_job,
        CronTrigger(hour=2, minute=0),  # 02:00 UTC every day
        id="daily_ingestion",
        name="Daily Ingestion Pipeline",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info("APScheduler started — daily ingestion scheduled at 02:00 UTC")


async def _daily_job():
    logger.info("Running scheduled daily ingestion…")
    try:
        async with AsyncSessionLocal() as db:
            result = await run_ingestion_pipeline(db)
        logger.info(f"Daily ingestion complete: {result}")
    except Exception as e:
        logger.error(f"Daily ingestion failed: {e}", exc_info=True)
