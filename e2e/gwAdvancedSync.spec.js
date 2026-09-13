// =============================================================================
// The advanced lesson, and whether the scene agrees with the panel
// -----------------------------------------------------------------------------
// "Listening to Spacetime" describes a source in numbers and stands that source
// on the main canvas. Those are two descriptions of one thing, and every one of
// these tests is about them staying the same thing while a reader changes
// something.
//
// The defect they were written against: the preset labelled "two neutron stars"
// set the masses to 1.4 apiece, moved the separation, redrew the waveform - and
// left two black holes standing on the canvas. Every number was right and the
// picture was of a different kind of object.
//
// Nothing here is satisfied by a checklist box. The assertions are on body
// classes, on masses the inspector would print, on separations, and on numbers
// the readout carries.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'listening-to-spacetime';

async function openLesson(page, app) {
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
  await page.evaluate(async id => {
    const loader = await import('/js/investigationsLoader.js');
    await (await loader.ensureInvestigations()).openInvestigation(id);
  }, LESSON);
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

async function goTo(page, title) {
  for (let n = 0; n < 30; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    await page.locator('#investigationNext').click();
    await page.waitForTimeout(80);
  }
  throw new Error(`never reached "${title}"`);
}

/** The scene and the model, read together. */
const both = page =>
  page.evaluate(async () => {
    const ph = await import('/js/physics.js');
    const w = await import('/js/gwWidgets.js');
    const { state } = await import('/js/appState.js');
    const lab = w.activeLab();
    const bodies = [...ph.bh_list, ...ph.neutron_stars];
    return {
      m1: lab?.params.m1,
      m2: lab?.params.m2,
      distanceMpc: lab?.params.distanceMpc,
      inclinationDeg: lab?.params.inclinationDeg,
      classes: bodies.map(b => b.constructor.name).sort(),
      massesSun: bodies.map(b => b.massInSuns).sort((a, b) => b - a),
      separation:
        bodies.length === 2
          ? Math.hypot(
              bodies[0].pos.x - bodies[1].pos.x,
              bodies[0].pos.y - bodies[1].pos.y
            )
          : null,
      phase:
        bodies.length === 2
          ? Math.atan2(
              bodies[0].pos.y - bodies[1].pos.y,
              bodies[0].pos.x - bodies[1].pos.x
            )
          : null,
      cursorT: lab?.cursorT,
      peakStrain: lab?.timeline?.meta?.peakStrain,
      crests: state.gwWaveOverlay.crests.length,
    };
  });

const rows = async page =>
  (
    await page
      .locator('#investigationToolReadout .inv-tool-row')
      .allInnerTexts()
  ).map(r => r.replace(/\s+/g, ' '));

test.describe('a preset changes the scene, not only the numbers', () => {
  test('the components on the canvas are the components the preset names', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Three kinds of pair');
    await page.waitForTimeout(800);

    const presets = page.locator('#investigationToolPresets button');
    await expect(presets).toHaveCount(3);

    await presets.nth(0).click();
    await page.waitForTimeout(700);
    const bbh = await both(page);
    expect(bbh.classes).toEqual(['BlackHole', 'BlackHole']);
    expect(bbh.massesSun).toEqual([36, 29]);

    await presets.nth(1).click();
    await page.waitForTimeout(700);
    const bns = await both(page);
    // The whole point: two neutron stars, not two black holes with light masses.
    expect(bns.classes).toEqual(['NeutronStar', 'NeutronStar']);
    expect(bns.massesSun).toEqual([1.4, 1.4]);
    expect(bns.m1).toBe(1.4);

    await presets.nth(2).click();
    await page.waitForTimeout(700);
    const nsbh = await both(page);
    expect(nsbh.classes).toEqual(['BlackHole', 'NeutronStar']);
    expect(nsbh.massesSun).toEqual([10, 1.4]);
  });

  test('the readout says the model did not decide what they are', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Three kinds of pair');
    await page.waitForTimeout(800);
    await page.locator('#investigationToolPresets button').nth(1).click();
    await page.waitForTimeout(700);

    const text = (await rows(page)).join(' ');
    // The identification is astrophysics, not output of a point-mass inspiral.
    expect(text).toMatch(/two neutron stars/i);
    expect(text).toMatch(/did not decide/i);
    expect(text).toMatch(/tidal/i);
  });

  test('the separation on the canvas follows the model', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Three kinds of pair');
    await page.waitForTimeout(800);
    const presets = page.locator('#investigationToolPresets button');
    await presets.nth(0).click();
    await page.waitForTimeout(700);
    const heavy = await both(page);
    await presets.nth(1).click();
    await page.waitForTimeout(700);
    const light = await both(page);
    // Lighter objects at the same wave frequency are further apart in units of
    // their own Schwarzschild radius, which is what the canvas is drawn in.
    expect(light.separation).toBeGreaterThan(heavy.separation);
  });
});

test.describe('distance is a fixed-reference comparison', () => {
  test('twice as far is half the strain, against an unmoved scale @accepts:ce.listening-to-spacetime', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Test it, on one scale');
    await page.waitForTimeout(800);

    const control = page.locator(
      '#investigationToolControls [data-tool="distance"]'
    );
    await expect(control).toBeVisible();
    const at = async mpc => {
      await control.focus();
      await control.fill(String(mpc));
      await control.dispatchEvent('input');
      await page.waitForTimeout(450);
      return (await both(page)).peakStrain;
    };
    const near = await at(410);
    const far = await at(820);
    // The inverse-distance law, measured off the model rather than asserted.
    expect(near / far).toBeCloseTo(2, 2);

    // And the step plots against a fixed peak, so the picture shrinks instead
    // of being renormalised - which is the only way the comparison means
    // anything.
    const fixed = await page.evaluate(async () => {
      const inv =
        await import('/js/data/investigations/listening-to-spacetime.js');
      const step = inv.default.steps.find(s => s.sid === 'test-distance');
      return step?.tool?.fixedPeak ?? null;
    });
    expect(fixed).toBeGreaterThan(0);
  });
});

test.describe('the model-validity boundary', () => {
  test('the inspiral cutoff is a limit of the model, not a disappearance', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Where this stops working');
    await page.waitForTimeout(800);

    // Run to the very end of the window.
    await page.evaluate(async () => {
      const w = await import('/js/gwWidgets.js');
      const lab = await import('/js/gwLab.js');
      const s = w.activeLab();
      s.playing = false;
      lab.seekFraction(s, 1);
    });
    await page.waitForTimeout(600);

    const seen = await both(page);
    // The two objects are still on the canvas. The model stops; they do not
    // vanish, because vanishing would be a claim the model cannot make.
    expect(seen.classes.length).toBe(2);
    const text = (await rows(page)).join(' ');
    expect(text).toMatch(/model|valid|stops|breaks/i);
  });
});

test.describe('orientation', () => {
  test('the orbit on the canvas is the orbit the observer sees', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Which way is it facing?');
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const w = await import('/js/gwWidgets.js');
      const s = w.activeLab();
      if (s) s.playing = false;
    });

    const control = page.locator(
      '#investigationToolControls [data-tool="inclination"]'
    );
    await expect(control).toBeVisible();
    const spread = async deg => {
      await control.focus();
      await control.fill(String(deg));
      await control.dispatchEvent('input');
      await page.waitForTimeout(450);
      // Watch the pair over one turn and see how far it moves in each axis.
      return page.evaluate(async () => {
        const ph = await import('/js/physics.js');
        const w = await import('/js/gwWidgets.js');
        const gw = await import('/js/gwLab.js');
        const s = w.activeLab();
        let xs = 0;
        let ys = 0;
        for (let i = 0; i < 24; i++) {
          gw.seekFraction(s, 0.4 + i * 0.004);
          // The widget places the bodies on its next paint; force one.
          const tl = s.timeline;
          const t = s.cursorT;
          const stage = await import('/js/lessonStage.js');
          stage.placeBinary(
            tl.separationRsAtTime(t),
            tl.orbitalPhaseAtTime(t),
            {
              m1: s.params.m1,
              m2: s.params.m2,
              inclinationDeg: s.params.inclinationDeg,
            }
          );
          const b = [...ph.bh_list, ...ph.neutron_stars][0];
          xs = Math.max(xs, Math.abs(b.pos.x));
          ys = Math.max(ys, Math.abs(b.pos.y));
        }
        return { xs, ys };
      });
    };

    const faceOn = await spread(0);
    const edgeOn = await spread(90);
    // Face-on the orbit is a circle, so the pair swings as far up and down as
    // side to side. Edge-on it is a line. The inclination control changes the
    // waveform, the polarisation and the strain; it used to leave the picture
    // of the orbit resolutely face-on whatever it was set to.
    expect(faceOn.ys / faceOn.xs).toBeGreaterThan(0.8);
    expect(edgeOn.ys / edgeOn.xs).toBeLessThan(0.05);
  });
});

test.describe('seek, and what follows it', () => {
  test('the scene phase and the playhead move together', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Watch the waves leave');
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const w = await import('/js/gwWidgets.js');
      const s = w.activeLab();
      if (s) s.playing = false;
    });

    const cursor = page.locator(
      '#investigationToolControls [data-tool="cursor"]'
    );
    await expect(cursor).toBeVisible();
    const at = async f => {
      await cursor.focus();
      await cursor.fill(String(f));
      await cursor.dispatchEvent('input');
      await page.waitForTimeout(350);
      return both(page);
    };
    const a = await at(0.3);
    const b = await at(0.7);
    const c = await at(0.3);
    // Seeking moves the pair, and seeking back puts it exactly where it was:
    // the positions come from the model time and from nothing else.
    expect(b.cursorT).toBeGreaterThan(a.cursorT);
    expect(b.phase).not.toBeCloseTo(a.phase, 3);
    expect(c.cursorT).toBeCloseTo(a.cursorT, 9);
    expect(c.phase).toBeCloseTo(a.phase, 9);
    expect(c.separation).toBeCloseTo(a.separation, 9);
  });
});

test.describe('audio', () => {
  test('nothing is left running when the lesson closes', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Watch the waves leave');
    await page.waitForTimeout(600);

    const audioState = () =>
      page.evaluate(async () => {
        const a = await import('/js/gwAudio.js');
        return {
          playing: a.isPlaying(),
          owner: a.currentOwner(),
          state: a.state(),
        };
      });
    const before = await audioState();

    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await page.waitForTimeout(600);
    const after = await audioState();
    // Whatever it was doing, it is not doing it now. A lesson that left a
    // synth running after its panel closed would be audible with nothing on
    // screen to explain it.
    expect(after.playing === true).toBe(false);
    expect(before).toBeTruthy();
  });
});
