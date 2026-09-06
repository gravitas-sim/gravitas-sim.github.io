// =============================================================================
// Answering a numeric question
// -----------------------------------------------------------------------------
// The parsing and the grading are proved in unit tests. What only a browser can
// show is the part the student actually meets: that an unreadable answer looks
// different from a wrong one and says why, that hints arrive one at a time and
// only when asked for, that the worked answer needs its own press, and that the
// first thing they committed to survives being revised.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open one step of a lesson directly, through the authoring preview. */
async function openStep(app, page, lesson, step) {
  await app.boot({ url: `/?author=${lesson}&step=${step}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('[data-numeric]')).toBeVisible();
}

const feedback = page => page.locator('.inv-feedback');
const answer = page => page.locator('[data-numeric]');
const check = page => page.locator('[data-check-numeric]');

test.describe('what the box says back', () => {
  test('a placeholder describes the form, never the value', async ({
    page,
    app,
  }) => {
    // A placeholder is visible before the student has thought about the
    // question, so one showing the expected measurement gives it away to
    // everyone. author:check enforces this; here it is on screen.
    await openStep(app, page, 'keplers-laws', 16);
    const text = await answer(page).getAttribute('placeholder');
    expect(text).toMatch(/years/);
    expect(text).not.toMatch(/\d/);
  });

  test('an unreadable answer is not a wrong one', async ({ page, app }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await answer(page).fill('8 AU');
    await check(page).click();

    await expect(feedback(page)).toHaveClass(/is-unreadable/);
    await expect(feedback(page)).not.toHaveClass(/is-wrong/);
    // And it says what is wrong with it, rather than just refusing.
    await expect(feedback(page)).toContainText(/unit of length/i);
    await expect(feedback(page)).toContainText(/should be a time/i);
  });

  test('a blank is refused rather than graded as zero', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await answer(page).fill('   ');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-unreadable/);
    await expect(feedback(page)).toContainText(/nothing in the box/i);
  });

  test('an equivalent unit is accepted, and the conversion is shown', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await answer(page).fill('2922 days');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-right/);
    await expect(feedback(page)).toContainText(/read as/i);
  });

  test('a named mistake is named; an unnamed one is not', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'keplers-laws', 16);

    // a³ without the square root: the specific slip this question invites.
    await answer(page).fill('64');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-wrong/);
    await expect(page.locator('.inv-misconception')).toContainText(
      /square root/i
    );

    // A number that is merely wrong gets no story invented about it.
    await answer(page).fill('30');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-wrong/);
    await expect(page.locator('.inv-misconception')).toHaveCount(0);
  });
});

test.describe('hints arrive one at a time, and only when asked', () => {
  test('nothing is shown before the first press', async ({ page, app }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await expect(page.locator('.inv-hint')).toHaveCount(0);
    await expect(page.locator('[data-hint]')).toBeVisible();
  });

  test('concept, then method, then the worked answer behind its own press', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'keplers-laws', 16);

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint')).toHaveCount(1);
    await expect(page.locator('.inv-hint').first()).toContainText(
      /Think about/i
    );
    // The worked answer is not among what has been shown.
    await expect(page.locator('.inv-hint.is-worked')).toHaveCount(0);

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint')).toHaveCount(2);
    await expect(page.locator('.inv-hint.is-worked')).toHaveCount(0);
    // The last press is labelled as what it is.
    await expect(page.locator('[data-hint]')).toContainText(/how it is done/i);

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint.is-worked')).toBeVisible();
    // Nothing left to ask for.
    await expect(page.locator('[data-hint]')).toHaveCount(0);
  });

  test('taking help is recorded on screen, not charged for', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint-tally')).toContainText('1 hint');

    await page.locator('[data-hint]').click();
    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint-tally')).toContainText(
      /worked answer shown/i
    );

    // And the answer still grades on its merits.
    await answer(page).fill('8');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-right/);
  });

  test('the first answer committed to is kept when it is revised', async ({
    page,
    app,
  }) => {
    // Opened as a student rather than as an author, because an authoring
    // preview deliberately writes nothing - and what is being checked here is
    // exactly what gets written.
    await app.boot();
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="keplers-laws"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    // Walk to the numeric step through the interface.
    await page.evaluate(async () => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('keplers-laws');
      window.__sid = lesson.steps.find(s => s.sid === 'use-the-law').sid;
    });
    for (let i = 0; i < 40; i++) {
      if (await page.locator('[data-numeric]').count()) break;
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const boxes = page.locator('#investigationBody input[type="checkbox"]');
      for (let b = 0; b < (await boxes.count()); b++) {
        const box = boxes.nth(b);
        if (!(await box.isChecked())) await box.check();
      }
      const fields = page.locator('#investigationBody input[data-field]');
      for (let f = 0; f < (await fields.count()); f++) {
        const field = fields.nth(f);
        if (!(await field.inputValue())) await field.fill('1');
      }
      const next = page.locator('#investigationNext');
      if (!(await next.isEnabled())) break;
      await next.click();
    }
    await expect(answer(page)).toBeVisible();

    // A first attempt, then a revision after being told it is wrong.
    await answer(page).fill('64');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-wrong/);
    await answer(page).fill('8');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-right/);

    const stored = await page.evaluate(
      sid => {
        const raw = localStorage.getItem('gravitas_investigation_keplers-laws');
        const data = raw ? JSON.parse(raw) : {};
        return {
          first: data.responses?.[`keplers-laws:${sid}`.concat(':first')],
          current: data.responses?.[`keplers-laws:${sid}`],
        };
      },
      await page.evaluate(() => window.__sid)
    );

    // The number they committed to before any help, kept beside the one they
    // arrived at. A report that only holds the second describes a different
    // moment from the one being assessed.
    expect(stored.first).toBe('64');
    expect(stored.current).toBe('8');
  });
});

test.describe('in Spanish', () => {
  test('a decimal comma is the same answer, and the hints are translated', async ({
    page,
    app,
  }) => {
    await app.boot({ url: '/?author=radial-velocity&step=17' });
    await page.evaluate(async () => {
      const i = await import('/js/i18n/index.js');
      await i.setLocale('es');
    });
    await app.boot({ url: '/?author=radial-velocity&step=17' });
    await expect(page.locator('[data-numeric]')).toBeVisible();

    await answer(page).fill('0,69');
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-right/);

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint').first()).toContainText(
      /bamboleo|estrella/i
    );
  });

  test('switching language does not re-mark an answer already given', async ({
    page,
    app,
  }) => {
    // "0,69" is sixty-nine hundredths to a Spanish reader and, to an English
    // one, either 69 or nothing. Storing only the text meant a later reader
    // decided after the fact what the student had meant: it graded correct in
    // the panel and incorrect in the PDF, which grades in English, and
    // switching the interface language silently re-marked finished work.
    //
    // Opened as a student, not as an author, because an authoring preview
    // writes nothing and what is being checked is exactly what gets written.
    await app.boot();
    await page.evaluate(async () => {
      const i = await import('/js/i18n/index.js');
      await i.setLocale('es');
    });
    await app.boot();

    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="radial-velocity"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    // Walk to the first numeric step through the interface.
    for (let i = 0; i < 40; i++) {
      if (await page.locator('[data-numeric]').count()) break;
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const boxes = page.locator('#investigationBody input[type="checkbox"]');
      for (let b = 0; b < (await boxes.count()); b++) {
        const box = boxes.nth(b);
        if (!(await box.isChecked())) await box.check();
      }
      const fields = page.locator('#investigationBody input[data-field]');
      for (let f = 0; f < (await fields.count()); f++) {
        const field = fields.nth(f);
        if (!(await field.inputValue())) await field.fill('1');
      }
      const next = page.locator('#investigationNext');
      if (!(await next.isEnabled())) break;
      await next.click();
    }
    await expect(answer(page)).toBeVisible();

    // Answer with a decimal comma, and be told it is right.
    const typed = await page.evaluate(async () => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('radial-velocity');
      const step = lesson.steps.find(
        s => s.kind === 'numeric' && Number.isFinite(s.answer)
      );
      return { sid: step.sid, text: String(step.answer).replace('.', ',') };
    });
    await answer(page).fill(typed.text);
    await check(page).click();
    await expect(feedback(page)).toHaveClass(/is-right/);

    // The convention is stored beside the text, so a later reader does not
    // have to guess it.
    const stored = await page.evaluate(sid => {
      const raw = localStorage.getItem(
        'gravitas_investigation_radial-velocity'
      );
      const data = raw ? JSON.parse(raw) : {};
      const key = `radial-velocity:${sid}`;
      return {
        text: data.responses?.[key],
        locale: data.responses?.[`${key}:locale`],
      };
    }, typed.sid);
    expect(stored.text).toBe(typed.text);
    expect(stored.locale).toBe('es');

    // Switch the interface to English and reopen the lesson. The verdict on
    // work already done must not move.
    await page.evaluate(async () => {
      const i = await import('/js/i18n/index.js');
      await i.setLocale('en');
    });
    await app.boot();
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="radial-velocity"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(answer(page)).toBeVisible();
    await expect(feedback(page)).toHaveClass(/is-right/);
  });
});
