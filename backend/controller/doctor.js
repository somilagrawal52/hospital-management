const Doctor = require("../models/doctors");
const path = require("path");
const { mailsender } = require("./mail");
const { text } = require("express");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

async function doctorsregistration(req, res) {
  return res.sendFile(path.join(frontendPath, "forms-layouts.html"));
}

async function doctorsdetailtable(req, res) {
  try {
    const doctors = await Doctor.find({});
    res.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function doctorsregistrationtodb(req, res) {
  const { fullname, email, password, number, address, gender } = req.body;
  console.log(req.body);
  try {
    await Doctor.create({
      fullname,
      email,
      password,
      number,
      gender,
      address,
    });
    console.log("Doctor created successfully");
    const obj = {
      to: email,
      subject: "Welcome Message!",
      text: `Welcome to OneLife ${fullname}`,
    };
    await mailsender(obj);
    return res.redirect("/doctors-registration");
  } catch (error) {
    console.log(error);
    return res.redirect("/doctors-registration");
  }
}

async function doctorsdetailpage(req, res) {
  return res.sendFile(path.join(frontendPath, "tables-data.html"));
}

module.exports = {
  doctorsregistration,
  doctorsdetailtable,
  doctorsregistrationtodb,
  doctorsdetailpage,
};
