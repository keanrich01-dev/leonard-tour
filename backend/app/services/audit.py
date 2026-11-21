from sqlalchemy.orm import Session

from app.models import AuditLog


def audit(db: Session, *, user_id: int | None, action: str, entity_type: str,
          entity_id: str | int | None = None, before: dict | None = None,
          after: dict | None = None, ip: str | None = None) -> None:
    """Append an audit row (caller commits). Never pass passwords, tokens or secrets here."""
    db.add(AuditLog(user_id=user_id, action=action, entity_type=entity_type,
                    entity_id=None if entity_id is None else str(entity_id),
                    before=before, after=after, ip_address=ip))
