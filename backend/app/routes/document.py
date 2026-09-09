from fastapi import APIRouter, BackgroundTasks, File, UploadFile, Depends, Query
from dependencies.auth import get_current_user

from controllers.document_controller import (
    delete_document,
    get_document_presigned_url,
    get_document_status,
    list_documents,
    serve_document,
    upload_docs,
)


router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/{project_id}/upload")
async def upload(
    project_id: str,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    return await upload_docs(project_id, file, background_tasks)


@router.get("/{project_id}/list")
async def get_list_of_documents(project_id: str):
    return await list_documents(project_id)


@router.get("/{project_id}/status/{document_id}")
async def get_status(project_id: str, document_id: str):
    return await get_document_status(document_id)


@router.get("/{project_id}/view/{filename}")
async def get_view_of_document(project_id: str, filename: str, download: bool = False):
    """Stream the file content directly through the backend (no redirect, no CORS issues)."""
    return await serve_document(project_id, filename, download)


@router.get("/{project_id}/presign/{filename}")
async def get_presign_url(
    project_id: str,
    filename: str,
    download: bool = False,
    expiry: int = Query(default=3600, ge=60, le=86400),
):
    """
    Return a JSON object with a time-limited presigned MinIO/S3 URL.
    Use this to embed files directly in <img src> or <iframe src> on the frontend.
    """
    return await get_document_presigned_url(project_id, filename, download, expiry)


@router.delete("/{project_id}/delete/{document_id}")
async def remove_document(project_id: str, document_id: str):
    return await delete_document(document_id)