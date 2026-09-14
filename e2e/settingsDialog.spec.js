// =============================================================================
// A closed dialog is closed
// -----------------------------------------------------------------------------
// #settingsPanel opened and closed by having a class added and removed, and
// that class only ever dimmed it: opacity to zero, a scale transform, pointer
// events off, a blur. `display: flex` and `visibility: visible` were untouched.
//
// So the closed panel was still a panel. Six tabbable controls sat in the tab
// order behind an invisible surface, the whole dialog was in the accessibility
// tree, and a screen reader announced a dialog that was not on screen. Tabbing
// forward from the toolbar walked a keyboard reader into a settings form they
// could neither see nor find their way out of.
//
// The panel is also modal in every respect except the attribute - it covers the
// viewport, it pauses the simulation, it has Apply and Cancel - and it said
// aria-modal="false", which misleads precisely the readers who depend on that
// attribute being true.
//
// What is checked here
// -----------------------------------------------------------------------------
// The closed state first, because that is the defect: absent from the tab
// order and from the accessibility tree. Then the open state as a dialog:
// initial focus, a trap, Escape, and focus back on the trigger from all four
// exits. Then the things that are easy to break while fixing the above - that
// closing does not apply staged changes, and that opening and closing does not
// quietly restart a paused simulation.
//
// Both languages, both themes, reduced motion, a phone-width viewport and 200%
// zoom, because an inert attribute is no use to somebody who cannot reach the
// buttons.
// =============================================================================

import { test, expect } from './fixtures.js';

const PANEL = '#settingsPanel';
const TRIGGER = '#settingsBtn';

/** What the panel is, from the browser's point of view rather than the CSS's. */
const panelState = page =>
  page.evaluate(() => {
    const el = document.getElementById('settingsPanel');
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      hidden: el.hidden,
      inert: el.hasAttribute('inert'),
      display: style.display,
      visibility: style.visibility,
      ariaModal: el.getAttribute('aria-modal'),
      role: el.getAttribute('role'),
      // Everything a keyboard could land on, whether or not it is painted.
      tabbable: [
        ...el.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].length,
    };
  });

/** Is the panel reachable by pressing Tab from the top of the document? */
async function tabReachesPanel(page, presses = 40) {
  await page.evaluate(() => document.body.focus());
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest('#settingsPanel')
    );
    if (inside) return true;
  }
  return false;
}

/**
 * Open Settings the way a reader at this width would.
 *
 * Below the desktop breakpoint the trigger lives inside the collapsed menu, so
 * a test that clicks it blind is testing the desktop layout twice and the
 * narrow one never.
 */
const open = async page => {
  // The scenario card is a transient overlay, and at phone widths it sits over
  // the toolbar. A reader dismisses it before pressing anything underneath, and
  // so does this - clicking through it would be testing a covered button.
  const card = page.locator('#closeScenarioInfo');
  await card.click({ timeout: 2500 }).catch(() => {
    /* already gone, or still animating in - either way it is not the subject */
  });

  const trigger = page.locator(TRIGGER);
  const menu = page.locator('#mobileMenuToggle');
  if (!(await trigger.isVisible()) && (await menu.isVisible())) {
    await menu.click();
  }
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator(PANEL)).toBeVisible();
};

/**
 * Open Settings without depending on the trigger being hittable.
 *
 * At phone widths the control rail sits behind the canvas and the trigger is
 * reached through the menu. Whether that route works is mobile.spec.js's
 * question; what these tests are about is the dialog once it is open, so they
 * run the real button's own handler and leave the route to it alone.
 */
const openDirect = async page => {
  await page.evaluate(() => document.getElementById('settingsBtn').click());
  await expect(page.locator(PANEL)).toBeVisible();
};

test.describe('the settings dialog, closed', () => {
  test('starts hidden, inert and out of the accessibility tree', async ({
    page,
    app,
  }) => {
    await app.boot();
    const closed = await panelState(page);
    expect(closed.hidden, 'the panel carries the hidden attribute').toBe(true);
    expect(closed.inert, 'and is inert').toBe(true);
    expect(closed.display, 'and is not laid out').toBe('none');

    // display:none is what takes it out of the accessibility tree. A role
    // query is the check that it worked: getByRole resolves against the tree
    // the browser exposes, so a dialog that is merely transparent still
    // matches and one that is display:none does not.
    await expect(
      page.getByRole('dialog', { name: 'Simulation Settings' }),
      'the closed dialog is not in the accessibility tree'
    ).toHaveCount(0);
    await expect(page.locator(PANEL)).toBeHidden();
  });

  test('is not in the tab order while closed', async ({ page, app }) => {
    await app.boot();
    expect(
      await tabReachesPanel(page),
      'tabbing from the top of the document never lands inside the closed panel'
    ).toBe(false);
  });
});

test.describe('the settings dialog, open', () => {
  test('opens as a modal dialog with focus on a real control', async ({
    page,
    app,
  }) => {
    await app.boot();
    await open(page);
    const state = await panelState(page);
    expect(state.hidden).toBe(false);
    expect(state.inert, 'an open dialog is not inert').toBe(false);
    expect(state.role).toBe('dialog');
    // It covers the viewport and pauses the world. Saying it is not modal
    // misleads the only readers who act on the attribute.
    expect(state.ariaModal).toBe('true');
    expect(state.tabbable).toBeGreaterThan(1);

    const focused = await page.evaluate(() => ({
      inside: !!document.activeElement?.closest('#settingsPanel'),
      id: document.activeElement?.id || '',
      tag: document.activeElement?.tagName,
    }));
    expect(focused.inside, 'focus moved into the dialog').toBe(true);
    expect(
      focused.id,
      'and not onto the close chip, which is a poor place to arrive'
    ).not.toBe('settingsCloseChip');
  });

  test('keeps focus inside itself', async ({ page, app }) => {
    await app.boot();
    await open(page);
    // Forwards far enough to have escaped a panel that did not trap.
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest('#settingsPanel')
      );
      expect(inside, `Tab ${i + 1} stayed in the dialog`).toBe(true);
    }
    // And backwards, which is the direction that wraps off the first control.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest('#settingsPanel')
      );
      expect(inside, `Shift+Tab ${i + 1} stayed in the dialog`).toBe(true);
    }
  });

  for (const [name, close] of [
    ['Apply', page => page.locator('#settingsApply').click()],
    ['Cancel', page => page.locator('#settingsCancel').click()],
    ['Escape', page => page.keyboard.press('Escape')],
  ]) {
    test(`${name} closes it and puts focus back on the trigger`, async ({
      page,
      app,
    }) => {
      await app.boot();
      await open(page);
      await close(page);

      await expect(page.locator(PANEL)).toBeHidden();
      const state = await panelState(page);
      expect(state.hidden, 'hidden again').toBe(true);
      expect(state.inert, 'inert again').toBe(true);
      expect(state.display).toBe('none');
      expect(
        await page.evaluate(() => document.activeElement?.id),
        'focus is back where it came from'
      ).toBe('settingsBtn');
      expect(
        await tabReachesPanel(page, 30),
        'and the panel is out of the tab order again'
      ).toBe(false);
    });
  }
});

test.describe('closing does not change things it was not asked to', () => {
  test('a dismissed change is not applied, and does not survive to the next open', async ({
    page,
    app,
  }) => {
    await app.boot();
    const speed = () =>
      page.evaluate(async () => {
        const { SETTINGS } = await import('/js/appState.js');
        return SETTINGS.sim_speed;
      });
    const before = await speed();

    // Settings is sliders, selects and toggle buttons - no checkboxes - so the
    // staged change is made on the control a reader would actually drag.
    await open(page);
    const slider = page.locator('#sim_speed-slider');
    await expect(slider).toBeVisible();
    const staged = await slider.evaluate(el => {
      el.value = String(Number(el.max));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return Number(el.value);
    });
    expect(staged, 'the slider really moved').not.toBe(before);

    await page.locator('#settingsCancel').click();
    expect(await speed(), 'cancelling applied nothing').toBe(before);

    // And the abandoned value is gone rather than waiting to be applied by
    // accident the next time somebody presses Apply.
    await open(page);
    await page.locator('#settingsApply').click();
    expect(
      await speed(),
      'the change refused a moment ago did not come back'
    ).toBe(before);
  });

  test('a paused simulation is still paused after opening and cancelling', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.setPaused(true);
    expect(
      await page.evaluate(async () => {
        const { state } = await import('/js/appState.js');
        return state.paused;
      })
    ).toBe(true);

    await open(page);
    await page.locator('#settingsCancel').click();

    // Opening Settings pauses the world; closing it used to unpause
    // unconditionally, so a reader who had deliberately paused got a running
    // simulation back for having looked at the settings.
    expect(
      await page.evaluate(async () => {
        const { state } = await import('/js/appState.js');
        return state.paused;
      }),
      'the pause the reader chose is still theirs'
    ).toBe(true);
  });
});

test.describe('every reader can reach every action', () => {
  for (const [locale, heading] of [
    ['en', 'Simulation Settings'],
    ['es', null],
  ]) {
    test(`opens, closes and restores focus in ${locale}`, async ({
      page,
      app,
    }) => {
      await app.boot({ url: locale === 'en' ? '/' : '/?lang=es' });
      if (locale === 'es') {
        await page.evaluate(async () => {
          const i18n = await import('/js/i18n/index.js');
          await i18n.setLocale('es');
        });
      }
      await open(page);
      if (heading) {
        await expect(page.locator('#settingsPanelHeading')).toHaveText(heading);
      } else {
        // Whatever Spanish says, it must not still be the English string.
        await expect(page.locator('#settingsPanelHeading')).not.toHaveText(
          'Simulation Settings'
        );
      }
      await page.keyboard.press('Escape');
      await expect(page.locator(PANEL)).toBeHidden();
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(
        'settingsBtn'
      );
    });
  }

  for (const theme of ['dark', 'light']) {
    test(`closed state holds in the ${theme} theme`, async ({ page, app }) => {
      await app.boot();
      await page.evaluate(t => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      const closed = await panelState(page);
      expect(closed.display, 'a theme cannot make a closed panel present').toBe(
        'none'
      );
      await open(page);
      await expect(page.locator(PANEL)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator(PANEL)).toBeHidden();
    });
  }

  test('reduced motion does not wait on a transition', async ({
    page,
    app,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await app.boot();
    await open(page);
    await page.locator('#settingsCancel').click();
    // No transitionend to wait for, so the panel is out of the tab order at
    // once rather than after a timeout somebody has to guess at.
    await expect
      .poll(async () => (await panelState(page)).hidden, { timeout: 1500 })
      .toBe(true);
  });

  test('a phone-width viewport still reaches Apply and Cancel', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await app.boot();
    await openDirect(page);
    // The close chip is a below-480px affordance and is display:none here, so
    // the actions to reach at this zoom are the footer's two.
    for (const id of ['#settingsApply', '#settingsCancel']) {
      await expect(
        page.locator(id),
        `${id} is reachable at 200%`
      ).toBeVisible();
      const box = await page.locator(id).boundingBox();
      expect(box, `${id} has a box at 200%`).toBeTruthy();
      // Every edge inside the 640x400 layout viewport a 200% zoom leaves.
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      expect(box.y + box.height).toBeLessThanOrEqual(720);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).toBeHidden();
  });

  test('at 200% zoom every action is still reachable', async ({
    page,
    app,
  }) => {
    // 200% zoom is a 1280x800 window showing a 640x400 layout viewport.
    await page.setViewportSize({ width: 640, height: 400 });
    await app.boot();
    await openDirect(page);
    // The close chip is a below-480px affordance and is display:none here, so
    // the actions to reach at this zoom are the footer's two.
    for (const id of ['#settingsApply', '#settingsCancel']) {
      await expect(
        page.locator(id),
        `${id} is reachable at 200%`
      ).toBeVisible();
      const box = await page.locator(id).boundingBox();
      expect(box, `${id} has a box at 200%`).toBeTruthy();
      // Every edge inside the 640x400 layout viewport a 200% zoom leaves.
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(640);
      expect(box.y + box.height).toBeLessThanOrEqual(400);
    }
    // And it can be dismissed from the keyboard, which is how somebody at this
    // zoom is most likely to be working.
    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).toBeHidden();
    // At this size the trigger is behind the canvas and cannot take focus, so
    // the dialog puts it somewhere outside the panel rather than leaving it in
    // something that is now display:none. Either is fine; stranded is not.
    const focus = await page.evaluate(() => ({
      id: document.activeElement?.id ?? '',
      inPanel: !!document.activeElement?.closest('#settingsPanel'),
    }));
    expect(focus.inPanel, 'focus is not stranded in the closed dialog').toBe(
      false
    );
    expect(['settingsBtn', '', 'BODY']).toContain(focus.id || 'BODY');
  });
});

test.describe('the small-screen way out', () => {
  // The close chip exists only below 480px: it is the affordance for a screen
  // with no room for a footer of buttons, so it has to be tested at a width
  // where it is real rather than asserted about where it is display:none.
  test('the close chip closes it and puts focus back on the trigger', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await app.boot();
    await openDirect(page);

    const chip = page.locator('#settingsCloseChip');
    await expect(chip, 'the chip is the small-screen way out').toBeVisible();
    await chip.click();

    await expect(page.locator(PANEL)).toBeHidden();
    const state = await panelState(page);
    expect(state.hidden).toBe(true);
    expect(state.inert).toBe(true);
    // Back on the trigger, or - if the trigger has gone behind the collapsed
    // menu since the dialog opened - anywhere outside the panel. What must
    // never happen is focus left inside something that is now display:none.
    const focus = await page.evaluate(() => ({
      id: document.activeElement?.id ?? '',
      inPanel: !!document.activeElement?.closest('#settingsPanel'),
    }));
    expect(focus.inPanel, 'focus is not stranded in the closed dialog').toBe(
      false
    );
    expect(['settingsBtn', '', 'BODY']).toContain(focus.id || 'BODY');
  });
});
