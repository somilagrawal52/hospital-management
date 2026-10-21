const crypto = require("crypto");
const { integrationMode, requireLiveIntegration } = require("./integrations");

function configuredMeetingBaseUrl() {
  const rawUrl = process.env.VIDEO_MEETING_BASE_URL || "https://meet.jit.si";
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("VIDEO_MEETING_BASE_URL must use HTTPS");
  return url.toString().replace(/\/$/, "");
}

function createVideoSession() {
  if (integrationMode() === "disabled") requireLiveIntegration("Video");
  const roomName = `onelife-${crypto.randomBytes(18).toString("hex")}`;
  return {
    provider: "jitsi",
    roomName,
    joinUrl: integrationMode() === "mock" ? `${process.env.PUBLIC_BASE_URL || "https://video.invalid"}/testing/mock-video/${roomName}` : `${configuredMeetingBaseUrl()}/${roomName}`,
    status: "scheduled",
    acceptedAt: new Date(),
  };
}

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function createVideoCalendarEvent(appointment) {
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const description = `Online consultation with Dr. ${appointment.doctor}. Join securely: ${appointment.video.joinUrl}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OneLife//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:onelife-${appointment._id}@onelife.local`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(`Online consultation with Dr. ${appointment.doctor}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `URL:${appointment.video.joinUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

module.exports = { createVideoSession, createVideoCalendarEvent };
