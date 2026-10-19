// =============================================================================
// The interaction contract, walked (Prompt 155)
// -----------------------------------------------------------------------------
// INTERACTION.md and tools/interaction-contract.json name, for each registered
// surface, a keyboard walk, a single-pointer walk of each drag and an
// announcement test, and tests/interactionContract.test.js fails a name that is
// not in its file. The keyboard walks and most announcement tests already
// existed in the surface's own spec; this file holds the ones that did not:
// the single-pointer walks, the plot cursor's announcement, and the reduced
// motion override, in a browser.
// =============================================================================

import { test, expect } from './fixtures.js';

/** An empty, paused sandbox, so anything counted afterwards is this test's. */
const emptySky = app => app.emptyWorld('interaction', { run: false });

/** Arm a type through the rail's own picker, as a reader does. */
async function armType(page, type) {
  const trigger = page.locator('#objectTypeBtn');
  try {
    await trigger.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    await page.locator('#mobileMenuToggle').click();
    await trigger.waitFor({ state: 'visible', timeout: 5000 });
  }
  await trigger.click();
  await page.locator(`#objectTypePicker [data-object-type="${type}"]`).click();
}

/** The newest planet: where it is and how fast it was thrown. */
const newestPlanet = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const b = p.planets[p.planets.length - 1];
    return b && { x: b.pos.x, y: b.pos.y, vx: b.vel.x, vy: b.vel.y };
  });

test.describe('sandbox.placement: a throw can be typed', () => {
  test('a typed launch is the recorded drag', async ({ page, app }) => {
    await app.boot();
    await emptySky(app);
    await armType(page, 'Planet');

    // The drag, recorded: press, move, release on the canvas.
    const box = await page.locator('#simulationCanvas').boundingBox();
    const from = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 60, from.y + 20, { steps: 6 });
    await page.mouse.up();
    const dragged = await newestPlanet(page);
    expect(dragged).not.toBeNull();
    expect(Math.hypot(dragged.vx, dragged.vy)).toBeGreaterThan(0);

    // The same launch from the form: an empty world again, and the numbers the
    // drag produced typed into the fields, at full precision.
    await emptySky(app);
    await page.locator('#precisePlaceBtn').click();
    await expect(page.locator('#precisePlaceDialog')).toBeVisible();
    await page.locator('#precisePlaceType').selectOption('Planet');
    for (const [id, value] of [
      ['x', dragged.x],
      ['y', dragged.y],
      ['vx', dragged.vx],
      ['vy', dragged.vy],
    ])
      await page.locator(`#precisePlace-${id}`).fill(String(value));
    await page.locator('#precisePlaceSubmit').click();

    const typed = await newestPlanet(page);
    expect(typed).not.toBeNull();
    // The drag's position and velocity, to the digit: the same placeBody().
    for (const k of ['x', 'y', 'vx', 'vy'])
      expect(typed[k], k).toBeCloseTo(dragged[k], 9);
  });
});

test.describe('plot.cursor', () => {
  /** A page of the site with a chart on it and nothing that moves. */
  async function mount(page) {
    await page.goto('/library/');
    await page.evaluate(async () => {
      const { createChart } = await import('/js/plot/chart.js');
      document.body.insertAdjacentHTML(
        'afterbegin',
        '<section id="plotSpec" aria-label="Chart"><div id="host" style="width:600px"></div></section>'
      );
      const chart = createChart(document.getElementById('host'), {
        height: 240,
        number: v => String(Math.round(v * 1000) / 1000),
        tooltip: { mode: 'index' },
        labels: { role: 'plot', legend: 'Series', toggled: l => l },
      });
      const x = Array.from({ length: 60 }, (_, i) => i / 2);
      chart.draw({
        label: 'Energy over time',
        xTitle: 'Time (s)',
        yTitle: 'Energy (J)',
        series: [
          {
            id: 'ke',
            label: 'Kinetic',
            x,
            y: x.map(v => 2 + Math.sin(v)),
            color: '#00a86b',
          },
          {
            id: 'pe',
            label: 'Potential',
            x,
            y: x.map(v => -2 - Math.sin(v)),
            color: '#c0630a',
          },
        ],
      });
    });
  }

  test('a plot readout needs no drag', async ({ page }) => {
    await mount(page);
    const svg = page.locator('#host svg[aria-roledescription=plot]');
    const box = await svg.boundingBox();
    // The pointer arrives and stays: no button is pressed and nothing is dragged.
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    const tip = page.locator('#host div[aria-hidden=true]').first();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Kinetic');
    await page.mouse.move(2, 2);
    await expect(tip).toBeHidden();
  });

  test('the plot cursor announces where it is', async ({ page }) => {
    await mount(page);
    const svg = page.locator('#host svg[aria-roledescription=plot]');
    const status = page.locator('#host [role=status]');
    // A polite live region, so a reader hears each stop without losing their place.
    expect(await status.getAttribute('aria-live')).not.toBe('assertive');
    await svg.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(status).toContainText('Kinetic');
    const first = await status.textContent();
    await page.keyboard.press('ArrowLeft');
    const second = await status.textContent();
    expect(second).not.toBe(first);
    // Where it is: the series, and a number from it.
    expect(second).toMatch(/Kinetic[\s\S]*\d/);
    await page.keyboard.press('ArrowDown');
    await expect(status).toContainText('Potential');
  });
});

test.describe('observatory.selection', () => {
  test('rows are chosen by clicking, without a drag', async ({ page }) => {
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFixture').selectOption('tess-light-curve');
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
    const rows = page.locator('#obsTable tbody tr');
    await expect(rows.first()).toBeVisible();

    await rows.nth(2).scrollIntoViewIfNeeded();
    await rows.nth(2).click();
    await expect(page.locator('#obsSelected')).toHaveText('1 selected');
    // A different row replaces the choice: a click is a choice, not a path.
    await rows.nth(4).click();
    await expect(page.locator('#obsSelected')).toHaveText('1 selected');
    await expect(rows.nth(4)).toHaveAttribute('aria-selected', 'true');
    // A run, from one press on its end with the key held, as a mouse reader has it.
    await rows.nth(7).click({ modifiers: ['Shift'] });
    await expect(page.locator('#obsSelected')).toHaveText('4 selected');
  });
});

test.describe('lab3d.camera', () => {
  test('a preset view is chosen without orbiting', async ({ page }) => {
    await page.goto('/3d/?system=R1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const webgl = await page.evaluate(() => {
      try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
      } catch {
        return false;
      }
    });
    // A browser with no WebGL cannot draw; the lab then keeps its tables, and
    // lab3dView.spec.js asserts that. There is no camera to move here.
    if (!webgl) return;
    await page.locator('#l3-preset').selectOption('top');
    const camera = await page.evaluate(() => window.gravitasLab3d.camera());
    const d = camera.eye.map((q, k) => q - camera.target[k]);
    // Looking straight down the z axis: the view a drag would have to find.
    expect(d[2] / Math.hypot(...d)).toBeCloseTo(1, 6);
  });
});

test.describe("reduced motion, with the reader's own override", () => {
  /** The duration of a button's transition, in seconds. */
  const buttonTransition = page =>
    page.evaluate(() => {
      const b = document.querySelector('.ui-button');
      const first = getComputedStyle(b).transitionDuration.split(',')[0];
      return first.endsWith('ms')
        ? parseFloat(first) / 1000
        : parseFloat(first);
    });

  test('Reduced collapses the transitions on a device that did not ask', async ({
    page,
    app,
  }) => {
    await app.boot();
    const before = await buttonTransition(page);
    expect(before).toBeGreaterThan(0.01);
    await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      q.setMotionPreference('reduce');
    });
    expect(await buttonTransition(page)).toBeLessThan(0.002);
    await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      q.setMotionPreference('system');
    });
    expect(await buttonTransition(page)).toBeGreaterThan(0.01);
  });

  test('the Settings panel offers Motion, applies it at once and remembers it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#settingsBtn').click();
    const select = page.locator('#settingsMotion');
    await expect(select).toBeVisible();
    await expect(page.locator('label[for=settingsMotion]')).toHaveText(
      'Motion'
    );
    await select.selectOption('reduce');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    expect(await app.storage('gravitas_motion')).toBe('reduce');
    expect(await page.locator('#srStatus').textContent()).toMatch(/reduced/i);
    await select.selectOption('system');
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.*/);
    expect(await app.storage('gravitas_motion')).toBeNull();
  });

  test('the Motion setting reads in Spanish', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es', { persist: false });
    });
    await page.locator('#settingsBtn').click();
    await expect(page.locator('label[for=settingsMotion]')).toHaveText(
      'Movimiento'
    );
    await expect(page.locator('#settingsMotion option[value=step]')).toHaveText(
      'Paso a paso'
    );
  });

  test('Step by step builds the world and does not start it', async ({
    page,
    app,
  }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('gravitas_motion', 'step');
      } catch {
        /* storage unavailable */
      }
    });
    await app.boot();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'step');
    await expect(page.locator('#overlayStatus')).toHaveAttribute(
      'data-state',
      'paused'
    );
    // Nothing moves by itself: the clock holds across a second of frames.
    const clock = () =>
      page.evaluate(
        async () => (await import('/js/physics.js')).simulationTime
      );
    const t0 = await clock();
    await page.waitForTimeout(1000);
    expect(await clock()).toBe(t0);
    // Play is the reader's act, and it runs.
    await page.locator('#timelinePlay').click();
    await expect(page.locator('#overlayStatus')).toHaveAttribute(
      'data-state',
      'running'
    );
  });

  test('a share link does not carry the preference', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      q.setMotionPreference('step');
    });
    const link = await app.captureLink();
    expect(JSON.stringify(link)).not.toMatch(/motion/i);
  });
});
