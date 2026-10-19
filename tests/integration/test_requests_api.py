from tests.conftest import auth_header_for_user


def test_submit_and_view_request(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    # Submit request for PASSPORT
    resp = client.post(
        "/requests",
        headers=cit_headers,
        json={"service_code": "PASSPORT", "notes": "Need for work trip"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["reference"].startswith("SR-")
    assert data["status"] == "SUBMITTED"
    assert data["service_code"] == "PASSPORT"
    assert data["citizen_id"] == citizen.id
    req_id = data["id"]

    # View detail as owner
    detail_resp = client.get(f"/requests/{req_id}", headers=cit_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == req_id


def test_anti_probing_404_security(client, seed_data):
    citizen = seed_data["citizen"]
    other_citizen = seed_data["other_citizen"]
    cit_headers = auth_header_for_user(citizen)
    other_headers = auth_header_for_user(other_citizen)

    # Citizen submits request
    resp = client.post(
        "/requests",
        headers=cit_headers,
        json={"service_code": "LICENCE"},
    )
    req_id = resp.json()["id"]

    # Other citizen attempts to access request: MUST return 404, not 403!
    probe_resp = client.get(f"/requests/{req_id}", headers=other_headers)
    assert probe_resp.status_code == 404
    assert probe_resp.json()["error"]["code"] == "not_found"

    # Other citizen attempts to view events: MUST return 404!
    probe_events = client.get(f"/requests/{req_id}/events", headers=other_headers)
    assert probe_events.status_code == 404


def test_full_request_workflow_and_audit_trail(client, seed_data):
    citizen = seed_data["citizen"]
    officer = seed_data["officer"]
    supervisor = seed_data["supervisor"]

    cit_headers = auth_header_for_user(citizen)
    off_headers = auth_header_for_user(officer)
    sup_headers = auth_header_for_user(supervisor)

    # 1. Citizen submits
    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]
    initial_due_date = resp.json()["due_date"]
    assert initial_due_date is not None

    # 2. Supervisor assigns officer
    assign_resp = client.post(
        f"/requests/{req_id}/assign",
        headers=sup_headers,
        json={"officer_id": officer.id},
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["assigned_officer_id"] == officer.id

    # 3. Officer moves to UNDER_REVIEW
    t1 = client.post(
        f"/requests/{req_id}/transition",
        headers=off_headers,
        json={"to_status": "UNDER_REVIEW", "reason": "Officer checking docs"},
    )
    assert t1.status_code == 200
    assert t1.json()["status"] == "UNDER_REVIEW"

    # 4. Officer moves to NEEDS_INFO (clock pauses)
    t2 = client.post(
        f"/requests/{req_id}/transition",
        headers=off_headers,
        json={"to_status": "NEEDS_INFO", "reason": "Please provide clearer photo"},
    )
    assert t2.status_code == 200
    assert t2.json()["status"] == "NEEDS_INFO"
    assert t2.json()["paused_at"] is not None

    # 5. Citizen responds (moves back to UNDER_REVIEW, clock resumes)
    t3 = client.post(
        f"/requests/{req_id}/transition",
        headers=cit_headers,
        json={"to_status": "UNDER_REVIEW", "reason": "Uploaded high res photo"},
    )
    assert t3.status_code == 200
    assert t3.json()["status"] == "UNDER_REVIEW"
    assert t3.json()["paused_at"] is None

    # 6. Officer approves
    t4 = client.post(
        f"/requests/{req_id}/transition",
        headers=off_headers,
        json={"to_status": "APPROVED", "reason": "Verification passed"},
    )
    assert t4.status_code == 200
    assert t4.json()["status"] == "APPROVED"

    # 7. Officer completes
    t5 = client.post(
        f"/requests/{req_id}/transition",
        headers=off_headers,
        json={"to_status": "COMPLETED", "reason": "Passport dispatched"},
    )
    assert t5.status_code == 200
    assert t5.json()["status"] == "COMPLETED"

    # 8. Check events audit trail
    events_resp = client.get(f"/requests/{req_id}/events", headers=cit_headers)
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert (
        len(events) >= 6
    )  # Initial, assign, under_review, needs_info, under_review, approved, completed


def test_citizen_cancels_own_request(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    resp = client.post("/requests", headers=cit_headers, json={"service_code": "LICENCE"})
    req_id = resp.json()["id"]

    cancel_resp = client.post(
        f"/requests/{req_id}/transition",
        headers=cit_headers,
        json={"to_status": "CANCELLED", "reason": "No longer needed"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"


def test_list_requests_filtering(client, seed_data):
    citizen = seed_data["citizen"]
    supervisor = seed_data["supervisor"]
    cit_headers = auth_header_for_user(citizen)
    sup_headers = auth_header_for_user(supervisor)

    # Citizen submits 2 requests
    client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    client.post("/requests", headers=cit_headers, json={"service_code": "LICENCE"})

    # List as citizen
    c_list = client.get("/requests", headers=cit_headers)
    assert c_list.status_code == 200
    assert len(c_list.json()) == 2

    # Filter by service_type
    p_filter = client.get("/requests?service_type=PASSPORT", headers=cit_headers)
    assert p_filter.status_code == 200
    assert len(p_filter.json()) == 1
    assert p_filter.json()[0]["service_code"] == "PASSPORT"

    # Supervisor sees all
    s_list = client.get("/requests", headers=sup_headers)
    assert s_list.status_code == 200
    assert len(s_list.json()) >= 2
