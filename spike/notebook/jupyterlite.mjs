// Spike: what the JupyterLite demo downloads before its interface is idle.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const hosts = {};
page.on('requestfinished', async req => {
  const s = await req.sizes().catch(() => null);
  if (!s) return;
  const h = new URL(req.url()).host;
  hosts[h] ??= { requests: 0, body: 0 };
  hosts[h].requests++;
  hosts[h].body += Math.max(0, s.responseBodySize);
});
const t0 = Date.now();
await page.goto('https://jupyterlite.github.io/demo/lab/index.html', { waitUntil: 'networkidle', timeout: 180_000 });
const ms = Date.now() - t0;
const title = await page.title();
console.log(JSON.stringify({ title, ms, hosts, totalMB: Object.values(hosts).reduce((s, h) => s + h.body, 0) / 1e6 }));
await browser.close();
