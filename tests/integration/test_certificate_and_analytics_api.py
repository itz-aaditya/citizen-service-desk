from tests.conftest import auth_header_for_user


def test_certificate_and_analytics_lifecycle(client, seed_data):
    citizen = seed_data["citizen"]
    officer = seed_data["officer"]
    supervisor = seed_data["supervisor"]

    cit_headers = auth_header_for_user(citizen)
    off_headers = auth_header_for_user(officer)
    sup_headers = auth_header_for_user(supervisor)

    # 1. Citizen creates request
    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    # 2. Downloading certificate when status is SUBMITTED must fail (400 not_completed)
    cert_fail = client.get(f"/requests/{req_id}/certificate", headers=cit_headers)
    assert cert_fail.status_code == 400
    assert cert_fail.json()["error"]["code"] == "not_completed"

    # 3. Transition to COMPLETED
    client.post(f"/requests/{req_id}/assign", headers=sup_headers, json={"officer_id": officer.id})
    client.post(
        f"/requests/{req_id}/transition", headers=off_headers, json={"to_status": "UNDER_REVIEW"}
    )
    client.post(
        f"/requests/{req_id}/transition", headers=off_headers, json={"to_status": "APPROVED"}
    )
    client.post(
        f"/requests/{req_id}/transition", headers=off_headers, json={"to_status": "COMPLETED"}
    )

    # 4. Now download certificate -> MUST return PDF binary content with QR code
    cert_ok = client.get(f"/requests/{req_id}/certificate", headers=cit_headers)
    assert cert_ok.status_code == 200
    assert cert_ok.headers["content-type"] == "application/pdf"
    assert b"%PDF" in cert_ok.content

    # 5. Supervisor calls executive analytics
    analytics_resp = client.get("/reports/analytics", headers=sup_headers)
    assert analytics_resp.status_code == 200
    data = analytics_resp.json()
    assert "sla_compliance_rate" in data
    assert "total_requests" in data
    assert "services" in data
    assert "officers" in data
    assert data["total_requests"] >= 1
