// =============================================================================
// The canvas behind a lesson
// -----------------------------------------------------------------------------
// A lesson says what its canvas is for: the scene a step uses, a picture of
// what it is about, or nothing. tests/lessonCanvas.test.js holds the rules;
// this is the wiring a reader meets. No shipped lesson declares a canvas yet, so
// the lesson is a draft stored the way the composer's preview stores one.
//
// @covers:lesson-canvas
// =============================================================================

import { test, expect } from './fixtures.js';

const STAGE = {
  fit: true,
  stars: [{ role: 'a', name: 'Alpha', teffK: 5772, lumSun: 1 }],
};
const step = (sid, extra = {}) => ({
  sid,
  type: 'read',
  title: `Step ${sid}`,
  body: `The ${sid} step.`,
  ...extra,
});
const LESSON = {
  id: 'draft-canvas',
  title: 'Canvas kinds',
  subtitle: 'One lesson, three canvases',
  duration: '5 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  courseLevel: 'survey',
  mathematics: 'arithmetic',
  prerequisites: [],
  tags: [],
  lock: { placement: true, inspector: true },
  objectives: ['See each kind of canvas'],
  steps: [
    step('scene', { canvas: 'scene', stage: STAGE }),
    step('picture', { canvas: 'portrait', picture: 'a star', stage: STAGE }),
    step('quiet-one', { canvas: 'quiet' }),
    step('quiet-two'),
    step('scene-again', { canvas: 'scene', stage: STAGE }),
  ],
};
const SHADOW = {
  steps: [{}, { picture: 'una estrella' }],
};
const STEP = sid => LESSON.steps.findIndex(s => s.sid === sid) + 1;

const open = async (page, app, sid, { language = 'en' } = {}) => {
  await page.addInitScript(
    ([lesson, shadow, lang]) => {
      localStorage.setItem(
        'gravitas_composer_preview',
        JSON.stringify({ lesson, shadow })
      );
      localStorage.setItem('gravitas_locale', lang);
    },
    [LESSON, SHADOW, language]
  );
  await app.boot({
    url: `/?author=draft-canvas&view=student&step=${STEP(sid)}`,
  });
  await expect(page.locator('.inv-step-title')).toHaveText(`Step ${sid}`);
};

const next = page => page.locator('#investigationNext').click();
const bodies = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return [p.stars, p.planets, p.gas_giants, p.bh_list].reduce(
      (n, l) => n + l.length,
      0
    );
  });
const rail = page =>
  page
    .locator('.rail-section-toggle')
    .evaluateAll(els => els.map(e => e.getAttribute('aria-expanded')));
const paused = page =>
  page.evaluate(async () => (await import('/js/appState.js')).state.paused);

test.describe('the canvas behind a lesson', () => {
  test('a quiet step has nothing staged and its chrome folded behind toggles', async ({
    page,
    app,
  }) => {
    await open(page, app, 'quiet-one');
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'quiet'
    );
    await expect.poll(() => bodies(page)).toBe(0);
    await expect(page.locator('#investigationObjectsWrap')).toBeHidden();
    await expect(page.locator('#simulationCanvas')).toHaveAttribute(
      'aria-label',
      /No scene on this step/
    );
    // The rail's sections are closed and Add object has gone with them.
    expect(await rail(page)).toEqual(['false', 'false', 'false']);
    await expect(page.locator('#objectAdd')).toBeHidden();
    // The playback bar is one button, reachable by keyboard, until opened.
    const fold = page.locator('#timelineFold');
    await expect(fold).toBeVisible();
    await expect(page.locator('#timelinePlay')).toBeHidden();
    await fold.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#timelinePlay')).toBeVisible();
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    // A rail toggle opens its section by keyboard and Add object returns.
    await page.locator('#railScenario').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#loadScenarioBtn')).toBeVisible();
    await expect(page.locator('#objectAdd')).toBeVisible();
  });

  test('a world built under a quiet step is emptied again', async ({
    page,
    app,
  }) => {
    await open(page, app, 'quiet-one');
    // The application builds its own scenario on a cold load, after the lesson
    // has opened; a reader refreshing the scenario does the same thing.
    const generation = () =>
      page.evaluate(async () =>
        (await import('/js/physics.js')).getWorldGeneration()
      );
    const before = await generation();
    await page.locator('#railScenario').click();
    await page.locator('#refreshScenarioBtn').click();
    await page.waitForFunction(
      async g => (await import('/js/physics.js')).getWorldGeneration() > g,
      before
    );
    await expect.poll(() => bodies(page), { timeout: 5_000 }).toBe(0);
    // A scene the lesson itself declares is not touched by any of this.
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'quiet'
    );
  });

  test('a portrait is a picture: still, named so, and described without a value', async ({
    page,
    app,
  }) => {
    await open(page, app, 'picture');
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'portrait'
    );
    await expect(page.locator('#simulationCanvas')).toHaveAttribute(
      'aria-label',
      'Picture of a star, not a measurement.'
    );
    await expect(page.locator('#simulationCanvas')).not.toHaveAttribute(
      'aria-describedby'
    );
    await expect(page.locator('.inv-object-role')).toHaveText('picture');
    await expect(page.locator('#investigationResetScenario')).toHaveAttribute(
      'aria-label',
      'Reset the picture and instrument for this step'
    );
    expect(await paused(page)).toBe(true);
    // The rail is as it was: a portrait folds nothing.
    expect(await rail(page)).toContain('true');
    await expect(page.locator('#timelineFold')).toHaveCount(0);
  });

  test('a portrait stays still under reduced motion, in Spanish', async ({
    page,
    app,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, app, 'picture', { language: 'es' });
    expect(await paused(page)).toBe(true);
    await expect(page.locator('#simulationCanvas')).toHaveAttribute(
      'aria-label',
      'Imagen de una estrella, no una medida.'
    );
    await expect(page.locator('.inv-object-role')).toHaveText('imagen');
  });

  test('walking through the kinds, and leaving on a quiet step', async ({
    page,
    app,
  }) => {
    await open(page, app, 'scene');
    const before = await rail(page);
    expect(await bodies(page)).toBe(1);
    await expect(page.locator('.inv-object')).toHaveCount(1);
    await next(page);
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'portrait'
    );
    await next(page);
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'quiet'
    );
    await expect.poll(() => bodies(page)).toBe(0);
    await next(page);
    // The declaration holds on the step that states none.
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'quiet'
    );
    await expect.poll(() => bodies(page)).toBe(0);
    await next(page);
    // Back to a scene: the stage returns and the chrome unfolds.
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'scene'
    );
    expect(await bodies(page)).toBe(1);
    await expect(page.locator('#timelineFold')).toHaveCount(0);
    expect(await rail(page)).toEqual(before);
    // And leaving mid-quiet puts everything back.
    await page.locator('#investigationPrev').click();
    await page.locator('#investigationPrev').click();
    await expect(page.locator('body')).toHaveAttribute(
      'data-lesson-canvas',
      'quiet'
    );
    await page.locator('#investigationClose').click();
    await expect(page.locator('body')).not.toHaveAttribute(
      'data-lesson-canvas'
    );
    await expect(page.locator('#timelineFold')).toHaveCount(0);
    expect(await rail(page)).toEqual(before);
    await expect(page.locator('#simulationCanvas')).toHaveAttribute(
      'aria-label',
      'Gravitational simulation'
    );
    // The reader's own world came back, not an empty canvas.
    expect(await bodies(page)).toBeGreaterThan(1);
  });

  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1366, 800],
  ]) {
    test(`a quiet step lays out at ${width} px`, async ({ page, app }) => {
      await page.setViewportSize({ width, height });
      await open(page, app, 'quiet-one');
      const box = await page.locator('#timelineFold').boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.locator('#investigationNext')).toBeVisible();
    });
  }
});
