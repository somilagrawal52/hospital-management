# OneLife API and role boundaries

This is a concise operational reference, not a public API guarantee. Browser routes rely on cookie authentication, signed HMAC CSRF tokens (`X-CSRF-Token` / `_csrf`), and same-origin requests.

| Area | Routes | Access |
| --- | --- | --- |
| Admin sign-in | `GET/POST /admin/login` | Public; rate-limited POST |
| Doctor sign-in | `GET/POST /doctorlogin` | Public; rate-limited POST |
| Patient sign-in | `GET/POST /login`, `GET/POST /register` | Public; rate-limited login POST |
| Admin console | `/admin`, `/doctors-registration`, `/doctors-detail`, `/showmsg`, `/profile`, `POST /admin/walk-in`, `POST /admin/reminders/dispatch` | `ADMIN` |
| Doctor console | `/doctor`, `/showdocmsg`, `/doctor/availability`, `/doctor/consult/:id`, `POST /doctor/consult/:id/prescription`, `POST /doctor/queue` | `DOCTOR` |
| Availability & Waitlist | `GET /doctors/:doctorId/slots`, `PATCH /doctor/availability`, `POST /waitlist`, `POST /waitlist/:id/cancel` | Public/Doctor/Patient with 15-min priority waitlist claims |
| Appointments & Billing | `/appointment`, `/appointments/:id/reschedule`, `/appointments/:id/intake`, `/appointments/:id/review`, `/appointments/status`, `/download-pdf` | Patient, patient, patient, doctor/admin, authorized owner (regenerates GST PDF if absent) |
| Clinical Records & Rx | `/health-records`, `/prescriptions/:id/pdf`, `/rx/verify`, `/rx/verify/:code` | Patient / owner / public pharmacy verification (masked identity) |
| Family Care & Profile | `/my-profile`, `/update-profile`, `/profile/dependents`, `/profile/dependents/:id/delete` | `NORMAL` |
| Safe listings | `/admin/doctors-detail`, `/admin/appointments`, `/doctor/appointments` | Role-gated and projected |
| Razorpay webhook | `POST /webhooks/razorpay` | Razorpay signature required |

### Response minimization

The administration doctor listing never returns a password hash, salt, or availability schedule. Admin and doctor appointment JSON excludes payment identifiers and embedded patient/doctor account snapshots. Public prescription verification (`/rx/verify/:code`) masks patient identity and exposes only issuing clinician credentials, verification status, date, and medication summary. Do not add model-wide JSON responses without an explicit projection and a regression test.
