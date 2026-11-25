const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ejs = require("ejs");

const view = (...parts) => path.join(__dirname, "..", "..", "frontend", ...parts);

function render(file, data) {
  return ejs.renderFile(file, data, { async: true });
}

test("admin clean-room pages preserve clinician and support form contracts", async () => {
  const registration = await render(view("Admin", "doctors-registration.ejs"), {});
  assert.match(registration, /action="\/doctors-registration"/);
  assert.match(registration, /enctype="multipart\/form-data"/);
  for (const field of ["fullname", "email", "gender", "password", "degree", "number", "experience", "fees", "image", "speciality", "about", "line1", "line2"]) {
    assert.match(registration, new RegExp(`name="${field}"`));
  }

  const support = await render(view("Admin", "admin-messages.ejs"), {
    threads: [{ _id: "thread-1", subject: "Help", category: "account", status: "open", priority: "normal", patientId: { fullname: "Patient", email: "patient@example.test" }, assignedTo: null, messages: [{ senderRole: "NORMAL", body: "Please help" }] }],
    admins: [{ _id: "admin-1", fullname: "Admin" }],
    legacyMessages: [],
  });
  assert.match(support, /action="\/admin\/support\/threads\/thread-1"/);
  assert.match(support, /name="assignedTo"/);
  assert.match(support, /name="reply"/);
});

test("dashboard templates render representative appointments without vendor bundles", async () => {
  const appointment = { _id: "appointment-1", fullname: "Patient", email: "patient@example.test", number: "9999999999", doctor: "Doctor", formattedDate: "20 Oct 2030", status: "pending" };
  const admin = await render(view("Admin", "admin-dashboard.ejs"), { patientsCount: 4, doctorsCount: 2, todayAppointmentsCount: 1, appointments: [appointment] });
  assert.match(admin, /\/appointments\/status/);
  assert.doesNotMatch(admin, /tinymce|simple-datatables|bootstrap\.bundle/i);

  const doctor = await render(view("doctor", "doctor-dashboard.ejs"), { doctor: { fullname: "Doctor", available: true }, patientsAssignedCount: 1, fellowDoctorsCount: 2, onlineRequestsCount: 0, upcomingAppointmentsCount: 1, appointments: [appointment] });
  assert.match(doctor, /data-enhanced-table/);
  assert.match(doctor, /data-table-search/);
  assert.match(doctor, /\/doctor\/queue/);
  assert.match(doctor, /\/doctor\/consult\//);
  assert.doesNotMatch(doctor, /cdn\.datatables|jquery|tinymce|simple-datatables/i);
  assert.match(admin, /\/admin\/walk-in/);
});

test("doctor login and availability keep route and dynamic-data contracts", async () => {
  const login = await render(view("doctor", "doctor-login.ejs"), { email: "doctor@example.test", error: "Incorrect credentials" });
  assert.match(login, /action="\/doctorlogin"/);
  assert.match(login, /name="email"/);
  assert.match(login, /name="password"/);
  assert.match(login, /Incorrect credentials/);

  const availability = await render(view("doctor", "doctor-availability.ejs"), { doctor: { _id: "doctor-1", fullname: "Doctor", available: true }, availability: { weekly: [], exceptions: [] } });
  assert.match(availability, /\/doctor\/availability/);
  assert.match(availability, /\/change-availability/);
  assert.match(availability, /doctor-1/);
});
