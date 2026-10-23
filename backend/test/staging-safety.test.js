const test = require('node:test'), assert = require('node:assert/strict');
const { stagingSafetyErrors } = require('../services/staging-safety');
const { stagingAccess } = require('../middlewares/staging-access');
const base = { NODE_ENV: 'production', APP_ENV: 'staging', DATABASE_URL: 'mongodb://127.0.0.1:27017/onelife_staging', STAGING_MONGO_HOST: '127.0.0.1', STAGING_MONGO_DATABASE: 'onelife_staging', STAGING_BASIC_AUTH_USER: 'reviewer', STAGING_BASIC_AUTH_PASSWORD: 'b'.repeat(48), JWT_SECRET: 'a'.repeat(48) };
test('staging requires explicitly named database and independent access credentials', () => {
  assert.deepEqual(stagingSafetyErrors(base), []);
  assert.ok(stagingSafetyErrors({ ...base, NODE_ENV: 'development' }).length);
  for (const name of ['STAGING_MONGO_HOST','STAGING_MONGO_DATABASE','STAGING_BASIC_AUTH_USER','STAGING_BASIC_AUTH_PASSWORD']) assert.ok(stagingSafetyErrors({ ...base, [name]: '' }).length);
  assert.ok(stagingSafetyErrors({ ...base, STAGING_BASIC_AUTH_PASSWORD: base.JWT_SECRET }).length);
});
test('staging rejects wrong host, database, alternate protocol and database overrides before connecting', () => {
  for (const DATABASE_URL of ['mongodb://different.invalid/onelife_staging', 'mongodb://127.0.0.1/onelife', 'https://127.0.0.1/onelife_staging', 'mongodb://127.0.0.1/onelife_staging?dbName=production', 'mongodb://127.0.0.1/onelife_staging?DBNAME=production']) assert.ok(stagingSafetyErrors({ ...base, DATABASE_URL }).length);
  assert.ok(stagingSafetyErrors({ ...base, database_url: 'mongodb://different.invalid/onelife' }).length);
});
test('dedicated SRV host and explicit synthetic loopback database pass without connecting', () => {
  assert.deepEqual(stagingSafetyErrors({ ...base, STAGING_MONGO_HOST:'isolated.invalid', DATABASE_URL:'mongodb+srv://isolated.invalid/onelife_staging?authSource=admin' }), []);
  assert.deepEqual(stagingSafetyErrors({ ...base, STAGING_MONGO_DATABASE:'onelife_test_runtime', DATABASE_URL:'mongodb://127.0.0.1/onelife_test_runtime' }), []);
});
function attempt(env, route, method='GET', header='', secure=true) {
  const result={ allowed:false, headers:{} };
  const res={ set(k,v){result.headers[k]=v;return this;},status(n){result.status=n;return this;},type(){return this;},send(){return this;} };
  stagingAccess(env)({path:route,method,secure,get:()=>header},res,()=>{result.allowed=true;});return result;
}
test('unauthorized staging requests cannot access pages, assets, APIs or webhooks', () => {
  for(const route of ['/','/login','/admin/login','/assets/onelife-mark.svg','/admin','/countries','/webhooks/razorpay']) {const r=attempt(base,route);assert.equal(r.allowed,false);assert.equal(r.status,401);assert.match(r.headers['WWW-Authenticate'],/^Basic /);assert.equal(r.headers['Cache-Control'],'no-store');}
});
test('only GET and HEAD exact health path bypass staging access', () => {
  for(const method of ['GET','HEAD']) assert.equal(attempt(base,'/health',method).allowed,true);
  for(const method of ['POST','DELETE','OPTIONS']) assert.equal(attempt(base,'/health',method).status,401);
  assert.equal(attempt(base,'/health/private').status,401);
});
test('correct Basic credentials pass; wrong or malformed credentials fail', () => {
  const header='Basic '+Buffer.from(`${base.STAGING_BASIC_AUTH_USER}:${base.STAGING_BASIC_AUTH_PASSWORD}`).toString('base64');
  assert.equal(attempt(base,'/', 'GET',header).allowed,true);
  for(const value of ['Basic !!!','Bearer unrelated','Basic '+Buffer.from('reviewer:wrong').toString('base64'),'Basic '+Buffer.from(`wrong:${base.STAGING_BASIC_AUTH_PASSWORD}`).toString('base64'),'Basic '+Buffer.from(':').toString('base64')]) assert.equal(attempt(base,'/','GET',value).status,401);
});
test('production and development do not acquire staging restrictions', () => {
  for(const APP_ENV of [undefined,'production','development']) {const env={APP_ENV};assert.deepEqual(stagingSafetyErrors(env),[]);assert.equal(attempt(env,'/').allowed,true);}
});
test('staging access never challenges for credentials over plain HTTP', () => {
  const result=attempt(base,'/','GET','',false);
  assert.equal(result.status,426);assert.equal(result.headers['WWW-Authenticate'],undefined);
});
test('actual application startup rejects a mismatched staging database before mongoose.connect', { timeout: 20000 }, () => {
  const { spawnSync }=require('node:child_process'), path=require('node:path');
  const env={...process.env,...base,NODE_ENV:'production',INTEGRATION_MODE:'mock',DATABASE_URL:'mongodb://unapproved.invalid/production',PORT:'0'};
  for(const key of Object.keys(env)) if(/^(RAZORPAY_|GEMINI_|OPENAI_|TWILIO_|mail_)/.test(key)) delete env[key];
  const code="require('dotenv').config=()=>({}); let attempted=false;require('mongoose').connect=()=>{attempted=true;throw Error('forbidden');};try{require('./index');process.exit(2);}catch(error){process.exit(!attempted&&error.message.includes('DATABASE_URL must match')?0:3);}";
  const result=spawnSync(process.execPath,['-e',code],{cwd:path.join(__dirname,'..'),env,encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(result.status,0,'Startup must stop before attempting a database connection');
});
