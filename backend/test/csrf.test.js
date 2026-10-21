const test = require("node:test");
const assert = require("node:assert/strict");
const { csrfContext, requireSameOrigin, csrfCookieName } = require("../middlewares/csrf-origin");

function issue(session = "") {
  const res = { locals: {}, cookie(name, value, options) { this.issued = { name, value, options }; } };
  csrfContext({ cookies: { token: session } }, res, () => {});
  return res;
}
function submit({ token, cookie = token, session = "", origin, referer, site, body = false, method = "POST" }) {
  const req = { method, protocol: "https", cookies: { [csrfCookieName()]: cookie, token: session }, body: body ? { _csrf: token } : {}, get(name) { return ({ host: "onelife.example", origin, referer, "sec-fetch-site": site, "x-csrf-token": body ? undefined : token })[name]; } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
  requireSameOrigin(req, res, () => { res.allowed = true; });
  return res;
}

test("signed CSRF tokens protect HTML form and JSON submissions, even without Referer", () => {
  const token = issue().locals.csrfToken;
  assert.equal(submit({ token, body: true, origin: "https://onelife.example" }).allowed, true);
  assert.equal(submit({ token }).allowed, true);
  assert.equal(submit({ token, origin: "null" }).allowed, true);
});
test("same-origin headers cannot substitute for missing or forged CSRF tokens", () => {
  assert.equal(submit({ origin: "https://onelife.example" }).statusCode, 403);
  assert.equal(submit({ token: "forged", origin: "https://onelife.example" }).statusCode, 403);
  const token = issue().locals.csrfToken;
  assert.equal(submit({ token, cookie: "different" }).statusCode, 403);
});
test("known foreign origins and Fetch Metadata are rejected even with a valid token", () => {
  const token = issue().locals.csrfToken;
  for (const headers of [{ origin: "https://attacker.example" }, { referer: "https://attacker.example/form" }, { origin: "https://onelife.example", site: "cross-site" }]) assert.equal(submit({ token, ...headers }).statusCode, 403);
});
test("CSRF tokens rotate across authentication sessions and support multipart headers", () => {
  const preLogin = issue().locals.csrfToken;
  assert.equal(submit({ token: preLogin, session: "signed-session-A" }).statusCode, 403);
  const token = issue("signed-session-A").locals.csrfToken;
  assert.equal(submit({ token, session: "signed-session-A" }).allowed, true);
  assert.equal(submit({ token, session: "signed-session-B" }).statusCode, 403);
});
test("production CSRF cookie is host-scoped, Secure, HttpOnly, and SameSite", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try { const { issued } = issue(); assert.equal(issued.name, "__Host-onelife-csrf"); assert.equal(issued.options.secure, true); assert.equal(issued.options.httpOnly, true); assert.equal(issued.options.sameSite, "lax"); assert.equal(issued.options.path, "/"); assert.equal(issued.options.domain, undefined); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
