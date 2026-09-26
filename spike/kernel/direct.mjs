// SPIKE (Prompt 21): the bench in a browser launched directly, with no
// automation protocol attached.
//   node spike/kernel/direct.mjs <browser binary> [--repeats 5] [--json out]
// Playwright drives Firefox through Juggler, and a SpiderMonkey with a
// debugger attached compiles WebAssembly in its debugging tier. This measures
// the engine as a reader gets it: a headless browser with a fresh profile,
// opened on bench.html?auto, which posts its numbers back here.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { tmpdir, loadavg } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };
const arg = (name, d) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : d;
};
const binary = process.argv[2];
const repeats = Number(arg('--repeats', 5));

let done;
const result = new Promise(r => (done = r));
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (req.method === 'POST' && path.endsWith('/result')) {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      res.end('ok');
      done(JSON.parse(body));
    });
    return;
  }
  const p = join(ROOT, decodeURIComponent(path));
  if (!p.startsWith(ROOT) || !existsSync(p)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/bench.html?auto&repeats=${repeats}`;
// Under the runner's own temp directory where there is one: a snap-packaged
// Firefox cannot read a profile in /tmp.
const profile = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'kernel-bench-'));
const loadBefore = loadavg()[0];
const child = spawn(binary, ['-headless', '-no-remote', '-profile', profile, url], { stdio: 'ignore' });
const timer = setTimeout(() => done({ error: 'timed out' }), 10 * 60 * 1000);
const r = await result;
clearTimeout(timer);
const loadAfter = loadavg()[0];
child.kill();
server.close();
rmSync(profile, { recursive: true, force: true });
const out = { binary, loadBefore: +loadBefore.toFixed(2), loadAfter: +loadAfter.toFixed(2), ...r };
console.log(JSON.stringify({ gls: r.gls, bls: r.bls, wasm: r.wasm, loadBefore, loadAfter }));
const file = arg('--json', null);
if (file) writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
