# OneLife Hospital Management & Telehealth Suite

**OneLife** is a production-ready, commercial-grade Hospital Management, Telehealth & Doctor Scheduling platform built with Node.js, Express 5, EJS, Tailwind CSS, MongoDB, Razorpay, and Jitsi WebRTC.

Designed as an end-to-end turnkey solution for hospitals, multi-specialty clinics, telemedicine providers, and digital health startups.

---

## Key Highlights & Commercial Features

- 🏥 **Multi-Specialty Clinician Directory**: Dynamic department filtering, real-time live doctor search, doctor profile showcase, fees in INR, and verified clinician badges.
- 📅 **Dynamic Slot Scheduling & Smart Waitlists**: Real-time doctor calendar slots, conflict-free booking, automated waitlists that notify patients via email upon cancellations, and 1-click patient rescheduling.
- 📹 **HD Telehealth Video Consultations**: In-browser zero-download video visits powered by Jitsi WebRTC with high-entropy rooms, calendar synchronization (`.ics` downloads), and doctor approval workflows.
- 💳 **Secure Razorpay Payment & Automated Invoices**: Server-side fee calculation, HMAC webhook reconciliation, mock staging simulation support, and automated PDF invoice generation with instant download.
- 🤖 **24/7 Clinical AI Assistant**: Intelligent health query triage with automated emergency symptom escalation and verified citations from the World Health Organization (WHO) and CDC.
- 🔍 **WHO Disease Knowledge Base**: Live extraction and parsing of clinical overviews, key statistics, symptoms, treatments, and prevention guidelines directly from official WHO health topics.
- 💬 **Threaded Patient Support Desk**: Category and priority-tagged inquiry tickets with real-time administration responses and audit timelines.
- ⚙️ **Executive Hospital Admin Console**: Real-time patient and clinician analytics, appointment status updates, doctor onboarding with credentials, and support inbox management.
- 🩺 **Dedicated Clinician Workspace**: Weekly recurring schedule configuration, date-specific holiday/hours exceptions, virtual video request queue, and patient records.
- 🔒 **Enterprise Security**: Signed CSRF token rotation, Same-Origin protection, HTTP-only secure session cookies, password hashing with bcrypt, input sanitization, and isolated staging mode.

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
