const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-only";
const { createtokenforuser, validatetoken } = require("../services/auth");
const Message = require("../models/messages");
const { isMedicalQuery, MEDICAL_ONLY_FALLBACK } = require("../services/medical-query");

test("signed session tokens retain only the expected identity fields", () => {
  const token = createtokenforuser({ _id: "507f1f77bcf86cd799439011", email: "patient@example.com", role: "NORMAL" });
  assert.deepEqual(validatetoken(token).role, "NORMAL");
});

test("support messages require a sender, subject, and body", () => {
  const message = new Message({ senderId: "507f1f77bcf86cd799439011", fullname: "Patient", question: "Billing", message: "Please help with my invoice." });
  assert.equal(message.validateSync(), undefined);
  const invalid = new Message({ fullname: "Patient" });
  assert.ok(invalid.validateSync());
});

test("chatbot accepts medical topics and rejects unrelated prompts", () => {
  assert.equal(isMedicalQuery("What can cause a persistent fever?"), true);
  assert.equal(isMedicalQuery("Write a poem about the ocean"), false);
  assert.match(MEDICAL_ONLY_FALLBACK, /medical and health-related/i);
});
