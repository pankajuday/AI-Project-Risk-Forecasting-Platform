"""
Tracked Risk & Risk Event Models
=================================
Beanie ODM documents for persistent risk lifecycle tracking.

TrackedRisk  — one row per unique risk per project, survives across analysis runs.
RiskEvent    — immutable audit log of every lifecycle change.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class RiskStatus(str, Enum):
    OPEN = "open"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    ACCEPTED = "accepted"
    STALE = "stale"


class RiskEventType(str, Enum):
    DETECTED = "detected"
    REDETECTED = "redetected"
    ESCALATED = "escalated"
    DEESCALATED = "deescalated"
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    STATUS_CHANGED = "status_changed"
    NOTE = "note"
    REOPENED = "reopened"
    MARKED_STALE = "marked_stale"
    AUTO_RESOLVED = "auto_resolved"
    DUE_DATE_SET = "due_date_set"
    OVERDUE = "overdue"


# ── Severity band helpers ────────────────────────────────────────────────────

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def severity_rank(severity: str) -> int:
    """Map discrete severity string to a numeric rank for comparison."""
    return SEVERITY_ORDER.get(severity.lower(), 0)


def severity_band(severity: str) -> str:
    """Normalise severity to lowercase band name."""
    return severity.lower() if severity.lower() in SEVERITY_ORDER else "low"


# ── Valid status transitions ─────────────────────────────────────────────────

VALID_TRANSITIONS: dict[RiskStatus, set[RiskStatus]] = {
    RiskStatus.OPEN: {RiskStatus.MITIGATING, RiskStatus.RESOLVED, RiskStatus.ACCEPTED},
    RiskStatus.MITIGATING: {RiskStatus.OPEN, RiskStatus.RESOLVED},
    RiskStatus.RESOLVED: {RiskStatus.OPEN},      # only via reopen
    RiskStatus.ACCEPTED: {RiskStatus.OPEN},       # only via reopen
    RiskStatus.STALE: {RiskStatus.OPEN, RiskStatus.RESOLVED},
}


# ── Documents ────────────────────────────────────────────────────────────────

class TrackedRisk(Document):
    """
    A single risk with a stable identity across analysis runs.

    Uniquely identified by (project_id, fingerprint).
    Content fields are refreshed from the most recent detection.
    Lifecycle fields are managed by the reconciler and the API.
    """

    # ── Identity ──
    project_id: str
    fingerprint: str

    # ── Content (refreshed from latest detection) ──
    title: str
    description: str
    category: str       # technical | resource | schedule | scope | external | quality
    severity: str       # low | medium | high | critical
    probability: str    # Low | Medium | High
    impact: str
    source_context: Optional[str] = None
    mitigation: Optional[str] = None

    # ── Lifecycle ──
    status: RiskStatus = RiskStatus.OPEN
    owner_name: Optional[str] = None
    due_date: Optional[datetime] = None
    closure_note: Optional[str] = None

    # ── History ──
    occurrences: int = Field(default=1)
    missed_runs: int = Field(default=0)
    peak_severity: str = ""        # highest severity ever seen
    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None

    # ── Timestamps ──
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tracked_risks"
        indexes = [
            [("project_id", 1), ("fingerprint", 1)],   # unique compound
            [("project_id", 1), ("status", 1)],
            [("project_id", 1), ("severity", 1)],
            "owner_name",
        ]


class RiskEvent(Document):
    """
    Immutable audit-log entry for a tracked risk.

    Every lifecycle change produces exactly one event.
    """

    risk_id: str
    type: RiskEventType

    actor: Optional[str] = None         # who did it (free-text, or "system")
    from_value: Optional[str] = None
    to_value: Optional[str] = None
    note: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "risk_events"
        indexes = [
            [("risk_id", 1), ("created_at", -1)],
        ]


# ── Pydantic DTOs for the API ────────────────────────────────────────────────

class RiskUpdatePayload(BaseModel):
    """PATCH body for updating a tracked risk."""
    status: Optional[str] = None
    owner_name: Optional[str] = None
    due_date: Optional[datetime] = None
    closure_note: Optional[str] = None


class RiskNotePayload(BaseModel):
    """POST body for appending a note."""
    note: str
    actor: Optional[str] = None
