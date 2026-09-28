// Spike: R9 and the speed table in each engine's Worker.
import { chromium, firefox, webkit } from '@playwright/test';
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://127.0.0.1:4635/spike/threed/bench.html${process.argv.includes('--speed') ? '?speed' : ''}`);
  await page.waitForFunction(() => window.__bench, null, { timeout: 600_000 });
  console.log(JSON.stringify({ engine: name, ...(await page.evaluate(() => window.__bench)) }));
  await browser.close();
}
