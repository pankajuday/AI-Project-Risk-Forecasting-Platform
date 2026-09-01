"""
Tracked Risk Routes
===================
FastAPI router for CRUD operations on the persistent risk register.

Endpoints:
  GET  /{project_id}           — list tracked risks (with filters)
  GET  /{project_id}/summary   — counts by status/category for dashboard widgets
  GET  /item/{risk_id}         — single risk + full event timeline
  PATCH /item/{risk_id}        — update status, owner, due date, closure note
  POST /item/{risk_id}/note    — append a free-text note event
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from models.tracked_risk_model import (
    TrackedRisk,
    RiskEvent,
    RiskEventType,
    RiskStatus,
    RiskUpdatePayload,
    RiskNotePayload,
    VALID_TRANSITIONS,
    severity_rank,
)

router = APIRouter()


# ── List tracked risks ───────────────────────────────────────────────────────

@router.get("/{project_id}")
async def list_tracked_risks(
    project_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    owner_name: Optional[str] = Query(None, description="Filter by owner"),
    severity: Optional[str] = Query(None, description="Filter by min severity"),
    overdue: Optional[bool] = Query(None, description="Only overdue risks"),
):
    """
    List all tracked risks for a project with optional filters.
    Sorted by severity (desc) then last_seen_at (desc).
    """
    query = {"project_id": project_id}

    if status:
        query["status"] = status
    if category:
        query["category"] = category.lower()
    if owner_name:
        query["owner_name"] = owner_name

    risks = await TrackedRisk.find(query).to_list()

    # Apply severity filter (post-query because we sort by rank)
    if severity:
        min_rank = severity_rank(severity)
        risks = [r for r in risks if severity_rank(r.severity) >= min_rank]

    # Apply overdue filter
    if overdue:
        now = datetime.now(timezone.utc)
        risks = [
            r for r in risks
            if r.due_date and r.due_date < now
            and r.status in (RiskStatus.OPEN, RiskStatus.MITIGATING)
        ]

    # Sort: severity desc, then last_seen_at desc
    risks.sort(
        key=lambda r: (-severity_rank(r.severity), -(r.last_seen_at or r.created_at).timestamp())
    )

    return [_serialize_risk(r) for r in risks]


# ── Summary ──────────────────────────────────────────────────────────────────

@router.get("/{project_id}/summary")
async def risk_summary(project_id: str):
    """
    Aggregated counts for dashboard widgets.
    """
    risks = await TrackedRisk.find(TrackedRisk.project_id == project_id).to_list()
    now = datetime.now(timezone.utc)

    by_status: dict[str, int] = {}
    by_category: dict[str, int] = {}
    unowned = 0
    overdue = 0
    total = len(risks)

    for r in risks:
        by_status[r.status.value] = by_status.get(r.status.value, 0) + 1
        by_category[r.category] = by_category.get(r.category, 0) + 1
        if not r.owner_name and r.status in (RiskStatus.OPEN, RiskStatus.MITIGATING):
            unowned += 1
        if (
            r.due_date and r.due_date < now
            and r.status in (RiskStatus.OPEN, RiskStatus.MITIGATING)
        ):
            overdue += 1

    return {
        "total": total,
        "by_status": by_status,
        "by_category": by_category,
        "unowned": unowned,
        "overdue": overdue,
    }


# ── Single risk with timeline ────────────────────────────────────────────────

@router.get("/item/{risk_id}")
async def get_tracked_risk(risk_id: str):
    """
    Fetch a single tracked risk and its full event timeline.
    """
    risk = await TrackedRisk.get(risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Tracked risk not found")

    events = await RiskEvent.find(
        RiskEvent.risk_id == risk_id
    ).sort("-created_at").to_list()

    return {
        **_serialize_risk(risk),
        "events": [_serialize_event(e) for e in events],
    }


# ── Update risk ──────────────────────────────────────────────────────────────

@router.patch("/item/{risk_id}")
async def update_tracked_risk(risk_id: str, payload: RiskUpdatePayload):
    """
    Update lifecycle fields: status, owner_name, due_date, closure_note.
    Each changed field produces a RiskEvent for the audit trail.
    """
    risk = await TrackedRisk.get(risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Tracked risk not found")

    now = datetime.now(timezone.utc)
    events_to_create: list[RiskEvent] = []

    # ── Status change ──
    if payload.status is not None and payload.status != risk.status.value:
        try:
            new_status = RiskStatus(payload.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status: {payload.status}. "
                       f"Valid: {[s.value for s in RiskStatus]}",
            )

        if new_status not in VALID_TRANSITIONS.get(risk.status, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition: {risk.status.value} → {new_status.value}. "
                       f"Allowed: {[s.value for s in VALID_TRANSITIONS.get(risk.status, set())]}",
            )

        events_to_create.append(RiskEvent(
            risk_id=risk_id,
            type=RiskEventType.STATUS_CHANGED,
            from_value=risk.status.value,
            to_value=new_status.value,
            created_at=now,
        ))

        risk.status = new_status
        if new_status in (RiskStatus.RESOLVED, RiskStatus.ACCEPTED):
            risk.closed_at = now
        elif risk.closed_at:
            risk.closed_at = None

    # ── Owner change ──
    if payload.owner_name is not None and payload.owner_name != risk.owner_name:
        old_owner = risk.owner_name or "(unassigned)"
        new_owner = payload.owner_name or "(unassigned)"

        event_type = (
            RiskEventType.UNASSIGNED if not payload.owner_name
            else RiskEventType.ASSIGNED
        )
        events_to_create.append(RiskEvent(
            risk_id=risk_id,
            type=event_type,
            from_value=old_owner,
            to_value=new_owner,
            created_at=now,
        ))
        risk.owner_name = payload.owner_name or None

    # ── Due date change ──
    if payload.due_date is not None and payload.due_date != risk.due_date:
        events_to_create.append(RiskEvent(
            risk_id=risk_id,
            type=RiskEventType.DUE_DATE_SET,
            from_value=risk.due_date.isoformat() if risk.due_date else None,
            to_value=payload.due_date.isoformat(),
            created_at=now,
        ))
        risk.due_date = payload.due_date

    # ── Closure note ──
    if payload.closure_note is not None and payload.closure_note != risk.closure_note:
        risk.closure_note = payload.closure_note

    risk.updated_at = now
    await risk.save()

    for event in events_to_create:
        await event.insert()

    return _serialize_risk(risk)


# ── Append note ──────────────────────────────────────────────────────────────

@router.post("/item/{risk_id}/note")
async def add_risk_note(risk_id: str, payload: RiskNotePayload):
    """
    Append a free-text note to the risk's event timeline.
    """
    risk = await TrackedRisk.get(risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Tracked risk not found")

    event = RiskEvent(
        risk_id=risk_id,
        type=RiskEventType.NOTE,
        actor=payload.actor,
        note=payload.note,
        created_at=datetime.now(timezone.utc),
    )
    await event.insert()

    return {"message": "Note added", "event_id": str(event.id)}


# ── Serialization helpers ────────────────────────────────────────────────────

def _serialize_risk(r: TrackedRisk) -> dict:
    """Convert a TrackedRisk document to a JSON-safe dict."""
    return {
        "id": str(r.id),
        "project_id": r.project_id,
        "fingerprint": r.fingerprint,
        "title": r.title,
        "description": r.description,
        "category": r.category,
        "severity": r.severity,
        "probability": r.probability,
        "impact": r.impact,
        "source_context": r.source_context,
        "mitigation": r.mitigation,
        "status": r.status.value,
        "owner_name": r.owner_name,
        "due_date": r.due_date.isoformat() if r.due_date else None,
        "closure_note": r.closure_note,
        "occurrences": r.occurrences,
        "missed_runs": r.missed_runs,
        "peak_severity": r.peak_severity,
        "first_seen_at": r.first_seen_at.isoformat() if r.first_seen_at else None,
        "last_seen_at": r.last_seen_at.isoformat() if r.last_seen_at else None,
        "closed_at": r.closed_at.isoformat() if r.closed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _serialize_event(e: RiskEvent) -> dict:
    """Convert a RiskEvent document to a JSON-safe dict."""
    return {
        "id": str(e.id),
        "risk_id": e.risk_id,
        "type": e.type.value,
        "actor": e.actor,
        "from_value": e.from_value,
        "to_value": e.to_value,
        "note": e.note,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
