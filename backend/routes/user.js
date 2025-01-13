const express = require("express");
const router = express.Router();
const User = require("../models/user");
const fs=require('fs');
const path = require("path");
const Appointment=require("../models/appointment")
const {validatetoken}=require('../services/auth')
const {specialityData} = require('../../frontend/patient/views/assets/assets');
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
  changeAvailability,
} = require("../controller/doctor");
const {
  
  doctors,
  messages,
  appointment,
  home,
  bookappointment,
  appointmentdetailtable,
  sendmsg,
  messagesdetailtable,
  savePayments,
  patientregistrationtodb,
  patientloginfromdb,
  PatientProfile,
  UpdateProfile,
  patientsloginpage,
  patientsregisterpage,
  aboutpage,
  contactpage,
} = require("../controller/patient");
const { register } = require("../controller/patient");
const multer = require("multer");
const { restrictTo, checkforauthentication } = require("../middlewares/auth");
const {
  appointmentcreated,
  verifypayment,
  payemntsuccessfull,
} = require("../controller/razorpay");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend","patient" ,"views","assets");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, path.resolve(frontendPath));
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

router.get("/admin/login", adminlogin);

router.post("/admin/login", adminloginfromdb);

router.get('/appointment/:id',async (req, res) => {
  const token=req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
  const { id } = req.params;
  const docInfo = await User.findById(id).select('-password');
    const imagePath = path.join(__dirname, '..', '..', 'frontend', 'patient', 'views', 'assets', docInfo.image.replace('/assets/', ''));
    if (!fs.existsSync(imagePath)) {
      const randomIndex = Math.floor(Math.random() * 14) + 1;
      docInfo.image = `/assets/doc${randomIndex}.png`;
    }
  if (!docInfo) {
    return res.status(404).send("Doctor not found");
  }
  res.render('appointment', { docInfo,currencySymbol: "$",user:req.user,patientdata});
});

router.get("/logout", adminlogout);

router.get("/doctorlogout", doctorlogout);

router.get('/contact', contactpage);

router.get(
  "/doctors-registration",
  checkforauthentication(),
  restrictTo(["ADMIN"]),
  doctorsregistration
);

router.get('/about', aboutpage);

router.get('/doctors/:speciality?',doctorsdetailtable);

router.get("/", async (req, res) => {
  const token=req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
    res.render("index", {
    user: req.user, 
    specialityData,
    patientdata,
  });
});

router.post(
  "/doctors-registration",
  upload.single("image"),
  doctorsregistrationtodb
);
router.post("/doctorlogin", doctorloginfromdb);

router.post('/login',patientloginfromdb);

router.get("/register", patientsregisterpage);

router.get("/login", patientsloginpage);

router.get("/doctorlogin", doctorsloginpage);

router.get("/profile", adminprofile);

router.get("/my-profile",PatientProfile);

router.get('/admin/doctors-detail', async (req, res) => {
  try {
    const doctors = await User.find({role:"DOCTOR"});
    doctors.forEach(doctor => {
      const imagePath = path.join(__dirname, '..', '..', 'frontend', 'patient', 'views', 'assets', doctor.image.replace('/assets/', ''));
      console.log("Checking image path:", imagePath); // Debugging statement
      if (!fs.existsSync(imagePath)) {
        const randomIndex = Math.floor(Math.random() * 14) + 1; // Generate a random number between 1 and 14
        doctor.image = `/assets/doc${randomIndex}.png`; // Set default image path with random number
      }
    });
    res.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/doctors-detail", doctorsdetailpage);

router.get("/registereddoctors", doctors);

router.get("/messages", messages);

router.get("/appointments", appointmentdetailtable);

router.get("/doctor/appointments",async(req,res)=>{
  const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    try {
        const decodedtoken = validatetoken(token);
        const doctordata = await Appointment.find({ docId: decodedtoken._id })
            .select("-userdata")
            .select("-doctordata")
            .select("-payment");
        
        return res.json({ doctordata });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
})

router.get("/admin/appointments",async(req,res)=>{
  try {
    const appointments = await Appointment.find();
    res.json({appointments});
  } catch (error) {
    console.log(error);
  }
})

router.post("/appointment", bookappointment);

router.post('/register',patientregistrationtodb);

router.get("/showmsg", showallmsg);

router.post('/update-profile',upload.single('image'),UpdateProfile);

router.get(
  "/doctor",
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

router.post("/save-payment", savePayments);

router.post('/change-availability',(req, res, next) => {
  const doctorId = req.body.doctorId;
  req.doctorId = doctorId;
  next();
}, changeAvailability);

module.exports = router;