import { describe, test, expect, beforeEach } from '@jest/globals';

// =============================================================================
// The report composed from marked entries (Roadmap III, Prompt 275, part B)
// -----------------------------------------------------------------------------
// The order of its sections, the record and its digest, the reader's refusals,
// the methods paragraph (deterministic, in both languages, and saying nothing
// the record does not carry), the uncertainty statement of each number, the
// comparison carried in with the covariance rule it was made under, the three
// exports, the made record and the token's `cr`, and the card drawn on My work
// in jsdom: order, carry a comparison, make, download, restore the marks.
//
// The comparison's reference numbers are Part A's (Python's math.erfc), for
// sigma_A = 0.3, sigma_B = 0.4 and a difference of 1:
//   rho 0.0  sigma 0.5                 n 2.0                p 0.04550026389635843
//   rho 0.5  sigma 0.36055512754639896 n 2.7735009811261455 p 0.00554566731524406
// =============================================================================

import { webcrypto } from 'node:crypto';
import { buildEntry, mark } from '../js/notebook/entry.js';
import { artifact } from '../js/platform/artifact.js';
import { envelopeOf, evidenceRows } from '../js/notebook/ledger.js';
import { compareEntries } from '../js/myWork/evidenceReview.js';
import {
  COMPOSED_FORMAT,
  COMPOSED_KEY,
  checkComposed,
  comparisonOf,
  composeReport,
  covarianceFlag,
  fillReport,
  fragment,
  loadSay,
  methodsText,
  readComposed,
  reportCsv,
  reportOrder,
  sectionOf,
} from '../js/myWork/composedReport.js';
import {
  attachedTo,
  composedStamp,
  fileOf,
  hrefOf,
  readMade,
} from '../js/myWork/made.js';
import {
  buildSubmission,
  encodeSubmission,
  readSubmissionToken,
  validateSubmission,
} from '../js/submission/submissionToken.js';
import { createHtmlDocument } from '../js/htmlReport.js';
import { createDocument } from '../js/pdf.js';
import { fromCsv } from '../js/csv.js';
import { KEY_EVIDENCE_NOTEBOOK } from '../js/names.js';
import { SURFACE_ROUTE, surfaceOf } from '../js/myWork/model.js';
import { t, getLocale } from '../js/i18n/index.js';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});

const q = (id, value, sigma, extra = {}) => ({
  id,
  value,
  unit: null,
  uncertainty:
    sigma === null ? { kind: 'none' } : { kind: 'sigma', sigma, basis: 'data' },
  origin: 'fitted',
  label: id,
  ...extra,
});

/** An entry holding a producer's envelope (a fit on data). */
function fit({
  id,
  quantities,
  digest,
  context = { lesson: 'kepler', step: 2 },
}) {
  return buildEntry({
    id,
    source: 'inference-fit',
    title: `Fit ${id}`,
    quantities: [{ label: 'x', value: 0, unit: '' }],
    capturedAt: Date.parse('2026-03-10T12:00:00Z'),
    context,
    artifact: artifact({
      id,
      source: { kind: 'pipeline', id: 'tool', ...(digest ? { digest } : {}) },
      quantities,
    }),
  });
}

/** A reading off the simulation, with the conditions it was made under. */
function reading({ id, seed = 'k7', title = `Reading ${id}`, figure = null }) {
  return buildEntry({
    id,
    source: 'measurement',
    title,
    quantities: [
      { label: 'Period', value: 3.25, unit: '', uncertainty: 0.05 },
      { label: 'Radius', value: 1.5, unit: '' },
    ],
    figure,
    provenance: {
      scenario: 'binary',
      seed,
      numerical: {
        integrator: 'Velocity Verlet',
        maxTimestep: 0.0125,
        simSpeed: 1,
      },
      referenceFrame: 'barycentric',
      simTimeDays: 12,
      flags: [],
    },
    capturedAt: Date.parse('2026-04-02T09:00:00Z'),
    context: { page: 'sandbox' },
    prose: {
      claim: 'The period is three and a quarter.',
      evidence: 'Ten orbits timed.',
      limitations: 'Timed by eye.',
    },
  });
}

const A = fit({
  id: 'a',
  quantities: [q('slope', 10, 0.3)],
  digest: 'abcdef0123456789',
});
const B = fit({
  id: 'b',
  quantities: [q('slope', 9, 0.4)],
  digest: 'abcdef0123456789',
});
const PAIR = fit({
  id: 'p',
  quantities: [
    q('m1', 2, 0.3, { correlatedWith: [{ id: 'm2', rho: 0.5 }] }),
    q('m2', 1, 0.4, { correlatedWith: [{ id: 'm1', rho: 0.5 }] }),
  ],
});
const S = reading({ id: 's' });
const NOSEED = reading({ id: 'n', seed: null });

const rowsOf = e => evidenceRows([e], t, getLocale());
const section = e => sectionOf(e, envelopeOf(e), rowsOf(e));
const AT = '2026-05-01T08:00:00.000Z';

/** A report of some marked entries with the comparisons of `specs`. */
async function compose(entries, specs = [], title = 'Two slopes') {
  const sections = entries.map(section);
  const comparisons = specs.map(spec => {
    const r = compareEntries(
      entries.find(e => e.id === spec.a),
      entries.find(e => e.id === spec.b),
      {
        idA: spec.idA,
        idB: spec.idB,
        ...(Number.isFinite(spec.rho) ? { rho: spec.rho } : {}),
      }
    );
    expect(r.ok).toBe(true);
    return comparisonOf(r, spec, sections);
  });
  return composeReport({
    title,
    at: AT,
    app: 'test-build',
    sections,
    comparisons,
  });
}

describe('the order of a report', () => {
  test('only marked entries, those the student arranged first, the rest as the notebook holds them', () => {
    const all = [A, mark(B, true), mark(S, true), mark(PAIR, true)];
    expect(reportOrder(all).map(e => e.id)).toEqual(['b', 's', 'p']);
    expect(reportOrder(all, ['p', 'b']).map(e => e.id)).toEqual([
      'p',
      'b',
      's',
    ]);
    // An id that is no longer marked, or no longer there, is not a section.
    expect(reportOrder(all, ['a', 'gone', 's']).map(e => e.id)).toEqual([
      's',
      'b',
      'p',
    ]);
    expect(reportOrder([A, B])).toEqual([]);
  });
});

describe('the report record and its digest', () => {
  test('holds each entry as the record says it, and a digest of everything else', async () => {
    const r = await compose([A, S]);
    expect(r.format).toBe(COMPOSED_FORMAT);
    expect(r.formatVersion).toBe(1);
    expect(r.sections.map(s => s.id)).toEqual(['a', 's']);
    expect(r.digest).toMatch(/^[0-9a-f]{64}$/);
    const [a, s] = r.sections;
    expect(a.kind).toBe('inference-fit');
    expect(a.source).toEqual({
      kind: 'pipeline',
      id: 'tool',
      digest: 'abcdef0123456789',
    });
    expect(a.where).toEqual({ lesson: 'kepler', step: '2' });
    expect(a.numbers).toHaveLength(1);
    expect(a.numbers[0]).toMatchObject({
      id: 'slope',
      value: 10,
      uncertainty: { kind: 'sigma', sigma: 0.3, basis: 'data' },
      origin: 'fitted',
    });
    expect(s.settings).toMatchObject({
      scenario: 'binary',
      seed: 'k7',
      integrator: 'Velocity Verlet',
      step: 0.0125,
      frame: 'barycentric',
    });
    expect(s.prose.claim).toBe('The period is three and a quarter.');
    expect(s.fingerprint).toBe(S.fingerprint);
  });

  test('the same entries give the same digest, and any change gives another', async () => {
    const one = await compose([A, S]);
    const two = await compose([A, S]);
    expect(two.digest).toBe(one.digest);
    expect((await compose([S, A])).digest).not.toBe(one.digest);
    expect((await compose([A, S], [], 'Another title')).digest).not.toBe(
      one.digest
    );
    expect(await checkComposed(one)).toBe(true);
    const edited = JSON.parse(JSON.stringify(one));
    edited.sections[0].numbers[0].value = 11;
    expect(await checkComposed(edited)).toBe(false);
  });

  test('a file of it reads back as it was written, and hashes to its digest', async () => {
    const r = await compose([A, B], [{ a: 'a', b: 'b', idA: 'slope' }]);
    const back = JSON.parse(JSON.stringify(r, null, 2));
    const read = readComposed(back);
    expect(read.ok).toBe(true);
    expect(read.report).toEqual(r);
    expect(await checkComposed(read.report)).toBe(true);
  });

  test('refuses what is not one, what is newer, and what is not in shape', async () => {
    const r = await compose([A]);
    expect(readComposed(null)).toEqual({ ok: false, reason: 'format' });
    expect(readComposed({ format: 'gravitas.made' }).reason).toBe('format');
    expect(readComposed({ ...r, formatVersion: 2 }).reason).toBe('newer');
    expect(readComposed({ ...r, digest: 'short' }).reason).toBe('shape');
    expect(readComposed({ ...r, sections: [] }).reason).toBe('shape');
    expect(
      readComposed({ ...r, sections: [{ ...r.sections[0], numbers: 'x' }] })
        .reason
    ).toBe('shape');
    expect(readComposed({ ...r, comparisons: [{}] }).reason).toBe('shape');
  });
});

describe('the methods paragraph', () => {
  test('names the instrument, the settings and the seed, in English', () => {
    const text = methodsText(section(S), 'en', {
      kindName: () => 'Measurement',
      scenario: () => 'Binary star',
    });
    expect(text).toBe(
      'Made with Measurement (simulation binary). Scenario: Binary star. Integrator: Velocity Verlet; step 0.0125. Reference frame: barycentric. Seed: k7. Kept in the Sandbox.'
    );
  });

  test('and in Spanish, with the decimal mark of the language', () => {
    const text = methodsText(section(S), 'es', {
      kindName: () => 'Medición',
      scenario: () => 'Estrella binaria',
    });
    expect(text).toBe(
      'Obtenido con Medición (simulation binary). Escenario: Estrella binaria. Integrador: Velocity Verlet; paso 0,0125. Sistema de referencia: barycentric. Semilla: k7. Guardado en la simulación libre.'
    );
  });

  test('is the same sentence every time, and the ids alone without a catalog', () => {
    const sec = section(S);
    expect(methodsText(sec, 'en')).toBe(methodsText(sec, 'en'));
    expect(methodsText(sec, 'en')).toMatch(
      /^Made with measurement \(simulation binary\)\. Scenario: binary\./
    );
  });

  test('says nothing the record does not carry', () => {
    // A fit on data: no scenario, integrator, frame or seed to name.
    const text = methodsText(section(A), 'en');
    expect(text).toBe(
      'Made with inference-fit (pipeline tool). Digest of the data or the starting state: abcdef0123456789. Kept in investigation kepler, step 2.'
    );
    for (const word of ['Scenario', 'Integrator', 'Seed', 'seed', 'frame'])
      expect(text).not.toContain(word);
    expect(methodsText(section(A), 'es')).not.toMatch(/Semilla|semilla/);
  });

  test('says so when a simulation carries no seed, because it cannot be made again', () => {
    expect(methodsText(section(NOSEED), 'en')).toContain(
      'The record carries no seed.'
    );
    expect(methodsText(section(NOSEED), 'es')).toContain(
      'El registro no lleva semilla.'
    );
    expect(methodsText(section(NOSEED), 'en')).not.toMatch(/Seed:/);
  });
});

describe('a comparison carried into the report, with its covariance statement', () => {
  test('nothing known: independence assumed, and the numbers of the oracle', async () => {
    const r = await compose([A, B], [{ a: 'a', b: 'b', idA: 'slope' }]);
    const [c] = r.comparisons;
    expect(c.independent).toBe(true);
    expect(c.difference).toBe(1);
    expect(c.sigma).toBeCloseTo(0.5, 12);
    expect(c.p).toBeCloseTo(0.04550026389635843, 9);
    // The two share an observation digest, and the report says so.
    expect(c.shared).toBe('data');
    expect(c.assumptions).toEqual(['gaussian', 'independent', 'sharedUnknown']);
    expect(covarianceFlag(c, 'en')).toBe('Independence assumed.');
    expect(covarianceFlag(c, 'es')).toBe('Independencia supuesta.');
  });

  test("the student's correlation: covariance used, and it moves the answer", async () => {
    const r = await compose(
      [A, B],
      [{ a: 'a', b: 'b', idA: 'slope', rho: 0.5 }]
    );
    const [c] = r.comparisons;
    expect(c.independent).toBe(false);
    expect(c.from).toBe('student');
    expect(c.rho).toBe(0.5);
    expect(c.covariance).toBeCloseTo(0.5 * 0.3 * 0.4, 14);
    expect(c.sigma).toBeCloseTo(0.36055512754639896, 12);
    expect(c.nSigma).toBeCloseTo(2.7735009811261455, 12);
    expect(c.p).toBeCloseTo(0.00554566731524406, 9);
    expect(covarianceFlag(c, 'en')).toBe(
      'Covariance used, from the correlation the author gave.'
    );
  });

  test("two quantities of one record: the record's own coefficient", async () => {
    const r = await compose([PAIR], [{ a: 'p', b: 'p', idA: 'm1', idB: 'm2' }]);
    const [c] = r.comparisons;
    expect(c.from).toBe('record');
    expect(c.independent).toBe(false);
    expect(c.sigma).toBeCloseTo(0.36055512754639896, 12);
    expect(covarianceFlag(c, 'en')).toBe(
      'Covariance used, as the record states it.'
    );
    expect(covarianceFlag(c, 'es')).toBe(
      'Covarianza usada, tal como la declara el registro.'
    );
  });

  test('the report says the statement Prompt 151 says, in the reader language', async () => {
    const r = await compose(
      [A, B],
      [
        { a: 'a', b: 'b', idA: 'slope' },
        { a: 'a', b: 'b', idA: 'slope', rho: 0.5 },
      ]
    );
    const en = await loadSay('en');
    const doc = fragment(s => String(s), 3);
    fillReport(doc, r, en);
    const text = doc.build();
    expect(text).toContain('Independence assumed. The difference is');
    expect(text).toContain(
      'Covariance used, from the correlation the author gave. The difference is'
    );
    expect(text).toMatch(/Gaussian/);
    const es = await loadSay('es');
    const spanish = fillReport(
      fragment(s => String(s), 3),
      r,
      es
    ).build();
    expect(spanish).toContain('Independencia supuesta. La diferencia es');
    expect(spanish).toContain('Comparaciones');
  });
});

describe('the report written out', () => {
  let report;
  let say;
  beforeEach(async () => {
    report = await compose(
      [S, A, B],
      [{ a: 'a', b: 'b', idA: 'slope', rho: 0.5 }],
      'Periods and slopes'
    );
    say = await loadSay('en');
  });

  test('every number has its uncertainty statement in the one pattern', () => {
    const [period, radius] = report.sections[0].numbers;
    // The spaces round the sign are the formatter's (they do not break).
    expect(say.line(period)).toMatch(/^3\.250\s±\s0\.050 \(data\)$/);
    // A number with no uncertainty stated is printed alone.
    expect(say.line(radius)).toBe('1.50000');
    expect(say.line(report.sections[1].numbers[0])).toMatch(
      /^10\.00?\s±\s0\.30? \(data\)$/
    );
    expect(
      say.line({ value: null, uncertainty: { kind: 'failed' } })
    ).toBeTruthy();
    expect(say.line({ value: null, uncertainty: { kind: 'none' } })).toBe(
      'no value'
    );
  });

  test('the accessible HTML: one h1, sections in order, tables, the methods, the comparison', () => {
    const html = fillReport(
      createHtmlDocument({ title: report.title, lang: 'en-US' }),
      report,
      say
    ).build();
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain('<h1>Periods and slopes</h1>');
    const order = ['1. Reading s', '2. Fit a', '3. Fit b', 'Comparisons'].map(
      h => html.indexOf(`<h2>${h}</h2>`)
    );
    expect(order.every(i => i > 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(html).toContain('<h3>Methods</h3>');
    expect(html).toContain('Seed: k7.');
    expect(html).toContain('The period is three and a quarter.');
    expect(html).toContain('Timed by eye.');
    expect(html).toContain(report.digest);
    expect(html).toContain('<table>');
    expect(html).not.toContain('<script');
    // No heading level is skipped.
    const levels = [...html.matchAll(/<h([1-6])>/g)].map(m => +m[1]);
    levels.reduce((prev, n) => {
      expect(n).toBeLessThanOrEqual(prev + 1);
      return n;
    }, 0);
  });

  test('the PDF is a PDF', () => {
    const bytes = fillReport(
      createDocument({ title: report.title, tagged: true }),
      report,
      say
    ).build();
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2000);
  });

  test('a figure of the notebook is drawn with the numbers it draws', () => {
    const figure = {
      title: 'Separation',
      xLabel: 'time',
      yLabel: 'distance',
      series: [
        {
          points: [
            [0, 1],
            [1, 2],
            [2, 3],
          ],
        },
      ],
    };
    const html = fillReport(createHtmlDocument({ title: 'x' }), report, {
      ...say,
      figure: id => (id === 's' ? figure : null),
    }).build();
    expect(html).toContain('Separation');
    expect(html).toContain('<th scope="col">time</th>');
  });

  test('the CSV: a header, a row per number, a row per comparison, numbers as written', () => {
    const rows = fromCsv(reportCsv(report, say));
    expect(rows[0].slice(0, 6)).toEqual([
      'section',
      'entry',
      'kind',
      'quantity_id',
      'quantity',
      'value',
    ]);
    expect(rows).toHaveLength(1 + 2 + 1 + 1 + 1);
    const period = rows[1];
    expect(period[0]).toBe('1');
    expect(period[5]).toBe('3.25');
    expect(period[7]).toBe('sigma');
    expect(period[8]).toBe('0.05');
    const cmp = rows.at(-1);
    expect(cmp[0]).toBe('C1');
    expect(cmp[2]).toBe('comparison');
    expect(Number(cmp[5])).toBe(1);
    expect(Number(cmp[8])).toBeCloseTo(0.36055512754639896, 12);
    expect(cmp[12]).toBe('covariance-student');
    expect(cmp[14]).toMatch(/^Covariance used/);
    // In Spanish the header is Spanish and the numbers are still the numbers.
    const spanish = fromCsv(reportCsv(report, { ...say, lang: 'es' }));
    expect(spanish[0][0]).toBe('seccion');
    expect(spanish[1][5]).toBe('3.25');
  });
});

describe('the made record, and what a submission token says of it', () => {
  const storageOf = records => {
    const keys = Object.keys(records);
    return {
      get length() {
        return keys.length;
      },
      key: i => keys[i],
      getItem: k => (k in records ? JSON.stringify(records[k]) : null),
    };
  };
  const madeOf = report => ({
    format: 'gravitas.made',
    formatVersion: 1,
    id: 'composed-report',
    kind: 'report',
    from: 'my-work',
    name: report.title,
    savedAt: report.madeAt,
    app: report.app,
    attachedTo: [],
    report,
  });

  test('is read as a thing made, opens in the review, and downloads as the report file', async () => {
    const report = await compose([A, B]);
    const read = readMade(madeOf(report));
    expect(read.ok).toBe(true);
    expect(read.record.kind).toBe('report');
    expect(hrefOf(read.record)).toBe('/my-work/#mwReview');
    expect(fileOf(read.record)).toEqual({
      name: 'two-slopes.composed-report.json',
      json: report,
    });
    expect(readMade({ ...madeOf(report), report: {} }).reason).toBe('report');
    expect(COMPOSED_KEY).toBe('gravitas_made_composed-report');
  });

  test('the stamp is its digest and its section count; none when no report was made', async () => {
    const report = await compose([A, B]);
    expect(composedStamp(storageOf({}))).toBeNull();
    const storage = storageOf({ [COMPOSED_KEY]: madeOf(report) });
    expect(composedStamp(storage)).toEqual({ d: report.digest, n: 2 });
    // It is not something attached to an entry: `sy` does not list it.
    expect(attachedTo(['a', 'b'], storage)).toEqual([]);
  });

  const backup = {
    lesson: { id: 'keplers-laws' },
    progress: { responses: {} },
    steps: [],
  };
  const record = { ids: ['x'], rows: [[1]], total: 1 };

  test('a token carries `cr` only when a composed report exists', async () => {
    const without = buildSubmission({ backup, record, digest: 'd' });
    expect('cr' in without).toBe(false);
    const d = 'ab'.repeat(32);
    const withIt = buildSubmission({
      backup,
      record: { ...record, cr: { d, n: 3 } },
      digest: 'd',
    });
    expect(withIt.cr).toEqual({ d, n: 3 });
    const { cr: _dropped, ...rest } = withIt;
    expect(rest).toEqual(without);
    expect(validateSubmission(withIt)).toEqual({ ok: true });
    const read = await readSubmissionToken(
      (await encodeSubmission(withIt)).token
    );
    expect(read.ok).toBe(true);
    expect(read.submission.cr).toEqual({ d, n: 3 });
  });

  test('a `cr` that is not a digest and a count is refused', () => {
    const base = buildSubmission({ backup, record, digest: 'd' });
    const check = cr => validateSubmission({ ...base, cr });
    expect(check('x').reason).toBe('badComposed');
    expect(check({ d: 'short', n: 1 }).reason).toBe('badComposed');
    expect(check({ d: 'ab'.repeat(32), n: 0 }).reason).toBe('badComposed');
    expect(check({ d: 'ab'.repeat(32), n: 2 })).toEqual({ ok: true });
  });

  test('round trip: made, stated by a token, read as a file, and found to be the one', async () => {
    const report = await compose(
      [S, A, B],
      [{ a: 'a', b: 'b', idA: 'slope', rho: 0.5 }]
    );
    const storage = storageOf({ [COMPOSED_KEY]: madeOf(report) });
    const submission = buildSubmission({
      backup,
      record: { ...record, cr: composedStamp(storage) },
      digest: 'd',
    });
    const token = (await encodeSubmission(submission)).token;
    const stated = (await readSubmissionToken(token)).submission.cr;
    // What the student hands in: the file My work downloads.
    const file = JSON.stringify(fileOf(readMade(madeOf(report)).record).json);
    const read = readComposed(JSON.parse(file));
    expect(read.ok).toBe(true);
    expect(await checkComposed(read.report)).toBe(true);
    expect(read.report.digest).toBe(stated.d);
    expect(read.report.sections).toHaveLength(stated.n);
    // An edited file still claims the digest and no longer hashes to it.
    const forged = JSON.parse(file);
    forged.sections[1].numbers[0].value = 12;
    expect(readComposed(forged).ok).toBe(true);
    expect(await checkComposed(forged)).toBe(false);
  });
});

describe('the report card drawn on My work', () => {
  let page;
  let store;
  let box;
  let view;
  let saved;
  const settle = () => new Promise(r => setTimeout(r, 60));
  const mount = async (entries, extra = []) => {
    document.documentElement.lang = 'en';
    document.body.innerHTML =
      '<section id="mwReview" hidden><div class="mw-body"></div></section>';
    store = [
      {
        id: KEY_EVIDENCE_NOTEBOOK,
        collection: 'evidence',
        value: { v: 1, entries: JSON.parse(JSON.stringify(entries)) },
      },
      ...extra,
    ];
    page = {
      surfaces: { SURFACE_ROUTE, surfaceOf },
      state: {
        records: store,
        store: {
          collection: name => ({
            put: async (key, doc) => {
              const value = JSON.parse(JSON.stringify(doc));
              const had = store.find(r => r.id === key);
              if (had) had.value = value;
              else store.push({ id: key, collection: name, value });
              return { ok: true };
            },
          }),
        },
      },
      refresh: async () => {
        await view.show(page);
      },
    };
    await view.show(page);
    await settle();
    box = document.getElementById('mwReview');
  };
  const find = (kind, id) =>
    [...box.querySelectorAll(`[data-rv="${kind}"]`)].find(
      c => (c.dataset.id ?? '') === (id ?? '')
    );
  const press = async (kind, id) => {
    find(kind, id).click();
    await settle();
  };
  const tick = async (el, on = true) => {
    el.checked = on;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  };
  const titles = () =>
    [...box.querySelectorAll('#rvReport ol .mw-title')].map(x =>
      x.textContent.trim()
    );
  const made = () => store.find(r => r.id === COMPOSED_KEY)?.value;

  beforeEach(async () => {
    view = await import('../js/myWork/evidenceView.js');
    saved = [];
    URL.createObjectURL = blob => {
      saved.push(blob);
      return 'blob:test';
    };
    URL.revokeObjectURL = () => {};
  });

  test('is not drawn until an entry is marked, and then lists the marked entries', async () => {
    await mount([A, B, S]);
    expect(box.querySelector('#rvReport')).toBeNull();
    await tick(find('mark', 'b'));
    await tick(find('mark', 's'));
    expect(box.querySelector('#rvReport')).not.toBeNull();
    expect(titles()).toEqual(['1. Fit b', '2. Reading s']);
    // Nothing is written until the report is made.
    expect(made()).toBeUndefined();
  });

  test('the student orders the sections with two buttons each, from the keyboard', async () => {
    await mount([mark(A, true), mark(B, true), mark(S, true)]);
    expect(titles()).toEqual(['1. Fit a', '2. Fit b', '3. Reading s']);
    expect(find('up', 'a').disabled).toBe(true);
    expect(find('down', 's').disabled).toBe(true);
    find('down', 'a').focus();
    await press('down', 'a');
    expect(titles()).toEqual(['1. Fit b', '2. Fit a', '3. Reading s']);
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Fit a is now section 2 of 3/
    );
    // The focus stays on the entry that moved.
    expect(document.activeElement).toBe(find('down', 'a'));
    await press('down', 'a');
    expect(titles()).toEqual(['1. Fit b', '2. Reading s', '3. Fit a']);
    // At the end its Move down is disabled, so its Move up holds the focus.
    expect(document.activeElement).toBe(find('up', 'a'));
    for (const b of box.querySelectorAll('#rvReport button'))
      expect(b.getAttribute('aria-label') || b.textContent.trim()).toBeTruthy();
  });

  test('makes the report: one record among the things made, in the order chosen, with the comparison carried in', async () => {
    await mount([mark(A, true), mark(B, true), mark(S, true)]);
    await press('up', 's');
    await press('up', 's');
    await tick(find('compare', 'a'));
    await tick(find('compare', 'b'));
    const rho = box.querySelector('#rv_rho');
    rho.value = '0.5';
    rho.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    await press('addcmp');
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Comparison added to your report/
    );
    const name = box.querySelector('#rvRepName');
    name.value = 'Slopes, twice';
    name.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    await press('make');
    const rec = made();
    expect(rec.kind).toBe('report');
    expect(rec.format).toBe('gravitas.made');
    expect(rec.name).toBe('Slopes, twice');
    const r = rec.report;
    expect(readComposed(r).ok).toBe(true);
    expect(await checkComposed(r)).toBe(true);
    expect(r.sections.map(s => s.id)).toEqual(['s', 'a', 'b']);
    expect(r.comparisons).toHaveLength(1);
    expect(r.comparisons[0].from).toBe('student');
    expect(r.comparisons[0].sigma).toBeCloseTo(0.36055512754639896, 12);
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Report made: 3 sections, 1 comparisons/
    );
    const state = box.querySelector('[data-rv="repstate"]');
    expect(state.className).toMatch(/is-ok/);
    expect(state.textContent).toContain(r.digest.slice(0, 16));
    // The notebook is untouched by making a report.
    expect(store[0].value.entries.map(e => e.fingerprint)).toEqual([
      A.fingerprint,
      B.fingerprint,
      S.fingerprint,
    ]);
  });

  test('a comparison is carried only when what it compares is marked', async () => {
    await mount([mark(A, true), B]);
    await tick(find('compare', 'a'));
    await tick(find('compare', 'b'));
    expect(find('addcmp')).toBeUndefined();
    expect(box.querySelector('#rvCompare').textContent).toMatch(
      /Tick "For a report" on what you compare/
    );
  });

  test('says when the marks have changed since, and downloads the report as it was made', async () => {
    await mount([mark(A, true), mark(B, true)]);
    await press('make');
    const first = made().report.digest;
    await tick(find('mark', 'b'), false);
    const state = box.querySelector('[data-rv="repstate"]');
    expect(state.className).toMatch(/is-warning/);
    expect(state.textContent).toMatch(/have changed since/);
    expect(made().report.digest).toBe(first);
    for (const kind of ['pdf', 'html', 'csv', 'file']) await press(kind);
    expect(saved.map(b => b.type)).toEqual([
      'application/pdf',
      'text/html;charset=utf-8',
      'text/csv;charset=utf-8',
      'application/json',
    ]);
    const file = JSON.parse(await saved[3].text());
    expect(file.digest).toBe(first);
    expect(await checkComposed(file)).toBe(true);
    const html = await saved[1].text();
    expect(html).toContain('2. Fit b');
    expect(html).toContain(first);
  });

  test('restores the marks an older build dropped, from the report it made', async () => {
    await mount([mark(A, true), mark(B, true)]);
    await press('make');
    // A 2.0.0 or 2.1.0 build saves the notebook without the field it does not
    // know; the report's own record is another key and is not rewritten.
    store[0].value.entries = store[0].value.entries.map(e => mark(e, false));
    await view.show(page);
    await settle();
    expect(box.querySelector('#rvReport').textContent).toMatch(
      /2 of its entries are no longer marked/
    );
    await press('remark');
    expect(store[0].value.entries.map(e => e.marked)).toEqual([true, true]);
    expect(box.querySelector('[data-rv="repstate"]').className).toMatch(
      /is-ok/
    );
    expect(find('remark')).toBeUndefined();
  });

  test('a made report is shown again on a later visit, in its order', async () => {
    await mount([mark(A, true), mark(B, true), mark(S, true)]);
    await press('down', 'a');
    await press('make');
    const rec = store.find(r => r.id === COMPOSED_KEY);
    await mount(store[0].value.entries, [JSON.parse(JSON.stringify(rec))]);
    expect(titles()).toEqual(['1. Fit b', '2. Fit a', '3. Reading s']);
    expect(box.querySelector('[data-rv="repstate"]').className).toMatch(
      /is-ok/
    );
  });

  test('speaks Spanish when the page does', async () => {
    await mount([mark(A, true), mark(S, true)]);
    document.documentElement.lang = 'es';
    await view.show(page);
    await settle();
    const text = box.querySelector('#rvReport').textContent;
    expect(text).toMatch(/Tu informe/);
    expect(text).toMatch(/Hacer el informe/);
    expect(find('up', 's').getAttribute('aria-label')).toBe('Subir: Reading s');
    await press('make');
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Informe hecho: 2 secciones/
    );
    await press('html');
    const html = await saved[0].text();
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('Métodos');
    expect(html).toContain('Semilla: k7.');
  });
});
