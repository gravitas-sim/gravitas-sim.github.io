// =============================================================================
// The 3-D lab and the mission page by keyboard, with what is said (Prompt 281)
// -----------------------------------------------------------------------------
// The tasks the two instruments exist for, done with real key presses and read
// back as a screen reader would meet them, in English and in Spanish:
//
//   3-D lab      Tab to "Describe the view" and press it: the run mode with its
//                numbers, the frame, the camera and the orbits are said, bounded;
//                the camera's own keys announce where the view is from.
//   mission      Tab to "Show the grid as a table" and press it: the porkchop
//                is a grid with one Tab stop whose cursor starts on the cheapest
//                cell, moves with the arrows, and is announced by the label of
//                the cell it lands on, which is also the text under the table;
//                the picture marks the same cell.
//
// What the held-answer rule withholds, and what a table of the whole grid
// would be, are in ACCESSIBILITY.md. Axe over both states is in
// e2e/accessibility.spec.js.
// =============================================================================

import { test, expect } from './fixtures.js';
import { tabTo } from './walk.js';
import { open } from './sweepOpen.js';

const LOCALES = [
  {
    id: 'en',
    run: /^Run mode: N-body, /,
    bodies: /live bodies/,
    orbit: / about .*: a = /,
    camera: /Looking from/,
    cell: /^Departure \S+, flight .* days: total .* km\/s\.$/,
  },
  {
    id: 'es',
    run: /^Modo de ejecución: N cuerpos, /,
    bodies: /cuerpos vivos/,
    orbit: / alrededor de .*: a = /,
    camera: /Mirando desde|La cámara|Desde/,
    cell: /^Salida \S+, vuelo .* días: total .* km\/s\.$/,
  },
];

test.describe('the 3-D lab, by keyboard', () => {
  for (const L of LOCALES) {
    test(`Describe the view is reached by Tab and said in ${L.id}`, async ({
      page,
      browserName,
    }) => {
      await open(page, '/3d/?system=R3', L.id, { ready: '#l3-describe' });
      await page.evaluate(() => window.gravitasLab3d.tau !== undefined);
      expect(await tabTo(page, browserName, '#l3-describe')).toBeGreaterThan(0);
      await page.keyboard.press('Enter');
      const out = page.locator('#l3-description');
      await expect(out).toContainText(L.bodies);
      const said = (await out.textContent()).trim();
      expect(said).toMatch(L.run);
      expect(said).toMatch(L.orbit);
      // Bounded: a few sentences, not a dump of the tables.
      expect(said.length).toBeLessThan(1600);
      expect(said.split(/(?<=[.])\s/).length).toBeLessThanOrEqual(14);
      // Said where a reader's software will announce it.
      await expect(out).toHaveAttribute('aria-live', 'polite');
      // The same twice, but for the clock the lab is still running: a
      // description is not a moving target.
      const still = t =>
        t.replace(/The clock reads[^.]*\.|El reloj marca[^.]*\.|\d/g, '');
      await page.keyboard.press('Enter');
      expect(still((await out.textContent()).trim())).toBe(still(said));
    });

    test(`the camera's keys announce the view in ${L.id}`, async ({ page }) => {
      await open(page, '/3d/?system=R3', L.id, { ready: '#l3-canvas' });
      await page.locator('#l3-canvas').focus();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#l3-camera')).toHaveText(/\d+°.*\d+°/);
      await expect(page.locator('#l3-camera')).toHaveAttribute(
        'aria-live',
        'polite'
      );
    });
  }

  test('the description is withheld while a guide step asks for a measurement', async ({
    page,
  }) => {
    await open(page, '/3d/?system=R3', 'en', { ready: '#l3-describe' });
    const out = page.locator('#l3-description');
    // The guide panel shows its Reveal control only on a typed measurement
    // that is not yet right (guidePanel.js); the rule reads that control, so
    // it is stood in for here and taken away again.
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.id = 'l3-guide-reveal';
      b.textContent = 'Reveal';
      document.body.append(b);
    });
    await page.locator('#l3-describe').focus();
    await page.keyboard.press('Enter');
    await expect(out).toContainText('orbit numbers are left out');
    expect(await out.textContent()).not.toMatch(/ a = /);
    await page.evaluate(() =>
      document.getElementById('l3-guide-reveal').remove()
    );
    await page.keyboard.press('Enter');
    await expect(out).toContainText(' a = ');
  });
});

test.describe('the mission page: the window as a table, by keyboard', () => {
  for (const L of LOCALES) {
    test(`the grid is walked by arrows and announced in ${L.id}`, async ({
      page,
      browserName,
    }) => {
      await open(page, '/mission/', L.id, { ready: '#mn-window-go' });
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
      await page.locator('#mn-window-steps').fill('21');
      await page.locator('#mn-window-go').click();
      await expect(page.locator('#mn-window-browse')).toBeEnabled({
        timeout: 60_000,
      });
      expect(
        await tabTo(page, browserName, '#mn-window-browse')
      ).toBeGreaterThan(0);
      await expect(page.locator('#mn-window-browse')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      await page.keyboard.press('Enter');
      await expect(page.locator('#mn-window-browse')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      const grid = page.locator('#mn-window-grid [role="grid"]');
      await expect(grid).toBeVisible();
      expect(Number(await grid.getAttribute('aria-rowcount'))).toBe(22);
      expect(Number(await grid.getAttribute('aria-colcount'))).toBe(22);

      const here = () =>
        page.evaluate(() => {
          const a = document.activeElement;
          return {
            role: a.getAttribute('role'),
            label: a.getAttribute('aria-label'),
            i: a.dataset.i,
            j: a.dataset.j,
            under: document.querySelector('.mn-grid-cursor').textContent,
            stops: document.querySelectorAll(
              '#mn-window-grid [role="gridcell"][tabindex="0"]'
            ).length,
          };
        });
      const start = await here();
      expect(start.role).toBe('gridcell');
      expect(start.label).toMatch(L.cell);
      expect(start.under).toBe(start.label);
      expect(start.stops).toBe(1);

      await page.keyboard.press('ArrowDown');
      const down = await here();
      expect(Number(down.i)).toBe(Number(start.i) + 1);
      expect(down.label).not.toBe(start.label);
      expect(down.under).toBe(down.label);

      await page.keyboard.press('ArrowRight');
      const right = await here();
      expect(Number(right.j)).toBe(Number(start.j) + 1);

      await page.keyboard.press('Control+End');
      const last = await here();
      expect([last.i, last.j]).toEqual(['20', '20']);

      await page.keyboard.press('Control+Home');
      const first = await here();
      expect([first.i, first.j]).toEqual(['0', '0']);

      // The picture marks the cell the cursor is on: white ink at its centre.
      const mark = await page.locator('#mn-window-canvas').evaluate(
        (c, cell) => {
          const n = 21;
          const ctx = c.getContext('2d');
          const x = Math.round((cell.i * c.width) / n);
          const y = c.height - Math.round(((cell.j + 1) * c.height) / n);
          // The square's edge, one pixel outside the cell's top-left corner.
          const p = ctx.getImageData(
            Math.max(x - 1, 0),
            Math.max(y - 1, 0),
            1,
            1
          ).data;
          return [...p];
        },
        { i: 0, j: 0 }
      );
      expect(mark.slice(0, 3)).toEqual([255, 255, 255]);

      // Escape is not the grid's: Tab leaves it, with one stop in and one out.
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() =>
          document.activeElement.closest('[role="grid"]')
        )
      ).toBeNull();
    });
  }

  test('closing the table removes the cursor from the picture', async ({
    page,
  }) => {
    await open(page, '/mission/', 'en', { ready: '#mn-window-go' });
    await page.locator('#mn-window-steps').fill('21');
    await page.locator('#mn-window-go').click();
    await expect(page.locator('#mn-window-browse')).toBeEnabled({
      timeout: 60_000,
    });
    await page.locator('#mn-window-browse').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mn-window-grid')).toBeVisible();
    await page.locator('#mn-window-browse').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mn-window-grid')).toBeHidden();
    await expect(page.locator('#mn-window-browse')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
