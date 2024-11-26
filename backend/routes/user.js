const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Doctor = require("../models/doctors");
const path = require("path");
const { addEventListener } = require("nodemon");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

router.get("/login", (req, res) => {
  return res.sendFile(path.join(frontendPath, "pages-login.html"));
});

router.get("/register", (req, res) => {
  return res.sendFile(path.join(frontendPath, "pages-register.html"));
});

router.post("/register", async (req, res) => {
  const { fullname, email, password } = req.body;
  console.log(req.body);
  await User.create({
    fullname,
    email,
    password,
  });
  console.log("User created successfully");
  return res.redirect("/login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchpassword(email, password);
    return res.cookie("token", token).redirect("/");
  } catch (error) {
    console.error(error);
    return res.sendFile(path.join(frontendPath, "pages-login.html"));
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/login");
});

router.get("/doctors-registration", (req, res) => {
  return res.sendFile(path.join(frontendPath, "forms-layouts.html"));
});

router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
});

router.post("/doctors-registration", async (req, res) => {
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
    return res.redirect("/doctors-registration");
  } catch (error) {
    console.log(error);
    return res.redirect("/doctors-registration");
  }
});

router.get("/profile", (req, res) => {
  return res.sendFile(path.join(frontendPath, "users-profile.html"));
});

router.get("/doctors-detail", (req, res) => {
  return res.sendFile(path.join(frontendPath, "tables-data.html"));
});

module.exports = router;
