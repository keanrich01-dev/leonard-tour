from decimal import Decimal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    direct_database_url: str = ""  # Prefer Neon direct endpoint for Alembic migrations.
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str
    cors_origins: str = "http://localhost:5173"
    # --- payments / booking ---
    payment_provider: str = "pesapal"
    pesapal_consumer_key: str = ""
    pesapal_consumer_secret: str = ""
    pesapal_base_url: str = "https://cybqa.pesapal.com/pesapalv3"  # sandbox; prod: https://pay.pesapal.com/pesapalv3
    public_api_url: str = "http://localhost:8000"   # must be publicly reachable for IPN (use a tunnel locally)
    frontend_url: str = "http://localhost:5173"
    deposit_percent: int = 30                       # BUSINESS DECISION: share of total due as deposit
    child_price_factor: Decimal = Decimal("1.0")    # BUSINESS DECISION: child price as share of adult price
    max_group_size: int = 30
    min_lead_days: int = 1
    # --- email ---
    email_backend: str = "file"          # smtp | file (writes .eml files, for development) | memory (tests)
    email_outbox_dir: str = "outbox"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = True           # port 587
    smtp_ssl: bool = False               # implicit TLS, port 465
    email_from: str = "no-reply@localhost"
    email_from_name: str = "Leonard Tour"
    email_reply_to: str = ""
    admin_notify_emails: str = ""        # comma separated; staff alerts (new booking, payments)
    company_name: str = "Leonard Tour"
    company_contact: str = "info@localhost"
    celery_eager: bool = False           # run tasks inline (development/tests only)
    balance_reminder_days: int = 14
    # --- admin security ---
    cookie_secure: bool = True          # set COOKIE_SECURE=false ONLY for local http development
    session_hours: int = 8              # absolute session lifetime
    session_idle_minutes: int = 30      # idle timeout
    unverified_session_minutes: int = 15  # time allowed to finish the MFA step
    lockout_threshold: int = 5          # failed logins before account lock
    lockout_minutes: int = 15
    login_ip_limit: int = 20            # login attempts per IP per window
    login_ip_window_seconds: int = 600
    trust_proxy: bool = False           # true only behind a proxy you control (uses X-Forwarded-For)

    # Persistent media storage: local for development, R2 for production.
    media_storage_backend: str = "local"
    media_public_url: str = ""
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""

    @field_validator("database_url", "direct_database_url")
    @classmethod
    def _psycopg_driver(cls, v: str) -> str:
        value = (v or "").strip()
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value[len("postgres://"):]
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value[len("postgresql://"):]
        return value

    @field_validator("media_storage_backend")
    @classmethod
    def _media_backend(cls, v: str) -> str:
        value = v.strip().lower()
        if value not in {"local", "r2"}:
            raise ValueError("MEDIA_STORAGE_BACKEND must be 'local' or 'r2'")
        return value

    @field_validator("secret_key")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def admin_emails(self) -> list[str]:
        return [e.strip() for e in self.admin_notify_emails.split(",") if e.strip()]

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
