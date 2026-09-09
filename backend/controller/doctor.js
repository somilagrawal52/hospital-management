const User = require("../models/user");
const Appointment = require("../models/appointment");
const path = require("path");
const fs=require('fs');
const { doctorImage } = require("../services/doctor-image");
const { mailsender, sendWhatsAppMessage } = require("./mail");
const {validatetoken}=require("../services/auth");
const { cookieOptions } = require("../services/auth");
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
  return res.render("doctors-registration");
}

async function doctorsloginpage(req, res) {
  return res.render("doctor-login", { email: "", error: "" });
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
    doctors.forEach((doctor) => { doctor.image = doctorImage(doctor.image); });
    res.render('doctor', { speciality, filterDoc,user:req.user,patientdata });
    
    // res.json({success:true,doctors});
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Server error");
  }
}

async function doctorsdashboard(req, res) {
  try {
    const doctor = await User.findById(req.user._id).select("-password");
    const appointments = await Appointment.find({ docId: req.user._id })
      .sort({ date: -1 })
      .lean();
    const fellowDoctorsCount = await User.countDocuments({
      role: "DOCTOR",
      _id: { $ne: req.user._id },
    });
    const onlineRequestsCount = await Appointment.countDocuments({ docId: req.user._id, status: "online_requested" });
    const upcomingAppointmentsCount = appointments.filter((item) => item.status === "confirmed" && new Date(item.date) >= new Date()).length;

    const formattedAppointments = appointments.map((appointment) => ({
      ...appointment,
      formattedDate: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(appointment.date)),
    }));

    return res.render("doctor-dashboard", {
      doctor,
      patientsAssignedCount: appointments.length,
      fellowDoctorsCount,
      onlineRequestsCount,
      upcomingAppointmentsCount,
      appointments: formattedAppointments,
    });
  } catch (error) {
    console.error("Error loading doctor dashboard:", error);
    return res.status(500).send("Server error");
  }
}

async function showalldocmsg(req, res) {
  try {
    const doctor = await User.findById(req.user._id).select("-password");
    const requests = await Appointment.find({ status: "online_requested", docId: req.user._id })
      .sort({ date: -1 })
      .lean();

    const formattedRequests = requests.map((request) => ({
      ...request,
      formattedRequestTime: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(request.date)),
    }));

    return res.render("doctor-messages", {
      doctor,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("Error loading doctor requests:", error);
    return res.status(500).send("Server error");
  }
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
    mailsender(obj).catch((mailError) => console.error("Welcome email failed:", mailError.message));
    sendWhatsAppMessage(number, doctorWhatsAppMessage).catch((whatsappError) => console.error("Welcome WhatsApp message failed:", whatsappError.message));
    res.redirect("/doctors-registration");
  } catch (error) {
    console.error("Error during doctor registration:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

async function doctorloginfromdb(req, res) {
  const { email, password } = req.body;
  
  try {
    const doctor = await User.findOne({ email: email.toLowerCase(), role: "DOCTOR" });
    if (!doctor) throw new Error("incorrect credentials");
  const doctorname = doctor.fullname;

    const token = await User.matchpassword(email, password);
    res.cookie("doctorname", doctorname, cookieOptions);
    return res.cookie("token", token, cookieOptions).redirect("/doctor");
  } catch (error) {
    console.error(error);
    return res.status(401).render("doctor-login", {
      email,
      error: "Incorrect email or password. Please try again.",
    });
  }
}

async function doctorsdetailpage(req, res) {
  try {
    const doctors = await User.find({ role: "DOCTOR" }).select("-password").lean();
    const formattedDoctors = doctors.map((doctor) => {
      const image = doctorImage(doctor.image);

      return {
        ...doctor,
        image,
      };
    });

    return res.render("doctors-detail", { doctors: formattedDoctors });
  } catch (error) {
    console.error("Error loading doctors detail page:", error);
    return res.status(500).send("Server error");
  }
}

async function doctorlogout(req, res) {
  
  res.clearCookie("token").redirect("/doctorlogin");
}
async function changeAvailability(req,res) {
  try {
    const{doctorId}=req.body
    if (req.user.role === "DOCTOR" && String(req.user._id) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: "You can only change your own availability." });
    }
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
  showalldocmsg,
  changeAvailability,
};
