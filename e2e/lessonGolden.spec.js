// =============================================================================
// The lesson-engine golden, DOM half (Roadmap III, Prompt 138)
// -----------------------------------------------------------------------------
// tests/lessonGolden.test.js holds what the engine decides: grading, saved
// progress, backups, tokens, assignments. This holds what the panel draws, for
// the investigations and activity cuts tools/lesson-coverage.mjs derives, in
// English and Spanish: the first step, the first graded step (unanswered, then
// answered correctly) and the last step at every depth the lesson has.
//
// Each screen is reached the way a returning student reaches it - progress
// saved in the panel's own format, then the lesson opened - not by walking
// there. The saved answer is the right one, so the answered screen is the
// marked one. Nothing is clicked, so nothing here depends on a click landing.
//
// To accept a change on purpose, in its own commit with the diff read:
//   npm run lesson:golden:dom -- --regenerate-lesson-golden
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from './fixtures.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'tests/lessonGolden/fixtures/dom');
const RECORD =
  process.env.GRAVITAS_REGENERATE_LESSON_GOLDEN === 'lesson-golden';
const coverage = JSON.parse(
  readFileSync(path.join(ROOT, 'tests/lessonGolden/coverage.json'), 'utf8')
);

/** What a screen is, as text: the markup's whitespace is not behavior. */
const SNAPSHOT = () => {
  const q = s => document.querySelector(s);
  const norm = h => h.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  return {
    title: q('#investigationTitle')?.textContent.trim() ?? null,
    subtitle: q('#investigationSubtitle')?.textContent.trim() ?? null,
    body: norm(q('#investigationBody')?.innerHTML ?? ''),
    previousDisabled: q('#investigationPrev')?.disabled ?? null,
    nextDisabled: q('#investigationNext')?.disabled ?? null,
    depthState: q('#investigationDepthState')?.textContent.trim() ?? null,
  };
};

/**
 * In the page: the steps to capture for a lesson at a depth, and the progress
 * that opens each one. Uses the engine's own modules for what a step is.
 */
async function plan({ id, locale, activity }) {
  const i18n = await import('/js/i18n/index.js');
  await i18n.setLocale(locale, { persist: false });
  const reg = await import('/js/data/investigations/registry.js');
  await reg.setLessonLocale(locale);
  const { withDepth } = await import('/js/investigations/depth.js');
  const depthPure = await import('/js/investigations/depthPure.js');
  const { writeProgress } =
    await import('/js/investigations/progressSchema.js');
  const { checkAnswer } = await import('/js/answerCheck.js');
  const { recordAnswer } = await import('/js/answerParse.js');
  const lesson = await withDepth(await reg.loadInvestigation(id), locale);

  const graded = s =>
    s.kind === 'choice' || s.type === 'predict'
      ? typeof s.answer === 'number'
      : s.kind === 'numeric' && Number.isFinite(s.answer);

  const shots = [];
  const cut = activity ? new Set((await resolveCut(activity)).sids) : null;
  const depths = activity ? ['core'] : depthPure.depthsOf(lesson);
  for (const depth of depths) {
    let steps = depthPure.lessonAt(lesson, depth).steps;
    if (cut) steps = steps.filter(s => cut.has(s.sid));
    if (!steps.length) continue;
    const first = steps[0];
    const gradedStep = steps.find(graded) ?? null;
    const last = steps.at(-1);
    const want = [
      ['first', first, false],
      ...(gradedStep
        ? [
            ['graded', gradedStep, false],
            ['marked', gradedStep, true],
          ]
        : []),
      ['last', last, false],
    ];
    for (const [role, step, answered] of want) {
      const at = steps.indexOf(step);
      const responses = {};
      const attempts = {};
      if (answered) {
        const key = `${id}:${step.sid}`;
        if (step.kind === 'numeric') {
          recordAnswer(
            responses,
            key,
            locale === 'es'
              ? String(step.answer).replace('.', ',')
              : String(step.answer),
            locale
          );
        } else {
          responses[key] = step.answer;
        }
        attempts[key] = 1;
      }
      shots.push({
        depth,
        role,
        sid: step.sid,
        position: [at + 1, steps.length],
        checkable: Boolean(checkAnswer(step, step.answer, { locale }) !== null),
        progress: writeProgress({
          lesson,
          responses,
          attempts,
          visited: steps.slice(0, at).map(s => s.sid),
          stepSid: step.sid,
          startedAt: '2026-01-02T03:04:05.000Z',
          depth,
          deepest: depth,
        }),
      });
    }
  }
  return shots;

  async function resolveCut({ activityId, formatId }) {
    const data = await import('/js/data/activities.js');
    const acts = await import('/js/activities/activities.js');
    const a = data.activityById(activityId);
    return acts.resolvedSteps(lesson, data.formatById(a, formatId));
  }
}

async function setLocale(locale) {
  const i18n = await import('/js/i18n/index.js');
  await i18n.setLocale(locale, { persist: false });
  const reg = await import('/js/data/investigations/registry.js');
  await reg.setLessonLocale(locale);
}

async function open(page, id) {
  await page.locator('#investigationsBtn').click();
  await page.locator(`[data-investigation="${id}"]`).click();
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

async function settle(page, [n, total]) {
  // The count in the step's own heading is drawn with the step; the progress
  // bar's text trails it on the first step of a family.
  const at = () =>
    document.querySelector('#investigationBody .inv-step-count')?.textContent;
  await page
    .waitForFunction(
      ([n, total]) => {
        const m =
          document
            .querySelector('#investigationBody .inv-step-count')
            ?.textContent.match(/\d+/g) ?? [];
        return Number(m[0]) === n && Number(m[1]) === total;
      },
      [n, total],
      { timeout: 20000 }
    )
    .catch(async () => {
      throw new Error(
        `Expected step ${n} of ${total}; the panel says ${JSON.stringify(
          await page.evaluate(at)
        )}`
      );
    });
}

function compare(name, got) {
  const file = path.join(DIR, `${name}.json`);
  if (RECORD) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, JSON.stringify(got, null, 1) + '\n');
    return;
  }
  expect(existsSync(file), `${name}: no fixture - rerecord it on purpose`).toBe(
    true
  );
  expect(got).toEqual(JSON.parse(readFileSync(file, 'utf8')));
}

test.describe.configure({ mode: 'parallel' });

for (const id of coverage.lessons) {
  for (const locale of ['en', 'es']) {
    test(`${id} (${locale}): first, graded and last step at every depth`, async ({
      page,
      app,
    }) => {
      test.setTimeout(240_000);
      await app.boot();
      const shots = await page.evaluate(plan, { id, locale });
      expect(shots.length).toBeGreaterThanOrEqual(3);

      const got = [];
      for (const shot of shots) {
        // A fresh page for each screen: the panel keeps the progress it last
        // held for the session and would read that, not what is seeded.
        await app.boot();
        await page.evaluate(
          ([key, progress]) =>
            localStorage.setItem(key, JSON.stringify(progress)),
          [`gravitas_investigation_${id}`, shot.progress]
        );
        await page.evaluate(setLocale, locale);
        await open(page, id);
        await settle(page, shot.position);
        const view = await page.evaluate(SNAPSHOT);
        got.push({
          depth: shot.depth,
          role: shot.role,
          sid: shot.sid,
          position: shot.position,
          ...view,
        });
      }
      compare(`${id}.${locale}`, got);
    });
  }
}

for (const cut of coverage.activities) {
  const [activityId, formatId] = cut.split('/');
  for (const locale of ['en', 'es']) {
    test(`activity ${cut} (${locale}): first, graded and last step of the cut`, async ({
      page,
      app,
    }) => {
      test.setTimeout(240_000);
      await app.boot();
      const lessonId = await page.evaluate(async activityId => {
        const data = await import('/js/data/activities.js');
        return data.activityById(activityId).lesson;
      }, activityId);
      const shots = await page.evaluate(plan, {
        id: lessonId,
        locale,
        activity: { activityId, formatId },
      });

      const got = [];
      for (const shot of shots) {
        await app.boot();
        const key = await page.evaluate(
          async ([activityId, formatId, progress]) => {
            const data = await import('/js/data/activities.js');
            const acts = await import('/js/activities/activities.js');
            const reg = await import('/js/data/investigations/registry.js');
            const { assignmentStorageKey } =
              await import('/js/assignments/assignment.js');
            const a = data.activityById(activityId);
            const lesson = await reg.loadInvestigation(a.lesson);
            const made = acts.assignmentForFormat(
              lesson,
              a,
              data.formatById(a, formatId),
              a.id,
              ''
            );
            const k = assignmentStorageKey(made.assignment);
            // What an earlier screen's visit saved under the assignment's own
            // key would be read instead of this seed.
            for (const old of Object.keys(localStorage)) {
              if (old.startsWith('gravitas_assignment_')) {
                localStorage.removeItem(old);
              }
            }
            localStorage.setItem(k, JSON.stringify(progress));
            return k;
          },
          [activityId, formatId, shot.progress]
        );
        await page.evaluate(setLocale, locale);
        expect(key).toContain('gravitas_assignment_');
        await page.evaluate(
          ([activityId, formatId]) => {
            window.location.hash = `#activity=${activityId}/${formatId}`;
          },
          [activityId, formatId]
        );
        await expect(page.locator('#investigationPanel')).toBeVisible({
          timeout: 20000,
        });
        await settle(page, shot.position);
        const view = await page.evaluate(SNAPSHOT);
        got.push({
          role: shot.role,
          sid: shot.sid,
          position: shot.position,
          ...view,
        });
      }
      compare(`activity.${activityId}.${formatId}.${locale}`, got);
    });
  }
}
