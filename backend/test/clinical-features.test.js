const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Prescription = require("../models/prescription");
const Review = require("../models/review");
const Waitlist = require("../models/waitlist");
const { activeSlotFilter, PAYMENT_HOLD_MINUTES } = require("../services/scheduling");
const { buildQueueEstimate } = require("../services/opd-queue");
const { buildPrescriptionPdfBuffer, generateVerificationCode } = require("../services/prescription-pdf");
const { buildInvoicePdfBuffer } = require("../services/payment-finalization");
const { getLocalDiseaseEntry, normaliseDiseaseQuery } = require("../services/disease-kb");
const { inferSpecialityFromText } = require("../services/ai-care-router");
const { translate } = require("../services/i18n");
const { computeOperationalAnalytics } = require("../services/care-metrics");
const { PRIORITY_WINDOW_MINUTES } = require("../services/waitlist");
const { classifyDueWindow, dispatchDueReminders } = require("../services/reminders");
const { maskPatientName, parseMedicinesPayload } = require("../controller/clinical");

const ids = {
  patient: new mongoose.Types.ObjectId(),
  doctor: new mongoose.Types.ObjectId(),
  appointment: new mongoose.Types.ObjectId(),
};

test("activeSlotFilter expires stale payment holds while retaining live holds", () => {
  const now = new Date("2030-01-15T10:00:00.000Z");
  const filter = activeSlotFilter(now);
  assert.equal(PAYMENT_HOLD_MINUTES, 10);
  const pendingBranch = filter.$or[1];
  assert.equal(pendingBranch.status, "payment_pending");
  assert.equal(pendingBranch.$or[0].paymentHoldExpiresAt.$gt.getTime(), now.getTime());
});

test("buildQueueEstimate computes waiting count, current token, delay and adjusted ETA", () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const appointment = {
    _id: ids.appointment,
    docId: String(ids.doctor),
    slotDate: today,
    date: new Date(`${today}T10:00:00+05:30`),
    queueToken: 4,
    queueState: "waiting",
  };
  const activeDayAppointments = [
    { queueToken: 1, status: "completed", queueState: "completed" },
    { queueToken: 2, status: "confirmed", queueState: "in_consultation" },
    { queueToken: 3, status: "confirmed", queueState: "waiting" },
    { queueToken: 4, status: "confirmed", queueState: "waiting" },
  ];
  const estimate = buildQueueEstimate({
    appointment,
    doctorQueueStatus: { date: today, currentToken: 2, delayMinutes: 15, delayReason: "Emergency round" },
    activeDayAppointments,
  });

  assert.equal(estimate.token, 4);
  assert.equal(estimate.isToday, true);
  assert.equal(estimate.currentToken, 2);
  assert.equal(estimate.aheadCount, 2);
  assert.equal(estimate.delayMinutes, 15);
  assert.equal(estimate.estimatedWaitMinutes, 39);
  assert.match(estimate.adjustedEta, /10:15/i);
});

test("prescription schema validates medicines and generates verifiable PDF bytes", async () => {
  const code = generateVerificationCode(new Date("2030-01-15T10:00:00.000Z"));
  assert.match(code, /^ONERX-\d{6}-[A-F0-9]{6}$/);

  const parsed = parseMedicinesPayload({
    medName: ["Tab. Paracetamol", ""],
    medDosage: ["650mg", "10mg"],
    medFrequency: ["1-0-1", "0-0-1"],
    medTiming: ["After food", "After dinner"],
    medDuration: ["3 days", "5 days"],
  });
  assert.equal(parsed.length, 1);

  const rx = new Prescription({
    appointmentId: ids.appointment,
    patientId: ids.patient,
    doctorId: ids.doctor,
    patientName: "Ananya Kapoor",
    doctorName: "Somil",
    doctorSpeciality: "Neurologist",
    doctorDegree: "MBBS, DM",
    visitDate: new Date("2030-01-15T10:00:00.000Z"),
    verificationCode: code,
    diagnosis: "Tension-type headache",
    allergiesAlert: "Penicillin",
    vitals: { bp: "120/80", temp: "98.4" },
    medicines: parsed,
    labTests: ["CBC", "Vitamin B12"],
    advice: "Hydrate well and maintain sleep hygiene.",
    followUpDate: "2030-01-29",
  });
  assert.equal(rx.validateSync(), undefined);

  const pdfBuffer = await buildPrescriptionPdfBuffer(rx.toObject());
  assert.equal(pdfBuffer.subarray(0, 5).toString("utf8"), "%PDF-");
  assert.equal(maskPatientName("Ananya Kapoor"), "An**** Ka****");
});

test("invoice PDF builder produces an Indian GST compliant tax receipt", async () => {
  const pdf = await buildInvoicePdfBuffer({
    _id: ids.appointment,
    fullname: "Rahul Mehta",
    email: "rahul@example.test",
    number: "9876543210",
    doctor: "Somil",
    visitMode: "telehealth",
    isOnline: true,
    queueToken: 3,
    date: new Date("2030-01-15T10:00:00.000Z"),
    amount: 750,
    address: { line1: "MG Road", line2: "Pune" },
    payment: { orderId: "order_abc123", paymentId: "pay_xyz789", amount: 750 },
  });
  assert.equal(pdf.subarray(0, 5).toString("utf8"), "%PDF-");
});

test("verified reviews validate 1-5 stars and reject out-of-range scores", () => {
  const valid = new Review({
    appointmentId: ids.appointment,
    patientId: ids.patient,
    doctorId: ids.doctor,
    patientName: "Pooja Sharma",
    rating: 5,
    punctualityRating: 4,
    comment: "Clear explanation",
  });
  assert.equal(valid.validateSync(), undefined);

  const invalid = new Review({
    appointmentId: ids.appointment,
    patientId: ids.patient,
    doctorId: ids.doctor,
    patientName: "Pooja Sharma",
    rating: 6,
  });
  assert.ok(invalid.validateSync()?.errors.rating);
});

test("curated disease KB resolves aliases and AI router maps symptoms to clinical specialities", () => {
  assert.equal(normaliseDiseaseQuery("BP"), "hypertension");
  const dengue = getLocalDiseaseEntry("dengue");
  assert.equal(dengue.speciality, "General physician");
  assert.ok(dengue.symptoms.length >= 2);
  assert.equal(inferSpecialityFromText("I have had throbbing migraine headache and nausea"), "Neurologist");
  assert.equal(inferSpecialityFromText("Severe skin rash and itching"), "Dermatologist");
});

test("bilingual i18n translates Hindi and falls back to English cleanly", () => {
  assert.equal(translate("hi", "nav.clinicians"), "डॉक्टर्स");
  assert.equal(translate("en", "nav.clinicians"), "Clinicians");
  assert.equal(translate("fr", "nav.clinicians"), "Clinicians");
});

test("operational analytics calculates settled INR revenue and care mode distribution", () => {
  const analytics = computeOperationalAnalytics(
    [
      { status: "completed", visitMode: "clinic", amount: 500, payment: { status: "success" }, doctordata: { speciality: "General physician" } },
      { status: "confirmed", visitMode: "telehealth", isOnline: true, amount: 700, payment: { status: "success" }, doctordata: { speciality: "Neurologist" } },
      { status: "confirmed", visitMode: "walk_in", amount: 400, payment: { status: "success" }, doctordata: { speciality: "General physician" } },
      { status: "cancelled", visitMode: "clinic", amount: 500, payment: { status: "success" }, doctordata: { speciality: "General physician" } },
    ],
    [],
  );
  assert.equal(analytics.totalRevenueInr, 1600);
  assert.equal(analytics.completedCount, 1);
  assert.equal(analytics.confirmedCount, 2);
  assert.equal(analytics.cancelledCount, 1);
  assert.equal(analytics.telehealthCount, 1);
  assert.equal(analytics.walkInCount, 1);
  assert.equal(analytics.clinicCount, 1);
  assert.equal(analytics.completionRate, 50);
  assert.equal(analytics.specialityBreakdown[0].label, "General physician");
});

test("walk-in prescriptions validate without an account ObjectId and render PDF bytes", async () => {
  const walkInRx = new Prescription({
    appointmentId: ids.appointment,
    walkInKey: "walkin_1732500000000",
    doctorId: ids.doctor,
    patientName: "Walk-In Visitor",
    doctorName: "Somil",
    visitDate: new Date("2030-01-15T10:00:00.000Z"),
    verificationCode: generateVerificationCode(new Date("2030-01-15T10:00:00.000Z")),
    diagnosis: "Seasonal Fever",
    medicines: [{ name: "Paracetamol", dosage: "650mg", frequency: "1-0-1", duration: "3 days" }],
  });
  assert.equal(walkInRx.validateSync(), undefined);
  const pdf = await buildPrescriptionPdfBuffer(walkInRx.toObject());
  assert.equal(pdf.subarray(0, 5).toString("utf8"), "%PDF-");
});

test("priority waitlist entries validate claim window metadata", () => {
  assert.equal(PRIORITY_WINDOW_MINUTES, 15);
  const entry = new Waitlist({
    patientId: ids.patient,
    doctorId: ids.doctor,
    slotDate: "2030-01-16",
    status: "notified",
    prioritySlotTime: "10:30",
    priorityExpiresAt: new Date("2030-01-16T04:15:00.000Z"),
    claimToken: "abcdef1234567890abcdef12",
  });
  assert.equal(entry.validateSync(), undefined);
});

test("reminder engine classifies due windows and honors disabled integration mode", async () => {
  const now = new Date("2030-01-15T10:00:00.000Z");
  assert.equal(classifyDueWindow(new Date("2030-01-15T11:30:00.000Z"), now), "2h");
  assert.equal(classifyDueWindow(new Date("2030-01-16T08:00:00.000Z"), now), "24h");
  assert.equal(classifyDueWindow(new Date("2030-01-18T10:00:00.000Z"), now), null);

  const prev = process.env.INTEGRATION_MODE;
  process.env.INTEGRATION_MODE = "disabled";
  try {
    const res = await dispatchDueReminders({ now });
    assert.equal(res.skipped, "disabled");
  } finally {
    if (prev === undefined) delete process.env.INTEGRATION_MODE;
    else process.env.INTEGRATION_MODE = prev;
  }
});

test("expanded Hindi dictionary translates patient directory and home CTAs", () => {
  assert.equal(translate("hi", "home.bookBtn"), "परामर्श बुक करें");
  assert.equal(translate("hi", "doctors.heading"), "हमारे चिकित्सा विशेषज्ञों से मिलें");
});

test("appointment payment refund statuses validate allowed states", () => {
  const Appointment = require("../models/appointment");
  const eligible = new Appointment({
    userid: String(ids.patient),
    patientId: ids.patient,
    fullname: "Patient",
    email: "patient@example.test",
    number: "9999999999",
    address: { line1: "Line 1", line2: "Pune" },
    docId: String(ids.doctor),
    doctor: "Somil",
    payment: { orderId: "order_r1", amount: 500, currency: "INR", status: "success", refundStatus: "eligible", refundAmount: 500 },
    date: new Date("2030-01-15T10:00:00.000Z"),
    amount: 500,
    userdata: {},
    doctordata: {},
    status: "cancelled",
  });
  assert.equal(eligible.validateSync(), undefined);
});
