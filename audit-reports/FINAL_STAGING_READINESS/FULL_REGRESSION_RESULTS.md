# Full local regression results

Runtime: Windows, Node 22.17.0; installed Edge via Playwright; MongoDB 8.0.17 bound to loopback with a new temporary data directory. No production database, model doubles, security-header override or diagnostic CSS override. Tests seeded synthetic users via the actual bcrypt model hook and persisted appointments/support/availability/waitlist records. Each final browser run used a fresh `onelife_test_*` database.

| Check | Result |
| --- | --- |
| `npm --prefix backend test` | 31/31 pass, 0 skipped/failures |
| `node backend/test/verify-static.cjs` | 41 EJS templates, 51 JavaScript files, 11 inline scripts, 27 static references, 12 explicit-token forms; 0 failures |
| `node backend/test/staging-browser.cjs` with explicit loopback test URI and installed Playwright module | 49/49 pass; `browser-results.json` contains labels and viewport evidence |
| Exact clean-checkout Render build with NODE_ENV=production | Exit 0; npm ci backend omit-dev and frontend include-dev, one-shot Tailwind |
| Tailwind SHA-256 comparison | Clean build and working source both `8fa90e5e0d090ed479c32b07befe895440fe066f6eb838122fe3d20a927b4fa7` |
| `node backend/test/verify-build-start.cjs` with explicit clean fixture and loopback test URI | Exact npm start command, actual MongoDB connection and /health pass; initial fixed-port collision was corrected in the test harness |
| Backend production/full dependency audits | Zero findings |
| Frontend production audit | Zero findings; full build-tool audit has seven findings |
| `git diff --check HEAD` | Pass |

Browser coverage: seven public pages; three role logins and wrong credentials; validation/cookies/redirects/logout; authenticated Admin/Doctor/Patient navigation; Admin sensitive-response filtering and cross-role denial; table pagination/search/sort; saved weekly calendar; multipart clinician registration and password hashing; profile update; support persistence/inbox; mock booking/checkout and invoice; invoice ownership and cross-patient denial; rescheduling/history; waitlist duplicate/cancel; online request/approval/local video/calendar; doctor/admin status changes; synthetic webhook signatures; address fields/UT alias; disabled providers; no external attempts, missing assets or uncaught JavaScript errors.

Entry and authenticated pages are measured at 390/768/1440 pixels with document-width/broken-image checks; mobile menu interaction passes. This is layout smoke testing, not pixel-perfect accessibility certification or exhaustive browser coverage.

First runs exposed a real availability async-event error (fixed) and two test synchronization/expectation issues (registration awaited too early, logout legitimately 204). The final 49-check run has no suppressed application errors.

## Not tested / not claimed

No hosted Render deployment, real provider sandbox or live provider transaction. No real email delivery, WhatsApp delivery, AI accuracy, remote video media or reconciliation against a provider account. No full concurrency/load/fault-injection suite, all browser engines, all historical address identifiers, patient self-registration notification edge cases, every file-upload validation branch, production database migration, multi-instance behavior or comprehensive accessibility audit. File/invoice persistence across Render restarts still depends on its storage plan; the application currently uses local filesystem paths. `/health` is liveness only.

Test cleanup removes only exact files it created (synthetic upload and invoice). Original application images and records remain untouched. Local MongoDB fixtures are retained outside the repository for optional inspection and their server must be stopped after verification; they are not sale/export input.
