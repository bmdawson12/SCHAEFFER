<<<<<<< HEAD
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
=======
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
>>>>>>> f3759bd (initial commit)
from contextlib import asynccontextmanager
import os
import json
import logging

from .database import create_tables, AsyncSessionLocal
from .models import Source
<<<<<<< HEAD
from .api import citations, people, sources, review_queue, ingestion, stats
=======
from .api import citations, people, sources, review_queue, ingestion, stats, database_io, intelligence
>>>>>>> f3759bd (initial commit)
from .ingestion.scheduler import setup_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await seed_sources()
    setup_scheduler()
    yield


app = FastAPI(title="Citation Monitor API", version="1.0.0", lifespan=lifespan)

cors_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(citations.router, prefix="/api/citations", tags=["citations"])
app.include_router(people.router, prefix="/api/people", tags=["people"])
app.include_router(sources.router, prefix="/api/sources", tags=["sources"])
app.include_router(review_queue.router, prefix="/api/review-queue", tags=["review-queue"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["ingestion"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
<<<<<<< HEAD
=======
app.include_router(intelligence.router, prefix="/api/intelligence", tags=["intelligence"])
app.include_router(database_io.router, prefix="/api", tags=["database-io"])
>>>>>>> f3759bd (initial commit)


async def seed_sources():
    """Seed sources from sources_config.json on first run."""
    try:
        config_path = os.path.join(os.path.dirname(__file__), "sources_config.json")
        with open(config_path) as f:
            config = json.load(f)

        async with AsyncSessionLocal() as db:
            from sqlalchemy import select, func as sqlfunc
            result = await db.execute(select(sqlfunc.count(Source.id)))
            count = result.scalar()

            if count == 0:
                for s in config["sources"]:
                    source = Source(
                        name=s["name"],
                        url=s["url"],
                        source_type=s["source_type"],
                        agency_group=s["agency_group"],
                        is_enabled=s.get("enabled", True),
                        config=s.get("config", {}),
                    )
                    db.add(source)
                await db.commit()
                logger.info(f"Seeded {len(config['sources'])} sources from config")
    except Exception as e:
        logger.error(f"Error seeding sources: {e}")


@app.get("/health")
async def health():
    return {"status": "ok"}
<<<<<<< HEAD
=======


# ── Serve frontend static files ───────────────────────────────────────────────
# The built frontend (npm run build) is copied into a "static" directory
# next to the app package. This lets the backend serve everything from one port.
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the React SPA for any non-API route."""
        # Try to serve a matching static file first
        file_path = os.path.join(_static_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fall back to index.html for SPA client-side routing
        return FileResponse(os.path.join(_static_dir, "index.html"))
>>>>>>> f3759bd (initial commit)
