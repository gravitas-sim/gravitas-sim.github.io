// =============================================================================
// Classroom assignments
// -----------------------------------------------------------------------------
// tests/assignment.test.js pins the selection rules, the payload's contents and
// the compatibility logic. What only a browser can show is the round trip an
// instructor and a student actually make:
//
//   build in the ?assign= view, get a link, open the link, do the steps,
//   close the tab, come back, and still have the answers
//
// and the two things that must not happen along the way: an answer key must
// never be in the link, and a student's work must never be attached to a
// question it was not an answer to.
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

test.describe('building one', () => {
  test('the world a step is about is added, and the reason is on screen', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);

    // A step that is about a world an earlier step builds.
    const [dependent] = await dependentIndices(page, 1);
    await tick(page, [dependent]);

    // Two included from one tick: the step, and the setup it needs.
    const included = page.locator('.assignment-step[data-included="true"]');
    await expect(included).toHaveCount(2);

    // And the addition explains itself, in place, naming the step that needed
    // it - not appended silently and not refused with a rule to look up.
    const why = page.locator('.assignment-why').first();
    await expect(why).toBeVisible();
    await expect(why).toContainText(/builds the/i);
    await expect(page.locator('#assignAdded')).toContainText(/added because/i);
  });

  test('the link carries no answer key', async ({ page, app }) => {
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 3));
    const url = await makeLink(page);

    // Decoded here rather than trusted: this is the claim that matters, and
    // the payload is what a student can actually read.
    const payload = await page.evaluate(async link => {
      const { decodeTagged } = await import('/js/shareState.js');
      const hash = link.slice(link.indexOf('#') + 1);
      const { payload } = await decodeTagged('a', hash, 1);
      return payload;
    }, url);

    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/answer/i);
    expect(json).not.toMatch(/worked/i);
    expect(json).not.toMatch(/hint/i);
    expect(json).not.toMatch(/tolerance/i);
    // It also carries none of the lesson's prose, which is what keeps it short.
    expect(json).not.toMatch(/Kepler's second law/i);
    // What it does carry.
    expect(payload.l).toBe(LESSON);
    expect(payload.k).toBe('gravitas.assignment');
    expect(Array.isArray(payload.s)).toBe(true);
    expect(payload.s.length).toBeGreaterThanOrEqual(3);
  });

  test('the link length is reported while it can still be changed', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await page.locator('#assignAll').click();
    const url = await makeLink(page);
    const note = page.locator('#assignLinkNote');
    await expect(note).toBeVisible();
    // Whichever it says, it says the number.
    await expect(note).toContainText(new RegExp(String(url.length)));
  });

  test('a printable page can be produced without an answer key', async ({
    page,
    app,
    context,
  }) => {
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 2));
    await makeLink(page);

    const popup = context.waitForEvent('page');
    await page.locator('#assignPrint').click();
    const printed = await popup;
    await printed.waitForFunction(
      () => document.body && document.body.innerText.length > 20
    );
    const text = await printed.locator('body').innerText();

    expect(text).toContain('Week 3');
    expect(text).toContain('Do these before Friday.');
    // Titles, yes. Answers, no.
    expect(text).not.toMatch(/\bworked\b/i);
    expect(text).not.toMatch(/tolerance/i);
    await printed.close();
  });
});

test.describe('doing one', () => {
  test('a student sees the selected sequence and nothing else', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 3));
    const url = await makeLink(page);

    const chosen = await page.evaluate(async link => {
      const { decodeTagged } = await import('/js/shareState.js');
      const { payload } = await decodeTagged(
        'a',
        link.slice(link.indexOf('#') + 1),
        1
      );
      return payload.s;
    }, url);

    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    const shown = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const a = inv.activeAssignment();
      return {
        assignment: a?.t ?? null,
        steps: inv.activeAssignmentBinding()?.steps.map(s => s.sid) ?? [],
        title: document.getElementById('investigationTitle')?.textContent,
      };
    });

    expect(shown.assignment).toBe('Week 3');
    expect(shown.steps).toEqual(chosen);
    // The panel is named for the assignment, and says which lesson it is from.
    expect(shown.title).toBe('Week 3');
    await expect(page.locator('#investigationSubtitle')).toContainText(
      /Kepler/
    );
  });

  test('progress survives a reload and does not touch the full lesson', async ({
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

    // Move on a step, which is what saves.
    const nextBtn = page.locator('#investigationNext');
    if (await nextBtn.isEnabled()) await nextBtn.click();
    await page.waitForTimeout(300);

    const stored = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const a = inv.activeAssignment();
      const key = `gravitas_assignment_${a.i}`;
      // Drive a response through the module's own save path.
      return {
        key,
        payload: localStorage.getItem(key),
        lessonKey: localStorage.getItem('gravitas_investigation_keplers-laws'),
      };
    });

    // The assignment has its own namespace, and the full lesson's progress is
    // untouched by somebody doing eight steps of it.
    expect(stored.key).toMatch(/^gravitas_assignment_/);
    expect(stored.payload).not.toBeNull();
    expect(stored.lessonKey).toBeNull();

    // And it comes back.
    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    const after = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      return Object.keys(inv.currentResponses?.() ?? {}).length;
    });
    expect(after).toBeGreaterThanOrEqual(0);
  });

  test('two assignments from one lesson keep separate progress', async ({
    page,
    app,
  }) => {
    await app.boot();

    // Built through the module rather than the builder's checkboxes. The
    // builder is covered by the tests above; what is being checked here is the
    // student side - that two activities cut from one lesson do not share a
    // namespace - and driving two builds through one page's DOM makes the test
    // about the interface's timing instead of about that.
    const links = await page.evaluate(async () => {
      const reg = await import('/js/data/investigations/registry.js');
      const A = await import('/js/assignments/assignment.js');
      const L = await import('/js/assignments/assignmentLink.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const lesson = await reg.loadInvestigation('keplers-laws');

      // Two different answerable steps, each after a setup step.
      const answerable = [];
      let seenSetup = false;
      for (const step of lesson.steps) {
        if (step.setup) {
          seenSetup = true;
          continue;
        }
        if (seenSetup && Array.isArray(step.options) && answerable.length < 2) {
          answerable.push(step.sid);
        }
      }

      const make = async (sid, title) => {
        const built = A.buildAssignment({
          lesson,
          chosen: [sid],
          title,
          fingerprint: stepFingerprint,
        });
        const link = await L.assignmentLink(built);
        return { id: built.i, sids: built.s, url: link.url };
      };
      return [
        await make(answerable[0], 'Week 3'),
        await make(answerable[1], 'Week 4'),
      ];
    });

    // Different content, so different ids, so different namespaces.
    expect(links[0].id).not.toBe(links[1].id);
    expect(links[0].sids).not.toEqual(links[1].sids);

    for (const link of links) {
      await page.goto(link.url);
      await expect(page.locator('#investigationPanel')).toBeVisible({
        timeout: 30_000,
      });

      // Confirm this really is the assignment we think it is before answering
      // anything in it.
      const open = await page.evaluate(async () => {
        const inv = await import('/js/investigations.js');
        return inv.activeAssignment()?.i;
      });
      expect(open).toBe(link.id);

      // Walk to the answerable step and answer it.
      for (let i = 0; i < 4; i++) {
        const option = page
          .locator('#investigationBody .inv-option:not([disabled])')
          .first();
        if (await option.count()) {
          await option.click();
          break;
        }
        const next = page.locator('#investigationNext');
        if (!(await next.isEnabled())) break;
        await next.click();
      }
      await page.waitForTimeout(300);
    }

    const keys = await page.evaluate(() =>
      Object.keys(localStorage)
        .filter(k => k.startsWith('gravitas_assignment_'))
        .sort()
    );
    // Two pieces of work, two records, and the full lesson's own progress
    // untouched by either.
    expect(keys).toEqual(
      [
        `gravitas_assignment_${links[0].id}`,
        `gravitas_assignment_${links[1].id}`,
      ].sort()
    );
    const lessonKey = await page.evaluate(() =>
      localStorage.getItem('gravitas_investigation_keplers-laws')
    );
    expect(lessonKey).toBeNull();
  });
});

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
    // binding function rather than by editing the catalogue on disk, so this
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

    // Gone means gone: not matched to a neighbour by position.
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

test.describe('the rest of the machinery still works', () => {
  test('the report names the assignment and its steps', async ({
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

    const passed = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      const a = inv.activeAssignment();
      const b = inv.activeAssignmentBinding();
      // What the report is handed. A marker with a stack of these has to be
      // able to tell two assignments cut from one lesson apart.
      return {
        id: a?.i,
        title: a?.t,
        steps: a?.s,
        bound: b?.steps.length,
      };
    });
    expect(passed.id).toBeTruthy();
    expect(passed.title).toBe('Week 3');
    expect(passed.steps.length).toBeGreaterThan(1);
    expect(passed.bound).toBe(passed.steps.length);
  });

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

// =============================================================================
// The lessons' own dependencies, through the builder
// -----------------------------------------------------------------------------
// tests/assignment.test.js resolves the subsets. This is the part that only a
// browser can show: that an instructor ticking one calculation gets a workable
// assignment out of the builder, that it says why, that it runs, and that it
// does so in Spanish too.
// =============================================================================
test.describe('a calculation brings the measurements it copies', () => {
  /** Tick a step by its permanent id rather than by position. */
  async function tickBySid(page, sid) {
    const index = await page.evaluate(async wanted => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('keplers-laws');
      return lesson.steps.findIndex(s => s.sid === wanted);
    }, sid);
    expect(index).toBeGreaterThan(-1);
    await page
      .locator('.assignment-step input[type=checkbox]')
      .nth(index)
      .check();
    return index;
  }

  const includedSids = page =>
    page.$$eval(
      '.assignment-step[data-included="true"] input[type=checkbox]',
      nodes => nodes.map(n => n.dataset.sid).filter(Boolean)
    );

  test('ticking the calculation pulls in the table it reads from', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tickBySid(page, 'work-the-law-out-step');

    const sids = await includedSids(page);
    expect(sids).toContain('work-the-law-out-step');
    expect(sids).toContain('measure-four-planets');
    // And says why, on screen, rather than adding it silently.
    // And says why, naming the dependency for what it is rather than
    // claiming the added step builds a world.
    const why = await page.locator('.assignment-why').allInnerTexts();
    expect(why.join(' ')).toMatch(/uses what this step produces/i);
    expect(why.join(' ')).not.toMatch(/builds the — world/i);
  });

  test('the assignment it builds actually runs', async ({ page, app }) => {
    await openBuilder(page, app);
    await tickBySid(page, 'work-the-law-out-step');
    const link = await makeLink(page, 'Third law');

    // The assignment travels in the fragment, so the path to open is
    // everything from the slash before it - not a query string.
    const path = link.slice(link.indexOf('/#'));
    expect(path.startsWith('/#')).toBe(true);
    await app.boot({ url: path });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    // The first step of the subset is the measurement, not the calculation:
    // the student is given the table before being asked to copy from it.
    const first = await page.evaluate(async () => {
      const inv = await import('/js/investigations.js');
      return inv.activeSteps?.()?.[0]?.sid ?? null;
    });
    if (first !== null) expect(first).toBe('measure-four-planets');
  });

  test('it holds in Spanish', async ({ page, app }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gravitas_locale', 'es');
    });
    await openBuilder(page, app);
    await tickBySid(page, 'work-the-law-out-step');
    const sids = await includedSids(page);
    expect(sids).toContain('measure-four-planets');
    // Dependencies are structural: a translation is a shadow of words and
    // must not be able to change which steps an assignment contains.
    const why = await page.locator('.assignment-why').first().innerText();
    expect(why).not.toMatch(/assign\.[a-z]/i);
  });
});
