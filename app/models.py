from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="CITIZEN", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    submitted_requests: Mapped[List["ServiceRequest"]] = relationship(
        "ServiceRequest",
        back_populates="citizen",
        foreign_keys="ServiceRequest.citizen_id",
    )
    assigned_requests: Mapped[List["ServiceRequest"]] = relationship(
        "ServiceRequest",
        back_populates="assigned_officer",
        foreign_keys="ServiceRequest.assigned_officer_id",
    )
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment",
        back_populates="citizen",
    )


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sla_working_days: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    requests: Mapped[List["ServiceRequest"]] = relationship(
        "ServiceRequest", back_populates="service"
    )


class Office(Base):
    __tablename__ = "offices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    capacity_per_slot: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="office")


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    citizen_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id"), nullable=False)
    assigned_officer_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="SUBMITTED", index=True, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paused_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_paused_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relationships
    citizen: Mapped["User"] = relationship(
        "User", foreign_keys=[citizen_id], back_populates="submitted_requests"
    )
    assigned_officer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_officer_id], back_populates="assigned_requests"
    )
    service: Mapped["Service"] = relationship("Service", back_populates="requests")
    events: Mapped[List["RequestEvent"]] = relationship(
        "RequestEvent",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="RequestEvent.created_at",
    )
    alerts: Mapped[List["DelayAlert"]] = relationship(
        "DelayAlert", back_populates="request", cascade="all, delete-orphan"
    )


class RequestEvent(Base):
    __tablename__ = "request_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("service_requests.id"), nullable=False
    )
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    from_status: Mapped[str] = mapped_column(String(50), nullable=False)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", back_populates="events")
    actor: Mapped[Optional["User"]] = relationship("User")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    citizen_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    office_id: Mapped[int] = mapped_column(Integer, ForeignKey("offices.id"), nullable=False)
    appointment_date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    slot_start: Mapped[str] = mapped_column(String(10), nullable=False)  # "10:00"
    slot_end: Mapped[str] = mapped_column(String(10), nullable=False)  # "10:30"
    status: Mapped[str] = mapped_column(String(50), default="BOOKED", index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    citizen: Mapped["User"] = relationship("User", back_populates="appointments")
    office: Mapped["Office"] = relationship("Office", back_populates="appointments")


class DelayAlert(Base):
    __tablename__ = "delay_alerts"
    __table_args__ = (UniqueConstraint("request_id", "level", name="uq_request_alert_level"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("service_requests.id"), nullable=False
    )
    level: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "DUE_SOON", "OVERDUE", "ESCALATED"
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    acknowledged_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", back_populates="alerts")
    acknowledged_by: Mapped[Optional["User"]] = relationship("User")
