// =============================================================================
// The 3-D lab's curriculum II: instruments, reference planes, run modes and the
// five guides (Prompt 271, LAB3D_CURRICULUM_II.md)
// -----------------------------------------------------------------------------
// The committed thresholds, the pinned results and the independent oracle's
// pinned output are held to each other; the validator is run again in Node
// (Jest's VM makes a long integration slow) and must give the pinned numbers;
// the run-mode rule is tested step by step; and the instruments' own
// properties (the editor's round trip, orthonormal axes, the obliquity, the
// replay) are checked directly.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fromElements, toElements } from '../js/lab3d/elements.js';
import { gravityOf } from '../js/lab3d/state.js';
import { createLive } from '../js/lab3d/live.js';
import {
  MODES as RUN_MODES,
  createKeplerSession,
  createReplaySession,
  describeMode,
} from '../js/lab3d/runModes.js';
import {
  OBLIQUITY_J2000_DEG,
  editElements,
  elementsAbout,
  hierarchy,
  observerDirection,
  planeAxes,
} from '../js/lab3d/view/instruments.js';
import {
  GUIDES,
  MODES,
  TARGETS,
  WINDOW_ORBITS,
  modeProblem,
  stepMode,
} from '../js/lab3d/guides/curriculum.js';
import { meanObliquityDeg, J2000 } from '../js/kernels/sky/time.js';
import { EN_LAB3DGUIDES } from '../js/i18n/en.lab3dGuides.js';
import { ES_LAB3DGUIDES } from '../js/i18n/es.lab3dGuides.js';

const FIX = 'tests/fixtures/lab3d-curriculum-ii/';
const json = f => JSON.parse(readFileSync(FIX + f, 'utf8'));
const thresholds = json('thresholds.json');
const results = json('results.json');
const DEG = Math.PI / 180;

const NEW_GUIDES = [
  ['l3-elements', 'kepler'],
  ['l3-frames', 'kepler'],
  ['l3-seen', 'kepler'],
  ['l3-tilts', 'kepler'],
  ['l3-resonant', 'nbody'],
];

describe('the thresholds, the oracle and the pinned results', () => {
  const committed = [
    ...thresholds.legs,
    ...thresholds.amendments.flatMap(a => (a.leg ? [a.leg] : (a.legs ?? []))),
  ];
  test('every committed leg has a result, or is measured by another check', () => {
    const have = new Set(results.legs.map(l => l.id));
    const other = new Set(results.notMeasuredHere);
    for (const l of committed)
      expect(have.has(l.id) || other.has(l.id)).toBe(true);
    // Nothing is in the results that was never committed.
    for (const l of results.legs)
      expect(committed.some(c => c.id === l.id)).toBe(true);
  });
  test('the bound written beside a result is the committed one', () => {
    for (const l of results.legs) {
      const c = committed.find(q => q.id === l.id);
      expect(l.bound).toBe(c.bound);
      expect(l.what).toBe(c.what);
    }
  });
  test('every leg passes, but two that failed as committed and say why', () => {
    const failed = results.legs.filter(l => l.pass === false);
    expect(failed.map(l => l.id)).toEqual(['E2', 'E7']);
    for (const l of failed) {
      expect(l.status).toBe('failed, labelled');
      expect(l.label.length).toBeGreaterThan(40);
    }
    for (const l of results.legs)
      if (l.pass !== false) expect(l.pass === true || l.id === 'E8').toBe(true);
    // The legs added by amendment AM2 pass.
    for (const id of ['E2s', 'E4s', 'E7s'])
      expect(results.legs.find(l => l.id === id).pass).toBe(true);
  });
  test('the amendment is recorded and the first runs are kept', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    expect(results.history.map(h => h.leg)).toEqual([
      'B4',
      'C1',
      'C3',
      'F3',
      'E2, E7',
    ]);
  });
  test('the oracle names itself and reads no repository code', () => {
    const source = readFileSync(FIX + 'oracle.py', 'utf8');
    expect(source).not.toMatch(
      /^[ \t]*(import|from)[ \t]+(js|gravitas|tools)\b/m
    );
    expect(json('oracle-results.json').oracle).toMatch(/^python3 -E, numpy/);
    expect(results.oracle).toBe(json('oracle-results.json').oracle);
  });
  test('no home path in a fixture', () => {
    for (const f of [
      'thresholds.json',
      'results.json',
      'oracle.py',
      'oracle-results.json',
    ])
      expect(readFileSync(FIX + f, 'utf8')).not.toMatch(/\/Users\/|\/home\//);
  });
  test('the validator, run again in Node, gives the pinned numbers', () => {
    let out;
    try {
      out = execFileSync(
        process.execPath,
        ['tools/lab3d-curriculum-ii-validate.mjs'],
        {
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      );
    } catch (err) {
      out = err.stdout; // exit 1 when a leg fails, as two do, labelled
    }
    const rows = Object.fromEntries(
      out
        .split('\n')
        .filter(l => /^[A-H]\d/.test(l))
        .map(l => {
          const [id, status, measured] = l.split('\t');
          return [id, { status, measured: JSON.parse(measured) }];
        })
    );
    for (const l of results.legs) {
      expect(rows[l.id]).toBeDefined();
      expect(rows[l.id].status).toBe(
        l.pass === null ? 'reported' : l.pass ? 'pass' : 'FAIL'
      );
      expect(rows[l.id].measured).toEqual(l.measured);
    }
  }, 120000);
});

describe('the five guides and their run modes', () => {
  test('each guide, its mode, its depths', () => {
    for (const [id, mode] of NEW_GUIDES) {
      const g = GUIDES.find(q => q.id === id);
      expect(g).toBeDefined();
      expect(g.mode).toBe(mode);
      expect(g.depths).toEqual(['core', 'advanced']);
    }
    expect(GUIDES.map(g => g.id)).toEqual([
      'l3-planes',
      'l3-eclipse',
      'l3-mutual',
      'l3-kozai',
      ...NEW_GUIDES.map(g => g[0]),
    ]);
  });
  test('titles in both languages', () => {
    expect(NEW_GUIDES.map(([id]) => EN_LAB3DGUIDES[`gd.${id}.title`])).toEqual([
      'The language of orbits',
      'Changing frames',
      'Seen from here',
      'Mutual inclinations',
      'Resonant pairs',
    ]);
    for (const [id] of NEW_GUIDES)
      expect(ES_LAB3DGUIDES[`gd.${id}.title`]).toBeTruthy();
  });
  test('the Spanish keeps every placeholder of the English', () => {
    for (const [k, v] of Object.entries(EN_LAB3DGUIDES)) {
      const a = (v.match(/\{\w+\}/g) || []).sort().join();
      const b = (ES_LAB3DGUIDES[k].match(/\{\w+\}/g) || []).sort().join();
      expect([k, b]).toEqual([k, a]);
    }
  });
  test('the three runner messages for a run mode are in both languages', () => {
    for (const k of [
      'g3.modeLine',
      'g3.mode.kepler',
      'g3.mode.nbody',
      'g3.mode.precomputed',
      'g3.mode.undeclared',
      'g3.mode.needsKepler',
      'g3.mode.needsNbody',
      'g3.mode.needsPrecomputed',
    ]) {
      expect(EN_LAB3DGUIDES[k]).toBeTruthy();
      expect(ES_LAB3DGUIDES[k]).toBeTruthy();
    }
  });
  test('a libration is never a Kepler-only task', () => {
    const nbodyAnswers = [
      'phiAmplitude',
      'phiPeriod',
      'windowPeriods',
      'mutualR6start',
      'mutualR6peak',
      'ePredicted',
    ];
    const resonant = GUIDES.find(g => g.id === 'l3-resonant');
    for (const g of GUIDES)
      for (const s of g.steps) {
        const phi = s.check?.quantity === 'phi';
        const named =
          nbodyAnswers.includes(s.expect?.answer) ||
          nbodyAnswers.includes(s.correct?.answer) ||
          s.correct?.answer === 'libration' ||
          s.correct?.answer === 'kozaiKept';
        if (
          phi ||
          named ||
          (s.check?.kind === 'played' && g === resonant && !s.mode)
        )
          expect([g.id, s.id, stepMode(g, s)]).toEqual([g.id, s.id, 'nbody']);
      }
    // The resonant guide's only Kepler steps are the ones that show the absence.
    expect(
      resonant.steps
        .filter(s => stepMode(resonant, s) === 'kepler')
        .map(s => s.id)
    ).toEqual(['kepler-open', 'kepler-phi', 'why']);
    expect(EN_LAB3DGUIDES['gd.l3-resonant.intro.text']).toContain(
      String(WINDOW_ORBITS)
    );
  });
  test('the guide and mode table', () => {
    const table = GUIDES.map(g => [
      g.id,
      g.mode,
      [
        ...new Set(
          g.steps.filter(s => s.kind !== 'read').map(s => stepMode(g, s))
        ),
      ]
        .sort()
        .join('+'),
    ]);
    expect(table.slice(4)).toEqual([
      ['l3-elements', 'kepler', 'kepler'],
      ['l3-frames', 'kepler', 'kepler'],
      ['l3-seen', 'kepler', 'kepler'],
      ['l3-tilts', 'kepler', 'kepler+nbody'],
      ['l3-resonant', 'nbody', 'kepler+nbody'],
    ]);
  });
});

describe('the lab enforces the mode a step declares', () => {
  test('every step names a mode, and the modes are the runner’s', () => {
    expect([...MODES].sort()).toEqual([...RUN_MODES].sort());
    for (const g of GUIDES)
      for (const s of g.steps) expect(MODES).toContain(stepMode(g, s));
  });
  test('an N-body step cannot run in Kepler-only mode', () => {
    let n = 0;
    for (const g of GUIDES)
      for (const s of g.steps) {
        if (s.kind === 'read' || stepMode(g, s) !== 'nbody') continue;
        n++;
        expect(modeProblem(g, s, 'kepler')).toBe('needsNbody');
        expect(modeProblem(g, s, 'nbody')).toBeNull();
        expect(modeProblem(g, s, 'precomputed')).toBe('needsNbody');
      }
    expect(n).toBeGreaterThan(20);
  });
  test('a Kepler step cannot run in an N-body lab, and a reading step runs anywhere', () => {
    for (const g of GUIDES)
      for (const s of g.steps) {
        if (stepMode(g, s) === 'kepler' && s.kind !== 'read') {
          expect(modeProblem(g, s, 'nbody')).toBe('needsKepler');
          expect(modeProblem(g, s, 'kepler')).toBeNull();
        }
        if (s.kind === 'read')
          for (const m of MODES) expect(modeProblem(g, s, m)).toBeNull();
      }
  });
  test('a step with no declared mode is refused whatever the lab runs', () => {
    for (const m of MODES)
      expect(modeProblem({ id: 'g' }, { id: 's', kind: 'do' }, m)).toBe(
        'undeclared'
      );
  });
  test('the mode indicator names the integrator and the step', () => {
    const sys = TARGETS['res-21'].make();
    expect(describeMode('nbody', sys, { interval: 0.1 })).toEqual({
      mode: 'nbody',
      scheme: 'yoshida4c',
      step: sys.integrator.h,
      tolerance: null,
      interval: 0.1,
    });
    expect(describeMode('kepler', sys, { interval: 0.1 })).toEqual({
      mode: 'kepler',
      interval: 0.1,
    });
    expect(
      describeMode('precomputed', sys, {
        interval: 0.1,
        provenance: { from: 'x' },
      }).provenance
    ).toEqual({
      from: 'x',
    });
  });
});

const frameOf = sys => ({
  m: Float64Array.from(sys.bodies, b => b.m),
  x: Float64Array.from(sys.bodies.flatMap(b => b.x)),
  v: Float64Array.from(sys.bodies.flatMap(b => b.v)),
  alive: Uint8Array.from(sys.bodies, () => 1),
});

describe('the Kepler-only and precomputed sessions', () => {
  test('a Kepler-only run holds every orbit fixed, which is why it cannot show libration', () => {
    const sys = TARGETS['res-21'].make();
    const G = gravityOf(sys);
    const sess = createKeplerSession(sys, {
      interval: TARGETS['res-21'].interval,
    });
    const read = snap => {
      const f = { m: snap.m, x: snap.x, v: snap.v, alive: snap.alive };
      return [1, 2].map(i => elementsAbout(f, i, 0, G));
    };
    const before = read(sess.first);
    let snap;
    for (let k = 0; k < 4; k++) snap = sess.advanceNow(250);
    const after = read(snap);
    for (const i of [0, 1]) {
      expect(Math.abs(after[i].a - before[i].a) / before[i].a).toBeLessThan(
        1e-11
      );
      expect(Math.abs(after[i].e - before[i].e)).toBeLessThan(1e-11);
      expect(Math.abs(after[i].i - before[i].i)).toBeLessThan(1e-11);
    }
    expect(snap.warnings.length + sess.first.warnings.length).toBe(1);
  });
  test('a replay reproduces a recorded N-body run, bit for bit', async () => {
    const sys = TARGETS['el-start'].make();
    const interval = (2 * Math.PI) / 400;
    const session = createLive(sys, { interval }).session;
    const snaps = [session.now()];
    for (let k = 0; k < 20; k++) snaps.push(session.advance(1));
    const rep = createReplaySession({
      ids: snaps[0].ids,
      m: snaps[0].m,
      radius: snaps[0].radius,
      t0: snaps[0].t,
      interval,
      x: snaps.map(s => s.x),
      v: snaps.map(s => s.v),
    });
    const got = await rep.advance(20);
    snaps.at(-1).x.forEach((c, i) => expect(Object.is(c, got.x[i])).toBe(true));
    snaps.at(-1).v.forEach((c, i) => expect(Object.is(c, got.v[i])).toBe(true));
    expect(got.status).toBe('precomputedEnd');
  });
});

describe('the element editor and the planes', () => {
  test('elements to state to elements, every field', () => {
    let seed = 7;
    const r = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let k = 0; k < 300; k++) {
      const el = {
        a: 0.5 + 2.5 * r(),
        e: 0.02 + 0.88 * r(),
        i: (1 + 178 * r()) * DEG,
        Omega: (r() - 0.5) * 2 * Math.PI,
        omega: (r() - 0.5) * 2 * Math.PI,
        M: (r() - 0.5) * 2 * Math.PI,
      };
      const s = fromElements(el, 1.0003);
      const b = toElements(s.x, s.v, 1.0003);
      const lim = 1e-11 / (1 - el.e);
      expect(Math.abs(b.a - el.a) / el.a).toBeLessThan(lim);
      expect(Math.abs(b.e - el.e)).toBeLessThan(lim);
      for (const q of ['i', 'Omega', 'omega', 'M']) {
        const d = b[q] - el[q];
        expect(
          Math.abs(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)))
        ).toBeLessThan(1e-9);
      }
    }
  });
  test('an edit with no field is the system itself; a refusal changes nothing', () => {
    const sys = TARGETS['el-start'].make();
    const G = gravityOf(sys);
    expect(editElements(sys, 1, {}, G)).toBe(sys);
    const before = JSON.stringify(sys);
    for (const [edit, code] of [
      [{ e: 1 }, 'parabolic'],
      [{ a: -1 }, 'ellipseAxis'],
      [{ i: 181 }, 'inclination'],
      [{ a: NaN }, 'notFinite'],
    ])
      expect(() => editElements(sys, 1, edit, G)).toThrow(
        expect.objectContaining({ code })
      );
    expect(() => editElements(sys, 0, { a: 2 }, G)).toThrow(
      expect.objectContaining({ code: 'noPrimary' })
    );
    expect(JSON.stringify(sys)).toBe(before);
  });
  test('an edit moves the one body and leaves the other bit for bit', () => {
    const sys = TARGETS['mutual-two'].make();
    const out = editElements(sys, 1, { i: 20 }, gravityOf(sys));
    expect(JSON.stringify(out.bodies[0])).toBe(JSON.stringify(sys.bodies[0]));
    expect(JSON.stringify(out.bodies[2])).toBe(JSON.stringify(sys.bodies[2]));
    const e = elementsAbout(frameOf(out), 1, 0, gravityOf(sys));
    expect(e.i / DEG).toBeCloseTo(20, 9);
  });
  test('the obliquity is the sky kernel’s own', () => {
    expect(
      Math.abs(OBLIQUITY_J2000_DEG - meanObliquityDeg(J2000))
    ).toBeLessThan(1e-12);
  });
  test('every plane’s axes are orthonormal and right-handed, observers up to the poles', () => {
    const f = frameOf(TARGETS['frames-solar'].make());
    const planes = [
      planeAxes('equatorial', f, { units: 'solar' }),
      planeAxes('invariable', f, { units: 'solar' }),
    ];
    for (let el = -90; el <= 90; el += 7.5)
      for (let az = -180; az <= 180; az += 30)
        planes.push(planeAxes('sky', f, { observer: { az, el } }));
    planes.push(planeAxes('sky', f, { observer: { az: 40, el: 89.999999 } }));
    for (const R of planes) {
      const det =
        R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
        R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
        R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
      expect(Math.abs(det - 1)).toBeLessThan(1e-14);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const d = R[i][0] * R[j][0] + R[i][1] * R[j][1] + R[i][2] * R[j][2];
          expect(Math.abs(d - (i === j ? 1 : 0))).toBeLessThan(1e-14);
        }
    }
  });
  test('the sky’s +z points at the observer', () => {
    for (const o of [
      { az: 30, el: 45 },
      { az: -90, el: 0 },
      { az: 200, el: -20 },
    ]) {
      const R = planeAxes('sky', {}, { observer: o });
      const d = observerDirection(o);
      for (let k = 0; k < 3; k++) expect(R[2][k]).toBeCloseTo(d[k], 14);
    }
  });
  test('the hierarchy the editor reads: the star is nobody’s child, the planets are its', () => {
    const f = frameOf(TARGETS['res-21'].make());
    expect(hierarchy(f).primary).toEqual([-1, 0, 0]);
  });
});
