"""File storage abstraction for Emunah Academy.

Supports two backends chosen at runtime based on environment variables:

1. **Cloudflare R2 (preferred)** — when all four of ``R2_ENDPOINT``,
   ``R2_ACCESS_KEY_ID``, ``R2_SECRET_ACCESS_KEY`` and ``R2_BUCKET`` are set.
   Files live in R2 forever, independent of the Render instance. URLs are
   absolute (``https://pub-xxx.r2.dev/<key>`` when ``R2_PUBLIC_URL`` is set,
   otherwise ``<endpoint>/<bucket>/<key>``) and the frontend consumes them
   as-is (``resolveUploadUrl`` passes absolute URLs through untouched).

2. **Local disk (fallback, dev only)** — when the R2 env vars are missing,
   the backend writes to ``UPLOAD_DIR`` and returns relative ``/uploads/...``
   URLs, kept for backwards compatibility and for local development.

The module exposes a small synchronous API — ``save_file``, ``delete_file``
and ``file_exists`` — so callers don't need to know which backend is in use.
"""

from __future__ import annotations

import io
import os
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Optional
from urllib.parse import urlparse

import boto3
from botocore.client import Config


UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class R2Config:
    endpoint: str
    access_key: str
    secret_key: str
    bucket: str
    public_url: Optional[str]


def _load_r2_config() -> Optional[R2Config]:
    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
    bucket = os.environ.get("R2_BUCKET", "").strip()
    public_url = os.environ.get("R2_PUBLIC_URL", "").strip() or None
    if not (endpoint and access_key and secret_key and bucket):
        return None
    return R2Config(
        endpoint=endpoint.rstrip("/"),
        access_key=access_key,
        secret_key=secret_key,
        bucket=bucket,
        public_url=public_url.rstrip("/") if public_url else None,
    )


_R2_CONFIG = _load_r2_config()


def _build_client():
    if _R2_CONFIG is None:
        return None
    return boto3.client(
        "s3",
        endpoint_url=_R2_CONFIG.endpoint,
        aws_access_key_id=_R2_CONFIG.access_key,
        aws_secret_access_key=_R2_CONFIG.secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


_CLIENT = _build_client()


def is_r2_enabled() -> bool:
    return _R2_CONFIG is not None and _CLIENT is not None


def r2_public_url(key: str) -> str:
    assert _R2_CONFIG is not None
    if _R2_CONFIG.public_url:
        return f"{_R2_CONFIG.public_url}/{key.lstrip('/')}"
    # Fallback to the S3 path-style URL. This only works if the bucket has a
    # custom public configuration, but it's a sensible last resort.
    return f"{_R2_CONFIG.endpoint}/{_R2_CONFIG.bucket}/{key.lstrip('/')}"


def save_file(
    *,
    key: str,
    data: BinaryIO,
    content_type: Optional[str] = None,
) -> str:
    """Persist ``data`` under ``key`` and return a URL for it.

    ``key`` is a relative path like ``"books/<uuid>.pdf"`` or ``"<uuid>.png"``.
    When R2 is enabled the function returns an absolute URL; otherwise it
    returns ``/uploads/<key>`` so the existing ``StaticFiles`` mount keeps
    serving the file.
    """
    key = key.lstrip("/")
    if is_r2_enabled():
        assert _CLIENT is not None and _R2_CONFIG is not None
        extra_args: dict[str, str] = {}
        if content_type:
            extra_args["ContentType"] = content_type
        _CLIENT.upload_fileobj(
            Fileobj=data,
            Bucket=_R2_CONFIG.bucket,
            Key=key,
            ExtraArgs=extra_args or None,
        )
        return r2_public_url(key)

    # Local disk fallback
    dest = UPLOAD_DIR / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    if hasattr(data, "seek"):
        try:
            data.seek(0)
        except Exception:
            pass
    with dest.open("wb") as fh:
        if hasattr(data, "read"):
            while True:
                chunk = data.read(1024 * 1024)
                if not chunk:
                    break
                fh.write(chunk)
        else:
            fh.write(data)  # type: ignore[arg-type]
    return f"/uploads/{key}"


def save_bytes(
    *,
    key: str,
    data: bytes,
    content_type: Optional[str] = None,
) -> str:
    return save_file(key=key, data=io.BytesIO(data), content_type=content_type)


def _parse_url(url: str) -> tuple[str, Optional[str]]:
    """Return (key, backend) where backend is 'r2', 'local' or None."""
    if not url:
        return "", None
    if url.startswith("/uploads/"):
        return url[len("/uploads/"):], "local"
    if _R2_CONFIG is not None:
        parsed = urlparse(url)
        if _R2_CONFIG.public_url and url.startswith(_R2_CONFIG.public_url + "/"):
            return url[len(_R2_CONFIG.public_url) + 1 :], "r2"
        # Path-style against the S3 endpoint
        endpoint_parsed = urlparse(_R2_CONFIG.endpoint)
        if (
            parsed.netloc == endpoint_parsed.netloc
            and parsed.path.lstrip("/").startswith(_R2_CONFIG.bucket + "/")
        ):
            return parsed.path.lstrip("/")[len(_R2_CONFIG.bucket) + 1 :], "r2"
    return "", None


def delete_file(url: str) -> bool:
    key, backend = _parse_url(url)
    if not key:
        return False
    if backend == "r2" and _CLIENT is not None and _R2_CONFIG is not None:
        try:
            _CLIENT.delete_object(Bucket=_R2_CONFIG.bucket, Key=key)
            return True
        except Exception as exc:
            print(f"[storage] R2 delete failed for {key}: {exc}")
            return False
    if backend == "local":
        path = UPLOAD_DIR / key
        if path.exists():
            try:
                path.unlink()
                return True
            except Exception as exc:
                print(f"[storage] local delete failed for {path}: {exc}")
    return False


def file_exists(url: str) -> bool:
    key, backend = _parse_url(url)
    if not key:
        return False
    if backend == "r2" and _CLIENT is not None and _R2_CONFIG is not None:
        try:
            _CLIENT.head_object(Bucket=_R2_CONFIG.bucket, Key=key)
            return True
        except Exception:
            return False
    if backend == "local":
        return (UPLOAD_DIR / key).exists()
    return False


__all__ = [
    "UPLOAD_DIR",
    "is_r2_enabled",
    "save_file",
    "save_bytes",
    "delete_file",
    "file_exists",
    "r2_public_url",
]
