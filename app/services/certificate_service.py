import io
from datetime import datetime, timezone

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.models import ServiceRequest, User
from app.services.request_service import RequestServiceError, get_service_request_with_access


def generate_completion_certificate_pdf(
    req: ServiceRequest,
    public_base_url: str = "http://127.0.0.1:8000",
) -> bytes:
    """Generate a vector-drawn, official completion certificate PDF with an embedded QR code."""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Primary colors
    navy = HexColor("#0f172a")
    blue = HexColor("#0284c7")
    gold = HexColor("#d97706")
    slate = HexColor("#64748b")
    light_bg = HexColor("#f8fafc")

    # Outer decorative border
    p.setStrokeColor(navy)
    p.setLineWidth(4)
    p.rect(30, 30, width - 60, height - 60)

    # Inner thin border
    p.setStrokeColor(gold)
    p.setLineWidth(1.5)
    p.rect(36, 36, width - 72, height - 72)

    # Header Emblem / Title
    p.setFillColor(blue)
    p.circle(width / 2, height - 100, 26, stroke=0, fill=1)
    p.setFillColor(HexColor("#ffffff"))
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width / 2, height - 105, "CSD")

    p.setFillColor(navy)
    p.setFont("Helvetica-Bold", 20)
    p.drawCentredString(width / 2, height - 150, "GOVERNMENT CITIZEN SERVICE DESK")

    p.setFont("Helvetica-Bold", 13)
    p.setFillColor(gold)
    p.drawCentredString(width / 2, height - 172, "OFFICIAL DIGITAL SERVICE COMPLETION CERTIFICATE")

    # Decorative horizontal line
    p.setStrokeColor(slate)
    p.setLineWidth(0.8)
    p.line(80, height - 188, width - 80, height - 188)

    # Main Body Text
    p.setFillColor(navy)
    p.setFont("Helvetica", 11)
    p.drawCentredString(
        width / 2,
        height - 225,
        "This is to officially certify that the following citizen service application has been fully processed,",
    )
    p.drawCentredString(
        width / 2,
        height - 242,
        "verified in accordance with statutory regulations, and successfully completed.",
    )

    # Certificate Details Box
    box_top = height - 275
    box_bottom = height - 470
    p.setFillColor(light_bg)
    p.rect(70, box_bottom, width - 140, box_top - box_bottom, stroke=0, fill=1)
    p.setStrokeColor(HexColor("#e2e8f0"))
    p.setLineWidth(1)
    p.rect(70, box_bottom, width - 140, box_top - box_bottom, stroke=1, fill=0)

    # Details rows
    labels = [
        ("Application Reference:", req.reference),
        ("Service Name:", req.service.name if req.service else "N/A"),
        ("Beneficiary Citizen:", req.citizen.full_name if req.citizen else "N/A"),
        ("Citizen Email:", req.citizen.email if req.citizen else "N/A"),
        (
            "Date of Submission:",
            req.submitted_at.strftime("%B %d, %Y - %H:%M UTC") if req.submitted_at else "N/A",
        ),
        (
            "Completion Date:",
            req.updated_at.strftime("%B %d, %Y - %H:%M UTC") if req.updated_at else "N/A",
        ),
        ("Final Status:", req.status),
    ]

    curr_y = box_top - 25
    for label, val in labels:
        p.setFont("Helvetica-Bold", 10)
        p.setFillColor(slate)
        p.drawString(95, curr_y, label)

        p.setFont(
            "Helvetica-Bold"
            if label.startswith("Application") or label.startswith("Final")
            else "Helvetica",
            10,
        )
        p.setFillColor(blue if label.startswith("Final") else navy)
        p.drawString(260, curr_y, str(val))
        curr_y -= 24

    # Generate QR Code for public verification
    verify_url = f"{public_base_url}/track/{req.reference}"
    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    # Draw QR Code on PDF (bottom left)
    from reportlab.lib.utils import ImageReader

    qr_reportlab = ImageReader(qr_buffer)
    p.drawImage(qr_reportlab, 80, 80, width=100, height=100)

    p.setFont("Helvetica-Bold", 8)
    p.setFillColor(slate)
    p.drawString(80, 68, "Scan to Verify Authenticity")

    # Signature Block (bottom right)
    p.setFont("Helvetica-Bold", 9)
    p.setFillColor(navy)
    p.drawRightString(width - 80, 140, "Digitally Verified & Authorized by")
    p.setFont("Helvetica", 9)
    p.setFillColor(slate)
    p.drawRightString(
        width - 80,
        125,
        f"Caseworker: {req.assigned_officer.full_name if req.assigned_officer else 'Central Office Registry'}",
    )
    p.drawRightString(
        width - 80,
        110,
        "Department Director / Supervisor Sign-off",
    )
    p.setStrokeColor(navy)
    p.setLineWidth(1)
    p.line(width - 240, 100, width - 80, 100)
    p.setFont("Helvetica-Oblique", 8)
    p.drawRightString(
        width - 80, 88, f"Signed on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )

    # Footer note
    p.setFont("Helvetica", 7)
    p.setFillColor(slate)
    p.drawCentredString(
        width / 2,
        45,
        "Citizen Service Desk Electronic Document Authority • Tamper-Evident Digital Record",
    )

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.getvalue()


def get_request_certificate_bytes(
    db,
    request_id: int,
    user: User,
) -> tuple[ServiceRequest, bytes]:
    req = get_service_request_with_access(db, request_id, user)
    if req.status != "COMPLETED":
        raise RequestServiceError(
            "not_completed",
            f"Certificate is only available once status is COMPLETED. Current status: '{req.status}'",
            status_code=400,
        )

    pdf_bytes = generate_completion_certificate_pdf(req)
    return req, pdf_bytes
