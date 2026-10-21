# Render staging and deployment guide

Updated 21 October 2026. Use the detailed [staging verification runbook](STAGING_VERIFICATION_RUNBOOK.md) and [remediation results](../audit-reports/FINAL_STAGING_READINESS/FULL_REGRESSION_RESULTS.md). Local verification now passes; external deployment remains unapproved. Earlier verification reports are historical, not the current result.

## Safe staging configuration

Create a separate Render web service named `onelife-staging` from the `datavendor-improvements` branch only. Do not attach the production database, production payment keys, production email/WhatsApp credentials, or the production Render service.

- Root directory: leave empty (repository root); `backend` alone excludes the required sibling frontend on Render.
- Build command: `npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)`
- Start command: `npm --prefix backend start`
- Health check path: `/health`
- Runtime: Node 22 or a supported current Node LTS after compatibility testing

Use an isolated MongoDB database containing synthetic records. Configure `NODE_ENV=production`, `APP_ENV=staging`, `INTEGRATION_MODE=mock`, and a new staging-only JWT secret. Keep the new staging service's Auto-Deploy Off. Do not attach production environment groups.

## Required environment names

`PORT` is provided by Render. Set `NODE_VERSION=22.17.0` to reproduce the locally tested runtime (not a claim that this old patch is the latest security release), `NODE_ENV=production`, `APP_ENV=staging`, `INTEGRATION_MODE=mock`, `DATABASE_URL`, `JWT_SECRET`, and `PUBLIC_BASE_URL` to the staging HTTPS origin. Test a newer supported Node 22 patch separately before selecting it.

Do not copy values from production. Omit all Razorpay, AI, mail and Twilio credentials; staging startup rejects configured credentials. Mock mode supplies local checkout, non-delivering notifications, AI/WHO simulation and local video navigation. Disabled mode fails closed. `/health` is liveness only; independently verify database-backed login. See the runbook for the complete matrix and synthetic-account recipe. Review the documented frontend build-tool audit exception before deployment.

## Before a production approval

1. Verify the health endpoint and startup logs with no secret output.
2. Exercise Admin, Doctor, and Patient login failures/successes, role denial, logout, booking, status changes, cancellation, rescheduling, file upload rejection, and responsive navigation against synthetic data.
3. Verify webhook signatures using a locally generated synthetic event; do not contact Razorpay.
4. Verify signed CSRF protection on form, JSON and multipart posts.
5. Confirm `master` has not changed and create a release commit only after owner approval.

## Rollback

Keep Render’s last successful production deployment intact. If a production deployment is later approved and fails smoke tests, use Render’s rollback action to restore that prior deployment, then investigate on the development branch. Do not run database-destructive rollback scripts.
