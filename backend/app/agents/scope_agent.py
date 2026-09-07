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
LLM_MODEL = os.getenv("LLM_MODEL")

llm = ChatGoogleGenerativeAI(
    model= LLM_MODEL,
    google_api_key=GOOGLE_API_KEY,
    temperature=0.1,
)

SCOPE_SYSTEM_PROMPT = """You are a senior project analyst. You will be given excerpts from project documents.
Your task is to extract and structure the project scope information.

IMPORTANT: Return STRICT JSON that matches this schema exactly.
Do not add extra keys.
Do not wrap the output in markdown fences.
Do not explain your reasoning.

Schema:
{
  "project_name": "string or null",
  "objectives": ["list", "of", "objectives"],
  "deliverables": ["list", "of", "deliverables"],
  "timeline": "string describing overall timeline or null",
  "stakeholders": ["list", "of", "stakeholders"],
  "out_of_scope": ["list", "of", "out-of-scope items"],
  "summary": "2-3 sentence executive summary of the project scope"
}

Rules:
- Use only information supported by the project documents.
- If a field is not available, use null for single-value fields and [] for list fields.
- Keep lists factual and grounded in the documents.
- summary must be 2-3 sentences."""


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

    structured_llm = llm.with_structured_output(ScopeOutput)

    try:
        scope = await structured_llm.ainvoke(messages)
        if not isinstance(scope, ScopeOutput):
            scope = ScopeOutput.model_validate(scope)
    except Exception as e:
        print(f"[SCOPE_AGENT] Structured parse error: {e}")

        # Fallback: try the older raw-text parsing path for compatibility
        response = await llm.ainvoke(messages)
        raw = getattr(response, "content", response)
        if isinstance(raw, list):
            raw_text = "\n".join(
                [x.content if hasattr(x, "content") else str(x) for x in raw]
            )
        else:
            raw_text = raw.content if hasattr(raw, "content") else str(raw)
        raw_text = raw_text.strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        try:
            data = json.loads(raw_text)
            scope = ScopeOutput(**data)
        except Exception as parse_error:
            print(f"[SCOPE_AGENT] Parse error: {parse_error}. Raw: {raw_text[:300]}")
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
        print(f"[GRAPH] scope_node FAILED: {exc}")
        raise RuntimeError(f"scope_node: {exc}") from exc

