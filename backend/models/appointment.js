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
    },
    invoiceFile: { type: String },
    isOnline: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      required: true,
    },
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
  },
);

appointmentschema.index({ docId: 1, date: 1 });
appointmentschema.index({ userid: 1, date: -1 });
appointmentschema.index({ doctorId: 1, date: 1 });
appointmentschema.index({ patientId: 1, date: -1 });

const Appointment = mongoose.model("appointment", appointmentschema);
Appointment.statuses = appointmentStatuses;
module.exports = Appointment;
