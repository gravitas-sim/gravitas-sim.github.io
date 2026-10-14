// =============================================================================
// The series chart (js/plot/chart.js), in a real browser
// -----------------------------------------------------------------------------
// tests/plotChart.test.js reads the markup the chart draws against its own
// geometry. What only a browser can say:
//
//   - a CSS variable as an SVG presentation attribute resolves, so the axes
//     follow a theme with no stylesheet and no draw;
//   - the legend is operable from the keyboard with Tab and Space, and the
//     chart's readout with the arrow keys, and each says what it did;
//   - a hover finds the point under the pointer;
//   - a chart redraws when its box changes size;
//   - the PNG is a real PNG of the real size, and not blank;
//   - a live chart's draws update the nodes in place, and a whole run of them
//     leaves no nodes behind;
//   - axe finds nothing in the chart, its legend or its readout.
//
// There is no page for the component to live on yet (it is in no route), so
// the spec mounts it on an existing page of the site by importing the module.
// =============================================================================

import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

/** A page of the site with nothing on it that moves. */
async function mount(page, { width = 600, height = 240 } = {}) {
  await page.goto('/library/');
  await page.evaluate(
    async ({ width, height }) => {
      const { createChart } = await import('/js/plot/chart.js');
      document.body.insertAdjacentHTML(
        'afterbegin',
        `<section id="plotSpec" aria-label="Chart"><button id="before">before</button>
         <div id="host" style="width:${width}px"></div></section>`
      );
      const host = document.getElementById('host');
      const chart = createChart(host, {
        height,
        number: v => String(Math.round(v * 1000) / 1000),
        tooltip: { mode: 'index' },
        labels: {
          role: 'plot',
          legend: 'Series',
          toggled: (label, shown) => `${label} ${shown ? 'shown' : 'hidden'}`,
        },
      });
      const x = Array.from({ length: 60 }, (_, i) => i / 2);
      window.__plot = {
        chart,
        spec: {
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
              dash: [5, 3],
            },
          ],
        },
      };
      chart.draw(window.__plot.spec);
    },
    { width, height }
  );
}

test.describe('the series chart', () => {
  test(
    'axes and text take their colors from CSS variables set as attributes',
    { tag: '@cross-browser' },
    async ({ page }) => {
      await mount(page);
      const read = () =>
        page.evaluate(() => {
          const line = document.querySelector(
            '#host svg line[stroke*="border-subtle"]'
          );
          const text = document.querySelector(
            '#host svg text[fill*="text-muted"]'
          );
          return [getComputedStyle(line).stroke, getComputedStyle(text).fill];
        });
      const before = await read();
      await page.evaluate(() => {
        document.documentElement.style.setProperty(
          '--border-subtle',
          'rgb(1, 2, 3)'
        );
        document.documentElement.style.setProperty(
          '--text-muted',
          'rgb(4, 5, 6)'
        );
      });
      // No draw: the page's variables are all that moved.
      const after = await read();
      expect(after).not.toEqual(before);
      expect(after[0]).toBe('rgb(1, 2, 3)');
      expect(after[1]).toBe('rgb(4, 5, 6)');
    }
  );

  test('a theme change repaints series colors that are read from the page', async ({
    page,
  }) => {
    await mount(page);
    await page.evaluate(() => {
      const { chart, spec } = window.__plot;
      const css = document.documentElement;
      css.style.setProperty('--probe', '#112233');
      spec.series[0].color = () =>
        getComputedStyle(css).getPropertyValue('--probe').trim();
      chart.draw(spec);
    });
    const stroke = () =>
      page.evaluate(() =>
        document
          .querySelector('#host path[stroke-linejoin]')
          .getAttribute('stroke')
      );
    expect(await stroke()).toBe('#112233');
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--probe', '#445566');
      window.dispatchEvent(
        new window.CustomEvent('gravitasThemeChanged', {
          detail: { theme: 'light' },
        })
      );
    });
    expect(await stroke()).toBe('#445566');
  });

  test('the legend works from the keyboard, and says what it did', async ({
    page,
  }) => {
    await mount(page);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#host ul button').first()).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('#host path[stroke-linejoin]')).toHaveCount(1);
    await expect(page.locator('#host ul button').first()).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.locator('#host [role=status]')).toHaveText(
      'Kinetic hidden'
    );
    // The keyboard is still on the button: Enter puts the series back.
    await expect(page.locator('#host ul button').first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#host path[stroke-linejoin]')).toHaveCount(2);
    await expect(page.locator('#host [role=status]')).toHaveText(
      'Kinetic shown'
    );
  });

  test('the readout is reachable and operable from the keyboard', async ({
    page,
  }) => {
    await mount(page);
    await page.locator('#host ul button').last().focus();
    await page.keyboard.press('Tab');
    const plot = page.locator('#host svg[aria-roledescription=plot]');
    await expect(plot).toBeFocused();
    await expect(plot).toHaveAttribute('aria-label', 'Energy over time');
    const status = page.locator('#host [role=status]');
    await page.keyboard.press('ArrowLeft');
    await expect(status).toContainText('Kinetic');
    const first = await status.textContent();
    await page.keyboard.press('ArrowLeft');
    expect(await status.textContent()).not.toBe(first);
    await page.keyboard.press('ArrowDown');
    await expect(status).toContainText('Potential');
    await page.keyboard.press('Home');
    await expect(status).toContainText('0.');
    const tip = page.locator('#host div[aria-hidden=true]').first();
    await expect(tip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
  });

  test('hovering shows the values under the pointer', async ({ page }) => {
    await mount(page);
    const hit = await page.evaluate(() => {
      const { chart } = window.__plot;
      const { geometry: g } = chart.stats();
      const r = chart.element.getBoundingClientRect();
      return { x: r.left + g.sx(10), y: r.top + g.sy(2 + Math.sin(10)) };
    });
    await page.mouse.move(hit.x, hit.y);
    const tip = page.locator('#host div[aria-hidden=true]').first();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Kinetic');
    await expect(tip).toContainText('Potential');
    await expect(tip).toContainText('10');
    await page.mouse.move(2, 2);
    await expect(tip).toBeHidden();
  });

  test("height: 'fill' takes what the host has left under the legend", async ({
    page,
  }) => {
    await mount(page);
    const out = await page.evaluate(async () => {
      const { createChart } = await import('/js/plot/chart.js');
      const host = document.createElement('div');
      host.style.cssText = 'width:500px;height:300px';
      document.getElementById('plotSpec').append(host);
      const chart = createChart(host, { height: 'fill' });
      chart.draw(window.__plot.spec);
      const legend = host.querySelector('ul').offsetHeight;
      return {
        legend,
        svg: chart.stats().geometry.h,
        host: host.getBoundingClientRect().height,
      };
    });
    expect(out.legend).toBeGreaterThan(10);
    expect(out.svg).toBe(Math.round(300 - out.legend));
    // And it stays the host's size: no growth from drawing.
    expect(out.host).toBe(300);
  });

  test('it redraws when its box changes size', async ({ page }) => {
    await mount(page, { width: 600 });
    const width = () =>
      page.evaluate(() => window.__plot.chart.stats().geometry.w);
    expect(await width()).toBe(600);
    await page.evaluate(() => {
      document.getElementById('host').style.width = '360px';
    });
    await expect.poll(width).toBe(360);
  });

  test(
    'the PNG is a real image of the chart, legend included',
    { tag: '@cross-browser' },
    async ({ page }) => {
      await mount(page);
      const out = await page.evaluate(async () => {
        const blob = await window.__plot.chart.toPNG({ background: '#ffffff' });
        const bmp = await window.createImageBitmap(blob);
        const c = document.createElement('canvas');
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        const colors = new Set();
        for (let i = 0; i < data.length; i += 4 * 97) {
          colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
        }
        return {
          type: blob.type,
          size: blob.size,
          w: bmp.width,
          h: bmp.height,
          colors: colors.size,
        };
      });
      expect(out.type).toBe('image/png');
      // 600 CSS px at 2x, and a row of legend above the 240 px plot.
      expect(out.w).toBe(1200);
      expect(out.h).toBeGreaterThan(480);
      expect(out.size).toBeGreaterThan(3000);
      // Not blank: the background, the axes' gray, the two series, the text.
      expect(out.colors).toBeGreaterThan(5);
    }
  );

  test('a live chart is drawn in place: new nodes only for new series', async ({
    page,
  }) => {
    await mount(page);
    const out = await page.evaluate(() => {
      const { chart, spec } = window.__plot;
      const svg = chart.element;
      const line = svg.querySelector('path[stroke-linejoin]');
      for (let k = 0; k < 200; k++) {
        for (const s of spec.series) {
          s.x.push(30 + k / 2);
          s.y.push(s.y[0] + Math.sin(k));
        }
        chart.draw(spec);
      }
      return {
        same: svg.querySelector('path[stroke-linejoin]') === line,
        rebuilds: chart.stats().rebuilds,
        nodes: svg.querySelectorAll('*').length,
      };
    });
    expect(out.same).toBe(true);
    expect(out.rebuilds).toBe(2);
    // Two series' nodes, the axes and their ticks: nothing accumulated.
    expect(out.nodes).toBeLessThan(150);
  });

  test('axe finds nothing in the chart, its legend or its readout', async ({
    page,
  }) => {
    await mount(page);
    // The readout open, so the tooltip is on the page when axe looks.
    await page.locator('#host svg[role=group]').focus();
    await page.keyboard.press('ArrowLeft');
    const results = await new AxeBuilder({ page })
      .include('#plotSpec')
      .withTags(TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
