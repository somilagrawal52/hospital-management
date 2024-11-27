const mongoose = require("mongoose");

const appointmentschema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
    },
  },
  { timestamps: true }
);

const Appointment = mongoose.model("appointment", appointmentschema);
module.exports = Appointment;
