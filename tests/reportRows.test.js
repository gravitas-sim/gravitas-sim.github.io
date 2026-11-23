// =============================================================================
// The report's evidence rows: one model, three outputs
// -----------------------------------------------------------------------------
// js/reportRows.js writes the rows once: each reading with how it was taken,
// each prediction beside what the student found, the answers that belong to an
// earlier version, and a controlled run's table. The PDF and the accessible web
// page print them (js/labReport.js, through the builder it is given) and the
// submission token carries the record they are made from. One fixture is
// rendered all three ways here and the rows' text compared; then the held
// answer, the earlier-version marking, an older token and the name of the file
// handed in are held.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import { buildLabReport } from '../js/labReport.js';
import { createHtmlDocument } from '../js/htmlReport.js';
import * as ev from '../js/investigations/evidence.js';
import * as reveal from '../js/investigations/reveal.js';
import { earlierAnswers, revealModule } from '../js/investigations/stepView.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { stepKey } from '../js/investigations/progressSchema.js';
import {
  buildSubmission,
  encodeSubmission,
  readSubmissionToken,
} from '../js/submission/submissionToken.js';
import {
  evidenceRows,
  figuresOf,
  readingRows,
  rowsText,
} from '../js/reportRows.js';
import { handInName, handInStem, nameStem } from '../js/handInName.js';
import { handoutMarkup } from '../js/teach/handout.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { ES_REPORT } from '../js/i18n/es.report.js';
import { decodeEntities } from '../js/lessonMarkup.js';
import { formatNumber } from '../js/format.js';
import { readFileSync } from 'node:fs';

revealModule(reveal);

const ID = 'fixture-rows';
const key = sid => stepKey(ID, sid);
const KEYED_ANSWER = 'Shorter';
const BECAUSE = 'Closer means faster, so the period is shorter.';
const SENTENCE = 'Your reading follows the closer-is-quicker rule.';

/** A lesson with every row kind, and a step that was replaced in a later release. */
const lesson = () => ({
  id: ID,
  title: 'Orbit fixture',
  subtitle: 'Rows',
  retired: {
    'old-year': {
      to: 'guess',
      release: '3.1',
      was: { en: 'How long is a year?', es: '¿Cuánto dura un año?' },
    },
  },
  steps: [
    {
      sid: 'guess',
      type: 'predict',
      kind: 'estimate',
      title: 'Estimate',
      body: 'b',
      prompt: 'About how long is the period?',
      unit: 'd',
      range: true,
      reveal: 'result',
    },
    {
      sid: 'pick',
      type: 'predict',
      title: 'Pick',
      body: 'b',
      prompt: 'Does a closer orbit take longer or shorter?',
      options: ['Longer', KEYED_ANSWER],
      answer: 1,
      because: BECAUSE,
      reveal: 'result2',
    },
    {
      sid: 'read',
      type: 'measure',
      title: 'Measure',
      body: 'm',
      fields: [
        { id: 'p', label: 'Period', unit: 'd' },
        { id: 'q', label: 'Mean separation', unit: 'AU' },
        { id: 'r', label: 'Typed from the start', unit: '' },
      ],
    },
    {
      sid: 'result',
      type: 'read',
      title: 'What you found',
      body: 'r',
      evidence: [{ step: 'read', field: 'p' }],
      compare: SENTENCE,
    },
    {
      sid: 'result2',
      type: 'read',
      title: 'And the separation',
      body: 'r',
      evidence: [{ step: 'read', field: 'q' }],
    },
    {
      sid: 'vary',
      type: 'explore',
      title: 'Vary the mass',
      body: 'v',
      variation: {
        param: 'starMassSun',
        values: [1, 2],
        runFor: 10,
        read: ['sep'],
        label: 'Star mass',
      },
    },
    {
      sid: 'why',
      type: 'measure',
      kind: 'short',
      title: 'Why',
      body: 'w',
      prompt: 'Explain.',
    },
  ],
});

const SRC_P = { k: 'c', r: 'period', l: 'Orbital period', b: 'Io', t: 86400 };
const SRC_Q = { k: 's', r: 'series', a: 0, b: 10, n: 6 };
const responses = () => ({
  [key('guess')]: '3;4',
  [`${key('guess')}:locale`]: 'en',
  [key('pick')]: 0,
  [`${key('read')}:p`]: '3.2504',
  [`${key('read')}:p:locale`]: 'en',
  [`${key('read')}:p:src`]: JSON.stringify(SRC_P),
  [`${key('read')}:q`]: '1,772',
  [`${key('read')}:q:locale`]: 'es',
  [`${key('read')}:q:src`]: JSON.stringify(SRC_Q),
  [`${key('read')}:r`]: '5',
  [`${key('vary')}:run:1`]: JSON.stringify({
    v: 1,
    f: 600,
    r: [{ r: 'sep', l: 'Separation', x: '1.40' }],
  }),
  [`${key('vary')}:run:2`]: JSON.stringify({
    v: 2,
    f: 600,
    r: [{ r: 'sep', l: 'Separation', x: '1.12' }],
  }),
  // An answer to a step the lesson has since replaced.
  [`${ID}:old-year`]: 'Twelve months',
  [`${ID}:old-year:locale`]: 'en',
  [key('why')]: 'Because the star pulls harder when it is close.',
});

const t = catalog => (id, vars) =>
  String(catalog[id] ?? id).replace(/\{(\w+)\}/g, (w, k) =>
    vars && k in vars ? String(vars[k]) : w
  );

const visitedAll = l => new Set(l.steps.map(s => s.sid));

/** The report, from the arguments the engine passes; `createDoc` picks the writer. */
function report({
  l = lesson(),
  r = responses(),
  locale = 'en',
  visited,
  createDoc,
}) {
  return buildLabReport({
    investigation: l,
    name: 'Ada',
    responses: r,
    attempts: {},
    visited: visited ?? visitedAll(l),
    startedAt: '2026-09-01T10:00:00.000Z',
    stepIdFor: i => key(l.steps[i]?.sid),
    checkAnswer: () => null,
    decodeEntities,
    t: t(locale === 'es' ? ES_REPORT : EN_REPORT),
    locale,
    createDoc,
    ev,
    earlier: null,
    formatTime: x => `${x / 86400} d`,
  });
}

/** What the PDF draws, string by string. */
const drawn = bytes =>
  [
    ...Buffer.from(bytes)
      .toString('latin1')
      .matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g),
  ].map(m => m[1].replace(/\\(.)/g, '$1'));

/** What the web page says. */
const pageText = html =>
  new DOMParser().parseFromString(html, 'text/html').body.textContent;

/** The words of the rows' text, as the PDF must contain each one somewhere. */
const wordsOf = lines =>
  lines
    .flatMap(([, ...cells]) => cells.flatMap(c => String(c).split(/\s+/)))
    .filter(Boolean);

const words = locale => ({
  t: t(locale === 'es' ? ES_REPORT : EN_REPORT),
  clean: x => String(x ?? ''),
  locale,
  ev,
  formatTime: x => `${x / 86400} d`,
  formatNumber: v => formatNumber(v, { locale }),
});

/** A token made from the fixture's record, read back, as an instructor's page reads it. */
async function tokenOf(l, r, visited) {
  const backup = buildBackup({
    lesson: l,
    responses: r,
    attempts: {},
    visited,
    stepSid: [...visited].at(-1),
    startedAt: '2026-09-01T10:00:00.000Z',
    studentName: 'Ada',
  });
  const { token } = await encodeSubmission(buildSubmission({ backup }));
  const read = await readSubmissionToken(token);
  expect(read.ok).toBe(true);
  return read.submission;
}

describe('one fixture, three outputs, the same rows', () => {
  test.each(['en', 'es'])(
    'the PDF, the web page and the token agree (%s)',
    async locale => {
      const l = lesson();
      const r = responses();
      const visited = visitedAll(l);
      const submission = await tokenOf(l, r, [...visited]);
      const fromToken = evidenceRows({
        lesson: l,
        responses: submission.b.progress.responses,
        visited: new Set(submission.b.progress.visited),
        keyOf: sid => key(sid),
        ev,
      });
      const live = evidenceRows({
        lesson: l,
        responses: r,
        visited,
        keyOf: sid => key(sid),
        ev,
      });
      // The record in the token yields the rows the report printed, row for row.
      expect(fromToken).toEqual(live);
      const lines = rowsText(fromToken, words(locale));
      expect(lines.length).toBeGreaterThan(6);

      const pdf = new Set(
        drawn(report({ locale })).flatMap(s => s.split(/\s+/))
      );
      const html = pageText(report({ locale, createDoc: createHtmlDocument }));
      for (const [, ...cells] of lines) {
        for (const cell of cells.map(String).filter(Boolean)) {
          // The web page holds every cell whole; the PDF wraps a cell, so each of its words is drawn.
          expect(html).toContain(cell);
        }
      }
      for (const w of wordsOf(lines)) expect(pdf.has(w)).toBe(true);
    }
  );

  test('the rows say where each reading came from', () => {
    const l = lesson();
    const rows = readingRows(l.steps, responses(), key);
    expect(
      rows.map(r => [r.label, r.how, r.from, r.body, r.time, r.figures])
    ).toEqual([
      ['Period', 'taken', 'Orbital period', 'Io', 86400, 5],
      ['Mean separation', 'span', '', '', null, 4],
    ]);
    expect(rows[1].span).toEqual({ n: 6, a: 0, b: 10 });
    const text = rowsText(
      { readings: rows, pairs: [], runs: [], earlier: [] },
      words('en')
    );
    expect(text[0]).toEqual([
      'reading',
      '3',
      'Period',
      '3.2504 d',
      'Taken from Orbital period',
      'Io',
      '1 d',
      '5',
    ]);
    // A field typed from the start has no record, so it is not listed.
    expect(rows.some(r => r.label === 'Typed from the start')).toBe(false);
  });

  test('a decimal comma stays a decimal comma', () => {
    const rows = readingRows(lesson().steps, responses(), key);
    expect(rows[1].value).toBe('1,772');
    expect(figuresOf('0.0146')).toBe(3);
    expect(figuresOf('1,772')).toBe(4);
    expect(figuresOf('-2.50e3')).toBe(3);
  });

  test('the runs table has one row a run and the one setting named', () => {
    const l = lesson();
    const text = rowsText(
      evidenceRows({
        lesson: l,
        responses: responses(),
        visited: visitedAll(l),
        keyOf: key,
        ev,
      }),
      words('en')
    );
    const runs = text.filter(x => x[0] === 'run');
    expect(runs.map(x => x.slice(2))).toEqual([
      ['A', '1.00', '1.40'],
      ['B', '2.00', '1.12'],
    ]);
    expect(runs[0][1]).toContain('Only Star mass changed');
  });
});

describe('the evidence module in a page that never drew a reveal step', () => {
  test('is given what it reads with, and never has it taken away', () => {
    const l = lesson();
    const r = responses();
    const before = readingRows(l.steps, r, key).length;
    // The kit is set (this file installs the reveal module): a bogus one changes nothing.
    ev.ensureKit({ typedNumber: () => NaN, localeOfAnswer: () => 'en' });
    const est = ev.readEstimate(l.steps[0], r, key('guess'));
    expect(est).toMatchObject({ low: 3, high: 4 });
    expect(readingRows(l.steps, r, key).length).toBe(before);
  });
});

describe('a held answer stays held', () => {
  test('before the outcome is reached there is no verdict and no reading', () => {
    const l = lesson();
    const early = new Set(['guess', 'pick', 'read']);
    const rows = evidenceRows({
      lesson: l,
      responses: responses(),
      visited: early,
      keyOf: key,
      ev,
    });
    const out = rowsText(rows, words('en')).filter(x =>
      x[0].startsWith('pair')
    );
    const flat = JSON.stringify(out);
    expect(flat).not.toMatch(/matches|differs|inside|outside|Your reading/);
    expect(flat).toContain('Longer');
  });

  test('after it, a class and never the key or its reason', async () => {
    for (const createDoc of [undefined, createHtmlDocument]) {
      const out = report({ createDoc });
      const text = createDoc ? pageText(out) : drawn(out).join(' ');
      expect(text).toContain('differs from your prediction');
      expect(text).not.toContain(KEYED_ANSWER);
      expect(text).not.toContain(BECAUSE);
    }
    const l = lesson();
    const r = { ...responses(), [key('pick')]: 1 };
    const verdicts = evidenceRows({
      lesson: l,
      responses: r,
      visited: visitedAll(l),
      keyOf: key,
      ev,
    }).pairs.map(p => p.verdict);
    expect(verdicts).toEqual(['inside', 'matched']);
    // The choice the student made is printed; the keyed option is the choice here, so it appears once, as theirs.
    expect(pageText(report({ r, createDoc: createHtmlDocument }))).toContain(
      'matches your prediction'
    );
  });

  test('no row carries the authored answer or its reason', () => {
    const l = lesson();
    const rows = evidenceRows({
      lesson: l,
      responses: responses(),
      visited: visitedAll(l),
      keyOf: key,
      ev,
    });
    expect(JSON.stringify(rows)).not.toContain(BECAUSE);
    expect(JSON.stringify(rows)).not.toContain(KEYED_ANSWER);
  });
});

describe('answers that belong to an earlier version', () => {
  test('listed under their own heading with the release, never marked, in both writers and both languages', () => {
    for (const locale of ['en', 'es']) {
      for (const createDoc of [undefined, createHtmlDocument]) {
        const out = report({ locale, createDoc });
        const text = createDoc ? pageText(out) : drawn(out).join(' ');
        expect(text).toContain(
          locale === 'es'
            ? 'Respondido en una versión anterior'
            : 'Answered in an earlier version'
        );
        expect(text).toContain('Twelve months');
        expect(text).toContain('(3.1)');
        expect(text).toContain(
          locale === 'es' ? '¿Cuánto dura un año?' : 'How long is a year?'
        );
      }
    }
  });

  test('the report reads the same answers as the lesson panel does', () => {
    const l = lesson();
    const r = responses();
    const panel = earlierAnswers(l, r);
    const rows = evidenceRows({
      lesson: l,
      responses: r,
      visited: visitedAll(l),
      keyOf: key,
      ev,
    }).earlier;
    expect(rows.map(x => [x.id, x.text, x.release])).toEqual(
      panel.map(x => [x.id, x.text, x.r?.release])
    );
    // No row is a verdict: nothing marks it against the new key.
    expect(JSON.stringify(rows)).not.toMatch(/correct|incorrect|right|wrong/);
  });

  test('a token made before the revision is read and marked by version', async () => {
    const before = {
      ...lesson(),
      steps: lesson().steps.filter(s => s.sid !== 'guess'),
      retired: undefined,
    };
    const l = lesson();
    const r = responses();
    const submission = await tokenOf(before, r, ['pick', 'read']);
    const rows = evidenceRows({
      lesson: l,
      responses: submission.b.progress.responses,
      visited: new Set(submission.b.progress.visited),
      keyOf: key,
      ev,
    });
    expect(rows.earlier.map(x => [x.id, x.release, x.to])).toEqual([
      ['old-year', '3.1', 'guess'],
    ]);
  });
});

describe('an older record still opens', () => {
  test('a 3.0 token: no provenance, no run, nothing earlier', async () => {
    const l = { ...lesson(), retired: undefined };
    const r = {
      [key('guess')]: '3;4',
      [key('pick')]: 1,
      [`${key('read')}:p`]: '3.2504',
      [`${key('read')}:q`]: '1.77',
    };
    const submission = await tokenOf(l, r, [
      'guess',
      'pick',
      'read',
      'result',
      'result2',
    ]);
    const rows = evidenceRows({
      lesson: l,
      responses: submission.b.progress.responses,
      visited: new Set(submission.b.progress.visited),
      keyOf: key,
      ev,
    });
    expect(rows.readings).toEqual([]);
    expect(rows.runs).toEqual([]);
    expect(rows.earlier).toEqual([]);
    expect(rows.pairs.length).toBe(2);
    // The report builds from the same record, without the sections that have nothing in them.
    const text = pageText(report({ l, r, createDoc: createHtmlDocument }));
    expect(text).not.toContain('how each was taken');
    expect(text).not.toContain('Answered in an earlier version');
    expect(text).toContain('Your reading: Period');
  });
});

describe('the name of the file handed in', () => {
  test('one function, no language in it', () => {
    expect(handInName('Ada Lovelace', 'keplers-laws')).toBe(
      'ada-lovelace-keplers-laws.pdf'
    );
    expect(handInName('Ada Lovelace', 'keplers-laws', 'html')).toBe(
      'ada-lovelace-keplers-laws.html'
    );
    expect(handInName('Ada Lovelace', 'keplers-laws', 'token')).toBe(
      'ada-lovelace-keplers-laws-token.txt'
    );
    expect(handInStem('Ada', 'x')).toBe('ada-x');
  });

  test('Spanish names keep their letters and a name with none is a report', () => {
    expect(nameStem('Ángela Núñez')).toBe('angela-nunez');
    expect(nameStem('  José  María ')).toBe('jose-maria');
    expect(nameStem('李雷')).toBe('report');
    expect(handInName('Zoë', 'tides')).toBe('zoe-tides.pdf');
    // Two different students do not collapse to one stem.
    expect(nameStem('Zoë')).not.toBe(nameStem('Zo'));
  });

  test('the finish flow, the dialog and the kit state the same file', async () => {
    const finish = readFileSync(
      new URL('../js/investigations/finish.js', import.meta.url),
      'utf8'
    );
    expect(finish.match(/handInName\(/g).length).toBe(3);
    expect(finish).not.toMatch(/reportSlug/);
    const engine = readFileSync(
      new URL('../js/investigations.js', import.meta.url),
      'utf8'
    );
    expect(engine).not.toMatch(/reportSlug|-token\.txt/);
    for (const locale of ['en', 'es']) {
      const file = handInName('Ada Lovelace', 'keplers-laws', 'pdf');
      const kit = handoutMarkup(locale, {
        title: 'T',
        rows: [],
        link: 'u',
        svg: '',
        kind: 'activity',
        steps: 1,
        file,
      });
      expect(kit).toContain(file);
    }
    // The dialog's sentence is built from the same function, in both languages.
    document.body.innerHTML = readFileSync(
      new URL('../js/fragments/lesson-finish.html', import.meta.url),
      'utf8'
    );
    const { fileLine } = await import('../js/investigations/ending.js');
    const input = document.getElementById('investigationName');
    for (const [locale, shown] of [
      ['en', 'Hand in that PDF'],
      ['es', 'Entrega ese PDF'],
    ]) {
      input.value = 'Ángela Núñez';
      fileLine({
        state: () => ({ active: { id: 'keplers-laws' } }),
        lib: { getLocale: () => locale },
      });
      const line = document.getElementById(
        'investigationFinishFile'
      ).textContent;
      expect(line).toContain(handInName('Ángela Núñez', 'keplers-laws', 'pdf'));
      expect(line).toContain(
        handInName('Ángela Núñez', 'keplers-laws', 'html')
      );
      expect(line).toContain(shown);
      document.getElementById('investigationFinishFile').dataset.live = '';
    }
  });
});
