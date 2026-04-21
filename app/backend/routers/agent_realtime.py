from fastapi import APIRouter, Depends, WebSocket

from dependencies.auth import get_current_user
from schemas.agent_realtime import (
    AgentRealtimeErrorPayload,
    AgentSessionStatePayload,
    AgentSessionTicketRequest,
    AgentSessionTicketResponse,
)
from schemas.auth import UserResponse
from services.agent_realtime import get_agent_realtime_service


router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


@router.post("/session-ticket", response_model=AgentSessionTicketResponse)
async def issue_session_ticket(
    request: AgentSessionTicketRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    ticket = await get_agent_realtime_service().issue_ticket(user_id=current_user.id, project_id=request.project_id)
    return AgentSessionTicketResponse(
        ticket=ticket.ticket,
        project_id=ticket.project_id,
        expires_at=ticket.expires_at,
    )


@router.websocket("/session/ws")
async def agent_session_websocket(websocket: WebSocket):
    ticket_value = websocket.query_params.get("ticket")
    await websocket.accept()

    ticket_service = get_agent_realtime_service()
    ticket = await ticket_service.consume_ticket(ticket_value or "")
    if ticket is None:
        await websocket.send_json(AgentRealtimeErrorPayload().model_dump())
        await websocket.close(code=1008)
        return

    await websocket.send_json(
        AgentSessionStatePayload(project_id=ticket.project_id).model_dump()
    )
