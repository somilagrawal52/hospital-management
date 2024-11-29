const express = require("express");
const router = express.Router();
const path = require("path");
const {
  adminlogin,
  adminregister,
  adminregistertodb,
  adminloginfromdb,
  adminlogout,
  adminprofile,
  showallmsg,
} = require("../controller/admin");
const {
  doctorsregistration,
  doctorsdetailtable,
  doctorsregistrationtodb,
  doctorsdetailpage,
} = require("../controller/doctor");
const {
  getservices,
  doctors,
  messages,
  appointment,
  home,
  bookappointment,
  appointmentdetailtable,
  sendmsg,
  messagesdetailtable,
} = require("../controller/patient");
const { register } = require("module");
const { mailsender } = require("../controller/mail");

router.get("/login", adminlogin);

router.get("/register", adminregister);

router.post("/register", adminregistertodb);

router.post("/login", adminloginfromdb);

router.get("/logout", adminlogout);

router.get("/doctors-registration", doctorsregistration);

router.get("/doctors", doctorsdetailtable);

router.post("/doctors-registration", doctorsregistrationtodb);

router.get("/profile", adminprofile);

router.get("/doctors-detail", doctorsdetailpage);

router.get("/services", getservices);

router.get("/registereddoctors", doctors);

router.get("/messages", messages);

router.get("/appointment", appointment);

router.get("/appointments", appointmentdetailtable);

router.post("/appointment", bookappointment);

router.get("/register", register);

router.get("/home", bookappointment);

router.get("/showmsg", showallmsg);

router.post("/messages", sendmsg);

router.get("/message", messagesdetailtable);

router.get("/home/register", adminregistertodb);

router.get("/home/login", adminloginfromdb);

module.exports = router;
