const jwt = require("jsonwebtoken");
const secret = process.env.secret;

function createtokenforuser(user) {
  try {
    const payload = {
      _id: user._id,
      email: user.email,
      role: user.role,
    };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' }); 
    return token;
  } catch (error) {
    console.error("Error creating token:", error);
    throw new Error("Token creation failed");
  }
}

function validatetoken(token) {
  try {
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (error) {
    console.error("Error validating token:", error.message);
    throw new Error("Token validation failed");
  }
}

module.exports = {
  createtokenforuser,
  validatetoken,
};
