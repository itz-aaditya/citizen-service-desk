from datetime import date, datetime, time, timedelta
from typing import Union


def is_workday(d: Union[date, datetime]) -> bool:
    """Return True if day is Sunday through Friday (weekday != 5 in Python)."""
    # In Python: Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6
    return d.weekday() != 5


def next_workday(d: Union[date, datetime]) -> date:
    """Return the next workday on or after d."""
    current = d if isinstance(d, date) and not isinstance(d, datetime) else d.date()
    while not is_workday(current):
        current += timedelta(days=1)
    return current


def add_working_days(start_dt: datetime, days: int) -> datetime:
    """Add a number of working days (Sunday-Friday) to a datetime, preserving time of day.

    If days == 0, returns start_dt.
    """
    if days < 0:
        raise ValueError("days must be non-negative")

    current = start_dt
    remaining_days = days

    while remaining_days > 0:
        current += timedelta(days=1)
        if is_workday(current):
            remaining_days -= 1

    return current


def calculate_working_seconds(start_dt: datetime, end_dt: datetime) -> int:
    """Calculate the number of working seconds between start_dt and end_dt.

    Saturdays are excluded completely.
    """
    if start_dt >= end_dt:
        return 0

    total_seconds = 0
    current_date = start_dt.date()
    end_date = end_dt.date()

    while current_date <= end_date:
        if is_workday(current_date):
            day_start = datetime.combine(current_date, time.min, tzinfo=start_dt.tzinfo)
            next_midnight = datetime.combine(
                current_date + timedelta(days=1), time.min, tzinfo=start_dt.tzinfo
            )

            window_start = max(start_dt, day_start)
            window_end = min(end_dt, next_midnight)

            if window_end > window_start:
                total_seconds += int((window_end - window_start).total_seconds())

        current_date += timedelta(days=1)

    return total_seconds


def add_working_seconds(start_dt: datetime, seconds: int) -> datetime:
    """Advance a datetime by a specific number of working seconds, skipping Saturdays."""
    if seconds <= 0:
        return start_dt

    current = start_dt
    remaining_seconds = seconds

    while remaining_seconds > 0:
        if not is_workday(current):
            next_day = current.date() + timedelta(days=1)
            current = datetime.combine(next_day, time.min, tzinfo=current.tzinfo)
            continue

        next_midnight = datetime.combine(
            current.date() + timedelta(days=1), time.min, tzinfo=current.tzinfo
        )
        seconds_left_in_day = int((next_midnight - current).total_seconds())

        if remaining_seconds <= seconds_left_in_day:
            return current + timedelta(seconds=remaining_seconds)
        else:
            remaining_seconds -= seconds_left_in_day
            current = next_midnight

    return current
