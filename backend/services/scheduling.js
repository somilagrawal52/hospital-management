const Appointment = require("../models/appointment");

const ACTIVE_SLOT_STATUSES = ["payment_pending", "pending", "confirmed", "online_requested", "created"];
const INDIA_TIME_ZONE = "Asia/Kolkata";
const DEFAULT_WEEKLY_SCHEDULE = [
  { day: 0, enabled: false, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
  { day: 1, enabled: true, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
  { day: 2, enabled: true, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
  { day: 3, enabled: true, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
  { day: 4, enabled: true, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
  { day: 5, enabled: true, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
  { day: 6, enabled: true, startTime: "09:00", endTime: "17:00", slotMinutes: 30 },
];

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00+05:30`);
  return !Number.isNaN(parsed.getTime()) && localDateKey(parsed) === value;
}

function isTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ""))) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function localDateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function dateTimeForSlot(dateKey, time) {
  if (!isDateKey(dateKey) || !isTime(time)) throw new Error("Choose a valid date and time.");
  return new Date(`${dateKey}T${time}:00+05:30`);
}

function dayBounds(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function weekdayForDate(dateKey) {
  return new Date(`${dateKey}T12:00:00+05:30`).getUTCDay();
}

function normaliseRule(rule, fallback) {
  const startTime = rule?.startTime || fallback.startTime;
  const endTime = rule?.endTime || fallback.endTime;
  const slotMinutes = Number(rule?.slotMinutes || fallback.slotMinutes);
  if (!isTime(startTime) || !isTime(endTime) || timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new Error("Availability must have a valid start and end time.");
  }
  if (!Number.isInteger(slotMinutes) || slotMinutes < 10 || slotMinutes > 120) {
    throw new Error("Slot duration must be between 10 and 120 minutes.");
  }
  return { startTime, endTime, slotMinutes };
}

function availabilityForDate(doctor, dateKey) {
  if (!isDateKey(dateKey)) throw new Error("Choose a valid date.");
  const availability = doctor.availability || {};
  const exception = (availability.exceptions || []).find((item) => item.date === dateKey);
  if (exception?.unavailable) return { enabled: false };

  const day = weekdayForDate(dateKey);
  const fallback = DEFAULT_WEEKLY_SCHEDULE.find((item) => item.day === day);
  const weeklyRule = (availability.weekly || []).find((item) => Number(item.day) === day);
  if (weeklyRule && weeklyRule.enabled === false) return { enabled: false };
  const rule = exception || weeklyRule || fallback;
  if (!rule || rule.enabled === false) return { enabled: false };
  return { enabled: true, ...normaliseRule(rule, fallback) };
}

function serialiseAvailability(doctor) {
  const availability = doctor.availability || {};
  return {
    weekly: DEFAULT_WEEKLY_SCHEDULE.map((fallback) => {
      const saved = (availability.weekly || []).find((item) => Number(item.day) === fallback.day);
      return { ...fallback, ...(saved?.toObject ? saved.toObject() : saved || {}) };
    }),
    exceptions: (availability.exceptions || []).map((item) => (item.toObject ? item.toObject() : item)),
  };
}

function normaliseAvailability(input = {}) {
  const weeklyByDay = new Map();
  for (const rule of input.weekly || []) {
    const day = Number(rule.day);
    if (!Number.isInteger(day) || day < 0 || day > 6 || weeklyByDay.has(day)) throw new Error("Weekly availability contains an invalid day.");
    const fallback = DEFAULT_WEEKLY_SCHEDULE.find((item) => item.day === day);
    const enabled = Boolean(rule.enabled);
    weeklyByDay.set(day, enabled ? { day, enabled, ...normaliseRule(rule, fallback) } : { day, enabled: false, ...fallback });
  }

  const dates = new Set();
  const exceptions = (input.exceptions || []).map((exception) => {
    if (!isDateKey(exception.date) || dates.has(exception.date)) throw new Error("Availability exceptions require unique valid dates.");
    dates.add(exception.date);
    if (exception.unavailable) return { date: exception.date, unavailable: true };
    const fallback = DEFAULT_WEEKLY_SCHEDULE.find((item) => item.day === weekdayForDate(exception.date));
    return { date: exception.date, unavailable: false, ...normaliseRule(exception, fallback) };
  });

  return { weekly: [...weeklyByDay.values()].sort((a, b) => a.day - b.day), exceptions };
}

async function availableSlotsForDoctor(doctor, dateKey, { excludeAppointmentId } = {}) {
  if (!doctor?.available) return [];
  const rule = availabilityForDate(doctor, dateKey);
  if (!rule.enabled) return [];

  const { start, end } = dayBounds(dateKey);
  const query = {
    docId: String(doctor._id),
    date: { $gte: start, $lt: end },
    status: { $in: ACTIVE_SLOT_STATUSES },
  };
  if (excludeAppointmentId) query._id = { $ne: excludeAppointmentId };
  const appointments = await Appointment.find(query).select("date").lean();
  const bookedTimes = new Set(appointments.map((appointment) => new Date(appointment.date).getTime()));
  const now = Date.now();
  const slots = [];
  for (let minute = timeToMinutes(rule.startTime); minute + rule.slotMinutes <= timeToMinutes(rule.endTime); minute += rule.slotMinutes) {
    const time = minutesToTime(minute);
    const startsAt = dateTimeForSlot(dateKey, time);
    if (startsAt.getTime() > now && !bookedTimes.has(startsAt.getTime())) {
      slots.push({ time, startsAt: startsAt.toISOString() });
    }
  }
  return slots;
}

async function assertSlotAvailable(doctor, dateKey, time, options) {
  const slots = await availableSlotsForDoctor(doctor, dateKey, options);
  if (!slots.some((slot) => slot.time === time)) throw new Error("This appointment slot is no longer available.");
  return dateTimeForSlot(dateKey, time);
}

module.exports = {
  ACTIVE_SLOT_STATUSES,
  availabilityForDate,
  assertSlotAvailable,
  availableSlotsForDoctor,
  dateTimeForSlot,
  isDateKey,
  isTime,
  localDateKey,
  normaliseAvailability,
  serialiseAvailability,
};
