import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import Base, SessionLocal, engine
from app.routers import (
    alerts,
    appointments,
    auth,
    catalogue,
    documents,
    notifications,
    public,
    requests,
)
from app.services.alert_service import scan_and_create_alerts

logger = logging.getLogger("uvicorn.info")


def _scheduled_sla_scan():
    db = SessionLocal()
    try:
        scanned, new_count, _ = scan_and_create_alerts(db)
        if new_count > 0:
            logger.info(
                f"[SLA Daemon] Detected {new_count} new delay alerts across {scanned} requests."
            )
    except Exception as e:
        logger.error(f"[SLA Daemon] Error during background scan: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Start automated continuous background SLA scanner (every 60s)
    scheduler = BackgroundScheduler()
    scheduler.add_job(_scheduled_sla_scan, "interval", seconds=60, id="sla_continuous_scan")
    scheduler.start()
    logger.info("[SLA Daemon] Continuous background scheduler started.")

    yield

    scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Citizen Service Desk",
        description="A backend for a public service office managing requests, SLAs, appointments, and alerts.",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global Uniform Error Handlers
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            error_body = exc.detail
        else:
            error_body = {
                "code": "http_error",
                "message": str(exc.detail),
            }
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": error_body},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details: List[Dict[str, Any]] = []
        for error in exc.errors():
            loc = error.get("loc", [])
            # Skip 'body' or 'query' prefix in field if present
            field_name = ".".join(str(item) for item in loc if item not in ("body", "query"))
            details.append(
                {
                    "field": field_name or None,
                    "message": error.get("msg", "Validation error"),
                }
            )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": details,
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected server error occurred",
                }
            },
        )

    # Health check endpoint
    @app.get("/health", tags=["System"])
    def health_check():
        return {"status": "ok"}

    # Include Routers
    app.include_router(auth.router)
    app.include_router(catalogue.router)
    app.include_router(requests.router)
    app.include_router(documents.router)
    app.include_router(notifications.router)
    app.include_router(public.router)
    app.include_router(appointments.router)
    app.include_router(alerts.router)

    # Mount static frontend build if present
    from fastapi.staticfiles import StaticFiles

    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
    if os.path.exists(frontend_dist):
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

    return app


app = create_app()
