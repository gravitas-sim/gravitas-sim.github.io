// =============================================================================
// Linked views: one plotted point, one object, one form row
// -----------------------------------------------------------------------------
// A lesson step's plot is the shared plot component, and a point, its row in
// the table beside it, the object's chip and the object itself are one
// selection. These walks are what only a browser shows: that a click on a
// point lands on the object and on the form row, that the chip and the table
// reach the point, that the keyboard does all of it, that the table stays
// beside the plot, and that a step can ring an object in a way that does not
// rest on color.
// =============================================================================

import { test, expect, getInvestigation } from './workflow.js';
import {
  LABEL_FLOOR_CSS_PX,
  installCanvasTextRecorder,
  judgeLabels,
  readMainCanvasLabels,
} from '../tools/visual-criteria.mjs';

/** The widths the roadmap names: a phone, a tablet and a laptop. */
const WIDTHS = [375, 768, 1366];

const PLANETS = [
  ['Mercury', '0.387', '0.241'],
  ['Earth', '1.000', '1.000'],
  ['Jupiter', '5.203', '11.86'],
  ['Saturn', '9.537', '29.45'],
];

const dots = page => page.locator('#investigationPlotCanvas .ow-pt');
const chosen = page =>
  page.locator('#investigationPlotCanvas .ow-pt.is-selected');
const rows = page => page.locator('#investigationPlotTable tbody tr');
const chip = (page, name) =>
  page.locator('#investigationObjects .inv-object', { hasText: name });
const said = page =>
  page.locator('#investigationPlotCanvas + p[role="status"]');

/** Open the step of a lesson that has a sid, through the authoring preview. */
async function openSid(page, app, lesson, sid) {
  const inv = await getInvestigation(lesson);
  const at = inv.steps.findIndex(s => s.sid === sid) + 1;
  await app.boot({ url: `/?author=${lesson}&step=${at}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

/** Type the four planets into Kepler's measure step. */
async function fillPlanets(page) {
  const inputs = page.locator('#investigationBody input[data-field]');
  for (let i = 0; i < PLANETS.length; i++)
    for (let j = 0; j < 3; j++) await inputs.nth(i * 3 + j).fill(PLANETS[i][j]);
  await expect(rows(page)).toHaveCount(PLANETS.length);
}

async function clickDot(page, k) {
  await page.locator('#investigationPlotCanvas').scrollIntoViewIfNeeded();
  const box = await dots(page).nth(k).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

const focusedField = page =>
  page.evaluate(() => document.activeElement?.dataset?.field ?? null);

test.describe('the lesson plot is the plot component', () => {
  for (const width of WIDTHS) {
    test(`a click on a point selects its object, its row and its form row at ${width} px`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
      await openSid(page, app, 'keplers-laws', 'measure-four-planets');
      await fillPlanets(page);
      await expect(chosen(page)).toHaveCount(0);

      await clickDot(page, 2);
      await expect(chosen(page)).toHaveCount(1);
      await expect(chip(page, 'Jupiter')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(rows(page).nth(2)).toHaveAttribute('aria-selected', 'true');
      // The reader is taken to the form row the point is, to correct it.
      await expect.poll(() => focusedField(page)).toMatch(/:p3_name$/);
      await expect(said(page)).toContainText('Jupiter');
    });
  }

  test('a chip and a table row select the point', async ({ page, app }) => {
    await openSid(page, app, 'keplers-laws', 'measure-four-planets');
    await fillPlanets(page);

    await chip(page, 'Saturn').click();
    await expect(chosen(page)).toHaveCount(1);
    await expect(rows(page).nth(3)).toHaveAttribute('aria-selected', 'true');
    // Chosen from the scene, the reader keeps the focus they are on.
    expect(await focusedField(page)).toBeNull();

    await rows(page).nth(1).click();
    await expect(chip(page, 'Earth')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'Saturn')).toHaveAttribute('aria-pressed', 'false');
    await expect(chosen(page)).toHaveCount(1);
  });

  for (const width of WIDTHS) {
    test(`the keyboard moves between points, chooses one and lets go at ${width} px`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
      await openSid(page, app, 'keplers-laws', 'measure-four-planets');
      await fillPlanets(page);

      await page.locator('#investigationPlotCanvas').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      // Moving is not choosing: it is announced, and nothing else moves.
      await expect(said(page)).toContainText('Jupiter: a (AU) 5.203');
      await expect(chosen(page)).toHaveCount(0);
      await page.keyboard.press('Enter');
      await expect(chosen(page)).toHaveCount(1);
      await expect(chip(page, 'Jupiter')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await page.locator('#investigationPlotCanvas').focus();
      await page.keyboard.press('Escape');
      await expect(chosen(page)).toHaveCount(0);
    });
  }

  test('the table holds the readings as typed, with and without the transform', async ({
    page,
    app,
  }) => {
    await openSid(page, app, 'keplers-laws', 'measure-four-planets');
    await fillPlanets(page);
    const cells = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('#investigationPlotTable tbody tr')].map(
          tr => [...tr.cells].slice(1).map(c => c.textContent)
        )
      );
    expect(await cells()).toEqual([
      ['Mercury', '0.387', '0.241'],
      ['Earth', '1.000', '1.000'],
      ['Jupiter', '5.203', '11.860'],
      ['Saturn', '9.537', '29.450'],
    ]);
    await page.locator('#investigationPlotToggle').click();
    const squared = await cells();
    expect(squared[2][1]).toBe((5.203 ** 3).toFixed(3));
    expect(squared[2][2]).toBe((11.86 ** 2).toFixed(3));
    await page.locator('#investigationPlotLog').click();
    await expect(page.locator('#investigationPlotTable thead')).toContainText(
      'log₁₀('
    );
    await expect(page.locator('#investigationPlotCanvas')).toContainText(
      /slope \d/
    );
  });

  test('the description is the count and the range, held or not, and the table stays', async ({
    page,
    app,
  }) => {
    await openSid(page, app, 'keplers-laws', 'measure-four-planets');
    await fillPlanets(page);
    const desc = page.locator('#investigationPlotDesc');
    const open = await desc.textContent();
    await page.evaluate(() =>
      document
        .getElementById('investigationPanel')
        .setAttribute('data-answer-held', '')
    );
    await page
      .locator('#investigationBody input[data-field]')
      .first()
      .fill('Mercury');
    const held = await desc.textContent();
    expect(held).toBe(open);
    expect(held).toMatch(/^4 points; a {2}\(AU\) runs from 0\.387 to 9\.537\./);
    expect(held).not.toMatch(/slope|line|straight|proportional|exponent/i);
    // The student's own readings are not an answer: the table is there.
    await expect(rows(page)).toHaveCount(4);
    await expect(page.locator('#investigationPlotTableWrap')).toBeVisible();
  });
});

test.describe('predict, commit, choose a point, measure, reveal', () => {
  test('by the keyboard and through the table', async ({ page, app }) => {
    await openSid(page, app, 'tides', 'bring-the-companion-closer');
    const options = page.locator('#investigationBody .inv-option');
    await options.nth(1).click();
    await page.locator('#investigationNext').click();
    // The reveal: what the reader said, beside what is about to be measured.
    const verdict = page.locator('#investigationBody .inv-verdict');
    await expect(verdict.locator('.inv-verdict-head')).toContainText(
      'You predicted: four times as strong'
    );

    const inputs = page.locator('#investigationBody input[data-field]');
    const readings = ['2', '1', '0.5', '0.25', '1', '1', '1', '1'];
    // Distances d1..d4 and strengths t1..t4, in the order the form lists them.
    const order = await inputs.evaluateAll(list =>
      list.map(i => i.dataset.field.split(':').pop())
    );
    const give = {
      d1: '2',
      d2: '1',
      d3: '0.5',
      d4: '0.25',
      t1: '0.125',
      t2: '1',
      t3: '8',
      t4: '64',
    };
    for (let i = 0; i < order.length; i++)
      await inputs.nth(i).fill(give[order[i]] ?? readings[i]);
    await expect(rows(page)).toHaveCount(4);

    // By the keyboard: a point, then the form row it is.
    await page.locator('#investigationPlotCanvas').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(chosen(page)).toHaveCount(1);
    await expect.poll(() => focusedField(page)).toMatch(/:(d|t)\d$/);

    // Through the table: arrows move, Space chooses, and the plot follows.
    await rows(page).first().focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(rows(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    // Space adds to the choice, as it does in the table of any other view.
    await expect(chosen(page)).toHaveCount(2);

    // Nothing of this disturbed the reveal.
    await expect(verdict.locator('.inv-verdict-head')).toContainText(
      'You predicted: four times as strong'
    );
  });
});

test.describe('a step that points at an object', () => {
  test.use({ deviceScaleFactor: 2 });

  test('rings it with a name, focuses its chip, says so once, and lets go with the step', async ({
    page,
    app,
  }) => {
    await page.route(
      '**/js/data/investigations/keplers-laws.js*',
      async route => {
        const res = await route.fetch();
        const body = (await res.text()).replace(
          "sid: 'measure-four-planets',",
          "sid: 'measure-four-planets',\n      point: 'earth',"
        );
        await route.fulfill({ response: res, body });
      }
    );
    await page.addInitScript(installCanvasTextRecorder);
    await openSid(page, app, 'keplers-laws', 'measure-four-planets');
    await page.waitForFunction(() =>
      (window.__canvasText?.simulationCanvas?.last ?? []).some(b =>
        /Look here: Earth/.test(b.text)
      )
    );
    // Text, not color alone, and set no smaller than the harness's floor.
    const r = await page.evaluate(readMainCanvasLabels);
    const all = [...r.bodyLabels, ...r.otherText];
    const ring = all.filter(b => /Look here: Earth/.test(b.text));
    expect(ring.length).toBeGreaterThan(0);
    expect(judgeLabels(ring).smallest).toBeGreaterThanOrEqual(
      LABEL_FLOOR_CSS_PX
    );
    expect(judgeLabels(ring).overlaps).toEqual([]);

    // Its chip has the focus, and the object was named once.
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.textContent?.trim())
      )
      .toBe('Earth');
    const live = await page.evaluate(
      () => document.body.innerText.match(/Pointing at Earth\./g)?.length ?? 0
    );
    expect(live).toBeLessThanOrEqual(1);

    // On leaving the step the ring is gone from the next frame drawn.
    await page.locator('#investigationNext').click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !(window.__canvasText?.simulationCanvas?.last ?? []).some(b =>
              /Look here/.test(b.text)
            )
        )
      )
      .toBe(true);
  });
});
