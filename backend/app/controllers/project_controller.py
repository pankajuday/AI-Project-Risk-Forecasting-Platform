"""
Project Controller
==================
CRUD operations for Projects.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, HTTPException
from beanie import PydanticObjectId
from beanie.operators import In

from models.project_model import Project, CreateProject, ProjectStatus
from config.qdrant import delete_collection
from models.user_model import User


#  Create 

async def create_project(payload: CreateProject, current_user: Optional[User] = None) -> Project:
    project = Project(
        name=payload.name,
        description=payload.description,
    )
    await project.insert()

    if current_user:
        if current_user.project_list is None:
            current_user.project_list = []
        current_user.project_list.append(str(project.id))
        await current_user.save()

    print(f"[PROJECT] Created: {project.name} ({project.id})")
    return project


#  List 

async def list_projects(current_user: Optional[User] = None) -> List[Project]:
    if not current_user or not current_user.project_list:
        return []

    valid_ids = []
    for pid in current_user.project_list:
        try:
            valid_ids.append(PydanticObjectId(pid))
        except Exception:
            pass

    if not valid_ids:
        return []

    return await Project.find(In(Project.id, valid_ids)).to_list()


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

async def delete_project(project_id: str, current_user: Optional[User] = None) -> dict:
    project = await Project.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Also purge Qdrant collection
    try:
        delete_collection(project_id)
    except Exception as e:
        print(f"[PROJECT] Warning: could not delete Qdrant collection: {e}")

    await project.delete()

    if current_user and current_user.project_list:
        if str(project_id) in current_user.project_list:
            current_user.project_list = [pid for pid in current_user.project_list if pid != str(project_id)]
            await current_user.save()

    return {"message": f"Project '{project.name}' deleted."}