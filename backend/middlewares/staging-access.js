const crypto = require('node:crypto');

function matches(received, expected) {
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(received).digest(), crypto.createHash('sha256').update(expected).digest());
}

function stagingAccess(env = process.env) {
  return (req, res, next) => {
    if (env.APP_ENV !== 'staging') return next();
    res.set('Cache-Control', 'no-store');
    // Render must be able to probe liveness without receiving private data.
    if (['GET', 'HEAD'].includes(req.method) && req.path === '/health') return next();
    if (!req.secure) return res.status(426).type('text/plain').send('Use HTTPS for staging access.');
    const header = req.get('authorization') || '';
    const match = header.length <= 4096 && /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
    if (match && env.STAGING_BASIC_AUTH_USER && env.STAGING_BASIC_AUTH_PASSWORD) {
      const decoded = Buffer.from(match[1], 'base64').toString('utf8'), split = decoded.indexOf(':');
      if (split >= 0) {
        const validUser = matches(decoded.slice(0, split), env.STAGING_BASIC_AUTH_USER);
        const validPassword = matches(decoded.slice(split + 1), env.STAGING_BASIC_AUTH_PASSWORD);
        if (validUser && validPassword) return next();
      }
    }
    res.set('WWW-Authenticate', 'Basic realm="OneLife staging", charset="UTF-8"');
    return res.status(401).type('text/plain').send('Staging access requires separate authorization.');
  };
}

module.exports = { stagingAccess };
