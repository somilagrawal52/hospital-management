const express = require("express");
const path = require("path");
const Appointment = require("../models/appointment");
const Message = require("../models/messages");
const { mailsender } = require("./mail");
const User = require("../models/user");
const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "patient");

const Razorpay = require("razorpay");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function getservices(req, res) {
  return res.sendFile(path.join(frontendPath, "services.html"));
}

async function appointment(req, res) {
  return res.sendFile(path.join(frontendPath, "Appointment.html"));
}

async function register(req, res) {
  return res.sendFile(path.join(frontendPath, "pages-register.html"));
}

async function messages(req, res) {
  return res.sendFile(path.join(frontendPath, "messages.html"));
}

async function home(req, res) {
  return res.sendFile(path.join(frontendPath, "home.html"));
}

async function doctors(req, res) {
  return res.sendFile(path.join(frontendPath, "doctors-registered.html"));
}

async function bookappointment(req, res) {
  try {
    const {
      fullname,
      email,
      number,
      country,
      state,
      city,
      doctor,
      date,
      amount,
    } = req.body;
    const [doctorName, doctorId] = doctor.split("|");

    const razorpayOrder = await instance.orders.create({
      amount: amount * 100,
      currency: "INR",
    });
    const doctordetail = await User.findOne({ _id: doctorId });
    console.log("Doctor detail found:", doctordetail);
    const appointment = new Appointment({
      fullname,
      email,
      number,
      country,
      state,
      city,
      doctor: doctorName,
      doctorid: doctorId,
      date,
      payment: {
        orderId: razorpayOrder.id,
        amount,
        currency: "INR",
        status: "pending",
      },
    });

    await appointment.save();
    console.log("Appointment created successfully");
    console.log("Patient Email:", email);
    const patientmail = {
      to: email,
      subject: "Appointment Booked",
      text: `${fullname} your Appointment is booked`,
    };
    console.log("Doctor Email:", doctordetail.email);
    const doctormail = {
      to: doctordetail.email,
      subject: "Appointment Booked",
      text: `${doctordetail.fullname} you have been booked for ${date} by ${fullname}`,
    };
    mailsender(patientmail);
    mailsender(doctormail);

    res.json({
      message: "Appointment created successfully.",
      appointmentId: appointment._id,
      razorpayOrderId: razorpayOrder.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error booking appointment." });
  }
}

async function appointmentdetailtable(req, res) {
  try {
    const appointments = await Appointment.find({});
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function sendmsg(req, res) {
  const { fullname, question, msgbody } = req.body;
  console.log(req.body);
  try {
    await Message.create({
      fullname,
      question,
      msgbody,
    });
    console.log("Message Send");
    return res.redirect("/messages");
  } catch (error) {
    console.log(error);
    return res.redirect("/messages");
  }
}

async function messagesdetailtable(req, res) {
  try {
    const messages = await Message.find({});
    res.json(messages);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function savePayments(req, res) {
  const { appointmentId, paymentId } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    appointment.payment.paymentId = paymentId;
    appointment.payment.status = "success";

    await appointment.save();

    res.json({ message: "Payment saved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving payment." });
  }
}

module.exports = {
  getservices,
  appointment,
  register,
  messages,
  home,
  doctors,
  bookappointment,
  appointmentdetailtable,
  messagesdetailtable,
  sendmsg,
  savePayments,
};
