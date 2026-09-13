// =============================================================================
// One star, in three places at once
// -----------------------------------------------------------------------------
// "A Universe of Stars" puts its stars on the main canvas, plots them on the
// H-R diagram, lists them in the accessible object list and compares them on a
// card. The lesson's whole method depends on those being one star rather than
// four pictures of one - a student reads a radius off the card and a
// temperature off the list and divides them, and if the two came from
// different resolutions of the same declaration the arithmetic is nonsense.
//
// They did come from different resolutions. A bare `{track: 'm500'}` was the
// middle of the main sequence to the card and forty per cent of the way
// through the track's age to the canvas: 16,596 K and 3.26 solar radii against
// 16,687 K and 3.18, under one name, on one screen.
//
// These are browser tests rather than unit tests because the claim is about
// what a student can actually do: click a star and see it light up somewhere
// else, move a control and watch the scene follow, drag a threshold and have
// both views move together. A unit test that the two resolvers agree is in
// tests/stellarSample.test.js and is not the same claim.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'a-universe-of-stars';

/** Open the lesson through the interface, the way a student does. */
async function openLesson(page, app) {
  await app.boot();
  await expect(page.locator('#investigationsBtn')).toBeVisible();
  await page.locator('#investigationsBtn').click();
  await expect(page.locator('#investigationBrowser')).toBeVisible();
  await page.locator(`[data-investigation="${LESSON}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/**
 * Walk forward to a step by its title.
 *
 * By title rather than by number: the progress line counts steps *visited*,
 * not the position in the lesson, so a walk that trusted it would stop in the
 * wrong place the moment a reader had been further before.
 */
async function goTo(page, title) {
  for (let n = 0; n < 40; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    await page.locator('#investigationNext').click();
    await page.waitForTimeout(120);
  }
  throw new Error(`never reached the step titled "${title}"`);
}

/** The stars standing on the main canvas, as the scene knows them. */
const onCanvas = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return p.stars.map(s => ({
      id: s.id,
      name: s.name,
      teffK: s.temperature,
      radiusSun: s.radiusInSuns,
      luminositySun: s.luminosityInSuns,
    }));
  });

/** The stars on the comparison card, as the instrument knows them. */
const onCard = page =>
  page.evaluate(async () => {
    const w = await import('/js/stellarWidgets.js');
    const lab = w.activeLab();
    return (lab?.pinned ?? []).map(x => ({
      pinId: x.pinId,
      name: x.name,
      bodyId: x.bodyId,
      teffK: x.teffK,
      radiusSun: x.radiusSun,
      luminositySun: x.luminositySun,
    }));
  });

const focusedPin = page =>
  page.evaluate(async () => {
    const w = await import('/js/stellarWidgets.js');
    return w.activeLab()?.focusPinId ?? null;
  });

const selectedInScene = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    return state.selectedObject?.object?.name ?? null;
  });

/** Move a tool control the way the interface does, and let it settle. */
async function setControl(page, id, value) {
  const el = page.locator(`#investigationToolControls [data-tool="${id}"]`);
  await expect(el).toBeVisible();
  await el.fill(String(value));
  await el.dispatchEvent('input');
  await page.waitForTimeout(250);
}

/** Wait until the comparison card has seeded itself from the stage. */
async function cardReadyLocal(page, atLeast = 2) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const w = await import('/js/stellarWidgets.js');
          return w.activeLab()?.pinned?.length ?? 0;
        }),
      { timeout: 15_000 }
    )
    .toBeGreaterThanOrEqual(atLeast);
}

test.describe('the canvas and the comparison card show one sample', () => {
  test('every star on the card is a star on the canvas, to the last digit @accepts:ce.a-universe-of-stars', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await page.waitForTimeout(400);

    const scene = await onCanvas(page);
    const card = await onCard(page);
    expect(card.length).toBeGreaterThan(1);

    for (const pin of card) {
      // Matched by body id, not by position and not by looking similar.
      const star = scene.find(s => s.id === pin.bodyId);
      expect(star, `pin ${pin.pinId} names no body on the canvas`).toBeTruthy();
      expect(pin.name).toBe(star.name);
      // Same resolution, so these are equal rather than close. The defect
      // this replaces showed up as a fraction of a per cent.
      expect(pin.teffK).toBeCloseTo(star.teffK, 9);
      expect(pin.radiusSun).toBeCloseTo(star.radiusSun, 9);
      expect(pin.luminositySun).toBeCloseTo(star.luminositySun, 9);
    }
  });

  test('the accessible object list names the same stars', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await page.waitForTimeout(400);
    const listed = await page
      .locator('#investigationObjects [data-object-id]')
      .allInnerTexts();
    const scene = await onCanvas(page);
    for (const star of scene) {
      expect(listed.join(' | ')).toContain(star.name);
    }
  });
});

test.describe('choosing a star, in either direction', () => {
  test('selecting one in the scene marks it on the card', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await page.waitForTimeout(400);

    const scene = await onCanvas(page);
    const target = scene[1];
    await page.evaluate(async id => {
      const p = await import('/js/physics.js');
      const s = await import('/js/lessonScene.js');
      s.selectBody(p.stars.find(x => x.id === id));
    }, target.id);
    // The instrument is repainted from the probe tick, not from the click, so
    // this polls rather than sleeping a fixed time.
    await expect.poll(() => focusedPin(page), { timeout: 8000 }).not.toBeNull();
    const card = await onCard(page);
    const pinId = await focusedPin(page);
    expect(card.find(p => p.pinId === pinId)?.bodyId).toBe(target.id);
  });

  test('the keyboard control selects the star in the scene', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await page.waitForTimeout(400);

    // The accessible alternative to clicking a disc. It is a numbered control
    // rather than a pointer target, so a reader who cannot use a pointer can
    // still say which star they mean.
    await setControl(page, 'focus', 1);
    const firstId = await focusedPin(page);
    const first = (await onCard(page)).find(p => p.pinId === firstId);
    expect(first).toBeTruthy();
    await expect.poll(() => selectedInScene(page)).toBe(first.name);

    await setControl(page, 'focus', 2);
    const secondId = await focusedPin(page);
    expect(secondId).not.toBe(firstId);
    const second = (await onCard(page)).find(p => p.pinId === secondId);
    expect(second).toBeTruthy();
    await expect.poll(() => selectedInScene(page)).toBe(second.name);
  });
});

test.describe('re-ordering the comparison', () => {
  test('changes the order and nothing else', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    // A step that leaves the ordering control on, and stands three stars.
    await goTo(page, 'And now a supergiant');
    await page.waitForTimeout(500);

    const before = await onCard(page);
    expect(before.length).toBeGreaterThan(2);
    const identity = new Map(
      before.map(p => [
        p.pinId,
        { name: p.name, bodyId: p.bodyId, teffK: p.teffK, r: p.radiusSun },
      ])
    );

    // Order by temperature instead of radius.
    await setControl(page, 'order', 1);
    const after = await onCard(page);
    expect(after.map(p => p.pinId).sort()).toEqual(
      before.map(p => p.pinId).sort()
    );
    for (const pin of after) {
      expect({
        name: pin.name,
        bodyId: pin.bodyId,
        teffK: pin.teffK,
        r: pin.radiusSun,
      }).toEqual(identity.get(pin.pinId));
    }
  });

  test('a star kept its name through the re-order, on screen', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'And now a supergiant');
    await page.waitForTimeout(500);
    const rows = () =>
      page.locator('#investigationToolReadout .inv-tool-row').allInnerTexts();

    const before = (await rows()).join(' ');
    expect(before).toContain('Supergiant');
    await setControl(page, 'order', 1);
    const after = (await rows()).join(' ');
    // The same three stars are named; the card is not relabelling them by
    // position, which is what "Star 1..N" used to do.
    for (const name of ['The Sun', 'Red giant', 'Supergiant']) {
      expect(after).toContain(name);
    }
  });
});

test.describe('the free cursor and the star it names', () => {
  /** Set a range control and let the widget notice, without fill()'s snapping. */
  const setRange = (page, id, value) =>
    page.evaluate(
      ([sel, v]) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.value = String(v);
        el.dispatchEvent(new window.Event('input', { bubbles: true }));
        return true;
      },
      [`#investigationToolControls [data-tool="${id}"]`, value]
    );

  test('moving it changes the temperature, the luminosity and the size drawn', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'What temperature does to colour');
    await page.waitForTimeout(700);

    const read = () =>
      page.evaluate(async () => {
        const p = await import('/js/physics.js');
        const s = p.stars[0];
        return (
          s && {
            name: s.name,
            teffK: s.temperature,
            lum: s.luminosityInSuns,
            rSun: s.radiusInSuns,
            drawn: s.stageRadius,
            mass: s.massInSuns,
            age: s.ageYr,
          }
        );
      });

    const before = await read();
    expect(before.name).toBe('Your star');

    // The controls are the accessible half of dragging the cursor: both axes
    // are log, and both are keyboard-reachable sliders.
    expect(await setRange(page, 'teff', Math.log10(30000))).toBe(true);
    expect(await setRange(page, 'lum', 3)).toBe(true);
    await page.waitForTimeout(500);

    const after = await read();
    expect(after.teffK).toBeGreaterThan(before.teffK * 4);
    expect(after.lum).toBeGreaterThan(before.lum * 100);
    // The radius follows from the other two - that is the relation the whole
    // screen is about - and so does the size the star is drawn at. The drawn
    // size used to stay put: the fields were written straight onto the body,
    // and the fourth number, the presentation radius, is derived from the
    // radius and the stage's scale by the stage rather than by the star.
    expect(after.rSun).toBeGreaterThan(before.rSun);
    expect(after.drawn).toBeGreaterThan(before.drawn);

    // And a point on the diagram still fixes no mass and no age.
    expect(after.mass).toBeNull();
    expect(after.age).toBeNull();
  });

  test('the arrow keys move it too', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'What temperature does to colour');
    await page.waitForTimeout(700);

    const teff = () =>
      page.evaluate(
        async () => (await import('/js/physics.js')).stars[0].temperature
      );
    const before = await teff();
    const canvas = page.locator('#investigationToolCanvas');
    await canvas.focus();
    for (let n = 0; n < 12; n++) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(400);
    // Left is hotter on this diagram, and the handler flips the axis so the
    // keys follow the picture rather than the slider.
    expect(await teff()).toBeGreaterThan(before);
  });
});

test.describe('the population, in two views of one sample', () => {
  test('the threshold moves the scene as well as the plot', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Now only the ones you could see');
    await page.waitForTimeout(800);

    const names = async () => (await onCanvas(page)).map(s => s.name);
    const loose = await names();
    expect(loose.length).toBeGreaterThan(2);

    // Raise the cut. Fewer stars, and every one of them was already there.
    await setControl(page, 'threshold', -3);
    await expect
      .poll(async () => (await names()).length, { timeout: 8000 })
      .toBeLessThan(loose.length);
    const tight = await names();
    for (const n of tight) expect(loose).toContain(n);

    // Put it back. Exactly the same stars, in the same order - the population
    // underneath was never re-rolled, which is the sentence the step makes.
    await setControl(page, 'threshold', -4);
    await expect
      .poll(async () => (await names()).join(','), { timeout: 8000 })
      .toBe(loose.join(','));
  });

  test('the panel and the scene agree on how many passed', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Now only the ones you could see');
    await page.waitForTimeout(800);

    const agree = async () =>
      page.evaluate(async () => {
        const w = await import('/js/stellarWidgets.js');
        const lab = await import('/js/stellarLab.js');
        const stage = await import('/js/lessonStage.js');
        const p = await import('/js/physics.js');
        const state = w.activeLab();
        return {
          panelKept: lab.brightOf(state).kept,
          sceneVisible: stage.stagedPopulation()?.visible ?? null,
          onCanvas: p.stars.length,
        };
      });

    for (const cut of [-4, -3, -5]) {
      await setControl(page, 'threshold', cut);
      await page.waitForTimeout(500);
      const seen = await agree();
      // One selection function: what the panel counts as passing is what the
      // scene counts as passing. These used to be two filters in two units.
      expect(seen.sceneVisible).toBe(seen.panelKept);
      // And what stands on the canvas is exactly the ones that passed, at the
      // lesson's own settings, where the shelf holds the whole modelled set.
      expect(seen.onCanvas).toBe(seen.panelKept);
    }
  });

  test('picking one of the four hundred marks it in the panel', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Four hundred stars');
    await page.waitForTimeout(900);

    // Select a star out of the crowd, the way clicking the canvas would.
    const chosen = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const scene = await import('/js/lessonScene.js');
      const star = p.stars[40];
      scene.selectBody(star);
      return star.name;
    });
    expect(chosen).toBeTruthy();

    // The panel names it. A four-hundred-star scatter is not readable by
    // eye, so the accessible column is where "which one did I click" is
    // actually answered.
    await expect
      .poll(
        async () =>
          (
            await page
              .locator('#investigationToolReadout .inv-tool-row')
              .allInnerTexts()
          ).join(' '),
        { timeout: 10_000 }
      )
      .toMatch(/star you picked/i);

    const row = (
      await page
        .locator('#investigationToolReadout .inv-tool-row')
        .allInnerTexts()
    ).find(x => /star you picked/i.test(x));
    // Type, temperature, luminosity, mass, and whether a survey would have
    // listed it - which is the fact the next two screens are about.
    expect(row).toMatch(/M☉/);
    expect(row).toMatch(/above the cut|below the cut/);
  });

  test('the readout names the four populations apart', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Now only the ones you could see');
    await page.waitForTimeout(800);
    const text = (
      await page
        .locator('#investigationToolReadout .inv-tool-row')
        .allInnerTexts()
    ).join(' ');
    // Drawn, modelled, passing, and standing on the canvas: four numbers that
    // are routinely read as one.
    expect(text).toMatch(/On the canvas/i);
    expect(text).toMatch(/400/);
    expect(text).toMatch(/351/);
  });
});

test.describe('a selection moves the cursor, not the mode', () => {
  test('clicking the hypothetical star does not take the age slider away', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    // This screen stands the Sun beside a hot, faint point that is on no
    // track, and tells the reader to drag the age slider to the end of the
    // Sun's. Selecting the hypothetical one used to flip the lab to the free
    // cursor, where there is no age slider to drag.
    await goTo(page, 'Hot, and almost invisible');
    await page.waitForTimeout(800);

    const controls = () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '#investigationToolControls [data-tool]'
          ),
        ].map(e => e.dataset.tool)
      );
    const before = await controls();
    expect(before).toContain('age');

    const picked = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const scene = await import('/js/lessonScene.js');
      const star = p.stars.find(s => !Number.isFinite(s.ageYr)) ?? p.stars[1];
      scene.selectBody(star);
      return { name: star.name, age: star.ageYr, mass: star.massInSuns };
    });
    // The star chosen really is the hypothetical one: no age, no mass.
    expect(picked.age).toBeNull();
    expect(picked.mass).toBeNull();
    await page.waitForTimeout(900);

    // The controls are the ones the step set up, and the lab is still in the
    // mode the step chose.
    expect(await controls()).toEqual(before);
    const mode = await page.evaluate(async () => {
      const w = await import('/js/stellarWidgets.js');
      return w.activeLab()?.mode ?? null;
    });
    expect(mode).toBe('model');

    // And the star is still marked, which is the half that has to keep
    // working: where it sits on the diagram is a fact about the star.
    const marked = await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      return state.selectedObject?.object?.name ?? null;
    });
    expect(marked).toBe(picked.name);
  });
});

test.describe('switching between a model and a chosen point', () => {
  test('the same star gains and loses a mass, an age and a lifetime', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'What temperature does to colour');
    await page.waitForTimeout(700);

    const read = () =>
      page.evaluate(async () => {
        const p = await import('/js/physics.js');
        const s = p.stars[0];
        return {
          id: s.id,
          name: s.name,
          source: s.modelSource,
          teffK: s.temperature,
          lum: s.luminosityInSuns,
          mass: s.massInSuns,
          age: s.ageYr,
        };
      });

    // The step opens on the free cursor: a point somebody chose.
    const free = await read();
    expect(free.source).toBe('free');
    expect(free.mass).toBeNull();
    expect(free.age).toBeNull();

    // Switch the lab to a modelled star. Same body - same id - and now it
    // carries a mass and an age, because a track supplies them.
    await page.evaluate(async () => {
      const w = await import('/js/stellarWidgets.js');
      const lab = await import('/js/stellarLab.js');
      lab.setMode(w.activeLab(), lab.MODE.MODEL);
    });
    await page.evaluate(() => {
      const el = document.querySelector(
        '#investigationToolControls [data-tool="age"]'
      );
      el.value = String(Number(el.value) - 0.01);
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    const modelled = await read();
    expect(modelled.id).toBe(free.id);
    expect(modelled.source).toBe('model');
    expect(Number.isFinite(modelled.mass)).toBe(true);
    expect(Number.isFinite(modelled.age)).toBe(true);

    // And back. The numbers a track supplied have to go again rather than
    // being left on a body nothing is modelling any more - a stale mass on a
    // hypothetical point is exactly the claim the two modes exist to keep
    // apart.
    await page.evaluate(async () => {
      const w = await import('/js/stellarWidgets.js');
      const lab = await import('/js/stellarLab.js');
      lab.setMode(w.activeLab(), lab.MODE.FREE);
    });
    await page.evaluate(() => {
      const el = document.querySelector(
        '#investigationToolControls [data-tool="teff"]'
      );
      el.value = String(Number(el.value) + 0.05);
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    const backToFree = await read();
    expect(backToFree.id).toBe(free.id);
    expect(backToFree.source).toBe('free');
    expect(backToFree.mass).toBeNull();
    expect(backToFree.age).toBeNull();
  });
});

test.describe('true sizes and compressed sizes', () => {
  test('the switch changes what is drawn and nothing else', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'And now a supergiant');
    await cardReadyLocal(page, 3);

    const snap = () =>
      page.evaluate(async () => {
        const p = await import('/js/physics.js');
        const w = await import('/js/stellarWidgets.js');
        return {
          stars: p.stars.map(s => ({
            name: s.name,
            rSun: s.radiusInSuns,
            engine: s.radius,
            drawn: s.stageRadius,
            x: s.pos.x,
            y: s.pos.y,
          })),
          card: (w.activeLab()?.pinned ?? []).map(x => ({
            pinId: x.pinId,
            r: x.radiusSun,
          })),
        };
      });

    const before = await snap();
    await page.evaluate(() => {
      const el = document.querySelector(
        '#investigationToolControls [data-tool="size"]'
      );
      el.value = '1';
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    const after = await snap();

    // The card's own numbers do not move: "fit each star to its box" is a
    // statement about the picture, not about the stars.
    expect(after.card).toEqual(before.card);
    // Nor do the physical radii, the engine radii or the positions. A
    // presentation control that moved any of those would be changing the
    // scene to change the picture.
    for (const [i, star] of after.stars.entries()) {
      expect({ ...star, drawn: 0 }).toEqual({ ...before.stars[i], drawn: 0 });
    }
  });

  test('the caption says which picture is on screen', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'And now a supergiant');
    await cardReadyLocal(page, 3);
    const rows = () =>
      page.locator('#investigationToolReadout .inv-tool-row').allInnerTexts();
    expect((await rows()).join(' ')).toMatch(/one common scale/i);
    await page.evaluate(() => {
      const el = document.querySelector(
        '#investigationToolControls [data-tool="size"]'
      );
      el.value = '1';
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    // The magnified mode has to say so, because in it the discs are no longer
    // comparable and the whole comparison would otherwise read as a lie.
    expect((await rows()).join(' ')).toMatch(/not comparable/i);
  });
});

test.describe('what a capture carries out of the lesson', () => {
  test('the entry names the stars and says where the sample came from', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await cardReadyLocal(page, 2);

    // "Save to notebook" offers a draft in the notebook panel rather than
    // writing silently, so what is checked here is what the student is shown
    // before they keep it - which is the version they can still argue with.
    await page.locator('#investigationToolActions button').last().click();
    await expect(page.locator('#evidenceNotebook')).toBeVisible({
      timeout: 30_000,
    });

    const draft = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const d = panel.pendingDraft();
      return d
        ? {
            labels: d.snapshot.quantities.map(q => q.label),
            limitations: d.prose.limitations,
          }
        : null;
    });
    expect(draft).toBeTruthy();
    const labels = draft.labels.join(' | ');
    // Named, not numbered: an entry that said "pinned star 2" would stop
    // meaning anything the moment the card was re-ordered - and the card can
    // be re-ordered from a control on the same screen.
    expect(labels).toContain('The smaller one');
    expect(labels).toContain('The brighter one');
    expect(labels).not.toMatch(/Pinned star \d/);
    // Radius and temperature for each, so a ratio written in the prose can be
    // checked against the entry rather than taken on trust.
    expect(labels).toMatch(/The smaller one: radius/);
    expect(labels).toMatch(/The brighter one: temperature/);
    // And it says where the sample came from, and which grid produced it.
    expect(draft.limitations).toMatch(/standing on the canvas/i);
    expect(draft.limitations).toMatch(/MIST/);
  });
});
