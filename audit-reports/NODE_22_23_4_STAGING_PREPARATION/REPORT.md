# OneLife — Node 22.23.4 staging preparation

23 October 2026, Asia/Calcutta. Verdict: **READY FOR STAGING as a locally verified mock-only candidate**, subject to approval of the successor branch push, actual Render/MongoDB plans and provisioning controls below. This is not an assertion that cloud resources already exist, a production-release authorization or DataVendor legal clearance.

## Scope and approved changes

Baseline local/remote development: `8b6e31e42805863a70c98b3009ed1392fd365388`. Local master, cached origin/master and GitHub master were verified at `30c4d3e8195ce10f8da4b692dbc1a65618fd670c`. The owner separately approved adding staging-only access and database destination guards during this verification. A reviewed local successor commit is required; the remote remains at 8b6e31e until another approved push. No production service/database/credential was accessed or modified. No dependency, frontend or database schema changes were made.

Changed source: `backend/index.js` (validate before SDK/router imports; mount staging access), `services/runtime-config.js`, new `services/staging-safety.js`, new `middlewares/staging-access.js`, `.env.example`, new `scripts/seed-staging.cjs`. Updated tests: `integration-isolation.test.js`, `staging-browser.cjs`, `verify-build-start.cjs`, new `staging-safety.test.js`. Documentation: README, deployment guide, staging runbook, this report and sanitized browser evidence. Existing untracked migration reports remain untouched/excluded.

## Actual Node/build/test verification

The official Windows x64 Node 22.23.4 ZIP was downloaded into a new temporary directory, not installed globally. SHA-256 matched the official version-specific manifest: `cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20`. The selected runtime prints `v22.23.4`; its own npm and node were first in the build PATH. A clean tracked/index source fixture contained no .env, inherited node_modules, runtime uploads or untracked audits.

| Check | Result |
| --- | --- |
| Exact production build, NODE_ENV=production | Exit 0; backend ci omit-dev (208 packages), frontend ci include-dev (72), one-shot minified Tailwind |
| Backend suite on selected Node | 40/40 pass, 0 skipped |
| Browser suite, real new loopback MongoDB 8.0.17 | 50/50 pass; zero recorded external sockets/resources; see browser-results.json |
| Static checks on selected Node | 41 EJS templates, 55 JS/CJS files, 11 inline scripts, 27 static references, 12 tokenized forms; no failures |
| Exact npm start smoke from clean fixture | Starts, connects only to isolated MongoDB, /health returns 200 |
| CSS reproducibility | SHA-256 `8fa90e5e0d090ed479c32b07befe895440fe066f6eb838122fe3d20a927b4fa7`, matching prior build/source |
| Backend full audit; frontend production-only audit | Zero vulnerabilities |
| Frontend full audit | Seven findings: five high, two moderate; unchanged |
| git diff/check and staged secret-pattern review | Pass; 15 staged files, no high-confidence secret patterns or actual tracked .env files; nine pre-existing untracked audit reports excluded. This is a scoped pattern scan, not a universal secret guarantee. |

Commands run with the selected runtime: `npm --prefix backend ci --omit=dev`; `npm --prefix frontend/patient ci --include=dev`; exact compound build below; `npm --prefix backend test`; `node backend/test/verify-static.cjs`; `node backend/test/staging-browser.cjs` with an explicit fresh loopback `onelife_test_*` URI, local Playwright and loopback-only socket guard; `node backend/test/verify-build-start.cjs` with explicit clean-fixture/loopback inputs; npm audits; git diff checks. The seed CLI was separately exercised against loopback `/onelife_staging` with generated, unprinted passwords.

An initial startup-regression subprocess timed out while loading SDK/router imports before configuration validation. Validation was moved immediately after dotenv loading so wrong-target startup now fails before those imports and before mongoose.connect; the regression passes. An initial fixture copy command was run from the temporary non-Git directory and refused without changing the repository; the corrected staged-source copy and final runs were used. No application security checks were disabled to obtain results.

Browser coverage retains the earlier role/CSRF/booking/payment simulation/invoice/status/calendar/rescheduling/waitlist/support/profile/registration/table/navigation/390-768-1440px checks and adds anonymous/incorrect staging-credential rejection for pages, assets, APIs and webhooks. The seed test confirms five users, correct role counts, bcrypt hashes, wrong-target/missing-confirmation rejection, and refusal to overwrite on a duplicate run. Live payment/mail/Twilio/AI/video, hosted Linux Render behavior, multi-instance/load/concurrency and all input/upload error cases are not claimed tested.

## Enforced isolation and its limits

- `APP_ENV=staging` requires `NODE_ENV=production`, explicit mock/disabled mode and no live Razorpay/Twilio/AI/mail credentials. Production defaults remain live when staging settings are absent; production behavior is covered by non-staging regression tests.
- The new destination guard requires independently supplied `STAGING_MONGO_HOST` and `STAGING_MONGO_DATABASE`. URI protocol/host/path must match; dbName overrides and conflicting lowercase aliases are refused. Dedicated `onelife_staging` or explicit local synthetic `onelife_test_*` names are allowed. An actual startup test proves a mismatched target fails before mongoose.connect. The guard does not query production or try guessed credentials.
- The guard cannot establish physical ownership of an arbitrary hostname. Actual production-data exclusion additionally requires a separate Atlas project/cluster, database-scoped new user and no production credentials/groups. Verify these after provisioning; they cannot be certified before the resources exist. Render region egress ranges are shared and an IP allowlist alone is not identity isolation. Do not change production network rules or assume they can distinguish two same-region Render services.
- Mock boundaries prevent current payment/email/WhatsApp/AI/WHO/video SDK calls; browser CSP restricts provider resources. Tests instrument/deny external attempts and record zero. This is not an OS-wide outbound firewall or a guarantee about future unreviewed code.

## Access protection

Every staging route, static asset, API and mock webhook requires independent Basic authorization over HTTPS before normal role/session/CSRF handling. Only exact GET/HEAD `/health` bypasses it and exposes liveness only. Incorrect credentials return 401 with a challenge; plain HTTP is refused without requesting credentials. Responses are no-store. The public onrender.com hostname has the same guard, so an external proxy cannot be bypassed to reach unprotected application routes. Credentials are constant-time hash-compared and never logged by this middleware. Use a high-entropy password; share it only with testers through a private channel and use a separate browser profile/incognito because browser Basic credentials can remain cached after application logout.

This avoids depending on paid Render web-service IP restriction features. [Render inbound rules](https://render.com/docs/inbound-ip-rules) currently require Scale/Enterprise for web services; [private services](https://render.com/docs/private-services) have no public browser URL. Optional infrastructure restrictions may be added later with approval; no account/plan feature has been assumed available.

## Frontend build-tool risk decision

The remaining findings are a braces <=3.0.3 nesting/stack-exhaustion advisory propagated through Tailwind/chokidar/micromatch/fast-glob and selector-parser CPU exhaustion propagated through postcss-nested. [Braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); [selector-parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). npm's proposed Tailwind 4 upgrade is breaking and was not applied; no dependencies/lockfiles were altered in this milestone.

Assessment: **bounded, acceptable for this controlled staging build under these controls**, not zero risk or blanket production approval. The exact build processes reviewed static index.css and fixed `./views/**/*.{ejs,js,html}` globs from a clean pinned source snapshot. No user-controlled patterns, uploaded files, database content or untrusted PR changes may enter the build; no Tailwind watch/compiler runs in the serving process. Current runtime writes uploads into the assets tree, so never rebuild against a reused runtime/upload directory. Do not accept untrusted source into this build. Compile before adding runtime database/access secrets; avoid provider secrets entirely. The likely exposed failure is an isolated build denial of service, not a known provider-runtime path here. Reassess if inputs, compiler invocation or hosting isolation change. Use separate staging quotas so a failed build cannot consume production's limits. Owner approval remains needed for the documented residual risk.

## Proposed plans — not created or approved

- Render: Free Node web service in a **separate staging workspace with independently verified quotas/billing**; no disk or paid add-ons. Verify actual account eligibility and spend limits before creating anything. If a separate free workspace is unavailable, stop for an explicit alternative plan; never silently upgrade or attach staging to production's shared quota.
- MongoDB Atlas: Free cluster (formerly M0) in a **new staging-only project**, database `onelife_staging`, no sample/production restore and no paid upgrade/add-ons. Verify actual account eligibility, region and billing first.
- Important: [Render Free](https://render.com/docs/free) shares 750 Free service hours per workspace; exhausting them suspends its Free web services. Pipeline/bandwidth usage also has billing/limit implications. Free instances sleep and lose filesystem writes on restarts/spindown. This application stores invoices/uploads locally, so those synthetic artifacts are disposable; no persistent-storage guarantees. [Atlas Free](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/) is a development option, not a healthcare production plan.

## Exact service configuration

| Setting | Value |
| --- | --- |
| New service | onelife-staging only, in approved isolated workspace |
| Repository | https://github.com/somilagrawal52/hospital-management |
| Branch | datavendor-improvements; reviewed successor commit containing these guards, NOT old remote 8b6e31e |
| Root Directory | Leave blank (repository root) |
| Auto-Deploy | Off |
| Runtime env | NODE_VERSION=22.23.4, NODE_ENV=production |
| Start | npm --prefix backend start |
| Health check | /health, liveness only; independently verify MongoDB-backed role login |
| Domains / environment groups | No production domains, no inherited/shared environment groups |
| Plan | Proposed Free only after owner/account-quota approval; no automatic fallback |

Build command:

```bash
npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)
```

Required service environment names/values (secrets supplied privately):

| Name | Value/source |
| --- | --- |
| NODE_VERSION | 22.23.4 |
| NODE_ENV | production |
| APP_ENV | staging |
| INTEGRATION_MODE | mock |
| DATABASE_URL | New restricted staging URI with explicit /onelife_staging |
| STAGING_MONGO_HOST | Independently verified exact isolated SRV/cluster hostname, no scheme/credentials/port |
| STAGING_MONGO_DATABASE | onelife_staging |
| JWT_SECRET | Fresh random secret, at least 32 characters |
| STAGING_BASIC_AUTH_USER | New staging reviewer username, safe ASCII 3-64 characters |
| STAGING_BASIC_AUTH_PASSWORD | Different random secret, at least 32 characters; do not reuse JWT/account/database credentials |
| PUBLIC_BASE_URL | Actual assigned HTTPS staging origin |
| PORT | Let Render supply it |
| MOCK_WEBHOOK_SECRET | Optional distinct random secret for locally signed synthetic webhook tests |

Omit RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, GEMINI_API_KEY, OPENAI_API_KEY, mail_user and mail_pass; staging refuses them. Mail/video settings are unnecessary in mock mode. Do not rename/copy .env.example into Render or copy production .env/groups. No sandbox-provider credentials are needed or authorized.

## Database and synthetic seeding

After explicit plan/provisioning/seeding approval: create the isolated project/cluster and a new database user with readWrite only on onelife_staging; do not select readWriteAnyDatabase/admin roles. Limit cluster access to the approved staging/operator sources, not 0.0.0.0/0. [Atlas users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/), [project IP rules](https://www.mongodb.com/docs/atlas/security/ip-access-list/), [Render egress ranges](https://render.com/docs/outbound-ip-addresses). Check actual host/project/database and permissions privately; do not test access using production credentials or contact production to prove a negative.

The new seed script runs on a trusted operator machine from the repo root and never loads .env or imports provider controllers. Privately supply:

- ONELIFE_STAGING_DATABASE_URL (explicit /onelife_staging) and ONELIFE_STAGING_MONGO_HOST;
- ONELIFE_SEED_CONFIRM=onelife-staging-synthetic-only;
- ONELIFE_SEED_ADMIN_PASSWORD, ONELIFE_SEED_DOCTOR_PASSWORD, ONELIFE_SEED_PATIENT_PASSWORD: three distinct new random values, each at least 16 characters. Keep these seed-only inputs off Render and out of shell history/source/chat.

Run `node --version` (must be v22.23.4), then `node backend/scripts/seed-staging.cjs`. It refuses nonempty User collections; no deletion/reset/overwrite occurs. A partial create on database failure requires private inspection before retrying, not an automatic reset. Clear seed-only inputs afterwards.

| Synthetic account | Role |
| --- | --- |
| admin@onelife.example.test | ADMIN |
| doctor@onelife.example.test | DOCTOR, available |
| doctor-paused@onelife.example.test | DOCTOR, paused |
| patient-a@onelife.example.test | NORMAL (Patient) |
| patient-b@onelife.example.test | NORMAL (Patient) |

Accounts use model bcrypt hashing, reserved addresses, empty phone numbers and original safe avatar fallback. Test appointments/messages through the UI with mock checkout; do not import production fixtures. Local seed tests created five users and confirmed the role counts/hashes, missing-confirmation/wrong-target rejection and duplicate-run refusal without overwrite. No remote accounts were created.

## Manual sequence / remaining blockers

1. Review the new local guard commit, its staged secret scan and results. Approve a single-branch successor push; remote development still points to 8b6e31e. Never merge/push master or create tags. Reconfirm actual remote master remains 30c4d3e before/after that push.
2. Approve actual Render workspace/Free service and Atlas project/Free cluster plans, eligibility, independent production quotas and spending controls, the build-tool residual, and remote synthetic seeding. No infrastructure has been created.
3. Provision isolated Atlas only after approval, verify restricted role/IP rules and exact destination, then use the guarded seed procedure. No production restore, credentials or network-rule changes.
4. Prepare the new Render service form with the table/variables above. Configure Auto-Deploy Off and all guards before its first build. Service creation can trigger a deployment: do not click Create/Deploy before deployment approval. Leave existing production service, domains, groups and master untouched.
5. After approved creation, verify reviewed SHA, runtime/build, public /health, anonymous 401 on application/assets/APIs, wrong Basic credentials denied, correct Basic credentials plus normal three role logins, CSRF and mocked workflows. Follow the full authenticated acceptance checklist in docs/STAGING_VERIFICATION_RUNBOOK.md; record redacted evidence and confirm no providers were contacted.
6. Rollback only staging to its last successful retained artifact; on its first failed deployment suspend staging. Local file/database writes are not rolled back by a code rollback. Do not touch production routing or restore/delete databases. No production release or DataVendor archive/upload is authorized.

Remaining non-cloud limitations: no full concurrency/load/healthcare compliance claim; ephemeral invoice/upload behavior; no live provider testing; ODbL/wrapper/asset rights still require separate commercial review. These do not justify altering the hosted original project. The production Render deploy was not accessed or independently inspected; unchanged Git refs plus no production operations are the verified facts.
