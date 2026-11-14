// SPIKE (never merged): two live runs under setFixedStep(1/60) are bit-identical, per policy.
import { chromium } from 'playwright';
import { serveStatic } from './static-server.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8131;
const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.warn(`  ! ${e.message}`));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.setItem('gravitas_welcome_seen_v1', '1'));
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.splashScreenEnded === true, { timeout: 20000 });
const out = [];
for (const scenario of ['solar-system', 'three-body-sensitivity-lab']) {
  for (const policy of ['S0', 'S1', 'S2', 'S3', 'S4']) {
    const r = await page.evaluate(
      async ({ policy, scenario }) => {
        const ui = await import('/js/ui.js');
        const ts = await import('/js/timestep.js');
        const render = await import('/js/render.js');
        const physics = await import('/js/physics.js');
        const run = async () => {
          ui.SETTINGS.preset_scenario = scenario;
          ui.initialize_simulation({ seed: 't7' });
          ts.setStepPolicy(policy);
          ts.setFrameLimit(240);
          ui.state.paused = false;
          ui.SETTINGS.paused = false;
          render.setFixedStep(1 / 60);
          await new Promise(res => {
            const tick = () => (ts.stepPolicyStats().frames >= 240 ? res() : requestAnimationFrame(tick));
            requestAnimationFrame(tick);
          });
          await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
          ui.state.paused = true;
          render.setFixedStep(0);
          ts.setFrameLimit(0);
          return JSON.stringify(['bh_list','stars','planets','gas_giants','asteroids','comets','neutron_stars','white_dwarfs','galaxies','debris'].map(l => (physics[l] || []).map(b => b.get_state()))) + '|' + physics.getSimulationTime();
        };
        const a = await run();
        const b = await run();
        return { identical: a === b, bytes: a.length, simTime: Number(a.split('|').pop()) };
      },
      { policy, scenario }
    );
    out.push({ scenario, policy, ...r });
  }
}
console.log(JSON.stringify(out));
await browser.close();
server.close?.();
process.exit(0);
