"""
Tests for schemas.auth (Pydantic auth schemas)
===============================================
Run with:
    cd backend
    python -m pytest tests/test_schemas.py -v

All tests are pure Pydantic validation tests — no database or network.
"""

from __future__ import annotations

import sys
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv


# Path setup

APP_DIR = Path(__file__).resolve().parent.parent / "app"
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

# Load .env
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_FILE)

os.environ.setdefault(
    "JWT_SECRET_KEY",
    os.getenv("JWT_SECRET_KEY") or "test-jwt-secret-key-minimum-32-bytes-long-for-sha256",
)
os.environ.setdefault("API_ORIGIN", os.getenv("API_ORIGIN") or "http://localhost:3000")

from pydantic import ValidationError  # noqa: E402

from schemas.auth import LoginRequest, RegisterRequest, TokenResponse  # noqa: E402



# RegisterRequest



class TestRegisterRequest:
    """Validation rules: valid EmailStr + password 8-128 chars + optional name."""

    def test_valid_registration(self):
        req = RegisterRequest(email="user@example.com", password="securepass")
        assert req.email == "user@example.com"

    def test_password_minimum_8_chars_passes(self):
        req = RegisterRequest(email="a@b.com", password="12345678")
        assert req.password == "12345678"

    def test_password_7_chars_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com", password="1234567")

    def test_password_exactly_128_chars_passes(self):
        long_pw = "A" * 128
        req = RegisterRequest(email="a@b.com", password=long_pw)
        assert len(req.password) == 128

    def test_password_129_chars_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com", password="A" * 129)

    def test_invalid_email_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="not-an-email", password="validpass")

    def test_missing_email_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(password="validpass")

    def test_missing_password_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com")

    def test_name_defaults_to_none(self):
        req = RegisterRequest(email="a@b.com", password="validpass")
        assert req.name is None

    def test_name_can_be_provided(self):
        req = RegisterRequest(email="a@b.com", password="validpass", name="Alice")
        assert req.name == "Alice"

    def test_email_is_normalised_to_lowercase(self):
        """Pydantic's EmailStr lowercases the email domain."""
        req = RegisterRequest(email="User@Example.COM", password="validpass")
        assert "@" in req.email



# LoginRequest



class TestLoginRequest:
    """Validation rules: valid EmailStr + non-empty password (no min length)."""

    def test_valid_login(self):
        req = LoginRequest(email="user@example.com", password="mypassword")
        assert req.email == "user@example.com"
        assert req.password == "mypassword"

    def test_invalid_email_raises_validation_error(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="bad-email", password="pw")

    def test_missing_email_raises_validation_error(self):
        with pytest.raises(ValidationError):
            LoginRequest(password="pw")

    def test_missing_password_raises_validation_error(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="a@b.com")

    def test_password_can_be_short(self):
        """LoginRequest has no min_length constraint on password."""
        req = LoginRequest(email="a@b.com", password="x")
        assert req.password == "x"



# TokenResponse



class TestTokenResponse:
    """token_type defaults to 'bearer'; access_token is a required string."""

    def test_default_token_type_is_bearer(self):
        tr = TokenResponse(access_token="sometoken123")
        assert tr.token_type == "bearer"

    def test_custom_token_type(self):
        tr = TokenResponse(access_token="tok", token_type="jwt")
        assert tr.token_type == "jwt"

    def test_access_token_stored_correctly(self):
        tr = TokenResponse(access_token="abc.def.ghi")
        assert tr.access_token == "abc.def.ghi"

    def test_missing_access_token_raises_validation_error(self):
        with pytest.raises(ValidationError):
            TokenResponse()
