const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const crypto = require("node:crypto");
const { configuredJwtSecret } = require("../services/runtime-config");
const developmentSecret = crypto.randomBytes(32).toString("hex");

function csrfCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-onelife-csrf" : "onelife-csrf";
}

function signature(nonce, session = "") {
  return crypto.createHmac("sha256", configuredJwtSecret() || developmentSecret)
    .update(JSON.stringify([nonce, session])).digest("hex");
}

function validCsrfToken(token, session = "") {
  if (typeof token !== "string" || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  const [nonce, received] = token.split(".");
  return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(signature(nonce, session), "hex"));
}

function csrfContext(req, res, next) {
  const session = req.cookies?.token || "";
  const cookieName = csrfCookieName();
  let token = req.cookies?.[cookieName];
  if (!validCsrfToken(token, session)) {
    const nonce = crypto.randomBytes(32).toString("hex");
    token = `${nonce}.${signature(nonce, session)}`;
    res.cookie(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 1000 });
  }
  res.locals.csrfToken = token;
  next();
}

function requestOrigin(req) {
  const source = req.get("origin") || req.get("referer");
  if (!source) return null;
  try {
    return new URL(source).origin;
  } catch {
    return null;
  }
}

function hasSameOrigin(req) {
  const origin = requestOrigin(req);
  return Boolean(origin && origin === `${req.protocol}://${req.get("host")}`);
}

function requireSameOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  const referer = req.get("referer");
  const foreignOrigin = origin && origin !== "null" && !hasSameOrigin(req);
  const foreignReferer = !origin && referer && !hasSameOrigin(req);
  if (foreignOrigin || foreignReferer || req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ success: false, message: "Cross-site request rejected." });
  }
  const token = req.get("x-csrf-token") || req.body?._csrf;
  const cookie = req.cookies?.[csrfCookieName()];
  // A matching origin alone is insufficient. The signed token is also bound to
  // the current authentication cookie, including before login (empty session).
  if (typeof token !== "string" || token !== cookie || !validCsrfToken(token, req.cookies?.token || "")) {
    return res.status(403).json({ success: false, message: "Your form session expired. Refresh the page and try again.", code: "CSRF_INVALID" });
  }
  return next();
}

module.exports = { hasSameOrigin, requireSameOrigin, requestOrigin, csrfContext, csrfCookieName, validCsrfToken };
