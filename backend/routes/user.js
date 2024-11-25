const express = require("express");
const router = express.Router();
const User = require("../models/user");
const path = require("path");

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
  return res.redirect("/user/login");
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
  res.clearCookie("token").redirect("/user/login");
});

module.exports = router;
