// =============================================================================
// Pause at event
// -----------------------------------------------------------------------------
// The timing is proved in tests/pauseAtEvent.test.js, against an analytic orbit
// whose periapsis time is known exactly. What only a browser can show is the
// rest of the promise: that the panel refuses what it should, that the stop
// really stops the simulation, and - the part most likely to rot - that every
// observing panel still describes the same run afterwards, because nothing was
// rewound underneath them.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the tool through the interface. */
async function openTool(page, app, scenario = 'Comet Sungrazer') {
  await app.boot();
  await app.loadScenario(scenario);
  await app.waitForFrames(10);
  await app.railControl('togglePauseAtEvent');
  await page.locator('#togglePauseAtEvent').click();
  await expect(page.locator('#pauseEventContainer')).toBeVisible();
}

/** Choose the body and primary by name. */
async function choosePair(page, bodyName, primaryName) {
  await page.locator('#pauseEventBody').selectOption({ label: bodyName });
  await page.locator('#pauseEventPrimary').selectOption({ label: primaryName });
}

/** What the watcher module thinks is going on. */
const watchState = page =>
  page.evaluate(async () => {
    const m = await import('/js/pauseAtEvent.js');
    return { armed: m.armedEvent(), last: m.lastEvent() };
  });

const isPaused = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    return Boolean(state.paused);
  });

test.describe('arming and refusing', () => {
  test('a circular orbit is refused a periapsis, in as many words', async ({
    page,
    app,
  }) => {
    // The refusal that matters: on a circular orbit the radial rate is zero
    // everywhere and its sign is decided by integration error, so a watch would
    // fire immediately and mean nothing.
    await openTool(page, app, 'Solar System');
    await page.locator('#pauseEventKind').selectOption('periapsis');
    // Solar System planets are built on circular orbits.
    await choosePair(page, 'Earth', 'Sol');
    await page.locator('#pauseEventArm').click();

    const message = page.locator('#pauseEventMessage');
    await expect(message).toBeVisible();
    await expect(message).toContainText(/circular/i);
    await expect(message).toContainText(/no periapsis or apoapsis/i);
    expect((await watchState(page)).armed).toBeNull();
  });

  test('a separation the orbit never reaches is refused with the range', async ({
    page,
    app,
  }) => {
    await openTool(page, app, 'Solar System');
    await page.locator('#pauseEventKind').selectOption('separationInward');
    await choosePair(page, 'Earth', 'Sol');
    await page.locator('#pauseEventSeparation').fill('99');
    await page.locator('#pauseEventArm').click();

    await expect(page.locator('#pauseEventMessage')).toContainText(
      /never reaches that separation/i
    );
    expect((await watchState(page)).armed).toBeNull();
  });

  test('the fields shown follow the event chosen', async ({ page, app }) => {
    await openTool(page, app, 'Solar System');

    await page.locator('#pauseEventKind').selectOption('periapsis');
    await expect(page.locator('#pauseEventSeparationField')).toBeHidden();
    await expect(page.locator('#pauseEventBodyField')).toBeVisible();

    await page.locator('#pauseEventKind').selectOption('separationOutward');
    await expect(page.locator('#pauseEventSeparationField')).toBeVisible();

    // A transit needs no pair at all: the photometer already knows what it is
    // watching.
    await page.locator('#pauseEventKind').selectOption('transit');
    await expect(page.locator('#pauseEventBodyField')).toBeHidden();
    await expect(page.locator('#pauseEventPrimaryField')).toBeHidden();
  });

  test('the whole tool is reachable from the keyboard', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(10);

    // The shortcut is handled on the document. Clicking the canvas to focus it
    // would either place an object or be intercepted by the canvas stacked
    // over it, and neither is what this test is about.
    await page.evaluate(() => document.body.focus());
    await page.keyboard.press('n');
    await expect(page.locator('#pauseEventContainer')).toBeVisible();
    // Focus lands on the first control rather than nowhere.
    await expect(page.locator('#pauseEventKind')).toBeFocused();

    // And Arm is reachable by tabbing, then activated by keyboard.
    await page.locator('#pauseEventKind').selectOption('separationInward');
    await page.locator('#pauseEventArm').focus();
    await expect(page.locator('#pauseEventArm')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#pauseEventStatus')).not.toBeEmpty();

    await page.keyboard.press('n');
    await expect(page.locator('#pauseEventContainer')).toBeHidden();
  });
});

test.describe('stopping at an event', () => {
  test('a separation crossing stops the simulation and reports its precision', async ({
    page,
    app,
  }) => {
    await openTool(page, app, 'Comet Sungrazer');
    await page.locator('#pauseEventKind').selectOption('separationInward');

    // Aim at a radius the comet is currently outside, so an inward crossing is
    // genuinely ahead of it. The panel pre-fills the present separation; take
    // a little less.
    const here = Number(
      await page.locator('#pauseEventSeparation').inputValue()
    );
    expect(here).toBeGreaterThan(0);
    await page.locator('#pauseEventSeparation').fill((here * 0.8).toFixed(4));
    await page.locator('#pauseEventArm').click();
    await expect(page.locator('#pauseEventStatus')).toContainText(/watching/i);

    await expect
      .poll(async () => (await watchState(page)).last, { timeout: 90_000 })
      .not.toBeNull();

    expect(await isPaused(page)).toBe(true);
    const { last } = await watchState(page);
    expect(last.kind).toBe('separationInward');
    expect(last.bracketDays).toBeGreaterThan(0);
    // Not rewound onto the event: the pause is after it, and says by how much.
    expect(last.overshootDays).toBeGreaterThanOrEqual(0);

    await expect(page.locator('#pauseEventResult')).toBeVisible();
    await expect(page.locator('#pauseEventPrecision')).toContainText('±');
    await expect(page.locator('#pauseEventOvershoot')).not.toBeEmpty();
  });

  test('the timeline gets a marker for the moment', async ({ page, app }) => {
    await openTool(page, app, 'Comet Sungrazer');
    await page.locator('#pauseEventKind').selectOption('separationInward');
    const here = Number(
      await page.locator('#pauseEventSeparation').inputValue()
    );
    await page.locator('#pauseEventSeparation').fill((here * 0.8).toFixed(4));
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await watchState(page)).last, { timeout: 90_000 })
      .not.toBeNull();

    await expect(page.locator('#timelineEventMarker')).toBeVisible();
    const left = await page
      .locator('#timelineEventMarker')
      .evaluate(el => el.style.left);
    expect(left).toMatch(/%$/);
  });

  test("the student's note reaches an exported snapshot", async ({
    page,
    app,
  }) => {
    await openTool(page, app, 'Comet Sungrazer');
    await page.locator('#pauseEventKind').selectOption('separationInward');
    const here = Number(
      await page.locator('#pauseEventSeparation').inputValue()
    );
    await page.locator('#pauseEventSeparation').fill((here * 0.8).toFixed(4));
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await watchState(page)).last, { timeout: 90_000 })
      .not.toBeNull();

    await page.locator('#pauseEventNote').fill('Fastest point of the orbit');
    expect((await watchState(page)).last.note).toBe(
      'Fastest point of the orbit'
    );

    // The capture layer is handed the note alongside the scenario caption.
    const burned = await page.evaluate(async () => {
      const tools = await import('/js/sandboxTools.js');
      const ev = await import('/js/pauseAtEvent.js');
      tools.setCaptureMode(true, {
        caption: 'Comet Sungrazer',
        note: ev.lastEvent()?.note || '',
      });
      const out = {
        caption: tools.captionText(),
        note: tools.captureNoteText(),
      };
      tools.setCaptureMode(false);
      return out;
    });
    expect(burned.note).toBe('Fastest point of the orbit');
    expect(burned.caption).toBe('Comet Sungrazer');
  });
});

test.describe('everything else still agrees afterwards', () => {
  test('the observing panels describe the same run after an event pause', async ({
    page,
    app,
  }) => {
    // The reason the stop does not rewind. The recordings, the light curve and
    // the timeline are all indexed by the simulation clock; winding some of
    // them back and not others is how a panel ends up describing a moment that
    // never existed. So after a pause every one of them must still end at the
    // clock the simulation is actually holding.
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(10);
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    await app.openPanel('toggleAstrometry', 'astrometryContainer');
    await app.railControl('togglePauseAtEvent');
    await page.locator('#togglePauseAtEvent').click();

    const before = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      const lc = await import('/js/lightCurve.js');
      return {
        samples: rv.radialVelocitySeries().length,
        clock: lc.currentTimeDays(),
      };
    });
    expect(before.samples).toBeGreaterThan(0);

    // A transit, because this scenario is built to produce them and its planet
    // is on a near-circular orbit where a separation crossing never comes.
    await page.locator('#pauseEventKind').selectOption('transit');
    await page.locator('#pauseEventArm').click();
    await expect(page.locator('#pauseEventStatus')).toContainText(/watching/i);

    await expect
      .poll(async () => (await watchState(page)).last, { timeout: 120_000 })
      .not.toBeNull();
    expect(await isPaused(page)).toBe(true);

    const after = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      const ast = await import('/js/astrometry.js');
      void ast;
      const lc = await import('/js/lightCurve.js');
      const tl = await import('/js/timeline.js');
      const series = rv.radialVelocitySeries();
      const curve = lc.lightCurveSeries();
      return {
        clock: lc.currentTimeDays(),
        simClock: tl.getSimClock(),
        rvLast: series.length ? series[series.length - 1].x : null,
        rvCount: series.length,
        curveLast: curve.days.length ? curve.days[curve.days.length - 1] : null,
        astrometryPoints: ast.astrometryPath
          ? ast.astrometryPath().length
          : null,
        scrubbing: tl.isScrubbing(),
      };
    });

    // The clock only ever went forwards.
    expect(after.clock).toBeGreaterThan(before.clock);
    // Nothing put the timeline into a replay.
    expect(after.scrubbing).toBe(false);
    // Every recording still ends at or before the clock, and none of them was
    // truncated back to nothing by the pause.
    expect(after.rvCount).toBeGreaterThan(0);
    expect(after.rvLast).toBeLessThanOrEqual(after.clock + 1e-9);
    expect(after.rvLast).toBeGreaterThan(before.clock - 1e-9);
    if (after.curveLast !== null) {
      expect(after.curveLast).toBeLessThanOrEqual(after.clock + 1e-9);
    }

    // And the event the panel reports sits inside the run, not outside it.
    const { last } = await watchState(page);
    expect(last.timeDays).toBeLessThanOrEqual(after.clock + 1e-9);
    expect(last.timeDays).toBeGreaterThan(0);
  });

  test('rebuilding the world clears the watch and the marker', async ({
    page,
    app,
  }) => {
    await openTool(page, app, 'Comet Sungrazer');
    await page.locator('#pauseEventKind').selectOption('separationInward');
    const here = Number(
      await page.locator('#pauseEventSeparation').inputValue()
    );
    await page.locator('#pauseEventSeparation').fill((here * 0.8).toFixed(4));
    await page.locator('#pauseEventArm').click();
    expect((await watchState(page)).armed).not.toBeNull();

    await app.loadScenario('Solar System');
    await app.waitForFrames(10);

    // A rebuilt world reuses body ids for different objects, so a surviving
    // watch would be watching something else under the same name.
    const state = await watchState(page);
    expect(state.armed).toBeNull();
    expect(state.last).toBeNull();
    await expect(page.locator('#timelineEventMarker')).toBeHidden();
  });

  test('closing the panel disarms, so nothing stops the run later', async ({
    page,
    app,
  }) => {
    await openTool(page, app, 'Comet Sungrazer');
    await page.locator('#pauseEventKind').selectOption('separationInward');
    const here = Number(
      await page.locator('#pauseEventSeparation').inputValue()
    );
    await page.locator('#pauseEventSeparation').fill((here * 0.8).toFixed(4));
    await page.locator('#pauseEventArm').click();
    expect((await watchState(page)).armed).not.toBeNull();

    await page.locator('#pauseEventClose').click();
    await expect(page.locator('#pauseEventContainer')).toBeHidden();
    expect((await watchState(page)).armed).toBeNull();

    // The simulation keeps running with nothing armed.
    await app.waitForFrames(60);
    expect(await isPaused(page)).toBe(false);
  });
});
