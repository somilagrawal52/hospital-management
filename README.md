# OneLife Hospital Management

OneLife is an EJS/Express/MongoDB application for patient appointment booking, doctor coordination, and hospital administration.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and enter service credentials.
2. Run `npm install` in `backend` and `frontend/patient`.
3. Run `npm run dev` from `backend`.
4. In a separate terminal, run `npm run build:css` from `frontend/patient` when editing Tailwind styles.

The app is available at `http://localhost:8000`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API and role boundaries](docs/API.md)
- [Render staging and deployment guide](docs/DEPLOYMENT.md)
- [Third-party material status](THIRD_PARTY_NOTICES.md)

The Admin and Doctor consoles are independently authored EJS/CSS/JavaScript. Their former template and editor bundles are not part of this branch. The Patient interface has deliberately not been redesigned as part of that migration.

## Safety and production checklist

- Use a unique `JWT_SECRET` of at least 32 random characters, HTTPS, production database backups, and real support/legal details before deployment. Production startup rejects a missing or placeholder JWT secret. Existing deployments using the temporary lowercase `secret` setting must migrate to `JWT_SECRET` before their next production release.
- Create the first administrator directly in the database with `role: "ADMIN"`; doctor registration is intentionally restricted to administrators.
- Razorpay fees are calculated from the doctor record and payments are verified server-side before confirmation.
- Run `npm test` and `npm audit --omit=dev --audit-level=high` in `backend` before each release.

## Online appointments and payments

- A doctor accepting an online request creates a unique Jitsi room, records the call lifecycle, and exposes a calendar download to both participants. Set `VIDEO_MEETING_BASE_URL` to a trusted HTTPS Jitsi deployment for production; the public Jitsi endpoint is the development default.
- Configure `RAZORPAY_WEBHOOK_SECRET` and create a Razorpay webhook at `https://your-domain.example/webhooks/razorpay`. Subscribe to `payment.captured` and `payment.failed`. The webhook is the reconciliation path; browser verification only gives the patient immediate feedback.
- `nodemon` is development-only. The production-only audit currently reports no high-severity findings; the full audit currently reports three high findings through its development-only `chokidar` chain. Do not use `npm audit fix --force` without reviewing its breaking dependency proposal.

## DataVendor source-package note

Do not package `.env`, `node_modules`, generated invoices, uploads, logs, database exports, or Git history without a separate rights and secret review. The repository history retains prior dashboard-template material and must not be included in a clean commercial source export. See `audit-reports/DATAVENDOR_FINAL_COMPLETION/` for the final review checklist.
