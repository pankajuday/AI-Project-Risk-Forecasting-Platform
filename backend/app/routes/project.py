from typing import List

from fastapi import APIRouter
from models.project_model import CreateProject, Project

from controllers.project_controller import (
    create_project,
    delete_project,
    get_project,
    list_projects,
)

router = APIRouter()


@router.post("/create", response_model=Project)
async def create(payload: CreateProject):
    """Create a new project."""
    return await create_project(payload)


@router.get("/list", response_model=List[Project])
async def get_all():
    """List all projects."""
    return await list_projects()


@router.get("/{project_id}", response_model=Project)
async def get_one(project_id: str):
    """Get a single project by ID."""
    return await get_project(project_id)


@router.delete("/{project_id}")
async def remove(project_id: str):
    """Delete a project and its Qdrant collection."""
    return await delete_project(project_id)
