const express = require("express");
const path = require("path");
const Appointment = require("../models/appointment");
const Message = require("../models/messages");
const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "patient");

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
  const { fullname, email, number, address, gender } = req.body;
  console.log(req.body);
  try {
    await Appointment.create({
      fullname,
      email,
      number,
      gender,
      address,
    });
    console.log("Appointment created successfully");
    return res.redirect("/appointment");
  } catch (error) {
    console.log(error);
    return res.redirect("/appointment");
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
};
