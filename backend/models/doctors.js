const mongoose = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
const { createtokenforuser } = require("../services/auth");
const { type } = require("os");

const doctorschema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    salt: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

doctorschema.pre("save", function (next) {
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

doctorschema.static("matchpassword", async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("user not found");

  const salt = user.salt;
  const hashedpassword = user.password;

  console.log("Salt:", salt);
  console.log("Hashed Password:", hashedpassword);

  const providedhash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  console.log("Provided Hash:", providedhash);

  if (hashedpassword !== providedhash) throw new Error("incorrect password");
  const token = createtokenforuser(user);
  console.log("Created Token:", token);
  return token;
});
const Doctor = mongoose.model("doctor", doctorschema);
module.exports = Doctor;
