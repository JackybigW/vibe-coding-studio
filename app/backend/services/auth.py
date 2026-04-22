import logging
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import bcrypt
from core.auth import create_access_token
from core.config import settings
from core.database import db_manager
from models.auth import EmailVerificationToken, OIDCState, PasswordResetToken, User
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AuthError(Exception):
    """User-facing auth error with HTTP status code."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)



class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_user(self, platform_sub: str, email: str, name: Optional[str] = None) -> User:
        """Get existing user or create new one."""
        start_time = time.time()
        logger.debug(f"[DB_OP] Starting get_or_create_user - platform_sub: {platform_sub}")
        # Try to find existing user
        result = await self.db.execute(select(User).where(User.id == platform_sub))
        user = result.scalar_one_or_none()
        logger.debug(f"[DB_OP] User lookup completed in {time.time() - start_time:.4f}s - found: {user is not None}")

        if user:
            # Update user info if needed
            user.email = email
            user.name = name
            user.last_login = datetime.now(timezone.utc)
        else:
            # Create new user
            user = User(id=platform_sub, email=email, name=name, last_login=datetime.now(timezone.utc))
            self.db.add(user)

        start_time_commit = time.time()
        logger.debug("[DB_OP] Starting user commit/refresh")
        await self.db.commit()
        await self.db.refresh(user)
        logger.debug(f"[DB_OP] User commit/refresh completed in {time.time() - start_time_commit:.4f}s")
        return user

    async def issue_app_token(
        self,
        user: User,
    ) -> Tuple[str, datetime, Dict[str, Any]]:
        """Generate application JWT token for the authenticated user."""
        try:
            expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
        except (TypeError, ValueError):
            logger.warning("Invalid JWT_EXPIRE_MINUTES value; fallback to 60 minutes")
            expires_minutes = 60
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        claims: Dict[str, Any] = {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
        }

        if user.name:
            claims["name"] = user.name
        if user.last_login:
            claims["last_login"] = user.last_login.isoformat()
        token = create_access_token(claims, expires_minutes=expires_minutes)

        return token, expires_at, claims

    async def store_oidc_state(self, state: str, nonce: str, code_verifier: str):
        """Store OIDC state in database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10 minute expiry

        oidc_state = OIDCState(state=state, nonce=nonce, code_verifier=code_verifier, expires_at=expires_at)

        self.db.add(oidc_state)
        await self.db.commit()

    async def get_and_delete_oidc_state(self, state: str) -> Optional[dict]:
        """Get and delete OIDC state from database."""
        # Clean up expired states first
        await self.db.execute(delete(OIDCState).where(OIDCState.expires_at < datetime.now(timezone.utc)))

        # Find and validate state
        result = await self.db.execute(select(OIDCState).where(OIDCState.state == state))
        oidc_state = result.scalar_one_or_none()

        if not oidc_state:
            return None

        # Extract data before deleting
        state_data = {"nonce": oidc_state.nonce, "code_verifier": oidc_state.code_verifier}

        # Delete the used state (one-time use)
        await self.db.delete(oidc_state)
        await self.db.commit()

        return state_data

    # ------------------------------------------------------------------ #
    # Email / password auth                                                #
    # ------------------------------------------------------------------ #

    async def register_with_password(
        self,
        email: str,
        password: str,
        name: Optional[str] = None,
    ) -> User:
        """Create a new email/password user and send a verification email.

        Raises AuthError if the email is already registered.
        """
        existing = await self.db.execute(select(User).where(User.email == email))
        user = existing.scalar_one_or_none()
        
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        if user is not None:
            if user.password_hash:
                raise AuthError("An account with this email already exists. Please log in instead.", status_code=409)
            # Link password to existing OIDC user
            user.password_hash = password_hash
            if not user.name and name:
                user.name = name
            user.is_verified = False
            await self.db.flush()
        else:
            user_id = f"email|{uuid.uuid4().hex}"
            user = User(
                id=user_id,
                email=email,
                name=name or email.split("@")[0],
                password_hash=password_hash,
                is_verified=False,
                last_login=datetime.now(timezone.utc),
            )
            self.db.add(user)
            await self.db.flush()  # get user.id before token creation

        token_str = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        verification = EmailVerificationToken(user_id=user.id, token=token_str, expires_at=expires_at)
        self.db.add(verification)
        await self.db.commit()
        await self.db.refresh(user)

        from services.email_service import get_email_service
        await get_email_service().send_verification_email(email, token_str)

        logger.info("Registered new email user id=%s email=%s", user.id, email)
        return user

    async def resend_verification_email(self, email: str) -> None:
        """Resend verification email if user exists and is not verified."""
        existing = await self.db.execute(select(User).where(User.email == email))
        user = existing.scalar_one_or_none()
        
        if not user or user.is_verified:
            # Silently return to prevent email enumeration
            return
            
        token_str = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        verification = EmailVerificationToken(user_id=user.id, token=token_str, expires_at=expires_at)
        self.db.add(verification)
        await self.db.commit()
        
        from services.email_service import get_email_service
        await get_email_service().send_verification_email(email, token_str)
        logger.info("Resent verification email to user id=%s email=%s", user.id, email)

    async def verify_email(self, token: str) -> User:
        """Mark user as verified.  Raises AuthError on invalid/expired token."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token == token
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise AuthError("Verification link is invalid.", status_code=400)

        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < datetime.now(timezone.utc):
            raise AuthError("Verification link has expired.", status_code=400)

        user_result = await self.db.execute(select(User).where(User.id == record.user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            raise AuthError("User not found.", status_code=404)

        user.is_verified = True
        await self.db.delete(record)
        await self.db.commit()
        await self.db.refresh(user)
        logger.info("Email verified for user id=%s", user.id)
        return user

    async def login_with_password(self, email: str, password: str) -> Tuple[str, datetime, Dict[str, Any]]:
        """Verify credentials and return (jwt_token, expires_at, claims).

        Raises AuthError on bad credentials or unverified email.
        """
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        # Constant-time safe: always check hash even if user not found
        stored = user.password_hash.encode() if user and user.password_hash else None
        
        if stored:
            password_ok = bcrypt.checkpw(password.encode(), stored)
        else:
            # Hash a dummy password to mitigate timing attacks on user enumeration
            bcrypt.hashpw(password.encode(), bcrypt.gensalt())
            password_ok = False

        if not user or not user.password_hash or not password_ok:
            raise AuthError("Incorrect email or password.", status_code=401)

        if not user.is_verified:
            raise AuthError(
                "Please verify your email before signing in. Check your inbox for the verification link.",
                status_code=403,
            )

        user.last_login = datetime.now(timezone.utc)
        await self.db.commit()
        return await self.issue_app_token(user)

    async def forgot_password(self, email: str) -> None:
        """Generate a password reset token and email it.

        Always returns silently — never reveal whether the email is registered.
        """
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or not user.password_hash:
            # Silently ignore unknown emails / OIDC-only users
            return

        # Invalidate previous reset tokens for this user
        await self.db.execute(
            delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )

        token_str = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        reset_token = PasswordResetToken(user_id=user.id, token=token_str, expires_at=expires_at)
        self.db.add(reset_token)
        await self.db.commit()

        from services.email_service import get_email_service
        await get_email_service().send_password_reset_email(email, token_str)
        logger.info("Password reset email sent to=%s", email)

    async def reset_password(self, token: str, new_password: str) -> User:
        """Apply a new password via reset token.  Raises AuthError on invalid/used token."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token == token,
                PasswordResetToken.used == False,  # noqa: E712
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise AuthError("Reset link is invalid or already used.", status_code=400)

        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < datetime.now(timezone.utc):
            raise AuthError("Reset link has expired.", status_code=400)

        user_result = await self.db.execute(select(User).where(User.id == record.user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            raise AuthError("User not found.", status_code=404)

        user.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        record.used = True
        await self.db.commit()
        await self.db.refresh(user)
        logger.info("Password reset for user id=%s", user.id)
        return user



async def initialize_admin_user():
    """Initialize admin user if not exists"""
    if "MGX_IGNORE_INIT_ADMIN" in os.environ:
        logger.info("Ignore initialize admin")
        return

    from services.database import initialize_database

    # Ensure database is initialized first
    await initialize_database()

    admin_user_id = getattr(settings, "admin_user_id", "")
    admin_user_email = getattr(settings, "admin_user_email", "")

    if not admin_user_id or not admin_user_email:
        logger.warning("Admin user ID or email not configured, skipping admin initialization")
        return

    async with db_manager.async_session_maker() as db:
        # Check if admin user already exists
        result = await db.execute(select(User).where(User.id == admin_user_id))
        user = result.scalar_one_or_none()

        if user:
            # Update existing user to admin if not already
            if user.role != "admin":
                user.role = "admin"
                user.email = admin_user_email  # Update email too
                await db.commit()
                logger.debug(f"Updated user {admin_user_id} to admin role")
            else:
                logger.debug(f"Admin user {admin_user_id} already exists")
        else:
            # Create new admin user
            admin_user = User(id=admin_user_id, email=admin_user_email, role="admin")
            db.add(admin_user)
            await db.commit()
            logger.debug(f"Created admin user: {admin_user_id} with email: {admin_user_email}")
