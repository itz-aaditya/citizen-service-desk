import io

from tests.conftest import auth_header_for_user


def test_document_upload_and_verification_flow(client, seed_data):
    citizen = seed_data["citizen"]
    officer = seed_data["officer"]
    supervisor = seed_data["supervisor"]
    other_citizen = seed_data["other_citizen"]

    cit_headers = auth_header_for_user(citizen)
    off_headers = auth_header_for_user(officer)
    sup_headers = auth_header_for_user(supervisor)
    other_headers = auth_header_for_user(other_citizen)

    # 1. Citizen creates request
    resp = client.post("/requests", headers=cit_headers, json={"service_code": "PASSPORT"})
    req_id = resp.json()["id"]

    # 2. Citizen uploads a document
    file_content = b"%PDF-1.4 test citizenship document bytes"
    upload_resp = client.post(
        f"/requests/{req_id}/documents",
        headers=cit_headers,
        files={"file": ("citizenship.pdf", io.BytesIO(file_content), "application/pdf")},
    )
    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()
    assert doc_data["filename"] == "citizenship.pdf"
    assert doc_data["status"] == "PENDING"
    doc_id = doc_data["id"]

    # 3. List documents for request
    list_docs = client.get(f"/requests/{req_id}/documents", headers=cit_headers)
    assert list_docs.status_code == 200
    assert len(list_docs.json()) == 1

    # 4. Anti-probing: other citizen cannot see or download documents (returns 404)
    probe_list = client.get(f"/requests/{req_id}/documents", headers=other_headers)
    assert probe_list.status_code == 404

    probe_download = client.get(f"/documents/{doc_id}/download", headers=other_headers)
    assert probe_download.status_code == 404

    # 5. Citizen downloads own document
    dl_resp = client.get(f"/documents/{doc_id}/download", headers=cit_headers)
    assert dl_resp.status_code == 200
    assert dl_resp.content == file_content

    # 6. Unassigned officer cannot access/verify (anti-probing 404)
    unassigned_verify = client.post(
        f"/documents/{doc_id}/verify",
        headers=off_headers,
        json={"status": "VERIFIED", "review_comment": "Clear copy of citizenship"},
    )
    assert unassigned_verify.status_code == 404

    # 7. Supervisor assigns officer
    assign_resp = client.post(
        f"/requests/{req_id}/assign",
        headers=sup_headers,
        json={"officer_id": officer.id},
    )
    assert assign_resp.status_code == 200

    # 8. Assigned officer verifies document
    verify_resp = client.post(
        f"/documents/{doc_id}/verify",
        headers=off_headers,
        json={"status": "VERIFIED", "review_comment": "Clear copy of citizenship"},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "VERIFIED"
