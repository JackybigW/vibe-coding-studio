from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AgentSessionTicketRequest(BaseModel):
    project_id: int = Field(..., ge=1, description="Project to bind the realtime session ticket to.")


class AgentSessionTicketResponse(BaseModel):
    ticket: str = Field(..., description="Short-lived realtime session ticket.")
    project_id: int = Field(..., description="Project bound to the ticket.")
    expires_at: datetime = Field(..., description="Ticket expiration timestamp.")


class AgentSessionStatePayload(BaseModel):
    type: Literal["session.state"] = "session.state"
    status: Literal["idle"] = "idle"
    project_id: int
    assistant_role: Literal["engineer"] = "engineer"


class AgentRealtimeErrorPayload(BaseModel):
    type: Literal["error"] = "error"
    code: Literal["invalid_ticket"] = "invalid_ticket"
