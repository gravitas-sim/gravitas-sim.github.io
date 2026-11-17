// =============================================================================
// The sandbox workspace at first sight: what is at hand, and the scene clear
// -----------------------------------------------------------------------------
// DESIGN_SYSTEM.md, "Workspace for doing". Three things are held here.
//
//   1. The scene. On the phone sizes of criterion I-8 (375x812 and 412x915),
//      on each of three scenes, every body that lies in the viewport is the
//      canvas's own at its screen point (no panel is over it) and at least a
//      third of the viewport height is open canvas; the judge is the one the
//      criteria file runs on the lesson pilots (tools/visual-criteria.mjs).
//   2. At hand. Run, step, speed and the clock are in the transport bar, and
//      Fit view and Undo above the rail's sections, without opening anything.
//   3. About this scenario. A closed disclosure in the readout panel: closed
//      for a new scenario, left as the reader set it when the same scenario is
//      rebuilt, hidden when the world has no scenario of its own.
// =============================================================================

import { test, expect } from './fixtures.js';
import { judgeLayout } from '../tools/visual-criteria.mjs';

const SCENES = [
  'solar-system',
  'galilean-resonance',
  'circumbinary-planet-lab',
];
const PHONES = [
  { width: 375, height: 812 },
  { width: 412, height: 915 },
];

/** Where the bodies are on the screen, what covers them and the open canvas. */
const measureScene = () =>
  Promise.all([import('/js/ui.js'), import('/js/physics.js')]).then(
    ([ui, physics]) => {
      const canvas = document.getElementById('simulationCanvas');
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = canvas.width / canvas.clientWidth;
      const { state } = ui;
      const STEP = 8;
      const rows = [];
      for (let y = STEP / 2; y < vh; y += STEP) {
        let open = 0;
        let n = 0;
        for (let x = STEP / 2; x < vw; x += STEP) {
          n++;
          if (document.elementFromPoint(x, y) === canvas) open++;
        }
        rows.push(open / n);
      }
      let best = 0;
      let run = 0;
      for (const share of rows) {
        if (share >= 0.6) best = Math.max(best, ++run);
        else run = 0;
      }
      const bodies = [];
      let outside = 0;
      for (const list of [
        'bh_list',
        'stars',
        'planets',
        'gas_giants',
        'asteroids',
        'comets',
        'neutron_stars',
        'white_dwarfs',
      ]) {
        for (const b of physics[list]) {
          if (!b.alive) continue;
          const sx =
            (canvas.width / 2 +
              state.pan.x +
              (b.pos.x - state.frameOffset.x) * state.zoom) /
            scale;
          const sy =
            (canvas.height / 2 +
              state.pan.y -
              (b.pos.y - state.frameOffset.y) * state.zoom) /
            scale;
          if (!(sx >= 0 && sx <= vw && sy >= 0 && sy <= vh)) {
            outside++;
            continue;
          }
          const top = document.elementFromPoint(sx, sy);
          bodies.push({
            role: b.name || list,
            x: Math.round(sx),
            y: Math.round(sy),
            inside: true,
            visible: top === canvas,
            coveredBy: top === canvas ? null : top?.id || top?.className,
          });
        }
      }
      return { vw, vh, bodies, outside, openRunPx: best * STEP };
    }
  );

test.describe('the first screen leaves the scene clear', () => {
  for (const scene of SCENES) {
    for (const size of PHONES) {
      test(`${scene} at ${size.width}x${size.height}`, async ({
        page,
        app,
      }) => {
        await page.setViewportSize(size);
        await app.boot();
        await app.loadScenario(scene, 'e2e', { run: false });
        await expect(page.locator('#scenarioInfoBox')).toHaveJSProperty(
          'open',
          false
        );
        const m = await page.evaluate(measureScene);
        const verdict = judgeLayout(m, { kind: 'phone', subject: 'scene' });
        expect(verdict.reasons, JSON.stringify(m.bodies)).toEqual([]);
      });
    }
  }
});

test.describe('what is at hand needs no opening', () => {
  for (const size of [{ width: 1366, height: 800 }, ...PHONES]) {
    test(`at ${size.width}x${size.height}`, async ({ page, app }) => {
      await page.setViewportSize(size);
      await app.boot();
      const wide = size.width >= 768;
      const ids = [
        'timelinePlay',
        'timelineStepBack',
        'timelineStepFwd',
        'timelineTime',
        'speedUpBtn',
        ...(wide ? ['slowDownBtn', 'speedDisplay'] : []),
      ];
      for (const id of ids) {
        const box = await page.locator(`#${id}`).boundingBox();
        expect(box, id).not.toBeNull();
        expect(box.y, id).toBeGreaterThan(size.height / 2);
        expect(box.y + box.height, id).toBeLessThanOrEqual(size.height);
      }
      if (wide) {
        // Fit view and Undo stand above the rail's closed sections.
        for (const id of ['resetViewBtn', 'undoBtn']) {
          await expect(page.locator(`#${id}`), id).toBeVisible();
          expect(
            await page
              .locator(`#${id}`)
              .evaluate(el => !!el.closest('.rail-section'))
          ).toBe(false);
        }
      }
    });
  }

  test('the speed buttons climb the existing ladder and the phone button wraps', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await app.boot();
    const speed = () =>
      page.evaluate(async () => (await import('/js/ui.js')).SETTINGS.sim_speed);
    await page.evaluate(async () => {
      (await import('/js/ui.js')).SETTINGS.sim_speed = 4.5;
    });
    await page.locator('#speedUpBtn').click();
    expect(await speed()).toBe(5);
    await expect(page.locator('#speedUpBtn')).toHaveAttribute(
      'data-speed',
      '5.0×'
    );
    await page.locator('#speedUpBtn').click();
    expect(await speed()).toBe(1);
    await expect(page.locator('#slowDownBtn')).toBeHidden();
  });
});

test.describe('About this scenario', () => {
  test('closed for a new scenario, kept as set on a rebuild, hidden when blank', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('solar-system', 'e2e', { run: false });
    const box = page.locator('#scenarioInfoBox');
    await expect(box).toBeVisible();
    await expect(box).toHaveJSProperty('open', false);
    await expect(page.locator('#scenarioInfoTitle')).toHaveText('Solar System');

    await box.locator('summary').click();
    await expect(box).toHaveJSProperty('open', true);
    await expect(page.locator('#scenarioInfoSummary')).not.toBeEmpty();

    await app.railControl('refreshScenarioBtn');
    await page.locator('#refreshScenarioBtn').click();
    await expect(box).toHaveJSProperty('open', true);

    await app.loadScenario('galilean-resonance', 'e2e', { run: false });
    await expect(box).toHaveJSProperty('open', false);
    await expect(page.locator('#scenarioInfoTitle')).not.toHaveText(
      'Solar System'
    );

    await app.railControl('cleanSimBtn');
    await page.locator('#cleanSimBtn').click();
    await expect(box).toBeHidden();
  });

  test('it speaks Spanish after a language change', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('solar-system', 'e2e', { run: false });
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es', { persist: false });
    });
    await expect(page.locator('#scenarioInfoBox summary')).toHaveText(
      'Acerca de este escenario'
    );
  });
});
