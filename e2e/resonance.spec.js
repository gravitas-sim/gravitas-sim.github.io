// =============================================================================
// When Orbits Lock, end to end
// -----------------------------------------------------------------------------
// The unit tests cover the analysis and tools/physics-checks.mjs covers the
// physics. What is left is the claim the lesson makes to a student: that they
// can load these scenarios in this browser, watch, and get the four verdicts.
//
// The instruments sample the live world once per drawn frame, so everything
// here is genuinely the simulation running. That makes the waits long and the
// timeouts generous, and it makes the order matter: the Trojan tadpole reaches
// a verdict in about a minute, Pluto's libration in about ninety seconds, and
// the Laplace argument takes three and a half. Only the first two are asserted
// as full librations; the Galilean case is asserted as far as its confinement,
// which is what the lesson itself claims for a run of that length.
//
// Serial, because these are long simulation runs and four of them competing
// for cores on a loaded machine slows the simulated clock enough to change what
// the instruments have had time to see.
// =============================================================================

import { test, expect } from './fixtures.js';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'test-results', 'resonance');

test.describe.configure({ mode: 'serial' });

/**
 * Load a resonance scenario and expose what the instruments need.
 *
 * The widgets are handed a lesson context by js/investigations.js; outside a
 * lesson there is none, so this builds the same shape. `window.__res` is then
 * a synchronous handle - every poll below reads it without awaiting an import,
 * because an async predicate returns a Promise and every Promise is truthy.
 */
async function loadResonanceScenario(page, app, key) {
  await app.loadScenario(key, 'resonance-e2e');
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    const widgets = await import('/js/resonanceWidgets.js');
    const recorder = await import('/js/resonance/recorder.js');
    const elements = await import('/js/resonance/elements.js');
    recorder.recorder.reset();

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 320;

    const context = () => ({
      bodies: [
        ...physics.stars,
        ...physics.planets,
        ...physics.gas_giants,
        ...physics.bh_list,
      ],
      G: ui.SETTINGS.gravitational_constant,
      clock: () => physics.getSimulationTime(),
    });

    // Drawing is what feeds the recorder, and the panel draws every frame. The
    // loop stands in for the panel so the instruments accumulate a history
    // whether or not a lesson is open.
    let spec = {};
    const widget = id => widgets.RESONANCE_WIDGETS.find(w => w.id === id);
    const pump = () => {
      try {
        widget('resonance-angle').draw(canvas, {}, context(), spec);
      } catch {
        /* a half-built world between scenarios */
      }
      window.__res.frames++;
      window.requestAnimationFrame(pump);
    };

    window.__res = {
      frames: 0,
      clock: () => physics.getSimulationTime(),
      /** Point the pump at a different argument. */
      watch(next) {
        spec = next || {};
      },
      angle(s) {
        return widgets.measureAngle(context(), s || spec);
      },
      frame(s) {
        const m = widgets.measureFrame(
          context(),
          s || { secondary: 'Jupiter' }
        );
        if (!m.ready) return { ready: false, reason: m.reason };
        return {
          ready: true,
          bodies: [...m.tracks.keys()],
          points: m.points,
        };
      },
      /**
       * Each co-orbital body's classification, by name.
       *
       * The same computation the frame instrument's readout does, returned as
       * data. Asserting on this rather than on the sentence it prints: the
       * sentence is translated, and a suite that pinned it would fail in
       * Spanish for no reason at all.
       */
      frameVerdicts(s) {
        const m = widgets.measureFrame(
          context(),
          s || { secondary: 'Jupiter' }
        );
        if (!m.ready) return null;
        const secondary = m.secondary.name;
        let sum = 0;
        let n = 0;
        for (const row of m.series) {
          const period = row.el[secondary]?.period;
          if (Number.isFinite(period) && period > 0) {
            sum += period;
            n++;
          }
        }
        const reference = n ? sum / n : NaN;
        const out = {};
        for (const body of m.others) {
          const samples = m.series
            .map(row => {
              const e = row.el[body.name];
              const sec = row.el[secondary];
              return e && sec
                ? {
                    t: row.t,
                    phi: elements.wrap360(e.trueLongitude - sec.trueLongitude),
                  }
                : null;
            })
            .filter(Boolean);
          const v = elements.classifyAngle(samples, {
            referencePeriod: reference,
          });
          out[body.name] = {
            state: v.state,
            reason: v.reason,
            centre: v.centre,
            amplitude: v.amplitude,
            span: v.span,
            cycles: v.observedCycles,
          };
        }
        return out;
      },
      conjunctions(s) {
        const m = widgets.measureConjunctions(context(), s);
        return m.ready
          ? { ready: true, count: m.events.length, anomalies: m.anomalies }
          : { ready: false, reason: m.reason };
      },
      readout(id, s) {
        return widget(id)
          .readout({}, context(), s || spec)
          .map(r => `${r.label}: ${r.value}`);
      },
      bodies() {
        return context().bodies.map(b => b.name);
      },
    };
    window.requestAnimationFrame(pump);
  });
  await page.waitForFunction(() => window.__res.frames > 5, null, {
    timeout: 30_000,
  });
}

/** Wait until the instrument's verdict is one of `states`. */
async function waitForVerdict(page, states, timeout) {
  await page.waitForFunction(
    wanted => {
      const v = window.__res.angle().verdict;
      return Boolean(v) && wanted.includes(v.state);
    },
    states,
    { timeout }
  );
  return page.evaluate(() => {
    const v = window.__res.angle().verdict;
    return {
      state: v.state,
      reason: v.reason,
      centre: v.centre,
      amplitude: v.amplitude,
      period: v.period,
      turns: v.turns.length,
    };
  });
}

test.describe('the resonance scenarios', () => {
  test('all four load with the bodies the lesson names', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.boot();

    const expected = {
      'Galilean Resonance': ['Jupiter', 'Io', 'Europa', 'Ganymede', 'Callisto'],
      'Broken Laplace Resonance': [
        'Jupiter',
        'Io',
        'Europa',
        'Ganymede',
        'Callisto',
      ],
      'Pluto and Neptune': ['Sun', 'Neptune', 'Pluto', 'Unbound Wanderer'],
      'Jupiter Trojans': [
        'Sun',
        'Jupiter',
        'L4 probe',
        'Patroclus',
        'L3 probe',
        'Wide orbit probe',
      ],
    };

    for (const [key, names] of Object.entries(expected)) {
      await app.loadScenario(key, 'resonance-e2e', { run: false });
      const found = await page.evaluate(async () => {
        const p = await import('/js/physics.js');
        return [...p.stars, ...p.planets, ...p.gas_giants].map(b => b.name);
      });
      for (const name of names) expect(found).toContain(name);
      // Nothing generated: these scenarios place every body by hand and a
      // stray randomly named planet would join the measurements.
      expect(found.length).toBe(names.length);
    }
  });

  test('the scenarios set the integrator and substep they were validated at', async ({
    page,
    app,
  }) => {
    await app.boot();
    // The Laplace libration amplitude reported by symplectic Euler at a step
    // of 2 is a third of the converged value, so these two settings are the
    // difference between a measurement and an artefact.
    for (const key of [
      'Galilean Resonance',
      'Pluto and Neptune',
      'Jupiter Trojans',
    ]) {
      await app.loadScenario(key, 'resonance-e2e', { run: false });
      const settings = await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        return {
          integrator: ui.SETTINGS.integrator,
          maxStep: ui.SETTINGS.max_timestep,
          merging: ui.SETTINGS.enable_star_merging,
          mutual: ui.SETTINGS.mutual_gravity,
        };
      });
      expect(settings.integrator).toBe('Velocity Verlet');
      expect(settings.maxStep).toBeGreaterThan(0);
      expect(settings.merging).toBe(false);
      expect(settings.mutual).toBe(true);
    }
  });
});

test.describe('the instruments against a live world', () => {
  test('Jupiter’s Trojans: an equilibrium, a tadpole and a circulation', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(420_000);
    await app.boot();
    await loadResonanceScenario(page, app, 'Jupiter Trojans');

    // The rotating frame is the only view in which any of this is visible.
    await page.waitForFunction(() => window.__res.frame().ready, null, {
      timeout: 60_000,
    });
    const frame = await page.evaluate(() => window.__res.frame());
    expect(frame.bodies).toEqual(
      expect.arrayContaining([
        'L4 probe',
        'Patroclus',
        'L3 probe',
        'Wide orbit probe',
      ])
    );
    // L4 and L5 are the corners of the equilateral triangles, exactly.
    expect(frame.points.L4.x).toBeCloseTo(0.5, 6);
    expect(frame.points.L4.y).toBeCloseTo(Math.sqrt(3) / 2, 6);

    // The wide probe is not co-orbital: it goes right round, and quickly.
    await page.evaluate(() =>
      window.__res.watch({ inner: 'Jupiter', outer: 'Wide orbit probe' })
    );
    const wide = await waitForVerdict(page, ['circulation'], 240_000);
    expect(wide.state).toBe('circulation');

    // Patroclus librates about L5, which is 60 degrees behind Jupiter and
    // therefore near 300 in the instrument's 0-360 convention.
    await page.evaluate(() =>
      window.__res.watch({ inner: 'Jupiter', outer: 'Patroclus' })
    );
    const tadpole = await waitForVerdict(page, ['libration'], 300_000);
    expect(tadpole.state).toBe('libration');
    expect(Math.abs(((tadpole.centre - 300 + 540) % 360) - 180)).toBeLessThan(
      15
    );
    expect(tadpole.amplitude).toBeGreaterThan(10);
    expect(tadpole.amplitude).toBeLessThan(45);

    // ...and the body sitting exactly on L4 has not moved at all. The
    // classifier needs twenty Jupiter years of record before it will say so,
    // and the two waits above have supplied more than that - but wait on the
    // verdict rather than assume it, because there is no reason to race two
    // things driven by the same record.
    await page.waitForFunction(
      () => {
        const v = window.__res.frameVerdicts();
        return (
          Boolean(v) && v['L4 probe'] && v['L4 probe'].reason !== 'too-short'
        );
      },
      null,
      { timeout: 120_000 }
    );
    const verdicts = await page.evaluate(() => window.__res.frameVerdicts());
    expect(verdicts['L4 probe'].reason).toBe('stationary');
    expect(verdicts['L4 probe'].span).toBeLessThan(0.25);
    expect(verdicts['L3 probe'].span).toBeGreaterThan(100);

    // The readout renders a sentence for each of them, and never a raw message
    // key - which is what a missing translation looks like on screen. The
    // sentences themselves are not asserted: they are translated, and a suite
    // that pinned them would fail in Spanish for no reason.
    const rows = await page.evaluate(() =>
      window.__res.readout('resonance-frame', { secondary: 'Jupiter' })
    );
    expect(rows.join('\n')).toMatch(/L4 probe/);
    for (const row of rows) expect(row).not.toMatch(/resW\./);
  });

  test('Pluto: the argument librates about 180 and the conjunctions cluster', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(420_000);
    await app.boot();
    await loadResonanceScenario(page, app, 'Pluto and Neptune');
    await page.evaluate(() => window.__res.watch({ argument: 'pluto' }));

    const v = await waitForVerdict(page, ['libration'], 300_000);
    expect(v.state).toBe('libration');
    // 180 degrees is the statement that every conjunction happens at Pluto's
    // aphelion, which is the whole protection mechanism.
    expect(Math.abs(((v.centre - 180 + 540) % 360) - 180)).toBeLessThan(12);
    expect(v.amplitude).toBeGreaterThan(60);
    expect(v.amplitude).toBeLessThan(100);

    // The same fact, measured a different way: where Pluto sits on its own
    // orbit at each line-up.
    const conj = await page.evaluate(() =>
      window.__res.conjunctions({ inner: 'Neptune', outer: 'Pluto' })
    );
    expect(conj.ready).toBe(true);
    expect(conj.count).toBeGreaterThan(10);
    expect(Math.abs(conj.anomalies.mean - 180)).toBeLessThan(30);

    // And the third body, on nearly the same orbit but outside the resonance,
    // is doing the opposite in the same run. The ratio is named rather than
    // detected: the question is whether this body shares Pluto's 3:2, and its
    // own measured ratio of 1.59 is nearest to 8:5, which is a different
    // argument and a different question.
    await page.evaluate(() =>
      window.__res.watch({
        inner: 'Neptune',
        outer: 'Unbound Wanderer',
        p: 3,
        q: 2,
      })
    );
    const rogue = await waitForVerdict(page, ['circulation'], 120_000);
    expect(rogue.state).toBe('circulation');
  });

  test('the Galilean moons: ratios measured, and the argument confined', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(420_000);
    await app.boot();
    await loadResonanceScenario(page, app, 'Galilean Resonance');
    await page.evaluate(() => window.__res.watch({ argument: 'laplace' }));

    // The periods first. These settle within a few Io orbits.
    await page.waitForFunction(
      () => window.__res.readout('resonance-periods').length > 4,
      null,
      { timeout: 120_000 }
    );
    const periods = await page.evaluate(() =>
      window.__res.readout('resonance-periods')
    );
    const text = periods.join('\n');
    expect(text).toMatch(/Io: 1\.76\d+ days/);
    expect(text).toMatch(/Callisto: 16\.6\d+ days/);
    // The ratio row quotes the nearest small-integer ratio and how far off it
    // is, which is the measurement the whole lesson is built on.
    expect(text).toMatch(/nearest 2:1, off by 0\.3\d+%/);
    expect(text).toMatch(/nearest 7:3, off by 0\.0\d+%/);

    // Then the argument. Over a run of this length the instrument reports the
    // angle as confined and explicitly declines to call it a libration, which
    // is what the lesson says it will do.
    await page.waitForFunction(
      () => {
        const v = window.__res.angle().verdict;
        return v && v.reason !== 'too-few-samples' && v.reason !== 'too-short';
      },
      null,
      { timeout: 240_000 }
    );
    const v = await page.evaluate(() => {
      const m = window.__res.angle();
      return {
        state: m.verdict.state,
        reason: m.verdict.reason,
        span: m.verdict.span,
        label: m.arg.label,
      };
    });
    expect(v.label).toBe('λ(Io) − 3λ(Europa) + 2λ(Ganymede)');
    // Whatever it has decided by now, the angle has not gone round: that is
    // the observation, and it holds from the first seconds onwards.
    expect(v.span).toBeLessThan(180);
    expect(['confined', 'one-reversal', 'reversals']).toContain(v.reason);

    // Callisto's 7:3 is the counter-example, and it must not be reported as a
    // libration however long this has been running.
    const callisto = await page.evaluate(() => {
      const m = window.__res.angle({ inner: 'Ganymede', outer: 'Callisto' });
      return { label: m.arg.label, state: m.verdict.state, ratio: m.arg.ratio };
    });
    expect(callisto.ratio).toMatchObject({ p: 7, q: 3 });
    expect(callisto.state).not.toBe('circulation');
    if (callisto.state === 'libration') {
      throw new Error(
        'Callisto’s 7:3 argument was reported as a libration; it circulates ' +
          'once every three thousand Io orbits and is in no resonance.'
      );
    }
  });

  test('the broken control circulates, and quickly', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    await app.boot();
    await loadResonanceScenario(page, app, 'Broken Laplace Resonance');
    await page.evaluate(() => window.__res.watch({ argument: 'laplace' }));

    const v = await waitForVerdict(page, ['circulation'], 240_000);
    expect(v.state).toBe('circulation');
    expect(v.period).toBeGreaterThan(0);
  });
});

test.describe('the lesson', () => {
  test('runs from the browser to a report', async ({ page, app }, testInfo) => {
    testInfo.setTimeout(600_000);
    mkdirSync(OUT, { recursive: true });

    await app.boot();
    await app.dismissFrontDoor();
    await page
      .locator('#mobileMenuToggle')
      .click()
      .catch(() => {});
    await app.railControl('investigationsBtn');
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="when-orbits-lock"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    const total = await page.evaluate(async () => {
      const data = await import('/js/data/investigations.js');
      return data.getInvestigation('when-orbits-lock').steps.length;
    });
    expect(total).toBeGreaterThanOrEqual(25);
    expect(total).toBeLessThanOrEqual(35);

    const stepNumber = () =>
      page.evaluate(() => {
        const el = document.getElementById('investigationProgressText');
        const m = /(\d+)/.exec(el?.textContent || '');
        return m ? Number(m[1]) : 0;
      });

    const next = page.locator('#investigationNext');
    const finish = page.locator('#investigationFinish');

    for (let i = 0; i < total + 2; i++) {
      if (await finish.isVisible().catch(() => false)) break;
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const fields = page.locator('#investigationBody input[data-field]');
      const fieldCount = await fields.count();
      for (let f = 0; f < fieldCount; f++) {
        const input = fields.nth(f);
        if (!(await input.inputValue())) await input.fill('180');
      }
      const boxes = page.locator('#investigationBody input[type="checkbox"]');
      const n = await boxes.count();
      for (let b = 0; b < n; b++) {
        const box = boxes.nth(b);
        if (!(await box.isChecked())) await box.check();
      }
      const at = await stepNumber();
      await next.click();
      await expect
        .poll(
          async () =>
            (await finish.isVisible().catch(() => false)) ||
            (await stepNumber()) > at,
          { timeout: 30_000 }
        )
        .toBe(true);
    }

    await expect(finish).toBeVisible({ timeout: 30_000 });
    await page.locator('#investigationName').fill('Resonance E2E');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('#investigationDownload').click(),
    ]);
    const path = join(OUT, 'resonance-report.pdf');
    await download.saveAs(path);
    expect(statSync(path).size).toBeGreaterThan(2000);
  });

  test('every instrument the lesson names draws inside the panel', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(300_000);
    await app.boot();
    await app.dismissFrontDoor();
    await page
      .locator('#mobileMenuToggle')
      .click()
      .catch(() => {});
    await app.railControl('investigationsBtn');
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="when-orbits-lock"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    // Walk to each step that names an instrument and check the canvas is drawn
    // and the readout says something. A widget that threw would leave the
    // canvas blank and the readout hidden, which is what a student would see.
    const toolSteps = await page.evaluate(async () => {
      const data = await import('/js/data/investigations.js');
      const inv = data.getInvestigation('when-orbits-lock');
      return inv.steps
        .map((s, i) => (s.tool ? { index: i, id: s.tool.id } : null))
        .filter(Boolean);
    });
    expect(new Set(toolSteps.map(s => s.id)).size).toBe(4);

    const seen = new Set();
    const next = page.locator('#investigationNext');
    for (let i = 0; i < 40 && seen.size < 4; i++) {
      const id = await page.evaluate(() => {
        const canvas = document.getElementById('investigationToolCanvas');
        return canvas && canvas.offsetParent !== null
          ? document.getElementById('investigationToolTitle')?.textContent || ''
          : '';
      });
      if (id) {
        await expect(page.locator('#investigationToolReadout')).toBeVisible({
          timeout: 30_000,
        });
        await expect(
          page.locator('#investigationToolReadout .inv-tool-row').first()
        ).toBeVisible({ timeout: 30_000 });
        seen.add(id);
      }
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const boxes = page.locator('#investigationBody input[type="checkbox"]');
      const n = await boxes.count();
      for (let b = 0; b < n; b++) {
        const box = boxes.nth(b);
        if (!(await box.isChecked())) await box.check();
      }
      const fields = page.locator('#investigationBody input[data-field]');
      const fc = await fields.count();
      for (let f = 0; f < fc; f++) {
        const input = fields.nth(f);
        if (!(await input.inputValue())) await input.fill('180');
      }
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(400);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});
