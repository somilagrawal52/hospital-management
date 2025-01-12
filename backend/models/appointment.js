const mongoose = require("mongoose");

const appointmentschema = new mongoose.Schema(
  {
    userid:{
      type: String,
      required: true,
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
    cancelled: {
      type: Boolean,
      default: false,
    },
    iscompleted: {
      type: Boolean,
      default: false,
    },
  },
);

const Appointment = mongoose.model("appointment", appointmentschema);
module.exports = Appointment;
