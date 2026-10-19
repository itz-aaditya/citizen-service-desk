import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Office, Service, User
from app.security import create_access_token, hash_password
from app.services.workflow import ROLE_CITIZEN, ROLE_OFFICER, ROLE_SUPERVISOR

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seed_data(db_session):
    # Create services
    passport = Service(
        code="PASSPORT",
        name="Passport Application",
        description="Standard passport",
        sla_working_days=10,
        is_active=True,
    )
    licence = Service(
        code="LICENCE",
        name="Driving Licence",
        description="Driving licence issue",
        sla_working_days=5,
        is_active=True,
    )
    db_session.add_all([passport, licence])

    # Create office
    office = Office(
        code="KTM",
        name="Kathmandu Desk",
        address="Central Plaza",
        capacity_per_slot=2,
        is_active=True,
    )
    db_session.add(office)

    # Create users
    pwd = hash_password("secret123")
    citizen = User(
        email="citizen@example.org",
        hashed_password=pwd,
        full_name="Jane Citizen",
        role=ROLE_CITIZEN,
    )
    other_citizen = User(
        email="other@example.org",
        hashed_password=pwd,
        full_name="John Other",
        role=ROLE_CITIZEN,
    )
    officer = User(
        email="officer@example.org",
        hashed_password=pwd,
        full_name="Alex Officer",
        role=ROLE_OFFICER,
    )
    supervisor = User(
        email="supervisor@example.org",
        hashed_password=pwd,
        full_name="Sam Supervisor",
        role=ROLE_SUPERVISOR,
    )
    db_session.add_all([citizen, other_citizen, officer, supervisor])
    db_session.commit()

    return {
        "passport": passport,
        "licence": licence,
        "office": office,
        "citizen": citizen,
        "other_citizen": other_citizen,
        "officer": officer,
        "supervisor": supervisor,
    }


def auth_header_for_user(user: User) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
    return {"Authorization": f"Bearer {token}"}
