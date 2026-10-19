from datetime import datetime, timedelta, timezone

from app.services.sla import (
    calculate_initial_due_date,
    get_delay_levels_for_request,
    pause_sla_clock,
    resume_sla_clock,
)


def test_calculate_initial_due_date():
    # Sunday 2026-10-18 + 5 working days -> Friday 2026-10-23
    submitted = datetime(2026, 10, 18, 9, 30, tzinfo=timezone.utc)
    due = calculate_initial_due_date(submitted, 5)
    assert due == datetime(2026, 10, 23, 9, 30, tzinfo=timezone.utc)


def test_pause_and_resume_sla():
    now = datetime(2026, 10, 19, 10, 0, tzinfo=timezone.utc)
    initial_due = datetime(2026, 10, 25, 10, 0, tzinfo=timezone.utc)

    # Paused on Monday 10:00
    paused_at = pause_sla_clock(now)

    # Resumed on Wednesday 10:00 (2 full working days = 48 hours = 172800 sec)
    resumed_at = now + timedelta(days=2)
    new_due, elapsed_sec = resume_sla_clock(initial_due, paused_at, resumed_at)

    assert elapsed_sec == 172800
    # Initial due was Sunday 10:00. Adding 2 working days (Sunday + 2) -> Tuesday 10:00
    assert new_due == datetime(2026, 10, 27, 10, 0, tzinfo=timezone.utc)


def test_get_delay_levels_for_request():
    due = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)

    # Case 1: Well ahead of deadline (3 days before) -> No alerts
    now_ahead = due - timedelta(days=3)
    assert get_delay_levels_for_request(due, now_ahead) == []

    # Case 2: Within 24 hours of due date -> DUE_SOON
    now_due_soon = due - timedelta(hours=12)
    assert get_delay_levels_for_request(due, now_due_soon) == ["DUE_SOON"]

    # Case 3: 5 hours past due date -> OVERDUE
    now_overdue = due + timedelta(hours=5)
    assert get_delay_levels_for_request(due, now_overdue) == ["OVERDUE"]

    # Case 4: 50 hours past due date -> OVERDUE and ESCALATED
    now_escalated = due + timedelta(hours=50)
    assert get_delay_levels_for_request(due, now_escalated) == ["OVERDUE", "ESCALATED"]

    # Case 5: Request is paused -> no alerts regardless of date
    assert get_delay_levels_for_request(due, now_escalated, is_paused=True) == []
