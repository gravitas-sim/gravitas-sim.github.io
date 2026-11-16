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

import { test, expect, loadInvestigation } from './workflow.js';
import { decodeTagged } from '../js/shareState.js';
import {
  ASSIGNMENT_SCHEMA,
  buildAssignment,
} from '../js/assignments/assignment.js';
import { assignmentLink } from '../js/assignments/assignmentLink.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { lessonProvider } from '../js/assignments/provider.js';

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
async function dependentIndices(_page, howMany, { answerable = false } = {}) {
  const lesson = await loadInvestigation('keplers-laws');
  const out = [];
  let seenSetup = false;
  lesson.steps.forEach((step, i) => {
    if (step.setup) {
      seenSetup = true;
      return;
    }
    if (!seenSetup || out.length >= howMany) return;
    // Some tests need a step a student can actually answer, because that
    // is what triggers a save; a `read` step has nothing to click and
    // Next is not always enabled on one.
    if (answerable && !Array.isArray(step.options)) return;
    out.push(i);
  });
  return out;
}

/** The payload a link carries, decoded here rather than trusted. */
async function payloadOf(link) {
  const hash = link.slice(link.indexOf('#') + 1);
  const { payload } = await decodeTagged('a', hash, ASSIGNMENT_SCHEMA);
  return payload;
}

/** The panel's own "Step n of N" line, as numbers. */
async function stepsShown(page) {
  const text = await page.locator('#investigationProgressText').innerText();
  const [, at, of] = text.match(/(\d+)\s+\D+\s*(\d+)/) ?? [];
  return { at: Number(at), of: Number(of) };
}

/** The localStorage keys an assignment's work is saved under. */
const assignmentKeys = page =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .filter(k => k.startsWith('gravitas_assignment_'))
      .sort()
  );

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
  for (const size of [
    { width: 1024, height: 768 },
    { width: 375, height: 800 },
  ]) {
    test(`the builder is a dialog a keyboard reader is moved into (${size.width} px)`, async ({
      page,
      app,
    }) => {
      // P81 K-1: focus stayed on the page behind, the fields were fourteen
      // Tabs in, Escape did nothing and nothing said "dialog".
      await page.setViewportSize(size);
      await openBuilder(page, app);
      const builder = page.locator('#assignmentBuilder');
      await expect(builder).toHaveAttribute('role', 'dialog');
      await expect(builder).toHaveAttribute('aria-modal', 'true');
      await expect(page.locator('#assignName')).toBeFocused();
      // Tab never leaves it, however many times it is pressed.
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        const inside = await page.evaluate(
          () =>
            !!document.activeElement?.closest('#assignmentBuilder') &&
            document.activeElement !== document.body
        );
        expect(inside).toBe(true);
      }
      await page.keyboard.press('Shift+Tab');
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('#assignmentBuilder')
        )
      ).toBe(true);
      await page.keyboard.press('Escape');
      await expect(builder).toHaveCount(0);
    });
  }

  test('a class code rides on the link, where the submission token reads it', async ({
    page,
    app,
  }) => {
    // The token has read ?roster= since it existed; the builder had no field
    // to put it there, so an instructor had to edit the address by hand.
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 1));
    await page.locator('#assignRoster').fill('PHYS 101-A');
    const url = new URL(await makeLink(page));
    expect(url.searchParams.get('roster')).toBe('PHYS 101-A');
    expect(url.hash).toMatch(/^#a1[zr]/);
    // And the field is optional: without it the link carries no query.
    await page.locator('#assignRoster').fill('');
    const bare = new URL(await makeLink(page, 'Week 4'));
    expect(bare.search).toBe('');
  });

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
    const payload = await payloadOf(url);

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

    const chosen = (await payloadOf(url)).s;

    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });

    // What a student is given: the assignment's title on the panel, and as
    // many steps as the link chose, no more.
    const shown = {
      assignment: await page.locator('#investigationTitle').textContent(),
      steps: (await stepsShown(page)).of,
      title: await page.locator('#investigationTitle').textContent(),
    };

    expect(shown.assignment).toBe('Week 3');
    expect(shown.steps).toBe(chosen.length);
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

    const [key] = await assignmentKeys(page);
    const stored = await page.evaluate(
      key => ({
        key,
        payload: localStorage.getItem(key),
        lessonKey: localStorage.getItem('gravitas_investigation_keplers-laws'),
      }),
      key
    );

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
    // The work is still in the assignment's record after the reload.
    expect(await page.evaluate(k => localStorage.getItem(k), stored.key)).toBe(
      stored.payload
    );
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
    const lesson = await loadInvestigation('keplers-laws');
    const base = new URL('/', page.url()).href;

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
      const built = buildAssignment({
        lesson,
        chosen: [sid],
        title,
        fingerprint: stepFingerprint,
      });
      const link = await assignmentLink(built, base);
      return { id: built.i, sids: built.s, url: link.url, title };
    };
    const links = [
      await make(answerable[0], 'Week 3'),
      await make(answerable[1], 'Week 4'),
    ];

    // Different content, so different ids, so different namespaces.
    expect(links[0].id).not.toBe(links[1].id);
    expect(links[0].sids).not.toEqual(links[1].sids);

    for (const link of links) {
      await page.goto(link.url);
      await expect(page.locator('#investigationPanel')).toBeVisible({
        timeout: 30_000,
      });

      // Confirm this really is the assignment we think it is before answering
      // anything in it: its panel is named for it and holds its one step.
      await expect(page.locator('#investigationTitle')).toHaveText(link.title);
      expect((await stepsShown(page)).of).toBe(link.sids.length);
      const known = await assignmentKeys(page);

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
      // The record this assignment saved under: the one that was not there.
      link.key = (await assignmentKeys(page)).find(k => !known.includes(k));
    }

    const keys = await assignmentKeys(page);
    // Two pieces of work, two records, and the full lesson's own progress
    // untouched by either.
    expect(links[0].key).not.toBe(links[1].key);
    expect(keys).toEqual([links[0].key, links[1].key].sort());
    const lessonKey = await page.evaluate(() =>
      localStorage.getItem('gravitas_investigation_keplers-laws')
    );
    expect(lessonKey).toBeNull();
  });

  test('a link re-issued on another day keeps the work, and old keys move across', async ({
    page,
    app,
  }) => {
    // The key used to be the id, and the id starts with the day it was made:
    // the same worksheet handed out again next week opened empty.
    await openBuilder(page, app);
    await tick(page, await dependentIndices(page, 3));
    const issued = await makeLink(page);
    await page.goto(issued);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    const option = page
      .locator('#investigationBody .inv-option:not([disabled])')
      .first();
    for (let i = 0; i < 4 && !(await option.count()); i++) {
      await page.locator('#investigationNext').click();
    }
    await option.click();

    const a = await payloadOf(issued);
    // The same activity, issued on another day.
    const again = { ...a, i: `991231${a.i.slice(6)}`, c: '2099-12-31' };
    const [key] = await assignmentKeys(page);
    const first = {
      key,
      saved: await page.evaluate(k => localStorage.getItem(k), key),
      url: (await assignmentLink(again, new URL('/', page.url()).href)).url,
      legacy: `gravitas_assignment_${a.i}`,
    };
    // No date in it: the lesson, the steps and the title, hashed.
    expect(first.key).toMatch(/^gravitas_assignment_[0-9a-f]{8}$/);
    expect(first.saved).not.toBeNull();

    await page.goto(first.url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    // Opened by the new link, it finds the work under the same record.
    expect(await assignmentKeys(page)).toEqual([first.key]);

    // Work a build before this one saved under the dated key moves across.
    await page.evaluate(({ key, legacy }) => {
      localStorage.setItem(legacy, localStorage.getItem(key));
      localStorage.removeItem(key);
    }, first);
    // A reload, not a goto: the address is the same, and only a fresh page
    // reads storage rather than this tab's copy.
    await page.reload();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    const moved = await page.evaluate(
      ({ key, legacy }) => ({
        now: localStorage.getItem(key),
        old: localStorage.getItem(legacy),
      }),
      first
    );
    expect(moved.old).toBeNull();
    expect(JSON.parse(moved.now).responses).toEqual(
      JSON.parse(first.saved).responses
    );
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

    // What the report is handed: the panel is named for the assignment and
    // holds the steps the link chose. A marker with a stack of these has to be
    // able to tell two assignments cut from one lesson apart.
    const a = await payloadOf(url);
    const passed = {
      id: a.i,
      title: await page.locator('#investigationTitle').textContent(),
      steps: a.s,
      bound: (await stepsShown(page)).of,
    };
    expect(passed.id).toBeTruthy();
    expect(passed.title).toBe('Week 3');
    expect(passed.steps.length).toBeGreaterThan(1);
    expect(passed.bound).toBe(passed.steps.length);
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
    const lesson = await loadInvestigation('keplers-laws');
    const index = lesson.steps.findIndex(s => s.sid === sid);
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
    //
    // Waited for, then asserted: the panel is visible before the subset is
    // installed, so the wait is for the assignment to be in force. What the
    // student is shown is what the link chose, in the order it chose.
    const lesson = await loadInvestigation('keplers-laws');
    const subset = (await payloadOf(link)).s;
    await expect
      .poll(async () => (await stepsShown(page)).of, { timeout: 15_000 })
      .toBe(subset.length);
    const titles = sid => lesson.steps.find(s => s.sid === sid).title;
    await expect(page.locator('.inv-step-title')).toHaveText(titles(subset[0]));
    // The measurement comes before the calculation that copies from it. That
    // is the ordering the dependency exists to produce, and it is what the
    // subset has to preserve: a student asked to work the law out before they
    // have the table has nothing to work it out from.
    expect(subset).toEqual([
      'kepler-s-third-law',
      'measure-four-planets',
      'work-the-law-out-step',
    ]);
    expect(subset.indexOf('measure-four-planets')).toBeLessThan(
      subset.indexOf('work-the-law-out-step')
    );
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

test.describe('an assignment and the package its lesson comes from', () => {
  test('a link that predates pinning, or names an older major version, opens with a message saying so', async ({
    page,
    app,
  }) => {
    await app.boot();
    const lesson = await loadInvestigation('power-law-gravity');
    const base = new URL('/', page.url()).href;
    const pinned = buildAssignment({
      lesson,
      chosen: [lesson.steps[1].sid],
      title: 'pinned',
      fingerprint: stepFingerprint,
      provider: lessonProvider(lesson.id),
    });
    const old = { ...pinned, v: 1, t: 'old' };
    delete old.p;
    const major = { ...pinned, p: [pinned.p[0], '0.9.0'], t: 'major' };
    const url = async a => (await assignmentLink(a, base)).url;
    const links = {
      p: pinned.p,
      pinned: await url(pinned),
      old: await url(old),
      major: await url(major),
    };
    expect(links.p[0]).toBe('gravitas.lesson.power-law-gravity');
    const toast = page.locator('#gravitasToast');
    await page.goto(links.old);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(toast).toContainText(
      'made before investigations came in versioned packages'
    );
    await page.goto(links.major);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(toast).toContainText('a new major version');
  });
});
