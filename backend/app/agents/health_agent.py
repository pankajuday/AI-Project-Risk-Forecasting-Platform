"""
Health Agent
============
Aggregates scope and risk outputs to compute a project health score (0-100)
and a breakdown across multiple dimensions.
"""

from __future__ import annotations

import os
from dotenv import load_dotenv
load_dotenv()

from models.report_model import ScopeOutput, RiskItem, RiskSeverity, HealthBreakdown


def compute_health_score(
    scope: ScopeOutput | None,
    risks: list[RiskItem],
) -> tuple[float, HealthBreakdown]:
    """
    Deterministic health score calculation (no LLM needed here).

    Scoring dimensions (each 0–25, total 0–100):
      - Scope clarity    (25 pts): completeness of scope fields
      - Documentation    (25 pts): how many key fields are populated
      - Risk density     (25 pts): penalised by high/critical risk count
      - Schedule risk    (25 pts): penalised by schedule-category risks
    """

    #  1. Scope Clarity 
    scope_fields = 0
    if scope:
        if scope.project_name: scope_fields += 1
        if scope.objectives:   scope_fields += 2
        if scope.deliverables: scope_fields += 2
        if scope.timeline:     scope_fields += 1
        if scope.stakeholders: scope_fields += 1
        if scope.summary:      scope_fields += 1
    scope_clarity = min(scope_fields / 8.0, 1.0) * 100

    #  2. Documentation Completeness 
    doc_score = 0
    if scope:
        if scope.out_of_scope:  doc_score += 25
        if len(scope.objectives) >= 3: doc_score += 25
        if len(scope.deliverables) >= 3: doc_score += 25
        if scope.stakeholders: doc_score += 25
    doc_completeness = float(doc_score)

    #  3. Risk Density 
    total = len(risks)
    if total == 0:
        risk_density = 100.0  # no risks found → assume clean docs
    else:
        high_critical = sum(
            1 for r in risks if r.severity in (RiskSeverity.HIGH, RiskSeverity.CRITICAL)
        )
        penalty = (high_critical / total) * 100
        risk_density = max(0.0, 100.0 - penalty)

    #  4. Schedule Risk 
    schedule_risks = [r for r in risks if r.category == "schedule"]
    if not risks:
        schedule_risk_score = 100.0
    else:
        schedule_high = sum(
            1 for r in schedule_risks
            if r.severity in (RiskSeverity.HIGH, RiskSeverity.CRITICAL)
        )
        schedule_risk_score = max(0.0, 100.0 - (schedule_high / max(len(risks), 1)) * 100)

    #  Weighted average 
    health_score = (
        scope_clarity * 0.30 +
        doc_completeness * 0.20 +
        risk_density * 0.30 +
        schedule_risk_score * 0.20
    )

    breakdown = HealthBreakdown(
        schedule_risk_percent=round(schedule_risk_score, 1),
        scope_clarity_percent=round(scope_clarity, 1),
        documentation_completeness_percent=round(doc_completeness, 1),
        risk_density_percent=round(risk_density, 1),
    )

    return round(health_score, 1), breakdown


#  LangGraph Node 

async def health_node(state: dict) -> dict:
    """
    LangGraph node: computes project health score from scope + risks.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).
    This node is fully deterministic — no LLM call required.
    Returns only the keys it mutates.
    """
    print(f"[GRAPH] > health_node — project: {state['project_id']}")

    scope = state.get("scope")
    risks = state.get("risks") or []

    health_score, breakdown = compute_health_score(scope, risks)

    return {
        "health_score": health_score,
        "health_breakdown": breakdown,
        "step_log": [
            f"health_node: score={health_score}/100 "
            f"(scope={breakdown.scope_clarity_percent}%, "
            f"docs={breakdown.documentation_completeness_percent}%, "
            f"risk_density={breakdown.risk_density_percent}%, "
            f"schedule={breakdown.schedule_risk_percent}%)"
        ],
    }

