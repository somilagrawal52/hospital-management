# Production deployment readiness

## Current status: not approved for deployment

No staging service has been created and no runtime test has used an isolated database. The branch is an implementation candidate, not a production release.

## Confirmed application configuration

- Render root: `backend`
- Build: `npm ci`
- Start: `npm start`
- Liveness endpoint: `GET /health`
- Required secret names and safe staging guidance: `docs/DEPLOYMENT.md`

## Release blockers

1. Complete staging workflow verification against synthetic data and sandbox providers.
2. Confirm CSRF same-origin behavior behind Render’s proxy with actual browser forms.
3. Resolve/accept the `country-state-city` legal path and asset provenance questions.
4. Establish an atomic slot-reservation plan before representing booking as race-safe.
5. Owner approval before any push, merge, or Render deployment.
