# Full test results

Historical results from 20 October. See [21 October verification](../FINAL_VERIFICATION_2026-10-21/REPORT.md) for current evidence: unit/EJS checks pass, but unmodified browser login fails and npm audit now reports a production high vulnerability.

Executed locally without submitting credentials or contacting payment, messaging, AI, or production services.

| Command | Result |
| --- | --- |
| `npm --prefix backend test` | 19 passed, 0 failed, including the offline country/state/city endpoint contract |
| EJS compile script across `frontend` | 41 templates compiled |
| `node --check` on changed backend entry/routes/controllers | Passed |
| `npm audit --omit=dev --audit-level=high` | 0 production vulnerabilities |
| `npm audit --audit-level=high` | 3 high findings through development-only `nodemon` → `chokidar` → `braces`; force fix proposes a breaking downgrade and was not applied |
| Route module import without payment configuration | Passed; Razorpay client now fails only when a payment operation is invoked |
| Active patient asset-reference scan | Passed; patient templates no longer reference the replaced legacy photos/logos/icons. Legacy asset files remain only for live-record compatibility and export exclusion. |
| Isolated local startup | Passed with a deliberately unavailable `mongodb://127.0.0.1` test URI and non-production environment values: `GET /health`, `GET /`, and `GET /countries` each returned 200; no production service was contacted. |
| Isolated browser smoke check | Passed for unauthenticated Patient home/login, Admin login, and Doctor login. The homepage exposed navigation, specialty links, responsive-menu control, generated hero/fallback visual references, and support link. No credentials were submitted. |
| Admin login empty-submit/browser layout check | Previously passed on local unauthenticated GET; no account submission made |

Untested: database persistence, login success/failure server paths, cookies/redirects after authentication, multipart upload, Razorpay sandbox event, provider calls, authenticated Admin/Doctor/Patient workflows, and live Render behavior. These require the isolated staging setup.
