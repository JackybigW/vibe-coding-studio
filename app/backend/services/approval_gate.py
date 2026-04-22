"""Approval gate for pre-approval write enforcement."""


class ApprovalGate:
    """Tracks whether draft_plan has been approved for the current session."""

    def __init__(self, requires_approval: bool = False):
        self.requires_approval = requires_approval
        self._approved = False

    def approve(self) -> None:
        self._approved = True

    @property
    def is_locked(self) -> bool:
        """True if writes should be blocked (approval required but not yet granted)."""
        return self.requires_approval and not self._approved

    def check_write(self, path) -> None:
        """Raise ToolError if writes are not yet permitted."""
        if self.is_locked:
            from openmanus_runtime.exceptions import ToolError
            raise ToolError(
                "Implementation writes are not allowed until the draft plan is approved. "
                "Call draft_plan first and wait for user approval."
            )
