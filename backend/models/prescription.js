const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    dosage: { type: String, trim: true, maxlength: 80, default: "" },
    frequency: { type: String, trim: true, maxlength: 60, default: "1-0-1" },
    timing: { type: String, trim: true, maxlength: 80, default: "After food" },
    duration: { type: String, trim: true, maxlength: 60, default: "5 days" },
    instructions: { type: String, trim: true, maxlength: 240, default: "" },
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointment",
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
      index: true,
    },
    walkInKey: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    patientName: { type: String, required: true, trim: true, maxlength: 120 },
    patientRelation: { type: String, trim: true, maxlength: 60, default: "Self" },
    doctorName: { type: String, required: true, trim: true, maxlength: 120 },
    doctorSpeciality: { type: String, trim: true, maxlength: 100, default: "" },
    doctorDegree: { type: String, trim: true, maxlength: 100, default: "" },
    visitDate: { type: Date, required: true },
    verificationCode: { type: String, required: true, unique: true, index: true },
    chiefComplaint: { type: String, trim: true, maxlength: 800, default: "" },
    diagnosis: { type: String, required: true, trim: true, maxlength: 1000 },
    allergiesAlert: { type: String, trim: true, maxlength: 500, default: "" },
    vitals: {
      bp: { type: String, trim: true, maxlength: 40, default: "" },
      pulse: { type: String, trim: true, maxlength: 40, default: "" },
      temp: { type: String, trim: true, maxlength: 40, default: "" },
      spo2: { type: String, trim: true, maxlength: 40, default: "" },
      weight: { type: String, trim: true, maxlength: 40, default: "" },
    },
    medicines: {
      type: [medicineSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Add at least one medicine or clinical directive.",
      },
    },
    labTests: [{ type: String, trim: true, maxlength: 200 }],
    advice: { type: String, trim: true, maxlength: 2000, default: "" },
    followUpDate: { type: String, match: /^(\d{4}-\d{2}-\d{2}|)$/, default: "" },
    followUpReminderSentAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("prescription", prescriptionSchema);
