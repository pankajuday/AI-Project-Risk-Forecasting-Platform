"""
Tests for agents.pipeline_state
================================
Run with:
    cd backend
    python -m pytest tests/test_pipeline_state.py -v

Tests operate only on the pure reducer functions — no LLM, no database,
no network calls are made.
"""

from __future__ import annotations

import sys
from pathlib import Path

import os
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

from datetime import datetime, timezone

from agents.pipeline_state import _append_log, _merge_docs  # noqa: E402
from models.report_model import GeneratedDocument  # noqa: E402



# Helper


def _make_doc(doc_type: str, title: str = "Title", content: str = "Content") -> GeneratedDocument:
    return GeneratedDocument(doc_type=doc_type, title=title, content=content)



# _append_log reducer



class TestAppendLog:
    """_append_log must concatenate two lists without mutating the originals."""

    def test_appends_new_lines_to_existing(self):
        existing = ["line 1", "line 2"]
        new = ["line 3", "line 4"]
        result = _append_log(existing, new)
        assert result == ["line 1", "line 2", "line 3", "line 4"]

    def test_existing_empty_new_has_entries(self):
        result = _append_log([], ["hello"])
        assert result == ["hello"]

    def test_new_empty_returns_existing(self):
        result = _append_log(["existing"], [])
        assert result == ["existing"]

    def test_both_empty_returns_empty(self):
        result = _append_log([], [])
        assert result == []

    def test_does_not_mutate_existing(self):
        existing = ["a"]
        _append_log(existing, ["b"])
        assert existing == ["a"]

    def test_preserves_order(self):
        existing = ["first"]
        new = ["second", "third"]
        result = _append_log(existing, new)
        assert result[0] == "first"
        assert result[1] == "second"
        assert result[2] == "third"



# _merge_docs reducer



class TestMergeDocs:
    """_merge_docs must upsert documents by doc_type."""

    def test_new_doc_type_is_added(self):
        existing = [_make_doc("risk_register")]
        new = [_make_doc("user_stories")]
        result = _merge_docs(existing, new)
        types = {d.doc_type for d in result}
        assert "risk_register" in types
        assert "user_stories" in types

    def test_existing_doc_type_is_replaced(self):
        old_doc = _make_doc("sprint_plan", title="Old Title", content="Old content")
        new_doc = _make_doc("sprint_plan", title="New Title", content="New content")
        result = _merge_docs([old_doc], [new_doc])
        sprint_docs = [d for d in result if d.doc_type == "sprint_plan"]
        assert len(sprint_docs) == 1
        assert sprint_docs[0].title == "New Title"
        assert sprint_docs[0].content == "New content"

    def test_empty_new_list_returns_existing_unchanged(self):
        existing = [_make_doc("risk_register"), _make_doc("user_stories")]
        result = _merge_docs(existing, [])
        assert len(result) == 2

    def test_empty_existing_returns_new(self):
        new = [_make_doc("executive_summary")]
        result = _merge_docs([], new)
        assert len(result) == 1
        assert result[0].doc_type == "executive_summary"

    def test_both_empty_returns_empty(self):
        result = _merge_docs([], [])
        assert result == []

    def test_multiple_new_docs_all_added(self):
        new = [_make_doc("type_a"), _make_doc("type_b"), _make_doc("type_c")]
        result = _merge_docs([], new)
        types = {d.doc_type for d in result}
        assert types == {"type_a", "type_b", "type_c"}

    def test_upsert_with_multiple_existing_types(self):
        existing = [
            _make_doc("risk_register", title="R1"),
            _make_doc("user_stories", title="U1"),
        ]
        new = [_make_doc("risk_register", title="R2")]  # replace risk_register
        result = _merge_docs(existing, new)
        types = {d.doc_type: d for d in result}
        assert types["risk_register"].title == "R2"
        assert types["user_stories"].title == "U1"
