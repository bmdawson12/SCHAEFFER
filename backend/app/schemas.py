from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


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
    pass


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


class PersonUpdate(BaseModel):
    full_name: Optional[str] = None
    name_variations: Optional[List[str]] = None
    title: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


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
