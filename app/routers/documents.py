from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import DocumentResponse, VerifyDocumentRequest
from app.security import get_current_user, require_role
from app.services.document_service import (
    DocumentServiceError,
    get_document_file_path,
    list_documents,
    save_request_document,
    verify_request_document,
)
from app.services.request_service import RequestServiceError
from app.services.workflow import ROLE_OFFICER, ROLE_SUPERVISOR

router = APIRouter(tags=["Documents"])


@router.post(
    "/requests/{id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        content = await file.read()
        doc = save_request_document(
            db=db,
            request_id=id,
            user=current_user,
            file_bytes=content,
            original_filename=file.filename or "upload.pdf",
            content_type=file.content_type or "application/octet-stream",
        )
        return doc
    except (DocumentServiceError, RequestServiceError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.get("/requests/{id}/documents", response_model=List[DocumentResponse])
def get_request_documents(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return list_documents(db=db, request_id=id, user=current_user)
    except (DocumentServiceError, RequestServiceError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.get("/documents/{id}/download")
def download_document(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc, file_path = get_document_file_path(db=db, document_id=id, user=current_user)
        return FileResponse(
            path=file_path,
            filename=doc.filename,
            media_type=doc.file_type,
        )
    except (DocumentServiceError, RequestServiceError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )


@router.post("/documents/{id}/verify", response_model=DocumentResponse)
def verify_document(
    id: int,
    body: VerifyDocumentRequest,
    current_user: User = Depends(require_role(ROLE_OFFICER, ROLE_SUPERVISOR)),
    db: Session = Depends(get_db),
):
    try:
        doc = verify_request_document(
            db=db,
            document_id=id,
            officer=current_user,
            status=body.status,
            review_comment=body.review_comment,
        )
        return doc
    except (DocumentServiceError, RequestServiceError) as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        )
