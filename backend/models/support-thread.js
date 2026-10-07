const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    senderRole: { type: String, enum: ["NORMAL", "ADMIN"], required: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true },
);

const supportThreadSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: ["appointment", "billing", "account", "technical", "other"], default: "other" },
    priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" },
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    lastMessageAt: { type: Date, default: Date.now },
    messages: { type: [replySchema], default: [] },
  },
  { timestamps: true },
);

supportThreadSchema.index({ status: 1, lastMessageAt: -1 });

module.exports = mongoose.model("support_thread", supportThreadSchema);
