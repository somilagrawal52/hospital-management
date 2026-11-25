const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const User = require("../models/user");
const { mailsender } = require("../controller/mail");
const { createVideoSession } = require("./video-session");
const { assignQueueTokenForAppointment } = require("./opd-queue");

function formatAppointmentDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function buildInvoicePdfBuffer(appointment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const amount = Number(appointment.amount || appointment.payment?.amount || 0);
    const invoiceNum = `INV-${String(appointment._id).slice(-8).toUpperCase()}`;

    // Header
    doc.rect(45, 45, 505, 64).fill("#1e1b4b");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(17).text("OneLife Hospital & Telehealth Suite", 60, 58);
    doc.font("Helvetica").fontSize(9).fillColor("#c7d2fe").text("TAX RECEIPT / CLINICAL CONSULTATION INVOICE (SAC 999312)", 60, 81);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10.5).text(invoiceNum, 390, 62, { width: 145, align: "right" });
    doc.font("Helvetica").fontSize(8.5).fillColor("#c7d2fe").text("Status: PAID", 390, 79, { width: 145, align: "right" });

    let y = 132;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("BILL TO (PATIENT)", 45, y);
    doc.text("CONSULTATION DETAILS", 300, y);
    y += 16;

    doc.font("Helvetica").fontSize(9.5).fillColor("#334155");
    doc.text(appointment.patientMember?.fullname || appointment.fullname || "Patient", 45, y);
    doc.text(`Clinician: Dr. ${appointment.doctor}`, 300, y);
    y += 14;
    doc.text(`Account: ${appointment.fullname} (${appointment.email})`, 45, y);
    doc.text(`Mode: ${appointment.visitMode === "telehealth" || appointment.isOnline ? "HD Telehealth Video" : appointment.visitMode === "walk_in" ? "OPD Walk-In" : "In-Clinic OPD Visit"}`, 300, y);
    y += 14;
    doc.text(`Phone: ${appointment.number || "—"}`, 45, y);
    doc.text(`Schedule: ${formatAppointmentDate(appointment.date)}`, 300, y);
    y += 14;
    if (appointment.queueToken) {
      doc.text(`OPD Token: #${appointment.queueToken}`, 300, y);
    }
    doc.text(`Address: ${appointment.address?.line1 || ""}, ${appointment.address?.line2 || ""}`, 45, y, { width: 235 });
    y = Math.max(doc.y + 20, y + 28);

    // Table Header
    doc.rect(45, y, 505, 22).fill("#f1f5f9");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
    doc.text("SERVICE DESCRIPTION", 55, y + 6, { width: 250 });
    doc.text("SAC", 310, y + 6, { width: 65 });
    doc.text("GST", 385, y + 6, { width: 60 });
    doc.text("AMOUNT (INR)", 450, y + 6, { width: 90, align: "right" });
    y += 28;

    doc.fillColor("#1e293b").font("Helvetica").fontSize(9.5);
    doc.text(`Medical Specialist Consultation — Dr. ${appointment.doctor}`, 55, y, { width: 245 });
    doc.text("999312", 310, y, { width: 65 });
    doc.text("Exempt (0%)", 385, y, { width: 60 });
    doc.font("Helvetica-Bold").text(`Rs. ${amount.toFixed(2)}`, 450, y, { width: 90, align: "right" });
    y += 28;

    doc.moveTo(45, y).lineTo(550, y).strokeColor("#cbd5e1").lineWidth(0.75).stroke();
    y += 12;

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("Total Paid", 320, y);
    doc.text(`Rs. ${amount.toFixed(2)}`, 450, y, { width: 90, align: "right" });
    y += 24;

    doc.fillColor("#475569").font("Helvetica").fontSize(8.5);
    doc.text(`Razorpay Order ID: ${appointment.payment?.orderId || "—"}`, 45, y);
    y += 12;
    doc.text(`Razorpay Payment ID: ${appointment.payment?.paymentId || "Reconciled"}`, 45, y);
    y += 12;
    doc.text(`Note: Clinical healthcare services under SAC 999312 are GST-exempt per Indian GST Notification No. 12/2017-Central Tax (Rate).`, 45, y + 6, { width: 505 });

    doc.end();
  });
}

async function createInvoice(appointment) {
  const invoiceDir = path.join(__dirname, "..", "invoices");
  fs.mkdirSync(invoiceDir, { recursive: true });
  const invoiceName = `invoice-${appointment._id}.pdf`;
  const filePath = path.join(invoiceDir, invoiceName);
  const buffer = await buildInvoicePdfBuffer(appointment);
  await fs.promises.writeFile(filePath, buffer);
  appointment.invoiceFile = invoiceName;
  return filePath;
}

async function ensureInvoicePdf(appointment) {
  const invoiceDir = path.join(__dirname, "..", "invoices");
  const invoiceName = appointment.invoiceFile || `invoice-${appointment._id}.pdf`;
  const filePath = path.join(invoiceDir, invoiceName);
  if (fs.existsSync(filePath)) return filePath;
  return createInvoice(appointment);
}

async function sendConfirmation(appointment, invoicePath) {
  if (appointment.payment.confirmationSentAt) return;
  const doctor = await User.findById(appointment.doctorId || appointment.docId).select("email fullname");
  const attachments = invoicePath ? [{ path: invoicePath, contentType: "application/pdf" }] : [];
  const tokenLine = appointment.queueToken ? ` Your OPD queue token is #${appointment.queueToken}.` : "";
  await Promise.allSettled([
    mailsender({
      to: appointment.email,
      subject: "Appointment confirmed",
      text: `Your appointment with Dr. ${appointment.doctor} is confirmed for ${formatAppointmentDate(appointment.date)}.${tokenLine}`,
      attachments,
    }),
    doctor?.email && mailsender({
      to: doctor.email,
      subject: "New confirmed appointment",
      text: `${appointment.patientMember?.fullname || appointment.fullname} has a confirmed appointment on ${formatAppointmentDate(appointment.date)}.${tokenLine}`,
      attachments,
    }),
  ]);
  appointment.payment.confirmationSentAt = new Date();
}

async function finalizePayment(appointment, { paymentId, source }) {
  if (paymentId) appointment.payment.paymentId = paymentId;
  appointment.payment.status = "success";
  appointment.payment.reconciledAt = new Date();
  appointment.paymentHoldExpiresAt = undefined;
  appointment.status = "confirmed";
  appointment.cancelled = false;
  appointment.iscompleted = false;

  if ((appointment.visitMode === "telehealth" || appointment.isOnline) && (!appointment.video || appointment.video.status === "not_requested" || appointment.video.status === "requested")) {
    appointment.isOnline = true;
    appointment.visitMode = "telehealth";
    try {
      appointment.video = { ...appointment.video?.toObject?.(), ...createVideoSession() };
    } catch {
      // Video remains unscheduled in disabled integration environments.
    }
  }

  await assignQueueTokenForAppointment(appointment);

  const alreadyRecorded = appointment.statusHistory?.some(
    (item) => item.status === "confirmed" && item.source === source,
  );
  if (!alreadyRecorded) {
    appointment.statusHistory.push({ status: "confirmed", source });
  }

  const invoicePath = await createInvoice(appointment);
  await sendConfirmation(appointment, invoicePath);
  await appointment.save();
  return appointment;
}

module.exports = {
  buildInvoicePdfBuffer,
  createInvoice,
  ensureInvoicePdf,
  finalizePayment,
  formatAppointmentDate,
};
