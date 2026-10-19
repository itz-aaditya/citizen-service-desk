from datetime import datetime, timedelta, timezone

from app.database import Base, SessionLocal, engine
from app.models import Appointment, Office, RequestEvent, Service, ServiceRequest, User
from app.security import hash_password
from app.services.workdays import next_workday


def seed():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # 1. Clear existing seed data if any
        db.query(RequestEvent).delete()
        db.query(Appointment).delete()
        db.query(ServiceRequest).delete()
        db.query(Service).delete()
        db.query(Office).delete()
        db.query(User).delete()
        db.commit()

        print("Seeding users...")
        pwd = hash_password("demo-password-1")

        supervisor = User(
            email="supervisor@example.org",
            hashed_password=pwd,
            full_name="Chief Supervisor",
            role="SUPERVISOR",
            created_at=now - timedelta(days=30),
        )
        officer1 = User(
            email="officer1@example.org",
            hashed_password=pwd,
            full_name="Officer Alex",
            role="OFFICER",
            created_at=now - timedelta(days=30),
        )
        officer2 = User(
            email="officer2@example.org",
            hashed_password=pwd,
            full_name="Officer Sam",
            role="OFFICER",
            created_at=now - timedelta(days=30),
        )
        citizen1 = User(
            email="citizen1@example.org",
            hashed_password=pwd,
            full_name="Citizen Jane",
            role="CITIZEN",
            created_at=now - timedelta(days=20),
        )
        citizen2 = User(
            email="citizen2@example.org",
            hashed_password=pwd,
            full_name="Citizen John",
            role="CITIZEN",
            created_at=now - timedelta(days=15),
        )

        db.add_all([supervisor, officer1, officer2, citizen1, citizen2])
        db.commit()

        print("Seeding services...")
        svc_passport = Service(
            code="PASSPORT",
            name="Passport Application & Renewal",
            description="Official machine-readable or biometric passport issuance",
            sla_working_days=10,
            is_active=True,
        )
        svc_licence = Service(
            code="LICENCE",
            name="Driving Licence Issuance",
            description="Smart card driving licence exam, renewal or new issue",
            sla_working_days=5,
            is_active=True,
        )
        svc_police = Service(
            code="POLICE_REPORT",
            name="Police Clearance Certificate",
            description="Background verification certificate for abroad or employment",
            sla_working_days=3,
            is_active=True,
        )
        svc_birth = Service(
            code="BIRTH_CERT",
            name="Birth Certificate Verification",
            description="Municipal birth record verification and copy",
            sla_working_days=2,
            is_active=True,
        )
        db.add_all([svc_passport, svc_licence, svc_police, svc_birth])
        db.commit()

        print("Seeding offices...")
        office_ktm = Office(
            code="KTM",
            name="Central Office - Kathmandu",
            address="Babarmahal, Kathmandu",
            capacity_per_slot=5,
            is_active=True,
        )
        office_pkh = Office(
            code="PKH",
            name="Regional Office - Pokhara",
            address="Lakeside, Pokhara",
            capacity_per_slot=3,
            is_active=True,
        )
        db.add_all([office_ktm, office_pkh])
        db.commit()

        print("Seeding requests in various workflow states...")

        # Request 1: SUBMITTED (Passport, due in future)
        req1 = ServiceRequest(
            reference="SR-2026-000001",
            citizen_id=citizen1.id,
            service_id=svc_passport.id,
            status="SUBMITTED",
            submitted_at=now - timedelta(hours=3),
            due_date=now + timedelta(days=10),
            notes="Expedited application requested.",
        )
        db.add(req1)
        db.flush()
        db.add(
            RequestEvent(
                request_id=req1.id,
                actor_id=citizen1.id,
                from_status="NONE",
                to_status="SUBMITTED",
                reason="Initial citizen submission",
                created_at=now - timedelta(hours=3),
            )
        )

        # Request 2: UNDER_REVIEW (Licence, assigned to officer1)
        req2 = ServiceRequest(
            reference="SR-2026-000002",
            citizen_id=citizen1.id,
            service_id=svc_licence.id,
            assigned_officer_id=officer1.id,
            status="UNDER_REVIEW",
            submitted_at=now - timedelta(days=1),
            due_date=now + timedelta(days=4),
            notes="Renewal for category B.",
        )
        db.add(req2)
        db.flush()
        db.add(
            RequestEvent(
                request_id=req2.id,
                actor_id=officer1.id,
                from_status="SUBMITTED",
                to_status="UNDER_REVIEW",
                reason="Documents taken for verification",
                created_at=now - timedelta(hours=12),
            )
        )

        # Request 3: NEEDS_INFO (Police report, SLA paused)
        req3 = ServiceRequest(
            reference="SR-2026-000003",
            citizen_id=citizen2.id,
            service_id=svc_police.id,
            assigned_officer_id=officer2.id,
            status="NEEDS_INFO",
            submitted_at=now - timedelta(days=2),
            due_date=now + timedelta(days=2),
            paused_at=now - timedelta(hours=8),
            notes="Waiting for citizen to upload passport copy.",
        )
        db.add(req3)
        db.flush()
        db.add(
            RequestEvent(
                request_id=req3.id,
                actor_id=officer2.id,
                from_status="UNDER_REVIEW",
                to_status="NEEDS_INFO",
                reason="Citizenship card scan was blurry",
                created_at=now - timedelta(hours=8),
            )
        )

        # Request 4: COMPLETED (Birth cert, approved and delivered)
        req4 = ServiceRequest(
            reference="SR-2026-000004",
            citizen_id=citizen1.id,
            service_id=svc_birth.id,
            assigned_officer_id=officer1.id,
            status="COMPLETED",
            submitted_at=now - timedelta(days=5),
            due_date=now - timedelta(days=3),
            notes="Completed successfully.",
        )
        db.add(req4)
        db.flush()
        db.add(
            RequestEvent(
                request_id=req4.id,
                actor_id=officer1.id,
                from_status="APPROVED",
                to_status="COMPLETED",
                reason="Delivered to citizen",
                created_at=now - timedelta(days=3),
            )
        )

        # Request 5: OVERDUE REQUEST (Assigned to officer1, due date was 2 days ago!)
        req5 = ServiceRequest(
            reference="SR-2026-000005",
            citizen_id=citizen2.id,
            service_id=svc_passport.id,
            assigned_officer_id=officer1.id,
            status="UNDER_REVIEW",
            submitted_at=now - timedelta(days=15),
            due_date=now - timedelta(days=2),  # Past due date!
            notes="Overdue request intended for testing delay scan and escalation alerts.",
        )
        db.add(req5)
        db.flush()
        db.add(
            RequestEvent(
                request_id=req5.id,
                actor_id=officer1.id,
                from_status="SUBMITTED",
                to_status="UNDER_REVIEW",
                reason="Delayed processing",
                created_at=now - timedelta(days=10),
            )
        )

        print("Seeding sample appointment...")
        target_date = next_workday(now.date() + timedelta(days=2))
        appt = Appointment(
            citizen_id=citizen1.id,
            office_id=office_ktm.id,
            appointment_date=target_date,
            slot_start="10:00",
            slot_end="10:30",
            status="BOOKED",
            created_at=now - timedelta(hours=1),
        )
        db.add(appt)

        db.commit()
        print("Demo seed completed successfully!")
        print("Supervisor: supervisor@example.org / demo-password-1")
        print("Officer:    officer1@example.org   / demo-password-1")
        print("Citizen:    citizen1@example.org   / demo-password-1")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
