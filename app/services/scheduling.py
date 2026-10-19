from datetime import date, datetime, timedelta, timezone
from typing import List, Tuple

from app.services.workdays import is_workday

# Slot configuration: 10:00 to 17:00 in 30-min increments
SLOT_STARTS = [
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
]

MAX_DAYS_AHEAD = 30


class SchedulingError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def get_slot_end(slot_start: str) -> str:
    """Compute the 30-minute end time for a given slot start."""
    hours, mins = map(int, slot_start.split(":"))
    total_mins = hours * 60 + mins + 30
    end_hours = total_mins // 60
    end_mins = total_mins % 60
    return f"{end_hours:02d}:{end_mins:02d}"


def get_all_slots() -> List[Tuple[str, str]]:
    """Return all valid (start, end) time slot tuples."""
    return [(start, get_slot_end(start)) for start in SLOT_STARTS]


def validate_booking_date_and_slot(
    appointment_date: date,
    slot_start: str,
    reference_date: date | None = None,
) -> str:
    """Validate that the appointment date is a working day, within the 30-day window,

    and that slot_start is valid. Returns slot_end.
    """
    if reference_date is None:
        reference_date = datetime.now(timezone.utc).date()

    if slot_start not in SLOT_STARTS:
        raise SchedulingError(
            "invalid_slot",
            f"Slot start '{slot_start}' is not valid. Must be one of: {', '.join(SLOT_STARTS)}",
        )

    if appointment_date < reference_date:
        raise SchedulingError("past_date", "Cannot book appointments in the past")

    max_allowed_date = reference_date + timedelta(days=MAX_DAYS_AHEAD)
    if appointment_date > max_allowed_date:
        raise SchedulingError(
            "outside_booking_window",
            f"Cannot book appointments more than {MAX_DAYS_AHEAD} days ahead",
        )

    if not is_workday(appointment_date):
        raise SchedulingError(
            "non_working_day",
            "Appointments are only available Sunday through Friday",
        )

    return get_slot_end(slot_start)
