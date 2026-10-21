// =============================================================================
// The local class summary on the submission review page (Prompt 173)
// -----------------------------------------------------------------------------
// The page grades a pile of reports one at a time; the summary is the picture
// of the class they make. These tests hand it what an instructor would (JSON
// backups and submission tokens, through the file picker) and read what comes
// back: the counts, the steps, the wrong answers, the time a report records,
// the criteria by what each claims once the instructor has marked them, and a
// measured quantity drawn through the plot component beside its table. Then the
// one CSV, and the printable page: the button puts the summary alone in front of
// the printer, and nothing but the summary survives the print rules.
//
// The reports are built by the application's own modules from fixed times, so
// the figures are the same on every machine; each is worked out in the test.
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
import { ledgerDigest } from '../js/submission/ledgerDigest.js';
import { SUMMARY_COLUMNS, SUMMARY_SCHEMA } from '../js/instructorSummary.js';
import { fromCsv } from '../js/csv.js';

const kepler = await import('../js/data/investigations/keplers-laws.js').then(
  m => m.default || Object.values(m)[0]
);
const energy = await import('../js/data/investigations/orbital-energy.js').then(
  m => m.default || Object.values(m)[0]
);

const START = '2026-09-01T10:00:00.000Z';

/** A backup a student's browser would save, saved `minutes` after it began. */
function backup(lesson, { name, responses, minutes = 40 }) {
  const b = buildBackup({
    lesson,
    responses: Object.fromEntries(
      Object.entries(responses).map(([sid, v]) => [stepKey(lesson.id, sid), v])
    ),
    attempts: {},
    visited: lesson.steps.slice(0, 6).map(s => s.sid),
    stepSid: lesson.steps[5].sid,
    startedAt: START,
    studentName: name,
  });
  b.savedAt = new Date(Date.parse(START) + minutes * 60000).toISOString();
  return b;
}

// Right on where-is-the-star is option 1, on use-the-law it is 8.
const ada = backup(kepler, {
  name: 'Ada Lovelace',
  minutes: 40,
  responses: { 'where-is-the-star': '1', 'use-the-law': '8' },
});
const ben = backup(kepler, {
  name: 'Benedict Zzyzx',
  minutes: 90,
  responses: { 'where-is-the-star': '0', 'use-the-law': '64' },
});
const cleo = backup(kepler, {
  name: 'Cleopatra Zzyzx',
  minutes: 25,
  responses: { 'where-is-the-star': '0', 'use-the-law': '5' },
});
const NAMES = ['Lovelace', 'Benedict', 'Cleopatra', 'Zzyzx', 'S-77', 'wk-9'];

const file = (name, text, mimeType = 'application/json') => ({
  name,
  mimeType,
  buffer: Buffer.from(text),
});
const json = (name, b) => file(name, JSON.stringify(b));

/** A ledger row: [envelope, quantity, value, unit id, half, origin, kind, id, digest, code?]. */
const row = (env, value, half, code) => [
  env,
  'orbital period',
  value,
  'd',
  half,
  'measured',
  'measure',
  'orbit',
  'abc',
  ...(code ? [code] : []),
];

/** A token whose evidence table holds one measured period. */
async function tokenWith(name, rows) {
  const ids = [...new Set(rows.map(r => r[0]))];
  const record = { ids, rows, total: rows.length };
  const { token } = await encodeSubmission(
    buildSubmission({
      backup: backup(kepler, {
        name,
        responses: { 'use-the-law': '8' },
        minutes: 30,
      }),
      rosterId: 'S-77',
      assignmentId: 'wk-9',
      record,
      digest: await ledgerDigest(record),
    })
  );
  return file(`${name}.txt`, token, 'text/plain');
}

const PILE = [
  json('ada.json', ada),
  json('ben.json', ben),
  json('cleo.json', cleo),
];

async function open(page, lang = 'en') {
  await page.addInitScript(l => {
    try {
      window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* not needed for the test to mean something */
    }
  }, lang);
  await page.goto('/instructors/submissions/', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#sumTitle')).toBeVisible();
}

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

test.describe('the class summary', () => {
  test('says what to do before anything is read, and offers nothing to download', async ({
    page,
  }) => {
    await open(page);
    await expect(page.locator('#summary')).toContainText(
      'Read at least one report to see the class summary.'
    );
    await expect(page.locator('#sumCsv')).toHaveCount(0);
  });

  test('counts the class, step by step, and names no one', async ({ page }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('3 submissions');
    const summary = page.locator('#summary');
    await expect(summary).toContainText('3 reports counted');
    await expect(summary.locator('h3').first()).toHaveText(
      "Kepler's Laws: 3 reports"
    );
    // where-is-the-star: Ada right, Ben and Cleo wrong. use-the-law: 8 right,
    // 64 and 5 wrong. Of the three, every one answered both.
    const steps = summary.locator(
      'table:has(caption:text-is("Steps, in order")) tbody tr'
    );
    const star = steps.filter({ hasText: 'Where is the star?' });
    await expect(star.locator('td').nth(0)).toHaveText('3 of 3');
    await expect(star.locator('td').nth(1)).toContainText('33% (1/3)');
    const law = steps.filter({ hasText: 'Use the law' });
    await expect(law.locator('td').nth(1)).toContainText('33% (1/3)');
    // Wrong answers: the choice in words, the named slip in the author's words.
    const wrong = summary.locator(
      'table:has(caption:text-is("Most frequent wrong answers")) tbody tr'
    );
    await expect(wrong.filter({ hasText: 'A: ' })).toHaveCount(1);
    await expect(wrong.filter({ hasText: '64' })).toContainText(
      'That is a³. The law says P² = a³'
    );
    await expect(wrong.filter({ hasText: '5 years' })).toContainText(
      'none named'
    );
    // Time: 25, 40 and 90 minutes from the first opening to the last save.
    await expect(summary).toContainText(
      'From 3 reports that record both times: the middle is 40 min'
    );
    // No name, roster id or file name is in the summary.
    const text = await summary.innerText();
    for (const secret of [...NAMES, 'ada.json', 'ben.json'])
      expect(text).not.toContain(secret);
    expect(text).not.toMatch(/&[a-z]+;|<\/?[a-z]/);
  });

  test('downloads one CSV with the same numbers, and no one in it', async ({
    page,
  }) => {
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('3 submissions');
    const csv = await take(page, 'sumCsv');
    expect(csv.name).toMatch(/^gravitas-class-summary-\d{4}-\d{2}-\d{2}\.csv$/);
    const rows = fromCsv(csv.text);
    expect(rows[0]).toEqual([...SUMMARY_COLUMNS]);
    expect(rows.slice(1).every(r => r[0] === SUMMARY_SCHEMA)).toBe(true);
    const at = Object.fromEntries(rows[0].map((c, i) => [c, i]));
    const cell = (section, measure, item) =>
      rows.find(
        r =>
          r[at.section] === section &&
          r[at.measure] === measure &&
          r[at.item_id] === item
      )?.[at.value];
    expect(cell('step', 'correct', 'where-is-the-star')).toBe('1');
    expect(cell('step', 'incorrect', 'where-is-the-star')).toBe('2');
    expect(
      rows.find(
        r =>
          r[at.section] === 'time' && r[at.measure] === 'elapsed_minutes_median'
      )[at.value]
    ).toBe('40');
    for (const secret of [...NAMES, 'ada.json'])
      expect(csv.text).not.toContain(secret);
    await expect(page.locator('#exportStatus')).toHaveText(
      `Downloaded ${csv.name}.`
    );
  });

  test('a measured quantity is drawn through the plot component, beside its table', async ({
    page,
  }) => {
    await open(page);
    await page
      .locator('#picker')
      .setInputFiles([
        await tokenWith('p1', [row('e1', 3.1, 0.2, ['s', 'd'])]),
        await tokenWith('p2', [row('e2', 2.9, 0.1, ['s', 'd'])]),
        await tokenWith('p3', [row('e3', 3.4, 0.2, ['i', 'p', 3.1, 3.9, 0.9])]),
        await tokenWith('p4', [row('e4', 3.0, null)]),
        await tokenWith('p5', [row('e5', 6, null, ['l', 'd', 'u'])]),
      ]);
    await expect(page.locator('#count')).toHaveText('5 submissions');
    const fig = page.locator('#summary figure');
    await expect(fig).toHaveCount(1);
    const svg = fig.locator('svg.ow-plot');
    await expect(svg.locator('.ow-pt')).toHaveCount(4);
    // Three of the four plotted values state an uncertainty; the limit is out.
    await expect(svg.locator('.ow-bars line')).toHaveCount(3);
    await expect(fig).toContainText(
      '4 values: median 3.05, range 2.9 to 3.4. 3 state an uncertainty'
    );
    await expect(fig).toContainText('limits 1');
    await expect(svg).toHaveAttribute(
      'aria-label',
      /^orbital period: 4 values/
    );
    // The table beside it is the plot's numbers, in the plot's order.
    const values = fig.locator('table tbody tr td:nth-child(2)');
    await expect(values).toHaveText(['2.9', '3', '3.1', '3.4']);
    // Each says what its own report states: a sigma, nothing, a sigma, an interval.
    await expect(fig.locator('table tbody tr td:nth-child(3)')).toHaveText([
      /^± 0\.1 /,
      '-',
      /^± 0\.2 /,
      /^\+0\.5 .0\.3 /,
    ]);
    // The bars are the data: the plotted point of the lowest value sits below
    // the highest's on the page.
    const ys = await svg
      .locator('.ow-pt')
      .evaluateAll(els => els.map(e => Number(e.getAttribute('cy'))));
    expect([...ys].sort((a, b) => b - a)).toEqual(ys);
    const a11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(a11y.violations.map(v => v.id)).toEqual([]);
  });

  test('criteria are summarized by kind once the instructor has marked them', async ({
    page,
  }) => {
    await open(page);
    const dana = backup(energy, {
      name: 'Dana',
      responses: { 'will-it-be-back': 'No: it is unbound.' },
    });
    await page.locator('#picker').setInputFiles([json('dana.json', dana)]);
    await expect(page.locator('#count')).toHaveText('1 submission');
    const kinds = page.locator(
      '#summary table:has(caption:text-is("By kind of claim")) tbody tr'
    );
    await expect(kinds).toHaveText(['No criterion has a mark yet--']);
    await page.locator('#judgeToggle').click();
    const mark = n =>
      page.locator(`input[data-crit="${n}"][data-field="mark"]`);
    await mark(1).fill('1');
    await mark(1).blur();
    await mark(2).fill('1');
    await mark(2).blur();
    // correctness 1 of 2 points (50%), reasoning 1 of 1 (100%)
    await expect(kinds).toHaveCount(2);
    await expect(kinds.nth(0)).toContainText('correctness');
    await expect(kinds.nth(0)).toContainText('50%');
    await expect(kinds.nth(1)).toContainText('reasoning');
    await expect(kinds.nth(1)).toContainText('100%');
    // The step's own mark is not made of them: nothing entered there.
    await expect(
      page.locator('#summary tr', { hasText: 'Will it be back?' }).first()
    ).toContainText('0 of 1');
  });

  test('prints the summary alone: the button sets the rule, the rule hides the rest', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__printed = 0;
      window.print = () => {
        window.__printed++;
        window.__bodyClass = document.body.className;
      };
    });
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('3 submissions');
    await page.locator('#sumPrint').click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
    expect(await page.evaluate(() => window.__bodyClass)).toContain(
      'sr-print-summary'
    );
    // Printing is still going on: the screen shows what the printer will.
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#summary')).toBeVisible();
    await expect(page.locator('#drop')).toBeHidden();
    await expect(page.locator('#rates')).toBeHidden();
    await expect(page.locator('#sumPrint')).toBeHidden();
    await expect(page.locator('.gs-shell')).toBeHidden();
    // And when the printing ends the class goes, and the page is whole again.
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('body')).not.toHaveClass(/sr-print-summary/);
    await expect(page.locator('#drop')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  });

  test('is reachable from the keyboard alone', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'macOS WebKit tabs only to text fields and selects'
    );
    await open(page);
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#count')).toHaveText('3 submissions');
    // The buttons and the tables' scroll regions are all in the tab order.
    await page.locator('#sumCsv').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#sumPrint')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#summary .ui-table-wrap').first()).toBeFocused();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.locator('#sumCsv').focus();
        await page.keyboard.press('Enter');
      })(),
    ]);
    expect(download.suggestedFilename()).toMatch(/class-summary/);
  });

  test('speaks Spanish, and passes axe with the summary on the page', async ({
    page,
  }) => {
    await open(page, 'es');
    await page.locator('#picker').setInputFiles(PILE);
    await expect(page.locator('#summary')).toContainText('3 informes contados');
    await expect(page.locator('#summary h2')).toHaveText('Resumen de la clase');
    await expect(page.locator('#sumCsv')).toHaveText(
      'Descargar el resumen de la clase (CSV)'
    );
    const text = await page.locator('#summary').innerText();
    expect(text).not.toMatch(/sub\.sum\./);
    const a11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(a11y.violations.map(v => v.id)).toEqual([]);
  });
});
