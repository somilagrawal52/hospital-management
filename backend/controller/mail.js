const nodemailer = require("nodemailer");
const { text } = require("express");

async function mailsender(obj) {
  console.log("we are inside of mailsender");
  let mailtransporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: 465,
    auth: {
      user: "somilagrawal2004@gmail.com",
      pass: "qwem kmgq cwgi ixsv",
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
