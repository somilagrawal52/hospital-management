const Appointment = require("../models/appointment");
const Prescription = require("../models/prescription");
const { mailsender } = require("../controller/mail");
const { integrationMode } = require("./integrations");
const { localDateKey } = require("./scheduling");
const { formatAppointmentDate } = require("./payment-finalization");

function classifyDueWindow(appointmentDate, now = new Date()) {
  const diffMs = new Date(appointmentDate).getTime() - now.getTime();
  if (diffMs <= 0) return null;
  if (diffMs <= 2.5 * 60 * 60 * 1000) return "2h";
  if (diffMs <= 24.5 * 60 * 60 * 1000) return "24h";
  return null;
}

async function dispatchDueReminders({ now = new Date() } = {}) {
  if (integrationMode() === "disabled") {
    return { reminders24h: 0, reminders2h: 0, followUps: 0, skipped: "disabled" };
  }

  const horizon24h = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
  const horizon2h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
  const todayKey = localDateKey(now);

  const [dueAppointments, dueFollowUps] = await Promise.all([
    Appointment.find({
      status: { $in: ["confirmed", "online_requested"] },
      date: { $gt: now, $lte: horizon24h },
      $or: [
        { reminder24hSentAt: { $exists: false } },
        { reminder2hSentAt: { $exists: false }, date: { $lte: horizon2h } },
      ],
    })
      .select("_id fullname email doctor date visitMode isOnline queueToken reminder24hSentAt reminder2hSentAt")
      .limit(100),
    Prescription.find({
      followUpDate: todayKey,
      followUpReminderSentAt: { $exists: false },
    })
      .select("_id appointmentId patientName doctorName diagnosis followUpDate")
      .limit(100),
  ]);

  let reminders24h = 0;
  let reminders2h = 0;
  let followUps = 0;

  for (const appt of dueAppointments) {
    if (!appt.email) continue;
    const isSoon = new Date(appt.date).getTime() <= horizon2h.getTime();
    if (isSoon && !appt.reminder2hSentAt) {
      await mailsender({
        to: appt.email,
        subject: `Reminder: Appointment with Dr. ${appt.doctor} in under 2 hours`,
        text: `Hello ${appt.fullname}, your ${appt.isOnline || appt.visitMode === "telehealth" ? "HD Telehealth" : "In-Clinic OPD"} visit with Dr. ${appt.doctor} is scheduled for ${formatAppointmentDate(appt.date)}.${appt.queueToken ? ` OPD Token: #${appt.queueToken}.` : ""}`,
      }).catch(() => {});
      appt.reminder2hSentAt = now;
      if (!appt.reminder24hSentAt) appt.reminder24hSentAt = now;
      await appt.save();
      reminders2h += 1;
    } else if (!appt.reminder24hSentAt) {
      await mailsender({
        to: appt.email,
        subject: `Appointment Tomorrow with Dr. ${appt.doctor}`,
        text: `Hello ${appt.fullname}, this is a friendly reminder for your consultation with Dr. ${appt.doctor} on ${formatAppointmentDate(appt.date)}.${appt.queueToken ? ` OPD Token: #${appt.queueToken}.` : ""}`,
      }).catch(() => {});
      appt.reminder24hSentAt = now;
      await appt.save();
      reminders24h += 1;
    }
  }

  for (const rx of dueFollowUps) {
    const appt = await Appointment.findById(rx.appointmentId).select("email").lean();
    if (!appt?.email) continue;
    await mailsender({
      to: appt.email,
      subject: `Follow-Up Recommended Today with Dr. ${rx.doctorName}`,
      text: `Hello ${rx.patientName}, Dr. ${rx.doctorName} recommended a follow-up visit today (${rx.followUpDate}) regarding ${rx.diagnosis}. Sign in to OneLife to reserve a convenient slot.`,
    }).catch(() => {});
    rx.followUpReminderSentAt = now;
    await rx.save();
    followUps += 1;
  }

  return { reminders24h, reminders2h, followUps };
}

module.exports = {
  classifyDueWindow,
  dispatchDueReminders,
};
