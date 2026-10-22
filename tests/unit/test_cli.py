import os
import sys

from scripts.cli import main, run_export, run_list_overdue, run_scan, run_status


def test_cli_status(db_session, seed_data):
    # Execute status function on test database
    output = run_status(db=db_session)
    assert output is not None
    assert "total_requests" in output
    assert "completed_requests" in output
    assert "sla_compliance_rate" in output
    assert output["total_requests"] >= 0


def test_cli_scan(db_session, seed_data):
    # Execute scan function
    scan_res = run_scan(db=db_session)
    assert "scanned_count" in scan_res
    assert "new_alerts_count" in scan_res
    assert scan_res["scanned_count"] >= 0


def test_cli_export_csv_and_json(db_session, seed_data, tmp_path):
    csv_file = str(tmp_path / "test_report.csv")
    json_file = str(tmp_path / "test_report.json")

    # Export to CSV
    csv_out = run_export(db=db_session, output_format="csv", output_path=csv_file)
    assert os.path.exists(csv_out)
    with open(csv_out, "r", encoding="utf-8") as f:
        content = f.read()
        assert "reference" in content
        assert "service_code" in content

    # Export to JSON
    json_out = run_export(db=db_session, output_format="json", output_path=json_file)
    assert os.path.exists(json_out)
    with open(json_out, "r", encoding="utf-8") as f:
        content = f.read()
        assert "[" in content


def test_cli_list_overdue(db_session, seed_data):
    overdue_list = run_list_overdue(db=db_session)
    assert isinstance(overdue_list, list)


def test_cli_main_argument_dispatch(monkeypatch):
    called = []

    def mock_status():
        called.append("status")

    monkeypatch.setattr("scripts.cli.run_status", mock_status)
    monkeypatch.setattr(sys, "argv", ["cli.py", "status"])
    main()
    assert "status" in called
