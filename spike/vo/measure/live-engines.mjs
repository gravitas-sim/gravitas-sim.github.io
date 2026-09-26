// SPIKE (Prompt 18): the live workflow (demo.html) in all three engines,
// against CDS. Needs a static server on 4291 at the repository root.
// Run: node spike/vo/measure/live-engines.mjs [--json out]
import { chromium, firefox, webkit } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const out = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4291/spike/vo/demo.html');
  await page.click('#find button');
  await page.waitForSelector('#convert, #err:not([hidden])', { timeout: 60_000 });
  if (await page.$('#convert')) {
    await page.click('#convert');
    await page.waitForFunction(() => window.voSpike.observation || window.voSpike.error);
  }
  const r = await page.evaluate(() => ({ ...window.voSpike, ua: navigator.userAgent }));
  out.push({ engine: name, ua: r.ua, steps: r.steps, bytes: r.bytes, rows: r.rows, id: r.observation?.id ?? null, points: r.observation?.points ?? null, error: r.error ?? null });
  await browser.close();
}
for (const o of out) console.log(o.engine, o.id, o.points, JSON.stringify(o.steps), o.error);
const i = process.argv.indexOf('--json');
if (i > 0) writeFileSync(process.argv[i + 1], `${JSON.stringify({ at: new Date().toISOString(), out }, null, 2)}\n`);
