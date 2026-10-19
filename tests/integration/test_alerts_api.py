from datetime import datetime, timedelta, timezone

from app.models import ServiceRequest
from tests.conftest import auth_header_for_user


def test_alerts_scan_and_idempotency(client, seed_data, db_session):
    supervisor = seed_data["supervisor"]
    citizen = seed_data["citizen"]
    officer = seed_data["officer"]
    passport = seed_data["passport"]

    sup_headers = auth_header_for_user(supervisor)
    cit_headers = auth_header_for_user(citizen)

    now = datetime.now(timezone.utc)

    # Create an overdue request in DB
    overdue_req = ServiceRequest(
        reference="SR-OVERDUE-01",
        citizen_id=citizen.id,
        service_id=passport.id,
        assigned_officer_id=officer.id,
        status="UNDER_REVIEW",
        submitted_at=now - timedelta(days=15),
        due_date=now - timedelta(days=2),  # 48 hours overdue
        notes="Urgent overdue file",
    )
    db_session.add(overdue_req)
    db_session.commit()

    # 1. Citizen cannot trigger alert scan
    cit_scan = client.post("/alerts/scan", headers=cit_headers)
    assert cit_scan.status_code == 403

    # 2. Supervisor triggers scan -> detects overdue request
    scan1 = client.post("/alerts/scan", headers=sup_headers)
    assert scan1.status_code == 200
    res1 = scan1.json()
    assert res1["scanned_requests"] >= 1
    assert res1["new_alerts"] >= 1
    alert_id = res1["alerts"][0]["id"]
    assert res1["alerts"][0]["level"] in ["OVERDUE", "ESCALATED"]

    # 3. Idempotency: Re-running scan immediately must produce 0 new alerts!
    scan2 = client.post("/alerts/scan", headers=sup_headers)
    assert scan2.status_code == 200
    res2 = scan2.json()
    assert res2["new_alerts"] == 0

    # 4. List alerts
    list_resp = client.get("/alerts", headers=sup_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 5. Acknowledge alert
    ack_resp = client.post(f"/alerts/{alert_id}/ack", headers=sup_headers)
    assert ack_resp.status_code == 200
    assert ack_resp.json()["acknowledged"] is True
    assert ack_resp.json()["acknowledged_by_id"] == supervisor.id

    # 6. Delay report
    report_resp = client.get("/reports/delays", headers=sup_headers)
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert len(report) >= 1
    assert report[0]["reference"] == "SR-OVERDUE-01"
    assert report[0]["delay_hours"] > 0
