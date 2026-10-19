import os
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import RequestDocument, User
from app.services.request_service import get_service_request_with_access

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class DocumentServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _clean_filename(filename: str) -> str:
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return clean or "document"


def save_request_document(
    db: Session,
    request_id: int,
    user: User,
    file_bytes: bytes,
    original_filename: str,
    content_type: str,
) -> RequestDocument:
    # Check access to the request
    req = get_service_request_with_access(db, request_id, user)

    clean_name = _clean_filename(original_filename)
    stored_name = f"{uuid4().hex}_{clean_name}"
    target_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    doc = RequestDocument(
        request_id=req.id,
        filename=clean_name,
        stored_filename=stored_name,
        file_type=content_type,
        file_size=len(file_bytes),
        status="PENDING",
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(
    db: Session,
    request_id: int,
    user: User,
) -> List[RequestDocument]:
    get_service_request_with_access(db, request_id, user)
    return (
        db.query(RequestDocument)
        .filter(RequestDocument.request_id == request_id)
        .order_by(RequestDocument.uploaded_at.asc())
        .all()
    )


def get_document_file_path(
    db: Session,
    document_id: int,
    user: User,
) -> Tuple[RequestDocument, str]:
    doc = db.query(RequestDocument).filter(RequestDocument.id == document_id).first()
    if not doc:
        raise DocumentServiceError("not_found", "Document not found", status_code=404)

    # Check access to the request
    get_service_request_with_access(db, doc.request_id, user)

    file_path = os.path.join(UPLOAD_DIR, doc.stored_filename)
    if not os.path.exists(file_path):
        raise DocumentServiceError(
            "file_missing", "File not found on storage disk", status_code=404
        )

    return doc, file_path


def verify_request_document(
    db: Session,
    document_id: int,
    officer: User,
    status: str,
    review_comment: Optional[str] = None,
) -> RequestDocument:
    if status not in ["VERIFIED", "REJECTED"]:
        raise DocumentServiceError(
            "invalid_status", "Status must be VERIFIED or REJECTED", status_code=400
        )

    doc = db.query(RequestDocument).filter(RequestDocument.id == document_id).first()
    if not doc:
        raise DocumentServiceError("not_found", "Document not found", status_code=404)

    # Validate officer/supervisor can access
    get_service_request_with_access(db, doc.request_id, officer)

    doc.status = status
    doc.review_comment = review_comment
    db.commit()
    db.refresh(doc)
    return doc
