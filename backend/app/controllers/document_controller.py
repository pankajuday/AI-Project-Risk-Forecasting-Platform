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


#  Constants 

ALLOWED_MIME_TYPES: dict[str, FileType] = {
    "application/pdf": FileType.PDF,
    "application/msword": FileType.DOCX,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileType.DOCX,
    "application/vnd.ms-excel": FileType.XLSX,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileType.XLSX,
    "text/plain": FileType.TXT,
    "text/markdown": FileType.MD,
    "text/csv": FileType.CSV,
    "image/png": FileType.IMAGE,
    "image/jpeg": FileType.IMAGE,
    "image/jpg": FileType.IMAGE,
    "application/vnd.ms-powerpoint": FileType.PPTX,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": FileType.PPTX,
}

BASE_UPLOAD_DIR = "uploads"


def _project_upload_dir(project_id: str) -> str:
    path = os.path.join(BASE_UPLOAD_DIR, project_id)
    os.makedirs(path, exist_ok=True)
    return path


#  Upload 

async def upload_docs(
    project_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks,
):
    # Validate project exists
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not supported.",
        )

    file_type = ALLOWED_MIME_TYPES[file.content_type]
    upload_dir = _project_upload_dir(project_id)
    file_path = os.path.join(upload_dir, file.filename)

    # Save file to disk
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DocumentRecord in MongoDB
    doc_record = DocumentRecord(
        project_id=project_id,
        filename=file.filename,
        original_name=file.filename,
        file_type=file_type,
        file_size=len(content),
        storage_path=file_path,
        mime_type=file.content_type,
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


#  List 

async def list_documents(project_id: str):
    docs = await DocumentRecord.find(DocumentRecord.project_id == project_id).to_list()
    return docs


#  Status 

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


#  Serve 

async def serve_document(project_id: str, filename: str, download: bool = False):
    file_path = os.path.join(BASE_UPLOAD_DIR, project_id, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Document not found.")
    disposition = "attachment" if download else "inline"
    return FileResponse(
        path=file_path,
        filename=filename,
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
    )


#  Delete 

async def delete_document(document_id: str):
    doc = await DocumentRecord.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if os.path.isfile(doc.storage_path):
        os.remove(doc.storage_path)
    await doc.delete()
    return {"message": f"Document '{doc.filename}' deleted."}