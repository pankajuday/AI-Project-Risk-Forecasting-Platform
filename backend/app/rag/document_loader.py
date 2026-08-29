
from dotenv import load_dotenv
load_dotenv()

import os
from pathlib import Path
from typing import Optional, List
from langchain_core.documents import Document # The standard output type
from langchain_docling import DoclingLoader
from langchain_docling.loader import ExportType



class DocumentLoader:
    """
    A utility class to load documents from various file types 
    using LangChain's document loaders.
    """
    
    @staticmethod
    def load_document(file_path: str) -> Optional[List[Document]]:
        """
        Loads a document by inspecting its file extension and using 
        the appropriate LangChain loader.
        
        Args:
            file_path: The full path to the document file.
        
        Returns:
            A list of LangChain Document objects if successful, otherwise None.
        """
        path = Path(file_path)
        if not path.exists():
            print(f"Error: File not found at path: {file_path}")
            return None

        extension = path.suffix.lower()
        print(f"\n[LOADER] Detecting document type: {extension}...")

        try:
            loader = DoclingLoader(file_path=path,export_type=ExportType.MARKDOWN)
            
            documents = loader.load()
            
            print(f"[LOADER] Successfully loaded {len(documents)} document(s).")
            return documents

        except Exception as e:
            print(f"[LOADER] FATAL ERROR during loading process for {extension}: {e}")
            print("   Check if the document is corrupted or if necessary dependencies are installed.")
            return None

