"""
Pipeline State
==============
Typed TypedDict shared across all LangGraph nodes in the analysis pipeline.

Every node receives this state dict and returns a partial dict with only
the keys it mutates — LangGraph merges the updates automatically.
"""

from __future__ import annotations

from typing import Annotated, Any, Dict, List, Optional
from typing_extensions import TypedDict

# Lazy imports to avoid circular deps; actual types are used at runtime
from models.report_model import (
    GeneratedDocument,
    HealthBreakdown,
    RiskItem,
    ScopeOutput,
)


#  Reducer helpers 

def _append_log(existing: List[str], new: List[str]) -> List[str]:
    """Reducer: append new log lines to the existing list."""
    return existing + new


def _merge_docs(existing: List[GeneratedDocument], new: List[GeneratedDocument]) -> List[GeneratedDocument]:
    """
    Reducer: merge newly generated documents into the existing list.
    If a doc_type already exists, the new one replaces it (smart upsert).
    """
    by_type: Dict[str, GeneratedDocument] = {d.doc_type: d for d in existing}
    for doc in new:
        by_type[doc.doc_type] = doc
    return list(by_type.values())


#  The shared pipeline state 

class PipelineState(TypedDict):
    """
    Shared state for the LangGraph analysis pipeline.

    Fields are updated by individual nodes; LangGraph merges partial
    updates via the Annotated reducers.
    """

    #  Input 
    project_id: str

    #  Agent outputs 
    scope: Optional[ScopeOutput]
    risks: List[RiskItem]
    health_score: Optional[float]
    health_breakdown: Optional[HealthBreakdown]

    #  Document tracking 
    existing_doc_types: List[str]   # doc_types already present in DB
    missing_doc_types: List[str]    # doc_types that still need to be generated

    # Reducer: new docs are merged/upserted into the accumulated list
    generated_documents: Annotated[List[GeneratedDocument], _merge_docs]

    #  Diagnostics 
    error: Optional[str]

    # Reducer: log lines are appended across nodes
    step_log: Annotated[List[str], _append_log]

    # Raw LLM outputs for debugging
    raw_outputs: Dict[str, Any]
