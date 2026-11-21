import time

import pyotp
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.models import AuditLog, User
from app.models.enums import Role
from tests.conftest import make_user

PW = "correct horse battery staple"


def login(client, email="boss@example.com", pw=PW):
    return client.post("/api/admin/auth/login", json={"email": email, "password": pw})


def enroll(client):
    """Full first-login flow for a staff member; returns (totp, recovery_codes)."""
    r = login(client)
    assert r.status_code == 200 and r.json()["mfa_setup_required"]
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    secret = client.post("/api/admin/auth/mfa/setup").json()["secret"]
    totp = pyotp.TOTP(secret)
    r = client.post("/api/admin/auth/mfa/enable", json={"code": totp.now()})
    assert r.status_code == 200, r.text
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    return totp, r.json()["recovery_codes"]


@pytest.fixture()
def admin(db):
    return make_user(db, "boss@example.com", Role.admin)


# ---------- passwords & login ----------
def test_password_is_argon2id(admin):
    assert admin.password_hash.startswith("$argon2id$")


def test_login_error_is_generic_for_unknown_and_wrong_password(client, admin):
    a = login(client, "nobody@example.com", PW)
    b = login(client, "boss@example.com", "wrong password here")
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


def test_customer_cannot_log_into_admin(client, db):
    make_user(db, "cust@example.com", Role.customer)
    assert login(client, "cust@example.com").status_code == 401


# ---------- MFA ----------
def test_staff_must_enroll_mfa_before_any_protected_action(client, admin):
    r = login(client)
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    assert client.get("/api/admin/users").status_code == 403  # password alone is not enough


def test_mfa_enroll_then_access_and_secret_encrypted_at_rest(client, admin, db):
    enroll(client)
    assert client.get("/api/admin/users").status_code == 200
    db.refresh(admin)
    assert admin.mfa_secret_enc and admin.mfa_secret_enc.startswith("gAAAA")  # Fernet token, not raw base32
    assert all(len(h) == 64 for h in admin.mfa_recovery_hashes)  # recovery codes stored hashed


def test_second_login_requires_code_and_rejects_replay(client, admin):
    totp, _ = enroll(client)
    client.cookies.clear()
    client.headers.pop("X-CSRF-Token")
    r = login(client)
    assert r.json()["mfa_required"] is True
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    assert client.get("/api/admin/users").status_code == 403
    assert client.post("/api/admin/auth/mfa/verify", json={"code": "000000"}).status_code == 401
    # The code used during enrollment is the same 30s step -> must be refused (replay protection)
    assert client.post("/api/admin/auth/mfa/verify", json={"code": totp.now()}).status_code == 401
    good = totp.at(time.time() + 30)  # next step's code is accepted (clock drift tolerance)
    r = client.post("/api/admin/auth/mfa/verify", json={"code": good})
    assert r.status_code == 200
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    assert client.get("/api/admin/users").status_code == 200


def test_recovery_code_works_once(client, admin):
    _, codes = enroll(client)
    for attempt in (1, 2):
        client.cookies.clear()
        r = login(client)
        client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
        r = client.post("/api/admin/auth/mfa/verify", json={"code": codes[0]})
        assert r.status_code == (200 if attempt == 1 else 401)


def test_mfa_guessing_is_limited_and_kills_session(client, admin):
    enroll(client)
    client.cookies.clear()
    r = login(client)
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    codes = [client.post("/api/admin/auth/mfa/verify", json={"code": f"{i:06d}"}).status_code for i in range(7)]
    assert codes[:5] == [401] * 5 and codes[5] == 429
    assert client.get("/api/admin/auth/me").status_code == 401  # session revoked


# ---------- brute force ----------
def test_account_locks_after_failures_even_with_right_password(client, admin):
    for _ in range(5):
        assert login(client, pw="wrong password here").status_code == 401
    assert login(client).status_code == 401  # correct password, but locked
    assert login(client).json()["detail"] == "Invalid email or password"  # no lock hint


def test_ip_rate_limit(client, admin):
    from app.core.config import settings
    codes = [login(client, f"u{i}@example.com", "whatever password").status_code
             for i in range(settings.login_ip_limit + 3)]
    assert codes[-1] == 429


# ---------- sessions & CSRF ----------
def test_csrf_required_on_state_changing_requests(client, admin):
    enroll(client)
    good = client.headers.pop("X-CSRF-Token")
    payload = {"email": "x@example.com", "full_name": "X", "role": "finance", "password": "a long enough password"}
    assert client.post("/api/admin/users", json=payload).status_code == 403
    client.headers["X-CSRF-Token"] = "forged"
    assert client.post("/api/admin/users", json=payload).status_code == 403
    client.headers["X-CSRF-Token"] = good
    assert client.post("/api/admin/users", json=payload).status_code == 201


def test_cookie_flags(client, admin):
    r = login(client)
    c = r.headers["set-cookie"].lower()
    assert "httponly" in c and "samesite=strict" in c and "path=/api/admin" in c


def test_session_token_rotates_after_mfa(client, admin):
    r = login(client)
    before = client.cookies.get("mk_session")
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    secret = client.post("/api/admin/auth/mfa/setup").json()["secret"]
    client.post("/api/admin/auth/mfa/enable", json={"code": pyotp.TOTP(secret).now()})
    assert client.cookies.get("mk_session") != before


def test_idle_timeout(client, admin, db):
    enroll(client)
    db.execute(text("UPDATE auth_sessions SET last_seen_at = now() - interval '2 hours'"))
    db.commit()
    assert client.get("/api/admin/users").status_code == 401


def test_logout_revokes_session(client, admin):
    enroll(client)
    assert client.post("/api/admin/auth/logout").status_code == 200
    assert client.get("/api/admin/auth/me").status_code == 401


def test_security_headers(client):
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]


# ---------- roles & permissions ----------
def staff_client(client, db, email, role):
    make_user(db, email, role)
    client.cookies.clear()
    client.headers.pop("X-CSRF-Token", None)
    r = login(client, email)
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    secret = client.post("/api/admin/auth/mfa/setup").json()["secret"]
    r = client.post("/api/admin/auth/mfa/enable", json={"code": pyotp.TOTP(secret).now()})
    client.headers["X-CSRF-Token"] = r.json()["csrf_token"]


@pytest.mark.parametrize("role", [Role.manager, Role.booking_officer, Role.finance])
def test_non_admin_roles_cannot_manage_users_or_read_audit(client, db, role):
    staff_client(client, db, f"{role.value}@example.com", role)
    assert client.get("/api/admin/users").status_code == 403
    assert client.get("/api/admin/audit").status_code == 403


def test_nobody_has_payment_override_by_default():
    from app.core.permissions import ROLE_PERMISSIONS
    assert all("payments.override" not in p for p in ROLE_PERMISSIONS.values())


def test_admin_cannot_demote_or_disable_self(client, admin):
    enroll(client)
    r = client.patch(f"/api/admin/users/{admin.id}", json={"role": "finance"})
    assert r.status_code == 409
    r = client.patch(f"/api/admin/users/{admin.id}", json={"is_active": False})
    assert r.status_code == 409


def test_disabling_user_revokes_their_sessions(client, db, admin):
    # second user logs in, then admin disables them
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as other:
        staff_client(other, db, "fin@example.com", Role.finance)
        assert other.get("/api/admin/auth/me").status_code == 200
        enroll(client)
        uid = db.query(User).filter_by(email="fin@example.com").one().id
        assert client.patch(f"/api/admin/users/{uid}", json={"is_active": False}).status_code == 200
        assert other.get("/api/admin/auth/me").status_code == 401


def test_password_policy_enforced_on_create(client, admin):
    enroll(client)
    bad = {"email": "n@example.com", "full_name": "N", "role": "manager", "password": "short"}
    r = client.post("/api/admin/users", json=bad)
    assert r.status_code == 422


def test_change_password_revokes_other_sessions(client, db, admin):
    from fastapi.testclient import TestClient
    from app.main import app
    totp, _ = enroll(client)
    with TestClient(app) as second:
        login(second)  # a second (unverified) session exists
        r = client.post("/api/admin/auth/change-password",
                        json={"current_password": PW, "new_password": "an even longer new passphrase"})
        assert r.status_code == 200
        assert second.get("/api/admin/auth/me").status_code == 401


# ---------- audit trail ----------
def test_audit_records_security_events_and_never_secrets(client, db, admin):
    login(client, pw="wrong password here")
    enroll(client)
    client.post("/api/admin/users", json={"email": "m@example.com", "full_name": "M", "role": "manager",
                                          "password": "a long enough password"})
    actions = {a.action for a in db.query(AuditLog)}
    assert {"auth.login_failed", "auth.password_ok", "auth.mfa_enabled", "user.create"} <= actions
    dump = str([(a.before, a.after) for a in db.query(AuditLog)])
    assert "argon2" not in dump and "a long enough password" not in dump
    assert client.get("/api/admin/audit").status_code == 200


def test_audit_log_is_append_only_in_the_database(db, admin):
    db.add(AuditLog(user_id=admin.id, action="t", entity_type="x"))
    db.commit()
    with pytest.raises(DBAPIError):
        db.execute(text("UPDATE audit_logs SET action='tampered'"))
    db.rollback()
    with pytest.raises(DBAPIError):
        db.execute(text("DELETE FROM audit_logs"))
    db.rollback()


def test_payments_cannot_be_deleted_in_the_database(db, admin):
    db.execute(text("INSERT INTO packages(slug,category,type,duration_days,gallery_images,is_published,sort_order) "
                    "VALUES ('t','safari','x',1,'[]',true,0)"))
    db.execute(text("INSERT INTO bookings(reference,package_id,customer_name,customer_email,language,adults,children,"
                    "currency,total_amount,deposit_amount,status) SELECT 'R1',id,'a','a@b.co','en',1,0,'USD',10,0,'pending' FROM packages"))
    db.execute(text("INSERT INTO payments(booking_id,provider,merchant_reference,kind,amount,currency,status,verified_with_provider) "
                    "SELECT id,'manual','M1','full',10,'USD','pending',false FROM bookings"))
    db.commit()
    with pytest.raises(DBAPIError):
        db.execute(text("DELETE FROM payments"))
    db.rollback()
    db.execute(text("DELETE FROM bookings WHERE false"))
    db.rollback()
