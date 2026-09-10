// =============================================================================
// The conservation check, as a reader meets it
// -----------------------------------------------------------------------------
// The arithmetic and the conditioning rule are tested without a browser in
// tests/conservationReadout.test.js. What needs one is the presentation: that
// an ordinary first visit does not carry three unexplained percentages, that
// somebody who asks for them gets them with an explanation they can reach from
// the keyboard, and that the scenarios whose lessons depend on the readout
// still have it.
// =============================================================================

import { test, expect } from './fixtures.js';

const block = page => page.locator('.readout-conservation');

/**
 * The explanation.
 *
 * A sibling of the values, not a child of them: the values are rebuilt
 * whenever a drift figure ticks, and an element replaced several times a
 * second cannot be clicked or focused. Only the numbers are repainted.
 */
const help = page => page.locator('.readout-conservation-help');

/**
 * Load a scenario and let the readout settle.
 *
 * Settings are applied AFTER the build, not before. applyPreset() re-stamps a
 * scenario's own settings on every rebuild, so anything written first is gone
 * by the time the world exists - which is exactly how a scenario that wants
 * the readout gets it back, and exactly why a test asking for it has to ask
 * afterwards.
 */
async function scenario(page, name, settings = {}) {
  await page.evaluate(
    async ({ name: key, settings: s }) => {
      const ui = await import('/js/ui.js');
      ui.SETTINGS.preset_scenario = key;
      ui.initialize_simulation({ seed: 'conservation' });
      Object.assign(ui.SETTINGS, s);
    },
    { name, settings }
  );
  await page.waitForTimeout(900);
}

test.describe('an ordinary launch', () => {
  test('shows no conservation rows at all', async ({ page, app }) => {
    await app.boot();
    await page.waitForTimeout(800);
    await expect(block(page)).toHaveCount(0);

    // And none of the three things it used to print are anywhere in the
    // readout either.
    const text = await page.locator('#overlayStats').innerText();
    expect(text).not.toMatch(/drift/i);
    expect(text).not.toMatch(/integrator/i);
  });

  test('keeps the clock, the counts and the scale', async ({ page, app }) => {
    // What was removed is the diagnostic, not the instrumentation.
    await app.boot();
    await scenario(page, 'Solar System');
    const text = await page.locator('#overlayStats').innerText();
    expect(text).toMatch(/Elapsed/i);
    expect(text).toMatch(/Zoom/i);
    expect(text).toMatch(/Planets/i);
  });

  test('but the numbers are still being computed', async ({ page, app }) => {
    // Presentation only. Everything the reliability check, the investigations
    // and the exports read is unchanged.
    await app.boot();
    await scenario(page, 'Solar System');
    const drift = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const d = physics.conservationDrift(true);
      return (
        d && {
          hasEnergy: Number.isFinite(d.energy),
          hasAngular: Number.isFinite(d.angular),
          integrator: d.integrator,
        }
      );
    });
    expect(drift.hasEnergy).toBe(true);
    expect(drift.hasAngular).toBe(true);
    expect(drift.integrator).toBeTruthy();
  });
});

test.describe('when it is asked for', () => {
  test('it is grouped, titled, and says angular momentum in full', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scenario(page, 'Solar System', {
      show_conservation_diagnostics: true,
    });
    await expect(block(page)).toHaveCount(1);
    const text = await block(page).innerText();
    expect(text).toMatch(/Conservation check/i);
    expect(text).toMatch(/Angular momentum/);
    // Never the bare word on its own, which could be linear momentum.
    expect(text).not.toMatch(/(^|\n)\s*Momentum\b/);
    expect(text).toMatch(/Integrator/i);
    // And when the reference was taken.
    expect(text).toMatch(/Reference taken at/i);
  });

  test('the explanation opens from the keyboard, not only on hover', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scenario(page, 'Solar System', {
      show_conservation_diagnostics: true,
    });
    const summary = help(page).locator('summary');
    await expect(summary).toHaveCount(1);

    const details = help(page);
    expect(await details.evaluate(d => d.open)).toBe(false);

    await summary.focus();
    expect(await summary.evaluate(el => document.activeElement === el)).toBe(
      true
    );
    await page.keyboard.press('Enter');
    expect(await details.evaluate(d => d.open)).toBe(true);

    // Wait for the prose to be laid out: innerText on a <details> opened in
    // the same tick reports only the summary.
    await expect(details.locator('p').first()).toBeVisible();
    const explanation = await details.innerText();
    expect(explanation).toMatch(/since the reference measurement/i);
    expect(explanation).toMatch(/numerical error/i);
    // The three things a student can do about it.
    expect(explanation).toMatch(/smaller integration step/i);
    expect(explanation).toMatch(/same simulated interval/i);
    expect(explanation).toMatch(/playback speed/i);
  });

  test('a touch tap opens it too', async ({ page, app }) => {
    await app.boot();
    await scenario(page, 'Solar System', {
      show_conservation_diagnostics: true,
    });
    const details = help(page);
    await help(page).locator('summary').click();
    expect(await details.evaluate(d => d.open)).toBe(true);
  });
});

test.describe('what the scene does to its own conservation', () => {
  test('a closed system says so', async ({ page, app }) => {
    await app.boot();
    await scenario(page, 'Kepler’s 2nd Law', {
      show_conservation_diagnostics: true,
      mutual_gravity: true,
      enable_star_merging: false,
    });
    // Either the closed-system line or a list of reasons, never neither: a
    // drift figure with nothing said about the scene is the thing this whole
    // change exists to stop.
    const caveats = await block(page).locator('.readout-caveats li').count();
    const closed = await block(page).locator('.readout-caveat').count();
    expect(caveats + closed).toBeGreaterThan(0);
  });

  test('a scene with a static hole names it rather than blaming the method', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scenario(page, 'Black Hole Lab', {
      show_conservation_diagnostics: true,
    });
    const caveats = block(page).locator('.readout-caveats li');
    const count = await caveats.count();
    expect(count).toBeGreaterThan(0);
    // Every reason, not just the first: a scene can be open in three ways at
    // once and naming one invites the reader to blame the integrator for the
    // other two.
    const all = await caveats.allInnerTexts();
    expect(all.join(' ').length).toBeGreaterThan(20);
  });
});

test.describe('a baseline a percentage cannot be taken against', () => {
  test('an empty world shows the change, not an enormous percentage', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scenario(page, 'Empty', { show_conservation_diagnostics: true });
    // The scenario may not exist under that name; fall back to clearing it.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      for (const list of [
        physics.planets,
        physics.stars,
        physics.bh_list,
        physics.asteroids,
        physics.comets,
        physics.gas_giants,
      ]) {
        list.length = 0;
      }
      physics.resetConservationBaseline();
      ui.SETTINGS.show_conservation_diagnostics = true;
    });
    await page.waitForTimeout(900);

    const text = await block(page).innerText();
    // No absurd figure...
    expect(text).not.toMatch(/[0-9]{4,}%/);
    // ...and an explanation of why there is no percentage.
    expect(text).toMatch(/close to zero|misleading/i);
    expect(text).toMatch(/change/i);
  });
});

test.describe('deliberate choices are respected', () => {
  test('a lesson scenario that wants the readout still gets it', async ({
    page,
    app,
  }) => {
    await app.boot();
    for (const name of [
      'Three-Body Sensitivity Lab',
      'Lagrange Point Lab',
      'Orbital Transfer Lab',
    ]) {
      // Start from the new default, explicitly off, and let the scenario have
      // its say: applyPreset re-stamps its own settings during the rebuild.
      await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        ui.SETTINGS.show_conservation_diagnostics = false;
      });
      await scenario(page, name);
      await expect(block(page)).toHaveCount(1);
    }
  });

  test('a share link that carries the setting keeps it', async ({
    page,
    app,
  }) => {
    await app.boot();
    const shown = await page.evaluate(async () => {
      const share = await import('/js/shareState.js');
      const { DEFAULT_SETTINGS } = await import('/js/appState.js');
      const ui = await import('/js/ui.js');
      // A configuration where somebody turned it on deliberately.
      const payload = share.buildPayload({
        scenario: 'Solar System',
        seed: 1234,
        settings: { ...DEFAULT_SETTINGS, show_conservation_diagnostics: true },
        DEFAULT_SETTINGS,
        paused: true,
      });
      const round = await share.decodePayload(
        await share.encodePayload(payload)
      );
      // The delta carries it, because it differs from the new default.
      return {
        inPayload: round.d?.show_conservation_diagnostics,
        settingBefore: ui.SETTINGS.show_conservation_diagnostics,
      };
    });
    expect(shown.inPayload).toBe(true);
  });

  test('turning it off is still a delta against the new default', async ({
    page,
    app,
  }) => {
    await app.boot();
    const d = await page.evaluate(async () => {
      const share = await import('/js/shareState.js');
      const { DEFAULT_SETTINGS } = await import('/js/appState.js');
      const payload = share.buildPayload({
        scenario: 'Solar System',
        seed: 1234,
        settings: { ...DEFAULT_SETTINGS, show_conservation_diagnostics: false },
        DEFAULT_SETTINGS,
        paused: true,
      });
      return payload.d?.show_conservation_diagnostics;
    });
    // Equal to the default, so nothing to carry: the link stays short and the
    // reader gets the default, which is what they chose.
    expect(d).toBeUndefined();
  });
});

test.describe('in Spanish', () => {
  test('the group, the labels and the explanation all translate', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });
    await scenario(page, 'Solar System', {
      show_conservation_diagnostics: true,
    });
    const text = await block(page).innerText();
    expect(text).toMatch(/Comprobación de conservación/i);
    expect(text).toMatch(/momento angular/i);
    expect(text).toMatch(/Referencia tomada/i);

    await help(page).locator('summary').click();
    const explanation = await help(page).innerText();
    expect(explanation).toMatch(/medición de referencia/i);
    expect(explanation).toMatch(/paso de integración/i);
  });
});
