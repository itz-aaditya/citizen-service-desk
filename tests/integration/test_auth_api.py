from tests.conftest import auth_header_for_user


def test_register_and_login_flow(client):
    # Register new citizen
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "newcitizen@example.org",
            "password": "securepassword123",
            "full_name": "New Citizen",
        },
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert data["email"] == "newcitizen@example.org"
    assert data["role"] == "CITIZEN"

    # Duplicate email registration should fail
    dup_resp = client.post(
        "/auth/register",
        json={
            "email": "newcitizen@example.org",
            "password": "anotherpassword",
            "full_name": "Duplicate Citizen",
        },
    )
    assert dup_resp.status_code == 400
    assert dup_resp.json()["error"]["code"] == "email_taken"

    # Login with valid credentials
    login_resp = client.post(
        "/auth/login",
        json={
            "email": "newcitizen@example.org",
            "password": "securepassword123",
        },
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Login with invalid password
    bad_login = client.post(
        "/auth/login",
        json={
            "email": "newcitizen@example.org",
            "password": "wrongpassword",
        },
    )
    assert bad_login.status_code == 401
    assert bad_login.json()["error"]["code"] == "invalid_credentials"

    # Call /auth/me with Bearer token
    me_resp = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "newcitizen@example.org"


def test_auth_me_unauthorized(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


def test_create_staff_by_supervisor(client, seed_data):
    sup = seed_data["supervisor"]
    headers = auth_header_for_user(sup)

    # Supervisor creates officer
    resp = client.post(
        "/staff",
        headers=headers,
        json={
            "email": "newofficer@example.org",
            "password": "officerpassword123",
            "full_name": "New Officer",
            "role": "OFFICER",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "OFFICER"

    # Supervisor creates supervisor
    resp_sup = client.post(
        "/staff",
        headers=headers,
        json={
            "email": "newsupervisor@example.org",
            "password": "supervisorpassword123",
            "full_name": "New Supervisor",
            "role": "SUPERVISOR",
        },
    )
    assert resp_sup.status_code == 201
    assert resp_sup.json()["role"] == "SUPERVISOR"

    # Invalid role
    bad_role = client.post(
        "/staff",
        headers=headers,
        json={
            "email": "badrole@example.org",
            "password": "password123",
            "full_name": "Bad Role",
            "role": "CITIZEN",
        },
    )
    assert bad_role.status_code == 400
    assert bad_role.json()["error"]["code"] == "invalid_role"


def test_create_staff_forbidden_for_citizen(client, seed_data):
    citizen = seed_data["citizen"]
    headers = auth_header_for_user(citizen)

    resp = client.post(
        "/staff",
        headers=headers,
        json={
            "email": "hacked@example.org",
            "password": "password123",
            "full_name": "Hacker",
            "role": "OFFICER",
        },
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "forbidden"
