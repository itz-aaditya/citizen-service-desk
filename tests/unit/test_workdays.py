from datetime import date, datetime, timezone

import pytest

from app.services.workdays import (
    add_working_days,
    add_working_seconds,
    calculate_working_seconds,
    is_workday,
    next_workday,
)


def test_is_workday():
    # 2026-10-18 was Sunday (weekday 6) -> Workday!
    assert is_workday(date(2026, 10, 18)) is True
    # 2026-10-19 is Monday (weekday 0) -> Workday!
    assert is_workday(date(2026, 10, 19)) is True
    # 2026-10-23 is Friday (weekday 4) -> Workday!
    assert is_workday(date(2026, 10, 23)) is True
    # 2026-10-24 is Saturday (weekday 5) -> Weekend / Non-working!
    assert is_workday(date(2026, 10, 24)) is False


def test_next_workday():
    # Friday -> returns Friday
    assert next_workday(date(2026, 10, 23)) == date(2026, 10, 23)
    # Saturday -> returns Sunday
    assert next_workday(date(2026, 10, 24)) == date(2026, 10, 25)


def test_add_working_days():
    # Friday 2026-10-23 + 1 working day -> Sunday 2026-10-25 (skips Saturday)
    start = datetime(2026, 10, 23, 10, 0, tzinfo=timezone.utc)
    res = add_working_days(start, 1)
    assert res == datetime(2026, 10, 25, 10, 0, tzinfo=timezone.utc)

    # Friday + 2 working days -> Monday 2026-10-26
    res2 = add_working_days(start, 2)
    assert res2 == datetime(2026, 10, 26, 10, 0, tzinfo=timezone.utc)

    # Zero days
    assert add_working_days(start, 0) == start

    # Negative days raises ValueError
    with pytest.raises(ValueError):
        add_working_days(start, -1)


def test_calculate_working_seconds():
    # Friday 10:00 to Sunday 10:00:
    # Friday 10:00 to end of Friday (23:59:59 + 1s) = 14 hours = 50400 seconds
    # Saturday = 0 seconds
    # Sunday 00:00 to 10:00 = 10 hours = 36000 seconds
    # Total = 86400 seconds (24 working hours)
    start = datetime(2026, 10, 23, 10, 0, tzinfo=timezone.utc)
    end = datetime(2026, 10, 25, 10, 0, tzinfo=timezone.utc)
    secs = calculate_working_seconds(start, end)
    assert secs == 86400

    # If start >= end -> 0
    assert calculate_working_seconds(end, start) == 0


def test_add_working_seconds():
    # Friday 20:00 + 6 hours working time:
    # 4 hours left in Friday (until 00:00 Saturday)
    # Skips Saturday entirely
    # 2 hours into Sunday -> Sunday 02:00
    start = datetime(2026, 10, 23, 20, 0, tzinfo=timezone.utc)
    result = add_working_seconds(start, 6 * 3600)
    assert result == datetime(2026, 10, 25, 2, 0, tzinfo=timezone.utc)

    # 0 or negative seconds returns start
    assert add_working_seconds(start, 0) == start
