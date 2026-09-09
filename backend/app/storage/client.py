"""
S3 / MinIO Client
=================
Creates a module-level boto3 S3 client that is shared across the app.
"""

import os

import boto3
from dotenv import load_dotenv

load_dotenv()

# Read S3 credentials directly from environment so this module can be
# imported before FastAPI's Settings object is initialised.
S3_ENDPOINT   = os.getenv("S3_ENDPOINT", "")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "")
S3_REGION     = os.getenv("S3_REGION", "us-east-1")
S3_BUCKET     = os.getenv("S3_BUCKET", "ai_intelligence_risk_advisor")


def create_s3_client():
    kwargs = {
        "aws_access_key_id":     S3_ACCESS_KEY,
        "aws_secret_access_key": S3_SECRET_KEY,
        "region_name":           S3_REGION,
    }

    if S3_ENDPOINT:
        # MinIO / self-hosted S3 — must disable virtual-hosted-style requests
        kwargs["endpoint_url"] = S3_ENDPOINT
        kwargs["config"] = boto3.session.Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
        )

    return boto3.client("s3", **kwargs)


s3_client = create_s3_client()