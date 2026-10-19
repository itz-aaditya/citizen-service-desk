from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment, User
from app.schemas import AppointmentResponse, CreateAppointmentRequest
from app.security import require_role
from app.services.appointment_service import (
    book_appointment,
    cancel_appointment,
    list_citizen_appointments,
)
from app.services.scheduling import SchedulingError
from app.services.workflow import ROLE_CITIZEN

router = APIRouter(tags=["Appointments"])


def _to_response(appt: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=appt.id,
        citizen_id=appt.citizen_id,
        office_code=appt.office.code if appt.office else "",
        office_name=appt.office.name if appt.office else "",
        appointment_date=appt.appointment_date,
        slot_start=appt.slot_start,
        slot_end=appt.slot_end,
        status=appt.status,
        created_at=appt.created_at,
    )


@router.post(
    "/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED
)
def create_appointment(
    body: CreateAppointmentRequest,
    current_user: User = Depends(require_role(ROLE_CITIZEN)),
    db: Session = Depends(get_db),
):
    try:
        appt = book_appointment(
            db=db,
            citizen=current_user,
            office_code=body.office_code,
            appointment_date=body.appointment_date,
            slot_start=body.slot_start,
        )
        return _to_response(appt)
    except SchedulingError as e:
        status_code = (
            status.HTTP_404_NOT_FOUND
            if e.code == "office_not_found"
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.get("/appointments", response_model=List[AppointmentResponse])
def get_my_appointments(
    current_user: User = Depends(require_role(ROLE_CITIZEN)),
    db: Session = Depends(get_db),
):
    appts = list_citizen_appointments(db=db, citizen=current_user)
    return [_to_response(a) for a in appts]


@router.post("/appointments/{id}/cancel", response_model=AppointmentResponse)
def cancel_my_appointment(
    id: int,
    current_user: User = Depends(require_role(ROLE_CITIZEN)),
    db: Session = Depends(get_db),
):
    try:
        appt = cancel_appointment(db=db, appointment_id=id, citizen=current_user)
        return _to_response(appt)
    except SchedulingError as e:
        status_code = (
            status.HTTP_404_NOT_FOUND if e.code == "not_found" else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=status_code,
            detail={"code": e.code, "message": e.message},
        )
