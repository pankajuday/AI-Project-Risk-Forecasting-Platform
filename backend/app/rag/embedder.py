from dotenv import load_dotenv
load_dotenv()

import os
from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
# from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain_core.documents import Document

nvidia_api_key = os.getenv("NVIDIA_API_KEY")

# embedding_model = NVIDIAEmbeddings(
#     model="nvidia/nemotron-3-embed-1b",
#     api_key=nvidia_api_key,
#     truncate="NONE",
# )

gemini_api_key = os.getenv("GOOGLE_API_KEY")

embedding_model = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=gemini_api_key,
    task_type="SEMANTIC_SIMILARITY",
     output_dimensionality=2048
)

async def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed a list of text strings into vectors."""
    return await embedding_model.aembed_documents(texts)


async def embed_query(query: str) -> List[float]:
    """Embed a single query string into a vector."""
    return await embedding_model.aembed_query(query)
