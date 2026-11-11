// =============================================================================
// A chart's description and its sound, in a real browser (Prompt 280)
// -----------------------------------------------------------------------------
// tests/plotAccess.test.js drives js/plot/access.js against a mock audio
// context. What only a browser can say:
//
//   - a chart on a screen fetches its accessibility layer by itself, once it
//     has drawn, and carries its description as its accessible description;
//   - Tab reaches the chart, the disclosure appears at the chart's first
//     focus, and S plays the series and Escape stops it, in a real
//     AudioContext started by a real key press;
//   - a lesson step that holds an answer turns the description into the axes
//     alone and the sound is refused;
//   - the page's language is the description's;
//   - axe finds nothing in the chart, its disclosure or its button, and the
//     disclosure does not push a phone-width page sideways.
//
// Like plotChart.spec.js it mounts the component on an existing page of the
// site, by importing the module.
// =============================================================================

import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** A page with one chart: flat at 1 with a dip near x = 5.7. */
async function mount(page, { lang = 'en', held = false } = {}) {
  await page.goto('/library/');
  await page.evaluate(
    async ({ lang, held }) => {
      document.documentElement.lang = lang;
      if (held) document.body.classList.add('investigation-open');
      const { createChart } = await import('/js/plot/chart.js');
      document.body.insertAdjacentHTML(
        'afterbegin',
        `<section id="plotSpec" aria-label="Chart">
           <button id="before">before</button>
           ${held ? '<div id="investigationPanel" data-answer-held><p>A held step</p></div>' : ''}
           <div id="host" style="width:100%;max-width:560px"></div>
           <button id="after">after</button>
         </section>`
      );
      const chart = createChart(document.getElementById('host'), {
        height: 220,
        number: v => String(Math.round(v * 1000) / 1000),
      });
      const x = Array.from({ length: 120 }, (_, i) => i / 10);
      chart.draw({
        label: 'Brightness',
        xTitle: 'Time (d)',
        yTitle: 'Flux',
        series: [
          {
            id: 'a',
            label: 'A',
            x,
            y: x.map(
              v => (v > 5 && v < 6.5 ? 0.9 : 1) + 0.001 * Math.sin(97 * v)
            ),
          },
        ],
      });
      window.__chart = chart;
    },
    { lang, held }
  );
  await expect(page.locator('#host svg')).toHaveAttribute(
    'aria-describedby',
    /^ocDesc/,
    { timeout: 10000 }
  );
}

const described = page =>
  page.evaluate(() => {
    const svg = document.querySelector('#host svg');
    return document.getElementById(svg.getAttribute('aria-describedby'))
      .textContent;
  });

test.describe('a chart describes itself', () => {
  test('the description is carried, bounded, and the disclosure waits for focus', async ({
    page,
  }) => {
    await mount(page);
    const text = await described(page);
    expect(text).toMatch(
      /^Chart: Brightness\. Flux against Time \(d\)\. 120 points/
    );
    expect(text).toMatch(/A dip near x = 5\.7/);
    expect(text).not.toMatch(/transit|eclipse|planet|orbit/i);
    await expect(page.locator('.plot-access')).toBeHidden();
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#host svg')).toBeFocused();
    const box = page.locator('.plot-access');
    await expect(box).toBeVisible();
    await box.locator('summary').click();
    await expect(box).toContainText('A dip near x = 5.7');
    await expect(box).toContainText(
      'Time is x: 6 seconds cover x from 0 to 11.9'
    );
    await expect(box).toContainText('Not validated with listeners');
  });

  test('S plays the series and Escape stops it', async ({ page }) => {
    await mount(page);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    const status = page.locator('#host [role=status]').first();
    await page.keyboard.press('s');
    await expect(status).toHaveText(/Playing the chart as sound, 6 seconds/);
    await expect(page.locator('.plot-access button')).toHaveText(
      'Stop the sound'
    );
    await page.keyboard.press('Escape');
    await expect(status).toHaveText('Sound stopped.');
    await expect(page.locator('.plot-access button')).toHaveText(
      'Play as sound'
    );
  });

  test('a held answer: the axes alone, and no sound', async ({ page }) => {
    await mount(page, { held: true });
    const text = await described(page);
    expect(text).toMatch(/120 points, x from 0 to 11\.9\./);
    expect(text).toMatch(
      /not described until the result of the prediction you made is shown/
    );
    expect(text).not.toMatch(/dip|highest|lowest/i);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('s');
    await expect(page.locator('#host [role=status]').first()).toHaveText(
      /not available until the result/
    );
    await expect(page.locator('.plot-access button')).toBeDisabled();
  });

  test('in Spanish when the page is', async ({ page }) => {
    await mount(page, { lang: 'es' });
    const text = await described(page);
    expect(text).toMatch(
      /^Gráfico: Brightness\. Flux frente a Time \(d\)\. 120 puntos/
    );
    expect(text).toMatch(/Una caída cerca de x = 5,7/);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.plot-access summary')).toHaveText(
      'Describir y escuchar este gráfico'
    );
  });

  test('axe finds nothing in the chart or its disclosure, and a phone-width page does not scroll sideways', async ({
    page,
  }) => {
    await mount(page);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await page.locator('.plot-access summary').click();
    const results = await new AxeBuilder({ page })
      .include('#plotSpec')
      .withTags(TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 640 });
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(over).toBeLessThanOrEqual(0);
  });
});
