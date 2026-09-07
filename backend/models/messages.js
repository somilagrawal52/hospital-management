const mongoose = require("mongoose");

const messageschema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    fullname: { type: String, required: true, trim: true, maxlength: 100 },
    question: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true }
);

const Message = mongoose.model("message", messageschema);
module.exports = Message;
