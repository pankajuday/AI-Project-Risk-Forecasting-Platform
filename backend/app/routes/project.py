from typing import List

from fastapi import APIRouter, Depends
from models.project_model import CreateProject, Project
from models.user_model import User
from dependencies.auth import get_current_user

from controllers.project_controller import (
    create_project,
    delete_project,
    get_project,
    list_projects,
)

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/create", response_model=Project)
async def create(payload: CreateProject, current_user: User = Depends(get_current_user)):
    """Create a new project."""
    return await create_project(payload, current_user)


@router.get("/list", response_model=List[Project])
async def get_all(current_user: User = Depends(get_current_user)):
    """List all projects for the authenticated user."""
    return await list_projects(current_user)


@router.get("/{project_id}", response_model=Project)
async def get_one(project_id: str):
    """Get a single project by ID."""
    return await get_project(project_id)


@router.delete("/{project_id}")
async def remove(project_id: str, current_user: User = Depends(get_current_user)):
    """Delete a project and its Qdrant collection."""
    return await delete_project(project_id, current_user)
