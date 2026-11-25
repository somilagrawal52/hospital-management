const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createHmac } = require("crypto");
const { createtokenforuser } = require("../services/auth");

const userschema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    gender: {
      type: String,
    },
    number: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    dob: {
      type: String,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown", ""],
      default: "",
    },
    allergies: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    chronicConditions: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    abhaId: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    emergencyContact: {
      name: { type: String, trim: true, maxlength: 120, default: "" },
      number: { type: String, trim: true, maxlength: 30, default: "" },
      relation: { type: String, trim: true, maxlength: 60, default: "" },
    },
    dependents: [
      {
        fullname: { type: String, required: true, trim: true, maxlength: 120 },
        relation: { type: String, enum: ["Parent", "Spouse", "Child", "Sibling", "Other"], default: "Other" },
        gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
        dob: { type: String, default: "" },
        bloodGroup: { type: String, default: "" },
        allergies: { type: String, trim: true, maxlength: 400, default: "" },
        chronicConditions: { type: String, trim: true, maxlength: 400, default: "" },
      },
    ],
    address: {
      type: Object,
      default: { line1: "", line2: "" },
    },
    image: {
      type: String,
    },
    speciality: {
      type: String,
    },
    degree: {
      type: String,
    },
    experience: {
      type: String,
    },
    about: {
      type: String,
    },
    available: {
      type: Boolean,
      default: true,
    },
    // Doctors can override the default Mon-Sat 09:00-17:00, 30-minute calendar.
    // Existing doctor records remain valid and use that default until they save a schedule.
    availability: {
      weekly: [
        {
          day: { type: Number, min: 0, max: 6 },
          enabled: { type: Boolean, default: true },
          startTime: { type: String },
          endTime: { type: String },
          slotMinutes: { type: Number },
        },
      ],
      exceptions: [
        {
          date: { type: String },
          unavailable: { type: Boolean, default: false },
          startTime: { type: String },
          endTime: { type: String },
          slotMinutes: { type: Number },
        },
      ],
    },
    fees: {
      type: Number,
    },
    queueStatus: {
      date: { type: String, default: "" },
      currentToken: { type: Number, default: 0 },
      delayMinutes: { type: Number, default: 0, min: 0, max: 240 },
      delayReason: { type: String, trim: true, maxlength: 200, default: "" },
      updatedAt: { type: Date },
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    date: {
      type: Number,
    },
    role: {
      type: String,
      required: true,
      default: "NORMAL",
    },
    password: {
      type: String,
      required: true,
    },
    // Retained temporarily so existing SHA-256 accounts can be upgraded on login.
    salt: { type: String },
  },
  { minimize: false },
);

userschema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(user.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

userschema.statics.matchpassword = async function (email, password) {
  const user = await this.findOne({ email: String(email).toLowerCase() });
  if (!user) throw new Error("user not found");

  let isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch && user.salt) {
    const legacyHash = createHmac("sha256", user.salt).update(password).digest("hex");
    isMatch = legacyHash === user.password;
    if (isMatch) {
      user.password = password;
      user.salt = undefined;
      await user.save();
    }
  }
  if (!isMatch) throw new Error("incorrect password");
  const token = createtokenforuser(user);
  return token;
};

const User = mongoose.model("user", userschema);
module.exports = User;
