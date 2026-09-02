// =============================================================================
// The guided lessons: opening one, advancing it, saving it, reporting on it
// -----------------------------------------------------------------------------
// Workflows 11 to 13. Half the application by weight is in here, it loads on
// demand, and it is the part with the most moving pieces: a step engine, a
// widget registry, a grader, a persistence layer and a PDF writer.
//
// The lesson used is "The Missing Mass" because it exercises the widest set of
// step types in the fewest screens - a read with an instrument, an explore with
// a checklist, a graded choice, a measure with fields and a plot, a numeric
// answer and a short answer.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'missing-mass';

/** Open the lesson browser and start a lesson through the interface. */
async function openLesson(page, app, id = LESSON) {
  await app.boot();
  await page.locator('#investigationsBtn').click();
  await expect(page.locator('#investigationBrowser')).toBeVisible();

  const card = page.locator(`[data-investigation="${id}"]`);
  await expect(card).toBeVisible();
  await card.click();

  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
}

/** The step number the panel is showing, one-based. */
async function stepNumber(page) {
  const text = await page.locator('#investigationProgressText').innerText();
  return Number(text.match(/(\d+)\s+of/)?.[1] ?? 0);
}

/**
 * Satisfy whatever the current step is asking for, then advance.
 *
 * A lesson step can gate Next behind a choice, a filled field or a ticked
 * checklist. This answers whichever is present so a walk can get through
 * several step types without the test knowing which is which.
 */
async function answerAndAdvance(page) {
  // A choice or a prediction: pick any option so the step unlocks.
  const options = page.locator('#investigationBody .inv-option');
  if (await options.count()) await options.first().click();

  // A measure step: fill every field it asks for.
  const fields = page.locator('#investigationBody input[data-field]');
  const fieldCount = await fields.count();
  for (let i = 0; i < fieldCount; i++) {
    const input = fields.nth(i);
    if (!(await input.inputValue())) await input.fill('1');
  }

  // An explore step: tick the checklist.
  const boxes = page.locator('#investigationBody input[type="checkbox"]');
  const boxCount = await boxes.count();
  for (let i = 0; i < boxCount; i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check();
  }

  const before = await stepNumber(page);
  await page.locator('#investigationNext').click();
  await expect
    .poll(() => stepNumber(page), { timeout: 15_000 })
    .toBeGreaterThan(before);
}

test.describe('opening a lesson', () => {
  test('the browser lists lessons and one of them opens', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();

    const browser = page.locator('#investigationBrowser');
    await expect(browser).toBeVisible();
    await expect(page.locator('#investigationBrowserCount')).not.toBeEmpty();

    const cards = page.locator('[data-investigation]');
    expect(await cards.count()).toBeGreaterThan(5);

    await cards.first().click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationTitle')).not.toBeEmpty();
    await expect(page.locator('#investigationProgressText')).toContainText(
      /of\s+\d+\s+steps/
    );
  });

  test('a lesson sets up its own scenario and keeps the sim alive', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await app.waitForBodies(1);
    await app.waitForFrames(20);
    expect((await app.bodySnapshot()).nonFinite).toBe(0);
  });
});

test.describe('advancing through representative step types', () => {
  test('walks the first several steps, meeting an instrument on the way', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    expect(await stepNumber(page)).toBe(1);

    // Step 2 of this lesson is an explore step with a docked instrument, which
    // is the step type most likely to break: it renders a canvas, sliders,
    // presets and a readout from the widget registry.
    await answerAndAdvance(page);
    expect(await stepNumber(page)).toBe(2);

    const tool = page.locator('#investigationToolCanvas');
    await expect(tool).toBeVisible();
    await expect(page.locator('#investigationToolTitle')).not.toBeEmpty();
    await expect(
      page.locator('#investigationToolControls [data-tool]').first()
    ).toBeVisible();
    await expect(
      page.locator('#investigationToolReadout .inv-tool-row').first()
    ).toBeVisible();

    // The canvas is actually painted rather than merely present.
    const painted = await tool.evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      if (!width || !height) return 0;
      const data = ctx.getImageData(0, 0, width, height).data;
      const seen = new Set();
      for (let i = 0; i < data.length; i += 4 * 97) {
        seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
      return seen.size;
    });
    expect(painted).toBeGreaterThan(3);

    // A preset changes the readout, which is the whole interaction.
    const readout = page.locator('#investigationToolReadout');
    const first = await readout.innerText();
    const presets = page.locator(
      '#investigationToolPresets [data-tool-preset]'
    );
    if (await presets.count()) {
      await presets.last().click();
      await expect
        .poll(async () => (await readout.innerText()) !== first, {
          timeout: 10_000,
        })
        .toBe(true);
    }
  });

  test('a graded choice marks a right answer right', async ({ page, app }) => {
    await openLesson(page, app);
    await answerAndAdvance(page); // -> 2, explore
    await answerAndAdvance(page); // -> 3, a graded choice

    const correct = await page.evaluate(
      async ([id, n]) => {
        const data = await import('/js/data/investigations.js');
        return data.getInvestigation(id).steps[n - 1].answer;
      },
      [LESSON, 3]
    );
    expect(Number.isInteger(correct)).toBe(true);

    const options = page.locator('#investigationBody .inv-option');
    await expect(options.first()).toBeVisible();
    await options.nth(correct).click();

    // The engine marks the answer with classes rather than with prose: the
    // chosen option gets is-chosen, the right one gets is-correct, and a wrong
    // pick also gets is-wrong. Picking the right answer therefore means one
    // option carrying both is-chosen and is-correct, and nothing carrying
    // is-wrong.
    const chosenCorrect = options.locator(
      'xpath=self::*[contains(@class,"is-chosen") and contains(@class,"is-correct")]'
    );
    await expect(chosenCorrect).toHaveCount(1, { timeout: 10_000 });
    await expect(
      page.locator('#investigationBody .inv-option.is-wrong')
    ).toHaveCount(0);

    // And it reveals the explanation, which is the part a student reads.
    await expect(page.locator('#investigationBody .inv-because')).toBeVisible();

    // The options lock once answered, so a student cannot try again for credit.
    await expect(options.first()).toBeDisabled();
  });

  test('a graded choice marks a wrong answer wrong', async ({ page, app }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);

    const correct = await page.evaluate(
      async ([id, n]) => {
        const data = await import('/js/data/investigations.js');
        return data.getInvestigation(id).steps[n - 1].answer;
      },
      [LESSON, 3]
    );

    const options = page.locator('#investigationBody .inv-option');
    const total = await options.count();
    const wrong = (correct + 1) % total;
    await options.nth(wrong).click();

    // The wrong pick is marked wrong, and the right answer is still shown, which
    // is what makes the step teach rather than merely score.
    await expect(
      page.locator('#investigationBody .inv-option.is-wrong')
    ).toHaveCount(1, { timeout: 10_000 });
    await expect(
      page.locator('#investigationBody .inv-option.is-correct')
    ).toHaveCount(1);
  });

  test('a measure step accepts numbers and plots them back', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    // Step 8 is the measure-with-plot step: four fields, then a graph of the
    // student's own numbers.
    await page.evaluate(
      async ([id, target]) => {
        const inv = await import('/js/investigations.js');
        inv.openInvestigation(id);
        // The engine has no public jump, so advance by pressing its own button.
        const next = document.getElementById('investigationNext');
        for (let i = 1; i < target; i++) next.click();
      },
      [LESSON, 1]
    );

    // Walk there properly, satisfying each gate.
    while ((await stepNumber(page)) < 8) await answerAndAdvance(page);
    expect(await stepNumber(page)).toBe(8);

    const fields = page.locator('#investigationBody input[data-field]');
    expect(await fields.count()).toBeGreaterThan(3);

    // The real answers, so the plot is the straight line the step promises.
    const values = ['2.62', '5.23', '10.46', '15.69', '5.23'];
    const n = await fields.count();
    for (let i = 0; i < n; i++) {
      await fields.nth(i).fill(values[i] ?? '1');
    }

    await expect(page.locator('#investigationPlot')).toBeVisible();
    const points = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      return inv.currentPlotData?.()?.points?.length ?? null;
    });
    expect(points).toBeGreaterThan(2);
  });
});

test.describe('persistence', () => {
  test('progress survives a reload', async ({ page, app }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    const reached = await stepNumber(page);
    expect(reached).toBeGreaterThanOrEqual(3);

    // Saved to localStorage by the engine, which is what makes a lesson
    // survivable across a class period.
    const saved = await page.evaluate(() =>
      Object.keys(window.localStorage).filter(k => /invest/i.test(k))
    );
    expect(saved.length).toBeGreaterThan(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);

    // Reopening the same lesson lands back where the student left off.
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect
      .poll(() => stepNumber(page), { timeout: 15_000 })
      .toBe(reached);
  });

  test('answers are remembered, not just the step number', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);

    const before = await page.evaluate(async id => {
      const inv = await import('/js/investigations.js');
      return inv.progressFor(id);
    }, LESSON);
    expect(before).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);

    const after = await page.evaluate(async id => {
      const inv = await import('/js/investigations.js');
      return inv.progressFor(id);
    }, LESSON);
    expect(after).toEqual(before);
  });

  test('reset clears progress and returns to step one', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await answerAndAdvance(page);
    await answerAndAdvance(page);
    expect(await stepNumber(page)).toBeGreaterThan(1);

    page.once('dialog', d => d.accept());
    await page.locator('#investigationReset').click();
    await expect.poll(() => stepNumber(page), { timeout: 15_000 }).toBe(1);
  });
});

test.describe('the student report', () => {
  test('the finish dialog opens and can produce a report', async ({
    page,
    app,
  }) => {
    // This test walks every screen of a twenty-nine step lesson, and several of
    // those screens rebuild the whole simulation as they load. It is legitimately
    // the slowest thing in the suite and the default ninety seconds is not enough
    // for it on a loaded machine, so it gets its own budget rather than a retry.
    test.setTimeout(240_000);

    await openLesson(page, app);

    const total = await page.evaluate(async id => {
      const data = await import('/js/data/investigations.js');
      return data.getInvestigation(id).steps.length;
    }, LESSON);

    const next = page.locator('#investigationNext');
    const finish = page.locator('#investigationFinish');

    // Walk to the end. Each iteration waits for the step number to change rather
    // than sleeping a fixed interval: most screens advance in a few
    // milliseconds, and the handful that rebuild a scenario take far longer than
    // any sleep worth writing.
    for (let i = 0; i < total + 2; i++) {
      if (await finish.isVisible().catch(() => false)) break;

      // Satisfy whatever gate this screen puts up.
      const options = page.locator('#investigationBody .inv-option');
      if (await options.count()) await options.first().click();
      const boxes = page.locator('#investigationBody input[type="checkbox"]');
      const boxCount = await boxes.count();
      for (let b = 0; b < boxCount; b++) {
        const box = boxes.nth(b);
        if (!(await box.isChecked())) await box.check();
      }

      const at = await stepNumber(page);
      await next.click();
      // Either the step advanced or the finish dialog appeared, which is what
      // pressing Next on the last screen does.
      await expect
        .poll(
          async () =>
            (await finish.isVisible().catch(() => false)) ||
            (await stepNumber(page)) > at,
          { timeout: 20_000 }
        )
        .toBe(true);
    }

    await expect(finish).toBeVisible({ timeout: 20_000 });
    // The summary wraps across lines, so the pattern has to tolerate whitespace
    // rather than assuming a single space.
    await expect(page.locator('#investigationFinishSummary')).toContainText(
      /of\s+\d+\s+steps/
    );

    // The report needs a name, and the dialog says so rather than silently
    // producing an unattributed PDF.
    await page.locator('#investigationDownload').click();
    await expect(page.locator('#investigationNameError')).toBeVisible();

    await page.locator('#investigationName').fill('CI Smoke Test');

    // The PDF is generated in the page and handed over as a download. Waiting on
    // the download event is what proves the whole chain ran: answer key,
    // layout, font embedding and all.
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45_000 }),
      page.locator('#investigationDownload').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    // And it is a real PDF rather than an empty file.
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(2000);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
