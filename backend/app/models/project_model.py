from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from beanie import Document
from pydantic import BaseModel, Field


class ProjectStatus(str, Enum):
    CREATED = "created"
    UPLOADING = "uploading"
    INDEXING = "indexing"
    ANALYSIS_PENDING = "analysis_pending"
    ANALYSIS_RUNNING = "analysis_running"
    ANALYSIS_READY = "analysis_ready"
    COMPLETE = "completed"
    ARCHIVED = "archived"
    FAILED = "failed"


class Project(Document):
    """Core container: every artifact and analysis belongs to a Project."""

    # --- Core Identification ---
    name: str
    description: Optional[str] = None

    # --- Workflow & Status ---
    status: ProjectStatus = ProjectStatus.CREATED

    # --- Tracking & Metrics ---
    total_files: int = Field(default=0)
    total_chunks: int = Field(default=0)
    last_ingested_at: Optional[datetime] = None

    # --- Health Metrics (AI outputs) ---
    current_health_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    health_score_history: List[Dict[str, Any]] = Field(default_factory=list)

    # --- Reference Data ---
    associated_document_ids: List[str] = Field(
        default_factory=list,
        description="IDs of DocumentRecord entries associated with this project.",
    )

    # --- Configuration & Metadata ---
    config: Dict[str, Any] = Field(default_factory=dict)
    metadata: Optional[Dict[str, str]] = Field(default_factory=dict)

    # --- Timestamps ---
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "projects"
        indexes = [
            "status",
            "metadata.department",
        ]


class CreateProject(BaseModel):
    name: str
    description: Optional[str] = None