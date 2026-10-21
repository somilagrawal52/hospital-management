// Opt-in startup smoke for the clean-build fixture; no dotenv or production URI.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const root = process.env.ONELIFE_CLEAN_BUILD_ROOT;
const uri = process.env.ONELIFE_TEST_DATABASE_URL;
if (!root || !path.resolve(root).startsWith(path.resolve(require('node:os').tmpdir()) + path.sep) || !path.basename(root).startsWith('onelife-clean-build-')) throw new Error('Use an explicit temporary clean-build fixture.');
const db = uri && new URL(uri);
if (!db || db.hostname !== '127.0.0.1' || !/^\/onelife_test_[a-z0-9_]+$/.test(db.pathname)) throw new Error('Only loopback synthetic MongoDB is allowed.');
assert.equal(fs.existsSync(path.join(root, 'backend/.env')), false);
const env = { ...process.env };
for (const key of Object.keys(env)) if (/^(RAZORPAY_|GEMINI_|OPENAI_|TWILIO_|MAIL_|mail_|DATABASE_URL$|database_url$|JWT_SECRET$|secret$)/.test(key)) delete env[key];
const port = execFileSync(process.execPath, ['-e', "const s=require('node:net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close();});"], { encoding: 'utf8' }).trim();
Object.assign(env, { NODE_ENV: 'production', APP_ENV: 'staging', INTEGRATION_MODE: 'mock', DATABASE_URL: uri, JWT_SECRET: crypto.randomBytes(48).toString('hex'), PORT: port });
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const child = spawn(process.execPath, [npmCli, '--prefix', 'backend', 'start'], { cwd: root, env, windowsHide: true });
let output = '';
child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
(async () => {
  const deadline = Date.now() + 12000;
  while ((!output.includes('Database connected') || !output.includes('Server started')) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(output.includes('Database connected'));
  const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { msg: 'success' });
  console.log('PASS exact npm start command, isolated MongoDB connection and /health; NODE_ENV=production, APP_ENV=staging, mock mode.');
})().catch(() => { console.log('FAIL clean-build startup smoke (no connection values printed).'); console.log(output.replace(/mongodb[^\s]+/g, '[REDACTED_TEST_URI]')); process.exitCode = 1; }).finally(() => {
  if (child.exitCode === null) execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  child.stdout.destroy(); child.stderr.destroy(); child.unref();
});
