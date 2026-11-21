"""Local or Cloudflare R2 media storage.

Object keys are stored in the database; API responses expose either /media/<key>
for local development or an absolute public R2 custom-domain URL in production.
"""
from functools import lru_cache
from pathlib import Path, PurePosixPath

from app.core.config import settings

MEDIA_ROOT = Path(__file__).resolve().parents[2] / "media"


class MediaStorageError(RuntimeError):
    pass


def _key(value: str) -> str:
    raw = str(value or "").replace("\\", "/").strip().lstrip("/")
    if raw.startswith("media/"):
        raw = raw[6:]
    path = PurePosixPath(raw)
    if not raw or path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise MediaStorageError("Invalid media object key")
    return str(path)


@lru_cache(maxsize=1)
def _r2_client():
    required = (settings.r2_account_id, settings.r2_access_key_id,
                settings.r2_secret_access_key, settings.r2_bucket,
                settings.media_public_url)
    if not all(x.strip() for x in required):
        raise MediaStorageError("Cloudflare R2 storage is selected but its credentials/bucket/public URL are incomplete")
    try:
        import boto3
        return boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
    except Exception as exc:
        raise MediaStorageError("Could not initialize Cloudflare R2 client") from exc


def media_url(value: str | None) -> str | None:
    if not value:
        return None
    value = str(value).strip()
    if value.startswith(("https://", "http://", "data:", "blob:")):
        return value
    key = _key(value)
    if settings.media_storage_backend == "r2" and settings.media_public_url.strip():
        return f"{settings.media_public_url.rstrip('/')}/{key}"
    return f"/media/{key}"


def save_media(key: str, content: bytes, content_type: str) -> str:
    object_key = _key(key)
    if settings.media_storage_backend == "r2":
        try:
            _r2_client().put_object(
                Bucket=settings.r2_bucket,
                Key=object_key,
                Body=content,
                ContentType=content_type,
                CacheControl="public, max-age=31536000, immutable",
            )
        except MediaStorageError:
            raise
        except Exception as exc:
            raise MediaStorageError("Upload to Cloudflare R2 failed") from exc
        return object_key

    target = (MEDIA_ROOT / object_key).resolve()
    if MEDIA_ROOT.resolve() not in target.parents:
        raise MediaStorageError("Invalid local media path")
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    except OSError as exc:
        raise MediaStorageError("Could not save media file") from exc
    return object_key


def delete_media(key: str) -> None:
    object_key = _key(key)
    if settings.media_storage_backend == "r2":
        try:
            _r2_client().delete_object(Bucket=settings.r2_bucket, Key=object_key)
        except Exception as exc:
            raise MediaStorageError("Could not delete media object from Cloudflare R2") from exc
        return
    target = (MEDIA_ROOT / object_key).resolve()
    if MEDIA_ROOT.resolve() in target.parents:
        target.unlink(missing_ok=True)
