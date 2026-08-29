"""
Document Generator Agent
========================
Uses Gemini to generate project documents grounded in uploaded content:
  - Executive Summary
  - User Stories
  - Risk Register (formatted Markdown table)
  - Sprint Plan

LangGraph Nodes exported by this module:
  - doc_audit_node   → checks which docs already exist, sets missing_doc_types
  - doc_gen_node     → generates ONLY the missing doc types
  - skip_gen_node    → no-op when all docs are already present
"""

from __future__ import annotations

import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from config.qdrant import get_vector_store
from models.report_model import (
    AnalysisReport,
    GeneratedDocument,
    RiskItem,
    ScopeOutput,
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

#    All four canonical document types the pipeline can produce                 
ALL_DOC_TYPES: list[str] = [
    "executive_summary",
    "user_stories",
    "risk_register",
    "sprint_plan",
]

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.3,
)


#    Shared RAG helper                                                          

async def _retrieve_context(project_id: str, query: str, k: int = 8) -> str:
    vector_store = get_vector_store(project_id)
    docs = await vector_store.asimilarity_search(query, k=k)
    return "\n\n---\n\n".join(d.page_content for d in docs)


#    Individual document generators (unchanged business logic)                  

async def generate_executive_summary(
    project_id: str, scope: ScopeOutput
) -> GeneratedDocument:
    context = await _retrieve_context(project_id, "project overview summary objectives", k=6)
    scope_json = scope.model_dump_json(indent=2)

    prompt = f"""Based on the following project documents and extracted scope, 
write a professional Executive Summary in Markdown format.

EXTRACTED SCOPE:
{scope_json}

DOCUMENT EXCERPTS:
{context}

Write a 400-600 word Executive Summary with sections:
## Executive Summary
### Project Overview
### Key Objectives
### Deliverables
### Timeline
### Stakeholders
### Conclusion
"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return GeneratedDocument(
        title="Executive Summary",
        doc_type="executive_summary",
        content=response.content,
    )


async def generate_user_stories(project_id: str, scope: ScopeOutput) -> GeneratedDocument:
    context = await _retrieve_context(
        project_id, "user requirements features functionality use cases", k=10
    )

    prompt = f"""Based on the following project documents, generate comprehensive User Stories in Markdown format.

DELIVERABLES / OBJECTIVES:
{chr(10).join(f'- {d}' for d in scope.deliverables)}

DOCUMENT EXCERPTS:
{context}

Format each user story as:
### US-001: [Short Title]
**As a** [type of user], **I want** [feature/goal] **so that** [benefit/value].

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Priority:** High / Medium / Low
**Estimate:** [story points]

Generate 8-15 user stories. Group them by feature area with ## headers.
"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return GeneratedDocument(
        title="User Stories",
        doc_type="user_stories",
        content=response.content,
    )


async def generate_risk_register_doc(risks: list[RiskItem]) -> GeneratedDocument:
    """Convert structured risk list into a formatted Markdown risk register."""
    rows = []
    for i, r in enumerate(risks, 1):
        rows.append(
            f"| {i} | {r.title} | {r.category.value.title()} | "
            f"{'CRITICAL' if r.severity.value == 'critical' else 'HIGH' if r.severity.value == 'high' else 'MEDIUM' if r.severity.value == 'medium' else 'LOW'} {r.severity.value.title()} | "
            f"{r.probability} | {r.impact} | {r.mitigation} |"
        )

    table = "\n".join(rows)
    content = f"""# Risk Register

| # | Risk | Category | Severity | Probability | Impact | Mitigation |
|---|------|----------|----------|-------------|--------|------------|
{table}

## Detailed Risk Descriptions
"""
    for i, r in enumerate(risks, 1):
        content += f"""
### {i}. {r.title}
**Category:** {r.category.value.title()} | **Severity:** {r.severity.value.title()} | **Probability:** {r.probability}

**Description:** {r.description}

**Impact:** {r.impact}

**Mitigation Strategy:** {r.mitigation}

> *Source:* {r.source_context or 'Inferred from project documents'}

---
"""

    return GeneratedDocument(
        title="Risk Register",
        doc_type="risk_register",
        content=content,
    )


async def generate_sprint_plan(project_id: str, scope: ScopeOutput) -> GeneratedDocument:
    context = await _retrieve_context(
        project_id, "tasks sprint plan timeline milestones backlog", k=8
    )

    prompt = f"""Based on the following project documents and deliverables, generate a Sprint Plan in Markdown.

DELIVERABLES:
{chr(10).join(f'- {d}' for d in scope.deliverables)}

TIMELINE: {scope.timeline or 'Not specified'}

DOCUMENT EXCERPTS:
{context}

Generate a realistic sprint plan with 3-5 sprints. Format:
## Sprint Plan

### Sprint 1 (Week 1-2): [Theme]
**Goal:** ...
**Tasks:**
- [ ] Task 1 (Est: Xh)
- [ ] Task 2 (Est: Xh)
**Deliverables:**
- ...

Repeat for each sprint. Add a ## Summary section at the end.
"""
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return GeneratedDocument(
        title="Sprint Plan",
        doc_type="sprint_plan",
        content=response.content,
    )


#    Legacy runner (kept for backward compatibility)                            

async def run_document_generator(
    project_id: str,
    scope: ScopeOutput,
    risks: list[RiskItem],
) -> list[GeneratedDocument]:
    print(f"[DOC_GEN] Generating documents for project: {project_id}")
    docs = []

    docs.append(await generate_executive_summary(project_id, scope))
    print("[DOC_GEN] ✅ Executive Summary done.")

    docs.append(await generate_user_stories(project_id, scope))
    print("[DOC_GEN] ✅ User Stories done.")

    docs.append(await generate_risk_register_doc(risks))
    print("[DOC_GEN] ✅ Risk Register done.")

    docs.append(await generate_sprint_plan(project_id, scope))
    print("[DOC_GEN] ✅ Sprint Plan done.")

    return docs


#    LangGraph Nodes                                                            

async def doc_audit_node(state: dict) -> dict:
    """
    LangGraph node: audits the MongoDB report to discover which document types
    already exist and which are missing.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).

    Sets:
        existing_doc_types  — types already present in the DB
        missing_doc_types   — types that still need to be generated
    """
    project_id = state["project_id"]
    print(f"[GRAPH] ▶ doc_audit_node — project: {project_id}")

    existing: list[str] = []
    try:
        report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
        if report and report.generated_documents:
            existing = [doc.doc_type for doc in report.generated_documents]
    except Exception as exc:
        print(f"[GRAPH] ⚠ doc_audit_node: could not query DB — {exc}")

    missing = [dt for dt in ALL_DOC_TYPES if dt not in existing]

    log_msg = (
        f"✅ doc_audit_node: {len(existing)} existing doc(s) {existing}, "
        f"{len(missing)} missing → {missing}"
    )
    print(f"[GRAPH] {log_msg}")

    return {
        "existing_doc_types": existing,
        "missing_doc_types": missing,
        "step_log": [log_msg],
    }


async def doc_gen_node(state: dict) -> dict:
    """
    LangGraph node: generates ONLY the document types listed in `missing_doc_types`.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).
    Skips any type that already exists.
    """
    project_id = state["project_id"]
    missing = state.get("missing_doc_types") or []
    scope: ScopeOutput | None = state.get("scope")
    risks: list[RiskItem] = state.get("risks") or []

    print(f"[GRAPH] ▶ doc_gen_node — generating {len(missing)} missing doc(s): {missing}")

    if not scope:
        return {
            "step_log": ["⚠ doc_gen_node: scope is None — skipping generation"],
        }

    new_docs: list[GeneratedDocument] = []

    #    Dispatch only the missing generators                                   
    if "executive_summary" in missing:
        doc = await generate_executive_summary(project_id, scope)
        new_docs.append(doc)
        print("[GRAPH] ✅ executive_summary generated.")

    if "user_stories" in missing:
        doc = await generate_user_stories(project_id, scope)
        new_docs.append(doc)
        print("[GRAPH] ✅ user_stories generated.")

    if "risk_register" in missing:
        doc = await generate_risk_register_doc(risks)
        new_docs.append(doc)
        print("[GRAPH] ✅ risk_register generated.")

    if "sprint_plan" in missing:
        doc = await generate_sprint_plan(project_id, scope)
        new_docs.append(doc)
        print("[GRAPH] ✅ sprint_plan generated.")

    return {
        # Reducer: _merge_docs will upsert these into the accumulated list
        "generated_documents": new_docs,
        "step_log": [f"✅ doc_gen_node: generated {len(new_docs)} new doc(s) → {[d.doc_type for d in new_docs]}"],
    }


async def skip_gen_node(state: dict) -> dict:
    """
    LangGraph node: no-op branch taken when all documents already exist.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).
    Logs a message and passes state through unchanged.
    """
    existing = state.get("existing_doc_types") or []
    msg = f"skip_gen_node: all {len(existing)} documents already exist — skipping generation."
    print(f"[GRAPH] {msg}")
    return {"step_log": [msg]}
