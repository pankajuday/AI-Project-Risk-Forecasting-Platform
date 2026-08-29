"""
Chat Agent (RAG Q&A)
====================
Answers user questions grounded in uploaded project documents and generated
analysis artifacts via Qdrant retrieval + Gemini.

Architecture
------------
All project knowledge lives in Qdrant under one collection per project:
  - Uploaded documents     (chunked by RAG ingestion pipeline)
  - Analysis report summary (synced after each pipeline run)
  - Generated documents    (executive summary, user stories, risk register,
                            sprint plan — chunked before embedding)

The chat function performs a single semantic search across all of these,
then passes only the top-K relevant chunks to the LLM — no MongoDB fetches,
no manual context building, minimal token usage.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from config.qdrant import get_vector_store
from models.chat_model import ChatMessage, MessageRole

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.2,
)

CHAT_SYSTEM_PROMPT = """You are an AI Project Intelligence Advisor for a software development team.
You have access to the team's uploaded project documents and generated analysis artifacts
(proposals, SRS, meeting notes, progress reports, task lists, analysis reports, generated summaries,
risk registers, user stories, sprint plans).

Your role is to:
- Answer questions about project status, risks, scope, deliverables, generated reports, and team progress
- Highlight risks and blockers proactively when relevant
- Give actionable, specific recommendations grounded in the available sources
- Be honest when information is not available in the sources

Always ground your responses in the provided context. If the context doesn't contain enough information, say so.
Format responses with Markdown when helpful (bullet points, headers for complex answers)."""


def _source_label(doc) -> str:
    """Build a human-readable source label from chunk metadata."""
    metadata = getattr(doc, "metadata", {}) or {}

    # Prefer an explicit title; fall back through progressively generic fields
    title = (
        metadata.get("title")
        or metadata.get("filename")
        or metadata.get("doc_type")
        or metadata.get("artifact_type")
        or "Unknown source"
    )

    # Annotate generated-document chunks with their type for clarity
    source_kind = metadata.get("source_kind", "")
    if source_kind == "generated_document":
        return f"{title} (generated)"
    if source_kind == "analysis_report":
        return "Analysis Report Summary"

    return title


def _content_to_text(content: object) -> str:
    """Convert Gemini content payloads into a plain text string."""
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts).strip()

    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text

    return str(content)


async def chat(
    project_id: str,
    user_message: str,
    chat_history: list[ChatMessage] | None = None,
) -> tuple[str, list[str]]:
    """
    Generate a grounded response to a user query using pure Qdrant RAG.

    All project knowledge — uploaded documents, analysis report summary, and
    generated document chunks — is stored in Qdrant. A single similarity search
    retrieves the most relevant pieces, which are passed to the LLM as context.

    Args:
        project_id:   The project to search within.
        user_message: The user's question.
        chat_history: Recent conversation turns for multi-turn context.

    Returns:
        (response_text, source_labels)
    """
    vector_store = get_vector_store(project_id)

    # k=12 gives broader coverage across uploaded docs + report summary +
    # generated doc chunks without blowing the context window.
    retrieved_docs = await vector_store.asimilarity_search(user_message, k=12)

    if not retrieved_docs:
        return (
            "I couldn't find relevant information in the project sources. "
            "Please make sure documents and analysis outputs have been uploaded "
            "and processed for this project.",
            [],
        )

    # Deduplicated, ordered source labels
    sources = list(dict.fromkeys(_source_label(d) for d in retrieved_docs))

    # Build context from retrieved chunks
    context = "\n\n---\n\n".join(
        f"[Source: {_source_label(d)}]\n{d.page_content}"
        for d in retrieved_docs
    )

    # Assemble message list
    messages = [SystemMessage(content=CHAT_SYSTEM_PROMPT)]

    if chat_history:
        for msg in chat_history[-6:]:
            if msg.role == MessageRole.USER:
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == MessageRole.ASSISTANT:
                messages.append(AIMessage(content=msg.content))

    messages.append(
        HumanMessage(
            content=f"RELEVANT PROJECT SOURCES:\n{context}\n\nUSER QUESTION: {user_message}"
        )
    )

    response = await llm.ainvoke(messages)
    return _content_to_text(response.content), sources
