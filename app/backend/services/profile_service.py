import logging
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)

DEFAULT_CREDITS = 25
DEFAULT_PLAN = "free"


class ProfileService:
    """Service for user profile operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_profile(self, user_id: str, email: Optional[str] = None) -> Dict[str, Any]:
        """Get existing profile or create a new one with default credits"""
        stmt = select(User_profiles).where(User_profiles.user_id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()

        if profile:
            return {
                "id": profile.id,
                "user_id": profile.user_id,
                "display_name": profile.display_name,
                "avatar_url": profile.avatar_url,
                "credits": profile.credits,
                "plan": profile.plan,
                "created_at": str(profile.created_at) if profile.created_at else None,
            }

        # Create new profile
        display_name = email.split("@")[0] if email else "User"
        new_profile = User_profiles(
            user_id=user_id,
            display_name=display_name,
            avatar_url="",
            credits=DEFAULT_CREDITS,
            plan=DEFAULT_PLAN,
        )
        self.db.add(new_profile)
        await self.db.commit()
        await self.db.refresh(new_profile)

        return {
            "id": new_profile.id,
            "user_id": new_profile.user_id,
            "display_name": new_profile.display_name,
            "avatar_url": new_profile.avatar_url,
            "credits": new_profile.credits,
            "plan": new_profile.plan,
            "created_at": str(new_profile.created_at) if new_profile.created_at else None,
        }

    async def update_credits(self, user_id: str, credits: int) -> Optional[Dict[str, Any]]:
        """Update user credits"""
        stmt = select(User_profiles).where(User_profiles.user_id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        profile.credits = credits
        await self.db.commit()
        await self.db.refresh(profile)

        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "credits": profile.credits,
        }