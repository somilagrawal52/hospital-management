const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();
const { assertRuntimeConfig } = require("./services/runtime-config");
assertRuntimeConfig();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { validatetoken } = require("./services/auth");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const userRoute = require("./routes/user");
const { checkforauthentication, restrictTo } = require("./middlewares/auth");
const { requireSameOrigin, csrfContext } = require("./middlewares/csrf-origin");
const { integrationMode, isolatedIntegrations } = require("./services/integrations");
const { i18nMiddleware } = require("./services/i18n");
const { computeOperationalAnalytics } = require("./services/care-metrics");
const { localDateKey } = require("./services/scheduling");
const User = require("./models/user");
const Appointment = require("./models/appointment");
const { razorpayWebhook } = require("./controller/webhooks");
const { notifyWaitlistForSlot } = require("./services/waitlist");
const { stagingAccess } = require("./middlewares/staging-access");

const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);
// Keep compatibility with the project's existing .env keys while supporting
// conventional uppercase deployment variables.
const PORT = process.env.PORT || process.env.port || 8000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.database_url || (process.env.NODE_ENV !== "production" ? "mongodb://localhost:27017/birlasoft2" : undefined);

mongoose
  .connect(DATABASE_URL)
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection error:", err));

app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "../frontend/patient/views"),
  path.join(__dirname, "../frontend/Admin"),
  path.join(__dirname, "../frontend/doctor"),
]);

app.disable("x-powered-by");
app.use(helmet({
  referrerPolicy: { policy: "same-origin" },
  contentSecurityPolicy: isolatedIntegrations() ? { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"],
    scriptSrcAttr: ["'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'"],
    connectSrc: ["'self'"], imgSrc: ["'self'", "data:", "blob:"], frameSrc: ["'none'"],
    formAction: ["'self'"],
  } } : false,
}));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.use(stagingAccess());
// Razorpay signatures are calculated from the unparsed request body, so this
// route must be registered before the JSON parser.
app.post("/webhooks/razorpay", express.raw({ type: "application/json", limit: "100kb" }), razorpayWebhook);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(i18nMiddleware);
app.use(csrfContext);
app.use(requireSameOrigin);
app.use((req, res, next) => { res.locals.integrationMode = integrationMode(); next(); });
app.use(checkforauthentication("token"));

app.use(
  "/admin-assets",
  express.static(path.join(__dirname, "..", "frontend", "Admin", "assets")),
);
app.use(
  "/admin-assets/img",
  express.static(path.join(__dirname, "..", "frontend", "Admin", "assets", "img")),
);
app.use(
  "/doctor-assets",
  express.static(path.join(__dirname, "..", "frontend", "doctor", "assets")),
);
app.use(
  "/console-assets",
  express.static(path.join(__dirname, "..", "frontend", "shared", "assets")),
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
      const [patientsCount, doctorsCount, appointments, allAppointments, doctorsList, todayAppointmentsCount] = await Promise.all([
        User.countDocuments({ role: "NORMAL" }),
        User.countDocuments({ role: "DOCTOR" }),
        Appointment.find().sort({ date: -1 }).limit(15).lean(),
        Appointment.find().select("status visitMode isOnline queueState slotDate date amount payment doctordata docId doctorId").lean(),
        User.find({ role: "DOCTOR" }).select("_id fullname speciality fees available queueStatus").lean(),
        Appointment.countDocuments({ date: { $gte: todayStart, $lt: tomorrowStart }, status: { $nin: ["cancelled"] } }),
      ]);

      const analytics = computeOperationalAnalytics(allAppointments, doctorsList);
      const todayKey = localDateKey(new Date());

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
        doctorsList,
        analytics,
        todayKey,
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
      ...(appointment.payment?.status === "success"
        ? { "payment.refundStatus": "eligible", "payment.refundAmount": Number(appointment.amount || appointment.payment?.amount || 0) }
        : {}),
    });
    const slotTime = appointment.slotTime || new Date(appointment.date).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
    notifyWaitlistForSlot({
      doctorId: appointment.doctorId || appointment.docId,
      date: appointment.date,
      time: slotTime,
      doctorName: appointment.doctor,
    }).catch((notificationError) => console.error("Waitlist notification failed after cancellation:", notificationError));

    if (req.xhr || req.headers.accept?.includes("application/json") || req.get("x-csrf-token")) {
      return res.json({ success: true, message: "Appointment cancelled successfully." });
    }
    return res.redirect("/my-appointment");
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
