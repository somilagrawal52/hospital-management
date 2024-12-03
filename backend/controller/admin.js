const User = require("../models/user");
const path = require("path");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

async function adminlogin(req, res) {
  return res.sendFile(path.join(frontendPath, "pages-login.html"));
}

async function adminloginfromdb(req, res) {
  const { email, password } = req.body;
  try {
    const token = await User.matchpassword(email, password);
    console.log(token);
    return res.cookie("token", token).redirect("/admin");
  } catch (error) {
    console.error(error);
    return res.sendFile(path.join(frontendPath, "pages-login.html"));
  }
}

async function adminlogout(req, res) {
  res.clearCookie("token").redirect("/admin/login");
}

async function adminprofile(req, res) {
  return res.sendFile(path.join(frontendPath, "admin-profile.html"));
}

async function showallmsg(req, res) {
  return res.sendFile(path.join(frontendPath, "messages.html"));
}

module.exports = {
  adminlogin,
  adminloginfromdb,
  adminlogout,
  adminprofile,
  showallmsg,
};
