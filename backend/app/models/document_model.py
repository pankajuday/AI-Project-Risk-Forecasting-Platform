from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from beanie import Document, Link
from pydantic import Field

from models.project_model import Project


class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    CSV = "csv"
    XLSX = "xlsx"
    IMAGE = "image"
    PPTX = "pptx"
    OTHER = "other"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentRecord(Document):
    """Stores metadata and processing state for every uploaded file."""

    project_id: str
    uploaded_by: Optional[str] = None
    filename: str
    original_name: str
    file_type: FileType
    file_size: int = Field(ge=0)
    page_count: Optional[int] = None
    language: Optional[str] = None

    storage_path: str
    storage_url: Optional[str] = None

    mime_type: str
    processing_status: DocumentStatus = DocumentStatus.PENDING
    processing_error: Optional[str] = None

    chunk_count: int = Field(default=0, ge=0)

    metadata: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "documents"
        indexes = [
            [("project_id", 1), ("created_at", -1)],
            [("project_id", 1), ("processing_status", 1)],
            [("file_type", 1)],
        ]
