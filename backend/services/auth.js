const jwt = require("jsonwebtoken");
const secret = process.env.secret;

function createtokenforuser(user) {
  const payload = {
    _id: user._id,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(payload, secret,{expiresIn: "1h"});
  return token;
}

function validatetoken(token) {
  const payload = jwt.verify(token, secret);
  return payload;
}

module.exports = {
  createtokenforuser,
  validatetoken,
};
