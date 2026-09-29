// =============================================================================
// Answering a numeric question
// -----------------------------------------------------------------------------
// The parsing and the grading are proved in unit tests. What only a browser can
// show is the part the student actually meets: that an unreadable answer looks
// different from a wrong one and says why, that hints arrive one at a time and
// only when asked for, that the worked answer needs its own press, that the
// first thing they committed to survives being revised, and that an answer
// comes back from storage exactly as it was written.
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

  test('an equivalent unit is accepted, and the conversion is shown @covers:ce.radial-velocity', async ({
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
    // The last press is labeled as what it is.
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

test.describe('a saved answer comes back exactly as it was written', () => {
  // A saved answer is written back into its box's value="..." when the step is
  // drawn, and it was escaped for element text, which leaves a double quote
  // alone. So a " ended the attribute: the box came back holding only what was
  // before it, and the rest was read as more attributes. Saved answers also
  // arrive from backup files, which anyone can edit, and this onfocus ran on
  // the lesson page.
  const INJECTED = '8" autofocus onfocus="window.__injected=1';
  const LESSON = 'keplers-laws';
  const STORAGE = `gravitas_investigation_${LESSON}`;

  /** Open the lesson as a student, so what it reads and writes is real. */
  async function openAsStudent(page) {
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
  }

  /** Attributes a stored answer could only have added by escaping its box. */
  const injected = input =>
    input.evaluate(el =>
      el
        .getAttributeNames()
        .filter(name => name === 'autofocus' || name.startsWith('on'))
    );

  /** The box holds the whole answer, and focusing it runs nothing. */
  async function expectIntact(page, input) {
    await expect(input).toHaveValue(INJECTED);
    expect(await injected(input)).toEqual([]);
    await input.focus();
    expect(await page.evaluate(() => window.__injected)).toBeUndefined();
  }

  test('a quote typed into the numeric box is kept, and adds nothing to it', async ({
    page,
    app,
  }) => {
    // Resume on the numeric step, saved in the panel's own format, rather
    // than walking fifteen steps to reach it.
    await app.boot();
    await page.evaluate(async lesson => {
      const reg = await import('/js/data/investigations/registry.js');
      const { writeProgress } =
        await import('/js/investigations/progressSchema.js');
      const inv = await reg.loadInvestigation(lesson);
      localStorage.setItem(
        `gravitas_investigation_${lesson}`,
        JSON.stringify(
          writeProgress({
            lesson: inv,
            responses: {},
            attempts: {},
            visited: [],
            stepSid: 'use-the-law',
            startedAt: new Date().toISOString(),
          })
        )
      );
    }, LESSON);
    await openAsStudent(page);
    await expect(answer(page)).toBeVisible();

    await answer(page).fill(INJECTED);
    await check(page).click();
    // Checking draws the step again from what was saved; the verdict is the
    // proof that it has, since the typed text was in the box before it.
    await expect(feedback(page)).toBeVisible();
    await expectIntact(page, answer(page));

    const stored = await page.evaluate(
      key => JSON.parse(localStorage.getItem(key)).responses,
      STORAGE
    );
    expect(stored[`${LESSON}:use-the-law`]).toBe(INJECTED);

    // And from storage alone, in a fresh page.
    await app.boot();
    await openAsStudent(page);
    await expectIntact(page, answer(page));
  });

  test('a restored backup cannot add attributes to a measure field', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openAsStudent(page);

    // A real backup of this lesson with one value edited, which is all a
    // crafted file needs to be: it passes every check the restore makes.
    const backup = await page.evaluate(
      async ([lesson, value]) => {
        const reg = await import('/js/data/investigations/registry.js');
        const { buildBackup } =
          await import('/js/investigations/progressBackup.js');
        const inv = await reg.loadInvestigation(lesson);
        return buildBackup({
          lesson: inv,
          responses: { [`${lesson}:measure-four-planets:p1_name`]: value },
          attempts: {},
          visited: [],
          stepSid: 'measure-four-planets',
          startedAt: new Date().toISOString(),
        });
      },
      [LESSON, INJECTED]
    );
    page.on('dialog', d => d.accept());
    await page.locator('#investigationBackupFile').setInputFiles({
      name: `${LESSON}.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });

    // The restore goes to the step it names and draws it.
    const field = page.locator(
      `[data-field="${LESSON}:measure-four-planets:p1_name"]`
    );
    await expect(field).toBeVisible();
    await expectIntact(page, field);

    // And again from what the restore saved, in a fresh page.
    await app.boot();
    await openAsStudent(page);
    await expectIntact(page, field);
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

  test('a measurement table reads a decimal comma too', async ({
    page,
    app,
  }) => {
    // A measure step's fields went through Number(), which reads "1,52" as
    // NaN: every derived column stayed blank and the step's own check never
    // ran, for anyone typing the way Spanish writes numbers.
    await app.boot({ url: '/?author=keplers-laws&step=15' });
    await page.evaluate(async () => {
      const i = await import('/js/i18n/index.js');
      await i.setLocale('es');
    });
    await app.boot({ url: '/?author=keplers-laws&step=15' });
    const field = id => page.locator(`[data-field$=":${id}"]`);
    await expect(field('k_a')).toBeVisible();

    await field('k_a').fill('1,52');
    await field('k_P').fill('1,874');
    // Worked out, and written back the Spanish way: "1.000" read as Spanish
    // would be one thousand.
    await expect(field('k_ratio')).toHaveValue(/^1,0\d\d$/);
    await expect(page.locator('[data-check-slot]')).toHaveClass(/is-ok/);
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
