// =============================================================================
// Observing schedules, in a real browser
// -----------------------------------------------------------------------------
// tests/rvSchedule.test.js and tests/rvCompare.test.js cover the arithmetic.
// This file covers the half that unit tests cannot: that the controls exist,
// that they reach the sampler, that a comparison observes both arms against the
// same running world, and that the panel says the honest thing about what came
// back. The one bug this is written against is the whole feature being present
// and unwired - a schedule module that nothing calls is a module that lies in
// the export.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the RV panel on a scenario whose star is free to move. */
async function openRv(page, app) {
  await app.boot();
  await app.loadScenario('Exoplanet Characterization Lab');
  await app.waitForFrames(10);
  await app.openPanel('toggleRadialVelocity', 'rvContainer');
  await page.locator('#rvSurveyEnabled').check();
  await expect(page.locator('#rvSurveyFields')).toBeVisible();
}

/** What the run and the comparison currently report. */
const state = page =>
  page.evaluate(async () => {
    const rv = await import('/js/radialVelocity.js');
    const run = rv.radialVelocitySurvey();
    const cmp = rv.radialVelocityComparison();
    return {
      kind: run.config.kind ?? null,
      scheduleId: run.config.scheduleId ?? null,
      planned: run.planned,
      taken: run.measurements.length,
      days: run.measurements.map(m => m.day),
      comparing: Boolean(cmp),
      report: cmp?.report ?? null,
      note: document.getElementById('rvSurveyScheduleNote').textContent,
      compareText: document.getElementById('rvSurveyCompareReport').textContent,
    };
  });

test.describe('the schedule controls', () => {
  test('a regular cadence is still a cadence run, with no plan at all', async ({
    page,
    app,
  }) => {
    // The default path must not change. A share link, a lesson or an older
    // recording that never heard of a schedule shape takes the route it always
    // took, and says so by carrying no plan rather than a "regular" one.
    await openRv(page, app);
    const s = await state(page);
    expect(s.kind).toBe(null);
    expect(s.scheduleId).toBe(null);
  });

  test('choosing a shape reaches the sampler and the note', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('4');
    await page.locator('#rvSurveyShape').selectOption('clustered');
    await expect(page.locator('#rvSurveyEpochsField')).toBeVisible();
    await expect(page.locator('#rvSurveyClustersField')).toBeVisible();
    await page.locator('#rvSurveyEpochs').fill('9');
    await page.locator('#rvSurveyClusters').fill('3');
    await page.locator('#rvSurveyClusters').blur();

    const s = await state(page);
    expect(s.kind).toBe('clustered');
    expect(s.planned).toBe(9);
    expect(s.scheduleId).toMatch(/^[0-9A-Z]{7}$/);
    expect(s.note).toMatch(/9/);
  });

  test('a typed list of times is observed at those times', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyShape').selectOption('explicit');
    await expect(page.locator('#rvSurveyEpochListField')).toBeVisible();
    await page.locator('#rvSurveyEpochList').fill('0, 0.2, 0.55, 1.3, 1.31, 2');
    await page.locator('#rvSurveyEpochList').blur();

    await expect
      .poll(async () => (await state(page)).taken, { timeout: 60000 })
      .toBe(6);
    const s = await state(page);
    // The times observed are the times typed, not a cadence through them.
    // Offsets from the first observation: a schedule is relative to the start
    // of the run, and the clock is wherever it was when the run began.
    for (const [i, want] of [0, 0.2, 0.55, 1.3, 1.31, 2].entries()) {
      expect(s.days[i] - s.days[0]).toBeCloseTo(want, 2);
    }
  });

  test('a list it cannot use does not become a comb behind the reader', async ({
    page,
    app,
  }) => {
    // The failure this whole feature exists to prevent: the panel telling a
    // student their own times were used and observing on an evenly spaced
    // schedule instead. An unusable list now runs nothing and says so.
    await openRv(page, app);
    await page.locator('#rvSurveyShape').selectOption('explicit');
    await page.locator('#rvSurveyEpochList').fill('nothing usable here');
    await page.locator('#rvSurveyEpochList').blur();

    const s = await state(page);
    expect(s.note).toMatch(/could not be read|cannot be observed/i);
    expect(s.note).toMatch(/will be observed|corrected/i);
    // Nothing is observing, and in particular nothing regular is.
    await page.waitForTimeout(1200);
    const after = await state(page);
    expect(after.taken).toBe(0);
    expect(
      await page.evaluate(async () => {
        const rv = await import('/js/radialVelocity.js');
        return rv.isSurveyRunning();
      })
    ).toBe(false);
  });

  test('a decimal comma is refused rather than read as a list', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyShape').selectOption('explicit');
    await page.locator('#rvSurveyEpochList').fill('0,5 1,5 2,5');
    await page.locator('#rvSurveyEpochList').blur();
    const s = await state(page);
    expect(s.note).toMatch(/0\.5/);
    expect(s.taken).toBe(0);
  });

  test('an unreadable gap does not silently become no gap at all', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyGaps').fill('-1-2');
    await page.locator('#rvSurveyGaps').blur();
    const s = await state(page);
    expect(s.note).toMatch(/-1-2/);
    expect(
      await page.evaluate(async () => {
        const rv = await import('/js/radialVelocity.js');
        return rv.isSurveyRunning();
      })
    ).toBe(false);
  });

  test('a schedule written into the field reads back as the same schedule', async ({
    page,
    app,
  }) => {
    // The panel prints a checksum over the epoch times. Writing a plan out and
    // reading it back has to produce the same one, or the field is changing
    // the schedule as it displays it.
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('12');
    await page.locator('#rvSurveyShape').selectOption('irregular');
    await page.locator('#rvSurveyEpochs').fill('11');
    await page.locator('#rvSurveyEpochs').blur();
    const irregular = await state(page);

    const written = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      const sched = await import('/js/rvSchedule.js');
      const plan = rv.radialVelocitySurvey().config.plan;
      return sched.formatEpochList(plan.epochs.map(e => e.offset));
    });
    await page.locator('#rvSurveyShape').selectOption('explicit');
    await page.locator('#rvSurveyEpochList').fill(written);
    await page.locator('#rvSurveyEpochList').blur();

    const back = await state(page);
    expect(back.scheduleId).toBe(irregular.scheduleId);
  });

  test('what it could not read is reported, not dropped', async ({
    page,
    app,
  }) => {
    // Observing on a shorter list than somebody typed, silently, is the one
    // failure that would undermine the instrument.
    await openRv(page, app);
    await page.locator('#rvSurveyShape').selectOption('explicit');
    await page.locator('#rvSurveyEpochList').fill('0 1 oops 2 2 -3');
    await page.locator('#rvSurveyEpochList').blur();
    const s = await state(page);
    expect(s.note).toMatch(/oops/);
    expect(s.note).toMatch(/twice|duplicate|two/i);
  });

  test('a gap removes epochs and says how many', async ({ page, app }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('10');
    await page.locator('#rvSurveyShape').selectOption('regular');
    await page.locator('#rvSurveyGaps').fill('3-6');
    await page.locator('#rvSurveyGaps').blur();
    // A gap turns a cadence into a plan, so the count field appears with it.
    await expect(page.locator('#rvSurveyEpochsField')).toBeVisible();
    await page.locator('#rvSurveyEpochs').fill('11');
    await page.locator('#rvSurveyEpochs').blur();
    const s = await state(page);
    // Epochs at 0..10 in steps of one; 3, 4 and 5 fall in a half-open 3-6.
    expect(s.planned).toBe(8);
    expect(s.note).toMatch(/3/);
  });

  test('an unreadable gap is refused rather than guessed at', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyGaps').fill('later');
    await page.locator('#rvSurveyGaps').blur();
    expect((await state(page)).note).toMatch(/later/);
  });
});

test.describe('comparing two schedules', () => {
  test('both arms observe the same world and the report is controlled', async ({
    page,
    app,
  }) => {
    test.setTimeout(180000);
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('1.2');
    await page.locator('#rvSurveySigma').fill('5');
    await page.locator('#rvSurveySeed').fill('e2e-compare');
    await page.locator('#rvSurveyCompareEnabled').check();
    await expect(page.locator('#rvSurveyShapeBField')).toBeVisible();
    await page.locator('#rvSurveyShape').selectOption('regular');
    await page.locator('#rvSurveyShapeB').selectOption('irregular');
    await page.locator('#rvSurveyEpochs').fill('10');
    await page.locator('#rvSurveyEpochs').blur();

    await expect
      .poll(async () => Boolean((await state(page)).report), {
        timeout: 120000,
      })
      .toBe(true);

    const s = await state(page);
    const [a, b] = s.report.arms;
    // Same count, same span, same noise: only the times differ. Counted on the
    // points that were fitted, which is the number the comparison rests on.
    expect(a.used).toBe(10);
    expect(b.used).toBe(10);
    expect(a.missed).toBe(0);
    expect(b.missed).toBe(0);
    expect(s.report.controls.controlled).toBe(true);
    expect(a.fingerprint).not.toBe(b.fingerprint);
    // The caveat that can never be dropped.
    expect(s.report.caveats).toContain('singleRealisation');
    expect(s.compareText).toMatch(/not which schedule is better/i);
    // And the range, because a period is the best fit inside one.
    expect(s.compareText).toMatch(/searched over the same range/i);
  });

  test('it never claims a winner', async ({ page, app }) => {
    test.setTimeout(180000);
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('1.2');
    await page.locator('#rvSurveyCompareEnabled').check();
    await page.locator('#rvSurveyShapeB').selectOption('irregular');
    await page.locator('#rvSurveyEpochs').fill('8');
    await page.locator('#rvSurveyEpochs').blur();
    await expect
      .poll(async () => Boolean((await state(page)).report), {
        timeout: 120000,
      })
      .toBe(true);
    const s = await state(page);
    expect(s.compareText).not.toMatch(
      /\bbetter than\b|\bwins\b|\bbest schedule\b/i
    );
    expect(JSON.stringify(s.report)).not.toMatch(/"winner"|"better"/);
  });
});

test.describe('both arms have one lifecycle', () => {
  test('closing the panel stops both arms, not just the first', async ({
    page,
    app,
  }) => {
    // tests/rvSurvey.test.js has the sharp case - a closure too short for the
    // gap heuristic to notice, which only an explicit suspend records as
    // missed. This is the wiring: that the panel calls it on both arms, so the
    // two recordings do not differ in how long anybody was watching.
    test.setTimeout(180000);
    await openRv(page, app);
    const baselineDays = 2;
    const epochs = 12;
    await page.locator('#rvSurveyBaseline').fill(String(baselineDays));
    await page.locator('#rvSurveyCompareEnabled').check();
    await page.locator('#rvSurveyShapeB').selectOption('irregular');
    await page.locator('#rvSurveyEpochs').fill(String(epochs));
    await page.locator('#rvSurveyEpochs').blur();

    await expect
      .poll(async () => (await state(page)).taken, { timeout: 60000 })
      .toBeGreaterThanOrEqual(2);

    // Closed, and then SIMULATED time passes.
    //
    // Two seconds of wall clock was the wait here, and what has to elapse is
    // more than one epoch spacing of simulated days - which is a different
    // quantity, and how many days two seconds buys depends on how busy the
    // machine is. Run this file on its own and it passed; run it beside its
    // eighteen neighbours at six workers and the simulation advanced less than
    // one spacing in the two seconds, no epoch fell due, and the test failed
    // for a reason that had nothing to do with what it checks. So it waits for
    // the thing it actually needs.
    const spacing = baselineDays / epochs;
    const clock = () =>
      page.evaluate(async () => {
        const { getSimClock } = await import('/js/timeline.js');
        const { timeUnitSeconds } = await import('/js/units.js');
        return (getSimClock() * timeUnitSeconds()) / 86400;
      });
    const closedAt = await clock();
    await page.locator('#rvClose').click();
    await expect
      .poll(async () => (await clock()) - closedAt, { timeout: 60000 })
      .toBeGreaterThan(spacing * 1.5);
    await page.locator('#toggleRadialVelocity').click();
    await expect(page.locator('#rvContainer')).toBeVisible();

    // Both arms recorded the epochs that fell due while nobody was watching as
    // missed, rather than one of them inventing values across the closure.
    // Read once the resumed run has recorded what it missed. The comparison
    // is read defensively - null while a run is being rebuilt - and the poll
    // is what waits for it rather than a sleep.
    const readMissed = () =>
      page.evaluate(async () => {
        const rv = await import('/js/radialVelocity.js');
        const cmp = rv.radialVelocityComparison();
        const missedIn = ms => ms.filter(m => m.missed).length;
        return {
          a: missedIn(rv.radialVelocitySurvey().measurements),
          b: cmp ? missedIn(cmp.second.measurements) : null,
        };
      });
    await expect
      .poll(
        async () => {
          const m = await readMissed();
          return m.a > 0 && m.b > 0;
        },
        { timeout: 60000 }
      )
      .toBe(true);

    const missed = await readMissed();
    expect(missed.a).toBeGreaterThan(0);
    expect(missed.b).toBeGreaterThan(0);
  });

  test('a rapid change of schedule cannot install the older run', async ({
    page,
    app,
  }) => {
    // Both restarts are asynchronous - the survey and comparison libraries are
    // fetched in the middle - so without a generation the slower one installs
    // its survey after the faster one and the panel observes a schedule the
    // reader has already replaced.
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('3');
    await page.evaluate(() => {
      const shape = document.getElementById('rvSurveyShape');
      const epochs = document.getElementById('rvSurveyEpochs');
      const fire = el =>
        el.dispatchEvent(new window.Event('change', { bubbles: true }));
      shape.value = 'irregular';
      fire(shape);
      epochs.value = '9';
      fire(epochs);
      shape.value = 'clustered';
      fire(shape);
    });
    await expect
      .poll(async () => (await state(page)).kind, { timeout: 20000 })
      .toBe('clustered');
    // And it stays there: the earlier restart must not arrive late.
    await page.waitForTimeout(1000);
    expect((await state(page)).kind).toBe('clustered');
  });

  test('switching observing off cannot be undone by a restart in flight', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.evaluate(() => {
      const shape = document.getElementById('rvSurveyShape');
      shape.value = 'irregular';
      shape.dispatchEvent(new window.Event('change', { bubbles: true }));
      document.getElementById('rvSurveyEnabled').click();
    });
    await page.waitForTimeout(1500);
    const running = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      return {
        survey: rv.isSurveyRunning(),
        comparison: rv.radialVelocityComparison(),
      };
    });
    expect(running.survey).toBe(false);
    expect(running.comparison).toBe(null);
  });
});

test.describe('the schedule in the file', () => {
  test('the export carries the schedule it was observed on', async ({
    page,
    app,
  }) => {
    await openRv(page, app);
    await page.locator('#rvSurveyBaseline').fill('1');
    await page.locator('#rvSurveyShape').selectOption('irregular');
    await page.locator('#rvSurveyEpochs').fill('6');
    await page.locator('#rvSurveyEpochs').blur();
    await expect
      .poll(async () => (await state(page)).taken, { timeout: 60000 })
      .toBeGreaterThanOrEqual(3);

    const csv = await page.evaluate(async () => {
      const ex = await import('/js/dataExport.js');
      return ex.radialVelocityCsv().csv;
    });
    const lines = csv.trim().split(/\r?\n/);
    const header = lines[0].split(',');
    expect(header).toContain('schedule_kind');
    expect(header).toContain('schedule_id');
    const row = lines[1].split(',');
    expect(row[header.indexOf('schedule_kind')]).toBe('irregular');
    expect(row[header.indexOf('schedule_id')]).toMatch(/^[0-9A-Z]{7}$/);
    expect(row[header.indexOf('schedule_epochs_planned')]).toBe('6');
  });
});

test.describe('the lesson that uses it', () => {
  const LESSON = 'design-the-schedule';

  /** Open the lesson at its first step. */
  async function openLesson(page, app) {
    await app.boot();
    await page.evaluate(async lesson => {
      const loader = await import('/js/investigationsLoader.js');
      await loader.ensureInvestigations();
      const inv = await import('/js/investigations.js');
      await inv.openInvestigation(lesson);
    }, LESSON);
    await expect(page.locator('#investigationPanel')).toBeVisible();
  }

  test('it opens, and its scenario and instrument are the real ones', async ({
    page,
    app,
  }) => {
    await openLesson(page, app);
    await expect(page.locator('.inv-step-title')).toContainText('Eight nights');
    // The lesson is about the live panel, so the scenario it sets up has to be
    // the one whose star moves.
    const scenario = await page.evaluate(async () => {
      const s = await import('/js/appState.js');
      return s.current_scenario_name;
    });
    expect(scenario).toBe('Exoplanet Characterization Lab');
  });

  test('the reading step cannot be taken without the prediction', async ({
    page,
    app,
  }) => {
    await app.boot();
    // An assignment that takes the comparison has to take the prediction that
    // came before it: reading the result first is the failure the lesson is
    // built to prevent, and a prerequisite is how that survives being cut up.
    const needs = await page.evaluate(async lesson => {
      const reg = await import('/js/data/investigations/registry.js');
      const loaded = await reg.loadInvestigation(lesson);
      const step = loaded.steps.find(s => s.sid === 'read-the-comparison');
      const predict = loaded.steps.findIndex(s => s.sid === 'predict-the-comb');
      const read = loaded.steps.findIndex(s => s.sid === 'read-the-comparison');
      return { requires: step?.requires ?? null, predict, read };
    }, LESSON);
    expect(needs.requires).toContain('predict-the-comb');
    // And it comes first, so the prediction is made before any result exists.
    expect(needs.predict).toBeLessThan(needs.read);
  });

  test('it reads in Spanish without falling back to English', async ({
    page,
    app,
  }) => {
    await app.boot();
    const out = await page.evaluate(async lesson => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
      const reg = await import('/js/data/investigations/registry.js');
      const loaded = await reg.loadInvestigation(lesson);
      return {
        title: loaded.title,
        steps: loaded.steps.length,
        titles: loaded.steps.map(s => s.title),
      };
    }, LESSON);
    expect(out.title).toBe('Diseña el calendario');
    // Every step, not just the first: a shadow that ran out halfway would show
    // a lesson that changes language in the middle.
    expect(out.titles.filter(Boolean)).toHaveLength(out.steps);
    expect(out.titles.join(' ')).not.toMatch(/Eight nights|What has to travel/);
  });
});
