const test = require("node:test");
const assert = require("node:assert/strict");

const { hasSameOrigin } = require("../middlewares/csrf-origin");
const { adminAppointment, adminDoctor, doctorAppointment } = require("../services/response-sanitizers");
const { validationErrors } = require("../services/runtime-config");
const { razorpayClient } = require("../services/razorpay-client");

function request({ method = "POST", origin, referer } = {}) {
  return {
    method,
    protocol: "https",
    get(name) {
      const headers = { host: "onelife.example", origin, referer };
      return headers[name.toLowerCase()];
    },
  };
}

test("same-origin guard accepts only the current application origin for unsafe requests", () => {
  assert.equal(hasSameOrigin(request({ origin: "https://onelife.example" })), true);
  assert.equal(hasSameOrigin(request({ referer: "https://onelife.example/admin" })), true);
  assert.equal(hasSameOrigin(request({ origin: "https://attacker.example" })), false);
  assert.equal(hasSameOrigin(request()), false);
});

test("API sanitizers never expose password hashes, salts, or appointment snapshots", () => {
  const doctor = { _id: "doctor-1", fullname: "Doctor", email: "doctor@example.test", password: "hash", salt: "legacy-salt", availability: { weekly: [] } };
  const appointment = { _id: "appointment-1", fullname: "Patient", email: "patient@example.test", payment: { paymentId: "payment" }, userdata: { address: "private" }, doctordata: { password: "hash" }, video: { joinUrl: "https://meet.example/room" } };
  assert.deepEqual(adminDoctor(doctor), { _id: "doctor-1", fullname: "Doctor", email: "doctor@example.test" });
  assert.deepEqual(adminAppointment(appointment), { _id: "appointment-1", fullname: "Patient", email: "patient@example.test" });
  assert.deepEqual(doctorAppointment(appointment), { _id: "appointment-1", fullname: "Patient", email: "patient@example.test", video: { joinUrl: "https://meet.example/room" } });
});

test("production startup rejects a missing or placeholder JWT secret", () => {
  assert.equal(validationErrors({ NODE_ENV: "production", DATABASE_URL: "mongodb://example", JWT_SECRET: "replace-me" }).length, 1);
  assert.equal(validationErrors({ NODE_ENV: "production", DATABASE_URL: "mongodb://example", JWT_SECRET: "a".repeat(32) }).length, 0);
  assert.equal(validationErrors({ NODE_ENV: "development" }).length, 0);
});

test("payment client fails at the payment boundary when credentials are absent", () => {
  assert.throws(() => razorpayClient({}), { code: "PAYMENT_NOT_CONFIGURED" });
});
