from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class Citation(Base):
    __tablename__ = "citations"

    id = Column(Integer, primary_key=True, index=True)
    short_research_tag = Column(String(255), nullable=True)
    citation_type = Column(String(100), nullable=True)
    title_of_paper = Column(Text, nullable=True)
    publication_cited = Column(String(500), nullable=True)
    year_of_publication_cited = Column(Integer, nullable=True)
    faculty = Column(String(255), nullable=False, index=True)
    cited_in = Column(Text, nullable=True)
    year_of_government_publication = Column(Integer, nullable=True)
    publisher = Column(String(500), nullable=True, index=True)
    link = Column(Text, nullable=True)
    policy_area = Column(String(255), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    is_auto_detected = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReviewQueueItem(Base):
    __tablename__ = "review_queue"

    id = Column(Integer, primary_key=True, index=True)
    # Reviewer-filled fields
    short_research_tag = Column(String(255), nullable=True)
    citation_type = Column(String(100), nullable=True)
    title_of_paper = Column(Text, nullable=True)
    publication_cited = Column(String(500), nullable=True)
    year_of_publication_cited = Column(Integer, nullable=True)
    policy_area = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    # Auto-detected fields
    faculty = Column(String(255), nullable=False)
    cited_in = Column(Text, nullable=True)
    year_of_government_publication = Column(Integer, nullable=True)
    publisher = Column(String(500), nullable=True)
    link = Column(Text, nullable=True)
    # Detection metadata
    person_id = Column(Integer, ForeignKey("people.id"), nullable=True)  # links to the matched Person
    matched_text = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    status = Column(String(50), default="pending", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    name_variations = Column(JSON, default=list)
    title = Column(String(100), nullable=True)
    role = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    source_type = Column(String(50), nullable=False)  # rss, scrape, api
    agency_group = Column(String(100), nullable=True)  # federal, congressional, state, medical
    is_enabled = Column(Boolean, default=True)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    check_frequency = Column(String(50), default="daily")
    config = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    review_queue_items = relationship(
        "ReviewQueueItem",
        backref="source",
        foreign_keys=[ReviewQueueItem.source_id],
    )


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    source_name = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    documents_checked = Column(Integer, default=0)
    matches_found = Column(Integer, default=0)
    status = Column(String(50), default="running")
    error_message = Column(Text, nullable=True)
