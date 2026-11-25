const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");

const view = (...parts) => path.join(__dirname, "..", "..", "frontend", ...parts);

function render(file, data) {
  return ejs.renderFile(file, data, { async: true });
}

test("homepage renders with doctors, specialities and navigation without errors", async () => {
  const html = await render(view("patient", "views", "index.ejs"), {
    user: null,
    patientdata: null,
    specialityData: [
      { speciality: "General physician", image: "/assets/General_physician.svg", description: "Primary care" },
    ],
    doctors: [
      { _id: "doc-1", fullname: "Dr. Somil", speciality: "Neurologist", fees: 50, available: true, image: "/assets/onelife-clinician-generated.png" },
    ],
    csrfToken: "mock-token",
  });

  assert.match(html, /OneLife/);
  assert.match(html, /General physician/);
  assert.match(html, /Dr\. Somil/);
  assert.match(html, /Commercial Evaluation/);
});

test("all doctors page renders with search and filter controls", async () => {
  const html = await render(view("patient", "views", "doctor.ejs"), {
    user: null,
    patientdata: null,
    speciality: "Neurologist",
    filterDoc: [
      { _id: "doc-1", fullname: "Dr. Somil", speciality: "Neurologist", degree: "MBBS", experience: "5", fees: 50, available: true, image: "/assets/onelife-clinician-generated.png" },
    ],
    csrfToken: "mock-token",
  });

  assert.match(html, /Meet Our Medical Specialists/);
  assert.match(html, /doctor-search/);
  assert.match(html, /Dr\. Somil/);
});

test("appointment page renders doctor info and appointment booking form", async () => {
  const html = await render(view("patient", "views", "appointment.ejs"), {
    user: { _id: "user-1", email: "patient@example.com", role: "NORMAL" },
    patientdata: { fullname: "Patient Test", email: "patient@example.com", number: "9876543210", address: { line1: "Street 1", line2: "City" } },
    docInfo: { _id: "doc-1", fullname: "Dr. Somil", speciality: "Neurologist", degree: "MBBS", experience: "5", fees: 50, image: "/assets/onelife-clinician-generated.png" },
    currencySymbol: "₹",
    razorpayKey: "rzp_test_mock",
    csrfToken: "mock-token",
    integrationMode: "mock",
  });

  assert.match(html, /Dr\. Somil/);
  assert.match(html, /appointmentForm/);
  assert.match(html, /Patient Test/);
});

test("myAppointment page renders appointments, status tags, and invoice links", async () => {
  const html = await render(view("patient", "views", "myAppointment.ejs"), {
    user: { _id: "user-1", role: "NORMAL" },
    patientdata: {
      fullname: "Patient Test",
      upcomingAppointmentsCount: 1,
      appointments: [
        {
          _id: "app-1",
          status: "confirmed",
          formattedDate: "15 Jan 2030, 10:00 AM",
          doctor: "Dr. Somil",
          doctordata: { fullname: "Somil", speciality: "Neurologist" },
          address: { line1: "Street 1", line2: "City" },
          amount: 50,
          invoiceFile: "invoice-app-1.pdf",
          video: { status: "scheduled", joinUrl: "https://meet.jit.si/test" },
        },
      ],
      waitlist: [],
    },
    csrfToken: "mock-token",
  });

  assert.match(html, /My Appointments/);
  assert.match(html, /invoice-app-1\.pdf/);
  assert.match(html, /Join Video Call/);
});

test("chat, disease search, login, profile, and messages render cleanly", async () => {
  const chatHtml = await render(view("patient", "views", "chat.ejs"), { csrfToken: "mock-token", user: null, patientdata: null });
  assert.match(chatHtml, /OneLife AI Health Assistant/);

  const diseaseHtml = await render(view("patient", "views", "diseaseSearch.ejs"), { csrfToken: "mock-token", user: null, patientdata: null });
  assert.match(diseaseHtml, /Clinical Disease Guide/);

  const loginHtml = await render(view("patient", "views", "login.ejs"), { state: "login", email: "", password: "", error: "", csrfToken: "mock-token", user: null, patientdata: null });
  assert.match(loginHtml, /Sign In Securely/);

  const profileHtml = await render(view("patient", "views", "profile.ejs"), {
    user: { _id: "user-1", email: "test@example.com", role: "NORMAL" },
    patientdata: { fullname: "Test Patient", email: "test@example.com", number: "1234567890", address: { line1: "Line 1", line2: "Line 2" }, gender: "Male", dob: "1995-01-01", dependents: [] },
    csrfToken: "mock-token",
  });
  assert.match(profileHtml, /Personal Health Profile/);
  assert.match(profileHtml, /Family &amp; Dependent Profiles/);

  const recordsHtml = await render(view("patient", "views", "health-records.ejs"), {
    user: { _id: "user-1", role: "NORMAL" },
    patientdata: { bloodGroup: "O+", allergies: "Penicillin", dependents: [] },
    prescriptions: [{ _id: "rx-1", doctorName: "Somil", doctorSpeciality: "Neurologist", formattedDate: "15 Jan 2030", verificationCode: "ONERX-203001-ABCDEF", diagnosis: "Migraine", medicines: [{ name: "Paracetamol", frequency: "1-0-1", duration: "3 days" }], labTests: ["CBC"] }],
    csrfToken: "mock-token",
  });
  assert.match(recordsHtml, /ONERX-203001-ABCDEF/);
  assert.match(recordsHtml, /\/prescriptions\/rx-1\/pdf/);

  const verifyHtml = await render(view("patient", "views", "rx-verify.ejs"), {
    user: null,
    patientdata: null,
    code: "ONERX-203001-ABCDEF",
    record: { verificationCode: "ONERX-203001-ABCDEF", doctorName: "Somil", doctorDegree: "MBBS", doctorSpeciality: "Neurologist", patientMasked: "Te** Pa*****", visitDateFormatted: "15 Jan 2030", medicinesCount: 1, medicines: [{ name: "Paracetamol", dosage: "650mg", frequency: "1-0-1", duration: "3 days" }] },
    csrfToken: "mock-token",
  });
  assert.match(verifyHtml, /Authentic OneLife Digital Prescription/);
  assert.match(verifyHtml, /Te\*\* Pa\*\*\*\*\*/);

  const consultHtml = await render(view("doctor", "doctor-consult.ejs"), {
    doctor: { _id: "doc-1", fullname: "Somil" },
    appointment: { _id: "app-1", fullname: "Test Patient", number: "9999999999", visitMode: "telehealth", isOnline: true, queueToken: 2, intake: { chiefComplaint: "Fever", allergies: "Sulfa" } },
    patientAccount: { bloodGroup: "B+", allergies: "Sulfa" },
    prescription: null,
    priorPrescriptions: [],
    formattedDate: "15 Jan 2030",
    csrfToken: "mock-token",
  });
  assert.match(consultHtml, /Allergy Alert:/);
  assert.match(consultHtml, /medicines-container/);
});
