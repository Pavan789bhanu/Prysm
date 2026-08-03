"""End-to-end tests for every REST endpoint, run against an isolated app."""
from __future__ import annotations

import io


def _csv(content: bytes = b"a,b\n1,2\n3,4\n"):
    return (io.BytesIO(content), "data.csv")


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["checks"]["database"] is True


# --------------------------------------------------------------------------- #
# Registration
# --------------------------------------------------------------------------- #
def test_register_success(client):
    resp = client.post(
        "/api/auth/register",
        json={"username": "newuser", "email": "new@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["access_token"]
    assert body["user"]["username"] == "newuser"
    assert body["user"]["is_admin"] is False


def test_register_missing_fields(client):
    resp = client.post("/api/auth/register", json={"username": "x"})
    assert resp.status_code == 400


def test_register_short_password(client):
    resp = client.post(
        "/api/auth/register",
        json={"username": "shortpwd", "email": "x@e.com", "password": "short"},
    )
    assert resp.status_code == 400
    assert "Password" in resp.get_json()["message"]


def test_register_invalid_username(client):
    resp = client.post(
        "/api/auth/register",
        json={"username": "bad name!", "email": "ok@example.com", "password": "password123"},
    )
    assert resp.status_code == 400
    assert "Username" in resp.get_json()["message"]


def test_register_duplicate_username(client, auth):
    resp = client.post(
        "/api/auth/register",
        json={"username": "venu", "email": "other@example.com", "password": "password123"},
    )
    assert resp.status_code == 400
    assert "Username" in resp.get_json()["message"]


def test_register_duplicate_email(client, auth):
    resp = client.post(
        "/api/auth/register",
        json={"username": "venu2", "email": "venu@example.com", "password": "password123"},
    )
    assert resp.status_code == 400
    assert "Email" in resp.get_json()["message"]


# --------------------------------------------------------------------------- #
# Login + profile
# --------------------------------------------------------------------------- #
def test_login_success(client, auth):
    resp = client.post(
        "/api/auth/login", json={"username": "venu", "password": "password123"}
    )
    assert resp.status_code == 200
    assert resp.get_json()["access_token"]


def test_password_reset_flow(client, auth):
    # Ensure user exists via auth fixture.
    req = client.post(
        "/api/auth/password-reset/request",
        json={"email": "venu@example.com"},
    )
    assert req.status_code == 200
    body = req.get_json()
    assert "message" in body
    link = body.get("dev_reset_link")
    assert link and "token=" in link
    token = link.split("token=", 1)[1]

    confirm = client.post(
        "/api/auth/password-reset/confirm",
        json={"token": token, "new_password": "newpassword99"},
    )
    assert confirm.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"username": "venu", "password": "newpassword99"},
    )
    assert login.status_code == 200


def test_login_sets_access_cookie(client, auth):
    resp = client.post(
        "/api/auth/login", json={"username": "venu", "password": "password123"}
    )
    assert resp.status_code == 200
    cookies = ";".join(resp.headers.getlist("Set-Cookie"))
    assert "prysm_access_token=" in cookies


def test_change_password(client, auth):
    token, headers = auth
    bad = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong", "new_password": "password456"},
        headers=headers,
    )
    assert bad.status_code == 400

    ok = client.post(
        "/api/auth/change-password",
        json={"current_password": "password123", "new_password": "password456"},
        headers=headers,
    )
    assert ok.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"username": "venu", "password": "password456"},
    )
    assert login.status_code == 200


def test_login_wrong_password(client, auth):
    resp = client.post(
        "/api/auth/login", json={"username": "venu", "password": "WRONG"}
    )
    assert resp.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_profile_and_stats(client, auth):
    _, headers = auth
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["user"]["username"] == "venu"
    assert body["stats"] == {"datasets": 0, "analyses": 0, "completed_analyses": 0}


# --------------------------------------------------------------------------- #
# Admin bootstrap
# --------------------------------------------------------------------------- #
def test_admin_account_provisioned(client):
    resp = client.post(
        "/api/auth/login", json={"username": "admin", "password": "adminpass123"}
    )
    assert resp.status_code == 200
    token = resp.get_json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.get_json()["user"]["is_admin"] is True


# --------------------------------------------------------------------------- #
# Datasets
# --------------------------------------------------------------------------- #
def test_datasets_empty(client, auth):
    _, headers = auth
    resp = client.get("/api/datasets", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["datasets"] == []


def test_upload_csv_success(client, auth):
    _, headers = auth
    resp = client.post(
        "/api/datasets/upload",
        data={"file": _csv()},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert resp.status_code == 200
    ds = resp.get_json()["dataset"]
    assert ds["row_count"] == 2
    assert ds["column_count"] == 2
    assert ds["columns"] == ["a", "b"]
    assert ds["file_key"].startswith("user_")


def test_upload_same_filename_keeps_unique_keys(client, auth):
    _, headers = auth
    first = client.post(
        "/api/datasets/upload",
        data={"file": _csv()},
        content_type="multipart/form-data",
        headers=headers,
    ).get_json()["dataset"]
    second = client.post(
        "/api/datasets/upload",
        data={"file": _csv()},
        content_type="multipart/form-data",
        headers=headers,
    ).get_json()["dataset"]

    assert first["filename"] == second["filename"]
    assert first["file_key"] != second["file_key"]
    listed = client.get("/api/datasets", headers=headers).get_json()["datasets"]
    assert len(listed) == 2


def test_upload_rejects_non_csv(client, auth):
    _, headers = auth
    resp = client.post(
        "/api/datasets/upload",
        data={"file": (io.BytesIO(b"x"), "notes.txt")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert resp.status_code == 400


def test_upload_no_file(client, auth):
    _, headers = auth
    resp = client.post(
        "/api/datasets/upload",
        data={},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert resp.status_code == 400


def test_upload_invalid_csv(client, auth):
    _, headers = auth
    resp = client.post(
        "/api/datasets/upload",
        data={"file": (io.BytesIO(b"\x00\x01\x02not,a,valid"), "bad.csv")},
        content_type="multipart/form-data",
        headers=headers,
    )
    # Either pandas rejects it (400) or parses degenerate content (200);
    # the endpoint must not 500.
    assert resp.status_code in (200, 400)


# --------------------------------------------------------------------------- #
# Analyses (AI engine stubbed in conftest)
# --------------------------------------------------------------------------- #
def _upload(client, headers):
    resp = client.post(
        "/api/datasets/upload",
        data={"file": _csv()},
        content_type="multipart/form-data",
        headers=headers,
    )
    return resp.get_json()["dataset"]["id"]


def test_create_analysis_success(client, auth):
    _, headers = auth
    dataset_id = _upload(client, headers)
    resp = client.post(
        "/api/analyses",
        json={"query": "describe the data", "dataset_id": dataset_id},
        headers=headers,
    )
    assert resp.status_code == 200
    analysis = resp.get_json()["analysis"]
    assert analysis["status"] == "completed"
    assert analysis["plan"] == "preprocessing_agent"
    assert analysis["output"].startswith("import pandas")
    assert "preprocessing_agent" in analysis["agent_outputs"]
    assert analysis["dataset_preview"]["rows"] == 3
    assert len(analysis["charts"]) == 1
    assert analysis["execution"]["success"] is True


def test_sample_dataset_and_delete(client, auth):
    _, headers = auth
    sample = client.post("/api/datasets/sample", headers=headers)
    assert sample.status_code == 200
    body = sample.get_json()
    dataset = body["dataset"]
    assert dataset["filename"].endswith(".csv")
    assert dataset["row_count"] > 0
    assert body.get("reused") is False

    again = client.post("/api/datasets/sample", headers=headers)
    assert again.status_code == 200
    again_body = again.get_json()
    assert again_body.get("reused") is True
    assert again_body["dataset"]["id"] == dataset["id"]

    deleted = client.delete(f"/api/datasets/{dataset['id']}", headers=headers)
    assert deleted.status_code == 200
    listed = client.get("/api/datasets", headers=headers).get_json()["datasets"]
    assert all(item["id"] != dataset["id"] for item in listed)


def test_login_with_email(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "emailuser",
            "email": "emailuser@example.com",
            "password": "password123",
        },
    )
    resp = client.post(
        "/api/auth/login",
        json={"username": "emailuser@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.get_json()


def test_create_analysis_async_poll(client, auth):
    import time

    _, headers = auth
    dataset_id = _upload(client, headers)
    resp = client.post(
        "/api/analyses",
        json={"query": "async please", "dataset_id": dataset_id, "async": True},
        headers=headers,
    )
    assert resp.status_code == 202
    analysis = resp.get_json()["analysis"]
    assert analysis["status"] == "processing"

    final = None
    for _ in range(40):
        time.sleep(0.25)
        polled = client.get(f"/api/analyses/{analysis['id']}", headers=headers)
        final = polled.get_json()["analysis"]
        if final["status"] in {"completed", "failed"}:
            break
    assert final is not None
    assert final["status"] == "completed"
    assert final["charts"]


def test_create_analysis_missing_query(client, auth):
    _, headers = auth
    dataset_id = _upload(client, headers)
    resp = client.post(
        "/api/analyses", json={"dataset_id": dataset_id}, headers=headers
    )
    assert resp.status_code == 400


def test_create_analysis_missing_dataset(client, auth):
    _, headers = auth
    resp = client.post("/api/analyses", json={"query": "hi"}, headers=headers)
    assert resp.status_code == 400


def test_create_analysis_unknown_dataset(client, auth):
    _, headers = auth
    resp = client.post(
        "/api/analyses", json={"query": "hi", "dataset_id": 9999}, headers=headers
    )
    assert resp.status_code == 404


def test_list_and_get_analysis(client, auth):
    _, headers = auth
    dataset_id = _upload(client, headers)
    created = client.post(
        "/api/analyses",
        json={"query": "q", "dataset_id": dataset_id},
        headers=headers,
    ).get_json()["analysis"]

    listed = client.get("/api/analyses", headers=headers).get_json()["analyses"]
    assert len(listed) == 1

    got = client.get(f"/api/analyses/{created['id']}", headers=headers)
    assert got.status_code == 200
    assert got.get_json()["analysis"]["id"] == created["id"]


def test_get_analysis_isolated_per_user(client, auth):
    _, headers = auth
    dataset_id = _upload(client, headers)
    created = client.post(
        "/api/analyses",
        json={"query": "q", "dataset_id": dataset_id},
        headers=headers,
    ).get_json()["analysis"]

    other = client.post(
        "/api/auth/register",
        json={"username": "mallory", "email": "m@e.com", "password": "password123"},
    ).get_json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    resp = client.get(f"/api/analyses/{created['id']}", headers=other_headers)
    assert resp.status_code == 404


# --------------------------------------------------------------------------- #
# Legacy routes
# --------------------------------------------------------------------------- #
def test_legacy_register_and_login(client):
    reg = client.post(
        "/register",
        json={"username": "legacy", "email": "legacy@e.com", "password": "password123"},
    )
    assert reg.status_code == 201
    login = client.post("/login", json={"username": "legacy", "password": "password123"})
    assert login.status_code == 200


def test_legacy_query_and_results(client, auth):
    _, headers = auth
    # upload to get a file_key
    ds = client.post(
        "/api/datasets/upload",
        data={"file": _csv()},
        content_type="multipart/form-data",
        headers=headers,
    ).get_json()["dataset"]

    q = client.post(
        "/query",
        json={"query": "summary", "file_key": ds["file_key"]},
        headers=headers,
    )
    assert q.status_code == 200

    results = client.get("/results", headers=headers)
    assert results.status_code == 200
    assert isinstance(results.get_json(), list)
    assert results.get_json()[0]["status"] == "completed"


def test_analysis_includes_summary_and_report(client, auth):
    _, headers = auth
    dataset_id = _upload(client, headers)
    created = client.post(
        "/api/analyses",
        json={"query": "summarize", "dataset_id": dataset_id},
        headers=headers,
    )
    assert created.status_code == 200
    analysis = created.get_json()["analysis"]
    assert analysis["summary"]["headline"]
    assert analysis["summary"]["key_findings"]

    report = client.get(f"/api/analyses/{analysis['id']}/report", headers=headers)
    assert report.status_code == 200
    assert b"Prysm" in report.data
    assert b"Stakeholder Report" in report.data
    assert b"Print / Save PDF" in report.data


def test_demo_status_endpoint(client):
    resp = client.get("/api/demo/status")
    assert resp.status_code == 200
    body = resp.get_json()
    assert "ready_for_stakeholders" in body
    assert "checks" in body
    assert "sample_csv" in body["checks"]
    assert body["one_click_demo"] is True
    # Do not assume ready=True forever — honesty matters for demos.
    assert isinstance(body["ready_for_stakeholders"], bool)


def test_sample_demo_flow_returns_charts_and_summary(client, auth):
    _, headers = auth
    sample = client.post("/api/datasets/sample", headers=headers)
    assert sample.status_code == 200
    body = sample.get_json()
    assert "prysm_demo_sales" in body["dataset"]["filename"]
    dataset_id = body["dataset"]["id"]
    created = client.post(
        "/api/analyses",
        json={
            "query": body["suggested_query"],
            "dataset_id": dataset_id,
        },
        headers=headers,
    )
    assert created.status_code == 200
    analysis = created.get_json()["analysis"]
    assert analysis["summary"]["headline"]
    assert analysis["summary"]["chart_count"] >= 1
    assert len(analysis.get("charts") or []) >= 1
