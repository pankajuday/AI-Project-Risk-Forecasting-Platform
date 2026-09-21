"""
Tests for utils.file_validator
===============================
Run with:
    cd backend
    python -m pytest tests/test_file_validator.py -v

All tests operate purely on in-memory bytes — no actual file I/O or network
calls are performed.  Real minimal valid binary fixtures are constructed
programmatically so the tests have zero external file dependencies.
"""

from __future__ import annotations

import io
import os
import zipfile

import pytest


# Path setup — ensure app/ is importable when running pytest from backend/

import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from utils.file_validator import (  # noqa: E402
    FileValidationError,
    FileValidator,
    ValidationErrorCode,
    ValidationResult,
)



# Helpers — minimal valid binary fixtures


def _make_minimal_pdf() -> bytes:
    """Return the smallest structurally valid PDF that passes our checks."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n"
        b"xref\n0 4\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"trailer<</Size 4/Root 1 0 R>>\n"
        b"startxref\n173\n"
        b"%%EOF"
    )


def _make_minimal_docx() -> bytes:
    """Return a minimal .docx (OOXML ZIP) that passes our integrity check."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            "<w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body>"
            "</w:document>",
        )
    return buf.getvalue()


def _make_minimal_xlsx() -> bytes:
    """Return a minimal .xlsx (OOXML ZIP) that passes our integrity check."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
        zf.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheets><sheet name="Sheet1" sheetId="1"/></sheets>'
            "</workbook>",
        )
    return buf.getvalue()


def _make_minimal_zip_no_office_entries() -> bytes:
    """Return a valid ZIP that lacks any Office XML structure."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("random_file.txt", "not an office document")
    return buf.getvalue()


def _make_corrupted_zip() -> bytes:
    """Return bytes that start like a ZIP magic but are truncated/corrupted."""
    return b"PK\x03\x04" + b"\x00" * 30 + b"corrupted garbage"


def _make_minimal_png() -> bytes:
    """Return a 1x1 red pixel PNG."""
    return (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR"
        b"\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00"
        b"\x90wS\xde"
        b"\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )



# Helpers — call validate and assert it raises the expected error code


def _assert_raises_code(content: bytes, filename: str, content_type: str, expected_code: ValidationErrorCode):
    """Assert that FileValidator.validate raises FileValidationError with the given code."""
    raised = False
    code = None
    try:
        FileValidator.validate(content, filename, content_type)
    except FileValidationError as exc:
        raised = True
        code = exc.code
    assert raised, f"Expected FileValidationError({expected_code}) but nothing was raised"
    assert code == expected_code, f"Expected code {expected_code!r}, got {code!r}"


def _assert_raises_one_of(content: bytes, filename: str, content_type: str, expected_codes: set):
    """Assert that FileValidator.validate raises FileValidationError with one of the given codes."""
    raised = False
    code = None
    try:
        FileValidator.validate(content, filename, content_type)
    except FileValidationError as exc:
        raised = True
        code = exc.code
    assert raised, f"Expected FileValidationError(one of {expected_codes}) but nothing was raised"
    assert code in expected_codes, f"Expected code in {expected_codes!r}, got {code!r}"



# Valid-file tests


class TestValidFiles:
    """All valid files should return a ValidationResult without raising."""

    def test_valid_pdf(self):
        content = _make_minimal_pdf()
        result = FileValidator.validate(content, "report.pdf", "application/pdf")
        assert isinstance(result, ValidationResult)
        assert result.file_type == "pdf"
        assert result.file_size == len(content)

    def test_valid_docx(self):
        content = _make_minimal_docx()
        result = FileValidator.validate(
            content,
            "document.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        assert result.file_type == "docx"

    def test_valid_xlsx(self):
        content = _make_minimal_xlsx()
        result = FileValidator.validate(
            content,
            "spreadsheet.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        assert result.file_type == "xlsx"

    def test_valid_txt(self):
        content = b"This is a valid plain text document with meaningful content."
        result = FileValidator.validate(content, "notes.txt", "text/plain")
        assert result.file_type == "txt"

    def test_valid_csv(self):
        content = b"id,name,value\n1,Alpha,100\n2,Beta,200\n"
        result = FileValidator.validate(content, "data.csv", "text/csv")
        assert result.file_type == "csv"

    def test_valid_md(self):
        content = b"# Project Plan\n\nThis document describes the project plan.\n"
        result = FileValidator.validate(content, "README.md", "text/markdown")
        assert result.file_type == "md"

    def test_valid_png(self):
        content = _make_minimal_png()
        result = FileValidator.validate(content, "screenshot.png", "image/png")
        assert result.file_type == "image"

    def test_result_file_size_matches_content(self):
        content = b"Hello, world!"
        result = FileValidator.validate(content, "hello.txt", "text/plain")
        assert result.file_size == len(content)

    def test_content_type_not_trusted_alone(self):
        """Even if claimed content_type is wrong, magic bytes rule."""
        content = _make_minimal_pdf()
        result = FileValidator.validate(content, "report.pdf", "text/plain")
        assert result.file_type == "pdf"



# Empty file


class TestEmptyFile:
    def test_empty_bytes(self):
        _assert_raises_code(b"", "empty.pdf", "application/pdf", ValidationErrorCode.EMPTY_FILE)

    def test_empty_txt(self):
        _assert_raises_code(b"", "empty.txt", "text/plain", ValidationErrorCode.EMPTY_FILE)



# Oversized file


class TestOversizedFile:
    def test_file_exceeds_limit(self, monkeypatch):
        """Lower limit to 1 byte, send 10 bytes — must raise FILE_TOO_LARGE."""
        monkeypatch.setenv("MAX_UPLOAD_SIZE_MB", "0.000001")
        # We call the private size-check helper directly so we avoid reload issues.
        import utils.file_validator as fv_module

        original_max = fv_module._max_upload_bytes

        def tiny_limit() -> int:
            return 1  # 1 byte limit

        monkeypatch.setattr(fv_module, "_max_upload_bytes", tiny_limit)

        raised = False
        code = None
        try:
            FileValidator.validate(b"x" * 10, "big.txt", "text/plain")
        except FileValidationError as exc:
            raised = True
            code = exc.code
        assert raised, "Expected FILE_TOO_LARGE but nothing was raised"
        assert code == ValidationErrorCode.FILE_TOO_LARGE

    def test_file_at_limit_passes(self, monkeypatch):
        """A file exactly at the 1 MB limit should be accepted."""
        import utils.file_validator as fv_module

        def one_mb() -> int:
            return 1 * 1024 * 1024

        monkeypatch.setattr(fv_module, "_max_upload_bytes", one_mb)
        content = b"A" * (1 * 1024 * 1024)
        result = FileValidator.validate(content, "big.txt", "text/plain")
        assert result.file_type == "txt"



# Unsupported file type


class TestUnsupportedFileType:
    def test_exe_extension(self):
        _assert_raises_code(
            b"MZ\x00\x00", "malware.exe", "application/octet-stream",
            ValidationErrorCode.UNSUPPORTED_FILE_TYPE,
        )

    def test_zip_extension(self):
        _assert_raises_code(
            b"PK\x03\x04", "archive.zip", "application/zip",
            ValidationErrorCode.UNSUPPORTED_FILE_TYPE,
        )

    def test_no_extension(self):
        _assert_raises_code(
            b"some content", "noextension", "text/plain",
            ValidationErrorCode.UNSUPPORTED_FILE_TYPE,
        )

    def test_unknown_extension(self):
        _assert_raises_code(
            b"data", "file.xyz", "application/octet-stream",
            ValidationErrorCode.UNSUPPORTED_FILE_TYPE,
        )



# Invalid file format (magic bytes mismatch)


class TestInvalidFileFormat:
    def test_txt_renamed_to_pdf(self):
        """Plain text renamed to .pdf -> fails magic-byte or header check."""
        content = b"This is just plain text, not a PDF at all."
        _assert_raises_one_of(
            content, "fake.pdf", "application/pdf",
            {ValidationErrorCode.INVALID_FILE_FORMAT, ValidationErrorCode.CORRUPTED_FILE},
        )

    def test_pdf_renamed_to_docx(self):
        """A PDF file masquerading as .docx -> fails."""
        content = _make_minimal_pdf()
        _assert_raises_one_of(
            content, "fake.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            {ValidationErrorCode.INVALID_FILE_FORMAT, ValidationErrorCode.CORRUPTED_FILE},
        )

    def test_png_renamed_to_pdf(self):
        """A PNG image renamed to .pdf -> fails magic-byte or header check."""
        content = _make_minimal_png()
        _assert_raises_one_of(
            content, "image_as_pdf.pdf", "application/pdf",
            {ValidationErrorCode.INVALID_FILE_FORMAT, ValidationErrorCode.CORRUPTED_FILE},
        )



# Corrupted files


class TestCorruptedFiles:
    def test_corrupted_pdf_missing_header(self):
        content = b"This has an %%EOF but no PDF header at all.\n%%EOF"
        _assert_raises_one_of(
            content, "bad.pdf", "application/pdf",
            {ValidationErrorCode.CORRUPTED_FILE, ValidationErrorCode.INVALID_FILE_FORMAT},
        )

    def test_corrupted_pdf_missing_eof(self):
        content = b"%PDF-1.4\nsome data without end marker"
        _assert_raises_code(
            content, "truncated.pdf", "application/pdf",
            ValidationErrorCode.CORRUPTED_FILE,
        )

    def test_corrupted_docx_invalid_zip(self):
        content = _make_corrupted_zip()
        _assert_raises_code(
            content, "corrupt.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ValidationErrorCode.CORRUPTED_FILE,
        )

    def test_corrupted_xlsx_invalid_zip(self):
        content = _make_corrupted_zip()
        _assert_raises_code(
            content, "corrupt.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ValidationErrorCode.CORRUPTED_FILE,
        )

    def test_docx_missing_word_entries(self):
        """A valid ZIP that lacks word/ directory — not a real DOCX."""
        content = _make_minimal_zip_no_office_entries()
        _assert_raises_code(
            content, "fake.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ValidationErrorCode.CORRUPTED_FILE,
        )

    def test_xlsx_missing_xl_entries(self):
        """A valid ZIP that lacks xl/ directory — not a real XLSX."""
        content = _make_minimal_zip_no_office_entries()
        _assert_raises_code(
            content, "fake.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ValidationErrorCode.CORRUPTED_FILE,
        )



# Unreadable text


class TestUnreadableFile:
    def test_binary_data_as_txt(self, monkeypatch):
        """Simulate a text file that cannot be decoded by patching the check."""
        import utils.file_validator as fv_module

        def always_fails(content: bytes, filename: str) -> None:
            raise FileValidationError(
                ValidationErrorCode.UNREADABLE_FILE,
                f"'{filename}' could not be decoded.",
            )

        monkeypatch.setattr(fv_module.FileValidator, "_check_text_readable", staticmethod(always_fails))

        _assert_raises_code(
            b"Some content", "binary.txt", "text/plain",
            ValidationErrorCode.UNREADABLE_FILE,
        )



# No extractable text


class TestNoExtractableText:
    def test_whitespace_only_txt(self):
        _assert_raises_code(
            b"   \n\n\t   \r\n   ", "blank.txt", "text/plain",
            ValidationErrorCode.NO_EXTRACTABLE_TEXT,
        )

    def test_whitespace_only_csv(self):
        _assert_raises_code(
            b"\n\n\n", "empty.csv", "text/csv",
            ValidationErrorCode.NO_EXTRACTABLE_TEXT,
        )

    def test_whitespace_only_md(self):
        _assert_raises_code(
            b"   \n\t\n", "empty.md", "text/markdown",
            ValidationErrorCode.NO_EXTRACTABLE_TEXT,
        )



# Pipeline guard — invalid files must not reach processing


class TestPipelineGuard:
    """Verify that FileValidationError is raised before any pipeline logic."""

    def test_empty_file_raises_before_pipeline(self):
        _assert_raises_code(b"", "empty.pdf", "application/pdf", ValidationErrorCode.EMPTY_FILE)

    def test_bad_extension_raises_before_pipeline(self):
        _assert_raises_code(
            b"some binary data", "payload.bat", "application/octet-stream",
            ValidationErrorCode.UNSUPPORTED_FILE_TYPE,
        )

    def test_valid_file_does_not_raise(self):
        """A valid file must NOT raise, so the pipeline can proceed."""
        content = _make_minimal_pdf()
        try:
            result = FileValidator.validate(content, "ok.pdf", "application/pdf")
        except FileValidationError as exc:
            pytest.fail(f"Valid PDF raised FileValidationError unexpectedly: {exc}")
        assert result.file_type == "pdf"



# FileValidationError attributes


class TestFileValidationError:
    def test_code_and_message_attributes(self):
        err = FileValidationError(ValidationErrorCode.EMPTY_FILE, "The file is empty.")
        assert err.code == ValidationErrorCode.EMPTY_FILE
        assert err.message == "The file is empty."
        assert str(err) == "The file is empty."

    def test_is_exception(self):
        err = FileValidationError(ValidationErrorCode.FILE_TOO_LARGE, "Too large")
        assert isinstance(err, Exception)



# Extension extraction edge cases


class TestExtensionExtraction:
    def test_multiple_dots(self):
        ext = FileValidator._extract_extension("report.final.2024.pdf")
        assert ext == ".pdf"

    def test_uppercase_extension(self):
        ext = FileValidator._extract_extension("REPORT.PDF")
        assert ext == ".pdf"

    def test_no_extension(self):
        ext = FileValidator._extract_extension("README")
        assert ext == ""

    def test_empty_filename(self):
        ext = FileValidator._extract_extension("")
        assert ext == ""
