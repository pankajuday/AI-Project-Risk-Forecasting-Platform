"""
Pytest configuration and environment setup.
Loads backend/.env before any tests are collected or run.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend/app is in sys.path
APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

# Load .env file from backend directory
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_FILE)

# Ensure fallback defaults if .env is missing any required keys
os.environ.setdefault(
    "JWT_SECRET_KEY",
    os.getenv("JWT_SECRET_KEY") or "test-jwt-secret-key-minimum-32-bytes-long-for-sha256",
)
os.environ.setdefault("API_ORIGIN", os.getenv("API_ORIGIN") or "http://localhost:3000")
