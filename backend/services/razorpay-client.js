const Razorpay = require("razorpay");

function paymentConfigurationError() {
  const error = new Error("Razorpay is not configured.");
  error.code = "PAYMENT_NOT_CONFIGURED";
  return error;
}

function razorpayClient(env = process.env) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw paymentConfigurationError();
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
}

module.exports = { paymentConfigurationError, razorpayClient };
