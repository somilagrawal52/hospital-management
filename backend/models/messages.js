const mongoose = require("mongoose");

const messageschema = new mongoose.Schema(
  {
    chatId: {
      type: Number,
      required: true,
    },
    senderId: {
      type: Number,
      required: true,
    },
    receiverId: {
      type: Number,
      required: true,
    },
    message:{
      type:String,
      required:true,
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("message", messageschema);
module.exports = Message;
