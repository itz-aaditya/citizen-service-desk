from datetime import date, timedelta

import pytest

from app.services.scheduling import (
    MAX_DAYS_AHEAD,
    SchedulingError,
    get_all_slots,
    get_slot_end,
    validate_booking_date_and_slot,
)


def test_get_slot_end():
    assert get_slot_end("10:00") == "10:30"
    assert get_slot_end("11:30") == "12:00"
    assert get_slot_end("16:30") == "17:00"


def test_get_all_slots():
    slots = get_all_slots()
    assert len(slots) == 14
    assert slots[0] == ("10:00", "10:30")
    assert slots[-1] == ("16:30", "17:00")


def test_validate_booking_date_and_slot():
    ref = date(2026, 10, 19)  # Monday (workday)

    # Valid booking on Tuesday
    valid_date = date(2026, 10, 20)
    end = validate_booking_date_and_slot(valid_date, "10:30", reference_date=ref)
    assert end == "11:00"

    # Past date
    past_date = date(2026, 10, 18)
    with pytest.raises(SchedulingError) as exc:
        validate_booking_date_and_slot(past_date, "10:00", reference_date=ref)
    assert exc.value.code == "past_date"

    # Beyond 30 days
    far_future = ref + timedelta(days=MAX_DAYS_AHEAD + 1)
    with pytest.raises(SchedulingError) as exc:
        validate_booking_date_and_slot(far_future, "10:00", reference_date=ref)
    assert exc.value.code == "outside_booking_window"

    # Saturday (non-working day: 2026-10-24)
    sat = date(2026, 10, 24)
    with pytest.raises(SchedulingError) as exc:
        validate_booking_date_and_slot(sat, "10:00", reference_date=ref)
    assert exc.value.code == "non_working_day"

    # Invalid slot start
    with pytest.raises(SchedulingError) as exc:
        validate_booking_date_and_slot(valid_date, "09:00", reference_date=ref)
    assert exc.value.code == "invalid_slot"
