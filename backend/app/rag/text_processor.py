# text_processor.py
from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


class TextProcessor:

    @staticmethod
    def chunk_documents(documents: List[Document], chunk_size: int = 1000, chunk_overlap: int = 400) -> List[Document]:
        if not documents:
            print("[CHUNKER] Warning: No documents provided to chunk.")
            return []

        print("\n[CHUNKER] Starting document chunking process...")

        # Initialize the splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]  # Prioritize natural breaks
        )

        # Split the list of documents
        chunks = text_splitter.split_documents(documents)

        print(f"[CHUNKER] Chunking complete. Total documents loaded: {len(documents)} -> Total chunks created: {len(chunks)}")
        return chunks

    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ) -> List[str]:
        """
        Split a raw string into overlapping text chunks.

        Useful when you have plain text (e.g. a generated document's content)
        and don't need full LangChain Document objects.

        Args:
            text: The raw string to split.
            chunk_size: Maximum characters per chunk.
            chunk_overlap: Overlap characters between adjacent chunks.

        Returns:
            A list of text chunk strings.
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
        )
        return splitter.split_text(text)
