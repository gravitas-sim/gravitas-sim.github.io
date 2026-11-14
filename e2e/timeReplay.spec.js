// =============================================================================
// Time you can trust: one clock, a step, Replay and Rewind to here
// -----------------------------------------------------------------------------
// js/timeline.js, js/render.js, js/controls.js. The timeline used to keep a
// second sum of the elapsed time and repaint its label only on a recorded
// frame, so the label read up to 100 ms behind the Elapsed readout and never
// moved while the world was paused. There is one clock now; these tests read
// the two numbers a student reads and the full capture a lesson's entry and
// exit use.
//
// Thresholds are committed in tests/fixtures/time-controls/thresholds.json.
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const THRESHOLDS = JSON.parse(
  readFileSync(
    join(HERE, '../tests/fixtures/time-controls/thresholds.json'),
    'utf8'
  )
);
const TOL = THRESHOLDS.restore.relativeTolerance;

/** The timeline label and the Elapsed readout, as a student reads them. */
const shownClocks = page =>
  page.evaluate(() => {
    const dl = document.querySelector('#overlayStats .readout-metrics');
    const rows = [...(dl?.querySelectorAll('div') ?? [])];
    const elapsed = rows
      .find(r => /elapsed|transcurrido/i.test(r.textContent))
      ?.querySelector('dd')?.textContent;
    return {
      label: document.getElementById('timelineTime').textContent.trim(),
      elapsed: elapsed?.trim() ?? null,
    };
  });

/** Run a function in the page. */
const inApp = (page, fn, arg) => page.evaluate(fn, arg);

const loadRunning = async (page, app, key) => {
  await app.boot();
  await app.loadScenario(key, 'e2e', { run: true });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await import('/js/timeline.js')).getFrameCount()
      )
    )
    .toBeGreaterThan(8);
};

test.describe('one clock', () => {
  for (const [key, speedNote] of [
    ['solar-system', 'speed 1'],
    ['galilean-resonance', 'a high speed'],
  ]) {
    test(`the label and the Elapsed readout are one number (${key}, ${speedNote})`, async ({
      page,
      app,
    }) => {
      await loadRunning(page, app, key);
      await app.pressPause();
      await expect
        .poll(async () => {
          const s = await shownClocks(page);
          return s.label === s.elapsed;
        })
        .toBe(true);
      const parked = await inApp(page, async () => {
        const tl = await import('/js/timeline.js');
        const p = await import('/js/physics.js');
        tl.scrubTo(3);
        const seen = {
          clock: p.getSimulationTime(),
          sim: tl.getSimClock(),
        };
        return seen;
      });
      expect(parked.sim).toBe(parked.clock);
      await expect
        .poll(async () => {
          const s = await shownClocks(page);
          return s.label === s.elapsed;
        })
        .toBe(true);
    });
  }
});

test.describe('a step', () => {
  test('the period key takes one step at the current speed, and the bar says how big', async ({
    page,
    app,
  }) => {
    await loadRunning(page, app, 'solar-system');
    await app.pressPause();
    const before = await inApp(page, async () => {
      const p = await import('/js/physics.js');
      const ts = await import('/js/timestep.js');
      const ui = await import('/js/ui.js');
      return {
        clock: p.getSimulationTime(),
        size: ts.frameAdvance(ts.STEP_SECONDS, ui.SETTINGS.sim_speed, p.DT),
      };
    });
    await expect(page.locator('#timelineStepSize')).toContainText('1 step =');
    await page.keyboard.press('.');
    await expect
      .poll(() =>
        inApp(page, async () =>
          (await import('/js/physics.js')).getSimulationTime()
        )
      )
      .toBeCloseTo(before.clock + before.size, 9);
    await expect
      .poll(async () => {
        const s = await shownClocks(page);
        return s.label === s.elapsed;
      })
      .toBe(true);
  });

  test('it works in Step by step, where nothing runs by itself', async ({
    page,
    app,
  }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('gravitas_motion', 'step');
      } catch {
        /* storage unavailable */
      }
    });
    await app.boot();
    await expect(page.locator('#overlayStatus')).toHaveAttribute(
      'data-state',
      'paused'
    );
    const clock = () =>
      inApp(page, async () =>
        (await import('/js/physics.js')).getSimulationTime()
      );
    const t0 = await clock();
    await page.keyboard.press('.');
    await expect.poll(clock).toBeGreaterThan(t0);
    const t1 = await clock();
    await page.keyboard.press('.');
    await expect.poll(clock).toBeGreaterThan(t1);
    // And the step before it is somewhere to go back to.
    await page.keyboard.press(',');
    await expect(page.locator('#timelineLive')).toBeVisible();
    await page.keyboard.press('l');
    await expect(page.locator('#timelineLive')).toBeHidden();
  });
});

test.describe('looking back', () => {
  test('Replay and Escape leave the live state within the threshold', async ({
    page,
    app,
  }) => {
    await loadRunning(page, app, 'solar-system');
    await app.pressPause();
    await page.evaluate(() => {
      window.__before = null;
    });
    const before = await inApp(page, async () => {
      const ui = await import('/js/ui.js');
      const tl = await import('/js/timeline.js');
      const p = await import('/js/physics.js');
      window.__before = ui.captureShareState({
        kind: 'full',
        includeCamera: false,
        forExperiment: true,
      });
      return { clock: p.getSimulationTime(), frames: tl.getFrameCount() };
    });
    await page.keyboard.press(',');
    await expect(page.locator('#timelineReplay')).toBeVisible();
    await expect(page.locator('#timelineRewind')).toBeVisible();
    await expect(page.locator('#timelineRewind')).toHaveAttribute(
      'title',
      /dropped/
    );
    await page.locator('#timelineReplay').click();
    await expect
      .poll(() =>
        inApp(page, async () => (await import('/js/timeline.js')).isReplaying())
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        inApp(page, async () => (await import('/js/timeline.js')).isScrubbing())
      )
      .toBe(false);
    const after = await inApp(page, async () => {
      const ui = await import('/js/ui.js');
      const tl = await import('/js/timeline.js');
      const p = await import('/js/physics.js');
      const now = ui.captureShareState({
        kind: 'full',
        includeCamera: false,
        forExperiment: true,
      });
      const a = window.__before;
      const rel = (x, y) =>
        x === y
          ? 0
          : Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y), 1e-300);
      let w = a.b.length === now.b.length ? 0 : Infinity;
      a.b.forEach((s, i) => {
        const o = now.b[i];
        if (!o) return;
        w = Math.max(
          w,
          rel(s.pos.x, o.pos.x),
          rel(s.pos.y, o.pos.y),
          rel(s.vel.x, o.vel.x),
          rel(s.vel.y, o.vel.y),
          rel(s.mass, o.mass)
        );
      });
      return {
        clock: p.getSimulationTime(),
        frames: tl.getFrameCount(),
        worst: w,
        paused: ui.state.paused,
      };
    });
    expect(after.worst).toBeLessThan(TOL);
    expect(after.clock).toBe(before.clock);
    expect(after.frames).toBe(before.frames);
    // The world was paused when history was entered, and it is again.
    expect(after.paused).toBe(true);
  });

  test('Space while looking back is Return to live and puts the pause state back', async ({
    page,
    app,
  }) => {
    await loadRunning(page, app, 'solar-system');
    await app.pressPause();
    await page.keyboard.press(',');
    await expect(page.locator('#timelineLive')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.locator('#timelineLive')).toBeHidden();
    expect(await app.isPaused()).toBe(true);
  });

  test('Rewind to here makes the shown moment the world and says what it drops', async ({
    page,
    app,
  }) => {
    await loadRunning(page, app, 'solar-system');
    await app.pressPause();
    const frames = await inApp(page, async () =>
      (await import('/js/timeline.js')).getFrameCount()
    );
    await page.keyboard.press(',');
    await page.keyboard.press(',');
    await page.keyboard.press(',');
    const shown = await inApp(page, async () =>
      (await import('/js/physics.js')).getSimulationTime()
    );
    await app.press(page.locator('#timelineRewind'));
    await expect(page.locator('#timelineLive')).toBeHidden();
    const after = await inApp(page, async () => {
      const tl = await import('/js/timeline.js');
      const p = await import('/js/physics.js');
      return {
        clock: p.getSimulationTime(),
        frames: tl.getFrameCount(),
        last: tl.recordedFrames().at(-1).t,
      };
    });
    expect(after.clock).toBe(shown);
    expect(after.last).toBe(shown);
    expect(after.frames).toBeLessThan(frames);
  });

  test('the scrubber says where it is in words', async ({ page, app }) => {
    await loadRunning(page, app, 'solar-system');
    await app.pressPause();
    await expect(page.locator('#timelineScrubber')).toHaveAttribute(
      'aria-valuetext',
      'Live'
    );
    await page.keyboard.press(',');
    await expect(page.locator('#timelineScrubber')).toHaveAttribute(
      'aria-valuetext',
      /before live, frame \d+ of \d+/
    );
  });

  test('Tab reaches Replay and Rewind to here from the keyboard', async ({
    page,
    app,
  }) => {
    await loadRunning(page, app, 'solar-system');
    await app.pressPause();
    await page.keyboard.press(',');
    await page.locator('#timelinePlay').focus();
    const reached = new Set();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.id);
      reached.add(id);
    }
    for (const id of [
      'timelineStepBack',
      'timelineStepFwd',
      'timelineScrubber',
      'timelineLive',
      'timelineReplay',
      'timelineRewind',
    ]) {
      expect(reached, `Tab reaches #${id}`).toContain(id);
    }
  });
});

test.describe('the capture on leaving live', () => {
  test('costs under the committed threshold on the 255-body star-cluster', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario(THRESHOLDS.capture.scenario, 'e2e', { run: false });
    const { bodies, median } = await inApp(page, async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      const n = [
        'bh_list',
        'planets',
        'stars',
        'gas_giants',
        'asteroids',
        'comets',
        'neutron_stars',
        'white_dwarfs',
        'galaxies',
      ].reduce((a, k) => a + p[k].length, 0);
      const times = [];
      for (let i = 0; i < 23; i++) {
        const t0 = performance.now();
        ui.captureShareState({
          kind: 'full',
          includeCamera: false,
          forExperiment: true,
        });
        times.push(performance.now() - t0);
      }
      const rest = times.slice(3).sort((a, b) => a - b);
      return { bodies: n, median: rest[Math.floor(rest.length / 2)] };
    });
    expect(bodies).toBe(THRESHOLDS.capture.bodies);
    expect(median).toBeLessThan(THRESHOLDS.capture.maxMilliseconds);
  });
});
