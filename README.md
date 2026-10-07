# OneLife Hospital Management

OneLife is an EJS/Express/MongoDB application for patient appointment booking, doctor coordination, and hospital administration.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and enter service credentials.
2. Run `npm install` in `backend` and `frontend/patient`.
3. Run `npm run dev` from `backend`.
4. In a separate terminal, run `npm run build:css` from `frontend/patient` when editing Tailwind styles.

The app is available at `http://localhost:8000`.

## Safety and production checklist

- Use a unique `JWT_SECRET`, HTTPS, production database backups, and real support/legal details before deployment.
- Create the first administrator directly in the database with `role: "ADMIN"`; doctor registration is intentionally restricted to administrators.
- Razorpay fees are calculated from the doctor record and payments are verified server-side before confirmation.
- Run `npm test` and `npm audit --omit=dev --audit-level=high` in `backend` before each release.

## Online appointments and payments

- A doctor accepting an online request creates a unique Jitsi room, records the call lifecycle, and exposes a calendar download to both participants. Set `VIDEO_MEETING_BASE_URL` to a trusted HTTPS Jitsi deployment for production; the public Jitsi endpoint is the development default.
- Configure `RAZORPAY_WEBHOOK_SECRET` and create a Razorpay webhook at `https://your-domain.example/webhooks/razorpay`. Subscribe to `payment.captured` and `payment.failed`. The webhook is the reconciliation path; browser verification only gives the patient immediate feedback.
- `nodemon` is a development-only dependency. `npm audit --omit=dev --audit-level=high` should be used to assess the production runtime; the currently installed development file-watcher dependency still has an upstream advisory with no safe non-breaking resolution.
