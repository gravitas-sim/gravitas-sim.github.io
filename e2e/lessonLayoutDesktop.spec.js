// =============================================================================
// The lesson layout on a laptop and a desktop
// -----------------------------------------------------------------------------
// Four things a student on a wide screen can rely on:
//
//   - the lesson panel stands in one place at one width on every step, whatever
//     the step docks beside it (a plot, an instrument, a light curve), and the
//     instrument panel is as wide on one step as on the next;
//   - a quiet canvas gives the instrument the width the rail stood in, and the
//     instrument is drawn at that width, not stretched to it;
//   - a scene the step stages, or binds by role, stands inside the region the
//     panels leave free;
//   - a folded control cannot take focus: not in the lesson layout and not in
//     the Settings dialog, whose collapsed sections used to hide their content
//     with `max-height` and `opacity` alone.
//
// The panel measurements run on three of the five pilot lessons (tools/
// visual-criteria.mjs) at 1366x800 and 1440x900 (criterion I-8's desktop
// clause), in English and Spanish. The quiet and scene cases use a draft
// lesson, because no shipped lesson declares a canvas kind yet.
//
// @covers:lesson-canvas
// =============================================================================

/* global requestAnimationFrame */
import { test, expect } from './fixtures.js';
import {
  LESSON_PILOTS,
  DESKTOP_SIZES,
  openLessonStep,
  measureLayoutInPage,
  judgeLayout,
} from '../tools/visual-criteria.mjs';

const frames = page =>
  page.evaluate(
    () =>
      new Promise(r =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(r, 500))
        )
      )
  );

/** One step per kind of furniture a step docks beside the lesson panel. */
const WALK = [
  ['keplers-2nd-law', 'eight-minutes-of-arc'], // nothing docked
  ['keplers-2nd-law', 'change-the-shape'], // an instrument
  ['keplers-2nd-law', 'measure-four-planets'], // a plot
  ['keplers-2nd-law', 'fast-and-slow-in-numbers'], // an observing panel
  ['transit-lab', 'your-first-transit'], // the light curve
  ['transit-lab', 'try-it-on-some-real'], // an instrument
  ['weighing-stars-binary', 'try-it'], // an instrument, shorter
  ['galilean-resonance', 'a-moon-that-melts'], // an instrument, the tallest
];

const rectsOf = page =>
  page.evaluate(() => {
    const r = sel => {
      const b = document.querySelector(sel)?.getBoundingClientRect();
      return b?.width
        ? [b.left, b.top, b.width, b.height].map(Math.round)
        : null;
    };
    return {
      panel: r('#investigationPanel'),
      tool: r('#investigationTool') || r('#investigationPlot'),
    };
  });

test.describe('the lesson panel does not move between steps', () => {
  for (const size of DESKTOP_SIZES) {
    for (const language of ['en', 'es']) {
      test(`${size.width}x${size.height}, ${language}`, async ({ page }) => {
        test.setTimeout(240_000);
        await page.setViewportSize(size);
        const seen = [];
        for (const [id, sid] of WALK) {
          const pilot = LESSON_PILOTS.find(p => p.id === id);
          await openLessonStep(page, { ...pilot, sid, language });
          await frames(page);
          seen.push({ id, sid, ...(await rectsOf(page)) });
        }
        // The panel: one box on every step.
        const first = seen[0].panel;
        for (const s of seen)
          expect(s.panel, `${s.id} ${s.sid}`).toEqual(first);
        // And one share of the screen, from the token, not a number of its own.
        expect(first[2]).toBeLessThanOrEqual(Math.round(size.width * 0.4));
        expect(first[2]).toBeGreaterThanOrEqual(300);
        // What docks beside it, an instrument or a plot, keeps one width and one
        // left edge, whatever the lesson (its height is its content's).
        const tools = seen.filter(s => s.tool);
        expect(tools.length).toBeGreaterThanOrEqual(3);
        for (const s of tools) {
          expect(s.tool[0], `${s.id} ${s.sid}`).toBe(tools[0].tool[0]);
          expect(s.tool[2], `${s.id} ${s.sid}`).toBe(tools[0].tool[2]);
        }
      });
    }
  }
});

// --- A draft lesson: a staged scene and a quiet canvas with an instrument ------

const STAGE = {
  fit: true,
  stars: [
    { role: 'a', name: 'Alpha', teffK: 5772, lumSun: 1 },
    { role: 'b', name: 'Beta', teffK: 4200, lumSun: 0.3 },
  ],
};
const TOOL = { id: 'moon-marks', values: {}, hide: [] };
const step = (sid, extra = {}) => ({
  sid,
  type: 'read',
  title: `Step ${sid}`,
  body: `The ${sid} step.`,
  ...extra,
});
const LESSON = {
  id: 'draft-desktop',
  title: 'Desktop layout',
  subtitle: 'A scene, then a quiet canvas',
  duration: '5 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  courseLevel: 'survey',
  mathematics: 'arithmetic',
  prerequisites: [],
  tags: [],
  lock: { placement: true, inspector: true },
  objectives: ['See the layout'],
  steps: [
    step('scene', { canvas: 'scene', stage: STAGE, tool: TOOL }),
    step('quiet', { canvas: 'quiet', tool: TOOL }),
  ],
};
const SHADOW = { steps: [{}, {}] };

const openDraft = async (page, app, which) => {
  await page.addInitScript(
    ([lesson, shadow]) =>
      localStorage.setItem(
        'gravitas_composer_preview',
        JSON.stringify({ lesson, shadow })
      ),
    [LESSON, SHADOW]
  );
  await app.boot({
    url: `/?author=draft-desktop&view=student&step=${which === 'scene' ? 1 : 2}`,
  });
  await expect(page.locator('.inv-step-title')).toHaveText(`Step ${which}`);
  await expect(page.locator('#investigationTool')).toBeVisible();
  await frames(page);
};

test.describe('quiet and scene canvases on a laptop', () => {
  for (const size of DESKTOP_SIZES) {
    test(`a quiet canvas gives the instrument the rail's width at ${size.width}`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize(size);
      await openDraft(page, app, 'quiet');
      const quiet = await rectsOf(page);
      // From the lesson panel's edge to a gap short of the window's.
      expect(quiet.tool[2]).toBeGreaterThanOrEqual(size.width * 0.6);
      expect(quiet.tool[0] + quiet.tool[2]).toBeLessThanOrEqual(size.width);
      // Drawn at that width: the bitmap is the box's width times the pixel
      // ratio, which a picture stretched to fit would not be.
      const drawn = await page.evaluate(() => {
        const c = document.querySelector('#investigationTool canvas');
        return c && { css: c.clientWidth, bitmap: c.width };
      });
      expect(drawn, 'the instrument draws into a canvas').not.toBeNull();
      expect(drawn.bitmap).toBeGreaterThanOrEqual(drawn.css - 1);
      // The rail and the bar are not on the page until the More is opened.
      await expect(page.locator('#mainControls')).toBeHidden();
      await expect(page.locator('#timelineBar')).toBeHidden();
      // And the same lesson's scene step is as it was: one instrument width.
      await page.locator('#investigationPrev').click();
      await expect(page.locator('.inv-step-title')).toHaveText('Step scene');
      await frames(page);
      const scene = await rectsOf(page);
      expect(scene.tool[2]).toBeLessThanOrEqual(460);
      expect(scene.panel).toEqual(quiet.panel);
      await expect(page.locator('#mainControls')).toBeVisible();
      await expect(page.locator('#timelineBar')).toBeVisible();
    });

    test(`a staged scene stands in the free region at ${size.width}`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize(size);
      await openDraft(page, app, 'scene');
      const m = await page.evaluate(measureLayoutInPage);
      const verdict = judgeLayout(m, { kind: 'desktop', subject: 'scene' });
      expect(verdict.reasons, JSON.stringify(m.bodies)).toEqual([]);
      expect(m.bodies.length).toBe(2);
    });
  }
});

// --- A scene bound by role is framed in the free region -----------------------

test.describe('a bound scene stands in the free region on a laptop', () => {
  // Kepler's second law: the rail used to cover the circular orbiter. Transit
  // Lab: the light curve lay over the star and the planet.
  for (const pilot of LESSON_PILOTS.filter(p =>
    ['keplers-2nd-law', 'transit-lab'].includes(p.id)
  )) {
    for (const size of DESKTOP_SIZES) {
      test(`${pilot.id} at ${size.width}`, async ({ page }) => {
        await page.setViewportSize(size);
        await openLessonStep(page, pilot);
        await frames(page);
        const m = await page.evaluate(measureLayoutInPage);
        const verdict = judgeLayout(m, {
          kind: 'desktop',
          subject: pilot.subject,
        });
        expect(verdict.reasons, JSON.stringify(m.bodies)).toEqual([]);
      });
    }
  }
});

// --- A folded control cannot take focus ----------------------------------------

/** What is wrong with the element holding focus, or null: folded, hidden, unseen. */
const focusProblem = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const folded = el.closest(
    [
      '[hidden]',
      '[inert]',
      'details:not([open]) > :not(summary)',
      '.settings-section.collapsed .settings-section-content',
      '.timeline-bar.is-folded > :not(.timeline-fold)',
    ].join(',')
  );
  if (folded) return `inside ${folded.className || folded.tagName}`;
  if (getComputedStyle(el).visibility === 'hidden') return 'visibility hidden';
  const b = el.getBoundingClientRect();
  if (!b.width || !b.height) return 'no box';
  return null;
};

test.describe('a folded control is out of the Tab order', () => {
  test('in the lesson layout, from the panel through the shell', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_SIZES[0]);
    await openLessonStep(page, {
      ...LESSON_PILOTS[0],
      sid: 'change-the-shape',
    });
    await page.locator('#investigationTitle').focus();
    const stops = new Set();
    for (let i = 0; i < 70; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(focusProblem), `Tab stop ${i + 1}`).toBeNull();
      stops.add(await page.evaluate(() => document.activeElement?.id || ''));
    }
    expect(stops.size).toBeGreaterThan(8);
  });

  test('in a quiet lesson, the tucked controls take focus only once opened', async ({
    page,
    app,
  }) => {
    await page.setViewportSize(DESKTOP_SIZES[0]);
    await openDraft(page, app, 'quiet');
    await page.locator('#investigationTitle').focus();
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(focusProblem), `Tab stop ${i + 1}`).toBeNull();
      seen.add(await page.evaluate(() => document.activeElement?.id || ''));
    }
    expect(seen.has('stageMore') || seen.has('')).toBe(true);
    expect([...seen].some(id => /^(timeline|rail)/.test(id))).toBe(false);
    // Open, they are in the order, and once shut they are out again.
    await page.locator('#stageMore > summary').focus();
    await page.keyboard.press('Enter');
    const open = new Set();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      open.add(await page.evaluate(() => document.activeElement?.id || ''));
    }
    expect([...open].some(id => /^(timeline|rail)/.test(id))).toBe(true);
  });

  test('in Settings, a collapsed section keeps its controls out of the order', async ({
    page,
    app,
  }) => {
    await page.setViewportSize(DESKTOP_SIZES[0]);
    await app.boot();
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await expect(page.locator('#settingsPanel')).toBeVisible();
    const folds = page.locator('#settingsPanel .settings-section-fold:visible');
    const n = await folds.count();
    expect(n).toBeGreaterThan(1);
    // Fold every section but the last.
    for (let i = 0; i < n - 1; i++) {
      if ((await folds.nth(i).getAttribute('aria-expanded')) === 'true')
        await folds.nth(i).click();
    }
    // Let the fold finish: the content leaves the order after the animation.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#settingsPanel .settings-section.collapsed .settings-section-content'
            ),
          ].every(el => getComputedStyle(el).visibility === 'hidden')
        )
      )
      .toBe(true);
    await folds.first().focus();
    let inLast = 0;
    for (let i = 0; i < 150; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(focusProblem), `Tab stop ${i + 1}`).toBeNull();
      if (
        await page.evaluate(
          () =>
            !!document.activeElement?.closest(
              '#settingsPanel .settings-section:last-of-type .settings-section-content'
            )
        )
      )
        inLast++;
    }
    // The walk reached the one section that stayed open.
    expect(inLast).toBeGreaterThan(0);
    // Opened again, the content takes focus at once, with no animation to wait out.
    await folds.first().click();
    await expect(
      page.locator(
        '#settingsPanel .settings-section:first-of-type .settings-section-content'
      )
    ).toHaveCSS('visibility', 'visible');
  });
});
