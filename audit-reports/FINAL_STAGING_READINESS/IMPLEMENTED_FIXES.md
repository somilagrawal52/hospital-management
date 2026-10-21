# Implemented staging fixes — 21 October 2026

Scope: local `datavendor-improvements`, starting at `2ac19fe`. Protected `master` and cached `origin/master` remain `30c4d3e8195ce10f8da4b692dbc1a65618fd670c`. No push, merge, Render operation, production data access, provider transaction, history rewrite or commercial archive was performed.

Change total: 55 files (22 backend, 20 frontend, 9 report/evidence, 2 docs, README and third-party notices).

## Changes

1. Replaced header-only CSRF enforcement with signed, random, authentication-cookie-bound double-submit tokens. EJS forms submit explicit fields; same-origin unsafe fetch requests submit a header. Multipart submissions check that header before Multer writes files. Helmet uses same-origin referrers; valid tokens do not require a Referer. Foreign origins remain rejected. Raw signed webhooks remain separate.
2. Added an independently authored projection over the existing address dataset: legacy field names, string coordinates, timezones, sorting and IN UT/UK compatibility. No stored record migration and no legacy GPL package/data import.
3. Updated follow-redirects 1.16.0 to 1.16.1. Removed development-only nodemon in favor of Node 22 native watch; its dependency chain is gone. Applied compatible frontend lockfile updates, retaining Tailwind 3. Backend audits are clean; frontend build-only findings remain explicitly reported.
4. Added explicit production-mode staging isolation. Payment checkout/verification, notifications, AI, WHO lookup and video are local simulations or safely disabled. Production defaults remain live. Staging rejects provider credentials; production rejects mock/disabled configuration.
5. Rebuilt Tailwind deterministically; added one-time build and separate watch scripts. No redesign. Fixed an actual availability-save JavaScript error by retaining the clicked button across `await`.
6. Added real isolated-MongoDB browser regression, CSRF/address/provider/watch tests, offline compilation/reference checks and clean-build startup verification.

## Exact implementation file inventory

Backend modified: `.env.example`; `controller/address.js`, `mail.js`, `patient.js`, `webhooks.js`; `index.js`; `middlewares/csrf-origin.js`; `package.json`, `package-lock.json`; `routes/user.js`; `services/razorpay-client.js`, `runtime-config.js`, `video-session.js`; `test/address-data.test.js`.

Backend added: `services/address-data.js`, `services/integrations.js`; `test/csrf.test.js`, `integration-isolation.test.js`, `watch-mode.test.js`, `staging-browser.cjs`, `verify-static.cjs`, `verify-build-start.cjs`.

Frontend modified: `Admin/admin-login.ejs`, `admin-messages.ejs`, `doctors-detail.ejs`, `doctors-registration.ejs`, `partials/head.ejs`; `doctor/doctor-login.ejs`, `doctor-availability.ejs`, `partials/head.ejs`; `patient/package.json`, `package-lock.json`; `patient/views/appointment.ejs`, `assets/tailwind.css`, `chat.ejs`, `diseaseSearch.ejs`, `head.ejs`, `login.ejs`, `myAppointment.ejs`, `patient-messages.ejs`.

Frontend added: `shared/assets/js/csrf.js`, `shared/assets/js/mock-checkout.js`.

Documentation modified: root `README.md`, `THIRD_PARTY_NOTICES.md` (distinguishes the shipped LICENSE attribution URL from package repository metadata); `docs/DEPLOYMENT.md`, `docs/STAGING_VERIFICATION_RUNBOOK.md`. Added this directory's eight requested Markdown reports and sanitized `browser-results.json`. All paths above are relative to their stated backend/frontend root. No existing image/vendor assets were deleted. Existing untracked `audit-reports/DATAVENDOR_FRONTEND_MIGRATION/` was left untouched and is not part of this change.

## Boundaries

No database schema changes, major frontend replacement, new public project license or production security configuration changes were made. Signed CSRF is an intentional request-contract hardening: non-browser clients must obtain a page/cookie/token before unsafe requests. Multipart forms now require JavaScript. Refresh stale pages after login/logout or cookie expiry.
