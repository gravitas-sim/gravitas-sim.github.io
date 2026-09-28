// =============================================================================
// The Orbital System Builder, in the page
// -----------------------------------------------------------------------------
// tests/systemSpec.test.js holds the arithmetic to the analytic orbit, to its
// own inverse and to the real engine. This holds the panel to what the prompt
// asked of it: a system built from elements behaves like any other Gravitas
// world. It is built from the rail, counted by the readout, rebuilt by Refresh
// Scenario, carried by a share link into another tab, and saved to a file and
// opened again - and the form explains a bad value on the field it is about,
// refuses a system the engine cannot integrate, reads in Spanish, passes axe
// and fits a phone.
//
// It runs against the sources and against dist/, and is DOM-only for that
// reason: the readout counts the bodies, the table carries the periods, and a
// download is read from disk. Two tests stay on the sources, because no DOM
// surface holds what they compare: the exact initial state against the
// module's own arithmetic, and the experiment bench's state hash across a
// restore.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * What the readout says the world holds, by kind. Read on the frame after one
 * that began a quarter of a second into the call, because the readout is
 * written by the render loop rather than by the action (the same wait
 * e2e/accessibilityParity.spec.js explains).
 */
async function census(page) {
  const counts = await page.evaluate(
    () =>
      new Promise(resolve => {
        const from = performance.now();
        const read = () => {
          const host = document.getElementById('overlayStats');
          const rows = [...(host?.querySelectorAll('.readout-count') ?? [])];
          if (!rows.length && !host?.querySelector('.readout-empty')) {
            return null;
          }
          return Object.fromEntries(
            rows.map(li => [
              li.querySelector('span').textContent.trim(),
              Number(li.querySelector('b').textContent),
            ])
          );
        };
        const wait = now =>
          now - from >= 250
            ? window.requestAnimationFrame(() => resolve(read()))
            : window.requestAnimationFrame(wait);
        window.requestAnimationFrame(wait);
      })
  );
  if (!counts) throw new Error('the readout is not showing the body counts');
  return counts;
}

const KEPLER16 = { Stars: 2, 'Gas Giants': 1 };

async function openBuilder(page, app, { locale } = {}) {
  if (locale) {
    await page.addInitScript(l => {
      try {
        window.localStorage.setItem('gravitas_locale', l);
      } catch {
        /* storage unavailable */
      }
    }, locale);
  }
  await app.boot();
  // At phone and tablet widths the rail is a menu (e2e/uiCoherence.spec.js).
  if (await page.evaluate(() => window.innerWidth <= 1024)) {
    const open = await page
      .locator('#mainControls')
      .evaluate(el => el.classList.contains('is-open'));
    if (!open) await page.locator('#mobileMenuToggle').click();
  }
  await app.railControl('systemBuilderBtn');
  await page.locator('#systemBuilderBtn').click();
  await expect(page.locator('#systemBuilderDialog')).toBeVisible();
}

async function useTemplate(page, id) {
  await page.locator('#systemBuilderTemplate').selectOption(id);
  await page.locator('#systemBuilderTemplateApply').click();
  await expect(page.locator('#systemBuilderTableBody tr')).not.toHaveCount(0);
}

/** The field of body `n` (1-based) that edits `field`. */
const field = (page, n, name) =>
  page
    .locator('#systemBuilderBodies .builder-body')
    .nth(n - 1)
    .locator(`[data-field="${name}"]`);

async function build(page) {
  await page.locator('#systemBuilderBuild').click();
  await expect(page.locator('#systemBuilderDialog')).toBeHidden();
}

test.describe('the Orbital System Builder', () => {
  test('opens in the window and builds Kepler-16 with its published periods', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    const box = await page.locator('#systemBuilderDialog').boundingBox();
    const view = page.viewportSize();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
    await expect(page.locator('#systemBuilderTemplate')).toBeFocused();

    await useTemplate(page, 'kepler16');
    const rows = page.locator('#systemBuilderTableBody tr');
    await expect(rows).toHaveCount(2);
    // Doyle et al. (2011): 41.08 days for the binary, 228.8 for the planet.
    await expect(rows.nth(0)).toContainText('41.1 days');
    await expect(rows.nth(1)).toContainText('229 days');
    await expect(page.locator('#systemBuilderChecks')).toHaveText(
      'Nothing stands out in this system.'
    );
    await expect(page.locator('#systemBuilderPreview circle')).toHaveCount(3);

    await build(page);
    expect(await census(page)).toEqual(KEPLER16);
    await expect(page.locator('#systemBuilderBtn')).toBeFocused();
  });

  test('Refresh Scenario builds the system again', async ({ page, app }) => {
    await openBuilder(page, app);
    await useTemplate(page, 'kepler16');
    await build(page);
    // Let it run first, so Refresh has something to put back. The timeline's
    // clock is the DOM's record that the world moved.
    const clock = page.locator('#timelineTime');
    const start = await clock.textContent();
    await expect.poll(() => clock.textContent()).not.toBe(start);
    await app.railControl('refreshScenarioBtn');
    await page.locator('#refreshScenarioBtn').click();
    expect(await census(page)).toEqual(KEPLER16);
  });

  test('a bad value is explained on the field it is about', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await useTemplate(page, 'starPlanet');
    const e = field(page, 2, 'e');
    await e.fill('1');
    await page.locator('#systemBuilderBuild').click();

    await expect(e).toBeFocused();
    await expect(e).toHaveAttribute('aria-invalid', 'true');
    const errorId = `${await e.getAttribute('id')}-error`;
    await expect(e).toHaveAttribute('aria-describedby', new RegExp(errorId));
    await expect(page.locator(`#${errorId}`)).toContainText('unbound orbit');
    await expect(page.locator('#systemBuilderDialog')).toBeVisible();

    await e.fill('0.2');
    await build(page);
  });

  test('a black hole among stars is refused, and says why', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await useTemplate(page, 'starPlanet');
    // Without the particles and debris the default world sheds as it runs:
    // the question is only whether anything was built.
    const bodies = async () => {
      const c = await census(page);
      delete c.Particles;
      delete c.Debris;
      return c;
    };
    const before = await bodies();
    await field(page, 1, 'type').selectOption('BlackHole');
    await page.locator('#systemBuilderBuild').click();
    await expect(page.locator('#systemBuilderChecks li')).toContainText([
      /pulled only by other black holes/,
    ]);
    await expect(page.locator('#systemBuilderDialog')).toBeVisible();
    expect(await bodies()).toEqual(before);
  });

  test('saved to a file, and opened again from it', async ({ page, app }) => {
    await openBuilder(page, app);
    await useTemplate(page, 'alphaCen');
    const table = await page.locator('#systemBuilderTableBody').innerText();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#systemBuilderSave').click(),
    ]);
    const path = await download.path();
    const data = JSON.parse(readFileSync(path, 'utf8'));
    expect(data.format).toBe('gravitas.orbital-system');
    expect(data.version).toBe(1);
    expect(data.bodies.map(b => b.name)).toEqual([
      'Alpha Centauri A',
      'A planet of A',
      'Alpha Centauri B',
    ]);
    expect(data.initial.bodies).toHaveLength(3);

    await useTemplate(page, 'starPlanet');
    await page.locator('#systemBuilderFile').setInputFiles(path);
    await expect(page.locator('#systemBuilderStatus')).toHaveText(
      'Opened a system of 3 bodies.'
    );
    await expect
      .poll(() => page.locator('#systemBuilderTableBody').innerText())
      .toBe(table);
  });

  test('a file from a newer version is refused, not guessed at', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await page.locator('#systemBuilderFile').setInputFiles({
      name: 'future.gravitas-system.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          format: 'gravitas.orbital-system',
          version: 9,
          bodies: [],
        })
      ),
    });
    await expect(page.locator('#systemBuilderStatus')).toContainText(
      'newer version of Gravitas'
    );
  });

  test('a share link carries the built system into another tab', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await useTemplate(page, 'kepler16');
    await build(page);

    await app.railControl('shareBtn');
    await page.locator('#shareBtn').click();
    await expect(page.locator('#shareModal')).toBeVisible();
    // A built world is a hand-made one, so the link carries every body.
    await expect(page.locator('#shareKindFull')).toBeChecked();
    const url = await page.locator('#shareUrl').inputValue();
    expect(url).toContain('#');

    const other = await page.context().newPage();
    await other.goto(url);
    await expect
      .poll(() => census(other), { timeout: 30_000 })
      .toEqual(KEPLER16);
    await other.close();
  });

  test('in Spanish', async ({ page, app }) => {
    await openBuilder(page, app, { locale: 'es' });
    await expect(page.locator('#systemBuilderTitle')).toHaveText(
      'Constructor de sistemas orbitales'
    );
    await useTemplate(page, 'kepler16');
    await expect(
      page.locator('#systemBuilderTableBody tr').nth(0)
    ).toContainText('41.1 días');
    await expect(page.locator('#systemBuilderBuild')).toHaveText(
      'Construir este sistema'
    );
    await expect(field(page, 2, 'a')).toHaveAccessibleName(
      'Semieje mayor (UA)'
    );
  });

  test('has no accessibility violations, and closes back to its button', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await useTemplate(page, 'sunEarthMoon');
    const scan = await new AxeBuilder({ page })
      .withTags(TAGS)
      .include('#systemBuilderDialog')
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('#systemBuilderDialog')).toBeHidden();
    await expect(page.locator('#systemBuilderBtn')).toBeFocused();
  });

  test('fits a phone', async ({ page, app }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openBuilder(page, app);
    await useTemplate(page, 'giants');
    const box = await page.locator('#systemBuilderDialog').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    const overflow = await page.evaluate(() => {
      const panel = document.getElementById('systemBuilderDialog');
      return panel.scrollWidth - panel.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('the world starts exactly where the arithmetic put it', async ({
    page,
    app,
  }) => {
    test.skip(DIST, 'compares module state; no DOM surface holds it');
    await openBuilder(page, app);
    await useTemplate(page, 'sunEarthMoon');
    // Built and read in one turn, before a frame can move anything.
    const { residual, count } = await page.evaluate(async () => {
      const S = await import('/js/systemSpec.js');
      const P = await import('/js/physics.js');
      const { SETTINGS } = await import('/js/appState.js');
      // The same three bodies, through the module rather than the form.
      const verdict = S.validateSystem({
        bodies: [
          { name: 'Sun', type: 'Star', mass: 1 },
          {
            name: 'Earth',
            type: 'Planet',
            mass: 1,
            radius: 0.02,
            primary: 0,
            a: 1,
            e: 0.0167,
            omega: 102.9,
          },
          {
            name: 'Moon',
            type: 'Planet',
            mass: 0.0123,
            radius: 0.006,
            primary: 1,
            a: 0.00257,
            e: 0.0549,
          },
        ],
      });
      const built = S.buildSystem(verdict.bodies, {
        G: SETTINGS.gravitational_constant,
      });
      document.getElementById('systemBuilderBuild').click();
      const live = [...P.stars, ...P.planets];
      let worst = 0;
      for (const b of built.bodies) {
        const body = live.find(o => o.name === b.name);
        worst = Math.max(
          worst,
          Math.abs(body.pos.x - b.pos.x),
          Math.abs(body.pos.y - b.pos.y),
          Math.abs(body.vel.x - b.vel.x),
          Math.abs(body.vel.y - b.vel.y)
        );
      }
      return { residual: worst, count: live.length };
    });
    expect(count).toBe(3);
    expect(residual).toBe(0);
  });

  test('the experiment bench restores a built system to the same state', async ({
    page,
    app,
  }) => {
    test.skip(DIST, 'hashes module state; no DOM surface holds it');
    await openBuilder(page, app);
    await useTemplate(page, 'triple');
    await build(page);
    await app.setPaused(true);
    const hashes = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const { hashState } = await import('/js/experiments/canonicalState.js');
      const capture = () =>
        ui.captureShareState({
          kind: 'full',
          includeCamera: false,
          forExperiment: true,
        });
      const first = capture();
      ui.applyShareState(JSON.parse(JSON.stringify(first)));
      ui.state.paused = true;
      return [hashState(first), hashState(capture())];
    });
    expect(hashes[1]).toBe(hashes[0]);
  });
});
