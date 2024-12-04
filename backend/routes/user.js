const express = require("express");
const router = express.Router();
const path = require("path");
const {
  getallcities,
  getallcountries,
  getallstates,
} = require("../controller/address");
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
  doctorsdashboard,
  doctorsloginpage,
  doctorloginfromdb,
  doctorlogout,
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
const { register } = require("../controller/patient");
const multer = require("multer");
const { restrictTo, checkforauthentication } = require("../middlewares/auth");
const {
  appointmentcreated,
  verifypayment,
  payemntsuccessfull,
} = require("../controller/razorpay");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, path.resolve(frontendPath, `./assets/img/`));
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

router.get("/admin/login", adminlogin);

router.post("/admin/login", adminloginfromdb);

router.get("/logout", adminlogout);

router.get("/doctorlogout", doctorlogout);

router.get(
  "/doctors-registration",
  checkforauthentication(),
  restrictTo(["ADMIN"]),
  doctorsregistration
);

router.get("/doctors", doctorsdetailtable);

router.post(
  "/doctors-registration",
  upload.single("image"),
  doctorsregistrationtodb
);

router.post("/doctorlogin", doctorloginfromdb);

router.get("/doctorlogin", doctorsloginpage);

router.get("/profile", adminprofile);

router.get("/doctors-detail", doctorsdetailpage);

router.get("/services", getservices);

router.get("/registereddoctors", doctors);

router.get("/messages", messages);

router.get("/appointment", appointment);

router.get("/appointments", appointmentdetailtable);

router.post("/appointment", bookappointment);

router.get("/register", register);

router.get("/", appointment);

router.get("/showmsg", showallmsg);

router.get(
  "/doctor",
  checkforauthentication(),
  restrictTo(["DOCTOR"]),
  doctorsdashboard
);

router.post("/messages", sendmsg);

router.get("/message", messagesdetailtable);

router.get("/countries", getallcountries);

router.get("/states/:countryCode", getallstates);

router.get("/cities/:countryCode/:stateCode", getallcities);

router.post("/create-order", appointmentcreated);

router.post("/verify-payment", verifypayment);

router.get("/payment-success", payemntsuccessfull);

module.exports = router;
