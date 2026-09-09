"""
S3 Storage Service
==================
Wraps all boto3 S3 operations for MinIO / AWS S3 compatibility.
Provides upload, download-to-tempfile, delete, presigned URL generation,
and bulk project-folder deletion.
"""

import io
import os
import tempfile
from pathlib import Path
from typing import Optional

from botocore.exceptions import ClientError

from storage.client import s3_client, S3_BUCKET
from storage.exceptions import (
    S3DeleteError,
    S3DownloadError,
    S3NotFoundError,
    S3UploadError,
)



# Helpers


def _s3_key(project_id: str, filename: str) -> str:
    """Build a deterministic S3 key:  <project_id>/<filename>"""
    return f"{project_id}/{filename}"



# Upload


def upload_file(content: bytes, project_id: str, filename: str, content_type: str = "application/octet-stream") -> str:
    """
    Upload raw bytes to S3/MinIO.

    Returns:
        The S3 object key that was written (use this as ``storage_path``).

    Raises:
        S3UploadError: on any boto3 / network error.
    """
    key = _s3_key(project_id, filename)
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        print(f"[S3] Uploaded  s3://{S3_BUCKET}/{key}")
        return key
    except ClientError as exc:
        raise S3UploadError(f"Failed to upload '{key}' to S3.", cause=exc) from exc



# Download (to in-memory bytes)


def download_bytes(s3_key: str) -> bytes:
    """
    Download an S3 object and return its raw bytes.

    Raises:
        S3NotFoundError: if the object does not exist (404).
        S3DownloadError: on any other error.
    """
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        return response["Body"].read()
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in ("404", "NoSuchKey"):
            raise S3NotFoundError(f"Object '{s3_key}' not found in S3.") from exc
        raise S3DownloadError(f"Failed to download '{s3_key}' from S3.", cause=exc) from exc



# Download to temporary file  (needed for Docling / file-path loaders)


def download_to_tempfile(s3_key: str, suffix: Optional[str] = None) -> str:
    """
    Download an S3 object to a local temporary file and return the path.

    The caller is responsible for deleting the file when done
    (use ``os.unlink(path)`` or ``Path(path).unlink(missing_ok=True)``).

    Args:
        s3_key:  The S3 object key.
        suffix:  Optional file-extension suffix (e.g. ``.pdf``). Inferred from
                 the key if not provided.

    Returns:
        Absolute path to the temp file.

    Raises:
        S3NotFoundError / S3DownloadError: on any S3 error.
    """
    if suffix is None:
        suffix = Path(s3_key).suffix or ""

    data = download_bytes(s3_key)

    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
    except Exception as exc:
        os.unlink(tmp_path)
        raise S3DownloadError("Failed to write S3 content to temp file.", cause=exc) from exc

    print(f"[S3] Downloaded s3://{S3_BUCKET}/{s3_key}  →  {tmp_path}")
    return tmp_path



# Delete single object


def delete_file(s3_key: str) -> None:
    """
    Delete a single S3 object.

    Raises:
        S3DeleteError: on any boto3 / network error.
    """
    try:
        s3_client.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        print(f"[S3] Deleted   s3://{S3_BUCKET}/{s3_key}")
    except ClientError as exc:
        raise S3DeleteError(f"Failed to delete '{s3_key}' from S3.", cause=exc) from exc



# Delete all objects in a project "folder"


def delete_project_files(project_id: str) -> int:
    """
    Delete every S3 object whose key starts with ``<project_id>/``.

    Returns:
        Number of objects deleted.

    Raises:
        S3DeleteError: on any boto3 / network error.
    """
    prefix = f"{project_id}/"
    deleted = 0
    try:
        paginator = s3_client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=prefix):
            objects = page.get("Contents", [])
            if not objects:
                continue
            delete_payload = {"Objects": [{"Key": obj["Key"]} for obj in objects]}
            s3_client.delete_objects(Bucket=S3_BUCKET, Delete=delete_payload)
            deleted += len(objects)
        print(f"[S3] Deleted {deleted} object(s) under prefix '{prefix}'")
        return deleted
    except ClientError as exc:
        raise S3DeleteError(f"Failed to delete project files for '{project_id}'.", cause=exc) from exc



# Presigned URL  (for inline view / download)


def generate_presigned_url(s3_key: str, expiry_seconds: int = 3600) -> str:
    """
    Generate a pre-signed GET URL for the given S3 object.

    Args:
        s3_key:          The S3 object key.
        expiry_seconds:  URL validity window (default 1 hour).

    Returns:
        A time-limited URL string.

    Raises:
        S3StorageError: if URL generation fails.
    """
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=expiry_seconds,
        )
        return url
    except ClientError as exc:
        from storage.exceptions import S3StorageError
        raise S3StorageError(f"Failed to generate presigned URL for '{s3_key}'.", cause=exc) from exc



# Ensure bucket exists  (MinIO only — idempotent)


def ensure_bucket() -> None:
    """
    Create the S3 bucket if it does not already exist.
    Safe to call multiple times (idempotent).
    """
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        if code in ("404", "NoSuchBucket"):
            s3_client.create_bucket(Bucket=S3_BUCKET)
            print(f"[S3] Bucket '{S3_BUCKET}' created.")
        else:
            raise
