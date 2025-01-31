require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");
const { text } = require("express");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

async function mailsender(obj,filePath) {
  console.log("we are inside of mailsender");
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
    from: "somilagrawal2004@gmail.com",
    to: obj.to,
    subject: obj.subject,
    text: obj.text,
    attachments: [
      {
        filename: "invoice", 
        path: filePath,     
        contentType: 'application/pdf',
      },
    ],
  };

  mailtransporter.sendMail(mail, function (err, info) {
    if (err) {
      console.error(err);
    }
    console.log("mail send:");
  });
  
}

async function sendWhatsAppMessage(to, body) {
  try {
    const message = await client.messages.create({
      body,
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${to}`,
    });

    console.log("WhatsApp message sent successfully:");
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

module.exports = {
  mailsender,
  sendWhatsAppMessage,
};
