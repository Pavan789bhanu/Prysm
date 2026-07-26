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
    assert resp.get_json()["status"] == "ok"


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
        json={"username": "x", "email": "x@e.com", "password": "short"},
    )
    assert resp.status_code == 400


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
    dataset = sample.get_json()["dataset"]
    assert dataset["filename"].endswith(".csv")
    assert dataset["row_count"] > 0

    deleted = client.delete(f"/api/datasets/{dataset['id']}", headers=headers)
    assert deleted.status_code == 200
    listed = client.get("/api/datasets", headers=headers).get_json()["datasets"]
    assert all(item["id"] != dataset["id"] for item in listed)


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
