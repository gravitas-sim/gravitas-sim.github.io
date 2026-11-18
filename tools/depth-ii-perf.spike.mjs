// Depth II gate, criterion 6 (spike only, never merged). The perf probe's
// launch flags, CPU throttle and frame measure (tools/perf-probe.mjs), on the
// prototype step's scene while its variation runs: chromebook-proxy
// conditions, low tier, CPU x4, 1440x900, device pixel ratio 1.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4612;
const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=default', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
});
const out = [];
try {
  for (let trial = 0; trial < (process.env.TRIALS ? Number(process.env.TRIALS) : 3); trial++) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU ?? 4) });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.evaluate(async () => {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      localStorage.setItem('gravitas_orientation_seen_v1', '1');
      const reg = await import('/js/data/investigations/registry.js');
      const schema = await import('/js/investigations/progressSchema.js');
      const lesson = await reg.loadInvestigation('weighing-stars');
      const upTo = lesson.steps.findIndex(s => s.sid === 'one-on-your-own');
      localStorage.setItem('gravitas_investigation_weighing-stars', JSON.stringify(schema.writeProgress({
        lesson, responses: {}, attempts: {}, visited: lesson.steps.slice(0, upTo + 1).map(s => s.sid),
        stepSid: 'one-on-your-own', startedAt: '2026-11-18T00:00:00.000Z', depth: 'quantitative', deepest: 'quantitative',
      })));
    });
    await page.goto(`http://localhost:${PORT}/#investigation=weighing-stars`, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.splashScreenEnded === true, { timeout: 60000 });
    await page.locator('.inv-step-title').filter({ hasText: 'One on your own' }).waitFor({ timeout: 60000 }).catch(async e => { console.error('TITLE', await page.locator('.inv-step-title').innerText().catch(() => '?')); throw e; });
    await page.waitForFunction(async () => (await import('/js/lesson/stageGate.js')).stagedStars().length >= 2, null, { timeout: 60000 });
    await page.locator('#investigationNext').click();
    await page.locator('.inv-step-title').filter({ hasText: 'Make Star A lighter' }).waitFor({ timeout: 30000 });
    const stagedAtStep = await page.evaluate(async () => (await import('/js/lesson/stageGate.js')).stagedStars().length);
    await page.waitForTimeout(1500);
    const stagedAtStepLater = await page.evaluate(async () => (await import('/js/lesson/stageGate.js')).stagedStars().length);
    console.error('STAGED-AT-STEP', stagedAtStep, stagedAtStepLater);
    // The product does not stage a deeper step (criterion 2's finding), so the
    // scene in force (sceneIn: the mystery pair of 'one-on-your-own') is put
    // up by the harness, as tests/depthIIGate.spike.test.js does.
    await page.evaluate(async () => {
      const gate = await import('/js/lesson/stageGate.js');
      gate.applyStage({ starPair: { m1: 3, m2: 1, separation: 400, fit: true } }, { force: true });
    });
    await page.waitForFunction(async () => (await import('/js/lesson/stageGate.js')).stagedStars().length >= 2, null, { timeout: 30000 });
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const quality = await import('/js/quality.js');
      ui.SETTINGS.quality_tier = 'low';
      quality.setTier('low');
    });
    await page.locator('[data-option="1"]').click();
    await page.waitForTimeout(1000);
    const staged = await page.evaluate(async () => (await import('/js/lesson/stageGate.js')).stagedStars().length);
    if (process.env.MODE !== 'idle') await page.locator('[data-run-go]').click();
    else await page.evaluate(async () => { (await import('/js/appState.js')).state.paused = false; });
    const row = await page.evaluate(async () => {
      const stats = { frames: 0, total: 0, max: 0 };
      const started = performance.now();
      await new Promise(done => {
        let last = performance.now();
        const tick = now => {
          const d = now - last;
          stats.total += d; stats.frames++; stats.max = Math.max(stats.max, d); last = now;
          const finished = document.querySelector('[data-run-row="1"]');
          if (!finished && now - started < 5000) requestAnimationFrame(tick); else done();
        };
        requestAnimationFrame(tick);
      });
      return { frameMs: stats.total / Math.max(1, stats.frames), frames: stats.frames, maxMs: stats.max, sampledMs: performance.now() - started, finished: Boolean(document.querySelector('[data-run-row="1"]')) };
    });
    out.push({ trial, staged, ...row });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify(out));
