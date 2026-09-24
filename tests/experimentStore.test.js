import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  SCHEMA_VERSION,
  LIMITS,
  FAILURE,
  setBackend,
  listExperiments,
  loadExperiment,
  saveExperiment,
  deleteExperiment,
  duplicateRecord,
  migrate,
  newId,
  storageReport,
  usedBytes,
} from '../js/experiments/store.js';

// A student's saved experiments have to survive a schema change and a full
// disk. Both are tested against a fake backend, because the failures worth
// checking - quota refusals, private mode - cannot be provoked in jsdom's
// localStorage on demand.

/** A Storage-like object that can be told to misbehave. */
function fakeStorage({ failOn = null, budget = Infinity } = {}) {
  const map = new Map();
  return {
    map,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem(k, v) {
      if (failOn && failOn(k, v)) {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      }
      const total = [...map.entries()]
        .filter(([key]) => key !== k)
        .reduce((n, [, val]) => n + val.length, 0);
      if (total + v.length > budget) {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(k, v);
    },
    removeItem: k => map.delete(k),
  };
}

const record = (over = {}) => ({
  id: 'x1',
  name: 'Gravity doubled',
  created: 1,
  metrics: ['separation'],
  objects: [1, 2],
  runs: {},
  ...over,
});

beforeEach(() => {
  setBackend(fakeStorage());
});

describe('saving and listing', () => {
  test('a saved experiment comes back', () => {
    expect(saveExperiment(record()).ok).toBe(true);
    const { ok, record: back } = loadExperiment('x1');
    expect(ok).toBe(true);
    expect(back.name).toBe('Gravity doubled');
    expect(back.v).toBe(SCHEMA_VERSION);
  });

  test('the index lists it, newest first', () => {
    saveExperiment(record({ id: 'a', name: 'First' }));
    saveExperiment(record({ id: 'b', name: 'Second' }));
    const names = listExperiments().map(e => e.name);
    expect(names).toContain('First');
    expect(names).toContain('Second');
    expect(listExperiments()[0].updated).toBeGreaterThanOrEqual(
      listExperiments()[1].updated
    );
  });

  test('saving twice updates rather than duplicates', () => {
    saveExperiment(record());
    saveExperiment(record({ name: 'Renamed' }));
    expect(listExperiments().length).toBe(1);
    expect(listExperiments()[0].name).toBe('Renamed');
  });

  test('deleting removes both the record and its index entry', () => {
    saveExperiment(record());
    expect(deleteExperiment('x1')).toBe(true);
    expect(listExperiments()).toEqual([]);
    expect(loadExperiment('x1').ok).toBe(false);
  });

  test('an id is unique even when two are made in the same millisecond', () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
  });
});

describe('limits', () => {
  test('an experiment larger than the per-experiment cap is refused whole', () => {
    const huge = record({
      runs: { A: { samples: new Array(200000).fill({ t: 1, separation: 1 }) } },
    });
    const result = saveExperiment(huge);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(FAILURE.TOO_LARGE);
    // Refused before the write, so the store is untouched.
    expect(listExperiments()).toEqual([]);
  });

  test('the total budget is enforced across experiments', () => {
    // Each roughly a tenth of the total; the ninth should not fit.
    const chunk = 'x'.repeat(Math.floor(LIMITS.total / 10));
    let refused = null;
    for (let i = 0; i < 12; i++) {
      const result = saveExperiment(record({ id: `e${i}`, notes: chunk }));
      if (!result.ok) {
        refused = result;
        break;
      }
    }
    expect(refused).not.toBeNull();
    expect(refused.reason).toBe(FAILURE.TOTAL_EXCEEDED);
  });

  test('there is a cap on how many can be kept', () => {
    for (let i = 0; i < LIMITS.maxExperiments; i++) {
      expect(saveExperiment(record({ id: `e${i}` })).ok).toBe(true);
    }
    const result = saveExperiment(record({ id: 'one-too-many' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(FAILURE.TOO_MANY);
  });

  test('the usage report is what the panel shows the student', () => {
    saveExperiment(record());
    const report = storageReport();
    expect(report.count).toBe(1);
    expect(report.used).toBe(usedBytes());
    expect(report.fraction).toBeGreaterThan(0);
    expect(report.fraction).toBeLessThan(1);
  });
});

describe('when the browser refuses', () => {
  test('a quota error is reported, not thrown', () => {
    setBackend(
      fakeStorage({ failOn: k => k.startsWith('gravitas_experiment_') })
    );
    const result = saveExperiment(record());
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(FAILURE.QUOTA);
  });

  test('an experiment is not left stored but unlisted', () => {
    // The record write succeeds and the index write fails: without the
    // rollback the experiment would occupy the budget and be unreachable.
    setBackend(
      fakeStorage({ failOn: k => k === 'gravitas_experiments_index' })
    );
    const result = saveExperiment(record());
    expect(result.ok).toBe(false);
    expect(loadExperiment('x1').ok).toBe(false);
  });

  test('no storage at all is a reason, not a crash', () => {
    setBackend(null);
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('private mode');
      },
    });
    try {
      const result = saveExperiment(record());
      expect(result.ok).toBe(false);
      expect(result.reason).toBe(FAILURE.UNAVAILABLE);
      expect(listExperiments()).toEqual([]);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: original,
        writable: true,
      });
    }
  });

  test('a corrupt record reads as a failure rather than poisoning the panel', () => {
    const backend = fakeStorage();
    backend.map.set('gravitas_experiment_bad', '{not json');
    setBackend(backend);
    expect(loadExperiment('bad').ok).toBe(false);
  });
});

describe('schema migration', () => {
  test('a version 1 record is brought forward', () => {
    const v1 = {
      v: 1,
      id: 'old',
      name: 'Old experiment',
      runA: [{ t: 0, separation: 1 }],
      runB: { samples: [{ t: 0, separation: 2 }], recordedAt: 99 },
    };
    const { ok, record: out } = migrate(v1);
    expect(ok).toBe(true);
    expect(out.v).toBe(SCHEMA_VERSION);
    expect(out.runs.A.samples).toEqual([{ t: 0, separation: 1 }]);
    expect(out.runs.B.recordedAt).toBe(99);
    expect(out.runA).toBeUndefined();
    expect(out.units).toEqual({});
  });

  test('a record with no version is treated as version 1', () => {
    const { ok, record: out } = migrate({ id: 'x', runA: [] });
    expect(ok).toBe(true);
    expect(out.runs.A).toBeDefined();
  });

  test('a record from a newer version is refused rather than misread', () => {
    const { ok, reason } = migrate({ v: SCHEMA_VERSION + 1, id: 'future' });
    expect(ok).toBe(false);
    expect(reason).toBe('from-a-newer-version');
  });

  test('a current record passes through unchanged in substance', () => {
    const now = { v: SCHEMA_VERSION, id: 'x', runs: { A: { samples: [] } } };
    const { record: out } = migrate(now);
    expect(out.runs.A.samples).toEqual([]);
  });

  test('something that is not an experiment is rejected', () => {
    expect(migrate(null).ok).toBe(false);
    expect(migrate('nonsense').ok).toBe(false);
  });

  test('a stored version 1 record is migrated on read', () => {
    const backend = fakeStorage();
    backend.map.set(
      'gravitas_experiment_old',
      JSON.stringify({ v: 1, id: 'old', runA: [{ t: 0 }] })
    );
    setBackend(backend);
    const { ok, record: out } = loadExperiment('old');
    expect(ok).toBe(true);
    expect(out.runs.A.samples.length).toBe(1);
  });
});

describe('the drifts version 2 recorded wrongly', () => {
  // Every version 2 drift is a total times a hundred: sampleFrame read the
  // engine's `energy` and `angular` fields, which are the current totals. The
  // numbers below are what the default experiment on Binary Planet Lab saved.
  const sample = (t, energy) => ({
    t,
    separation: 0.2,
    total_energy: energy,
    energy_drift: energy * 100,
    angular_drift: 37416573.9,
  });
  const run = () => ({
    samples: [sample(0, -250.0149), sample(1, -250.0144)],
    recordedAt: 5,
    results: {
      separation: { value: 0.2, kind: 'mean' },
      total_energy: { value: -250.0144, kind: 'final' },
      energy_drift: { value: -25001.44, kind: 'final' },
      angular_drift: { value: 37416573.9, kind: 'final' },
    },
  });
  const v2 = (extra = {}) => ({
    v: 2,
    id: 'saved',
    metrics: ['separation', 'total_energy', 'energy_drift', 'angular_drift'],
    runs: { A: run(), B: run() },
    comparison: {
      rows: [
        { metric: 'separation', a: 0.2, b: 0.2 },
        { metric: 'energy_drift', a: -25001.44, b: -25001.44 },
      ],
    },
    ...extra,
  });

  test('are withdrawn from every sample and every result', () => {
    const { ok, record: out } = migrate(v2());
    expect(ok).toBe(true);
    expect(out.v).toBe(SCHEMA_VERSION);
    for (const label of ['A', 'B']) {
      for (const s of out.runs[label].samples) {
        expect(s).not.toHaveProperty('energy_drift');
        expect(s).not.toHaveProperty('angular_drift');
      }
      expect(Object.keys(out.runs[label].results)).toEqual([
        'separation',
        'total_energy',
      ]);
    }
    expect(out.comparison.rows.map(r => r.metric)).toEqual(['separation']);
  });

  test('and nothing that was measured correctly goes with them', () => {
    const { record: out } = migrate(v2());
    expect(out.runs.A.samples[1]).toEqual({
      t: 1,
      separation: 0.2,
      total_energy: -250.0144,
    });
    expect(out.runs.A.recordedAt).toBe(5);
    // Still asked for, so recording the runs again measures them.
    expect(out.metrics).toContain('energy_drift');
    expect(out.metrics).toContain('angular_drift');
  });

  test('each run that lost them says so', () => {
    const { record: out } = migrate(v2());
    expect(out.runs.A.driftWithdrawn).toBe(true);
    expect(out.runs.B.driftWithdrawn).toBe(true);

    const clean = v2({
      runs: { A: { samples: [{ t: 0, separation: 1 }], recordedAt: 1 } },
    });
    expect(migrate(clean).record.runs.A.driftWithdrawn).toBeUndefined();
  });

  test('a saved reliability check keeps its verdict but loses its drift rows', () => {
    const reliability = {
      ok: true,
      verdict: 'converging',
      pathMetric: 'separation',
      metrics: [
        { metric: 'separation', agrees: true },
        { metric: 'energy_drift', agrees: true },
      ],
    };
    const { record: out } = migrate(v2({ reliability }));
    expect(out.reliability.verdict).toBe('converging');
    expect(out.reliability.metrics.map(m => m.metric)).toEqual(['separation']);
  });

  test('a reliability check that followed a drift is dropped', () => {
    // Its path was two runs' total energy, which always agree.
    const reliability = {
      ok: true,
      verdict: 'converging',
      pathMetric: 'energy_drift',
      metrics: [{ metric: 'energy_drift', agrees: true }],
    };
    expect(migrate(v2({ reliability })).record.reliability).toBeNull();
  });

  test('a version 1 record is brought through both steps', () => {
    const { record: out } = migrate({
      v: 1,
      id: 'old',
      runA: [{ t: 0, separation: 1, energy_drift: -1250 }],
    });
    expect(out.runs.A.samples).toEqual([{ t: 0, separation: 1 }]);
    expect(out.runs.A.driftWithdrawn).toBe(true);
  });

  test('a drift recorded under version 3 is kept', () => {
    const now = {
      v: SCHEMA_VERSION,
      id: 'x',
      runs: { A: { samples: [{ t: 0, energy_drift: 0.00017 }] } },
    };
    const { record: out } = migrate(now);
    expect(out.runs.A.samples[0].energy_drift).toBe(0.00017);
    expect(out.runs.A.driftWithdrawn).toBeUndefined();
  });

  test('the stored copy is not touched until the experiment is saved again', () => {
    const backend = fakeStorage();
    const raw = JSON.stringify(v2());
    backend.map.set('gravitas_experiment_saved', raw);
    setBackend(backend);
    const { ok, record: out } = loadExperiment('saved');
    expect(ok).toBe(true);
    expect(out.runs.A.samples[0]).not.toHaveProperty('energy_drift');
    expect(backend.map.get('gravitas_experiment_saved')).toBe(raw);
  });
});

describe('duplicating', () => {
  test('a copy is a deep copy with a new id and name', () => {
    const original = record({ runs: { A: { samples: [{ t: 1 }] } } });
    const copy = duplicateRecord(original, 'Copy of it');
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Copy of it');
    copy.runs.A.samples[0].t = 99;
    expect(original.runs.A.samples[0].t).toBe(1);
  });
});
