# Leonard Tour — deployment preparation status

This repository has been hardened and prepared for a first production deployment. It is **not yet live**: cloud resources, business-owned payment credentials, SMTP credentials, the final domains and the missing legacy photo assets must be supplied in the hosting dashboards.

## Hosting layout prepared

- Frontend: Cloudflare Pages (`frontend`, build `npm run build`, output `dist`).
- API and migrations: Render Docker web service (`render.yaml`, `/health`).
- Email and scheduled balance reminders: Render background worker (`celery -A app.worker.celery_app worker -B -l info`).
- Database: Neon PostgreSQL. Use the pooled connection for `DATABASE_URL` and the direct, non-pooler URL for `DIRECT_DATABASE_URL` (Alembic migrations).
- Redis: Upstash TCP Redis URL (`rediss://...:6379`), shared by API rate limits and Celery.
- Media: Cloudflare R2 with a public custom media domain. The app now supports local storage for development and R2 in production.

## Required dashboard setup

1. Create the Neon database and copy both pooled and direct connection strings. Keep `sslmode=require`; the app normalizes `postgresql://` to the installed `psycopg` v3 driver.
2. Create an Upstash Redis database and copy its TLS TCP connection string (`rediss://...`), not the REST URL. The Celery worker needs Redis protocol access.
3. Create an R2 bucket and a bucket-scoped Object Read & Write API token. Attach a public custom domain such as `media.yourdomain.com`; set `MEDIA_PUBLIC_URL` to that HTTPS base URL. Configure R2 values in Render.
4. Create the Render Blueprint from `render.yaml`. Set `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `PUBLIC_API_URL`, `FRONTEND_URL`, Pesapal live keys, SMTP credentials, company email values and R2 values. The web and worker share the needed email/database settings through Render service references.
5. In Cloudflare Pages, set root `frontend`, build `npm run build`, output `dist`. Set `VITE_API_BASE_URL=https://api.yourdomain.com` and `VITE_TANZANIA_VIDEO_URL` only if a licensed video is ready.
6. Use custom domains on the same registrable domain for the frontend and API (for example `www.yourdomain.com` and `api.yourdomain.com`). Keep HTTPS enabled and set `CORS_ORIGINS` to the exact frontend origin. This keeps the admin's secure, SameSite=Strict cookie in a same-site browser context.
7. In Pesapal, activate the Leonard Tour merchant account and obtain LIVE consumer credentials. Confirm Visa, Mastercard and each mobile-money channel are enabled by the merchant. The app will not claim live payment readiness without both credentials and actual provider setup.
8. Use a production SMTP relay with verified sender/domain authentication (SPF/DKIM/DMARC). Set `EMAIL_BACKEND=smtp`, `SMTP_PORT=587`, `SMTP_STARTTLS=true`, `SMTP_SSL=false`.

## First production database setup

After the first successful Render deployment and Alembic migration, use the Render Shell for `leonard-tour-api`:

1. Preview the package import: `python -m scripts.import_old_data --dry-run`.
2. Review the output, then import the packages: `python -m scripts.import_old_data`. The cleaned deployment image includes the reviewed package JSON under `backend/data/old_packages.json`; the import is idempotent.
3. Create the first administrator: `python -m scripts.create_admin admin@yourdomain.com "Full Name"`. The password is entered interactively and is not passed in the command. Enrol MFA at the first login.

Do not expose the admin login publicly until the business contact details, imported package prices/content and package photographs have been reviewed.

## Data and migration safeguards

- The Render web command runs Alembic against `DIRECT_DATABASE_URL` first, then starts Uvicorn. Take a Neon backup before the first migration.
- The test harness drops and recreates only a database whose name ends in `_test` or `_test_db`. It uses a dedicated local test role, never the app's production database.
- `COOKIE_SECURE=true` and `CELERY_EAGER=false` are required in production.
- Do not set `TRUST_PROXY=true` unless the service is behind the trusted proxy chain you control.
- The API remains unable to start payment checkout until Pesapal live credentials are configured.

## Cloudflare R2 media upload and migration

The API now writes package, blog and testimonial image uploads to R2 when `MEDIA_STORAGE_BACKEND=r2`; its responses return the public media URL. Existing local files can be migrated by running from `backend` after the R2 environment variables are set:

```powershell
python scripts/migrate_media_to_r2.py
```

The script uploads existing files under `backend/media` while retaining their relative object keys. The provided ZIP contains testimonial photos but does not contain the historic safari/Kilimanjaro/island package photo library. Restore those source files into `backend/media` before running the migration. Required historic filenames are listed in `assets/required-package-images.txt`.

## Security incident / secret rotation

The uploaded project ZIP contained a populated `backend/.env` with a `SECRET_KEY` and SMTP password, plus old copies of runtime email `.eml` files. Treat those credentials as exposed:

- Rotate the SMTP password in the email provider and update the sender credentials in Render.
- Generate a new production `SECRET_KEY` for Render. This invalidates current admin sessions and changes MFA-encryption derivation; plan for administrators to re-enrol MFA or restore through a separately verified recovery plan. Do not reuse the leaked key.
- Rotate any payment credentials if they were ever stored in the same local environment (the reviewed `.env` did not show populated Pesapal credentials).
- Keep `.env`, `.env.local`, `.eml`, `.rdb`, backups, `.venv`, `node_modules`, `.git` and build outputs out of the deploy repository.

## Verification performed in this review

The frontend production build must be rerun after dependency installation and all code changes. Backend tests require a reachable local PostgreSQL and Redis instance plus the dedicated test-role password. Pesapal live checkout, SMTP delivery and R2 uploads require the business credentials and cloud resources; they cannot be truthfully marked verified before that access exists.
