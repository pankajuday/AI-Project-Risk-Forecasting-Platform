import os
import uuid

from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from models.report_model import AnalysisReport
from rag.embedder import embedding_model

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
VECTOR_SIZE = 2048  # nvidia/llama-nemotron-embed-1b-v2 output dimension

# Shared singleton client
qdrant_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    global qdrant_client
    if qdrant_client is None:
        qdrant_client = QdrantClient(url=QDRANT_URL)
    return qdrant_client


def collection_name(project_id: str) -> str:
    """One Qdrant collection per project for full isolation."""
    return f"project_{project_id}"


def get_or_create_collection(project_id: str) -> str:
    """Ensure a Qdrant collection exists for the given project. Returns collection name."""
    client = get_qdrant_client()
    col = collection_name(project_id)
    if not client.collection_exists(col):
        client.create_collection(
            collection_name=col,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"[QDRANT] Created collection: {col}")
    return col


def get_vector_store(project_id: str) -> QdrantVectorStore:
    """Return a LangChain QdrantVectorStore bound to a project's collection."""
    col = get_or_create_collection(project_id)
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=col,
        embedding=embedding_model,
    )


def _analysis_report_document(report: AnalysisReport) -> Document:
    scope = report.scope
    scope_lines = []
    if scope:
        if scope.project_name:
            scope_lines.append(f"Project name: {scope.project_name}")
        if scope.summary:
            scope_lines.append(f"Scope summary: {scope.summary}")
        if scope.objectives:
            scope_lines.append("Objectives:\n- " + "\n- ".join(scope.objectives))
        if scope.deliverables:
            scope_lines.append("Deliverables:\n- " + "\n- ".join(scope.deliverables))
        if scope.timeline:
            scope_lines.append(f"Timeline: {scope.timeline}")
        if scope.stakeholders:
            scope_lines.append("Stakeholders:\n- " + "\n- ".join(scope.stakeholders))
        if scope.out_of_scope:
            scope_lines.append("Out of scope:\n- " + "\n- ".join(scope.out_of_scope))

    risk_lines = []
    for risk in report.risks:
        risk_lines.append(
            f"- {risk.title} | category={risk.category.value} | severity={risk.severity.value} | "
            f"probability={risk.probability} | mitigation={risk.mitigation}"
        )

    generated_doc_types = [doc.doc_type for doc in report.generated_documents]
    missing_doc_types = report.missing_doc_types or []

    content_parts = [
        f"Analysis report for project {report.project_id}",
        f"Status: {report.status.value}",
        f"Health score: {report.health_score if report.health_score is not None else 'unknown'}",
        f"Generated document types: {', '.join(generated_doc_types) if generated_doc_types else 'none'}",
        f"Missing document types: {', '.join(missing_doc_types) if missing_doc_types else 'none'}",
    ]

    if scope_lines:
        content_parts.append("\n## Scope\n" + "\n\n".join(scope_lines))
    if risk_lines:
        content_parts.append("\n## Risks\n" + "\n".join(risk_lines))

    return Document(
        page_content="\n\n".join(content_parts),
        metadata={
            "project_id": report.project_id,
            "source_kind": "analysis_report",
            "artifact_type": "analysis_report_summary",
            "title": "Analysis Report Summary",
            "status": report.status.value,
            "doc_type": "analysis_report_summary",
            "generated_document_types": generated_doc_types,
            "missing_doc_types": missing_doc_types,
        },
    )


async def sync_analysis_artifacts_to_qdrant(report: AnalysisReport) -> None:
    """
    Upsert generated analysis artifacts into the project's Qdrant collection.

    Strategy:
    - The analysis report summary is stored as a single compact vector.
    - Each generated document (executive summary, user stories, etc.) is split
      into overlapping chunks via TextProcessor before embedding, so long docs
      are properly searchable at retrieval time.
    """
    from rag.text_processor import TextProcessor  # local import avoids circular deps

    vector_store = get_vector_store(report.project_id)

    documents: list[Document] = []
    ids: list[str] = []

    #  1. Analysis report summary (compact — kept as one vector) 
    report_summary_doc = _analysis_report_document(report)
    documents.append(report_summary_doc)
    # Qdrant requires point IDs to be valid UUIDs or integers
    summary_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"analysis_report_summary:{report.project_id}"))
    ids.append(summary_id)
    print(f"[QDRANT] Prepared analysis report summary for project {report.project_id}")

    #  2. Generated documents (chunked for better retrieval) 
    for generated_doc in report.generated_documents:
        if not generated_doc.content:
            continue

        chunks = TextProcessor.chunk_text(
            generated_doc.content,
            chunk_size=1000,
            chunk_overlap=200,
        )

        print(
            f"[QDRANT] Chunking '{generated_doc.doc_type}' "
            f"({len(generated_doc.content)} chars → {len(chunks)} chunks)"
        )

        for i, chunk_text in enumerate(chunks):
            documents.append(
                Document(
                    page_content=chunk_text,
                    metadata={
                        "project_id": report.project_id,
                        "source_kind": "generated_document",
                        "artifact_type": "generated_document",
                        "title": generated_doc.title,
                        "doc_type": generated_doc.doc_type,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "created_at": generated_doc.created_at.isoformat(),
                    },
                )
            )
            chunk_id = str(
                uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"generated_document:{report.project_id}:{generated_doc.doc_type}:chunk_{i}",
                )
            )
            ids.append(chunk_id)

    await vector_store.aadd_documents(documents=documents, ids=ids)
    print(
        f"[QDRANT]  Synced {len(documents)} vectors for project {report.project_id} "
        f"(1 report summary + {len(documents) - 1} generated-doc chunks)"
    )




def delete_collection(project_id: str) -> None:
    """Delete a project's Qdrant collection (e.g. when project is deleted)."""
    client = get_qdrant_client()
    col = collection_name(project_id)
    if client.collection_exists(col):
        client.delete_collection(collection_name=col)
        print(f"[QDRANT] Deleted collection: {col}")