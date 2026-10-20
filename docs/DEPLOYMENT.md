# Render staging and deployment guide

## Safe staging configuration

Create a separate Render web service named `onelife-staging` from the `datavendor-improvements` branch only. Do not attach the production database, production payment keys, production email/WhatsApp credentials, or the production Render service.

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`
- Runtime: Node 22 or a supported current Node LTS after compatibility testing

Use an isolated MongoDB database containing synthetic records. Configure `NODE_ENV=staging` rather than `production` until the production-secret validation and all staging checks are complete.

## Required environment names

`PORT` is provided by Render. Configure `DATABASE_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `VIDEO_MEETING_BASE_URL`, and only the provider variables required for the staged scenario: `GEMINI_API_KEY` or `OPENAI_API_KEY`, `mail_user`, `mail_pass`, `MAIL_FROM`, `mail_port`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.

Do not copy values from production. Use sandbox payment credentials, a non-delivering mail transport/account, and disabled or sandbox messaging.

## Before a production approval

1. Verify the health endpoint and startup logs with no secret output.
2. Exercise Admin, Doctor, and Patient login failures/successes, role denial, logout, booking, status changes, cancellation, rescheduling, file upload rejection, and responsive navigation against synthetic data.
3. Verify Razorpay webhooks using a sandbox event and no real charge.
4. Verify same-origin protection on form and JSON posts.
5. Confirm `master` has not changed and create a release commit only after owner approval.

## Rollback

Keep Render’s last successful production deployment intact. If a production deployment is later approved and fails smoke tests, use Render’s rollback action to restore that prior deployment, then investigate on the development branch. Do not run database-destructive rollback scripts.
