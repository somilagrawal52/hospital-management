const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");

const Appointment = require("../models/appointment");
const SupportThread = require("../models/support-thread");
const { isEmergencyMessage, EMERGENCY_MESSAGE } = require("../services/emergency-triage");
const { createVideoSession, createVideoCalendarEvent } = require("../services/video-session");
const { signatureMatches } = require("../controller/webhooks");
const { availabilityForDate, dateTimeForSlot, normaliseAvailability } = require("../services/scheduling");

const patientId = new mongoose.Types.ObjectId();
const doctorId = new mongoose.Types.ObjectId();

function appointmentData(status) {
  return {
    userid: String(patientId),
    patientId,
    fullname: "Patient Example",
    email: "patient@example.com",
    number: "9999999999",
    address: { line1: "1 Care Street", line2: "Pune" },
    docId: String(doctorId),
    doctorId,
    doctor: "Doctor Example",
    payment: { orderId: "order_test_123", amount: 500, currency: "INR", status: "pending" },
    date: new Date("2030-01-15T10:00:00.000Z"),
    amount: 500,
    userdata: { fullname: "Patient Example" },
    doctordata: { fullname: "Doctor Example" },
    status,
  };
}

test("new bookings support the payment-pending state and reject unknown states", () => {
  assert.equal(new Appointment(appointmentData("payment_pending")).validateSync(), undefined);
  assert.ok(new Appointment(appointmentData("not-a-real-state")).validateSync()?.errors.status);
});

test("appointment status history and durable references can be recorded", () => {
  const appointment = new Appointment({
    ...appointmentData("confirmed"),
    statusHistory: [{ status: "payment_pending", changedBy: patientId, source: "booking" }],
  });
  assert.equal(appointment.patientId.toString(), patientId.toString());
  assert.equal(appointment.doctorId.toString(), doctorId.toString());
  assert.equal(appointment.statusHistory[0].source, "booking");
});

test("urgent symptoms are escalated before an AI answer is attempted", () => {
  assert.equal(isEmergencyMessage("I have crushing chest pain and cannot breathe"), true);
  assert.equal(isEmergencyMessage("Can you explain seasonal allergies?"), false);
  assert.match(EMERGENCY_MESSAGE, /emergency/i);
});

test("video consultations receive a high-entropy Jitsi room and calendar invitation", () => {
  const session = createVideoSession();
  assert.match(session.roomName, /^onelife-[a-f0-9]{36}$/);
  assert.match(session.joinUrl, new RegExp(`${session.roomName}$`));
  assert.equal(session.status, "scheduled");

  const calendar = createVideoCalendarEvent({
    _id: new mongoose.Types.ObjectId(),
    date: new Date("2030-01-15T10:00:00.000Z"),
    doctor: "Doctor Example",
    video: session,
  });
  assert.match(calendar, /BEGIN:VCALENDAR/);
  assert.match(calendar, /DTEND:/);
  assert.match(calendar, /URL:https:\/\/meet\.jit\.si\/onelife-/);
});

test("threaded support cases require a patient, subject, and initial message", () => {
  const thread = new SupportThread({
    patientId,
    subject: "Invoice query",
    messages: [{ senderId: patientId, senderRole: "NORMAL", body: "Please share my invoice." }],
  });
  assert.equal(thread.validateSync(), undefined);
  assert.ok(new SupportThread({ subject: "Missing sender" }).validateSync());
});

test("Razorpay webhook signatures are verified against the exact raw body", () => {
  const rawBody = Buffer.from('{"event":"payment.captured"}');
  const secret = "webhook-test-secret";
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  assert.equal(signatureMatches(rawBody, signature, secret), true);
  assert.equal(signatureMatches(rawBody, "invalid", secret), false);
});

test("doctors receive a usable default schedule and can close or override specific dates", () => {
  assert.deepEqual(availabilityForDate({ available: true }, "2030-01-14"), {
    enabled: true,
    startTime: "09:00",
    endTime: "17:00",
    slotMinutes: 30,
  });
  assert.deepEqual(availabilityForDate({ availability: { exceptions: [{ date: "2030-01-14", unavailable: true }] } }, "2030-01-14"), { enabled: false });
  const availability = normaliseAvailability({
    weekly: [{ day: 1, enabled: true, startTime: "10:00", endTime: "13:00", slotMinutes: 20 }],
    exceptions: [{ date: "2030-01-14", unavailable: false, startTime: "11:00", endTime: "12:00", slotMinutes: 30 }],
  });
  assert.equal(availability.weekly[0].slotMinutes, 20);
  assert.equal(availability.exceptions[0].startTime, "11:00");
});

test("slot times are interpreted in India time and invalid calendar dates are rejected", () => {
  assert.equal(dateTimeForSlot("2030-01-14", "09:30").toISOString(), "2030-01-14T04:00:00.000Z");
  assert.throws(() => dateTimeForSlot("2030-02-30", "09:30"), /valid date and time/i);
});
