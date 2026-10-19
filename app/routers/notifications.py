from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import NotificationResponse
from app.security import get_current_user
from app.services.notification_service import (
    list_user_notifications,
    mark_all_as_read,
    mark_notification_as_read,
)

router = APIRouter(tags=["Notifications"])


@router.get("/notifications", response_model=List[NotificationResponse])
def get_my_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
    )


@router.post("/notifications/{id}/read", response_model=Optional[NotificationResponse])
def read_notification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_notification_as_read(db=db, notification_id=id, user_id=current_user.id)


@router.post("/notifications/read-all")
def read_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = mark_all_as_read(db=db, user_id=current_user.id)
    return {"status": "ok", "marked_read": count}
