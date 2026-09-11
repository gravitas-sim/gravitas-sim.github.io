// =============================================================================
// What Is a Gravitational Wave?, walked end to end
// -----------------------------------------------------------------------------
// The sibling of gwLesson.spec.js, and it has to check one thing that file does
// not: this lesson's whole claim is that a beginner with no physics can finish
// it. So the walk here never reads a tip, never opens an instrument the step
// did not offer, and never turns on sound - if a screen can only be completed
// by knowing something the lesson has not said, or by hearing something, it
// stalls here.
//
// The other thing checked here is the pair. The advanced lesson assumes an
// answer this one gives, the browser prints that as a recommendation rather
// than a lock, and a reader has to be able to go from the end of this one into
// the start of that one. All three are asserted below, because "cross-linked"
// is otherwise a claim about two data files rather than about the interface.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'what-is-a-gravitational-wave';
const SEQUEL = 'listening-to-spacetime';

/** Open a lesson through the interface, the way a student does. */
async function openLesson(page, app, id, { locale, booted = false } = {}) {
  if (!booted) await app.boot();
  if (locale) {
    await page.evaluate(async name => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(name, { persist: false });
    }, locale);
  }
  await expect(page.locator('#investigationsBtn')).toBeVisible();
  await page.locator('#investigationsBtn').click();
  await expect(page.locator('#investigationBrowser')).toBeVisible();
  const card = page.locator(`[data-investigation="${id}"]`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

// "Step 3 of 24" and "Paso 3 de 24" differ in the word between the numbers but
// not in the numbers, so these read them positionally.
const progressNumbers = async page => {
  const text = await page.locator('#investigationProgressText').innerText();
  return [...text.matchAll(/\d+/g)].map(m => Number(m[0]));
};
const stepNumber = async page => (await progressNumbers(page))[0] ?? 0;
const stepTotal = async page => (await progressNumbers(page))[1] ?? 0;

/**
 * Values that satisfy every validator in the lesson, by field id.
 *
 * Chosen to be *right*, not merely accepted: a validator that a walk gets past
 * with 1 in every box is not being tested. The two direction answers differ
 * because they have to, the ratio is two because the lesson's own argument
 * says it is, and the three amplitudes halve because the model says they do.
 */
const ANSWERS = {
  // 10 - which way the marker ring was widest, at two moments half a cycle
  // apart. Any two different values pass; identical ones are refused.
  wide_dir: 1,
  wide_dir_later: 2,
  // 13 - a millimetre in ten metres, then the real thing
  toy: 0.0001,
  real: 1e-21,
  // 16 - the factor of two, counted
  orbits: 2,
  peaks: 4,
  ratio: 2,
  // 21 - the same source at 400, 800 and 1600 Mpc
  a400: 1.2,
  a800: 0.6,
  a1600: 0.3,
  // 23 - the student's own one-variable experiment
  variable: 2,
  a: 1.2,
  b: 0.6,
  change: 0.5,
};

/** Answer whatever the current screen asks, then move on. */
async function answerAndAdvance(page, values = ANSWERS) {
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();

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
    await textarea
      .first()
      .fill(
        'Two objects going round each other keep changing how the mass is arranged, so the bending of space around them keeps changing too, and that change travels outwards at the speed of light. When it reaches an instrument it stretches one direction while squeezing the direction at right angles, so an L-shaped detector has one arm growing while the other shrinks and can measure the difference. My answer on screen 1 was right about there being something to detect but wrong about it being sound.'
      );
  }

  const before = await stepNumber(page);
  await page.locator('#investigationNext').click();
  await expect
    .poll(() => stepNumber(page), { timeout: 20_000 })
    .toBeGreaterThan(before);
}

/**
 * How many bodies the lesson's model owns, right now.
 *
 * Read through a fresh import every time on purpose: js/physics.js reassigns
 * its body arrays on a world rebuild, so a reference captured once goes on
 * describing a detached copy. The compact objects a binary stage places land
 * in bh_list or neutron_stars depending on the kind, so both are counted.
 */
const modelOwned = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return [...p.bh_list, ...p.neutron_stars]
      .filter(o => o.model_owned)
      .map(o => o.name || '(unnamed)');
  });

test.describe('the beginner lesson is reachable and complete', () => {
  test('it is in the browser, and its card says who it is for', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const card = page.locator(`[data-investigation="${LESSON}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(/What Is a Gravitational Wave/i);
    await expect(card).toContainText(/24/);
    // The level is the whole reason this lesson exists beside the other one.
    await expect(card).toContainText(/Beginner/i);
  });

  test('its card is not the sequel’s card', async ({ page, app }) => {
    // Both lessons open on the same 36+29 pair, so the generator drew them the
    // same picture until the field was seeded by lesson id. Two adjacent
    // catalogue entries with one thumbnail between them read as a bug.
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const src = id =>
      page
        .locator(`[data-investigation="${id}"] img`)
        .first()
        .getAttribute('src');
    const [a, b] = await Promise.all([src(LESSON), src(SEQUEL)]);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  test('it opens on step 1 of 24', async ({ page, app }) => {
    await openLesson(page, app, LESSON);
    expect(await stepNumber(page)).toBe(1);
    expect(await stepTotal(page)).toBe(24);
  });

  test('the whole lesson can be walked with the sound off', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app, LESSON);
    const total = await stepTotal(page);
    // Nothing here touches the speaker. A screen that could only be finished
    // by ear would stall this loop.
    for (let n = 1; n < total; n++) await answerAndAdvance(page);
    expect(await stepNumber(page)).toBe(total);
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  });
});

test.describe('the main scene carries the lesson', () => {
  test('the two objects are on the canvas and selectable from the list', async ({
    page,
    app,
  }) => {
    await openLesson(page, app, LESSON);
    // Screen 2 is where the reader is asked to select them, so advance once.
    await answerAndAdvance(page);
    const chips = page.locator('.inv-object');
    await expect(chips).toHaveCount(2);

    // Selection has to work from the keyboard, which is the whole point of
    // the list existing beside a canvas. The app refuses to select anything
    // until the splash has gone, so a press before that quietly does nothing.
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await chips.first().press('Enter');
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const { state } = await import('/js/appState.js');
            return state.selectedObject?.object?.name ?? null;
          }),
        { timeout: 10_000 }
      )
      .not.toBeNull();
    // And the keyboard stays where it was, rather than going back to the top
    // of the document.
    await expect(chips.first()).toBeFocused();
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('the staged pair is owned by the model, not the integrator', async ({
    page,
    app,
  }) => {
    await openLesson(page, app, LESSON);
    // If the N-body integrator were also moving them, two bodies this close
    // would have merged long before a reader reached screen 5.
    expect(await modelOwned(page)).toHaveLength(2);
  });

  test('leaving the lesson takes its staged scene with it', async ({
    page,
    app,
  }) => {
    await openLesson(page, app, LESSON);
    expect(await modelOwned(page)).toHaveLength(2);
    await page.locator('#investigationClose').click();
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await expect.poll(() => modelOwned(page).then(o => o.length)).toBe(0);
  });
});

test.describe('the pair of lessons', () => {
  test('the browser recommends this one before the advanced one', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    const seq = page
      .locator('.inv-seq')
      .filter({ hasText: /Gravitational waves, from nothing/i });
    await expect(seq).toBeVisible();
    const steps = seq.locator('.inv-seq-step');
    await expect(steps).toHaveCount(2);
    // Order, and the recommendation - which must be a recommendation: the
    // beginner lesson needs nothing, and the advanced one names it.
    await expect(steps.nth(0)).toContainText(/What Is a Gravitational Wave/i);
    await expect(steps.nth(1)).toContainText(/Listening to Spacetime/i);
    await expect(steps.nth(1)).toContainText(/What Is a Gravitational Wave/i);
  });

  test('the advanced lesson is not gated on finishing this one', async ({
    page,
    app,
  }) => {
    // Straight into the sequel with no progress recorded anywhere.
    await openLesson(page, app, SEQUEL);
    expect(await stepNumber(page)).toBe(1);
    expect(await stepTotal(page)).toBe(24);
  });

  test('a reader can go from the end of this one into the start of that one', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app, LESSON);
    const total = await stepTotal(page);
    for (let n = 1; n < total; n++) await answerAndAdvance(page);
    expect(await stepNumber(page)).toBe(total);
    // The closing screen names the sequel; opening it has to work from here,
    // with the beginner lesson's staged scene already on the canvas.
    await expect(page.locator('#investigationBody')).toContainText(
      /Listening to Spacetime/i
    );
    await page.locator('#investigationClose').click();
    await openLesson(page, app, SEQUEL, { booted: true });
    expect(await stepNumber(page)).toBe(1);
    // And the sequel got its own scene rather than inheriting the last one.
    await expect.poll(() => modelOwned(page).then(o => o.length)).toBe(2);
  });
});

test.describe('in Spanish', () => {
  test('the whole lesson can be walked', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app, LESSON, { locale: 'es' });
    // The first screen's own title, so a shadow that failed to load shows up
    // here as English rather than as a walk that happens to still pass.
    await expect(page.locator('.inv-step-title')).toContainText(
      /Algo puede viajar sin brillar/i
    );
    const total = await stepTotal(page);
    expect(total).toBe(24);
    for (let n = 1; n < total; n++) await answerAndAdvance(page);
    expect(await stepNumber(page)).toBe(total);
  });
});
