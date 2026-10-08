// =============================================================================
// The evidence ledger, from a student's report to an instructor's review page
// -----------------------------------------------------------------------------
// A student keeps results in the notebook, finishes an investigation and takes
// the submission token. The token (version 2) carries the ledger's digest and
// its evidence table. The instructor's review page recomputes the digest from
// the table it was handed: a match is shown as such, and a token whose table
// was edited afterwards is flagged in words, in the table's own disclosure and
// in the exports. A version 1 token, which has no evidence, still reads.
//
// The notebook is seeded with entries built by the application's own module,
// as a student's browser would have written them.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures.js';
import {
  buildEntry,
  provenanceOf,
  quantity,
  withContext,
} from '../js/notebook/entry.js';
import { KEY } from '../js/notebook/store.js';
import {
  buildSubmission,
  encodeSubmission,
  readSubmissionToken,
} from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';

const LESSON = 'keplers-laws';
const kepler = await import(`../js/data/investigations/${LESSON}.js`).then(
  m => m.default || Object.values(m)[0]
);

const entry = withContext({ lesson: LESSON, step: 'fit' }, () =>
  buildEntry({
    source: 'rv-fit',
    title: 'A fit',
    quantities: [
      quantity({
        label: 'Period',
        value: 3.5247,
        unit: 'd',
        uncertainty: 0.0012,
      }),
      quantity({ label: 'Semi-amplitude', value: 85.2, unit: 'm/s' }),
    ],
    provenance: provenanceOf({ scenario: 'kepler', seed: 'e2e' }),
  })
);

async function open(page, locale = 'en') {
  await page.addInitScript(l => {
    try {
      window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* not needed for the test to mean something */
    }
  }, locale);
  await page.goto('/instructors/submissions/', {
    waitUntil: 'domcontentloaded',
  });
}

/** The token a student's browser makes at the end of an investigation. */
async function studentToken(page, app) {
  await page.addInitScript(
    ([key, text]) => window.localStorage.setItem(key, text),
    [KEY, JSON.stringify({ v: 1, entries: [entry] })]
  );
  await app.boot({ url: `/?author=${LESSON}&step=1` });
  const total = await page.evaluate(async () => {
    const data = await import('/js/data/investigations.js');
    return data.getInvestigation('keplers-laws').steps.length;
  });
  await app.boot({ url: `/?author=${LESSON}&step=${total}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await page.locator('#investigationNext').click();
  await expect(page.locator('#investigationFinishContent')).toBeVisible();
  await page.locator('#investigationName').fill('Ada');
  await page.locator('#investigationTokenShow').click();
  const field = page.locator('#investigationToken');
  await expect(field).toHaveValue(/^s\d+[zr]/);
  return field.inputValue();
}

test.describe('the evidence ledger, end to end', () => {
  test('the token carries the ledger and the review page shows its table, checked', async ({
    page,
    app,
  }) => {
    const token = await studentToken(page, app);
    const read = await readSubmissionToken(token);
    expect(read.ok).toBe(true);
    expect(read.submission.v).toBe(2);
    expect(read.submission.ev.d).toMatch(/^[0-9a-f]{64}$/);
    expect(read.submission.ev.r.length).toBe(2);

    await open(page);
    await page.locator('#paste').fill(token);
    await page.locator('#paste-go').click();
    await expect(page.locator('#count')).toHaveText('1 submission');
    const section = page.locator('.sr-evidence');
    await expect(section).toHaveCount(1);
    await expect(section.locator('summary')).toContainText(
      'matches its digest'
    );
    await section.locator('summary').click();
    const rows = section.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('3.5247');
    await expect(rows.first()).toContainText('0.0012');
    await expect(rows.first()).toContainText('d');
    await expect(page.locator('#evidence p[role="alert"]')).toHaveCount(0);

    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportEvidence').click(),
    ]);
    const text = readFileSync(await csv.path(), 'utf8');
    expect(text.split('\r\n')[0]).toContain('unit,unit_id,uncertainty');
    expect(text).toContain('verified');
    expect(text).toContain('3.5247');
  });

  test('a token whose table was edited afterwards is flagged, and a v1 token still reads', async ({
    page,
    app,
  }) => {
    const token = await studentToken(page, app);
    const { submission } = await readSubmissionToken(token);
    submission.ev.r[0][2] += 1;
    const tampered = (await encodeSubmission(submission)).token;
    const v1 = (
      await encodeSubmission({
        ...buildSubmission({
          backup: buildBackup({
            lesson: kepler,
            responses: {},
            attempts: {},
            visited: [],
            stepSid: kepler.steps[0].sid,
            startedAt: '2026-09-01T10:00:00.000Z',
            studentName: 'Old',
          }),
        }),
        v: 1,
      })
    ).token;

    await open(page);
    for (const t of [tampered, v1]) {
      await page.locator('#paste').fill(t);
      await page.locator('#paste-go').click();
    }
    await expect(page.locator('#count')).toHaveText('2 submissions');
    const sections = page.locator('.sr-evidence');
    await expect(sections.first()).toHaveAttribute('open', '');
    await expect(page.locator('#evidence p[role="alert"]')).toContainText(
      'does not match the digest'
    );
    await expect(page.locator('#who li').first()).toContainText(
      'evidence does not match its digest'
    );
    await expect(sections.nth(1)).toContainText('no evidence record');
    const [json] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportJson').click(),
    ]);
    const doc = JSON.parse(readFileSync(await json.path(), 'utf8'));
    expect(doc.submissions.map(s => s.evidence.state)).toEqual([
      'mismatch',
      'none',
    ]);
    expect(doc.submissions[0].warnings).toContain('evidenceMismatch');
  });

  for (const [locale, width] of [
    ['en', 375],
    ['en', 1024],
    ['es', 375],
    ['es', 1024],
  ]) {
    test(`axe and the keyboard on the review page's evidence, ${locale} at ${width}px`, async ({
      page,
      app,
    }) => {
      const token = await studentToken(page, app);
      await page.setViewportSize({ width, height: 900 });
      await open(page, locale);
      await page.locator('#paste').fill(token);
      await page.locator('#paste-go').click();
      const summary = page.locator('.sr-evidence summary');
      await expect(summary).toBeVisible();
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.sr-evidence')).toHaveAttribute('open', '');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map(v => v.id)).toEqual([]);
      if (width === 375) {
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
      }
    });
  }
});
