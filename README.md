# OneLife Hospital Management

OneLife is an EJS/Express/MongoDB application for patient appointment booking, doctor coordination, and hospital administration.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and enter service credentials.
2. Run `npm install` in `backend` and `frontend/patient`.
3. Run `npm run dev` from `backend`.
4. In a separate terminal, run `npm run build:css` from `frontend/patient` when editing Tailwind styles.

The app is available at `http://localhost:8000`.

## Safety and production checklist

- Use a unique `JWT_SECRET`, HTTPS, production database backups, and real support/legal details before deployment.
- Create the first administrator directly in the database with `role: "ADMIN"`; doctor registration is intentionally restricted to administrators.
- Razorpay fees are calculated from the doctor record and payments are verified server-side before confirmation.
- Run `npm test` and `npm audit` in `backend` before each release.
