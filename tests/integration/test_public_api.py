from tests.conftest import auth_header_for_user


def test_public_reference_tracking_no_pii(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    # Citizen creates request
    resp = client.post(
        "/requests",
        headers=cit_headers,
        json={"service_code": "PASSPORT", "notes": "Highly confidential note"},
    )
    ref = resp.json()["reference"]

    # Anyone (public, no auth) tracks the reference
    track_resp = client.get(f"/track/{ref}")
    assert track_resp.status_code == 200
    track_data = track_resp.json()

    assert track_data["reference"] == ref
    assert track_data["service_name"] == "Passport Application"
    assert track_data["status"] == "SUBMITTED"
    assert "submitted_at" in track_data
    assert "due_date" in track_data

    # Verify zero PII is leaked
    assert "citizen" not in track_data
    assert "citizen_id" not in track_data
    assert "notes" not in track_data
    assert "email" not in track_data

    # Nonexistent reference
    not_found_resp = client.get("/track/SR-9999-999999")
    assert not_found_resp.status_code == 404
    assert not_found_resp.json()["error"]["code"] == "not_found"


def test_catalogue_endpoints(client, seed_data):
    # Services
    services_resp = client.get("/services")
    assert services_resp.status_code == 200
    services = services_resp.json()
    assert len(services) >= 2
    codes = [s["code"] for s in services]
    assert "PASSPORT" in codes
    assert "LICENCE" in codes

    # Offices
    offices_resp = client.get("/offices")
    assert offices_resp.status_code == 200
    offices = offices_resp.json()
    assert len(offices) >= 1
    assert offices[0]["code"] == "KTM"


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_uniform_validation_error_format(client):
    # Sending invalid email and too-short password to register
    resp = client.post(
        "/auth/register",
        json={"email": "not-an-email", "password": "123", "full_name": ""},
    )
    assert resp.status_code == 422
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "validation_error"
    assert data["error"]["message"] == "Validation failed"
    assert isinstance(data["error"]["details"], list)
    assert len(data["error"]["details"]) > 0
