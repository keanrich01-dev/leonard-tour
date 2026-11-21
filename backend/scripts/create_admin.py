"""Create the first admin (or reset one's password). Run inside the backend container:
    python -m scripts.create_admin you@example.com "Full Name"
The password is typed interactively (never stored in shell history or env)."""
import getpass
import sys

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password, password_problems
from app.models import User
from app.models.enums import Role
from app.services.audit import audit


def main():
    if len(sys.argv) < 3:
        sys.exit('Usage: python -m scripts.create_admin EMAIL "Full Name"')
    email, name = sys.argv[1].lower(), sys.argv[2]
    pw = getpass.getpass("Password (min 12 chars): ")
    if pw != getpass.getpass("Repeat password: "):
        sys.exit("Passwords do not match")
    problems = password_problems(pw, email)
    if problems:
        sys.exit("\n".join(problems))
    db = SessionLocal()
    u = db.scalar(select(User).where(User.email == email))
    action = "user.cli_password_reset" if u else "user.cli_create_admin"
    if u is None:
        u = User(email=email, full_name=name, role=Role.admin)
        db.add(u)
    u.password_hash, u.is_active = hash_password(pw), True
    u.failed_logins, u.locked_until = 0, None
    db.flush()
    audit(db, user_id=u.id, action=action, entity_type="user", entity_id=u.id, after={"email": email})
    db.commit()
    print(f"OK: {email} is an admin. MFA enrollment is required at first login.")


if __name__ == "__main__":
    main()
