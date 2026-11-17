// =============================================================================
// Classroom assignments: the rules the page applies, run in the page
// -----------------------------------------------------------------------------
// Moved out of assignment.spec.js, which judges the product through the DOM and
// runs against `dist/` too. These tests call the assignment, backup and link
// modules directly (binding a link to a revised lesson, refusing a hostile
// link or file, restoring a backup into a subset), so they read `/js/` and run
// against the sources only. They are the same tests, still run with the
// browser suite; nothing was skipped to move them. tests/assignment.test.js
// pins the same rules in Node.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'keplers-laws';

/** Open the builder over a lesson. */
async function openBuilder(page, app) {
  await app.boot({ url: `/?assign=${LESSON}` });
  await expect(page.locator('#assignmentBuilder')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.assignment-step').first()).toBeVisible();
}

/** Tick a set of steps by their position in the list. */
async function tick(page, indices) {
  for (const i of indices) {
    await page.locator('.assignment-step input[type=checkbox]').nth(i).check();
  }
}

/**
 * Positions of steps that are not themselves setup steps but follow one.
 *
 * Chosen from the lesson rather than hard-coded, so the test keeps testing the
 * prerequisite rule after somebody reorders the lesson instead of quietly
 * ticking a setup step and proving nothing.
 */
async function dependentIndices(page, howMany, { answerable = false } = {}) {
  return page.evaluate(
    async ({ n, answerable }) => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('keplers-laws');
      const out = [];
      let seenSetup = false;
      lesson.steps.forEach((step, i) => {
        if (step.setup) {
          seenSetup = true;
          return;
        }
        if (!seenSetup || out.length >= n) return;
        // Some tests need a step a student can actually answer, because that
        // is what triggers a save; a `read` step has nothing to click and
        // Next is not always enabled on one.
        if (answerable && !Array.isArray(step.options)) return;
        out.push(i);
      });
      return out;
    },
    { n: howMany, answerable }
  );
}

/** Build a link from whatever is ticked. */
async function makeLink(page, name = 'Week 3') {
  await page.locator('#assignName').fill(name);
  await page.locator('#assignIntro').fill('Do these before Friday.');
  await page.locator('#assignBuild').click();
  await expect(page.locator('#assignResult')).toBeVisible();
  // Wait for the link itself, not for the box that holds it: encoding is
  // async, and the box can already be on screen from a previous build.
  await expect(page.locator('#assignLink')).not.toHaveValue('');
  return page.locator('#assignLink').inputValue();
}

test.describe('when the lesson has moved on', () => {
  test('a retired step is left out and a rewritten one does not inherit its answer', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 3));
    const url = await makeLink(page);

    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    // Resolve the same assignment against a lesson that has been revised: one
    // step deleted, one rewritten under its own id. Done through the real
    // binding function rather than by editing the catalog on disk, so this
    // exercises the code a future revision would go through.
    const out = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const reg = await import('/js/data/investigations/registry.js');
      const A = await import('/js/assignments/assignment.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const assignment = inv.activeAssignment();
      const lesson = await reg.loadInvestigation(assignment.l);

      const revised = { ...lesson, steps: lesson.steps.map(s => ({ ...s })) };
      // Retire the last step of the assignment.
      const retired = assignment.s[assignment.s.length - 1];
      revised.steps = revised.steps.filter(s => s.sid !== retired);
      // Rewrite another one under its own id: a choice question with a
      // different number of options is a different question.
      const rewritten = assignment.s[1];
      const target = revised.steps.find(s => s.sid === rewritten);
      target.options = [...(target.options || ['a', 'b']), 'extra'];
      target.type = 'question';
      target.kind = 'choice';

      const binding = A.stepBindings(assignment, revised, stepFingerprint);
      const responses = {
        [`${assignment.l}:${rewritten}`]: 1,
        [`${assignment.l}:${assignment.s[0]}`]: 0,
      };
      const filtered = A.filterResponses(
        binding,
        responses,
        sid => `${assignment.l}:${sid}`
      );
      return {
        retired,
        rewritten,
        missing: binding.missing,
        changed: binding.changed,
        keptKeys: Object.keys(filtered.kept),
        droppedKeys: filtered.dropped,
        stepIds: binding.steps.map(s => s.sid),
      };
    });

    // Gone means gone: not matched to a neighbor by position.
    expect(out.missing).toBe(1);
    expect(out.stepIds).not.toContain(out.retired);
    // Rewritten means the answer does not carry over.
    expect(out.changed).toBe(1);
    expect(out.droppedKeys).toContain(`keplers-laws:${out.rewritten}`);
    expect(out.keptKeys).not.toContain(`keplers-laws:${out.rewritten}`);
  });

  test('a mangled or hostile link is refused with a reason', async ({
    page,
    app,
  }) => {
    await app.boot();
    const outcomes = await page.evaluate(async () => {
      const { readAssignmentLink, readAssignmentFile } =
        await import('/js/assignments/assignmentLink.js');
      const { encodeTagged } = await import('/js/shareState.js');
      const truncated = await encodeTagged('a', 1, {
        k: 'gravitas.assignment',
        v: 1,
        i: 'abc',
        l: 'keplers-laws',
        s: ['x'],
      });
      return {
        notALink: (await readAssignmentLink('#a1zNOTBASE64!!')).reason,
        worldLink: (await readAssignmentLink('#1zabcdef')).reason,
        chopped: (await readAssignmentLink(truncated.slice(0, 12))).reason,
        // A file claiming to be an assignment but carrying student work.
        withResponses: readAssignmentFile(
          JSON.stringify({
            k: 'gravitas.assignment',
            v: 1,
            i: 'abc',
            l: 'keplers-laws',
            s: ['x'],
            responses: { 'keplers-laws:x': 3 },
          })
        ).reason,
        notJson: readAssignmentFile('hello').reason,
      };
    });

    expect(outcomes.worldLink).toBe('wrongKind');
    expect(outcomes.notJson).toBe('notJson');
    // A payload carrying somebody's answers is not an assignment and is not
    // opened, whatever it calls itself.
    expect(outcomes.withResponses).toBe('unexpectedField');
    expect(outcomes.notALink).toBeTruthy();
    expect(outcomes.chopped).toBeTruthy();
  });
});

test.describe('the rest of the machinery, in the page', () => {
  test('switching language does not make every step look rewritten', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 3));
    const url = await makeLink(page);

    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    const out = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const reg = await import('/js/data/investigations/registry.js');
      const A = await import('/js/assignments/assignment.js');
      const i18n = await import('/js/i18n/index.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const assignment = inv.activeAssignment();

      const en = await reg.loadInvestigation(assignment.l);
      const beforeSwitch = A.stepBindings(assignment, en, stepFingerprint);
      await i18n.setLocale('es');
      const es = await reg.loadInvestigation(assignment.l);
      const afterSwitch = A.stepBindings(assignment, es, stepFingerprint);
      return {
        enChanged: beforeSwitch.changed,
        esChanged: afterSwitch.changed,
        esMissing: afterSwitch.missing,
        esTitle: es.steps[0].title,
        enTitle: en.steps[0].title,
      };
    });

    // The fingerprint is of the structure, not the wording, which is what
    // makes an assignment work in both languages. A student switching to
    // Spanish must not be told their whole activity was rewritten.
    expect(out.enChanged).toBe(0);
    expect(out.esChanged).toBe(0);
    expect(out.esMissing).toBe(0);
    expect(out.esTitle).not.toBe(out.enTitle);
  });

  test('a progress backup of an assignment restores into it', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 2));
    const url = await makeLink(page);
    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    const out = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const reg = await import('/js/data/investigations/registry.js');
      const B = await import('/js/investigations/progressBackup.js');
      const assignment = inv.activeAssignment();
      const lesson = await reg.loadInvestigation(assignment.l);
      // The assignment's own step list, which is what a student working
      // through it has answers for.
      const active = {
        ...lesson,
        steps: lesson.steps.filter(s => assignment.s.includes(s.sid)),
      };
      const responses = { [`${lesson.id}:${assignment.s[0]}`]: 1 };
      const backup = B.buildBackup({
        lesson: active,
        responses,
        attempts: {},
        visited: [0],
        stepIndex: 0,
        startedAt: new Date().toISOString(),
      });
      const check = B.validateBackup(backup);
      const restored = B.restoreProgress(backup, active);
      return {
        valid: check.ok,
        keys: Object.keys(restored.responses || {}),
        notes: (restored.notes || []).map(n => n.code),
      };
    });

    expect(out.valid).toBe(true);
    // The backup machinery is keyed by sid, so it works on a subset of a
    // lesson without knowing that is what it is looking at.
    expect(out.keys.length).toBe(1);
  });
});
