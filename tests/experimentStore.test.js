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
