from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models.newsletter import NewsletterSubscriber

router = APIRouter(tags=["newsletter"])


class NewsletterSubscriptionInput(BaseModel):
    email: EmailStr
    consent: bool


@router.post("/api/newsletter/subscribe")
def subscribe_newsletter(
    payload: NewsletterSubscriptionInput,
    request: Request,
    db: Session = Depends(get_db),
):
    """Store a visitor's explicit opt-in for future Leonard Tour travel updates."""
    if payload.consent is not True:
        raise HTTPException(422, "Please confirm that you agree to receive travel updates.")

    ip = request.client.host if request.client else "unknown"
    if not limiter.hit(f"newsletter-subscribe:{ip}", limit=5, window_seconds=3600):
        raise HTTPException(429, "Too many subscription attempts. Please try again later.")

    email = str(payload.email).strip().lower()
    existing = db.scalar(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )

    if existing is not None:
        if existing.is_active:
            return {
                "status": "already_subscribed",
                "message": "This email is already subscribed.",
            }
        existing.is_active = True
        existing.subscribed_at = func.now()
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        return {
            "status": "subscribed",
            "message": "Thank you. Your email has been added to our travel updates list.",
        }

    subscriber = NewsletterSubscriber(email=email, is_active=True, source="homepage_footer")
    db.add(subscriber)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # A simultaneous request may have created the same normalized email.
        existing = db.scalar(
            select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
        )
        if existing is not None and existing.is_active:
            return {
                "status": "already_subscribed",
                "message": "This email is already subscribed.",
            }
        raise HTTPException(409, "The subscription could not be saved. Please try again.")
    except Exception:
        db.rollback()
        raise

    return {
        "status": "subscribed",
        "message": "Thank you. Your email has been added to our travel updates list.",
    }
