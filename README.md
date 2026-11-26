# OneLife Hospital Management & Telehealth Suite

**OneLife** is a production-ready, commercial-grade Hospital Management, Telehealth & Doctor Scheduling platform built with Node.js, Express 5, EJS, Tailwind CSS, MongoDB, Razorpay, and Jitsi WebRTC.

Designed as an end-to-end turnkey solution for hospitals, multi-specialty clinics, telemedicine providers, and digital health startups.

---

## Key Highlights & Commercial Features

- 🏥 **Multi-Specialty Clinician Directory & Verified Reviews**: Dynamic department filtering, real-time live doctor search, verified post-consultation star ratings, fees in INR, and verified clinician badges.
- 🎯 **Unified Hybrid OPD Queue, Walk-In Tokens & Delay Broadcast**: Single sequential daily queue uniting pre-booked clinic visits, telehealth, and reception-issued walk-in tokens (`/admin/walk-in`), real-time `Now Serving #X` + wait-time tickers, and 1-click doctor delay alerts.
- 💊 **Closed-Loop Clinical Intake, e-Prescription PDF & Pharmacy Verification**: 60-second pre-visit symptom/allergy brief, dedicated clinician Rx workspace (`/doctor/consult/:id`) with Indian dosing presets, downloadable PDF prescriptions, `/health-records` longitudinal locker, and public `/rx/verify/:code` pharmacist authenticity verification.
- 👨‍👩‍👧 **Family & Dependent Care Profiles**: Book OPD & video appointments for parents, spouse, or children under one account with independent blood group, ABHA ID (optional), and allergy alerts.
- 📅 **Dynamic Slot Scheduling, 10-Min Checkout Locks & Priority Waitlists**: Auto-expiring `payment_pending` slot holds, conflict-free India-timezone booking, 1-click rescheduling, and 15-minute priority waitlist claim links.
- 📹 **HD Telehealth Video Consultations**: Direct telehealth or in-clinic selection at checkout, browser-based Jitsi WebRTC rooms, `.ics` calendar sync, and linked Rx workspace from video calls.
- 💳 **Secure Razorpay Payments, Itemized GST Receipts & Reminders**: Server-side fee calculation, HMAC webhook reconciliation, collision/cancellation refund tracking, on-demand SAC `999312` GST tax invoice regeneration, and 24h/2h automated appointment & follow-up reminders.
- 🤖 **Care-Routed Clinical AI & Resilient Disease Guide**: Multi-turn Gemini/OpenAI assistant with emergency escalation that surfaces live matching OneLife clinicians + earliest open slots, plus offline Indian clinical disease guides (`Dengue`, `Typhoid`, `PCOS`, `BP`, `Diabetes`).
- 🌐 **Bilingual EN / हिंदी Portal & Print-Ready PWA Pass**: Live English/Hindi patient interface switcher, static-asset service worker for Tier-2/3 mobile speed, and 1-click printable OPD/Health passes.
- 🔒 **Enterprise Security**: Signed CSRF token rotation, Same-Origin protection, HTTP-only secure session cookies, bcrypt hashing, projected APIs, and isolated staging mode.

---

## Quick Start (Run Locally)

### Prerequisites
- Node.js 20+ (tested on Node 22)
- MongoDB instance (local or MongoDB Atlas)

### Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm --prefix backend install
   npm --prefix frontend/patient install
   ```

2. **Configure Environment Variables**:
   Copy `backend/.env.example` to `backend/.env` and update credentials:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Build Frontend Assets**:
   ```bash
   npm run build:css
   ```

4. **Start the Application**:
   ```bash
   npm start
   # Or for development with native watch:
   npm run dev
   ```

The application will be accessible at `http://localhost:8000`.

---

## Commercial Showcase & Demo Credentials

For prospective buyers and evaluators, the login portals include 1-click demo credential fillers:

| Role | Portal URL | Demo Email | Password |
| :--- | :--- | :--- | :--- |
| **Hospital Administrator** | `/admin/login` | `somilagrawal2004@gmail.com` | `admin123` |
| **Clinician / Doctor** | `/doctorlogin` | `agrawalsomil67@gmail.com` | `doctor123` |
| **Patient** | `/login` | `sample@gmail.com` | `password123` |

To populate a fresh local or non-staging MongoDB database with these demo showcase accounts, doctors, sample OPD history, and verified digital e-prescription:
```bash
ONELIFE_DEMO_SEED=yes npm run seed:demo
```

---

## Test Suite & Verification

Run the comprehensive test suite (45 offline and unit/integration tests):
```bash
npm test
```

Run static reference and CSRF contract verification:
```bash
npm run verify
```

---

## Architecture & Project Structure

```
├── backend/
│   ├── controller/      # Admin, Doctor, Patient, Scheduling, Mail, Razorpay controllers
│   ├── middlewares/     # Authentication, CSRF/Same-Origin protection, Staging guards
│   ├── models/          # User, Appointment, SupportThread, Waitlist, Message schemas
│   ├── routes/          # Express route definitions
│   ├── services/        # Scheduling, Video Sessions, AI Triage, Address data, PDF Invoices
│   └── test/            # 45+ unit, integration, frontend-contract, and UI smoke tests
├── frontend/
│   ├── Admin/           # Admin dashboard, clinician registration, support messages (EJS)
│   ├── doctor/          # Doctor dashboard, availability calendar, video requests (EJS)
│   ├── patient/         # Modern patient views, Tailwind CSS source, assets & SVG marks
│   └── shared/          # Shared console CSS, CSRF fetch interceptor, mock checkout
├── package.json         # Root orchestration scripts
└── README.md            # Product documentation
```

---

## License
Commercial ready. Copyright © 2026 OneLife Technologies. All rights reserved.
