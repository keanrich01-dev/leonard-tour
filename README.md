# Leonard Tour — Tanzania safari and travel platform

A React + Vite frontend and FastAPI + PostgreSQL backend, with hosted Pesapal checkout, admin MFA, email workflows and media storage support.

## Local development

1. Copy `.env.example` to `.env` and replace the sample local database password and `SECRET_KEY`.
2. Run `docker compose up --build` from the project root.
3. Import the existing package catalogue if the local database has not already been populated:
   `docker compose exec backend python -m scripts.import_old_data`
4. Run the frontend from `frontend`:
   `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.

Local endpoints: frontend `http://localhost:5173`, API `http://localhost:8000`, Mailpit `http://localhost:8025`.

## Production architecture

Deployment configuration, first production database setup (package import and initial admin creation), and remaining account-specific requirements are documented in [`DEPLOYMENT_READINESS.md`](DEPLOYMENT_READINESS.md). A Render Blueprint is provided in `render.yaml`; the React site is prepared for Cloudflare Pages; the API supports Neon PostgreSQL, Upstash Redis and Cloudflare R2.

## Main application areas

- `frontend/` — public website, package catalogue, booking flow, admin interface and content pages.
- `backend/app/api/` — public APIs and protected admin APIs.
- `backend/app/models/` — SQLAlchemy database models.
- `backend/alembic/` — versioned database migrations.
- `backend/app/payments/` — Pesapal hosted-checkout adapter and provider interface.
- `backend/app/emails/` — multilingual email templates and delivery transport.
- `backend/app/services/media_storage.py` — local and R2 object storage.
- `backend/tests/` — backend tests; use the dedicated PostgreSQL test role only.

## Payment security

The customer is redirected to Pesapal hosted checkout. Card details are not collected or stored by Leonard Tour. A browser redirect or IPN message is not proof of payment: the backend asks Pesapal's authenticated status endpoint and verifies the amount, currency, merchant reference and tracking ID before recording a successful payment.

## Admin security

Staff passwords use Argon2id; MFA uses TOTP; sessions are server-side and protected by HttpOnly cookies and CSRF checks. Production must use HTTPS, `COOKIE_SECURE=true`, a strong unique `SECRET_KEY`, and a frontend/API pair on the same registrable domain for the current SameSite=Strict cookie policy.

## Test suite

Use `scripts/run-tests.ps1` on Windows. It prompts securely for the password of the dedicated local `leonard_tour_test` PostgreSQL role and only resets a database ending in `_test` or `_test_db`. Never point tests at production.
