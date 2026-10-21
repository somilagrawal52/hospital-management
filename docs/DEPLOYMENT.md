# Render staging and deployment guide

Updated 21 October 2026. Use the detailed [staging verification runbook](STAGING_VERIFICATION_RUNBOOK.md) and [current verification results](../audit-reports/FINAL_VERIFICATION_2026-10-21/REPORT.md). The current commit has blocking login/API/dependency findings; deployment is not approved.

## Safe staging configuration

Create a separate Render web service named `onelife-staging` from the `datavendor-improvements` branch only. Do not attach the production database, production payment keys, production email/WhatsApp credentials, or the production Render service.

- Root directory: leave empty (repository root); `backend` alone excludes the required sibling frontend on Render.
- Build command: `npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)`
- Start command: `npm --prefix backend start`
- Health check path: `/health`
- Runtime: Node 22 or a supported current Node LTS after compatibility testing

Use an isolated MongoDB database containing synthetic records. Configure `NODE_ENV=production` with a new staging-only JWT secret to exercise production validation and Secure cookies. No additional staging environment marker is consumed by the application. Keep the new staging service's Auto-Deploy Off.

## Required environment names

`PORT` is provided by Render. Configure `DATABASE_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `VIDEO_MEETING_BASE_URL`, and only the provider variables required for the staged scenario: `GEMINI_API_KEY` or `OPENAI_API_KEY`, `mail_user`, `mail_pass`, `MAIL_FROM`, `mail_port`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.

Do not copy values from production. Under the current no-provider testing restriction, omit payment/AI/mail/Twilio credentials and mock the integration boundaries before exercising provider-dependent workflows. There is no existing disabling switch or configurable non-delivering Gmail transport; omission alone is not a network safety boundary. Full staging is blocked until this isolation exists. Use `VIDEO_MEETING_BASE_URL=https://video.invalid` and block/mock video navigation. See the runbook for the complete variable matrix and synthetic-account recipe.

## Before a production approval

1. Verify the health endpoint and startup logs with no secret output.
2. Exercise Admin, Doctor, and Patient login failures/successes, role denial, logout, booking, status changes, cancellation, rescheduling, file upload rejection, and responsive navigation against synthetic data.
3. Verify Razorpay webhooks using a sandbox event and no real charge.
4. Verify same-origin protection on form and JSON posts.
5. Confirm `master` has not changed and create a release commit only after owner approval.

## Rollback

Keep Render’s last successful production deployment intact. If a production deployment is later approved and fails smoke tests, use Render’s rollback action to restore that prior deployment, then investigate on the development branch. Do not run database-destructive rollback scripts.
