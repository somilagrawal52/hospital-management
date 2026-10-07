const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const User = require("../models/user");
const { mailsender } = require("../controller/mail");

function formatAppointmentDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

async function createInvoice(appointment) {
  const invoiceDir = path.join(__dirname, "..", "invoices");
  fs.mkdirSync(invoiceDir, { recursive: true });
  const invoiceName = `invoice-${appointment._id}.pdf`;
  const filePath = path.join(invoiceDir, invoiceName);

  await new Promise((resolve, reject) => {
    const document = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    stream.on("finish", resolve).on("error", reject);
    document.pipe(stream);
    document.fontSize(20).text("OneLife appointment invoice");
    document.moveDown().fontSize(12);
    document.text(`Invoice ID: ${appointment.payment.orderId}`);
    document.text(`Patient: ${appointment.fullname}`);
    document.text(`Doctor: Dr. ${appointment.doctor}`);
    document.text(`Appointment: ${formatAppointmentDate(appointment.date)}`);
    document.text(`Amount paid: Rs. ${appointment.amount}`);
    document.end();
  });

  appointment.invoiceFile = invoiceName;
  return filePath;
}

async function sendConfirmation(appointment, invoicePath) {
  if (appointment.payment.confirmationSentAt) return;
  const doctor = await User.findById(appointment.doctorId || appointment.docId).select("email fullname");
  const attachments = invoicePath ? [{ path: invoicePath, contentType: "application/pdf" }] : [];
  await Promise.allSettled([
    mailsender({
      to: appointment.email,
      subject: "Appointment confirmed",
      text: `Your appointment with Dr. ${appointment.doctor} is confirmed for ${formatAppointmentDate(appointment.date)}.`,
      attachments,
    }),
    doctor?.email && mailsender({
      to: doctor.email,
      subject: "New confirmed appointment",
      text: `${appointment.fullname} has a confirmed appointment on ${formatAppointmentDate(appointment.date)}.`,
      attachments,
    }),
  ]);
  appointment.payment.confirmationSentAt = new Date();
}

async function finalizePayment(appointment, { paymentId, source }) {
  if (paymentId) appointment.payment.paymentId = paymentId;
  appointment.payment.status = "success";
  appointment.payment.reconciledAt = new Date();
  appointment.status = "confirmed";
  appointment.cancelled = false;
  appointment.iscompleted = false;

  const alreadyRecorded = appointment.statusHistory?.some(
    (item) => item.status === "confirmed" && item.source === source,
  );
  if (!alreadyRecorded) {
    appointment.statusHistory.push({ status: "confirmed", source });
  }

  let invoicePath = null;
  if (!appointment.invoiceFile) invoicePath = await createInvoice(appointment);
  else invoicePath = path.join(__dirname, "..", "invoices", appointment.invoiceFile);

  await sendConfirmation(appointment, invoicePath);
  await appointment.save();
  return appointment;
}

module.exports = { finalizePayment, formatAppointmentDate };
