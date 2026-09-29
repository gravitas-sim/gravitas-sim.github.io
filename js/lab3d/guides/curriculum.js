// =============================================================================
// The 3-D orbital curriculum: four guided investigations in the 3-D lab
// -----------------------------------------------------------------------------
// Why a 3-D lab at all (LAB3D_CURRICULUM.md): four things a flat model
// cannot hold, each measured in /3d/ with the lab's own instruments.
//
//   l3-planes   an orbit's plane: inclination and nodes, and what a view
//               from above does to its shape
//   l3-eclipse  seen from outside: whether an orbit eclipses its star is a
//               matter of fractions of a degree, and a drawn size can lie
//   l3-mutual   two orbits' planes: equal inclinations need not be the same
//               plane, and when a flat model is still good enough
//   l3-kozai    a hierarchical triple: a distant perturber trades the inner
//               orbit's inclination for eccentricity while one combination
//               of the two stays put (the Kozai-Lidov cycle, validated as R6)
//
// Every number a step checks is worked out from the lab's own state, the
// newest snapshot the tables show (js/lab3d/snapshot.js exactFrame), by the
// instruments the reader uses (js/lab3d/view/instruments.js). Nothing is
// read from lesson prose, and nothing is adopted from the literature. The
// systems are the kernel's validated reference problems (R1, R3, R6), or
// ones made here from orbital elements, once, and then run as numbers.
//
// A step is `path: 'both'` or `'advanced'`, as in the Observatory's suites.
// Its words are `gd.<guide>.<step>.title`, `.text`, `.ok` and `.no`, and a
// choice's options `.opt.<option>`, in js/i18n/{en,es}.lab3dGuides.js. The
// runner is js/lab3d/view/guidePanel.js; tests/lab3dGuides.test.js checks
// every step against these rules and every answer against a reference run.
// =============================================================================

import { fromElements } from '../elements.js';
import { FORMAT } from '../state.js';
import {
  between,
  elementsAbout,
  hierarchy,
  kozaiOf,
} from '../view/instruments.js';

export const CURRICULUM_VERSION = '1.0.0';
const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;

/** The eclipse systems' star and planet, in code units (a = 1). */
export const STAR_RADIUS = 0.005;
export const PLANET_RADIUS = 0.0005;
/** Below this mutual inclination a distant perturber raises no Kozai cycle. */
export const KOZAI_CRITICAL = Math.acos(Math.sqrt(3 / 5)) / DEG;

const code = (bodies, integrator) => ({
  format: FORMAT,
  formatVersion: 1,
  units: 'code',
  integrator,
  t: 0,
  bodies,
  provenance: { from: 'js/lab3d/guides/curriculum.js' },
});

/**
 * A star and a planet on a circular orbit of radius 1, tilted by `tilt`
 * degrees about the x axis from the reference plane. Seen along the
 * reference plane from -y (the lab's "along the reference plane" look), the
 * planet passes the star a quarter of an orbit after the start, and its
 * smallest separation on the sky is sin(tilt).
 */
function tilted(tilt) {
  const mu = 1 + 1e-6;
  // Starting on the far side (true anomaly 180°), so the reader sees the
  // planet come round to the near side.
  const r = fromElements(
    { a: 1, e: 0, i: tilt * DEG, Omega: 0, omega: 0, M: Math.PI },
    mu
  );
  return code(
    [
      {
        id: 'star',
        name: 'Star',
        m: 1,
        radius: STAR_RADIUS,
        x: [0, 0, 0],
        v: [0, 0, 0],
      },
      {
        id: 'planet',
        name: 'Planet',
        m: 1e-6,
        radius: PLANET_RADIUS,
        x: r.x,
        v: r.v,
      },
    ],
    { scheme: 'yoshida4c', h: TAU / 4000 }
  );
}

/**
 * Two light planets with the same inclination, 10°, and nodes 90° apart:
 * their planes are not the same, and the angle between them is 14.1°.
 */
function sameTilt() {
  const b = fromElements(
    { a: 1, e: 0, i: 10 * DEG, Omega: 0, omega: 0, M: 0 },
    1 + 1e-5
  );
  const c = fromElements(
    { a: 2.2, e: 0, i: 10 * DEG, Omega: 90 * DEG, omega: 0, M: 2 },
    1 + 1e-5
  );
  return code(
    [
      { id: 'star', name: 'Star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] },
      { id: 'b', name: 'Planet b', m: 1e-5, radius: 0, x: b.x, v: b.v },
      { id: 'c', name: 'Planet c', m: 1e-5, radius: 0, x: c.x, v: c.v },
    ],
    { scheme: 'yoshida4c', h: TAU / 4000 }
  );
}

/**
 * What the guides open: a reference problem by its id, or a system made
 * here. `systems` is what the page adds to its list for a guide.
 */
export const TARGETS = {
  R1: { reference: 'R1' },
  R3: { reference: 'R3' },
  // The inner orbit's period is 2 pi: a tick of 1/40 of it draws the orbit
  // coarsely and brings the first eccentricity peak (t = 28,800) about 12 s
  // away at x256. The tick only samples: DOPRI5 chooses its own steps.
  R6: { reference: 'R6', interval: TAU / 40 },
  'tilt-0': { make: () => tilted(0) },
  'tilt-02': { make: () => tilted(0.2) },
  'tilt-05': { make: () => tilted(0.5) },
  'same-tilt': { make: sameTilt },
};

// --- Reading the lab ----------------------------------------------------------------

const deg = r => r / DEG;
/** An angle that goes all the way round, on [0°, 360°). */
const turn = r => ((deg(r) % 360) + 360) % 360;

/** A frame's body index by id, in the system the frame came from. */
const idx = (f, id) => (f ? f.ids.indexOf(id) : -1);

/** A body's osculating elements about its primary, in a frame. */
function orbitOf(f, id, G) {
  const i = idx(f, id);
  if (i < 0 || !f.alive[i]) return null;
  const p = hierarchy(f).primary[i];
  return p < 0 ? null : elementsAbout(f, i, p, G);
}

/**
 * The answer context, from the lab (js/lab3dLab.js labApi) and the guide's
 * record of the moments a reader kept:
 *
 *   c.now(target)       the frame the tables show, if `target` is open
 *   c.recorded(step)    the frame kept at a record step, with its system
 *   c.G                 the gravitational constant of the system open
 *   c.state             the page's choices (labApi.read())
 *
 * A frame here is {t, m, x, v, alive, ids, system}.
 */
export function context(lab, records = {}) {
  const state = lab.read();
  const current = lab.exact();
  const G = lab.G();
  return {
    state,
    G,
    now: target =>
      target && state.system !== target
        ? null
        : current && { ...current, ids: state.ids, system: state.system },
    recorded: step => records[step] ?? null,
  };
}

/** A record step's frame, taken from the lab now. */
export function record(lab) {
  const state = lab.read();
  const f = lab.exact();
  return f && { ...f, ids: state.ids, system: state.system, G: lab.G() };
}

// --- Checks -------------------------------------------------------------------------

/**
 * Does the lab hold what a `do` step asks for?
 *
 *   opened     the target is the system open
 *   look       it is, seen with a look preset
 *   frame      it is, in a frame (body:<id> names a body by id)
 *   size       it is, drawn at a body size
 *   tool       it is, with an instrument on the bodies named (a, b by id)
 *   played     it has been played for `orbits` of a body's orbit
 *   recorded   the step's moment was kept, of the target, and a quantity of
 *              it is at least `atLeast` (e of a body's orbit)
 */
export function evaluateCheck(check, c, step) {
  const s = c.state;
  if (check.target && s.system !== check.target) return false;
  const bodyValue = id => String(s.ids.indexOf(id));
  switch (check.kind) {
    case 'opened':
      return true;
    case 'look':
      return s.preset === check.preset;
    case 'frame':
      return check.frame.startsWith('body:')
        ? s.frame === `body:${bodyValue(check.frame.slice(5))}`
        : s.frame === check.frame;
    case 'size':
      return s.size === check.size;
    case 'tool':
      return (
        s.tool === check.tool &&
        (!check.a || s.a === bodyValue(check.a)) &&
        (!check.b || s.b === bodyValue(check.b))
      );
    case 'played': {
      const el = orbitOf(c.now(check.target), check.body, c.G);
      return Boolean(el?.period) && s.tau - s.t0 >= check.orbits * el.period;
    }
    case 'recorded': {
      const f = c.recorded(step.id);
      if (!f || f.system !== check.target) return false;
      if (!check.atLeast) return true;
      const el = orbitOf(f, check.body, f.G);
      return Boolean(el) && el[check.quantity] >= check.atLeast;
    }
    default:
      return false;
  }
}

// --- Answers ------------------------------------------------------------------------

/**
 * The expected answer to an `answer` step, from the context. Null means it
 * cannot be worked out yet (the system is not open, or the moment it reads
 * was not kept), and the step says what is missing.
 */
export const ANSWERS = {
  // l3-planes, on R1
  inclination: c => {
    const el = orbitOf(c.now('R1'), 'secondary', c.G);
    return el ? deg(el.i) : null;
  },
  node: c => {
    const el = orbitOf(c.now('R1'), 'secondary', c.G);
    return el ? turn(el.Omega) : null;
  },
  periapsis: c => {
    const el = orbitOf(c.now('R1'), 'secondary', c.G);
    return el ? turn(el.omega) : null;
  },
  // l3-eclipse: the smallest separation on the sky, in star radii, is
  // a sin(i) / R* for a circular orbit seen along its node line.
  impact05: c => impact(c.now('tilt-05'), c.G),
  impact02: c => impact(c.now('tilt-02'), c.G),
  critical: c => {
    const el = orbitOf(c.now(), 'planet', c.G);
    return el ? deg(Math.asin((STAR_RADIUS + PLANET_RADIUS) / el.a)) : null;
  },
  // l3-mutual
  inclinationB: c => {
    const el = orbitOf(c.now('same-tilt'), 'b', c.G);
    return el ? deg(el.i) : null;
  },
  inclinationC: c => {
    const el = orbitOf(c.now('same-tilt'), 'c', c.G);
    return el ? deg(el.i) : null;
  },
  mutualSameTilt: c => mutual(c.now('same-tilt'), 'b', 'c', c.G),
  mutualR3: c => mutual(c.now('R3'), 'inner', 'outer', c.G),
  // 1 - cos I: how much a flat model shortens the outer orbit's reach
  // across the line of nodes, as a fraction.
  flatError: c => {
    const I = mutual(c.now('R3'), 'inner', 'outer', c.G);
    return I === null ? null : 1 - Math.cos(I * DEG);
  },
  // l3-kozai, on R6: the particle's orbit about the star, i from the
  // reference plane, which is the perturber's orbital plane.
  e0: c => kozaiElement(c.recorded('start'), 'e'),
  i0: c => kozaiElement(c.recorded('start'), 'i'),
  ePeak: c => kozaiElement(c.recorded('peak'), 'e'),
  iPeak: c => kozaiElement(c.recorded('peak'), 'i'),
  k0: c => kozaiK(c.recorded('start')),
  kPeak: c => kozaiK(c.recorded('peak')),
  ePredicted: c => {
    const i = kozaiElement(c.recorded('start'), 'i');
    return i === null ? null : Math.sqrt(1 - (5 / 3) * Math.cos(i * DEG) ** 2);
  },
};

function impact(f, G) {
  const el = orbitOf(f, 'planet', G);
  return el ? (el.a * Math.sin(el.i)) / STAR_RADIUS : null;
}
function mutual(f, a, b, G) {
  if (!f) return null;
  const r = between(f, idx(f, a), idx(f, b), G);
  return r ? deg(r.angle) : null;
}
function kozaiElement(f, which) {
  const el = f && orbitOf(f, 'particle', f.G);
  if (!el) return null;
  return which === 'i' ? deg(el.i) : el.e;
}
function kozaiK(f) {
  return f ? kozaiOf(f, idx(f, 'particle'), f.G) : null;
}

/** The option a data-dependent choice accepts, from the same context. */
export const CORRECT = {
  eclipse05: c => {
    const b = ANSWERS.impact05(c);
    return b === null
      ? null
      : b < 1 + PLANET_RADIUS / STAR_RADIUS
        ? 'yes'
        : 'no';
  },
  eclipse02: c => {
    const b = ANSWERS.impact02(c);
    return b === null
      ? null
      : b < 1 + PLANET_RADIUS / STAR_RADIUS
        ? 'yes'
        : 'no';
  },
  // Drawn at ten times their radii, the two discs overlap on the screen at
  // conjunction when the smallest sky separation, a sin(i), is below ten
  // times the sum of the radii.
  appearsToCross: c => {
    const b = ANSWERS.impact05(c);
    if (b === null) return null;
    return b * STAR_RADIUS < 10 * (STAR_RADIUS + PLANET_RADIUS) ? 'yes' : 'no';
  },
  kozaiKept: c => {
    const a = kozaiK(c.recorded('start'));
    const b = kozaiK(c.recorded('peak'));
    return a === null || b === null
      ? null
      : Math.abs(b - a) < 0.02
        ? 'same'
        : 'different';
  },
};

// --- The investigations ---------------------------------------------------------------

/**
 * A `do` step's `go` is what its button does in the lab: open a target, set
 * controls. `check` says what the lab must hold. An `answer` step's `expect`
 * names an ANSWERS function, its tolerance and its unit's message; a
 * `choose` step's `correct` is an option, a CORRECT function ({answer}), or
 * null for a prediction a later step answers. A `record` step keeps the
 * moment the reader chooses, for answers that read it.
 */
export const GUIDES = [
  {
    id: 'l3-planes',
    minutes: { intro: 20, advanced: 30 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'predict-shape',
        kind: 'choose',
        path: 'both',
        options: ['same', 'narrower', 'circle'],
        correct: null,
      },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'R1', set: { preset: 'top', tool: 'none' } },
        check: { kind: 'look', target: 'R1', preset: 'top' },
      },
      {
        id: 'play',
        kind: 'do',
        path: 'both',
        go: { play: true },
        check: { kind: 'played', target: 'R1', body: 'secondary', orbits: 1 },
      },
      {
        id: 'shape',
        kind: 'choose',
        path: 'both',
        options: ['same', 'narrower', 'circle'],
        correct: 'narrower',
        answers: 'predict-shape',
      },
      {
        id: 'orbit-tool',
        kind: 'do',
        path: 'both',
        go: { set: { tool: 'elements', a: 'secondary' } },
        check: { kind: 'tool', target: 'R1', tool: 'elements', a: 'secondary' },
      },
      {
        id: 'inclination',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'inclination', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'node',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'node', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'edge-on',
        kind: 'do',
        path: 'both',
        go: { set: { preset: 'edgeOn', follow: 'secondary' } },
        check: { kind: 'look', target: 'R1', preset: 'edgeOn' },
      },
      {
        id: 'edge-shape',
        kind: 'choose',
        path: 'both',
        options: ['line', 'ellipse', 'circle'],
        correct: 'line',
      },
      {
        id: 'periapsis',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'periapsis', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'frame',
        kind: 'do',
        path: 'advanced',
        go: { set: { frame: 'body:primary' } },
        check: { kind: 'frame', target: 'R1', frame: 'body:primary' },
      },
      {
        id: 'frame-elements',
        kind: 'choose',
        path: 'advanced',
        options: ['unchanged', 'changed'],
        correct: 'unchanged',
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-eclipse',
    minutes: { intro: 25, advanced: 35 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open-flat',
        kind: 'do',
        path: 'both',
        go: {
          open: 'tilt-0',
          set: { preset: 'side', tool: 'sky', a: 'star', b: 'planet' },
        },
        check: {
          kind: 'tool',
          target: 'tilt-0',
          tool: 'sky',
          a: 'star',
          b: 'planet',
        },
      },
      {
        id: 'predict',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: null,
      },
      {
        id: 'open-tilted',
        kind: 'do',
        path: 'both',
        go: {
          open: 'tilt-05',
          set: { preset: 'side', tool: 'elements', a: 'planet' },
        },
        check: {
          kind: 'tool',
          target: 'tilt-05',
          tool: 'elements',
          a: 'planet',
        },
      },
      {
        id: 'impact',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'impact05', tolerance: 0.02, unit: 'starRadii' },
      },
      {
        id: 'eclipses',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: { answer: 'eclipse05' },
        answers: 'predict',
      },
      {
        id: 'enlarged',
        kind: 'do',
        path: 'both',
        go: {
          set: {
            size: 'radius10',
            tool: 'sky',
            a: 'star',
            b: 'planet',
            speed: '0.25',
          },
          play: true,
        },
        check: { kind: 'played', target: 'tilt-05', body: 'planet', orbits: 1 },
      },
      {
        id: 'appears',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: { answer: 'appearsToCross' },
      },
      {
        id: 'open-slight',
        kind: 'do',
        path: 'both',
        go: {
          open: 'tilt-02',
          set: { preset: 'side', tool: 'elements', a: 'planet' },
        },
        check: {
          kind: 'tool',
          target: 'tilt-02',
          tool: 'elements',
          a: 'planet',
        },
      },
      {
        id: 'impact-slight',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'impact02', tolerance: 0.02, unit: 'starRadii' },
      },
      {
        id: 'eclipses-slight',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: { answer: 'eclipse02' },
      },
      {
        id: 'critical',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'critical', tolerance: 0.005, unit: 'deg' },
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-mutual',
    minutes: { intro: 20, advanced: 30 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: {
          open: 'same-tilt',
          set: { preset: 'oblique', tool: 'elements', a: 'b' },
        },
        check: { kind: 'tool', target: 'same-tilt', tool: 'elements', a: 'b' },
      },
      {
        id: 'inclination-b',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'inclinationB', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'inclination-c',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'inclinationC', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'predict',
        kind: 'choose',
        path: 'both',
        options: ['same', 'different'],
        correct: null,
      },
      {
        id: 'between',
        kind: 'do',
        path: 'both',
        go: { set: { tool: 'between', a: 'b', b: 'c' } },
        check: {
          kind: 'tool',
          target: 'same-tilt',
          tool: 'between',
          a: 'b',
          b: 'c',
        },
      },
      {
        id: 'mutual',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'mutualSameTilt', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'planes',
        kind: 'choose',
        path: 'both',
        options: ['same', 'different'],
        correct: 'different',
        answers: 'predict',
      },
      {
        id: 'formula',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'mutualSameTilt', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'open-r3',
        kind: 'do',
        path: 'both',
        go: { open: 'R3', set: { tool: 'between', a: 'inner', b: 'outer' } },
        check: {
          kind: 'tool',
          target: 'R3',
          tool: 'between',
          a: 'inner',
          b: 'outer',
        },
      },
      {
        id: 'mutual-r3',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'mutualR3', tolerance: 0.02, unit: 'deg' },
      },
      {
        id: 'flat-error',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'flatError', tolerance: 0.00002, unit: 'fraction' },
      },
      {
        id: 'flat-enough',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: 'yes',
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-kozai',
    minutes: { intro: 25, advanced: 35 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: {
          open: 'R6',
          set: { tool: 'elements', a: 'particle', follow: 'star' },
        },
        check: { kind: 'tool', target: 'R6', tool: 'elements', a: 'particle' },
      },
      {
        id: 'start',
        kind: 'do',
        path: 'both',
        record: true,
        check: { kind: 'recorded', target: 'R6' },
      },
      {
        id: 'e0',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'e0', tolerance: 0.002, unit: 'none' },
      },
      {
        id: 'i0',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'i0', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'predict',
        kind: 'choose',
        path: 'both',
        options: ['stays', 'returns', 'escapes'],
        correct: null,
      },
      {
        id: 'peak',
        kind: 'do',
        path: 'both',
        record: true,
        go: { set: { speed: '256' }, play: true },
        check: {
          kind: 'recorded',
          target: 'R6',
          body: 'particle',
          quantity: 'e',
          atLeast: 0.7,
        },
      },
      {
        id: 'e-peak',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'ePeak', tolerance: 0.002, unit: 'none' },
      },
      {
        id: 'i-peak',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'iPeak', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'outcome',
        kind: 'choose',
        path: 'both',
        options: ['stays', 'returns', 'escapes'],
        correct: 'returns',
        answers: 'predict',
      },
      {
        id: 'k-start',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'k0', tolerance: 0.005, unit: 'none' },
      },
      {
        id: 'k-peak',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'kPeak', tolerance: 0.005, unit: 'none' },
      },
      {
        id: 'kept',
        kind: 'choose',
        path: 'both',
        options: ['same', 'different'],
        correct: { answer: 'kozaiKept' },
      },
      {
        id: 'predicted',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'ePredicted', tolerance: 0.005, unit: 'none' },
      },
      {
        id: 'below-critical',
        kind: 'choose',
        path: 'advanced',
        options: ['cycles', 'none'],
        correct: 'none',
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
];

/** The option a `choose` step accepts: fixed, from the data, or none (a prediction). */
export function correctOption(step, c) {
  if (step.correct === null) return null;
  if (typeof step.correct === 'string') return step.correct;
  return CORRECT[step.correct.answer](c, step);
}

/** Everything the documents and tests read, as the Observatory's suites export it. */
export const SUITE = {
  id: 'lab3d',
  GUIDES,
  TARGETS,
  ANSWERS,
  CORRECT,
  version: CURRICULUM_VERSION,
};
