"""
Analysis Orchestrator (LangGraph)
==================================
Builds and runs the project analysis pipeline.

Pipeline flow
-------------

    START
        |
    scope_node          -> extract scope from uploaded project documents
        |
    risk_node           -> identify risks from the same project context
        |
    health_node         -> compute the project health score
        |
    doc_audit_node      -> check which generated document types are missing
        |
    conditional_doc_router
        |-- generate_docs  -> doc_gen_node (generate only missing documents)
        '-- skip_gen       -> skip_gen_node (no new document generation)
                            |
                    save_node    -> persist the final state to MongoDB and sync Qdrant
                            |
                        END

Key behavior
------------
- `PipelineState` is shared across all nodes.
- LangGraph merges partial updates from each node.
- `conditional_doc_router` selects document generation only when needed.
- `run_analysis` runs the full pipeline as a background task.
- `run_missing_docs_only` reuses existing scope, risks, and health data and only runs the document sub-pipeline.
"""

from __future__ import annotations

import traceback
from datetime import datetime, timezone
from typing import Literal

from langgraph.graph import END, START, StateGraph

from agents.pipeline_state import PipelineState
from agents.scope_agent import scope_node
from agents.risk_agent import risk_node
from agents.health_agent import health_node
from agents.document_generator_agent import (
    doc_audit_node,
    doc_gen_node,
    skip_gen_node,
)
from config.qdrant import sync_analysis_artifacts_to_qdrant
from models.report_model import AnalysisReport, AnalysisStatus
from models.project_model import Project, ProjectStatus




# Conditional router


def conditional_doc_router(
    state: PipelineState,
) -> Literal["generate_docs", "skip_gen"]:
    """
    Routes the graph after `doc_audit_node`.

    - "generate_docs"  → if there are any missing document types
    - "skip_gen"       → if all documents are already present
    """
    missing = state.get("missing_doc_types") or []
    route = "generate_docs" if missing else "skip_gen"
    print(f"[GRAPH] conditional_doc_router -> '{route}' (missing={missing})")
    return route


                                                                        
# Save node


async def save_node(state: dict) -> dict:
    """
    LangGraph node: persists the final pipeline state to MongoDB.
    `state` is typed as PipelineState at runtime (from agents.pipeline_state).
    Updates both AnalysisReport and Project documents.
    """
    project_id = state["project_id"]
    print(f"[GRAPH] save_node - persisting results for project: {project_id}")

    report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not report:
        report = AnalysisReport(project_id=project_id)

    # Map state → report fields
    report.scope = state.get("scope")
    report.risks = state.get("risks") or []
    report.health_score = state.get("health_score")
    report.health_breakdown = state.get("health_breakdown")
    report.generated_documents = state.get("generated_documents") or []
    report.existing_doc_types = state.get("existing_doc_types") or []
    report.missing_doc_types = state.get("missing_doc_types") or []
    report.raw_outputs = state.get("raw_outputs") or {}
    report.pipeline_step = "complete"

    # Mark error vs. success
    if state.get("error"):
        report.status = AnalysisStatus.FAILED
        report.error_message = state["error"]
    else:
        report.status = AnalysisStatus.READY
        report.error_message = None
        report.completed_at = datetime.now(timezone.utc)

    await report.save()

    try:
        await sync_analysis_artifacts_to_qdrant(report)
    except Exception as exc:
        print(f"[GRAPH] ⚠ save_node: could not sync analysis artifacts to Qdrant — {exc}")

    # Update project document
    project = await Project.get(project_id)
    if project and report.health_score is not None:
        project.status = (
            ProjectStatus.ANALYSIS_READY
            if not state.get("error")
            else ProjectStatus.FAILED
        )
        project.current_health_score = report.health_score
        project.health_score_history.append({
            "score": report.health_score,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        project.updated_at = datetime.now(timezone.utc)
        await project.save()

    log_msg = (
        f"✅ save_node: report saved — "
        f"health={report.health_score}/100, "
        f"risks={len(report.risks)}, "
        f"docs={len(report.generated_documents)}"
    )
    print(f"[GRAPH] {log_msg}")
    return {"step_log": [log_msg]}


# Graph builders

def _build_full_graph() -> StateGraph:
    """
    Builds the complete analysis pipeline graph.
    Runs: scope → risk → health → doc_audit → [router] → gen/skip → save
    """
    graph = StateGraph(PipelineState)

    # Register nodes
    graph.add_node("scope_node", scope_node)
    graph.add_node("risk_node", risk_node)
    graph.add_node("health_node", health_node)
    graph.add_node("doc_audit_node", doc_audit_node)
    graph.add_node("doc_gen_node", doc_gen_node)
    graph.add_node("skip_gen_node", skip_gen_node)
    graph.add_node("save_node", save_node)

    # Linear edges
    graph.add_edge(START, "scope_node")
    graph.add_edge("scope_node", "risk_node")
    graph.add_edge("risk_node", "health_node")
    graph.add_edge("health_node", "doc_audit_node")

    # Conditional branching after audit
    graph.add_conditional_edges(
        "doc_audit_node",
        conditional_doc_router,
        {
            "generate_docs": "doc_gen_node",
            "skip_gen": "skip_gen_node",
        },
    )

    # Both branches converge to save
    graph.add_edge("doc_gen_node", "save_node")
    graph.add_edge("skip_gen_node", "save_node")
    graph.add_edge("save_node", END)

    return graph.compile()


def _build_docs_only_graph() -> StateGraph:
    """
    Builds a lightweight graph that only runs the document sub-pipeline.
    Runs: doc_audit → [router] → gen/skip → save
    Requires scope + risks to already be in the provided initial state.
    """
    graph = StateGraph(PipelineState)

    graph.add_node("doc_audit_node", doc_audit_node)
    graph.add_node("doc_gen_node", doc_gen_node)
    graph.add_node("skip_gen_node", skip_gen_node)
    graph.add_node("save_node", save_node)

    graph.add_edge(START, "doc_audit_node")
    graph.add_conditional_edges(
        "doc_audit_node",
        conditional_doc_router,
        {
            "generate_docs": "doc_gen_node",
            "skip_gen": "skip_gen_node",
        },
    )
    graph.add_edge("doc_gen_node", "save_node")
    graph.add_edge("skip_gen_node", "save_node")
    graph.add_edge("save_node", END)

    return graph.compile()


# Compiled graph singletons (created once at module load)
_full_pipeline = _build_full_graph()
_docs_pipeline = _build_docs_only_graph()


#                                                                              
# Public entry points (called from FastAPI background tasks)
#                                                                              

async def run_analysis(project_id: str) -> None:
    """
    Full pipeline: scope → risk → health → doc_audit → gen/skip → save.
    Called as a FastAPI BackgroundTask from POST /analysis/{project_id}/run.
    """
    print(f"\n[ORCHESTRATOR] Starting full analysis for project: {project_id}")

    # Mark report as RUNNING
    existing = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if existing:
        existing.status = AnalysisStatus.RUNNING
        existing.error_message = None
        existing.scope = None
        existing.risks = []
        existing.health_score = None
        existing.health_breakdown = None
        existing.generated_documents = []
        existing.raw_outputs = {}
        existing.completed_at = None
        existing.pipeline_step = "starting"
        await existing.save()
    else:
        report = AnalysisReport(
            project_id=project_id,
            status=AnalysisStatus.RUNNING,
            pipeline_step="starting",
        )
        await report.save()

    # Mark project as running
    project = await Project.get(project_id)
    if project:
        project.status = ProjectStatus.ANALYSIS_RUNNING
        project.updated_at = datetime.now(timezone.utc)
        await project.save()

    # Build initial state
    initial_state: PipelineState = {
        "project_id": project_id,
        "scope": None,
        "risks": [],
        "health_score": None,
        "health_breakdown": None,
        "existing_doc_types": [],
        "missing_doc_types": [],
        "generated_documents": [],
        "error": None,
        "step_log": [f"🚀 Pipeline started for project: {project_id}"],
        "raw_outputs": {},
    }

    # Execute the graph
    try:
        final_state: PipelineState = await _full_pipeline.ainvoke(initial_state)
        print(
            f"[ORCHESTRATOR] Full analysis complete - "
            f"health={final_state.get('health_score')}/100, "
            f"risks={len(final_state.get('risks', []))}, "
            f"docs={len(final_state.get('generated_documents', []))}"
        )
        for line in final_state.get("step_log", []):
            print(f"  [LOG] {line}")

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        print(f"[ORCHESTRATOR] Pipeline FAILED: {error_msg}")

        # Persist failure
        report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
        if report:
            report.status = AnalysisStatus.FAILED
            report.error_message = str(exc)
            report.pipeline_step = "failed"
            await report.save()

        if project:
            project.status = ProjectStatus.FAILED
            project.updated_at = datetime.now(timezone.utc)
            await project.save()


async def run_missing_docs_only(project_id: str) -> dict:
    """
    Documents-only pipeline: doc_audit → gen/skip → save.
    Reuses the existing scope + risks from the DB report.
    Does NOT re-run scope / risk / health agents.

    Returns a summary dict with existing/missing/generated doc type lists.
    """
    print(f"\n[ORCHESTRATOR] Starting missing-docs-only pipeline for project: {project_id}")

    # Load existing report
    report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not report:
        raise ValueError(f"No analysis report found for project {project_id}. Run full analysis first.")

    # Mark as running
    report.status = AnalysisStatus.RUNNING
    report.pipeline_step = "doc_audit"
    await report.save()

    # Build initial state from existing report
    initial_state: PipelineState = {
        "project_id": project_id,
        "scope": report.scope,
        "risks": report.risks or [],
        "health_score": report.health_score,
        "health_breakdown": report.health_breakdown,
        "existing_doc_types": [],          # will be filled by doc_audit_node
        "missing_doc_types": [],           # will be filled by doc_audit_node
        "generated_documents": list(report.generated_documents),
        "error": None,
        "step_log": [f"📄 Missing-docs pipeline started for project: {project_id}"],
        "raw_outputs": report.raw_outputs or {},
    }

    # Execute the lightweight graph
    try:
        final_state: PipelineState = await _docs_pipeline.ainvoke(initial_state)
        print(
            f"[ORCHESTRATOR] Missing-docs pipeline complete - "
            f"generated={[d.doc_type for d in final_state.get('generated_documents', [])]}"
        )
        for line in final_state.get("step_log", []):
            print(f"  [LOG] {line}")

        return {
            "existing_doc_types": final_state.get("existing_doc_types", []),
            "missing_doc_types": final_state.get("missing_doc_types", []),
            "generated_doc_types": [
                d.doc_type for d in final_state.get("generated_documents", [])
                if d.doc_type in (final_state.get("missing_doc_types") or [])
            ],
        }

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        print(f"[ORCHESTRATOR] Missing-docs pipeline FAILED: {error_msg}")

        report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
        if report:
            report.status = AnalysisStatus.FAILED
            report.error_message = str(exc)
            report.pipeline_step = "failed"
            await report.save()

        raise
