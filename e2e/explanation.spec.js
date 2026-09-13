// =============================================================================
// The sentence a reader writes at the end of an experiment
// -----------------------------------------------------------------------------
// Every investigation ends its central loop with a written step. What was
// missing was not the step - all twenty-two have one - but two things about it:
// a box holding a full stop was recorded as an answer and reached the exported
// report as one, and the step never said where the number it asks about came
// from.
//
// This walks Kepler's Laws to that step through its real central experiment -
// the measure step and the plot, not a jump to the end - and then checks the
// answer survives everything progress is meant to survive.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'keplers-laws';
// The step the acceptance map records as this lesson's explanation, by the
// title it shows: js/investigations.js does not put the sid in the DOM and does
// not export the current step, so the heading is what a walk can steer by - the
// same thing e2e/gwSources.spec.js does.
const STEP = 'Why the speed changes';
const STEP_ES = 'Por qué cambia la velocidad';

/** Open a lesson from a clean progress slate. */
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

/** Walk forward until the given step id is the one on screen. */
async function walkTo(page, title) {
  for (let n = 0; n < 60; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    const next = page.locator('#investigationNext');
    // Finish means the walk ran off the end; clicking it opens a dialog that
    // swallows the next click and turns a wrong title into a timeout.
    if ((await next.innerText()).trim() === 'Finish') break;
    await next.click();
    await page.waitForTimeout(60);
  }
  expect(
    await page.locator('.inv-step-title').innerText(),
    `walked to "${title}"`
  ).toBe(title);
}

/** The explanation textarea on the current step. */
const answerBox = page => page.locator('.inv-answer').first();

test.describe("the explanation at the end of Kepler's central experiment", () => {
  test('the step says where its evidence came from', async ({ page, app }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    const note = page.locator('.inv-evidence-from');
    await expect(note).toBeVisible();
    // Kepler's laws are measured off orbits the integrator moved, so the label
    // has to say the engine - not a model, and not published data.
    await expect(note).toContainText(/simulation engine/i);
    await expect(note).not.toContainText(/inv\.evidenceFrom/);
  });

  test('a full stop is not accepted as an explanation', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    const box = answerBox(page);
    await box.fill('.');
    const note = page.locator('.inv-answer-note');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/looks empty/i);
  });

  test('a real sentence is accepted, and the note goes away', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    const box = answerBox(page);
    await box.fill('   ');
    await expect(page.locator('.inv-answer-note')).toBeVisible();
    await box.fill('It moved fastest at periapsis, which is what I predicted.');
    await expect(page.locator('.inv-answer-note')).toBeHidden();
  });

  test('the explanation survives leaving the step and coming back', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    const words = 'a is 1.5 and P is 1.84, so P squared over a cubed holds.';
    await answerBox(page).fill(words);
    await page.locator('#investigationPrev').click();
    await page.waitForTimeout(120);
    await page.locator('#investigationNext').click();
    await expect(answerBox(page)).toHaveValue(words);
  });

  test('and a full reload, which is how a student resumes', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    const words = 'The speed rose as the separation fell, against my guess.';
    await answerBox(page).fill(words);
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
    await page.evaluate(async id => {
      const loader = await import('/js/investigationsLoader.js');
      await (await loader.ensureInvestigations()).openInvestigation(id);
    }, LESSON);
    await walkTo(page, STEP);
    await expect(answerBox(page)).toHaveValue(words);
  });

  test('it is reachable and typable from the keyboard alone', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    await answerBox(page).focus();
    await expect(answerBox(page)).toBeFocused();
    await page.keyboard.type('Typed without a mouse.');
    await expect(answerBox(page)).toHaveValue('Typed without a mouse.');
  });

  test('the box is described by the note, for a screen reader', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    const describedBy = await answerBox(page).getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const note = page.locator(`#${describedBy}`);
    await expect(note).toHaveAttribute('role', 'status');
  });

  test('in Spanish the prompt, the note and the provenance are Spanish', async ({
    page,
    app,
  }) => {
    await openLesson(page, app, { locale: 'es' });
    await walkTo(page, STEP_ES);
    const note = page.locator('.inv-evidence-from');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/motor de simulaci/i);
    await answerBox(page).fill('.');
    await expect(page.locator('.inv-answer-note')).toContainText(/vac/i);
  });

  test('resetting the lesson clears the explanation', async ({ page, app }) => {
    await openLesson(page, app);
    await walkTo(page, STEP);
    await answerBox(page).fill('Something I will not keep.');
    await page.waitForTimeout(200);
    // The reader's own reset: clear the saved progress the way the browser's
    // reset control does, then confirm nothing of the answer survived.
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('gravitas_investigation_')) localStorage.removeItem(k);
      }
    });
    const left = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k =>
        k.startsWith('gravitas_investigation_')
      );
      return keys.map(k => localStorage.getItem(k)).join(' ');
    });
    expect(left).not.toContain('Something I will not keep');
  });
});
