// =============================================================================
// The image marks instrument against the gate's thresholds (Prompt 179)
// -----------------------------------------------------------------------------
// IMAGE_MEASUREMENT_GATE.md (D-R10-48, ede242a2) fixed the thresholds before the
// prototype existed. tools/image-marks-validate.mjs runs them against the
// production modules in js/measure/ in plain Node (Jest's VM makes Math and
// Float64Array reads about ten times slower, so a 300-source ensemble run here
// would measure the harness); this file runs it, holds every row to the gate's
// own THRESHOLDS, and adds the cases that need no pixels: the display-only
// refusal, the scale, the record's shape, the saved field and the 2.0.0 reader.
// Nothing here is an exact float: Node 20 and 24 differ in the last bits of
// Math.log, exp, cos and sin, so only bands, counts and equalities are judged.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { THRESHOLDS } from '../tools/image-measure-gate.mjs';
import {
  areaOf,
  lengthOf,
  scaleOf,
  sizeOf,
  timeOf,
} from '../js/measure/scale.js';
import {
  ARITY,
  PLACE_SIGMA,
  createStore,
  edit,
  emptyState,
  missingTags,
  nudge,
  place,
  remove,
} from '../js/measure/marks.js';
import {
  LIMITS,
  MARKS_FORMAT,
  marksBlock,
  validateMarks,
} from '../js/measure/imageRecord.js';
import { permits, wcsUnusable } from '../js/dataKinds/contract.js';
import { pixelScale, unusableWcs } from '../js/observatory/wcs.js';
import { observationJson } from '../js/observatory/export.js';
import {
  SETTLE_MS,
  nudgeScale as panelNudge,
} from '../js/observatory/imageMarks.js';
import { nudgeScale } from '../js/shortcuts.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

const ROOT = path.resolve(import.meta.dirname, '..');
const sidecar = use => ({
  ...JSON.parse(
    readFileSync(
      path.join(
        ROOT,
        'tests/fixtures/dataKinds/image-tess-hd209458-aperture.json'
      ),
      'utf8'
    )
  ),
  use,
});

// ---- the gate's thresholds, as rows -------------------------------------------

describe('the gate thresholds hold for the production modules', () => {
  const run = execFileSync(
    process.execPath,
    [path.join(ROOT, 'tools/image-marks-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(run);
  const P = THRESHOLDS.precision;

  test('every row passes (the tool exits 0 only then)', () => {
    for (const [id, row] of Object.entries(rows))
      expect({ id, status: row.status }).toEqual({ id, status: 'pass' });
  });

  test('T2 point sources: 300 sources, the 95th percentile under the gate bound, all refined', () => {
    const r = rows['T2.point'];
    expect(r.bound.p95).toBe(P.pointP95);
    expect(r.n).toBe(P.points);
    expect(r.p95).toBeLessThanOrEqual(P.pointP95);
    expect(r.max).toBeLessThanOrEqual(P.captureRadius);
    expect(Object.keys(r.refused)).toEqual([]);
  });

  test('T2 circles: 150 discs, the 95th percentile of the relative radius error under the gate bound', () => {
    const r = rows['T2.circle'];
    expect(r.bound.p95).toBe(P.circleP95);
    expect(r.n).toBe(P.circles);
    expect(r.p95).toBeLessThanOrEqual(P.circleP95);
    // Refusals are allowed, in their own words, and few: a refused disc is not an error.
    const refused = Object.values(r.refused).reduce((a, b) => a + b, 0);
    expect(refused).toBeLessThanOrEqual(P.circles * 0.05);
  });

  test('the instrument refuses where it cannot do better, for the right reason', () => {
    const r = rows.refusals;
    expect(r.edge).toBe('edge');
    expect(r.flat).toBe('flat');
    expect(r.limbLeavesFrame).toBe('touches-frame');
    expect(r.farFromAnySource).toBe('no-flux');
  });

  test('T5 undo restores every state, and the same inputs give the same marks', () => {
    expect(rows['T5.undo'].failures).toBe(0);
    expect(rows['T5.undo'].stateComparisons).toBeGreaterThan(8000);
    expect(rows['T5.determinism'].mismatches).toBe(0);
    expect(rows['T5.determinism'].freshModuleInstance).toBe(true);
    expect(rows['T5.determinism'].repeats).toBeGreaterThanOrEqual(10);
  });

  test('T4 the record validates as an artifact, carries the scale, replays bit-identically and refuses a changed image', () => {
    expect(rows['T4.record'].validateArtifactProblems).toBe(0);
    expect(rows['T4.record'].quantities).toBeGreaterThanOrEqual(20);
    const s = rows['T4.record'].scale;
    expect(Math.abs(s.value - s.truth)).toBeLessThanOrEqual(3 * s.sigma);
    expect(rows['T4.replay'].sameMarks).toBe(true);
    expect(rows['T4.replay'].refinementBitIdentical).toBe(true);
    expect(rows['T4.replay'].refusesChangedImage).toBe('image-changed');
    expect(rows['T4.sequence'].frames).toBeGreaterThanOrEqual(2);
  });
});

// ---- the scale, and what a display-only image allows ---------------------------

describe('what the panel writes out is what the registry says', () => {
  test("the nudge sizes are INTERACTION.md's, for every modifier", () => {
    for (const altKey of [false, true])
      for (const shiftKey of [false, true]) {
        const e = { altKey, shiftKey };
        expect(panelNudge(e)).toBe(nudgeScale(e));
      }
    expect([
      panelNudge({ altKey: true }),
      panelNudge({}),
      panelNudge({ shiftKey: true }),
    ]).toEqual([0.25, 1, 4]);
  });

  test('a run of nudges is said when it stops, after the settle time of js/interaction.js', () => {
    const src = readFileSync(path.join(ROOT, 'js/interaction.js'), 'utf8');
    expect(Number(/delay = (\d+)/.exec(src)[1])).toBe(SETTLE_MS);
  });
});

describe('the contract keeps its own copy of the WCS rule', () => {
  test("wcsUnusable answers as the Observatory page's unusableWcs does, case by case", () => {
    const good = sidecar('quantitative').wcs;
    const cases = [
      good,
      null,
      undefined,
      {},
      { ...good, ctype: ['RA---SIN', 'DEC--SIN'] },
      { ...good, ctype: undefined },
      { ...good, crpix: [1] },
      { ...good, crval: [NaN, 0] },
      { ...good, cd: undefined, cdelt: undefined, pc: undefined },
      {
        ...good,
        cd: undefined,
        cdelt: [1e-3, 1e-3],
        pc: [
          [1, 0],
          [0, 1],
        ],
      },
      { ...good, cd: undefined, cdelt: [1e-3, 1e-3] },
    ];
    for (const w of cases) expect(wcsUnusable(w)).toBe(unusableWcs(w));
    expect(cases.filter(w => wcsUnusable(w) === null)).toHaveLength(3);
  });
});

describe('scale, size and time', () => {
  const pairState = (L = 100, unit = 'km', sigmaL = 0) =>
    place(emptyState(), {
      kind: 'reference-pair',
      pts: [
        [10, 10],
        [10, 60],
      ],
      length: { value: L, unit, sigma: sigmaL },
    });

  test('a reference pair gives the scale in the stated unit, with both errors in quadrature', () => {
    const sc = scaleOf(pairState(100, 'km', 1));
    expect(sc.unit).toBe('km/pix');
    expect(sc.value).toBeCloseTo(2, 12);
    const rel = Math.hypot(1 / 100, (Math.SQRT2 * PLACE_SIGMA) / 50);
    expect(sc.sigma).toBeCloseTo(2 * rel, 12);
    expect(scaleOf(emptyState())).toBeNull();
  });

  test('a quantitative sidecar gives arcseconds per pixel; display-only refuses it in the contract words and a pair still works', () => {
    const q = sidecar('quantitative');
    const d = sidecar('display-only');
    const sc = scaleOf(emptyState(), { sidecar: q, pixelScale });
    expect(sc.unit).toBe('arcsec/pix');
    expect(Number.isFinite(sc.value) && sc.value > 0).toBe(true);
    expect(sc.sigma).toBeGreaterThanOrEqual(0);

    // Marking is allowed on a display-only image; the sky's scale is not.
    expect(permits(d, 'marking').ok).toBe(true);
    const refused = scaleOf(emptyState(), { sidecar: d, pixelScale });
    expect(refused.code).toBe('display-only');
    expect(refused.refused).toMatch(/display-only/);
    expect(refused.value).toBeUndefined();
    // A pair is the person's own measurement and needs no contract.
    const pair = scaleOf(pairState(56, 'mm'), { sidecar: d, pixelScale });
    expect(pair.unit).toBe('mm/pix');
    expect(pair.value).toBeCloseTo(56 / 50, 12);
  });

  test('size: radius and area, in pixels and, only with a scale, in the unit', () => {
    let s = place(emptyState(), {
      kind: 'circle',
      pts: [
        [50, 50],
        [80, 50],
      ],
    });
    s = place(s, {
      kind: 'polygon',
      pts: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    });
    const [c, g] = s.marks;
    expect(lengthOf(c)).toBe(30);
    expect(areaOf(g)).toBe(100);
    expect(sizeOf(c).phys).toBeUndefined();
    const sc = { value: 2, sigma: 0.1, unit: 'km/pix' };
    expect(sizeOf(c, sc).phys).toBe(60);
    expect(sizeOf(c, sc).unit).toBe('km');
    expect(sizeOf(g, sc).phys).toBe(400);
    expect(sizeOf(g, sc).unit).toBe('km^2');
    expect(lengthOf({ kind: 'point', pts: [[1, 1]] })).toBeNaN();
  });

  test('a time without its scale is not a time', () => {
    expect(timeOf({ value: 59000.5 })).toBeNull();
    expect(timeOf(null)).toBeNull();
    expect(timeOf({ value: 59000.5, scale: 'TDB' }).mjd).toBe(59000.5);
    expect(timeOf({ value: 2459000.5, scale: 'TT', format: 'jd' }).mjd).toBe(
      59000
    );
    expect(
      timeOf({ value: '1970-01-02T00:00:00', scale: 'UTC', format: 'iso' }).mjd
    ).toBe(40588);
    expect(timeOf({ value: 'x', scale: 'UTC' })).toBeNull();
  });
});

// ---- the model ---------------------------------------------------------------------

describe('marks, the store and the table', () => {
  test('every kind has its arity, a bad count is refused, and ids are never reused', () => {
    expect(ARITY).toEqual({
      point: 1,
      count: 1,
      segment: 2,
      'reference-pair': 2,
      circle: 2,
      polygon: 3,
    });
    expect(() =>
      place(emptyState(), { kind: 'segment', pts: [[1, 1]] })
    ).toThrow(/needs 2/);
    expect(() => place(emptyState(), { kind: 'blob', pts: [] })).toThrow(
      /unknown/
    );
    let s = place(emptyState(), { kind: 'point', pts: [[1, 2]], tag: 'a' });
    s = remove(s, 'm1');
    s = place(s, { kind: 'point', pts: [[3, 4]] });
    expect(s.marks.map(m => m.id)).toEqual(['m2']);
  });

  test('a nudge or an edit is a new state; undo and redo walk them; a run of nudges is one step', () => {
    const store = createStore();
    store.apply(place(store.state, { kind: 'point', pts: [[10, 10]] }));
    for (let i = 0; i < 5; i++)
      store.apply(nudge(store.state, 'm1', 0, 1, 0), 'run');
    store.seal();
    store.apply(edit(store.state, 'm1', { tag: 'star' }));
    expect(store.state.marks[0].pts[0]).toEqual([15, 10]);
    expect(store.depth.past).toBe(3);
    store.undo();
    expect(store.state.marks[0].tag).toBe('');
    store.undo();
    expect(store.state.marks[0].pts[0]).toEqual([10, 10]);
    store.redo();
    expect(store.state.marks[0].pts[0]).toEqual([15, 10]);
  });

  test('the tags marked in an earlier frame and missing from this one are listed', () => {
    let s = place(emptyState(), {
      kind: 'point',
      frame: 0,
      tag: 'a',
      pts: [[1, 1]],
    });
    s = place(s, { kind: 'point', frame: 0, tag: 'b', pts: [[2, 2]] });
    s = place(s, { kind: 'point', frame: 1, tag: 'a', pts: [[1, 1]] });
    expect(missingTags(s, 1)).toEqual(['b']);
    expect(missingTags(s, 0)).toEqual([]);
  });
});

// ---- the saved field and the 2.0.0 reader ---------------------------------------------

describe('workspace.marks', () => {
  const frame = {
    id: 'f',
    width: 8,
    height: 8,
    data: Float64Array.from({ length: 64 }, (_, i) => i),
  };
  const obs = {
    format: 'gravitas.observation',
    formatVersion: 1,
    id: 'f',
    kind: 'image',
    columns: [
      { id: 'v', name: 'counts', unit: 'count', role: 'value', values: [1, 2] },
    ],
  };
  const source = {
    id: 'f',
    source: { kind: 'builtin', id: 'f', version: null },
  };

  test('no marks, no block; a save without marks is the bytes it always was', async () => {
    expect(
      await marksBlock({ frames: [frame], state: emptyState() })
    ).toBeNull();
    const without = observationJson(obs, { source, changes: [] });
    expect(without).toBe(
      observationJson(obs, { source, changes: [], marks: null })
    );
    expect(JSON.parse(without).workspace.marks).toBeUndefined();
  });

  test('marks are written as gravitas.image-marks/1 and read back valid', async () => {
    let s = place(emptyState(), {
      kind: 'circle',
      pts: [
        [4, 4],
        [6, 4],
      ],
      tag: 'disc',
    });
    s = place(s, {
      kind: 'reference-pair',
      pts: [
        [1, 1],
        [1, 5],
      ],
      length: { value: 10, unit: 'mm', sigma: 0 },
    });
    const block = await marksBlock({ frames: [frame], state: s });
    expect(block.format).toBe(MARKS_FORMAT);
    expect(validateMarks(block)).toEqual([]);
    const text = observationJson(obs, { source, changes: [], marks: block });
    expect(JSON.parse(text).workspace.marks.marks).toHaveLength(2);
    expect(JSON.parse(text).workspace.marks.frames[0].digest).toMatch(
      /^[0-9a-f]{64}$/
    );
  });

  test('a block that is not well formed is refused, naming the path', async () => {
    const s = place(emptyState(), { kind: 'point', pts: [[2, 2]] });
    const ok = await marksBlock({ frames: [frame], state: s });
    const clone = () => JSON.parse(JSON.stringify(ok));
    expect(validateMarks(null)).toEqual(['format']);
    expect(validateMarks({ ...clone(), formatVersion: 2 })).toEqual(['format']);
    const badFrame = clone();
    badFrame.frames[0].digest = 'nope';
    expect(validateMarks(badFrame)).toEqual(['frames[0]']);
    const badKind = clone();
    badKind.marks[0].kind = 'blob';
    expect(validateMarks(badKind)).toEqual(['marks[0]']);
    const badPts = clone();
    badPts.marks[0].pts = [[1, NaN]];
    expect(validateMarks(badPts)).toEqual(['marks[0]']);
    const outside = clone();
    outside.marks[0].frame = 3;
    expect(validateMarks(outside)).toEqual(['marks[0]']);
    const dup = clone();
    dup.marks.push({ ...dup.marks[0] });
    expect(validateMarks(dup)).toEqual(['marks[1]']);
    const many = clone();
    many.marks = Array.from({ length: LIMITS.marks + 1 }, () => many.marks[0]);
    expect(validateMarks(many)).toEqual(['marks']);
  });

  test('the block nests deeper than the 2.0.0 file reader allows (six) and within the current one (eight)', async () => {
    const depth = v =>
      v && typeof v === 'object'
        ? 1 + Math.max(0, ...Object.values(v).map(depth))
        : 0;
    let s = place(emptyState(), { kind: 'point', pts: [[2, 2]] });
    s = {
      ...s,
      marks: s.marks.map(m => ({ ...m, refined: true, placed: m.pts })),
    };
    const block = await marksBlock({ frames: [frame], state: s });
    const doc = JSON.parse(
      observationJson(obs, { source, changes: [], marks: block })
    );
    expect(depth(doc)).toBeGreaterThan(6);
    expect(depth(doc)).toBeLessThanOrEqual(8);
    // The current reader's limit, from the source that sets it.
    const src = readFileSync(
      path.join(ROOT, 'js/observatory/import.js'),
      'utf8'
    );
    expect(src).toMatch(/depth: 8,/);
  });
});
