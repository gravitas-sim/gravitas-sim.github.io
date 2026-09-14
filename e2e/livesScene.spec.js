// =============================================================================
// The main scene, while a star lives and dies in it
// -----------------------------------------------------------------------------
// "Lives of Stars" tells its story twice: in the H-R panel and around the
// protagonist on the main canvas. These are the claims that only hold if both
// halves are driven by one model time.
//
// The defect they were written against is worth stating, because it passed
// every check the suite had. The panel depicted a collapsing cloud on the
// screen whose prose says "this is not a star yet"; the canvas behind it
// showed an ordinary main-sequence disc. Nothing was broken - there simply was
// no main-scene half, and no test asked for one.
//
// So none of these assert that a widget drew something. They assert what a
// reader can see and do: that the body on the canvas is the stage the lesson
// says it is, that a frozen copy stays frozen while the star beside it does
// not, that running the playhead backwards puts the star back, and that
// nothing the lesson drew is still there after it closes.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'lives-of-stars';

/** Open the lesson from a clean slate, so a saved place cannot move the walk. */
async function openLesson(page, app) {
  await app.boot();
  await page.evaluate(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('gravitas_investigation_')) localStorage.removeItem(k);
      }
    } catch {
      /* a private window has no storage, and that is fine here */
    }
  });
  await page.evaluate(async id => {
    const loader = await import('/js/investigationsLoader.js');
    await (await loader.ensureInvestigations()).openInvestigation(id);
  }, LESSON);
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

/** Walk forward to a step by title. The progress line counts visits, not place. */
async function goTo(page, title) {
  for (let n = 0; n < 40; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    await page.locator('#investigationNext').click();
    await page.waitForTimeout(90);
  }
  throw new Error(`never reached "${title}"`);
}

/**
 * Stop the playback, so a test about seeking is not racing an animation.
 *
 * Polled rather than set once: a step's own reset switches playing back on
 * when it opens, and whether that lands before or after a single set is a
 * race that shows up as one flaky test in ten.
 */
async function pause(page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const w = await import('/js/stellarEvolutionWidgets.js');
          const p = w.activePlayback();
          if (p) p.playing = false;
          return p ? p.playing : false;
        }),
      { timeout: 8000, intervals: [100] }
    )
    .toBe(false);
  // And one more frame, so anything already in flight has landed.
  await page.waitForTimeout(200);
}

/** What the scene and the model both say, in one read. */
const look = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    const ph = await import('/js/physics.js');
    const w = await import('/js/stellarEvolutionWidgets.js');
    const sc = await import('/js/lesson/evolutionScene.js');
    const o = state.evolutionOverlay;
    const play = w.activePlayback();
    const all = [
      ...ph.stars,
      ...ph.white_dwarfs,
      ...ph.neutron_stars,
      ...ph.bh_list,
    ];
    const body = all.find(b => b.id === o.bodyId) || null;
    const scene = o.frame
      ? sc.sceneFor(o.frame, {
          seed: o.seed,
          stillFrame: o.stillFrame,
          lostFraction: o.lostFraction,
        })
      : null;
    return {
      active: o.active,
      stage: o.frame?.stage ?? null,
      ageYr: o.frame?.ageYr ?? null,
      endpoint: o.frame?.endpoint?.kind ?? null,
      lost: o.lostFraction,
      hideStar: scene?.hideStar ?? null,
      fronts: scene?.fronts.length ?? 0,
      shells: scene?.shells.length ?? 0,
      kind: body ? body.constructor.name : null,
      radiusSun: body?.radiusInSuns ?? null,
      playPos: play?.position ?? null,
      trackId: play?.trackId ?? null,
      pace: play?.pace ?? null,
      bodies: all.map(b => b.name),
    };
  });

const phaseButton = (page, label) =>
  page.locator('#investigationToolActions button', { hasText: label });

test.describe('one model time, two views', () => {
  test('the canvas shows a cloud when the lesson says there is no star yet', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Before the star');
    await expect.poll(async () => (await look(page)).stage).toBe('cloud');

    const seen = await look(page);
    // No photosphere, so no stellar disc: the renderer skips the body's own
    // painter and the illustration stands in for it.
    expect(seen.hideStar).toBe(true);
    // And no age, because the tracks begin after this and inventing one here
    // would be the falsest number in the lesson.
    expect(seen.ageYr).toBeNull();
    expect(seen.active).toBe(true);
  });

  test('the scene and the readout never disagree about the age', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'The Sun, today');
    await pause(page);
    await page.waitForTimeout(400);

    for (let i = 0; i < 4; i++) {
      const seen = await look(page);
      const rows = await page
        .locator('#investigationToolReadout .inv-tool-row')
        .allInnerTexts();
      const ageRow = rows.find(r => /^Age/.test(r)) ?? '';
      // The panel prints the age the overlay carries. One clock.
      const shown = Number((ageRow.match(/([\d.]+)\s*(Myr|Gyr)/) ?? [])[1]);
      const unit = (ageRow.match(/(Myr|Gyr)/) ?? [])[1];
      const asYears = shown * (unit === 'Gyr' ? 1e9 : 1e6);
      expect(Math.abs(asYears - seen.ageYr) / seen.ageYr).toBeLessThan(0.02);
      await phaseButton(page, 'Next phase').click();
      await page.waitForTimeout(300);
    }
  });

  test('the star sheds mass on the canvas as the track records it @covers:ce.lives-of-stars', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Losing itself');
    await pause(page);
    await page.waitForTimeout(500);
    const seen = await look(page);
    // The one measured number in the illustration: the shells are drawn
    // because the track says this star has lost mass, and how far out they
    // reach follows how much.
    expect(seen.lost).toBeGreaterThan(0.05);
    expect(seen.shells).toBeGreaterThan(0);
  });
});

test.describe('forwards and backwards', () => {
  test('running back to the cloud puts the star back in it', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Before the star');
    await pause(page);
    await expect.poll(async () => (await look(page)).stage).toBe('cloud');

    // Forward to a real star, then back again. The illustration has to go
    // both ways: a one-way transition would look identical until somebody
    // dragged the playhead left.
    await phaseButton(page, 'Next phase').click();
    await page.waitForTimeout(400);
    expect((await look(page)).stage).toBe('track');
    expect((await look(page)).hideStar).toBe(false);

    await phaseButton(page, 'Previous phase').click();
    await page.waitForTimeout(400);
    const back = await look(page);
    expect(back.stage).toBe('cloud');
    expect(back.hideStar).toBe(true);
  });

  test('a remnant becomes a star again when the playhead runs back', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'The cinder');
    await pause(page);
    await page.waitForTimeout(600);
    await expect.poll(async () => (await look(page)).stage).toBe('remnant');
    expect((await look(page)).kind).toBe('WhiteDwarf');

    // Two presses, because the step parks at the far end of the remnant card
    // and the first one lands on the start of it. Bounded, so a regression
    // that never leaves the remnant fails rather than looping.
    for (let i = 0; i < 4; i++) {
      if ((await look(page)).stage === 'track') break;
      await phaseButton(page, 'Previous phase').click();
      await page.waitForTimeout(500);
    }
    const back = await look(page);
    // The body class changes back, not just the numbers written on it: a
    // white dwarf carrying a red giant's temperature would be a card that
    // says one thing and a class that says another.
    expect(back.stage).toBe('track');
    expect(back.kind).toBe('StarObject');
    // And the white dwarf is gone rather than left standing beside the star
    // it used to be.
    const counts = await page.evaluate(async () => {
      const ph = await import('/js/physics.js');
      return { wd: ph.white_dwarfs.length, stars: ph.stars.length };
    });
    expect(counts.wd).toBe(0);
    expect(counts.stars).toBe(1);
  });

  test('the same playhead position always gives the same frame', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'The Sun, today');
    await pause(page);
    await page.waitForTimeout(400);

    const at = async pos => {
      await page.evaluate(async p => {
        const w = await import('/js/stellarEvolutionWidgets.js');
        const ev = await import('/js/stellar/evolution.js');
        ev.seek(w.activePlayback(), p);
      }, pos);
      // Nudge the widget into a repaint the way a control change would.
      await phaseButton(page, 'Next phase').click();
      await phaseButton(page, 'Previous phase').click();
      await page.waitForTimeout(300);
      const seen = await look(page);
      return { stage: seen.stage, age: seen.ageYr, r: seen.radiusSun };
    };
    const first = await at(0.4);
    await at(0.9);
    const again = await at(0.4);
    // Seek away and back: the same frame, to the digit. This is what makes
    // replay and reset reproducible.
    expect(again).toEqual(first);
  });
});

test.describe('a frozen copy', () => {
  test('keeps its capture age while the star beside it moves on', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'To scale, and beside itself');
    await pause(page);
    await page.waitForTimeout(500);

    const census = () =>
      page.evaluate(async () => {
        const ph = await import('/js/physics.js');
        return ph.stars.map(s => ({
          name: s.name,
          r: s.radiusInSuns,
          age: s.ageYr,
          teff: s.temperature,
          owned: Boolean(s.model_owned),
        }));
      });

    await phaseButton(page, 'Freeze this moment').click();
    await page.waitForTimeout(500);
    const frozen = (await census()).find(s => /Then:/.test(s.name));
    expect(frozen).toBeTruthy();
    // The label carries the age it was taken at, so a frozen star is never
    // mistaken for a second star.
    expect(frozen.name).toMatch(/Then: [\d.]+ (Myr|Gyr)/);
    // Model-owned, so the integrator will not move it either.
    expect(frozen.owned).toBe(true);

    for (let i = 0; i < 3; i++) {
      await phaseButton(page, 'Next phase').click();
      await page.waitForTimeout(300);
    }
    const after = await census();
    const still = after.find(s => s.name === frozen.name);
    const live = after.find(s => s.name === 'The star');
    // Frozen means frozen: every field, not just the radius.
    expect(still).toEqual(frozen);
    // And the star it was copied from has moved on, or the comparison is
    // between two identical things.
    expect(live.r).not.toBeCloseTo(frozen.r, 3);
  });

  test('it is gone from the next screen', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'To scale, and beside itself');
    await pause(page);
    await page.waitForTimeout(500);
    await phaseButton(page, 'Freeze this moment').click();
    await page.waitForTimeout(500);
    const names = () =>
      page.evaluate(async () =>
        (await import('/js/physics.js')).stars.map(s => s.name)
      );
    expect((await names()).some(n => /Then:/.test(n))).toBe(true);

    await page.locator('#investigationNext').click();
    await page.waitForTimeout(700);
    // A copy belongs to the screen that made it. Two steps can share a stage,
    // in which case nothing is rebuilt and the copy would otherwise still be
    // standing there under a different question.
    expect((await names()).some(n => /Then:/.test(n))).toBe(false);
  });
});

test.describe('changing tracks', () => {
  test('picking another star at a remnant leaves no remnant behind', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'The cinder');
    await pause(page);
    await expect.poll(async () => (await look(page)).kind).toBe('WhiteDwarf');

    // Focused and driven by the keyboard, which is both a reader's path and
    // the only one that sticks: an animated widget writes its controls back
    // from its own state every frame, and skips the one that has focus.
    const trackControl = page.locator(
      '#investigationToolControls [data-tool="track"]'
    );
    await trackControl.focus();
    const before = Number(await trackControl.inputValue());
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
    }
    expect(Number(await trackControl.inputValue())).toBeGreaterThan(before);
    await page.waitForTimeout(800);
    const seen = await look(page);
    // A new track restarts at its own cloud, and the white dwarf the previous
    // track left has to go with it - a canvas holding one star and the
    // remains of a different one is a scene nothing in the lesson describes.
    const counts = await page.evaluate(async () => {
      const ph = await import('/js/physics.js');
      return {
        wd: ph.white_dwarfs.length,
        ns: ph.neutron_stars.length,
        bh: ph.bh_list.length,
        stars: ph.stars.length,
      };
    });
    expect(counts.wd).toBe(0);
    expect(counts.stars + counts.ns + counts.bh).toBeGreaterThan(0);
    expect(seen.active).toBe(true);
  });
});

test.describe('what the lesson leaves behind', () => {
  test('nothing, once it closes', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'To scale, and beside itself');
    await pause(page);
    await page.waitForTimeout(500);
    await phaseButton(page, 'Freeze this moment').click();
    await page.waitForTimeout(400);
    expect((await look(page)).active).toBe(true);

    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await page.waitForTimeout(600);

    const after = await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      const ph = await import('/js/physics.js');
      return {
        overlay: state.evolutionOverlay.active,
        bodyId: state.evolutionOverlay.bodyId,
        frame: state.evolutionOverlay.frame,
        frozen: ph.stars.filter(s => /Then:/.test(s.name)).length,
      };
    });
    expect(after.overlay).toBe(false);
    expect(after.bodyId).toBeNull();
    expect(after.frame).toBeNull();
    expect(after.frozen).toBe(0);
  });
});

test.describe('three ways of running the clock', () => {
  test('the age holds while the playhead means three different things', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'The Sun, today');
    await pause(page);
    await page.waitForTimeout(400);

    // Start from a phase boundary rather than wherever the step's autoplay
    // had reached. A boundary is a stored row of the model, so the pacing
    // conversions land on it exactly and the tolerance below can be tight;
    // starting anywhere else leaves a sample-quantisation error that varies
    // from run to run and tests the harness rather than the pacing.
    await phaseButton(page, 'Back to the start').click();
    await pause(page);
    for (let i = 0; i < 3; i++) {
      await phaseButton(page, 'Next phase').click();
      await page.waitForTimeout(250);
    }
    await pause(page);

    const phaseOf = () =>
      page
        .locator('#investigationToolReadout .inv-tool-row')
        .allInnerTexts()
        .then(rows => rows.find(r => /^Phase/.test(r)) ?? '');

    const before = await look(page);
    const paces = [before.pace];
    const ages = [before.ageYr];
    const phases = [await phaseOf()];
    for (let i = 0; i < 3; i++) {
      await phaseButton(page, 'Change what the playhead paces').click();
      await page.waitForTimeout(400);
      const seen = await look(page);
      paces.push(seen.pace);
      ages.push(seen.ageYr);
      phases.push(await phaseOf());
    }
    // Three distinct pacings, and back to where it started.
    expect(new Set(paces.slice(0, 3)).size).toBe(3);
    expect(paces[3]).toBe(paces[0]);
    // The star does not move while the meaning of the ruler changes. A tenth
    // of a per cent rather than exact, because the phase pacing is quantised
    // to the model's stored rows and a round trip through it lands on the
    // nearest one - starting from a boundary keeps that inside one row.
    for (const age of ages) {
      expect(Math.abs(age - ages[0]) / ages[0]).toBeLessThan(0.001);
    }
    // And the claim that actually matters: a reader watching a red giant is
    // still watching that red giant. This is the one that would catch a
    // pacing conversion landing in the wrong phase, which age tolerance alone
    // would not - the phases either side of a boundary can be a per cent apart.
    for (const phase of phases) expect(phase).toBe(phases[0]);
  });

  test('only the proportional pacing claims the playhead is a lifetime', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'The Sun, today');
    await pause(page);
    await page.waitForTimeout(400);

    const claims = [];
    for (let i = 0; i < 3; i++) {
      const rows = await page
        .locator('#investigationToolReadout .inv-tool-row')
        .allInnerTexts();
      const row = rows.find(r => /^Playhead/.test(r)) ?? '';
      claims.push({
        pace: (await look(page)).pace,
        saysLife: /also .* of the star/i.test(row),
        saysNot: /is NOT/.test(row),
      });
      await phaseButton(page, 'Change what the playhead paces').click();
      await page.waitForTimeout(400);
    }
    const linear = claims.find(c => c.pace === 'linear');
    expect(linear.saysLife).toBe(true);
    for (const c of claims.filter(x => x.pace !== 'linear')) {
      expect(c.saysNot).toBe(true);
      expect(c.saysLife).toBe(false);
    }
  });
});
