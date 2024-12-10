require("dotenv").config();
const nodemailer = require("nodemailer");
const { text } = require("express");
async function mailsender(obj) {
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
  };

  mailtransporter.sendMail(mail, function (err, info) {
    if (err) {
      console.error(err);
    }
    console.log("mail send:");
  });
}

module.exports = {
  mailsender,
};
