"""
Supabase Storage helper using the S3-compatible API via boto3.
This bypasses all Row Level Security restrictions.
"""
import os
import uuid
import logging
import asyncio
from functools import partial
from typing import Optional

logger = logging.getLogger(__name__)

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
BUCKET: str = os.getenv("SUPABASE_BUCKET", "community-media")
_S3_ACCESS_KEY: str = os.getenv("SUPABASE_S3_ACCESS_KEY", "")
_S3_SECRET_KEY: str = os.getenv("SUPABASE_S3_SECRET_KEY", "")
_S3_ENDPOINT: str = os.getenv("SUPABASE_S3_ENDPOINT", "")
_S3_REGION: str = os.getenv("SUPABASE_S3_REGION", "us-east-1")

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    if not (_S3_ACCESS_KEY and _S3_SECRET_KEY and _S3_ENDPOINT):
        return None
    try:
        import boto3
        from botocore.config import Config
        _s3_client = boto3.client(
            "s3",
            endpoint_url=_S3_ENDPOINT,
            aws_access_key_id=_S3_ACCESS_KEY,
            aws_secret_access_key=_S3_SECRET_KEY,
            region_name=_S3_REGION,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
            ),
        )
        return _s3_client
    except Exception as exc:
        logger.warning("Failed to create S3 client: %s", exc)
        return None


def _do_upload(file_bytes: bytes, key: str, content_type: str) -> Optional[str]:
    """Synchronous S3 upload — run in a thread pool."""
    client = _get_s3_client()
    if not client:
        return None
    try:
        client.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{key}"
        logger.info("Uploaded to Supabase S3: %s", public_url)
        return public_url
    except Exception as exc:
        logger.warning("Supabase S3 upload failed: %s", exc)
        return None


async def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> Optional[str]:
    """
    Upload *file_bytes* to Supabase Storage (S3-compatible).
    Returns the public CDN URL on success, or None (caller falls back to local disk).
    """
    unique_key = f"{uuid.uuid4().hex}_{filename}"
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_do_upload, file_bytes, unique_key, content_type)
    )
