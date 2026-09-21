"""
Tests for agents.health_agent.compute_health_score
===================================================
Run with:
    cd backend
    python -m pytest tests/test_health_agent.py -v

compute_health_score is a pure, deterministic function that requires
no LLM or database — all tests run fully in-memory.

Scoring formula (each dimension contributes a weighted share of 0-100):
  scope_clarity     (weight 0.30) — based on how many scope fields are filled
  doc_completeness  (weight 0.20) — based on out_of_scope, objectives, deliverables, stakeholders
  risk_density      (weight 0.30) — penalised by high/critical risk count
  schedule_risk     (weight 0.20) — penalised by high/critical schedule-category risks
"""

from __future__ import annotations

import sys
import os
from pathlib import Path


from dotenv import load_dotenv

# Path setup

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

# Load .env
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_FILE)

os.environ.setdefault(
    "JWT_SECRET_KEY",
    os.getenv("JWT_SECRET_KEY") or "test-jwt-secret-key-minimum-32-bytes-long-for-sha256",
)
os.environ.setdefault("API_ORIGIN", os.getenv("API_ORIGIN") or "http://localhost:3000")

import pytest  # noqa: E402

from agents.health_agent import compute_health_score  # noqa: E402
from models.report_model import (  # noqa: E402
    HealthBreakdown,
    RiskCategory,
    RiskItem,
    RiskSeverity,
    ScopeOutput,
)



# Helpers


def _make_risk(
    severity: RiskSeverity = RiskSeverity.LOW,
    category: RiskCategory = RiskCategory.TECHNICAL,
) -> RiskItem:
    return RiskItem(
        title="Test Risk",
        description="A test risk description.",
        category=category,
        severity=severity,
        probability="Medium",
        impact="Moderate impact",
        mitigation="Apply mitigation strategy",
    )


def _full_scope() -> ScopeOutput:
    return ScopeOutput(
        project_name="Test Project",
        objectives=["Obj1", "Obj2", "Obj3"],
        deliverables=["Del1", "Del2", "Del3"],
        timeline="Q1 2025",
        stakeholders=["Alice", "Bob"],
        out_of_scope=["Mobile app"],
        summary="A comprehensive project scope.",
    )


def _empty_scope() -> ScopeOutput:
    return ScopeOutput()



# Return type



class TestReturnType:
    """compute_health_score must always return a (float, HealthBreakdown) tuple."""

    def test_returns_tuple(self):
        result = compute_health_score(None, [])
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_first_element_is_float(self):
        score, _ = compute_health_score(None, [])
        assert isinstance(score, float)

    def test_second_element_is_health_breakdown(self):
        _, breakdown = compute_health_score(None, [])
        assert isinstance(breakdown, HealthBreakdown)



# Score bounds



class TestScoreBounds:
    """Health score must always be within [0.0, 100.0]."""

    def test_score_with_no_scope_no_risks(self):
        score, _ = compute_health_score(None, [])
        assert 0.0 <= score <= 100.0

    def test_score_with_full_scope_no_risks(self):
        score, _ = compute_health_score(_full_scope(), [])
        assert 0.0 <= score <= 100.0

    def test_score_with_all_critical_risks(self):
        risks = [_make_risk(RiskSeverity.CRITICAL) for _ in range(10)]
        score, _ = compute_health_score(_full_scope(), risks)
        assert 0.0 <= score <= 100.0

    def test_score_never_negative(self):
        risks = [_make_risk(RiskSeverity.CRITICAL, RiskCategory.SCHEDULE) for _ in range(20)]
        score, _ = compute_health_score(None, risks)
        assert score >= 0.0



# No scope / no risks



class TestNoScopeNoRisks:
    """When no scope and no risks, only risk_density and schedule_risk contribute."""

    def test_no_scope_no_risks_score_is_deterministic(self):
        """Score = 0*0.30 + 0*0.20 + 100*0.30 + 100*0.20 = 50.0"""
        score, breakdown = compute_health_score(None, [])
        # risk_density=100 when no risks, schedule_risk=100 when no risks
        assert score == pytest.approx(50.0, abs=0.5)

    def test_no_scope_breakdown_scope_clarity_is_zero(self):
        _, breakdown = compute_health_score(None, [])
        assert breakdown.scope_clarity_percent == pytest.approx(0.0)

    def test_no_scope_breakdown_doc_completeness_is_zero(self):
        _, breakdown = compute_health_score(None, [])
        assert breakdown.documentation_completeness_percent == pytest.approx(0.0)

    def test_no_risks_breakdown_risk_density_is_100(self):
        _, breakdown = compute_health_score(None, [])
        assert breakdown.risk_density_percent == pytest.approx(100.0)

    def test_no_risks_breakdown_schedule_risk_is_100(self):
        _, breakdown = compute_health_score(None, [])
        assert breakdown.schedule_risk_percent == pytest.approx(100.0)



# Full scope, no risks -> high score



class TestFullScopeNoRisks:
    """Full scope + no risks should yield the maximum possible health score."""

    def test_full_scope_no_risks_high_score(self):
        score, _ = compute_health_score(_full_scope(), [])
        assert score > 80.0

    def test_full_scope_scope_clarity_high(self):
        _, breakdown = compute_health_score(_full_scope(), [])
        assert breakdown.scope_clarity_percent > 80.0

    def test_full_scope_doc_completeness_100(self):
        """All 4 doc criteria met -> doc_completeness = 100."""
        _, breakdown = compute_health_score(_full_scope(), [])
        assert breakdown.documentation_completeness_percent == pytest.approx(100.0)



# Empty scope with all fields missing



class TestEmptyScope:
    def test_empty_scope_scope_clarity_is_zero(self):
        _, breakdown = compute_health_score(_empty_scope(), [])
        assert breakdown.scope_clarity_percent == pytest.approx(0.0)

    def test_empty_scope_doc_completeness_is_zero(self):
        _, breakdown = compute_health_score(_empty_scope(), [])
        assert breakdown.documentation_completeness_percent == pytest.approx(0.0)



# Risk density



class TestRiskDensity:
    """High/critical risks reduce risk_density_percent."""

    def test_all_low_risks_density_is_100(self):
        risks = [_make_risk(RiskSeverity.LOW) for _ in range(5)]
        _, breakdown = compute_health_score(None, risks)
        assert breakdown.risk_density_percent == pytest.approx(100.0)

    def test_all_critical_risks_density_is_zero(self):
        risks = [_make_risk(RiskSeverity.CRITICAL) for _ in range(5)]
        _, breakdown = compute_health_score(None, risks)
        assert breakdown.risk_density_percent == pytest.approx(0.0)

    def test_mixed_severity_density_between_0_and_100(self):
        risks = [
            _make_risk(RiskSeverity.CRITICAL),
            _make_risk(RiskSeverity.LOW),
        ]
        _, breakdown = compute_health_score(None, risks)
        assert 0.0 < breakdown.risk_density_percent < 100.0

    def test_medium_risks_treated_as_non_high(self):
        risks = [_make_risk(RiskSeverity.MEDIUM) for _ in range(5)]
        _, breakdown = compute_health_score(None, risks)
        assert breakdown.risk_density_percent == pytest.approx(100.0)



# Schedule risk



class TestScheduleRisk:
    """High/critical schedule-category risks reduce schedule_risk_percent."""

    def test_no_schedule_risks_score_is_100(self):
        risks = [_make_risk(RiskSeverity.HIGH, RiskCategory.TECHNICAL)]
        _, breakdown = compute_health_score(None, risks)
        assert breakdown.schedule_risk_percent == pytest.approx(100.0)

    def test_high_schedule_risk_reduces_schedule_score(self):
        risks = [_make_risk(RiskSeverity.HIGH, RiskCategory.SCHEDULE)]
        _, breakdown = compute_health_score(None, risks)
        assert breakdown.schedule_risk_percent < 100.0

    def test_low_schedule_risk_does_not_reduce_score(self):
        risks = [_make_risk(RiskSeverity.LOW, RiskCategory.SCHEDULE)]
        _, breakdown = compute_health_score(None, risks)
        assert breakdown.schedule_risk_percent == pytest.approx(100.0)



# Breakdown rounding



class TestBreakdownRounding:
    """All breakdown fields must be rounded to 1 decimal place."""

    def test_scope_clarity_is_rounded(self):
        scope = ScopeOutput(project_name="P", objectives=["o1"])
        _, breakdown = compute_health_score(scope, [])
        # Check the value is rounded to 1 decimal
        assert round(breakdown.scope_clarity_percent, 1) == breakdown.scope_clarity_percent

    def test_risk_density_is_rounded(self):
        risks = [
            _make_risk(RiskSeverity.CRITICAL),
            _make_risk(RiskSeverity.LOW),
            _make_risk(RiskSeverity.LOW),
        ]
        _, breakdown = compute_health_score(None, risks)
        assert round(breakdown.risk_density_percent, 1) == breakdown.risk_density_percent

    def test_schedule_risk_is_rounded(self):
        risks = [_make_risk(RiskSeverity.HIGH, RiskCategory.SCHEDULE)]
        _, breakdown = compute_health_score(None, risks)
        assert round(breakdown.schedule_risk_percent, 1) == breakdown.schedule_risk_percent
