from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Standard Error Models
class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class ErrorResponse(BaseModel):
    error: ErrorBody


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class CreateStaffRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    role: str = Field(description="OFFICER or SUPERVISOR")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Catalogue Schemas
class ServiceResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    sla_working_days: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class OfficeResponse(BaseModel):
    id: int
    code: str
    name: str
    address: Optional[str] = None
    capacity_per_slot: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class SlotAvailabilityResponse(BaseModel):
    slot_start: str
    slot_end: str
    capacity: int
    booked: int
    places_left: int


class OfficeAvailabilityResponse(BaseModel):
    office_code: str
    date: date
    slots: List[SlotAvailabilityResponse]


# Service Request Schemas
class CreateServiceRequest(BaseModel):
    service_code: str = Field(min_length=1, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=2000)


class ServiceRequestListItem(BaseModel):
    id: int
    reference: str
    service_code: str
    service_name: str
    status: str
    submitted_at: datetime
    due_date: datetime
    assigned_officer_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceRequestDetail(BaseModel):
    id: int
    reference: str
    service_code: str
    service_name: str
    status: str
    submitted_at: datetime
    due_date: datetime
    paused_at: Optional[datetime] = None
    total_paused_seconds: int = 0
    notes: Optional[str] = None
    citizen_id: int
    citizen_name: str
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssignOfficerRequest(BaseModel):
    officer_id: int


class TransitionRequest(BaseModel):
    to_status: str = Field(min_length=3, max_length=50)
    reason: Optional[str] = Field(default=None, max_length=1000)


class RequestEventResponse(BaseModel):
    id: int
    request_id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    from_status: str
    to_status: str
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Public Tracking Schemas
class PublicTrackResponse(BaseModel):
    reference: str
    service_name: str
    status: str
    submitted_at: datetime
    due_date: datetime


# Appointment Schemas
class CreateAppointmentRequest(BaseModel):
    office_code: str
    appointment_date: date
    slot_start: str


class AppointmentResponse(BaseModel):
    id: int
    citizen_id: int
    office_code: str
    office_name: str
    appointment_date: date
    slot_start: str
    slot_end: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Delay Alerts & Reports Schemas
class DelayAlertResponse(BaseModel):
    id: int
    request_id: int
    reference: str
    level: str
    acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    acknowledged_by_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DelayReportItem(BaseModel):
    request_id: int
    reference: str
    service_name: str
    status: str
    due_date: datetime
    level: str
    delay_hours: float


class ScanAlertsResponse(BaseModel):
    scanned_requests: int
    new_alerts: int
    alerts: List[DelayAlertResponse]


# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    request_id: int
    filename: str
    file_type: str
    file_size: int
    status: str
    review_comment: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VerifyDocumentRequest(BaseModel):
    status: str = Field(min_length=3, max_length=20)  # VERIFIED or REJECTED
    review_comment: Optional[str] = Field(default=None, max_length=1000)


# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Executive Analytics Schemas
class ServiceMetric(BaseModel):
    service_code: str
    service_name: str
    total_requests: int
    completed_requests: int
    avg_completion_hours: float


class OfficerMetric(BaseModel):
    officer_id: int
    officer_name: str
    email: str
    assigned_requests: int
    completed_requests: int
    overdue_requests: int


class ExecutiveAnalyticsResponse(BaseModel):
    total_requests: int
    completed_requests: int
    pending_requests: int
    overdue_requests: int
    sla_compliance_rate: float
    services: List[ServiceMetric]
    officers: List[OfficerMetric]
