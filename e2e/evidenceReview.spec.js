// =============================================================================
// Reviewing and comparing the evidence on My work (Roadmap III Prompt 275, part A)
// -----------------------------------------------------------------------------
// tests/evidenceReview.test.js holds the filters, the covariance rule and the
// view in jsdom. This is the page, as a student meets it: an evidence notebook
// with three entries, a comparison of two of them that says "independence
// assumed" and then uses a correlation the student gives, a mark and an
// annotation that survive a reload without touching the numbers, both
// controls by keyboard alone, and axe in both languages at 375 and 1024 px.
// =============================================================================

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
  await expect(page.locator('#mwReview .mw-item')).toHaveCount(3);
}

test('filters, compares with independence assumed, then with a correlation', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('#rvStatus')).toContainText('3 of 3 entries shown');
  await page.locator('#rvInv').selectOption('guide:tides');
  await expect(page.locator('#mwReview .mw-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('#mwReview .mw-item')).toHaveCount(3);

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
  await expect(page.locator('#mwReview .mw-item')).toHaveCount(3);
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gravitas_evidence_notebook')).entries
  );
  expect(after.map(e => e.fingerprint)).toEqual(before);
  expect(after[0].marked).toBe(true);
  expect(after[1].prose.claim).toBe('The slope fell between nights.');
  await expect(page.getByText('marked for a report').first()).toBeVisible();
});

for (const lang of ['en', 'es']) {
  for (const width of [375, 1024]) {
    test(`axe finds nothing in ${lang} at ${width} px, comparison open`, async ({
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
