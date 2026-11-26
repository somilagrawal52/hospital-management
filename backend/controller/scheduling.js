const mongoose = require("mongoose");
const Appointment = require("../models/appointment");
const User = require("../models/user");
const Waitlist = require("../models/waitlist");
const {
  assertSlotAvailable,
  availableSlotsForDoctor,
  isDateKey,
  isTime,
  localDateKey,
  normaliseAvailability,
  serialiseAvailability,
} = require("../services/scheduling");
const { notifyWaitlistForSlot } = require("../services/waitlist");
const { assignQueueTokenForAppointment } = require("../services/opd-queue");

function validDoctorId(value) {
  return mongoose.isValidObjectId(value);
}

function isBookableDate(dateKey) {
  if (!isDateKey(dateKey)) return false;
  const today = localDateKey(new Date());
  const latest = new Date(`${today}T00:00:00+05:30`);
  latest.setDate(latest.getDate() + 180);
  return dateKey >= today && dateKey <= localDateKey(latest);
}

async function getPublicSlots(req, res) {
  try {
    const { date } = req.query;
    if (!validDoctorId(req.params.doctorId) || !isBookableDate(date)) {
      return res.status(400).json({ success: false, message: "Choose a date within the next 180 days." });
    }
    const doctor = await User.findOne({ _id: req.params.doctorId, role: "DOCTOR" }).select("available availability");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
    const slots = await availableSlotsForDoctor(doctor, date, {
      excludeAppointmentId: req.query.excludeAppointmentId,
      patientId: req.user?._id,
      claimToken: req.query.claim,
    });
    return res.json({ success: true, date, slots, unavailable: !doctor.available });
  } catch (error) {
    console.error("Unable to load appointment slots:", error);
    return res.status(400).json({ success: false, message: error.message || "Unable to load available slots." });
  }
}

async function availabilityPage(req, res) {
  try {
    const doctor = await User.findById(req.user._id).select("fullname available availability").lean();
    if (!doctor) return res.status(404).render("error-404", { title: "Doctor Not Found", message: "Your account is unavailable." });
    return res.render("doctor-availability", { doctor, availability: serialiseAvailability(doctor) });
  } catch (error) {
    console.error("Unable to open availability calendar:", error);
    return res.status(500).send("Unable to load availability calendar.");
  }
}

async function updateAvailability(req, res) {
  try {
    const availability = normaliseAvailability(req.body);
    const doctor = await User.findOneAndUpdate(
      { _id: req.user._id, role: "DOCTOR" },
      { availability },
      { new: true, runValidators: true },
    ).select("availability available");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
    return res.json({ success: true, availability: serialiseAvailability(doctor), message: "Availability calendar saved." });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Unable to save availability." });
  }
}

async function rescheduleAppointment(req, res) {
  const { date, time } = req.body;
  if (!isBookableDate(date) || !isTime(time)) {
    return res.status(400).json({ success: false, message: "Choose an available date and time within the next 180 days." });
  }
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      $or: [{ patientId: req.user._id }, { userid: String(req.user._id) }],
    });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
    if (["cancelled", "completed", "payment_failed"].includes(appointment.status)) {
      return res.status(409).json({ success: false, message: "This appointment can no longer be rescheduled." });
    }

    const doctor = await User.findOne({ _id: appointment.doctorId || appointment.docId, role: "DOCTOR" }).select("available availability fullname");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
    const newDate = await assertSlotAvailable(doctor, date, time, { excludeAppointmentId: appointment._id });
    const oldDate = appointment.date;
    const oldSlotTime = appointment.slotTime || new Date(oldDate).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
    if (newDate.getTime() === new Date(oldDate).getTime()) {
      return res.json({ success: true, message: "Your appointment is already booked for that slot." });
    }

    appointment.date = newDate;
    appointment.slotDate = date;
    appointment.slotTime = time;
    appointment.queueToken = undefined;
    appointment.queueState = "waiting";
    appointment.checkedInAt = undefined;
    if (appointment.payment?.status === "success" || ["confirmed", "online_requested"].includes(appointment.status)) {
      await assignQueueTokenForAppointment(appointment);
    }
    appointment.rescheduleHistory.push({ from: oldDate, to: newDate, changedBy: req.user._id });
    appointment.statusHistory.push({ status: appointment.status, changedBy: req.user._id, source: "patient_reschedule" });
    await appointment.save();

    notifyWaitlistForSlot({
      doctorId: appointment.doctorId || appointment.docId,
      date: oldDate,
      time: oldSlotTime,
      doctorName: appointment.doctor,
    }).catch((error) => console.error("Waitlist notification failed after reschedule:", error));

    return res.json({ success: true, message: "Appointment rescheduled successfully." });
  } catch (error) {
    console.error("Unable to reschedule appointment:", error);
    return res.status(409).json({ success: false, message: error.message || "That slot is no longer available." });
  }
}

async function joinWaitlist(req, res) {
  const { doctorId, date, preferredTime } = req.body;
  if (!validDoctorId(doctorId) || !isBookableDate(date) || (preferredTime && !isTime(preferredTime))) {
    return res.status(400).json({ success: false, message: "Choose a valid doctor and future date." });
  }
  try {
    const doctor = await User.findOne({ _id: doctorId, role: "DOCTOR" }).select("_id");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
    const entry = await Waitlist.findOneAndUpdate(
      { patientId: req.user._id, doctorId, slotDate: date, status: "active" },
      { preferredTime: preferredTime || null },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json({ success: true, waitlistId: entry._id, message: "You are on the waitlist. We will email you if a slot opens." });
  } catch (error) {
    console.error("Unable to join waitlist:", error);
    return res.status(500).json({ success: false, message: "Unable to join the waitlist." });
  }
}

async function cancelWaitlist(req, res) {
  const entry = await Waitlist.findOneAndUpdate(
    { _id: req.params.id, patientId: req.user._id, status: { $in: ["active", "notified"] } },
    { status: "cancelled" },
    { new: true },
  );
  if (!entry) return res.status(404).json({ success: false, message: "Waitlist entry not found." });
  return res.json({ success: true, message: "You have left the waitlist." });
}

module.exports = {
  availabilityPage,
  cancelWaitlist,
  getPublicSlots,
  joinWaitlist,
  rescheduleAppointment,
  updateAvailability,
};
