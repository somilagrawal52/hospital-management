const Doctor = require("../models/doctors");
const path = require("path");
const { mailsender } = require("./mail");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

// Ensure multer is imported and the storage configuration is defined here:
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
  const { fullname, email, password, number, country, state, city, gender } =
    req.body;
  console.log(req.body);

  try {
    // Ensure req.file is logged for debugging
    console.log("Uploaded file:", req.file);

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
      image: `/img/${req.file.filename}`,
    });
    console.log("Doctor created successfully", newDoctor);

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
};
