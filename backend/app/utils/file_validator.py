"""
File Validation Utility
=======================
Validates uploaded documents **before** they are written to disk or passed to
the RAG ingestion pipeline (Docling > chunking > embeddings > Qdrant).

Public API
----------
    from utils.file_validator import FileValidator, FileValidationError, ValidationErrorCode

    try:
        file_type = FileValidator.validate(content, filename, claimed_content_type)
    except FileValidationError as exc:
        # exc.code  > ValidationErrorCode  (use as JSON "code" field)
        # exc.message > human-readable string
        raise HTTPException(status_code=422, detail={...})

Validation order
----------------
1. EMPTY_FILE          - zero-byte content
2. FILE_TOO_LARGE      - exceeds MAX_UPLOAD_SIZE_MB env var (default 50 MB)
3. UNSUPPORTED_FILE_TYPE - extension not in the project's FileType allowlist
4. INVALID_FILE_FORMAT - magic bytes don't match the claimed extension
5. CORRUPTED_FILE      - format-specific integrity check (ZIP structure, PDF header)
6. UNREADABLE_FILE     - text files that cannot be decoded
7. NO_EXTRACTABLE_TEXT - file is structurally valid but contains no readable text

No new pip packages are required.  The ``filetype`` library (already in
requirements.txt) is used for magic-byte detection.
"""

from __future__ import annotations

import io
import os
import zipfile
from enum import StrEnum
from typing import NamedTuple

import filetype


# ---------------------------------------------------------------------------
# Error codes & exception
# ---------------------------------------------------------------------------

class ValidationErrorCode(StrEnum):
    EMPTY_FILE = "EMPTY_FILE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT"
    CORRUPTED_FILE = "CORRUPTED_FILE"
    UNREADABLE_FILE = "UNREADABLE_FILE"
    NO_EXTRACTABLE_TEXT = "NO_EXTRACTABLE_TEXT"


class FileValidationError(Exception):
    """Raised when an uploaded file fails validation.

    Attributes:
        code:    A ``ValidationErrorCode`` value - used as the structured
                 ``code`` field in the API error response.
        message: A human-readable description suitable for display in the UI.
    """

    def __init__(self, code: ValidationErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message

    def __repr__(self) -> str:  # pragma: no cover
        return f"FileValidationError(code={self.code!r}, message={self.message!r})"


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _max_upload_bytes() -> int:
    """Return the configured maximum upload size in bytes.

    Reads ``MAX_UPLOAD_SIZE_MB`` from the environment (default: 50 MB).
    """
    try:
        mb = float(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    except ValueError:
        mb = 50.0
    return int(mb * 1024 * 1024)


# ---------------------------------------------------------------------------
# Extension / MIME allowlists
#
# Must stay in sync with FileType in models/document_model.py.
# We intentionally keep the mapping here so the validator owns it and
# the controller no longer needs a separate ALLOWED_MIME_TYPES dict.
# ---------------------------------------------------------------------------

# Maps lowercase extension > (FileType value, set of valid magic MIME prefixes)
# The magic MIME values come from the ``filetype`` library's own type strings.
_ALLOWED_EXTENSIONS: dict[str, tuple[str, set[str]]] = {
    ".pdf":  ("pdf",   {"application/pdf"}),
    ".docx": ("docx",  {"application/zip","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),
    ".xlsx": ("xlsx",  {"application/zip","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
    ".pptx": ("pptx",  {"application/zip","application/vnd.openxmlformats-officedocument.presentationml.presentation"}),
    ".txt":  ("txt",   set()),   # plain text has no reliable magic bytes
    ".md":   ("md",    set()),   # markdown treated same as plain text
    ".csv":  ("csv",   set()),   # CSV is plain text
    ".png":  ("image", {"image/png"}),
    ".jpg":  ("image", {"image/jpeg"}),
    ".jpeg": ("image", {"image/jpeg"}),
}

# Required ZIP entry prefixes for Office Open XML formats.
# An Office file missing these entries is considered corrupted.
_OFFICE_REQUIRED_ENTRIES: dict[str, str] = {
    ".docx": "word/",
    ".xlsx": "xl/",
    ".pptx": "ppt/",
}


# ---------------------------------------------------------------------------
# Validation result
# ---------------------------------------------------------------------------

class ValidationResult(NamedTuple):
    """Returned by :meth:`FileValidator.validate` on success."""
    file_type: str      # matches FileType enum value, e.g. "pdf", "docx"
    mime_type: str      # detected MIME type (from magic bytes or claimed)
    file_size: int      # byte count of the validated content


# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------

class FileValidator:
    """Static validator for RAG document uploads.

    Call :meth:`validate` once per upload, passing the raw bytes read from
    the ``UploadFile``.  On success it returns a :class:`ValidationResult`.
    On failure it raises :class:`FileValidationError`.
    """

    @staticmethod
    def validate(
        content: bytes,
        filename: str,
        claimed_content_type: str | None = None,
    ) -> ValidationResult:
        """Run all validation checks on *content*.

        Args:
            content:              Raw bytes of the uploaded file.
            filename:             Original filename (used to derive extension).
            claimed_content_type: The ``Content-Type`` value provided by the
                                  HTTP client - used only as a fallback hint,
                                  never as the sole source of truth.

        Returns:
            :class:`ValidationResult` - call site uses ``.file_type`` and
            ``.mime_type`` to build the ``DocumentRecord``.

        Raises:
            :class:`FileValidationError` with an appropriate
            :class:`ValidationErrorCode` on any validation failure.
        """
        # 1. Empty file
        FileValidator._check_not_empty(content)

        # 2. Size limit
        FileValidator._check_size(content)

        # 3. Extension allowlist
        ext = FileValidator._extract_extension(filename)
        file_type, valid_mimes = FileValidator._check_extension(ext)

        # 4. Magic-byte format check  (skip for pure-text extensions)
        detected_mime = FileValidator._detect_mime(content)
        if valid_mimes:
            FileValidator._check_format_match(ext, detected_mime, valid_mimes, filename)

        # Use detected MIME if we got one; otherwise fall back to claimed.
        resolved_mime = detected_mime or claimed_content_type or "application/octet-stream"

        # 5. Corruption / integrity check
        FileValidator._check_integrity(content, ext, filename)

        # 6. Readability check (text formats)
        if ext in {".txt", ".md", ".csv"}:
            FileValidator._check_text_readable(content, filename)

        # 7. Extractable-text check (text formats)
        if ext in {".txt", ".md", ".csv"}:
            FileValidator._check_has_text(content, filename)

        return ValidationResult(
            file_type=file_type,
            mime_type=resolved_mime,
            file_size=len(content),
        )

    # ------------------------------------------------------------------
    # Individual checks
    # ------------------------------------------------------------------

    @staticmethod
    def _check_not_empty(content: bytes) -> None:
        if not content:
            raise FileValidationError(
                ValidationErrorCode.EMPTY_FILE,
                "The uploaded file is empty.",
            )

    @staticmethod
    def _check_size(content: bytes) -> None:
        limit = _max_upload_bytes()
        if len(content) > limit:
            limit_mb = limit / (1024 * 1024)
            raise FileValidationError(
                ValidationErrorCode.FILE_TOO_LARGE,
                f"File exceeds the maximum allowed size of {limit_mb:.0f} MB.",
            )

    @staticmethod
    def _extract_extension(filename: str) -> str:
        """Return the lowercase file extension including the leading dot."""
        if not filename:
            return ""
        # Handle filenames with multiple dots (e.g. report.final.pdf)
        parts = filename.rsplit(".", 1)
        if len(parts) < 2:
            return ""
        return "." + parts[1].lower()

    @staticmethod
    def _check_extension(ext: str) -> tuple[str, set[str]]:
        if ext not in _ALLOWED_EXTENSIONS:
            allowed = ", ".join(sorted(_ALLOWED_EXTENSIONS))
            raise FileValidationError(
                ValidationErrorCode.UNSUPPORTED_FILE_TYPE,
                f"File extension '{ext}' is not supported. "
                f"Allowed extensions: {allowed}.",
            )
        return _ALLOWED_EXTENSIONS[ext]

    @staticmethod
    def _detect_mime(content: bytes) -> str | None:
        """Use magic bytes to detect the actual MIME type.

        Returns ``None`` for plain-text files that have no magic signature.
        """
        kind = filetype.guess(content)
        if kind is None:
            return None
        return kind.mime

    @staticmethod
    def _check_format_match(
        ext: str,
        detected_mime: str | None,
        valid_mimes: set[str],
        filename: str,
    ) -> None:
        """Verify detected MIME is compatible with the claimed extension.

        Office Open XML files (.docx/.xlsx/.pptx) are valid ZIPs, so we
        accept both the generic ``application/zip`` magic and the specific
        Office MIME.
        """
        if detected_mime is None:
            # filetype couldn't identify it - conservative: allow it through
            # and let the corruption checks below catch real problems.
            return

        if detected_mime not in valid_mimes:
            raise FileValidationError(
                ValidationErrorCode.INVALID_FILE_FORMAT,
                f"'{filename}' does not appear to be a valid "
                f"{ext.lstrip('.'). upper()} file "
                f"(detected type: {detected_mime}).",
            )

    @staticmethod
    def _check_integrity(content: bytes, ext: str, filename: str) -> None:
        """Format-specific integrity / corruption checks."""
        if ext == ".pdf":
            FileValidator._check_pdf(content, filename)
        elif ext in {".docx", ".xlsx", ".pptx"}:
            FileValidator._check_office_zip(content, ext, filename)
        # Plain text formats are handled by _check_text_readable below.

    @staticmethod
    def _check_pdf(content: bytes, filename: str) -> None:
        """Lightweight PDF header + trailer check (no extra dependencies)."""
        # PDF spec requires header in first 1024 bytes
        header_region = content[:1024]
        if b"%PDF-" not in header_region:
            raise FileValidationError(
                ValidationErrorCode.CORRUPTED_FILE,
                f"'{filename}' does not contain a valid PDF header (%PDF-).",
            )
        # Check for EOF marker - corrupted PDFs often lack it
        tail = content[-2048:]
        if b"%%EOF" not in tail and b"%EOF" not in tail:
            raise FileValidationError(
                ValidationErrorCode.CORRUPTED_FILE,
                f"'{filename}' appears to be a truncated or corrupted PDF "
                "(missing %%EOF marker).",
            )

    @staticmethod
    def _check_office_zip(content: bytes, ext: str, filename: str) -> None:
        """Validate Office Open XML file as a proper ZIP with required entries."""
        buf = io.BytesIO(content)
        if not zipfile.is_zipfile(buf):
            raise FileValidationError(
                ValidationErrorCode.CORRUPTED_FILE,
                f"'{filename}' is not a valid {ext.lstrip('.').upper()} file "
                "(ZIP structure is corrupted or missing).",
            )
        try:
            buf.seek(0)
            with zipfile.ZipFile(buf, "r") as zf:
                names = zf.namelist()
        except zipfile.BadZipFile as exc:
            raise FileValidationError(
                ValidationErrorCode.CORRUPTED_FILE,
                f"'{filename}' is corrupted and could not be opened: {exc}",
            ) from exc

        required_prefix = _OFFICE_REQUIRED_ENTRIES.get(ext)
        if required_prefix:
            has_required = any(n.startswith(required_prefix) for n in names)
            if not has_required:
                raise FileValidationError(
                    ValidationErrorCode.CORRUPTED_FILE,
                    f"'{filename}' is missing required Office XML structure "
                    f"(expected entries under '{required_prefix}').",
                )

    @staticmethod
    def _check_text_readable(content: bytes, filename: str) -> None:
        """Verify that plain-text content can be decoded."""
        for encoding in ("utf-8", "latin-1"):
            try:
                content.decode(encoding)
                return
            except (UnicodeDecodeError, ValueError):
                continue
        raise FileValidationError(
            ValidationErrorCode.UNREADABLE_FILE,
            f"'{filename}' could not be decoded as text "
            "(tried UTF-8 and Latin-1). The file may be binary or corrupted.",
        )

    @staticmethod
    def _check_has_text(content: bytes, filename: str) -> None:
        """Check that the decoded text is not entirely whitespace."""
        for encoding in ("utf-8", "latin-1"):
            try:
                text = content.decode(encoding)
                if text.strip():
                    return
                raise FileValidationError(
                    ValidationErrorCode.NO_EXTRACTABLE_TEXT,
                    f"'{filename}' contains no extractable text "
                    "(the file is empty or contains only whitespace).",
                )
            except (UnicodeDecodeError, ValueError):
                continue
        # If we couldn't decode at all, _check_text_readable already raised.
