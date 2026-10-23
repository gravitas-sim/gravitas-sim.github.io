// =============================================================================
// Adapting an activity, proven by the step graph (Prompt 175)
// -----------------------------------------------------------------------------
// tests/assignmentAdaptation.test.js runs the check over every lesson and edge.
// What only a browser shows: an instructor changes the order and is refused,
// with the step named, where the lesson depends on it; writes a sentence and a
// due line; makes a link; and a student opens it and reads them. And a link
// made before the lesson changed opens with a report and two ways forward.
// =============================================================================

import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

// What axe finds on the new surfaces, in both languages and the two themes
// accessibility.spec.js holds every page to.
const THEMES = ['midnight', 'daylight'];
const LANGUAGES = ['en', 'es'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const seed = (page, language, theme) =>
  page.addInitScript(
    ([l, t]) => {
      localStorage.setItem('gravitas_locale', l);
      localStorage.setItem('gravitas_theme', t);
    },
    [language, theme]
  );

async function axe(page) {
  await page
    .evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(a => a.effect?.getTiming?.().iterations !== Infinity)
          .map(a => a.finished.catch(() => {}))
      )
    )
    .catch(() => {});
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  return violations.map(v => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')),
  }));
}

const LESSON = 'keplers-laws';

async function openBuilder(page, app) {
  await app.boot({ url: `/?assign=${LESSON}` });
  await expect(page.locator('#assignmentBuilder')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.assignment-step').first()).toBeVisible();
}

const tick = (page, sid) =>
  page.locator(`#assignSteps input[data-sid="${sid}"]`).check();
const row = (page, sid) => page.locator(`#adaptOrder li[data-sid="${sid}"]`);
const order = page =>
  page
    .locator('#adaptOrder li[data-sid]')
    .evaluateAll(l => l.map(x => x.dataset.sid));

/** The payload a link carries. */
const decode = (page, url) =>
  page.evaluate(async link => {
    const { decodeTagged } = await import('/js/shareState.js');
    const { ASSIGNMENT_SCHEMA } = await import('/js/assignments/assignment.js');
    const { payload } = await decodeTagged(
      'a',
      link.slice(link.indexOf('#') + 1),
      ASSIGNMENT_SCHEMA
    );
    return payload;
  }, url);

test.describe('in the builder', () => {
  test('a move the lesson depends on is refused, naming both steps', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, 'where-is-the-star');
    await tick(page, 'measure-the-two-orbits');
    expect(await order(page)).toEqual([
      'eight-minutes-of-arc',
      'where-is-the-star',
      'measure-the-two-orbits',
    ]);
    // The prediction's answer arrives at the measurement: it cannot go first.
    await row(page, 'measure-the-two-orbits')
      .locator('[data-act="up"]')
      .click();
    expect(await order(page)).toEqual([
      'eight-minutes-of-arc',
      'where-is-the-star',
      'measure-the-two-orbits',
    ]);
    await expect(page.locator('#adaptStatus')).toContainText(
      /Not changed.*Where is the star\?.*Measure the two orbits/
    );
  });

  test('a step another reads cannot be removed, and one that is free can', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, 'work-the-law-out-step');
    await tick(page, 'use-the-law');
    expect(await order(page)).toEqual([
      'kepler-s-third-law',
      'measure-four-planets',
      'work-the-law-out-step',
      'use-the-law',
    ]);
    await row(page, 'measure-four-planets')
      .locator('[data-act="remove"]')
      .click();
    await expect(page.locator('#adaptStatus')).toContainText(
      /Not changed.*Work the law out, step by step.*Measure four planets/
    );
    expect(await order(page)).toHaveLength(4);
    // Nothing reads the last one, and nothing is under it.
    await row(page, 'work-the-law-out-step')
      .locator('[data-act="remove"]')
      .click();
    await expect(page.locator('#adaptStatus')).toContainText(/Removed/);
    // What it needed goes with it, as nothing else needs that.
    expect(await order(page)).toEqual(['kepler-s-third-law', 'use-the-law']);
  });

  test('every control of the order list is named and large enough', async ({
    page,
    app,
  }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openBuilder(page, app);
      await tick(page, 'what-you-are-looking-at');
      await tick(page, 'the-first-law-and-the');
      const buttons = page.locator('#adaptOrder button');
      expect(await buttons.count()).toBeGreaterThanOrEqual(9);
      for (const b of await buttons.all()) {
        const box = await b.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(24);
        expect(box.width).toBeGreaterThanOrEqual(24);
        await expect(b).toHaveAttribute('aria-label', /.+/);
      }
      await page.reload();
    }
  });

  test('an order, a sentence, a due line, the note and More: the link carries them and a student reads them', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, 'what-you-are-looking-at');
    await tick(page, 'the-first-law-and-the');
    // Swapping the two reads is allowed: both stand under the same world.
    await row(page, 'the-first-law-and-the').locator('[data-act="up"]').click();
    expect(await order(page)).toEqual([
      'eight-minutes-of-arc',
      'the-first-law-and-the',
      'what-you-are-looking-at',
    ]);
    // Focus stayed with the step that moved.
    await expect(
      row(page, 'the-first-law-and-the').locator('[data-act="up"]')
    ).toBeFocused();

    const first = row(page, 'eight-minutes-of-arc');
    await first.locator('summary').click();
    await first.locator('textarea[lang="en"]').fill('Read the story first.');
    await first.locator('textarea[lang="es"]').fill('Lea primero la historia.');
    await page.locator('#assignDue').fill('Friday 9 October, before lab');
    await page.locator('#assignMarking').check();
    await page.locator('#assignMore').selectOption('open');
    await page.locator('#assignName').fill('Week 2');
    await page.locator('#assignBuild').click();
    await expect(page.locator('#assignLink')).not.toHaveValue('');
    const url = await page.locator('#assignLink').inputValue();

    const payload = await decode(page, url);
    expect(payload.s).toEqual([
      'eight-minutes-of-arc',
      'the-first-law-and-the',
      'what-you-are-looking-at',
    ]);
    expect(payload.f).toHaveLength(3);
    expect(payload.x).toEqual({
      'eight-minutes-of-arc': [
        'Read the story first.',
        'Lea primero la historia.',
      ],
    });
    expect(payload.u).toBe('Friday 9 October, before lab');
    expect(payload.m).toBe(1);
    expect(payload.mo).toBe('open');
    // Nothing of an answer key rode along.
    expect(JSON.stringify(payload)).not.toMatch(/answer|because|worked/i);

    // The preview the builder offers is the progress-free one.
    await expect(page.locator('#assignPreview')).toHaveAttribute(
      'href',
      /preview=student/
    );

    await page.goto(url);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('#adaptDue')).toHaveText(
      'Due: Friday 9 October, before lab'
    );
    await expect(page.locator('.adapt-note').first()).toContainText(
      'Read the story first.'
    );
    // Then the steps in the instructor's order.
    await page.locator('#investigationNext').click();
    await expect(page.locator('.inv-step-title')).toContainText(
      'The First Law, and the anatomy of an ellipse'
    );
    await expect(page.locator('.adapt-note')).toHaveCount(0);
    await page.locator('#investigationPrev').click();
    await expect(page.locator('.adapt-note')).toHaveCount(1);
  });

  test('an activity with no adaptation is what it was: no field, no report', async ({
    page,
    app,
  }) => {
    await openBuilder(page, app);
    await tick(page, 'what-you-are-looking-at');
    await page.locator('#assignName').fill('Plain');
    await page.locator('#assignBuild').click();
    await expect(page.locator('#assignLink')).not.toHaveValue('');
    const payload = await decode(
      page,
      await page.locator('#assignLink').inputValue()
    );
    for (const k of ['x', 'u', 'm', 'mo']) expect(k in payload).toBe(false);
  });
});

for (const language of LANGUAGES) {
  for (const theme of THEMES) {
    test(`axe: the order list with a refusal (${language}, ${theme})`, async ({
      page,
      app,
    }, testInfo) => {
      testInfo.setTimeout(120_000);
      await seed(page, language, theme);
      await openBuilder(page, app);
      await tick(page, 'where-is-the-star');
      await tick(page, 'measure-the-two-orbits');
      await row(page, 'measure-the-two-orbits')
        .locator('[data-act="up"]')
        .click();
      await expect(page.locator('#adaptStatus')).not.toBeEmpty();
      expect(await axe(page)).toEqual([]);
    });
  }
}

test.describe('opening an activity the lesson has moved under', () => {
  /** A link made as if the first predict step had since been rewritten. */
  async function staleLink(page) {
    return page.evaluate(async () => {
      const reg = await import('/js/data/investigations/registry.js');
      const lesson = await reg.loadInvestigation('keplers-laws');
      const { buildAssignment } = await import('/js/assignments/assignment.js');
      const { assignmentLink } =
        await import('/js/assignments/assignmentLink.js');
      const { stepFingerprint } =
        await import('/js/investigations/progressBackup.js');
      const a = buildAssignment({
        lesson,
        chosen: ['where-is-the-star', 'measure-the-two-orbits'],
        title: 'Old week',
        fingerprint: stepFingerprint,
      });
      a.f[a.s.indexOf('where-is-the-star')] = 'deadbeef';
      return (await assignmentLink(a)).url;
    });
  }

  test('a report names what was rewritten; update makes a new activity, keep leaves it', async ({
    page,
    app,
  }) => {
    await app.boot({ url: '/' });
    const url = await staleLink(page);
    await page.goto(url);
    const report = page.locator('#adaptReport');
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report).toContainText('made with an earlier version');
    await expect(report).toContainText('Where is the star?');
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const b of await report.getByRole('button').all()) {
        const box = await b.boundingBox();
        expect([width, box.height >= 24, box.width >= 24]).toEqual([
          width,
          true,
          true,
        ]);
      }
    }

    await report
      .getByRole('button', { name: 'Update it to the current investigation' })
      .click();
    const fresh = await report.locator('input').inputValue();
    expect(fresh).toMatch(/#a/);
    expect(fresh).not.toBe(url);
    const [old, now] = [await decode(page, url), await decode(page, fresh)];
    expect(now.i).not.toBe(old.i);
    expect(now.s).toEqual(old.s);

    await page.goto(fresh);
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('#adaptReport')).toHaveCount(0);
  });

  test('keep says so and leaves the activity as it was made', async ({
    page,
    app,
  }) => {
    await app.boot({ url: '/' });
    await page.goto(await staleLink(page));
    const report = page.locator('#adaptReport');
    await expect(report).toBeVisible({ timeout: 30_000 });
    await report.getByRole('button', { name: 'Keep it as made' }).click();
    await expect(report).toContainText('Kept as made.');
    await expect(page.locator('#investigationPanel')).toBeVisible();
  });

  for (const language of LANGUAGES) {
    for (const theme of THEMES) {
      test(`axe: the report (${language}, ${theme})`, async ({
        page,
        app,
      }, testInfo) => {
        testInfo.setTimeout(120_000);
        await seed(page, language, theme);
        await app.boot({ url: '/' });
        await page.goto(await staleLink(page));
        await expect(page.locator('#adaptReport')).toBeVisible({
          timeout: 30_000,
        });
        expect(await axe(page)).toEqual([]);
      });
    }
  }
});
