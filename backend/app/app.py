import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.mongodb import init_db
from core.security import settings
from storage.service import ensure_bucket


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Ensure the S3/MinIO bucket exists before serving any requests
    try:
        ensure_bucket()
    except Exception as exc:
        print(f"[STARTUP] Warning: could not verify S3 bucket: {exc}")
    yield


app = FastAPI(
    title="AI-Driven Enterprise Project Intelligence & Risk Management Platform",
    description="Intelligent platform for project risk forecasting using RAG and multi-agent AI.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.API_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from routes.document import router as document_router
from routes.project import router as project_router
from routes.analysis import router as analysis_router
from routes.chat import router as chat_router
from routes.user import router as user_router

app.include_router(document_router, prefix="/v1/api/document", tags=["Documents"])
app.include_router(project_router,  prefix="/v1/api/project",  tags=["Projects"])
app.include_router(analysis_router, prefix="/v1/api/analysis", tags=["Analysis"])
app.include_router(chat_router,     prefix="/v1/api/chat",     tags=["Chat"])
app.include_router(user_router,     prefix="/v1/api/user",     tags=["User"])
