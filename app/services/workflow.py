from typing import Dict, Set

# All recognized workflow states
STATUS_SUBMITTED = "SUBMITTED"
STATUS_UNDER_REVIEW = "UNDER_REVIEW"
STATUS_NEEDS_INFO = "NEEDS_INFO"
STATUS_APPROVED = "APPROVED"
STATUS_COMPLETED = "COMPLETED"
STATUS_REJECTED = "REJECTED"
STATUS_CANCELLED = "CANCELLED"

ALL_STATUSES = {
    STATUS_SUBMITTED,
    STATUS_UNDER_REVIEW,
    STATUS_NEEDS_INFO,
    STATUS_APPROVED,
    STATUS_COMPLETED,
    STATUS_REJECTED,
    STATUS_CANCELLED,
}

TERMINAL_STATUSES = {
    STATUS_COMPLETED,
    STATUS_REJECTED,
    STATUS_CANCELLED,
}

# Role definitions
ROLE_CITIZEN = "CITIZEN"
ROLE_OFFICER = "OFFICER"
ROLE_SUPERVISOR = "SUPERVISOR"

# Transition graph: (current_status, target_status) -> allowed_rules
# Each rule is a set of roles or "OWNER_CITIZEN"
VALID_TRANSITIONS: Dict[str, Dict[str, Set[str]]] = {
    STATUS_SUBMITTED: {
        STATUS_UNDER_REVIEW: {ROLE_OFFICER, ROLE_SUPERVISOR},
        STATUS_CANCELLED: {"OWNER_CITIZEN", ROLE_SUPERVISOR},
    },
    STATUS_UNDER_REVIEW: {
        STATUS_NEEDS_INFO: {ROLE_OFFICER, ROLE_SUPERVISOR},
        STATUS_APPROVED: {ROLE_OFFICER, ROLE_SUPERVISOR},
        STATUS_REJECTED: {ROLE_OFFICER, ROLE_SUPERVISOR},
        STATUS_CANCELLED: {ROLE_SUPERVISOR},
    },
    STATUS_NEEDS_INFO: {
        STATUS_UNDER_REVIEW: {"OWNER_CITIZEN", ROLE_OFFICER, ROLE_SUPERVISOR},
        STATUS_CANCELLED: {"OWNER_CITIZEN", ROLE_SUPERVISOR},
    },
    STATUS_APPROVED: {
        STATUS_COMPLETED: {ROLE_OFFICER, ROLE_SUPERVISOR},
    },
    STATUS_COMPLETED: {},
    STATUS_REJECTED: {},
    STATUS_CANCELLED: {},
}


class WorkflowError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def validate_transition(
    current_status: str,
    target_status: str,
    caller_role: str,
    is_owner: bool = False,
) -> None:
    """Validate whether transitioning from current_status to target_status is allowed

    for the given caller_role and ownership. Raises WorkflowError if illegal.
    """
    if current_status not in ALL_STATUSES:
        raise WorkflowError("invalid_status", f"Unknown current status '{current_status}'")

    if target_status not in ALL_STATUSES:
        raise WorkflowError("invalid_status", f"Unknown target status '{target_status}'")

    if current_status in TERMINAL_STATUSES:
        raise WorkflowError(
            "terminal_state",
            f"Cannot transition from terminal status '{current_status}'",
        )

    allowed_targets = VALID_TRANSITIONS.get(current_status, {})
    if target_status not in allowed_targets:
        raise WorkflowError(
            "illegal_transition",
            f"Transition from '{current_status}' to '{target_status}' is not allowed",
        )

    allowed_callers = allowed_targets[target_status]
    can_act = False

    if caller_role in allowed_callers:
        can_act = True
    elif "OWNER_CITIZEN" in allowed_callers and caller_role == ROLE_CITIZEN and is_owner:
        can_act = True

    if not can_act:
        raise WorkflowError(
            "unauthorized_transition",
            f"Role '{caller_role}' is not authorized to transition from '{current_status}' to '{target_status}'",
        )
