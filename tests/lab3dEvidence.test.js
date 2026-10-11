// =============================================================================
// The 3-D lab's measurements as evidence (Roadmap II Prompt 105)
// -----------------------------------------------------------------------------
// Every instrument reading, every event and every forward-model observation
// is a gravitas.artifact/1 the notebook can keep and a report can cite; a 3-D
// system saved to My work is a record My work lists and gives back as the
// lab's own file. Each envelope's numbers are held to the instrument's, which
// tests/lab3dView.test.js holds to cases worked by hand, so this suite checks
// the plumbing and not the geometry a second time.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { runToEnd } from '../js/lab3d/engine.js';
import {
  GAUSSIAN_K,
  convertUnits,
  gravityOf,
  validateSystem,
} from '../js/lab3d/state.js';
import {
  between,
  elementsAbout,
  hierarchy,
  onTheSky,
  relative,
} from '../js/lab3d/view/instruments.js';
import {
  eventEnvelope,
  forwardEnvelope,
  readingEnvelope,
  readingQuantities,
  systemDigest,
} from '../js/lab3d/evidence.js';
import { observeSystem3d } from '../js/forward/system3d.js';
import { artifactEntry, citationRows } from '../js/notebook/artifactEntry.js';
import { SOURCE } from '../js/notebook/entry.js';
import { ARTIFACT_SOURCES, envelopeOf } from '../js/notebook/ledger.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import {
  MADE_PREFIX,
  fileOf,
  hrefOf,
  listMade,
  readMade,
  saveMade,
  system3dRecord,
} from '../js/myWork/made.js';
import { describe as describeWork } from '../js/myWork/model.js';

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envelopeSchema = JSON.parse(
  readFileSync(path.join(REPO, 'sdk/schemas/artifact-1.schema.json'))
);
const made = id => REFERENCES.find(r => r.id === id).make();

/** The frame a run's sample gives, in the shape the instruments read. */
function frameAt(system, span, samples = 4) {
  const run = runToEnd(system, {
    span,
    samples,
    positions: true,
    velocities: true,
  });
  const s = run.samples.at(-1);
  return {
    t: s.t,
    m: Float64Array.from(system.bodies.map(b => b.m)),
    x: Float64Array.from(s.x),
    v: Float64Array.from(s.v),
    alive: Uint8Array.from(system.bodies.map(() => 1)),
  };
}

const R3 = made('R3').system;
const f3 = frameAt(R3, 20);
const q = (env, id) => env.quantities.find(x => x.id === id);
const accepted = env => {
  expect(validateArtifact(env)).toEqual([]);
  expect(valid(envelopeSchema, env)).toBe(true);
};

describe('an instrument reading is an envelope', () => {
  test('orbital elements: the instrument’s own numbers, in registry units', () => {
    const env = readingEnvelope(
      R3,
      f3,
      { tool: 'elements', a: 1 },
      'barycentric'
    );
    accepted(env);
    const h = hierarchy(f3);
    const e = elementsAbout(f3, 1, h.primary[1], gravityOf(R3));
    expect(q(env, 'a').value).toBe(e.a);
    expect(q(env, 'e').value).toBe(e.e);
    expect(q(env, 'i').value).toBeCloseTo((e.i * 180) / Math.PI, 12);
    expect(q(env, 'period').value).toBe(e.period);
    // Code units name no unit; the envelope never invents one.
    expect(q(env, 'a').unit).toBeNull();
    expect(q(env, 'i').unit).toBe('deg');
    expect(q(env, 'e').unit).toBe('');
    expect(env.made.lab3d.bodies).toEqual(['inner', 'star']);
    expect(env.made.lab3d.frame).toBe('barycentric');
  });

  test('a solar-unit system gives AU, days and km/s', () => {
    const sys = {
      ...R3,
      units: 'solar',
      integrator: { scheme: 'yoshida4c', h: 0.5 },
    };
    const f = { ...f3 };
    const env = readingEnvelope(sys, f, { tool: 'relative', a: 0, b: 1 });
    accepted(env);
    expect(q(env, 'distance').unit).toBe('AU');
    expect(q(env, 'speed').unit).toBe('km/s');
    expect(q(env, 't').unit).toBe('d');
    const r = relative(f, 0, 1);
    expect(q(env, 'distance').value).toBe(r.distance);
    expect(q(env, 'speed').value).toBeCloseTo(r.speed * 1731.45683, 3);
  });

  test('on the sky: separation across and along the line of sight, sizes assumed', () => {
    const dir = [0.3, -0.2, 0.9];
    const sized = {
      ...R3,
      bodies: R3.bodies.map(b => ({ ...b, radius: 0.01 })),
    };
    const env = readingEnvelope(sized, f3, {
      tool: 'sky',
      a: 0,
      b: 1,
      direction: dir,
    });
    accepted(env);
    const s = onTheSky(f3, 0, 1, dir);
    expect(q(env, 'across').value).toBe(s.across);
    expect(q(env, 'along').value).toBe(s.along);
    expect(q(env, 'radiiSum').origin).toBe('assumed');
    expect(q(env, 'radiiSum').value).toBe(0.02);
    expect(q(env, 'sightInclination').origin).toBe('assumed');
    const unsized = readingEnvelope(R3, f3, {
      tool: 'sky',
      a: 0,
      b: 1,
      direction: dir,
    });
    expect(q(unsized, 'radiiSum')).toBeUndefined();
    expect(unsized.warnings).toContain('noRadii');
  });

  test('between two orbits, distance, relative and angle', () => {
    const env = readingEnvelope(R3, f3, { tool: 'between', a: 1, b: 2 });
    accepted(env);
    const m = between(f3, 1, 2, gravityOf(R3));
    expect(q(env, 'mutualInclination').value).toBeCloseTo(
      (m.angle * 180) / Math.PI,
      12
    );
    for (const r of [
      { tool: 'distance', a: 0, b: 2 },
      { tool: 'relative', a: 0, b: 2 },
      { tool: 'angle', a: 1, v: 0, b: 2 },
    ])
      accepted(readingEnvelope(R3, f3, r));
  });

  test('an unbound orbit has no period and says so', () => {
    const r7 = made('R7');
    const f = frameAt(r7.system, 5);
    const env = readingEnvelope(r7.system, f, { tool: 'elements', a: 1 });
    accepted(env);
    expect(q(env, 'period')).toBeUndefined();
    expect(env.warnings).toContain('unbound');
  });

  test('a reading that is not one is null, never a made-up number', () => {
    expect(readingQuantities(R3, f3, { tool: 'elements', a: 0 })).toBeNull(); // the root
    expect(
      readingQuantities(R3, f3, { tool: 'distance', a: 1, b: 1 })
    ).toBeNull();
    expect(
      readingQuantities(R3, f3, { tool: 'distance', a: 1, b: 9 })
    ).toBeNull();
    expect(readingQuantities(R3, f3, { tool: 'sky', a: 0, b: 1 })).toBeNull();
    expect(readingQuantities(R3, f3, { tool: 'nothing' })).toBeNull();
  });
});

describe('the source is the system', () => {
  test('two readings of one system share its digest; a changed system does not', () => {
    const a = readingEnvelope(R3, f3, { tool: 'elements', a: 1 });
    const b = readingEnvelope(R3, f3, { tool: 'elements', a: 2 });
    expect(a.source.digest).toBe(b.source.digest);
    expect(a.id).not.toBe(b.id);
    const moved = {
      ...R3,
      bodies: R3.bodies.map((x, i) =>
        i === 1 ? { ...x, x: [x.x[0] + 1e-12, x.x[1], x.x[2]] } : x
      ),
    };
    expect(systemDigest(moved)).not.toBe(systemDigest(R3));
    expect(systemDigest(JSON.parse(JSON.stringify(R3)))).toBe(systemDigest(R3));
    expect(a.source.kind).toBe('simulation');
    expect(a.made.lab3d.integrator).toEqual(R3.integrator);
  });

  test('the name and notes of a system do not change what it is', () => {
    const named = { ...R3, provenance: { from: 'somewhere else' } };
    expect(systemDigest(named)).toBe(systemDigest(R3));
  });
});

describe('events', () => {
  test.each([
    [{ kind: 'merger', t: 4.2, bodies: ['a', 'b'] }, ['t']],
    [
      { kind: 'closeApproach', t: 1, bodies: ['a', 'b'], distance: 0.01 },
      ['t', 'distance'],
    ],
    [{ kind: 'crossing', t: 2, bodies: ['a'], direction: 'up' }, ['t']],
    [{ kind: 'escape', t: 9, bodies: ['a'], distance: 250 }, ['t', 'distance']],
  ])('%j', (e, ids) => {
    const env = eventEnvelope(R3, e);
    accepted(env);
    expect(env.quantities.map(x => x.id)).toEqual(ids);
    expect(env.made.lab3d.bodies).toEqual(e.bodies);
    if (e.direction) expect(env.made.lab3d.direction).toBe('up');
  });

  test('a warning or a stop is not a measurement', () => {
    expect(eventEnvelope(R3, { kind: 'warning', t: 1 })).toBeNull();
    expect(eventEnvelope(R3, { kind: 'stopped', t: 1 })).toBeNull();
    expect(eventEnvelope(R3, { kind: 'closeApproach', t: NaN })).toBeNull();
  });
});

describe('what an observer would record, as evidence', () => {
  const setup = {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'p105',
    epochs: { kind: 'regular', duration: 4400, count: 60 },
    noise: {},
    instrument: { kind: 'spectrograph' },
  };
  // The same system in solar units: one code length is an AU, and a code
  // time is 1/k days, so the orbits are the same orbits.
  const solar = convertUnits(R3, 'solar', {
    length: 1,
    time: 1 / GAUSSIAN_K,
    mass: 1,
  });

  test('truth parameters are truth, the line of sight is assumed', () => {
    const got = observeSystem3d(solar, 'radial-velocity', setup, {
      observer: { inclinationDeg: 80, positionAngleDeg: 30 },
    });
    expect(got.ok).toBe(true);
    const env = forwardEnvelope(solar, got.observation, {
      observer: got.bridge.observer,
      setup,
      warnings: got.bridge.warnings,
      model: 'radial-velocity',
      version: '1.0.0',
    });
    accepted(env);
    expect(env.source.kind).toBe('forward-model');
    expect(q(env, 'inner.K').origin).toBe('truth');
    expect(q(env, 'inner.K').unit).toBe('m/s');
    expect(q(env, 'sightInclination').origin).toBe('assumed');
    expect(q(env, 'sightInclination').value).toBeCloseTo(80, 9);
    // A different setup is a different observation, and says so.
    const other = forwardEnvelope(solar, got.observation, {
      observer: got.bridge.observer,
      setup: { ...setup, seed: 'other' },
      model: 'radial-velocity',
      version: '1.0.0',
    });
    expect(other.source.digest).not.toBe(env.source.digest);
  });
});

describe('the notebook keeps them and a report cites them', () => {
  test('lab3d is a source whose entries are envelopes', () => {
    expect(ARTIFACT_SOURCES).toContain(SOURCE.LAB3D);
    expect(EN_DEFERRED['nb.source.lab3d']).toBeTruthy();
    expect(ES_DEFERRED['nb.source.lab3d']).toBeTruthy();
    const env = readingEnvelope(R3, f3, { tool: 'elements', a: 1 });
    const entry = artifactEntry({
      source: SOURCE.LAB3D,
      envelope: env,
      title: 'Orbit of the inner planet',
      capturedAt: 1_800_000_000_000,
      context: { page: 'lab3d' },
    });
    expect(envelopeOf(entry)).toBe(entry.snapshot.artifact);
    expect(entry.snapshot.artifact.source.digest).toBe(systemDigest(R3));
    const rows = citationRows(entry.snapshot.artifact, k => k);
    expect(rows.find(r => r[0] === 'nb.cite.digest')[1]).toBe(systemDigest(R3));
  });
});

describe('a 3-D system saved to My work', () => {
  const store = () => {
    const data = new Map();
    return {
      get length() {
        return data.size;
      },
      key: i => [...data.keys()][i],
      getItem: k => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, String(v)),
    };
  };

  test('is a record My work reads, lists and gives back as the lab’s file', () => {
    const system = made('R1').system;
    expect(validateSystem(system)).toEqual([]);
    const record = system3dRecord({ name: 'A tilted Kepler orbit', system });
    const s = store();
    expect(saveMade(record, s).ok).toBe(true);
    const listed = listMade(s);
    expect(listed).toHaveLength(1);
    const back = listed[0];
    expect(back.kind).toBe('system3d');
    expect(back.system3d.system).toEqual(system);
    expect(back.system3d.bodies).toBe(2);
    expect(hrefOf(back)).toBe(`/3d/?open=${back.id}`);
    const file = fileOf(back);
    expect(file.name).toBe('a-tilted-kepler-orbit.system3d.json');
    expect(file.json).toEqual(system);
    // The lab opens the file as it opens any other: unchanged.
    expect(validateSystem(file.json)).toEqual([]);
    const work = describeWork(
      [{ collection: 'made', id: `${MADE_PREFIX}${back.id}`, value: record }],
      new Map()
    );
    expect(work.made.map(m => m.key)).toEqual([`${MADE_PREFIX}${back.id}`]);
  });

  test('a damaged or foreign record is refused, in a word', () => {
    const good = system3dRecord({ name: 'x', system: made('R1').system });
    expect(readMade(good).ok).toBe(true);
    for (const [name, mutate] of [
      ['not a system', r => (r.system3d.system = { format: 'other' })],
      ['a newer version', r => (r.system3d.system.formatVersion = 2)],
      [
        'one body',
        r => (r.system3d.system.bodies = r.system3d.system.bodies.slice(0, 1)),
      ],
    ]) {
      const bad = JSON.parse(JSON.stringify(good));
      mutate(bad);
      expect([name, readMade(bad).reason]).toEqual([name, 'system3d']);
    }
  });

  test('it cannot be attached to a report: the token has two kinds', () => {
    const record = system3dRecord({ name: 'x', system: made('R1').system });
    record.attachedTo = ['e1', 'e2'];
    expect(readMade(record).record.attachedTo).toEqual([]);
  });
});
