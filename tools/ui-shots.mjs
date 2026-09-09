#!/usr/bin/env node
// =============================================================================
// The interface, at every size and in both languages
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/ui-shots.mjs --out shots/ui-before
//   node tools/ui-shots.mjs --out shots/ui-after --only picker
//
// A UI change is a claim about what someone sees, and the only honest evidence
// for one is the same screen photographed on each side of it. The matrix is the
// one the brief asks for: a small phone, a large phone, a tablet, a short
// laptop, a common laptop, a desktop and a lecture display, each in English and
// in Spanish, because Spanish runs about a third longer and that is where a
// layout that only just fits stops fitting.
//
// The states are the ones this pass touches rather than every screen in the
// application: the sandbox as it opens, the object picker, an armed placement,
// the settings panel and a selected body.
// =============================================================================

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8131;
const SEED = 'ui-shots';

/** The window sizes the brief names, plus a lecture display. */
const VIEWPORTS = [
  { id: '320x700', width: 320, height: 700 },
  { id: '390x844', width: 390, height: 844 },
  { id: '768x1024', width: 768, height: 1024 },
  { id: '1024x700', width: 1024, height: 700 },
  { id: '1366x768', width: 1366, height: 768 },
  { id: '1440x900', width: 1440, height: 900 },
  { id: '1920x1080', width: 1920, height: 1080 },
];

const LOCALES = ['en', 'es'];

/**
 * The states.
 *
 * `open` is given the page and leaves the interface in the state to be
 * photographed. The menu button is pressed first everywhere: on a phone it is
 * what reveals the rail, and on a desktop it does nothing, so one path covers
 * every width without a branch that could photograph the wrong thing.
 */
const STATES = [
  { id: 'idle', open: null },
  {
    id: 'picker',
    open: async page => {
      await openRail(page);
      await page.click('#objectTypeBtn');
    },
  },
  {
    id: 'armed',
    open: async page => {
      await openRail(page);
      await page.click('#objectTypeBtn');
      await page.click('.object-picker-item[data-object-type="Comet"]');
    },
  },
  {
    id: 'settings',
    open: async page => {
      await openRail(page);
      await page.click('#settingsBtn');
    },
  },
  {
    id: 'inspector',
    open: async page => {
      // Clicked rather than called: showObjectInspector is not exported, and
      // going through the canvas is what a reader does anyway.
      const box = await page.locator('#simulationCanvas').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    },
  },
];

/** Reveal the control rail. A no-op above the phone breakpoint. */
async function openRail(page) {
  const toggle = page.locator('#mobileMenuToggle');
  if (await toggle.isVisible()) {
    const rail = page.locator('#mainControls');
    if (!(await rail.evaluate(el => el.classList.contains('is-open')))) {
      await toggle.click();
      await page.waitForTimeout(250);
    }
  }
}

const args = process.argv.slice(2);
const readFlag = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const outDir = resolve(ROOT, readFlag('--out') || 'shots/ui');
const only = readFlag('--only');

const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });

const manifest = [];

for (const locale of LOCALES) {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    page.on('pageerror', e => console.warn(`  ! ${e.message}`));

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.evaluate(id => {
      try {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
        localStorage.setItem('gravitas_locale', id);
      } catch {
        /* not required */
      }
    }, locale);

    for (const state of STATES) {
      if (only && state.id !== only) continue;

      // A reload between states rather than an undo of the last one. Closing a
      // popover by hand leaves the module-level flags behind it - whether
      // placement is armed, which type is current, whether the rail counts
      // itself as open - and a shot taken against those is a picture of the
      // previous state's leftovers.
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.splashScreenEnded === true, {
        timeout: 20000,
      });
      await page.waitForTimeout(1000);

      await page.evaluate(async seed => {
        const ui = await import('/js/ui.js');
        ui.SETTINGS.preset_scenario = 'Solar System';
        ui.initialize_simulation({ seed });
        ui.state.paused = true;
        document.getElementById('scenarioInfo')?.classList.add('hidden');
      }, SEED);
      await page.waitForTimeout(300);

      if (state.open) {
        await state.open(page);
        await page.waitForTimeout(400);
      }

      const name = `${state.id}-${viewport.id}-${locale}.png`;
      await page.screenshot({ path: join(outDir, name) });
      manifest.push({ state: state.id, viewport: viewport.id, locale, name });
      process.stdout.write(`  ${name}\n`);
    }

    await page.close();
  }
}

await writeFile(
  join(outDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);
await browser.close();
await server.close();
process.stdout.write(`\n${manifest.length} shots in ${outDir}\n`);
