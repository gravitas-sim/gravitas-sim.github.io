// =============================================================================
// The Settings panel's sections, its resets and its help
// -----------------------------------------------------------------------------
// The panel is js/settingsSchema.js (tests/settingsInventory.test.js holds that
// file to itself). What is checked here is what a reader meets:
//
//   - one Visuals section, where there were two, and the numerical method and
//     the performance trade-offs closed away under Advanced - which a search
//     opens when what it finds is in there
//   - a section heading that is a button, so a keyboard can fold it
//   - Reset on a section puts that section's pending values back and leaves
//     every other section's alone; the footer's Reset puts them all back. It
//     used to rebuild the panel from the applied values and change nothing
//   - the help behind an info button is in the reader's language
// =============================================================================

import { test, expect } from './fixtures.js';

const PANEL = '#settingsPanel';

const openSettings = async page => {
  await page.evaluate(() => document.getElementById('settingsBtn').click());
  await expect(page.locator(PANEL)).toBeVisible();
};

const section = (page, id) =>
  page.locator(`#settingsGrid .settings-section[data-section="${id}"]`);

/** The pending value of a slider-backed setting, as the panel shows it. */
const sliderValue = (page, key) =>
  page.locator(`#${key}-slider`).evaluate(el => Number(el.value));

/** Stage a slider at its maximum, the way a drag would. */
const stageMax = (page, key) =>
  page.locator(`#${key}-slider`).evaluate(el => {
    el.value = el.max;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return Number(el.value);
  });

const defaults = page =>
  page.evaluate(async () => {
    const { DEFAULT_SETTINGS } = await import('/js/appState.js');
    return DEFAULT_SETTINGS;
  });

test.describe('sections', () => {
  test('one Visuals, and Advanced closed until it is opened', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openSettings(page);

    const titles = await page
      .locator('#settingsGrid .settings-section-fold')
      .allTextContents();
    expect(titles.filter(t => t.includes('Visuals'))).toHaveLength(1);

    const advanced = page.locator('#settingsGrid .settings-advanced');
    await expect(advanced).toHaveJSProperty('open', false);
    await expect(section(page, 'accuracy')).toBeHidden();
    await expect(
      advanced.locator('[data-setting-key="integrator"]').first()
    ).toBeAttached();

    await advanced.locator('summary').click();
    await expect(section(page, 'accuracy')).toBeVisible();
    await expect(section(page, 'performance')).toBeVisible();
  });

  test('a search opens Advanced when the match is inside it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openSettings(page);
    await page.locator('#settingsFilter').fill('integrator');
    const advanced = page.locator('#settingsGrid .settings-advanced');
    await expect(advanced).toHaveJSProperty('open', true);
    await expect(
      page.locator('.setting-control[data-setting-key="integrator"]')
    ).toBeVisible();

    // A search with nothing in Advanced folds it out of the way.
    await page.locator('#settingsFilter').fill('trail');
    await expect(advanced).toBeHidden();
  });

  test('a section folds from the keyboard', async ({ page, app }) => {
    await app.boot();
    await openSettings(page);
    const fold = section(page, 'visuals').locator('.settings-section-fold');
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await fold.focus();
    await page.keyboard.press('Enter');
    await expect(fold).toHaveAttribute('aria-expanded', 'false');
    await expect(section(page, 'visuals')).toHaveClass(/collapsed/);
    await page.keyboard.press('Space');
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('resets', () => {
  test("a section's Reset puts back that section, and only that section", async ({
    page,
    app,
  }) => {
    await app.boot();
    const d = await defaults(page);
    await openSettings(page);

    const trail = await stageMax(page, 'trail_length');
    const speed = await stageMax(page, 'sim_speed');
    expect(trail).not.toBe(d.trail_length);
    expect(speed).not.toBe(d.sim_speed);

    await section(page, 'visuals').locator('.settings-section-reset').click();
    expect(await sliderValue(page, 'trail_length')).toBe(d.trail_length);
    expect(
      await sliderValue(page, 'sim_speed'),
      'the Simulation section kept its staged value'
    ).toBe(speed);
    // Focus stays on the button that was pressed, in the rebuilt panel.
    await expect(
      section(page, 'visuals').locator('.settings-section-reset')
    ).toBeFocused();
  });

  test("the footer's Reset puts back every setting", async ({ page, app }) => {
    await app.boot();
    const d = await defaults(page);
    await openSettings(page);
    await stageMax(page, 'sim_speed');
    await stageMax(page, 'trail_length');
    await page.locator('#settingsReset').click();
    expect(await sliderValue(page, 'sim_speed')).toBe(d.sim_speed);
    expect(await sliderValue(page, 'trail_length')).toBe(d.trail_length);
  });

  test('a reset is pending until Apply', async ({ page, app }) => {
    await app.boot();
    const applied = () =>
      page.evaluate(async () => {
        const { SETTINGS } = await import('/js/appState.js');
        return SETTINGS.trail_length;
      });
    const before = await applied();
    await openSettings(page);
    await stageMax(page, 'trail_length');
    await page.locator('#settingsApply').click();
    // Apply closes the panel; reopening before it has finished closing would
    // have the close land on the new one.
    await expect(page.locator(PANEL)).toBeHidden();
    const staged = await applied();
    expect(staged).not.toBe(before);

    await openSettings(page);
    await section(page, 'visuals').locator('.settings-section-reset').click();
    expect(await applied(), 'nothing applied by the reset itself').toBe(staged);
    await page.locator('#settingsCancel').click();
    expect(await applied()).toBe(staged);
  });
});

test.describe('apply', () => {
  test('a changed planet count survives the rebuild of a scenario', async ({
    page,
    app,
  }) => {
    // Applying rebuilds the world through the scenario's preset, which resets
    // every setting to the scenario's own values. It used to do only that, so
    // the reader's new count was gone before the world was generated and
    // Apply rebuilt the world it started with.
    await app.boot();
    const planets = () =>
      page.evaluate(async () => {
        const physics = await import('/js/physics.js');
        const { SETTINGS } = await import('/js/appState.js');
        return {
          bodies: physics.planets.length,
          setting: SETTINGS.num_planets,
        };
      });
    const before = await planets();
    const target = before.setting === 60 ? 40 : 60;
    await openSettings(page);
    await page.locator('#num_planets-slider').evaluate((el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, target);
    await page.locator('#settingsApply').click();
    await expect.poll(planets).toEqual({ bodies: target, setting: target });
  });
});

test.describe('interactive add', () => {
  test('switched off, the Add object button stops offering placement', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openSettings(page);
    const toggle = page.locator(
      '.setting-control[data-setting-key="interactive_add"] button'
    );
    await expect(toggle).toHaveAttribute('data-state', 'on');
    await toggle.click();
    await page.locator('#settingsApply').click();
    await expect(page.locator(PANEL)).toBeHidden();
    await expect(page.locator('#objectTypeBtn')).toBeDisabled();

    await openSettings(page);
    await toggle.click();
    await page.locator('#settingsApply').click();
    await expect(page.locator('#objectTypeBtn')).toBeEnabled();
  });
});

test.describe('course level', () => {
  test('a level stages its defaults, and Apply keeps it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openSettings(page);
    const level = page.locator('#settingsCourseLevel');
    await expect(level).toHaveValue('introductory');
    const conservation = page.locator(
      '.setting-control[data-setting-key="show_conservation_diagnostics"] button'
    );
    await expect(conservation).toHaveAttribute('data-state', 'off');

    await level.selectOption('advanced');
    // Staged in the panel, not yet applied.
    await expect(conservation).toHaveAttribute('data-state', 'on');
    await expect(
      page.locator('#settingsGrid .settings-advanced')
    ).toHaveJSProperty('open', true);
    const applied = () =>
      page.evaluate(async () => {
        const units = await import('/js/units.js');
        const { SETTINGS } = await import('/js/appState.js');
        return {
          level: units.getCourseLevel(),
          digits: units.getReadoutDigits(),
          conservation: SETTINGS.show_conservation_diagnostics,
        };
      });
    expect((await applied()).level).toBe('introductory');

    await page.locator('#settingsApply').click();
    await expect(page.locator(PANEL)).toBeHidden();
    expect(await applied()).toEqual({
      level: 'advanced',
      digits: 6,
      conservation: true,
    });

    // Remembered, and offered again as the current choice.
    await app.boot();
    expect((await applied()).digits).toBe(6);
    await openSettings(page);
    await expect(page.locator('#settingsCourseLevel')).toHaveValue('advanced');
  });

  test('Cancel leaves the level as it was', async ({ page, app }) => {
    await app.boot();
    await openSettings(page);
    await page.locator('#settingsCourseLevel').selectOption('majors');
    await page.locator('#settingsCancel').click();
    await expect(page.locator(PANEL)).toBeHidden();
    expect(
      await page.evaluate(async () =>
        (await import('/js/units.js')).getCourseLevel()
      )
    ).toBe('introductory');
  });
});

test.describe('help', () => {
  test('the help behind an info button is in the reader’s language', async ({
    page,
    app,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gravitas_locale', 'es');
    });
    await app.boot();
    await openSettings(page);
    const expected = await page.evaluate(async () => {
      const { ES_DEFERRED } = await import('/js/i18n/es.deferred.js');
      return ES_DEFERRED['setHelp.gravitational_constant'];
    });
    expect(expected).toEqual(expect.any(String));
    await page
      .locator(
        '.setting-label-container[data-setting-key="gravitational_constant"] .setting-info-icon'
      )
      .click();
    await expect(page.locator('.tooltip-system').first()).toContainText(
      expected
    );
  });
});
