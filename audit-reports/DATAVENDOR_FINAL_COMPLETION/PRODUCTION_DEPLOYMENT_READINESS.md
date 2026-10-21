# Production deployment readiness

## Current status: not approved for deployment

No staging service has been created and no runtime test has used an isolated database. The branch is an implementation candidate, not a production release.

## Confirmed application configuration

- Render root: leave empty (repository root), so both backend and frontend are available.
- Build: `npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)`
- Start: `npm --prefix backend start`
- Liveness endpoint: `GET /health`
- Required secret names and safe staging guidance: `docs/DEPLOYMENT.md`
- Staging mode: `NODE_ENV=production` with isolated MongoDB, new JWT secret and mocked providers. Current blockers/evidence: [21 October verification](../FINAL_VERIFICATION_2026-10-21/REPORT.md).

## Release blockers

1. Complete staging workflow verification against synthetic data and sandbox providers.
2. Confirm CSRF same-origin behavior behind Render’s proxy with actual browser forms.
3. Obtain counsel/owner approval for the ODbL address-data treatment and complete asset provenance/exclusion decisions.
4. Establish an atomic slot-reservation plan before representing booking as race-safe.
5. Owner approval before any push, merge, or Render deployment.
6. Repair the reproduced HTML-form login/CSRF interaction, restore/review the legacy address API contract, and address the current production dependency advisory before staging acceptance.
