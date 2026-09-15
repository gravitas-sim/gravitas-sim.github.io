// =============================================================================
// Can a student actually reach the controls?
// -----------------------------------------------------------------------------
// A Universe of Stars now asks readers to select a star, move a "which star"
// control and drag a brightness threshold, all while the main canvas, the
// lesson panel and the instrument are on screen together. Every one of those
// is a thing a panel can cover.
//
// The check is deliberately not "does the element exist". An element that
// exists behind another element is exactly the failure: the light-curve panel
// covering the lesson's object list at 390px passed every existence check in
// the suite. So these ask the document what is actually on top at the point a
// reader would press, and drive the controls by keyboard as well as by value.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'a-universe-of-stars';

const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 820, height: 900 },
  { name: 'mobile', width: 390, height: 780 },
];

async function openLesson(page, app, { locale } = {}) {
  await app.boot();
  if (locale) {
    await page.evaluate(async name => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(name, { persist: false });
    }, locale);
  }
  // Through the rail where the rail is there. At the smallest sizes it
  // collapses, so the lesson is opened the way a shared link opens it - which
  // is a real path a reader arrives by, and keeps this file about the
  // lesson's own layout rather than about the rail's.
  const rail = page.locator('#investigationsBtn');
  if (await rail.isVisible().catch(() => false)) {
    await rail.click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
  } else {
    await page.evaluate(async id => {
      const loader = await import('/js/investigationsLoader.js');
      await (await loader.ensureInvestigations()).openInvestigation(id);
    }, LESSON);
  }
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

/**
 * Wait until the comparison card has actually seeded itself from the stage.
 *
 * A fixed sleep here is the classic way to write a test that passes alone and
 * fails in a parallel run: the instrument is repainted from the probe tick, so
 * how long it takes depends on what else the machine is doing.
 */
async function cardReady(page, atLeast = 2) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const w = await import('/js/stellarWidgets.js');
          return w.activeLab()?.pinned?.length ?? 0;
        }),
      { timeout: 15_000 }
    )
    .toBeGreaterThanOrEqual(atLeast);
}

async function goTo(page, title) {
  for (let n = 0; n < 40; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    await page.locator('#investigationNext').click();
    await page.waitForTimeout(110);
  }
  throw new Error(`never reached "${title}"`);
}

/**
 * Is this control the thing a press would land on?
 *
 * elementFromPoint at its center, walked back up through its own children.
 * Anything else on top means the reader cannot use it, whatever the DOM says.
 */
const reachable = (page, selector) =>
  page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return 'missing';
    // Scrolled to first, because the lesson panel scrolls and a reader
    // scrolls it. What is being asked is "can they get to it", not "is it
    // above the fold" - the failure this catches is a control that is on
    // screen and underneath something else.
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return 'collapsed';
    if (r.bottom < 0 || r.top > window.innerHeight) return 'offscreen';
    const hit = document.elementFromPoint(
      Math.round(r.left + r.width / 2),
      Math.round(r.top + r.height / 2)
    );
    if (!hit) return 'nothing there';
    return el.contains(hit) || hit.contains(el)
      ? 'ok'
      : `covered by ${hit.tagName.toLowerCase()}.${hit.className || '(none)'}`;
  }, selector);

for (const size of SIZES) {
  test.describe(`at ${size.name} (${size.width}px)`, () => {
    test('the controls the step asks for are reachable', async ({
      page,
      app,
    }) => {
      test.slow();
      await page.setViewportSize({ width: size.width, height: size.height });
      await openLesson(page, app);
      await goTo(page, 'Measure it');
      await cardReady(page);

      // The step tells the reader to select each star and read a radius, so
      // all three of these have to be usable at once.
      for (const sel of [
        '#investigationToolControls [data-tool="focus"]',
        '#investigationToolReadout',
        '#investigationObjects [data-object-id]',
      ]) {
        expect(await reachable(page, sel), `${sel} at ${size.width}px`).toBe(
          'ok'
        );
      }
      // And the answer boxes the step grades.
      expect(await reachable(page, '.inv-fields input[data-field]')).toBe('ok');
    });

    test('the population threshold is reachable with the scene up', async ({
      page,
      app,
    }) => {
      test.slow();
      await page.setViewportSize({ width: size.width, height: size.height });
      await openLesson(page, app);
      await goTo(page, 'Now only the ones you could see');
      await page.waitForTimeout(700);
      expect(
        await reachable(
          page,
          '#investigationToolControls [data-tool="threshold"]'
        )
      ).toBe('ok');
      expect(await reachable(page, '#investigationToolReadout')).toBe('ok');
    });

    test('nothing makes the page scroll sideways', async ({ page, app }) => {
      test.slow();
      await page.setViewportSize({ width: size.width, height: size.height });
      await openLesson(page, app);
      await goTo(page, 'And now a supergiant');
      await page.waitForTimeout(400);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(over).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('the stars a step asks a reader to click', () => {
  test('are all inside the canvas, and none under the furniture', async ({
    page,
    app,
  }) => {
    test.slow();
    // Desktop only, and deliberately. Below about 900px the lesson panel and
    // the instrument stack full-width and cover the canvas completely - that
    // is the application's existing responsive layout, not something this
    // lesson decides - so there is no canvas to click and the step offers two
    // other routes to the same star. Those are tested below.
    await page.setViewportSize({ width: 1440, height: 900 });
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await cardReady(page);

    const placed = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { worldToScreen } = await import('/js/utils.js');
      const { state } = await import('/js/appState.js');
      const canvas = document.getElementById('simulationCanvas');
      const box = canvas.getBoundingClientRect();
      // The backing store can be larger than the CSS box on a retina
      // viewport, so the projection's pixels are scaled into CSS pixels
      // before anything is asked about what is on top of them.
      const sx = box.width / canvas.width;
      const sy = box.height / canvas.height;
      return p.stars.map(s => {
        const pt = worldToScreen(s.pos, state, canvas);
        const x = box.left + pt.x * sx;
        const y = box.top + pt.y * sy;
        const hit = document.elementFromPoint(Math.round(x), Math.round(y));
        return {
          name: s.name,
          inside:
            x > box.left && x < box.right && y > box.top && y < box.bottom,
          over: hit ? `${hit.tagName.toLowerCase()}#${hit.id || ''}` : null,
        };
      });
    });
    expect(placed.length).toBeGreaterThan(1);
    for (const star of placed) {
      expect(
        `${star.name}: ${star.inside ? 'inside' : 'OUTSIDE the canvas'}`
      ).toContain('inside');
      // The one that actually happened: the second star of a two-star shelf
      // sat under the main control rail, because the stage fitted itself to
      // the window rather than to the clear part of it.
      expect(`${star.name} is under ${star.over}`).toContain(
        'simulationCanvas'
      );
    }
  });

  for (const size of SIZES.filter(x => x.name !== 'desktop')) {
    test(`can be chosen without the canvas at ${size.name}`, async ({
      page,
      app,
    }) => {
      test.slow();
      await page.setViewportSize({ width: size.width, height: size.height });
      await openLesson(page, app);
      await goTo(page, 'Measure it');
      await cardReady(page);

      // The step names three ways to choose a star and only one of them is the
      // canvas. On a narrow window the canvas is behind the panels, so these
      // two are not a fallback - they are how the step is done.
      const control = page.locator(
        '#investigationToolControls [data-tool="focus"]'
      );
      await control.scrollIntoViewIfNeeded();
      await control.fill('2');
      await control.dispatchEvent('input');
      await page.waitForTimeout(400);
      const viaControl = await page.evaluate(async () => {
        const { state } = await import('/js/appState.js');
        const w = await import('/js/stellarWidgets.js');
        const lab = w.activeLab();
        return {
          scene: state.selectedObject?.object?.name ?? null,
          card: lab.pinned.find(p => p.pinId === lab.focusPinId)?.name ?? null,
        };
      });
      expect(viaControl.card).toBeTruthy();
      expect(viaControl.scene).toBe(viaControl.card);

      // Selecting a star opens its card, and this lesson wants that - it sets
      // `lock.inspector: false` so readers can look one up. On a phone the
      // card fills the screen, so getting back to the list means closing it,
      // and the close control has to be there and has to work. That is the
      // difference between awkward and impossible.
      const close = page.locator('#inspectorClose');
      if (await close.isVisible().catch(() => false)) {
        await close.click();
        await expect(page.locator('#objectInspector')).not.toBeVisible();
      }

      // And the object list, which is the same act by keyboard. Closing the
      // card cleared the selection, so the list has just been rebuilt - the
      // locator is re-resolved by click() rather than held across that.
      const first = page
        .locator('#investigationObjects [data-object-id]')
        .first();
      await expect(first).toBeVisible();
      await first.click();
      await page.waitForTimeout(600);
      const viaList = await page.evaluate(async () => {
        const { state } = await import('/js/appState.js');
        const w = await import('/js/stellarWidgets.js');
        const lab = w.activeLab();
        return {
          scene: state.selectedObject?.object?.name ?? null,
          card: lab.pinned.find(p => p.pinId === lab.focusPinId)?.name ?? null,
        };
      });
      expect(viaList.scene).toBeTruthy();
      expect(viaList.card).toBe(viaList.scene);
      expect(viaList.scene).not.toBe(viaControl.scene);
    });
  }
});

test.describe('at 200% zoom', () => {
  test('the instrument and the answer boxes still fit together', async ({
    page,
    app,
  }) => {
    test.slow();
    // A 200% reader on a laptop: half the CSS pixels in each direction.
    await page.setViewportSize({ width: 720, height: 450 });
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await cardReady(page);
    for (const sel of [
      '#investigationToolControls [data-tool="focus"]',
      '.inv-fields input[data-field]',
    ]) {
      expect(await reachable(page, sel), `${sel} at 200%`).toBe('ok');
    }
  });
});

test.describe('without a pointer', () => {
  test('the focus control can be reached and moved by keyboard alone', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await cardReady(page);

    const control = page.locator(
      '#investigationToolControls [data-tool="focus"]'
    );
    await control.focus();
    await expect(control).toBeFocused();
    const before = await control.inputValue();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);
    const after = await control.inputValue();
    expect(after).not.toBe(before);

    // And it did something: the star it names is the one the scene selected.
    const chosen = await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      const w = await import('/js/stellarWidgets.js');
      const lab = w.activeLab();
      const pin = lab.pinned.find(p => p.pinId === lab.focusPinId);
      return {
        scene: state.selectedObject?.object?.name ?? null,
        pin: pin?.name ?? null,
      };
    });
    expect(chosen.pin).toBeTruthy();
    expect(chosen.scene).toBe(chosen.pin);
  });

  test('the object list reaches the same stars', async ({ page, app }) => {
    test.slow();
    await openLesson(page, app);
    await goTo(page, 'Measure it');
    await cardReady(page);
    const buttons = page.locator('#investigationObjects [data-object-id]');
    await expect(buttons.first()).toBeVisible();
    await buttons.nth(1).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    const seen = await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      const w = await import('/js/stellarWidgets.js');
      const lab = w.activeLab();
      return {
        scene: state.selectedObject?.object?.name ?? null,
        focus: lab.pinned.find(p => p.pinId === lab.focusPinId)?.name ?? null,
      };
    });
    expect(seen.scene).toBeTruthy();
    // Choosing from the list is choosing on the canvas, and the card follows.
    expect(seen.focus).toBe(seen.scene);
  });
});

test.describe('in Spanish', () => {
  test('the stars are named in Spanish everywhere they are named', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app, { locale: 'es' });
    await goTo(page, 'Mídelo');
    await cardReady(page);

    const names = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const w = await import('/js/stellarWidgets.js');
      return {
        canvas: p.stars.map(s => s.name),
        card: (w.activeLab()?.pinned ?? []).map(x => x.name),
        list: [
          ...document.querySelectorAll(
            '#investigationObjects [data-object-id]'
          ),
        ].map(b => b.innerText),
      };
    });
    expect(names.canvas).toContain('La más pequeña');
    expect(names.card).toEqual(names.canvas);
    expect(names.list.join(' | ')).toContain('La más pequeña');
    // And the English name is nowhere, which is the actual regression risk:
    // one of the three reading from the untranslated declaration.
    expect(JSON.stringify(names)).not.toContain('The smaller one');
  });

  test('the readout and the controls are Spanish and reachable', async ({
    page,
    app,
  }) => {
    test.slow();
    await openLesson(page, app, { locale: 'es' });
    await goTo(page, 'Mídelo');
    await cardReady(page);
    expect(
      await reachable(page, '#investigationToolControls [data-tool="focus"]')
    ).toBe('ok');
    const labels = await page
      .locator('#investigationToolControls label')
      .allInnerTexts();
    expect(labels.join(' ')).toContain('Qué estrella');
  });
});
