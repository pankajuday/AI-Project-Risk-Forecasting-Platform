from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    READY = "ready"
    FAILED = "failed"


class RiskSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskCategory(str, Enum):
    TECHNICAL = "technical"
    RESOURCE = "resource"
    SCHEDULE = "schedule"
    SCOPE = "scope"
    EXTERNAL = "external"
    QUALITY = "quality"


class RiskItem(BaseModel):
    title: str
    description: str
    category: RiskCategory
    severity: RiskSeverity
    probability: str  # e.g. "High", "Medium", "Low"
    impact: str
    mitigation: str
    source_context: Optional[str] = None  # excerpt from docs that triggered this risk


class ScopeOutput(BaseModel):
    project_name: Optional[str] = None
    objectives: List[str] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    timeline: Optional[str] = None
    stakeholders: List[str] = Field(default_factory=list)
    out_of_scope: List[str] = Field(default_factory=list)
    summary: Optional[str] = None


class HealthBreakdown(BaseModel):
    schedule_risk_percent: float = 0.0
    scope_clarity_percent: float = 0.0
    documentation_completeness_percent: float = 0.0
    risk_density_percent: float = 0.0  # proportion of high/critical risks


class GeneratedDocument(BaseModel):
    title: str
    doc_type: str  # "user_stories" | "risk_register" | "sprint_plan" | "executive_summary"
    content: str  # Markdown content
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnalysisReport(Document):
    """Stores the full output of a multi-agent analysis run for a project."""

    project_id: str

    status: AnalysisStatus = AnalysisStatus.PENDING
    error_message: Optional[str] = None

    # Agent outputs
    scope: Optional[ScopeOutput] = None
    risks: List[RiskItem] = Field(default_factory=list)
    health_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    health_breakdown: Optional[HealthBreakdown] = None

    # AI-generated documents
    generated_documents: List[GeneratedDocument] = Field(default_factory=list)

    # Document audit — which types are missing / already present
    existing_doc_types: List[str] = Field(default_factory=list)
    missing_doc_types: List[str] = Field(default_factory=list)

    # Current LangGraph node being executed (for live progress)
    pipeline_step: Optional[str] = None

    # Raw LLM reasoning (for debugging)
    raw_outputs: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    class Settings:
        name = "analysis_reports"
        indexes = [
            [("project_id", 1), ("created_at", -1)],
            "status",
        ]
