// =============================================================================
// The minimal instructor path (Prompt 168)
// -----------------------------------------------------------------------------
// One built-in course, no authoring, in both languages: Teach, the course as it
// comes, the link for students, a student opening it, the review page reading
// their reports, the grade export, and the archive; then next term from the file
// saved, with last term's links still opening and the two terms kept apart on
// the student's side.
//
// What is real and what is built: the instructor's pages, the student's course
// home and assignment, the review page and every download are the application's.
// The report a student hands in is the submission token the lab report carries,
// built with the same functions the other instructor specs use (a headless
// browser does not print a PDF to read back). The throttled walk is the same walk
// with Chromium's CPU at a quarter of its speed; it is a regression check on the
// path having no dead end and no step that has become slow, not a claim about
// class time.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import {
  buildSubmission,
  encodeSubmission,
} from '../js/submission/submissionToken.js';
import { readSource } from '../js/teach/activity.js';

const LESSON = 'transit-photometry';
const transit = await import(`../js/data/investigations/${LESSON}.js`).then(
  m => m.default || Object.values(m)[0]
);

const WORDS = {
  en: {
    term: 'Fall 2026',
    file: 'intro-astronomy-fall-2026.course.json',
    useHeading: 'Use this course as it comes',
    keys: '1 assignments have a new code and the term in their title',
    same: 'Nothing changed under the course',
    termLine: 'Term: Fall 2026',
    title: 'A first transit (Fall 2026)',
    archived: 'Saved gravitas-archive-fall-2026-',
    opened: 'Opened gravitas-archive-fall-2026-',
    nothing: 'nothing yet',
    one: '1 submission',
    two: '2 submissions',
    slug: 'fall-2026',
    teachLink: 'Use as is: Introductory astronomy',
    course: 'Introductory astronomy',
  },
  es: {
    term: 'Otoño 2026',
    file: 'intro-astronomy-otono-2026.course.json',
    useHeading: 'Usar este curso tal como viene',
    keys: '1 tareas tienen un código nuevo y el periodo en su título',
    same: 'No cambió nada en el curso',
    termLine: 'Periodo: Otoño 2026',
    title: 'Un primer tránsito (Otoño 2026)',
    archived: 'Se guardó gravitas-archive-otono-2026-',
    opened: 'Se abrió gravitas-archive-otono-2026-',
    nothing: 'nada todavía',
    one: '1 entrega',
    two: '2 entregas',
    slug: 'otono-2026',
    teachLink: 'Usar tal cual: Astronomía introductoria',
    course: 'Astronomía introductoria',
  },
};

const quiet = (page, locale) =>
  page.addInitScript(l => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
    localStorage.setItem('gravitas_locale', l);
  }, locale);

async function take(page, trigger) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(trigger).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    path: await download.path(),
    text: readFileSync(await download.path(), 'utf8'),
  };
}

/** The submission token a student's lab report carries for an assignment. */
async function tokenFor(activity, name, responses) {
  const stored = Object.fromEntries(
    Object.entries(responses).map(([sid, v]) => [stepKey(LESSON, sid), v])
  );
  const backup = buildBackup({
    lesson: transit,
    responses: stored,
    attempts: {},
    visited: activity.s.slice(0, 3),
    stepSid: activity.s[0],
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: name,
  });
  return (
    await encodeSubmission(
      buildSubmission({
        backup,
        assignmentId: activity.i,
        rosterId: 'ASTR 101',
      })
    )
  ).token;
}

/**
 * The first walk, from Teach to the archive, with each step's time. Returns what
 * the second walk needs: the course file, the course link and the archive.
 */
async function walk(page, locale, clock) {
  const W = WORDS[locale];
  const lap = async name => {
    clock.push([name, Math.round(Date.now() - clock.t0)]);
  };
  clock.t0 = Date.now();
  await quiet(page, locale);

  // Teach: the first section, and a course to use as it comes.
  await page.goto('/teaching/');
  await expect(page.locator('#minimal')).toBeVisible();
  const first = page.locator('#teachMinimal a[href*="?use=intro-astronomy"]');
  await expect(first).toContainText(W.teachLink);
  await first.click();
  await lap('teach to panel');

  // The course builder opens with the panel; name the term and press once.
  await expect(page.locator('body[data-ready="true"]')).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('#cb-term-h')).toHaveText(W.useHeading);
  await page.locator('#cb-term-input').fill(W.term);
  await page.locator('#cb-term-go').click();
  await expect(page.locator('#cb-term-ready')).toContainText(W.term, {
    timeout: 60_000,
  });
  const link = await page.locator('#cb-term-link').inputValue();
  expect(link).toContain('/course/#c');
  await expect(page.locator('#cb-term-keys')).toContainText(W.keys);
  await expect(page.locator('#cb-term-changes')).toContainText(W.same);
  const file = await take(page, '#cb-term-save');
  expect(file.name).toBe(W.file);
  const pack = JSON.parse(file.text);
  expect(pack.term).toBe(W.term);
  await lap('panel to link and file');

  // The kit the panel opens: the same link, a handout.
  const kit = await page.locator('#cb-term-kit').getAttribute('href');
  await page.goto(kit);
  await expect(page.locator('body[data-ready="true"]')).toBeVisible();
  await expect(page.locator('#kitLink')).toHaveValue(link);
  await expect(page.locator('#handout .kit-handout')).toHaveCount(1);
  await lap('kit');

  // A student opens the link: the course, its term, the assignment.
  const student = await page.context().newPage();
  await student.goto(link);
  await expect(student.locator('#ch-term')).toHaveText(W.termLine);
  const assignment = student.locator('#ch-item-a-first-transit a.ui-button');
  await expect(assignment).toBeVisible();
  const href = await assignment.getAttribute('href');
  const opened = await readSource(href);
  expect(opened.ok).toBe(true);
  const activity = opened.activity;
  expect(activity.t).toBe(W.title);
  await student.goto(href);
  await expect(student.locator('#investigationPanel')).toBeVisible({
    timeout: 60_000,
  });
  await expect(student.locator('#investigationTitle')).toHaveText(W.title);
  await lap('student opens the assignment');

  // The student hands in; the instructor reads, marks nothing, exports.
  const ada = await tokenFor(activity, 'ada01', {
    'what-will-the-brightness-do': '1',
  });
  const ben = await tokenFor(activity, 'ben02', {
    'what-will-the-brightness-do': '0',
  });
  await page.goto('/instructors/submissions/');
  await expect(page.locator('#count')).toHaveText(W.nothing);
  for (const [i, token] of [ada, ben].entries()) {
    await page.locator('#paste').fill(token);
    await page.locator('#paste-go').click();
    // The page clears the box when it has read the report: wait for that.
    await expect(page.locator('#count')).toHaveText(i === 0 ? W.one : W.two);
  }
  await page.locator('#paste').fill(file.text);
  await page.locator('#paste-go').click();
  await expect(page.locator('#byActivity tbody th').first()).toHaveText(
    W.title
  );
  await expect(page.locator('#context')).toContainText(W.course);
  const canvas = await take(page, '#exportCanvas');
  expect(canvas.text.split('\r\n')[0]).toContain(W.title);
  await lap('review and the grade export');

  // The term is over: archive, and the page is clear; the archive brings it back.
  const archive = await take(page, '#archiveSave');
  expect(archive.name).toMatch(
    new RegExp(`^gravitas-archive-${W.slug}-\\d{4}-\\d\\d-\\d\\d\\.json$`)
  );
  const doc = JSON.parse(archive.text);
  expect(doc.format).toBe('gravitas.submission-archive');
  expect(doc.term).toBe(W.term);
  expect(doc.reports).toHaveLength(2);
  await expect(page.locator('#count')).toHaveText(W.nothing);
  await expect(page.locator('#archiveStatus')).toContainText(W.archived);
  await expect(page.locator('#byActivity')).toHaveText('');
  await page.locator('#picker').setInputFiles({
    name: archive.name,
    mimeType: 'application/json',
    buffer: Buffer.from(archive.text),
  });
  await expect(page.locator('#count')).toHaveText(W.two);
  await expect(page.locator('#archiveStatus')).toContainText(W.opened);
  await expect(page.locator('#byActivity tbody th').first()).toHaveText(
    W.title
  );
  await lap('archive and reopen');
  return { file, link, activity, W };
}

for (const locale of ['en', 'es']) {
  test(`${locale}: Teach to the grade export and the archive, without authoring`, async ({
    page,
  }) => {
    const clock = [];
    await walk(page, locale, clock);
    test.info().annotations.push({
      type: 'walk ms (unthrottled)',
      description: JSON.stringify(clock),
    });
  });
}

test('the same walk with the CPU at a quarter of its speed has no dead end and no slow step', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium command');
  test.setTimeout(240_000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const clock = [];
  try {
    await walk(page, 'en', clock);
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  test.info().annotations.push({
    type: 'walk ms (CPU x4)',
    description: JSON.stringify(clock),
  });
  // A regression bound, generous on purpose: the walk is eight page loads and
  // four downloads, and the figure is a check that no step became slow, not a
  // statement about how long an instructor needs.
  const total = clock.at(-1)[1];
  expect(total).toBeLessThan(120_000);
});

for (const locale of ['en', 'es']) {
  test(`${locale}: next term from the saved file; last term's links still open and the terms stay apart`, async ({
    page,
  }) => {
    const W = WORDS[locale];
    const next = locale === 'es' ? 'Primavera 2027' : 'Spring 2027';
    const slug = locale === 'es' ? 'primavera-2027' : 'spring-2027';
    await quiet(page, locale);

    // Last term: the course as it comes, and its file.
    await page.goto('/studio/course/?use=intro-astronomy');
    await expect(page.locator('body[data-ready="true"]')).toBeVisible({
      timeout: 60_000,
    });
    await page.locator('#cb-term-input').fill(W.term);
    await page.locator('#cb-term-go').click();
    await expect(page.locator('#cb-term-ready')).toContainText(W.term, {
      timeout: 60_000,
    });
    const oldLink = await page.locator('#cb-term-link').inputValue();
    const oldFile = await take(page, '#cb-term-save');

    // This term: open the file, start a new term.
    await page.goto('/studio/course/');
    await expect(page.locator('body[data-ready="true"]')).toBeVisible({
      timeout: 60_000,
    });
    await page.locator('#cb-file').setInputFiles(oldFile.path);
    await expect(page.locator('#cb-status')).toContainText(
      'intro-astronomy-' + (locale === 'es' ? 'otono' : 'fall') + '-2026'
    );
    await page.locator('#cb-term').click();
    await expect(page.locator('#cb-term-keep')).toBeVisible();
    await page.locator('#cb-term-input').fill(next);
    await page.locator('#cb-term-go').click();
    await expect(page.locator('#cb-term-ready')).toContainText(next, {
      timeout: 60_000,
    });
    const newLink = await page.locator('#cb-term-link').inputValue();
    expect(newLink).not.toBe(oldLink);
    await expect(page.locator('#cb-term-changes')).toContainText(W.same);
    const newFile = await take(page, '#cb-term-save');
    expect(newFile.name).toBe(`intro-astronomy-${slug}.course.json`);
    const pack = JSON.parse(newFile.text);
    const old = JSON.parse(oldFile.text);
    const assignment = p =>
      p.units.flatMap(u => u.items).find(i => i.kind === 'assignment');
    expect(assignment(pack).assignment.id).not.toBe(
      assignment(old).assignment.id
    );
    expect(assignment(pack).title.en).toBe(`A first transit (${next})`);
    // Last term's file is the one it was.
    expect(old.term).toBe(W.term);
    expect(old.id).toBe(
      `intro-astronomy-${locale === 'es' ? 'otono' : 'fall'}-2026`
    );

    // The student opens last term's link and this term's.
    const student = await page.context().newPage();
    const open = async (url, term) => {
      await student.goto(url);
      await expect(student.locator('#ch-term')).toHaveText(
        `${locale === 'es' ? 'Periodo' : 'Term'}: ${term}`
      );
      const href = await student
        .locator('#ch-item-a-first-transit a.ui-button')
        .getAttribute('href');
      return href;
    };
    const oldHref = await open(oldLink, W.term);
    const newHref = await open(newLink, next);
    const keyAfter = async href => {
      await student.goto(href);
      await expect(student.locator('#investigationPanel')).toBeVisible({
        timeout: 60_000,
      });
      const nextButton = student.locator('#investigationNext');
      if (await nextButton.isEnabled()) await nextButton.click();
      await student.waitForTimeout(300);
      return student.evaluate(async () => {
        const inv = await import('/js/investigations.js');
        const key = inv.activeAssignmentKey();
        return { key, held: localStorage.getItem(key) !== null };
      });
    };
    const a = await keyAfter(oldHref);
    const b = await keyAfter(newHref);
    expect(a.key).not.toBe(b.key);
    expect(a.held).toBe(true);
    const stillThere = await student.evaluate(
      key => localStorage.getItem(key) !== null,
      a.key
    );
    expect(stillThere).toBe(true);

    // My work says which term each course was.
    await expect
      .poll(() =>
        student.evaluate(() => localStorage.getItem('gravitas_terms'))
      )
      .toContain(next);
    await student.goto('/my-work/');
    const label = locale === 'es' ? 'Periodo' : 'Term';
    await expect(student.locator('#mwCourses')).toContainText(
      `${label}: ${W.term}`
    );
    await expect(student.locator('#mwCourses')).toContainText(
      `${label}: ${next}`
    );
  });
}

test('the kit starts a new term for an activity and for a course', async ({
  page,
}) => {
  await quiet(page, 'en');
  const link = await (async () => {
    await page.goto('/studio/course/?use=intro-astronomy');
    await page.locator('#cb-term-input').fill('Fall 2026');
    await page.locator('#cb-term-go').click();
    await expect(page.locator('#cb-term-ready')).toContainText('Fall 2026', {
      timeout: 60_000,
    });
    return page.locator('#cb-term-link').inputValue();
  })();
  const hash = new URL(link).hash;

  // A course.
  await page.goto(`/teaching/kit/${hash}`);
  await expect(page.locator('#kit')).toBeVisible();
  await page.locator('#kitTerm').fill('Spring 2027');
  await page.locator('#kitTermGo').click();
  await expect(page.locator('#kitTermOut')).toContainText(
    'New term, Spring 2027',
    { timeout: 60_000 }
  );
  await expect(page.locator('#kitLink')).not.toHaveValue(link);
  await expect(page.locator('#kitTermSave')).toBeVisible();
  const saved = await take(page, '#kitTermSave');
  const pack = JSON.parse(saved.text);
  expect(pack.term).toBe('Spring 2027');
  expect(pack.id).toBe('intro-astronomy-spring-2027');

  // An activity: the title carries the term and the code is new.
  const student = await page.context().newPage();
  await student.goto(link);
  const href = await student
    .locator('#ch-item-a-first-transit a.ui-button')
    .getAttribute('href');
  const was = (await readSource(href)).activity;
  await page.goto(`/teaching/kit/#${new URL(href, 'http://x/').hash.slice(1)}`);
  await page.reload();
  await expect(page.locator('#kit')).toBeVisible();
  await page.locator('#kitTerm').fill('Spring 2027');
  await page.locator('#kitTermWas').fill('Fall 2026');
  await page.locator('#kitTermGo').click();
  await expect(page.locator('#kitName')).toHaveText(
    'A first transit (Spring 2027)',
    { timeout: 60_000 }
  );
  const now = (await readSource(await page.locator('#kitLink').inputValue()))
    .activity;
  expect(now.i).not.toBe(was.i);
  expect(now.s).toEqual(was.s);
});

// Every control and link this path added, measured where a finger and a
// keyboard meet it: at least 24 CSS pixels each way (the axe target-size rule
// fails on Linux font metrics only, so the box is asserted here), inside the
// viewport, and no sideways scroll, on a desktop and a phone, in both
// languages and both light and dark.
const SIZES = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
];

async function smallOrOutside(page, root) {
  return page.evaluate(selector => {
    const bad = [];
    const vw = document.documentElement.clientWidth;
    for (const host of document.querySelectorAll(selector)) {
      for (const el of host.querySelectorAll(
        'a[href], button, input, select, textarea, summary'
      )) {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue; // hidden
        const label = (
          el.id ||
          el.textContent ||
          el.getAttribute('aria-label') ||
          el.tagName
        )
          .trim()
          .slice(0, 40);
        if (r.width < 24 || r.height < 24)
          bad.push(`${label}: ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (r.left < -0.5 || r.right > vw + 0.5)
          bad.push(
            `${label}: outside the viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`
          );
      }
    }
    if (document.documentElement.scrollWidth > vw + 1)
      bad.push(
        `sideways scroll: ${document.documentElement.scrollWidth} > ${vw}`
      );
    return bad;
  }, root);
}

for (const size of SIZES) {
  for (const locale of ['en', 'es']) {
    for (const theme of ['midnight', 'daylight']) {
      test(`the new controls fit at ${size.name} px, ${locale}, ${theme}`, async ({
        page,
      }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.addInitScript(
          ([l, t]) => {
            localStorage.setItem('gravitas_orientation_seen_v1', '1');
            localStorage.setItem('gravitas_welcome_seen_v1', '1');
            localStorage.setItem('gravitas_locale', l);
            localStorage.setItem('gravitas_theme', t);
          },
          [locale, theme]
        );
        const W = WORDS[locale];

        // Teach: the first section.
        await page.goto('/teaching/');
        await expect(page.locator('#teachMinimal')).toBeVisible();
        expect(await smallOrOutside(page, '#teachStart')).toEqual([]);

        // The course builder: the form, then the result.
        await page.goto('/studio/course/?use=intro-astronomy');
        await expect(page.locator('#cb-term-go')).toBeVisible({
          timeout: 60_000,
        });
        expect(await smallOrOutside(page, '#cb-term-panel')).toEqual([]);
        await page.locator('#cb-term-input').fill(W.term);
        await page.locator('#cb-term-go').click();
        await expect(page.locator('#cb-term-ready')).toBeVisible({
          timeout: 60_000,
        });
        expect(await smallOrOutside(page, '#cb-term-panel')).toEqual([]);

        // The kit's new-term block.
        await page.goto(
          await page.locator('#cb-term-kit').getAttribute('href')
        );
        await expect(page.locator('#kitTermGo')).toBeVisible({
          timeout: 30_000,
        });
        expect(await smallOrOutside(page, '#kitReuse')).toEqual([]);

        // The review page's archive section, and the page as a whole.
        await page.goto('/instructors/submissions/');
        await expect(page.locator('#archiveSave')).toBeVisible();
        expect(await smallOrOutside(page, '#archTitle, #archiveSave')).toEqual(
          []
        );
        const box = await page.locator('#archiveSave').boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(24);
      });
    }
  }
}
