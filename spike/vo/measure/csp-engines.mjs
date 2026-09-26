// SPIKE (Prompt 18): probe-csp.html in all three engines. Needs a static
// server on 4291 at the repository root (python3 -m http.server 4291).
// Run: node spike/vo/measure/csp-engines.mjs [--json out]
import { chromium, firefox, webkit } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const out = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4291/spike/vo/probe-csp.html');
  await page.click('#go');
  await page.waitForFunction(() => window.cspProbe, null, { timeout: 60_000 });
  const r = await page.evaluate(() => window.cspProbe);
  out.push({ engine: name, ua: r.ua, results: r.results, violations: r.violations.map(v => v.directive) });
  await browser.close();
}
for (const o of out) console.log(o.engine, JSON.stringify(o.results.map(r => [r.name, r.ok ? r.status : 'refused'])), o.violations);
const i = process.argv.indexOf('--json');
if (i > 0) writeFileSync(process.argv[i + 1], `${JSON.stringify({ at: new Date().toISOString(), out }, null, 2)}\n`);
