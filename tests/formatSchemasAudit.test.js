// =============================================================================
// The format audit (Roadmap III Prompt 290): a schema for every format, held to
// its reader
// -----------------------------------------------------------------------------
// Until Prompt 290 thirty-two of the formats in FORMATS.md had no JSON Schema.
// Each now has one in sdk/schemas, written from its reader (or, where nothing
// reads the format back, from its writer) and held here the way
// tests/formatSchemas*.test.js hold the others:
//
//   - the schema is its row in FORMATS.md (file, version, title, $id);
//   - a document both the reader and the schema should accept is accepted by
//     both, and a change to it is classified, case by case, as
//       both       the reader refuses it and so does the schema;
//       validator  the reader refuses it for a reason no schema can state (a
//                  rule across fields, a reference, a count, a digest);
//       lenient    the reader accepts what the schema, which states the format
//                  as written, refuses: the reader is the older, wider door;
//       fine       both accept it;
//   - a format nothing reads back (three reports and an observed group) is
//     held to its writer's output and to what a writer never writes.
//
// A reader's behaviour is never changed to suit a schema (Prompt 290): where
// the two differ, the schema is loosened or the case is listed, with a reason.
// The checker is ./jsonSchemaSubset.js.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { valid } from './jsonSchemaSubset.js';
import { isItsRow } from './schemaCorpus.js';
import { FORMATS } from '../tools/formats.mjs';
import { lesson } from './compat/kinds/_lesson.mjs';

import { validateMarks } from '../js/measure/imageRecord.js';
import { validateCalibration } from '../js/measure/calibrationRecord.js';
import { readFrames } from '../js/observatory/imagePacks.js';
import { encodePayload, decodePayload } from '../js/shareState.js';
import { readExperimentBlock } from '../js/experiments/shareExperiment.js';
import { readExtras } from '../js/experiments/canonicalState.js';
import { validateSystem } from '../js/lab3d/state.js';
import { snapshotProblem } from '../js/lab3d/snapshot.js';
import { migrate as migrateExperiment } from '../js/experiments/store.js';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { planFile } from '../js/mission/plan.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import {
  validateBackup,
  buildBackup,
} from '../js/investigations/progressBackup.js';
import { readArchive, buildArchive } from '../js/instructorArchive.js';
import {
  KEY as NOTEBOOK_KEY,
  load as loadNotebook,
} from '../js/notebook/store.js';
import { validateEntry } from '../js/notebook/entry.js';
import { checkEvidence, ledgerDigest } from '../js/submission/ledgerDigest.js';
import { readCourseFragment } from '../js/course/links.js';
import { encodeTagged } from '../js/shareState.js';
import { readExpectations } from '../js/instructorExpectations.js';
import { readFlow } from '../js/instructorFlow.js';
import EXPECTATIONS from '../js/data/instructorExpectations.js';
import FLOW from '../js/data/instructorFlow.js';
import { readPackFragment } from '../js/composer/packLink.js';
import { readEmbedOptions } from '../js/embedOptions.js';
import { Store, memoryBackend } from '../js/storage/index.js';
import { readMade } from '../js/myWork/made.js';
import { readComposed } from '../js/myWork/composedReport.js';
import { readResume } from '../js/storage/local.js';
import { readTerms } from '../js/instructorCourseTerms.js';
import * as collections from '../js/library/collections.js';
import { readWeek } from '../js/welcome.js';
import { KEY_RESUME, KEY_TERMS } from '../js/names.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';
import { pack as packArchive } from '../sdk/lib/archive.mjs';
import { readTar } from '../js/catalog/archive.js';
import { gunzipSync } from 'node:zlib';

// The digests need Node's own WebCrypto, as the other suites that hash do.
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto,
});

const clone = v => JSON.parse(JSON.stringify(v));
const schemaOf = file =>
  JSON.parse(readFileSync(`sdk/schemas/${file}.schema.json`, 'utf8'));
const hex = c => c.repeat(64);
const sha = text => createHash('sha256').update(text).digest('hex');

const WANT = {
  both: { reader: false, schema: false },
  validator: { reader: false, schema: true },
  lenient: { reader: true, schema: false },
  fine: { reader: true, schema: true },
};
/** A change that replaces the document. */
const as = doc => ({ replace: doc });

/**
 * The reader and the schema on a good document and on each case, async because
 * several readers are. `accepts` is null for a format nothing reads back: the
 * cases are then `bad` (the schema refuses) or `fine` (it accepts).
 */
async function check(s, good, accepts, cases) {
  if (accepts) expect(await accepts(clone(good))).toBe(true);
  expect(valid(s, clone(good))).toBe(true);
  for (const [which, label, change] of cases) {
    const d = clone(good);
    const out = change(d);
    const doc =
      out && typeof out === 'object' && 'replace' in out ? out.replace : d;
    const got = { label, schema: valid(s, clone(doc)) };
    if (accepts) got.reader = await accepts(clone(doc));
    const want = {
      label,
      schema: WANT[which === 'bad' ? 'both' : which].schema,
    };
    if (accepts) want.reader = WANT[which].reader;
    expect(got).toEqual(want);
  }
}

// --- Fixtures and readers ------------------------------------------------------

const L = lesson();
const frame = { digest: hex('a'), width: 64, height: 48 };
const marks = {
  format: 'gravitas.image-marks',
  formatVersion: 1,
  frames: [frame],
  marks: [
    { id: 'm1', kind: 'point', frame: 0, tag: 'crater', pts: [[3, 4]] },
    {
      id: 'm2',
      kind: 'reference-pair',
      frame: 0,
      tag: 'scale',
      pts: [
        [0, 0],
        [10, 0],
      ],
      length: { value: 2, unit: 'km' },
    },
  ],
};
const wcs = {
  ctype: ['RA---TAN', 'DEC--TAN'],
  crpix: [32, 24],
  crval: [10, 20],
  cd: [
    [1e-4, 0],
    [0, 1e-4],
  ],
};
const star = { id: 's1', x: 1, y: 2, ra: 10, dec: 20, sigma: 0.5 };
const calibration = {
  format: 'gravitas.image-calibration',
  formatVersion: 1,
  frame: { id: 'f1', ...frame },
  catalog: { source: 'typed', name: 'by hand', epoch: 'J2000' },
  stars: [star],
  solution: { origin: 'header', wcs },
  result: null,
};
const fitted = {
  ...calibration,
  solution: { origin: 'fit', model: 'affine', tangent: [10, 20], wcs },
  result: {
    params: [1, 0, 0, 0, 1, 0],
    covariance: Array.from({ length: 6 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => (i === j ? 1 : 0))
    ),
    verdict: 'exact',
    stats: { n: 1, dof: -2, chi2: 0 },
    residuals: [{ dx: 0, dy: 0 }],
  },
};

const link = { v: 2, s: 'binary-pair', seed: 'abc', p: 1, c: [1, 0, 0] };
const xp = {
  v: 1,
  n: 'Mass of the secondary',
  m: ['separation'],
  o: [0, 1],
  pr: 0,
  dv: [['G', 1, 2]],
  mv: 1,
};
const extras = {
  v: 1,
  clock: 100,
  frame: { m: 'body', o: 0 },
  pa: 30,
  inc: 80,
  tools: ['ruler'],
  star: 2,
  dpc: 12.5,
  pack: { id: 'p', version: '1.0.0' },
};

const sys3 = {
  format: 'gravitas.system3d',
  formatVersion: 1,
  units: 'code',
  integrator: { scheme: 'leapfrog', h: 0.01 },
  t: 0,
  bodies: [
    { id: 'sun', m: 1, radius: 0.01, x: [0, 0, 0], v: [0, 0, 0] },
    {
      id: 'planet',
      name: 'Planet',
      m: 1e-3,
      radius: 0.001,
      x: [1, 0, 0],
      v: [0, 1, 0],
    },
  ],
};
const f64 = n => Array.from({ length: n }, (_, i) => i + 1);
const snapshot = {
  format: 'gravitas.lab3d.snapshot',
  formatVersion: 1,
  seq: 0,
  t: 0,
  ids: ['a', 'b'],
  m: [1, 1],
  radius: [0, 0],
  x: f64(6),
  v: f64(6),
  alive: [1, 1],
  trail: [],
  trailT: [],
  events: [],
  warnings: [],
  errors: { energy: 0, angularMomentum: 0, momentum: 0 },
  status: null,
};
const typed = doc => ({
  ...doc,
  m: Float64Array.from(doc.m ?? []),
  radius: Float64Array.from(doc.radius ?? []),
  x: Float64Array.from(doc.x ?? []),
  v: Float64Array.from(doc.v ?? []),
  trail: Float64Array.from(doc.trail ?? []),
  trailT: Float64Array.from(doc.trailT ?? []),
  alive: Uint8Array.from(doc.alive ?? []),
});

const store = {
  v: 3,
  format: 'gravitas.experiment-result',
  formatVersion: 1,
  kind: 'comparison',
  id: 'c1',
  name: 'A comparison',
  scenario: 'binary-pair',
  runs: {
    A: { samples: [{ t: 0, d: 1 }], recordedAt: 1 },
    B: { samples: [{ t: 0, d: 2 }], recordedAt: 2 },
  },
  units: {},
};

const progress = writeProgress({
  lesson: L,
  responses: { 'tides:guess': 0 },
  attempts: { 'tides:guess': 1 },
  visited: new Set(['intro', 'guess']),
  stepSid: 'guess',
  startedAt: '2026-10-01T00:00:00.000Z',
  depth: 'core',
  deepest: 'core',
  spent: 0,
});
const backup = JSON.parse(
  JSON.stringify(
    buildBackup({
      lesson: L,
      responses: { 'tides:guess': 0 },
      attempts: { 'tides:guess': 1 },
      visited: new Set(['intro']),
      stepSid: 'guess',
      startedAt: '2026-10-01T00:00:00.000Z',
    })
  )
);
const archive = JSON.parse(
  buildArchive({
    reports: [
      { label: 'Ada', kind: 'token', thing: 'abc' },
      { label: 'Bo', kind: 'backup', thing: backup },
    ],
    named: [{ label: 'n', text: 't' }],
    marks: 'a,b',
    term: 'Fall 2026',
    now: new Date('2026-10-01T00:00:00Z'),
  })
);

const entry = {
  id: 'e1',
  source: 'rv-fit',
  title: 'A fit',
  prose: { claim: 'c', evidence: 'e', limitations: 'l' },
  snapshot: {
    v: 1,
    capturedAt: 1,
    quantities: [{ label: 'period', value: 3, unit: 'd', kind: 'measured' }],
    figure: null,
    provenance: {},
    artifact: {},
  },
  fingerprint: 'abc',
};
const ledgerRows = [
  ['e1', 'period', 3, 'd', 0.1, 'measured', 'simulation', 'rv-fit', null],
];
const ledger = { i: ['e1'], r: ledgerRows, n: 1, d: hex('0') };

const composed = {
  format: 'gravitas.composed-report',
  formatVersion: 1,
  title: 'My evidence report',
  madeAt: '2026-10-01T00:00:00.000Z',
  build: 'test',
  digest: hex('b'),
  sections: [
    {
      id: 's1',
      title: 'A fit',
      kind: 'rv-fit',
      source: { kind: 'simulation', id: 'rv' },
      settings: {},
      cite: {},
      prose: { claim: 'c' },
      warnings: [],
      numbers: [
        {
          id: 'q',
          label: 'period',
          value: 3,
          unit: 'd',
          uncertainty: { kind: 'sigma' },
        },
      ],
    },
  ],
  comparisons: [],
};
const sideOf = id => ({
  entry: id,
  id: 'q',
  title: 't',
  label: 'period',
  value: 3,
  uncertainty: { kind: 'sigma' },
});
const comparison = {
  a: sideOf('e1'),
  b: sideOf('e2'),
  unit: 'd',
  difference: 0,
  sigma: 0.1,
  nSigma: 0,
  p: 1,
  independent: true,
  assumptions: ['independent'],
};

const made = (kind, block) => ({
  format: 'gravitas.made',
  formatVersion: 1,
  id: 'made-one',
  kind,
  from: 'sandbox',
  name: 'Mine',
  savedAt: '2026-10-01',
  app: 'gravitas',
  attachedTo: ['e1'],
  ...block,
});
const madeScenario = made('scenario', {
  scenario: {
    id: 'binary-pair',
    seed: '1',
    settings: {},
    bodies: 2,
    link: '2zabc',
  },
});

const resume = {
  v: 1,
  items: [
    {
      id: 'investigation:tides',
      route: '/#investigation=tides',
      at: 1790000000000,
      step: 'guess',
      path: { k: 'seq', id: 'gravity-and-orbits' },
      title: { en: 'Tides', es: 'Mareas' },
    },
  ],
};
const terms = {
  v: 1,
  courses: [
    {
      id: 'intro-astronomy-fall-2026',
      term: 'Fall 2026',
      at: 1790000000000,
      title: { en: 'Intro' },
    },
  ],
};
const collectionPack = {
  format: 'gravitas.course-pack',
  formatVersion: 3,
  id: 'saved-items',
  profile: 'collection',
  title: { en: 'Saved' },
  units: [
    {
      id: 'saved',
      items: [{ id: 'lesson-tides', kind: 'lesson', lesson: 'tides' }],
    },
  ],
};
const colls = {
  v: 1,
  saved: collectionPack,
  received: [{ at: 1, pack: { ...collectionPack, id: 'other' } }],
};
const week = {
  v: 1,
  id: 'week-one',
  t: { en: 'Week one', es: 'Semana uno' },
  mo: 'shut',
  items: [
    {
      t: { en: 'Tides' },
      h: '/#investigation=tides',
      l: 'tides',
      d: 'core',
      n: 9,
    },
    { t: { en: 'Solar System' }, h: '/#2zabc', o: 1 },
  ],
};

/** A record in a globalThis.localStorage key, read back by `read`: true when nothing was dropped. */
const kept = (key, read, count) => doc => {
  globalThis.localStorage.setItem(key, JSON.stringify(doc));
  return read().length === count(doc);
};

// --- The table: one entry per new schema ------------------------------------------

const T = [];
const add = (file, name, version, good, accepts, cases, rowName = name) =>
  T.push({ file, name, version, good, accepts, cases, rowName });

add(
  'image-marks-1',
  'gravitas.image-marks',
  1,
  marks,
  d => validateMarks(d).length === 0,
  [
    [
      'fine',
      'a frame with its time',
      d => (d.frames[0].time = { scale: 'utc', format: 'mjd', value: 60000 }),
    ],
    ['both', 'another format', d => (d.format = 'gravitas.image')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['both', 'no frames', d => (d.frames = [])],
    ['both', 'a digest that is not hex', d => (d.frames[0].digest = 'xyz')],
    ['both', 'a frame of no width', d => (d.frames[0].width = 0)],
    [
      'both',
      'a kind of mark it does not know',
      d => (d.marks[0].kind = 'blob'),
    ],
    [
      'both',
      'a tag past 40 characters',
      d => (d.marks[0].tag = 'x'.repeat(41)),
    ],
    ['both', 'a point that is not a pair', d => (d.marks[0].pts = [[1]])],
    ['both', 'a known length of zero', d => (d.marks[1].length.value = 0)],
    [
      'validator',
      'a segment with one point',
      d => ((d.marks[0].kind = 'segment'), (d.marks[0].pts = [[1, 1]])),
    ],
    [
      'validator',
      'a mark on a frame that is not there',
      d => (d.marks[0].frame = 5),
    ],
    ['validator', 'two marks with one id', d => (d.marks[1].id = 'm1')],
    [
      'validator',
      'a refined result with fewer points than the mark',
      d => (d.marks[1].result = { pts: [[0, 0]], sigma: 0.1 }),
    ],
  ]
);

add(
  'image-calibration-1',
  'gravitas.image-calibration',
  1,
  calibration,
  d => validateCalibration(d).length === 0,
  [
    ['fine', 'a fitted solution', () => as(fitted)],
    [
      'fine',
      'a header with CDELT and PC',
      d => (
        delete d.solution.wcs.cd,
        (d.solution.wcs.cdelt = [1e-4, 1e-4]),
        (d.solution.wcs.pc = [
          [1, 0],
          [0, 1],
        ])
      ),
    ],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['both', 'a source it does not know', d => (d.catalog.source = 'guess')],
    ['both', 'a declination of 91', d => (d.stars[0].dec = 91)],
    ['both', 'a star with no uncertainty', d => (d.stars[0].sigma = 0)],
    ['both', 'an origin it does not know', d => (d.solution.origin = 'magic')],
    ['both', 'no coordinate system', d => delete d.solution.wcs],
    [
      'validator',
      'a projection that is not TAN',
      d => (d.solution.wcs.ctype = ['RA---SIN', 'DEC--SIN']),
    ],
    [
      'validator',
      'a singular matrix',
      d =>
        (d.solution.wcs.cd = [
          [1, 1],
          [1, 1],
        ]),
    ],
    [
      'validator',
      'a header solution with a result',
      () =>
        as({ ...fitted, solution: { ...fitted.solution, origin: 'header' } }),
    ],
    [
      'validator',
      'a result for the wrong number of stars',
      () => as({ ...fitted, stars: [star, { ...star, id: 's2' }] }),
    ],
  ]
);

add(
  'experiment-link-block-1',
  'experiment link block',
  1,
  xp,
  d => {
    const r = readExperimentBlock({ xp: d });
    return (
      r.present &&
      r.name === (d.n ?? '') &&
      r.metrics.length === (d.m ?? []).length &&
      r.objects.length === (d.o ?? []).length &&
      r.variables.length === (d.dv ?? []).length &&
      r.primary === (d.pr ?? null)
    );
  },
  [
    ['fine', 'only the version', () => as({ v: 1 })],
    ['both', 'a metric that is not a string', d => (d.m = ['separation', 7])],
    ['both', 'an object id that is not a number', d => (d.o = ['a'])],
    ['both', 'a change with no key', d => (d.dv = [[1, 1, 2]])],
    ['lenient', 'a name past 80 characters', d => (d.n = 'x'.repeat(81))],
    ['lenient', 'a later version', d => (d.v = 2)],
  ],
  'experiment link block (xp)'
);

add(
  'link-extras-1',
  'link extras',
  1,
  extras,
  d => {
    const r = readExtras({ x: d });
    return (
      r.version === d.v &&
      r.clock === (d.clock ?? 0) &&
      r.observer.positionAngle === (d.pa ?? 0) &&
      r.observer.inclination === (d.inc ?? 90) &&
      r.tools.length === (d.tools?.length ?? 0) &&
      r.distancePc === (d.dpc ?? null) &&
      r.pack?.id === d.pack?.id &&
      r.frame.mode === (d.frame?.m ?? 'world')
    );
  },
  [
    ['fine', 'only the version', () => as({ v: 1 })],
    ['both', 'a clock that is not a number', d => (d.clock = 'now')],
    ['both', 'a position angle that is not a number', d => (d.pa = 'north')],
    ['both', 'a distance that is not a number', d => (d.dpc = 'far')],
    ['both', 'a pack with no version', d => (d.pack = { id: 'p' })],
    ['both', 'a tool list that is not a list', d => (d.tools = 'ruler')],
    ['lenient', 'a distance of zero or less', d => (d.dpc = -3)],
    ['lenient', 'a later version', d => (d.v = 2)],
  ],
  'link extras (x)'
);

add(
  'world-link-2',
  'world share link',
  2,
  link,
  async d => {
    try {
      const p = await decodePayload(await encodePayload(d));
      return !!p.s;
    } catch {
      return false;
    }
  },
  [
    [
      'fine',
      'a version 1 link naming the scenario by its English name',
      () => as({ v: 1, s: 'Solar System', seed: 'abc' }),
    ],
    [
      'fine',
      'an experiment block and extras',
      d => ((d.xp = xp), (d.x = extras)),
    ],
    ['both', 'no scenario', d => delete d.s],
    ['both', 'an empty scenario', d => (d.s = '')],
    [
      'validator',
      'a scenario this build does not have',
      d => (d.s = 'not-a-world'),
    ],
    ['lenient', 'a version the payload does not need to say', d => (d.v = 7)],
    ['lenient', 'a camera of two numbers', d => (d.c = [1, 0])],
    ['lenient', 'paused as true', d => (d.p = true)],
  ]
);

add(
  'system3d-1',
  'gravitas.system3d',
  1,
  sys3,
  d => validateSystem(d).length === 0,
  [
    [
      'fine',
      'the adaptive scheme with a tolerance',
      d => (d.integrator = { scheme: 'dopri5', tol: 1e-9 }),
    ],
    ['both', 'a scheme it does not know', d => (d.integrator.scheme = 'euler')],
    ['both', 'a step of zero', d => (d.integrator.h = 0)],
    [
      'both',
      'a tolerance outside its range',
      d => (d.integrator = { scheme: 'dopri5', tol: 1 }),
    ],
    ['both', 'units it does not know', d => (d.units = 'km')],
    ['both', 'one body', d => d.bodies.pop()],
    [
      'both',
      'an id that is not lower-case words',
      d => (d.bodies[0].id = 'Sun'),
    ],
    [
      'both',
      'a field of a body that is not one',
      d => (d.bodies[0].colour = 'red'),
    ],
    ['both', 'a field of the system that is not one', d => (d.extra = 1)],
    ['both', 'a position of two numbers', d => (d.bodies[0].x = [0, 0])],
    ['validator', 'two bodies with one id', d => (d.bodies[1].id = 'sun')],
    [
      'validator',
      'a fixed-step scheme with a tolerance',
      d => (d.integrator.tol = 1e-9),
    ],
    [
      'validator',
      'the adaptive scheme with a step',
      d => (d.integrator = { scheme: 'dopri5', h: 0.01, tol: 1e-9 }),
    ],
  ]
);

add(
  'lab3d-snapshot-1',
  'gravitas.lab3d.snapshot',
  1,
  snapshot,
  d => snapshotProblem(typed(d)) === null,
  [
    ['both', 'another format', d => (d.format = 'gravitas.system3d')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['both', 'a sequence number that is not an integer', d => (d.seq = 1.5)],
    ['both', 'no ids', d => delete d.ids],
    [
      'validator',
      'positions for the wrong number of bodies',
      d => (d.x = f64(5)),
    ],
    [
      'validator',
      'a trail whose length does not follow its times',
      d => (d.trailT = [0]),
    ],
    ['lenient', 'a body alive twice over', d => (d.alive = [2, 1])],
  ]
);

add(
  'experiment-store-3',
  'experiment store',
  3,
  store,
  d => migrateExperiment(clone(d)).ok,
  [
    ['both', 'a later schema number', d => (d.v = 4)],
    ['both', 'a later format version', d => (d.formatVersion = 2)],
    ['both', 'not an object', () => as('record')],
    ['lenient', 'version 2', d => (d.v = 2)],
    [
      'lenient',
      'version 1: the runs as runA and runB',
      d => (
        (d.v = 1),
        (d.runA = d.runs.A),
        (d.runB = d.runs.B),
        delete d.runs,
        delete d.units
      ),
    ],
    ['lenient', 'no schema number, which reads as version 1', d => delete d.v],
  ]
);

add(
  'progress-2',
  'investigation progress',
  2,
  progress,
  d => readProgress(clone(d), L).notes.length === 0,
  [
    ['fine', 'no depth', d => (delete d.depth, delete d.deepest)],
    ['both', 'a later schema', d => (d.schema = 3)],
    ['lenient', 'a list, which reads as an empty record', () => as([])],
    [
      'validator',
      'an answer to a step of another lesson',
      d => (d.responses.other = 1),
    ],
    [
      'validator',
      'an answer to a step the lesson no longer has',
      d => (d.responses['tides:gone'] = 1),
    ],
    ['lenient', 'answers as a list', d => (d.responses = [])],
    ['lenient', 'version 1', d => (d.schema = 1)],
    [
      'both',
      'no schema number: read as version 1, by position, with notes',
      d => delete d.schema,
    ],
  ]
);

add(
  'investigation-progress-backup-2',
  'gravitas.investigation.progress',
  2,
  backup,
  d => validateBackup(clone(d)).ok,
  [
    ['both', 'another kind', d => (d.kind = 'gravitas.observation')],
    ['both', 'a later version', d => (d.version = 3)],
    ['both', 'no lesson id', d => (d.lesson = {})],
    ['both', 'answers as a list', d => (d.progress.responses = [])],
    [
      'both',
      'an attempt count that is not a number',
      d => (d.progress.attempts['tides:guess'] = 'one'),
    ],
    ['both', 'a step row that is not an object', d => (d.steps = [null])],
    [
      'validator',
      'a start time that is not a date',
      d => (d.progress.startedAt = 'long ago'),
    ],
    ['lenient', 'version 1', d => (d.version = 1)],
  ]
);

add(
  'submission-archive-1',
  'gravitas.submission-archive',
  1,
  archive,
  d => readArchive(JSON.stringify(d)).ok,
  [
    ['both', 'another format', d => (d.format = 'gravitas.student-data')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['both', 'reports that are not a list', d => (d.reports = {})],
    [
      'both',
      'a kind of report it does not know',
      d => (d.reports[0].kind = 'fax'),
    ],
    ['both', 'a token that is not text', d => (d.reports[0].token = 7)],
    [
      'both',
      'a backup that is not an object',
      d => (d.reports[1].backup = 'text'),
    ],
    ['both', 'a named text with no text', d => (d.named = [{ label: 'x' }])],
    [
      'both',
      'more than 2,000 reports',
      d =>
        (d.reports = Array.from({ length: 2001 }, () => ({
          label: 'x',
          kind: 'token',
          token: 'x',
        }))),
    ],
    [
      'lenient',
      'a label past 200 characters, which the reader cuts',
      d => (d.reports[0].label = 'x'.repeat(201)),
    ],
  ]
);

add(
  'notebook-store-1',
  'notebook store',
  1,
  { v: 1, entries: [entry] },
  d => {
    globalThis.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(d));
    const r = loadNotebook();
    return (
      r.ok &&
      r.entries.length === (Array.isArray(d.entries) ? d.entries.length : 0)
    );
  },
  [
    ['fine', 'an empty notebook', d => (d.entries = [])],
    ['both', 'a later version', d => (d.v = 2)],
    [
      'lenient',
      'entries that are not a list, which read as empty',
      d => (d.entries = {}),
    ],
  ]
);

add(
  'notebook-entry-1',
  'notebook entry snapshot',
  1,
  entry,
  d => validateEntry(d).ok,
  [
    [
      'fine',
      'a figure with its series',
      d => (d.snapshot.figure = { series: [] }),
    ],
    ['both', 'no id', d => delete d.id],
    ['both', 'a later snapshot version', d => (d.snapshot.v = 2)],
    ['both', 'no quantities', d => delete d.snapshot.quantities],
    [
      'both',
      'a quantity with no label',
      d => delete d.snapshot.quantities[0].label,
    ],
    [
      'both',
      'a kind of quantity it does not know',
      d => (d.snapshot.quantities[0].kind = 'guess'),
    ],
    [
      'both',
      'more than 40 quantities',
      d =>
        (d.snapshot.quantities = Array.from({ length: 41 }, () => ({
          label: 'q',
        }))),
    ],
    ['both', 'a figure with no series', d => (d.snapshot.figure = {})],
    [
      'lenient',
      'no snapshot version, which reads as 1',
      d => delete d.snapshot.v,
    ],
  ]
);

add(
  'ledger-1',
  'gravitas.ledger',
  1,
  ledger,
  async d => {
    // The digest is the token's to state; this holds the structure the reader
    // needs, so the digest is made from the record as it stands.
    if (
      !d ||
      typeof d !== 'object' ||
      !Array.isArray(d.i) ||
      !Array.isArray(d.r)
    )
      return false;
    const digest = await ledgerDigest({ ids: d.i, rows: d.r });
    return (await checkEvidence({ ...d, d: digest })).state === 'verified';
  },
  [
    ['fine', 'a tenth column, the uncertainty code', d => d.r[0].push('s')],
    ['both', 'rows that are not a list', d => (d.r = 'rows')],
    ['both', 'ids that are not a list', d => (d.i = 'e1')],
    [
      'lenient',
      'a digest that is not hex (a reader recomputes it from the rows, so only a mismatch shows)',
      d => (d.d = 'abc'),
    ],
    ['validator', 'more rows counted than carried', d => (d.n = 5)],
  ],
  'gravitas.ledger'
);

add(
  'course-home-link-3',
  'course home link',
  3,
  clone(INTRO_ASTRONOMY),
  async d => {
    try {
      await readCourseFragment(await encodeTagged('c', 3, d));
      return true;
    } catch {
      return false;
    }
  },
  [
    [
      'fine',
      'a package at /3 with a term',
      d => ((d.formatVersion = 3), (d.term = 'Fall 2026')),
    ],
    [
      'lenient',
      'a payload that is not a course package: the reader hands back what the link held, and the course validator decides',
      () => as({ hello: 'world' }),
    ],
    [
      'lenient',
      'a package of another format',
      d => (d.format = 'gravitas.investigation-pack'),
    ],
  ]
);

add(
  'investigation-link-2',
  'investigation link',
  2,
  { p: { format: 'gravitas.investigation-pack', formatVersion: 1 } },
  async d => {
    try {
      return (
        (await readPackFragment(await encodeTagged('i', 1, d))).ok === true
      );
    } catch {
      return false;
    }
  },
  [
    ['fine', 'a delta', () => as({ d: { title: 'x' } })],
    ['fine', 'an installed package', () => as({ k: 'org.example.pack' })],
    ['both', 'nothing', () => as({})],
    ['both', 'a pack that is not an object', () => as({ p: 'text' })],
    ['both', 'a pack and a delta together', d => (d.d = {})],
    ['both', 'a key that is not a package key', () => as({ k: 'Not A Key' })],
  ]
);

add(
  'embed-options-1',
  'embed options',
  1,
  {
    embed: '1',
    ev: '1',
    lang: 'es',
    theme: 'daylight',
    controls: 'none',
    motion: 'reduced',
    quality: 'low',
    reset: 'authored',
    parent: 'https://example.org',
  },
  d => {
    const r = readEmbedOptions(new globalThis.URLSearchParams(d));
    return r.version === 1 && r.ignored.length === 0;
  },
  [
    ['fine', 'only the version', () => as({ embed: '1', ev: '1' })],
    ['both', 'a later version of the options', d => (d.ev = '2')],
    ['both', 'a language it does not have', d => (d.lang = 'fr')],
    ['both', 'a theme it does not have', d => (d.theme = 'neon')],
    [
      'both',
      'a parent with a path',
      d => (d.parent = 'https://example.org/page'),
    ],
    [
      'validator',
      'a parent on plain http away from this machine',
      d => (d.parent = 'http://example.org'),
    ],
  ]
);

const dataRecord = { id: 'r1', version: 1, saved: 1, value: { a: 1 } };
add(
  'student-data-1',
  'gravitas.student-data',
  1,
  {
    format: 'gravitas.student-data',
    formatVersion: 1,
    exported: '2026-10-01T00:00:00.000Z',
    collections: {
      progress: [dataRecord],
      made: [{ ...dataRecord, id: 'made-one' }],
    },
  },
  async d => {
    const r = await new Store(memoryBackend(), { channel: null }).importAll(d, {
      dryRun: true,
    });
    return r.ok === true && r.plan.every(p => p.action !== 'skip');
  },
  [
    ['fine', 'no records', d => (d.collections = {})],
    ['both', 'another format', d => (d.format = 'gravitas.observation')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['both', 'no collections', d => delete d.collections],
    ['both', 'a record with no id', d => delete d.collections.progress[0].id],
    [
      'both',
      'a record version that is not an integer',
      d => (d.collections.progress[0].version = '1'),
    ],
    [
      'validator',
      'a collection this build does not know, which it skips',
      d => (d.collections.mystery = [dataRecord]),
    ],
  ]
);

add('made-1', 'gravitas.made', 1, madeScenario, d => readMade(d).ok, [
  [
    'fine',
    'an experiment',
    () =>
      as(
        made('experiment', {
          experiment: { hash: 'h', result: { manifest: {} } },
        })
      ),
  ],
  [
    'fine',
    'a 3-D system',
    () =>
      as(
        made('system3d', {
          system3d: { from: 'now', units: 'code', bodies: 2, system: sys3 },
        })
      ),
  ],
  [
    'fine',
    'a mission plan from the lab',
    () =>
      as(
        made('mission', {
          mission: {
            file: {
              format: 'gravitas.mission-plan',
              kind: 'missionLab',
              inputs: {},
            },
          },
        })
      ),
  ],
  [
    'fine',
    'a composed report',
    () => as(made('report', { report: { digest: hex('c'), sections: [{}] } })),
  ],
  ['both', 'another format', d => (d.format = 'gravitas.observation')],
  ['both', 'a later version', d => (d.formatVersion = 2)],
  ['both', 'an id that is not words', d => (d.id = 'No')],
  ['both', 'a kind it does not know', d => (d.kind = 'poem')],
  ['both', 'a scenario with no link', d => delete d.scenario.link],
  [
    'both',
    'a scenario link that is not a fragment',
    d => (d.scenario.link = 'http://x'),
  ],
  [
    'both',
    'an experiment with no manifest',
    () => as(made('experiment', { experiment: { result: {} } })),
  ],
  [
    'both',
    'a mission file that is not a lab plan',
    () =>
      as(
        made('mission', {
          mission: {
            file: {
              format: 'gravitas.mission-plan',
              kind: 'hohmann',
              inputs: {},
            },
          },
        })
      ),
  ],
  [
    'both',
    'a report with no sections',
    () => as(made('report', { report: { digest: 'd', sections: [] } })),
  ],
  [
    'lenient',
    'a name past 120 characters, which the reader cuts',
    d => (d.name = 'x'.repeat(121)),
  ],
]);

add(
  'composed-report-1',
  'gravitas.composed-report',
  1,
  { ...composed, comparisons: [comparison] },
  d => readComposed(d).ok,
  [
    [
      'fine',
      'a number with no value (a failed fit)',
      d => (d.sections[0].numbers[0].value = null),
    ],
    ['both', 'another format', d => (d.format = 'gravitas.made')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['both', 'a digest that is not hex', d => (d.digest = 'abc')],
    ['both', 'no sections', d => (d.sections = [])],
    ['both', 'a section with no source', d => delete d.sections[0].source],
    [
      'both',
      'a number with no unit',
      d => delete d.sections[0].numbers[0].unit,
    ],
    ['both', 'a comparison with no p value', d => delete d.comparisons[0].p],
    [
      'both',
      'more than 20 comparisons',
      d => (d.comparisons = Array.from({ length: 21 }, () => comparison)),
    ],
    [
      'fine',
      'a build that says more',
      d => (d.build = { app: 'gravitas', version: '3.0.0' }),
    ],
  ]
);

add(
  'resume-record-1',
  'resume record',
  1,
  resume,
  kept(
    KEY_RESUME,
    () => readResume(),
    d => (Array.isArray(d?.items) && d?.v === 1 ? d.items.length : -1)
  ),
  [
    [
      'fine',
      'an item with only what is needed',
      d => (d.items = [{ id: 'a', route: '/x', at: 1 }]),
    ],
    ['both', 'a later version', d => (d.v = 2)],
    [
      'both',
      'a route off this site',
      d => (d.items[0].route = '//evil.example'),
    ],
    ['both', 'an id with a space', d => (d.items[0].id = 'a b')],
    [
      'lenient',
      'a pathway of a kind it does not know, which the reader drops and keeps the item',
      d => (d.items[0].path.k = 'book'),
    ],
    [
      'both',
      'more than six items',
      d =>
        (d.items = Array.from({ length: 7 }, (_, i) => ({
          id: `i${i}`,
          route: '/x',
          at: i,
        }))),
    ],
    ['validator', 'one id twice', d => d.items.push({ ...d.items[0] })],
  ]
);

add(
  'course-terms-1',
  'course terms record',
  1,
  terms,
  kept(
    KEY_TERMS,
    () => readTerms(),
    d => (Array.isArray(d?.courses) && d?.v === 1 ? d.courses.length : -1)
  ),
  [
    ['fine', 'a line with no title', d => delete d.courses[0].title],
    ['both', 'a later version', d => (d.v = 2)],
    [
      'both',
      'a course id that is not words',
      d => (d.courses[0].id = 'Intro Astronomy'),
    ],
    [
      'both',
      'a term past 40 characters',
      d => (d.courses[0].term = 'x'.repeat(41)),
    ],
    [
      'lenient',
      'a title with no English, which the reader drops and keeps the line',
      d => (d.courses[0].title = { es: 'Introducción' }),
    ],
    [
      'both',
      'more than twelve lines',
      d =>
        (d.courses = Array.from({ length: 13 }, (_, i) => ({
          id: `c${i}`,
          term: 't',
          at: i,
        }))),
    ],
    [
      'validator',
      'one course and term twice',
      d => d.courses.push({ ...d.courses[0] }),
    ],
  ]
);

let held = null;
collections.bind({ read: () => held, write: () => true });
add(
  'collections-record-1',
  'collections record',
  1,
  colls,
  d => {
    held = d;
    const r = collections.readCollections();
    return (
      d?.v === 1 &&
      !!r.saved === !!d.saved &&
      r.received.length === (d.received?.length ?? 0)
    );
  },
  [
    ['fine', 'no collection of their own', d => delete d.saved],
    ['both', 'a later version', d => (d.v = 2)],
    [
      'both',
      'a saved package that is not a collection',
      d => delete d.saved.profile,
    ],
    [
      'both',
      'a received package with no units',
      d => (d.received[0].pack.units = []),
    ],
    [
      'both',
      'more than six received',
      d =>
        (d.received = Array.from({ length: 7 }, (_, i) => ({
          at: i,
          pack: { ...collectionPack, id: `p${i}` },
        }))),
    ],
    [
      'validator',
      'one received id twice',
      d => d.received.push({ at: 2, pack: { ...collectionPack, id: 'other' } }),
    ],
  ]
);

add(
  'first-week-record-1',
  'first-week record',
  1,
  week,
  d => readWeek(JSON.stringify(d)) !== null,
  [
    ['fine', 'an item opened', d => (d.items[1].o = 1)],
    ['both', 'a later version', d => (d.v = 2)],
    ['both', 'no English title', d => (d.t = { es: 'Semana' })],
    ['both', 'no items', d => (d.items = [])],
    [
      'both',
      'more than seven items',
      d =>
        (d.items = Array.from({ length: 8 }, () => ({
          t: { en: 'x' },
          h: '/x',
        }))),
    ],
    [
      'both',
      'an address off this site',
      d => (d.items[0].h = '//evil.example'),
    ],
    ['both', 'an address with a space', d => (d.items[0].h = '/a b')],
    ['both', 'a lesson id with a slash', d => (d.items[0].l = 'a/b')],
    ['lenient', 'More as something else', d => (d.mo = 'half')],
  ]
);

// --- Formats nothing reads back: the schema is held to the writer's output ---------

const guideReport = {
  format: 'gravitas.lab3d-guide-report',
  formatVersion: 1,
  curriculum: '1.1.0',
  guide: 'kepler',
  path: 'intro',
  locale: 'en',
  name: 'Ada',
  steps: [
    {
      step: 'a',
      kind: 'answer',
      typed: '3',
      passed: true,
      shown: false,
      expected: 3,
    },
    { step: 'b', kind: 'choose', choice: 1, prediction: true },
    { step: 'c', kind: 'do', passed: true, recorded: { system: {}, t: 1 } },
  ],
};
const missionReport = {
  format: 'gravitas.mission-lab-report',
  formatVersion: 1,
  notFor: 'operational mission design or navigation',
  language: 'en',
  name: null,
  guides: [
    {
      guide: 'g',
      path: 'intro',
      steps: [
        { step: 's', kind: 'answer', input: '1', passed: true, shown: false },
      ],
    },
  ],
  plan: {},
  results: {
    departDvKmS: 3.6,
    captureDvKmS: null,
    c3: 10,
    vinfArrKmS: 2,
    directMissKm: 1e6,
    correctionDvKmS: null,
    totalDvKmS: 5,
    depotPropellantKg: 100,
  },
};
const manifest = {
  format: 'gravitas.course-manifest',
  formatVersion: 1,
  course: {
    id: 'intro-astronomy',
    version: '1.0.0',
    title: { en: 'Intro' },
    locales: ['en', 'es'],
    pinning: 'compatible',
    gravitas: '1.0.0',
  },
  platform: {},
  minutes: { core: 100 },
  items: [
    {
      id: 'i1',
      kind: 'lesson',
      path: 'core',
      minutes: 10,
      status: 'ok',
      offline: {},
      license: {},
      locales: ['en'],
      links: {},
    },
  ],
  dependencies: [],
  remaining: [{ level: 'warning', code: 'x', path: 'units[0]' }],
};
const observed = {
  format: 'gravitas.observed',
  formatVersion: 1,
  observation: {
    id: 'tess-1',
    title: 'A light curve',
    source: 'tess',
    digest: hex('d'),
    license: 'public',
    credit: null,
    retrieved: '2026-10-01',
    citations: [{ text: 'A paper', url: 'https://doi.org/x' }],
  },
  tool: { id: 'transit-depth', version: '1.0.0', params: { window: 3 }, at: 2 },
  changes: ['mask', 'bin'],
  assumptions: [{ id: 'stellar-radius', value: 1, unit: 'Rsun', cite: null }],
  warnings: [{ code: 'few-points' }],
  steps: [['s1', 'done']],
};
const missionPlan = JSON.parse(
  JSON.stringify(
    planFile(
      'lambert',
      { departDay: 0, flightDays: 200 },
      { ok: true, dv: 3.2 },
      { bodies: ['earth', 'mars'] }
    )
  )
);
const pack = JSON.parse(
  readFileSync('ephemeris-packs/galilean-2025-11.json', 'utf8')
);
const bad = (label, change) => ['bad', label, change];

add(
  'lab3d-guide-report-1',
  'gravitas.lab3d-guide-report',
  1,
  guideReport,
  null,
  [
    ['fine', 'no steps recorded', d => (d.steps = [])],
    bad('a locale it does not write', d => (d.locale = 'fr')),
    bad('a kind of step it does not have', d => (d.steps[0].kind = 'quiz')),
    bad('no guide', d => delete d.guide),
    bad('another format', d => (d.format = 'gravitas.mission-lab-report')),
  ]
);
add(
  'mission-lab-report-1',
  'gravitas.mission-lab-report',
  1,
  missionReport,
  null,
  [
    ['fine', 'no mission', d => (d.results = null)],
    bad('no notFor', d => delete d.notFor),
    bad('a language it does not write', d => (d.language = 'fr')),
    bad('a step with no pass flag', d => delete d.guides[0].steps[0].passed),
    bad('a result that is text', d => (d.results.c3 = 'ten')),
  ]
);
add('course-manifest-1', 'gravitas.course-manifest', 1, manifest, null, [
  [
    'fine',
    'a course with a home',
    d => (d.course.home = 'https://example.org/course/#c2'),
  ],
  bad('no items', d => delete d.items),
  bad('a later version', d => (d.formatVersion = 2)),
  bad('a course with no locales', d => delete d.course.locales),
  bad('an item with no kind', d => delete d.items[0].kind),
]);
add('observed-1', 'gravitas.observed', 1, observed, null, [
  [
    'fine',
    'no citations or retrieval date',
    d => (delete d.observation.retrieved, delete d.observation.citations),
  ],
  bad('no tool', d => delete d.tool),
  bad('a later version', d => (d.formatVersion = 2)),
  bad('a warning with no code', d => (d.warnings = [{}])),
  bad(
    'a citation with no text',
    d => (d.observation.citations = [{ url: 'x' }])
  ),
]);
add('mission-plan-1', 'gravitas.mission-plan', 1, missionPlan, null, [
  ['fine', 'a lab plan', d => (d.kind = 'missionLab')],
  bad('no notFor', d => delete d.notFor),
  bad(
    'an approximation it does not know',
    d => (d.model.approximations = ['magic'])
  ),
  bad('no inputs', d => delete d.inputs),
  bad('a later version', d => (d.formatVersion = 2)),
]);
add(
  'ephemeris-pack-1',
  'gravitas.ephemeris-pack',
  1,
  pack,
  d => {
    try {
      createEphemeris(d, {});
    } catch (e) {
      return !/not a gravitas\.ephemeris-pack/.test(String(e.message));
    }
    return true;
  },
  [
    ['both', 'another format', d => (d.format = 'gravitas.library')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
  ]
);

// --- The pixel planes: the repository's own files, and the reader ---------------

const plane = new Uint8Array(new Float32Array([1, 2, 3, 4]).buffer);
const planes = {
  format: 'gravitas.image-pack-planes',
  formatVersion: 1,
  id: 'craters-test',
  width: 2,
  height: 2,
  planes: {
    data: {
      encoding: 'float32-le',
      base64: Buffer.from(plane).toString('base64'),
    },
  },
};
add(
  'image-pack-planes-1',
  'gravitas.image-pack-planes',
  1,
  planes,
  async d => {
    const text = JSON.stringify(d);
    const bytes = new globalThis.TextEncoder().encode(text);
    try {
      await readFrames(
        bytes.buffer,
        { file: 'frames/x.json', bytes: bytes.length, sha256: sha(text) },
        { id: 'craters-test', image: { width: 2, height: 2 } }
      );
      return true;
    } catch {
      return false;
    }
  },
  [
    [
      'fine',
      'with a variance plane',
      d => (d.planes.variance = { ...d.planes.data }),
    ],
    ['both', 'another format', d => (d.format = 'gravitas.image')],
    ['both', 'a later version', d => (d.formatVersion = 2)],
    ['validator', 'the frames of another pack', d => (d.id = 'other')],
    [
      'validator',
      'a size the pack does not have',
      d => ((d.width = 3), (d.height = 3)),
    ],
    [
      'validator',
      'a plane of the wrong length',
      d =>
        (d.planes.data.base64 = Buffer.from(plane.slice(0, 8)).toString(
          'base64'
        )),
    ],
    [
      'validator',
      'a display plane alone: the repository carries such files, and the reader needs `data`',
      d => (d.planes = { display: { encoding: 'uint8', base64: 'AAAA' } }),
    ],
    ['both', 'a plane with no bytes', d => delete d.planes.data.base64],
  ]
);

// --- The extension archive: not JSON, so its listing ---------------------------

const gxp = packArchive({
  'gravitas-extension.json': Buffer.from('{}'),
  'lessons/a.json': Buffer.from('[]'),
});
const listing = {
  entries: [...readTar(new Uint8Array(gunzipSync(gxp)))].map(
    ([path, bytes]) => ({ path, size: bytes.length })
  ),
};
add('extension-archive-1', 'gravitas.extension-archive', 1, listing, null, [
  bad('an absolute path', d => (d.entries[1].path = '/etc/passwd')),
  bad('a path that climbs out', d => (d.entries[1].path = '../outside')),
  bad('a path with a space', d => (d.entries[1].path = 'a b')),
  bad(
    'a first entry that is not the manifest',
    d => ([d.entries[0], d.entries[1]] = [d.entries[1], d.entries[0]])
  ),
  bad('no CHECKSUMS entry', d => d.entries.pop()),
  bad('only the manifest', d => (d.entries = d.entries.slice(0, 1))),
  bad(
    'more than 64 entries and the checksums',
    d =>
      (d.entries = [
        d.entries[0],
        ...Array.from({ length: 64 }, (_, i) => ({ path: `f${i}`, size: 0 })),
        d.entries.at(-1),
      ])
  ),
  bad('a size below zero', d => (d.entries[1].size = -1)),
]);

// --- Formats the audit found the first inventory had missed -------------------

const steps = () => [{ sid: 'guess' }, { sid: 'check' }];
add(
  'instructor-expectations-2',
  'gravitas.instructor-expectations',
  2,
  {
    format: 'gravitas.instructor-expectations',
    formatVersion: 2,
    lessons: { tides: { guess: 'About 12 hours', check: 'Twice a day' } },
  },
  d => readExpectations(d, steps).ok,
  [
    ['fine', 'no lessons', d => (d.lessons = {})],
    ['both', 'another format', d => (d.format = 'gravitas.instructor-flow')],
    ['both', 'a later version', d => (d.formatVersion = 3)],
    [
      'lenient',
      'version 1, keyed by step number',
      d => (
        (d.formatVersion = 1),
        (d.lessons = { tides: { 1: 'About 12 hours' } })
      ),
    ],
    [
      'lenient',
      'a lesson that is not a record of texts: the reader leaves the shape to the author check',
      d => (d.lessons.tides = 'text'),
    ],
  ]
);
add(
  'instructor-flow-2',
  'gravitas.instructor-flow',
  2,
  {
    format: 'gravitas.instructor-flow',
    formatVersion: 2,
    lessons: {
      tides: [{ from: 'guess', to: 'check', text: 'Predict, then check.' }],
    },
  },
  d => readFlow(d, steps).ok,
  [
    ['fine', 'no lessons', d => (d.lessons = {})],
    [
      'both',
      'another format',
      d => (d.format = 'gravitas.instructor-expectations'),
    ],
    ['both', 'a later version', d => (d.formatVersion = 3)],
    [
      'lenient',
      'version 1, a block named by step numbers',
      d => (
        (d.formatVersion = 1),
        (d.lessons = {
          tides: [{ steps: '1-2', text: 'Predict, then check.' }],
        })
      ),
    ],
    [
      'lenient',
      'a block with no end step: the reader leaves the shape to the author check',
      d => delete d.lessons.tides[0].to,
    ],
  ]
);
const searchIndex = JSON.parse(
  readFileSync('library/search-index.json', 'utf8')
);
add(
  'library-search-1',
  'gravitas.library-search',
  1,
  {
    format: 'gravitas.library-search',
    formatVersion: 1,
    objectives: {
      'investigation:tides': {
        en: ['Explain the tides'],
        es: ['Explicar las mareas'],
      },
    },
  },
  null,
  [
    ['fine', 'no Spanish', d => delete d.objectives['investigation:tides'].es],
    bad('another format', d => (d.format = 'gravitas.library')),
    bad(
      'objectives that are not text',
      d => (d.objectives['investigation:tides'].en = [3])
    ),
    bad('no objectives', d => delete d.objectives),
  ]
);
const sun = JSON.parse(readFileSync('frames/sun-2024-05.json', 'utf8'));
add('sun-frames-1', 'gravitas.sun-frames', 1, sun, null, [
  bad('another format', d => (d.format = 'gravitas.image')),
  bad('a day with no picture digest', d => delete d.days[0].sha256),
  bad('a day with a date that is not one', d => (d.days[0].date = 'May 4')),
  bad('a mark on no day', d => delete d.marks.G1.marks[0].day),
  bad('no days', d => (d.days = [])),
]);

describe('the schemas the format audit added', () => {
  test('there are thirty-six, and each is a row of FORMATS.md that had no schema before Prompt 290', () => {
    expect(T.length).toBe(36);
    const rows = FORMATS.filter(f => T.some(t => t.rowName === f.name));
    expect(rows.length).toBe(36);
    for (const f of rows)
      expect(T.find(t => t.rowName === f.name).file + '.schema.json').toBe(
        f.schema
      );
  });

  test.each(T.map(t => [t.file, t]))(
    '%s is its row in FORMATS.md',
    (_file, t) => {
      isItsRow(t.file, t.name, t.version, t.rowName);
    }
  );

  test.each(T.map(t => [t.file, t]))(
    '%s is held to its reader (or its writer)',
    async (_file, t) => {
      await check(schemaOf(t.file), t.good, t.accepts, t.cases);
    }
  );

  test('every frames file the repository holds fits the planes schema', () => {
    const s = schemaOf('image-pack-planes-1');
    const files = readdirSync('frames').filter(f => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const d = JSON.parse(readFileSync(`frames/${f}`, 'utf8'));
      if (d.format === 'gravitas.image-pack-planes')
        expect({ f, fits: valid(s, d) }).toEqual({ f, fits: true });
    }
  });

  test('the repository data fits the schemas of the formats the first inventory missed', () => {
    expect(valid(schemaOf('instructor-expectations-2'), EXPECTATIONS)).toBe(
      true
    );
    expect(valid(schemaOf('instructor-flow-2'), FLOW)).toBe(true);
    expect(valid(schemaOf('library-search-1'), searchIndex)).toBe(true);
    expect(valid(schemaOf('sun-frames-1'), sun)).toBe(true);
  });

  test('both ephemeris packs the repository holds fit the ephemeris schema', () => {
    const s = schemaOf('ephemeris-pack-1');
    for (const f of readdirSync('ephemeris-packs').filter(f =>
      f.endsWith('.json')
    ))
      expect({
        f,
        fits: valid(
          s,
          JSON.parse(readFileSync(`ephemeris-packs/${f}`, 'utf8'))
        ),
      }).toEqual({ f, fits: true });
  });

  test('the archive writer refuses the paths the archive schema refuses', () => {
    for (const path of ['/etc/passwd', '../outside', 'a b'])
      expect(() =>
        packArchive({
          'gravitas-extension.json': Buffer.from('{}'),
          [path]: Buffer.from('x'),
        })
      ).toThrow();
  });

  beforeEach(() => globalThis.localStorage.clear());
});
