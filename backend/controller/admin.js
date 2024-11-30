const express = require("express");
const User = require("../models/user");
const path = require("path");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

async function adminlogin(req, res) {
  return res.sendFile(path.join(frontendPath, "pages-login.html"));
}

async function adminregister(req, res) {
  return res.sendFile(path.join(frontendPath, "pages-register.html"));
}

async function adminregistertodb(req, res) {
  const { fullname, email, password } = req.body;
  console.log(req.body);
  await User.create({
    fullname,
    email,
    password,
  });
  console.log("User created successfully");
  return res.redirect("/login");
}

async function adminloginfromdb(req, res) {
  const { email, password } = req.body;
  try {
    const token = await User.matchpassword(email, password);
    return res.cookie("token", token).redirect("/");
  } catch (error) {
    console.error(error);
    return res.sendFile(path.join(frontendPath, "pages-login.html"));
  }
}

async function adminlogout(req, res) {
  res.clearCookie("token").redirect("/login");
}

async function adminprofile(req, res) {
  return res.sendFile(path.join(frontendPath, "admin-profile.html"));
}

async function showallmsg(req, res) {
  return res.sendFile(path.join(frontendPath, "messages.html"));
}

module.exports = {
  adminlogin,
  adminregister,
  adminregistertodb,
  adminloginfromdb,
  adminlogout,
  adminprofile,
  showallmsg,
};
