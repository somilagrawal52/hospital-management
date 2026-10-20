# OneLife architecture

OneLife is a server-rendered Express application. `backend/index.js` configures Express, MongoDB, static assets, security middleware, views, and the health endpoint. `backend/routes/user.js` owns the HTTP route map; controllers own workflows; Mongoose models persist users, appointments, support threads, and waitlist entries.

## Interfaces

- Patient views: `frontend/patient/views`, served under `/assets`.
- Administration views: `frontend/Admin`, served with original shared console assets at `/console-assets`.
- Doctor views: `frontend/doctor`, also served with the shared console assets.
- Browser authentication: signed JWT in an `httpOnly`, `SameSite=Lax` cookie.
- Payments: Razorpay order creation, browser verification for immediate feedback, and a raw-body webhook as the reconciliation path.

## Trust boundaries

- Routes establish `req.user` from the signed cookie, then apply `requireAuth` and role checks.
- Unsafe browser requests must have a same-origin `Origin` or `Referer`; `/webhooks/razorpay` is intentionally registered before this guard and validates its own signature.
- API responses use explicit projections for administrator and doctor appointment/doctor listings.
- Uploaded profile images are constrained by field, MIME allowlist, and 2 MB size limit. MIME checks are not content scanning; staging validation should include malicious-file tests.

## Important limitation

The booking flow checks availability before saving a payment-pending appointment. It is not a database-enforced, atomic slot-reservation protocol. A production-scale implementation needs an owner-approved migration/rollout plan for unique slot holds or a transaction-capable MongoDB deployment.
