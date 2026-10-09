// =============================================================================
// The instructor flow, end to end (Roadmap II Prompt 77, INSTRUCTOR_FLOW.md)
// -----------------------------------------------------------------------------
// An adoption page, to the activity builder, to the activity link, to the
// distribution kit (link, QR code, handout in both languages, platform notes),
// to the link a student opens, to the report a student hands in, to the review
// page, to a gradebook file. Also: the course builder opening with an item in
// place, the kit's reuse check, and axe on the kit and the review page.
//
// The student's report is built by the application's own modules from the
// activity the link decoded to (the report's PDF path is covered by
// labReport.test.js); everything an instructor touches is clicked.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import {
  buildSubmission,
  encodeSubmission,
} from '../js/submission/submissionToken.js';
import { readSource } from '../js/teach/activity.js';

const LESSON = 'keplers-laws';
const kepler = await import(`../js/data/investigations/${LESSON}.js`).then(
  m => m.default || Object.values(m)[0]
);

const quiet = page =>
  page.addInitScript(() => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
    localStorage.setItem('gravitas_locale', 'en');
  });

async function take(page, id) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(`#${id}`).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    text: readFileSync(await download.path(), 'utf8'),
  };
}

/** Build an activity from the adoption page, and return what the builder offers. */
async function build(page, app) {
  await quiet(page);
  await page.goto(`/teaching/investigation/${LESSON}/`);
  await expect(
    page.locator('main a[href="/studio/course/?add=keplers-laws"]')
  ).toBeVisible();
  await page.locator(`main a[href="/?assign=${LESSON}"]`).first().click();
  await expect(page.locator('#assignmentBuilder')).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('#assignAll').click();
  await page.locator('#assignName').fill('Week 3: Kepler');
  await page.locator('#assignIntro').fill('Before Friday.');
  await page.locator('#assignRoster').fill('PHYS 101');
  await expect(page.locator('#assignRosterHelp')).toContainText(
    'does not say which student'
  );
  await page.locator('#assignBuild').click();
  await expect(page.locator('#assignLink')).not.toHaveValue('');
  return {
    link: await page.locator('#assignLink').inputValue(),
    kit: await page.locator('#assignKit').getAttribute('href'),
    course: await page.locator('#assignCourse').getAttribute('href'),
  };
}

test.describe('the instructor flow', () => {
  test('from an adoption page to a gradebook file', async ({ page, app }) => {
    const { link, kit, course } = await build(page, app);
    expect(new URL(link).searchParams.get('roster')).toBe('PHYS 101');
    expect(course).toContain('/studio/course/?activity=');

    // The kit.
    await page.goto(kit);
    await expect(page.locator('body[data-ready="true"]')).toBeVisible();
    await expect(page.locator('#kit')).toBeVisible();
    await expect(page.locator('#kitLink')).toHaveValue(
      new RegExp(`roster=PHYS\\+101|roster=PHYS%20101`)
    );
    await expect(page.locator('#kitQr svg')).toBeVisible();
    await expect(page.locator('#handout .kit-handout')).toHaveCount(1);
    await expect(page.locator('#handout')).toContainText('Week 3: Kepler');
    await page.locator('#hoLang').selectOption('both');
    await expect(page.locator('#handout .kit-handout')).toHaveCount(2);
    await expect(
      page.locator('#handout .kit-handout[lang="es"]')
    ).toContainText('Al terminar');
    await expect(page.locator('#lms .kit-lms')).toHaveCount(3);
    await expect(page.locator('#lms textarea').first()).toHaveValue(
      /Open the activity here/
    );
    await page.locator('#kitHint').fill('your login');
    await page.locator('#kitHint').blur();
    await expect(page.locator('#handout')).toContainText('your login');
    // The student link is the one the builder made.
    const studentLink = await page.locator('#kitLink').inputValue();
    expect(new URL(studentLink).hash).toBe(new URL(link).hash);

    // The student opens it.
    await page.goto(studentLink);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('#investigationPanel')).toContainText(
      /Week 3: Kepler/
    );

    // The report the student hands in: two students and one that is not ready.
    const read = await readSource(link);
    expect(read.ok).toBe(true);
    const a = read.activity;
    const token = async (name, responses, roster = 'PHYS 101') => {
      const stored = Object.fromEntries(
        Object.entries(responses).map(([sid, v]) => [stepKey(LESSON, sid), v])
      );
      const backup = buildBackup({
        lesson: kepler,
        responses: stored,
        attempts: {},
        visited: a.s.slice(0, 3),
        stepSid: a.s[0],
        startedAt: '2026-09-01T10:00:00.000Z',
        studentName: name,
      });
      return (
        await encodeSubmission(
          buildSubmission({ backup, assignmentId: a.i, rosterId: roster })
        )
      ).token;
    };
    const ada = await token('ada01', {
      'where-is-the-star': '1',
      'why-the-speed-changes': 'It speeds up near the star.',
    });
    const ben = await token('=HYPERLINK("http://example.invalid","x")', {
      'where-is-the-star': '0',
    });

    // Review.
    await page.goto('/instructors/submissions/');
    await expect(page.locator('#count')).toHaveText('nothing yet');
    await page.locator('#paste').fill(ada);
    await page.locator('#paste-go').click();
    await page.locator('#paste').fill(ben);
    await page.locator('#paste-go').click();
    await expect(page.locator('#count')).toHaveText('2 submissions');
    // Named from the link, before the instructor's own words are used.
    await page.locator('#paste').fill(link);
    await page.locator('#paste-go').click();
    await expect(page.locator('#context')).toContainText('Week 3: Kepler');
    await expect(page.locator('#byActivity tbody th').first()).toHaveText(
      'Week 3: Kepler'
    );
    await expect(page.locator('#who li').first()).toContainText(
      'Week 3: Kepler'
    );

    // One class code is on both reports, so by roster id they are one student
    // (and the later report is the score); by the name each typed they are two.
    await expect(page.locator('#gbSummary')).toContainText('1 students');
    await page.locator('#gbIdentifier').selectOption('name');
    await expect(page.locator('#gbSummary')).toContainText('2 students');

    // Judgment: opt in, mark, and see the gradebook say the score is whole.
    await expect(page.locator('#gbSummary')).toContainText(
      '1 written answers have no mark yet'
    );
    await page.locator('#judgeToggle').click();
    await expect(page.locator('.sr-response')).toContainText(
      'It speeds up near the star.'
    );
    await page.locator('input[data-field="mark"]').first().fill('1');
    await page
      .locator('input[data-field="comment"]')
      .first()
      .fill('Names the speed-up.');
    await page.locator('input[data-field="comment"]').first().blur();
    await expect(page.locator('#judgeSummary')).toContainText(
      '1 of 1 written answers marked'
    );
    await expect(page.locator('#gbSummary')).not.toContainText('no mark yet');

    // The written answer is not in the marks file unless asked for.
    const marks = await take(page, 'marksSave');
    expect(marks.text).toContain('gravitas.instructor-marks/1');
    expect(marks.text).toContain(',instructor,1,');
    expect(marks.text).not.toContain('speeds up near');

    // Gradebook files, matching on the typed name.
    const canvas = await take(page, 'exportCanvas');
    expect(canvas.name).toMatch(
      /^gravitas-gradebook-canvas-\d{4}-\d\d-\d\d\.csv$/
    );
    const lines = canvas.text.trim().split('\r\n');
    expect(lines[0]).toBe(
      'Student,ID,SIS User ID,SIS Login ID,Section,Week 3: Kepler'
    );
    expect(lines[1]).toMatch(/^ {4}Points Possible,,,,,\d+$/);
    expect(canvas.text).toContain('ada01');
    expect(canvas.text).toContain(`"'=HYPERLINK(`);
    const moodle = await take(page, 'exportMoodle');
    expect(moodle.text).toContain('Instructor comment: Names the speed-up.');
    const d2l = await take(page, 'exportD2l');
    expect(d2l.text.trim().split('\r\n')[0]).toBe(
      'OrgDefinedId,Week 3: Kepler Points Grade,End-of-Line Indicator'
    );
    expect(
      d2l.text
        .trim()
        .split('\r\n')
        .slice(1)
        .every(l => l.endsWith(',#'))
    ).toBe(true);
  });

  test('the course builder opens with the item in place', async ({ page }) => {
    await quiet(page);
    await page.goto('/studio/course/?add=keplers-laws');
    await expect(page.locator('body[data-ready="true"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('#cb-status')).toContainText(
      /Added to the course/
    );
    const text = await page.locator('main').innerText();
    expect(text).toMatch(/keplers-laws/);
  });

  test('the kit checks an activity file against this build', async ({
    page,
    app,
  }) => {
    const { link } = await build(page, app);
    await page.goto('/teaching/kit/');
    await page.locator('#kitPaste').fill(link);
    await page.locator('#kitGo').click();
    await expect(page.locator('#kit')).toBeVisible();
    await page.locator('#kitReuseCheck').click();
    await expect(page.locator('#kitReuseOut')).toContainText(
      /steps are as they were/,
      { timeout: 30_000 }
    );
  });

  test('the kit refuses what is not an activity or a course', async ({
    page,
  }) => {
    await quiet(page);
    await page.goto('/teaching/kit/');
    await page.locator('#kitPaste').fill('just some words');
    await page.locator('#kitGo').click();
    await expect(page.locator('#kitStatus')).toContainText(
      'not a link to an activity'
    );
    await expect(page.locator('#kit')).toBeHidden();
  });

  test('the kit and the review page pass axe, and the kit has no sideways scroll', async ({
    page,
    app,
  }) => {
    const { kit } = await build(page, app);
    await page.goto(kit);
    await expect(page.locator('#kit')).toBeVisible();
    await expect(page.locator('#handout .kit-handout')).toHaveCount(1);
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map(v => v.id)).toEqual([]);
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1
    );
    expect(wide).toBe(false);
    await page.goto('/instructors/submissions/');
    const r2 = await new AxeBuilder({ page }).analyze();
    expect(r2.violations.map(v => v.id)).toEqual([]);
  });
});
