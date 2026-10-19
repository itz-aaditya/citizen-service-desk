from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import CreateStaffRequest, TokenResponse, UserLogin, UserRegister, UserResponse
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password_timing_safe,
)
from app.services.rate_limiter import limiter
from app.services.workflow import ROLE_CITIZEN, ROLE_OFFICER, ROLE_SUPERVISOR

router = APIRouter(tags=["Auth"])


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    limiter.check(request, max_requests=30, window_seconds=60)
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "email_taken", "message": "A user with this email already exists"},
        )

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=ROLE_CITIZEN,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=TokenResponse)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    limiter.check(request, max_requests=30, window_seconds=60)
    user = db.query(User).filter(User.email == login_data.email).first()
    # Timing-safe verification prevents account enumeration through response time latency
    password_valid = verify_password_timing_safe(
        login_data.password, user.hashed_password if user else None
    )
    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "Invalid email or password"},
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
    return TokenResponse(access_token=token, token_type="bearer")


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    staff_data: CreateStaffRequest,
    current_user: User = Depends(require_role(ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    if staff_data.role not in [ROLE_OFFICER, ROLE_SUPERVISOR]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_role", "message": "Role must be OFFICER or SUPERVISOR"},
        )

    existing = db.query(User).filter(User.email == staff_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "email_taken", "message": "A user with this email already exists"},
        )

    staff = User(
        email=staff_data.email,
        hashed_password=hash_password(staff_data.password),
        full_name=staff_data.full_name,
        role=staff_data.role,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff
