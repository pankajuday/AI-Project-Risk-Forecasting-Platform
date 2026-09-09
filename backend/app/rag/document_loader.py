
from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
from typing import Optional, List
from langchain_core.documents import Document
from langchain_docling import DoclingLoader
from langchain_docling.loader import ExportType


class DocumentLoader:
    """
    Loads documents from a local file path using Docling via LangChain.
    Expects a fully-resolved, absolute path to a temporary file downloaded
    from S3 by the ingestion pipeline.
    """

    @staticmethod
    def load_document(file_path: str) -> Optional[List[Document]]:
        """
        Load a document by its absolute file path.

        Args:
            file_path: Absolute path to the document file (temp file from S3).

        Returns:
            A list of LangChain Document objects if successful, otherwise None.
        """
        path = Path(file_path)

        if not path.exists():
            print(f"[LOADER] Error: File not found at path: {file_path}")
            return None

        extension = path.suffix.lower()
        print(f"\n[LOADER] Detecting document type: {extension}...")

        try:
            loader = DoclingLoader(file_path=str(path), export_type=ExportType.MARKDOWN)
            documents = loader.load()
            print(f"[LOADER] Successfully loaded {len(documents)} document(s).")
            return documents

        except Exception as e:
            print(f"[LOADER] FATAL ERROR during loading process for {extension}: {e}")
            print("   Check if the document is corrupted or if necessary dependencies are installed.")
            return None
