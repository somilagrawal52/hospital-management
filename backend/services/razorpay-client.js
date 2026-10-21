const Razorpay = require("razorpay");
const crypto = require("node:crypto");
const { integrationMode } = require("./integrations");

function paymentConfigurationError() {
  const error = new Error("Razorpay is not configured.");
  error.code = "PAYMENT_NOT_CONFIGURED";
  return error;
}

function razorpayClient(env = process.env) {
  if (integrationMode(env) === "mock") return { orders: { create: async ({ amount, currency }) => {
    if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== "INR") throw new Error("Invalid mock order amount or currency.");
    return { id: `mock_order_${crypto.randomUUID()}`, amount, currency, status: "created", mocked: true };
  } } };
  if (integrationMode(env) === "disabled") {
    const error = new Error("Payments are disabled in this isolated environment.");
    error.code = "PAYMENT_NOT_CONFIGURED";
    throw error;
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw paymentConfigurationError();
  return new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
}

module.exports = { paymentConfigurationError, razorpayClient };
