# Citizen Service Desk

A backend for a public service office. Citizens submit service requests and book appointments,
officers work the files, and supervisors get **delay alerts** when a request runs past its
service-level deadline.

I built it to practise the unglamorous half of backend work: clear API contracts, validation and
error handling, role-based access, a workflow that cannot be put into an illegal state, and a
test suite that pins the business rules down.

## What it does

| Area | Behaviour |
|---|---|
| **Service requests** | Submit a request for a service (passport, licence, police report...). Each gets a reference number (`SR-2026-000001`) and a due date computed from the service's SLA in **working days** (Sunday to Friday). |
| **Workflow** | `SUBMITTED -> UNDER_REVIEW -> APPROVED -> COMPLETED`, with `NEEDS_INFO`, `REJECTED` and `CANCELLED` branches. Every move is checked against a state machine *and* the caller's role; every move is written to an audit trail. |
| **SLA clock** | The clock **pauses** while a request waits on the citizen (`NEEDS_INFO`) and the due date moves back by the time spent waiting. |
| **Delay alerts** | A scan finds requests that are `DUE_SOON`, `OVERDUE` or `ESCALATED` and creates one alert per (request, level). Re-running a scan is safe: it never duplicates. |
| **Appointments** | 30-minute slots, 10:00-17:00, Sunday to Friday, up to 30 days ahead. Per-office capacity per slot, no double-booking for one citizen, cancellations free the place. |
| **Public tracking** | `GET /track/{reference}` shows status and due date with **no personal data**. |
| **Access control** | Citizens see their own requests, officers see the ones assigned to them, supervisors see everything. Requests you may not see return `404`, not `403`, so ids cannot be probed. |

The service catalogue and SLA values are illustrative demo data, not official figures.

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

python -m scripts.seed_demo          # demo accounts + requests in different states
uvicorn app.main:app --reload        # http://127.0.0.1:8000/docs
```

Open `/docs`, log in with `POST /auth/login` as `supervisor@example.org` / `demo-password-1`,
click **Authorize**, then try `POST /alerts/scan` to see the overdue request from the seed data
turn into an alert.

Run the tests:

```bash
pytest                  # unit + integration tests, coverage report, fails below 90%
ruff check . && ruff format --check .
```

## A tour of the API

| Method and path | Who | Purpose |
|---|---|---|
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | public / any | Sign up as a citizen, get a token |
| `POST /staff` | supervisor | Create officer or supervisor accounts |
| `GET /services`, `GET /offices` | public | Catalogue data |
| `POST /requests` | citizen | Submit a request |
| `GET /requests` | any | List what you are allowed to see (filters: `status`, `service_type`; `limit`/`offset`) |
| `GET /requests/{id}`, `GET /requests/{id}/events` | owner / assigned / supervisor | Detail and audit trail |
| `POST /requests/{id}/assign` | supervisor | Assign an officer |
| `POST /requests/{id}/transition` | role-dependent | Move the request along the workflow |
| `GET /track/{reference}` | public | Status by reference, no personal data |
| `GET /offices/{code}/availability?day=YYYY-MM-DD` | public | Open slots and places left |
| `POST /appointments`, `GET /appointments`, `POST /appointments/{id}/cancel` | citizen | Book, list, cancel |
| `GET /reports/delays`, `POST /alerts/scan`, `GET /alerts`, `POST /alerts/{id}/ack` | supervisor | Delay report and alerts |

Errors always have one shape:

```json
{"error": {"code": "slot_full", "message": "This slot is fully booked"}}
```

Validation errors add a `details` list of `{field, message}` pairs.

## Project layout

```
app/
  main.py            app factory, error handlers, /health
  routers/           thin HTTP layer: parse input, call a service, shape output
  services/          business rules (this is where the logic lives)
    workdays.py        Sunday-Friday working-day arithmetic
    sla.py             due dates, pause/resume, delay levels
    workflow.py        the state machine and who may trigger each move
    scheduling.py      slot grid, office hours, booking window
    *_service.py       database-backed operations built on the rules above
  models.py          SQLAlchemy 2.0 models
  schemas.py         Pydantic request/response models
  security.py        PBKDF2 password hashing, JWT tokens
tests/
  unit/              pure-logic tests, no database
  integration/       API tests against an in-memory database with a frozen clock
docs/                architecture notes and decision records
```

Design notes, trade-offs and known limitations are in [docs/architecture.md](docs/architecture.md)
and [docs/adr](docs/adr).

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./desk.db` | Any SQLAlchemy URL |
| `SECRET_KEY` | a development value | **Set this in any real deployment** |
| `TOKEN_TTL_MINUTES` | `60` | Access token lifetime |
| `PASSWORD_ITERATIONS` | `600000` | PBKDF2 work factor |

## Docker

```bash
docker build -t citizen-service-desk .
docker run -p 8000:8000 -e SECRET_KEY="$(openssl rand -hex 32)" citizen-service-desk
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: branch, add a test with the change, keep
`ruff` and `pytest` green, open a pull request using the template.
