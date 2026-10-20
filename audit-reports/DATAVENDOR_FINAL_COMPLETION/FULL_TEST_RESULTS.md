# Full test results

Executed locally without submitting credentials or contacting payment, messaging, AI, or production services.

| Command | Result |
| --- | --- |
| `npm --prefix backend test` | 18 passed, 0 failed |
| EJS compile script across `frontend` | 41 templates compiled |
| `node --check` on changed backend entry/routes/controllers | Passed |
| `npm audit --omit=dev --audit-level=high` | 0 production vulnerabilities |
| `npm audit --audit-level=high` | 3 high findings through development-only `nodemon` → `chokidar` → `braces`; force fix proposes a breaking downgrade and was not applied |
| Route module import without payment configuration | Passed; Razorpay client now fails only when a payment operation is invoked |
| Admin login empty-submit/browser layout check | Previously passed on local unauthenticated GET; no account submission made |

Untested: database persistence, login success/failure server paths, cookies/redirects after authentication, multipart upload, Razorpay sandbox event, provider calls, authenticated UI screenshots, and live responsive behavior. These require the isolated staging setup.
