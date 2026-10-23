# Render staging and deployment guide

Updated 23 October 2026. Use the detailed [staging verification runbook](STAGING_VERIFICATION_RUNBOOK.md) and [Node 22.23.4 verification and current configuration](../audit-reports/NODE_22_23_4_STAGING_PREPARATION/REPORT.md). Local verification now passes with the approved staging access/database guards; their successor commit must be reviewed and pushed before deploying. The remote baseline remains 8b6e31e. External deployment and plans remain unapproved. Earlier reports are historical.

## Safe staging configuration

Create a separate Render web service named `onelife-staging` from the `datavendor-improvements` branch only. Do not attach the production database, production payment keys, production email/WhatsApp credentials, or the production Render service.

- Root directory: leave empty (repository root); `backend` alone excludes the required sibling frontend on Render.
- Build command: `npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)`
- Start command: `npm --prefix backend start`
- Health check path: `/health`
- Runtime: Node 22 or a supported current Node LTS after compatibility testing

Use an isolated MongoDB database containing synthetic records. Configure `NODE_ENV=production`, `APP_ENV=staging`, `INTEGRATION_MODE=mock`, and a new staging-only JWT secret. Keep the new staging service's Auto-Deploy Off. Do not attach production environment groups.

## Required environment names

`PORT` is provided by Render. Set tested `NODE_VERSION=22.23.4`, `NODE_ENV=production`, `APP_ENV=staging`, `INTEGRATION_MODE=mock`, `DATABASE_URL`, `JWT_SECRET`, and `PUBLIC_BASE_URL` to the staging HTTPS origin. Also set `STAGING_MONGO_HOST` to the independently verified isolated cluster hostname, `STAGING_MONGO_DATABASE=onelife_staging`, `STAGING_BASIC_AUTH_USER` and a distinct random `STAGING_BASIC_AUTH_PASSWORD` of at least 32 characters. Startup refuses missing guards; HTTPS access requires Basic credentials before normal application login. Only GET/HEAD `/health` is public.

Do not add staging load to production's shared Free-service quotas. Proposed plans (not provisioned or approved): a separate Render staging workspace with verified independent usage/billing and a Free web service; a separate Atlas project with a Free cluster (formerly M0). Check availability, spending controls and shared billing first; stop instead of silently selecting a paid plan. Ephemeral invoices/uploads and cold starts are acceptable only for disposable synthetic staging.

Do not copy values from production. Omit all Razorpay, AI, mail and Twilio credentials; staging startup rejects configured credentials. Mock mode supplies local checkout, non-delivering notifications, AI/WHO simulation and local video navigation. Disabled mode fails closed. `/health` is liveness only; independently verify database-backed login. See the runbook for the complete matrix and synthetic-account recipe. Review the documented frontend build-tool audit exception before deployment.

## Before a production approval

1. Verify the health endpoint and startup logs with no secret output.
2. Exercise Admin, Doctor, and Patient login failures/successes, role denial, logout, booking, status changes, cancellation, rescheduling, file upload rejection, and responsive navigation against synthetic data.
3. Verify webhook signatures using a locally generated synthetic event; do not contact Razorpay.
4. Verify signed CSRF protection on form, JSON and multipart posts.
5. Confirm `master` has not changed and create a release commit only after owner approval.

## Rollback

Keep Render’s last successful production deployment intact. If a production deployment is later approved and fails smoke tests, use Render’s rollback action to restore that prior deployment, then investigate on the development branch. Do not run database-destructive rollback scripts.
