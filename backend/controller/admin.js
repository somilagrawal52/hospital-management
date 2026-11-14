const User = require("../models/user");
const Message = require("../models/messages");
const SupportThread = require("../models/support-thread");
const mongoose = require("mongoose");
const path = require("path");
const { cookieOptions } = require("../services/auth");

const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");

async function adminlogin(req, res) {
  return res.render("admin-login", { email: "", error: "" });
}

async function adminloginfromdb(req, res) {
  const { email, password } = req.body;
  try {
    const admin = await User.findOne({ email: email.toLowerCase(), role: "ADMIN" });
    if (!admin) throw new Error("incorrect credentials");
    const token = await User.matchpassword(email, password);
    return res.cookie("token", token, cookieOptions).redirect("/admin");
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
    const [threads, admins, legacyMessages] = await Promise.all([
      SupportThread.find({}).populate("patientId", "fullname email").populate("assignedTo", "fullname email").sort({ lastMessageAt: -1 }).lean(),
      User.find({ role: "ADMIN" }).select("fullname email").lean(),
      // Keep messages created before threaded support was introduced visible to admins.
      Message.find({}).sort({ createdAt: -1 }).lean(),
    ]);
    return res.render("admin-messages", { threads, admins, legacyMessages });
  } catch (error) {
    console.error("Error loading admin messages:", error);
    return res.status(500).send("Server error");
  }
}

async function updateSupportThread(req, res) {
  try {
    const thread = await SupportThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: "Support thread not found." });
    const { status, priority, assignedTo, reply } = req.body;
    if (["open", "in_progress", "resolved"].includes(status)) {
      thread.status = status;
      thread.resolvedAt = status === "resolved" ? new Date() : undefined;
    }
    if (["normal", "high", "urgent"].includes(priority)) thread.priority = priority;
    if (assignedTo === "") thread.assignedTo = null;
    else if (assignedTo && mongoose.isValidObjectId(assignedTo)) thread.assignedTo = assignedTo;
    if (String(reply || "").trim()) {
      thread.messages.push({ senderId: req.user._id, senderRole: "ADMIN", body: reply.trim() });
      thread.firstResponseAt ||= new Date();
      thread.status = status === "resolved" ? "resolved" : "in_progress";
      thread.lastMessageAt = new Date();
    }
    await thread.save();
    return res.redirect("/showmsg");
  } catch (error) {
    console.error("Error updating support thread:", error);
    return res.status(500).json({ success: false, message: "Unable to update support thread." });
  }
}

module.exports = {
  adminlogin,
  adminloginfromdb,
  adminlogout,
  adminprofile,
  showallmsg,
  updateSupportThread,
};
