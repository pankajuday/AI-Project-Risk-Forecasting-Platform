from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sources: List[str] = Field(
        default_factory=list,
        description="Filenames of source documents used to ground this response.",
    )


class ChatSession(Document):
    """Stores the full conversation history for a project."""

    project_id: str
    messages: List[ChatMessage] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_sessions"
        indexes = [
            [("project_id", 1)],
        ]
