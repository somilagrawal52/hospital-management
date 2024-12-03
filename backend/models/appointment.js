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
    number: {
      type: Number,
      required: true,
    },
    // amount: {
    //   type: Number,
    //   required: true,
    // },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    doctor: {
      type: String,
      required: true,
    },
    doctorid: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Appointment = mongoose.model("appointment", appointmentschema);
module.exports = Appointment;
