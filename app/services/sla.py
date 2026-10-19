from datetime import datetime, timezone
from typing import List, Optional

from app.services.workdays import add_working_days, add_working_seconds, calculate_working_seconds

# Thresholds for alert levels
DUE_SOON_WINDOW_SECONDS = 24 * 3600  # Due within 24 hours
ESCALATION_OVERDUE_SECONDS = 48 * 3600  # Overdue by more than 48 hours


def calculate_initial_due_date(submitted_at: datetime, sla_working_days: int) -> datetime:
    """Compute the initial SLA due date based on working days (Sunday-Friday)."""
    return add_working_days(submitted_at, sla_working_days)


def pause_sla_clock(paused_at: Optional[datetime] = None) -> datetime:
    """Return the timestamp when the SLA clock is paused."""
    return paused_at or datetime.now(timezone.utc)


def resume_sla_clock(
    current_due_date: datetime,
    paused_at: datetime,
    resumed_at: Optional[datetime] = None,
) -> tuple[datetime, int]:
    """Resume the SLA clock.

    Calculates the working seconds elapsed while paused, and moves the due date
    forward by that amount.
    Returns: (new_due_date, elapsed_working_seconds)
    """
    if resumed_at is None:
        resumed_at = datetime.now(timezone.utc)

    # Ensure tz-aware comparison
    if paused_at.tzinfo is None and resumed_at.tzinfo is not None:
        paused_at = paused_at.replace(tzinfo=timezone.utc)
    if resumed_at.tzinfo is None and paused_at.tzinfo is not None:
        resumed_at = resumed_at.replace(tzinfo=timezone.utc)

    elapsed_working_sec = calculate_working_seconds(paused_at, resumed_at)
    new_due_date = add_working_seconds(current_due_date, elapsed_working_sec)

    return new_due_date, elapsed_working_sec


def get_delay_levels_for_request(
    due_date: datetime,
    now_dt: Optional[datetime] = None,
    is_paused: bool = False,
) -> List[str]:
    """Determine all delay levels that currently apply to an open request.

    - DUE_SOON: if within DUE_SOON_WINDOW_SECONDS of due date and not yet overdue.
    - OVERDUE: if now_dt >= due_date.
    - ESCALATED: if now_dt >= due_date + ESCALATION_OVERDUE_SECONDS.

    Returns a list of levels that have been reached.
    For example, if overdue by 50 hours, both 'OVERDUE' and 'ESCALATED' have occurred.
    """
    if is_paused:
        # Paused files do not accumulate active delay against the department
        return []

    if now_dt is None:
        now_dt = datetime.now(timezone.utc)

    # Normalize timezones
    if due_date.tzinfo is None and now_dt.tzinfo is not None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    elif now_dt.tzinfo is None and due_date.tzinfo is not None:
        now_dt = now_dt.replace(tzinfo=timezone.utc)

    levels: List[str] = []

    diff_seconds = (now_dt - due_date).total_seconds()

    if diff_seconds >= ESCALATION_OVERDUE_SECONDS:
        levels.extend(["OVERDUE", "ESCALATED"])
    elif diff_seconds >= 0:
        levels.append("OVERDUE")
    elif -DUE_SOON_WINDOW_SECONDS <= diff_seconds < 0:
        levels.append("DUE_SOON")

    return levels
