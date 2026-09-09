"""
RAG Ingestion Pipeline
======================
Orchestrates the full document ingestion flow:
  S3/MinIO (file stored by document_controller)
    > Download to temp file
    > DocumentLoader (Docling > Markdown chunks)
    > TextProcessor  (RecursiveCharacterTextSplitter)
    > NVIDIAEmbeddings
    > QdrantVectorStore (per-project collection)
    > DocumentRecord status update (MongoDB)
"""

from __future__ import annotations

import os
import traceback
from datetime import datetime, timezone
from pathlib import Path

from models.document_model import DocumentRecord, DocumentStatus
from rag.document_loader import DocumentLoader
from rag.text_processor import TextProcessor
from config.qdrant import get_vector_store
from storage.service import download_to_tempfile


async def run_ingestion_pipeline(document_id: str) -> None:
    """
    Background task: load, chunk, embed and store a document in Qdrant.

    Args:
        document_id: The MongoDB ObjectId (str) of the DocumentRecord.
    """
    doc_record: DocumentRecord | None = await DocumentRecord.get(document_id)

    if doc_record is None:
        print(f"[PIPELINE] ERROR: DocumentRecord {document_id} not found.")
        return

    print(f"[PIPELINE] Starting ingestion for: {doc_record.filename}")

    #  1. Mark as PROCESSING 
    doc_record.processing_status = DocumentStatus.PROCESSING
    doc_record.updated_at = datetime.now(timezone.utc)
    await doc_record.save()

    tmp_path: str | None = None

    try:
        #  2. Download document from S3 to a temp file 
        suffix = Path(doc_record.filename).suffix or ""
        print(f"[PIPELINE] Downloading s3 key '{doc_record.storage_path}' ...")
        tmp_path = download_to_tempfile(doc_record.storage_path, suffix=suffix)

        #  3. Load document via Docling 
        print(f"[PIPELINE] Loading document from temp file: {tmp_path}")
        raw_docs = DocumentLoader.load_document(tmp_path)

        if not raw_docs:
            raise ValueError("DocumentLoader returned no content.")

        #  4. Chunk documents 
        chunks = TextProcessor.chunk_documents(raw_docs)

        if not chunks:
            raise ValueError("TextProcessor produced zero chunks.")

        #  5. Attach metadata to every chunk 
        for chunk in chunks:
            chunk.metadata.update({
                "project_id": doc_record.project_id,
                "document_id": str(doc_record.id),
                "filename": doc_record.filename,
                "file_type": doc_record.file_type,
            })

        #  6. Embed and store in Qdrant 
        print(f"[PIPELINE] Embedding {len(chunks)} chunks into Qdrant ...")
        vector_store = get_vector_store(doc_record.project_id)
        await vector_store.aadd_documents(chunks)

        #  7. Mark as COMPLETED 
        doc_record.processing_status = DocumentStatus.COMPLETED
        doc_record.chunk_count = len(chunks)
        doc_record.updated_at = datetime.now(timezone.utc)
        await doc_record.save()

        print(f"[PIPELINE] ✓ Ingestion complete for '{doc_record.filename}' "
              f"({len(chunks)} chunks stored).")

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        print(f"[PIPELINE] ✗ FAILED for '{doc_record.filename}': {error_msg}")

        doc_record.processing_status = DocumentStatus.FAILED
        doc_record.processing_error = str(exc)
        doc_record.updated_at = datetime.now(timezone.utc)
        await doc_record.save()

    finally:
        # Always clean up the temp file, even on failure
        if tmp_path:
            try:
                os.unlink(tmp_path)
                print(f"[PIPELINE] Cleaned up temp file: {tmp_path}")
            except OSError:
                pass
