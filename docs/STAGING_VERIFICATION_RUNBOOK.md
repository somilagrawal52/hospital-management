# OneLife isolated Render staging runbook

Updated 21 October 2026. This is a configuration and manual procedure, not authorization to push or deploy. See [current local results](../audit-reports/FINAL_STAGING_READINESS/FULL_REGRESSION_RESULTS.md): 31 backend tests and 49 isolated MongoDB browser checks pass. Earlier model-double diagnostics are superseded, not deleted. Review remaining build-tool audit and licensing risks before approval.

## Exact service settings

| Setting | Value |
| --- | --- |
| Service | New Node web service, `onelife-staging` |
| Git repository | `https://github.com/somilagrawal52/hospital-management` |
| Linked branch | `datavendor-improvements` |
| Root Directory | Leave empty: use the repository root |
| Build command | `npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)` |
| Start command | `npm --prefix backend start` |
| Health check path | `/health` |
| Auto-Deploy | Off for this new staging service; manual, approved deploys only |
| Node runtime | `NODE_VERSION=22.17.0` reproduces the tested version, not necessarily the latest secure patch. Retest a supported newer Node 22 patch before adopting it. |
| Environment groups | None; do not attach production groups |
| Custom domains | Use only the new staging hostname; leave production domains/DNS unchanged |

The blank Root Directory is essential: the backend loads EJS/static assets from `../frontend`. Render explicitly says files outside a service's root are unavailable during build/runtime. See [Render monorepo documentation](https://render.com/docs/monorepo-support). Earlier instructions to set root to `backend` are superseded.

The Tailwind command is a one-time build; `build:css` is now also one-time, while `watch:css` is local development only. Frontend build tools are installed with `--include=dev` even under production mode. Node starts from `backend` via npm's package script, with Render injecting runtime variables.

## Environment names and behavior

| Name | Staging configuration |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.17.0` for exact reproduction; retest a newer supported security patch separately |
| `APP_ENV` | `staging` (required isolation marker while retaining production behavior) |
| `INTEGRATION_MODE` | Explicit `mock`; `disabled` is suitable only if provider workflows are intentionally unavailable |
| `PUBLIC_BASE_URL` | Exact HTTPS staging origin; never the production hostname |
| `PORT` | Allow Render to supply it |
| `DATABASE_URL` | URI for a new staging-only MongoDB deployment/database named `onelife_staging`, using a new user with `readWrite` permission only on that database |
| `JWT_SECRET` | New random staging-only secret, at least 32 characters; 48 random bytes encoded as hex is suitable. Store privately, never in Git or this document. |
| `VIDEO_MEETING_BASE_URL` | Omit; mock mode creates local simulated video URLs and never navigates to Jitsi |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Omit; mock checkout and verification are local. Staging refuses these variables. Optional `MOCK_WEBHOOK_SECRET` must be independently generated for synthetic signed webhook tests only. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Omit; staging refuses them. AI returns a clearly marked simulation, not medical advice. |
| `mail_user`, `mail_pass`, `mail_port`, `MAIL_FROM` | Omit; mock notifications do not construct a transport or deliver. Staging rejects `mail_user`/`mail_pass`. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Omit; staging rejects them and mock messaging does not construct a client. |

`NODE_ENV=production` activates production validation, Secure cookies and generic errors. Do not set `NODE_ENV=staging`. The new `APP_ENV=staging` marker requires explicit mock/disabled integrations and rejects provider credentials. `APP_ENV=production` defaults to live and rejects mock/disabled modes, preventing silent production disablement. Omitting both new variables preserves existing production integration behavior.

Compatibility aliases currently accepted: `database_url`, `secret`, `port`. For a new service use the uppercase names above. Do not copy production values or environment groups. Actual Render production variables have not been read; the operator should compare names privately with this table. Avoid retaining two differently valued aliases.

Provider isolation is implemented at application boundaries and backed by a self-only browser CSP in isolated mode. Tests deny external sockets and remote browser resources. This is not an OS firewall against future unreviewed code: retain synthetic-only data and review new integrations. Blank credentials alone remain insufficient; use the explicit mode.

## Isolated MongoDB and synthetic accounts

After separate provisioning approval, create a staging-only MongoDB cluster/deployment. Do not restore production backups. Use a new database user whose role is restricted to `onelife_staging`, plus an allowlist limited to the staging service/operator where supported. Confirm both the database host and name independently; a staging-looking database name alone does not prove cluster isolation.

Seed via the actual `User` model, whose pre-save hook hashes passwords with bcrypt. Do not insert a plaintext password directly with `insertMany`/raw MongoDB, and do not use registration controllers to seed because they trigger notifications. The app's real role names are `ADMIN`, `DOCTOR`, and `NORMAL` for Patient.

The following manual PowerShell recipe is prepared only; it was not executed against any database. Run from `backend` on a trusted machine after privately setting `ONELIFE_STAGING_DATABASE_URL`, `ONELIFE_STAGING_MONGO_HOST`, `ONELIFE_SEED_PASSWORD`, and `ONELIFE_SEED_CONFIRM`. Require a new staging-only password (at least 16 characters). Set the confirmation to `onelife-staging-synthetic-only`. Populate these values through a secret manager or private shell input; do not paste credentials into chat, source, or shell command history. The script does not load `.env` or read the application's `DATABASE_URL`.

```powershell
@'
const mongoose = require('mongoose');
const User = require('./models/user');
(async () => {
  const uri = process.env.ONELIFE_STAGING_DATABASE_URL;
  const expectedHost = process.env.ONELIFE_STAGING_MONGO_HOST;
  const password = process.env.ONELIFE_SEED_PASSWORD;
  if (process.env.ONELIFE_SEED_CONFIRM !== 'onelife-staging-synthetic-only') throw new Error('Missing staging-only confirmation.');
  if (!uri || !expectedHost || !password || password.length < 16) throw new Error('Missing staging-only inputs.');
  const parsed = new URL(uri);
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) || parsed.hostname !== expectedHost || parsed.pathname !== '/onelife_staging') throw new Error('Staging host/database mismatch.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (mongoose.connection.name !== 'onelife_staging') throw new Error('Connected database mismatch.');
  const accounts = [
    { fullname: 'Synthetic Staging Admin', email: 'admin@onelife.example.test', role: 'ADMIN' },
    { fullname: 'Synthetic Staging Doctor', email: 'doctor@onelife.example.test', role: 'DOCTOR', speciality: 'General physician', degree: 'MBBS', experience: '4', fees: 500, available: true },
    { fullname: 'Synthetic Staging Doctor Paused', email: 'doctor-paused@onelife.example.test', role: 'DOCTOR', speciality: 'General physician', degree: 'MBBS', experience: '4', fees: 500, available: false },
    { fullname: 'Synthetic Staging Patient A', email: 'patient-a@onelife.example.test', role: 'NORMAL' },
    { fullname: 'Synthetic Staging Patient B', email: 'patient-b@onelife.example.test', role: 'NORMAL' },
  ];
  if (await User.exists({ email: { $in: accounts.map(a => a.email) } })) throw new Error('Synthetic accounts already exist; no accounts were overwritten.');
  for (const account of accounts) await User.create({ ...account, password, number: '', address: { line1: 'Synthetic clinic', line2: 'Test records only' }, image: '/assets/onelife-avatar.svg' });
  console.log('Created five synthetic staging accounts; no credentials printed.');
})().catch(() => { console.error('Staging seed failed; inspect privately without printing connection credentials.'); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
'@ | node -
```

The same `User.create`/bcrypt model path was exercised with five synthetic accounts in a fresh loopback MongoDB 8.0.17 database; this remote-host recipe itself has not been executed. A partial create is possible on connection failure; inspect synthetic records and resume deliberately. No destructive reset/migration is prescribed. Clear seed-only variables after use. Reserved addresses and empty phone numbers do not replace isolation.

## Authenticated acceptance checklist

Record expected/actual status, role, synthetic identifier, commit SHA and redacted evidence. Local persistent workflows now pass against real isolated MongoDB, not model doubles. Repeat this checklist on Render after deployment approval; local success does not certify the hosted environment.

| Area | Acceptance tests |
| --- | --- |
| Bootstrap and health | Exact staging SHA and `NODE_ENV`; templates/static files load; `/health` returns 200; separately confirm successful staging MongoDB connection and a synthetic query. `/health` does not check the database. |
| Authentication | Admin `/admin/login`, Doctor `/doctorlogin`, Patient `/login`; success redirects to `/admin`, `/doctor`, `/`; incorrect credentials; blank/invalid fields; no password echo; Secure/HttpOnly/SameSite cookies over HTTPS; expiration, invalid token, logout and post-logout denial; login throttling. |
| CSRF and roles | Same-origin HTML forms, multipart and JSON posts pass; cross-origin/missing/null-origin unsafe requests fail; signed-out APIs denied; wrong-role access denied; directly request another patient's/doctor's record with a separate cookie jar. |
| Admin | Dashboard counts/appointments, profile, sidebar/mobile menu, clinician list and detail, registration fields/photo upload, availability/status controls and confirmed destructive-action prompts. Do not use real identities or contact addresses. |
| Doctor | Login/dashboard, assigned-only appointments and online requests; table search, sort and pagination; status validation; weekly calendar and exceptions saved/reloaded; preview slots and global availability toggle. |
| Patient | Directory filters and profile links; image consistency; registration/profile fields; image upload/rejection; own-appointment list; responsive account menu/navigation; support form errors and messages. |
| Address | Legacy payload field names, flags/timezones, dependent state/city selections, unknown/lowercase codes, prior stored identifiers (including `IN/UT`), no data loss or unexplained selection reset. |
| Booking | Future valid date/slot and required fields; unavailable doctor/date rejection; two patients trying the same slot concurrently; stale slots and provider failures; doctor-record fee used; rupee display. Concurrent booking is not proven atomic by existing tests. |
| Payments/invoices | Mock checkout/order/verification only; invalid/replayed signature, duplicate success, interrupted browser redirect, captured/failed raw-body webhook, amount/order/ownership matching, invoice correctness and access denial to another patient. No real or provider-sandbox transactions. |
| Rescheduling/waitlist | Move to valid free slot; occupied/past/final-status rejection; history correct; cancel frees slot; waitlist join/duplicate/cancel/notify/fulfil; notifications captured by mock only. |
| Status and video | Admin/assigned doctor allowed; other roles/other doctor's records denied; transitions coherent; mock accept/decline/join/calendar; no public video host visited. |
| Support | Thread creation/reply/assignment/priority/resolution and cross-patient access denial; persist and reload. Mock any notifications. |
| Responsive/accessibility | 390, 768, 1440px; no horizontal page overflow; navigation opens/closes; keyboard access/focus, labels/errors, dialogs, tables and forms; images remain sized consistently. |

Only underlying unit/schema/signature checks and limited UI/route diagnostics have passed locally. Persistence, uploads, transactions/webhook reconciliation and cross-record authorization need the real isolated database plus mocks. Do not treat a visible page, HTTP 200 or `/health` alone as acceptance.

## Branch-only push — prepared, not executed

Before approving any push, review tracked/staged changes and historical secret/rights findings. This branch includes all original ancestor commits; a GitHub push is not the sanitized DataVendor artifact. Confirm repository visibility privately before publishing branch contents; public/private status was not reverified. The production service is user-confirmed to follow `master` with On Commit; its live settings and any custom webhooks/GitHub Actions were not inspected in this phase. Verify no external automation deploys development-branch pushes to production.

```powershell
git branch --show-current
git status --short --branch
git rev-parse master
git log --oneline master..datavendor-improvements
git -c remote.origin.mirror=false -c push.followTags=false push --no-follow-tags --recurse-submodules=no origin refs/heads/datavendor-improvements:refs/heads/datavendor-improvements
```

The final command is the exact intended action after explicit approval. It has one non-forced branch refspec, no tags, no submodule pushes and no `master` destination. Do not run `--all`, `--mirror`, `--force`, a bare `git push`, or even a network dry-run before approval. Commit the reviewed local documentation if it is to travel with the branch. No push/merge/deploy was run during preparation.

## Staging deployment sequence after approval

1. Resolve the login, API, dependency and provider-isolation blockers; rerun unmodified production-mode browser tests and backend/EJS checks. Review the exact staged diff for secrets and unintended files.
2. Privately record production service identity, linked `master`, currently live successful deploy ID/SHA (expected `30c4d3e` unless the owner has changed it), environment-variable names and rollback artifact availability. Do not edit the service.
3. Approve and run only the branch push above; separately approve staging MongoDB/Render provisioning. Recheck production's live deploy is unchanged.
4. Create the isolated database/user and seed synthetic accounts. Prepare staging-only JWT secret. Connect no production environment group, disk, webhook, custom domain or database.
5. Create `onelife-staging` with the table's settings and approved provider isolation. Creating a service can trigger its first deploy; treat Create Web Service as a deployment action requiring approval. Keep Auto-Deploy Off afterward.
6. Manually deploy the reviewed development SHA. Verify build exit, frontend CSS, actual Node version, `/health`, staging MongoDB connectivity, role logins and the full checklist. Capture evidence with secrets omitted.
7. Mark staging accepted only after expected persistent behavior and failure cases pass. Seek separate approval for any production merge/deploy and for the clean DataVendor export. Do not use the branch's `.git` history as the commercial package.

## Rollback and recovery

For staging, use only the staging service's last successful deploy. If this is its first deployment and no successful artifact exists, suspend that staging service; there is no previous staging build to restore. This has no relationship to production routing.

For a separately approved future production deployment, record the last successful production deploy ID/SHA before release. Render Dashboard → that service's Deploys → the retained successful deploy → Rollback → confirm the target. Dashboard rollbacks disable auto-deploy; leave it disabled until the underlying issue is resolved. Available rollback artifacts depend on the Render plan/retention. If the expected artifact is absent, stop and obtain an approved recovery deployment plan; do not reset/rewrite Git history.

Render rollbacks reuse build/configuration details but do not undo database writes or restore disk contents. Environment groups have separate behavior and their values are not restored simply by rolling back. This plan shares no environment groups and performs no schema migrations. Keep separate database backups and obtain explicit approval before any database restoration/deletion. See [Render rollbacks](https://render.com/docs/rollbacks), [deploys](https://render.com/docs/deploys) and [health checks](https://render.com/docs/health-checks).
