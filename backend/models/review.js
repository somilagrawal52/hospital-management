const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    patientName: { type: String, required: true, trim: true, maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    punctualityRating: { type: Number, min: 1, max: 5, default: 5 },
    comment: { type: String, trim: true, maxlength: 600, default: "" },
    visitMode: { type: String, enum: ["clinic", "telehealth", "walk_in"], default: "clinic" },
  },
  { timestamps: true },
);

reviewSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model("review", reviewSchema);
