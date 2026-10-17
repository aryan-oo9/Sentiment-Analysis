import os
import json
import logging
import urllib.request
import urllib.error
from .config import Config

logger = logging.getLogger("tweetsense.email")

def send_password_reset_email(to_email: str, raw_token: str, frontend_url: str = None) -> bool:
    """
    Dispatches a transactional password reset email via Resend API.
    Returns True if sent successfully, False otherwise.
    """
    api_key = Config.RESEND_API_KEY.strip()
    if not api_key:
        logger.info("RESEND_API_KEY is not configured; email dispatch skipped.")
        return False

    base_frontend = (frontend_url or Config.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    reset_url = f"{base_frontend}/reset-password?token={raw_token}"
    email_from = Config.EMAIL_FROM or "TweetSense <onboarding@resend.dev>"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your TweetSense Password</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #faf9f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 2px solid #111111; padding: 36px 28px; box-shadow: 6px 6px 0px #111111;">
    
    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #767676; margin-bottom: 12px;">
      TWEETSENSE &bull; ACCOUNT SECURITY
    </div>

    <h1 style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin: 0 0 16px 0; color: #111111; line-height: 1.2;">
      Reset Your Password
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: #333333; margin: 0 0 24px 0;">
      A password reset request was initiated for your TweetSense account (<strong>{to_email}</strong>). Click the button below to choose a new password.
    </p>

    <div style="margin: 28px 0;">
      <a href="{reset_url}" target="_blank" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 14px 28px; font-size: 13px; font-weight: 700; text-transform: uppercase; text-decoration: none; letter-spacing: 0.5px; border-radius: 0px;">
        Set New Password &rarr;
      </a>
    </div>

    <p style="font-size: 12px; line-height: 1.5; color: #666666; margin: 24px 0 0 0;">
      This password reset link will expire in <strong>15 minutes</strong> and can only be used once. If you did not request a password reset, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />

    <p style="font-size: 11px; line-height: 1.5; color: #999999; margin: 0; word-break: break-all;">
      Button not working? Copy and paste this URL into your browser:<br/>
      <a href="{reset_url}" style="color: #111111; text-decoration: underline;">{reset_url}</a>
    </p>

  </div>
</body>
</html>"""

    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": "Reset your TweetSense password",
        "html": html_content
    }

    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "resend-python/2.6.0"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"Password reset email sent to {to_email} via Resend. HTTP {resp.status}")
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode() if e.fp else str(e)
        logger.error(f"Resend HTTP error ({e.code}): {err_msg}")
        return False
    except Exception as e:
        logger.error(f"Failed to dispatch reset email via Resend: {e}")
        return False
