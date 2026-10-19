# Architecture & Design Decisions

## 1. Domain Separation
The application decouples the transport layer (FastAPI routers) from core domain logic. All complex arithmetic, state machines, and booking validation live in pure Python services under `app/services/`:
- `workdays.py`: Implements calendar mathematics for Sunday–Friday working weeks (Saturday off).
- `sla.py`: Calculates deadlines and handles clock pausing when requests are in `NEEDS_INFO`.
- `workflow.py`: Enforces state transitions via a transition matrix and caller role checking.
- `scheduling.py`: Validates office capacity and 30-minute booking grids within a 30-day window.

## 2. Anti-Enumeration & Defensive Security
Unauthorized access to service requests returns `404 Not Found` rather than `403 Forbidden`. This defensive design prevents attackers from probing sequential reference IDs to discover which requests exist in the system.

Public tracking (`GET /track/{reference}`) omits all Personally Identifiable Information (PII) such as citizen name, contact details, and notes.

## 3. Cryptography & Authentication
- Passwords are hashed using standard PBKDF2-HMAC-SHA256 with 600,000 iterations and per-user unique random 16-byte salts.
- Sessions use JWT tokens with configurable TTL (`TOKEN_TTL_MINUTES`).

## 4. Uniform Error Responses
All errors adhere to a single unified contract:
```json
{
  "error": {
    "code": "slot_full",
    "message": "This slot is fully booked",
    "details": []
  }
}
```
Validation errors automatically populate the `details` list with field-specific diagnostics.

