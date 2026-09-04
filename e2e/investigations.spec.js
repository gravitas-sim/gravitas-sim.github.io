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

  test('the browser opens on its heading, not scrolled past it', async ({
    page,
    app,
  }) => {
    // openBrowser focuses the first lesson card so a keyboard user lands on the
    // list rather than the close button, which is right. What it did not do was
    // stop the browser scrolling that card into view: the card sits below the
    // panel's heading and its intro, so the native focus scroll dragged both
    // off the top. At 320x568 the panel opened 137 pixels down and the first
    // thing on screen was the second half of a sentence.
    for (const [width, height] of [
      [320, 568],
      [375, 667],
      [1280, 720],
    ]) {
      await page.setViewportSize({ width, height });
      await app.boot();
      // Dispatched rather than clicked through Playwright. At 320px the rail
      // sits behind the mobile menu, and getting to it is a different test from
      // this one, which is about where openBrowser leaves the scroll position.
      await page.evaluate(() =>
        document.getElementById('investigationsBtn').click()
      );
      await expect(page.locator('#investigationBrowser')).toBeVisible();
      // Let the deferred focus land before measuring.
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const title = document
          .getElementById('investigationBrowserTitle')
          .getBoundingClientRect();
        return {
          titleTop: title.top,
          scrollTop:
            document.getElementById('investigationBrowserContent')?.scrollTop ??
            0,
          focusedCard: Boolean(document.activeElement?.closest?.('.inv-card')),
        };
      });

      expect(state.scrollTop).toBe(0);
      expect(state.titleTop).toBeGreaterThanOrEqual(0);
      // ...and the keyboard affordance the focus call exists for is intact.
      expect(state.focusedCard).toBe(true);

      await page.keyboard.press('Escape');
    }
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
  test(
    'walks the first several steps, meeting an instrument on the way',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
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
    }
  );

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

// =============================================================================
// Loading one lesson at a time
// -----------------------------------------------------------------------------
// The ten lessons used to be one 8,460-line module, so opening any of them
// parsed all ten. They are now a file each behind a registry, and what these
// tests hold onto is the property that made the split worth doing: the network
// tab has to show one lesson arriving, not ten.
// =============================================================================

/** Lesson modules the page has actually fetched, by filename. */
const lessonsFetched = page =>
  page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map(r => r.name)
      .filter(n => /\/data\/investigations\/[a-z-]+\.js/.test(n))
      .map(n => n.split('/').pop())
      .filter(n => !['registry.js', 'manifest.js', 'catalogue.js'].includes(n))
  );

test.describe('lesson loading', () => {
  test('the browser lists every lesson without loading any of them', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    // From the manifest rather than a literal: the catalogue grows, and a test
    // that hard-codes its size fails for the one reason nobody needs telling.
    const expected = await page.evaluate(async () => {
      const { MANIFEST } = await import('/js/data/investigations/manifest.js');
      return MANIFEST.length;
    });
    await expect(page.locator('#investigationList .inv-card')).toHaveCount(
      expected
    );

    // Every card carries a step count and a duration, and all of it came out of
    // the manifest: the cards are drawn, and no lesson has been fetched.
    await expect(page.locator('#investigationBrowserCount')).toContainText(
      /\d+ lessons · \d+ steps/
    );
    expect(await lessonsFetched(page)).toEqual([]);
  });

  test('opening a lesson fetches that lesson and no other', async ({
    page,
    app,
  }) => {
    await openLesson(page, app, 'tides');
    await expect(page.locator('#investigationTitle')).toHaveText('Tides');
    expect(await lessonsFetched(page)).toEqual(['tides.js']);

    // A second lesson adds itself and nothing else. Eight of the ten are still
    // untouched at this point, which is the whole point.
    await page.locator('#investigationClose').click();
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="black-holes"]').click();
    await expect(page.locator('#investigationTitle')).toHaveText(
      'Black Holes by the Numbers'
    );
    expect((await lessonsFetched(page)).sort()).toEqual([
      'black-holes.js',
      'tides.js',
    ]);
  });

  test('a lesson link loads only the lesson it names', async ({
    page,
    app,
  }) => {
    // An assignment link. Start-up reads the hash and opens the lesson, which
    // is now a fetch rather than a lookup.
    await app.boot({ url: '/#investigation=weighing-stars' });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationTitle')).toHaveText(
      'Weighing the Stars'
    );
    expect(await lessonsFetched(page)).toEqual(['weighing-stars.js']);
  });

  test('a card opened twice in a row fetches once', async ({ page, app }) => {
    await openLesson(page, app, 'orbital-energy');
    await page.locator('#investigationClose').click();
    await page.locator('#investigationsBtn').click();
    await page.locator('[data-investigation="orbital-energy"]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible();

    const fetched = await page.evaluate(
      () =>
        performance
          .getEntriesByType('resource')
          .map(r => r.name)
          .filter(n => n.endsWith('/orbital-energy.js')).length
    );
    expect(fetched).toBe(1);
  });

  test('closing while a lesson is still arriving does not reopen it', async ({
    page,
    app,
  }) => {
    // The race the split introduced: a student clicks a card, thinks better of
    // it, and closes the browser before the lesson lands. The abandoned lesson
    // must not appear on top of them a moment later.
    await app.boot();
    await page.evaluate(async () => {
      const mod = await import('/js/investigations.js');
      const opening = mod.openInvestigation('goldilocks-question');
      mod.closeInvestigation();
      await opening;
    });
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/investigation-open/);
  });
});

// =============================================================================
// The bottom edge, when a lesson is open
// -----------------------------------------------------------------------------
// The transport bar is fixed to the bottom at a higher z-index than the lesson
// panel, and the panel used to clear it by a constant: 88px as a side column,
// 76px as a bottom sheet, each written as the bar's 48px plus its offset plus a
// gap. The bar is only 48px tall while it fits on one row. Between about 640px
// and 1000px of window it wraps to 62px, and both constants were then short by
// enough that the bar crossed the panel's footer.
//
// Overlapping would be a cosmetic complaint on its own. The bar wins the hit
// test, so what actually happened is that Back and Next stopped responding:
// between 640px and 800px a student could not leave the step they were on, and
// no amount of clicking helped. That is the failure this guards.
// =============================================================================
test.describe('a lesson can be driven at any window width', () => {
  const WIDTHS = [375, 640, 673, 700, 760, 800, 860, 900, 1000, 1280, 1440];

  test('Next is clickable and nothing covers the lesson panel', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(Math.max(120_000, WIDTHS.length * 12_000));

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: Math.max(700, width) });
      await app.boot({ url: '/#investigation=when-orbits-lock' });
      await page.waitForTimeout(600);

      const stepNow = () =>
        page.evaluate(
          () => +(document.body.innerText.match(/STEP\s+(\d+)/i)?.[1] || 0)
        );
      const before = await stepNow();

      // A real click, not a forced one: the point is that the button receives
      // the event, which is exactly what a forced click would paper over.
      await page
        .locator('#investigationNext')
        .click({ timeout: 6000 })
        .catch(err => {
          throw new Error(
            `Next was not clickable at ${width}px: ${String(err.message).split('\n')[0]}`
          );
        });
      await page.waitForTimeout(500);
      expect(await stepNow(), `step did not advance at ${width}px`).toBe(
        before + 1
      );

      // And the instrument, when a step carries one, must not sit on top of the
      // lesson it belongs to.
      const overlap = await page.evaluate(() => {
        const box = sel => {
          const el = document.querySelector(sel);
          if (!el || el.hidden) return null;
          const r = el.getBoundingClientRect();
          return r.width && r.height ? r : null;
        };
        const panel = box('.investigation-panel');
        const areaWith = other => {
          const b = box(other);
          if (!panel || !b) return 0;
          return (
            Math.max(
              0,
              Math.min(panel.right, b.right) - Math.max(panel.left, b.left)
            ) *
            Math.max(
              0,
              Math.min(panel.bottom, b.bottom) - Math.max(panel.top, b.top)
            )
          );
        };
        return {
          tool: Math.round(areaWith('#investigationTool')),
          bar: Math.round(areaWith('#timelineBar')),
        };
      });
      expect(
        overlap.bar,
        `the transport bar covers the lesson at ${width}px`
      ).toBe(0);
      expect(
        overlap.tool,
        `the instrument covers the lesson at ${width}px`
      ).toBe(0);
    }
  });
});

// A lesson that locks the world already refused placement, but the rail button
// went on looking live: it lit up, set a crosshair, and opened its picker over
// the lesson panel itself on any window narrow enough for the panel to be a
// bottom sheet. Refusing the click and still offering the control is the worst
// of both.
test.describe('a lesson that locks placement says so', () => {
  test('the add control is disabled and its picker cannot cover the lesson', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.waitForTimeout(400);

    // Armed before the lesson opens, which is the case that used to persist.
    await page.click('#objectTypeBtn');
    await page.click('.object-picker-item[data-object-type="Star"]');
    await expect(page.locator('body')).toHaveClass(/is-adding/);

    await page.evaluate(() => {
      window.location.hash = '#investigation=keplers-laws';
    });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await page.waitForTimeout(800);

    await expect(page.locator('body')).not.toHaveClass(/is-adding/);
    await expect(page.locator('#objectTypeBtn')).toBeDisabled();

    // And the picker stays shut, so it cannot land on the lesson panel.
    await page.locator('#objectTypeBtn').click({ force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('#objectTypePicker')).toBeHidden();
  });
});
