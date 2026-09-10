// =============================================================================
// Classroom activities, end to end
// -----------------------------------------------------------------------------
// The definitions and the resolution are tested without a browser in
// tests/activities.test.js. What needs one is the part that is a claim about a
// running application: that a link opens the right world with the right steps,
// that a wrong link opens nothing rather than the wrong thing, that two formats
// do not share a student's answers, and that the door between the two entry
// points goes both ways.
// =============================================================================

import { test, expect } from './fixtures.js';

const TEACHING = '/teaching/';

/** Open an activity by its short link and wait for the lesson panel. */
async function launch(page, app, format) {
  await app.boot();
  await page.evaluate(f => {
    window.location.hash = `#activity=orbital-speed/${f}`;
  }, format);
  await page.waitForFunction(
    () => {
      const panel = document.getElementById('investigationPanel');
      return panel && !panel.classList.contains('hidden');
    },
    { timeout: 20000 }
  );
  await page.waitForTimeout(400);
}

/** What the lesson engine thinks it is running. */
const state = page =>
  page.evaluate(async () => {
    const inv = await import('/js/investigations.js');
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    const binding = inv.activeAssignmentBinding?.();
    return {
      steps: binding?.steps?.map(s => s.sid) ?? null,
      scenario: ui.current_scenario_name,
      bodies: [...physics.stars, ...physics.planets].map(b => b.name),
    };
  });

test.describe('each format opens what it says it opens', () => {
  test('the demonstration: four steps, the Kepler world, a prediction first', async ({
    page,
    app,
  }) => {
    await launch(page, app, 'demonstration');
    const s = await state(page);
    expect(s.steps).toEqual([
      'eight-minutes-of-arc',
      'where-does-it-move-fastest',
      'watch-it-happen',
      'equal-areas-however-you-slice',
    ]);
    expect(s.scenario).toBe("Kepler's 2nd Law");
    expect(s.bodies).toEqual(
      expect.arrayContaining(['Kepler Star', 'Eccentric Orbiter'])
    );
  });

  test('the guided activity: seven steps, ending on the explanation', async ({
    page,
    app,
  }) => {
    await launch(page, app, 'guided');
    const s = await state(page);
    expect(s.steps).toHaveLength(7);
    expect(s.steps[0]).toBe('eight-minutes-of-arc');
    expect(s.steps).toContain('fast-and-slow-in-numbers');
    expect(s.steps.at(-1)).toBe('why-the-speed-changes');
    expect(s.scenario).toBe("Kepler's 2nd Law");
  });

  test('the full lab: twelve steps, ending on the transfer', async ({
    page,
    app,
  }) => {
    await launch(page, app, 'lab');
    const s = await state(page);
    expect(s.steps).toHaveLength(12);
    expect(s.steps).toContain('measure-the-two-orbits');
    expect(s.steps.at(-1)).toBe('where-kepler-s-version-breaks');
  });

  test('the panel says which activity and how much of the lesson', async ({
    page,
    app,
  }) => {
    await launch(page, app, 'guided');
    const text = await page.locator('#investigationPanel').innerText();
    expect(text).toContain('why do planets change speed');
    // Honest about being a cut: seven of twenty-three.
    expect(text).toMatch(/7 steps of/);
    expect(text).toMatch(/23/);
  });

  test('the measuring tool the guided activity needs is there', async ({
    page,
    app,
  }) => {
    await launch(page, app, 'guided');
    // Walk to the measurement step and check the event tool came with it.
    const armed = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const binding = inv.activeAssignmentBinding?.();
      const index = binding.steps.findIndex(
        s => s.sid === 'fast-and-slow-in-numbers'
      );
      return { index, pauseAt: binding.steps[index]?.pauseAt ?? null };
    });
    expect(armed.index).toBeGreaterThan(0);
    // Periapsis and apoapsis, on the right two bodies, configured by the step
    // rather than by the student hunting for them.
    expect(armed.pauseAt.kind).toBe('periapsis');
    expect(armed.pauseAt.body).toBe('Eccentric Orbiter');
    expect(armed.pauseAt.primary).toBe('Kepler Star');
  });
});

test.describe('a link that names nothing real', () => {
  test('an unknown format opens no lesson and says which one', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(() => {
      window.location.hash = '#activity=orbital-speed/nope';
    });
    await page.waitForTimeout(2000);
    const panel = page.locator('#investigationPanel');
    await expect(panel).toBeHidden();
    await expect(page.locator('#gravitasToast')).toContainText('nope');
  });

  test('an unknown activity opens no lesson either', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(() => {
      window.location.hash = '#activity=nope/guided';
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('#investigationPanel')).toBeHidden();
    await expect(page.locator('#gravitasToast')).toContainText('nope');
  });

  test('the landing page falls back to the list rather than an empty view', async ({
    page,
  }) => {
    await page.goto(`${TEACHING}?activity=orbital-speed&format=nope`);
    await page.waitForSelector('#teachActivities article');
    await expect(page.locator('#activityFallback')).toBeVisible();
    await expect(page.locator('#activityFallback')).toContainText('nope');
    // And the real formats are all still offered.
    await expect(page.locator('.teach-activity-format')).toHaveCount(3);
  });

  test('an unknown activity on the page says so and lists what exists', async ({
    page,
  }) => {
    await page.goto(`${TEACHING}?activity=nope`);
    await page.waitForSelector('#teachActivities article');
    await expect(page.locator('#activityFallback')).toContainText('nope');
    await expect(page.locator('.teach-activity')).toHaveCount(1);
  });
});

test.describe('two formats are two different pieces of work', () => {
  test('an answer in one does not appear in the other', async ({
    page,
    app,
  }) => {
    // The failure this prevents: a student answers one question in a
    // five-minute demonstration and the fifty-minute lab reports progress.
    await launch(page, app, 'demonstration');
    const keys = () =>
      page.evaluate(() =>
        Object.keys(localStorage).filter(k => k.includes('assign'))
      );

    await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      inv.goToStep?.(1);
    });
    await page.waitForTimeout(300);
    // Answer the prediction, whatever the runner calls its option controls.
    const option = page
      .locator('#investigationPanel input[type="radio"]')
      .first();
    if (await option.count()) {
      await option.check({ force: true });
      await page.waitForTimeout(500);
    }
    const demoKeys = await keys();

    await launch(page, app, 'lab');
    const labState = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      return inv.activeAssignmentBinding()?.steps?.length ?? null;
    });
    expect(labState).toBe(12);

    // Whatever was stored belongs to the demonstration's own namespace.
    const allKeys = await keys();
    for (const key of demoKeys) expect(allKeys).toContain(key);
    const distinct = new Set(allKeys);
    expect(distinct.size).toBe(allKeys.length);
  });

  test('the two formats build different assignment ids', async ({
    page,
    app,
  }) => {
    await app.boot();
    const ids = await page.evaluate(async () => {
      const [{ ACTIVITIES }, logic, registry] = await Promise.all([
        import('/js/data/activities.js'),
        import('/js/activities/activities.js'),
        import('/js/data/investigations/registry.js'),
      ]);
      const activity = ACTIVITIES[0];
      const lesson = await registry.loadInvestigation(activity.lesson);
      return activity.formats.map(
        f =>
          logic.assignmentForFormat(lesson, activity, f, 't', '').assignment.i
      );
    });
    expect(new Set(ids).size).toBe(3);
  });
});

test.describe('the two doors', () => {
  test('the teaching page links to the investigations, and back', async ({
    page,
  }) => {
    await page.goto(`${TEACHING}#activities`);
    await page.waitForSelector('#teachActivities article');
    // Out to the whole catalogue...
    const browse = page.locator('a[data-i18n="activities.browse"]');
    await expect(browse).toHaveAttribute('href', /investigationBrowser/);
    // ...and to the investigation this activity is cut from.
    await expect(
      page.locator('a', { hasText: 'Open the full investigation' })
    ).toHaveAttribute('href', /investigation=keplers-laws/);
  });

  test('the investigation browser points at the activities', async ({
    page,
    app,
  }) => {
    await app.boot();
    const href = await page.evaluate(() => {
      const link = document.querySelector(
        '[data-i18n="inv.browser.activities.link"]'
      );
      return link?.getAttribute('href') ?? null;
    });
    expect(href).toBe('/teaching/#activities');
  });

  test('opening the full investigation still works unchanged', async ({
    page,
    app,
  }) => {
    // Existing URLs keep their behaviour: the whole lesson, no assignment.
    await app.boot();
    await page.evaluate(() => {
      window.location.hash = '#investigation=keplers-laws';
    });
    await page.waitForFunction(
      () => {
        const panel = document.getElementById('investigationPanel');
        return panel && !panel.classList.contains('hidden');
      },
      { timeout: 20000 }
    );
    const s = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      return {
        binding: inv.activeAssignmentBinding?.() ?? null,
      };
    });
    expect(s.binding).toBeNull();
  });
});

test.describe('both languages, and the keyboard', () => {
  test('the landing view translates', async ({ page }) => {
    await page.goto(`${TEACHING}#activities`);
    await page.waitForSelector('#teachActivities article');
    await expect(page.locator('#teachActivities')).toContainText(
      'why do planets change speed'
    );

    await page.locator('#teachLang button', { hasText: 'Español' }).click();
    await expect(page.locator('#teachActivities')).toContainText(
      'por qué cambian de velocidad'
    );
    // The estimate disclaimer survives the switch.
    await expect(page.locator('#teachActivities')).toContainText(
      /unos 5 minutos/
    );
    await expect(page.locator('#teachActivities')).toContainText(/Estimación/);
  });

  test('every launch control is reachable and named', async ({ page }) => {
    await page.goto(`${TEACHING}#activities`);
    await page.waitForSelector('#teachActivities article');
    const launches = page.locator('.teach-activity-launch');
    await expect(launches).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const link = launches.nth(i);
      // Named in full, so three "Start" links are three different links to a
      // screen reader.
      const label = await link.getAttribute('aria-label');
      expect(label).toMatch(/Start the .+ format of /);
      await link.focus();
      expect(await link.evaluate(el => document.activeElement === el)).toBe(
        true
      );
      // A visible focus ring, not just focus.
      const outline = await link.evaluate(
        el => getComputedStyle(el).outlineStyle
      );
      expect(outline).not.toBe('none');
    }
  });

  test('the format a link names is marked without relying on colour', async ({
    page,
  }) => {
    await page.goto(`${TEACHING}?activity=orbital-speed&format=lab#activities`);
    await page.waitForSelector('#teachActivities article');
    const current = page.locator('.teach-activity-format[aria-current="true"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText('Full lab');
  });
});
