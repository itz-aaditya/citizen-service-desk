from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DelayAlert, User
from app.schemas import DelayAlertResponse, DelayReportItem, ScanAlertsResponse
from app.security import require_role
from app.services.alert_service import (
    AlertServiceError,
    acknowledge_alert,
    get_delay_report,
    list_alerts,
    scan_and_create_alerts,
)
from app.services.workflow import ROLE_SUPERVISOR

router = APIRouter(tags=["Alerts & Reports"])


def _to_alert_response(alert: DelayAlert) -> DelayAlertResponse:
    return DelayAlertResponse(
        id=alert.id,
        request_id=alert.request_id,
        reference=alert.request.reference if alert.request else "",
        level=alert.level,
        acknowledged=alert.acknowledged,
        acknowledged_at=alert.acknowledged_at,
        acknowledged_by_id=alert.acknowledged_by_id,
        created_at=alert.created_at,
    )


@router.get("/reports/delays", response_model=List[DelayReportItem])
def delay_report(
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    return get_delay_report(db=db)


@router.post("/alerts/scan", response_model=ScanAlertsResponse)
def trigger_alert_scan(
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    scanned_count, new_count, new_alerts = scan_and_create_alerts(db=db)
    return ScanAlertsResponse(
        scanned_requests=scanned_count,
        new_alerts=new_count,
        alerts=[_to_alert_response(a) for a in new_alerts],
    )


@router.get("/alerts", response_model=List[DelayAlertResponse])
def get_alerts(
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledged status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    alerts = list_alerts(db=db, acknowledged=acknowledged, limit=limit, offset=offset)
    return [_to_alert_response(a) for a in alerts]


@router.post("/alerts/{id}/ack", response_model=DelayAlertResponse)
def acknowledge_delay_alert(
    id: int,
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    try:
        alert = acknowledge_alert(db=db, alert_id=id, supervisor=current_user)
        return _to_alert_response(alert)
    except AlertServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.get("/reports/analytics")
def get_analytics(
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    from app.services.analytics_service import compute_executive_analytics

    return compute_executive_analytics(db=db)
