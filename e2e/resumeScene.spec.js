// =============================================================================
// Coming back to a step gives the scene walking there gives
// -----------------------------------------------------------------------------
// A student who closes the tab on step 9 and returns must find step 9's scene:
// the same bodies, the same stage, the same canvas kind, the same clock
// settings. For every lesson at every depth this opens it at step 1 and walks
// it with the Next button, recording what is on screen at the sampled steps,
// then reopens it from a saved record at each of those steps (a new page's
// state: the session's own copy of the record is dropped) and compares. A
// difference is listed by lesson, depth and step id.
//
// What is compared, and what is not, is in e2e/resumeSceneKit.js (compare):
// bodies by list, kind and name; their masses, radii, positions and
// velocities when both screens are at the same simulation time; the stage and
// its roles; the canvas kind; the clock a step states itself; the instrument's
// controls. The sampling rule is sampleSteps there; RESUME_ALL=1 compares
// every step, RESUME_LESSONS=a,b limits the lessons and RESUME_EVERY=n takes every n-th from RESUME_OFFSET.
// =============================================================================

import { test, expect } from './fixtures.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { writeProgress } from '../js/investigations/progressSchema.js';
import {
  compare,
  installProbe,
  lessonFor,
  resume,
  sampleSteps,
  walk,
} from './resumeSceneKit.js';

test.skip(
  process.env.GRAVITAS_E2E_TARGET === 'dist',
  'reads the engine through module imports, which only the sources have'
);

const ONLY = (process.env.RESUME_LESSONS || '').split(',').filter(Boolean);
const ALL = process.env.RESUME_ALL === '1';
// A local run may take every n-th lesson; CI takes them all.
const EVERY = Number(process.env.RESUME_EVERY || 1);
const OFFSET = Number(process.env.RESUME_OFFSET || 0);

/**
 * Differences understood and left, by lesson and step, with why. Each is
 * reported as an annotation and does not fail the run; one that stops
 * differing should be removed (RESUME_SCENE.md lists them).
 */
const KNOWN = {
  'lives-of-stars:read-the-descriptions':
    'walking leaves the black hole an earlier instrument made, because the step declares the same stage and the engine does not rebuild a stage whose key is unchanged; opening it shows the star the stage declares',
};

test.describe('opening a step from its saved record gives the scene walking there gives', () => {
  for (const [at, entry] of MANIFEST.entries()) {
    if (ONLY.length && !ONLY.includes(entry.id)) continue;
    if ((at - OFFSET) % EVERY) continue;
    // The deepest path holds every step of the lessons it contains, so two
    // walks cover a lesson: the core path a student takes by default, and the
    // path through everything.
    const depths = entry.depths ? ['core', 'deepest'] : ['core'];
    for (const named of depths) {
      test(`${entry.id}, ${named}`, async ({ page, app }) => {
        test.setTimeout(300_000);
        await app.boot();
        // The panel mounts on the first open; after that the engine is driven directly.
        await page.locator('#investigationsBtn').click();
        await page.locator(`[data-investigation="${entry.id}"]`).click();
        await expect(page.locator('#investigationPanel')).toBeVisible();
        await installProbe(page);

        const depth =
          named === 'deepest'
            ? (await loadInvestigation(entry.id)).depths.at(-1)
            : named;
        const lesson = await lessonFor(entry.id, depth);
        const sampled = sampleSteps(lesson, depth, ALL);
        const walked = await walk(page, entry.id, depth, sampled);
        const found = [];
        for (const { sid, state } of walked) {
          if (!state) continue;
          const back = await resume(page, entry.id, sid, depth);
          const step = lesson.steps.find(s => s.sid === sid);
          const { differences } = compare(state, back, step);
          if (!differences.length) continue;
          const why = KNOWN[`${entry.id}:${sid}`];
          if (why)
            test.info().annotations.push({
              type: 'known',
              description: `${sid}: ${why}`,
            });
          else found.push({ sid, differences });
        }
        expect(walked.length).toBeGreaterThan(0);
        expect(found).toEqual([]);
      });
    }
  }
});

test.describe('a reading taken from a scene the student changed says so', () => {
  const LESSON = 'keplers-laws';
  const STEP = 'fast-and-slow-in-numbers';

  /** Open the lesson on the measure step, from a saved record, and fill every field it asks for. */
  async function atMeasureStep(page, app) {
    await app.boot();
    const lesson = await loadInvestigation(LESSON);
    const record = writeProgress({
      lesson,
      responses: {},
      attempts: {},
      visited: [],
      stepSid: STEP,
      startedAt: null,
      spent: 0,
    });
    await page.evaluate(
      ([key, text]) => localStorage.setItem(key, text),
      [`gravitas_investigation_${LESSON}`, JSON.stringify(record)]
    );
    await page.locator('#investigationsBtn').click();
    await page.locator(`[data-investigation="${LESSON}"]`).click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(
      page.locator('#investigationBody [data-altered]')
    ).toBeAttached();
  }

  async function fill(page) {
    const boxes = page.locator('#investigationBody input[data-field]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      const box = boxes.nth(i);
      if (await box.isEditable()) await box.fill(String(10 + i));
    }
    await page
      .locator('#investigationBody h2, #investigationBody .inv-step-title')
      .first()
      .click();
    await page.locator('#investigationBody input[data-field]').last().blur();
  }

  test('placing a body outside the panel raises the line; Reset the scene clears it; nothing is blocked', async ({
    page,
    app,
  }) => {
    await atMeasureStep(page, app);
    const line = page.locator('#investigationBody [data-altered]');
    await expect(line).toBeHidden();
    // The student's own action on the scene: a press on the canvas, then a placed body.
    await page.mouse.click(300, 300);
    await page.evaluate(() =>
      window.dispatchEvent(new window.CustomEvent('gravitasObjectPlaced'))
    );
    await fill(page);
    await expect(line).toBeVisible();
    await expect(line).toContainText(
      'You changed the scene. Reset the scene to measure from the start of this step.'
    );
    await expect(line).toHaveAttribute('role', 'status');
    // Never blocks: the fields keep what was typed, and the step can go on.
    await expect(page.locator('#investigationNext')).toBeEnabled();
    await line.getByRole('button', { name: 'Reset the scene' }).click();
    await expect(
      page.locator('#investigationBody [data-altered]')
    ).toBeHidden();
  });

  test('running and pausing the clock is the measurement, not a change', async ({
    page,
    app,
  }) => {
    await atMeasureStep(page, app);
    await page.mouse.click(300, 300);
    await page.keyboard.press('Space');
    await fill(page);
    await expect(
      page.locator('#investigationBody [data-altered]')
    ).toBeHidden();
  });

  test('the Spanish line and action', async ({ page, app }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await atMeasureStep(page, app);
    await page.mouse.click(300, 300);
    await page.evaluate(() =>
      window.dispatchEvent(new window.CustomEvent('gravitasObjectPlaced'))
    );
    await fill(page);
    const line = page.locator('#investigationBody [data-altered]');
    await expect(line).toContainText('Cambiaste la escena.');
    await expect(
      line.getByRole('button', { name: 'Restablecer la escena' })
    ).toBeVisible();
  });
});

test.describe('an assignment resumes as the assignment', () => {
  test('its depth, its steps and its title survive leaving and coming back', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    const link = await page.evaluate(async () => {
      const reg = await import('/js/data/investigations/registry.js');
      const A = await import('/js/assignments/assignment.js');
      const L = await import('/js/assignments/assignmentLink.js');
      const D = await import('/js/investigations/depth.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const base = await reg.loadInvestigation('keplers-laws');
      const { inv } = await D.openDepth(
        base,
        { depth: 'quantitative', deepest: 'quantitative' },
        null,
        'en'
      );
      const chosen = inv.steps
        .filter(s => s.depth === 'quantitative')
        .slice(0, 3)
        .map(s => s.sid);
      const built = A.buildAssignment({
        lesson: inv,
        chosen,
        title: 'Week 5',
        fingerprint: stepFingerprint,
        depth: 'quantitative',
      });
      return new URL((await L.assignmentLink(built)).url).hash;
    });
    await page.goto('about:blank');
    await app.boot({ url: `/${link}` });
    const where = page.locator('#investigationWhere');
    await expect(page.locator('#investigationTitle')).toHaveText('Week 5', {
      timeout: 60_000,
    });
    await page.locator('#investigationNext').click();
    await expect(where).toContainText(/Step 2 of/);
    const before = await where.textContent();
    const depth = await page.locator('#investigationDepthState').textContent();
    expect(depth.trim()).not.toBe('');
    // Leave and come back through the saved address.
    const route = await page.evaluate(
      () =>
        JSON.parse(window.localStorage.getItem('gravitas_resume'))?.items?.[0]
          ?.route
    );
    expect(route).toBe(`/${link}`);
    await page.goto('about:blank');
    await app.boot({ url: route });
    await expect(page.locator('#investigationTitle')).toHaveText('Week 5', {
      timeout: 60_000,
    });
    await expect(where).toHaveText(before);
    await expect(page.locator('#investigationDepthState')).toHaveText(depth);
    await expect(page.locator('#investigationDeeper')).toBeHidden();
  });
});
