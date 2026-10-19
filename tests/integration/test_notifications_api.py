from app.services.notification_service import create_notification
from tests.conftest import auth_header_for_user


def test_notifications_lifecycle(client, seed_data, db_session):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    # 1. Create notifications in DB
    create_notification(
        db=db_session,
        user_id=citizen.id,
        title="Application Received",
        message="Your passport file was received.",
    )
    create_notification(
        db=db_session,
        user_id=citizen.id,
        title="Action Required",
        message="Please provide signature.",
    )

    # 2. List notifications
    res = client.get("/notifications", headers=cit_headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 2
    first_id = notifs[0]["id"]

    # 3. Mark single notification as read
    read_one = client.post(f"/notifications/{first_id}/read", headers=cit_headers)
    assert read_one.status_code == 200
    assert read_one.json()["is_read"] is True

    # 4. Mark all as read
    read_all = client.post("/notifications/read-all", headers=cit_headers)
    assert read_all.status_code == 200
    assert read_all.json()["status"] == "ok"

    # 5. Filter unread only -> should be 0
    unread_res = client.get("/notifications?unread_only=true", headers=cit_headers)
    assert unread_res.status_code == 200
    assert len(unread_res.json()) == 0
