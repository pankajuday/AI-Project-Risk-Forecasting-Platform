"""
Risk Reconciler
===============
Bridges the deterministic identity engine with the MongoDB lifecycle model.

Called from the LangGraph save_node after each project-level analysis run.
If it fails, the analysis still succeeds — this is an auxiliary step.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from models.report_model import RiskItem
from models.tracked_risk_model import (
    TrackedRisk,
    RiskEvent,
    RiskEventType,
    RiskStatus,
    severity_rank,
    severity_band,
)
from agents.risk_identity import fingerprint, reconcile


async def reconcile_risks(
    project_id: str,
    detected_risks: list[RiskItem],
) -> dict[str, Any]:
    """
    Reconcile a newly detected risk list against the persistent register.

    Parameters
    ----------
    project_id : str
        The project being analysed.
    detected_risks : list[RiskItem]
        Risks produced by the current analysis run.

    Returns
    -------
    dict with summary counts: created, matched, not_detected, total_events.
    """
    now = datetime.now(timezone.utc)

    # ── Load existing tracked risks ──────────────────────────────────────
    existing_docs = await TrackedRisk.find(
        TrackedRisk.project_id == project_id,
        TrackedRisk.status.is_in([
            RiskStatus.OPEN,
            RiskStatus.MITIGATING,
            RiskStatus.RESOLVED,
            RiskStatus.ACCEPTED,
            RiskStatus.STALE,
        ]),
    ).to_list()

    existing_dicts = [
        {
            "id": str(doc.id),
            "fingerprint": doc.fingerprint,
            "title": doc.title,
            "description": doc.description,
            "category": doc.category,
            "source_context": doc.source_context,
            "status": doc.status.value,
        }
        for doc in existing_docs
    ]

    # Convert detected RiskItem models to plain dicts for the identity engine
    detected_dicts = [
        {
            "title": r.title,
            "description": r.description,
            "category": r.category.value if hasattr(r.category, "value") else r.category,
            "severity": r.severity.value if hasattr(r.severity, "value") else r.severity,
            "probability": r.probability,
            "impact": r.impact,
            "source_context": r.source_context,
            "mitigation": r.mitigation,
        }
        for r in detected_risks
    ]

    # ── Run deterministic reconciliation ─────────────────────────────────
    result = reconcile(existing_dicts, detected_dicts)

    # Build lookup maps
    existing_by_id = {str(doc.id): doc for doc in existing_docs}
    events_created = 0

    # ── Handle matched risks ─────────────────────────────────────────────
    for match in result["matched"]:
        ex_doc = existing_by_id[match["existing_id"]]
        det = detected_dicts[match["detected_index"]]
        det_fp = result["fingerprints"][match["detected_index"]]

        old_severity = severity_band(ex_doc.severity)
        new_severity = severity_band(det["severity"])

        # Check if risk was previously closed (reopen case)
        was_closed = ex_doc.status in (RiskStatus.RESOLVED, RiskStatus.ACCEPTED)

        if was_closed:
            # ── Reopen ──
            ex_doc.status = RiskStatus.OPEN
            ex_doc.closed_at = None
            ex_doc.closure_note = None
            await RiskEvent(
                risk_id=str(ex_doc.id),
                type=RiskEventType.REOPENED,
                actor="system",
                from_value="resolved" if ex_doc.status == RiskStatus.RESOLVED else "accepted",
                to_value="open",
                note="Re-detected in latest analysis run",
                created_at=now,
            ).insert()
            events_created += 1

        # ── Refresh content fields ──
        ex_doc.title = det["title"]
        ex_doc.description = det["description"]
        ex_doc.severity = det["severity"]
        ex_doc.probability = det["probability"]
        ex_doc.impact = det["impact"]
        ex_doc.source_context = det.get("source_context")
        ex_doc.mitigation = det.get("mitigation")
        ex_doc.fingerprint = det_fp
        ex_doc.occurrences += 1
        ex_doc.missed_runs = 0
        ex_doc.last_seen_at = now
        ex_doc.updated_at = now

        # Restore from stale if needed
        if ex_doc.status == RiskStatus.STALE:
            ex_doc.status = RiskStatus.OPEN

        # ── Check escalation / de-escalation ──
        if severity_rank(new_severity) > severity_rank(old_severity):
            # Escalated
            await RiskEvent(
                risk_id=str(ex_doc.id),
                type=RiskEventType.ESCALATED,
                actor="system",
                from_value=old_severity,
                to_value=new_severity,
                note=f"Severity escalated from {old_severity} to {new_severity}",
                created_at=now,
            ).insert()
            events_created += 1
            # Update peak
            if severity_rank(new_severity) > severity_rank(ex_doc.peak_severity):
                ex_doc.peak_severity = new_severity

        elif severity_rank(new_severity) < severity_rank(old_severity):
            # De-escalated (no notification, just an event)
            await RiskEvent(
                risk_id=str(ex_doc.id),
                type=RiskEventType.DEESCALATED,
                actor="system",
                from_value=old_severity,
                to_value=new_severity,
                created_at=now,
            ).insert()
            events_created += 1

        # ── Re-detected event ──
        if not was_closed:
            await RiskEvent(
                risk_id=str(ex_doc.id),
                type=RiskEventType.REDETECTED,
                actor="system",
                note=f"Matched via {match['signal']} (score={match['score']})",
                created_at=now,
            ).insert()
            events_created += 1

        await ex_doc.save()

    # ── Handle new risks ─────────────────────────────────────────────────
    for di in result["created"]:
        det = detected_dicts[di]
        det_fp = result["fingerprints"][di]
        sev = severity_band(det["severity"])

        new_risk = TrackedRisk(
            project_id=project_id,
            fingerprint=det_fp,
            title=det["title"],
            description=det["description"],
            category=det.get("category", "technical"),
            severity=det["severity"],
            probability=det["probability"],
            impact=det["impact"],
            source_context=det.get("source_context"),
            mitigation=det.get("mitigation"),
            status=RiskStatus.OPEN,
            occurrences=1,
            missed_runs=0,
            peak_severity=sev,
            first_seen_at=now,
            last_seen_at=now,
            created_at=now,
            updated_at=now,
        )
        await new_risk.insert()

        await RiskEvent(
            risk_id=str(new_risk.id),
            type=RiskEventType.DETECTED,
            actor="system",
            note=f"First detected (fingerprint={det_fp[:8]}…)",
            created_at=now,
        ).insert()
        events_created += 1

    # ── Handle not-detected (missed) risks ───────────────────────────────
    for ex_id in result["not_detected"]:
        ex_doc = existing_by_id.get(ex_id)
        if not ex_doc:
            continue

        ex_doc.missed_runs += 1
        ex_doc.updated_at = now

        if ex_doc.missed_runs >= 4 and ex_doc.status != RiskStatus.RESOLVED:
            # Auto-resolve
            ex_doc.status = RiskStatus.RESOLVED
            ex_doc.closed_at = now
            ex_doc.closure_note = "No longer evidenced in project documents"
            await RiskEvent(
                risk_id=str(ex_doc.id),
                type=RiskEventType.AUTO_RESOLVED,
                actor="system",
                note="Not detected for 4 consecutive runs",
                created_at=now,
            ).insert()
            events_created += 1

        elif ex_doc.missed_runs >= 2 and ex_doc.status not in (
            RiskStatus.STALE, RiskStatus.RESOLVED, RiskStatus.ACCEPTED,
        ):
            # Mark stale
            ex_doc.status = RiskStatus.STALE
            await RiskEvent(
                risk_id=str(ex_doc.id),
                type=RiskEventType.MARKED_STALE,
                actor="system",
                note="Not detected for 2 consecutive runs",
                created_at=now,
            ).insert()
            events_created += 1

        await ex_doc.save()

    summary = {
        "created": len(result["created"]),
        "matched": len(result["matched"]),
        "not_detected": len(result["not_detected"]),
        "total_events": events_created,
    }
    print(
        f"[RECONCILER] ✓ project={project_id} — "
        f"created={summary['created']}, matched={summary['matched']}, "
        f"missed={summary['not_detected']}, events={summary['total_events']}"
    )
    return summary
