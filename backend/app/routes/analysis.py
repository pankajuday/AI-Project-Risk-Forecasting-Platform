"""
Analysis Routes
===============
FastAPI router for triggering and querying the LangGraph analysis pipeline.

Endpoints:
  POST /{project_id}/run              — trigger full pipeline (background task)
  POST /{project_id}/generate-missing — generate only missing documents
  GET  /{project_id}/status           — poll current pipeline status
  GET  /{project_id}/report           — fetch full analysis report
  GET  /{project_id}/documents        — list AI-generated documents
  GET  /{project_id}/doc-audit        — audit which docs exist vs. are missing
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from agents.orchestrator import run_analysis, run_missing_docs_only
from agents.document_generator_agent import ALL_DOC_TYPES
from models.report_model import AnalysisReport, AnalysisStatus
from models.document_model import DocumentRecord
from models.project_model import Project

router = APIRouter()


# 
# Trigger endpoints
# 

@router.post("/{project_id}/run")
async def trigger_analysis(project_id: str, background_tasks: BackgroundTasks):
    """
    Trigger the full LangGraph analysis pipeline for a project.
    Runs in the background:  scope → risk → health → doc_audit → gen/skip → save
    """
    project = await Project.get(project_id)
    if not project or project.total_files == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot run analysis on an empty project (total_files is 0). Please upload at least one project document first.",
        )

    existing = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if existing and existing.status == AnalysisStatus.RUNNING:
        return {"message": "Analysis is already running.", "status": "running"}

    background_tasks.add_task(run_analysis, project_id)
    return {
        "message": "Full analysis pipeline started.",
        "status": "running",
        "pipeline": "full",
    }


@router.post("/{project_id}/generate-missing")
async def generate_missing_documents(project_id: str, background_tasks: BackgroundTasks):
    """
    Trigger document generation for any missing documents as a background task.
    Returns immediately (202 Accepted) — the frontend polls /status for completion.

    Detects which of the four canonical documents are missing and generates
    only those — scope/risk/health agents are NOT re-run.

    Requires a completed (or partial) analysis report to already exist.
    """
    project = await Project.get(project_id)
    if not project or project.total_files == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate documents for an empty project (total_files is 0). Please upload at least one project document first.",
        )

    existing = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="No analysis report found. Run full analysis first via POST /run.",
        )
    if existing.status == AnalysisStatus.RUNNING:
        return {"message": "Analysis is already running.", "status": "running"}

    background_tasks.add_task(run_missing_docs_only, project_id)
    return {
        "message": "Missing document generation started in background.",
        "status": "running",
        "pipeline": "missing_docs_only",
    }


# 
# Read endpoints
# 

@router.get("/{project_id}/status")
async def get_analysis_status(project_id: str):
    """
    Poll the current pipeline status and a lightweight progress summary.
    """
    uploaded_count = await DocumentRecord.find(DocumentRecord.project_id == project_id).count()
    report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not report:
        return {
            "status": "not_started",
            "project_id": project_id,
            "uploaded_doc_count": uploaded_count,
        }

    return {
        "status": report.status,
        "pipeline_step": report.pipeline_step,
        "health_score": report.health_score,
        "risk_count": len(report.risks),
        "doc_count": len(report.generated_documents),
        "uploaded_doc_count": uploaded_count,
        "existing_doc_types": report.existing_doc_types,
        "missing_doc_types": report.missing_doc_types,
        "error": report.error_message,
        "completed_at": report.completed_at,
    }


@router.get("/{project_id}/doc-audit")
async def get_doc_audit(project_id: str):
    """
    Return a detailed audit of which document types exist vs. are missing
    for the given project.
    """
    report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not report:
        raise HTTPException(
            status_code=404,
            detail="No analysis report found for this project.",
        )

    present = [doc.doc_type for doc in report.generated_documents]
    missing = [dt for dt in ALL_DOC_TYPES if dt not in present]

    return {
        "project_id": project_id,
        "all_doc_types": ALL_DOC_TYPES,
        "existing_doc_types": present,
        "missing_doc_types": missing,
        "total": len(ALL_DOC_TYPES),
        "present_count": len(present),
        "missing_count": len(missing),
        "all_present": len(missing) == 0,
    }


@router.get("/{project_id}/report")
async def get_report(project_id: str):
    """Retrieve the full analysis report."""
    report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not report:
        raise HTTPException(status_code=404, detail="No analysis found for this project.")
    return report


@router.get("/{project_id}/documents")
async def get_generated_documents(project_id: str):
    """List all AI-generated documents for a project."""
    report = await AnalysisReport.find_one(AnalysisReport.project_id == project_id)
    if not report:
        raise HTTPException(status_code=404, detail="No analysis found for this project.")
    return report.generated_documents
