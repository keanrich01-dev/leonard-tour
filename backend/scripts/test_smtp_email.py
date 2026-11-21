"""Send a real SMTP test message to each configured Mangokili admin recipient."""
from email.message import EmailMessage
from email.utils import formataddr
import sys

from app.core.config import settings
from app.emails.transport import EmailSendError, send


def main() -> int:
    if settings.email_backend != "smtp":
        print("ERROR: EMAIL_BACKEND is not set to smtp. Configure Gmail SMTP first.")
        return 2
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        print("ERROR: SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be configured.")
        return 2
    recipients = settings.admin_emails
    if not recipients:
        print("ERROR: ADMIN_NOTIFY_EMAILS is empty.")
        return 2

    sent = 0
    for recipient in recipients:
        message = EmailMessage()
        message["Subject"] = "Mangokili Adventures — email delivery test"
        message["From"] = formataddr((settings.email_from_name, settings.email_from))
        message["To"] = recipient
        message["X-Mangokili-Kind"] = "smtp_test"
        message["Auto-Submitted"] = "auto-generated"
        message.set_content(
            "This is a test message from Mangokili Adventures.\n\n"
            "Your SMTP configuration is working: the mail server accepted this message.\n"
            "Please check your inbox and spam folder.\n"
        )
        try:
            send(message)
            sent += 1
            print(f"SMTP ACCEPTED: {recipient}")
        except EmailSendError as exc:
            print(f"SMTP FAILED for {recipient}: {exc}")
            return 1
        except Exception as exc:  # Defensive: never print configuration secrets.
            print(f"SMTP FAILED for {recipient}: {type(exc).__name__}: {exc}")
            return 1

    print(f"SUCCESS: SMTP server accepted {sent} test message(s). Check the recipient inbox/spam folder.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
