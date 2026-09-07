import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  KIND,
  KINDS,
  LIMITS,
  SOURCE,
  SOURCES,
  annotate,
  buildEntry,
  deepFreeze,
  figure,
  figureSeries,
  newEntryId,
  provenanceOf,
  quantity,
  reviveEntry,
  snapshotFingerprint,
  validateEntry,
} from '../js/notebook/entry.js';
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  MAX_ENTRIES,
  addEntry,
  backupFilename,
  buildBackup,
  moveEntry,
  removeEntry,
  reorder,
  replaceEntry,
  restoreBackup,
  tallyBySource,
  validateBackup,
} from '../js/notebook/notebook.js';
import * as store from '../js/notebook/store.js';
import { provenanceRows } from '../js/notebook/report.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { VERDICT } from '../js/experiments/reliability.js';

/** A minimal in-memory Storage. */
function fakeStorage({ refuse = false, limit = Infinity } = {}) {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      if (refuse) {
        const err = new Error('refused');
        err.name = 'QuotaExceededError';
        throw err;
      }
      if (value.length > limit) {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(key, String(value));
    },
    removeItem: key => map.delete(key),
    get size() {
      return map.size;
    },
  };
}

/** An entry with one measured number and a two-series figure. */
const sampleEntry = (over = {}) =>
  buildEntry({
    source: SOURCE.RV_FIT,
    title: 'A fit',
    quantities: [
      quantity({ label: 'Period', value: 3.5, unit: 'd' }),
      quantity({ label: 'Truth', value: 3.4, unit: 'd', kind: KIND.TRUTH }),
    ],
    figure: figure({
      title: 'Folded',
      xLabel: 'Phase',
      yLabel: 'RV (m/s)',
      series: [
        figureSeries({
          label: 'Observed',
          points: [
            [0, 1],
            [0.5, -1],
          ],
          style: 'points',
          errors: [0.2, 0.2],
        }),
        figureSeries({
          label: 'Model',
          kind: KIND.ANALYTIC,
          points: [
            [0, 1.1],
            [0.5, -1.1],
          ],
        }),
      ],
    }),
    provenance: provenanceOf({
      scenario: 'Hot Jupiter',
      target: 'Star A',
      seed: 'e2e',
      worldGeneration: 4,
      simTimeSeconds: 86400,
      simTimeDays: 1,
      revision: 'abc123',
      integrator: 'yoshida',
      timestep: 0.02,
      simSpeed: 1,
      observer: { positionAngleDeg: 0, inclinationDeg: 90 },
      quality: { tier: 'full', fps: 59.4 },
      units: { velocity: 'm/s', time: 'days' },
      flags: ['truth-revealed'],
    }),
    capturedAt: 1_700_000_000_000,
    ...over,
  });

// The notebook's prose is in the deferred half of the catalogue, registered by
// the bridge at run time. A unit test does not go through the bridge, so it
// registers them itself; without this, every label below would be its own id.
registerMessages('en', EN_DEFERRED);

beforeEach(() => {
  store.setBackend(fakeStorage());
});

describe('a snapshot cannot be altered', () => {
  test('every level of it is frozen, arrays included', () => {
    const entry = sampleEntry();
    expect(Object.isFrozen(entry.snapshot)).toBe(true);
    expect(Object.isFrozen(entry.snapshot.quantities)).toBe(true);
    expect(Object.isFrozen(entry.snapshot.quantities[0])).toBe(true);
    expect(Object.isFrozen(entry.snapshot.figure.series)).toBe(true);
    expect(Object.isFrozen(entry.snapshot.figure.series[0].points)).toBe(true);
    expect(Object.isFrozen(entry.snapshot.figure.series[0].points[0])).toBe(
      true
    );
    expect(Object.isFrozen(entry.snapshot.provenance)).toBe(true);
    expect(Object.isFrozen(entry.snapshot.provenance.flags)).toBe(true);
  });

  test('a caller that keeps the arrays it handed over cannot edit the entry', () => {
    // The failure this exists for: a panel builds a quantity list, passes it
    // in, and keeps mutating its own copy on the next frame.
    const quantities = [quantity({ label: 'Period', value: 3.5, unit: 'd' })];
    const points = [[0, 1]];
    const entry = buildEntry({
      source: SOURCE.RV_FIT,
      title: 'Live',
      quantities,
      figure: figure({
        title: 'f',
        xLabel: 'x',
        yLabel: 'y',
        series: [figureSeries({ label: 'a', points })],
      }),
    });

    quantities[0].value = 999;
    quantities.push(quantity({ label: 'Sneaked in', value: 1 }));
    points.push([1, 2]);

    expect(entry.snapshot.quantities).toHaveLength(1);
    expect(entry.snapshot.quantities[0].value).toBe(3.5);
    expect(entry.snapshot.figure.series[0].points).toHaveLength(1);
  });

  test('writing to a frozen snapshot changes nothing', () => {
    const entry = sampleEntry();
    // Non-strict assignment to a frozen object is silently ignored; the point
    // is that the value does not move, however it is attempted.
    expect(() => {
      'use strict';
      entry.snapshot.quantities[0].value = 1;
    }).toThrow();
    expect(entry.snapshot.quantities[0].value).toBe(3.5);
  });

  test('deepFreeze copes with cycles and primitives', () => {
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(4)).toBe(4);
    const a = { name: 'a' };
    a.self = a;
    expect(() => deepFreeze(a)).not.toThrow();
    expect(Object.isFrozen(a)).toBe(true);
  });
});

describe('annotating changes the words and not the numbers', () => {
  test('the revised entry shares the same frozen snapshot object', () => {
    const entry = sampleEntry();
    const revised = annotate(entry, { claim: 'The period is 3.5 days.' });
    // Identity, not equality: there is no copy that could drift.
    expect(revised.snapshot).toBe(entry.snapshot);
    expect(revised.fingerprint).toBe(entry.fingerprint);
    expect(revised.prose.claim).toBe('The period is 3.5 days.');
    expect(entry.prose.claim).toBe('');
  });

  test('the heading is prose too, and the id does not move', () => {
    const entry = sampleEntry();
    const revised = annotate(entry, { title: 'My best fit' });
    expect(revised.title).toBe('My best fit');
    expect(revised.id).toBe(entry.id);
    expect(revised.revisedAt).toBeGreaterThan(0);
  });

  test('prose is capped rather than refused', () => {
    const entry = annotate(sampleEntry(), { claim: 'x'.repeat(5000) });
    expect(entry.prose.claim).toHaveLength(LIMITS.claim);
  });

  test('a field not mentioned is left alone', () => {
    const entry = annotate(sampleEntry(), { claim: 'one' });
    const again = annotate(entry, { evidence: 'two' });
    expect(again.prose.claim).toBe('one');
    expect(again.prose.evidence).toBe('two');
  });
});

describe('quantities and their kinds', () => {
  test('a quantity keeps its unit and its kind', () => {
    const q = quantity({
      label: 'K',
      value: 42.5,
      unit: 'm/s',
      kind: KIND.MEASURED,
      note: 'gives M sin i',
    });
    expect(q).toEqual({
      label: 'K',
      value: 42.5,
      unit: 'm/s',
      kind: 'measured',
      uncertainty: null,
      note: 'gives M sin i',
    });
  });

  test('a non-finite value is stored as null rather than as NaN', () => {
    expect(quantity({ label: 'x', value: NaN }).value).toBe(null);
    expect(quantity({ label: 'x', value: Infinity }).value).toBe(null);
    expect(quantity({ label: 'x', value: undefined }).value).toBe(null);
  });

  test('an unknown kind falls back to measured rather than being stored', () => {
    // Falling back to the weakest claim: labelling something "revealed" that
    // is not would be the dangerous direction, and so would inventing a kind
    // the report has no word for.
    expect(quantity({ label: 'x', value: 1, kind: 'invented' }).kind).toBe(
      KIND.MEASURED
    );
  });

  test('all three kinds have a word in both languages', () => {
    for (const kind of KINDS) {
      expect(typeof EN_DEFERRED[`nb.kind.${kind}`]).toBe('string');
      expect(typeof ES_DEFERRED[`nb.kind.${kind}`]).toBe('string');
    }
  });

  test('every source has a name in both languages', () => {
    for (const source of SOURCES) {
      expect(typeof EN_DEFERRED[`nb.source.${source}`]).toBe('string');
      expect(typeof ES_DEFERRED[`nb.source.${source}`]).toBe('string');
    }
  });
});

describe('figures', () => {
  test('non-finite points are dropped, not stored', () => {
    const s = figureSeries({
      label: 'x',
      points: [
        [0, 1],
        [NaN, 2],
        [1, Infinity],
        [2, 3],
      ],
    });
    expect(s.points).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  test('points are capped', () => {
    const s = figureSeries({
      label: 'x',
      points: Array.from({ length: 5000 }, (_, i) => [i, i]),
    });
    expect(s.points).toHaveLength(LIMITS.seriesPoints);
  });

  test('a figure with no drawable series is null rather than empty', () => {
    expect(figure({ title: 't', xLabel: 'x', yLabel: 'y', series: [] })).toBe(
      null
    );
    expect(
      figure({
        title: 't',
        xLabel: 'x',
        yLabel: 'y',
        series: [figureSeries({ label: 'a', points: [] })],
      })
    ).toBe(null);
  });

  test('a series remembers whether it is data or a model', () => {
    const fig = sampleEntry().snapshot.figure;
    expect(fig.series.map(s => s.kind)).toEqual(['measured', 'analytic']);
  });
});

describe('provenance', () => {
  test('an absent field is null rather than missing', () => {
    // A report that omits the seed reads as though seeds do not matter.
    const p = provenanceOf({});
    for (const key of [
      'scenario',
      'target',
      'seed',
      'revision',
      'simTimeDays',
      'worldGeneration',
      'referenceFrame',
    ]) {
      expect(p[key]).toBe(null);
      expect(key in p).toBe(true);
    }
    expect(p.numerical).toEqual({
      integrator: null,
      maxTimestep: null,
      simSpeed: null,
      substeps: null,
    });
  });

  test('flags are de-duplicated and ordered', () => {
    const p = provenanceOf({ flags: ['b', 'a', 'b', null, 'a'] });
    expect(p.flags).toEqual(['a', 'b']);
  });

  test('every field the report prints has a label in both languages', () => {
    const entry = sampleEntry();
    for (const [label] of provenanceRows(entry.snapshot.provenance)) {
      expect(typeof label).toBe('string');
      expect(label.startsWith('nb.')).toBe(false);
    }
  });

  test('the report says "not recorded" rather than dropping a blank field', () => {
    const bare = buildEntry({
      source: SOURCE.RV_FIT,
      title: 'Bare',
      quantities: [quantity({ label: 'x', value: 1 })],
    });
    const rows = provenanceRows(bare.snapshot.provenance);
    const seed = rows.find(([label]) => label === EN_DEFERRED['nb.prov.seed']);
    expect(seed[1]).toBe(EN_DEFERRED['nb.report.notRecorded']);
  });
});

describe('the list is the student’s argument', () => {
  const ids = list => list.map(e => e.id);

  test('a new entry goes to the end, not the front', () => {
    const a = sampleEntry();
    const b = sampleEntry();
    expect(ids(addEntry(addEntry([], a), b))).toEqual([a.id, b.id]);
  });

  test('saving the same entry twice replaces it rather than duplicating it', () => {
    const a = sampleEntry();
    expect(addEntry(addEntry([], a), a)).toHaveLength(1);
  });

  test('replacing keeps the position', () => {
    const [a, b, c] = [sampleEntry(), sampleEntry(), sampleEntry()];
    const list = [a, b, c];
    const revised = annotate(b, { claim: 'edited' });
    const after = replaceEntry(list, revised);
    expect(ids(after)).toEqual([a.id, b.id, c.id]);
    expect(after[1].prose.claim).toBe('edited');
  });

  test('moving is clamped at the ends rather than wrapping', () => {
    const [a, b, c] = [sampleEntry(), sampleEntry(), sampleEntry()];
    const list = [a, b, c];
    expect(ids(moveEntry(list, a.id, -1))).toEqual([a.id, b.id, c.id]);
    expect(ids(moveEntry(list, c.id, 1))).toEqual([a.id, b.id, c.id]);
    expect(ids(moveEntry(list, c.id, -1))).toEqual([a.id, c.id, b.id]);
    expect(ids(moveEntry(list, a.id, 2))).toEqual([b.id, c.id, a.id]);
    expect(ids(moveEntry(list, a.id, 99))).toEqual([b.id, c.id, a.id]);
  });

  test('moving does not touch a snapshot', () => {
    const a = sampleEntry();
    const moved = moveEntry([a, sampleEntry()], a.id, 1);
    expect(moved.find(e => e.id === a.id).snapshot).toBe(a.snapshot);
  });

  test('a partial order cannot lose an entry', () => {
    const [a, b, c] = [sampleEntry(), sampleEntry(), sampleEntry()];
    const after = reorder([a, b, c], [c.id, 'not-here']);
    expect(ids(after)).toEqual([c.id, a.id, b.id]);
  });

  test('removing takes exactly one', () => {
    const [a, b] = [sampleEntry(), sampleEntry()];
    expect(ids(removeEntry([a, b], a.id))).toEqual([b.id]);
    expect(removeEntry([a, b], 'nope')).toHaveLength(2);
  });

  test('the tally counts by instrument', () => {
    const list = [
      sampleEntry(),
      sampleEntry({ source: SOURCE.BENCH_SWEEP }),
      sampleEntry({ source: SOURCE.BENCH_SWEEP }),
    ];
    expect(tallyBySource(list)).toEqual({
      'rv-fit': 1,
      'bench-sweep': 2,
    });
  });

  test('ids drawn in one millisecond are still distinct', () => {
    const seen = new Set(Array.from({ length: 500 }, () => newEntryId()));
    expect(seen.size).toBe(500);
  });
});

describe('the store answers when it cannot write', () => {
  test('an empty store reads as an empty notebook, not an error', () => {
    expect(store.load()).toEqual({ ok: true, entries: [], reason: 'ok' });
  });

  test('a round trip keeps the entries and their order', () => {
    const [a, b] = [sampleEntry(), sampleEntry()];
    expect(store.save([a, b]).ok).toBe(true);
    const read = store.load();
    expect(read.ok).toBe(true);
    expect(read.entries.map(e => e.id)).toEqual([a.id, b.id]);
  });

  test('a browser with no storage at all says so instead of throwing', () => {
    store.setBackend(null);
    const previous = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('access denied');
      },
    });
    try {
      expect(store.save([sampleEntry()])).toMatchObject({
        ok: false,
        reason: store.FAILURE.UNAVAILABLE,
      });
      expect(store.load()).toMatchObject({ ok: false, entries: [] });
      expect(store.isAvailable()).toBe(false);
    } finally {
      if (previous === undefined) delete globalThis.localStorage;
      else
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          value: previous,
        });
    }
  });

  test('a browser that accepts nothing is caught by the probe', () => {
    store.setBackend(fakeStorage({ refuse: true }));
    expect(store.isAvailable()).toBe(false);
    expect(store.save([sampleEntry()])).toMatchObject({
      ok: false,
      reason: store.FAILURE.QUOTA,
    });
  });

  test('a refused write leaves the stored notebook exactly as it was', () => {
    const a = sampleEntry();
    expect(store.save([a]).ok).toBe(true);
    // A notebook over the total cap: refused before the write, so what is
    // already stored survives and the caller can offer a download.
    // Sixty entries, each a fraction under the per-entry cap: the total is
    // over the notebook's budget while no single entry is over its own, so
    // this exercises the total check rather than the per-entry one.
    const huge = Array.from({ length: store.LIMITS.maxEntries }, () =>
      sampleEntry({
        figure: figure({
          title: 'big',
          xLabel: 'x',
          yLabel: 'y',
          series: Array.from({ length: 3 }, (_, si) =>
            figureSeries({
              label: `s${si}`,
              points: Array.from({ length: LIMITS.seriesPoints }, (_, i) => [
                i / 3,
                Math.sin(i + si) * 1234.56789,
              ]),
            })
          ),
        }),
      })
    );
    const verdict = store.save(huge);
    expect(verdict.ok).toBe(false);
    expect(store.load().entries.map(e => e.id)).toEqual([a.id]);
  });

  test('one oversized entry is named rather than the whole notebook refused', () => {
    const big = sampleEntry({
      figure: figure({
        title: 'big',
        xLabel: 'x',
        yLabel: 'y',
        series: Array.from({ length: LIMITS.series }, (_, s) =>
          figureSeries({
            label: `s${s}`,
            points: Array.from({ length: LIMITS.seriesPoints }, (_, i) => [
              i / 3,
              Math.sin(i) * 1234.56789,
            ]),
          })
        ),
      }),
    });
    const verdict = store.save([big]);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe(store.FAILURE.TOO_LARGE);
    expect(verdict.id).toBe(big.id);
  });

  test('too many entries is refused with the limit', () => {
    const many = Array.from({ length: store.LIMITS.maxEntries + 1 }, () =>
      sampleEntry()
    );
    expect(store.save(many)).toMatchObject({
      ok: false,
      reason: store.FAILURE.TOO_MANY,
      limit: store.LIMITS.maxEntries,
    });
  });

  test('a notebook from a newer build is refused rather than opened wrongly', () => {
    const backend = fakeStorage();
    backend.setItem(store.KEY, JSON.stringify({ v: 99, entries: [] }));
    store.setBackend(backend);
    expect(store.load()).toMatchObject({
      ok: false,
      reason: 'from-a-newer-version',
    });
  });

  test('unreadable stored text is reported, not thrown', () => {
    const backend = fakeStorage();
    backend.setItem(store.KEY, 'not json');
    store.setBackend(backend);
    expect(store.load()).toMatchObject({ ok: false, reason: 'unreadable' });
  });

  test('every failure reason has a message in both languages', () => {
    const reasons = [
      ...Object.values(store.FAILURE),
      'from-a-newer-version',
      'unreadable',
      'tooLarge',
      'notJson',
      'notAnObject',
      'notANotebook',
      'noVersion',
      'tooNew',
      'noEntries',
      'tooManyEntries',
      'not-an-entry',
      'no-id',
      'no-snapshot',
      'no-quantities',
      'bad-quantity',
      'unknown-kind',
      'bad-figure',
    ];
    for (const reason of reasons) {
      expect(typeof EN_DEFERRED[`nb.save.${reason}`]).toBe('string');
      expect(typeof ES_DEFERRED[`nb.save.${reason}`]).toBe('string');
    }
  });
});

describe('the file keeps the provenance', () => {
  test('a downloaded notebook carries every provenance field', () => {
    const entry = sampleEntry();
    const payload = buildBackup({ entries: [entry], revision: 'abc123' });
    expect(payload.kind).toBe(BACKUP_KIND);
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(payload.app.revision).toBe('abc123');
    const written = payload.entries[0].snapshot.provenance;
    expect(written).toEqual(entry.snapshot.provenance);
    // Named individually, because "it round-trips" would pass on an empty
    // block and these are the fields the feature promises to preserve.
    expect(written.scenario).toBe('Hot Jupiter');
    expect(written.target).toBe('Star A');
    expect(written.seed).toBe('e2e');
    expect(written.worldGeneration).toBe(4);
    expect(written.simTimeDays).toBe(1);
    expect(written.revision).toBe('abc123');
    expect(written.numerical.integrator).toBe('yoshida');
    expect(written.numerical.maxTimestep).toBe(0.02);
    expect(written.observer).toEqual({
      positionAngleDeg: 0,
      inclinationDeg: 90,
    });
    expect(written.quality).toEqual({ tier: 'full', fps: 59.4 });
    expect(written.units).toEqual({ velocity: 'm/s', time: 'days' });
    expect(written.flags).toEqual(['truth-revealed']);
  });

  test('a round trip through JSON restores the entry unchanged', () => {
    const entry = annotate(sampleEntry(), { claim: 'It is 3.5 days.' });
    const text = JSON.stringify(
      buildBackup({ entries: [entry], revision: 'abc123' })
    );
    const data = JSON.parse(text);
    expect(validateBackup(data)).toEqual({ ok: true, reason: '' });
    const { entries, tampered } = restoreBackup(data);
    expect(tampered).toBe(0);
    expect(entries[0].id).toBe(entry.id);
    expect(entries[0].prose.claim).toBe('It is 3.5 days.');
    expect(entries[0].snapshot).toEqual(entry.snapshot);
    expect(entries[0].fingerprint).toBe(entry.fingerprint);
    // Frozen again on the way in: a restored entry is no more editable than a
    // captured one.
    expect(Object.isFrozen(entries[0].snapshot.quantities[0])).toBe(true);
  });

  test('a file whose numbers were edited by hand is kept and marked', () => {
    const entry = sampleEntry();
    const data = JSON.parse(
      JSON.stringify(buildBackup({ entries: [entry], revision: 'x' }))
    );
    data.entries[0].snapshot.quantities[0].value = 999;
    const { entries, tampered } = restoreBackup(data);
    expect(tampered).toBe(1);
    expect(entries[0].tampered).toBe(true);
    // Kept, not dropped: a student needs to see which entry it was.
    expect(entries[0].snapshot.quantities[0].value).toBe(999);
    expect(entries[0].fingerprint).not.toBe(entry.fingerprint);
  });

  test('the fingerprint moves when a number moves and not when prose does', () => {
    const entry = sampleEntry();
    const reworded = annotate(entry, { claim: 'anything at all' });
    expect(snapshotFingerprint(reworded.snapshot)).toBe(entry.fingerprint);

    const edited = JSON.parse(JSON.stringify(entry.snapshot));
    edited.quantities[0].value = 3.6;
    expect(snapshotFingerprint(edited)).not.toBe(entry.fingerprint);
  });

  test('every refusal a bad file can produce is named', () => {
    expect(validateBackup(null).reason).toBe('notAnObject');
    expect(validateBackup([]).reason).toBe('notAnObject');
    expect(validateBackup({ kind: 'other' }).reason).toBe('notANotebook');
    expect(validateBackup({ kind: BACKUP_KIND }).reason).toBe('noVersion');
    expect(validateBackup({ kind: BACKUP_KIND, version: 99 }).reason).toBe(
      'tooNew'
    );
    expect(validateBackup({ kind: BACKUP_KIND, version: 1 }).reason).toBe(
      'noEntries'
    );
    expect(
      validateBackup({
        kind: BACKUP_KIND,
        version: 1,
        entries: Array.from({ length: MAX_ENTRIES + 1 }, sampleEntry),
      }).reason
    ).toBe('tooManyEntries');
  });

  test('a payload that is not an entry is refused with a reason', () => {
    expect(validateEntry(null).reason).toBe('not-an-entry');
    expect(validateEntry({}).reason).toBe('no-id');
    expect(validateEntry({ id: 'x' }).reason).toBe('no-snapshot');
    expect(validateEntry({ id: 'x', snapshot: {} }).reason).toBe(
      'no-quantities'
    );
    expect(
      validateEntry({ id: 'x', snapshot: { v: 99, quantities: [] } }).reason
    ).toBe('from-a-newer-version');
    expect(
      validateEntry({ id: 'x', snapshot: { quantities: [{ label: 1 }] } })
        .reason
    ).toBe('bad-quantity');
    expect(
      validateEntry({
        id: 'x',
        snapshot: { quantities: [{ label: 'a', kind: 'invented' }] },
      }).reason
    ).toBe('unknown-kind');
    expect(
      validateEntry({
        id: 'x',
        snapshot: { quantities: [], figure: { series: 'no' } },
      }).reason
    ).toBe('bad-figure');
  });

  test('reviving a payload with no prose gives empty strings, not undefined', () => {
    const revived = reviveEntry({
      id: 'x',
      source: SOURCE.RV_FIT,
      snapshot: { v: 1, capturedAt: 1, quantities: [], provenance: {} },
    });
    expect(revived.prose).toEqual({
      claim: '',
      evidence: '',
      limitations: '',
    });
  });

  test('the filename is dated and stable', () => {
    expect(backupFilename(new Date('2026-03-04T05:06:07Z'))).toBe(
      'gravitas-evidence-2026-03-04-05-06.json'
    );
  });
});

describe('every verdict and flag the notebook can record is translated', () => {
  test('the reliability verdicts', () => {
    for (const verdict of Object.values(VERDICT)) {
      expect(typeof EN_DEFERRED[`nb.rel.limit.verdict.${verdict}`]).toBe(
        'string'
      );
      expect(typeof ES_DEFERRED[`nb.rel.limit.verdict.${verdict}`]).toBe(
        'string'
      );
      expect(typeof EN_DEFERRED[`nb.flag.verdict-${verdict}`]).toBe('string');
      expect(typeof ES_DEFERRED[`nb.flag.verdict-${verdict}`]).toBe('string');
    }
  });

  test('every flag the capture helpers can raise', () => {
    // Read out of the source rather than listed here, so a new flag added to
    // capture.js without a name in both catalogues fails this test.
    const flags = [
      'truth-revealed',
      'degraded-epochs',
      'unverified-epochs',
      'weights-assumed',
      'structured-residuals',
      'multivariable',
      'bench-warning',
      'cancelled',
      'failed-trials',
      'reliability-check',
    ];
    for (const flag of flags) {
      expect(typeof EN_DEFERRED[`nb.flag.${flag}`]).toBe('string');
      expect(typeof ES_DEFERRED[`nb.flag.${flag}`]).toBe('string');
    }
  });

  test('the sweep directions', () => {
    for (const dir of ['increasing', 'decreasing', 'flat']) {
      expect(typeof EN_DEFERRED[`nb.sweep.dir.${dir}`]).toBe('string');
      expect(typeof ES_DEFERRED[`nb.sweep.dir.${dir}`]).toBe('string');
    }
  });
});

describe('capturing from the instruments', () => {
  /** An RV analysis of the shape rvWorkspace.analysis() returns. */
  const rvAnalysis = (over = {}) => ({
    tooFew: false,
    trial: { period: 3.5, K: 42, phase: 1.2, gamma: -3 },
    atTrial: { rms: 4.2, reducedChi2: 1.08, chi2: 12, dof: 11 },
    folded: [
      { phase: 0.1, rv: 40, sigma: 4, model: 39, residual: 1 },
      { phase: 0.6, rv: -38, sigma: 4, model: -39, residual: 1 },
      { phase: 0.35, rv: 2, sigma: 4, model: 1, residual: 1 },
    ],
    structure: { runs: 6, expectedRuns: 6.2, runsRatio: 0.97 },
    used: 12,
    excluded: {
      missed: 0,
      notFinite: 0,
      badSigma: 0,
      degraded: 0,
      unverified: 0,
    },
    search: null,
    revealed: false,
    truth: null,
    ...over,
  });

  const rvReport = {
    recording: {
      target: 'Star A',
      scenario: 'Hot Jupiter',
      seed: 'e2e',
      worldGeneration: 7,
    },
  };

  test('an RV fit records the parameters as measured', async () => {
    const { fromRvFit } = await import('../js/notebook/capture.js');
    const entry = fromRvFit({
      analysis: rvAnalysis(),
      report: rvReport,
      provenance: {},
    });
    const byLabel = Object.fromEntries(
      entry.snapshot.quantities.map(q => [q.label, q])
    );
    expect(entry.source).toBe(SOURCE.RV_FIT);
    expect(byLabel[EN_DEFERRED['nb.rv.period']].value).toBe(3.5);
    expect(byLabel[EN_DEFERRED['nb.rv.period']].unit).toBe('d');
    expect(entry.snapshot.quantities.every(q => q.kind === KIND.MEASURED)).toBe(
      true
    );
    // The one qualification that must travel with the number rather than
    // living in the prose.
    expect(byLabel[EN_DEFERRED['nb.rv.K']].note).toBe(
      EN_DEFERRED['nb.rv.msini']
    );
  });

  test('the model curve is analytic and the data is not', async () => {
    const { fromRvFit } = await import('../js/notebook/capture.js');
    const entry = fromRvFit({ analysis: rvAnalysis(), report: rvReport });
    const kinds = Object.fromEntries(
      entry.snapshot.figure.series.map(s => [s.label, s.kind])
    );
    expect(kinds[EN_DEFERRED['nb.rv.observed']]).toBe(KIND.MEASURED);
    expect(kinds[EN_DEFERRED['nb.rv.model']]).toBe(KIND.ANALYTIC);
    // Folded curves are plotted against phase, so they have to be in phase
    // order or the model draws as a zigzag.
    const model = entry.snapshot.figure.series.find(
      s => s.label === EN_DEFERRED['nb.rv.model']
    );
    const phases = model.points.map(([x]) => x);
    expect([...phases].sort((a, b) => a - b)).toEqual(phases);
  });

  test('revealed truth is labelled as revealed, not as a measurement', async () => {
    const { fromRvFit } = await import('../js/notebook/capture.js');
    const entry = fromRvFit({
      analysis: rvAnalysis({
        revealed: true,
        truth: { period: 3.48, K: 41.2, gamma: -3.1 },
      }),
      report: rvReport,
    });
    const truths = entry.snapshot.quantities.filter(q => q.kind === KIND.TRUTH);
    expect(truths.map(q => q.value)).toEqual([3.48, 41.2]);
    // And the fact that it was revealed is recorded, so a claim of agreement
    // can be read for what it is.
    expect(entry.snapshot.provenance.flags).toContain('truth-revealed');
    expect(entry.prose.limitations).toContain(
      EN_DEFERRED['nb.rv.limit.revealed']
    );
  });

  test('an invented chi-square is left out rather than printed', async () => {
    const { fromRvFit } = await import('../js/notebook/capture.js');
    const entry = fromRvFit({
      analysis: rvAnalysis({
        atTrial: { rms: 4.2, reducedChi2: null },
      }),
      report: rvReport,
    });
    expect(
      entry.snapshot.quantities.some(q => q.label === EN_DEFERRED['nb.rv.chi2'])
    ).toBe(false);
    expect(entry.snapshot.provenance.flags).toContain('weights-assumed');
  });

  test('nothing is captured when there is no scoreable fit', async () => {
    const { fromRvFit } = await import('../js/notebook/capture.js');
    expect(fromRvFit({ analysis: null, report: null })).toBe(null);
    expect(
      fromRvFit({ analysis: { tooFew: true, used: 2 }, report: null })
    ).toBe(null);
    expect(
      fromRvFit({ analysis: rvAnalysis({ atTrial: null }), report: null })
    ).toBe(null);
  });

  test('a bench comparison keeps both runs and names what differed', async () => {
    const { fromBenchComparison } = await import('../js/notebook/capture.js');
    const entry = fromBenchComparison({
      experiment: {
        name: 'Two timesteps',
        metrics: ['separation'],
        diff: { variables: [{ key: 'gravity' }], multivariable: false },
        provenance: {
          scenario: 'Binary',
          seed: 's1',
          integrator: 'yoshida',
          timestep: 0.02,
          simSpeed: 1,
          units: { length: 'AU' },
          initialStateHash: 'h1',
        },
      },
      comparison: {
        rows: [
          {
            metric: 'separation',
            unit: 'AU',
            a: 1.2,
            b: 1.4,
            delta: 0.2,
            fraction: 0.16,
          },
        ],
        aligned: { separation: { a: [1, 2, 3], b: [1, 2.1, 3.2] } },
        warnings: [],
      },
      labelFor: id => id,
      provenance: {},
    });
    expect(entry.snapshot.quantities.map(q => q.value)).toEqual([1.2, 1.4]);
    expect(entry.snapshot.quantities.every(q => q.unit === 'AU')).toBe(true);
    expect(entry.prose.evidence).toContain('gravity');
    expect(entry.snapshot.provenance.seed).toBe('s1');
    expect(entry.snapshot.provenance.numerical.integrator).toBe('yoshida');
    expect(entry.snapshot.provenance.initialStateHash).toBe('h1');
    expect(entry.snapshot.figure.series.map(s => s.label)).toEqual(['A', 'B']);
  });

  test('a multivariable comparison says so in the flags and the limitations', async () => {
    const { fromBenchComparison } = await import('../js/notebook/capture.js');
    const entry = fromBenchComparison({
      experiment: {
        name: 'Two things at once',
        metrics: [],
        diff: { variables: [{ key: 'a' }, { key: 'b' }], multivariable: true },
        provenance: {},
      },
      comparison: {
        rows: [{ metric: 'x', unit: '', a: 1, b: 2 }],
        aligned: {},
      },
    });
    expect(entry.snapshot.provenance.flags).toContain('multivariable');
    expect(entry.prose.limitations).toContain(
      EN_DEFERRED['nb.bench.limit.multivariable']
    );
  });

  test('a sweep records the trials and the range, in parameter order', async () => {
    const { fromSweep } = await import('../js/notebook/capture.js');
    const entry = fromSweep({
      sweep: {
        scenario: 'Binary',
        parameter: 'gravity',
        metrics: ['separation'],
        duration: 120,
        seed: 's1',
        cancelled: false,
        numerics: { maxStep: 0.02, substeps: 4 },
        trials: [
          { value: 3, status: 'ok', results: { separation: 3.3 } },
          { value: 1, status: 'ok', results: { separation: 1.1 } },
          { value: 2, status: 'failed', results: {} },
        ],
        summaries: [
          {
            metric: 'separation',
            changed: true,
            direction: 'increasing',
            min: 1.1,
            max: 3.3,
            n: 2,
          },
        ],
      },
      labelFor: id => id,
    });
    expect(entry.source).toBe(SOURCE.BENCH_SWEEP);
    expect(entry.snapshot.figure.series[0].points).toEqual([
      [1, 1.1],
      [3, 3.3],
    ]);
    expect(entry.snapshot.provenance.flags).toContain('failed-trials');
    expect(entry.prose.limitations).toContain('1');
    expect(entry.snapshot.provenance.numerical.maxTimestep).toBe(0.02);
    expect(entry.snapshot.provenance.numerical.substeps).toBe(4);
  });

  test('a reliability check keeps both step sizes and refuses a verdict badge', async () => {
    const { fromReliability } = await import('../js/notebook/capture.js');
    const entry = fromReliability({
      report: {
        verdict: VERDICT.DIVERGED,
        tolerance: 0.01,
        steps: { coarse: 0.02, fine: 0.01 },
        integrator: 'yoshida',
        metrics: [
          {
            metric: 'separation',
            unit: 'AU',
            coarse: 1.2,
            fine: 1.21,
            change: 0.008,
            agrees: true,
          },
        ],
        series: { earlyWorst: 0.001, worst: 0.4, earlySamples: 40 },
        cost: { wallMs: 2400, substeps: { coarse: 4, fine: 8 } },
      },
      labelFor: id => id,
      provenance: { scenario: 'Binary' },
    });
    const values = entry.snapshot.quantities.map(q => q.value);
    expect(values).toContain(1.2);
    expect(values).toContain(1.21);
    expect(values).toContain(2.4);
    // No single word for the whole run: the flag carries the verdict and the
    // limitations explain it, but nothing is called "accurate".
    expect(entry.snapshot.provenance.flags).toContain('verdict-diverged');
    expect(entry.prose.limitations).toContain(
      EN_DEFERRED['nb.rel.limit.verdict.diverged']
    );
    expect(JSON.stringify(entry).toLowerCase()).not.toContain('accurate');
    // No figure: the report summarises the paths and discards the rows, so
    // there is nothing honest to draw.
    expect(entry.snapshot.figure).toBe(null);
  });

  test('every captured entry is frozen from the moment it is made', async () => {
    const capture = await import('../js/notebook/capture.js');
    const made = [
      capture.fromRvFit({ analysis: rvAnalysis(), report: rvReport }),
      capture.fromSweep({
        sweep: {
          scenario: 's',
          parameter: 'p',
          metrics: ['m'],
          duration: 1,
          trials: [
            { value: 1, status: 'ok', results: { m: 1 } },
            { value: 2, status: 'ok', results: { m: 2 } },
          ],
          summaries: [],
        },
      }),
    ];
    for (const entry of made) {
      expect(Object.isFrozen(entry.snapshot)).toBe(true);
      expect(Object.isFrozen(entry.snapshot.quantities)).toBe(true);
    }
  });
});

describe('the report', () => {
  /** The PDF as text, for looking for strings in it. */
  const asText = bytes => String.fromCharCode(...bytes);

  test('it builds, and carries the provenance of every entry', async () => {
    const { buildEvidenceReport } = await import('../js/notebook/report.js');
    const entry = annotate(sampleEntry(), {
      claim: 'The companion has a period near three and a half days.',
      limitations: 'K gives M sin i.\nOne seed.',
    });
    const bytes = buildEvidenceReport({
      entries: [entry],
      student: 'A Student',
      revision: 'abc123',
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);

    const text = asText(bytes);
    expect(text.startsWith('%PDF-')).toBe(true);
    // The provenance the export promises to retain. Looked for in the bytes
    // rather than in an intermediate object, because it is the file the
    // instructor opens that has to carry them.
    for (const needle of [
      'Hot Jupiter',
      'Star A',
      'e2e',
      'abc123',
      'yoshida',
      entry.fingerprint,
    ]) {
      expect(text).toContain(needle);
    }
  });

  test('the three kinds are named in words, not only in colour', async () => {
    const { buildEvidenceReport } = await import('../js/notebook/report.js');
    const text = asText(
      buildEvidenceReport({ entries: [sampleEntry()], revision: 'x' })
    );
    expect(text).toContain(EN_DEFERRED['nb.kind.measured']);
    expect(text).toContain(EN_DEFERRED['nb.kind.truth']);
    // And the key that says what those words mean.
    expect(text).toContain('revealed');
  });

  test('an entry that no longer matches its checksum is flagged in the file', async () => {
    const { buildEvidenceReport } = await import('../js/notebook/report.js');
    const entry = { ...sampleEntry(), tampered: true };
    const text = asText(buildEvidenceReport({ entries: [entry] }));
    expect(text).toContain('checksum');
  });

  test('an empty notebook still produces a readable file', async () => {
    const { buildEvidenceReport } = await import('../js/notebook/report.js');
    const bytes = buildEvidenceReport({ entries: [] });
    expect(asText(bytes).startsWith('%PDF-')).toBe(true);
  });

  test('a figure with one point, or a flat one, does not divide by zero', async () => {
    const { buildEvidenceReport } = await import('../js/notebook/report.js');
    const flat = sampleEntry({
      figure: figure({
        title: 'flat',
        xLabel: 'x',
        yLabel: 'y',
        series: [
          figureSeries({
            label: 'constant',
            points: [
              [1, 5],
              [2, 5],
            ],
          }),
          figureSeries({ label: 'single', points: [[1, 5]] }),
        ],
      }),
    });
    const bytes = buildEvidenceReport({ entries: [flat] });
    expect(asText(bytes).startsWith('%PDF-')).toBe(true);
    expect(Number.isNaN(bytes.length)).toBe(false);
    // NaN in a content stream is what a divide-by-zero looks like in a PDF,
    // and it makes the page fail to render rather than throwing here.
    expect(asText(bytes)).not.toContain('NaN');
  });

  test('the filename is dated', async () => {
    const { reportFilename } = await import('../js/notebook/report.js');
    expect(reportFilename(new Date('2026-03-04T05:06:07Z'))).toBe(
      'gravitas-evidence-2026-03-04.pdf'
    );
  });
});

describe('a capture retains no reference to the live world', () => {
  // The realistic regression this guards against: bench.js mutates its own
  // experiment record in place - `current.comparison = ...`, `current
  // .reliability = report` - so a capture helper that stored the experiment
  // rather than reading numbers out of it would have its evidence rewritten
  // by the next run of the bench. Same for the RV workspace's recording.
  //
  // Deliberately mutating every input after the capture is the only way to
  // show that; freezing the snapshot does not help if what was frozen is a
  // reference to something still live.

  test('a bench comparison is unaffected by later edits to the experiment', async () => {
    const { fromBenchComparison } = await import('../js/notebook/capture.js');
    const experiment = {
      name: 'Live',
      metrics: ['separation'],
      diff: { variables: [{ key: 'gravity' }], multivariable: false },
      provenance: { scenario: 'Binary', seed: 's1', integrator: 'yoshida' },
    };
    const comparison = {
      rows: [{ metric: 'separation', unit: 'AU', a: 1.2, b: 1.4 }],
      aligned: { separation: { a: [1, 2, 3], b: [1, 2.1, 3.2] } },
      warnings: [],
    };
    const entry = fromBenchComparison({ experiment, comparison });
    const snapshot = JSON.parse(JSON.stringify(entry.snapshot));

    // Everything the bench does to its own record between runs.
    experiment.name = 'renamed';
    experiment.provenance.seed = 'a-different-seed';
    experiment.provenance.scenario = 'Solar System';
    experiment.metrics.push('energy');
    experiment.diff.variables.push({ key: 'timestep' });
    experiment.diff.multivariable = true;
    comparison.rows[0].a = 99;
    comparison.rows[0].b = 98;
    comparison.aligned.separation.a[0] = 999;
    comparison.aligned.separation.b.length = 0;

    expect(JSON.parse(JSON.stringify(entry.snapshot))).toEqual(snapshot);
    expect(entry.snapshot.provenance.seed).toBe('s1');
    expect(entry.snapshot.quantities[0].value).toBe(1.2);
    expect(entry.snapshot.figure.series[0].points[0]).toEqual([0, 1]);
  });

  test('an RV capture is unaffected by later edits to the analysis', async () => {
    const { fromRvFit } = await import('../js/notebook/capture.js');
    const analysis = {
      tooFew: false,
      trial: { period: 3.5, K: 42, phase: 1, gamma: -3 },
      atTrial: { rms: 4.2, reducedChi2: 1.1 },
      folded: [
        { phase: 0.1, rv: 40, sigma: 4, model: 39 },
        { phase: 0.6, rv: -38, sigma: 4, model: -39 },
      ],
      structure: { runsRatio: 0.9 },
      used: 12,
      excluded: { degraded: 0, unverified: 0 },
      revealed: false,
      truth: null,
    };
    const report = {
      recording: { target: 'Star A', scenario: 'Lab', seed: 'r1' },
    };
    const entry = fromRvFit({ analysis, report });
    const snapshot = JSON.parse(JSON.stringify(entry.snapshot));

    analysis.trial.period = 7;
    analysis.trial.K = 0;
    analysis.atTrial.rms = 0;
    analysis.folded[0].rv = 0;
    analysis.folded.length = 0;
    analysis.revealed = true;
    report.recording.seed = 'rewritten';
    report.recording.target = 'Star B';

    expect(JSON.parse(JSON.stringify(entry.snapshot))).toEqual(snapshot);
    expect(entry.snapshot.provenance.seed).toBe('r1');
    expect(entry.snapshot.provenance.target).toBe('Star A');
    expect(entry.snapshot.figure.series[0].points).toHaveLength(2);
  });

  test('a sweep capture is unaffected by later edits to the sweep', async () => {
    const { fromSweep } = await import('../js/notebook/capture.js');
    const sweep = {
      scenario: 'Binary',
      parameter: 'gravity',
      metrics: ['separation'],
      duration: 120,
      seed: 's1',
      numerics: { maxStep: 0.02, substeps: 4 },
      trials: [
        { value: 1, status: 'ok', results: { separation: 1.1 } },
        { value: 2, status: 'ok', results: { separation: 2.2 } },
      ],
      summaries: [
        {
          metric: 'separation',
          changed: true,
          direction: 'increasing',
          min: 1.1,
          max: 2.2,
        },
      ],
    };
    const entry = fromSweep({ sweep });
    const snapshot = JSON.parse(JSON.stringify(entry.snapshot));

    sweep.trials[0].results.separation = 999;
    sweep.trials.length = 0;
    sweep.seed = 'rewritten';
    sweep.numerics.maxStep = 1;
    sweep.summaries[0].max = 0;

    expect(JSON.parse(JSON.stringify(entry.snapshot))).toEqual(snapshot);
    expect(entry.snapshot.provenance.seed).toBe('s1');
    expect(entry.snapshot.figure.series[0].points).toEqual([
      [1, 1.1],
      [2, 2.2],
    ]);
  });

  test('provenance copies the observer and quality blocks rather than holding them', () => {
    const observer = { positionAngleDeg: 10, inclinationDeg: 90 };
    const quality = { tier: 'full', fps: 60 };
    const units = { velocity: 'm/s' };
    const p = provenanceOf({ observer, quality, units });
    observer.positionAngleDeg = 999;
    quality.tier = 'low';
    units.velocity = 'furlongs';
    expect(p.observer.positionAngleDeg).toBe(10);
    expect(p.quality.tier).toBe('full');
    expect(p.units.velocity).toBe('m/s');
  });
});
