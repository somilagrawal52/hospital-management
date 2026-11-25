const mongoose = require("mongoose");

const appointmentStatuses = [
  "payment_pending",
  "pending",
  "confirmed",
  "online_requested",
  "completed",
  "cancelled",
  "payment_failed",
  // Kept for legacy records created before the payment-pending state existed.
  "created",
];

const appointmentschema = new mongoose.Schema(
  {
    userid:{
      type: String,
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    number: {
      type: String,
      required: true,
    },
    address: {
      line1: {
        type: String,
        required: true,
      },
      line2: {
        type: String,
        required: true,
      },
    },
    docId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true,
    },
    doctor: {
      type: String,
      required: true,
    },
    payment: {
      orderId: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
      },
      paymentId: { type: String },
      confirmationSentAt: { type: Date },
      reconciledAt: { type: Date },
      refundStatus: { type: String, enum: ["none", "eligible", "initiated", "processed"], default: "none" },
      refundAmount: { type: Number, default: 0 },
    },
    paymentHoldExpiresAt: { type: Date, index: true },
    invoiceFile: { type: String },
    visitMode: {
      type: String,
      enum: ["clinic", "telehealth", "walk_in"],
      default: "clinic",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      required: true,
    },
    slotDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    slotTime: { type: String, match: /^\d{2}:\d{2}$/ },
    queueToken: { type: Number, index: true },
    queueState: {
      type: String,
      enum: ["waiting", "checked_in", "called", "in_consultation", "completed", "no_show"],
      default: "waiting",
    },
    checkedInAt: { type: Date },
    patientMember: {
      memberId: { type: String, default: "self" },
      fullname: { type: String, trim: true, maxlength: 120 },
      relation: { type: String, trim: true, maxlength: 60, default: "Self" },
      gender: { type: String, trim: true, maxlength: 30 },
      dob: { type: String, trim: true, maxlength: 30 },
      bloodGroup: { type: String, trim: true, maxlength: 20 },
    },
    intake: {
      chiefComplaint: { type: String, trim: true, maxlength: 800, default: "" },
      symptomDuration: { type: String, trim: true, maxlength: 120, default: "" },
      allergies: { type: String, trim: true, maxlength: 500, default: "" },
      currentMedications: { type: String, trim: true, maxlength: 500, default: "" },
      vitals: {
        bp: { type: String, trim: true, maxlength: 40, default: "" },
        temp: { type: String, trim: true, maxlength: 40, default: "" },
        spo2: { type: String, trim: true, maxlength: 40, default: "" },
        weight: { type: String, trim: true, maxlength: 40, default: "" },
      },
      submittedAt: { type: Date },
    },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "prescription" },
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "review" },
    amount: {
      type: Number,
      required: true,
    },
    userdata: {
      type: Object,
      required: true,
    },
    doctordata: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: appointmentStatuses,
      default: "pending",
      required: true,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    iscompleted: {
      type: Boolean,
      default: false,
    },
    video: {
      provider: { type: String, enum: ["jitsi"], default: "jitsi" },
      roomName: { type: String },
      joinUrl: { type: String },
      status: {
        type: String,
        enum: ["not_requested", "requested", "scheduled", "in_progress", "completed", "declined"],
        default: "not_requested",
      },
      consentAt: { type: Date },
      acceptedAt: { type: Date },
      patientJoinedAt: { type: Date },
      doctorJoinedAt: { type: Date },
      endedAt: { type: Date },
    },
    statusHistory: [{
      status: { type: String, enum: appointmentStatuses, required: true },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      source: { type: String, default: "system" },
    }],
    rescheduleHistory: [{
      from: { type: Date, required: true },
      to: { type: Date, required: true },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    }],
  },
  { timestamps: true },
);

appointmentschema.index({ docId: 1, date: 1 });
appointmentschema.index({ userid: 1, date: -1 });
appointmentschema.index({ doctorId: 1, date: 1 });
appointmentschema.index({ patientId: 1, date: -1 });
appointmentschema.index({ doctorId: 1, slotDate: 1, slotTime: 1 });

const Appointment = mongoose.model("appointment", appointmentschema);
Appointment.statuses = appointmentStatuses;
module.exports = Appointment;
