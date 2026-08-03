import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

DATA_DIR = Path(os.getenv("PRYSM_DATA_DIR", str(BASE_DIR / "data")))
UPLOAD_DIR = DATA_DIR / "uploads"
RESULTS_DIR = DATA_DIR / "results"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "prysm.db")))

_DEFAULT_SECRET = "prysm-dev-secret-change-in-production-0000000000000000"
SECRET_KEY = os.getenv("SECRET_KEY", _DEFAULT_SECRET)
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
FLASK_ENV = os.getenv("FLASK_ENV", "development").lower()

# Fail closed in production if the secret was never rotated.
if FLASK_ENV == "production" and SECRET_KEY == _DEFAULT_SECRET:
    raise ValueError(
        "SECRET_KEY must be set to a unique value when FLASK_ENV=production."
    )

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "86400"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
CODE_EXEC_TIMEOUT = int(os.getenv("CODE_EXEC_TIMEOUT", "45"))
MAX_DATASETS_PER_USER = int(os.getenv("MAX_DATASETS_PER_USER", "50"))
MAX_ANALYSES_PER_USER = int(os.getenv("MAX_ANALYSES_PER_USER", "100"))
# When true (or when OPENAI_API_KEY is missing), use deterministic demo analysis.
DEMO_MODE = os.getenv("DEMO_MODE", "auto").lower()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "").strip()
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

USE_S3 = os.getenv("USE_S3", "false").lower() == "true"
S3_BUCKET = os.getenv("S3_BUCKET", "prysm-data")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def use_demo_analysis() -> bool:
    if DEMO_MODE in {"1", "true", "yes", "on"}:
        return True
    if DEMO_MODE in {"0", "false", "no", "off"}:
        return False
    # auto
    return not bool(OPENAI_API_KEY)
