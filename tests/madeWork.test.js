// =============================================================================
// Scenarios and experiments in My work (Roadmap II Prompt 74)
// -----------------------------------------------------------------------------
// A round trip for each kind of thing a student makes (a world saved from the
// Sandbox, a system built in the Orbital System Builder, a scenario opened from
// an instructor's link and changed, an experiment the runner ran): the record
// is kept, listed, exported through the storage layer's export-all, imported
// into a clean device and opened again. The report attaches one to the
// evidence, the submission token carries it, and the review page's record
// shows its identity and its link.
// =============================================================================

import { describe, expect, test, beforeEach } from '@jest/globals';
import { webcrypto } from 'node:crypto';

import {
  MADE_PREFIX,
  attachedTo,
  experimentRecord,
  fileOf,
  hrefOf,
  listMade,
  readMade,
  saveMade,
  scenarioRecord,
} from '../js/myWork/made.js';
import { describe as describeWork } from '../js/myWork/model.js';
import { flatten, merged, only, work } from '../js/myWork/transfer.js';
import { openStudentStore, collectionOf } from '../js/storage/index.js';
import { decodePayload, encodePayload } from '../js/shareState.js';
import {
  compileScenarioPack,
  packFromOrbitalSystem,
} from '../js/scenarioPack.js';
import { systemToFile, validateSystem, buildSystem } from '../js/systemSpec.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import {
  buildSubmission,
  encodeSubmission,
  readSubmissionToken,
  validateSubmission,
} from '../js/submission/submissionToken.js';
import { gradeSubmission } from '../js/submission/results.js';
import { ledgerForReport } from '../js/notebook/ledgerReport.js';
import { save as saveNotebook, setBackend } from '../js/notebook/store.js';
import { buildEntry, provenanceOf, quantity } from '../js/notebook/entry.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { EN_REPORT } from '../js/i18n/en.report.js';
import { buildBackup } from '../js/investigations/progressBackup.js';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});
registerMessages('en', { ...EN_DEFERRED, ...EN_REPORT });

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

const SYSTEM = {
  bodies: [
    { type: 'Star', name: 'Sun-like', mass: 1 },
    { type: 'Planet', mass: 1, a: 1, primary: 0 },
  ],
};

/** A system as the builder files it, and the link the builder keeps for it. */
async function builderSystem() {
  const verdict = validateSystem(SYSTEM);
  expect(verdict.ok).toBe(true);
  const built = buildSystem(verdict.bodies, {
    G: DEFAULT_SETTINGS.gravitational_constant,
  });
  const data = systemToFile(verdict.bodies, built);
  const read = packFromOrbitalSystem(data);
  expect(read.ok).toBe(true);
  const payload = compileScenarioPack(read.pack);
  delete payload.x;
  return { data, payload, fragment: await encodePayload(payload) };
}

/** A scenario pack opened from a link, changed and saved. */
async function packWorld() {
  const payload = {
    v: 2,
    s: 'None',
    seed: '7',
    d: { gravitational_constant: 2 },
    x: { v: 1, pack: { id: 'tides-demo', version: '1.2.0' } },
  };
  return { payload, fragment: await encodePayload(payload) };
}

const result = (trials = 3) => ({
  format: 'gravitas.experiment-result',
  formatVersion: 1,
  hash: 'abc12345',
  manifest: { title: 'binary: separation', model: { scenario: 'binary' } },
  engine: { fingerprint: '9f8e7d6c', app: 'abc1234', platform: '1.0.0' },
  summary: { trials },
  trials: Array.from({ length: trials }, (_, i) => ({ index: i })),
});

let store;
beforeEach(() => {
  store = mem();
});

describe('the record', () => {
  test('a world saved from the Sandbox keeps its link, seed, settings and the scenario it came from', async () => {
    const { payload, fragment } = await packWorld();
    const r = scenarioRecord({
      name: 'Tides, my copy',
      from: 'sandbox',
      payload,
      fragment,
      app: 'abc1234',
    });
    expect(r.scenario).toMatchObject({
      seed: '7',
      settings: { gravitational_constant: 2 },
      derivedFrom: { id: 'tides-demo', version: '1.2.0' },
      link: fragment,
    });
    // The link opens the world it was made from.
    const back = await decodePayload(r.scenario.link);
    expect(back.x.pack).toEqual({ id: 'tides-demo', version: '1.2.0' });
    expect(hrefOf(r)).toBe(`/#${fragment}`);
  });

  test('a system from the builder keeps its file, and its link carries no scenario identity', async () => {
    const { data, payload, fragment } = await builderSystem();
    const r = scenarioRecord({
      name: 'Two bodies',
      from: 'builder',
      payload,
      fragment,
      system: data,
    });
    expect(r.scenario.derivedFrom).toBeNull();
    expect(r.scenario.bodies).toBe(2);
    expect(fileOf(r).name).toBe('two-bodies.gravitas-system.json');
    expect(fileOf(r).json.format).toBe('gravitas.orbital-system');
    const back = await decodePayload(fragment);
    expect(back.b).toHaveLength(2);
  });

  test('an experiment keeps its manifest, result and engine fingerprint, and sheds trials only when it must', () => {
    const r = experimentRecord(result(), 'binary: separation');
    expect(r.experiment.engine.fingerprint).toBe('9f8e7d6c');
    expect(r.experiment.result.trials).toHaveLength(3);
    expect(fileOf(r).name).toBe('experiment-abc12345.json');
    // Too large to keep whole: kept without the trials, and says so.
    const big = experimentRecord(
      { ...result(), trials: [{ pad: 'x'.repeat(600 * 1024) }] },
      'big'
    );
    const kept = saveMade(big, store);
    expect(kept).toMatchObject({ ok: true, slim: true });
    const [again] = listMade(store);
    expect(again.experiment.result.trialsKept).toBe(false);
    expect(again.experiment.result.manifest.title).toBe('binary: separation');
  });

  test('a record from a newer build, or a damaged one, is refused with a reason', async () => {
    const { payload, fragment } = await packWorld();
    const r = scenarioRecord({ name: 'x', from: 'sandbox', payload, fragment });
    expect(readMade({ ...r, formatVersion: 2 }).reason).toBe('newer');
    expect(readMade({ ...r, scenario: { link: '<script>' } }).reason).toBe(
      'scenario'
    );
    expect(readMade({ ...r, kind: 'other' }).reason).toBe('kind');
    expect(readMade(null).reason).toBe('format');
  });
});

describe('through the storage layer', () => {
  test('every kind exports with export-all and imports into a clean device, then opens again', async () => {
    const a = await builderSystem();
    const b = await packWorld();
    const things = [
      scenarioRecord({
        name: 'Two bodies',
        from: 'builder',
        payload: a.payload,
        fragment: a.fragment,
        system: a.data,
      }),
      scenarioRecord({
        name: 'Tides, my copy',
        from: 'sandbox',
        payload: b.payload,
        fragment: b.fragment,
      }),
      experimentRecord(result(), 'binary: separation'),
    ];
    for (const r of things) expect(saveMade(r, store).ok).toBe(true);
    expect(collectionOf(`${MADE_PREFIX}${things[0].id}`)).toBe('made');

    const here = openStudentStore({ storage: store });
    const file = await here.exportAll();
    expect(file.collections.made).toHaveLength(3);

    // One item alone.
    const one = only(file, [`${MADE_PREFIX}${things[1].id}`]);
    expect(one.collections.made).toHaveLength(1);

    const there = mem();
    const fresh = openStudentStore({ storage: there });
    const prepared = merged(work(file), [], 'replace');
    const res = await fresh.importAll(prepared, { mode: 'replace' });
    expect(res.ok).toBe(true);
    const back = listMade(there);
    expect(back.map(r => r.name).sort()).toEqual(
      ['Tides, my copy', 'Two bodies', 'binary: separation'].sort()
    );
    const world = back.find(r => r.name === 'Tides, my copy');
    expect(world.scenario.derivedFrom).toEqual({
      id: 'tides-demo',
      version: '1.2.0',
    });
    expect((await decodePayload(world.scenario.link)).seed).toBe('7');
    const system = back.find(r => r.name === 'Two bodies');
    expect(system.scenario.system.format).toBe('gravitas.orbital-system');
  });

  test('My work lists them, and a full device refuses with a reason and keeps what it had', async () => {
    const { payload, fragment } = await packWorld();
    const r = scenarioRecord({ name: 'W', from: 'sandbox', payload, fragment });
    saveMade(r, store);
    const records = flatten(
      await openStudentStore({ storage: store }).exportAll()
    );
    expect(describeWork(records).made).toEqual([
      { key: `${MADE_PREFIX}${r.id}`, title: 'W' },
    ]);
    const full = {
      ...store,
      setItem() {
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
      },
    };
    expect(saveMade(r, full)).toMatchObject({ ok: false, reason: 'quota' });
    expect(listMade(store)).toHaveLength(1);
  });
});

describe('the report, the token and the review', () => {
  test('a system attached to an evidence entry is in the report record, the token and the graded record, and its link reopens the same world', async () => {
    const { payload, fragment } = await packWorld();
    // The notebook and My work live in this page's own storage.
    const entry = buildEntry({
      source: 'sandbox',
      title: 'Period of the planet',
      quantities: [
        quantity({ label: 'Period', value: 3.5, unit: 'd', uncertainty: 0.1 }),
      ],
      provenance: provenanceOf({ scenario: 'kepler', seed: 's1' }),
    });
    setBackend(null);
    saveNotebook([entry]);
    const r = scenarioRecord({
      name: 'The system I measured',
      from: 'sandbox',
      payload,
      fragment,
      app: 'abc1234',
    });
    saveMade({ ...r, attachedTo: [entry.id] });
    expect(attachedTo([entry.id])).toHaveLength(1);
    expect(attachedTo(['other'])).toHaveLength(0);

    const ledger = await ledgerForReport();
    expect(ledger.record.sy).toHaveLength(1);
    const [sy] = ledger.record.sy;
    expect(sy).toMatchObject({
      k: 'sc',
      n: 'The system I measured',
      s: '7',
      p: ['tides-demo', '1.2.0'],
      a: 'abc1234',
      f: null,
      l: fragment,
      e: [1],
    });
    expect(sy.h).toMatch(/^[0-9a-f]{16}$/);

    const backup = buildBackup({
      lesson: {
        id: 'keplers-laws',
        steps: [{ sid: 'a', type: 'text', title: 'a' }],
      },
      responses: {},
      attempts: {},
      visited: [],
      stepSid: 'a',
      startedAt: '2026-10-01T10:00:00Z',
      studentName: 'Ada',
    });
    const encoded = await encodeSubmission(
      buildSubmission({
        backup,
        record: ledger.record,
        digest: ledger.digest,
      })
    );
    const read = await readSubmissionToken(encoded.token);
    expect(read.ok).toBe(true);
    expect(read.submission.sy).toEqual(ledger.record.sy);

    // The world the instructor opens is the student's.
    const opened = await decodePayload(read.submission.sy[0].l);
    expect(opened.seed).toBe('7');
    expect(opened.x.pack).toEqual({
      id: 'tides-demo',
      version: '1.2.0',
    });

    const graded = gradeSubmission(
      read.submission,
      { id: 'keplers-laws', steps: [] },
      { kind: 'token', label: 'x' }
    );
    expect(graded.systems).toEqual(ledger.record.sy);
  });

  test('a link too long for a token travels as a file, and a malformed list is refused', async () => {
    const { payload } = await packWorld();
    const long = `2z${'A'.repeat(2000)}`;
    saveMade(
      {
        ...scenarioRecord({
          name: 'Big',
          from: 'sandbox',
          payload,
          fragment: long,
        }),
        attachedTo: ['e1'],
      },
      store
    );
    expect(listMade(store)[0].scenario.link).toBe(long);
    const check = sy =>
      validateSubmission({
        v: 2,
        sy,
        b: {
          lesson: { id: 'x' },
          progress: { responses: {} },
          steps: [],
        },
      });
    expect(check([{ k: 'sc', n: 'ok' }]).ok).toBe(true);
    expect(check('nope').reason).toBe('badSystems');
    expect(check([{ k: 'sc' }]).reason).toBe('badSystems');
    expect(check(Array(5).fill({ k: 'sc', n: 'x' })).reason).toBe('badSystems');
  });
});
