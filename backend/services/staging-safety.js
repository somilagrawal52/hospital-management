// Staging-only safeguards. They do not alter production/development behavior.
function stagingDatabaseErrors(env = process.env) {
  const errors = [];
  const host = env.STAGING_MONGO_HOST || '', database = env.STAGING_MONGO_DATABASE || '';
  if (!host || !/^[a-z0-9.-]+$/i.test(host)) errors.push('STAGING_MONGO_HOST must name one explicitly approved staging host.');
  if (database !== 'onelife_staging' && !/^onelife_test_[a-z0-9_]+$/.test(database)) errors.push('STAGING_MONGO_DATABASE must be onelife_staging or a synthetic onelife_test_* database.');
  try {
    const uri = new URL(env.DATABASE_URL || '');
    if (!['mongodb:', 'mongodb+srv:'].includes(uri.protocol) || uri.hostname.toLowerCase() !== host.toLowerCase() || decodeURIComponent(uri.pathname) !== `/${database}`) throw new Error('Mismatch');
    if ([...uri.searchParams.keys()].some(key => key.toLowerCase() === 'dbname')) throw new Error('Database override');
    if (env.database_url && env.database_url !== env.DATABASE_URL) throw new Error('Conflicting alias');
  } catch {
    errors.push('DATABASE_URL must match the approved staging host/database without a database override or conflicting alias.');
  }
  return errors;
}

function stagingSafetyErrors(env = process.env) {
  if (env.APP_ENV !== 'staging') return [];
  const errors = stagingDatabaseErrors(env);
  if (env.NODE_ENV !== 'production') errors.push('Staging requires NODE_ENV=production.');
  const user = env.STAGING_BASIC_AUTH_USER || '', password = env.STAGING_BASIC_AUTH_PASSWORD || '';
  if (!/^[A-Za-z0-9_.@-]{3,64}$/.test(user)) errors.push('STAGING_BASIC_AUTH_USER must contain 3-64 safe ASCII characters.');
  if (password.length < 32 || /replace|example|change-me|test-secret/i.test(password)) errors.push('STAGING_BASIC_AUTH_PASSWORD must be a new random secret of at least 32 characters.');
  if (password && password === (env.JWT_SECRET || env.secret)) errors.push('Staging access and JWT secrets must be different.');
  return errors;
}

module.exports = { stagingSafetyErrors, stagingDatabaseErrors };
