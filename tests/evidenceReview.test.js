import { describe, test, expect, beforeEach } from '@jest/globals';

// =============================================================================
// Reviewing and comparing the ledger (Roadmap III, Prompt 275, part A)
// -----------------------------------------------------------------------------
// The filters, the covariance rule of the comparison, its agreement with
// Prompt 151's comparison and 154's difference, the mark and the annotation
// (the snapshot untouched), and the view drawn in jsdom: filter, compare two
// entries, compare two quantities of one entry, mark, annotate.
//
// The reference numbers below come from Python's math.erfc, for sigma_A = 0.3
// and sigma_B = 0.4 and a difference of 1:
//   rho 0.0  variance 0.25   sigma 0.5                n 2.0                p 0.04550026389635843
//   rho 0.5  variance 0.13   sigma 0.36055512754639896 n 2.7735009811261455 p 0.00554566731524406
//   rho 0.8  variance 0.058  sigma 0.2408318915758459  n 4.1522739926869985 p 3.291877972196565e-05
// =============================================================================

import { webcrypto } from 'node:crypto';
import {
  annotate,
  buildEntry,
  mark,
  reviveEntry,
} from '../js/notebook/entry.js';
import { artifact } from '../js/platform/artifact.js';
import {
  commonQuantities,
  compareEntries,
  dayBounds,
  distinct,
  filterRows,
  reviewRows,
  sharedBasis,
} from '../js/myWork/evidenceReview.js';
import { difference } from '../js/kernels/statistics/compare.js';
import { envelopeOf } from '../js/notebook/ledger.js';
import { KEY_EVIDENCE_NOTEBOOK } from '../js/names.js';
import { SURFACE_ROUTE, surfaceOf } from '../js/myWork/model.js';

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

/** An entry holding the producer's own envelope. */
function entry({
  id,
  source = 'inference-fit',
  title = id,
  quantities,
  digest,
  kind = 'pipeline',
  context = { lesson: 'kepler', step: 2 },
  capturedAt = Date.parse('2026-03-10T12:00:00'),
}) {
  return buildEntry({
    id,
    source,
    title,
    quantities: [{ label: 'x', value: 0, unit: '' }],
    capturedAt,
    context,
    artifact: artifact({
      id,
      source: { kind, id: 'tool', ...(digest ? { digest } : {}) },
      quantities,
    }),
  });
}

const A = entry({
  id: 'a',
  quantities: [q('slope', 10, 0.3)],
  digest: 'abcdef0123456789',
});
const B = entry({
  id: 'b',
  quantities: [q('slope', 9, 0.4)],
  digest: 'abcdef0123456789',
});
const C = entry({
  id: 'c',
  quantities: [q('slope', 9, 0.4)],
  digest: '0000111122223333',
  context: { guide: 'tides' },
  capturedAt: Date.parse('2026-04-02T09:00:00'),
});
const WEEK = entry({
  id: 'w',
  source: 'bench-sweep',
  quantities: [q('period', 3, 0.1)],
  context: null,
  capturedAt: Date.parse('2026-04-20T09:00:00'),
});

describe('the review rows and their filters', () => {
  const rows = reviewRows([A, B, C, WEEK]);

  test('one row per entry, with its investigation, kind and day', () => {
    expect(rows.map(r => [r.id, r.kind, r.investigation])).toEqual([
      ['a', 'inference-fit', 'lesson:kepler'],
      ['b', 'inference-fit', 'lesson:kepler'],
      ['c', 'inference-fit', 'guide:tides'],
      ['w', 'bench-sweep', 'source:tool'],
    ]);
    expect(rows.every(r => r.when > 0 && r.quantities === 1)).toBe(true);
  });

  test('filters by investigation, kind and date, each alone and together', () => {
    const ids = f => filterRows(rows, f).map(r => r.id);
    expect(ids({})).toEqual(['a', 'b', 'c', 'w']);
    expect(ids({ investigation: 'lesson:kepler' })).toEqual(['a', 'b']);
    expect(ids({ kind: 'bench-sweep' })).toEqual(['w']);
    expect(ids({ ...dayBounds('2026-04-01', '2026-04-20') })).toEqual([
      'c',
      'w',
    ]);
    expect(ids({ ...dayBounds('2026-04-02', '2026-04-02') })).toEqual(['c']);
    expect(ids({ ...dayBounds('', '2026-03-31') })).toEqual(['a', 'b']);
    expect(
      ids({ kind: 'inference-fit', ...dayBounds('2026-04-01', '') })
    ).toEqual(['c']);
    expect(distinct(rows, 'kind')).toEqual(['inference-fit', 'bench-sweep']);
    expect(dayBounds('nonsense', '')).toEqual({ from: null, to: null });
  });

  test("a mark filters, and is the student's alone", () => {
    const m = mark(A, true);
    expect(m.marked).toBe(true);
    expect(m.snapshot).toBe(A.snapshot);
    expect(m.fingerprint).toBe(A.fingerprint);
    expect('marked' in mark(m, false)).toBe(false);
    expect(
      filterRows(reviewRows([m, B]), { marked: true }).map(r => r.id)
    ).toEqual(['a']);
    // It survives annotation and revival, and an unmarked entry gains no field.
    expect(annotate(m, { claim: 'x' }).marked).toBe(true);
    expect(reviveEntry(JSON.parse(JSON.stringify(m))).marked).toBe(true);
    expect('marked' in reviveEntry(JSON.parse(JSON.stringify(A)))).toBe(false);
  });
});

describe('what two records share', () => {
  const [ea, eb, ec] = [A, B, C].map(envelopeOf);
  test('the same observation digest is shared data; another is nothing', () => {
    expect(sharedBasis(ea, eb)).toBe('data');
    expect(sharedBasis(ea, ec)).toBeNull();
    expect(sharedBasis(ea, ea)).toBe('data');
  });
  test('an assumed quantity both took as given is a shared calibration', () => {
    const zp = { ...q('assumed:zeropoint', 25.1, null), origin: 'assumed' };
    const x = envelopeOf(entry({ id: 'x', quantities: [q('m', 1, 0.1), zp] }));
    const y = envelopeOf(entry({ id: 'y', quantities: [q('m', 2, 0.1), zp] }));
    const z = envelopeOf(
      entry({ id: 'z', quantities: [q('m', 2, 0.1), { ...zp, value: 25.2 }] })
    );
    expect(sharedBasis(x, y)).toBe('calibration');
    expect(sharedBasis(x, z)).toBeNull();
    expect(commonQuantities(x, y).map(c => c.id)).toEqual(['m']);
  });
});

describe('the comparison and its covariance rule', () => {
  const close = (got, want) =>
    expect(Math.abs(got - want)).toBeLessThanOrEqual(
      1e-12 * Math.max(1, Math.abs(want))
    );

  test('records that share nothing state nothing: independence assumed', () => {
    const r = compareEntries(A, C);
    expect(r.ok).toBe(true);
    expect(r.independent).toBe(true);
    expect(r.covarianceFrom).toBeNull();
    expect(r.assumptions).toEqual(['gaussian', 'independent']);
    close(r.sigma, 0.5);
    close(r.nSigma, 2);
    close(r.p, 0.04550026389635843);
  });

  test('records that share data and state no coefficient say so, louder, and still assume independence', () => {
    const r = compareEntries(A, B);
    expect(r.shared).toBe('data');
    expect(r.independent).toBe(true);
    expect(r.assumptions).toEqual(['gaussian', 'independent', 'sharedUnknown']);
    close(r.sigma, 0.5);
  });

  test('a correlation the student gives is used, and moves the answer as the oracle says', () => {
    const half = compareEntries(A, B, { rho: 0.5 });
    expect(half.independent).toBe(false);
    expect(half.assumptions).toEqual(['gaussian', 'covariance']);
    close(half.sigma, 0.36055512754639896);
    close(half.nSigma, 2.7735009811261455);
    close(half.p, 0.00554566731524406);
    const high = compareEntries(A, B, { rho: 0.8 });
    close(high.sigma, 0.2408318915758459);
    close(high.nSigma, 4.1522739926869985);
    expect(Math.abs(high.p / 3.291877972196565e-5 - 1)).toBeLessThan(1e-9);
    // Positive correlation makes the same difference more significant.
    expect(high.nSigma).toBeGreaterThan(half.nSigma);
    expect(half.nSigma).toBeGreaterThan(compareEntries(A, B).nSigma);
    // A covariance in the units squared is the same thing.
    close(
      compareEntries(A, B, { covariance: 0.06 }).sigma,
      0.36055512754639896
    );
  });

  test('two quantities of one record use the coefficient the record states between them', () => {
    const fit = entry({
      id: 'fit',
      quantities: [
        q('offset', 5, 0.3, {
          correlatedWith: [{ id: 'gain', rho: 0.5, basis: 'fit' }],
        }),
        q('gain', 4, 0.4),
      ],
    });
    const r = compareEntries(fit, fit, { idA: 'offset', idB: 'gain' });
    expect(r.ok).toBe(true);
    expect(r.covarianceFrom).toBe('record');
    expect(r.independent).toBe(false);
    close(r.sigma, 0.36055512754639896);
    close(r.nSigma, 2.7735009811261455);
    // The student's own number wins over the record's.
    close(
      compareEntries(fit, fit, { idA: 'offset', idB: 'gain', rho: 0 }).sigma,
      0.5
    );
  });

  test("agrees with the statistics kernel's difference (Prompt 154) on a grid of cases", () => {
    const grid = [];
    for (const [a, b] of [
      [10, 9],
      [5, 5],
      [0.002, 0.001],
      [-3, 4],
    ])
      for (const [sa, sb] of [
        [0.3, 0.4],
        [1, 1],
        [0.01, 2],
      ])
        for (const rho of [undefined, -0.4, 0, 0.5, 0.99])
          grid.push([a, b, sa, sb, rho]);
    for (const [a, bb, sa, sb, rho] of grid) {
      const [ea, eb] = [
        entry({ id: 'p', quantities: [q('v', a, sa)] }),
        entry({ id: 'r', quantities: [q('v', bb, sb)] }),
      ];
      const mine = compareEntries(ea, eb, rho === undefined ? {} : { rho });
      const cov = (rho ?? 0) * sa * sb;
      const theirs = difference({
        a,
        b: bb,
        varA: sa * sa,
        varB: sb * sb,
        covAB: cov,
      });
      expect(mine.ok).toBe(true);
      expect(Math.abs(mine.sigma - theirs.sigma)).toBeLessThanOrEqual(
        1e-12 * theirs.sigma + 1e-15
      );
      expect(Math.abs(mine.nSigma - Math.abs(theirs.z))).toBeLessThanOrEqual(
        1e-9 * (1 + Math.abs(theirs.z))
      );
      expect(Math.abs(mine.p - theirs.p)).toBeLessThanOrEqual(
        1e-9 * theirs.p + 1e-12
      );
      expect(mine.assumptions).toEqual([
        'gaussian',
        rho === undefined ? 'independent' : 'covariance',
      ]);
    }
  });

  test('refuses what it cannot compare, and says why', () => {
    expect(compareEntries(A, WEEK)).toEqual({ ok: false, reason: 'kind' });
    expect(compareEntries(A, B, { rho: 1.5 })).toEqual({
      ok: false,
      reason: 'covariance',
    });
    expect(compareEntries(A, B, { rho: 1 }).ok).toBe(true);
    expect(compareEntries(A, B, { idB: 'nothing' }).reason).toBe('quantity');
    expect(compareEntries(null, B).reason).toBe('entries');
    const none = entry({ id: 'n', quantities: [q('slope', 1, null)] });
    expect(compareEntries(A, none)).toEqual({
      ok: false,
      reason: 'none',
      which: 'b',
    });
    const limit = entry({
      id: 'l',
      quantities: [
        {
          ...q('slope', 1, null),
          uncertainty: { kind: 'limit', bound: 'upper', basis: 'data' },
        },
      ],
    });
    expect(compareEntries(limit, A).reason).toBe('limit');
    expect(compareEntries(limit, A).which).toBe('a');
    const km = entry({
      id: 'k',
      quantities: [{ ...q('slope', 9, 0.4), unit: 'km' }],
    });
    expect(compareEntries(A, km).reason).toBe('unit');
  });

  test('the same estimate against itself is a difference of exactly nothing', () => {
    const r = compareEntries(A, A, { idA: 'slope', idB: 'slope' });
    expect(r.ok).toBe(true);
    expect(r.difference).toBe(0);
    expect(r.nSigma).toBe(0);
    expect(r.p).toBe(1);
  });
});

// --- The view ----------------------------------------------------------------

describe('the review drawn on My work', () => {
  let page;
  let rec;
  let box;
  const settle = () => new Promise(r => setTimeout(r, 40));
  const mount = async entries => {
    document.documentElement.lang = 'en';
    document.body.innerHTML =
      '<section id="mwReview" hidden><div class="mw-body"></div></section>';
    rec = {
      id: KEY_EVIDENCE_NOTEBOOK,
      collection: 'evidence',
      value: { v: 1, entries: JSON.parse(JSON.stringify(entries)) },
    };
    page = {
      surfaces: { SURFACE_ROUTE, surfaceOf },
      state: {
        records: [rec],
        store: {
          collection: () => ({
            put: async (_k, doc) => {
              rec.value = JSON.parse(JSON.stringify(doc));
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
  const set = async (el, value) => {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  };
  const tick = async (el, on = true) => {
    el.checked = on;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  };
  let view;
  beforeEach(async () => {
    view = await import('../js/myWork/evidenceView.js');
  });
  const find = (kind, id) =>
    [...box.querySelectorAll(`[data-rv="${kind}"]`)].find(
      c => c.dataset.id === id
    );

  test('lists every entry, filters them, and says how many are shown', async () => {
    await mount([A, B, C, WEEK]);
    expect(box.hidden).toBe(false);
    expect(box.querySelectorAll('.mw-item')).toHaveLength(4);
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /4 of 4 entries shown/
    );
    await set(box.querySelector('#rvKind'), 'bench-sweep');
    expect(box.querySelectorAll('.mw-item')).toHaveLength(1);
    expect(box.querySelector('#rvStatus').textContent).toMatch(/1 of 4/);
    await set(box.querySelector('#rvKind'), '');
    await set(box.querySelector('#rvFrom'), '2026-04-01');
    expect(box.querySelectorAll('.mw-item')).toHaveLength(2);
    box.querySelector('[data-rv="clear"]').click();
    await settle();
    expect(box.querySelectorAll('.mw-item')).toHaveLength(4);
  });

  test('every control has a name a screen reader can say', async () => {
    await mount([A, B]);
    for (const c of box.querySelectorAll(
      'input, select, textarea, button, a'
    )) {
      const name =
        c.getAttribute('aria-label') ||
        c.closest('label')?.textContent ||
        (c.id && box.querySelector(`label[for="${c.id}"]`)?.textContent) ||
        c.textContent;
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  test('compares two entries of one kind and says independence assumed, then uses a given correlation', async () => {
    await mount([A, C, WEEK]);
    await tick(find('compare', 'a'));
    await tick(find('compare', 'c'));
    // A third cannot be ticked: two at most.
    expect(find('compare', 'w').disabled).toBe(true);
    const out = box.querySelector('[data-rv="result"]');
    expect(out.textContent).toMatch(/Independence assumed\./);
    expect(out.textContent).toMatch(/2\.00 sigma/);
    expect(out.textContent).toMatch(/probability 0.046/);
    expect(box.querySelector('#rvCompare').textContent).toMatch(/slope: 10/);
    await tick(box.querySelector('[data-rv="shared"]'));
    expect(box.querySelector('[data-rv="result"]').textContent).toMatch(
      /share their data or calibration/
    );
    await set(box.querySelector('[data-rv="rho"]'), '0.5');
    const used = box.querySelector('[data-rv="result"]').textContent;
    expect(used).toMatch(/Covariance used, from the correlation you gave\./);
    expect(used).toMatch(/2\.8 sigma|2\.77 sigma/);
    expect(used).not.toMatch(/Independence assumed/);
  });

  test('refuses two entries of different kinds in words', async () => {
    await mount([A, WEEK]);
    await tick(find('compare', 'a'));
    await tick(find('compare', 'w'));
    expect(box.querySelector('[data-rv="result"]').textContent).toMatch(
      /different kinds/
    );
  });

  test("compares two quantities of one entry with the record's own coefficient", async () => {
    const fit = entry({
      id: 'fit',
      quantities: [
        q('offset', 5, 0.3, {
          correlatedWith: [{ id: 'gain', rho: 0.5, basis: 'fit' }],
        }),
        q('gain', 4, 0.4),
      ],
    });
    await mount([fit]);
    await tick(find('compare', 'fit'));
    const out = box.querySelector('[data-rv="result"]').textContent;
    expect(out).toMatch(/Covariance used, as the record states it\./);
  });

  test("marks for a report and annotates, writing only the student's words", async () => {
    await mount([A, B]);
    await tick(find('mark', 'a'));
    expect(rec.value.entries[0].marked).toBe(true);
    expect('marked' in rec.value.entries[1]).toBe(false);
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Marked for a report/
    );
    expect(rec.value.entries[0].snapshot).toEqual(
      JSON.parse(JSON.stringify(A.snapshot))
    );
    find('note', 'b').click();
    await settle();
    const form = box.querySelector('[data-rv="noteform"]');
    expect(form).not.toBeNull();
    expect(document.activeElement.id).toBe('rvNoteTitle');
    form.querySelector('[data-rv-field="claim"]').value = 'The slope fell.';
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await settle();
    expect(rec.value.entries[1].prose.claim).toBe('The slope fell.');
    expect(rec.value.entries[1].snapshot).toEqual(
      JSON.parse(JSON.stringify(B.snapshot))
    );
    expect(rec.value.entries[1].fingerprint).toBe(B.fingerprint);
    expect(box.querySelector('[data-rv="noteform"]')).toBeNull();
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Annotation saved/
    );
    // A second draw of the same page (the page's own refresh) keeps the words.
    await view.show(page);
    expect(box.querySelector('#rvStatus').textContent).toMatch(
      /Annotation saved/
    );
    // Focus returns to the control that opened it.
    expect(document.activeElement).toBe(find('note', 'b'));
  });

  test('speaks Spanish when the page does', async () => {
    await mount([A, C]);
    document.documentElement.lang = 'es';
    await view.show(page);
    await tick(find('compare', 'a'));
    await tick(find('compare', 'c'));
    const text = box.textContent;
    expect(text).toMatch(/Independencia supuesta\./);
    expect(text).toMatch(/La diferencia es/);
    expect(text).toMatch(/Comparar/);
  });

  test('a notebook with nothing in it hides the section', async () => {
    await mount([]);
    expect(box.hidden).toBe(true);
  });
});
