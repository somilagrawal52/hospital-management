# Security and login verification

## Confirmed permanent fix

Helmet's former no-referrer policy could leave a legitimate form with an opaque/missing Origin and no Referer. The previous origin-only guard rejected it. Now a signed nonce plus session-cookie binding is required independently of these headers. An absent/opaque Origin is not a bypass: matching cookie, valid HMAC and matching submitted token are mandatory. Known hostile origins, foreign Referer without Origin, and cross-site Fetch Metadata are rejected even with a token.

Production CSRF cookies use the `__Host-` prefix, Secure, HttpOnly, SameSite=Lax and Path=/, with no Domain. Tokens are emitted via meta/hidden fields, not query strings. On authentication changes the old session's token fails. The shared helper never attaches it to a foreign origin. The webhook receives raw bytes before browser middleware and still requires its signature.

## Evidence

Five dedicated CSRF tests pass, including forged/missing tokens, correct origin without token, session rotation, multipart headers, missing Referer, hostile origins and cookie flags. Real browser tests with fresh synthetic MongoDB accounts pass Admin, Doctor and Patient invalid/successful login, redirects, production cookies, empty-field browser validation, role denial and logout. No diagnostic Helmet/header override or model doubles are used. See `browser-results.json` (49/49 overall).

Admin doctor responses were checked for absent password and salt; patient access to Admin/Doctor APIs is denied. Invoice download is owner-authorized and cross-patient rescheduling is denied. A signed synthetic webhook is accepted without CSRF; an unsigned event is rejected.

## Limitations and remaining risks

This is targeted regression testing, not a penetration-test or healthcare compliance claim. Concurrent appointment contention, distributed rate-limit behavior, brute-force/load behavior, multi-instance sessions, all upload error branches and every malformed-input combination are not certified. The isolated CSP retains unsafe-inline because existing EJS uses inline scripts/styles; live-mode CSP behavior is unchanged. CSRF protects writes, not XSS.

No real secrets were used in tests. Newly generated test-only keys stay in process memory/temp TLS fixtures, never in reports. The 55 staged files were scanned for private keys, known provider token patterns and credential-bearing MongoDB URIs: no high-confidence matches. No actual .env files are tracked (only .env.example); `git diff --cached --check` passes. This is a scoped pattern scan, not an exhaustive secret guarantee or a new history audit. Residual historical/export risks are summarized in `REMAINING_DATAVENDOR_ACTIONS.md`. Configured local secrets are not automatically verified public exposures.
