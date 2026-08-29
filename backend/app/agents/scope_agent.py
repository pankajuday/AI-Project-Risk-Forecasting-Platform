"""
Scope Agent
===========
Retrieves all project documents from Qdrant and uses Gemini to extract:
- Project name, objectives, deliverables, timeline, stakeholders, out-of-scope items.
"""

from __future__ import annotations

import json
import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from config.qdrant import get_vector_store
from models.report_model import ScopeOutput

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.1,
)

SCOPE_SYSTEM_PROMPT = """You are a senior project analyst. You will be given excerpts from project documents.
Your task is to extract and structure the project scope information.

Return ONLY a valid JSON object with these exact keys:
{
  "project_name": "string or null",
  "objectives": ["list", "of", "objectives"],
  "deliverables": ["list", "of", "deliverables"],
  "timeline": "string describing overall timeline or null",
  "stakeholders": ["list", "of", "stakeholders"],
  "out_of_scope": ["list", "of", "out-of-scope items"],
  "summary": "2-3 sentence executive summary of the project scope"
}

Be specific and grounded in the documents. Do not invent information not present in the text."""


async def run_scope_agent(project_id: str) -> ScopeOutput:
    print(f"[SCOPE_AGENT] Running for project: {project_id}")

    # Retrieve broad project context from Qdrant
    vector_store = get_vector_store(project_id)
    queries = [
        "project objectives goals deliverables",
        "project scope timeline milestones stakeholders",
        "what is out of scope requirements",
    ]

    all_chunks: list[str] = []
    seen = set()
    for q in queries:
        docs = await vector_store.asimilarity_search(q, k=6)
        for d in docs:
            if d.page_content not in seen:
                seen.add(d.page_content)
                all_chunks.append(d.page_content)

    context = "\n\n---\n\n".join(all_chunks[:15])  # cap at ~15 unique chunks

    messages = [
        SystemMessage(content=SCOPE_SYSTEM_PROMPT),
        HumanMessage(content=f"PROJECT DOCUMENT EXCERPTS:\n\n{context}"),
    ]

    response = await llm.ainvoke(messages)
    raw_text = response.content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    try:
        data = json.loads(raw_text)
        scope = ScopeOutput(**data)
    except Exception as e:
        print(f"[SCOPE_AGENT] Parse error: {e}. Raw: {raw_text[:300]}")
        scope = ScopeOutput(summary=raw_text[:500])

    print(f"[SCOPE_AGENT] Done. Deliverables found: {len(scope.deliverables)}")
    return scope


#  LangGraph Node 

async def scope_node(state: dict) -> dict:
    """
    LangGraph node: extracts project scope and writes it into the shared state.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).
    Returns only the keys it mutates — LangGraph merges them automatically.
    """
    project_id = state["project_id"]
    print(f"[GRAPH] scope_node — project: {project_id}")

    try:
        scope = await run_scope_agent(project_id)
        return {
            "scope": scope,
            "raw_outputs": {**state.get("raw_outputs", {}), "scope_raw": scope.model_dump()},
            "step_log": [f"scope_node: extracted scope — {len(scope.deliverables)} deliverable(s)"],
        }
    except Exception as exc:
        print(f"[GRAPH] scope_node failed: {exc}")
        return {
            "scope": None,
            "error": f"scope_node: {exc}",
            "step_log": [f"scope_node: FAILED — {exc}"],
        }

