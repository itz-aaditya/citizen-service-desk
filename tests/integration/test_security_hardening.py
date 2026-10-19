import io

from app.config import settings
from app.security import verify_password_timing_safe
from app.services.rate_limiter import limiter
from tests.conftest import auth_header_for_user


def test_security_headers_present(client):
    """Verify OWASP-recommended security headers are present on all responses."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"
    assert "max-age=" in resp.headers.get("strict-transport-security", "")
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_file_upload_rejects_empty_file(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    upload_resp = client.post(
        f"/requests/{req_id}/documents",
        headers=cit_headers,
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert upload_resp.status_code == 400
    assert upload_resp.json()["error"]["code"] == "empty_file"


def test_file_upload_rejects_disallowed_extension(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    upload_resp = client.post(
        f"/requests/{req_id}/documents",
        headers=cit_headers,
        files={"file": ("exploit.exe", io.BytesIO(b"MZ\x90\x00\x03"), "application/x-dosexec")},
    )
    assert upload_resp.status_code == 400
    assert upload_resp.json()["error"]["code"] == "unsupported_file_type"


def test_file_upload_rejects_fake_extension_magic_byte_mismatch(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    # File named .pdf but containing plain text or random non-PDF bytes
    fake_pdf = b"Hello, I am actually a text script masquerading as a PDF document"
    upload_resp = client.post(
        f"/requests/{req_id}/documents",
        headers=cit_headers,
        files={"file": ("fake.pdf", io.BytesIO(fake_pdf), "application/pdf")},
    )
    assert upload_resp.status_code == 400
    assert upload_resp.json()["error"]["code"] == "invalid_file_signature"


def test_file_upload_rejects_oversized_file(client, seed_data, monkeypatch):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    # Temporarily set limit to 100 bytes for test
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)

    oversized_bytes = b"%PDF-" + (b"A" * 200)
    upload_resp = client.post(
        f"/requests/{req_id}/documents",
        headers=cit_headers,
        files={"file": ("large.pdf", io.BytesIO(oversized_bytes), "application/pdf")},
    )
    assert upload_resp.status_code == 413
    assert upload_resp.json()["error"]["code"] == "file_too_large"


def test_file_upload_sanitizes_path_traversal(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    valid_pdf = b"%PDF-1.4 test document"
    upload_resp = client.post(
        f"/requests/{req_id}/documents",
        headers=cit_headers,
        files={"file": ("../../etc/passwd.pdf", io.BytesIO(valid_pdf), "application/pdf")},
    )
    assert upload_resp.status_code == 201
    assert ".." not in upload_resp.json()["filename"]
    assert "/" not in upload_resp.json()["filename"]
    assert "\\" not in upload_resp.json()["filename"]


def test_timing_safe_password_verification():
    """Verify timing safe verification handles nonexistent account hashes correctly."""
    result = verify_password_timing_safe("some_attempted_password", None)
    assert result is False


def test_rate_limiter_blocks_excessive_requests(client):
    """Verify sliding-window rate limiter returns 429 when threshold exceeded."""
    limiter.reset()

    # Hit /track with rapid calls exceeding limit
    for i in range(60):
        client.get("/track/SR-9999-999999")

    # 61st call should trigger 429
    blocked_resp = client.get("/track/SR-9999-999999")
    assert blocked_resp.status_code == 429
    assert blocked_resp.json()["error"]["code"] == "rate_limit_exceeded"
    assert "Retry-After" in blocked_resp.headers

    limiter.reset()
