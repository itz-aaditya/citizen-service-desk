from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Office, Service
from app.schemas import OfficeResponse, ServiceResponse

router = APIRouter(tags=["Catalogue"])


@router.get("/services", response_model=List[ServiceResponse])
def list_services(db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.is_active.is_(True)).order_by(Service.name).all()


@router.get("/offices", response_model=List[OfficeResponse])
def list_offices(db: Session = Depends(get_db)):
    return db.query(Office).filter(Office.is_active.is_(True)).order_by(Office.name).all()
