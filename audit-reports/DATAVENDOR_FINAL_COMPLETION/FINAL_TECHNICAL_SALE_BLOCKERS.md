# Final technical sale blockers and staging plan

Superseded by the [21 October independent verification](../FINAL_VERIFICATION_2026-10-21/REPORT.md) and [staging runbook](../../docs/STAGING_VERIFICATION_RUNBOOK.md). That verification found incompatible address payloads and browser login failures, corrected the Render root to the repository root, and requires `NODE_ENV=production`. The historical configuration/test statements below must not be used as current deployment instructions.

Status at this commit: the current working branch is `datavendor-improvements`; `master` is not modified by this work. This is an engineering assessment, not legal advice or a commercial-license grant.

## Address-selection replacement

`backend/controller/address.js` retains the existing public API route URLs. It now reads `@countrystatecity/countries` 2.0.0 rather than the former GPL-3.0 `country-state-city` package. The 21 October comparison found that response shapes and some state/city identifiers are incompatible. The initial lookup test covers India, Maharashtra, and Mumbai but does not establish legacy contract compatibility.

The replacement package's published metadata declares ODbL-1.0. The upstream Countries States Cities Database says commercial use, modification, and redistribution are permitted with attribution and share-alike requirements for derivative databases. This is a compatible engineering path only if the final export:

1. labels the data separately from the OneLife code;
2. includes the attribution in `THIRD_PARTY_NOTICES.md` and the upstream ODbL text/required notice as counsel directs;
3. does not describe the data as proprietary or permissively licensed; and
4. receives legal review of whether the planned DataVendor distribution makes a public derivative database available.

No address UI in the repository currently calls these endpoints, so the change does not alter a discovered patient, doctor, or administrator form. The endpoints are preserved for existing external consumers.

## Asset-rights inventory

| Group | Current status | Export treatment |
| --- | --- | --- |
| `onelife-mark.svg`, `onelife-avatar.svg` | Authored in this branch | Include as original project artwork. |
| `onelife-team-generated.png`, `onelife-clinician-generated.png` | Newly generated in this development pass without input/reference images, brands, or text | Include only after owner confirms its intended commercial use and counsel reviews the applicable generation-service terms. |
| Active patient templates | Repointed to the four assets above or text/CSS controls | Include. |
| `frontend/patient/views/assets/doc*.png`, `*_doctor*`, `*_photo*`, screenshot, photos, prior logo/icons, Stripe/Razorpay logos, specialty graphics | No rights evidence located in the repository or Git history reviewed | Exclude from sale package unless the owner supplies written ownership/license evidence. Preserve in the live source until an upload/data migration is approved. |
| `frontend/Admin/assets/img/**`, `frontend/doctor/assets/img/**` | Mostly legacy dashboard images; several timestamped names indicate possible uploads, but provenance is unverified | Exclude from sale package. Do not delete from an active deployment because stored doctor records may reference them. |
| Runtime user/doctor uploads | Potential personal data and rights risk | Never include in source sale export. Use synthetic placeholders in staging only. |

`backend/services/doctor-image.js` retains legacy lookup paths to avoid breaking existing records, but its no-image fallback is now the generated clinician image. A final commercial export needs an owner-approved data/asset migration or an export assembler that excludes the legacy directories while retaining the safe fallback files.

## Required staging configuration

Create a separate Render service named `onelife-staging`, connected only to `datavendor-improvements`. Do not create it from `master`, reuse a production environment group, or enable automatic promotion.

| Setting | Required staging value or action |
| --- | --- |
| Root directory | `backend` |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check | `/health` |
| Runtime | Node 22, or a supported current Node LTS after compatibility confirmation |
| Database | New MongoDB database/cluster with a staging-only user and synthetic records. Never copy production records. |
| `NODE_ENV` | `staging` |
| `DATABASE_URL` | Isolated staging MongoDB URI only. The restored app also accepts legacy `database_url`; use uppercase for new staging. |
| `JWT_SECRET` | New random staging-only value. The code accepts legacy `secret` for compatibility, but new staging must use `JWT_SECRET`. |
| Payment | Sandbox `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`; do not point a webhook at production. |
| Video | Staging-only `VIDEO_MEETING_BASE_URL` or a deliberately disabled test configuration. |
| AI/email/SMS | Omit when that workflow is not under test; otherwise use test-only `GEMINI_API_KEY` or `OPENAI_API_KEY`, non-delivering `mail_user`, `mail_pass`, `MAIL_FROM`, `mail_port`, and sandbox/disabled `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`. |

The application reads the names above. No value from a production Render service was read, copied, or compared. Before a staging deployment, manually compare this list with the production environment-variable *names* in Render; do not reveal values in tickets, logs, or commits.

## Staging synthetic-data recipe

1. Create one staging-only administrator, one available doctor, one unavailable doctor, and two normal patients. Use synthetic names, `example.test` email addresses, placeholder phone numbers, and generated fallback artwork.
2. Create only future synthetic appointments in the isolated database. Exercise booking, waitlisting, rescheduling, cancellation, payment-pending and confirmed/completed/cancelled state transitions.
3. Test login success/failure, role denial, logout, all three dashboards, clinician registration, support threads, appointment tables/search/pagination, availability controls, responsive navigation, CSRF rejection, upload rejection, and sandbox webhook verification.
4. Capture test evidence without patient data or secrets. Reset the isolated database after testing.

## Regression evidence and gaps

Locally verified without external services: route-module import with payment credentials absent; all EJS templates compile; 19 backend tests pass; country/state/city endpoint contract returns expected synthetic assertions; static active-reference scan shows old patient photo/logo/icon paths no longer appear in active source templates; an isolated local startup returned 200 from `/health`, `/`, and `/countries`; unauthenticated Patient, Admin, and Doctor entry pages rendered in a local browser smoke check.

Not yet verified because no isolated database, sandbox provider credentials, or browser end-to-end harness has been provisioned: authenticated Admin/Doctor/Patient actions, a live Render build, real browser responsiveness, payment webhook delivery, email/SMS/AI/video behavior, persistent upload display, and legacy image references from an existing database. These are staging gates, not claims of successful production behavior.

## Remaining DataVendor blockers

1. Owner/counsel decision on ODbL attribution and share-alike treatment for the bundled address data.
2. Owner evidence or explicit export exclusion for every legacy asset, user upload, third-party provider logo, and unknown patient graphic.
3. A clean source-only export process that omits `.git` history, `.env`, generated uploads, `node_modules`, old audit artifacts, logs, databases, and restricted historical files. The original Git repository must remain as an untouched backup.
4. A final current-tree secret scan and staged-file review immediately before any archive is created.
5. Staging evidence using synthetic data and sandbox credentials, followed by explicit approval before any production merge/deployment or commercial upload.
