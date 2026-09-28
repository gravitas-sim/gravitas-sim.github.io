// Spike: what a notebook that never returns does to the page holding it.
// node spike/notebook/loop.mjs <engine> [runner]
import { chromium, firefox, webkit } from '@playwright/test';
const [engine = 'chromium', runner = 'runner.html'] = process.argv.slice(2);
const browser = await { chromium, firefox, webkit }[engine].launch();
const page = await (await browser.newContext()).newPage();
let crashed = false;
page.on('crash', () => (crashed = true));
await page.goto(`http://127.0.0.1:4634/spike/notebook/host.html?runner=${runner}&notebook=hostile-loop.ipynb&timeout=15000`);
const samples = [];
const start = Date.now();
while (Date.now() - start < 45_000) {
  const t = Date.now();
  const r = await Promise.race([
    page.evaluate(() => ({ status: document.getElementById('status').textContent, frames: document.querySelectorAll('iframe').length })).catch(e => ({ failed: String(e.message).slice(0, 80) })),
    new Promise(ok => setTimeout(() => ok({ unresponsive: true }), 3000)),
  ]);
  samples.push({ at: Math.round((t - start) / 1000), ...r, crashed });
  await new Promise(ok => setTimeout(ok, 4000));
}
console.log(JSON.stringify({ engine, runner, samples }));
await browser.close().catch(() => {});
