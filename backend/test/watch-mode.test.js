const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

test('Node native watch restarts after an imported JavaScript module changes', { timeout: 15000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onelife-watch-test-'));
  const dependency = path.join(dir, 'dependency.cjs');
  fs.writeFileSync(dependency, 'module.exports = 1;');
  fs.writeFileSync(path.join(dir, 'main.cjs'), "console.log('WATCH_READY_' + require('./dependency.cjs')); setInterval(() => {}, 1000);");
  const child = spawn(process.execPath, ['--watch', path.join(dir, 'main.cjs')], { cwd: dir, windowsHide: true });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  const until = async text => {
    const deadline = Date.now() + 6000;
    while (!output.includes(text) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    assert.ok(output.includes(text), 'Native watcher must restart its synthetic fixture');
  };
  try {
    await until('WATCH_READY_1');
    fs.writeFileSync(dependency, 'module.exports = 2;');
    await until('WATCH_READY_2');
  } finally {
    const exited = new Promise(resolve => child.once('exit', resolve));
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill();
    await exited;
    // Only this test's exact generated fixture files are removed.
    for (const filename of ['main.cjs', 'dependency.cjs']) fs.unlinkSync(path.join(dir, filename));
    fs.rmdirSync(dir);
  }
});
