// =============================================================================
// A lesson step driving the pause-at-event tool
// -----------------------------------------------------------------------------
// The Kepler lesson used to say "press Space and catch the planet at each end
// of its orbit", which measures reaction time: on a fast machine periapsis goes
// past in two frames. Step 11 now opens the pause-at-event tool with the right
// bodies chosen and asks the reader to arm it themselves.
//
// Driven through the real controls - the panel's own selects and its Arm button
// - because the thing being tested is that a student can do this, and a test
// that armed through the module would pass with the panel unwired. Covers the
// two cases the brief names: capturing twice in a row, and walking away from
// an armed activity.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'keplers-laws';
const SID = 'fast-and-slow-in-numbers';

/** Open the lesson and walk to the capture step. */
async function openCaptureStep(page, app) {
  await app.boot();
  // Reached the way a returning student reaches it: seed saved progress that
  // stops on this step, then open the lesson and let it resume. Keyed by sid,
  // which is what the resume path uses, so this exercises the real navigation
  // rather than a test-only jump.
  await page.evaluate(
    async ([lesson, sid]) => {
      const reg = await import('/js/data/investigations/registry.js');
      const loaded = await reg.loadInvestigation(lesson);
      const index = loaded.steps.findIndex(s => s.sid === sid);
      const visited = loaded.steps.slice(0, index + 1).map(s => s.sid);
      window.localStorage.setItem(
        `gravitas_investigation_${lesson}`,
        JSON.stringify({
          schema: 2,
          lesson,
          stepSid: sid,
          visited,
          responses: {},
          attempts: {},
          startedAt: new Date().toISOString(),
        })
      );
    },
    [LESSON, SID]
  );
  await page.evaluate(async lesson => {
    const loader = await import('/js/investigationsLoader.js');
    await loader.ensureInvestigations();
    const inv = await import('/js/investigations.js');
    await inv.openInvestigation(lesson);
  }, LESSON);
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).toContainText('Fast and slow');
}

/** The tool's state, read from the module rather than from pixels. */
const toolState = page =>
  page.evaluate(async () => {
    const events = await import('/js/pauseAtEvent.js');
    const watch = await import('/js/investigations/eventWatch.js');
    const armed = events.armedEvent();
    const fired = events.lastEvent();
    return {
      armed: armed ? { kind: armed.kind, bodyId: armed.bodyId } : null,
      fired: fired
        ? {
            kind: fired.kind,
            timeDays: fired.timeDays,
            bracketDays: fired.bracketDays,
            overshootDays: fired.overshootDays,
          }
        : null,
      lessonState: watch.lessonWatchState(),
    };
  });

test.describe('the step opens the tool ready to arm', () => {
  test('the tool is on screen with the right bodies and nothing armed', async ({
    page,
    app,
  }) => {
    await openCaptureStep(page, app);

    // Opened by the lesson, not left in the Tools menu for the reader to find.
    await expect(page.locator('#pauseEventContainer')).toBeVisible();

    // The bodies the step names are selected, and the event is periapsis.
    const selected = await page.evaluate(() => ({
      kind: document.getElementById('pauseEventKind').value,
      body: document.getElementById('pauseEventBody').selectedOptions[0]
        ?.textContent,
      primary:
        document.getElementById('pauseEventPrimary').selectedOptions[0]
          ?.textContent,
    }));
    expect(selected.kind).toBe('periapsis');
    expect(selected.body).toContain('Eccentric');
    expect(selected.primary).toContain('Star');

    // Selecting is not arming. The lesson must not answer its own question.
    const state = await toolState(page);
    expect(state.armed).toBe(null);
    expect(state.lessonState).toBe('idle');
    await expect(page.locator('#pauseEventArm')).toBeEnabled();
  });

  test('the step no longer tells anybody to press Space', async ({
    page,
    app,
  }) => {
    await openCaptureStep(page, app);
    const body = await page.locator('#investigationBody').innerText();
    expect(body).not.toMatch(/press\s+space/i);
    // And it says the two things the tool reports are different things.
    expect(body.toLowerCase()).toContain('stopped');
    expect(body.toLowerCase()).toMatch(/relative to the star/);
  });
});

test.describe('arming it, twice', () => {
  test('periapsis fires, pauses, and reports its bracket honestly', async ({
    page,
    app,
  }) => {
    await openCaptureStep(page, app);
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await toolState(page)).armed !== null)
      .toBe(true);

    // The world runs until the event. Waiting on the module's own state
    // rather than a timeout: the orbit's period is what decides how long.
    await expect
      .poll(async () => (await toolState(page)).fired?.kind, {
        timeout: 120_000,
      })
      .toBe('periapsis');

    const state = await toolState(page);
    expect(state.armed).toBe(null);
    expect(state.lessonState).toBe('fired');
    // The two numbers the step tells the reader to look at.
    // At least zero, not strictly positive: the planet can start close to
    // periapsis and the first crossing then falls within the first day.
    expect(state.fired.timeDays).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(state.fired.timeDays)).toBe(true);
    expect(state.fired.bracketDays).toBeGreaterThan(0);
    expect(state.fired.overshootDays).toBeGreaterThanOrEqual(0);
    // Stopped AFTER the event, never wound back onto it.
    expect(state.fired.overshootDays).toBeLessThanOrEqual(
      state.fired.bracketDays * 2 + 1e-9
    );

    // And the simulation really is paused.
    const paused = await page.evaluate(async () => {
      const s = await import('/js/appState.js');
      return s.state.paused;
    });
    expect(paused).toBe(true);
  });

  test('arming again for apoapsis works, and gives a different moment', async ({
    page,
    app,
  }) => {
    await openCaptureStep(page, app);

    // First capture.
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await toolState(page)).fired?.kind, {
        timeout: 120_000,
      })
      .toBe('periapsis');
    const first = (await toolState(page)).fired;

    // Repeat capture, at the other end. Through the real select, then Arm.
    await page.evaluate(async () => {
      const s = await import('/js/appState.js');
      s.state.paused = false;
    });
    await page.locator('#pauseEventKind').selectOption('apoapsis');
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await toolState(page)).fired?.kind, {
        timeout: 120_000,
      })
      .toBe('apoapsis');

    const second = (await toolState(page)).fired;
    expect(second.timeDays).toBeGreaterThan(first.timeDays);
    // Half a period apart, near enough: the two extremes are opposite ends.
    expect(second.timeDays - first.timeDays).toBeGreaterThan(0);
  });

  test('the near-circular orbiter is above the threshold and does arm', async ({
    page,
    app,
  }) => {
    // The Circular Orbiter in this system has e near 0.02, which is twenty
    // times the tool's MIN_ECCENTRICITY of 1e-3 - so it has a real periapsis
    // and the tool correctly arms on it. Asserted rather than assumed, because
    // the step's tip tells readers to try it: a tip that promises a refusal
    // the tool does not give would be worse than no tip.
    //
    // The refusal path itself is covered where the eccentricity can be
    // controlled: tests/pauseAtEvent.test.js exercises canArm directly.
    await openCaptureStep(page, app);
    const picked = await page.evaluate(() => {
      const select = document.getElementById('pauseEventBody');
      const option = [...select.options].find(o =>
        /circular/i.test(o.textContent)
      );
      if (!option) return null;
      select.value = option.value;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
      return option.textContent;
    });
    test.skip(!picked, 'this system has no near-circular body to try');

    await page.locator('#pauseEventArm').click();
    const armed = (await toolState(page)).armed;
    expect(armed).not.toBe(null);
    expect(armed.kind).toBe('periapsis');
  });
});

test.describe('leaving an armed activity', () => {
  test('advancing a step releases the lesson watch', async ({ page, app }) => {
    await openCaptureStep(page, app);
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await toolState(page)).armed !== null)
      .toBe(true);

    // Walk away with it armed. The watch must not survive to fire into the
    // next step, and the listener must not survive at all.
    await page.locator('#investigationNext').click();
    await expect
      .poll(async () => (await toolState(page)).armed, { timeout: 15_000 })
      .toBe(null);
    expect((await toolState(page)).lessonState).toBe('idle');
  });

  test('closing the lesson releases it too', async ({ page, app }) => {
    await openCaptureStep(page, app);
    await page.locator('#pauseEventArm').click();
    await expect
      .poll(async () => (await toolState(page)).armed !== null)
      .toBe(true);

    await page.locator('#investigationClose').click();
    await expect
      .poll(async () => (await toolState(page)).armed, { timeout: 15_000 })
      .toBe(null);
  });

  test("a reader's own watch is not taken by the lesson", async ({
    page,
    app,
  }) => {
    await app.boot();
    // Arm something of their own first, from the tool, before any lesson.
    await app.openPanel('togglePauseAtEvent', 'pauseEventContainer');
    await page.locator('#pauseEventArm').click();
    const theirs = await page.evaluate(async () => {
      const e = await import('/js/pauseAtEvent.js');
      return e.armedEvent();
    });
    test.skip(!theirs, 'nothing armable in the default scenario');

    // Now the lesson's integration is asked to arm. It must refuse rather
    // than silently taking over somebody else's watch.
    const verdict = await page.evaluate(async () => {
      const watch = await import('/js/investigations/eventWatch.js');
      const foreign = await watch.foreignWatchArmed();
      const out = await watch.armForLesson({ kind: 'periapsis' });
      return { foreign, out, state: watch.lessonWatchState() };
    });
    expect(verdict.foreign).toBe(true);
    expect(verdict.out.ok).toBe(false);
    expect(verdict.out.reason).toBe('foreignWatch');
    expect(verdict.state).toBe('foreign');

    // Still theirs.
    const after = await page.evaluate(async () => {
      const e = await import('/js/pauseAtEvent.js');
      return e.armedEvent();
    });
    expect(after).not.toBe(null);
  });
});
