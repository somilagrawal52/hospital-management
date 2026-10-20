const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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
  if (SAFE_METHODS.has(req.method) || hasSameOrigin(req)) return next();
  return res.status(403).json({ success: false, message: "Request origin could not be verified." });
}

module.exports = { hasSameOrigin, requireSameOrigin, requestOrigin };
