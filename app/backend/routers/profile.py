import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from services.profile_service import ProfileService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


@router.get("/me")
async def get_my_profile(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get or create the current user's profile"""
    user_id = getattr(request.state, "user_id", None)
    user_email = getattr(request.state, "user_email", None)

    if not user_id:
        return {"error": "Not authenticated", "status": 401}

    service = ProfileService(db)
    profile = await service.get_or_create_profile(user_id, user_email)
    return profile