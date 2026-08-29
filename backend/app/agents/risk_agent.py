"""
Risk Agent
==========
Retrieves project documents from Qdrant and uses Gemini to identify risks,
categorize them, assign severity, and suggest mitigations.
"""

from __future__ import annotations

import json
import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from config.qdrant import get_vector_store
from models.report_model import RiskItem, RiskCategory, RiskSeverity

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.2,
)

RISK_SYSTEM_PROMPT = """You are a senior risk analyst specializing in software development projects.
You will be given excerpts from project documents (proposals, meeting notes, sprint updates, task lists).

Your task is to identify ALL risks — both explicit and implied.
Look for: missed deadlines, technical complexity, unclear requirements, resource gaps, scope creep,
external dependencies, communication issues, incomplete documentation.

Return ONLY a valid JSON array of risk objects. Each object must have:
{
  "title": "Short risk title",
  "description": "Detailed description of the risk",
  "category": "technical|resource|schedule|scope|external|quality",
  "severity": "low|medium|high|critical",
  "probability": "Low|Medium|High",
  "impact": "What happens if this risk materializes",
  "mitigation": "Specific action to prevent or reduce this risk",
  "source_context": "Brief quote or paraphrase from the documents that reveals this risk"
}

Identify 5-15 risks. Be specific and grounded. Do not invent risks not supported by the documents."""


async def run_risk_agent(project_id: str) -> list[RiskItem]:
    print(f"[RISK_AGENT] Running for project: {project_id}")

    vector_store = get_vector_store(project_id)
    queries = [
        "risks blockers challenges problems delays",
        "incomplete missing unclear requirements",
        "deadline milestone schedule overdue",
        "resource constraint team capacity dependency",
        "technical debt complexity integration issues",
    ]

    all_chunks: list[str] = []
    seen = set()
    for q in queries:
        docs = await vector_store.asimilarity_search(q, k=5)
        for d in docs:
            if d.page_content not in seen:
                seen.add(d.page_content)
                all_chunks.append(d.page_content)

    context = "\n\n---\n\n".join(all_chunks[:18])

    messages = [
        SystemMessage(content=RISK_SYSTEM_PROMPT),
        HumanMessage(content=f"PROJECT DOCUMENT EXCERPTS:\n\n{context}"),
    ]

    response = await llm.ainvoke(messages)
    raw_text = response.content.strip()

    # Strip markdown fences
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    risks: list[RiskItem] = []
    try:
        data = json.loads(raw_text)
        for item in data:
            try:
                risks.append(RiskItem(**item))
            except Exception as e:
                print(f"[RISK_AGENT] Skipping malformed risk item: {e}")
    except Exception as e:
        print(f"[RISK_AGENT] Parse error: {e}. Raw: {raw_text[:300]}")

    print(f"[RISK_AGENT] \033[32m✓\033[0m Done. Risks identified: {len(risks)}")
    return risks


#  LangGraph Node 

async def risk_node(state: dict) -> dict:
    """
    LangGraph node: identifies risks and writes them into the shared state.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).
    Returns only the keys it mutates.
    """
    project_id = state["project_id"]
    print(f"[GRAPH] > risk_node — project: {project_id}")

    try:
        risks = await run_risk_agent(project_id)
        return {
            "risks": risks,
            "raw_outputs": {**state.get("raw_outputs", {}), "risk_count": len(risks)},
            "step_log": [f" risk_node: identified {len(risks)} risk(s)"],
        }
    except Exception as exc:
        print(f"[GRAPH]  risk_node failed: {exc}")
        return {
            "risks": [],
            "error": f"risk_node: {exc}",
            "step_log": [f"risk_node: FAILED — {exc}"],
        }

