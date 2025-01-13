const User = require("../models/user");
const path = require("path");
const fs=require('fs');
const { mailsender, sendWhatsAppMessage } = require("./mail");
const {validatetoken}=require("../services/auth");
const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");
const frontendDoctor = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "doctor"
);

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, path.resolve(frontendPath, `./assets/img/`));
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

async function doctorsregistration(req, res) {
  return res.sendFile(path.join(frontendPath, "doctors-registration.html"));
}

async function doctorsloginpage(req, res) {
  return res.sendFile(path.join(frontendDoctor, "doctors-login.html"));
}

async function doctorsdetailtable(req, res) {
  try {
    const token=req.cookies.token;
    let patientdata = null;
    if (token) {
      const decodedtoken = validatetoken(token);
      patientdata = await User.findById({ _id: decodedtoken._id });
    }
    const { speciality } = req.params;
    const doctors = await User.find({ role: "DOCTOR" }).select('-password');
    const filterDoc = speciality
    ? doctors.filter((doc) => doc.speciality === speciality)
    : doctors;
    doctors.forEach(doctor => {
      const imagePath = path.join(__dirname, '..', '..','frontend', 'patient','views','assets',doctor.image.replace('/assets/', ''));
      if (!fs.existsSync(imagePath)) {
        const randomIndex = Math.floor(Math.random() * 14) + 1; 
        doctor.image = `/assets/doc${randomIndex}.png`;
      }
    });
    res.render('doctor', { speciality, filterDoc,user:req.user,patientdata });
    
    // res.json({success:true,doctors});
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function doctorsdashboard(req, res) {
  return res.sendFile(path.join(frontendDoctor, "doctor-dashboard.html"));
}

async function doctorsregistrationtodb(req, res) {
  const {
    fullname,
    email,
    gender,
    number,
    password,
    degree,
    experience,
    about,
    fees,
    line1,
    line2,
    speciality,
  } = req.body;
  try {
    // Ensure req.file is logged for debugging
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).send("Image file is required");
    }
    const address = {
      line1: line1,
      line2: line2,
  };
    const newDoctor = await User.create({
      fullname,
      email,
      password,
      gender,
      number,
      degree,
      experience,
      about,
      fees,
      date:Date.now(),
      address,
      speciality,
      image: `/assets/${req.file.filename}`,
      role: "DOCTOR",
    });
    console.log("Doctor created successfully");
    const doctorWhatsAppMessage = `Welcome to OneLife, ${fullname}!`;
    const obj = {
      to: email,
      subject: "Welcome Message!",
      text: `Welcome to OneLife, ${fullname}!`,
    };
    await mailsender(obj);
    await sendWhatsAppMessage(number, doctorWhatsAppMessage);
    res.redirect("/doctors-registration");
  } catch (error) {
    console.error("Error during doctor registration:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function doctorloginfromdb(req, res) {
  const { email, password } = req.body;
  console.log("doctor email:", email);
  
  try {
    const doctor = await User.findOne({ email: email });
  const doctorname = doctor.fullname;

    const token = await User.matchpassword(email, password);
    console.log(token);
    res.cookie("doctorname", doctorname);
    return res.cookie("token", token).redirect("/doctor");
  } catch (error) {
    console.error(error);
    return res.sendFile(path.join(frontendDoctor, "doctors-login.html"));
  }
}

async function doctorsdetailpage(req, res) {
  return res.sendFile(path.join(frontendPath, "doctors-detail.html"));
}

async function doctorlogout(req, res) {
  
  res.clearCookie("token").redirect("/doctorlogin");
}
async function changeAvailability(req,res) {
  try {
    const{doctorId}=req.body
    const docData=await User.findById(doctorId)
    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }
    await User.findByIdAndUpdate(doctorId,{available:!docData.available})
    res.json({success:true,message:'availability changed'})
  } catch (error) {
    res.json({success:false,message:error.message})
  }
}

module.exports = {
  doctorsregistration,
  doctorsdetailtable,
  doctorsregistrationtodb,
  doctorsdetailpage,
  doctorsdashboard,
  doctorsloginpage,
  doctorloginfromdb,
  doctorlogout,
  changeAvailability,
};
