require("dotenv").config();
const express = require("express");
const router = express.Router();
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const User = require("../models/user");
const { mailsender } = require('../controller/mail');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { isMedicalQuery, MEDICAL_ONLY_FALLBACK } = require("../services/medical-query");
const { isEmergencyMessage, EMERGENCY_MESSAGE } = require("../services/emergency-triage");
const { doctorImage } = require("../services/doctor-image");
const { integrationMode, isolatedIntegrations, requireLiveIntegration, paymentVerificationSecret } = require("../services/integrations");
const crypto = require("node:crypto");
const { createVideoSession, createVideoCalendarEvent } = require("../services/video-session");
const { notifyWaitlistForSlot } = require("../services/waitlist");
const path = require("path");
const mongoose = require("mongoose");
const Appointment = require("../models/appointment");
const { validatetoken } = require("../services/auth");
const {
  specialityData,
} = require("../../frontend/patient/views/assets/assets");
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
  updateSupportThread,
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
  showalldocmsg,
  changeAvailability,
} = require("../controller/doctor");
const {
  myappointments,
  doctors,
  messages,
  appointment,
  home,
  bookappointment,
  appointmentdetailtable,
  sendmsg,
  replyToSupportThread,
  messagesdetailtable,
  savePayments,
  patientregistrationtodb,
  patientloginfromdb,
  PatientProfile,
  UpdateProfile,
  getOnlineAppointmentRequests,
  patientsloginpage,
  patientsregisterpage,
  markAppointmentOnline,
  aboutpage,
  updateAppointmentStatus,
  contactpage,
} = require("../controller/patient");
const { register } = require("../controller/patient");
const {
  availabilityPage,
  cancelWaitlist,
  getPublicSlots,
  joinWaitlist,
  rescheduleAppointment,
  updateAvailability,
} = require("../controller/scheduling");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { adminAppointment, adminDoctor, doctorAppointment } = require("../services/response-sanitizers");
const { restrictTo, checkforauthentication, requireAuth } = require("../middlewares/auth");
const {
  appointmentcreated,
  verifypayment,
  payemntsuccessfull,
} = require("../controller/razorpay");

const frontendPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "patient",
  "views",
  "assets"
);

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, path.resolve(frontendPath));
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) return cb(new Error("Only JPG, PNG, and WebP image uploads are allowed."));
    return cb(null, true);
  },
});
const chatLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler(req, res) {
    const error = "Too many sign-in attempts. Please wait 15 minutes and try again.";
    if (req.path === "/admin/login") return res.status(429).render("admin-login", { email: req.body?.email || "", error });
    if (req.path === "/doctorlogin") return res.status(429).render("doctor-login", { email: req.body?.email || "", error });
    return res.status(429).render("login", { state: "login", fullname: "", email: req.body?.email || "", password: "", error });
  },
});

router.get("/admin/login", adminlogin);

router.post("/admin/login", loginLimiter, adminloginfromdb);

router.get("/my-appointment", requireAuth, restrictTo(["NORMAL"]), myappointments);

router.get("/doctors/:doctorId/slots", getPublicSlots);

router.post("/waitlist", requireAuth, restrictTo(["NORMAL"]), joinWaitlist);

router.post("/waitlist/:id/cancel", requireAuth, restrictTo(["NORMAL"]), cancelWaitlist);

router.post("/appointments/:id/reschedule", requireAuth, restrictTo(["NORMAL"]), rescheduleAppointment);

router.get("/appointments/online", requireAuth, restrictTo(["DOCTOR"]), getOnlineAppointmentRequests);

router.post("/appointments/status", requireAuth, restrictTo(["DOCTOR", "ADMIN"]), updateAppointmentStatus);

router.get("/disease", (req, res) => {
  res.render("diseaseSearch");
});

router.get("/disease/:name", async (req, res) => {
  const diseaseName = req.params.name;
  if (!/^[a-z0-9 -]{2,80}$/i.test(diseaseName)) {
    return res.status(400).json({ error: "Enter a valid disease name." });
  }
  if (isolatedIntegrations()) {
    if (integrationMode() === "disabled") return res.status(503).json({ error: "External disease lookup is disabled in this environment." });
    return res.json({ disease: diseaseName, pageTitle: diseaseName, intro: "Staging simulation: external disease lookup was not performed.", symptoms: [], treatment: [], prevention: [], keyFacts: [], mocked: true });
  }
  const url = `https://www.who.int/health-topics/${encodeURIComponent(diseaseName)}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const $ = cheerio.load(data);
    
    // Get page title for verification
    const pageTitle = $('h1').first().text().trim();
    
    // Get the main content text from WHO pages
    let fullText = "";
    
    // WHO pages typically have content in main content areas
    const contentSelectors = [
      'main .sf-content',
      '.page-content',
      '.content-area', 
      'main',
      '.article-content'
    ];
    
    for (let selector of contentSelectors) {
      const content = $(selector).first().text();
      if (content && content.length > 500) {
        fullText = content.trim();
        break;
      }
    }
    
    // If no structured content found, get all paragraphs
    if (!fullText) {
      let allText = [];
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 50) {
          allText.push(text);
        }
      });
      fullText = allText.join(' ');
    }
    
    // Parse the full text to extract different sections
    function extractSection(text, keywords, nextSectionKeywords = []) {
      const lowerText = text.toLowerCase();
      let startIndex = -1;
      
      // Find start of section
      for (let keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          startIndex = index;
          break;
        }
      }
      
      if (startIndex === -1) return [];
      
      // Find end of section
      let endIndex = text.length;
      for (let nextKeyword of nextSectionKeywords) {
        const index = lowerText.indexOf(nextKeyword.toLowerCase(), startIndex + 50);
        if (index !== -1 && index < endIndex) {
          endIndex = index;
        }
      }
      
      const sectionText = text.substring(startIndex, endIndex);
      
      // Split into sentences and clean up
      return sectionText.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .slice(0, 5); // Limit to 5 key points
    }
    
    // Extract introduction (first substantial paragraph)
    const sentences = fullText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 50);
    const intro = sentences[0] || "No introduction found";
    
    // Extract symptoms
    const symptoms = extractSection(fullText, 
      ['symptoms', 'signs', 'fever, headache', 'clinical manifestations', 'illness'],
      ['treatment', 'diagnosis', 'prevention', 'transmission']
    );
    
    // Extract treatment info
    const treatment = extractSection(fullText,
      ['treatment', 'therapy', 'artemisinin', 'antimalarial', 'medicines', 'drugs'],
      ['prevention', 'diagnosis', 'transmission', 'vector control']
    );
    
    // Extract prevention info  
    const prevention = extractSection(fullText,
      ['prevention', 'prevent', 'control', 'vector control', 'chemoprophylaxis', 'protective'],
      ['transmission', 'symptoms', 'treatment', 'diagnosis']
    );
    
    // Extract key statistics and facts
    let keyFacts = [];
    const factPatterns = [
      /(\d+(?:,\d+)*)\s*(?:million|thousand)?\s*(?:cases|deaths)/gi,
      /children under \d+[^.]*[.]/gi,
      /\d+%[^.]*[.]/gi
    ];
    
    factPatterns.forEach(pattern => {
      const matches = fullText.match(pattern);
      if (matches) {
        keyFacts.push(...matches.slice(0, 3));
      }
    });
    
    
    // Debug logging
    console.log(`Scraping: ${url}`);
    console.log(`Full text length: ${fullText.length}`);
    console.log(`Intro: ${intro.substring(0, 100)}...`);
    console.log(`Symptoms found: ${symptoms.length}`);
    console.log(`Treatment found: ${treatment.length}`);
    console.log(`Prevention found: ${prevention.length}`);
    
    res.json({
      disease: diseaseName,
      pageTitle: pageTitle || diseaseName,
      intro: intro || "No introduction found",
      keyFacts: keyFacts.length ? keyFacts.slice(0, 5) : ["No key facts found"],
      symptoms: symptoms.length ? symptoms : ["No symptoms section found"],
      treatment: treatment.length ? treatment : ["No treatment info found"], 
      prevention: prevention.length ? prevention : ["No prevention info found"],
      url: url,
      scrapedAt: new Date().toISOString(),
      debug: process.env.NODE_ENV === 'development' ? {
        fullTextLength: fullText.length,
        foundSections: {
          symptoms: symptoms.length,
          treatment: treatment.length,
          prevention: prevention.length
        }
      } : undefined
    });
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    
    if (error.response) {
      if (error.response.status === 404) {
        res.status(404).json({
          error: "Disease page not found. Please check the spelling.",
          suggestion: "Try searching for common diseases like 'diabetes', 'malaria', 'covid-19'"
        });
      } else if (error.response.status === 403) {
        res.status(403).json({
          error: "Access denied. The website may be blocking automated requests."
        });
      } else {
        res.status(error.response.status).json({
          error: `HTTP ${error.response.status}: ${error.response.statusText}`
        });
      }
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        error: "Request timeout. The website took too long to respond."
      });
    } else {
      res.status(500).json({
        error: "Failed to fetch disease info. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

function extractContent($, baseSelector) {
  let content = '';
  
  // Try multiple content selectors
  const selectors = [
    `${baseSelector} article`,
    `${baseSelector} .content`,
    `${baseSelector} p`,
    'article',
    '.content',
    'p'
  ];

  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length) {
      content = elements.map((_, el) => $(el).text()).get().join(' ');
      if (content.length > 200) break;
    }
  }

  return content.replace(/\s+/g, ' ').trim();
}

function extractSection(content, keywords) {
  const sentences = content.split(/[.!?]+/);
  return sentences
    .filter(sentence => 
      keywords.some(keyword => 
        sentence.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    .map(s => s.trim())
    .filter(s => s.length > 30)
    .slice(0, 5);
}

router.get("/video-requests", requireAuth, restrictTo(["DOCTOR"]), async (req, res) => {
  try {
    const appointments = await Appointment.find({
      status: "online_requested", docId: req.user._id,
    });

    const filtered = appointments.map((appt) => ({
      id: appt._id,
      fullname: appt.fullname,
      reason: appt.payment?.reason || "N/A",
      requestTime: appt.date,
    }));

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/video-requests/accept/:id", requireAuth, restrictTo(["DOCTOR"]), async (req, res) => {
  if (integrationMode() === "disabled") return res.status(503).json({ error: "Video meetings are disabled in this environment." });
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment || appointment.docId !== String(req.user._id)) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    if (appointment.status !== "online_requested") {
      return res.status(409).json({ error: "This online request is no longer awaiting approval." });
    }

    appointment.status = "confirmed";
    appointment.iscompleted = false;
    appointment.isOnline = true;
    appointment.cancelled = false;
    appointment.video = { ...appointment.video?.toObject?.(), ...createVideoSession() };
    appointment.statusHistory.push({ status: "confirmed", changedBy: req.user._id, source: "video_request_accepted" });
    await appointment.save();

    const patient = await User.findById(appointment.patientId || appointment.userid);
    if (patient?.email) {
      const patientmail = {
        to: patient.email,
        subject: "Your Online Appointment Request is Accepted",
        text: `
          Hello ${patient.fullname || "Patient"},
          Your online appointment request for ${appointment.date} has been accepted.
          Doctor: ${appointment.doctor || "Assigned Doctor"}
          Join securely at: ${appointment.video.joinUrl}
          
          Thank you for using OneLife.
        `,
      };
      mailsender(patientmail).catch((mailError) => console.error("Video appointment email failed:", mailError.message));
    }

    res.status(200).json({ message: "Request accepted", joinUrl: appointment.video.joinUrl });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ error: "Failed to accept request" });
  }
});

router.post("/video-requests/decline/:id", requireAuth, restrictTo(["DOCTOR"]), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, docId: req.user._id });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    appointment.status = "cancelled";
    appointment.cancelled = true;
    appointment.isOnline = false;
    appointment.iscompleted = false;
    // Older appointments do not have the video subdocument yet.
    if (!appointment.video) appointment.video = {};
    appointment.video.status = "declined";
    appointment.statusHistory.push({ status: "cancelled", changedBy: req.user._id, source: "video_request_declined" });
    await appointment.save();
    const slotTime = appointment.slotTime || new Date(appointment.date).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
    notifyWaitlistForSlot({ doctorId: appointment.doctorId || appointment.docId, date: appointment.date, time: slotTime, doctorName: appointment.doctor })
      .catch((notificationError) => console.error("Waitlist notification failed after declining video request:", notificationError));
    res.status(200).json({ message: "Request declined" });
  } catch (err) {
    res.status(500).json({ error: "Failed to decline request" });
  }
});

function mayAccessAppointment(appointment, user) {
  return user.role === "ADMIN" || appointment.userid === String(user._id) || appointment.docId === String(user._id);
}

router.get("/appointments/:id/video/calendar", requireAuth, async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment || !mayAccessAppointment(appointment, req.user) || !["scheduled", "in_progress"].includes(appointment.video?.status)) {
    return res.status(404).json({ error: "Online appointment not found" });
  }
  res.type("text/calendar");
  res.attachment(`onelife-video-appointment-${appointment._id}.ics`);
  return res.send(createVideoCalendarEvent(appointment));
});

router.get("/appointments/:id/video/join", requireAuth, async (req, res) => {
  if (integrationMode() === "disabled") return res.status(503).json({ error: "Video consultations are disabled in this environment." });
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment || !mayAccessAppointment(appointment, req.user) || !["scheduled", "in_progress"].includes(appointment.video?.status)) {
    return res.status(404).render("error-404", { title: "Online Appointment Not Found", message: "This video consultation is not available." });
  }
  if (req.user.role === "DOCTOR") appointment.video.doctorJoinedAt ||= new Date();
  if (req.user.role === "NORMAL") appointment.video.patientJoinedAt ||= new Date();
  appointment.video.status = "in_progress";
  await appointment.save();
  return res.redirect(integrationMode() === "mock" ? `/testing/mock-video/${encodeURIComponent(appointment.video.roomName || String(appointment._id))}` : appointment.video.joinUrl);
});

router.post("/appointments/:id/video/events", requireAuth, async (req, res) => {
  const { event } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment || !mayAccessAppointment(appointment, req.user) || !appointment.video || !["scheduled", "in_progress"].includes(appointment.video.status) || !["joined", "ended"].includes(event)) {
    return res.status(404).json({ success: false, message: "Online appointment not found" });
  }
  if (event === "joined") {
    appointment.video.status = "in_progress";
    if (req.user.role === "DOCTOR") appointment.video.doctorJoinedAt ||= new Date();
    if (req.user.role === "NORMAL") appointment.video.patientJoinedAt ||= new Date();
  } else {
    appointment.video.status = "completed";
    appointment.video.endedAt = new Date();
  }
  await appointment.save();
  return res.json({ success: true, videoStatus: appointment.video.status });
});

router.post("/chat", requireAuth, chatLimiter, async (req, res) => {
  const userMessage = String(req.body.message || "").trim();
  if (!userMessage || userMessage.length > 1000) {
    return res.status(400).json({ error: "Enter a message of up to 1,000 characters." });
  }
  if (isEmergencyMessage(userMessage)) {
    return res.json({ message: EMERGENCY_MESSAGE, emergency: true });
  }
  if (!isMedicalQuery(userMessage)) {
    return res.json({ message: MEDICAL_ONLY_FALLBACK, fallback: true });
  }
  if (integrationMode() === "mock") return res.json({ message: "Staging simulation: no AI provider was contacted. Please consult a qualified clinician for health advice.", mocked: true, sources: [] });
  if (integrationMode() === "disabled") return res.status(503).json({ error: "AI responses are disabled in this environment." });

  try {
    requireLiveIntegration("AI");
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes("replace")) {
      return res.json({
        message: "Thank you for reaching out to OneLife Health Information. While external AI integration is being configured, please note that any persistent symptoms should be evaluated by a certified clinician. You can book an appointment directly with our hospital specialists.",
        sources: [
          { label: "WHO health topics", url: "https://www.who.int/health-topics" },
          { label: "CDC health information", url: "https://www.cdc.gov/health-topics/" },
        ],
      });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are OneLife's health-information assistant. Give general, cautious information only; do not diagnose, prescribe, or claim certainty. Encourage the user to contact a qualified clinician for personal advice and to seek emergency help for urgent symptoms. Keep the answer concise. Do not invent citations or claim a source supports a statement unless you are certain. User question: ${userMessage}`;
    const result = await model.generateContent(prompt);
    res.json({
      message: result.response.text(),
      sources: [
        { label: "WHO health topics", url: "https://www.who.int/health-topics" },
        { label: "CDC health information", url: "https://www.cdc.gov/health-topics/" },
      ],
    });
  } catch (error) {
    console.error("Error with AI Studio API:", error);
    res.json({
      message: "OneLife Health Assistant is currently providing advisory notes: Please consult our hospital specialists or your primary care physician for a formal medical evaluation. In case of acute discomfort or distress, reach out to emergency services immediately.",
      sources: [
        { label: "WHO health topics", url: "https://www.who.int/health-topics" },
        { label: "CDC health information", url: "https://www.cdc.gov/health-topics/" },
      ],
    });
  }
});

router.post("/make-online/:id", requireAuth, restrictTo(["NORMAL"]), markAppointmentOnline);

router.get("/download-pdf", requireAuth, async (req, res) => {
  const { file } = req.query; // Get the filename from the query string
  if (!file || path.basename(file) !== file) return res.status(400).json({ message: "Invalid file" });
  const appointment = await Appointment.findOne({ invoiceFile: file });
  const mayDownload = appointment && (req.user.role === "ADMIN" || appointment.userid === String(req.user._id) || appointment.docId === String(req.user._id));
  if (!mayDownload) return res.status(404).json({ message: "File not found" });
  const filePath = path.join(__dirname, "..", "invoices", file);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Set the response headers for file download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${file}`);

    // Create a readable stream of the file and pipe it to the response
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

router.get("/appointment/:id", async (req, res) => {
  const token = req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).render("error-404", { title: "Doctor Not Found", message: "The selected doctor does not exist." });
  }
  const docInfo = await User.findById(id).select("-password");
  if (!docInfo) {
    return res.status(404).send("Doctor not found");
  }
  docInfo.image = doctorImage(docInfo.image);
  res.render("appointment", {
    docInfo,
    currencySymbol: "₹",
    razorpayKey: integrationMode() === "live" ? process.env.RAZORPAY_KEY_ID : "mock-key-no-provider",
    user: req.user,
    patientdata,
  });
});

router.get("/chats", requireAuth, async (req, res) => {
  res.render("chat");
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.clearCookie("doctorname");
  res.status(204).end();
});
router.get("/admin/logout", requireAuth, restrictTo(["ADMIN"]), adminlogout);

router.get("/doctorlogout", doctorlogout);

router.get("/contact", contactpage);

router.get("/privacy-policy", async (req, res, next) => {
  try {
    const patientdata = req.user?.role === "NORMAL" ? await User.findById(req.user._id).select("-password") : null;
    res.render("privacy-policy", { user: req.user, patientdata });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/doctors-registration",
  requireAuth,
  restrictTo(["ADMIN"]),
  doctorsregistration
);

router.get("/about", aboutpage);

// Express 5 no longer supports the legacy `:param?` route syntax.
router.get("/doctors", doctorsdetailtable);
router.get("/doctors/:speciality", doctorsdetailtable);

router.get("/", async (req, res) => {
  const token = req.cookies.token;
  let patientdata = null;
  if (token) {
    const decodedtoken = validatetoken(token);
    patientdata = await User.findById({ _id: decodedtoken._id });
  }
  const doctors = await User.find({ role: "DOCTOR" })
    .select("_id fullname speciality degree experience about fees image available")
    .limit(8)
    .lean();
  doctors.forEach((doctor) => { doctor.image = doctorImage(doctor.image); });

  res.render("index", {
    user: req.user,
    specialityData,
    patientdata,
    doctors,
  });
});

router.post(
  "/doctors-registration",
  requireAuth,
  restrictTo(["ADMIN"]),
  upload.single("image"),
  doctorsregistrationtodb
);
router.post("/doctorlogin", loginLimiter, doctorloginfromdb);

router.post("/login", loginLimiter, patientloginfromdb);

router.get("/register", patientsregisterpage);

router.get("/login", patientsloginpage);

router.get("/doctorlogin", doctorsloginpage);

router.get("/profile", requireAuth, restrictTo(["ADMIN"]), adminprofile);

router.get("/my-profile", requireAuth, restrictTo(["NORMAL"]), PatientProfile);

router.get("/admin/doctors-detail", requireAuth, restrictTo(["ADMIN"]), async (req, res) => {
  try {
    const doctors = await User.find({ role: "DOCTOR" })
      .select("_id fullname email gender number speciality degree experience about fees image available")
      .lean();
    res.json(doctors.map((doctor) => ({ ...adminDoctor(doctor), image: doctorImage(doctor.image) })));
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/doctors-detail", requireAuth, restrictTo(["ADMIN"]), doctorsdetailpage);

router.get("/registereddoctors", doctors);

router.get("/messages", requireAuth, restrictTo(["NORMAL"]), messages);

router.get("/appointments", requireAuth, restrictTo(["NORMAL"]), appointmentdetailtable);

router.get("/doctor/appointments", requireAuth, restrictTo(["DOCTOR"]), async (req, res) => {
  try {
    const doctordata = await Appointment.find({ docId: req.user._id })
      .select("_id fullname email number doctor date slotDate slotTime status isOnline cancelled iscompleted video")
      .lean();
    return res.json({ doctordata: doctordata.map(doctorAppointment) });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/appointments", requireAuth, restrictTo(["ADMIN"]), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .select("_id fullname email number doctor date slotDate slotTime amount status isOnline cancelled iscompleted")
      .lean();
    res.json({ appointments: appointments.map(adminAppointment) });
  } catch (error) {
    console.log(error);
  }
});

router.post("/appointment", requireAuth, restrictTo(["NORMAL"]), bookappointment);

router.post("/register", patientregistrationtodb);

router.get("/showmsg", requireAuth, restrictTo(["ADMIN"]), showallmsg);

router.get("/showdocmsg", requireAuth, restrictTo(["DOCTOR"]), showalldocmsg);

router.get("/doctor/availability", requireAuth, restrictTo(["DOCTOR"]), availabilityPage);

router.patch("/doctor/availability", requireAuth, restrictTo(["DOCTOR"]), updateAvailability);

router.post("/update-profile", requireAuth, restrictTo(["NORMAL"]), upload.single("image"), UpdateProfile);

router.get("/doctor", restrictTo(["DOCTOR"]), doctorsdashboard);

router.post("/messages", requireAuth, restrictTo(["NORMAL"]), sendmsg);

router.post("/support/threads/:id/replies", requireAuth, restrictTo(["NORMAL"]), replyToSupportThread);

router.post("/admin/support/threads/:id", requireAuth, restrictTo(["ADMIN"]), updateSupportThread);

router.get("/message", requireAuth, restrictTo(["ADMIN"]), messagesdetailtable);

router.get("/countries", getallcountries);

router.get("/states/:countryCode", getallstates);

router.get("/cities/:countryCode/:stateCode", getallcities);

router.post("/create-order", (req, res) => res.status(410).json({ message: "Use the secure appointment payment flow." }));

router.post("/verify-payment", (req, res) => res.status(410).json({ message: "Payment is verified when the appointment is completed." }));

router.get("/payment-success", payemntsuccessfull);

router.post("/save-payment", requireAuth, restrictTo(["NORMAL"]), savePayments);

router.post("/testing/mock-payment", (req, res, next) => integrationMode() === "mock" ? next() : res.sendStatus(404), requireAuth, restrictTo(["NORMAL"]), async (req, res) => {
  const appointment = await Appointment.findOne({ "payment.orderId": req.body.orderId, userid: String(req.user._id) });
  if (!appointment || !String(appointment.payment.orderId).startsWith("mock_order_")) return res.status(404).json({ message: "Synthetic order not found." });
  const paymentId = `mock_payment_${crypto.randomUUID()}`;
  const signature = crypto.createHmac("sha256", paymentVerificationSecret()).update(`${appointment.payment.orderId}|${paymentId}`).digest("hex");
  return res.json({ razorpay_order_id: appointment.payment.orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, mocked: true });
});

router.get("/testing/mock-video/:room", (req, res, next) => integrationMode() === "mock" ? next() : res.sendStatus(404), requireAuth, (req, res) => {
  res.type("text/plain").send("OneLife staging video simulation. No video provider was contacted.");
});

router.post(
  "/change-availability",
  requireAuth,
  restrictTo(["DOCTOR", "ADMIN"]),
  (req, res, next) => {
    const doctorId = req.body.doctorId;
    req.doctorId = doctorId;
    next();
  },
  changeAvailability
);

module.exports = router;
