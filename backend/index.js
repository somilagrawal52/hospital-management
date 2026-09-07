require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { validatetoken } = require("./services/auth");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const userRoute = require("./routes/user");
const { checkforauthentication, restrictTo } = require("./middlewares/auth");
const User = require("./models/user");
const Appointment = require("./models/appointment");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection error:", err));

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "../frontend/patient/views"),
  path.join(__dirname, "../frontend/Admin"),
  path.join(__dirname, "../frontend/doctor"),
]);

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(checkforauthentication("token"));

app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "Admin", "assets")),
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "Admin", "assets", "img")),
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "frontend", "doctor", "assets")),
);
app.use(
  "/user",
  express.static(path.join(__dirname, "..", "frontend", "Admin")),
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "../frontend/patient/views/assets")),
);

app.use("/", userRoute);

app.get("/health", (req, res) => {
  res.json({ msg: "success" });
});

app.get(
  "/admin",
  checkforauthentication("token"),
  restrictTo(["ADMIN"]),
  async (req, res) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const [patientsCount, doctorsCount, appointments, todayAppointmentsCount] = await Promise.all([
        User.countDocuments({ role: "NORMAL" }),
        User.countDocuments({ role: "DOCTOR" }),
        Appointment.find().sort({ date: -1 }).limit(10).lean(),
        Appointment.countDocuments({ date: { $gte: todayStart, $lt: tomorrowStart }, status: { $nin: ["cancelled"] } }),
      ]);

      const recentAppointments = appointments.map((appointment) => ({
        ...appointment,
        formattedDate: new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(appointment.date)),
      }));

      return res.render("admin-dashboard", {
        patientsCount,
        doctorsCount,
        todayAppointmentsCount,
        appointments: recentAppointments,
      });
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      return res.status(500).send("server error");
    }
  },
);

app.post("/clear/:id", restrictTo(["ADMIN"]), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/doctors-detail");
  } catch (error) {
    console.error(error);
    res.status(500).send("server error");
  }
});

app.post("/clearapp/:id", restrictTo(["ADMIN", "NORMAL"]), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (
      !appointment ||
      (req.user.role === "NORMAL" &&
        appointment.userid !== String(req.user._id))
    ) {
      return res.status(404).send("Appointment not found");
    }
    await Appointment.findByIdAndUpdate(req.params.id, {
      status: "cancelled",
      cancelled: true,
      isOnline: false,
      iscompleted: false,
    });
    const token = req.cookies.token;
    const decoded = validatetoken(token);
    const patientdata = await User.findById(decoded._id).select("-password");
    const appointments = await Appointment.find({ userid: decoded._id }).sort({
      date: -1,
    });

    patientdata.appointments = appointments.map((appointment) => ({
      ...appointment.toObject(),
      formattedDate: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(appointment.date)),
    }));
    res.render("myAppointment", { user: req.user, patientdata });
  } catch (error) {
    console.error(error);
    res.status(500).send("server error");
  }
});
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Unexpected server error"
        : err.message,
  });
});

server.listen(PORT, () => console.log(`Server started at port: ${PORT}`));
