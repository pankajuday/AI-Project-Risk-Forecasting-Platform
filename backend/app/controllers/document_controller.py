"""
Document Controller
===================
Handles file upload, listing, serving, and ingestion status.
Documents are always scoped to a project.

Storage backend: S3 / MinIO  (no local filesystem writes).
"""

import io
import mimetypes
from datetime import datetime, timezone

from fastapi import BackgroundTasks, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from models.document_model import DocumentRecord, DocumentStatus, FileType
from models.project_model import Project
from rag.pipeline import run_ingestion_pipeline
from storage.exceptions import S3NotFoundError, S3StorageError, S3UploadError
from storage.service import (
    delete_file,
    download_bytes,
    generate_presigned_url,
    upload_file,
)
from utils.file_validator import FileValidationError, FileValidator



# Constants


_FILE_TYPE_MAP: dict[str, FileType] = {
    "pdf":   FileType.PDF,
    "docx":  FileType.DOCX,
    "xlsx":  FileType.XLSX,
    "pptx":  FileType.PPTX,
    "txt":   FileType.TXT,
    "md":    FileType.MD,
    "csv":   FileType.CSV,
    "image": FileType.IMAGE,
}

_MIME_MAP: dict[str, str] = {
    "pdf":  "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc":  "application/msword",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls":  "application/vnd.ms-excel",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt":  "text/plain; charset=utf-8",
    "md":   "text/markdown; charset=utf-8",
    "csv":  "text/csv; charset=utf-8",
    "json": "application/json; charset=utf-8",
}


def _guess_mime(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in _MIME_MAP:
        return _MIME_MAP[ext]
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"



# Upload


async def upload_docs(
    project_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks,
):
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    content = await file.read()

    try:
        result = FileValidator.validate(
            content=content,
            filename=file.filename or "",
            claimed_content_type=file.content_type,
        )
    except FileValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "FILE_VALIDATION_FAILED",
                "code": exc.code,
                "message": exc.message,
            },
        )

    file_type = _FILE_TYPE_MAP.get(result.file_type, FileType.OTHER)

    try:
        s3_key = upload_file(
            content=content,
            project_id=project_id,
            filename=file.filename,
            content_type=result.mime_type,
        )
    except S3UploadError as exc:
        raise HTTPException(status_code=500, detail=f"File storage failed: {exc}")

    doc_record = DocumentRecord(
        project_id=project_id,
        filename=file.filename,
        original_name=file.filename,
        file_type=file_type,
        file_size=result.file_size,
        storage_path=s3_key,
        mime_type=result.mime_type,
        processing_status=DocumentStatus.PENDING,
    )
    await doc_record.insert()

    project.total_files += 1
    project.updated_at = datetime.now(timezone.utc)
    await project.save()

    background_tasks.add_task(run_ingestion_pipeline, str(doc_record.id))

    return {
        "document_id": str(doc_record.id),
        "filename": file.filename,
        "file_type": file_type,
        "status": DocumentStatus.PENDING,
        "message": "File uploaded to S3. Ingestion pipeline started.",
    }



# List


async def list_documents(project_id: str):
    docs = await DocumentRecord.find(DocumentRecord.project_id == project_id).to_list()
    return docs



# Status


async def get_document_status(document_id: str):
    doc = await DocumentRecord.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "document_id": document_id,
        "filename": doc.filename,
        "status": doc.processing_status,
        "chunk_count": doc.chunk_count,
        "error": doc.processing_error,
    }



# Serve  — streams file content through the backend (no redirect)


async def serve_document(project_id: str, filename: str, download: bool = False):
    """
    Download file bytes from S3 and stream them back to the client.
    No redirect — the backend acts as a transparent proxy so the browser
    never needs to talk to MinIO directly (avoids CORS issues).
    """
    doc = await DocumentRecord.find_one(
        DocumentRecord.project_id == project_id,
        DocumentRecord.filename == filename,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        data = download_bytes(doc.storage_path)
    except S3NotFoundError:
        raise HTTPException(status_code=404, detail="File not found in storage.")
    except S3StorageError as exc:
        raise HTTPException(status_code=500, detail=f"Could not retrieve file: {exc}")

    media_type = _guess_mime(filename)
    disposition = "attachment" if download else "inline"
    headers = {
        "Content-Disposition": f'{disposition}; filename="{filename}"',
        "Content-Length": str(len(data)),
        "Cache-Control": "private, max-age=300",
    }

    return StreamingResponse(
        content=io.BytesIO(data),
        media_type=media_type,
        headers=headers,
    )



# Presigned URL  — returns a JSON object with a time-limited S3/MinIO URL.
# The client can embed this directly in <img src> or <iframe src> without
# going through the backend again (good for large files like PDFs/images).


async def get_document_presigned_url(
    project_id: str,
    filename: str,
    download: bool = False,
    expiry: int = 3600,
):
    """
    Return a presigned MinIO/S3 URL as JSON so the frontend can use it
    directly as an <img src>, <iframe src>, or anchor href.
    """
    doc = await DocumentRecord.find_one(
        DocumentRecord.project_id == project_id,
        DocumentRecord.filename == filename,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        if download:
            from storage.client import s3_client, S3_BUCKET
            url = s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": S3_BUCKET,
                    "Key": doc.storage_path,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                },
                ExpiresIn=expiry,
            )
        else:
            url = generate_presigned_url(doc.storage_path, expiry_seconds=expiry)
    except S3StorageError as exc:
        raise HTTPException(status_code=500, detail=f"Could not generate URL: {exc}")

    return {"url": url, "filename": filename, "expires_in": expiry}



# Delete


async def delete_document(document_id: str):
    doc = await DocumentRecord.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        delete_file(doc.storage_path)
    except S3NotFoundError:
        print(f"[DOC] S3 object '{doc.storage_path}' was already missing; skipping S3 delete.")
    except S3StorageError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete file from S3: {exc}")

    await doc.delete()
    return {"message": f"Document '{doc.filename}' deleted."}