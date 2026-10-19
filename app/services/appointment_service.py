from datetime import date, datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from app.models import Appointment, Office, User
from app.schemas import OfficeAvailabilityResponse, SlotAvailabilityResponse
from app.services.scheduling import (
    SchedulingError,
    get_all_slots,
    validate_booking_date_and_slot,
)


def get_office_availability(
    db: Session,
    office_code: str,
    day: date,
) -> OfficeAvailabilityResponse:
    office = db.query(Office).filter(Office.code == office_code, Office.is_active.is_(True)).first()
    if not office:
        raise SchedulingError("office_not_found", f"Office '{office_code}' not found")

    # Fetch all booked appointments for this office on the requested day
    booked_counts: dict[str, int] = {}
    appointments = (
        db.query(Appointment.slot_start)
        .filter(
            Appointment.office_id == office.id,
            Appointment.appointment_date == day,
            Appointment.status == "BOOKED",
        )
        .all()
    )
    for (start_slot,) in appointments:
        booked_counts[start_slot] = booked_counts.get(start_slot, 0) + 1

    slot_responses: List[SlotAvailabilityResponse] = []
    for slot_start, slot_end in get_all_slots():
        booked = booked_counts.get(slot_start, 0)
        places_left = max(0, office.capacity_per_slot - booked)
        slot_responses.append(
            SlotAvailabilityResponse(
                slot_start=slot_start,
                slot_end=slot_end,
                capacity=office.capacity_per_slot,
                booked=booked,
                places_left=places_left,
            )
        )

    return OfficeAvailabilityResponse(
        office_code=office.code,
        date=day,
        slots=slot_responses,
    )


def book_appointment(
    db: Session,
    citizen: User,
    office_code: str,
    appointment_date: date,
    slot_start: str,
) -> Appointment:
    office = db.query(Office).filter(Office.code == office_code, Office.is_active.is_(True)).first()
    if not office:
        raise SchedulingError("office_not_found", f"Office '{office_code}' not found")

    slot_end = validate_booking_date_and_slot(appointment_date, slot_start)

    # Prevent double-booking for the citizen on the same day
    existing_booking = (
        db.query(Appointment)
        .filter(
            Appointment.citizen_id == citizen.id,
            Appointment.appointment_date == appointment_date,
            Appointment.status == "BOOKED",
        )
        .first()
    )
    if existing_booking:
        raise SchedulingError(
            "double_booking", "You already have an active appointment on this date"
        )

    # Check office capacity for this slot
    current_booked = (
        db.query(Appointment)
        .filter(
            Appointment.office_id == office.id,
            Appointment.appointment_date == appointment_date,
            Appointment.slot_start == slot_start,
            Appointment.status == "BOOKED",
        )
        .count()
    )
    if current_booked >= office.capacity_per_slot:
        raise SchedulingError("slot_full", "This slot is fully booked")

    appointment = Appointment(
        citizen_id=citizen.id,
        office_id=office.id,
        appointment_date=appointment_date,
        slot_start=slot_start,
        slot_end=slot_end,
        status="BOOKED",
        created_at=datetime.now(timezone.utc),
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


def cancel_appointment(
    db: Session,
    appointment_id: int,
    citizen: User,
) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment or appointment.citizen_id != citizen.id:
        raise SchedulingError("not_found", "Appointment not found")

    if appointment.status == "CANCELLED":
        raise SchedulingError("already_cancelled", "Appointment is already cancelled")

    appointment.status = "CANCELLED"
    db.commit()
    db.refresh(appointment)
    return appointment


def list_citizen_appointments(db: Session, citizen: User) -> List[Appointment]:
    return (
        db.query(Appointment)
        .filter(Appointment.citizen_id == citizen.id)
        .order_by(Appointment.appointment_date.asc(), Appointment.slot_start.asc())
        .all()
    )
