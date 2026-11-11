// =============================================================================
// The mobile sweep (Prompt 283)
// -----------------------------------------------------------------------------
// Prompt 155 defined how a finger operates an instrument (DESIGN_SYSTEM.md,
// "Touch measurement"): place then nudge, the loupe, handles at the target
// size, the spacing and inline exceptions. This spec holds the whole to that
// at the two touch sizes the platform model names: a phone (375 x 812) and a
// tablet (768 x 1024), with touch emulation and a coarse pointer, in Chromium.
//
//   1. Targets   every interactive target on every page of the walk
//                inventory, on its states and on the surfaces a student
//                reaches (the lesson panel, the Observatory with an image
//                open, the 3-D lab, the mission lab): 24 px, or the spacing
//                or inline exception, or a browser-drawn control; e2e/
//                touchTargets.js names the rules. Nothing under 24 px
//                that is none of those passes.
//   2. Layout    one column at phone width on the four surfaces, nothing
//                scrolling sideways.
//   3. Touch     the image marks panel by finger: the precision trials
//                (IMAGE_MEASUREMENT_GATE.md's T2 bounds, on the production
//                panel), the loupe while a finger is down, on every image
//                task; apertures by handles; the plot cursor by touch.
//   4. Workflows the ten student workflows and five instrument workflows
//                (tools/mobile-workflows.json) walked by touch in both
//                languages.
//
// Emulation covers the viewport, the touch events, the coarse pointer and the
// phone user agent. It does not cover a real fingertip's contact area, a
// device's pixel density in the hand, the on-screen keyboard's effect on the
// viewport, or a mobile browser's own chrome: OFFLINE_AND_LOW_END.md says so,
// and no real device was measured (UNKNOWN in tools/evidence-status.json).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { open } from './sweepOpen.js';
import { measureTargets } from './touchTargets.js';

const contract = JSON.parse(
  readFileSync('tools/interaction-contract.json', 'utf8')
);
const inventory = contract.inventory;
const RECORD = 'tools/touch-targets.json';
const WRITE = process.env.GRAVITAS_TARGETS_WRITE === '1';

export const SIZES = [
  { id: 'phone', width: 375, height: 812 },
  { id: 'tablet', width: 768, height: 1024 },
];

/** Open a state's controls by finger, behind the phone's menu where the rail is. */
async function openState(page, controls) {
  for (const sel of controls) {
    const target = page.locator(sel).first();
    if (!(await target.isVisible())) {
      const menu = page.locator('#mobileMenuToggle');
      if (await menu.isVisible()) await menu.tap();
    }
    await target.tap();
  }
}

/** A frame of settled layout: the transport bar and the sheets stand on a measurement. */
const settle = page =>
  page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(r))
      )
  );

/** What a write run collects: one worker, so one process holds it all. */
const written = {};

for (const size of SIZES) {
  test.describe(`targets at ${size.id} width (${size.width} px, touch)`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: true,
      isMobile: true,
    });
    test.setTimeout(120_000);

    const rows = inventory.rows.filter(r => r.surface !== 'history-original');
    for (const row of rows) {
      test(`${row.surface} (${row.path})`, async ({ page }) => {
        await open(page, row.path, 'en');
        await settle(page);
        const m = await page.evaluate(measureTargets);
        written[`${size.id}:${row.surface}`] = m;
        expect(m.fail, 'targets under 24 px that no exception covers').toEqual(
          []
        );
      });
    }

    for (const state of inventory.states) {
      test(`${state.id} (state)`, async ({ page }) => {
        // What the state first saves, by finger, in the Library.
        for (const id of state.saved || []) {
          await open(page, `/library/?item=${encodeURIComponent(id)}`, 'en');
          await page.locator('[data-save]').tap();
          await expect(page.locator('[data-save]')).toHaveAttribute(
            'aria-pressed',
            'true'
          );
        }
        await open(page, state.path, 'en', state);
        await openState(page, state.open || []);
        await settle(page);
        const m = await page.evaluate(measureTargets);
        written[`${size.id}:${state.id}`] = m;
        expect(m.fail, 'targets under 24 px that no exception covers').toEqual(
          []
        );
      });
    }
  });
}

test.afterAll(() => {
  if (!WRITE || !Object.keys(written).length) return;
  const rec = JSON.parse(readFileSync(RECORD, 'utf8'));
  rec.measured = {};
  for (const [k, v] of Object.entries(written).sort(([a], [b]) =>
    a.localeCompare(b)
  ))
    rec.measured[k] = {
      targets: v.measured,
      atSize: v.ok,
      spacing: v.spacing,
      inline: v.inline,
      control: v.control,
      under44: v.under44,
    };
  writeFileSync(RECORD, `${JSON.stringify(rec, null, 2)}\n`);
});
