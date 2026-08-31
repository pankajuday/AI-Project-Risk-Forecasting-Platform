import os
from beanie import init_beanie
from dotenv import load_dotenv
from pymongo import AsyncMongoClient
load_dotenv()

db_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
db_name = os.getenv("DB_NAME", "ai_intelligence_risk_advisor")


async def init_db():
    """Initialize MongoDB connection and register all Beanie document models."""
    client = AsyncMongoClient(db_uri)
    db = client[db_name]

    # Import here to avoid circular imports at module load time
    from models.user_model import User
    from models.project_model import Project
    from models.document_model import DocumentRecord
    from models.report_model import AnalysisReport
    from models.chat_model import ChatSession
    from models.tracked_risk_model import TrackedRisk, RiskEvent

    await init_beanie(
        database=db,
        document_models=[User, Project, DocumentRecord, AnalysisReport, ChatSession, TrackedRisk, RiskEvent],
    )
    print(f"[DB] Connected to MongoDB: {db_name}")