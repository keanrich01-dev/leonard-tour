"""Upload existing backend/media files to the configured Cloudflare R2 bucket.

Run from backend after setting MEDIA_STORAGE_BACKEND=r2 and all R2 environment variables:
    python scripts/migrate_media_to_r2.py
"""
from pathlib import Path
import mimetypes

from app.core.config import settings
from app.services.media_storage import MEDIA_ROOT, MediaStorageError, save_media

ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"}


def main() -> None:
    if settings.media_storage_backend != "r2":
        raise SystemExit("Set MEDIA_STORAGE_BACKEND=r2 before running this migration.")
    if not MEDIA_ROOT.exists():
        print(f"No local media folder found at {MEDIA_ROOT}; nothing to upload.")
        return
    total = 0
    for path in sorted(MEDIA_ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in ALLOWED:
            continue
        key = path.relative_to(MEDIA_ROOT).as_posix()
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        try:
            save_media(key, path.read_bytes(), content_type)
        except MediaStorageError as exc:
            raise SystemExit(f"Upload failed for {key}: {exc}") from exc
        total += 1
        print(f"Uploaded: {key}")
    print(f"Completed: {total} media object(s) uploaded to R2.")


if __name__ == "__main__":
    main()
