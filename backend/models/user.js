const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createHmac } = require("crypto");
const { createtokenforuser } = require("../services/auth");
const { type } = require("os");

const userschema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    gender: {
      type: String,
    },
    number: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    dob:{
      type:String,
    },
    address:{
      type:Object,
      default:{line1:'',line2:''}
    },
    image: {
      type: String,
    },
    speciality: {
      type: String,
    },
    degree:{
      type:String,
    },
    experience:{
      type:String,
    },
    about:{
      type:String,
    },
    available:{
      type:Boolean,
      default:true
    },
    fees:{
      type:Number,
    },
    date:{
      type:Number,
    },
    role: {
      type: String,
      required: true,
      default: "NORMAL",
    },
    password: {
      type: String,
      required: true,
    },
    // Retained temporarily so existing SHA-256 accounts can be upgraded on login.
    salt: { type: String },
  },
  {minimize:false}
);

userschema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(user.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

userschema.statics.matchpassword= async function (email, password) {
  const user = await this.findOne({ email: String(email).toLowerCase() });
  if (!user) throw new Error("user not found");

  let isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch && user.salt) {
    const legacyHash = createHmac("sha256", user.salt).update(password).digest("hex");
    isMatch = legacyHash === user.password;
    if (isMatch) {
      user.password = password;
      user.salt = undefined;
      await user.save();
    }
  }
  if (!isMatch) throw new Error("incorrect password");
  const token = createtokenforuser(user);
  return token;
};
const User = mongoose.model("user", userschema);
module.exports = User;
