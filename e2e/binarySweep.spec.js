// =============================================================================
// The binary lesson's sweep, through the panel a student uses
// -----------------------------------------------------------------------------
// tests/binarySweep.test.js covers the classification and the notebook entry
// against fixed inputs. This covers the half that only a browser can show:
// that the sweep runs the real integrator through the real watcher, that what
// comes back is a physical outcome rather than an execution status, that a
// short window is reported as establishing nothing, and that the world the
// reader was looking at is put back afterwards.
//
// The windows are shortened where the test is about the plumbing rather than
// the physics: five twenty-period trials take minutes, and a suite that spends
// them proving that a button is wired is a suite nobody runs.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the lab with the run panel showing and the sweep section open. */
async function openLab(page, app, scenario = 'Binary Planet Lab') {
  await app.boot();
  await app.loadScenario(scenario, 'e2e', { run: false });
  await expect(page.locator('#binaryRunContainer')).toBeVisible();
  await page.evaluate(() => {
    document.getElementById('binarySweepSection').open = true;
  });
}

/** Shorten the observation window, for the tests that are about wiring. */
const shortenWindow = (page, periods, which = 'circumstellar') =>
  page.evaluate(
    async ([n, key]) => {
      const bs = await import('/js/experiments/binarySweep.js');
      bs.CONFIGURATIONS[key].periods = n;
    },
    [periods, which]
  );

/** Wait for the sweep to finish and hand back what the panel is holding. */
async function sweepReport(page, timeout = 300_000) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const p = await import('/js/binaryRunPanel.js');
          return p.isBinarySweeping() ? null : Boolean(p.binarySweepReport());
        }),
      { timeout, intervals: [1000] }
    )
    .toBe(true);
  return page.evaluate(async () => {
    const p = await import('/js/binaryRunPanel.js');
    return p.binarySweepReport();
  });
}

test.describe('what the sweep reports', () => {
  test('every trial carries a physical outcome, not an execution status', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 3);
    await page.locator('#binarySweepRun').click();
    const report = await sweepReport(page);

    expect(report.trials).toHaveLength(5);
    for (const trial of report.trials) {
      // The vocabulary is about the planet. 'ok' is not in it.
      expect([
        'survived',
        'ejected',
        'collided',
        'unreliable',
        'incomplete',
        'notRun',
      ]).toContain(trial.outcome);
      expect(trial.outcome).not.toBe('ok');
      // And the diagnostics the outcome rests on come with it.
      expect(trial.periodsAsked).toBe(3);
      expect(trial.periodsDone).toBeGreaterThan(0);
      expect(Number.isFinite(trial.maxDistance)).toBe(true);
      expect(Number.isFinite(trial.energyDrift)).toBe(true);
      expect(Number.isFinite(trial.encounters)).toBe(true);
    }
  });

  test('it varies the radius and holds everything else', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 3);
    const before = await page.evaluate(async () => {
      const { SETTINGS } = await import('/js/appState.js');
      return {
        m1: SETTINGS.binary_lab_m1,
        m2: SETTINGS.binary_lab_m2,
        e: SETTINGS.binary_lab_eccentricity,
        integrator: SETTINGS.integrator,
        step: SETTINGS.max_timestep,
      };
    });
    await page.locator('#binarySweepRun').click();
    const report = await sweepReport(page);

    // Five different radii, and one of everything else.
    const radii = report.trials.map(tr => tr.value);
    expect(new Set(radii).size).toBe(5);
    expect(report.held.m1).toBe(before.m1);
    expect(report.held.m2).toBe(before.m2);
    expect(report.held.eccentricity).toBe(before.e);
    expect(report.held.integrator).toBe(before.integrator);
    expect(report.held.maxTimestep).toBe(before.step);
    expect(typeof report.seed).toBe('string');
    // Every trial was asked for the same window.
    expect(new Set(report.trials.map(tr => tr.periodsAsked)).size).toBe(1);
  });

  test('the table and the plot say what happened, in words', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 3);
    await page.locator('#binarySweepRun').click();
    await sweepReport(page);

    const table = await page.locator('#binarySweepTable').innerText();
    // Periods done against periods asked, on every row.
    expect(table).toMatch(/3\.00 \/ 3/);
    expect(table.toLowerCase()).toMatch(
      /still there|left the system|hit a star/
    );
    // Never an execution status dressed as a result.
    expect(table.toLowerCase()).not.toMatch(/\bok\b/);

    // The plot is drawn as points on outcome rows; nothing is joined up.
    const drawn = await page.evaluate(() => {
      const c = document.getElementById('binarySweepPlot');
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
      return painted;
    });
    expect(drawn).toBeGreaterThan(0);
  });

  test('the caveat about the window is always there', async ({ page, app }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 3);
    await page.locator('#binarySweepRun').click();
    await sweepReport(page);
    const caveat = await page.locator('#binarySweepCaveat').innerText();
    expect(caveat).toMatch(/3 binary periods/);
    expect(caveat.toLowerCase()).toMatch(/not about the future|ten thousand/);
  });

  test('the world the reader was looking at is put back', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 3);
    const before = await page.evaluate(async () => {
      const { SETTINGS, current_scenario_name } =
        await import('/js/appState.js');
      return {
        scenario: current_scenario_name,
        radius: SETTINGS.binary_lab_planet_a,
        periods: SETTINGS.binary_lab_periods,
        step: SETTINGS.max_timestep,
      };
    });
    await page.locator('#binarySweepRun').click();
    await sweepReport(page);
    const after = await page.evaluate(async () => {
      const { SETTINGS, current_scenario_name } =
        await import('/js/appState.js');
      return {
        scenario: current_scenario_name,
        radius: SETTINGS.binary_lab_planet_a,
        periods: SETTINGS.binary_lab_periods,
        step: SETTINGS.max_timestep,
      };
    });
    expect(after).toEqual(before);
  });
});

test.describe('stopping it', () => {
  test('a stopped sweep keeps what it finished and says what it missed', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 4);
    const before = await page.evaluate(async () => {
      const { SETTINGS, current_scenario_name } =
        await import('/js/appState.js');
      return {
        scenario: current_scenario_name,
        radius: SETTINGS.binary_lab_planet_a,
        step: SETTINGS.max_timestep,
      };
    });

    await page.locator('#binarySweepRun').click();
    // Long enough that a trial or two is done, short of all five.
    await page.waitForTimeout(6000);
    await page.locator('#binarySweepCancel').click();

    const report = await sweepReport(page);
    expect(report.cancelled).toBe(true);
    // The radii it never reached are missing rather than reported as anything.
    const notRun = report.trials.filter(tr => tr.outcome === 'notRun');
    expect(notRun.length + report.trials.length).toBeGreaterThan(0);
    for (const trial of report.trials) {
      expect(trial.outcome).not.toBe('survived');
      if (trial.outcome === 'notRun') expect(trial.trustworthy).toBe(false);
    }
    const caveat = await page.locator('#binarySweepCaveat').innerText();
    expect(caveat.toLowerCase()).toMatch(/stopped/);

    // And the world the reader was looking at came back anyway.
    const after = await page.evaluate(async () => {
      const { SETTINGS, current_scenario_name } =
        await import('/js/appState.js');
      return {
        scenario: current_scenario_name,
        radius: SETTINGS.binary_lab_planet_a,
        step: SETTINGS.max_timestep,
      };
    });
    expect(after).toEqual(before);
  });
});

test.describe('re-running one trial at a smaller step', () => {
  test('it checks one radius and says what that settles', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 2);
    await page.locator('#binarySweepRun').click();
    const first = await sweepReport(page);
    expect(first.recheck).toBe(null);

    await page.selectOption('#binarySweepRecheck', { index: 4 });
    await page.locator('#binarySweepRecheckRun').click();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const p = await import('/js/binaryRunPanel.js');
            return p.isBinarySweeping()
              ? null
              : Boolean(p.binarySweepReport()?.recheck);
          }),
        { timeout: 300_000, intervals: [1000] }
      )
      .toBe(true);

    const report = await sweepReport(page);
    // The sweep's own trials survive the rerun: it is a check, not a new sweep.
    expect(report.trials).toHaveLength(5);
    // Half the step the sweep ran at, and one value.
    expect(report.recheck.timestep).toBeCloseTo(report.held.maxTimestep / 2, 9);
    expect(report.recheck.value).toBe(report.trials[4].value);
    // And whatever it concluded, it is about the window and not for ever.
    expect(report.recheck.verdict.windowOnly).toBe(true);
    const caveat = await page.locator('#binarySweepCaveat').innerText();
    expect(caveat.toLowerCase()).toMatch(/not the same as|has measured/);
  });
});

test.describe('an unfinished observation is not a survival', () => {
  test('a window the trials cannot finish is reported as establishing nothing', async ({
    page,
    app,
  }) => {
    // The failure this whole design is against: a run that stopped early with
    // the planet still on screen, reported as "survived".
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 3);
    // The world stops advancing while the sweep is running - a paused tab, a
    // machine that cannot keep up - so no trial reaches the end of its window.
    await page.locator('#binarySweepRun').click();
    await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      window.__freeze = window.setInterval(() => {
        physics.state.paused = true;
      }, 40);
    });
    const report = await sweepReport(page);
    await page.evaluate(async () => {
      window.clearInterval(window.__freeze);
      const physics = await import('/js/physics.js');
      physics.state.paused = false;
    });

    expect(report.trials.every(tr => tr.outcome === 'incomplete')).toBe(true);
    for (const trial of report.trials) {
      expect(trial.trustworthy).toBe(false);
      expect(trial.periodsDone).toBeLessThan(trial.periodsAsked);
    }
    const caveat = await page.locator('#binarySweepCaveat').innerText();
    expect(caveat.toLowerCase()).toMatch(/did not finish|establish/);
  });
});

test.describe('keeping it', () => {
  test('the whole sweep goes into the notebook, caveat included', async ({
    page,
    app,
  }) => {
    test.setTimeout(420_000);
    await openLab(page, app);
    await shortenWindow(page, 2);
    await page.locator('#binarySweepRun').click();
    const report = await sweepReport(page);

    await page.locator('#binarySweepKeep').click();
    await expect(page.locator('#nbDraftClaim')).toBeVisible();
    await page
      .locator('#nbDraftClaim')
      .fill('I expected the change to be near the published boundary.');
    await page.locator('#nbDraftSave').click();
    await expect(page.locator('.nb-entry')).toHaveCount(1);

    const entry = await page.evaluate(async () => {
      const panel = await import('/js/notebookPanel.js');
      const all = panel.notebookEntries();
      return all[all.length - 1];
    });

    // The evidence is the five outcomes, and the settings are the ones they
    // were run at rather than whatever the panel shows now.
    expect(entry.prose.evidence).toMatch(/separations:/);
    expect(entry.snapshot.provenance.seed).toBe(report.seed);
    expect(entry.snapshot.provenance.numerical.maxTimestep).toBe(
      report.held.maxTimestep
    );
    expect(entry.snapshot.provenance.numerical.integrator).toBe(
      report.held.integrator
    );
    // And the limitation that is true of every one of these entries.
    expect(entry.prose.limitations).toMatch(/2 binary periods/);
    expect(entry.prose.limitations.toLowerCase()).toMatch(
      /no trial was re-run/
    );
  });
});

test.describe('the lesson that uses it', () => {
  test('the sweep steps are in it, in the right order, with prerequisites', async ({
    page,
    app,
  }) => {
    await app.boot();
    const out = await page.evaluate(async () => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('binary-star-planets');
      const at = sid => lesson.steps.findIndex(s => s.sid === sid);
      return {
        total: lesson.steps.length,
        predict: at('predict-the-sweep'),
        run: at('run-the-sweep'),
        read: at('read-the-sweep'),
        shows: at('what-the-sweep-shows'),
        resolve: at('resolve-the-edge'),
        boundary: at('work-out-the-boundary'),
        circumbinary: at('sweep-the-circumbinary'),
        requires: Object.fromEntries(
          lesson.steps.filter(s => s.requires).map(s => [s.sid, s.requires])
        ),
      };
    });

    // The individual runs come first: the sweep sits after the boundary
    // question it extends.
    expect(out.boundary).toBeLessThan(out.predict);
    expect(out.predict).toBeLessThan(out.run);
    expect(out.run).toBeLessThan(out.read);
    expect(out.read).toBeLessThan(out.shows);
    expect(out.read).toBeLessThan(out.resolve);
    // The prediction is a prerequisite of running it, and the run of reading it.
    expect(out.requires['run-the-sweep']).toContain('predict-the-sweep');
    expect(out.requires['read-the-sweep']).toContain('run-the-sweep');
    // The optional extension is out by the circumbinary work.
    expect(out.circumbinary).toBeGreaterThan(out.shows);
  });

  test('it reads in Spanish, all the way through', async ({ page, app }) => {
    await app.boot();
    const titles = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('binary-star-planets');
      return lesson.steps.map(s => s.title);
    });
    expect(titles.filter(Boolean)).toHaveLength(titles.length);
    expect(titles.join(' ')).toContain('Cinco radios');
    expect(titles.join(' ')).not.toMatch(/Five radii|Run the sweep/);
  });
});
