// =============================================================================
// Classroom defects: first-visit links, the reset beside the progress bar,
// Restart's question, and a number typed and not yet checked
// -----------------------------------------------------------------------------
// tests/linkShapes.test.js holds every link shape against the gate without a
// browser, and tests/classroomDefects.test.js holds the draft and Restart's
// count. What only a browser shows: a first-time student on an assignment, an
// activity or a pack link reaches the lesson with nothing inert, the reset puts
// back what the step shows and says what it did while keeping answers, Restart
// moves focus into a dialog and Escape keeps the work, and a half-typed number
// is still there after a reload and is not an answer.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect, openMore } from './fixtures.js';

const LESSON = 'keplers-laws';
const NUMERIC = 'use-the-law';

/** Open a lesson at a step, with the given saved answers, as a returning student. */
async function openAt(page, app, id, sid, responses = {}, locale = 'en') {
  await page.addInitScript(l => {
    try {
      localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale);
  await app.boot();
  await page.evaluate(
    async ([lesson, stepSid, saved]) => {
      const { writeProgress } =
        await import('/js/investigations/progressSchema.js');
      localStorage.setItem(
        `gravitas_investigation_${lesson}`,
        JSON.stringify(
          writeProgress({
            lesson,
            responses: saved,
            attempts: {},
            visited: [],
            stepSid,
            startedAt: Date.now(),
          })
        )
      );
      location.hash = `#investigation=${lesson}`;
    },
    [id, sid, responses]
  );
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/** Where the panel would put focus back, and what it holds. */
const stored = (page, id = LESSON) =>
  page.evaluate(
    lesson =>
      JSON.parse(localStorage.getItem(`gravitas_investigation_${lesson}`)),
    id
  );

test.describe('the first visit lands on the link, not behind Home', () => {
  /** What a first-time student sees after the link: the lesson, nothing inert. */
  async function landed(page) {
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    expect(
      await page.evaluate(() => ({
        introduction: ['welcome-open', 'welcome-pending'].filter(c =>
          document.body.classList.contains(c)
        ),
        inert: ['#investigationPanel', '.ui-container', '#simulationCanvas']
          .map(sel => document.querySelector(sel)?.closest('[inert]') !== null)
          .filter(Boolean).length,
      }))
    ).toEqual({ introduction: [], inert: 0 });
  }

  test('an assignment link', async ({ page, app }) => {
    await app.boot();
    const link = await page.evaluate(async lessonId => {
      const reg = await import('/js/data/investigations/registry.js');
      const A = await import('/js/assignments/assignment.js');
      const L = await import('/js/assignments/assignmentLink.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const lesson = await reg.loadInvestigation(lessonId);
      const sid = lesson.steps.find(
        s => !s.setup && Array.isArray(s.options)
      ).sid;
      const built = A.buildAssignment({
        lesson,
        chosen: [sid],
        title: 'Week 3',
        fingerprint: stepFingerprint,
      });
      return (await L.assignmentLink(built)).url;
    }, LESSON);
    expect(new URL(link).hash).toMatch(/^#a\d+[zr]/);
    // A new document, as a student's first load is: a hash alone on this page
    // would only be a same-document navigation.
    await page.goto('about:blank');
    await app.boot({ firstVisit: true, url: link });
    await landed(page);
  });

  test('an activity link', async ({ page, app }) => {
    await app.boot({
      firstVisit: true,
      url: '/#activity=orbital-speed/guided',
    });
    await landed(page);
  });

  test('a pack link', async ({ page, app }) => {
    await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const link = await page.evaluate(async () => {
      const { remixBuiltin } = await import('/js/composer/remixApi.js');
      const { packLink } = await import('/js/composer/packLink.js');
      const made = await remixBuiltin('keplers-laws', { id: 'my-kepler' });
      return (
        await packLink(made.pack, {
          root: `${location.origin}/`,
          base: made.pack,
        })
      ).url;
    });
    expect(new URL(link).hash).toMatch(/^#i\d+[zr]/);
    await app.boot({ firstVisit: true, url: link });
    await landed(page);
  });
});

test.describe('the reset beside the progress bar', () => {
  const said = page => page.locator('#gravitasToast.is-visible');
  const bodies = page =>
    page.evaluate(async () => {
      const p = await import('/js/physics.js');
      return [...p.stars, ...p.planets].map(b => b.mass);
    });
  const disturb = page =>
    page.evaluate(async () => {
      const p = await import('/js/physics.js');
      [...p.stars, ...p.planets][0].mass *= 7;
    });

  test('it puts a step with a setup back, and says answers are kept', async ({
    page,
    app,
  }) => {
    await openAt(page, app, LESSON, NUMERIC, {
      [`${LESSON}:${NUMERIC}`]: '8',
    });
    const before = await bodies(page);
    await disturb(page);
    expect(await bodies(page)).not.toEqual(before);
    await page.locator('#investigationResetScenario').click();
    await expect.poll(() => bodies(page), { timeout: 15_000 }).toEqual(before);
    await expect(said(page)).toHaveText(
      'Scene back at the start of this step. Your answers are kept.'
    );
    expect((await stored(page)).responses[`${LESSON}:${NUMERIC}`]).toBe('8');
  });

  test('in a lesson with no setup it restages what the step shows, and the instrument', async ({
    page,
    app,
  }) => {
    await openAt(page, app, 'weighing-stars', 'try-it', {
      'weighing-stars:the-rule': 1,
    });
    await expect(page.locator('#investigationTool')).toBeVisible();
    const slider = page.locator('#investigationTool [data-tool]').first();
    const start = await slider.inputValue();
    const before = await bodies(page);
    await slider.fill(await slider.getAttribute('max'));
    expect(await slider.inputValue()).not.toBe(start);
    await disturb(page);
    await page.locator('#investigationResetScenario').click();

    await expect.poll(() => bodies(page), { timeout: 15_000 }).toEqual(before);
    await expect(
      page.locator('#investigationTool [data-tool]').first()
    ).toHaveValue(start);
    await expect(said(page)).toHaveText(
      'Scene and instrument back at the start of this step. Your answers are kept.'
    );
    expect((await stored(page, 'weighing-stars')).responses).toMatchObject({
      'weighing-stars:the-rule': 1,
    });
  });

  test('and it says it in Spanish', async ({ page, app }) => {
    await openAt(page, app, LESSON, NUMERIC, {}, 'es');
    await page.locator('#investigationResetScenario').click();
    await expect(said(page)).toHaveText(
      'La escena vuelve al inicio de este paso. Tus respuestas se conservan.'
    );
  });
});

test.describe('Restart asks first', () => {
  const answers = {
    [`${LESSON}:${NUMERIC}`]: '8',
    [`${LESSON}:${NUMERIC}:locale`]: 'en',
    [`${LESSON}:weighing-another-star`]: '3',
    [`${LESSON}:eight-minutes-of-arc:shown`]: true,
  };
  const dialog = page => page.locator('#investigationRestart');

  async function ask(page) {
    await openMore(page);
    await page.locator('#investigationReset').click();
    await expect(dialog(page)).toBeVisible();
  }

  test('with the count, focus inside, and Escape keeps the work', async ({
    page,
    app,
  }) => {
    await openAt(page, app, LESSON, NUMERIC, answers);
    await ask(page);
    await expect(dialog(page)).toContainText('Answers recorded here: 2');
    await expect(
      page.locator('#investigationRestart [value=cancel]')
    ).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('#investigationReset')).toBeFocused();
    expect((await stored(page)).responses).toMatchObject(answers);
  });

  test('Cancel keeps the work as well', async ({ page, app }) => {
    await openAt(page, app, LESSON, NUMERIC, answers);
    await ask(page);
    await page.locator('#investigationRestart [value=cancel]').click();
    await expect(dialog(page)).toBeHidden();
    expect((await stored(page)).responses).toMatchObject(answers);
  });

  test('a backup can be had first, and erasing then goes back to step 1', async ({
    page,
    app,
  }) => {
    await openAt(page, app, LESSON, NUMERIC, answers);
    await ask(page);
    const download = page.waitForEvent('download');
    await page.locator('#investigationRestartBackup').click();
    expect((await download).suggestedFilename()).toMatch(/\.json$/);
    await expect(dialog(page)).toBeVisible();

    await page.locator('#investigationRestart [value=go]').click();
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('#investigationProgressText')).toContainText(
      /^1 /
    );
    await expect.poll(async () => (await stored(page)).responses).toEqual({});
  });

  test('it is in Spanish for a Spanish reader, and passes axe', async ({
    page,
    app,
  }) => {
    await openAt(page, app, LESSON, NUMERIC, answers, 'es');
    await ask(page);
    await expect(dialog(page)).toContainText('Respuestas registradas aquí: 2');
    await expect(
      page.locator('#investigationRestart [value=go] .gs-es')
    ).toBeVisible();
    await expect(
      page.locator('#investigationRestart [value=go] .gs-en')
    ).toBeHidden();
    const results = await new AxeBuilder({ page })
      .include('#investigationRestart')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('a number typed and not yet checked', () => {
  const key = `${LESSON}:${NUMERIC}`;

  test('is there after a reload, in a decimal comma, and is not an answer', async ({
    page,
    app,
  }) => {
    await openAt(page, app, LESSON, NUMERIC, {}, 'es');
    await page.locator('.inv-answer-num').fill('0,910');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.evaluate(() => {
      location.hash = '#investigation=keplers-laws';
    });
    await expect(page.locator('.inv-answer-num')).toHaveValue('0,910');

    const record = await stored(page);
    expect(record.drafts).toEqual({ [key]: '0,910' });
    expect(record.responses[key]).toBeUndefined();
    expect(record.attempts[key]).toBeUndefined();
    await expect(page.locator('#investigationBody .inv-feedback')).toHaveCount(
      0
    );
  });

  test('survives leaving the step and coming back, and Check makes it the answer', async ({
    page,
    app,
  }) => {
    await openAt(page, app, LESSON, NUMERIC);
    await page.locator('.inv-answer-num').fill('2.5');
    await page.locator('#investigationPrev').click();
    await page.locator('#investigationNext').click();
    await expect(page.locator('.inv-answer-num')).toHaveValue('2.5');

    await page.locator('[data-check-numeric]').click();
    await expect
      .poll(async () => (await stored(page)).responses[key])
      .toBe('2.5');
    expect((await stored(page)).drafts).toBeUndefined();
    expect((await stored(page)).attempts[key]).toBe(1);
  });
});
