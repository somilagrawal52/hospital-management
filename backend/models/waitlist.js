const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    slotDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // An empty preference means the patient is happy with any newly-opened slot that day.
    preferredTime: { type: String, default: null, match: /^(\d{2}:\d{2})$/ },
    status: { type: String, enum: ["active", "notified", "fulfilled", "cancelled", "expired"], default: "active", index: true },
    notifiedAt: { type: Date },
    prioritySlotTime: { type: String, match: /^(\d{2}:\d{2}|)$/ },
    priorityExpiresAt: { type: Date },
    claimToken: { type: String, trim: true },
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "appointment" },
  },
  { timestamps: true },
);

waitlistSchema.index({ doctorId: 1, slotDate: 1, status: 1, createdAt: 1 });
waitlistSchema.index({ patientId: 1, doctorId: 1, slotDate: 1, status: 1 });

module.exports = mongoose.model("waitlist_entry", waitlistSchema);
