import pytest

from app.services.workflow import (
    ROLE_CITIZEN,
    ROLE_OFFICER,
    ROLE_SUPERVISOR,
    STATUS_APPROVED,
    STATUS_CANCELLED,
    STATUS_COMPLETED,
    STATUS_NEEDS_INFO,
    STATUS_REJECTED,
    STATUS_SUBMITTED,
    STATUS_UNDER_REVIEW,
    WorkflowError,
    validate_transition,
)


def test_valid_transitions_for_officer():
    # SUBMITTED -> UNDER_REVIEW
    validate_transition(STATUS_SUBMITTED, STATUS_UNDER_REVIEW, ROLE_OFFICER)
    # UNDER_REVIEW -> NEEDS_INFO
    validate_transition(STATUS_UNDER_REVIEW, STATUS_NEEDS_INFO, ROLE_OFFICER)
    # UNDER_REVIEW -> APPROVED
    validate_transition(STATUS_UNDER_REVIEW, STATUS_APPROVED, ROLE_OFFICER)
    # UNDER_REVIEW -> REJECTED
    validate_transition(STATUS_UNDER_REVIEW, STATUS_REJECTED, ROLE_OFFICER)
    # APPROVED -> COMPLETED
    validate_transition(STATUS_APPROVED, STATUS_COMPLETED, ROLE_OFFICER)


def test_valid_transitions_for_citizen_owner():
    # Citizen can cancel own submitted request
    validate_transition(STATUS_SUBMITTED, STATUS_CANCELLED, ROLE_CITIZEN, is_owner=True)
    # Citizen can transition NEEDS_INFO back to UNDER_REVIEW
    validate_transition(STATUS_NEEDS_INFO, STATUS_UNDER_REVIEW, ROLE_CITIZEN, is_owner=True)


def test_unauthorized_transitions():
    # Citizen cannot approve or review
    with pytest.raises(WorkflowError) as exc:
        validate_transition(STATUS_SUBMITTED, STATUS_UNDER_REVIEW, ROLE_CITIZEN)
    assert exc.value.code == "unauthorized_transition"

    # Non-owner citizen cannot cancel
    with pytest.raises(WorkflowError) as exc:
        validate_transition(STATUS_SUBMITTED, STATUS_CANCELLED, ROLE_CITIZEN, is_owner=False)
    assert exc.value.code == "unauthorized_transition"

    # Officer cannot cancel under review (only supervisor can)
    with pytest.raises(WorkflowError) as exc:
        validate_transition(STATUS_UNDER_REVIEW, STATUS_CANCELLED, ROLE_OFFICER)
    assert exc.value.code == "unauthorized_transition"


def test_illegal_state_jumps():
    # Cannot jump from SUBMITTED directly to COMPLETED
    with pytest.raises(WorkflowError) as exc:
        validate_transition(STATUS_SUBMITTED, STATUS_COMPLETED, ROLE_SUPERVISOR)
    assert exc.value.code == "illegal_transition"


def test_terminal_states_cannot_transition():
    for terminal in [STATUS_COMPLETED, STATUS_REJECTED, STATUS_CANCELLED]:
        with pytest.raises(WorkflowError) as exc:
            validate_transition(terminal, STATUS_UNDER_REVIEW, ROLE_SUPERVISOR)
        assert exc.value.code == "terminal_state"


def test_invalid_status_strings():
    with pytest.raises(WorkflowError) as exc:
        validate_transition("FOO", STATUS_UNDER_REVIEW, ROLE_SUPERVISOR)
    assert exc.value.code == "invalid_status"

    with pytest.raises(WorkflowError) as exc:
        validate_transition(STATUS_SUBMITTED, "BAR", ROLE_SUPERVISOR)
    assert exc.value.code == "invalid_status"
