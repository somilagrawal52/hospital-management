const jwt = require("jsonwebtoken");
const { configuredJwtSecret } = require("./runtime-config");
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 1000,
};

function createtokenforuser(user) {
  try {
    const secret = configuredJwtSecret();
    if (!secret) throw new Error("JWT_SECRET is not configured");
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
    const secret = configuredJwtSecret();
    if (!secret) throw new Error("JWT_SECRET is not configured");
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
  cookieOptions,
};
