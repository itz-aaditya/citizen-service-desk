from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import RequestEvent, Service, ServiceRequest, User
from app.services.sla import calculate_initial_due_date, resume_sla_clock
from app.services.workflow import (
    ROLE_CITIZEN,
    ROLE_OFFICER,
    STATUS_NEEDS_INFO,
    STATUS_SUBMITTED,
    STATUS_UNDER_REVIEW,
    WorkflowError,
    validate_transition,
)


class RequestServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def generate_reference(db: Session, now_dt: Optional[datetime] = None) -> str:
    """Generate reference number in format SR-YYYY-NNNNNN."""
    if now_dt is None:
        now_dt = datetime.now(timezone.utc)
    year = now_dt.year
    prefix = f"SR-{year}-"

    # Count existing requests for this year
    count = (
        db.query(func.count(ServiceRequest.id))
        .filter(ServiceRequest.reference.like(f"{prefix}%"))
        .scalar()
        or 0
    )
    next_num = count + 1
    return f"{prefix}{next_num:06d}"


def create_service_request(
    db: Session,
    citizen: User,
    service_code: str,
    notes: Optional[str] = None,
) -> ServiceRequest:
    service = (
        db.query(Service).filter(Service.code == service_code, Service.is_active.is_(True)).first()
    )
    if not service:
        raise RequestServiceError(
            "service_not_found", f"Active service '{service_code}' not found", status_code=404
        )

    now = datetime.now(timezone.utc)
    reference = generate_reference(db, now)
    due_date = calculate_initial_due_date(now, service.sla_working_days)

    req = ServiceRequest(
        reference=reference,
        citizen_id=citizen.id,
        service_id=service.id,
        status=STATUS_SUBMITTED,
        submitted_at=now,
        due_date=due_date,
        notes=notes,
    )
    db.add(req)
    db.flush()

    # Initial audit event
    event = RequestEvent(
        request_id=req.id,
        actor_id=citizen.id,
        from_status="NONE",
        to_status=STATUS_SUBMITTED,
        reason="Initial submission",
        created_at=now,
    )
    db.add(event)
    db.commit()
    db.refresh(req)
    return req


def list_service_requests(
    db: Session,
    user: User,
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[ServiceRequest]:
    query = db.query(ServiceRequest)

    if user.role == ROLE_CITIZEN:
        query = query.filter(ServiceRequest.citizen_id == user.id)
    elif user.role == ROLE_OFFICER:
        query = query.filter(ServiceRequest.assigned_officer_id == user.id)
    # Supervisor sees everything

    if status:
        query = query.filter(ServiceRequest.status == status)

    if service_type:
        query = query.join(Service).filter(Service.code == service_type)

    return query.order_by(ServiceRequest.submitted_at.desc()).offset(offset).limit(limit).all()


def get_service_request_with_access(
    db: Session,
    request_id: int,
    user: User,
) -> ServiceRequest:
    """Retrieve a service request.

    Returns 404 if request does not exist OR if user lacks permission
    (prevents ID enumeration / probing attacks).
    """
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        raise RequestServiceError("not_found", "Service request not found", status_code=404)

    if user.role == ROLE_CITIZEN and req.citizen_id != user.id:
        raise RequestServiceError("not_found", "Service request not found", status_code=404)

    if user.role == ROLE_OFFICER and req.assigned_officer_id != user.id:
        raise RequestServiceError("not_found", "Service request not found", status_code=404)

    return req


def assign_request_officer(
    db: Session,
    request_id: int,
    officer_id: int,
    supervisor: User,
) -> ServiceRequest:
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req:
        raise RequestServiceError("not_found", "Service request not found", status_code=404)

    officer = db.query(User).filter(User.id == officer_id).first()
    if not officer or officer.role != ROLE_OFFICER:
        raise RequestServiceError(
            "invalid_officer", "Target user is not an officer", status_code=400
        )

    req.assigned_officer_id = officer.id
    now = datetime.now(timezone.utc)

    event = RequestEvent(
        request_id=req.id,
        actor_id=supervisor.id,
        from_status=req.status,
        to_status=req.status,
        reason=f"Assigned to officer {officer.full_name} ({officer.email})",
        created_at=now,
    )
    db.add(event)

    from app.services.notification_service import create_notification

    create_notification(
        db=db,
        user_id=officer.id,
        title="New Casework Assigned",
        message=f"You have been assigned to service request {req.reference}.",
        link=f"/requests/{req.id}",
    )

    db.commit()
    db.refresh(req)
    return req


def transition_service_request(
    db: Session,
    request_id: int,
    to_status: str,
    actor: User,
    reason: Optional[str] = None,
) -> ServiceRequest:
    req = get_service_request_with_access(db, request_id, actor)

    is_owner = req.citizen_id == actor.id

    try:
        validate_transition(
            current_status=req.status,
            target_status=to_status,
            caller_role=actor.role,
            is_owner=is_owner,
        )
    except WorkflowError as e:
        status_code = 403 if e.code == "unauthorized_transition" else 400
        raise RequestServiceError(e.code, e.message, status_code=status_code)

    now = datetime.now(timezone.utc)
    old_status = req.status

    # SLA pause/resume handling
    if to_status == STATUS_NEEDS_INFO:
        req.paused_at = now
    elif old_status == STATUS_NEEDS_INFO and to_status == STATUS_UNDER_REVIEW:
        if req.paused_at:
            new_due_date, elapsed_sec = resume_sla_clock(
                current_due_date=req.due_date,
                paused_at=req.paused_at,
                resumed_at=now,
            )
            req.due_date = new_due_date
            req.total_paused_seconds += elapsed_sec
            req.paused_at = None

    req.status = to_status
    req.updated_at = now

    event = RequestEvent(
        request_id=req.id,
        actor_id=actor.id,
        from_status=old_status,
        to_status=to_status,
        reason=reason,
        created_at=now,
    )
    db.add(event)

    from app.services.notification_service import create_notification
    from app.services.workflow import STATUS_APPROVED, STATUS_COMPLETED

    if to_status == STATUS_NEEDS_INFO:
        create_notification(
            db=db,
            user_id=req.citizen_id,
            title="Action Required: Information Requested",
            message=f"Counter officer requested info on {req.reference}: {reason or 'Please review'}",
            link=f"/requests/{req.id}",
        )
    elif to_status == STATUS_APPROVED:
        create_notification(
            db=db,
            user_id=req.citizen_id,
            title="Application Approved",
            message=f"Great news! Your request {req.reference} was approved.",
            link=f"/requests/{req.id}",
        )
    elif to_status == STATUS_COMPLETED:
        create_notification(
            db=db,
            user_id=req.citizen_id,
            title="Application Completed",
            message=f"Your request {req.reference} is completed. You can now download your digital certificate.",
            link=f"/requests/{req.id}",
        )

    db.commit()
    db.refresh(req)
    return req
