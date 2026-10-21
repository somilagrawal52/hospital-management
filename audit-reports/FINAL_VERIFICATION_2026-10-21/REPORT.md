# OneLife final verification — 21 October 2026

## Decision

Do not deploy this revision or describe it as ready for a DataVendor submission. Verification found an HTML-form login failure, address API incompatibilities, a new production dependency advisory, and missing provider-isolation controls. This report supersedes the readiness claims and staging settings in the 20 October completion reports. No application source, dependency, production branch, database, or Render setting was changed during this verification.

## Git baseline

- Branch inspected: `datavendor-improvements`.
- Implementation/documentation HEAD inspected: `95acce3d67a934ec268937c2ad5dd6cc641adcbe`.
- Local `master`: `30c4d3e8195ce10f8da4b692dbc1a65618fd670c`.
- Locally cached `origin/master`: the same `30c4d3e` SHA. No fetch or live Render/GitHub account check was performed.
- Commits ahead of master: `1e51ab6` (Admin login), `ec0f328` (console/hardening), `1513eb2` (address/assets), `95acce3` (documentation).
- Initial tracked working tree: clean. The nine pre-existing untracked Markdown files under `audit-reports/DATAVENDOR_FRONTEND_MIGRATION/` remain untouched.
- This verification adds evidence/documentation only. A subsequent documentation-only commit, if made, can be identified with `git log -1`; the tested application revision remains `95acce3`.

## Critical: browser login forms fail

The unmodified application was run with `NODE_ENV=production` behind a local HTTPS test listener, synthetic in-memory model doubles, real EJS/controllers/bcrypt/JWT, and blocked external integrations. All three HTML login forms posted `Origin: null`, with no Referer, and received HTTP 403 from `requireSameOrigin` before credential validation.

Cause: `backend/index.js` enables Helmet's default `Referrer-Policy: no-referrer`. Under that policy, ordinary form submissions can carry `Origin: null`. `backend/middlewares/csrf-origin.js` treats that as a nonmatching origin. MDN documents this browser behavior: [Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin), [Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy). Helmet's default is documented in its [upstream reference](https://helmetjs.github.io/).

A diagnostic run changed only the Helmet response policy inside the temporary test harness to `same-origin`; all 36 diagnostic checks then passed. This is evidence for a small proposed header fix, not a fix applied to the repository. Do not accept arbitrary `Origin: null` requests or disable CSRF protection as a workaround. Before staging, apply and review the targeted header change and add a real browser form-submission regression test.

## Address API compatibility: failed

Compared exact `country-state-city@3.2.1` (downloaded into a temporary folder, never added to the project) with installed `@countrystatecity/countries@2.0.0`. The previous report's statement that the response shape was preserved was incorrect. Route URLs are preserved; payload contracts and coverage are not.

| Route | Previous fields now absent/renamed | Current behavior |
| --- | --- | --- |
| `/countries` | `isoCode`, `flag`, `timezones` | `iso2` and `emoji` replace two fields; `getCountries()` omits timezones; numerous new fields appear |
| `/states/:countryCode` | `isoCode`, `countryCode` | `iso2`, `country_code`; added numerical IDs and metadata; some coordinates are nullable |
| `/cities/:countryCode/:stateCode` | `countryCode`, `stateCode` | `country_code`, `state_code`; new numerical IDs and metadata |

| Dataset | Previous raw rows | Current raw rows |
| --- | ---: | ---: |
| Countries | 250 | 250 |
| States | 4,963 | 5,328 |
| Cities | 148,038 | 152,152 |

All 250 country codes remain, but names can differ. Comparing distinct country/state keys found 474 previous keys absent and 839 new keys. India still has 36 state rows, but Uttarakhand changes from `UT` to `UK`; an old `/cities/IN/UT` selection is no longer supported. Maharashtra cities change from 574 to 547. Albania changes from 47 state rows to 12. City-name/state tuples have extensive changes; numerical IDs introduced by the replacement were never part of the old API and cannot be assumed to map existing saved data.

Both packages return empty arrays for the tested unknown/lowercase country/state queries; the Mumbai happy path still works. The existing address test verifies only three current-data lookups and does not prove backward compatibility. No checked-in frontend consumer of these endpoints was found, but `User` has country/state/city fields and external consumers or existing records have not been inspected.

Required before accepting this change: an original adapter restoring the legacy field contract (country timezones require the package's full country metadata), tests for field names and invalid selections, and an explicit decision on changed identifiers/coverage. Do not copy the old GPL implementation/data back into the sale source to conceal incompatibilities. See `address-comparison.json` and `compare-address.cjs` for evidence/reproduction.

## Frontend asset and CSS checks

- Scanned 55 EJS/CSS/JavaScript files, finding 32 literal local asset references across 15 distinct URLs. All resolve to existing source files in the actual Express static mounts. No CSS-relative local file URLs were found.
- Includes Admin/Doctor login styles, shared console CSS/JS, Patient scripts/styles, the two original SVGs and two generated PNGs. No remaining static vendor-bundle references were found in active templates.
- Browser checks found no broken image loads, missing asset HTTP responses, or JavaScript exceptions in the checked pages.
- Dynamic doctor/profile/appointment images were exercised with synthetic records and the actual fallback resolver. Real database image paths, runtime uploads and old record snapshots remain unverified; valid filesystem references do not establish redistribution rights.
- The appointment template still references `https://checkout.razorpay.com/v1/checkout.js`. It is an external asset and was not fetched. Provider-dependent booking tests require a stub before opening that workflow.
- Committed Patient `tailwind.css` lacks some classes introduced in the recent templates. At 390px, home/login document width measured 469px. A fresh local Tailwind build, served only through a harness override, restored 390px width on both pages. The source CSS was not overwritten. The corrected staging build must compile Tailwind once, without `--watch`.

## Tests actually run

Local runtime: Node `v22.17.0`; browser: installed Microsoft Edge through bundled Playwright. No repository browser test command or Playwright dependency exists. The evidence harness supplies that tooling from the operator's runtime without changing package dependencies.

| Check | Result |
| --- | --- |
| `npm --prefix backend test` | 19 passed, 0 failed |
| EJS compiler over frontend templates | 41 compiled |
| Local asset-reference check | 15 distinct local URLs found, zero missing |
| Current browser baseline, production mode over local HTTPS | 12 passed, 3 failed: Admin, Doctor and Patient form login each returned 403 |
| Diagnostic with only a harness `same-origin` referrer-policy override | 36 passed, 0 failed; source remains unchanged |
| Diagnostic with that policy plus freshly built Tailwind CSS | 36 passed, 0 failed; checked home/login pages fit 390px and 1440px |
| `npm --prefix backend audit --omit=dev --audit-level=high` | Failed: 1 high, `follow-redirects@1.16.0` |
| `npm --prefix backend audit --audit-level=high` | Failed: 4 highs, including the production finding plus development `nodemon → chokidar → braces` chain |

Production advisory references: [credential stripping](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8), [sensitiveHeaders escaping](https://github.com/advisories/GHSA-8r9p-f939-6h3c). No dependency fix was applied in this verification phase. Do not reuse the previous zero-production-vulnerability claim.

The 36 diagnostic checks cover public entry pages; all three successful and failed logins; redirects and Secure/HttpOnly/SameSite cookies; Admin dashboard, registration form, clinician list, support inbox and profile; Doctor dashboard, requests and availability; Patient profile, directory, appointments and support; doctor-table search/sort/pagination; seven-day calendar and exception UI; Patient denial from Admin/Doctor APIs; missing-origin 403; and incomplete-booking 400 before provider invocation.

Not tested: real MongoDB connectivity/persistence/index behavior, account or clinician creation through the UI, file upload persistence/rejection, complete paid booking, payment-success/invoice reconciliation, webhook delivery/replay/idempotency, saved appointment status changes, rescheduling/waitlisting/cancellation, support-thread persistence, video lifecycle writes, rate-limit exhaustion, exhaustive cross-record access, or any Render deployment. The mocks cannot establish database correctness. Existing unit tests cover some underlying scheduling/signature logic only. Incorrect Patient login currently renders an error with HTTP 200, unlike Admin/Doctor HTTP 401; diagnostic UI feedback passed.

### Reproduce browser evidence

Run from the repository root. Point `ONELIFE_PLAYWRIGHT_MODULE` to an existing installed Playwright module and `ONELIFE_BROWSER_EXECUTABLE` to a local browser. This machine used the bundled Playwright installation and `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. The harness uses Git for Windows OpenSSL (override `ONELIFE_OPENSSL_EXECUTABLE` if needed) to create one-day localhost TLS files in a temporary directory.

```powershell
$env:ONELIFE_PLAYWRIGHT_MODULE = 'C:/Users/somil/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:ONELIFE_VERIFY_REFERRER = '0'
$env:ONELIFE_VERIFY_BUILT_CSS = '0'
node audit-reports/FINAL_VERIFICATION_2026-10-21/verify-local.cjs
```

Baseline exit code is intentionally nonzero when the three form-login checks fail. For the diagnostic only, set `ONELIFE_VERIFY_REFERRER=1`; this environment name is read solely by the harness and has no application effect. To verify the build diagnostic, first run the following one-time CSS build and then set `ONELIFE_VERIFY_BUILT_CSS=1`:

```powershell
$verificationCssPath = Join-Path $env:TEMP 'onelife-verified-tailwind.css'
Push-Location frontend/patient
node node_modules/tailwindcss/lib/cli.js -i index.css -o $verificationCssPath --minify
Pop-Location
$env:ONELIFE_VERIFY_CSS_FILE = $verificationCssPath
```

The harness intercepts MongoDB connection/model operations, replaces notification/payment boundaries and blocks external browser requests. No checkout `.env` is loaded and inherited provider credentials are cleared. Generated reports contain synthetic information only. The three JSON evidence files explicitly distinguish baseline and diagnostics. The temporary package-comparison copy and TLS private keys are not export material.

## Staging and legal disposition

Use the corrected [staging runbook](../../docs/DEPLOYMENT.md): repository root, `NODE_ENV=production`, compiled Patient CSS, isolated MongoDB and fresh JWT secret. No other application environment marker is required. There is no existing environment-controlled mock/disable mode for Gmail/Twilio/AI/Razorpay; full workflow staging remains blocked until providers are mocked/isolated. `VIDEO_MEETING_BASE_URL=https://video.invalid` avoids defaulting to public Jitsi but does not mock other services. `/health` is process liveness only and returns 200 independently of MongoDB readiness.

The package LICENSE asks for attribution to both the source database and `@countrystatecity/countries`, with ODbL/Database Contents License notices. ODbL permits commercial database use but excludes computer programs from its scope (section 2.3(a)); because the package labels its executable code and data together as ODbL, a clear software-code license/permission remains a legal question. Public API/output attribution, derivative database access/share-alike treatment, and DataVendor AI-training/sublicensing terms need owner/counsel approval. No legal clearance is claimed.

Legacy image/upload rights, generated-image commercial-use terms, the declared ISC package metadata versus owner-intended code rights, and exclusion of historical restricted material also remain owner/legal decisions. A branch push carries its ancestor history; it is not the sanitized DataVendor export. Do not create or upload the commercial package until a separate current-tree allowlist and rights/secret review passes.

## Approval boundary

Recommended next local scope: repair the Helmet/referrer interaction with browser regression coverage; restore and explicitly review the address API contract/identifier migration; patch the production dependency finding after reviewing the lockfile; add provider isolation suitable for staging. These changes are separate from this verification report. The Tailwind build correction is included in the staging instructions. No redesign is needed.

After those blockers are verified, request approval for the exact branch-only push and separate staging-service/database provisioning. Then execute the authenticated checklist in the runbook. Do not merge into `master` or alter the live Render service. No push, upload, deployment, Git-history rewrite or production-account access was performed here.
