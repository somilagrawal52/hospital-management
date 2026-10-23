const test = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config = () => ({ parsed: {} });
const { validationErrors } = require("../services/runtime-config");
const { integrationMode, requireLiveIntegration, paymentVerificationSecret } = require("../services/integrations");

test("staging must explicitly isolate providers; production cannot silently disable them", () => {
  const base = { NODE_ENV: "production", DATABASE_URL: "mongodb://127.0.0.1/onelife_staging", JWT_SECRET: "a".repeat(48) };
  assert.equal(validationErrors(base).length, 0);
  assert.ok(validationErrors({ ...base, APP_ENV: "staging" }).length);
  assert.ok(validationErrors({ ...base, APP_ENV: "development", INTEGRATION_MODE: "mock" }).length);
  assert.ok(validationErrors({ ...base, INTEGRATION_MODE: "mock" }).length);
  assert.ok(validationErrors({ ...base, APP_ENV: "staging", INTEGRATION_MODE: "live" }).length);
  const staging = { ...base, APP_ENV: "staging", INTEGRATION_MODE: "mock", STAGING_MONGO_HOST: "127.0.0.1", STAGING_MONGO_DATABASE: "onelife_staging", STAGING_BASIC_AUTH_USER: "reviewer", STAGING_BASIC_AUTH_PASSWORD: "b".repeat(48) };
  assert.equal(validationErrors(staging).length, 0);
  assert.ok(validationErrors({ ...base, APP_ENV: "staging", INTEGRATION_MODE: "mock", RAZORPAY_KEY_SECRET: "synthetic-forbidden-credential" }).length);
});

test("mock and disabled provider boundaries never construct SDK clients or open sockets", async () => {
  const previous = process.env.INTEGRATION_MODE;
  const nodemailer = require("nodemailer"), https = require("node:https"), net = require("node:net");
  const transport = nodemailer.createTransport, request = https.request, connect = net.connect;
  let attempts = 0;
  const forbidden = () => { attempts += 1; throw new Error("Unexpected outbound provider construction/request"); };
  nodemailer.createTransport = forbidden; https.request = forbidden; net.connect = forbidden;
  try {
    const { mailsender, sendWhatsAppMessage } = require("../controller/mail");
    const { razorpayClient } = require("../services/razorpay-client");
    process.env.INTEGRATION_MODE = "mock";
    assert.equal((await mailsender({ to: "synthetic@example.test", text: "test" })).mocked, true);
    assert.match(await sendWhatsAppMessage("synthetic", "test"), /^mock-/);
    const order = await razorpayClient().orders.create({ amount: 50000, currency: "INR" });
    assert.match(order.id, /^mock_order_/); assert.equal(order.mocked, true);
    assert.ok(paymentVerificationSecret());
    process.env.INTEGRATION_MODE = "disabled";
    await assert.rejects(mailsender({}), { code: "INTEGRATION_DISABLED" });
    await assert.rejects(sendWhatsAppMessage("", ""), { code: "INTEGRATION_DISABLED" });
    assert.throws(() => razorpayClient(), { code: "PAYMENT_NOT_CONFIGURED" });
    assert.throws(() => requireLiveIntegration("AI"), { code: "INTEGRATION_DISABLED" });
    assert.equal(paymentVerificationSecret(), null);
    assert.equal(attempts, 0);
  } finally { nodemailer.createTransport = transport; https.request = request; net.connect = connect; if (previous === undefined) delete process.env.INTEGRATION_MODE; else process.env.INTEGRATION_MODE = previous; }
});
