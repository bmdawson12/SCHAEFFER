import os
import shutil
import sqlite3
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from ..database import engine, DATABASE_URL

router = APIRouter()

# Resolve the path to the SQLite file from the DATABASE_URL.
# Format is "sqlite+aiosqlite:///citations.db" (relative) or absolute.
_db_path_raw = DATABASE_URL.replace("sqlite+aiosqlite:///", "", 1)
DB_PATH = os.path.abspath(_db_path_raw)


@router.get("/export-db")
async def export_database():
    """Download the current SQLite database file."""
    if not os.path.isfile(DB_PATH):
        raise HTTPException(status_code=404, detail="Database file not found")

    return FileResponse(
        path=DB_PATH,
        media_type="application/octet-stream",
        filename="citations.db",
        headers={"Content-Disposition": "attachment; filename=citations.db"},
    )


@router.post("/import-db")
async def import_database(file: UploadFile = File(...)):
    """
    Upload a .db file to replace the current database.
    Validates the upload is a valid SQLite database before swapping.
    """
    if not file.filename or not file.filename.endswith(".db"):
        raise HTTPException(
            status_code=400,
            detail="File must have a .db extension",
        )

    # Write the uploaded file to a temp location for validation
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".db")
    try:
        os.close(tmp_fd)
        contents = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(contents)

        # Validate: must be a valid SQLite database
        try:
            conn = sqlite3.connect(tmp_path)
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            conn.close()
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is not a valid SQLite database",
            )

        if not tables:
            raise HTTPException(
                status_code=400,
                detail="Uploaded database contains no tables",
            )

        # Dispose existing connections so the file isn't locked
        await engine.dispose()

        # Replace the database file
        shutil.copy2(tmp_path, DB_PATH)

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {
        "status": "ok",
        "message": "Database replaced successfully. Please reload the application.",
    }
