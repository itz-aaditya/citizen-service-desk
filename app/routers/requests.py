from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RequestEvent, ServiceRequest, User
from app.schemas import (
    AssignOfficerRequest,
    CreateServiceRequest,
    RequestEventResponse,
    ServiceRequestDetail,
    ServiceRequestListItem,
    TransitionRequest,
)
from app.security import get_current_user, require_role
from app.services.request_service import (
    RequestServiceError,
    assign_request_officer,
    create_service_request,
    get_service_request_with_access,
    list_service_requests,
    transition_service_request,
)
from app.services.workflow import ROLE_CITIZEN, ROLE_SUPERVISOR

router = APIRouter(tags=["Requests"])


def _to_detail(req: ServiceRequest) -> ServiceRequestDetail:
    return ServiceRequestDetail(
        id=req.id,
        reference=req.reference,
        service_code=req.service.code if req.service else "",
        service_name=req.service.name if req.service else "",
        status=req.status,
        submitted_at=req.submitted_at,
        due_date=req.due_date,
        paused_at=req.paused_at,
        total_paused_seconds=req.total_paused_seconds,
        notes=req.notes,
        citizen_id=req.citizen_id,
        citizen_name=req.citizen.full_name if req.citizen else "",
        assigned_officer_id=req.assigned_officer_id,
        assigned_officer_name=req.assigned_officer.full_name if req.assigned_officer else None,
    )


def _to_list_item(req: ServiceRequest) -> ServiceRequestListItem:
    return ServiceRequestListItem(
        id=req.id,
        reference=req.reference,
        service_code=req.service.code if req.service else "",
        service_name=req.service.name if req.service else "",
        status=req.status,
        submitted_at=req.submitted_at,
        due_date=req.due_date,
        assigned_officer_id=req.assigned_officer_id,
    )


def _to_event(event: RequestEvent) -> RequestEventResponse:
    return RequestEventResponse(
        id=event.id,
        request_id=event.request_id,
        actor_id=event.actor_id,
        actor_name=event.actor.full_name if event.actor else "System",
        from_status=event.from_status,
        to_status=event.to_status,
        reason=event.reason,
        created_at=event.created_at,
    )


@router.post("/requests", response_model=ServiceRequestDetail, status_code=status.HTTP_201_CREATED)
def submit_request(
    request_data: CreateServiceRequest,
    current_user: User = Depends(require_role(ROLE_CITIZEN)),
    db: Session = Depends(get_db),
):
    try:
        req = create_service_request(
            db=db,
            citizen=current_user,
            service_code=request_data.service_code,
            notes=request_data.notes,
        )
        return _to_detail(req)
    except RequestServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.get("/requests", response_model=List[ServiceRequestListItem])
def get_requests(
    status: Optional[str] = Query(None, description="Filter by request status"),
    service_type: Optional[str] = Query(None, description="Filter by service code"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requests = list_service_requests(
        db=db,
        user=current_user,
        status=status,
        service_type=service_type,
        limit=limit,
        offset=offset,
    )
    return [_to_list_item(r) for r in requests]


@router.get("/requests/{id}", response_model=ServiceRequestDetail)
def get_request_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        req = get_service_request_with_access(db, id, current_user)
        return _to_detail(req)
    except RequestServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.get("/requests/{id}/events", response_model=List[RequestEventResponse])
def get_request_events(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        req = get_service_request_with_access(db, id, current_user)
        events = (
            db.query(RequestEvent)
            .filter(RequestEvent.request_id == req.id)
            .order_by(RequestEvent.created_at.asc())
            .all()
        )
        return [_to_event(e) for e in events]
    except RequestServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.post("/requests/{id}/assign", response_model=ServiceRequestDetail)
def assign_officer(
    id: int,
    body: AssignOfficerRequest,
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    try:
        req = assign_request_officer(
            db=db,
            request_id=id,
            officer_id=body.officer_id,
            supervisor=current_user,
        )
        return _to_detail(req)
    except RequestServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.post("/requests/{id}/transition", response_model=ServiceRequestDetail)
def transition_request(
    id: int,
    body: TransitionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        req = transition_service_request(
            db=db,
            request_id=id,
            to_status=body.to_status,
            actor=current_user,
            reason=body.reason,
        )
        return _to_detail(req)
    except RequestServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )
