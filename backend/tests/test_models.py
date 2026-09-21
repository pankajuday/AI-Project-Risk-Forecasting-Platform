"""
Tests for app/models/ — enums, Pydantic models (no database required)
=======================================================================
Run with:
    cd backend
    python -m pytest tests/test_models.py -v

All tests work purely with Pydantic model instantiation and enum value
inspection — zero database or network calls are made.
"""

from __future__ import annotations

import sys
import os
from pathlib import Path

import pytest
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

from models.document_model import DocumentStatus, FileType  # noqa: E402
from models.project_model import CreateProject, ProjectStatus  # noqa: E402
from models.report_model import (  # noqa: E402
    AnalysisStatus,
    GeneratedDocument,
    HealthBreakdown,
    RiskCategory,
    RiskItem,
    RiskSeverity,
    ScopeOutput,
)
from models.chat_model import ChatMessage, MessageRole  # noqa: E402



# FileType enum



class TestFileTypeEnum:
    def test_pdf_value(self):
        assert FileType.PDF == "pdf"

    def test_docx_value(self):
        assert FileType.DOCX == "docx"

    def test_xlsx_value(self):
        assert FileType.XLSX == "xlsx"

    def test_txt_value(self):
        assert FileType.TXT == "txt"

    def test_md_value(self):
        assert FileType.MD == "md"

    def test_csv_value(self):
        assert FileType.CSV == "csv"

    def test_image_value(self):
        assert FileType.IMAGE == "image"

    def test_pptx_value(self):
        assert FileType.PPTX == "pptx"

    def test_other_value(self):
        assert FileType.OTHER == "other"

    def test_all_members_count(self):
        assert len(FileType) == 9



# DocumentStatus enum



class TestDocumentStatusEnum:
    def test_pending_value(self):
        assert DocumentStatus.PENDING == "pending"

    def test_processing_value(self):
        assert DocumentStatus.PROCESSING == "processing"

    def test_indexed_value(self):
        assert DocumentStatus.INDEXED == "indexed"

    def test_completed_value(self):
        assert DocumentStatus.COMPLETED == "completed"

    def test_failed_value(self):
        assert DocumentStatus.FAILED == "failed"

    def test_all_members_count(self):
        assert len(DocumentStatus) == 5



# ProjectStatus enum



class TestProjectStatusEnum:
    def test_created_value(self):
        assert ProjectStatus.CREATED == "created"

    def test_complete_value(self):
        assert ProjectStatus.COMPLETE == "completed"

    def test_failed_value(self):
        assert ProjectStatus.FAILED == "failed"

    def test_archived_value(self):
        assert ProjectStatus.ARCHIVED == "archived"

    def test_analysis_pending_value(self):
        assert ProjectStatus.ANALYSIS_PENDING == "analysis_pending"

    def test_analysis_running_value(self):
        assert ProjectStatus.ANALYSIS_RUNNING == "analysis_running"

    def test_analysis_ready_value(self):
        assert ProjectStatus.ANALYSIS_READY == "analysis_ready"



# AnalysisStatus enum



class TestAnalysisStatusEnum:
    def test_pending_value(self):
        assert AnalysisStatus.PENDING == "pending"

    def test_running_value(self):
        assert AnalysisStatus.RUNNING == "running"

    def test_ready_value(self):
        assert AnalysisStatus.READY == "ready"

    def test_failed_value(self):
        assert AnalysisStatus.FAILED == "failed"

    def test_all_members_count(self):
        assert len(AnalysisStatus) == 4



# RiskSeverity enum



class TestRiskSeverityEnum:
    def test_low_value(self):
        assert RiskSeverity.LOW == "low"

    def test_medium_value(self):
        assert RiskSeverity.MEDIUM == "medium"

    def test_high_value(self):
        assert RiskSeverity.HIGH == "high"

    def test_critical_value(self):
        assert RiskSeverity.CRITICAL == "critical"

    def test_all_members_count(self):
        assert len(RiskSeverity) == 4



# RiskCategory enum



class TestRiskCategoryEnum:
    def test_technical_value(self):
        assert RiskCategory.TECHNICAL == "technical"

    def test_resource_value(self):
        assert RiskCategory.RESOURCE == "resource"

    def test_schedule_value(self):
        assert RiskCategory.SCHEDULE == "schedule"

    def test_scope_value(self):
        assert RiskCategory.SCOPE == "scope"

    def test_external_value(self):
        assert RiskCategory.EXTERNAL == "external"

    def test_quality_value(self):
        assert RiskCategory.QUALITY == "quality"

    def test_all_members_count(self):
        assert len(RiskCategory) == 6



# MessageRole enum



class TestMessageRoleEnum:
    def test_user_value(self):
        assert MessageRole.USER == "user"

    def test_assistant_value(self):
        assert MessageRole.ASSISTANT == "assistant"

    def test_system_value(self):
        assert MessageRole.SYSTEM == "system"

    def test_all_members_count(self):
        assert len(MessageRole) == 3



# RiskItem Pydantic model



class TestRiskItemModel:
    def _valid_risk(self, **overrides) -> dict:
        base = {
            "title": "Resource Shortage",
            "description": "Team is understaffed.",
            "category": RiskCategory.RESOURCE,
            "severity": RiskSeverity.HIGH,
            "probability": "High",
            "impact": "Delayed delivery",
            "mitigation": "Hire contractors",
        }
        base.update(overrides)
        return base

    def test_valid_risk_item_creation(self):
        risk = RiskItem(**self._valid_risk())
        assert risk.title == "Resource Shortage"

    def test_category_is_risk_category(self):
        risk = RiskItem(**self._valid_risk())
        assert isinstance(risk.category, RiskCategory)

    def test_severity_is_risk_severity(self):
        risk = RiskItem(**self._valid_risk())
        assert isinstance(risk.severity, RiskSeverity)

    def test_source_context_defaults_to_none(self):
        risk = RiskItem(**self._valid_risk())
        assert risk.source_context is None

    def test_source_context_can_be_set(self):
        risk = RiskItem(**self._valid_risk(source_context="Section 3.2 mentions delays."))
        assert risk.source_context == "Section 3.2 mentions delays."



# ScopeOutput Pydantic model



class TestScopeOutputModel:
    def test_defaults_all_lists_empty(self):
        scope = ScopeOutput()
        assert scope.objectives == []
        assert scope.deliverables == []
        assert scope.stakeholders == []
        assert scope.out_of_scope == []

    def test_defaults_optional_fields_none(self):
        scope = ScopeOutput()
        assert scope.project_name is None
        assert scope.timeline is None
        assert scope.summary is None

    def test_can_set_all_fields(self):
        scope = ScopeOutput(
            project_name="Alpha",
            objectives=["O1", "O2"],
            deliverables=["D1"],
            timeline="Q2 2025",
            stakeholders=["PM"],
            out_of_scope=["Marketing"],
            summary="Scope summary",
        )
        assert scope.project_name == "Alpha"
        assert len(scope.objectives) == 2



# HealthBreakdown Pydantic model



class TestHealthBreakdownModel:
    def test_all_fields_default_to_zero(self):
        bd = HealthBreakdown()
        assert bd.schedule_risk_percent == 0.0
        assert bd.scope_clarity_percent == 0.0
        assert bd.documentation_completeness_percent == 0.0
        assert bd.risk_density_percent == 0.0

    def test_can_set_values(self):
        bd = HealthBreakdown(
            schedule_risk_percent=75.5,
            scope_clarity_percent=80.0,
            documentation_completeness_percent=100.0,
            risk_density_percent=60.0,
        )
        assert bd.schedule_risk_percent == 75.5



# GeneratedDocument Pydantic model



class TestGeneratedDocumentModel:
    def test_creation_with_required_fields(self):
        doc = GeneratedDocument(
            title="Risk Register",
            doc_type="risk_register",
            content="# Risks\n- Risk 1",
        )
        assert doc.title == "Risk Register"
        assert doc.doc_type == "risk_register"
        assert "Risk 1" in doc.content

    def test_created_at_is_set_automatically(self):
        doc = GeneratedDocument(
            title="T", doc_type="user_stories", content="content"
        )
        assert doc.created_at is not None



# ChatMessage Pydantic model



class TestChatMessageModel:
    def test_creation_with_role_and_content(self):
        msg = ChatMessage(role=MessageRole.USER, content="Hello!")
        assert msg.role == MessageRole.USER
        assert msg.content == "Hello!"

    def test_sources_default_empty(self):
        msg = ChatMessage(role=MessageRole.ASSISTANT, content="Hi!")
        assert msg.sources == []

    def test_timestamp_auto_set(self):
        msg = ChatMessage(role=MessageRole.SYSTEM, content="System message")
        assert msg.timestamp is not None

    def test_sources_can_be_provided(self):
        msg = ChatMessage(
            role=MessageRole.ASSISTANT,
            content="Based on doc1...",
            sources=["report.pdf", "plan.docx"],
        )
        assert "report.pdf" in msg.sources



# CreateProject Pydantic model



class TestCreateProjectModel:
    def test_name_is_required(self):
        with pytest.raises(Exception):
            CreateProject()  # missing name

    def test_valid_creation(self):
        cp = CreateProject(name="My Project")
        assert cp.name == "My Project"

    def test_description_defaults_to_none(self):
        cp = CreateProject(name="Project X")
        assert cp.description is None

    def test_description_can_be_set(self):
        cp = CreateProject(name="Project Y", description="A new project")
        assert cp.description == "A new project"
