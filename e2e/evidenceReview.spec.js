// =============================================================================
// Reviewing and comparing the evidence on My work (Roadmap III Prompt 275, part A)
// -----------------------------------------------------------------------------
// tests/evidenceReview.test.js holds the filters, the covariance rule and the
// view in jsdom. This is the page, as a student meets it: an evidence notebook
// with three entries, a comparison of two of them that says "independence
// assumed" and then uses a correlation the student gives, a mark and an
// annotation that survive a reload without touching the numbers, both
// controls by keyboard alone, and axe in both languages at 375 and 1024 px.
//
// Part B: the report composed from the marked entries. Two entries marked, the
// sections reordered from the keyboard, the comparison carried in with the
// correlation it was made under, the report made and downloaded four ways,
// the order kept across a reload, and the same axe passes with the card open.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { buildEntry } from '../js/notebook/entry.js';
import { artifact } from '../js/platform/artifact.js';

const q = (id, value, sigma, label) => ({
  id,
  value,
  unit: null,
  uncertainty: { kind: 'sigma', sigma, basis: 'data' },
  origin: 'fitted',
  label,
});
const entry = (id, title, quantities, context, day, digest) =>
  buildEntry({
    id,
    source: 'inference-fit',
    title,
    quantities: [{ label: 'x', value: 0, unit: '' }],
    capturedAt: Date.parse(day),
    context,
    artifact: artifact({
      id,
      source: { kind: 'pipeline', id: 'rv-fit', ...(digest ? { digest } : {}) },
      quantities,
    }),
  });

const NOTEBOOK = JSON.stringify({
  v: 1,
  entries: [
    entry(
      'e1',
      'Slope, first night',
      [q('slope', 10, 0.3, 'Slope')],
      { lesson: 'kepler', step: 2 },
      '2026-03-10T12:00:00',
      'abcdef0123456789'
    ),
    entry(
      'e2',
      'Slope, second night',
      [q('slope', 9, 0.4, 'Slope')],
      { lesson: 'kepler', step: 4 },
      '2026-03-12T12:00:00',
      'abcdef0123456789'
    ),
    entry(
      'e3',
      'Slope, another star',
      [q('slope', 9, 0.4, 'Slope')],
      { guide: 'tides' },
      '2026-04-02T09:00:00',
      '0000111122223333'
    ),
  ],
});

/** The entries of the review's list (the report card below it lists its own). */
const ENTRIES = '#mwReview .mw-body > .mw-list > .mw-item';

async function open(page, lang = 'en') {
  await page.addInitScript(
    ([l, nb]) => {
      localStorage.setItem('gravitas_locale', l);
      if (!localStorage.getItem('gravitas_evidence_notebook'))
        localStorage.setItem('gravitas_evidence_notebook', nb);
    },
    [lang, NOTEBOOK]
  );
  await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(ENTRIES)).toHaveCount(3);
}

test('filters, compares with independence assumed, then with a correlation', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('#rvStatus')).toContainText('3 of 3 entries shown');
  await page.locator('#rvInv').selectOption('guide:tides');
  await expect(page.locator(ENTRIES)).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator(ENTRIES)).toHaveCount(3);

  await page.getByRole('checkbox', { name: /Compare.*first night/ }).check();
  await page.getByRole('checkbox', { name: /Compare.*second night/ }).check();
  await expect(
    page.getByRole('checkbox', { name: /Compare.*another star/ })
  ).toBeDisabled();
  const result = page.locator('[data-rv="result"]');
  await expect(result).toContainText('Independence assumed.');
  await expect(result).toContainText('2.00 sigma');
  await page.locator('#rv_rho').fill('0.5');
  await page.locator('#rv_rho').blur();
  await expect(page.locator('[data-rv="result"]')).toContainText(
    'Covariance used, from the correlation you gave.'
  );
  await expect(page.locator('[data-rv="result"]')).toContainText('2.77 sigma');
});

test('a mark and an annotation are kept with the entry, by keyboard, and the numbers do not move', async ({
  page,
}) => {
  await open(page);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('gravitas_evidence_notebook')).entries.map(
      e => e.fingerprint
    )
  );
  const mark = page.getByRole('checkbox', {
    name: /For a report.*first night/,
  });
  await mark.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#rvStatus')).toContainText('Marked for a report.');
  const note = page.getByRole('button', {
    name: /Annotate: Slope, second night/,
  });
  await note.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#rvNoteTitle')).toBeFocused();
  await page.locator('#rvN_claim').fill('The slope fell between nights.');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Save' }).press('Enter');
  await expect(page.locator('#rvStatus')).toContainText('Annotation saved.');
  await expect(note).toBeFocused();
  await page.reload();
  await expect(page.locator(ENTRIES)).toHaveCount(3);
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gravitas_evidence_notebook')).entries
  );
  expect(after.map(e => e.fingerprint)).toEqual(before);
  expect(after[0].marked).toBe(true);
  expect(after[1].prose.claim).toBe('The slope fell between nights.');
  await expect(page.getByText('marked for a report').first()).toBeVisible();
});

/** Press a download button of the report card; the file's name and bytes. */
async function take(page, name) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name }).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    bytes: readFileSync(await download.path()),
  };
}

test('composes a report from the marked entries: orders it, carries the comparison in, makes it and downloads it', async ({
  page,
}) => {
  await open(page);
  // No card until something is marked.
  await expect(page.locator('#rvReport')).toHaveCount(0);
  await page
    .getByRole('checkbox', { name: /For a report.*first night/ })
    .check();
  await page
    .getByRole('checkbox', { name: /For a report.*second night/ })
    .check();
  const sections = page.locator('#rvReport ol .mw-title');
  await expect(sections).toHaveText([
    '1. Slope, first night',
    '2. Slope, second night',
  ]);

  // Order: from the keyboard, and the focus stays with the entry that moved.
  const up = page.getByRole('button', {
    name: 'Move up: Slope, second night',
  });
  await up.focus();
  await page.keyboard.press('Enter');
  await expect(sections).toHaveText([
    '1. Slope, second night',
    '2. Slope, first night',
  ]);
  await expect(page.locator('#rvStatus')).toContainText(
    'Slope, second night is now section 1 of 2.'
  );
  await expect(
    page.getByRole('button', { name: 'Move down: Slope, second night' })
  ).toBeFocused();

  // The comparison, with the correlation the student gives, goes in with it.
  await page.getByRole('checkbox', { name: /Compare.*first night/ }).check();
  await page.getByRole('checkbox', { name: /Compare.*second night/ }).check();
  await page.locator('#rv_rho').fill('0.5');
  await page.locator('#rv_rho').blur();
  await expect(page.locator('[data-rv="result"]')).toContainText('2.77 sigma');
  await page
    .getByRole('button', { name: 'Add this comparison to your report' })
    .click();
  await expect(page.locator('#rvStatus')).toContainText(
    'Comparison added to your report'
  );
  await page.locator('#rvRepName').fill('Two nights');
  await page.locator('#rvRepName').blur();
  await page.getByRole('button', { name: 'Make the report' }).click();
  await expect(page.locator('#rvStatus')).toContainText(
    'Report made: 2 sections, 1 comparisons.'
  );
  await expect(page.locator('[data-rv="repstate"]')).toHaveClass(/is-ok/);

  // The file for the instructor: the record, in the order chosen.
  const file = await take(page, 'Download the report file for your instructor');
  expect(file.name).toBe('two-nights.composed-report.json');
  const report = JSON.parse(file.bytes.toString('utf8'));
  expect(report.format).toBe('gravitas.composed-report');
  expect(report.sections.map(x => x.id)).toEqual(['e2', 'e1']);
  expect(report.comparisons).toHaveLength(1);
  expect(report.comparisons[0].from).toBe('student');
  expect(report.comparisons[0].independent).toBe(false);
  expect(report.digest).toMatch(/^[0-9a-f]{64}$/);

  const html = await take(page, 'Download accessible HTML');
  expect(html.name).toBe('gravitas-report-two-nights.html');
  const text = html.bytes.toString('utf8');
  expect(text).toContain('<h1>Two nights</h1>');
  expect(text).toContain('<h3>Methods</h3>');
  expect(text).toContain(
    'Covariance used, from the correlation the author gave.'
  );
  expect(text).toContain(report.digest);
  expect(text).not.toContain('<script');
  const csv = await take(page, 'Download the numbers (CSV)');
  expect(csv.bytes.toString('utf8').split('\n')[0]).toMatch(/^section,entry/);
  const pdf = await take(page, 'Download PDF');
  expect(pdf.bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

  // The made report is one of the things made, and is there after a reload.
  await page.reload();
  await expect(page.locator('#rvReport ol .mw-title')).toHaveText([
    '1. Slope, second night',
    '2. Slope, first night',
  ]);
  await expect(page.locator('[data-rv="repstate"]')).toContainText(
    report.digest.slice(0, 16)
  );
  await expect(page.locator('#mwMade')).toContainText('Composed report');
  // The notebook's numbers did not move.
  const kept = await page.evaluate(() => ({
    made: JSON.parse(localStorage.getItem('gravitas_made_composed-report'))
      .report.digest,
    marks: JSON.parse(
      localStorage.getItem('gravitas_evidence_notebook')
    ).entries.map(e => e.marked === true),
  }));
  expect(kept.made).toBe(report.digest);
  expect(kept.marks).toEqual([true, true, false]);
});

for (const lang of ['en', 'es']) {
  for (const width of [375, 1024]) {
    test(`axe finds nothing in ${lang} at ${width} px, comparison and report open`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, lang);
      await page.locator('[data-rv="compare"]').first().check();
      await page.locator('[data-rv="compare"]').nth(1).check();
      await page
        .getByRole('button', { name: /Annotate|Anotar/ })
        .first()
        .click();
      await expect(page.locator('[data-rv="result"]')).toBeVisible();
      // The report card, made, with its downloads on the page (part B).
      await page.locator('[data-rv="mark"]').first().check();
      await page.locator('[data-rv="mark"]').nth(1).check();
      await page.locator('[data-rv="addcmp"]').click();
      await page.locator('[data-rv="make"]').click();
      await expect(page.locator('[data-rv="repstate"]')).toBeVisible();
      await expect(page.locator('[data-rv="pdf"]')).toBeVisible();
      const r = await new AxeBuilder({ page })
        .include('#mwReview')
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      expect(r.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)).toEqual(
        []
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        )
      ).toBe(false);
    });
  }
}
