const Waitlist = require("../models/waitlist");
const User = require("../models/user");
const { mailsender } = require("../controller/mail");
const { localDateKey } = require("./scheduling");

async function notifyWaitlistForSlot({ doctorId, date, time, doctorName }) {
  const slotDate = localDateKey(date);
  const baseQuery = { doctorId, slotDate, status: "active" };
  let entry = await Waitlist.findOne({ ...baseQuery, preferredTime: time }).sort({ createdAt: 1 });
  if (!entry) entry = await Waitlist.findOne({ ...baseQuery, preferredTime: null }).sort({ createdAt: 1 });
  if (!entry) return null;

  entry.status = "notified";
  entry.notifiedAt = new Date();
  await entry.save();

  const patient = await User.findById(entry.patientId).select("fullname email");
  if (patient?.email) {
    mailsender({
      to: patient.email,
      subject: "A requested appointment slot is available",
      text: `Hello ${patient.fullname || "Patient"}, a ${time} appointment on ${slotDate} with Dr. ${doctorName || "your doctor"} is now available. Please sign in to OneLife and book it as soon as possible.`,
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

module.exports = { fulfilPatientWaitlist, notifyWaitlistForSlot };
