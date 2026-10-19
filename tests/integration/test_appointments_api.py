from datetime import date, timedelta

from app.services.workdays import next_workday
from tests.conftest import auth_header_for_user


def test_appointment_booking_and_capacity_lifecycle(client, seed_data):
    citizen = seed_data["citizen"]
    other_citizen = seed_data["other_citizen"]
    cit_headers = auth_header_for_user(citizen)
    other_headers = auth_header_for_user(other_citizen)

    # Pick a valid future workday (e.g. 3 days ahead)
    target_date = next_workday(date.today() + timedelta(days=3))
    day_str = target_date.isoformat()

    # 1. Check initial availability: KTM capacity is 2
    avail_resp = client.get(f"/offices/KTM/availability?day={day_str}")
    assert avail_resp.status_code == 200
    slots = avail_resp.json()["slots"]
    slot_10 = next(s for s in slots if s["slot_start"] == "10:00")
    assert slot_10["capacity"] == 2
    assert slot_10["booked"] == 0
    assert slot_10["places_left"] == 2

    # 2. Citizen 1 books 10:00 slot
    book1 = client.post(
        "/appointments",
        headers=cit_headers,
        json={"office_code": "KTM", "appointment_date": day_str, "slot_start": "10:00"},
    )
    assert book1.status_code == 201
    appt1_id = book1.json()["id"]

    # 3. Citizen 1 attempts double booking on same day -> must fail
    dup_book = client.post(
        "/appointments",
        headers=cit_headers,
        json={"office_code": "KTM", "appointment_date": day_str, "slot_start": "11:00"},
    )
    assert dup_book.status_code == 400
    assert dup_book.json()["error"]["code"] == "double_booking"

    # 4. Citizen 2 books the second spot in 10:00 slot -> succeeds
    book2 = client.post(
        "/appointments",
        headers=other_headers,
        json={"office_code": "KTM", "appointment_date": day_str, "slot_start": "10:00"},
    )
    assert book2.status_code == 201

    # 5. Check availability -> places_left should now be 0
    avail_after = client.get(f"/offices/KTM/availability?day={day_str}")
    s10_after = next(s for s in avail_after.json()["slots"] if s["slot_start"] == "10:00")
    assert s10_after["booked"] == 2
    assert s10_after["places_left"] == 0

    # 6. Try to book a 3rd person into the full slot -> fails with "slot_full"
    # Create a 3rd citizen
    reg3_resp = client.post(
        "/auth/register",
        json={
            "email": "third@example.org",
            "password": "password123",
            "full_name": "Third Citizen",
        },
    )
    assert reg3_resp.status_code == 201
    token3 = client.post(
        "/auth/login",
        json={"email": "third@example.org", "password": "password123"},
    ).json()["access_token"]
    headers3 = {"Authorization": f"Bearer {token3}"}

    book3 = client.post(
        "/appointments",
        headers=headers3,
        json={"office_code": "KTM", "appointment_date": day_str, "slot_start": "10:00"},
    )
    assert book3.status_code == 400
    assert book3.json()["error"]["code"] == "slot_full"
    assert book3.json()["error"]["message"] == "This slot is fully booked"

    # 7. Citizen 1 cancels appointment -> frees the slot
    cancel_resp = client.post(f"/appointments/{appt1_id}/cancel", headers=cit_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # 8. Check availability -> places_left should be restored to 1
    avail_freed = client.get(f"/offices/KTM/availability?day={day_str}")
    s10_freed = next(s for s in avail_freed.json()["slots"] if s["slot_start"] == "10:00")
    assert s10_freed["places_left"] == 1

    # 9. Cancel already cancelled appointment -> fails
    cancel_again = client.post(f"/appointments/{appt1_id}/cancel", headers=cit_headers)
    assert cancel_again.status_code == 400
    assert cancel_again.json()["error"]["code"] == "already_cancelled"


def test_list_citizen_appointments(client, seed_data):
    citizen = seed_data["citizen"]
    cit_headers = auth_header_for_user(citizen)

    target_date = next_workday(date.today() + timedelta(days=2))
    client.post(
        "/appointments",
        headers=cit_headers,
        json={
            "office_code": "KTM",
            "appointment_date": target_date.isoformat(),
            "slot_start": "14:00",
        },
    )

    list_resp = client.get("/appointments", headers=cit_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["slot_start"] == "14:00"
