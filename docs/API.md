# OneLife API and role boundaries

This is a concise operational reference, not a public API guarantee. Browser routes rely on cookie authentication and same-origin requests.

| Area | Routes | Access |
| --- | --- | --- |
| Admin sign-in | `GET/POST /admin/login` | Public; rate-limited POST |
| Doctor sign-in | `GET/POST /doctorlogin` | Public; rate-limited POST |
| Patient sign-in | `GET/POST /login`, `GET/POST /register` | Public; rate-limited login POST |
| Admin console | `/admin`, `/doctors-registration`, `/doctors-detail`, `/showmsg`, `/profile` | `ADMIN` |
| Doctor console | `/doctor`, `/showdocmsg`, `/doctor/availability` | `DOCTOR` |
| Availability | `GET /doctors/:doctorId/slots`, `PATCH /doctor/availability` | Public slots; doctor update |
| Appointments | `/appointment`, `/appointments/:id/reschedule`, `/appointments/status` | Patient, patient, doctor/admin respectively |
| Safe listings | `/admin/doctors-detail`, `/admin/appointments`, `/doctor/appointments` | Role-gated and projected |
| Razorpay webhook | `POST /webhooks/razorpay` | Razorpay signature required |

### Response minimization

The administration doctor listing never returns a password hash, salt, or availability schedule. Admin and doctor appointment JSON excludes payment identifiers and embedded patient/doctor account snapshots. Do not add model-wide JSON responses without an explicit projection and a regression test.
