"""
Maintenance Sweeps
==================
Background tasks for sweeping the database to enforce lifecycle rules.
"""

import asyncio
from datetime import datetime, timezone
import traceback

from models.tracked_risk_model import TrackedRisk, RiskEvent, RiskEventType, RiskStatus

async def run_overdue_sweep():
    """
    Finds TrackedRisks that are past their due_date and still open/mitigating,
    and creates a RiskEvent{overdue} if one hasn't been created recently.
    """
    now = datetime.now(timezone.utc)
    
    # Query: due_date exists, is in the past, and status is open/mitigating
    query = {
        "due_date": {"$lt": now},
        "status": {"$in": [RiskStatus.OPEN.value, RiskStatus.MITIGATING.value]}
    }
    
    overdue_risks = await TrackedRisk.find(query).to_list()
    
    for risk in overdue_risks:
        # Check if we already logged an overdue event in the last 24 hours
        recent_overdue = await RiskEvent.find(
            RiskEvent.risk_id == str(risk.id),
            RiskEvent.type == RiskEventType.OVERDUE
        ).sort("-created_at").first_or_none()
        
        should_alert = False
        if not recent_overdue:
            should_alert = True
        else:
            time_since_alert = (now - recent_overdue.created_at).total_seconds()
            if time_since_alert > 86400:  # 24 hours
                should_alert = True
                
        if should_alert:
            event = RiskEvent(
                risk_id=str(risk.id),
                type=RiskEventType.OVERDUE,
                actor="system",
                note=f"Risk mitigation is overdue (due {risk.due_date.strftime('%Y-%m-%d')})",
                created_at=now
            )
            await event.insert()
            print(f"[MAINTENANCE] Marked risk {risk.id} as overdue.")


async def maintenance_loop():
    """Infinite loop running sweeps periodically. Meant to be run as an asyncio background task."""
    print("[MAINTENANCE] Starting background maintenance loop...")
    while True:
        try:
            # Run the sweep
            await run_overdue_sweep()
        except asyncio.CancelledError:
            print("[MAINTENANCE] Maintenance loop cancelled.")
            break
        except Exception as e:
            print(f"[MAINTENANCE] Error in maintenance sweep: {e}")
            traceback.print_exc()
            
        # Sleep for 12 hours between sweeps
        await asyncio.sleep(12 * 3600)
