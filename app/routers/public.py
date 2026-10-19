from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ServiceRequest
from app.schemas import OfficeAvailabilityResponse, PublicTrackResponse
from app.services.appointment_service import get_office_availability
from app.services.scheduling import SchedulingError

router = APIRouter(tags=["Public"])


@router.get("/track/{reference}", response_model=PublicTrackResponse)
def track_reference(reference: str, db: Session = Depends(get_db)):
    req = db.query(ServiceRequest).filter(ServiceRequest.reference == reference).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": f"Reference '{reference}' not found"},
        )

    return PublicTrackResponse(
        reference=req.reference,
        service_name=req.service.name if req.service else "",
        status=req.status,
        submitted_at=req.submitted_at,
        due_date=req.due_date,
    )


@router.get("/offices/{code}/availability", response_model=OfficeAvailabilityResponse)
def get_availability(
    code: str,
    day: date = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    try:
        return get_office_availability(db=db, office_code=code, day=day)
    except SchedulingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message},
        )
