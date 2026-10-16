// =============================================================================
// My work's data layer (Roadmap II Prompt 69): what it lists from the real
// keys, what goes in a backup file, and how a file comes back.
// =============================================================================

import { describe as suite, expect, test } from '@jest/globals';
import { flatten, merged, only, tally, work } from '../js/myWork/transfer.js';
import { describe, total } from '../js/myWork/model.js';
import { openStudentStore } from '../js/storage/index.js';
import { unfinishedLessons } from '../js/welcome.js';
import { progressOf } from '../js/library/progress.js';

const mem = () => {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: i => [...m.keys()][i] ?? null,
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: k => void m.delete(k),
  };
};
const J = JSON.stringify;
const library = new Map([
  [
    'investigation:keplers-laws',
    {
      id: 'investigation:keplers-laws',
      title: { en: 'Kepler', es: 'Kepler' },
      steps: 4,
      route: '/#investigation=keplers-laws',
    },
  ],
  [
    'course:c',
    {
      id: 'course:c',
      kind: 'course',
      title: { en: 'C', es: 'C' },
      route: '/course/?course=c',
      units: [
        { title: { en: 'U', es: 'U' }, lessons: ['keplers-laws', 'other'] },
      ],
    },
  ],
]);
const seed = () => {
  const s = mem();
  s.setItem(
    'gravitas_investigation_keplers-laws',
    J({
      schema: 2,
      lesson: 'keplers-laws',
      stepSid: 'b',
      responses: { a: 1, b: 2 },
      visited: ['a', 'b'],
      startedAt: '2026-10-01T10:00:00Z',
    })
  );
  s.setItem('gravitas_investigation_keplers-laws:v1', J({ old: true }));
  s.setItem('gravitas_guides', J({ 'exo-star': { at: 2 } }));
  s.setItem(
    'gravitas_evidence_notebook',
    J({
      v: 1,
      entries: [
        {
          id: 'e1',
          source: 'rv-fit',
          title: 'Fit',
          snapshot: { capturedAt: 1.7e12 },
        },
        { id: 'e2', source: 'observatory', title: 'Obs' },
      ],
    })
  );
  s.setItem('gravitas_experiment_x1', J({ name: 'Run', updated: 1.7e12 }));
  s.setItem(
    'gravitas_experiments_index',
    J({ v: 3, items: [{ id: 'x1', name: 'Run', updated: 1.7e12 }] })
  );
  s.setItem(
    'gravitas_studio_draft:d',
    J({ savedAt: 1.7e12, doc: { id: 'd', title: 'Draft' } })
  );
  s.setItem('gravitas_simulation_save', J({ bodies: [] }));
  s.setItem('gravitas_student_name', 'Ada');
  return s;
};

suite('what My work lists', () => {
  const records = async st =>
    flatten(await openStudentStore({ storage: st }).exportAll());
  test('reads every kind of record from the real keys', async () => {
    const d = describe(await records(seed()), library);
    expect(d.lessons.map(l => [l.kind, l.id, l.seen, l.total, l.done])).toEqual(
      expect.arrayContaining([
        ['lesson', 'keplers-laws', 2, 4, false],
        ['observatory', 'exo-star', null, null, false],
      ])
    );
    expect(d.lessons.filter(l => l.kind === 'lesson')).toHaveLength(1); // the :v1 copy is not a second lesson
    expect(d.evidence.groups.sandbox).toHaveLength(1);
    expect(d.evidence.groups.observatory).toHaveLength(1);
    expect(d.experiments).toHaveLength(1);
    expect(d.drafts[0]).toMatchObject({ kind: 'studio', title: 'Draft' });
    // It opens that draft (?open=<id>), not the one saved last (Prompt 78).
    expect(d.drafts[0].href).toBe('/studio/?open=d');
    expect(d.saved).toHaveLength(1);
    expect(d.name).toBe('Ada');
    expect(d.courses[0].units[0]).toMatchObject({
      total: 2,
      begun: 1,
      finished: 0,
    });
    expect(total(d)).toBeGreaterThan(5);
  });
  test('agrees with Home and the Library about what is in progress', async () => {
    const st = seed();
    Object.defineProperty(globalThis, 'localStorage', {
      value: st,
      configurable: true,
    });
    globalThis.window = globalThis;
    const home = unfinishedLessons([
      { id: 'keplers-laws', title: 'K', stepCount: 4 },
    ]);
    const lib = progressOf({
      id: 'investigation:keplers-laws',
      format: 'lesson',
      steps: 4,
    });
    const mine = describe(await records(st), library).lessons.find(
      l => l.kind === 'lesson'
    );
    expect([home[0].seen, lib.done, lib.started]).toEqual([
      mine.seen,
      mine.seen,
      true,
    ]);
  });
});

suite('a backup file', () => {
  test('one item carries what it needs to open elsewhere, and nothing else', async () => {
    const file = await openStudentStore({ storage: seed() }).exportAll();
    const one = only(file, ['gravitas_experiment_x1']);
    const ids = flatten(one)
      .map(r => r.id)
      .sort();
    expect(ids).toEqual([
      'gravitas_experiment_x1',
      'gravitas_experiments_index',
    ]);
    expect(
      flatten(one).find(r => r.id === 'gravitas_experiments_index').value.items
    ).toHaveLength(1);
  });
  test('language and theme stay out unless asked for', async () => {
    const st = seed();
    st.setItem('gravitas_theme', 'daylight');
    const file = await openStudentStore({ storage: st }).exportAll();
    expect(work(file).collections.preferences).toBeUndefined();
    expect(work(file, true).collections.preferences).toBeDefined();
  });
  test('moves to a fresh device, resumes at the same step, and merges rather than replaces the shared records', async () => {
    const file = await openStudentStore({ storage: seed() }).exportAll();
    const other = mem();
    other.setItem('gravitas_guides', J({ 'pop-spectra': { at: 1 } }));
    other.setItem(
      'gravitas_experiments_index',
      J({ v: 3, items: [{ id: 'y', name: 'Other', updated: 1 }] })
    );
    const store = openStudentStore({ storage: other });
    const here = flatten(await store.exportAll());
    const prepared = merged(work(file), here, 'replace');
    const plan = await store.importAll(prepared, {
      mode: 'replace',
      dryRun: true,
    });
    expect(tally(plan.plan).add).toBeGreaterThan(5);
    await store.importAll(prepared, { mode: 'replace' });
    expect(
      JSON.parse(other.getItem('gravitas_investigation_keplers-laws')).stepSid
    ).toBe('b');
    expect(
      Object.keys(JSON.parse(other.getItem('gravitas_guides'))).sort()
    ).toEqual(['exo-star', 'pop-spectra']);
    expect(
      JSON.parse(other.getItem('gravitas_experiments_index'))
        .items.map(i => i.id)
        .sort()
    ).toEqual(['x1', 'y']);
  });
  test("skip keeps this device's version of a conflict", async () => {
    const file = await openStudentStore({ storage: seed() }).exportAll();
    const other = mem();
    other.setItem(
      'gravitas_investigation_keplers-laws',
      J({ schema: 2, stepSid: 'z', visited: [], responses: {} })
    );
    const store = openStudentStore({ storage: other });
    await store.importAll(
      merged(work(file), flatten(await store.exportAll()), 'skip'),
      { mode: 'skip' }
    );
    expect(
      JSON.parse(other.getItem('gravitas_investigation_keplers-laws')).stepSid
    ).toBe('z');
  });
  test('a full browser refuses with a reason the page can offer an export for', async () => {
    const file = await openStudentStore({ storage: seed() }).exportAll();
    const store = openStudentStore({
      storage: mem(),
      estimate: async () => ({ usage: 100, quota: 100 }),
    });
    const res = await store.importAll(file, { mode: 'replace' });
    expect(res.plan.filter(p => p.reason === 'quota').length).toBeGreaterThan(
      0
    );
  });
});
