require("dotenv").config();
const { integrationMode, requireLiveIntegration } = require("../services/integrations");

async function mailsender(obj,filePath) {
  if (integrationMode() === "mock") return { mocked: true, accepted: [], messageId: "mock-email-not-delivered" };
  requireLiveIntegration("Email");
  const nodemailer = require("nodemailer");
  let mailtransporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: process.env.mail_port,
    auth: {
      user: process.env.mail_user,
      pass: process.env.mail_pass,
    },
  });
  
  let mail = {
    from: process.env.MAIL_FROM || process.env.mail_user,
    to: obj.to,
    subject: obj.subject,
    text: obj.text,
    attachments: obj.attachments || (filePath ? [{ filename: "invoice.pdf", path: filePath, contentType: "application/pdf" }] : []),
  };
  return mailtransporter.sendMail(mail);
  
}

async function sendWhatsAppMessage(to, body) {
  if (integrationMode() === "mock") return "mock-whatsapp-not-delivered";
  requireLiveIntegration("WhatsApp");
  try {
    const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body,
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${to}`,
    });

    return message.sid;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

module.exports = {
  mailsender,
  sendWhatsAppMessage,
};
