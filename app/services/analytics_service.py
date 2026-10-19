from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from app.models import Service, ServiceRequest, User
from app.schemas import ExecutiveAnalyticsResponse, OfficerMetric, ServiceMetric
from app.services.sla import get_delay_levels_for_request
from app.services.workflow import ROLE_OFFICER, STATUS_COMPLETED, TERMINAL_STATUSES


def compute_executive_analytics(
    db: Session,
    now_dt: datetime | None = None,
) -> ExecutiveAnalyticsResponse:
    if now_dt is None:
        now_dt = datetime.now(timezone.utc)

    all_requests: List[ServiceRequest] = db.query(ServiceRequest).all()
    total_count = len(all_requests)
    completed_requests = [r for r in all_requests if r.status == STATUS_COMPLETED]
    pending_requests = [r for r in all_requests if r.status not in TERMINAL_STATUSES]

    # Calculate overdue requests among active requests
    overdue_count = 0
    for req in pending_requests:
        is_paused = req.status == "NEEDS_INFO"
        levels = get_delay_levels_for_request(req.due_date, now_dt, is_paused=is_paused)
        if "OVERDUE" in levels or "ESCALATED" in levels:
            overdue_count += 1

    # SLA Compliance rate among completed requests
    completed_on_time = 0
    for req in completed_requests:
        # Check if completed on or before due date
        completion_time = req.updated_at
        due_time = req.due_date
        if completion_time.tzinfo is None and due_time.tzinfo is not None:
            completion_time = completion_time.replace(tzinfo=timezone.utc)
        elif due_time.tzinfo is None and completion_time.tzinfo is not None:
            due_time = due_time.replace(tzinfo=timezone.utc)

        if completion_time <= due_time:
            completed_on_time += 1

    compliance_rate = 100.0
    if len(completed_requests) > 0:
        compliance_rate = round((completed_on_time / len(completed_requests)) * 100.0, 1)

    # Per-service breakdown
    services = db.query(Service).filter(Service.is_active.is_(True)).all()
    service_metrics: List[ServiceMetric] = []
    for svc in services:
        svc_reqs = [r for r in all_requests if r.service_id == svc.id]
        svc_completed = [r for r in svc_reqs if r.status == STATUS_COMPLETED]

        avg_hours = 0.0
        if svc_completed:
            durations = []
            for r in svc_completed:
                diff = (r.updated_at - r.submitted_at).total_seconds()
                durations.append(max(0.0, diff / 3600.0))
            avg_hours = round(sum(durations) / len(durations), 1)

        service_metrics.append(
            ServiceMetric(
                service_code=svc.code,
                service_name=svc.name,
                total_requests=len(svc_reqs),
                completed_requests=len(svc_completed),
                avg_completion_hours=avg_hours,
            )
        )

    # Per-officer workload & performance
    officers = db.query(User).filter(User.role == ROLE_OFFICER).all()
    officer_metrics: List[OfficerMetric] = []
    for off in officers:
        off_reqs = [r for r in all_requests if r.assigned_officer_id == off.id]
        off_completed = [r for r in off_reqs if r.status == STATUS_COMPLETED]
        off_active = [r for r in off_reqs if r.status not in TERMINAL_STATUSES]

        off_overdue = 0
        for r in off_active:
            levels = get_delay_levels_for_request(
                r.due_date, now_dt, is_paused=(r.status == "NEEDS_INFO")
            )
            if "OVERDUE" in levels or "ESCALATED" in levels:
                off_overdue += 1

        officer_metrics.append(
            OfficerMetric(
                officer_id=off.id,
                officer_name=off.full_name,
                email=off.email,
                assigned_requests=len(off_reqs),
                completed_requests=len(off_completed),
                overdue_requests=off_overdue,
            )
        )

    return ExecutiveAnalyticsResponse(
        total_requests=total_count,
        completed_requests=len(completed_requests),
        pending_requests=len(pending_requests),
        overdue_requests=overdue_count,
        sla_compliance_rate=compliance_rate,
        services=service_metrics,
        officers=officer_metrics,
    )
