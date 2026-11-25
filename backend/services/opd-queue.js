const Appointment = require("../models/appointment");
const { localDateKey } = require("./scheduling");

const DEFAULT_AVG_CONSULT_MINUTES = 12;

/**
 * Assigns a sequential OPD queue token for a doctor on a given slotDate.
 * Unifies online clinic bookings, telehealth visits, and reception walk-ins into one queue.
 */
async function assignQueueTokenForAppointment(appointment) {
  if (!appointment) return null;
  if (Number.isInteger(appointment.queueToken) && appointment.queueToken > 0) {
    return appointment.queueToken;
  }
  const slotDate = appointment.slotDate || localDateKey(appointment.date || new Date());
  appointment.slotDate = slotDate;
  const docId = String(appointment.doctorId || appointment.docId);

  const highest = await Appointment.findOne({
    docId,
    slotDate,
    queueToken: { $gte: 1 },
  })
    .sort({ queueToken: -1 })
    .select("queueToken")
    .lean();

  const nextToken = (highest?.queueToken || 0) + 1;
  appointment.queueToken = nextToken;
  if (!appointment.queueState) appointment.queueState = "waiting";
  return nextToken;
}

/**
 * Computes real-time wait estimate and position for a patient appointment on its visit day.
 */
function buildQueueEstimate({ appointment, doctorQueueStatus = null, activeDayAppointments = [], avgMinutes = DEFAULT_AVG_CONSULT_MINUTES }) {
  const token = Number(appointment?.queueToken || 0);
  if (!token) return null;

  const today = localDateKey(new Date());
  const slotDate = appointment.slotDate || localDateKey(appointment.date);
  const statusActiveToday = doctorQueueStatus && doctorQueueStatus.date === slotDate ? doctorQueueStatus : null;
  const delayMinutes = Number(statusActiveToday?.delayMinutes || 0);
  const delayReason = statusActiveToday?.delayReason || "";

  const inProgressRow = activeDayAppointments.find((row) => row.queueState === "in_consultation" || row.queueState === "called");
  const maxCompletedToken = activeDayAppointments
    .filter((row) => row.status === "completed" || row.queueState === "completed")
    .reduce((max, row) => Math.max(max, Number(row.queueToken || 0)), 0);

  const currentToken = Math.max(
    Number(statusActiveToday?.currentToken || 0),
    Number(inProgressRow?.queueToken || 0),
    maxCompletedToken,
  );

  const aheadCount = activeDayAppointments.filter((row) => {
    const rowToken = Number(row.queueToken || 0);
    if (!rowToken || rowToken >= token) return false;
    if (["cancelled", "payment_failed", "completed"].includes(row.status)) return false;
    if (["completed", "no_show"].includes(row.queueState)) return false;
    return true;
  }).length;

  const estimatedWaitMinutes = slotDate === today
    ? Math.max(0, aheadCount * avgMinutes + (appointment.queueState === "in_consultation" || appointment.queueState === "called" ? 0 : delayMinutes))
    : delayMinutes;

  const scheduledTime = appointment.date ? new Date(appointment.date) : null;
  const adjustedEta = scheduledTime && delayMinutes > 0
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000))
    : null;

  return {
    token,
    isToday: slotDate === today,
    currentToken,
    aheadCount,
    delayMinutes,
    delayReason,
    estimatedWaitMinutes,
    adjustedEta,
    queueState: appointment.queueState || "waiting",
  };
}

module.exports = {
  DEFAULT_AVG_CONSULT_MINUTES,
  assignQueueTokenForAppointment,
  buildQueueEstimate,
};
