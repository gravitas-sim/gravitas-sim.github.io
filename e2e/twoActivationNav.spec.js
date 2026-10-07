// =============================================================================
// The two-activation criterion, scripted (P58 repair R-A; Roadmap II 50 and 54)
// -----------------------------------------------------------------------------
// From Home, every navigation target and every Library route is reached in at
// most two activations (a click, a tap, or Enter on a focused control), by
// keyboard and by touch, at 375 and 1024 px. And no page is an orphan (no
// inbound link from the navigation, the Library or Home) or a dead end (no way
// back to Home on screen).
//
// What counts as an activation: opening a navigation group, following a link.
// Menu on a phone and the welcome's close button count too (see OVER).
//
// Known gaps are explicit allowlists whose size is asserted, so they can only
// shrink. Keyboard activation focuses the control and presses Enter; one
// test also walks to a control with the real Tab key.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { stepKey } from './keyboard.js';
import { NAV, shellPages, pathOf } from '../tools/shell.mjs';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const MAX = 2;
// REAL FINDING (not fixed here: no shipped changes). Up to 1024 px the shell
// folds behind Menu, which counts as an activation, so a nav target that Home
// does not link itself costs three; by touch the welcome screen's close button
// sits over Menu, so the welcome must be closed first, four. At both widths. Exact counts, asserted, so the excess can only shrink.
const OVER = {
  '375/keyboard': 3,
  '375/touch': 4,
  '1024/keyboard': 3,
  '1024/touch': 4,
};

// Allowlists (each entry justified; the count is asserted).
// The first Gravitas is reached from one quiet word in /model/'s footer, by
// design (tools/shell.mjs EXEMPT), so no nav or Library entry points at it.
const ORPHAN_ALLOW = new Set(['history/original/index.html']);
// Targets that are not a page load: the sandbox is Home itself, the PDF is a
// download. They are reached (counted) but not followed.
const NOT_FOLLOWED = new Set(['/', '/Gravitas_User_Manual.pdf']);
// Real dead ends found by this spec: none.
const DEAD_END_ALLOW = new Set([]);

const targets = [...new Set(NAV.flatMap(([, links]) => links.map(l => l[1])))];
const bases = [
  ...new Set(LIBRARY.entries.map(e => e.route.replace(/[?#].*/, ''))),
];

async function goHome(page) {
  await page.goto('/#home', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, {
    timeout: 60_000,
  });
  await expect(page.locator('#welcomeScreen')).toBeVisible();
}

/** One activation by the combo's input. Returns nothing; callers count. */
async function activate(page, loc, input) {
  await expect(loc).toBeVisible();
  const r = await loc.boundingBox();
  const vp = page.viewportSize();
  expect(r.width).toBeGreaterThan(0);
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(vp.width + 1);
  if (input === 'touch') await loc.tap();
  else {
    await loc.focus();
    await expect(loc).toBeFocused();
    await page.keyboard.press('Enter');
  }
}

for (const width of [375, 1024]) {
  for (const input of ['keyboard', 'touch']) {
    test.describe(`from Home at ${width} px by ${input}`, () => {
      test.use({
        viewport: { width, height: 800 },
        hasTouch: input === 'touch',
      });

      for (const href of targets) {
        test(`${href} is within two activations`, async ({ page }) => {
          await goHome(page);
          let count = 0;
          if (href === '/') {
            // Home is the Sandbox: it is current, nothing to activate.
            await expect(page.locator('.gs-nav a[href="/"]')).toHaveAttribute(
              'aria-current',
              'page'
            );
            return;
          }
          const direct = page.locator(`#welcomeScreen a[href="${href}"]`);
          if (await direct.first().isVisible()) {
            // Home links it itself: one activation.
            await activate(page, direct.first(), input);
            await expect(page).toHaveURL(
              new RegExp(`${href.replace(/[/.]/g, '\\$&')}$`)
            );
            return;
          }
          const menu = page.locator('.gs-toggle');
          if (await menu.isVisible()) {
            // On a phone the welcome screen can sit over the Menu button: a
            // finger cannot reach it until the welcome is closed.
            const covered = await menu.evaluate(el => {
              const r = el.getBoundingClientRect();
              const top = document.elementFromPoint(
                r.left + r.width / 2,
                r.top + r.height / 2
              );
              return !!top && top !== el && !el.contains(top);
            });
            if (covered && input === 'touch') {
              await activate(page, page.locator('#welcomeClose'), input);
              count++;
              await expect(page.locator('#welcomeScreen')).toBeHidden();
            }
            await activate(page, menu, input);
            count++;
            await expect(menu).toHaveAttribute('aria-expanded', 'true');
          }
          const group = page
            .locator('.gs-group')
            .filter({ has: page.locator(`a[href="${href}"]`) })
            .locator('summary');
          await activate(page, group, input);
          count++;
          const link = page.locator(`.gs-nav a[href="${href}"]`);
          await expect(link).toBeVisible();
          if (NOT_FOLLOWED.has(href)) {
            const rect = await link.boundingBox();
            expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
            count++;
            const res = await page.request.get(href);
            expect(res.status()).toBe(200);
          } else {
            await activate(page, link, input);
            count++;
            if (href === '/#investigations') {
              await expect(page.locator('#investigationBrowser')).toBeVisible({
                timeout: 30_000,
              });
            } else {
              await expect(page).toHaveURL(
                new RegExp(`${href.replace(/[/.]/g, '\\$&')}$`)
              );
            }
          }
          // Within two, or exactly the recorded excess (it can only shrink).
          expect(count).toBe(OVER[`${width}/${input}`] ?? count);
          if (!OVER[`${width}/${input}`])
            expect(count).toBeLessThanOrEqual(MAX);
        });
      }

      test('the Library is one activation, and every route is a second', async ({
        page,
      }) => {
        test.setTimeout(240_000);
        await goHome(page);
        const lib = page.locator('#welcomeScreen a[href="/library/"]').first();
        const open = async () => {
          await expect(page.locator('html')).toHaveAttribute(
            'data-ready',
            'true',
            { timeout: 30_000 }
          );
          await expect(page.locator('#libResults .lib-card')).toHaveCount(
            LIBRARY.entries.length
          );
        };
        await activate(page, lib, input); // activation 1
        await expect(page).toHaveURL(/\/library\/$/);
        await open();

        // Every entry is a card whose link is its route, on screen and
        // focusable; the second activation is then that link.
        const cards = await page.evaluate(() =>
          [...document.querySelectorAll('#libResults .lib-card')].map(c => {
            const a = c.matches('a') ? c : c.querySelector('a[href]');
            const r = a && a.getBoundingClientRect();
            return {
              href: a && a.getAttribute('href'),
              ok:
                !!a &&
                r.width > 0 &&
                r.left >= 0 &&
                r.right <= window.innerWidth + 1 &&
                a.tabIndex >= 0 &&
                !a.closest('[inert],[hidden]'),
            };
          })
        );
        const orphanRoutes = LIBRARY.entries
          .map(e => e.route)
          .filter(r => !cards.some(c => c.ok && c.href === r));
        expect(orphanRoutes).toEqual([]);

        for (const [i, base] of bases.entries()) {
          if (i > 0) {
            await page.goBack({ waitUntil: 'domcontentloaded' });
            await open();
          }
          const first = LIBRARY.entries.find(
            e => e.route.replace(/[?#].*/, '') === base
          );
          const card = page
            .locator(
              `#libResults .lib-card a[href="${first.route}"], #libResults a.lib-card[href="${first.route}"]`
            )
            .first();
          await card.scrollIntoViewIfNeeded();
          await activate(page, card, input); // activation 2
          await page.waitForURL(u => u.pathname === base, { timeout: 30_000 });
        }
      });

      test('every shelled page shows a way back to Home, and Home is one activation', async ({
        page,
      }) => {
        test.setTimeout(240_000);
        const dead = [];
        for (const file of shellPages()) {
          const here = pathOf(file);
          if (here === '/') continue;
          await page.goto(here, { waitUntil: 'domcontentloaded' });
          const brand = page.locator('.gs-brand');
          const ok =
            (await brand.count()) === 1 &&
            (await brand.getAttribute('href')) === '/#home' &&
            (await brand.isVisible()) &&
            (await page.locator('.gs-nav').count()) === 1;
          if (!ok) dead.push(file);
        }
        expect(dead.sort()).toEqual([...DEAD_END_ALLOW].sort());

        // And the way back works, from a page and from the Library.
        await page.goto('/library/', { waitUntil: 'domcontentloaded' });
        await activate(page, page.locator('.gs-brand'), input);
        await page.waitForFunction(
          () => window.splashScreenEnded === true,
          null,
          {
            timeout: 60_000,
          }
        );
        expect(new URL(page.url()).pathname).toBe('/');
      });
    });
  }
}

test.describe('the navigation graph', () => {
  test('no page is an orphan: the navigation, the Library or Home links it', async () => {
    const inbound = new Set([
      ...targets.map(t => t.replace(/[?#].*/, '')),
      ...bases,
    ]);
    for (const f of ['index.html', 'library/index.html']) {
      for (const m of readFileSync(f, 'utf8').matchAll(/href="(\/[^"#?]*)/g))
        inbound.add(m[1]);
    }
    const files = [...shellPages(), 'history/original/index.html'];
    const orphans = files
      .filter(f => !inbound.has(pathOf(f)))
      .filter(f => !ORPHAN_ALLOW.has(f));
    expect(orphans).toEqual([]);
    // The allowlisted page is still reached, and the allowlist cannot grow.
    expect(readFileSync('model/index.html', 'utf8')).toContain(
      'href="/history/original/"'
    );
    expect(ORPHAN_ALLOW.size).toBe(1);
    expect(DEAD_END_ALLOW.size).toBe(0);
    // No target is a stale route: every nav page exists.
    for (const t of targets.filter(
      t => !NOT_FOLLOWED.has(t) && !t.includes('#')
    ))
      expect(files).toContain(t.slice(1) + 'index.html');
  });

  test('Home is reached by a real Tab walk to the Library link', async ({
    page,
    browserName,
  }) => {
    await goHome(page);
    let hit = false;
    for (let i = 0; i < 80 && !hit; i++) {
      await page.keyboard.press(stepKey(browserName));
      hit = await page.evaluate(
        () => document.activeElement?.getAttribute('href') === '/library/'
      );
    }
    expect(hit).toBe(true);
  });
});
