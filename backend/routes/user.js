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
} = require("../controller/admin");
const {
  doctorsregistration,
  doctorsdetailtable,
  doctorsregistrationtodb,
  doctorsdetailpage,
} = require("../controller/doctor");

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

module.exports = router;
