// Spike (Prompt 158): the marginal cost of one pack. For every observation the
// Observatory offers, a fresh context opens the page, then opens that observation, and
// counts what the open added (requests and decoded bytes of every resource but
// the document), on the sources and on the build. Disposable; never merged.
// node spike/deploy-ii/packs.mjs [--json=out.json]
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JSON_OUT = process.argv.find(a => a.startsWith('--json='))?.slice(7);
const taken = port => new Promise(r => { const s = net.connect({ port, host: '127.0.0.1' }); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); });
async function serve(root, port) { while (await taken(port)) port++; const c = spawn(process.execPath, [path.join(REPO, 'tools/static-server.mjs'), '--root', root, '--port', String(port)], { stdio: 'ignore' }); const end = Date.now() + 15000; while (!(await taken(port))) { if (Date.now() > end) throw new Error('server'); await sleep(50); } c.port = port; return c; }
const servers = { sources: await serve(REPO, 4490), build: await serve(path.join(REPO, 'dist'), 4491) };
const browser = await chromium.launch();
const out = {};
async function open(base, id) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('gravitas_welcome_seen_v1', '1'); } catch {} });
  const page = await ctx.newPage();
  let n = 0, bytes = 0; const reading = new Set();
  page.on('response', res => { if (res.request().resourceType() === 'document') return; n++; const p = res.body().then(b => { bytes += b.length; }).catch(() => {}).finally(() => reading.delete(p)); reading.add(p); });
  await page.goto(base + '/observatory/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
  await page.waitForLoadState('networkidle').catch(() => {}); while (reading.size) await Promise.allSettled([...reading]);
  const ids = await page.evaluate(() => [...document.querySelectorAll('#obsFixture option')].map(o => o.value));
  if (!id) { await ctx.close(); return ids; }
  const n0 = n, b0 = bytes;
  await page.locator('#obsFixture').selectOption(id);
  await page.locator('#obsOpen').click();
  await page.locator('#obsTable tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForLoadState('networkidle').catch(() => {}); while (reading.size) await Promise.allSettled([...reading]);
  await ctx.close();
  return { requests: n - n0, kb: Math.round((bytes - b0) / 102.4) / 10 };
}
try {
  const ids = await open(`http://127.0.0.1:${servers.sources.port}`, null);
  for (const id of ids) { out[id] = {}; for (const cfg of ['sources', 'build']) out[id][cfg] = await open(`http://127.0.0.1:${servers[cfg].port}`, id); console.log(id, JSON.stringify(out[id])); }
} finally { await browser.close(); for (const s of Object.values(servers)) s.kill(); }
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
