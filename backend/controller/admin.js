const User = require("../models/user");
const Message = require("../models/messages");
const path = require("path");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

async function adminlogin(req, res) {
  return res.render("admin-login", { email: "", error: "" });
}

async function adminloginfromdb(req, res) {
  const { email, password } = req.body;
  try {
    const token = await User.matchpassword(email, password);
    console.log(token);
    return res.cookie("token", token).redirect("/admin");
  } catch (error) {
    console.error(error);
    return res.status(401).render("admin-login", {
      email,
      error: "Incorrect email or password. Please try again.",
    });
  }
}

async function adminlogout(req, res) {
  res.clearCookie("token").redirect("/admin/login");
}

async function adminprofile(req, res) {
  try {
    const admin = await User.findById(req.user._id).select("-password").lean();
    return res.render("admin-profile", { admin });
  } catch (error) {
    console.error("Error loading admin profile:", error);
    return res.status(500).send("Server error");
  }
}

async function showallmsg(req, res) {
  try {
    const messages = await Message.find({}).sort({ createdAt: -1 }).lean();
    return res.render("admin-messages", { messages });
  } catch (error) {
    console.error("Error loading admin messages:", error);
    return res.status(500).send("Server error");
  }
}

module.exports = {
  adminlogin,
  adminloginfromdb,
  adminlogout,
  adminprofile,
  showallmsg,
};
