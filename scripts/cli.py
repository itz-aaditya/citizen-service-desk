import argparse
import csv
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import ServiceRequest, User
from app.services.alert_service import get_delay_report, scan_and_create_alerts
from app.services.analytics_service import compute_executive_analytics
from app.services.workflow import TERMINAL_STATUSES


def get_db_session() -> Session:
    return SessionLocal()


def run_status(db: Optional[Session] = None) -> Dict[str, Any]:
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True

    try:
        analytics = compute_executive_analytics(db)
        officers = db.query(User).filter(User.role == "OFFICER").all()

        output = {
            "total_requests": analytics.total_requests,
            "completed_requests": analytics.completed_requests,
            "pending_requests": analytics.pending_requests,
            "overdue_requests": analytics.overdue_requests,
            "sla_compliance_rate": analytics.sla_compliance_rate,
            "active_officers_count": len(officers),
            "officers": [
                {
                    "name": o.officer_name,
                    "email": o.email,
                    "assigned": o.assigned_requests,
                    "completed": o.completed_requests,
                    "overdue": o.overdue_requests,
                }
                for o in analytics.officers
            ],
            "services": [
                {
                    "code": s.service_code,
                    "name": s.service_name,
                    "total": s.total_requests,
                    "avg_completion_hours": s.avg_completion_hours,
                }
                for s in analytics.services
            ],
        }

        print("============================================================")
        print("          CITIZEN SERVICE DESK -- SYSTEM HEALTH & SLA       ")
        print("============================================================")
        print(f" * Total Applications       : {output['total_requests']}")
        print(f" * Completed Files          : {output['completed_requests']}")
        print(f" * Pending (In-Queue)       : {output['pending_requests']}")
        print(f" * Overdue SLA Breaches     : {output['overdue_requests']}")
        print(f" * Overall Compliance Rate  : {output['sla_compliance_rate']}%")
        print(f" * Active Processing Officers: {output['active_officers_count']}")
        print("------------------------------------------------------------")
        print(" [Officer Workload Summary]")
        if not output["officers"]:
            print("   No active officers assigned.")
        else:
            for off in output["officers"]:
                print(
                    f"   * {off['name']} ({off['email']}): "
                    f"{off['assigned']} assigned, {off['completed']} done, {off['overdue']} overdue"
                )
        print("============================================================")
        return output
    finally:
        if close_db:
            db.close()


def run_scan(db: Optional[Session] = None) -> Dict[str, Any]:
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True

    try:
        scanned, new_count, alerts = scan_and_create_alerts(db)

        print("============================================================")
        print("              SLA BREACH SCAN EXECUTED                     ")
        print("============================================================")
        print(f" * Scanned Active Requests  : {scanned}")
        print(f" * New Delay Alerts Generated: {new_count}")
        print("------------------------------------------------------------")
        if new_count == 0:
            print(" No new delay alerts generated. Active files within SLA.")
        else:
            for idx, a in enumerate(alerts, 1):
                req_ref = a.request.reference if a.request else f"Req#{a.request_id}"
                print(f"  [{idx}] Ref: {req_ref} | Level: {a.level}")
        print("============================================================")

        return {
            "scanned_count": scanned,
            "new_alerts_count": new_count,
            "alerts": [
                {
                    "request_id": a.request_id,
                    "reference": a.request.reference if a.request else None,
                    "level": a.level,
                }
                for a in alerts
            ],
        }
    finally:
        if close_db:
            db.close()


def run_export(
    db: Optional[Session] = None,
    output_format: str = "csv",
    output_path: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> str:
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True

    try:
        query = db.query(ServiceRequest)
        if status_filter:
            query = query.filter(ServiceRequest.status == status_filter.upper())

        requests: List[ServiceRequest] = query.order_by(ServiceRequest.submitted_at.desc()).all()
        now = datetime.now(timezone.utc)

        data = []
        for req in requests:
            is_overdue = False
            if req.status not in TERMINAL_STATUSES:
                due = req.due_date
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                if now > due:
                    is_overdue = True

            data.append(
                {
                    "reference": req.reference,
                    "service_code": req.service.code if req.service else "",
                    "service_name": req.service.name if req.service else "",
                    "status": req.status,
                    "citizen_email": req.citizen.email if req.citizen else "",
                    "citizen_name": req.citizen.full_name if req.citizen else "",
                    "assigned_officer": (
                        req.assigned_officer.email if req.assigned_officer else "UNASSIGNED"
                    ),
                    "submitted_at": req.submitted_at.isoformat() if req.submitted_at else "",
                    "due_date": req.due_date.isoformat() if req.due_date else "",
                    "updated_at": req.updated_at.isoformat() if req.updated_at else "",
                    "is_overdue": is_overdue,
                    "notes": req.notes or "",
                }
            )

        if not output_path:
            timestamp = now.strftime("%Y%m%d_%H%M%S")
            reports_dir = os.path.join(os.getcwd(), "reports")
            os.makedirs(reports_dir, exist_ok=True)
            output_path = os.path.join(
                reports_dir, f"compliance_export_{timestamp}.{output_format.lower()}"
            )
        else:
            parent = os.path.dirname(os.path.abspath(output_path))
            if parent:
                os.makedirs(parent, exist_ok=True)

        if output_format.lower() == "json":
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        else:
            with open(output_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=[
                        "reference",
                        "service_code",
                        "service_name",
                        "status",
                        "citizen_email",
                        "citizen_name",
                        "assigned_officer",
                        "submitted_at",
                        "due_date",
                        "updated_at",
                        "is_overdue",
                        "notes",
                    ],
                )
                writer.writeheader()
                for row in data:
                    writer.writerow(row)

        print(f"[EXPORT SUCCESS] Saved {len(data)} records to: {output_path}")
        return output_path
    finally:
        if close_db:
            db.close()


def run_list_overdue(db: Optional[Session] = None) -> List[Dict[str, Any]]:
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True

    try:
        reports = get_delay_report(db)
        output = []

        print(
            "========================================================================================="
        )
        print(
            "                      CITIZEN SERVICE DESK -- DELAY RADAR                                "
        )
        print(
            "========================================================================================="
        )
        header_fmt = "{:<16} | {:<22} | {:<12} | {:<16} | {:<15}"
        print(header_fmt.format("Reference", "Service", "Delay Hours", "Severity Level", "Status"))
        print("-" * 89)

        if not reports:
            print(" No delayed or overdue applications found. All files are within target SLA.")
        else:
            for item in reports:
                print(
                    header_fmt.format(
                        item.reference,
                        item.service_name[:20],
                        str(item.delay_hours),
                        item.level,
                        item.status,
                    )
                )
                output.append(
                    {
                        "reference": item.reference,
                        "service_name": item.service_name,
                        "delay_hours": item.delay_hours,
                        "level": item.level,
                        "status": item.status,
                    }
                )
        print(
            "========================================================================================="
        )
        return output
    finally:
        if close_db:
            db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Citizen Service Desk — Server Administrator & DevOps CLI"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: status
    subparsers.add_parser("status", help="Display overall system health and SLA compliance KPIs")

    # Subcommand: scan
    subparsers.add_parser("scan", help="Execute immediate SLA workday breach scan across all files")

    # Subcommand: export
    export_parser = subparsers.add_parser(
        "export", help="Export service requests and compliance audit history to CSV or JSON"
    )
    export_parser.add_argument(
        "--format",
        choices=["csv", "json"],
        default="csv",
        help="Export format (csv or json). Default: csv",
    )
    export_parser.add_argument(
        "--output", type=str, default=None, help="Target file path for exported report"
    )
    export_parser.add_argument(
        "--status",
        type=str,
        default=None,
        help="Optional status filter (e.g. SUBMITTED, COMPLETED)",
    )

    # Subcommand: list-overdue
    subparsers.add_parser(
        "list-overdue", help="Print table of overdue applications flagged by SLA radar"
    )

    args = parser.parse_args()

    if args.command == "status":
        run_status()
    elif args.command == "scan":
        run_scan()
    elif args.command == "export":
        run_export(output_format=args.format, output_path=args.output, status_filter=args.status)
    elif args.command == "list-overdue":
        run_list_overdue()


if __name__ == "__main__":
    main()
