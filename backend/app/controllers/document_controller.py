"""
Document Controller
===================
Handles file upload, listing, serving, and ingestion status.
Documents are always scoped to a project.
"""

import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException, UploadFile
from fastapi.responses import FileResponse

from models.document_model import DocumentRecord, DocumentStatus, FileType
from models.project_model import Project
from rag.pipeline import run_ingestion_pipeline
from utils.file_validator import FileValidationError, FileValidator


# 
# Constants
# 

BASE_UPLOAD_DIR = Path(__file__).parent.parent.parent.parent/"uploads"

# Map the string file_type values returned by FileValidator back to the
# FileType enum used by DocumentRecord.
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


def _project_upload_dir(project_id: str) -> str:
    path = os.path.join(BASE_UPLOAD_DIR, project_id)
    os.makedirs(path, exist_ok=True)
    return path


# 
# Upload
# 

async def upload_docs(
    project_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks,
):
    # Validate project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Read content into memory first so we can validate before touching disk.
    content = await file.read()

    # Run all validation checks. Raises FileValidationError on any failure.
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
    upload_dir = _project_upload_dir(project_id)
    file_path = os.path.join(upload_dir, file.filename)

    # Write validated content to disk
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DocumentRecord in MongoDB
    doc_record = DocumentRecord(
        project_id=project_id,
        filename=file.filename,
        original_name=file.filename,
        file_type=file_type,
        file_size=result.file_size,
        storage_path=file_path,
        mime_type=result.mime_type,
        processing_status=DocumentStatus.PENDING,
    )
    await doc_record.insert()

    # Update project file count
    project.total_files += 1
    project.updated_at = datetime.now(timezone.utc)
    await project.save()

    # Trigger RAG ingestion as a background task
    background_tasks.add_task(run_ingestion_pipeline, str(doc_record.id))

    return {
        "document_id": str(doc_record.id),
        "filename": file.filename,
        "file_type": file_type,
        "status": DocumentStatus.PENDING,
        "message": "File uploaded. Ingestion pipeline started.",
    }


# 
# List
# 

async def list_documents(project_id: str):
    docs = await DocumentRecord.find(DocumentRecord.project_id == project_id).to_list()
    return docs


# 
# Status
# 

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


# 
# Serve
# 

async def serve_document(project_id: str, filename: str, download: bool = False):
    file_path = os.path.join(BASE_UPLOAD_DIR, project_id, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Document not found.")

    disposition = "attachment" if download else "inline"

    lower_name = filename.lower()
    media_type = None

    if lower_name.endswith(".pdf"):
        media_type = "application/pdf"
    elif lower_name.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif lower_name.endswith(".doc"):
        media_type = "application/msword"
    elif lower_name.endswith(".xlsx"):
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif lower_name.endswith(".xls"):
        media_type = "application/vnd.ms-excel"
    elif lower_name.endswith(".pptx"):
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    elif lower_name.endswith((".txt", ".log")):
        media_type = "text/plain; charset=utf-8"
    elif lower_name.endswith(".md"):
        media_type = "text/markdown; charset=utf-8"
    elif lower_name.endswith(".csv"):
        media_type = "text/csv; charset=utf-8"
    elif lower_name.endswith(".json"):
        media_type = "application/json; charset=utf-8"
    elif lower_name.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp")):
        import mimetypes
        media_type, _ = mimetypes.guess_type(filename)

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
    )


# 
# Delete
# 

async def delete_document(document_id: str):
    doc = await DocumentRecord.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if os.path.isfile(doc.storage_path):
        os.remove(doc.storage_path)
    await doc.delete()
    return {"message": f"Document '{doc.filename}' deleted."}