import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Load backend/.env BEFORE reading any environment variables so that values in
# the .env file actually take effect. Without this, SECRET_KEY, OPENAI_API_KEY,
# CORS_ORIGINS, ADMIN_* and everything else would silently fall back to their
# defaults — which is exactly why production config (and logins) appeared broken.
try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:  # python-dotenv not installed — env vars still work.
    pass

# Where datasets, results and the SQLite DB live. Override with PRYSM_DATA_DIR
# (used in tests for full isolation, and handy for production volumes).
DATA_DIR = Path(os.getenv("PRYSM_DATA_DIR", str(BASE_DIR / "data")))
UPLOAD_DIR = DATA_DIR / "uploads"
RESULTS_DIR = DATA_DIR / "results"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "prysm.db")))

# A 32+ byte key keeps HMAC-SHA256 happy. Override in .env for production.
SECRET_KEY = os.getenv(
    "SECRET_KEY", "prysm-dev-secret-change-in-production-0000000000000000"
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "86400"))

# Admin bootstrap — an admin account is created/updated from these on startup.
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
