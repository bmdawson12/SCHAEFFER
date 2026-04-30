<<<<<<< HEAD
from pydantic import BaseModel
=======
import re
from pydantic import BaseModel, field_validator, model_validator
>>>>>>> f3759bd (initial commit)
from typing import Optional, List, Any
from datetime import datetime


<<<<<<< HEAD
=======
# Strip control characters (except newline/tab) that break JSON serialization
_CONTROL_CHARS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')


def _sanitize_str(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    return _CONTROL_CHARS.sub('', v)


>>>>>>> f3759bd (initial commit)
# ── Citation ──────────────────────────────────────────────────────────────────

class CitationBase(BaseModel):
    short_research_tag: Optional[str] = None
    citation_type: Optional[str] = None
    title_of_paper: Optional[str] = None
    publication_cited: Optional[str] = None
    year_of_publication_cited: Optional[int] = None
    faculty: str
    cited_in: Optional[str] = None
    year_of_government_publication: Optional[int] = None
    publisher: Optional[str] = None
    link: Optional[str] = None
    policy_area: Optional[str] = None
    notes: Optional[str] = None


class CitationCreate(CitationBase):
<<<<<<< HEAD
    pass
=======
    @field_validator("faculty")
    @classmethod
    def faculty_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Faculty name must not be empty")
        return v.strip()
>>>>>>> f3759bd (initial commit)


class CitationUpdate(BaseModel):
    short_research_tag: Optional[str] = None
    citation_type: Optional[str] = None
    title_of_paper: Optional[str] = None
    publication_cited: Optional[str] = None
    year_of_publication_cited: Optional[int] = None
    faculty: Optional[str] = None
    cited_in: Optional[str] = None
    year_of_government_publication: Optional[int] = None
    publisher: Optional[str] = None
    link: Optional[str] = None
    policy_area: Optional[str] = None
    notes: Optional[str] = None


class CitationOut(CitationBase):
    id: int
    is_auto_detected: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

<<<<<<< HEAD
=======
    @model_validator(mode="after")
    def sanitize_strings(self):
        """Strip control characters that break JSON serialization."""
        for field_name in ["short_research_tag", "citation_type", "title_of_paper",
                           "publication_cited", "faculty", "cited_in", "publisher",
                           "link", "policy_area", "notes"]:
            val = getattr(self, field_name, None)
            if isinstance(val, str):
                setattr(self, field_name, _sanitize_str(val))
        return self

>>>>>>> f3759bd (initial commit)

# ── Review Queue ──────────────────────────────────────────────────────────────

class ReviewQueueItemOut(BaseModel):
    id: int
    short_research_tag: Optional[str] = None
    citation_type: Optional[str] = None
    title_of_paper: Optional[str] = None
    publication_cited: Optional[str] = None
    year_of_publication_cited: Optional[int] = None
    policy_area: Optional[str] = None
    notes: Optional[str] = None
    faculty: str
    cited_in: Optional[str] = None
    year_of_government_publication: Optional[int] = None
    publisher: Optional[str] = None
    link: Optional[str] = None
    person_id: Optional[int] = None
    matched_text: Optional[str] = None
    confidence_score: Optional[float] = None
    source_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

<<<<<<< HEAD
=======
    @model_validator(mode="after")
    def sanitize_strings(self):
        """Strip control characters that break JSON serialization."""
        for field_name in ["short_research_tag", "citation_type", "title_of_paper",
                           "publication_cited", "faculty", "cited_in", "publisher",
                           "link", "policy_area", "notes", "matched_text"]:
            val = getattr(self, field_name, None)
            if isinstance(val, str):
                setattr(self, field_name, _sanitize_str(val))
        return self

>>>>>>> f3759bd (initial commit)

class ReviewQueueItemUpdate(BaseModel):
    short_research_tag: Optional[str] = None
    citation_type: Optional[str] = None
    title_of_paper: Optional[str] = None
    publication_cited: Optional[str] = None
    year_of_publication_cited: Optional[int] = None
    policy_area: Optional[str] = None
    notes: Optional[str] = None
    faculty: Optional[str] = None
    cited_in: Optional[str] = None
    year_of_government_publication: Optional[int] = None
    publisher: Optional[str] = None
    link: Optional[str] = None


# ── Person ────────────────────────────────────────────────────────────────────

class PersonCreate(BaseModel):
    full_name: str
    name_variations: Optional[List[str]] = []
    title: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = True

<<<<<<< HEAD
=======
    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Full name must not be empty")
        return v.strip()

>>>>>>> f3759bd (initial commit)

class PersonUpdate(BaseModel):
    full_name: Optional[str] = None
    name_variations: Optional[List[str]] = None
    title: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

<<<<<<< HEAD
=======
    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Full name must not be empty")
        return v.strip() if v else v

>>>>>>> f3759bd (initial commit)

class PersonOut(BaseModel):
    id: int
    full_name: str
    name_variations: List[str]
    title: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Source ────────────────────────────────────────────────────────────────────

class SourceCreate(BaseModel):
    name: str
    url: str
    source_type: str
    agency_group: Optional[str] = None
    is_enabled: Optional[bool] = True
    check_frequency: Optional[str] = "daily"
    config: Optional[dict] = {}

<<<<<<< HEAD
=======
    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Source name must not be empty")
        return v.strip()

    @field_validator("url")
    @classmethod
    def url_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("URL must not be empty")
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

>>>>>>> f3759bd (initial commit)

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    agency_group: Optional[str] = None
    is_enabled: Optional[bool] = None
    check_frequency: Optional[str] = None
    config: Optional[dict] = None


class SourceOut(BaseModel):
    id: int
    name: str
    url: str
    source_type: str
    agency_group: Optional[str] = None
    is_enabled: bool
    last_checked: Optional[datetime] = None
    check_frequency: str
    config: dict
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    total_citations: int
    pending_review: int
    total_people: int
    total_sources: int
    recent_citations: List[Any] = []
    top_faculty: List[dict] = []


class CitationTimeSeries(BaseModel):
    labels: List[str]
    data: List[int]


# ── Ingestion ─────────────────────────────────────────────────────────────────

class IngestionLogOut(BaseModel):
    id: int
    source_id: Optional[int] = None
    source_name: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    documents_checked: int
    matches_found: int
    status: str
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class IngestionRunRequest(BaseModel):
    source_ids: Optional[List[int]] = None
