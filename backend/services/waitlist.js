const crypto = require("node:crypto");
const Waitlist = require("../models/waitlist");
const User = require("../models/user");
const { mailsender } = require("../controller/mail");
const { localDateKey } = require("./scheduling");

const PRIORITY_WINDOW_MINUTES = 15;

async function notifyWaitlistForSlot({ doctorId, date, time, doctorName, baseUrl = "" }) {
  const slotDate = localDateKey(date);
  const now = new Date();
  await Waitlist.updateMany(
    { status: "notified", priorityExpiresAt: { $lte: now } },
    { $set: { status: "expired" } },
  ).catch(() => {});

  const baseQuery = { doctorId, slotDate, status: "active" };
  let entry = await Waitlist.findOne({ ...baseQuery, preferredTime: time }).sort({ createdAt: 1 });
  if (!entry) entry = await Waitlist.findOne({ ...baseQuery, preferredTime: null }).sort({ createdAt: 1 });
  if (!entry) return null;

  entry.status = "notified";
  entry.notifiedAt = now;
  entry.prioritySlotTime = time;
  entry.priorityExpiresAt = new Date(now.getTime() + PRIORITY_WINDOW_MINUTES * 60 * 1000);
  entry.claimToken = crypto.randomBytes(12).toString("hex");
  await entry.save();

  const claimPath = `/appointment/${encodeURIComponent(String(doctorId))}?date=${encodeURIComponent(slotDate)}&claim=${encodeURIComponent(entry.claimToken)}`;
  const claimUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${claimPath}` : claimPath;

  const patient = await User.findById(entry.patientId).select("fullname email");
  if (patient?.email) {
    mailsender({
      to: patient.email,
      subject: "Priority Slot Available for You (15-Min Hold)",
      text: `Hello ${patient.fullname || "Patient"}, a ${time} appointment on ${slotDate} with Dr. ${doctorName || "your doctor"} has just opened up. You have a ${PRIORITY_WINDOW_MINUTES}-minute priority window to claim it here: ${claimUrl}`,
    }).catch((error) => console.error("Waitlist notification email failed:", error.message));
  }
  return entry;
}

async function fulfilPatientWaitlist({ patientId, doctorId, slotDate, appointmentId }) {
  await Waitlist.updateMany(
    { patientId, doctorId, slotDate, status: { $in: ["active", "notified"] } },
    { status: "fulfilled", fulfilledBy: appointmentId },
  );
}

module.exports = {
  PRIORITY_WINDOW_MINUTES,
  fulfilPatientWaitlist,
  notifyWaitlistForSlot,
};
