// =============================================================================
// The Add object picker stays on the screen, at every width
// -----------------------------------------------------------------------------
// Two reports met in this popover.
//
// It was clipped. It was an absolutely positioned descendant of `.ui-container`,
// which scrolls its own overflow so the rail can outgrow a short window - and
// an overflow container clips absolutely positioned descendants. Scroll the
// rail, or open the picker from a button near the bottom of a short viewport,
// and the list was cut in half or gone. It is now parented to <body>, fixed,
// and positioned from the trigger's rect.
//
// And it vanished with the rail. At 1024px and below every button click in the
// rail closed the menu, including the press that opens this popover - so the
// rail shut before a single object type could be read.
//
// The assertion that matters is geometric and the same at every size: with the
// picker open, all four of its edges are inside the viewport, and every object
// type can be reached from the keyboard.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The sizes the brief names, plus the short desktop that provoked the clip. */
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 700 },
  { name: 'tablet', width: 1024, height: 700 },
  { name: 'phone', width: 480, height: 700 },
  { name: 'short desktop', width: 1440, height: 420 },
];

/** True where the rail is a menu behind the hamburger rather than a column. */
const isNarrow = width => width <= 1024;

/** Open the picker the way a reader does, whatever the layout. */
async function openPicker(page, width) {
  if (isNarrow(width)) {
    const toggle = page.locator('#mobileMenuToggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('.ui-container')).toHaveClass(/is-open/);
  }
  const trigger = page.locator('#objectTypeBtn');
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const picker = page.locator('#objectTypePicker');
  await expect(picker).toBeVisible();
  return picker;
}

/** The picker's box and the viewport, as the browser sees them. */
function geometry(page) {
  return page.evaluate(() => {
    const el = document.getElementById('objectTypePicker');
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      left: r.left,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
      position: getComputedStyle(el).position,
      parent: el.parentElement.tagName,
      vw: document.documentElement.clientWidth,
      vh: document.documentElement.clientHeight,
    };
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`at ${vp.width}x${vp.height} (${vp.name})`, () => {
    test('the open picker is entirely inside the viewport', async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await app.boot();
      await openPicker(page, vp.width);

      const g = await geometry(page);
      // Parented to the document, not to the scrolling rail. This is the fix
      // itself: nothing inside an overflow container can be relied on to stay
      // visible outside it.
      expect(g.parent).toBe('BODY');
      expect(g.position).toBe('fixed');

      // All four edges. A one-pixel tolerance for sub-pixel rounding in the
      // placement, and nothing more.
      expect(g.left).toBeGreaterThanOrEqual(-1);
      expect(g.top).toBeGreaterThanOrEqual(-1);
      expect(g.right).toBeLessThanOrEqual(g.vw + 1);
      expect(g.bottom).toBeLessThanOrEqual(g.vh + 1);
      expect(g.width).toBeGreaterThan(80);
      expect(g.height).toBeGreaterThan(40);
    });

    test('every object type is reachable from the keyboard', async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await app.boot();
      const picker = await openPicker(page, vp.width);

      const types = await picker
        .locator('.object-picker-item')
        .evaluateAll(nodes => nodes.map(n => n.dataset.objectType));
      expect(types.length).toBeGreaterThan(4);

      // Opening focuses the first row; Down walks the rest. Each one is
      // asserted to be the focused element, so a row scrolled out of an
      // internally scrolling popover still has to be focusable.
      const reached = [];
      for (let i = 0; i < types.length; i++) {
        const focused = await page.evaluate(
          () => document.activeElement?.dataset?.objectType ?? null
        );
        if (focused) reached.push(focused);
        await page.keyboard.press('ArrowDown');
      }
      expect(reached).toEqual(types);
    });

    test('a long list scrolls inside itself rather than off the screen', async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await app.boot();
      await openPicker(page, vp.width);
      const g = await geometry(page);
      // Either it fits, or it scrolls. What it may not do is overflow the
      // viewport, which the previous test has already ruled out.
      expect(['auto', 'scroll']).toContain(g.overflowY);
      if (g.scrollHeight > g.clientHeight + 1) {
        expect(g.bottom).toBeLessThanOrEqual(g.vh + 1);
      }
    });
  });
}

test.describe('the rail on a narrow screen', () => {
  test('opening the picker does not dismiss the rail', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await app.boot();

    const rail = page.locator('.ui-container');
    await page.locator('#mobileMenuToggle').click();
    await expect(rail).toHaveClass(/is-open/);

    await page.locator('#objectTypeBtn').click();

    // The whole defect in one assertion: the rail used to close on this press,
    // taking the picker with it before a choice could be made.
    await expect(rail).toHaveClass(/is-open/);
    await expect(page.locator('#objectTypePicker')).toBeVisible();
  });

  test('choosing a type arms placement and then puts the rail away', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await app.boot();

    const rail = page.locator('.ui-container');
    await page.locator('#mobileMenuToggle').click();
    await page.locator('#objectTypeBtn').click();
    await page.locator('#objectTypePicker [data-object-type="Comet"]').click();

    await expect(page.locator('#objectTypePicker')).toBeHidden();
    await expect(page.locator('#objectTypeBtn')).toHaveClass(/is-armed/);
    // Deliberately, now that the reader has what they came for: the canvas is
    // what they need next and the rail is covering it.
    await expect(rail).not.toHaveClass(/is-open/);
    expect(
      await page.evaluate(() => document.body.classList.contains('is-adding'))
    ).toBe(true);
  });

  test('Escape closes only the picker, leaving the rail and the focus intact', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await app.boot();

    const rail = page.locator('.ui-container');
    await page.locator('#mobileMenuToggle').click();
    await page.locator('#objectTypeBtn').click();
    await expect(page.locator('#objectTypePicker')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('#objectTypePicker')).toBeHidden();
    // Escape is also a global shortcut that closes this rail. If both ran, the
    // focus would be returned to a trigger inside a rail that had just been
    // shut around it - visible to nobody and reachable by nothing.
    await expect(rail).toHaveClass(/is-open/);
    await expect(page.locator('#objectTypeBtn')).toBeFocused();
  });

  test('a click inside the picker does not count as a click outside the rail', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 480, height: 700 });
    await app.boot();

    await page.locator('#mobileMenuToggle').click();
    await page.locator('#objectTypeBtn').click();
    const picker = page.locator('#objectTypePicker');
    await expect(picker).toBeVisible();

    // Press the popover's own padding - inside it, but not on a row. It is
    // outside the rail in the DOM now, so the rail's outside-click handler
    // sees it and must ignore it.
    const box = await picker.boundingBox();
    await page.mouse.click(Math.round(box.x + 3), Math.round(box.y + 3));
    await expect(picker).toBeVisible();
    await expect(page.locator('.ui-container')).toHaveClass(/is-open/);
  });
});

test.describe('the picker keeps its manners', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
  });

  test('the trigger and the popover describe each other', async ({
    page,
    app,
  }) => {
    await app.boot();
    const trigger = page.locator('#objectTypeBtn');
    await expect(trigger).toHaveAttribute('aria-controls', 'objectTypePicker');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await openPicker(page, 1440);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const picker = page.locator('#objectTypePicker');
    await expect(picker).toHaveAttribute('role', 'menu');
    await expect(picker).toHaveAttribute('aria-labelledby', 'objectTypeBtn');
    await expect(picker.locator('.object-picker-item').first()).toHaveAttribute(
      'role',
      'menuitemradio'
    );
  });

  test('Escape closes it and gives the focus back', async ({ page, app }) => {
    await app.boot();
    await openPicker(page, 1440);
    await page.keyboard.press('Escape');
    await expect(page.locator('#objectTypePicker')).toBeHidden();
    await expect(page.locator('#objectTypeBtn')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.locator('#objectTypeBtn')).toBeFocused();
  });

  test('a click on the canvas closes it', async ({ page, app }) => {
    await app.boot();
    await openPicker(page, 1440);
    const box = await page.locator('#simulationCanvas').boundingBox();
    await page.mouse.click(
      Math.round(box.x + box.width * 0.3),
      Math.round(box.y + box.height * 0.4)
    );
    await expect(page.locator('#objectTypePicker')).toBeHidden();
  });

  test('it follows the trigger when the rail is scrolled', async ({
    page,
    app,
  }) => {
    // The rail's content is a fixed height, so it only overflows below about
    // 500px of window. This size scrolls it while still leaving the popover
    // room to sit against the button rather than being pinned to the viewport,
    // which is what makes the movement observable at all.
    await page.setViewportSize({ width: 1440, height: 460 });
    await app.boot();
    await openPicker(page, 1440);

    /** Where the popover sits relative to the button it hangs off. */
    const relationship = () =>
      page.evaluate(() => {
        const el = document.getElementById('objectTypePicker');
        const btn = document.getElementById('objectTypeBtn');
        const p = el.getBoundingClientRect();
        const b = btn.getBoundingClientRect();
        return {
          triggerTop: b.top,
          gapAbove: b.top - p.bottom,
          gapBelow: p.top - b.bottom,
          top: p.top,
          bottom: p.bottom,
          vh: document.documentElement.clientHeight,
        };
      });

    /** Put the rail at a scroll position and let the listener react. */
    const scrollRailTo = where =>
      page.evaluate(async to => {
        const rail = document.querySelector('.ui-container');
        const max = rail.scrollHeight - rail.clientHeight;
        if (max <= 8) return -1;
        rail.scrollTop = to === 'top' ? 0 : max;
        rail.dispatchEvent(new window.Event('scroll'));
        await new Promise(r => window.requestAnimationFrame(() => r()));
        return rail.scrollTop;
      }, where);

    // Opening the picker scrolls the trigger into view, so the rail is already
    // at the bottom. Start from a known position instead of that one.
    const atTop = await scrollRailTo('top');
    // Asserted rather than skipped: a test that quietly does not run is a test
    // that cannot fail, and the whole point of this size is that the rail here
    // does scroll.
    expect(atTop).toBe(0);
    const before = await relationship();

    const atBottom = await scrollRailTo('bottom');
    expect(atBottom).toBeGreaterThan(8);
    const after = await relationship();

    // The trigger moved, which is what makes the rest of this meaningful.
    expect(after.triggerTop).not.toBe(before.triggerTop);
    // And the popover moved with it rather than staying at a stale position.
    // How far is not asserted: this popover is nearly as tall as any window
    // short enough to scroll the rail, so the placement legitimately clamps to
    // the viewport rather than hanging off it. What matters is that it is
    // recomputed at all, and that the result is still on screen.
    expect(after.top).not.toBe(before.top);
    expect(after.top).toBeGreaterThanOrEqual(-1);
    expect(after.bottom).toBeLessThanOrEqual(after.vh + 1);
  });

  test('it is repositioned when the window changes size', async ({
    page,
    app,
  }) => {
    await app.boot();
    await openPicker(page, 1440);
    const before = await geometry(page);

    await page.setViewportSize({ width: 900, height: 380 });
    await page.evaluate(
      () => new Promise(r => window.requestAnimationFrame(() => r()))
    );
    const after = await geometry(page);

    expect(after.vw).toBe(900);
    expect(after.left).toBeGreaterThanOrEqual(-1);
    expect(after.top).toBeGreaterThanOrEqual(-1);
    expect(after.right).toBeLessThanOrEqual(after.vw + 1);
    expect(after.bottom).toBeLessThanOrEqual(after.vh + 1);
    expect(after.left).not.toBe(before.left);
  });
});
