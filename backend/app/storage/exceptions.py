"""
S3 Storage Exceptions
"""


class S3StorageError(Exception):
    """Raised when an S3 operation fails."""

    def __init__(self, message: str, cause: Exception | None = None):
        super().__init__(message)
        self.cause = cause


class S3UploadError(S3StorageError):
    """Raised when an S3 upload fails."""


class S3DownloadError(S3StorageError):
    """Raised when an S3 download fails."""


class S3DeleteError(S3StorageError):
    """Raised when an S3 delete operation fails."""


class S3NotFoundError(S3StorageError):
    """Raised when the requested S3 object does not exist."""
