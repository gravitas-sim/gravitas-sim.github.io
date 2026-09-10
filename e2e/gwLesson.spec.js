// =============================================================================
// Listening to spacetime, walked end to end
// -----------------------------------------------------------------------------
// The lesson's content is checked without a browser by the authoring rules and
// the instructor-materials suite. What needs one is whether a student can
// actually get through it: twenty-four steps, two instruments, a bundled
// dataset and an evidence capture, in two languages, from the keyboard, with
// the sound off.
//
// The sound-off run is not a nicety. A lesson whose measurements could only be
// taken by ear would exclude a student on a shared machine, a student in a
// library and a student with hearing loss, and "you can do all of it with the
// sound off" is a promise the lesson makes on its first screen. Nothing in this
// file ever enables audio.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'listening-to-spacetime';

/** Open the lesson through the interface, the way a student does. */
async function openLesson(page, app, { locale, narrow = false } = {}) {
  await app.boot();
  if (locale) {
    await page.evaluate(async id => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(id, { persist: false });
    }, locale);
  }
  // On a phone the rail is behind a menu button and slides in, so a walk that
  // clicks the rail's own button immediately catches it mid-animation.
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

// The progress line reads "Step 3 of 24" in English and "Paso 3 de 24" in
// Spanish, so these pull the two numbers positionally rather than by the word
// between them. A locale-specific regex here quietly returned zero and made a
// Spanish walk look like a lesson that would not advance.
const progressNumbers = async page => {
  const text = await page.locator('#investigationProgressText').innerText();
  return [...text.matchAll(/\d+/g)].map(m => Number(m[0]));
};

/** The step number the panel is showing, one-based. */
async function stepNumber(page) {
  return (await progressNumbers(page))[0] ?? 0;
}

/** How many steps the lesson has, as the panel counts them. */
async function stepTotal(page) {
  return (await progressNumbers(page))[1] ?? 0;
}

/**
 * Answer whatever the current step asks and move on.
 *
 * Field values are chosen to satisfy the validators rather than to be right:
 * a walk-through is checking that a student can get through, not that they
 * measured well. Where a validator insists on an ordering - the lighter pair
 * staying in band longest, the later frequency being the higher one - the
 * values respect it, because a validator that can be walked past with 1s in
 * every box is not testing anything.
 */
async function answerAndAdvance(page, values = {}) {
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
        'The binary radiates energy away, so the separation shrinks, the orbit speeds up, and the wave frequency - which is twice the orbital frequency - rises with it. What this cannot tell me is the distance on its own, because an edge-on source nearby looks like a face-on one twice as far.'
      );
  }

  const before = await stepNumber(page);
  await page.locator('#investigationNext').click();
  await expect
    .poll(() => stepNumber(page), { timeout: 20_000 })
    .toBeGreaterThan(before);
}

/** Values that satisfy every validator in the lesson, by field id. */
const ANSWERS = {
  orbits: 2,
  crests: 4,
  f_early: 20,
  t_early: 0.85,
  f_late: 60,
  t_late: 0.06,
  f50: 50,
  t50: 0.14,
  sep50: 3.9,
  v50: 0.36,
  t_light: 2.7,
  f_light: 135,
  t_mid: 0.85,
  f_mid: 68,
  t_heavy: 0.39,
  f_heavy: 41,
  mc_a: 28.1,
  mc_b: 28.0,
  h_400: 1.28,
  h_800: 0.64,
  h_1600: 0.32,
  f_end_400: 67.6,
  f_end_1600: 67.6,
  h_face: 1.28,
  h_edge: 0.64,
  eff_edge: 800,
  s_right: 0.95,
  s_wrong: 0.42,
  s_far: 0.94,
};

test.describe('the lesson is reachable and complete', () => {
  test('it is in the browser, with the right shape on its card', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    const card = page.locator(`[data-investigation="${LESSON}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Listening to Spacetime/i);
    await expect(card).toContainText(/24/);
  });

  test('it opens on step 1 of 24', async ({ page, app }) => {
    await openLesson(page, app);
    expect(await stepNumber(page)).toBe(1);
    expect(await stepTotal(page)).toBe(24);
  });

  test('the whole lesson can be walked with the sound off', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    // Nothing in this walk touches the speaker. If a step could only be
    // completed by ear, it would stall here.
    const total = await stepTotal(page);
    for (let n = 1; n < total; n++) {
      await answerAndAdvance(page, ANSWERS);
    }
    expect(await stepNumber(page)).toBe(total);
    expect(total).toBe(24);
    // ...and no audio context was ever created.
    const started = await page.evaluate(async () => {
      const m = await import('/js/audio.js');
      return m.audioContext() !== null;
    });
    expect(started).toBe(false);
  });
});

test.describe('the instruments the lesson names are the ones it gets', () => {
  test('step 1 opens the gravitational-wave lab with its controls hidden', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await expect(page.locator('#investigationTool')).toBeVisible();
    const readout = page.locator('#investigationTool .inv-tool-row');
    await expect(readout.first()).toBeVisible();
    await expect(page.locator('#investigationTool')).toContainText(
      /Chirp mass/i
    );
    // The masses are hidden on this screen: a student is meant to work out
    // what the source is, not read it off a slider.
    await expect(page.locator('#invTool-m1')).toHaveCount(0);
    await expect(page.locator('#invTool-cursor')).toBeVisible();
  });

  test('the readout never shows a raw message id', async ({ page, app }) => {
    await openLesson(page, app);
    for (let n = 1; n < 6; n++) await answerAndAdvance(page, ANSWERS);
    const text = await page.locator('#investigationTool').innerText();
    expect(text).not.toMatch(/\bgwW\./);
    expect(text).not.toMatch(/\binv\./);
  });

  test('the playhead advances when the lab is played', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    const before = await page.locator('#invTool-cursor').inputValue();
    await page.locator('#investigationTool [data-tool-action="play"]').click();
    await expect
      .poll(
        async () => Number(await page.locator('#invTool-cursor').inputValue()),
        {
          timeout: 10_000,
        }
      )
      .toBeGreaterThan(Number(before));
  });

  test('the published data appears at step 21, with its provenance', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    for (let n = 1; n < 21; n++) await answerAndAdvance(page, ANSWERS);
    expect(await stepNumber(page)).toBe(21);
    const tool = page.locator('#investigationTool');
    await expect(tool).toContainText('GW150914');
    await expect(tool).toContainText('10.1103/PhysRevLett.116.061102');
    await expect(tool).toContainText(/CC BY 4\.0/);
    await expect(tool).toContainText(/Abbott/);
  });

  test('the lab refuses a preset that would change a hidden control', async ({
    page,
    app,
  }) => {
    // Step 1 hides the masses, so it must offer no preset that sets them.
    await openLesson(page, app);
    await expect(
      page.locator('#investigationTool [data-tool-preset]')
    ).toHaveCount(0);
  });
});

test.describe('evidence', () => {
  test('a capture reaches the notebook with the model’s limits attached', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    for (let n = 1; n < 8; n++) await answerAndAdvance(page, ANSWERS);
    expect(await stepNumber(page)).toBe(8);
    await page
      .locator('#investigationTool [data-tool-action="capture"]')
      .click();
    // The notebook loads on demand and opens on the draft.
    await expect(page.locator('#evidenceNotebook')).toBeVisible({
      timeout: 30_000,
    });
    // The panel shows the draft by its title; the numbers and the limitations
    // are in the entry, which is what a report and an export read.
    await expect(page.locator('#evidenceNotebook')).toContainText(
      /Modelled gravitational-wave signal/i
    );
    const entry = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const draft = panel.pendingDraft();
      return draft
        ? {
            source: draft.source,
            limitations: draft.prose.limitations,
            labels: draft.snapshot.quantities.map(q => q.label),
            kinds: [...new Set(draft.snapshot.quantities.map(q => q.kind))],
            flags: draft.snapshot.provenance.flags,
          }
        : null;
    });
    expect(entry).toBeTruthy();
    expect(entry.source).toBe('gw-observation');
    expect(entry.kinds).toEqual(['analytic']);
    expect(entry.flags).toContain('model');
    expect(entry.limitations).toMatch(/leading-order/i);
    expect(entry.limitations).toMatch(/innermost stable circular orbit/i);
    expect(entry.labels.join(' ')).toMatch(/Chirp mass/i);
  });
});

test.describe('Spanish', () => {
  test('the lesson opens in Spanish and walks', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app, { locale: 'es' });
    await expect(page.locator('#investigationTitle')).toContainText(
      /Escuchar el espacio-tiempo/i
    );
    const body = await page.locator('#investigationBody').innerText();
    expect(body).toMatch(/señal|grabación|panel/i);
    for (let n = 1; n < 6; n++) await answerAndAdvance(page, ANSWERS);
    expect(await stepNumber(page)).toBe(6);
    // The instrument's own prose is Spanish too, not just the lesson's.
    await expect(page.locator('#investigationTool')).toContainText(
      /Masa de chirrido/i
    );
  });
});

test.describe('the keyboard', () => {
  test('a step can be completed and advanced without a mouse', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    const option = page.locator('#investigationBody .inv-option').first();
    await option.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationNext')).toBeEnabled();
    await page.locator('#investigationNext').press('Enter');
    await expect.poll(() => stepNumber(page)).toBe(2);
  });

  test('the lab’s actions are reachable by tab', async ({ page, app }) => {
    await openLesson(page, app);
    const play = page.locator('#investigationTool [data-tool-action="play"]');
    await expect(play).toBeVisible();
    await play.focus();
    await expect(play).toBeFocused();
    await page.keyboard.press('Enter');
    await expect
      .poll(async () =>
        Number(await page.locator('#invTool-cursor').inputValue())
      )
      .toBeGreaterThan(0);
  });
});

test.describe('narrow screens', () => {
  test('the lab fits a phone without the page scrolling sideways', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLesson(page, app, { narrow: true });
    await expect(page.locator('#investigationTool')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
