"""
Tests for core.security
=======================
Run with:
    cd backend
    python -m pytest tests/test_security.py -v

Tests cover:
  - hash_password        : produces a non-empty hash different from the input
  - verify_password      : correct/wrong password verification
  - create_access_token  : JWT structure, payload fields, expiry
"""

from __future__ import annotations

import sys
import os
import time
from pathlib import Path

import pytest
from dotenv import load_dotenv


# Path setup — ensure app/ is importable when running pytest from backend/

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

# Load .env
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_FILE)

# Provide minimal required env vars before importing settings-dependent modules
# Ensure key is at least 32 bytes long (256 bits) to satisfy RFC 7518 HS256 requirement
os.environ.setdefault(
    "JWT_SECRET_KEY",
    os.getenv("JWT_SECRET_KEY") or "test-jwt-secret-key-minimum-32-bytes-long-for-sha256",
)
os.environ.setdefault("API_ORIGIN", os.getenv("API_ORIGIN") or "http://localhost:3000")

import jwt  # noqa: E402

from core.security import (  # noqa: E402
    create_access_token,
    hash_password,
    verify_password,
)
from core.config import settings  # noqa: E402



# hash_password



class TestHashPassword:
    """hash_password must produce a salted hash that differs from plaintext."""

    def test_hash_is_string(self):
        result = hash_password("mypassword123")
        assert isinstance(result, str)

    def test_hash_is_not_plaintext(self):
        password = "super_secret_42"
        result = hash_password(password)
        assert result != password

    def test_hash_is_non_empty(self):
        result = hash_password("anything")
        assert len(result) > 0

    def test_two_hashes_of_same_password_differ(self):
        """Salted hashing — same password yields a different hash each call."""
        p = "samepassword"
        h1 = hash_password(p)
        h2 = hash_password(p)
        # bcrypt salts are random, so hashes should differ
        assert h1 != h2



# verify_password



class TestVerifyPassword:
    """verify_password must correctly accept/reject passwords against a hash."""

    def test_correct_password_returns_true(self):
        password = "correct_horse_battery"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_wrong_password_returns_false(self):
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_empty_password_against_non_empty_hash_returns_false(self):
        hashed = hash_password("nonempty")
        assert verify_password("", hashed) is False

    def test_case_sensitive(self):
        hashed = hash_password("Password123")
        assert verify_password("password123", hashed) is False



# create_access_token



class TestCreateAccessToken:
    """create_access_token must produce a valid, decodable JWT."""

    def _decode(self, token: str) -> dict:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

    def test_returns_string(self):
        token = create_access_token("user123")
        assert isinstance(token, str)

    def test_token_is_decodable(self):
        token = create_access_token("user_abc")
        payload = self._decode(token)
        assert isinstance(payload, dict)

    def test_payload_contains_sub(self):
        user_id = "507f1f77bcf86cd799439011"
        token = create_access_token(user_id)
        payload = self._decode(token)
        assert payload["sub"] == user_id

    def test_payload_contains_iat(self):
        token = create_access_token("any_user")
        payload = self._decode(token)
        assert "iat" in payload

    def test_payload_contains_exp(self):
        token = create_access_token("any_user")
        payload = self._decode(token)
        assert "exp" in payload

    def test_exp_is_in_the_future(self):
        token = create_access_token("any_user")
        payload = self._decode(token)
        assert payload["exp"] > int(time.time())

    def test_exp_greater_than_iat(self):
        token = create_access_token("any_user")
        payload = self._decode(token)
        assert payload["exp"] > payload["iat"]

    def test_different_users_different_tokens(self):
        t1 = create_access_token("user_1")
        t2 = create_access_token("user_2")
        assert t1 != t2
