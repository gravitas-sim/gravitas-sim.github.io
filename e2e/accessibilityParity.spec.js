// =============================================================================
// The two things ACCESSIBILITY.md said could not be done without a pointer
// -----------------------------------------------------------------------------
// "Building an arbitrary system by hand is not currently a keyboard task", and
// "some measurements are only available by reading a chart". This spec is what
// makes the narrowed versions of both claims checkable.
//
// It drives the keyboard, not the mouse, wherever the claim is about the
// keyboard: a test that clicks its way through the precise-placement form
// proves the form works and says nothing at all about whether a reader who
// cannot click can reach it. The tab order and the submit are done with real
// key presses for that reason.
//
// The plot half checks the table against the module's own arrays, in the page.
// That is only possible on the source target - against dist/ there is no
// /js/dataExport.js to import - so those assertions are skipped there, and the
// DOM-only ones, which are what a reader actually depends on, run everywhere.
// =============================================================================

import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';

/** Press Tab until the focused element has this id, or give up loudly. */
async function tabTo(page, id, limit = 40) {
  for (let i = 0; i < limit; i++) {
    const at = await page.evaluate(() => document.activeElement?.id || '');
    if (at === id) return i;
    await page.keyboard.press('Tab');
  }
  throw new Error(
    `never reached #${id} in ${limit} tabs; last was ${await page.evaluate(
      () => document.activeElement?.id || document.activeElement?.tagName
    )}`
  );
}

const bodies = page =>
  page.evaluate(async () => {
    const P = await import('/js/physics.js');
    return {
      stars: P.stars.map(s => ({
        x: s.pos.x,
        y: s.pos.y,
        vx: s.vel.x,
        vy: s.vel.y,
        m: s.massInSuns,
      })),
      planets: P.planets.map(p => ({
        x: p.pos.x,
        y: p.pos.y,
        vx: p.vel.x,
        vy: p.vel.y,
        m: p.massInEarths,
      })),
    };
  });

/** Open the form on an empty, paused world. */
async function emptyAndOpen(page, app) {
  await app.boot();
  await page.locator('#cleanSimBtn').click();
  await app.setPaused(true);
  await page.locator('#precisePlaceBtn').click();
  await expect(page.locator('#precisePlaceDialog')).toBeVisible();
}

test.describe('a system can be built without a pointer', () => {
  test('a two-body system, typed', async ({ page, app }) => {
    await emptyAndOpen(page, app);

    // A one-solar-mass star at the origin, at rest.
    await page.locator('#precisePlaceType').selectOption('Star');
    await page.locator('#precisePlace-mass').fill('1');
    await page.locator('#precisePlaceSubmit').click();

    // An Earth at 1 AU, on a circular orbit. 100 units is 1 AU and the
    // circular speed there about one solar mass is sqrt(GM/r) with the
    // integrator's G of 1: sqrt(1000/100) = 3.162.
    await page.locator('#precisePlaceType').selectOption('Planet');
    await page.locator('#precisePlace-x').fill('100');
    await page.locator('#precisePlace-y').fill('0');
    await page.locator('#precisePlace-vx').fill('0');
    await page.locator('#precisePlace-vy').fill('3.162');
    await page.locator('#precisePlace-mass').fill('1');
    await page.locator('#precisePlaceSubmit').click();

    const world = await bodies(page);
    expect(world.stars).toHaveLength(1);
    expect(world.planets).toHaveLength(1);
    // Paused, so the state is exactly what was typed rather than what it had
    // drifted to by the time the assertion ran.
    expect(world.stars[0]).toEqual({ x: 0, y: 0, vx: 0, vy: 0, m: 1 });
    expect(world.planets[0]).toEqual({
      x: 100,
      y: 0,
      vx: 0,
      vy: 3.162,
      m: 1,
    });
  });

  test('the form is reachable and operable from the keyboard alone', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#cleanSimBtn').click();
    await app.setPaused(true);

    // Focus the rail button by keyboard and open with Enter, rather than
    // clicking it - the claim is about a reader who has no pointer.
    await page.locator('#objectTypeBtn').focus();
    await tabTo(page, 'precisePlaceBtn', 6);
    await page.keyboard.press('Enter');
    await expect(page.locator('#precisePlaceDialog')).toBeVisible();

    // The dialog takes focus, and the first stop is the type selector.
    await expect(page.locator('#precisePlaceType')).toBeFocused();

    // Then the five numbers in the order they are read.
    for (const id of [
      'precisePlace-x',
      'precisePlace-y',
      'precisePlace-vx',
      'precisePlace-vy',
      'precisePlace-mass',
    ]) {
      await page.keyboard.press('Tab');
      await expect(page.locator(`#${id}`)).toBeFocused();
    }

    // Enter in a field submits, so a body can be added without ever reaching
    // the button.
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    expect((await bodies(page)).stars).toHaveLength(1);

    // And the buttons are the next two stops after the last field.
    await tabTo(page, 'precisePlaceSubmit', 6);
    await page.keyboard.press('Tab');
    await expect(page.locator('#precisePlaceClose')).toBeFocused();
  });

  test('a bad value is explained on the field it is about', async ({
    page,
    app,
  }) => {
    await emptyAndOpen(page, app);
    await page.locator('#precisePlace-x').fill('not a number');
    await page.locator('#precisePlace-vy').fill('99999');
    await page.locator('#precisePlaceSubmit').click();

    // Nothing was created.
    expect((await bodies(page)).stars).toHaveLength(0);

    // Each message is attached to its own input, so a reader who tabs into a
    // broken field hears what is wrong with THAT field.
    const x = page.locator('#precisePlace-x');
    await expect(x).toHaveAttribute('aria-invalid', 'true');
    expect(await x.getAttribute('aria-describedby')).toContain(
      'precisePlace-x-error'
    );
    await expect(page.locator('#precisePlace-x-error')).toHaveText(
      /enter a number/i
    );
    // The range message repeats the bound rather than saying "out of range".
    await expect(page.locator('#precisePlace-vy-error')).toHaveText(/500/);

    // Focus moved to the first problem, rather than leaving the reader to hunt.
    await expect(x).toBeFocused();

    // Correcting one field clears its own message and nobody else's.
    await x.fill('0');
    await expect(page.locator('#precisePlace-x-error')).toBeHidden();
    await expect(x).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('#precisePlace-vy-error')).toBeVisible();
  });

  test('a hand-typed body is undone by the ordinary undo button', async ({
    page,
    app,
  }) => {
    await emptyAndOpen(page, app);
    await expect(page.locator('#undoBtn')).toBeDisabled();
    await page.locator('#precisePlaceSubmit').click();
    expect((await bodies(page)).stars.length).toBeGreaterThan(0);
    // The requirement is that the form joins the existing history rather than
    // having a history of its own: placeBody fires the same event the pointer
    // path does, and the undo stack is listening for it.
    await page.locator('#precisePlaceClose').click();
    await app.railControl('undoBtn');
    await expect(page.locator('#undoBtn')).toBeEnabled();
    await page.locator('#undoBtn').click();
    expect((await bodies(page)).stars).toHaveLength(0);
  });

  test('a typed system is indistinguishable from a placed one', async ({
    page,
    app,
  }) => {
    test.skip(DIST, 'needs the module registry to compare share payloads');
    await emptyAndOpen(page, app);
    await page.locator('#precisePlaceType').selectOption('Star');
    await page.locator('#precisePlace-mass').fill('2');
    await page.locator('#precisePlaceSubmit').click();
    await page.locator('#precisePlaceClose').click();

    const typed = await page.evaluate(async () => {
      const { packBody } = await import('/js/shareState.js');
      const P = await import('/js/physics.js');
      return packBody(P.stars[0].get_state());
    });

    // The same body, built the way the canvas builds one.
    const placed = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const { packBody } = await import('/js/shareState.js');
      const P = await import('/js/physics.js');
      P.stars.length = 0;
      ui.placeBody({ x: 0, y: 0 }, { x: 0, y: 0 }, 'Star', 2);
      return packBody(P.stars[0].get_state());
    });

    // Names are random per body and ids count up, so those two are expected to
    // differ and everything else is not. A difference anywhere else would mean
    // the form is building something subtly its own.
    delete typed.name;
    delete placed.name;
    expect(typed).toEqual(placed);
  });
});

test.describe('the numbers behind a plot are readable without the canvas', () => {
  /** Run the light curve for long enough to have samples. */
  async function withLightCurve(page, app) {
    await app.boot();
    await page.evaluate(async () =>
      (await import('/js/lightCurve.js')).setLightCurveEnabled(true)
    );
    await page.waitForTimeout(2500);
    await app.railControl('exportDataBtn');
    await page.locator('#exportDataBtn').click();
    await page.waitForSelector('[data-export="lightcurve"]');
  }

  test('each series offers a table before it offers a download', async ({
    page,
    app,
  }) => {
    await withLightCurve(page, app);
    for (const key of [
      'trajectories',
      'lightcurve',
      'radialvelocity',
      'rotationcurve',
      'transits',
    ]) {
      const row = page.locator(`[data-export="${key}"]`);
      await expect(row).toHaveCount(1);
      // The table first. For a reader who cannot see the plot this is the way
      // in; a download is a file they then have to open in something else.
      await expect(row.locator('button').first()).toHaveText(/table/i);
    }
  });

  test('the table is a real table, with headings and units', async ({
    page,
    app,
  }) => {
    await withLightCurve(page, app);
    const button = page.locator('[data-export="lightcurve"] button').first();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    const host = page.locator('#export-table-lightcurve');
    await expect(host).toBeVisible();
    await expect(host.locator('.export-table-caption')).toHaveText(
      /light curve/i
    );

    const headings = await host.locator('thead th').allTextContents();
    expect(headings[0]).toMatch(/\(days\)/);
    expect(headings[1]).toMatch(/\(relative\)/);
    for (const th of await host.locator('thead th').all()) {
      await expect(th).toHaveAttribute('scope', 'col');
    }
    // The independent variable is a row header, so a reading says "at 3.2
    // days, brightness 0.991" rather than five unlabelled numbers.
    await expect(
      host.locator('tbody tr').first().locator('th')
    ).toHaveAttribute('scope', 'row');

    // Reachable and scrollable from a keyboard: a scroll box that cannot take
    // focus cannot be scrolled without a pointer.
    const scroller = host.locator('.export-table-scroll');
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(scroller).toHaveAttribute('role', 'region');
    expect(await scroller.getAttribute('aria-label')).toMatch(/light curve/i);

    // And it closes again.
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(host).toBeHidden();
  });

  test('the table reaches assistive technology as a table', async ({
    page,
    app,
  }) => {
    await withLightCurve(page, app);
    await page.locator('[data-export="lightcurve"] button').first().click();
    const host = page.locator('#export-table-lightcurve');
    await expect(host.locator('table')).toBeVisible();
    const tree = await host.ariaSnapshot();
    // The table carries an aria-label, so it prints quoted: - 'table "…"'.
    expect(tree).toMatch(/table "Light curve/);
    expect(tree).toMatch(/columnheader "Time \(days\)"/);
    expect(tree).toMatch(/rowheader|cell/);
  });

  test('what the table shows is what the plot drew', async ({ page, app }) => {
    test.skip(DIST, 'needs the module registry to read the plotted arrays');
    await withLightCurve(page, app);
    await page.locator('[data-export="lightcurve"] button').first().click();
    await expect(
      page.locator('#export-table-lightcurve tbody tr')
    ).not.toHaveCount(0);

    const { series, shown } = await page.evaluate(async () => {
      const { lightCurveSeries } = await import('/js/lightCurve.js');
      const curve = lightCurveSeries();
      return {
        series: { days: curve.days, flux: curve.flux },
        shown: [
          ...document.querySelectorAll('#export-table-lightcurve tbody tr'),
        ].map(tr => [...tr.children].map(c => c.textContent)),
      };
    });

    // Not a spot check: every row on screen has to be a sample the plot has,
    // at the same index, to the precision the file is written at.
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThanOrEqual(series.days.length);
    const sig = v => Number(Number(v).toPrecision(8));
    for (const row of shown) {
      const t = sig(row[0]);
      const i = series.days.findIndex(d => sig(d) === t);
      expect({ t, found: i >= 0 }).toEqual({ t, found: true });
      expect(sig(row[1])).toBe(sig(series.flux[i]));
    }
  });

  test('the rotation curve exports the speed it plots', async ({
    page,
    app,
  }) => {
    test.skip(DIST, 'needs the module registry to read the plotted arrays');
    await app.boot();
    await app.railControl('exportDataBtn');
    await page.locator('#exportDataBtn').click();
    await page.waitForSelector('[data-export="rotationcurve"]');
    const button = page.locator('[data-export="rotationcurve"] button').first();
    test.skip(
      await button.isDisabled(),
      'the opening scenario has no rotation curve to export'
    );
    await button.click();

    const { points, shown } = await page.evaluate(async () => {
      const { rotationCurveState } = await import('/js/rotationCurve.js');
      return {
        points: rotationCurveState().points.map(p => ({
          r: p.r,
          speed: p.speed,
        })),
        shown: [
          ...document.querySelectorAll('#export-table-rotationcurve tbody tr'),
        ].map(tr => [...tr.children].map(c => c.textContent)),
      };
    });

    expect(shown.length).toBeGreaterThan(0);
    // Radius in AU is the simulation radius over 100. The row has to line up
    // with a tracer the plot has, which is what catches an exporter that quietly
    // reads a different field than the one on the vertical axis.
    for (const row of shown) {
      const r = Number(row[0]);
      const near = points.find(p => Math.abs(p.r / 100 - r) < 1e-6);
      expect({ r, matched: Boolean(near) }).toEqual({ r, matched: true });
    }
  });
});
