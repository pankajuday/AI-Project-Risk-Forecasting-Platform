"""
Tests for document_controller utility functions (_guess_mime, _FILE_TYPE_MAP)
==============================================================================
Run with:
    cd backend
    python -m pytest tests/test_document_controller_utils.py -v

Only the pure utility functions are tested here — no database, no S3,
no network calls are made.  The DB-dependent upload/list/delete functions
are integration tests and are not covered in this file.

Heavy module-level imports from rag.pipeline and storage.service are
mocked before importing the document_controller module so this test
file runs in milliseconds without any network or GPU resources.
"""

from __future__ import annotations

import sys
import os
import types
from pathlib import Path
from unittest.mock import MagicMock


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


# Stub out heavy transitive dependencies BEFORE importing document_controller


class _MockException(Exception):
    pass

for _mod in [
    "rag",
    "rag.pipeline",
    "storage",
    "storage.service",
    "storage.client",
    "storage.exceptions",
    "config.qdrant",
    "langchain_google_genai",
    "langchain_core",
    "langchain_core.messages",
    "langgraph",
]:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

# Define exception classes so except clauses don't fail
sys.modules["storage.exceptions"].S3NotFoundError = type("S3NotFoundError", (_MockException,), {})
sys.modules["storage.exceptions"].S3StorageError = type("S3StorageError", (_MockException,), {})
sys.modules["storage.exceptions"].S3UploadError = type("S3UploadError", (_MockException,), {})

import pytest  # noqa: E402

from controllers.document_controller import _guess_mime, _FILE_TYPE_MAP  # noqa: E402
from models.document_model import FileType  # noqa: E402



# _guess_mime



class TestGuessMime:
    """_guess_mime maps common extensions to their MIME types."""

    def test_pdf_returns_application_pdf(self):
        assert _guess_mime("report.pdf") == "application/pdf"

    def test_docx_returns_docx_mime(self):
        mime = _guess_mime("document.docx")
        assert "wordprocessingml" in mime

    def test_xlsx_returns_xlsx_mime(self):
        mime = _guess_mime("spreadsheet.xlsx")
        assert "spreadsheetml" in mime

    def test_pptx_returns_pptx_mime(self):
        mime = _guess_mime("slides.pptx")
        assert "presentationml" in mime

    def test_txt_returns_text_plain(self):
        mime = _guess_mime("notes.txt")
        assert mime.startswith("text/plain")

    def test_md_returns_text_markdown(self):
        mime = _guess_mime("README.md")
        assert "markdown" in mime

    def test_csv_returns_text_csv(self):
        mime = _guess_mime("data.csv")
        assert "text/csv" in mime

    def test_unknown_extension_returns_octet_stream(self):
        mime = _guess_mime("file.xyz")
        assert mime == "application/octet-stream"

    def test_no_extension_returns_octet_stream(self):
        mime = _guess_mime("noextension")
        assert mime == "application/octet-stream"

    def test_json_returns_application_json(self):
        mime = _guess_mime("data.json")
        assert "application/json" in mime

    def test_uppercase_extension_handled(self):
        """Extensions should be lowercased before lookup, no exception raised."""
        mime = _guess_mime("report.PDF")
        assert isinstance(mime, str)

    def test_multiple_dots_uses_last_extension(self):
        """report.final.2024.pdf -> extension = pdf."""
        mime = _guess_mime("report.final.2024.pdf")
        assert mime == "application/pdf"



# _FILE_TYPE_MAP



class TestFileTypeMap:
    """_FILE_TYPE_MAP must correctly map validator output strings to FileType enum values."""

    def test_pdf_maps_to_FileType_PDF(self):
        assert _FILE_TYPE_MAP["pdf"] == FileType.PDF

    def test_docx_maps_to_FileType_DOCX(self):
        assert _FILE_TYPE_MAP["docx"] == FileType.DOCX

    def test_xlsx_maps_to_FileType_XLSX(self):
        assert _FILE_TYPE_MAP["xlsx"] == FileType.XLSX

    def test_pptx_maps_to_FileType_PPTX(self):
        assert _FILE_TYPE_MAP["pptx"] == FileType.PPTX

    def test_txt_maps_to_FileType_TXT(self):
        assert _FILE_TYPE_MAP["txt"] == FileType.TXT

    def test_md_maps_to_FileType_MD(self):
        assert _FILE_TYPE_MAP["md"] == FileType.MD

    def test_csv_maps_to_FileType_CSV(self):
        assert _FILE_TYPE_MAP["csv"] == FileType.CSV

    def test_image_maps_to_FileType_IMAGE(self):
        assert _FILE_TYPE_MAP["image"] == FileType.IMAGE

    def test_all_map_values_are_FileType_instances(self):
        for key, value in _FILE_TYPE_MAP.items():
            assert isinstance(value, FileType), f"Key '{key}' maps to non-FileType: {value}"
