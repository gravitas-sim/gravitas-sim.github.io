// =============================================================================
// The interface holds together, at every size and in both languages
// -----------------------------------------------------------------------------
// A UI pass is easy to assert about loosely and hard to assert about usefully.
// What is checked here is the set of concrete claims the pass makes, each one
// something that was wrong before it:
//
//   - the eight object types are drawn, not typed, so the picker looks the same
//     on a Mac, on Windows and on a Linux box with no emoji font;
//   - arming placement says so on the canvas, where a phone reader can see it,
//     rather than only in a rail that dismisses itself;
//   - the status never covers the transport bar, at any of the seven sizes;
//   - the control rail stops above the transport bar instead of putting its
//     last button under one;
//   - placing something confirms it without a dialog;
//   - the whole thing still works from the keyboard, and in Spanish.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The sizes the audit covers: two phones, a tablet, three laptops, a lecture
 *  display. Spanish runs about a third longer than English, which is where a
 *  layout that only just fits stops fitting. */
const VIEWPORTS = [
  { name: '320x700', width: 320, height: 700 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x700', width: 1024, height: 700 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  // Not in the audit list, and the one that catches things: a short window is
  // where a rail that grows downward meets a transport bar pinned to the
  // bottom. At the seven sizes above the rail never reached that far, so a
  // check that only covered them would have passed before the fix as well.
  { name: '1024x560 (short)', width: 1024, height: 560 },
];

/** Reveal the control rail. Above the phone breakpoint this does nothing. */
async function openRail(page) {
  // Whether there is a hamburger at all is a question about the width, and the
  // button is revealed by a class the splash adds - so this waits for the rail
  // to be usable rather than asking once and getting the answer from a frame
  // before the chrome faded in.
  const narrow = await page.evaluate(() => window.innerWidth <= 1024);
  if (!narrow) return;
  const toggle = page.locator('#mobileMenuToggle');
  await toggle.waitFor({ state: 'visible' });
  const open = await page
    .locator('#mainControls')
    .evaluate(el => el.classList.contains('is-open'));
  if (!open) await toggle.click();
  await page.locator('#objectTypeBtn').waitFor({ state: 'visible' });
}

/** Choose a type from the real picker, which is what arms placement. */
async function armType(page, type = 'Comet') {
  await openRail(page);
  await page.click('#objectTypeBtn');
  await page.click(`.object-picker-item[data-object-type="${type}"]`);
  await page.waitForTimeout(200);
}

const boxesOverlap = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

test.describe('the object types are drawn, not typed', () => {
  test('every row in the picker carries an SVG glyph and a name', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openRail(page);
    await page.click('#objectTypeBtn');

    const items = page.locator('.object-picker-item');
    const count = await items.count();
    expect(count).toBe(8);

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect(item.locator('svg.object-glyph')).toHaveCount(1);
      // The name is text, and it is not empty: the picture is never the only
      // thing telling two rows apart.
      const name = (
        await item.locator('.object-picker-name').innerText()
      ).trim();
      expect(name.length).toBeGreaterThan(2);
    }
  });

  test('no emoji are left in the picker or on its button', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openRail(page);
    await page.click('#objectTypeBtn');
    const text = await page.evaluate(() => {
      const picker = document.getElementById('objectTypePicker');
      const btn = document.getElementById('objectTypeBtn');
      return `${picker.innerText} ${btn.innerText}`;
    });
    // Emoji, dingbats, and the variation selector several of them are
    // followed by - kept out of the class, where it would combine with the
    // preceding range instead of being a member of it.
    expect(text).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}/u
    );
  });

  test('the glyphs are all the same size, so the names line up', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openRail(page);
    await page.click('#objectTypeBtn');
    const lefts = await page.evaluate(() =>
      [...document.querySelectorAll('.object-picker-name')].map(el =>
        Math.round(el.getBoundingClientRect().x)
      )
    );
    expect(new Set(lefts).size).toBe(1);
  });

  test('the glyphs take their colours from the theme', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openRail(page);
    await page.click('#objectTypeBtn');
    // Resolved, not literal: a var() that named a token nothing defines would
    // render as black on black and this would catch it.
    const perItem = await page.evaluate(() =>
      [...document.querySelectorAll('.object-picker-item svg')].map(svg =>
        [...svg.querySelectorAll('*')]
          .flatMap(el => {
            const s = getComputedStyle(el);
            return [s.fill, s.stroke];
          })
          .filter(c => c && c !== 'none')
      )
    );
    expect(perItem).toHaveLength(8);
    for (const colours of perItem) {
      // Every glyph resolves at least one colour that is neither black - the
      // shadows and the event horizon are deliberately black - nor a literal
      // var() left unresolved because the token does not exist.
      const lit = colours.filter(
        c => /^rgba?\(/.test(c) && !/^rgba?\(0,\s*0,\s*0/.test(c)
      );
      expect(lit.length).toBeGreaterThan(0);
    }
  });
});

test.describe('arming placement is visible from the canvas', () => {
  test('the status names the type, and says how to place and how to stop', async ({
    page,
    app,
  }) => {
    await app.boot();
    const status = page.locator('#placementStatus');
    await expect(status).toBeHidden();

    await armType(page, 'Comet');
    await expect(status).toBeVisible();
    const text = (await status.innerText()).toLowerCase();
    expect(text).toContain('comet');
    expect(text).toContain('place');
    expect(text).toContain('esc');
    await expect(status.locator('svg.object-glyph')).toHaveCount(1);
  });

  test('it goes away when placement is cancelled', async ({ page, app }) => {
    await app.boot();
    await armType(page, 'Star');
    await expect(page.locator('#placementStatus')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#placementStatus')).toBeHidden();
  });

  test('it is announced, not just drawn', async ({ page, app }) => {
    await app.boot();
    const status = page.locator('#placementStatus');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
  });

  test('it follows the language', async ({ page, app }) => {
    await app.boot();
    await armType(page, 'Comet');
    const en = await page.locator('#placementStatus').innerText();

    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });
    await page.waitForTimeout(300);
    const es = await page.locator('#placementStatus').innerText();

    expect(es).not.toBe(en);
    expect(es.toLowerCase()).toContain('cometa');
  });

  test('it never intercepts the click it is asking for', async ({
    page,
    app,
  }) => {
    await app.boot();
    await armType(page, 'Comet');
    const hit = await page.evaluate(() => {
      const s = document.getElementById('placementStatus');
      const r = s.getBoundingClientRect();
      const el = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2
      );
      return el?.id || null;
    });
    expect(hit).not.toBe('placementStatus');
  });
});

for (const vp of VIEWPORTS) {
  test.describe(`at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('the placement status clears the transport bar and stays on screen', async ({
      page,
      app,
    }) => {
      await app.boot();
      await armType(page, 'Comet');

      const status = await page.locator('#placementStatus').boundingBox();
      const bar = await page.locator('#timelineBar').boundingBox();
      expect(status).not.toBeNull();
      expect(bar).not.toBeNull();
      expect(boxesOverlap(status, bar)).toBe(false);

      expect(status.x).toBeGreaterThanOrEqual(0);
      expect(status.y).toBeGreaterThanOrEqual(0);
      expect(status.x + status.width).toBeLessThanOrEqual(vp.width + 1);
      expect(status.y + status.height).toBeLessThanOrEqual(vp.height + 1);
    });

    test('no rail control ends up under the transport bar', async ({
      page,
      app,
    }) => {
      // The control, not the panel. The first version of this compared the two
      // boxes, which is both too strict and too weak: too strict because the
      // rail's translucent sheet may perfectly well pass under a floating pill,
      // and too weak because a control scrolled to the bottom of the rail can
      // sit under that pill while the boxes still look fine at some other
      // scroll position. What matters is whether a reader can see and press
      // the thing they are reaching for.
      await app.boot();
      await openRail(page);
      // The tallest section, which is what pushes the rail into the bar.
      await page.locator('#railTools').click();
      await page.waitForTimeout(200);

      const obscured = await page.evaluate(() => {
        const rail = document.getElementById('mainControls');
        const bar = document
          .getElementById('timelineBar')
          .getBoundingClientRect();
        const seen = new Set();
        const collect = () => {
          const rr = rail.getBoundingClientRect();
          for (const el of rail.querySelectorAll('button')) {
            if (!el.offsetParent) continue;
            const b = el.getBoundingClientRect();
            if (b.width === 0 || b.height === 0) continue;
            // Only the part of the control actually inside the rail's own
            // scroll viewport counts as on screen.
            const top = Math.max(b.y, rr.y);
            const bottom = Math.min(b.bottom, rr.bottom);
            if (bottom - top < b.height * 0.5) continue;
            if (
              b.x < bar.right &&
              b.right > bar.x &&
              top < bar.bottom &&
              bottom > bar.y
            ) {
              seen.add(el.id || el.textContent.trim().slice(0, 20));
            }
          }
        };
        // Both ends of the scroll, so neither the first control nor the last
        // can hide behind the bar.
        rail.scrollTop = 0;
        collect();
        rail.scrollTop = rail.scrollHeight;
        collect();
        return [...seen];
      });

      expect(obscured).toEqual([]);
    });

    test('nothing scrolls sideways', async ({ page, app }) => {
      await app.boot();
      await armType(page, 'BlackHole');
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

/** Switch the running page to Spanish and let the chrome re-render. */
async function speakSpanish(page) {
  await page.evaluate(async () => {
    const i18n = await import('/js/i18n/index.js');
    await i18n.setLocale('es');
  });
  await page.waitForTimeout(300);
}

test.describe('in Spanish, where the words are longer', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test('the longest type name still fits its row', async ({ page, app }) => {
    await app.boot();
    await speakSpanish(page);
    await openRail(page);
    await page.click('#objectTypeBtn');
    const picker = await page.locator('#objectTypePicker').boundingBox();
    expect(picker.x).toBeGreaterThanOrEqual(0);
    expect(picker.x + picker.width).toBeLessThanOrEqual(321);

    // "Añadir estrellas de neutrones" is the long one.
    const row = page.locator(
      '.object-picker-item[data-object-type="NeutronStar"]'
    );
    const box = await row.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(picker.x + picker.width + 1);
  });

  test('the status fits and does not cover the transport bar', async ({
    page,
    app,
  }) => {
    await app.boot();
    await speakSpanish(page);
    await armType(page, 'NeutronStar');
    const status = await page.locator('#placementStatus').boundingBox();
    const bar = await page.locator('#timelineBar').boundingBox();
    expect(boxesOverlap(status, bar)).toBe(false);
    expect(status.x).toBeGreaterThanOrEqual(0);
    expect(status.x + status.width).toBeLessThanOrEqual(321);
  });
});

test.describe('placing something says so, without a dialog', () => {
  test('a toast names the type and it reaches the live region', async ({
    page,
    app,
  }) => {
    await app.boot();
    // A dialog would hang this: nothing dismisses it, and Playwright's default
    // handler would let the test pass while a real reader was stuck.
    let dialogs = 0;
    page.on('dialog', d => {
      dialogs++;
      d.dismiss();
    });

    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.paused = true;
    });
    await armType(page, 'Comet');

    const canvas = await page.locator('#simulationCanvas').boundingBox();
    await page.mouse.click(
      canvas.x + canvas.width * 0.3,
      canvas.y + canvas.height * 0.7
    );
    await page.waitForTimeout(300);

    expect(dialogs).toBe(0);
    const toast = page.locator('#gravitasToast');
    await expect(toast).toBeVisible();
    expect((await toast.innerText()).toLowerCase()).toContain('comet');

    const announced = await page.locator('#srStatus').innerText();
    expect(announced.toLowerCase()).toContain('comet');
  });
});

test.describe('from the keyboard alone', () => {
  test('the picker opens, arrows move, Enter arms and Escape cancels', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#objectTypeBtn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#objectTypePicker')).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const focused = await page.evaluate(
      () => document.activeElement?.dataset?.objectType || null
    );
    expect(focused).not.toBeNull();

    await page.keyboard.press('Enter');
    await expect(page.locator('#placementStatus')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#placementStatus')).toBeHidden();
    // And focus came back to the control that opened it.
    expect(await page.evaluate(() => document.activeElement?.id)).toBe(
      'objectTypeBtn'
    );
  });

  test('the armed button names its type to a screen reader', async ({
    page,
    app,
  }) => {
    await app.boot();
    await armType(page, 'BlackHole');
    const label = await page
      .locator('#objectTypeBtn')
      .getAttribute('aria-label');
    expect(label?.toLowerCase()).toContain('black hole');
    expect(label?.toLowerCase()).toContain('escape');
  });
});

test.describe('the panels do not hide each other', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('an open picker is on top of an open inspector', async ({
    page,
    app,
  }) => {
    await app.boot();
    // Select a real body, which is what opens the inspector.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.paused = true;
    });
    const at = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const body = physics.stars[0] || physics.planets[0];
      if (!body) return null;
      const p = physics.world_to_screen(body.pos);
      const canvas = document.getElementById('simulationCanvas');
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.x + (p.x / canvas.width) * rect.width,
        y: rect.y + (p.y / canvas.height) * rect.height,
      };
    });
    expect(at).not.toBeNull();
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(400);

    await page.click('#objectTypeBtn');
    await page.waitForTimeout(300);

    const topmost = await page.evaluate(() => {
      const p = document.getElementById('objectTypePicker');
      const r = p.getBoundingClientRect();
      return [0.1, 0.5, 0.9].map(f => {
        const el = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height * f
        );
        return el?.closest('#objectTypePicker')
          ? 'picker'
          : (el?.id ?? 'other');
      });
    });
    expect(topmost).toEqual(['picker', 'picker', 'picker']);
  });
});

test.describe('the controls are big enough to hit', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('every row in the picker is at least 24 by 24', async ({
    page,
    app,
  }) => {
    // WCAG 2.2's minimum target size. The picker is the control most likely to
    // be used with a thumb, and its rows are the smallest things in it.
    await app.boot();
    await openRail(page);
    await page.click('#objectTypeBtn');

    const items = page.locator('.object-picker-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }

    const stop = await page.locator('.object-picker-stop').boundingBox();
    expect(stop.height).toBeGreaterThanOrEqual(24);
  });

  test('the transport buttons are too', async ({ page, app }) => {
    await app.boot();
    const buttons = page.locator('#timelineBar button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      if (!(await buttons.nth(i).isVisible())) continue;
      const box = await buttons.nth(i).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('at 200% zoom', () => {
  // Browser zoom makes a CSS pixel twice as big; the layout still sees a
  // viewport measured in CSS pixels, which is now half as wide. So this is a
  // 1280x800 window at 200%, and it is the reflow requirement in WCAG 1.4.10
  // expressed the way a reader actually meets it.
  //
  // Not document.style.zoom, which was tried: that scales the fixed-position
  // chrome along with everything else and pushes the control rail off the
  // right-hand edge - an artefact of the emulation, not of the interface.
  test.use({ viewport: { width: 640, height: 400 } });

  test('the page reflows instead of scrolling sideways', async ({
    page,
    app,
  }) => {
    await app.boot();
    await armType(page, 'Comet');

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // And the two things a reader needs are still on the screen, and apart.
    await expect(page.locator('#timelineBar')).toBeVisible();
    await expect(page.locator('#placementStatus')).toBeVisible();

    const status = await page.locator('#placementStatus').boundingBox();
    const bar = await page.locator('#timelineBar').boundingBox();
    expect(boxesOverlap(status, bar)).toBe(false);
    expect(status.y).toBeGreaterThanOrEqual(0);
    expect(status.y + status.height).toBeLessThanOrEqual(401);
  });
});

test.describe('the front door is fetched only when it is needed', () => {
  // It grew to eleven kilobytes of entry cards, featured scenarios and
  // audience copy, and every returning visitor was downloading it in order to
  // read one key out of localStorage. The four functions that decide whether
  // to show it are js/welcomeGate.js; the layer itself is a dynamic import.

  test('a returning visitor never asks for it', async ({ page, app }) => {
    const asked = [];
    page.on('request', r => {
      if (r.url().includes('/js/welcome.js')) asked.push(r.url());
    });
    await app.boot();
    await page.waitForTimeout(600);
    expect(asked).toEqual([]);
    // And the gate did run - the door is decided against, not forgotten.
    await expect(page.locator('#welcomeScreen')).toBeHidden();
  });

  test('a first visitor still gets it', async ({ page, app }) => {
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
  });

  test('the reopen button opens it on a later visit', async ({ page, app }) => {
    await app.boot();
    // Activated directly rather than through the rail's accordion: whether the
    // Learn section happens to be expanded is a different question, and it has
    // its own tests.
    const press = () =>
      page.locator('#aboutGravitasBtn').evaluate(el => el.click());

    await press();
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    // Twice, to prove the module is wired once rather than once per click.
    await page.keyboard.press('Escape');
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await press();
    await expect(page.locator('#welcomeScreen')).toBeVisible();
  });

  test('a door that fails to load still leaves a usable sandbox', async ({
    page,
    app,
    errors,
  }) => {
    // The failure mode that matters: the splash is already gone by the time
    // the import is attempted, so a rejection with no handler would leave a
    // first-time visitor looking at a running simulation with no interface.
    let blocked = 0;
    await page.route('**/js/welcome.js', route => {
      blocked++;
      return route.abort();
    });
    await app.boot({ firstVisit: true });
    await page.waitForTimeout(600);

    await expect(page.locator('#mainControls')).toBeVisible();
    await expect(page.locator('#timelineBar')).toBeVisible();
    // Nothing threw: the import is caught, not left to become an unhandled
    // rejection.
    expect(errors.pageErrors).toEqual([]);

    // Chromium logs the blocked request itself, which is the point of the
    // test. Anything else is not.
    expect(blocked).toBeGreaterThan(0);
    const unexpected = errors.consoleErrors.filter(
      e => !/Failed to load resource/.test(e)
    );
    expect(unexpected).toEqual([]);
    errors.consoleErrors.length = 0;

    await page.unroute('**/js/welcome.js');
  });
});

test.describe('with transparency turned down', () => {
  test('the stylesheet turns the frosted panels solid', async ({
    page,
    app,
  }) => {
    // Asserted through the CSSOM rather than by emulating the preference:
    // Playwright cannot set prefers-reduced-transparency, and a test that
    // called emulateMedia and then checked nothing would pass whether or not
    // the rule existed. Reading the parsed rule proves three things instead -
    // that the browser recognised the feature (an unknown one makes the whole
    // block `not all` and it never appears here), that the blur is turned off,
    // and that the surfaces named are the ones that have a blur to turn off.
    await app.boot();

    const rule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin, not ours
        }
        const walk = list => {
          for (const r of list) {
            if (
              r.conditionText &&
              r.conditionText.includes('prefers-reduced-transparency')
            ) {
              const inner = [...r.cssRules];
              return {
                condition: r.conditionText,
                text: inner.map(x => x.cssText).join('\n'),
                // Everything the rule makes opaque, as one selector list.
                selectors: inner
                  .map(x => x.selectorText)
                  .filter(sel => sel && sel !== '*')
                  .join(', '),
              };
            }
            if (r.cssRules) {
              const found = walk(r.cssRules);
              if (found) return found;
            }
          }
          return null;
        };
        const found = walk(rules);
        if (found) return found;
      }
      return null;
    });

    expect(rule).not.toBeNull();
    expect(rule.condition).toContain('reduce');
    expect(rule.text).toMatch(/backdrop-filter:\s*none/);

    // And the list is complete: every element on the page that currently has a
    // blur behind it is matched by the rule that turns it solid. Matched, not
    // named - the rail is #mainControls in the markup and .ui-container in the
    // stylesheet, and a substring check would have missed that they are the
    // same element.
    const uncovered = await page.evaluate(selectors => {
      const missed = [];
      for (const el of document.querySelectorAll('*')) {
        const style = getComputedStyle(el);
        const blur = style.backdropFilter || style.webkitBackdropFilter || '';
        if (!blur.includes('blur')) continue;
        if (!el.matches(selectors)) {
          missed.push(el.id || String(el.className) || el.tagName);
        }
      }
      return missed;
    }, rule.selectors);
    expect(uncovered).toEqual([]);
  });
});
