from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv
import io

from ..database import get_db
from ..models import Person
from ..schemas import PersonCreate, PersonUpdate, PersonOut

router = APIRouter()


@router.get("/", response_model=list[PersonOut])
async def list_people(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).order_by(Person.full_name))
    return result.scalars().all()


@router.post("/", response_model=PersonOut, status_code=201)
async def create_person(data: PersonCreate, db: AsyncSession = Depends(get_db)):
    person = Person(**data.model_dump())
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


@router.post("/import")
async def import_people(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Import people from CSV. Expected columns (case-insensitive):
    full_name, title, role, department, name_variations (semicolon-separated)
    """
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    # Normalize header names
    def get_field(row: dict, *keys: str) -> str:
        for k in keys:
            for rk in row:
                if rk.strip().lower() == k.lower():
                    return (row[rk] or "").strip()
        return ""

    created = 0
    skipped = 0
    for row in reader:
        full_name = get_field(row, "full_name", "name", "Full Name", "Name")
        if not full_name:
            skipped += 1
            continue

        # Check for duplicate
        existing = await db.execute(select(Person).where(Person.full_name == full_name))
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        variations_raw = get_field(row, "name_variations", "variations", "aliases")
        variations = [v.strip() for v in variations_raw.split(";") if v.strip()] if variations_raw else []

        person = Person(
            full_name=full_name,
            title=get_field(row, "title") or None,
            role=get_field(row, "role") or None,
            department=get_field(row, "department") or None,
            name_variations=variations,
        )
        db.add(person)
        created += 1

    await db.commit()
    return {"created": created, "skipped": skipped}


@router.get("/{person_id}", response_model=PersonOut)
async def get_person(person_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).where(Person.id == person_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    return p


@router.put("/{person_id}", response_model=PersonOut)
async def update_person(person_id: int, data: PersonUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).where(Person.id == person_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{person_id}")
async def delete_person(person_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).where(Person.id == person_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    await db.delete(p)
    await db.commit()
    return {"ok": True}
