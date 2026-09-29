// =============================================================================
// The 3-D lab (/3d/), in a browser
// -----------------------------------------------------------------------------
// tests/lab3dView.test.js checks its numbers without a renderer. This is the
// page, its Worker and its WebGL, against the sources and dist/:
//   - a system plays from the Worker's snapshots, and every number is in
//     the tables;
//   - the frame, the look and the projection change what is drawn and the
//     legend says so;
//   - the instruments read the numbers, not the picture;
//   - the keyboard alone plays, orbits, zooms and picks a look;
//   - a lost WebGL context is recovered while the run goes on, and with no
//     WebGL at all the tables are the lab;
//   - reduced motion does not start a run by itself;
//   - a system file opens, and a merger is an event;
//   - it reads in Spanish, passes axe in both languages and fits a phone.
// =============================================================================

import { Buffer } from 'node:buffer';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function openLab(page, system = 'R3', { locale } = {}) {
  await page.addInitScript(l => {
    try {
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
  await page.goto(`/3d/?system=${system}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

/** Whether this browser can give a canvas a WebGL context at all. */
function hasWebGL(page) {
  return page.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  });
}

/** Without WebGL: the page says it cannot draw, and its tables still fill. */
async function expectTablesOnly(page) {
  expect(await page.evaluate(() => window.gravitasLab3d.webgl)).toBe(false);
  await expect(page.locator('#l3-notice')).toContainText('no WebGL');
  await expect(page.locator('#l3-state tbody tr').first()).toBeVisible();
}

const tau = page => page.evaluate(() => window.gravitasLab3d.tau);
const pause = async page => {
  if (await page.evaluate(() => window.gravitasLab3d.playing))
    await page.locator('#l3-play').click();
  await expect
    .poll(() => page.evaluate(() => window.gravitasLab3d.playing))
    .toBe(false);
};
/** A number as the page prints it: a true minus, and "× 10ⁿ" for powers. */
const parse = text => {
  const sup = {
    '⁰': 0,
    '¹': 1,
    '²': 2,
    '³': 3,
    '⁴': 4,
    '⁵': 5,
    '⁶': 6,
    '⁷': 7,
    '⁸': 8,
    '⁹': 9,
  };
  const m = text
    .replace(/−/g, '-')
    .replace(/,/g, '')
    .match(/(-?[\d.]+)(?:\s*×\s*10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+))?/);
  if (!m) return NaN;
  let e = 0;
  if (m[2]) {
    const neg = m[2].startsWith('⁻');
    e =
      Number([...m[2].replace('⁻', '')].map(c => sup[c]).join('')) *
      (neg ? -1 : 1);
  }
  return Number(m[1]) * 10 ** e;
};

test.describe('the 3-D lab', () => {
  test('a system plays from the Worker, and every number is in the tables @cross-browser', async ({
    page,
  }) => {
    await openLab(page, 'R3');
    // A browser with no WebGL at all (CI's headless Linux Firefox) cannot
    // draw. What the page must do then is say so and keep its tables, and
    // that is what this asserts there; the picture is asserted elsewhere.
    if (!(await hasWebGL(page))) return expectTablesOnly(page);
    expect(await page.evaluate(() => window.gravitasLab3d.webgl)).toBe(true);
    const t0 = await tau(page);
    await expect
      .poll(() => tau(page), { timeout: 15_000 })
      .toBeGreaterThan(t0 + 1);
    await expect(page.locator('#l3-tree > li')).toHaveCount(1);
    await expect(page.locator('#l3-tree')).toContainText(
      'inner, orbiting star'
    );
    await expect(page.locator('#l3-state tbody tr')).toHaveCount(3);
    await expect(page.locator('#l3-elements tbody tr')).toHaveCount(2);
    await expect(page.locator('#l3-elements tbody tr').first()).toContainText(
      '5.200'
    );
    await expect(page.locator('#l3-conserved')).toContainText(
      'Since the start: energy has changed'
    );
    // The names are placed on the picture from the same camera.
    await expect(page.locator('#l3-labels .l3-label')).toHaveCount(3);
    await expect(page.locator('#l3-legend')).toContainText(
      'Bodies are markers of equal size, not to scale.'
    );
    const first = await page.evaluate(
      () => performance.getEntriesByName('l3:first-frame')[0]?.startTime ?? null
    );
    expect(first).not.toBeNull();
    test.info().annotations.push({
      type: 'first frame (ms)',
      description: String(Math.round(first)),
    });
  });

  test('the frame, the look and the projection change the picture, and the legend says so', async ({
    page,
  }) => {
    await openLab(page, 'R4');
    // A browser with no WebGL at all (CI's headless Linux Firefox) cannot
    // draw. What the page must do then is say so and keep its tables, and
    // that is what this asserts there; the picture is asserted elsewhere.
    if (!(await hasWebGL(page))) return expectTablesOnly(page);
    await pause(page);
    await page.locator('#l3-frame').selectOption('pair:0,1');
    await expect(page.locator('#l3-legend')).toContainText(
      'rotating with sun and planet, which stay on the x axis'
    );
    await page.locator('#l3-refresh').click();
    // In the rotating frame the sun and the planet are on the x axis.
    for (const name of ['sun', 'planet']) {
      const row = page.locator('#l3-state tbody tr', {
        has: page.locator('th', { hasText: new RegExp(`^${name}$`) }),
      });
      const y = parse(await row.locator('td').nth(2).innerText());
      const z = parse(await row.locator('td').nth(3).innerText());
      expect(Math.abs(y)).toBeLessThan(1e-9);
      expect(Math.abs(z)).toBeLessThan(1e-9);
    }
    await page.locator('#l3-preset').selectOption('top');
    const cam = await page.evaluate(() => window.gravitasLab3d.camera());
    const d = cam.eye.map((q, k) => q - cam.target[k]);
    const n = Math.hypot(...d);
    expect(d[2] / n).toBeCloseTo(1, 6);
    await expect(page.locator('#l3-legend')).toContainText(
      'at the center of the view'
    );
    await page.locator('#l3-projection').selectOption('orthographic');
    expect(
      (await page.evaluate(() => window.gravitasLab3d.camera())).mode
    ).toBe('orthographic');
    await expect(page.locator('#l3-legend')).not.toContainText(
      'at the center of the view'
    );
  });

  test('the instruments read the numbers, not the picture', async ({
    page,
  }) => {
    await openLab(page, 'R3');
    await pause(page);
    await page.locator('#l3-tool').selectOption('distance');
    await page.locator('#l3-a').selectOption('0');
    await page.locator('#l3-b').selectOption('1');
    const want = await page.evaluate(() => {
      const f = window.gravitasLab3d.frame();
      return Math.hypot(f.x[3] - f.x[0], f.x[4] - f.x[1], f.x[5] - f.x[2]);
    });
    await expect(page.locator('#l3-reading')).toContainText(
      'From star to inner:'
    );
    const got = parse(
      (await page.locator('#l3-reading').innerText()).split(':')[1]
    );
    expect(Math.abs(got - want) / want).toBeLessThan(5e-4);
    await page.locator('#l3-tool').selectOption('angle');
    await page.locator('#l3-a').selectOption('1');
    await page.locator('#l3-v').selectOption('0');
    await page.locator('#l3-b').selectOption('2');
    await expect(page.locator('#l3-reading')).toContainText(
      /The angle at star between inner and outer: [\d.]+°/
    );
    await page.locator('#l3-tool').selectOption('elements');
    await page.locator('#l3-a').selectOption('1');
    await expect(page.locator('#l3-reading')).toContainText(
      /inner about star: a = 5\.\d+ length units, e = 0\.0\d+/
    );
  });

  test('the keyboard alone plays, orbits, zooms and picks a look', async ({
    page,
  }) => {
    await openLab(page, 'R1');
    // A browser with no WebGL at all (CI's headless Linux Firefox) cannot
    // draw. What the page must do then is say so and keep its tables, and
    // that is what this asserts there; the picture is asserted elsewhere.
    if (!(await hasWebGL(page))) return expectTablesOnly(page);
    await pause(page);
    await page.locator('#l3-canvas').focus();
    await page.keyboard.press('Space');
    await expect
      .poll(() => page.evaluate(() => window.gravitasLab3d.playing))
      .toBe(true);
    await page.keyboard.press('Space');
    await expect
      .poll(() => page.evaluate(() => window.gravitasLab3d.playing))
      .toBe(false);
    const camera = () => page.evaluate(() => window.gravitasLab3d.camera());
    const dist = c => Math.hypot(...c.eye.map((q, k) => q - c.target[k]));
    const before = await camera();
    await page.keyboard.press('ArrowLeft');
    const turned = await camera();
    expect(
      Math.hypot(...turned.eye.map((q, k) => q - before.eye[k]))
    ).toBeGreaterThan(1e-6);
    expect(dist(turned)).toBeCloseTo(dist(before), 6);
    await page.keyboard.press('+');
    expect(dist(await camera())).toBeLessThan(dist(turned));
    await page.keyboard.press('2');
    await expect(page.locator('#l3-preset')).toHaveValue('top');
    const top = await camera();
    const d = top.eye.map((q, k) => q - top.target[k]);
    expect(d[2] / Math.hypot(...d)).toBeCloseTo(1, 6);
  });

  test('a lost WebGL context is recovered while the run goes on', async ({
    page,
  }) => {
    await openLab(page, 'R3');
    // A browser with no WebGL at all (CI's headless Linux Firefox) cannot
    // draw. What the page must do then is say so and keep its tables, and
    // that is what this asserts there; the picture is asserted elsewhere.
    if (!(await hasWebGL(page))) return expectTablesOnly(page);
    const ok = await page.evaluate(() => {
      const c = document.getElementById('l3-canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      window.__lose = gl?.getExtension('WEBGL_lose_context');
      if (!window.__lose) return false;
      window.__lose.loseContext();
      return true;
    });
    // Every engine Gravitas supports offers the extension; its absence would
    // be a failure to report, not a reason to skip.
    expect(ok).toBe(true);
    await expect(page.locator('#l3-notice')).toBeVisible();
    await expect(page.locator('#l3-notice')).toContainText(
      'The graphics context was lost'
    );
    await expect
      .poll(() => page.evaluate(() => window.gravitasLab3d.lost))
      .toBe(true);
    const t0 = await tau(page);
    await expect
      .poll(() => tau(page), { timeout: 15_000 })
      .toBeGreaterThan(t0 + 1);
    await page.evaluate(() => window.__lose.restoreContext());
    await expect(page.locator('#l3-notice')).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => window.gravitasLab3d.lost))
      .toBe(false);
    await expect(page.locator('#l3-labels .l3-label')).toHaveCount(3);
  });

  test('with no WebGL the tables are the lab @cross-browser', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const real = window.HTMLCanvasElement.prototype.getContext;
      window.HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
        if (/webgl/.test(kind)) return null;
        return real.call(this, kind, ...rest);
      };
    });
    await openLab(page, 'R3');
    expect(await page.evaluate(() => window.gravitasLab3d.webgl)).toBe(false);
    await expect(page.locator('#l3-notice')).toContainText('no WebGL');
    const t0 = await tau(page);
    await expect
      .poll(() => tau(page), { timeout: 15_000 })
      .toBeGreaterThan(t0 + 1);
    await expect(page.locator('#l3-state tbody tr')).toHaveCount(3);
    await expect(page.locator('#l3-elements tbody tr')).toHaveCount(2);
  });

  test('reduced motion does not start a run by itself', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openLab(page, 'R3');
    await expect(page.locator('#l3-reduced')).toBeChecked();
    expect(await page.evaluate(() => window.gravitasLab3d.playing)).toBe(false);
    const t0 = await tau(page);
    await page.locator('#l3-play').click();
    await expect.poll(() => tau(page), { timeout: 15_000 }).toBeGreaterThan(t0);
  });

  test('a system file opens, and a merger is an event', async ({ page }) => {
    await openLab(page, 'R8');
    await page.locator('#l3-speed').selectOption('16');
    await expect(page.locator('#l3-events')).toContainText('merged', {
      timeout: 30_000,
    });
    await expect(page.locator('#l3-tree')).toContainText('Merged away');
    const system = {
      format: 'gravitas.system3d',
      formatVersion: 1,
      units: 'code',
      integrator: { scheme: 'yoshida4c', h: 0.005 },
      t: 0,
      bodies: [
        {
          id: 'star',
          name: 'Star',
          m: 1,
          radius: 0,
          x: [0, 0, 0],
          v: [0, 0, 0],
        },
        {
          id: 'p',
          name: 'Planet',
          m: 0.001,
          radius: 0,
          x: [1, 0, 0],
          v: [0, 1.0005, 0],
        },
      ],
    };
    await page.locator('#l3-system').selectOption('file');
    await page.locator('#l3-file').setInputFiles({
      name: 'circle.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(system)),
    });
    await expect(page.locator('#l3-tree')).toContainText(
      'Planet, orbiting Star'
    );
    await expect(page.locator('#l3-elements tbody tr').first()).toContainText(
      /1\.00\d length units/
    );
  });

  test('reads in Spanish, passes axe in both languages and fits a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openLab(page, 'R3', { locale });
      if (locale === 'es') {
        await expect(page.locator('#l3-title')).toHaveText(
          'El laboratorio 3-D'
        );
        await expect(page.locator('#l3-tree')).toContainText(
          'en órbita alrededor de'
        );
      }
      await pause(page);
      const wide = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(wide).toBeLessThanOrEqual(1);
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        r.violations.map(
          v => `${locale}: ${v.id} ${v.nodes.map(n => n.target).join(' ')}`
        )
      ).toEqual([]);
    }
  });
});
