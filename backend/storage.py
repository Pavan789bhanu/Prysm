import os
import shutil
from pathlib import Path

from config import S3_BUCKET, UPLOAD_DIR, USE_S3

if USE_S3:
    import boto3

    s3 = boto3.client("s3")


def ensure_dirs() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_upload(file_obj, file_key: str) -> str:
    ensure_dirs()
    if USE_S3:
        s3.upload_fileobj(file_obj, S3_BUCKET, file_key)
        return file_key

    destination = UPLOAD_DIR / file_key
    destination.parent.mkdir(parents=True, exist_ok=True)
    file_obj.seek(0)
    with open(destination, "wb") as handle:
        shutil.copyfileobj(file_obj, handle)
    return file_key


def get_local_path(file_key: str) -> str:
    if ".." in file_key.replace("\\", "/").split("/"):
        raise ValueError("Invalid file key.")

    if USE_S3:
        local_path = UPLOAD_DIR / file_key.replace("/", "_")
        local_path.parent.mkdir(parents=True, exist_ok=True)
        if not local_path.exists():
            s3.download_file(S3_BUCKET, file_key, str(local_path))
        return str(local_path)

    destination = (UPLOAD_DIR / file_key).resolve()
    root = UPLOAD_DIR.resolve()
    if root not in destination.parents and destination != root:
        raise ValueError("Invalid file key.")
    return str(destination)


def delete_file(file_key: str) -> None:
    if ".." in file_key.replace("\\", "/").split("/"):
        return

    if USE_S3:
        s3.delete_object(Bucket=S3_BUCKET, Key=file_key)
        return

    path = (UPLOAD_DIR / file_key).resolve()
    root = UPLOAD_DIR.resolve()
    if root not in path.parents and path != root:
        return
    if path.exists():
        path.unlink()
