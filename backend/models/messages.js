const mongoose = require("mongoose");

const messageschema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    msgbody: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("message", messageschema);
module.exports = Message;
