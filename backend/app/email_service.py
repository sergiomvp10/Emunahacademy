import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)

# SMTP configuration for Microsoft 365
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.office365.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "admin@emunahacademy.org")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@emunahacademy.org")

# Track sent confirmation emails to prevent duplicates (in-memory for now)
_sent_confirmations: set[str] = set()


def _build_parent_confirmation_html(parent_name: str, student_name: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background: linear-gradient(135deg, #14b8a6, #2563eb); padding:32px 40px; text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">Emunah Academy</h1>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:40px;">
      <h2 style="margin:0 0 24px 0;color:#1f2937;font-size:20px;">Application Received</h2>
      <p style="margin:0 0 16px 0;color:#374151;font-size:16px;line-height:1.6;">
        Dear {parent_name},
      </p>
      <p style="margin:0 0 16px 0;color:#374151;font-size:16px;line-height:1.6;">
        Thank you for submitting your application to Emunah Academy.
      </p>
      <p style="margin:0 0 16px 0;color:#374151;font-size:16px;line-height:1.6;">
        We have successfully received your application for <strong>{student_name}</strong>
        and our admissions team will review it shortly.
      </p>
      <p style="margin:0 0 16px 0;color:#374151;font-size:16px;line-height:1.6;">
        If we need additional information we will contact you soon.
      </p>
      <p style="margin:24px 0 0 0;color:#374151;font-size:16px;line-height:1.6;">
        Blessings,<br>
        <strong>Admissions Office</strong><br>
        Emunah Academy
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        Emunah Academy &mdash; Nurturing minds, building futures.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _build_admin_notification_html(
    student_name: str,
    student_age: int,
    grade_level: str,
    parent_name: str,
    parent_email: str,
    parent_phone: str,
    address: str,
    message: Optional[str],
    has_esa: bool,
) -> str:
    message_row = ""
    if message:
        message_row = f"""
      <tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:160px;">Message</td>
        <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{message}</td>
      </tr>"""

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background-color:#1f2937;padding:24px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">New Application Submitted</h1>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px 40px;">
      <p style="margin:0 0 20px 0;color:#374151;font-size:15px;">
        A new student application has been submitted through the website.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:160px;">Student Name</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;font-weight:bold;">{student_name}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Student Age</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{student_age}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Grade Level</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{grade_level}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Parent Name</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{parent_name}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Parent Email</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;"><a href="mailto:{parent_email}" style="color:#2563eb;">{parent_email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Parent Phone</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{parent_phone}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Address</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{address}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">ESA</td>
          <td style="padding:8px 12px;color:#1f2937;font-size:14px;border-bottom:1px solid #f3f4f6;">{"Yes" if has_esa else "No"}</td>
        </tr>{message_row}
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        Emunah Academy &mdash; Internal notification
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success, False on failure."""
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not configured — skipping email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"Emunah Academy <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Email sent successfully to %s — subject: %s", to_email, subject)
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed for %s — check SMTP_USER / SMTP_PASSWORD", SMTP_USER)
        return False
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending email to %s: %s", to_email, exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error sending email to %s: %s", to_email, exc)
        return False


def send_application_confirmation(
    parent_name: str,
    parent_email: str,
    student_name: str,
    application_id: int,
) -> dict:
    """
    Send confirmation email to parent after application submission.
    Returns a dict with delivery status for both emails.
    Uses application_id + parent_email as dedup key to prevent duplicate sends.
    """
    dedup_key = f"{application_id}:{parent_email}"
    if dedup_key in _sent_confirmations:
        logger.info("Duplicate send prevented for application %d to %s", application_id, parent_email)
        return {"parent_email_sent": False, "admin_email_sent": False, "duplicate": True}

    # Mark as sent before attempting (prevents race conditions on double-submit)
    _sent_confirmations.add(dedup_key)

    parent_sent = _send_email(
        to_email=parent_email,
        subject="Application Received \u2013 Emunah Academy",
        html_body=_build_parent_confirmation_html(parent_name, student_name),
    )

    return {"parent_email_sent": parent_sent, "admin_email_sent": False, "duplicate": False}


def send_admin_notification(
    student_name: str,
    student_age: int,
    grade_level: str,
    parent_name: str,
    parent_email: str,
    parent_phone: str,
    address: str,
    message: Optional[str],
    has_esa: bool,
) -> bool:
    """Send internal notification email to admin about a new application."""
    return _send_email(
        to_email=ADMIN_EMAIL,
        subject="New Application Submitted",
        html_body=_build_admin_notification_html(
            student_name=student_name,
            student_age=student_age,
            grade_level=grade_level,
            parent_name=parent_name,
            parent_email=parent_email,
            parent_phone=parent_phone,
            address=address,
            message=message,
            has_esa=has_esa,
        ),
    )
