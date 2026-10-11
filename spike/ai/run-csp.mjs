// U8, measured in a browser: the composer page's Content-Security-Policy against
// a call to an endpoint the repository does not name (a loopback stand-in on
// another port, as an instructor's endpoint would be). Private ports only.
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startStandin } from './standin.mjs';

const ROOT = process.cwd();
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const site = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory())
    f = path.join(f, 'index.html');
  if (!f.startsWith(ROOT) || !existsSync(f)) {
    res.statusCode = 404;
    return res.end('no');
  }
  res.setHeader(
    'content-type',
    TYPES[path.extname(f)] || 'application/octet-stream'
  );
  res.setHeader('cache-control', 'no-store');
  res.end(readFileSync(f));
});
await new Promise(r => site.listen(4871, '127.0.0.1', r));
const standin = await startStandin();
standin.plan({ text: 'Check the units of the axes.' });

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ serviceWorkers: 'block' })
).newPage();
const csp = [];
page.on('console', m => {
  if (/Content Security Policy|violates/i.test(m.text()))
    csp.push(m.text().slice(0, 160));
});
await page.goto('http://127.0.0.1:4871/studio/lesson/', { waitUntil: 'load' });
const policy = await page.evaluate(
  () =>
    document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      ?.content
);
const call = async url =>
  page.evaluate(async u => {
    try {
      const r = await fetch(u, { method: 'POST', body: '{}' });
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { error: String(e.message || e).slice(0, 80) };
    }
  }, url);
const toStandin = await call(standin.url);
const sameOrigin = await call('http://127.0.0.1:4871/package.json');
await browser.close();
const out = {
  connectSrc: /connect-src ([^;]+)/.exec(policy)?.[1],
  fetchToInstructorEndpoint: toStandin,
  standinReceived: standin.state.seen.length,
  fetchSameOriginControl: sameOrigin,
  consoleViolations: csp.length,
};
await standin.close();
site.close();
writeFileSync(
  new URL('./results-csp.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n'
);
console.log(JSON.stringify(out, null, 2));
