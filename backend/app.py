import os
import sys
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.dirname(__file__))

import models
import storage
from config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_USERNAME,
    CORS_ORIGINS,
    FLASK_DEBUG,
    FRONTEND_URL,
    JWT_ACCESS_TOKEN_EXPIRES,
    JWT_COOKIE_SAMESITE,
    JWT_COOKIE_SECURE,
    MAX_ANALYSES_PER_USER,
    MAX_DATASETS_PER_USER,
    MAX_UPLOAD_BYTES,
    PASSWORD_RESET_LOG_TOKENS,
    PASSWORD_RESET_TTL_SECONDS,
    SECRET_KEY,
    use_demo_analysis,
)
from observability import health_extras, init_observability

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = JWT_ACCESS_TOKEN_EXPIRES
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
app.config["JWT_COOKIE_SECURE"] = JWT_COOKIE_SECURE
app.config["JWT_COOKIE_SAMESITE"] = JWT_COOKIE_SAMESITE
app.config["JWT_COOKIE_CSRF_PROTECT"] = True
app.config["JWT_ACCESS_COOKIE_NAME"] = "prysm_access_token"
app.config["JWT_ACCESS_CSRF_HEADER_NAME"] = "X-CSRF-TOKEN"
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(app, origins=CORS_ORIGINS, supports_credentials=True)
jwt = JWTManager(app)
init_observability(app)

models.init_db()
storage.ensure_dirs()


def bootstrap_admin() -> None:
    if not (ADMIN_USERNAME and ADMIN_PASSWORD):
        return
    if len(ADMIN_PASSWORD) < 8:
        print("[admin] ADMIN_PASSWORD must be at least 8 characters — skipping.")
        return
    email = ADMIN_EMAIL or f"{ADMIN_USERNAME}@local"
    _, created = models.create_or_update_admin(ADMIN_USERNAME, email, ADMIN_PASSWORD)
    print(
        f"[admin] Admin account '{ADMIN_USERNAME}' "
        f"{'created' if created else 'updated'}."
    )


bootstrap_admin()


@app.cli.command("create-admin")
def create_admin_command() -> None:
    import getpass

    username = input("Admin username: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass.getpass("Admin password (min 8 chars): ")
    if not username or len(password) < 8:
        print("Username is required and password must be at least 8 characters.")
        return
    _, created = models.create_or_update_admin(
        username, email or f"{username}@local", password
    )
    print(f"Admin '{username}' {'created' if created else 'updated'}.")


@app.cli.command("password-reset-link")
def password_reset_link_command() -> None:
    email = input("User email: ").strip().lower()
    token = models.create_password_reset_token(
        email, ttl_seconds=PASSWORD_RESET_TTL_SECONDS
    )
    if not token:
        print("No user found for that email.")
        return
    print(f"{FRONTEND_URL.rstrip('/')}/reset-password?token={token}")


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "is_admin": bool(user.get("is_admin", 0)),
        "created_at": user["created_at"],
    }


@app.errorhandler(413)
def too_large(_error):
    mb = MAX_UPLOAD_BYTES / (1024 * 1024)
    return jsonify({"message": f"File too large. Max upload size is {mb:.0f} MB."}), 413


@app.route("/api/health", methods=["GET"])
def health():
    db_ok = False
    storage_ok = False
    try:
        with models.get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
        db_ok = True
    except Exception:
        db_ok = False

    try:
        storage.ensure_dirs()
        storage_ok = True
    except Exception:
        storage_ok = False

    status = "ok" if db_ok and storage_ok else "degraded"
    code = 200 if db_ok else 503
    payload = {
        "status": status,
        "service": "prysm-api",
        "demo_mode": use_demo_analysis(),
        "checks": {"database": db_ok, "storage": storage_ok},
    }
    payload.update(health_extras())
    return jsonify(payload), code


@app.route("/api/auth/change-password", methods=["POST"])
@jwt_required()
def change_password():
    from rate_limit import auth_limiter

    user_id = int(get_jwt_identity())
    if not auth_limiter.allow(f"password:{user_id}"):
        return jsonify({"message": "Too many password change attempts. Try again shortly."}), 429

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    if not current_password or not new_password:
        return jsonify({"message": "current_password and new_password are required."}), 400

    error = models.change_password(user_id, current_password, new_password)
    if error:
        return jsonify({"message": error}), 400
    return jsonify({"message": "Password updated."})


@app.route("/api/auth/register", methods=["POST"])
def register():
    from rate_limit import auth_limiter

    client_key = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    if not auth_limiter.allow(f"register:{client_key}"):
        return jsonify({"message": "Too many registration attempts. Try again shortly."}), 429

    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"message": "Username, email, and password are required."}), 400

    from validation import validate_email, validate_username

    username_error = validate_username(username)
    if username_error:
        return jsonify({"message": username_error}), 400
    email_error = validate_email(email)
    if email_error:
        return jsonify({"message": email_error}), 400
    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 400
    if models.get_user_by_username(username):
        return jsonify({"message": "Username already exists."}), 400
    if models.get_user_by_email(email):
        return jsonify({"message": "Email already registered."}), 400

    user = models.create_user(username, email, password)
    token = create_access_token(identity=str(user["id"]))
    response = jsonify(
        {
            "message": "Account created successfully.",
            "access_token": token,
            "user": public_user(user),
        }
    )
    set_access_cookies(response, token)
    return response, 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    from rate_limit import auth_limiter

    client_key = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    if not auth_limiter.allow(f"login:{client_key}"):
        return jsonify({"message": "Too many login attempts. Try again shortly."}), 429

    data = request.get_json(silent=True) or {}
    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    user = None
    if identifier:
        if "@" in identifier:
            user = models.get_user_by_email(identifier.lower())
        else:
            user = models.get_user_by_username(identifier)
        if user and not models.verify_user(user["username"], password):
            user = None

    if not user:
        return jsonify({"message": "Invalid username/email or password."}), 401

    token = create_access_token(identity=str(user["id"]))
    response = jsonify({"access_token": token, "user": public_user(user)})
    set_access_cookies(response, token)
    return response


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    response = jsonify({"message": "Signed out."})
    unset_jwt_cookies(response)
    return response


@app.route("/api/auth/password-reset/request", methods=["POST"])
def password_reset_request():
    import logging

    from rate_limit import auth_limiter

    client_key = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    if not auth_limiter.allow(f"reset:{client_key}"):
        return jsonify({"message": "Too many reset attempts. Try again shortly."}), 429

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    # Always return the same message to avoid account enumeration.
    message = {
        "message": (
            "If an account exists for that email, a reset link was created. "
            "Ask your operator for the link or check server logs when "
            "PASSWORD_RESET_LOG_TOKENS is enabled."
        )
    }
    if not email:
        return jsonify(message)

    token = models.create_password_reset_token(
        email, ttl_seconds=PASSWORD_RESET_TTL_SECONDS
    )
    if token and PASSWORD_RESET_LOG_TOKENS:
        link = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        logging.getLogger("prysm.auth").info("Password reset link for %s: %s", email, link)
        # Include token only in non-production convenience mode for demos.
        if not JWT_COOKIE_SECURE:
            message["dev_reset_link"] = link
    return jsonify(message)


@app.route("/api/auth/password-reset/confirm", methods=["POST"])
def password_reset_confirm():
    from rate_limit import auth_limiter

    client_key = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    if not auth_limiter.allow(f"reset-confirm:{client_key}"):
        return jsonify({"message": "Too many reset attempts. Try again shortly."}), 429

    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("new_password") or ""
    if not token or not new_password:
        return jsonify({"message": "token and new_password are required."}), 400
    error = models.consume_password_reset_token(token, new_password)
    if error:
        return jsonify({"message": error}), 400
    return jsonify({"message": "Password updated. You can sign in now."})


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = models.get_user_by_id(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404
    stats = models.get_user_stats(user_id)
    return jsonify(
        {
            "user": public_user(user),
            "stats": stats,
            "demo_mode": use_demo_analysis(),
        }
    )


def _store_upload(user_id: int, filename: str, file_obj) -> tuple[dict | None, tuple | None]:
    import pandas as pd

    filename = secure_filename(filename)
    if not filename.lower().endswith(".csv"):
        return None, (jsonify({"message": "Only CSV files are supported."}), 400)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    unique = uuid.uuid4().hex[:8]
    stem = filename[:-4] if filename.lower().endswith(".csv") else filename
    # Use numeric user ids in storage keys — never raw usernames (path-safe).
    file_key = f"user_{user_id}/{stem}_{stamp}_{unique}.csv"
    storage.save_upload(file_obj, file_key)

    local_path = storage.get_local_path(file_key)
    try:
        dataset = pd.read_csv(local_path)
    except Exception as exc:
        storage.delete_file(file_key)
        return None, (jsonify({"message": f"Invalid CSV file: {exc}"}), 400)

    dataset_record = models.create_dataset(
        user_id=user_id,
        filename=filename,
        file_key=file_key,
        size_bytes=os.path.getsize(local_path),
        row_count=len(dataset),
        column_count=len(dataset.columns),
        columns=list(dataset.columns),
    )
    return dataset_record, None


@app.route("/api/datasets", methods=["GET"])
@jwt_required()
def list_datasets():
    user_id = int(get_jwt_identity())
    datasets = models.list_datasets_for_user(user_id)
    return jsonify({"datasets": datasets})


@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    # API responses are JSON; keep CSP tight for any HTML error pages.
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    )
    return response


@app.route("/api/datasets/upload", methods=["POST"])
@jwt_required()
def upload_dataset():
    from rate_limit import upload_limiter

    user_id = int(get_jwt_identity())
    if not upload_limiter.allow(f"upload:{user_id}"):
        return jsonify({"message": "Upload rate limit exceeded. Try again shortly."}), 429

    if models.count_datasets_for_user(user_id) >= MAX_DATASETS_PER_USER:
        return (
            jsonify(
                {
                    "message": (
                        f"Dataset limit reached ({MAX_DATASETS_PER_USER}). "
                        "Delete unused datasets to continue."
                    )
                }
            ),
            400,
        )

    if "file" not in request.files:
        return jsonify({"message": "No file provided."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"message": "No file selected."}), 400

    dataset_record, error = _store_upload(user_id, file.filename, file)
    if error:
        return error
    return jsonify(
        {"message": "Dataset uploaded successfully.", "dataset": dataset_record}
    )


@app.route("/api/datasets/sample", methods=["POST"])
@jwt_required()
def load_sample_dataset():
    """One-click demo dataset for stakeholder presentations."""
    from demo_service import SAMPLE_FILENAME, sample_file_bytes
    from rate_limit import upload_limiter

    user_id = int(get_jwt_identity())
    if not upload_limiter.allow(f"sample:{user_id}"):
        return jsonify({"message": "Sample dataset rate limit exceeded. Try again shortly."}), 429

    suggested = "Show correlations, revenue trends, and visualizations by region"

    # Reuse an existing sample dataset for this user to avoid clutter in demos.
    existing = next(
        (
            item
            for item in models.list_datasets_for_user(user_id)
            if item.get("filename") == SAMPLE_FILENAME
        ),
        None,
    )
    if existing:
        return jsonify(
            {
                "message": "Sample sales dataset ready.",
                "dataset": existing,
                "suggested_query": suggested,
                "reused": True,
            }
        )

    filename, buffer = sample_file_bytes()
    dataset_record, error = _store_upload(user_id, filename, buffer)
    if error:
        return error
    return jsonify(
        {
            "message": "Sample sales dataset loaded.",
            "dataset": dataset_record,
            "suggested_query": suggested,
            "reused": False,
        }
    )


@app.route("/api/datasets/<int:dataset_id>", methods=["DELETE"])
@jwt_required()
def remove_dataset(dataset_id: int):
    user_id = int(get_jwt_identity())
    dataset = models.get_dataset_by_id(dataset_id)
    if not dataset or dataset["user_id"] != user_id:
        return jsonify({"message": "Dataset not found."}), 404
    storage.delete_file(dataset["file_key"])
    models.delete_dataset(dataset_id, user_id)
    return jsonify({"message": "Dataset deleted."})


@app.route("/api/analyses", methods=["GET"])
@jwt_required()
def list_analyses():
    user_id = int(get_jwt_identity())
    try:
        limit = request.args.get("limit", type=int)
        offset = request.args.get("offset", default=0, type=int) or 0
    except Exception:
        limit, offset = None, 0
    if limit is not None:
        limit = max(1, min(limit, 100))
    offset = max(0, offset)
    analyses = models.list_analyses_for_user(user_id, limit=limit, offset=offset)
    total = models.count_analyses_for_user(user_id)
    return jsonify({"analyses": analyses, "total": total, "limit": limit, "offset": offset})


def _run_analysis_for(user_id: int, dataset: dict, query: str, *, async_mode: bool = False):
    from analyst_service import run_analysis
    from jobs import is_cancelled, start_analysis_job

    if models.count_analyses_for_user(user_id) >= MAX_ANALYSES_PER_USER:
        return {
            "message": (
                f"Analysis limit reached ({MAX_ANALYSES_PER_USER}). "
                "Delete older analyses to continue."
            )
        }, 400

    analysis = models.create_analysis(user_id, dataset["id"], query)
    analysis = models.update_analysis(analysis["id"], status="processing")

    def worker() -> None:
        try:
            local_path = storage.get_local_path(dataset["file_key"])
            result = run_analysis(local_path, query)
            if is_cancelled(analysis["id"]) or models.is_analysis_cancel_requested(
                analysis["id"]
            ):
                models.update_analysis(
                    analysis["id"],
                    status="cancelled",
                    error_message="Cancelled by user.",
                )
                return
            models.update_analysis(
                analysis["id"],
                status="completed",
                plan=result.get("plan"),
                plan_desc=result.get("plan_desc"),
                output=result.get("output"),
                agent_outputs=result.get("agent_outputs"),
                dataset_preview=result.get("dataset_preview"),
                charts=result.get("charts"),
                insights=result.get("insights"),
                execution=result.get("execution"),
                summary=result.get("summary"),
            )
        except Exception as exc:
            if is_cancelled(analysis["id"]):
                models.update_analysis(
                    analysis["id"],
                    status="cancelled",
                    error_message="Cancelled by user.",
                )
                return
            models.update_analysis(
                analysis["id"], status="failed", error_message=str(exc)
            )

    if async_mode:
        start_analysis_job(analysis["id"], worker)
        fresh = models.get_analysis_by_id(analysis["id"])
        return {
            "message": "Analysis started.",
            "analysis": fresh,
            "async": True,
        }, 202

    # Synchronous path (legacy + tests).
    try:
        local_path = storage.get_local_path(dataset["file_key"])
        result = run_analysis(local_path, query)
        analysis = models.update_analysis(
            analysis["id"],
            status="completed",
            plan=result.get("plan"),
            plan_desc=result.get("plan_desc"),
            output=result.get("output"),
            agent_outputs=result.get("agent_outputs"),
            dataset_preview=result.get("dataset_preview"),
            charts=result.get("charts"),
            insights=result.get("insights"),
            execution=result.get("execution"),
            summary=result.get("summary"),
        )
    except Exception as exc:
        analysis = models.update_analysis(
            analysis["id"], status="failed", error_message=str(exc)
        )
        return {
            "message": f"Analysis failed: {exc}",
            "analysis": analysis,
        }, 500

    return {"message": "Analysis completed.", "analysis": analysis}, 200


@app.route("/api/analyses", methods=["POST"])
@jwt_required()
def create_analysis():
    from rate_limit import analysis_limiter

    user_id = int(get_jwt_identity())
    if not analysis_limiter.allow(f"analysis:{user_id}"):
        return jsonify({"message": "Analysis rate limit exceeded. Try again shortly."}), 429

    data = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()
    dataset_id = data.get("dataset_id")
    async_mode = bool(data.get("async", False))

    if not query:
        return jsonify({"message": "Query is required."}), 400
    if not dataset_id:
        return jsonify({"message": "dataset_id is required."}), 400

    dataset = models.get_dataset_by_id(int(dataset_id))
    if not dataset or dataset["user_id"] != user_id:
        return jsonify({"message": "Dataset not found."}), 404

    payload, status = _run_analysis_for(
        user_id, dataset, query, async_mode=async_mode
    )
    return jsonify(payload), status


@app.route("/api/analyses/<int:analysis_id>", methods=["GET"])
@jwt_required()
def get_analysis(analysis_id: int):
    user_id = int(get_jwt_identity())
    analysis = models.get_analysis_by_id(analysis_id)
    if not analysis or analysis["user_id"] != user_id:
        return jsonify({"message": "Analysis not found."}), 404
    return jsonify({"analysis": analysis})


@app.route("/api/analyses/<int:analysis_id>", methods=["DELETE"])
@jwt_required()
def remove_analysis(analysis_id: int):
    user_id = int(get_jwt_identity())
    if not models.delete_analysis(analysis_id, user_id):
        return jsonify({"message": "Analysis not found."}), 404
    return jsonify({"message": "Analysis deleted."})


@app.route("/api/analyses/<int:analysis_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_analysis(analysis_id: int):
    from jobs import is_running, request_cancel

    user_id = int(get_jwt_identity())
    analysis = models.get_analysis_by_id(analysis_id)
    if not analysis or analysis["user_id"] != user_id:
        return jsonify({"message": "Analysis not found."}), 404

    if analysis["status"] not in {"pending", "processing"}:
        return jsonify({"message": "Only in-progress analyses can be cancelled."}), 400

    models.request_analysis_cancel(analysis_id, user_id)

    if is_running(analysis_id) and request_cancel(analysis_id):
        return jsonify({"message": "Cancellation requested.", "analysis_id": analysis_id})

    # Not running in this process (e.g. already finished) — mark cancelled if still open.
    models.update_analysis(
        analysis_id, status="cancelled", error_message="Cancelled by user."
    )
    fresh = models.get_analysis_by_id(analysis_id)
    return jsonify({"message": "Analysis cancelled.", "analysis": fresh})


@app.route("/api/analyses/<int:analysis_id>/report", methods=["GET"])
@jwt_required()
def analysis_report(analysis_id: int):
    """Download a stakeholder-ready HTML report for an analysis."""
    user_id = int(get_jwt_identity())
    analysis = models.get_analysis_by_id(analysis_id)
    if not analysis or analysis["user_id"] != user_id:
        return jsonify({"message": "Analysis not found."}), 404

    from report import render_analysis_report

    html = render_analysis_report(analysis)
    filename = f"prysm-analysis-{analysis_id}.html"
    return (
        html,
        200,
        {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@app.route("/api/demo/status", methods=["GET"])
def demo_status():
    from demo_status import build_demo_status

    deep = (request.args.get("deep") or "").lower() in {"1", "true", "yes"}
    return jsonify(build_demo_status(deep=deep))



@app.route("/register", methods=["POST"])
def legacy_register():
    return register()


@app.route("/login", methods=["POST"])
def legacy_login():
    return login()


@app.route("/upload", methods=["POST"])
@jwt_required()
def legacy_upload():
    return upload_dataset()


@app.route("/query", methods=["POST"])
@jwt_required()
def legacy_query():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    query = (data.get("query") or "").strip()
    file_key = data.get("file_key")

    if not query or not file_key:
        return jsonify({"message": "query and file_key are required."}), 400

    datasets = models.list_datasets_for_user(user_id)
    dataset = next((item for item in datasets if item["file_key"] == file_key), None)
    if not dataset:
        return jsonify({"message": "Dataset not found."}), 404

    payload, status = _run_analysis_for(user_id, dataset, query)
    return jsonify(payload), status


@app.route("/results", methods=["GET"])
@jwt_required()
def legacy_results():
    user_id = int(get_jwt_identity())
    analyses = models.list_analyses_for_user(user_id)
    legacy = [
        {
            "output": item.get("output"),
            "agent_outputs": item.get("agent_outputs"),
            "query": item.get("query"),
            "status": item.get("status"),
            "charts": item.get("charts"),
        }
        for item in analyses
    ]
    return jsonify(legacy)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=FLASK_DEBUG)
