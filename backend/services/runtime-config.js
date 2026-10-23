const PLACEHOLDER_MARKERS = ["replace", "example", "change-me", "your-secret", "test-secret"];

function configuredJwtSecret(env = process.env) {
  return env.JWT_SECRET || env.secret || "";
}

function isUsableProductionSecret(secret) {
  const value = String(secret || "").trim();
  const lower = value.toLowerCase();
  return value.length >= 32 && !PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function validationErrors(env = process.env) {
  const errors = require("./integrations").integrationErrors(env);
  errors.push(...require("./staging-safety").stagingSafetyErrors(env));
  if (env.NODE_ENV !== "production") return errors;
  if (!env.DATABASE_URL && !env.database_url) errors.push("DATABASE_URL is required in production.");
  if (!isUsableProductionSecret(configuredJwtSecret(env))) {
    errors.push("JWT_SECRET must be a non-placeholder secret of at least 32 characters in production.");
  }
  return errors;
}

function assertRuntimeConfig(env = process.env) {
  const errors = validationErrors(env);
  if (errors.length) throw new Error(`Invalid production configuration: ${errors.join(" ")}`);
}

module.exports = { assertRuntimeConfig, configuredJwtSecret, isUsableProductionSecret, validationErrors };
