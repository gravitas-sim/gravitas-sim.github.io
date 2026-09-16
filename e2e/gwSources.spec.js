// =============================================================================
// What the beginner lesson puts on the canvas, and what it refuses to
// -----------------------------------------------------------------------------
// "What Is a Gravitational Wave?" argues that motion is not what makes a source
// radiate. It cannot make that argument with a binary on screen while asking a
// reader to imagine something else, and for a long time that is exactly what it
// did: the screen whose prose reads "a single mass, sitting still" staged the
// GW150914 pair and let it orbit behind the question.
//
// So these tests are about the scene, not the panel. They select each of the
// three sources through the control a reader uses, and check what the canvas
// holds and what leaves it. Ticking a checklist box would prove none of it -
// the assertions are on bodies, on crest counts, and on numbers the readout
// prints.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'what-is-a-gravitational-wave';

async function openLesson(page, app, { locale } = {}) {
  await app.boot();
  await page.evaluate(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('gravitas_investigation_')) localStorage.removeItem(k);
      }
    } catch {
      /* a private window has no storage, which is fine here */
    }
  });
  if (locale) {
    await page.evaluate(async name => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(name, { persist: false });
    }, locale);
  }
  await page.evaluate(async id => {
    const loader = await import('/js/investigationsLoader.js');
    await (await loader.ensureInvestigations()).openInvestigation(id);
  }, LESSON);
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

async function goTo(page, title) {
  for (let n = 0; n < 40; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    await page.locator('#investigationNext').click();
    await page.waitForTimeout(80);
  }
  throw new Error(`never reached "${title}"`);
}

/** What is on the canvas, and what the model says about it. */
const scene = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    const ph = await import('/js/physics.js');
    const stage = await import('/js/lessonStage.js');
    const w = await import('/js/gwWidgets.js');
    const lab = w.activeLab();
    const bodies = [...ph.bh_list, ...ph.neutron_stars];
    return {
      mode: stage.sourceMode(),
      bodies: bodies.length,
      drawn: bodies.map(b => Math.round((b.stageRadius ?? b.radius) * 10) / 10),
      crests: state.gwWaveOverlay.crests.length,
      radii: state.gwWaveOverlay.crests.map(c => Math.round(c.r * 1000) / 1000),
      waveActive: state.gwWaveOverlay.active,
      t: lab ? Number(lab.cursorT.toFixed(4)) : null,
      playing: Boolean(lab?.playing),
      peakStrain: lab?.timeline?.meta?.peakStrain ?? null,
      ringGain: lab?.ringGain ?? null,
    };
  });

const rows = async page =>
  (
    await page
      .locator('#investigationToolReadout .inv-tool-row')
      .allInnerTexts()
  ).map(r => r.replace(/\s+/g, ' '));

/** Move a range control the way a keyboard reader does, and make it stick. */
async function nudge(page, id, presses, key = 'ArrowRight') {
  const el = page.locator(`#investigationToolControls [data-tool="${id}"]`);
  await expect(el).toBeVisible();
  await el.focus();
  for (let i = 0; i < presses; i++) await page.keyboard.press(key);
  await page.waitForTimeout(350);
  return Number(await el.inputValue());
}

test.describe('choosing a source', () => {
  test('a static mass is one body and emits nothing', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Gravity is already here');
    await page.waitForTimeout(700);

    const seen = await scene(page);
    // The thing the prose is about, on the canvas: one body, not a pair.
    expect(seen.mode).toBe('static');
    expect(seen.bodies).toBe(1);
    // And nothing leaving it. Not "few crests" - none.
    expect(seen.crests).toBe(0);
    expect(seen.waveActive).toBe(false);
    expect((await rows(page)).join(' ')).toMatch(/emits no waves/i);
  });

  test('a pulsing sphere moves a great deal and still emits nothing', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Now make it move');
    await page.waitForTimeout(900);

    const first = await scene(page);
    expect(first.mode).toBe('pulsing');
    expect(first.bodies).toBe(1);

    // It really is moving: the drawn radius changes as the model clock runs.
    await expect
      .poll(async () => (await scene(page)).drawn[0], { timeout: 8000 })
      .not.toBe(first.drawn[0]);

    // And it radiates nothing, which is the whole screen. This is the
    // assertion the lesson's argument rests on.
    const later = await scene(page);
    expect(later.crests).toBe(0);
    expect(later.waveActive).toBe(false);
    expect((await rows(page)).join(' ')).toMatch(/Birkhoff/);
  });

  test('a binary emits, and the crests are the model’s own', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Change the shape instead');
    await page.waitForTimeout(900);

    const seen = await scene(page);
    expect(seen.mode).toBe('binary');
    expect(seen.bodies).toBe(2);
    await expect
      .poll(async () => (await scene(page)).crests, { timeout: 8000 })
      .toBeGreaterThan(0);

    // Bounded: the count never runs away however long it plays.
    await page.waitForTimeout(2500);
    expect((await scene(page)).crests).toBeLessThanOrEqual(12);
    expect((await rows(page)).join(' ')).toMatch(/quadrupole/i);
  });

  test('the control changes the source, both ways', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Change the shape instead');
    await page.waitForTimeout(700);
    expect((await scene(page)).mode).toBe('binary');

    await nudge(page, 'source', 1, 'ArrowLeft');
    expect((await scene(page)).mode).toBe('pulsing');
    await nudge(page, 'source', 1, 'ArrowLeft');
    expect((await scene(page)).mode).toBe('static');
    await nudge(page, 'source', 2);
    const back = await scene(page);
    expect(back.mode).toBe('binary');
    expect(back.bodies).toBe(2);
  });
});

test.describe('the wave overlay follows the model clock', () => {
  test('seeking back shows the earlier pattern, and the same one twice', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Follow a disturbance outward');
    await page.waitForTimeout(900);

    // Through the playhead only, so every position is on the control's own
    // grid: mixing a programmatic seek with an arrow press lands between two
    // steps and the round trip is then off by one, which says nothing about
    // whether the overlay is reproducible.
    const cursor = page.locator(
      '#investigationToolControls [data-tool="cursor"]'
    );
    await expect(cursor).toBeVisible();
    // Paused first, and checked: setting the flag once races the animation
    // frame that is already in flight, and the playhead then lands a
    // millisecond past where the seek put it.
    const pause = async () => {
      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              const w = await import('/js/gwWidgets.js');
              const s = w.activeLab();
              if (s) s.playing = false;
              return Boolean(s?.playing);
            }),
          { timeout: 8000, intervals: [100] }
        )
        .toBe(false);
      await page.waitForTimeout(150);
    };
    const at = async fraction => {
      await pause();
      await cursor.focus();
      await cursor.fill(String(fraction));
      await cursor.dispatchEvent('input');
      await page.waitForTimeout(400);
      const s = await scene(page);
      return { crests: s.crests, t: s.t, radii: s.radii };
    };
    const early = await at(0.3);
    const late = await at(0.8);
    const again = await at(0.3);
    // The pattern belongs to the model time, not to how long the tab has been
    // open: seeking away and back reproduces it.
    expect(again).toEqual(early);
    expect(late.t).toBeGreaterThan(early.t);
  });

  test('a paused playback stays paused when a control is touched', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Follow a disturbance outward');
    await page.waitForTimeout(700);

    // Pause the way a reader does.
    await page
      .locator('#investigationToolActions button', { hasText: 'Play / pause' })
      .click();
    await expect
      .poll(async () => (await scene(page)).playing, { timeout: 6000 })
      .toBe(false);

    // Now move something else. This used to restart the transport: every
    // control change re-ran the widget's own reset, which set playing back to
    // true, so the frame a reader had stopped on was gone before they could
    // read it and the pause button looked broken.
    await nudge(page, 'cursor', 1);
    expect((await scene(page)).playing).toBe(false);
    const t = (await scene(page)).t;
    await page.waitForTimeout(900);
    expect((await scene(page)).t).toBe(t);
  });

  test('nothing is left on the canvas after the lesson closes', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Change the shape instead');
    await expect
      .poll(async () => (await scene(page)).crests, { timeout: 8000 })
      .toBeGreaterThan(0);

    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await page.waitForTimeout(600);
    const after = await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      return {
        active: state.gwWaveOverlay.active,
        crests: state.gwWaveOverlay.crests.length,
      };
    });
    expect(after.active).toBe(false);
    expect(after.crests).toBe(0);
  });
});

test.describe('the ring, the arms and the amplifier', () => {
  test('the polarisation is named, and it is the one the prose promises', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Stretch one way');
    await page.waitForTimeout(700);

    const text = (await rows(page)).join(' ');
    // The step promises a moment when the ring is a circle again. That is only
    // true of a linearly polarised wave, and this screen selects an edge-on
    // source to get one. Face-on the same binary never passes through a circle
    // at all, and the lesson used to promise that it did.
    // Spelled either way on purpose. The claim under test is that the row is
    // named and reads Linear - a statement about the wave, not about English.
    // The shipped catalog says "Polarization"; this assertion said
    // "Polarisation" and failed a physics test on an orthography change.
    expect(text).toMatch(/Polari[sz]ation Linear/i);
    const inc = await page.evaluate(
      async () =>
        (await import('/js/gwWidgets.js')).activeLab().params.inclinationDeg
    );
    expect(inc).toBe(90);
    // And the cross polarisation really is absent, not just small.
    const hx = await page.evaluate(async () => {
      const w = await import('/js/gwWidgets.js');
      const s = w.activeLab();
      return Math.abs(s.timeline.crossAtTime(s.cursorT));
    });
    expect(hx).toBeLessThan(1e-30);
  });

  test('the L arms are reported as numbers with opposite signs @covers:ce.what-is-a-gravitational-wave', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'An observatory measures a difference');
    await page.waitForTimeout(700);

    const armRow = (await rows(page)).find(r =>
      /What an L would read/i.test(r)
    );
    expect(armRow).toBeTruthy();
    // Both arms, the difference, and what it is in meters on four-kilometer
    // arms - which is the reading a reader who cannot see the inset needs.
    const numbers = armRow.match(/-?\d+\.\d+e[+-]\d+/g) ?? [];
    expect(numbers.length).toBeGreaterThanOrEqual(4);
    const [x, y] = numbers.map(Number);
    expect(Math.sign(x)).toBe(-Math.sign(y));
    expect(Math.abs(x)).toBeCloseTo(Math.abs(y), 30);
  });

  test('amplifying changes the picture and nothing computed', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'An observatory measures a difference');
    await page.waitForTimeout(700);

    const before = await scene(page);
    const armsBefore = (await rows(page)).find(r =>
      /What an L would read/i.test(r)
    );
    await nudge(page, 'amplify', 1);
    const after = await scene(page);
    const armsAfter = (await rows(page)).find(r =>
      /What an L would read/i.test(r)
    );

    // The drawing gain moves...
    expect(after.ringGain).toBeGreaterThan(before.ringGain);
    // ...and every number stays exactly where it was.
    expect(after.peakStrain).toBe(before.peakStrain);
    expect(armsAfter).toBe(armsBefore);
    // And the factor is on screen rather than implied.
    expect((await rows(page)).join(' ')).toMatch(/Display only/i);
  });
});

test.describe('every instruction names a control that is there', () => {
  test('the observatory screen has the playhead it tells you to move', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'An observatory measures a difference');
    await page.waitForTimeout(500);
    const shown = await page.evaluate(() =>
      [
        ...document.querySelectorAll('#investigationToolControls [data-tool]'),
      ].map(e => e.dataset.tool)
    );
    // It used to say "press Next on the panel's own instrument", on a panel
    // whose instrument has no Next: the published-data task is its own screen
    // now.
    expect(shown).toContain('cursor');
    const body = await page.locator('#investigationBody').innerText();
    expect(body).not.toMatch(/press <?strong>?Next/i);
    expect(body).toMatch(/Where in the signal/i);
  });

  test('the published-data screen is its own step', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'What two observatories actually recorded');
    await page.waitForTimeout(700);
    const title = await page.locator('#investigationToolTitle').innerText();
    expect(title.length).toBeGreaterThan(3);
    // The real recording, not the model.
    const text = (await rows(page)).join(' ');
    expect(text).toMatch(/GWOSC|LIGO|whiten|band/i);
  });
});
