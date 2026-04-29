"""Email service using Resend API."""
import logging
import os

logger = logging.getLogger(__name__)


class EmailService:
    """Thin wrapper around Resend REST API for transactional emails."""

    def __init__(self) -> None:
        self._api_key: str = os.environ.get("RESEND_API_KEY", "")
        self._from_address: str = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")
        self._frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    @property
    def _is_configured(self) -> bool:
        return bool(self._api_key and not self._api_key.startswith("re_placeholder"))

    async def send_verification_email(self, to_email: str, token: str) -> None:
        """Send email verification link."""
        verify_url = f"{self._frontend_url}/auth/verify-email?token={token}"
        logger.info("\n" + "="*60 + "\n[DEV] Verification Link for %s:\n%s\n" + "="*60, to_email, verify_url)
        subject = "Verify your Vibe Coding Studio account"
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#7C3AED">Welcome to Vibe Coding Studio</h2>
          <p>Click the button below to verify your email address.</p>
          <a href="{verify_url}"
             style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;
                    border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Verify Email
          </a>
          <p style="color:#888;font-size:13px">This link expires in 24 hours.<br>
          If you didn't create a Vibe Coding Studio account, ignore this email.</p>
        </div>
        """
        await self._send(to_email, subject, html)

    async def send_password_reset_email(self, to_email: str, token: str) -> None:
        """Send password reset link."""
        reset_url = f"{self._frontend_url}/reset-password?token={token}"
        logger.info("\n" + "="*60 + "\n[DEV] Password Reset Link for %s:\n%s\n" + "="*60, to_email, reset_url)
        subject = "Reset your Vibe Coding Studio password"
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#7C3AED">Reset your password</h2>
          <p>Click the button below to set a new password for your Vibe Coding Studio account.</p>
          <a href="{reset_url}"
             style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;
                    border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#888;font-size:13px">This link expires in 1 hour.<br>
          If you didn't request a password reset, ignore this email.</p>
        </div>
        """
        await self._send(to_email, subject, html)

    async def _send(self, to: str, subject: str, html: str) -> None:
        if not self._is_configured:
            logger.warning(
                "RESEND_API_KEY not configured — skipping email to %s (subject: %s). "
                "Set RESEND_API_KEY in .env to enable real email delivery.",
                to,
                subject,
            )
            return

        try:
            import resend  # type: ignore[import-untyped]

            resend.api_key = self._api_key
            resend.Emails.send(
                {
                    "from": self._from_address,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                }
            )
            logger.info("Email sent to=%s subject=%s", to, subject)
        except Exception as exc:
            # Log but do NOT raise — email delivery is best-effort.
            # The account is already created; user can request a new link.
            logger.error("Failed to send email to=%s subject=%s error=%s", to, subject, exc)


_email_service: EmailService | None = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
