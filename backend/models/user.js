const mongoose = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
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
    },
    gender: {
      type: String,
    },
    number: {
      type: Number,
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
    salt: {
      type: String,
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
  },
  {minimize:false}
);

userschema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  const salt = randomBytes(16).toString("hex");
  const hashedpassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  this.salt = salt;
  this.password = hashedpassword;

  next();
});

userschema.statics.matchpassword= async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("user not found");

  const salt = user.salt;
  const hashedpassword = user.password;

  const providedhash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  console.log("Provided Hash:", providedhash);

  if (hashedpassword !== providedhash) throw new Error("incorrect password");
  const token = createtokenforuser(user);
  console.log("Created Token:", token);
  return token;
};
const User = mongoose.model("user", userschema);
module.exports = User;
