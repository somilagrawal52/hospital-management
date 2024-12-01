const Doctor = require("../models/doctors");
const path = require("path");
const { mailsender } = require("./mail");

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
    const doctors = await Doctor.find({});
    res.json(doctors);
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
    password,
    number,
    country,
    state,
    city,
    gender,
    department,
  } = req.body;

  try {
    // Ensure req.file is logged for debugging
    console.log("Uploaded file");

    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).send("Image file is required");
    }

    const newDoctor = await Doctor.create({
      fullname,
      email,
      password,
      number,
      gender,
      country,
      state,
      city,
      department,
      image: `/img/${req.file.filename}`,
    });
    console.log("Doctor created successfully");

    const obj = {
      to: email,
      subject: "Welcome Message!",
      text: `Welcome to OneLife, ${fullname}!`,
    };
    await mailsender(obj);

    res.redirect("/doctors-registration");
  } catch (error) {
    console.error("Error during doctor registration:", error);
    res.status(500).send("Server error");
  }
}

async function doctorsdetailpage(req, res) {
  return res.sendFile(path.join(frontendPath, "doctors-detail.html"));
}

module.exports = {
  doctorsregistration,
  doctorsdetailtable,
  doctorsregistrationtodb,
  doctorsdetailpage,
  doctorsdashboard,
  doctorsloginpage,
};
