import os
import re

import pytest
from sqlalchemy.engine import URL

TEST_DB = os.getenv("LEONARD_TEST_DB_NAME", "leonard_tour_test_db")
TEST_DB_USER = os.getenv("LEONARD_TEST_DB_USER", "leonard_tour_test")
TEST_DB_PASSWORD = os.getenv("LEONARD_TEST_DB_PASSWORD", "")
TEST_DB_HOST = os.getenv("LEONARD_TEST_DB_HOST", "localhost")
TEST_DB_PORT = int(os.getenv("LEONARD_TEST_DB_PORT", "5432"))

if not re.fullmatch(r"[a-zA-Z0-9_]+_test(?:_db)?", TEST_DB):
    raise RuntimeError("Refusing to reset a database that does not have a _test or _test_db suffix")
if not TEST_DB_PASSWORD:
    raise RuntimeError(
        "Set LEONARD_TEST_DB_PASSWORD before running pytest. "
        "Use the password for the dedicated local PostgreSQL test role; never use production credentials."
    )

os.environ["DATABASE_URL"] = URL.create(
    "postgresql+psycopg", username=TEST_DB_USER, password=TEST_DB_PASSWORD,
    host=TEST_DB_HOST, port=TEST_DB_PORT, database=TEST_DB,
).render_as_string(hide_password=False)
os.environ["DIRECT_DATABASE_URL"] = ""
os.environ["SECRET_KEY"] = "test-only-secret-key-0123456789-0123456789-abcdef"
os.environ["COOKIE_SECURE"] = "false"  # TestClient uses plain HTTP.
os.environ["REDIS_URL"] = os.getenv("LEONARD_TEST_REDIS_URL", "redis://localhost:6379/9")
os.environ["EMAIL_BACKEND"] = "memory"
os.environ["CELERY_EAGER"] = "true"
os.environ["ADMIN_NOTIFY_EMAILS"] = "boss@leonard-tour.test"
os.environ["EMAIL_FROM"] = "no-reply@leonard-tour.test"
os.environ["MEDIA_STORAGE_BACKEND"] = "local"


def pytest_sessionstart(session):
    import psycopg
    from psycopg import sql
    from psycopg.conninfo import make_conninfo

    admin_dsn = os.getenv("LEONARD_TEST_DB_ADMIN_URL") or make_conninfo(
        host=TEST_DB_HOST, port=TEST_DB_PORT, dbname="postgres",
        user=TEST_DB_USER, password=TEST_DB_PASSWORD,
    )
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        conn.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()", (TEST_DB,)
        )
        conn.execute(sql.SQL("DROP DATABASE IF EXISTS {} ").format(sql.Identifier(TEST_DB)))
        conn.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(
            sql.Identifier(TEST_DB), sql.Identifier(TEST_DB_USER)
        ))

    from alembic import command
    from alembic.config import Config
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    command.upgrade(cfg, "head")


@pytest.fixture()
def db():
    from app.core.db import SessionLocal
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture(autouse=True)
def clean(db):
    from sqlalchemy import text
    from app.core.ratelimit import limiter
    db.execute(text("TRUNCATE email_log, users, auth_sessions, audit_logs, bookings, payments, payment_events, packages, package_prices, package_translations RESTART IDENTITY CASCADE"))
    db.commit()
    limiter.reset()
    from app.emails import transport
    transport.OUTBOX.clear()
    yield


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        yield c


def make_user(db, email, role, password="correct horse battery staple"):
    from app.core.security import hash_password
    from app.models import User
    u = User(email=email, full_name=email.split("@")[0], role=role, password_hash=hash_password(password))
    db.add(u)
    db.commit()
    return u
