// Offline compilation/reference checks. This script never loads application env.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ejs = require('ejs');
const root = path.resolve(__dirname, '../..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'backend', 'frontend'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);
const unique = [...new Set(files)];
const failures = [], counts = { ejs: 0, javascript: 0, inlineScripts: 0, staticReferences: 0, forms: 0 };
const mounts = { '/console-assets/': 'frontend/shared/assets/', '/admin-assets/': 'frontend/Admin/assets/', '/doctor-assets/': 'frontend/doctor/assets/', '/assets/': 'frontend/patient/views/assets/' };
for (const file of unique) {
  if (!fs.existsSync(path.join(root, file))) continue;
  if (/\.(js|cjs)$/.test(file)) {
    try { execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' }); counts.javascript++; }
    catch { failures.push(`${file}: JavaScript syntax`); }
  }
  if (!file.endsWith('.ejs')) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  try { ejs.compile(source, { filename: path.join(root, file) }); counts.ejs++; } catch (error) { failures.push(`${file}: EJS ${error.message.split('\n')[0]}`); }
  let inlineCombined = '';
  const externalScripts = new Set();
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const srcMatch = match[1].match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch) {
      if (externalScripts.has(srcMatch[1])) failures.push(`${file}: duplicate external script ${srcMatch[1]}`);
      externalScripts.add(srcMatch[1]);
      continue;
    }
    if (/application\/json/i.test(match[1]) || !match[2].trim()) continue;
    const sanitized = match[2].replace(/<%[=-][\s\S]*?%>/g, 'null').replace(/<%[\s\S]*?%>/g, '');
    try {
      new vm.Script(sanitized);
      inlineCombined += `\n;${sanitized}`;
      counts.inlineScripts++;
    } catch (error) {
      failures.push(`${file}: inline script ${error.message}`);
    }
  }
  if (inlineCombined) {
    try { new vm.Script(inlineCombined); }
    catch (error) { failures.push(`${file}: combined inline scripts ${error.message}`); }
  }
  const pageEndMatches = source.match(/include\(['"]partials\/page-end['"]\)/g) || [];
  if (pageEndMatches.length > 1) failures.push(`${file}: duplicate partials/page-end include`);
  for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (url.includes('<%')) continue;
    for (const [prefix, directory] of Object.entries(mounts)) if (url.startsWith(prefix)) {
      counts.staticReferences++;
      if (!fs.existsSync(path.join(root, directory, url.slice(prefix.length)))) failures.push(`${file}: missing ${url}`);
    }
  }
  for (const match of source.matchAll(/<form\b[^>]*>/gi)) {
    counts.forms++;
    const end = source.indexOf('</form>', match.index);
    if (!source.slice(match.index, end).includes('name="_csrf"')) failures.push(`${file}: form missing explicit CSRF field`);
  }
}
console.log(JSON.stringify({ counts, failures }, null, 2));
if (failures.length) process.exitCode = 1;
