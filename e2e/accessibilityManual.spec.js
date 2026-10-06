// =============================================================================
// Accessibility: the things axe cannot check
// -----------------------------------------------------------------------------
// axe is very good at "this control has no name" and useless at "this dialog
// traps focus but never gives it back". The criteria below are the ones a
// person has to reason about, written down as assertions so that the reasoning
// only has to happen once.
//
// Each test states the criterion it is defending, because an accessibility
// test that fails six months from now should say what the reader loses rather
// than which selector moved.
// =============================================================================

import { test, expect } from './fixtures.js';
import { stepKey, focusStop, strayStops, TOOLBAR } from './keyboard.js';

/** The modal surfaces, and how each one is opened and dismissed. */
const DIALOGS = [
  {
    name: 'scenario gallery',
    opener: '#loadScenarioBtn',
    dialog: '#scenarioListModal',
    // The backdrop is #scenarioListModal; the element carrying role="dialog"
    // and aria-modal is the content inside it, and that is what a focus trap
    // has to keep focus within.
    modal: '#scenarioListContent',
    rail: 'loadScenarioBtn',
  },
  {
    name: 'share dialog',
    opener: '#shareBtn',
    dialog: '#shareModal',
    modal: '#shareContent',
    rail: 'shareBtn',
  },
  {
    name: 'investigations browser',
    opener: '#investigationsBtn',
    dialog: '#investigationBrowser',
    modal: '#investigationBrowserContent',
  },
  // These two had no trap and gave focus back to nothing until they moved
  // onto js/dialog.js with the others (Prompt 52).
  {
    name: 'export dialog',
    opener: '#exportDataBtn',
    dialog: '#dataExport',
    modal: '#dataExportContent',
    rail: 'exportDataBtn',
    // Radios and buttons only: nothing Safari's plain Tab stops on, so in
    // WebKit on macOS every Tab is the trip to the toolbar (e2e/keyboard.js).
    safariStops: false,
  },
  {
    name: 'shortcut list',
    opener: '#shortcutsBtn',
    dialog: '#shortcutOverlay',
    modal: '#shortcutOverlay',
    rail: 'shortcutsBtn',
  },
];

test.describe('keyboard operation', () => {
  test('every focusable control shows a visible focus indicator', async ({
    page,
    app,
  }) => {
    // 2.4.7 Focus Visible, and 2.4.11 Focus Not Obscured. A keyboard reader who
    // cannot see where they are cannot use the application at all, and a focus
    // ring that only some controls have is worse than none because it looks
    // like nothing is focused.
    await app.boot();

    const bad = await page.evaluate(() => {
      const visible = el => {
        const s = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        return (
          s.display !== 'none' &&
          s.visibility !== 'hidden' &&
          b.width > 0 &&
          b.height > 0 &&
          // Inside a closed <details> (the shell's navigation groups) a link
          // has a box but is not rendered, and cannot take focus until the
          // group is opened; the shell's own spec opens and focuses them.
          (!el.checkVisibility || el.checkVisibility())
        );
      };
      const out = [];
      const controls = [
        ...document.querySelectorAll(
          'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
        ),
      ].filter(visible);
      for (const el of controls) {
        el.focus();
        const s = getComputedStyle(el);
        const ring =
          (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
          s.boxShadow !== 'none';
        if (!ring) out.push(el.id || el.className || el.tagName);
      }
      return out;
    });

    expect(bad, `no focus indicator on: ${bad.join(', ')}`).toEqual([]);
  });

  test('nothing jumps the queue with a positive tabindex', async ({
    page,
    app,
  }) => {
    // 2.4.3 Focus Order. A positive tabindex takes an element out of document
    // order and puts it in front of everything that has none, which reorders
    // the whole page for a keyboard reader and for nobody else.
    await app.boot();
    const positive = await page.evaluate(() =>
      [...document.querySelectorAll('[tabindex]')]
        .filter(el => Number(el.getAttribute('tabindex')) > 0)
        .map(el => el.id || el.className)
    );
    expect(positive).toEqual([]);
  });

  test('the skip link is the first stop and goes somewhere real', async ({
    page,
    app,
    browserName,
  }) => {
    // 2.4.1 Bypass Blocks. Pressed with the key that reaches links: Safari's
    // plain Tab skips them, and in WebKit on macOS it went to <body> every time.
    await app.boot();
    await page.keyboard.press(stepKey(browserName));
    const first = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        cls: (el?.className || '').toString(),
        href: el?.getAttribute('href'),
        targetExists: el?.getAttribute('href')
          ? Boolean(document.querySelector(el.getAttribute('href')))
          : false,
      };
    });
    expect(first.cls).toContain('skip-link');
    expect(first.targetExists).toBe(true);
  });
});

test.describe('dialogs', () => {
  for (const d of DIALOGS) {
    test(`${d.name}: Escape closes it and focus comes back`, async ({
      page,
      app,
    }) => {
      // 2.1.2 No Keyboard Trap, and the focus-restoration half of 2.4.3. A
      // dialog that closes without returning focus drops a keyboard reader at
      // the top of the document, which after three dialogs is unusable.
      await app.boot();
      if (d.rail) await app.railControl(d.rail);

      // Opened from the keyboard, because that is the reader in question. A
      // click is a different thing in each engine: Safari does not focus a
      // clicked button, so in WebKit the click moved focus from the opener to
      // the rail region around it, and the gallery and the investigations
      // browser gave it back there - where Safari had put it, but not what
      // this is testing.
      await page.locator(d.opener).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator(d.dialog)).toBeVisible({ timeout: 20_000 });

      await page.keyboard.press('Escape');
      await expect(page.locator(d.dialog)).toBeHidden({ timeout: 20_000 });

      const focused = await page.evaluate(() => document.activeElement?.id);
      expect(
        focused,
        `focus went to "${focused}" rather than back to the control that opened the dialog`
      ).toBe(d.opener.replace('#', ''));
    });

    test(`${d.name}: focus stays inside while it is open`, async ({
      page,
      app,
      browserName,
    }) => {
      // A modal that lets Tab wander behind it puts a keyboard reader in a
      // dialog they cannot see and cannot leave.
      await app.boot();
      if (d.rail) await app.railControl(d.rail);
      await page.locator(d.opener).click();
      await expect(page.locator(d.dialog)).toBeVisible({ timeout: 20_000 });

      // Asserted rather than skipped on. The first version of this test read
      // aria-modal off the backdrop, found nothing, and quietly skipped all
      // three - a green run that checked nothing at all.
      const modal = await page.locator(d.modal).getAttribute('aria-modal');
      expect(modal, `${d.modal} does not declare aria-modal`).toBe('true');

      // Twenty stops is more than any of these dialogs contains, so if focus
      // can escape it will have done so by then. Plain Tab in every engine:
      // in WebKit on macOS it is Safari's route, which stops only on text
      // fields and pop-up menus and leaves for the toolbar after the last one.
      // That stop reads as <body>, and it is allowed (e2e/keyboard.js). A
      // control behind the dialog is not.
      const stops = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        stops.push(await page.evaluate(focusStop, d.modal));
      }
      expect(
        strayStops(stops),
        `focus left ${d.name} for the page behind: ${stops.join(', ')}`
      ).toEqual([]);
      // Unless the dialog has no stop on Safari's route, where the toolbar is
      // the only place a plain Tab can go and staying out of the page behind
      // is the whole of the claim.
      if (browserName !== 'webkit' || d.safariStops !== false)
        expect(
          stops.filter(stop => stop !== TOOLBAR),
          'and Tab ever brought it back into the dialog'
        ).not.toEqual([]);
    });
  }
});

test.describe('every modal keeps the same keys', () => {
  // One module (js/dialog.js) opens all of them now, so the keys a reader
  // learns in one hold in the next: Space opens it from its button, Shift+Tab
  // wraps without leaving, and Escape gives focus back.
  for (const d of DIALOGS) {
    test(`${d.name}: Space opens it, and Shift+Tab never leaves it`, async ({
      page,
      app,
    }) => {
      await app.boot();
      if (d.rail) await app.railControl(d.rail);
      await page.locator(d.opener).focus();
      await page.keyboard.press('Space');
      await expect(page.locator(d.dialog)).toBeVisible({ timeout: 20_000 });
      // Focus arrives inside: a modal with focus behind it is not one.
      await expect.poll(() => page.evaluate(focusStop, d.modal)).toBe('inside');

      const stops = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Shift+Tab');
        stops.push(await page.evaluate(focusStop, d.modal));
      }
      expect(
        strayStops(stops),
        `Shift+Tab left ${d.name} for the page behind: ${stops.join(', ')}`
      ).toEqual([]);
    });
  }

  test('E opens the export dialog before Export has ever been pressed', async ({
    page,
    app,
  }) => {
    await app.boot();
    // The shortcut imported the dialog and opened it uninitialised, so it did
    // nothing until the button had been used once.
    await page
      .locator('#simulationCanvas')
      .click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('e');
    await expect(page.locator('#dataExportContent')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dataExportContent')).toBeHidden();
  });

  test('the lecture sequence: in, around and out by the keyboard', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.keyboard.press('v');
    await expect
      .poll(() =>
        page.evaluate(() => document.body.getAttribute('data-presentation'))
      )
      .toBe('lecture');
    await page.locator('#lectureSequenceBtn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#lectureSequenceSheet')).toBeVisible();
    await expect(page.locator('#lectureSequenceText')).toBeFocused();

    const stops = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
      stops.push(await page.evaluate(focusStop, '#lectureSequenceDialog'));
    }
    expect(strayStops(stops)).toEqual([]);

    // Escape closes the sheet and leaves Lecture Mode where it was.
    await page.keyboard.press('Escape');
    await expect(page.locator('#lectureSequenceSheet')).toBeHidden();
    await expect(page.locator('#lectureSequenceBtn')).toBeFocused();
    expect(
      await page.evaluate(() => document.body.getAttribute('data-presentation'))
    ).toBe('lecture');
  });

  test('the lesson finish: Tab stays in it and Escape returns to Next', async ({
    page,
    app,
  }) => {
    // Opened on the last step through the authoring preview, as
    // e2e/investigations.spec.js does: what is checked is the dialog.
    await app.boot({ url: '/?author=keplers-laws&step=1' });
    const total = await page.evaluate(async () => {
      const data = await import('/js/data/investigations.js');
      return data.getInvestigation('keplers-laws').steps.length;
    });
    await app.boot({ url: `/?author=keplers-laws&step=${total}` });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await page.locator('#investigationNext').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationFinish')).toBeVisible();
    await expect(page.locator('#investigationName')).toBeFocused();

    const stops = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      stops.push(await page.evaluate(focusStop, '#investigationFinishContent'));
    }
    expect(strayStops(stops)).toEqual([]);

    await page.locator('#investigationName').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#investigationFinish')).toBeHidden();
    await expect(page.locator('#investigationNext')).toBeFocused();
  });
});

test.describe('structure', () => {
  test('headings descend one level at a time', async ({ page, app }) => {
    // 1.3.1 Info and Relationships. Heading level is how a screen reader user
    // builds a mental model of a page; a jump from h1 to h4 tells them two
    // sections exist that do not.
    await app.boot();
    const jumps = await page.evaluate(() => {
      const visible = el => el.getBoundingClientRect().height > 0;
      const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter(h => visible(h) || h.classList.contains('visually-hidden'))
        .map(h => ({
          level: Number(h.tagName[1]),
          text: h.textContent.trim().slice(0, 40),
        }));
      const out = [];
      for (let i = 1; i < levels.length; i++) {
        if (levels[i].level > levels[i - 1].level + 1) {
          out.push(
            `h${levels[i - 1].level} -> h${levels[i].level} at "${levels[i].text}"`
          );
        }
      }
      return out;
    });
    expect(jumps).toEqual([]);
  });

  test('the page has exactly one main landmark and one h1', async ({
    page,
    app,
  }) => {
    await app.boot();
    const counts = await page.evaluate(() => ({
      main: document.querySelectorAll('main, [role="main"]').length,
      h1: document.querySelectorAll('h1').length,
      banner: document.querySelectorAll('header, [role="banner"]').length,
    }));
    expect(counts.main).toBe(1);
    expect(counts.h1).toBe(1);
  });
});

test.describe('the simulation is described in words', () => {
  test('the canvas points at a summary of what is in it', async ({
    page,
    app,
  }) => {
    // 1.1.1 Non-text Content. The canvas is the application; without this a
    // screen reader reports "graphic" and nothing else.
    await app.boot();
    await app.loadScenario('solar-system');
    await app.waitForFrames(40);

    // Polled for the scenario name rather than for any text at all. The
    // description carries the *previous* scenario until it refreshes, so a
    // poll that only waited for non-empty text passed immediately on the stale
    // sentence and then failed the assertion below - which is a test racing the
    // application, not a defect in it.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const canvas = document.getElementById('simulationCanvas');
            const id = canvas?.getAttribute('aria-describedby');
            return document.getElementById(id)?.textContent?.trim() || '';
          }),
        { timeout: 20_000 }
      )
      .toContain('Solar System');

    const described = await page.evaluate(() => {
      const canvas = document.getElementById('simulationCanvas');
      const id = canvas.getAttribute('aria-describedby');
      return document.getElementById(id).textContent;
    });

    // The four things the brief asks for: scenario, status, counts, selection.
    expect(described).toContain('Solar System');
    expect(described).toMatch(/Running|Paused/);
    expect(described).toMatch(/\d+ bodies/);
    expect(described).toMatch(/selected/i);
  });

  test('the summary follows the simulation', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('solar-system');
    await app.waitForFrames(30);
    await page.waitForTimeout(2000);

    const before = await page.evaluate(
      () => document.getElementById('canvasSummary').textContent
    );

    await app.setPaused(true);
    await app.selectFirstObject();
    await page.waitForTimeout(2500);

    const after = await page.evaluate(
      () => document.getElementById('canvasSummary').textContent
    );
    expect(after).not.toBe(before);
    expect(after).toContain('Paused');
    expect(after).toMatch(/is selected/);
  });

  test('the description is not a live region, and nothing announces per frame', async ({
    page,
    app,
  }) => {
    // 4.1.3 Status Messages, read the other way round. The failure mode here is
    // not silence, it is a live region attached to something that changes sixty
    // times a second - which produces speech a reader cannot interrupt and
    // drowns out every announcement that matters.
    await app.boot();
    await app.loadScenario('solar-system');

    const live = await page.evaluate(() => {
      const el = document.getElementById('canvasSummary');
      return {
        ariaLive: el.getAttribute('aria-live'),
        role: el.getAttribute('role'),
      };
    });
    expect(live.ariaLive).toBeNull();
    expect(live.role).toBeNull();

    // Watch the real live region while the simulation runs untouched. Nothing
    // the reader did not cause should be announced.
    const writes = await page.evaluate(async () => {
      const el = document.getElementById('srStatus');
      let n = 0;
      const observer = new window.MutationObserver(() => {
        n++;
      });
      observer.observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      await new Promise(r => setTimeout(r, 6000));
      observer.disconnect();
      return n;
    });

    expect(
      writes,
      `the polite live region was written ${writes} times in six seconds of ordinary running`
    ).toBeLessThanOrEqual(1);
  });

  test('a world rebuilt again and again says which scenario once', async ({
    page,
    app,
  }) => {
    // Every build fires gravitasSimulationReset, and js/controls.js announces
    // the scenario from it. A parameter sweep builds the same world once per
    // trial, and a lesson stage whose scene was replaced rebuilds it from a
    // timer. announce() says a repeated message again now, so that a second
    // "Correct." is heard; this caller asks not to be repeated, and a sweep
    // must not read the scenario's name out once a trial.
    await app.boot();
    await app.loadScenario('solar-system');
    const said = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const el = document.getElementById('srStatus');
      const states = [];
      const observer = new window.MutationObserver(() =>
        states.push(el.textContent)
      );
      observer.observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      for (let trial = 0; trial < 5; trial++) {
        ui.initialize_simulation({ seed: 'e2e' });
        await new Promise(r => setTimeout(r, 200));
      }
      observer.disconnect();
      return states.filter(s => /^Scenario loaded:/.test(s.trim()));
    });

    expect(
      said.length,
      `five builds of one scenario announced it ${said.length} times`
    ).toBeLessThanOrEqual(1);
  });
});

test.describe('reflow and zoom', () => {
  // 1.4.10 Reflow: content at 320 CSS pixels wide, which is what 400% zoom on a
  // 1280px screen produces, must not require scrolling in two directions.
  for (const [label, width, height] of [
    ['400% zoom (320x512)', 320, 512],
    ['200% zoom (640x512)', 640, 512],
  ]) {
    test(`no horizontal scrolling at ${label}`, async ({ page, app }) => {
      await page.setViewportSize({ width, height });
      await app.boot();
      await page.waitForTimeout(1200);

      const overflow = await page.evaluate(() => ({
        docWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        overflow.docWidth,
        `the document is ${overflow.docWidth}px wide in a ${overflow.clientWidth}px viewport`
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });
  }
});

test.describe('reduced motion', () => {
  test('nothing loops forever when the reader has asked it not to', async ({
    page,
    app,
  }) => {
    // 2.2.2 Pause, Stop, Hide and 2.3.3 Animation from Interactions. The
    // simulation itself keeps moving - it is the content, and it has a pause
    // button - but the decorative loops stop.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await app.boot();
    await page.waitForTimeout(1500);

    const looping = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const s = getComputedStyle(el);
        if (s.animationName === 'none') continue;
        const count = s.animationIterationCount;
        const duration = parseFloat(s.animationDuration) || 0;
        if (count === 'infinite' && duration > 0) {
          out.push(
            `${el.id || el.className || el.tagName}: ${s.animationName}`
          );
        }
      }
      return out.slice(0, 10);
    });

    expect(looping, `still animating forever: ${looping.join(', ')}`).toEqual(
      []
    );
  });
});
