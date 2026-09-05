// =============================================================================
// The investigation walker
// -----------------------------------------------------------------------------
// Opens all twelve investigations and takes all 370 steps, in a browser.
//
// What the static checker cannot know
// -----------------------------------------------------------------------------
// tools/author-check.mjs reads the lessons as data: it can see that a step names
// a widget, and that the widget has a control called `mass`. It cannot see that
// the widget actually painted, that the scenario the step asks for really built,
// that a probe produced rows against a live world, or that pressing Next moved.
// Those are properties of the running application, and this is where they are
// checked.
//
// Per step, where the step declares it:
//
//   setup        the scenario named is the scenario loaded, and it has bodies
//   widget       the canvas exists and has non-blank pixels
//   probe        the live readout produced at least one row
//   interaction  choices are answered, response fields filled, boxes ticked
//   grading      the answer the lesson itself declares is submitted, and the
//                site marks it correct - the same rule the answer key uses
//   advance      Next actually moved, within a bounded wait
//
// and at the end of each lesson, that the report opens.
//
// Sharded by lesson
// -----------------------------------------------------------------------------
// One test per lesson, twelve tests, each booting once and walking its lesson in
// a single page. Playwright already runs files in parallel and tests within a
// file across workers, so the natural unit of work is a lesson: a shard is a
// lesson, contexts are reused across all of that lesson's steps, and a failure
// names the lesson it happened in.
//
// The long live-physics validations are not here. Measuring a real libration or
// a real synodic period takes minutes of simulated time and lives in
// e2e/resonance.spec.js and e2e/chaos.spec.js, which are their own suites. This
// walker exercises every step's machinery; it does not re-derive the physics
// those suites already establish.
// =============================================================================

import { test, expect } from './fixtures.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { checkAnswer } from '../js/answerCheck.js';

/** Lessons this run should walk. GRAVITAS_WALK=tides,black-holes narrows it. */
const only = (process.env.GRAVITAS_WALK || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const lessons = only.length
  ? INVESTIGATIONS.filter(i => only.includes(i.id))
  : INVESTIGATIONS;

/** The 1-based step the panel says it is on. */
async function stepNumber(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.inv-step-count');
    const m = /(\d+)/.exec(el?.textContent || '');
    return m ? Number(m[1]) : 0;
  });
}

/** True when the canvas has drawn something other than its background. */
async function canvasPainted(page, selector) {
  return page.evaluate(sel => {
    const c = document.querySelector(sel);
    if (!c || !c.width || !c.height) return { ok: false, why: 'no canvas' };
    const ctx = c.getContext('2d');
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    // Distinct colours rather than "not transparent": a widget that cleared to
    // its background and drew nothing is still fully opaque.
    const seen = new Set();
    for (let i = 0; i < data.length; i += 4 * 37) {
      seen.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
      if (seen.size > 3) return { ok: true, colours: seen.size };
    }
    return {
      ok: false,
      why: `only ${seen.size} colour(s)`,
      colours: seen.size,
    };
  }, selector);
}

for (const inv of lessons) {
  test.describe(`walking ${inv.id}`, () => {
    test(`all ${inv.steps.length} steps run, and the report opens`, async ({
      page,
      app,
    }, testInfo) => {
      // A lesson is a long serial interaction; the budget scales with it.
      testInfo.setTimeout(60_000 + inv.steps.length * 12_000);

      const problems = [];
      const note = (i, message) =>
        problems.push(
          `step ${i + 1}/${inv.steps.length} (${inv.steps[i].title}): ${message}`
        );

      await app.boot({ url: `/#investigation=${inv.id}` });
      await expect(page.locator('#investigationPanel')).toBeVisible({
        timeout: 30_000,
      });

      const next = page.locator('#investigationNext');
      const finish = page.locator('#investigationFinish');

      for (let i = 0; i < inv.steps.length; i++) {
        const step = inv.steps[i];

        const at = await stepNumber(page);
        if (at !== i + 1) {
          note(i, `the panel says it is on step ${at}`);
          break;
        }

        // --- The step rendered -------------------------------------------
        const shown = await page.evaluate(
          () => document.querySelector('.inv-step-title')?.textContent || ''
        );
        if (shown.trim() !== step.title.trim()) {
          note(i, `the panel shows "${shown}"`);
        }

        // --- Its setup was applied ---------------------------------------
        if (step.setup?.scenario) {
          const world = await page.evaluate(async () => {
            const ui = await import('/js/ui.js');
            const p = await import('/js/physics.js');
            const lists = [
              'bh_list',
              'stars',
              'planets',
              'gas_giants',
              'asteroids',
              'comets',
              'neutron_stars',
              'white_dwarfs',
              'galaxies',
            ];
            return {
              scenario: ui.current_scenario_name,
              bodies: lists.reduce((n, l) => n + (p[l] || []).length, 0),
            };
          });
          if (world.scenario !== step.setup.scenario) {
            note(
              i,
              `asked for "${step.setup.scenario}", the world is "${world.scenario}"`
            );
          }
          if (world.bodies === 0) {
            note(i, `"${step.setup.scenario}" built an empty world`);
          }
        }

        // --- Its widget drew ---------------------------------------------
        if (step.tool?.id) {
          const painted = await canvasPainted(page, '#investigationToolCanvas');
          if (!painted.ok) {
            note(i, `widget "${step.tool.id}" did not draw (${painted.why})`);
          }
        }

        // --- Its probe produced rows -------------------------------------
        if (step.probe) {
          const rows = await page
            .locator('#investigationProbe .inv-probe-row')
            .count();
          const anyText = await page.evaluate(
            () =>
              (
                document.getElementById('investigationProbe')?.textContent || ''
              ).trim().length
          );
          if (rows === 0 && anyText === 0) {
            note(i, 'the probe produced no readout');
          }
        }

        // --- Grading, where the lesson declares the answer ---------------
        const kind = step.type === 'predict' ? 'choice' : step.kind;
        if (
          (step.type === 'predict' || step.type === 'question') &&
          kind === 'choice'
        ) {
          const options = page.locator('#investigationBody .inv-option');
          const count = await options.count();
          if (count !== step.options.length) {
            note(
              i,
              `${count} options on screen for ${step.options.length} in the lesson`
            );
          }
          if (count > 0) {
            await options.nth(step.answer).click();
            // The shipped UI's own verdict. After a click the step re-renders
            // locked, and the option the lesson declares correct is given
            // `is-correct` by js/investigations.js - so asserting the clicked
            // button carries it proves the application agrees with the lesson,
            // rather than proving this file can call checkAnswer.
            const marked = await page.evaluate(
              idx =>
                document.querySelector(`.inv-option[data-option="${idx}"]`)
                  ?.className ?? null,
              step.answer
            );
            if (marked !== null && !marked.includes('is-correct')) {
              note(
                i,
                `the panel did not mark option ${step.answer} correct (class "${marked}")`
              );
            }
            if (checkAnswer(step, step.answer) !== true) {
              note(i, `the grader rejects option ${step.answer}`);
            }
          }
        }

        if (step.type === 'question' && kind === 'numeric') {
          const box = page
            .locator(
              '#investigationBody input[data-answer-numeric], #investigationBody input[type="number"]'
            )
            .first();
          if (await box.count()) {
            await box.fill(String(step.answer));
          }
          if (checkAnswer(step, step.answer) !== true) {
            note(
              i,
              'the grader rejects the numeric answer the lesson declares'
            );
          }
        }

        if (step.type === 'question' && kind === 'short') {
          const area = page
            .locator('#investigationBody textarea[data-answer]')
            .first();
          if (await area.count()) {
            await area.fill(
              'A written response long enough to unlock the model answer for this step.'
            );
          }
        }

        // --- Response fields ---------------------------------------------
        if (step.fields?.length) {
          // Whether the step supplies a usable number for every field a
          // student types into. Only then is it fair to judge the validator and
          // the derived fields: filling the rest with an invented 1 tests this
          // walker's imagination, not the lesson. A hint is prose as often as a
          // value - "e.g. 1.000065" is a placeholder - so it has to parse.
          const numeric = h => {
            const n = Number(String(h ?? '').replace(/[^0-9eE+\-.]/g, ''));
            return Number.isFinite(n) && String(h ?? '').trim() !== ''
              ? n
              : null;
          };
          const typedFields = step.fields.filter(
            f => typeof f.compute !== 'function'
          );
          const fullyHinted =
            typedFields.length > 0 &&
            typedFields.every(f => numeric(f.hint) !== null);

          const inputs = page.locator('#investigationBody input[data-field]');
          const n = await inputs.count();
          for (let f = 0; f < n; f++) {
            const input = inputs.nth(f);
            const key = await input.getAttribute('data-field');
            const fieldId = String(key).split(':').pop();
            const field = step.fields.find(x => x.id === fieldId);
            // A computed field is rendered read-only: the engine fills it from
            // the field's own compute() as the typed ones change. Trying to
            // type into it is a bug in this walker, not in the lesson.
            const readonly = await input.getAttribute('readonly');
            if (readonly !== null || typeof field?.compute === 'function') {
              continue;
            }
            if (!(await input.inputValue())) {
              // A hint is prose as often as it is a value - "e.g. 1.000065" is
              // a placeholder, not an answer - so it is only used when it
              // parses. Typing the prose in produced NaN downstream and looked
              // like a broken compute().
              await input.fill(String(numeric(field?.hint) ?? 1));
            }
          }
          if (n === 0) {
            note(
              i,
              `${step.fields.length} response fields declared, none on screen`
            );
          }
          // Derived fields should now hold something: the engine recomputes
          // them from the typed values, and a compute() that silently produced
          // nothing leaves a student staring at an empty box.
          for (const f of fullyHinted ? step.fields : []) {
            if (typeof f.compute !== 'function') continue;
            const derived = page.locator(
              `#investigationBody input[data-field$=":${f.id}"]`
            );
            if (!(await derived.count())) continue;
            if (!(await derived.first().inputValue()).trim()) {
              note(i, `computed field "${f.id}" stayed empty`);
            }
          }
          // A validator must not reject the values the step itself suggests -
          // but only when those values are the step's own, not this walker's.
          const verdict = fullyHinted
            ? await page.evaluate(
                () =>
                  document.querySelector('.inv-check.is-error')?.textContent ||
                  null
              )
            : null;
          if (verdict) {
            note(
              i,
              `the validator rejects the step's own hints: ${verdict.trim().slice(0, 90)}`
            );
          }
        }

        // --- Checklists ---------------------------------------------------
        const boxes = page.locator('#investigationBody input[type="checkbox"]');
        const boxCount = await boxes.count();
        for (let b = 0; b < boxCount; b++) {
          const box = boxes.nth(b);
          if (!(await box.isChecked())) await box.check().catch(() => {});
        }

        // --- Advance -------------------------------------------------------
        const last = i === inv.steps.length - 1;
        await next.click();
        const moved = await expect
          .poll(
            async () =>
              (await finish.isVisible().catch(() => false)) ||
              (await stepNumber(page)) > at,
            { timeout: 30_000 }
          )
          .toBe(true)
          .then(() => true)
          .catch(() => false);
        if (!moved) {
          note(i, 'Next did not advance');
          break;
        }
        if (last) break;
      }

      // --- Completion -------------------------------------------------------
      await expect(finish, `${inv.id} never reached its report`).toBeVisible({
        timeout: 30_000,
      });
      const summary = await page.evaluate(() =>
        (
          document.getElementById('investigationFinishSummary')?.textContent ||
          ''
        ).trim()
      );
      if (!summary) problems.push('the report opened with an empty summary');

      expect(problems, `${inv.id}:\n  ${problems.join('\n  ')}`).toEqual([]);
    });
  });
}
