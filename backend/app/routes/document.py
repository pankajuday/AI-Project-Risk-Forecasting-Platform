from typing import List

from fastapi import APIRouter, BackgroundTasks, File, UploadFile
from models.document_model import DocumentRecord

from controllers.document_controller import (
    delete_document,
    get_document_status,
    list_documents,
    serve_document,
    upload_docs,
)

router = APIRouter()


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
    return await serve_document(project_id, filename, download)


@router.delete("/{project_id}/delete/{document_id}")
async def remove_document(project_id: str, document_id: str):
    return await delete_document(document_id)