// Spike measurements: node spike/notebook/measure.mjs <engine> <case> [runner]
// Prints one JSON line: bytes by host, timings, the frame's probes, the
// capsule, and the page's own errors.
import { chromium, firefox, webkit } from '@playwright/test';
const [engine = 'chromium', which = 'cold', runner = 'runner.html', notebook = 'transit-times.ipynb', timeout = '180000'] = process.argv.slice(2);
const B = 'http://127.0.0.1:4634/spike/notebook/host.html';
const browser = await { chromium, firefox, webkit }[engine].launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const bytes = {};
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
page.on('requestfinished', async req => {
  try {
    const s = await req.sizes();
    const host = new URL(req.url()).host;
    const fromCache = (await req.response())?.fromServiceWorker?.() ? 'sw' : '';
    bytes[host] ??= { requests: 0, body: 0 };
    bytes[host].requests++;
    bytes[host].body += s.responseBodySize;
    void fromCache;
  } catch { /* a request with no response */ }
});
let cdp = null;
if (engine === 'chromium' && which === 'throttled') {
  cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
const run = async () => {
  await page.goto(`${B}?runner=${runner}&notebook=${notebook}&timeout=${timeout}`);
  await page.waitForFunction(() => window.__bridge?.done, null, { timeout: 600_000 });
  return page.evaluate(() => window.__bridge);
};
let first = await run();
let second = null;
if (which === 'warm' || which === 'offline') {
  for (const k of Object.keys(bytes)) delete bytes[k];
  if (which === 'offline') await ctx.setOffline(true);
  second = await run().catch(e => ({ error: String(e.message).slice(0, 300) }));
}
console.log(JSON.stringify({ engine, which, runner, notebook, bytes, first, second, errors: errors.slice(0, 8) }));
await browser.close();
