// =============================================================================
// A universe of stars, walked end to end
// -----------------------------------------------------------------------------
// The lesson's content is checked without a browser by the authoring rules and
// the instructor-materials suite. What needs a browser is whether a student can
// get through it: twenty-eight steps, three instruments, a synthetic
// population and an evidence capture, in two languages, from the keyboard, at
// phone width, and across a save and resume.
//
// The keyboard run is not a nicety. Five of these steps ask a student to put a
// cursor somewhere on a diagram, and the lesson's claim is that the arrow keys
// and the sliders do the same job as dragging. A walk that only ever dragged
// would never find out.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'a-universe-of-stars';
const STEPS = 28;

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
 * Values that satisfy every validator in the lesson, by field id.
 *
 * Chosen to be what the models actually give rather than merely to pass: a
 * walk that types 1 into every box tests nothing, and several of these
 * validators check a ratio between two of the boxes, so wrong numbers in the
 * right order would still be caught.
 */
const ANSWERS = {
  coolest: 3373,
  middle: 4298,
  hottest: 16596,
  small: 0.7764,
  large: 14.26,
  teff: 10000,
  lum: 100,
  radius: 1.0,
  coolT: 3000,
  coolL: 0.0729,
  hotT: 12000,
  hotL: 18.7,
  smallL: 0.006639,
  bigL: 58550,
  one: 1.196,
  five: 725.6,
  twenty: 58550,
  rSmall: 0.2386,
  rBig: 101.6,
  lSmall: 0.006639,
  lBig: 1146,
  mass: 14.1,
  sun: 9.878,
  big: 0.00865,
  m: 227,
  k: 93,
  g: 21,
  kept: 16,
  f: 8,
  aT: 3591,
  aL: 172200,
  bT: 47621,
  bL: 1.585,
};

/** Per-step overrides, where one field id means two different things. */
const BY_STEP = {
  9: { radius: 100 },
  20: { teff: 47621, lum: 1.585, radius: 0.0185 },
  19: { radius: 1072, mass: 14.1 },
  23: { small: 1140000, sun: 9.878, big: 0.00865 },
  25: { kept: 16, m: 0, f: 8 },
};

const PROSE =
  'The main sequence is the long stretch during which a star fuses hydrogen in its core, and while it lasts the mass largely fixes the temperature and the luminosity, which is why those stars fall in a narrow band. The giant is the same star later: it is no longer supported that way, so a relation fitted to core hydrogen burning has no reason to hold for it. My two red stars at 3,350 K differed by 426 in radius, and the white dwarf was 47,600 K at 1.6 solar luminosities.';

/** Answer whatever the current step asks and move on. */
async function answerAndAdvance(page, step) {
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();

  const values = { ...ANSWERS, ...(BY_STEP[step] || {}) };
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
  test('it is in the browser, with the right shape on its card', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const card = page.locator(`[data-investigation="${LESSON}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(/A Universe of Stars/i);
    await expect(card).toContainText(/28/);
  });

  test('it opens on step 1 of 28', async ({ page, app }) => {
    await openLesson(page, app);
    expect(await stepNumber(page)).toBe(1);
    expect(await stepTotal(page)).toBe(STEPS);
  });

  test('every step draws an instrument and a readout with no placeholders', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message)));

    for (let step = 1; step <= STEPS; step++) {
      await expect(page.locator('.inv-step-title')).not.toBeEmpty();
      const canvas = page.locator('#investigationToolCanvas');
      await expect(canvas).toBeVisible();
      // A canvas that never got a width drew nothing, and every screen in
      // this lesson has an instrument on it.
      expect(await canvas.evaluate(c => c.width)).toBeGreaterThan(10);

      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toBeVisible();
      const text = await readout.innerText();
      expect(text.length).toBeGreaterThan(10);
      // An untranslated key, a missing substitution or a NaN reaching the
      // panel all look like ordinary text until something greps for them.
      expect(text).not.toMatch(/stelW\.|stellar\.|NaN|undefined|\{[a-z]+\}/);

      if (step < STEPS) await answerAndAdvance(page, step);
    }
    expect(await stepNumber(page)).toBe(STEPS);
    expect(errors).toEqual([]);
  });
});

test.describe('the diagram can be driven without a mouse', () => {
  test('the arrow keys move the cursor, and the sliders follow', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    // Step 7 is the first free-cursor screen.
    for (let i = 1; i < 7; i++) await answerAndAdvance(page, i);
    await expect(page.locator('.inv-step-title')).toContainText(/backwards/i);

    const canvas = page.locator('#investigationToolCanvas');
    await expect(canvas).toBeVisible();
    const teff = page.locator('#investigationTool input[data-tool="teff"]');
    const before = Number(await teff.inputValue());

    await canvas.focus();
    // Left is hotter, which is the whole point of the screen.
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft');
    const after = Number(await teff.inputValue());
    expect(after).toBeGreaterThan(before);

    // The readout has to agree with the slider the keyboard moved.
    const shown = await page.locator('#investigationToolReadout').innerText();
    const kelvin = Number(
      (shown.match(/([\d,]+)\s*K/) || [])[1]?.replace(/,/g, '')
    );
    expect(kelvin).toBeGreaterThan(0);
    expect(Math.log10(kelvin) - after).toBeLessThan(0.02);
  });

  test('clicking the diagram moves it too, and to the same place', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    for (let i = 1; i < 7; i++) await answerAndAdvance(page, i);
    const canvas = page.locator('#investigationToolCanvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();

    const teff = page.locator('#investigationTool input[data-tool="teff"]');
    const lum = page.locator('#investigationTool input[data-tool="lum"]');
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.3);
    const hotT = Number(await teff.inputValue());
    const hotL = Number(await lum.inputValue());

    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.6);
    expect(Number(await teff.inputValue())).toBeLessThan(hotT);
    expect(Number(await lum.inputValue())).toBeLessThan(hotL);
  });
});

test.describe('the lesson survives the things a student does to it', () => {
  test('it can be left and resumed where it was', async ({ page, app }) => {
    await openLesson(page, app);
    for (let i = 1; i <= 4; i++) await answerAndAdvance(page, i);
    const at = await stepNumber(page);
    expect(at).toBe(5);

    await page.reload();
    await page.evaluate(() => document.getElementById('welcomeClose')?.click());
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    expect(await stepNumber(page)).toBe(at);
  });

  test('it runs in Spanish, in Spanish', async ({ page, app }) => {
    await openLesson(page, app, { locale: 'es' });
    expect(await stepTotal(page)).toBe(STEPS);
    await expect(page.locator('.inv-step-title')).toContainText(
      /Tres estrellas/i
    );
    for (let i = 1; i <= 6; i++) await answerAndAdvance(page, i);
    const body = await page.locator('#investigationBody').innerText();
    // A Spanish walk that reached step 7 reading English would pass every
    // structural check in this file, so this asserts the words.
    expect(body).toMatch(/temperatura|diagrama|izquierda/i);
    expect(body).not.toMatch(/backwards axis/i);
    const readout = await page.locator('#investigationToolReadout').innerText();
    expect(readout).not.toMatch(/stelW\.|NaN|undefined/);
  });

  test('it is usable at phone width', async ({ page, app }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLesson(page, app, { narrow: true });
    for (let i = 1; i <= 3; i++) await answerAndAdvance(page, i);
    const canvas = page.locator('#investigationToolCanvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    // The panel must not push the page sideways.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('a capture reaches the notebook with its model named', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    for (let i = 1; i < 6; i++) await answerAndAdvance(page, i);
    // Step 6 is the first screen offering a capture.
    const capture = page.locator(
      '#investigationTool [data-tool-action="capture"]'
    );
    await expect(capture).toBeVisible();
    await capture.click();

    // A capture offers a draft rather than saving one: the student writes the
    // claim and keeps it. Both halves are checked, because a draft nobody can
    // save is not an evidence export.
    const draft = page.locator('.nb-draft');
    await expect(draft).toBeVisible();
    await expect(draft).toContainText(/stars compared|estrellas comparadas/i);
    await page
      .locator('#nbDraftClaim')
      .fill('The giant is 18 times the radius.');
    await page.locator('#nbDraftSave').click();

    const entries = await page.evaluate(async () => {
      const nb = await import('/js/notebook/store.js');
      return (nb.load().entries || []).map(e => ({
        source: e.source,
        text: JSON.stringify(e),
      }));
    });
    const mine = entries.filter(e => e.source === 'stellar-lab');
    expect(mine.length).toBeGreaterThan(0);
    // The entry has to name the model it came from, or it is a number with no
    // provenance and no use as evidence.
    expect(mine[0].text).toMatch(/MIST/);
  });
});
