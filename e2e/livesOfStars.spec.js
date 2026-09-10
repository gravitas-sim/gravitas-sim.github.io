// =============================================================================
// Lives of stars, walked end to end
// -----------------------------------------------------------------------------
// Thirty-four steps, three instruments, four evolutionary tracks and an
// evidence export, in two languages, from the keyboard, at phone width, and
// across a save and a resume.
//
// Two checks here are about this lesson specifically rather than about lessons
// in general. The first is that switching tracks leaves no state behind from
// the previous one - a playhead parked at a white dwarf must not carry into a
// star that has not got one. The second is that replaying produces the same
// picture: the remnant is drawn from the playhead's position and not spawned
// as an event, and a scrub backwards has to remove it rather than leave two.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'lives-of-stars';
const STEPS = 34;

/** Open the lesson through the interface, the way a student does. */
async function openLesson(page, app, { locale, narrow = false } = {}) {
  await app.boot();
  if (locale) {
    await page.evaluate(async id => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(id, { persist: false });
    }, locale);
  }
  if (narrow) {
    const menu = page.locator('#mobileMenuToggle');
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await expect(page.locator('#investigationsBtn')).toBeVisible();
  await page.locator('#investigationsBtn').click();
  await expect(page.locator('#investigationBrowser')).toBeVisible();
  const card = page.locator(`[data-investigation="${LESSON}"]`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

// `#investigationProgressText` counts steps VISITED, not the step showing, so
// it never goes down when a student walks backwards. The step heading is the
// one that does. Both are pulled positionally rather than by the word between
// the numbers, so the Spanish walk does not silently read zero.
const counterNumbers = async page => {
  const text = await page
    .locator('#investigationBody .inv-step-count')
    .innerText();
  return [...text.matchAll(/\d+/g)].map(m => Number(m[0]));
};
const stepNumber = async page => (await counterNumbers(page))[0] ?? 0;
const stepTotal = async page => (await counterNumbers(page))[1] ?? 0;

/**
 * What the models actually give, by step and field id.
 *
 * Per-step because several ids mean different things on different screens -
 * `radius` is the Sun's on screen 7 and a white dwarf's on screen 20 - and
 * because half of these validators compare two boxes against each other, so
 * plausible-but-wrong numbers would still be caught.
 */
const BY_STEP = {
  4: { rEarly: 14.9, rLate: 0.884, ageLate: 41.9 },
  6: { teff: 5736, lum: 0.797, age: 457 },
  7: { teff: 5850, lum: 1.11, radius: 1.03 },
  8: { lumStart: 0.797, lumEnd: 2.28, age: 9.9 },
  9: { rStart: 0.904, rEnd: 1.56 },
  12: { rStart: 1.65, rTip: 172.6, tTip: 3070 },
  14: { teff: 3070, lum: 2386, radius: 172.6, mass: 0.954 },
  17: { born: 1, now: 0.54 },
  20: { teff: 47621, lum: 1.58, radius: 0.0185 },
  21: { ms: 9.88, rgb: 1.42, agb: 1.35 },
  23: { sun: 1.11, dwarf: 0.0048 },
  25: { lumSun: 1.11, lumBig: 43400, msSun: 9.88, msBig: 8.65 },
  29: { remnant: 1.4, atStop: 9.41 },
  31: { atStop: 35.1, lo: 10, hi: 35 },
  33: { massA: 1, massB: 20, lumA: 1.11, lumB: 43400 },
};

const PROSE =
  'A star is held up by the pressure that the energy released in its core maintains. When core hydrogen ran out the star could contract, heat, and start burning helium, so the support came back. Iron is where that stops working: fusing iron absorbs energy rather than releasing it, so contracting buys no new source and nothing halts the collapse. Mass sets all of it - the 20 solar-mass model lives 8.65 million years against the Sun-like model 9.88 billion. One limitation: these are single stars with no companion, so no mass transfer and no merger is modelled anywhere.';

/** Answer whatever the current step asks and move on. */
async function answerAndAdvance(page, step) {
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();

  const values = BY_STEP[step] || {};
  const fields = page.locator('#investigationBody input[data-field]');
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const input = fields.nth(i);
    if (await input.isDisabled()) continue;
    const id = await input.getAttribute('data-field');
    if (!(await input.inputValue())) await input.fill(String(values[id] ?? 1));
  }

  const boxes = page.locator('#investigationBody input[type="checkbox"]');
  const boxCount = await boxes.count();
  for (let i = 0; i < boxCount; i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check();
  }

  const textarea = page.locator('#investigationBody textarea');
  if ((await textarea.count()) && !(await textarea.first().inputValue())) {
    await textarea.first().fill(PROSE);
  }

  const before = await stepNumber(page);
  await page.locator('#investigationNext').click();
  await expect
    .poll(() => stepNumber(page), { timeout: 20_000 })
    .toBeGreaterThan(before);
}

test.describe('the lesson is reachable and complete', () => {
  test('it is in the browser with the right shape on its card', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const card = page.locator(`[data-investigation="${LESSON}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Lives of Stars/i);
    await expect(card).toContainText(/34/);
  });

  test('every step draws an instrument and a readout with no placeholders', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    expect(await stepTotal(page)).toBe(STEPS);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message)));

    for (let step = 1; step <= STEPS; step++) {
      await expect(page.locator('.inv-step-title')).not.toBeEmpty();
      const canvas = page.locator('#investigationToolCanvas');
      await expect(canvas).toBeVisible();
      expect(await canvas.evaluate(c => c.width)).toBeGreaterThan(10);

      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toBeVisible();
      const text = await readout.innerText();
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(
        /stelE\.|stelW\.|stellar\.|NaN|undefined|\{[a-z]+\}/
      );

      if (step < STEPS) await answerAndAdvance(page, step);
    }
    expect(await stepNumber(page)).toBe(STEPS);
    expect(errors).toEqual([]);
  });
});

test.describe('the playback behaves under a student', () => {
  /** Park on the screen that first shows the evolution instrument. */
  async function toStep(page, app, n, opts) {
    await openLesson(page, app, opts);
    for (let i = 1; i < n; i++) await answerAndAdvance(page, i);
  }

  test('the phase buttons move it without any animation running', async ({
    page,
    app,
  }) => {
    await toStep(page, app, 2);
    const readout = page.locator('#investigationToolReadout');
    await expect(readout).toContainText(/collapsing cloud/i);
    // Forward one phase reaches the first modelled point.
    await page.locator('[data-tool-action="next"]').click();
    await expect(readout).toContainText(/Pre-main-sequence/i);
    // ...and back again, with nothing left over.
    await page.locator('[data-tool-action="prev"]').click();
    await expect(readout).toContainText(/collapsing cloud/i);
  });

  test('the cloud is given no numbers, and the readout says why', async ({
    page,
    app,
  }) => {
    await toStep(page, app, 2);
    const text = await page.locator('#investigationToolReadout').innerText();
    expect(text).toMatch(/inventing them|does not describe/i);
    expect(text).not.toMatch(/Surface temperature/);
  });

  test('switching tracks leaves nothing behind from the last one', async ({
    page,
    app,
  }) => {
    test.slow();
    // Screen 22 switches to the 0.2 solar-mass model, which has no remnant at
    // all. A playhead carried over from the white dwarf would put it in one.
    await toStep(page, app, 22);
    const text = await page.locator('#investigationToolReadout').innerText();
    expect(text).toMatch(/0\.2 M/);
    expect(text).toMatch(/Main sequence/i);
    expect(text).not.toMatch(/white dwarf|neutron star|black hole/i);
  });

  test('replaying draws the same thing, with no duplicated remnant', async ({
    page,
    app,
  }) => {
    test.slow();
    await toStep(page, app, 20);
    const readout = page.locator('#investigationToolReadout');
    await expect(readout).toContainText(/white dwarf/i);
    const atEnd = await readout.innerText();

    // Back to the start and forward again, by the buttons rather than by time.
    await page.locator('[data-tool-action="restart"]').click();
    await expect(readout).not.toContainText(/Ends as/);
    for (let i = 0; i < 12; i++) {
      const next = page.locator('[data-tool-action="next"]');
      if (!(await next.isEnabled())) break;
      await next.click();
    }
    const again = await readout.innerText();
    expect(again).toContain('Ends as');
    // One endpoint section, not two.
    expect((again.match(/Ends as/g) || []).length).toBe(1);
    expect(again.includes('white dwarf')).toBe(atEnd.includes('white dwarf'));
  });

  test('a black hole is never given a place on the diagram', async ({
    page,
    app,
  }) => {
    test.slow();
    await toStep(page, app, 31);
    const text = await page.locator('#investigationToolReadout').innerText();
    expect(text).toMatch(/black hole/i);
    expect(text).toMatch(/no photosphere/i);
    expect(text).toMatch(/Sukhbold/);
  });
});

test.describe('the lesson survives the things a student does to it', () => {
  test('it can be left and resumed, and walked backwards', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    for (let i = 1; i <= 5; i++) await answerAndAdvance(page, i);
    expect(await stepNumber(page)).toBe(6);

    // Backwards, which must not lose the answers already given.
    await page.locator('#investigationPrev').click();
    await expect.poll(() => stepNumber(page), { timeout: 10_000 }).toBe(5);
    await page.locator('#investigationNext').click();
    await expect.poll(() => stepNumber(page), { timeout: 10_000 }).toBe(6);

    await page.reload();
    await page.evaluate(() => document.getElementById('welcomeClose')?.click());
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    expect(await stepNumber(page)).toBe(6);
  });

  test('it runs in Spanish, in Spanish', async ({ page, app }) => {
    await openLesson(page, app, { locale: 'es' });
    expect(await stepTotal(page)).toBe(STEPS);
    await expect(page.locator('.inv-step-title')).toContainText(
      /Tres estrellas/i
    );
    for (let i = 1; i <= 6; i++) await answerAndAdvance(page, i);
    const body = await page.locator('#investigationBody').innerText();
    expect(body).toMatch(/estrella|diagrama|secuencia/i);
    expect(body).not.toMatch(/Which way across the diagram/i);
    const readout = await page.locator('#investigationToolReadout').innerText();
    expect(readout).not.toMatch(/stelE\.|NaN|undefined/);
  });

  test('it completes with reduced motion, where nothing plays by itself', async ({
    page,
    app,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openLesson(page, app);
    for (let i = 1; i <= 8; i++) await answerAndAdvance(page, i);
    expect(await stepNumber(page)).toBe(9);
    // The playhead only moves when asked to.
    const slider = page.locator(
      '#investigationTool input[data-tool="position"]'
    );
    if (await slider.count()) {
      const before = await slider.inputValue();
      await page.waitForTimeout(1200);
      expect(await slider.inputValue()).toBe(before);
    }
  });

  test('it is usable at phone width', async ({ page, app }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLesson(page, app, { narrow: true });
    for (let i = 1; i <= 3; i++) await answerAndAdvance(page, i);
    const canvas = page.locator('#investigationToolCanvas');
    await expect(canvas).toBeVisible();
    expect((await canvas.boundingBox()).width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('a capture carries the stage, the pacing and the source', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    for (let i = 1; i < 29; i++) await answerAndAdvance(page, i);
    // Screen 29 is the neutron star: an endpoint that is quoted, not computed.
    const capture = page.locator(
      '#investigationTool [data-tool-action="capture"]'
    );
    await expect(capture).toBeVisible();
    await capture.click();
    await expect(page.locator('.nb-draft')).toBeVisible();
    await page
      .locator('#nbDraftClaim')
      .fill('A neutron star of about 1.4 solar masses.');
    await page.locator('#nbDraftSave').click();

    const entries = await page.evaluate(async () => {
      const nb = await import('/js/notebook/store.js');
      return (nb.load().entries || []).map(e => JSON.stringify(e));
    });
    const mine = entries.filter(e => e.includes('stellar-lab'));
    expect(mine.length).toBeGreaterThan(0);
    const text = mine[mine.length - 1];
    expect(text).toMatch(/MIST/);
    expect(text).toMatch(/stage:remnant/);
    expect(text).toMatch(/paced-by:/);
    expect(text).toMatch(/Sukhbold/);
  });
});

test.describe('the first stellar lesson still works', () => {
  test('a universe of stars opens and advances', async ({ page, app }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const card = page.locator('[data-investigation="a-universe-of-stars"]');
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    expect(await stepTotal(page)).toBe(28);
    await page.locator('#investigationBody .inv-option').first().click();
    await page.locator('#investigationNext').click();
    await expect.poll(() => stepNumber(page), { timeout: 20_000 }).toBe(2);
  });
});
