"""Approval gate for pre-approval write enforcement."""


class ApprovalGate:
    """Tracks draft_plan approval and implementation-plan authorship for a session."""

    def __init__(self, requires_approval: bool = False):
        self.requires_approval = requires_approval
        self._approved = False
        self._plan_written = False

    def approve(self) -> None:
        self._approved = True

    def record_plan_written(self) -> None:
        """Called when the agent writes any file under docs/plans/."""
        self._plan_written = True

    @property
    def is_locked(self) -> bool:
        """True if writes should be blocked (approval required but not yet granted)."""
        return self.requires_approval and not self._approved

    @property
    def plan_required_but_not_written(self) -> bool:
        """True if an implementation plan is expected but has not been written yet."""
        return self.requires_approval and self._approved and not self._plan_written

    def check_write(self, path) -> None:
        """Raise ToolError if writes are not yet permitted."""
        if self.is_locked:
            from openmanus_runtime.exceptions import ToolError
            raise ToolError(
                "Implementation writes are not allowed until the draft plan is approved. "
                "Call draft_plan first and wait for user approval."
            )

    def check_todo_write(self) -> None:
        """Raise ToolError if todo_write is called before an implementation plan exists."""
        if self.plan_required_but_not_written:
            from openmanus_runtime.exceptions import ToolError
            raise ToolError(
                "Write an implementation plan to docs/plans/YYYY-MM-DD-{feature}.md first. "
                "Use str_replace_editor to create the plan file, then call todo_write."
            )
