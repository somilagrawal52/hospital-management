# OneLife Hospital Management

OneLife is an EJS/Express/MongoDB application for patient appointment booking, doctor coordination, and hospital administration.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and enter service credentials.
2. Run `npm install` in `backend` and `frontend/patient`.
3. Run `npm run dev` from `backend`.
4. Run `npm run build:css` from `frontend/patient` for a one-time CSS build, or `npm run watch:css` while editing styles.

The app is available at `http://localhost:8000`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API and role boundaries](docs/API.md)
- [Render staging and deployment guide](docs/DEPLOYMENT.md)
- [Third-party material status](THIRD_PARTY_NOTICES.md)

The Admin and Doctor consoles are independently authored EJS/CSS/JavaScript. Their former template and editor bundles are not part of this branch. The active Patient interface uses original SVG marks and newly generated OneLife imagery; legacy images remain only for live-record compatibility and must be reviewed before an export.

## Safety and production checklist

- Use a unique `JWT_SECRET` of at least 32 random characters, HTTPS, production database backups, and real support/legal details before deployment. Production startup rejects a missing or placeholder JWT secret. Existing deployments using the temporary lowercase `secret` setting must migrate to `JWT_SECRET` before their next production release.
- Create the first administrator directly in the database with `role: "ADMIN"`; doctor registration is intentionally restricted to administrators.
- Razorpay fees are calculated from the doctor record and payments are verified server-side before confirmation.
- Run `npm test` and `npm audit --omit=dev --audit-level=high` in `backend` before each release.

## Online appointments and payments

- A doctor accepting an online request creates a unique Jitsi room, records the call lifecycle, and exposes a calendar download to both participants. Set `VIDEO_MEETING_BASE_URL` to a trusted HTTPS Jitsi deployment for production; the public Jitsi endpoint is the development default.
- Configure `RAZORPAY_WEBHOOK_SECRET` and create a Razorpay webhook at `https://your-domain.example/webhooks/razorpay`. Subscribe to `payment.captured` and `payment.failed`. The webhook is the reconciliation path; browser verification only gives the patient immediate feedback.
- Development uses Node 22's native `--watch`; nodemon and its vulnerable dependency chain were removed. Backend full/production audits report zero findings. The frontend Tailwind build-only tree still has seven audit findings (five high, two moderate); see the final staging report. Do not use `npm audit fix --force`.

## Isolated staging

Keep `NODE_ENV=production`, set `APP_ENV=staging` and explicitly set `INTEGRATION_MODE=mock` (local simulations) or `disabled`. Remove all provider credentials; startup rejects them in staging. Production defaults remain live when these new variables are absent. Never copy the development `.env` into Render. See [final staging readiness](audit-reports/FINAL_STAGING_READINESS/RENDER_STAGING_READINESS.md) and the [runbook](docs/STAGING_VERIFICATION_RUNBOOK.md).

Staging also requires `STAGING_MONGO_HOST`, `STAGING_MONGO_DATABASE`, `STAGING_BASIC_AUTH_USER` and a separate random `STAGING_BASIC_AUTH_PASSWORD`. It refuses an unexpected database before connecting and requires HTTPS Basic authorization on every route except GET/HEAD `/health`, in addition to normal role logins. See the [Node 22.23.4 verification and current setup](audit-reports/NODE_22_23_4_STAGING_PREPARATION/REPORT.md). The guarded synthetic seed command is `node backend/scripts/seed-staging.cjs`; configure its separate opt-in inputs first.

Unsafe browser requests now require the signed CSRF token supplied by EJS forms or the shared fetch helper. Multipart forms use same-origin JavaScript submission so the header is checked before upload parsing. A provider webhook instead requires its raw-body signature.

## DataVendor source-package note

Do not package `.env`, `node_modules`, generated invoices, uploads, logs, database exports, or Git history without a separate rights and secret review. The repository history retains prior dashboard-template material and must not be included in a clean commercial source export. See `audit-reports/DATAVENDOR_FINAL_COMPLETION/` for the final review checklist.

Country/state/city lookup is an offline ODbL-1.0 data component, separately documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Keep its attribution with an export and obtain legal review of any database share-alike obligations.
