const crypto = require("node:crypto");

function applicationEnvironment(env = process.env) {
  return env.APP_ENV || (env.NODE_ENV === "production" ? "production" : "development");
}

function integrationMode(env = process.env) {
  return env.INTEGRATION_MODE || "live";
}

function isolatedIntegrations(env = process.env) {
  return integrationMode(env) !== "live";
}

function integrationErrors(env = process.env) {
  const errors = [];
  const appEnv = applicationEnvironment(env), mode = integrationMode(env);
  if (env.NODE_ENV === "production" && !["production", "staging"].includes(appEnv)) errors.push("NODE_ENV=production requires APP_ENV=production or staging.");
  if (!["production", "staging", "development", "test"].includes(appEnv)) errors.push("APP_ENV must be production, staging, development, or test.");
  if (!["live", "mock", "disabled"].includes(mode)) errors.push("INTEGRATION_MODE must be live, mock, or disabled.");
  if (appEnv === "staging" && (!env.INTEGRATION_MODE || mode === "live")) errors.push("Staging requires explicit mock or disabled integrations.");
  if (appEnv === "production" && mode !== "live") errors.push("Production cannot start with integrations mocked or disabled; use APP_ENV=staging for an isolated service.");
  if (appEnv === "staging") {
    for (const name of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "GEMINI_API_KEY", "OPENAI_API_KEY", "mail_user", "mail_pass"]) {
      if (env[name]) errors.push(`Remove ${name} from isolated staging.`);
    }
  }
  return errors;
}

function requireLiveIntegration(name) {
  if (isolatedIntegrations()) {
    const error = new Error(`${name} is unavailable while external integrations are isolated.`);
    error.code = "INTEGRATION_DISABLED";
    throw error;
  }
}

const mockPaymentSecret = crypto.randomBytes(48).toString("hex");
function paymentVerificationSecret() {
  if (integrationMode() === "mock") return mockPaymentSecret;
  if (integrationMode() === "disabled") return null;
  return process.env.RAZORPAY_KEY_SECRET;
}
function webhookVerificationSecret() {
  if (integrationMode() === "mock") return process.env.MOCK_WEBHOOK_SECRET || mockPaymentSecret;
  if (integrationMode() === "disabled") return null;
  return process.env.RAZORPAY_WEBHOOK_SECRET;
}

module.exports = { applicationEnvironment, integrationMode, isolatedIntegrations, integrationErrors, requireLiveIntegration, paymentVerificationSecret, webhookVerificationSecret };
