import os
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import settings
from app.models import RequestDocument, User
from app.services.request_service import get_service_request_with_access

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAGIC_SIGNATURES = {
    ".pdf": [b"%PDF-"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
}


class DocumentServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _clean_filename(filename: str) -> str:
    # 1. Extract basename only to strip any directory traversal attempts
    base = os.path.basename(filename)
    # 2. Strip null bytes and traversal sequences
    base = base.replace("\x00", "").replace("..", "")
    stem, ext = os.path.splitext(base)
    ext_lower = ext.lower()

    if ext_lower not in ALLOWED_EXTENSIONS:
        raise DocumentServiceError(
            "unsupported_file_type",
            f"File extension '{ext_lower}' is not allowed. Permitted formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            status_code=400,
        )

    clean_stem = re.sub(r"[^a-zA-Z0-9_.-]", "_", stem)
    if not clean_stem:
        clean_stem = "document"
    return f"{clean_stem}{ext_lower}"


def _verify_file_bytes(file_bytes: bytes, ext: str) -> None:
    # 1. Size bounds check
    if len(file_bytes) == 0:
        raise DocumentServiceError("empty_file", "Uploaded file is empty", status_code=400)

    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise DocumentServiceError(
            "file_too_large",
            f"File size exceeds maximum allowed limit of {max_mb}MB",
            status_code=413,
        )

    # 2. Magic byte signature verification
    signatures = MAGIC_SIGNATURES.get(ext, [])
    if signatures and not any(file_bytes.startswith(sig) for sig in signatures):
        raise DocumentServiceError(
            "invalid_file_signature",
            f"File signature does not match expected format for {ext}",
            status_code=400,
        )


def save_request_document(
    db: Session,
    request_id: int,
    user: User,
    file_bytes: bytes,
    original_filename: str,
    content_type: str,
) -> RequestDocument:
    # Check access to the request (anti-probing 404 enforcement)
    req = get_service_request_with_access(db, request_id, user)

    clean_name = _clean_filename(original_filename)
    _, ext = os.path.splitext(clean_name)
    _verify_file_bytes(file_bytes, ext.lower())

    stored_name = f"{uuid4().hex}_{clean_name}"
    target_path = os.path.abspath(os.path.join(UPLOAD_DIR, stored_name))
    upload_dir_abs = os.path.abspath(UPLOAD_DIR)

    # Ensure path stays strictly inside UPLOAD_DIR
    if not target_path.startswith(upload_dir_abs):
        raise DocumentServiceError("path_traversal", "Invalid file path detected", status_code=400)

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
