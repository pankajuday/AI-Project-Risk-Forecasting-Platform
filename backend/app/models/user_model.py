from typing import List

from beanie import Document
from datetime import datetime, timezone
from pydantic import Field


class User(Document):
    email: str
    password_hash: str
    name: str | None = None

    project_list: List[str]=Field(
        default_factory=list,
        description="id of project that associated with current user."
    )

    is_active: bool = True

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "users"