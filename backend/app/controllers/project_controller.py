"""
Project Controller
==================
CRUD operations for Projects.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException

from models.project_model import Project, CreateProject, ProjectStatus
from config.qdrant import delete_collection


#  Create 

async def create_project(payload: CreateProject) -> Project:
    project = Project(
        name=payload.name,
        description=payload.description,
    )
    await project.insert()
    print(f"[PROJECT] Created: {project.name} ({project.id})")
    return project


#  List 

async def list_projects() -> List[Project]:
    return await Project.find_all().to_list()


#  Get single 

async def get_project(project_id: str) -> Project:
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


#  Update status 

async def update_project_status(project_id: str, status: ProjectStatus) -> Project:
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    project.status = status
    project.updated_at = datetime.now(timezone.utc)
    await project.save()
    return project


#  Delete 

async def delete_project(project_id: str) -> dict:
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Also purge Qdrant collection
    try:
        delete_collection(project_id)
    except Exception as e:
        print(f"[PROJECT] Warning: could not delete Qdrant collection: {e}")

    await project.delete()
    return {"message": f"Project '{project.name}' deleted."}