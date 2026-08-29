from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.chat_agent import chat
from models.chat_model import ChatSession, ChatMessage, MessageRole

router = APIRouter()


class SendMessageRequest(BaseModel):
    message: str


#  Send message 

@router.post("/{project_id}/message")
async def send_message(project_id: str, body: SendMessageRequest):
    """Send a message and get a grounded AI response."""

    # Get or create chat session
    session = await ChatSession.find_one(ChatSession.project_id == project_id)
    if not session:
        session = ChatSession(project_id=project_id)
        await session.insert()

    # Append user message
    user_msg = ChatMessage(role=MessageRole.USER, content=body.message)
    session.messages.append(user_msg)

    # Generate response
    response_text, sources = await chat(
        project_id=project_id,
        user_message=body.message,
        chat_history=session.messages[:-1],  # exclude current message
    )

    # Append assistant response
    assistant_msg = ChatMessage(
        role=MessageRole.ASSISTANT,
        content=response_text,
        sources=sources,
    )
    session.messages.append(assistant_msg)
    session.updated_at = datetime.now(timezone.utc)
    await session.save()

    return {
        "response": response_text,
        "sources": sources,
        "message_count": len(session.messages),
    }


#  Get history 

@router.get("/{project_id}/history")
async def get_history(project_id: str):
    """Retrieve full conversation history for a project."""
    session = await ChatSession.find_one(ChatSession.project_id == project_id)
    if not session:
        return {"messages": [], "project_id": project_id}
    return {
        "project_id": project_id,
        "messages": session.messages,
    }


#  Clear history 

@router.delete("/{project_id}/history")
async def clear_history(project_id: str):
    """Clear all conversation history for a project."""
    session = await ChatSession.find_one(ChatSession.project_id == project_id)
    if not session:
        raise HTTPException(status_code=404, detail="No chat session found.")
    session.messages = []
    session.updated_at = datetime.now(timezone.utc)
    await session.save()
    return {"message": "Chat history cleared."}
