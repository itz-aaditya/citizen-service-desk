from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models import DelayAlert, ServiceRequest, User
from app.schemas import DelayReportItem
from app.services.sla import get_delay_levels_for_request
from app.services.workflow import STATUS_NEEDS_INFO, TERMINAL_STATUSES


class AlertServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def scan_and_create_alerts(
    db: Session,
    now_dt: Optional[datetime] = None,
) -> Tuple[int, int, List[DelayAlert]]:
    """Scan all active requests and generate alerts for DUE_SOON, OVERDUE, and ESCALATED.

    Idempotent: never generates duplicate alerts for the same (request, level).
    """
    if now_dt is None:
        now_dt = datetime.now(timezone.utc)

    # Fetch non-terminal requests
    active_requests = (
        db.query(ServiceRequest).filter(~ServiceRequest.status.in_(TERMINAL_STATUSES)).all()
    )

    scanned_count = len(active_requests)
    new_alerts_list: List[DelayAlert] = []

    for req in active_requests:
        is_paused = req.status == STATUS_NEEDS_INFO
        levels = get_delay_levels_for_request(
            due_date=req.due_date,
            now_dt=now_dt,
            is_paused=is_paused,
        )

        for level in levels:
            # Check if alert already exists
            existing = (
                db.query(DelayAlert)
                .filter(
                    DelayAlert.request_id == req.id,
                    DelayAlert.level == level,
                )
                .first()
            )
            if not existing:
                alert = DelayAlert(
                    request_id=req.id,
                    level=level,
                    acknowledged=False,
                    created_at=now_dt,
                )
                db.add(alert)
                new_alerts_list.append(alert)

    if new_alerts_list:
        db.commit()
        for a in new_alerts_list:
            db.refresh(a)

    return scanned_count, len(new_alerts_list), new_alerts_list


def list_alerts(
    db: Session,
    acknowledged: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[DelayAlert]:
    query = db.query(DelayAlert)
    if acknowledged is not None:
        query = query.filter(DelayAlert.acknowledged == acknowledged)
    return query.order_by(DelayAlert.created_at.desc()).offset(offset).limit(limit).all()


def acknowledge_alert(
    db: Session,
    alert_id: int,
    supervisor: User,
) -> DelayAlert:
    alert = db.query(DelayAlert).filter(DelayAlert.id == alert_id).first()
    if not alert:
        raise AlertServiceError("alert_not_found", "Alert not found", status_code=404)

    now = datetime.now(timezone.utc)
    alert.acknowledged = True
    alert.acknowledged_at = now
    alert.acknowledged_by_id = supervisor.id

    db.commit()
    db.refresh(alert)
    return alert


def get_delay_report(
    db: Session,
    now_dt: Optional[datetime] = None,
) -> List[DelayReportItem]:
    if now_dt is None:
        now_dt = datetime.now(timezone.utc)

    active_requests = (
        db.query(ServiceRequest).filter(~ServiceRequest.status.in_(TERMINAL_STATUSES)).all()
    )

    report_items: List[DelayReportItem] = []

    for req in active_requests:
        is_paused = req.status == STATUS_NEEDS_INFO
        levels = get_delay_levels_for_request(
            due_date=req.due_date,
            now_dt=now_dt,
            is_paused=is_paused,
        )
        if not levels:
            continue

        # Highest level priority: ESCALATED > OVERDUE > DUE_SOON
        top_level = "DUE_SOON"
        if "ESCALATED" in levels:
            top_level = "ESCALATED"
        elif "OVERDUE" in levels:
            top_level = "OVERDUE"

        # Calculate delay hours
        req_due = req.due_date
        if req_due.tzinfo is None and now_dt.tzinfo is not None:
            req_due = req_due.replace(tzinfo=timezone.utc)
        elif now_dt.tzinfo is None and req_due.tzinfo is not None:
            now_dt = now_dt.replace(tzinfo=timezone.utc)

        diff = (now_dt - req_due).total_seconds()
        delay_hours = round(max(0.0, diff / 3600.0), 2)

        report_items.append(
            DelayReportItem(
                request_id=req.id,
                reference=req.reference,
                service_name=req.service.name if req.service else "",
                status=req.status,
                due_date=req.due_date,
                level=top_level,
                delay_hours=delay_hours,
            )
        )

    # Sort most delayed first
    report_items.sort(key=lambda x: x.delay_hours, reverse=True)
    return report_items
