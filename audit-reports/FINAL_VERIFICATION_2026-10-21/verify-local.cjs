const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const req = (name) => require(path.join(root, 'backend/node_modules', name));
const { chromium } = require(process.env.ONELIFE_PLAYWRIGHT_MODULE || 'playwright');
const results = [], attemptedExternal = [], browserErrors = [], failedAssets = [], layouts = [];
const check = (label, fn) => fn().then(() => {results.push({ label, result: 'PASS' }); console.log('PASS', label);}).catch(e => {results.push({ label, result: 'FAIL', error: e.message }); console.log('FAIL',label,e.message.split('\n')[0]);});
// Never load the checkout's .env or retain inherited provider credentials.
req('dotenv').config = () => ({ parsed: {} });
for (const key of Object.keys(process.env)) if (/^(RAZORPAY_|GEMINI_|OPENAI_|TWILIO_|MAIL_|mail_|DATABASE_URL$|database_url$|JWT_SECRET$|secret$)/.test(key)) delete process.env[key];
Object.assign(process.env, { NODE_ENV: 'production', DATABASE_URL: 'mongodb://127.0.0.1:1/onelife_mock_verification', JWT_SECRET: crypto.randomBytes(48).toString('hex'), PORT: '0', VIDEO_MEETING_BASE_URL: 'https://video.invalid' });
const deny = () => { attemptedExternal.push('blocked Node provider request'); throw new Error('External services blocked by verification harness'); };
const httpsModule = require('node:https'); const rawRequest=httpsModule.request, rawGet=httpsModule.get;
const isLocal = value => { try { return ['localhost','127.0.0.1','::1'].includes(typeof value === 'string' || value instanceof URL ? new URL(value).hostname : value.hostname || value.host?.split(':')[0]); } catch {return false;} };
httpsModule.request = (...args) => isLocal(args[0]) ? rawRequest(...args) : deny(); httpsModule.get = (...args) => isLocal(args[0]) ? rawGet(...args) : deny();
const originalFetch = global.fetch;
global.fetch = (url, opts) => { if (!/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(String(url))) return deny(); return originalFetch(url, opts); };
for (const [file, exports] of [
  ['controller/mail.js', { mailsender: async () => ({ mocked: true }), sendWhatsAppMessage: async () => 'mock-only' }],
  ['services/razorpay-client.js', { razorpayClient: deny }],
]) { const filename = path.join(root, 'backend', file); require.cache[filename] = { id: filename, filename, loaded: true, exports }; }
const mongoose = req('mongoose'); mongoose.connect = async () => mongoose;
const diagnosticPolicy = process.env.ONELIFE_VERIFY_REFERRER === '1';
if (diagnosticPolicy) { const helmetFile = require.resolve(path.join(root,'backend/node_modules/helmet')); const originalHelmet = require(helmetFile); require.cache[helmetFile].exports = options => originalHelmet({...options,referrerPolicy:{policy:'same-origin'}}); }
const User = require(path.join(root, 'backend/models/user'));
const Appointment = require(path.join(root, 'backend/models/appointment'));
const password = 'Synthetic-Verification-Only-934!';
const passwordHash = req('bcryptjs').hashSync(password, 4);
const roles = ['ADMIN', 'DOCTOR', 'NORMAL', 'NORMAL'];
const users = roles.map((role, i) => new User({ _id: `00000000000000000000000${i + 1}`, fullname: `Synthetic ${role} ${i + 1}`, email: `${role.toLowerCase()}${i + 1}@example.test`, password: passwordHash, role, number: '', address: { line1: 'Synthetic clinic', line2: 'Test only' }, dob: '1990-01-01', gender: 'Female', speciality: 'General physician', degree: 'MBBS', experience: '4', fees: 500, available: true, image: '/assets/onelife-clinician-generated.png' }));
const doctor = users[1], patient = users[2];
const appointments = Array.from({ length: 9 }, (_, i) => new Appointment({ _id: `10000000000000000000000${i + 1}`, userid: String(patient._id), patientId: patient._id, docId: String(doctor._id), doctorId: doctor._id, doctor: doctor.fullname, fullname: `Synthetic Patient ${i + 1}`, email: `p${i + 1}@example.test`, number: '', date: new Date(Date.now() + (i + 1) * 86400000), status: 'confirmed', amount: 500, address: patient.address, userdata: patient.toObject(), doctordata: doctor.toObject(), payment: { orderId: 'mock-order', amount: 50000, currency: 'INR', status: 'paid' } }));
function matches(row, filter = {}) { return Object.entries(filter).every(([key, value]) => {
  if (key === '$or') return value.some(v => matches(row, v));
  const got = key.split('.').reduce((v, k) => v?.[k], row);
  if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) return Object.entries(value).every(([op, target]) => op === '$in' ? target.map(String).includes(String(got)) : op === '$nin' ? !target.map(String).includes(String(got)) : op === '$ne' ? String(got) !== String(target) : op === '$gte' ? got >= target : op === '$lt' ? got < target : true);
  return String(got) === String(value);
}); }
function query(value) { let lean = false; return { select() { return this; }, populate() { return this; }, sort() { return this; }, limit(n) { if (Array.isArray(value)) value = value.slice(0, n); return this; }, lean() { lean = true; return this; }, then(resolve, reject) { const plain = v => v?.toObject ? v.toObject() : v; return Promise.resolve(lean ? (Array.isArray(value) ? value.map(plain) : plain(value)) : value).then(resolve, reject); } }; }
for (const [Model, rows] of [[User, users], [Appointment, appointments]]) {
  Model.find = filter => query(rows.filter(r => matches(r, filter)));
  Model.findOne = filter => query(rows.find(r => matches(r, filter)) || null);
  Model.findById = id => query(rows.find(r => String(r._id) === String(id?._id || id)) || null);
  Model.countDocuments = async filter => rows.filter(r => matches(r, filter)).length;
}
for (const model of ['messages', 'support-thread', 'waitlist']) { const M = require(path.join(root, 'backend/models', model)); M.find = () => query([]); M.findOne = () => query(null); M.countDocuments = async () => 0; }
const http = require('node:http'); let server;
const tlsDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'onelife-local-tls-'));
require('node:child_process').execFileSync(process.env.ONELIFE_OPENSSL_EXECUTABLE || 'C:/Program Files/Git/usr/bin/openssl.exe', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(tlsDir,'key.pem'), '-out', path.join(tlsDir,'cert.pem'), '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
http.createServer = (...args) => { server = require('node:https').createServer({key:fs.readFileSync(path.join(tlsDir,'key.pem')),cert:fs.readFileSync(path.join(tlsDir,'cert.pem'))}, ...args); server.on('request',r=>{if(r.method==='POST')console.log('POST_META',r.url,JSON.stringify({origin:r.headers.origin,referer:r.headers.referer,host:r.headers.host,tls:r.socket.encrypted}));}); return server; };
const originalError = console.error; console.error = (...args) => console.log('HANDLER_ERROR',typeof args[0]==='string'?args[0]:args[0]?.message);
require(path.join(root, 'backend/index.js'));
(async () => {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const base = `https://localhost:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.ONELIFE_BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
    await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === base) {if(url.pathname==='/assets/tailwind.css'&&process.env.ONELIFE_VERIFY_BUILT_CSS==='1')return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(process.env.ONELIFE_VERIFY_CSS_FILE || path.join(__dirname,'tailwind-verified.css'),'utf8')});return route.continue();} attemptedExternal.push(url.origin); return route.abort('blockedbyclient'); });
    const page = await context.newPage();
    page.on('response',r=>{if(r.request().method()==='POST')console.log('POST_RESPONSE',new URL(r.url()).pathname,r.status());});
    page.setDefaultTimeout(5000); page.setDefaultNavigationTimeout(10000);
    page.on('pageerror', e => browserErrors.push(e.message));
    page.on('response', response => { if (response.status() >= 400 && /\/(?:assets|admin-assets|doctor-assets|console-assets)\//.test(response.url())) failedAssets.push({ url: new URL(response.url()).pathname, status: response.status() }); });
    await check('Production-mode liveness', async () => assert.equal((await page.request.get(base + '/health')).status(), 200));
    for (const route of ['/', '/about', '/contact', '/login', '/register', '/admin/login', '/doctorlogin']) await check(`Unauthenticated GET ${route}`, async () => assert.equal((await page.goto(base + route)).status(), 200));
    await check('Login client required-field validation', async () => { await page.goto(base + '/admin/login'); assert.equal(await page.locator('form').evaluate(form => form.checkValidity()), false); });
    await check('Mobile navigation opens and closes', async () => { await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base); await page.locator('#mobileMenuButton').click(); assert.equal(await page.locator('#mobileMenuButton').getAttribute('aria-expanded'), 'true'); await page.getByRole('button', { name: 'Close navigation menu', exact: true }).last().click(); assert.equal(await page.locator('#mobileMenuButton').getAttribute('aria-expanded'), 'false'); });
    const login = async (user, route, target) => { await context.clearCookies(); await page.goto(base + route); await page.locator('input[name=email]').fill(user.email); await page.locator('input[name=password]').fill(password); await page.locator('button[type=submit]').click(); await page.waitForURL(base + target); const cookies = await context.cookies(); const token = cookies.find(c => c.name === 'token'); assert.ok(token); assert.ok(token.secure && token.httpOnly && token.sameSite === 'Lax'); };
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (!diagnosticPolicy) for (const [user, route] of [[users[0],'/admin/login'],[doctor,'/doctorlogin'],[patient,'/login']]) await check(`${user.role} browser form login must redirect`, async()=>{await context.clearCookies();await page.goto(base+route);await page.locator('input[name=email]').fill(user.email);await page.locator('input[name=password]').fill(password);const responsePromise=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===route);await page.locator('button[type=submit]').click();const response=await responsePromise;assert.equal(response.status(),302,'Login form returned HTTP '+response.status());});
    if (diagnosticPolicy) {
    for (const [user, route, target, views] of [[users[0], '/admin/login', '/admin', ['/admin', '/doctors-registration', '/doctors-detail', '/showmsg', '/profile']], [doctor, '/doctorlogin', '/doctor', ['/doctor', '/doctor/availability', '/showdocmsg']], [patient, '/login', '/', ['/', '/doctors', '/my-profile', '/my-appointment', '/messages']]]) {
      await check(`${user.role} successful login, redirect, production cookie`, () => login(user, route, target));
      for (const view of views) await check(`${user.role} authenticated GET ${view}`, async () => { assert.equal((await page.goto(base + view)).status(), 200); assert.equal(new URL(page.url()).pathname, view); if (view === '/my-appointment') assert.ok((await page.locator('body').innerText()).includes(doctor.fullname)); });
      if (user.role === 'DOCTOR') {
        await check('Doctor table paging, search, and sort', async () => { await page.goto(base + '/doctor'); assert.equal(await page.locator('#doctor-appointments tbody tr:visible').count(), 6); await page.locator('[data-table-pagination] button').nth(1).click(); assert.equal(await page.locator('#doctor-appointments tbody tr:visible').count(), 3); await page.locator('[data-table-search]').fill('Synthetic Patient 9'); assert.equal(await page.locator('#doctor-appointments tbody tr:visible').count(), 1); await page.locator('[data-table-search]').fill(''); await page.locator('[data-sort-column="0"]').click(); assert.equal(await page.locator('#doctor-appointments tbody tr:visible').count(), 6); });
        await check('Availability client renders seven days and date exception controls', async () => { await page.goto(base + '/doctor/availability'); assert.equal(await page.locator('#weekly-rules tr').count(), 7); await page.locator('#add-exception').click(); assert.equal(await page.locator('.availability-exception').count(), 1); await page.getByRole('button', { name: 'Remove', exact: true }).click(); assert.equal(await page.locator('.availability-exception').count(), 0); });
      }
      if (user.role === 'NORMAL') {
        await check('Patient role denied admin/doctor APIs', async () => { assert.equal((await page.request.get(base + '/admin/doctors-detail')).status(), 403); await login(patient, '/login', '/'); assert.equal((await page.request.get(base + '/doctor/appointments')).status(), 403); });
        await check('Unsafe request without same-origin proof rejected', async () => { await login(patient, '/login', '/'); assert.equal((await page.request.post(base + '/appointment', { data: {} })).status(), 403); });
        await check('Incomplete appointment rejected before provider boundary', async () => { assert.equal((await page.request.post(base + '/appointment', { headers: { Origin: base }, data: {} })).status(), 400); });
      }
      await check(`${user.role} incorrect-password feedback`, async () => { await context.clearCookies(); await page.goto(base + route); await page.locator('input[name=email]').fill(user.email); await page.locator('input[name=password]').fill('Incorrect-Synthetic-Password'); await page.locator('button[type=submit]').click(); await page.getByText('Incorrect email or password. Please try again.', {exact:true}).waitFor(); assert.equal((await context.cookies()).some(c => c.name === 'token'), false); });
    }
    }
    await context.clearCookies();
    for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 900 }); for (const route of ['/', '/admin/login', '/doctorlogin', '/login']) { await page.goto(base + route); layouts.push({ width, route, ...await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => new URL(i.src).pathname), overflowingElements:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,6).map(e=>({tag:e.tagName,class:e.className,right:Math.round(e.getBoundingClientRect().right)})) })) }); } }
    await check('Referenced browser assets return successful responses', async () => assert.deepEqual(failedAssets, []));
    await check('Browser pages produce no JavaScript errors', async () => assert.deepEqual(browserErrors, []));
    const builtCss=process.env.ONELIFE_VERIFY_BUILT_CSS==='1';
    const report = { mode: 'NODE_ENV=production, in-memory model doubles, real routes/controllers/EJS/bcrypt/JWT, no database persistence', diagnosticPolicy, builtCss, results, passed: results.filter(r => r.result === 'PASS').length, failed: results.filter(r => r.result === 'FAIL').length, attemptedExternal, failedAssets, browserErrors, layouts };
    fs.writeFileSync(path.join(__dirname,builtCss?'browser-build-diagnostic.json':diagnosticPolicy?'browser-diagnostic.json':'browser-baseline.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
    if (report.failed) process.exitCode = 1;
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); console.error = originalError; }
})().catch(e => { console.error = originalError; console.error(e.message); server?.closeAllConnections(); server?.close(); process.exitCode = 1; });
