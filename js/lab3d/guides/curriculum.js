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
// Curriculum II (Prompt 271) adds five more, each naming the run mode its task
// needs (a Kepler-only run holds every orbit fixed, so it cannot show
// libration or tilt exchange; those steps declare the N-body integrator):
//
//   l3-elements  the six elements one by one, each changed and seen   kepler
//   l3-frames    one orbit in three reference planes                  kepler
//   l3-seen      an orbit as an observer sees it: sky ellipse, transit kepler
//   l3-tilts     two planets' mutual inclination; Kozai revisited     kepler, nbody
//   l3-resonant  a 2:1 pair's resonant argument librates              nbody
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
import { FORMAT, gravityOf } from '../state.js';
import {
  apparentEllipse,
  between,
  editElements,
  elementsAbout,
  hierarchy,
  kozaiOf,
  planeAxes,
  reorient,
  resonantArgument,
  transitOf,
} from '../view/instruments.js';

export const CURRICULUM_VERSION = '1.1.0';

/**
 * The run modes a step may declare (js/lab3d/runModes.js): the physical mode
 * its task needs. A mode that cannot show a thing must not be asked to, so a
 * step's mode must be the lab's mode to be checked (`modeProblem`).
 */
export const MODES = ['kepler', 'nbody', 'precomputed'];
const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;

/** The answer kinds a step's `unit` names (the runner's `g3.unit.*` words), not units of the registry. */
const ANSWER_UNIT = Object.freeze({ none: 'none', starRadii: 'starRadii' });

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

// --- The systems of curriculum II ---------------------------------------------------
//
// All made from orbital elements, once, and run as numbers. The solar-unit
// ones are invented (no named body), so no published number stands behind
// them: their elements are the numbers written here.

const solar = (bodies, h) => ({
  format: FORMAT,
  formatVersion: 1,
  units: 'solar',
  integrator: { scheme: 'yoshida4c', h },
  t: 0,
  bodies,
  provenance: { from: 'js/lab3d/guides/curriculum.js' },
});

/** A body from elements about a primary at the origin, at rest. */
const placed = (id, name, m, radius, elements, mu) => {
  const r = fromElements(elements, mu);
  return { id, name, m, radius, x: r.x, v: r.v };
};
const star = (m = 1, radius = 0) => ({
  id: 'star',
  name: 'Star',
  m,
  radius,
  x: [0, 0, 0],
  v: [0, 0, 0],
});
const orbit = (a, e, i, O, w, M) => ({
  a,
  e,
  i: i * DEG,
  Omega: O * DEG,
  omega: w * DEG,
  M: M * DEG,
});

/** The one orbit the editor is learned on: a = 1, e = 0.3, tilted, M = 90 degrees. */
function elementsStart() {
  const m = 1e-6;
  return code(
    [
      star(),
      placed('planet', 'Planet', m, 0, orbit(1, 0.3, 20, 40, 70, 90), 1 + m),
    ],
    { scheme: 'yoshida4c', h: TAU / 4000 }
  );
}

/**
 * Two invented planets about a Sun-mass star, in solar units: a light inner
 * one (3e-5 of the star) and a heavy outer one (1e-3), with different tilts
 * and nodes, so the invariable plane lies near the heavy one's.
 */
function framesSolar() {
  const G = gravityOf({ units: 'solar' });
  const mb = 3e-5;
  const mc = 1e-3;
  const period = a => TAU * Math.sqrt((a * a * a) / G);
  return solar(
    [
      star(),
      placed('b', 'Planet b', mb, 0, orbit(1, 0.1, 8, 40, 30, 0), G * (1 + mb)),
      placed(
        'c',
        'Planet c',
        mc,
        0,
        orbit(3, 0.05, 14, 110, 80, 0),
        G * (1 + mc)
      ),
    ],
    period(1) / 4000
  );
}

/**
 * Two stars, a mass of 1 and 0.5, on an orbit of a = 1 and e = 0.5 tilted 60
 * degrees: the apparent ellipse of a binary star's orbit.
 */
function seenBinary() {
  const m2 = 0.5;
  return code(
    [
      star(),
      placed(
        'companion',
        'Companion',
        m2,
        0,
        orbit(1, 0.5, 60, 30, 45, 40),
        1 + m2
      ),
    ],
    { scheme: 'yoshida4c', h: TAU / 4000 }
  );
}

/**
 * The eclipse systems' star and planet (radii as above) on an eccentric orbit
 * tilted a quarter of a degree from the reference plane, seen from -y with
 * periapsis at the conjunction: a transit. Moving periapsis to the other
 * side puts the conjunction at apoapsis, 1.3 times farther out, and loses it.
 */
function seenEclipse() {
  const m = 1e-6;
  return code(
    [
      star(1, STAR_RADIUS),
      placed(
        'planet',
        'Planet',
        m,
        PLANET_RADIUS,
        orbit(1, 0.3, 0.25, 0, 270, 270),
        1 + m
      ),
    ],
    { scheme: 'yoshida4c', h: TAU / 4000 }
  );
}

/**
 * Two planets, a light inner one at 10 degrees (node 0) and a heavy outer
 * one at 25 degrees (node 120): the angle between their planes is neither
 * the difference nor the sum of their tilts.
 */
function mutualTwo() {
  const mb = 3e-5;
  const mc = 1e-3;
  return code(
    [
      star(),
      placed('b', 'Planet b', mb, 0, orbit(1, 0.05, 10, 0, 20, 0), 1 + mb),
      placed('c', 'Planet c', mc, 0, orbit(2.5, 0.05, 25, 120, 60, 90), 1 + mc),
    ],
    { scheme: 'yoshida4c', h: TAU / 4000 }
  );
}

/**
 * Two planets of mass 3e-4 near the 2:1 resonance of their periods: the outer
 * on a circle at 2^(2/3) times the inner's distance, the inner on a slightly
 * eccentric orbit (e = 0.05), both starting on the +x axis with the inner at
 * periapsis, so the resonant argument starts at zero. The window the guide
 * states (WINDOW_ORBITS inner orbits) is five libration periods of this run.
 */
export const RESONANT_E = 0.05;
export const WINDOW_ORBITS = 600;
function resonant21() {
  const m = 3e-4;
  return code(
    [
      star(),
      placed(
        'b',
        'Inner planet',
        m,
        0,
        orbit(1, RESONANT_E, 0, 0, 0, 0),
        1 + m
      ),
      placed(
        'c',
        'Outer planet',
        m,
        0,
        orbit(Math.cbrt(4), 0, 0, 0, 0, 0),
        1 + m
      ),
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
  'el-start': { make: elementsStart },
  'frames-solar': { make: framesSolar },
  'seen-binary': { make: seenBinary },
  'seen-eclipse': { make: seenEclipse },
  'mutual-two': { make: mutualTwo },
  // 40 ticks an orbit of the inner planet: 600 orbits are 24,000 ticks, about
  // two seconds at x256, and a libration of 110 orbits is 4,400 ticks.
  'res-21': { make: resonant21, interval: TAU / 40 },
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
  const sys = lab.exactSystem?.();
  return {
    state,
    G,
    units: lab.origin?.()?.units ?? 'code',
    observer: lab.observer?.() ?? { az: -90, el: 0 },
    now: target =>
      target && state.system !== target
        ? null
        : current && { ...current, ids: state.ids, system: state.system },
    // The newest numbers in the system's own axes, whatever plane is shown:
    // an answer about a named plane turns them itself.
    sys: target =>
      target && state.system !== target
        ? null
        : sys && { ...sys, ids: state.ids, system: state.system },
    recorded: step => records[step] ?? null,
  };
}

/** A record step's frame, taken from the lab now, with the mode and plane it was kept in. */
export function record(lab) {
  const state = lab.read();
  const f = lab.exact();
  return (
    f && {
      ...f,
      ids: state.ids,
      system: state.system,
      G: lab.G(),
      mode: state.mode ?? 'nbody',
      units: lab.origin?.()?.units ?? 'code',
    }
  );
}

/**
 * Why a step cannot be checked in the lab's run mode, or null. A step's mode
 * is the guide's, unless the step names its own; a step that reads the lab
 * (anything but `read`) is checked only in the mode it declares, because a
 * Kepler-only run holds every orbit fixed and cannot show what an N-body
 * step is about, and an N-body run is not the geometry a Kepler step reads.
 */
export function modeProblem(guide, step, labMode) {
  if (step.kind === 'read') return null;
  const wanted = step.mode ?? guide.mode;
  if (!MODES.includes(wanted)) return 'undeclared';
  return labMode === wanted
    ? null
    : wanted === 'nbody'
      ? 'needsNbody'
      : wanted === 'kepler'
        ? 'needsKepler'
        : 'needsPrecomputed';
}

/** The mode a step runs in: its own, else its guide's. */
export const stepMode = (guide, step) => step.mode ?? guide.mode;

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
  // A step is checked only in the run mode it declares (modeProblem).
  if (step?.mode && s.mode && s.mode !== step.mode && check.kind !== 'mode')
    return false;
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
      if (check.mode && (f.mode ?? 'nbody') !== check.mode) return false;
      if (check.atLeast === undefined && check.atMost === undefined)
        return true;
      const v = recordedQuantity(f, check);
      if (v === null || v === undefined) return false;
      return (
        (check.atLeast === undefined || v >= check.atLeast) &&
        (check.atMost === undefined || v <= check.atMost)
      );
    }
    case 'mode':
      return s.mode === check.mode;
    case 'plane':
      return s.plane === check.plane;
    case 'observer': {
      const o = c.observer;
      return Math.abs(o.az - check.az) < 0.5 && Math.abs(o.el - check.el) < 0.5;
    }
    case 'panel':
      return Boolean(s.panel);
    case 'elements': {
      const el = orbitOf(c.now(check.target), check.body, c.G);
      if (!el) return false;
      const v =
        check.quantity === 'a' || check.quantity === 'e'
          ? el[check.quantity]
          : turn(el[check.quantity]);
      return Math.abs(v - check.value) <= check.tolerance;
    }
    default:
      return false;
  }
}

// --- Answers ------------------------------------------------------------------------

/** The quantity a `recorded` check thresholds: an element, or the resonant argument phi. */
export function recordedQuantity(f, check) {
  if (check.quantity === 'phi') {
    const i = idx(f, check.inner);
    const o = idx(f, check.outer);
    const p = idx(f, check.primary);
    return i < 0 || o < 0 || p < 0
      ? null
      : resonantArgument(f, i, o, p, f.G, { j: check.j ?? 2 });
  }
  const el = orbitOf(f, check.body, f.G);
  return el ? el[check.quantity] : null;
}

/** A body's elements about its primary, with the numbers turned into a named plane. */
function orbitIn(c, target, id, plane) {
  const f = c.sys(target);
  if (!f) return null;
  const rows = planeAxes(plane, f, { units: c.units, observer: c.observer });
  if (!rows) return null;
  return orbitOf(
    { ...reorient(f, rows), ids: f.ids, system: f.system },
    id,
    c.G
  );
}
/** A body's inclination in a named plane, in degrees. */
const incIn = (c, target, id, plane) => {
  const o = orbitIn(c, target, id, plane);
  return o ? deg(o.i) : null;
};
/** The same orbit in the system's own axes, for the sky and the editor's answers. */
const orbitOwn = (c, target, id) => orbitIn(c, target, id, 'system');
/** Sky axes of the observer the lab has, from the open system's numbers. */
const skyAxes = (c, target) => {
  const f = c.sys(target);
  return f && planeAxes('sky', f, { units: c.units, observer: c.observer });
};
/** The unit normal of a body's orbit in a (kept) frame. */
const normalOf = (f, id) => orbitOf(f, id, f.G)?.normal ?? null;
const angleBetween = (u, v) =>
  Math.atan2(
    Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ),
    u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  );
/** The apparent ellipse of a body about its primary, as the lab's observer sees it. */
function skyOf(c, target, id) {
  const el = orbitOwn(c, target, id);
  const axes = skyAxes(c, target);
  return el && axes ? { el, axes, ellipse: apparentEllipse(el, axes) } : null;
}
/** Its transit geometry, in star radii. */
function transitIn(c, target, id) {
  const s = skyOf(c, target, id);
  if (!s) return null;
  const t = transitOf(s.el, s.axes, {
    star: STAR_RADIUS,
    planet: PLANET_RADIUS,
  });
  return (
    t && {
      ...t,
      impactR: t.impact / STAR_RADIUS,
      chordR: t.chordHalf / STAR_RADIUS,
    }
  );
}
const PERIOD_AT_ONE = c => TAU / Math.sqrt(c.G * (1 + 1e-6));
const nearest = (v, table) =>
  Object.entries(table).reduce((best, [k, x]) =>
    Math.abs(x - v) < Math.abs(best[1] - v) ? [k, x] : best
  )[0];

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
  // l3-elements, on el-start
  period: c => orbitOf(c.now('el-start'), 'planet', c.G)?.period ?? null,
  periapsisDistance: c => {
    const el = orbitOf(c.now('el-start'), 'planet', c.G);
    return el ? el.a * (1 - el.e) : null;
  },
  apoapsis: c => {
    const el = orbitOf(c.now('el-start'), 'planet', c.G);
    return el ? el.a * (1 + el.e) : null;
  },
  // The highest point above the reference plane: the maximum of z over the
  // orbit, sin i (sqrt(a^2 sin^2 w + b^2 cos^2 w) - a e sin w).
  maxHeight: c => {
    const el = orbitOf(c.now('el-start'), 'planet', c.G);
    if (!el) return null;
    const b = el.a * Math.sqrt(1 - el.e * el.e);
    return (
      Math.sin(el.i) *
      (Math.sqrt(
        (el.a * Math.sin(el.omega)) ** 2 + (b * Math.cos(el.omega)) ** 2
      ) -
        el.a * el.e * Math.sin(el.omega))
    );
  },
  flatOmega: c => {
    const el = orbitOf(c.now('el-start'), 'planet', c.G);
    return el ? turn(el.omega) : null;
  },
  distanceKept: c => {
    const f = c.recorded('kept-m');
    if (!f) return null;
    const p = idx(f, 'star');
    const i = idx(f, 'planet');
    return Math.hypot(...[0, 1, 2].map(k => f.x[3 * i + k] - f.x[3 * p + k]));
  },
  nodeTilt: c => {
    const a = c.recorded('before-node');
    const b = c.recorded('after-node');
    if (!a || !b) return null;
    return deg(angleBetween(normalOf(a, 'planet'), normalOf(b, 'planet')));
  },
  // l3-frames, on frames-solar
  incBsys: c => incIn(c, 'frames-solar', 'b', 'system'),
  incBeq: c => incIn(c, 'frames-solar', 'b', 'equatorial'),
  incBinv: c => incIn(c, 'frames-solar', 'b', 'invariable'),
  incCinv: c => incIn(c, 'frames-solar', 'c', 'invariable'),
  incBsky: c => incIn(c, 'frames-solar', 'b', 'sky'),
  // l3-seen
  skyIncl: c => incIn(c, 'seen-binary', 'companion', 'sky'),
  apparentMajor: c =>
    skyOf(c, 'seen-binary', 'companion')?.ellipse.major ?? null,
  apparentMinor: c =>
    skyOf(c, 'seen-binary', 'companion')?.ellipse.minor ?? null,
  centerOffset: c => {
    const s = skyOf(c, 'seen-binary', 'companion');
    return s ? Math.hypot(...s.ellipse.center) : null;
  },
  impactStar: c => transitIn(c, 'seen-eclipse', 'planet')?.impactR ?? null,
  chordStar: c => {
    const t = transitIn(c, 'seen-eclipse', 'planet');
    return t && t.transits ? t.chordR : null;
  },
  // l3-tilts
  mutualTwo: c => {
    const f = c.sys('mutual-two');
    const r = f && between(f, idx(f, 'b'), idx(f, 'c'), c.G);
    return r ? deg(r.angle) : null;
  },
  ibInv: c => incIn(c, 'mutual-two', 'b', 'invariable'),
  icInv: c => incIn(c, 'mutual-two', 'c', 'invariable'),
  sumInv: c => {
    const b = ANSWERS.ibInv(c);
    const k = ANSWERS.icInv(c);
    return b === null || k === null ? null : b + k;
  },
  mutualR6start: c => mutualOf(c.recorded('start'), 'particle', 'perturber'),
  mutualR6peak: c => mutualOf(c.recorded('peak'), 'particle', 'perturber'),
  // l3-resonant, on res-21
  periodRatio: c => {
    const f = c.now('res-21');
    const b = f && orbitOf(f, 'b', c.G);
    const k = f && orbitOf(f, 'c', c.G);
    return b && k ? k.period / b.period : null;
  },
  phiNow: c => phiOf(c.now('res-21')),
  phiAmplitude: c => {
    const hi = phiOf(c.recorded('phi-hi'));
    const lo = phiOf(c.recorded('phi-lo'));
    return hi === null || lo === null ? null : (hi - lo) / 2;
  },
  // Half a libration is the time from one extreme to the other, in orbits of
  // the inner planet at those moments.
  phiPeriod: c => {
    const a = c.recorded('phi-hi');
    const b = c.recorded('phi-lo');
    if (!a || !b) return null;
    const el = orbitOf(a, 'b', a.G);
    return el ? (2 * Math.abs(a.t - b.t)) / el.period : null;
  },
  // How many libration periods the window holds, with the reader's own period.
  windowPeriods: c => {
    const T = ANSWERS.phiPeriod(c);
    return T === null ? null : WINDOW_ORBITS / T;
  },
};

/** The resonant argument of the 2:1 pair, about the star, in a frame. */
function phiOf(f) {
  return f
    ? resonantArgument(f, idx(f, 'b'), idx(f, 'c'), idx(f, 'star'), f.G ?? 1, {
        j: 2,
      })
    : null;
}
/** The angle between two bodies' orbits in a frame, in degrees. */
function mutualOf(f, a, b) {
  if (!f) return null;
  const r = between(f, idx(f, a), idx(f, b), f.G);
  return r ? deg(r.angle) : null;
}
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
  // l3-elements: the period against a = 1, by Kepler's third law (a^1.5)
  periodRatio: c => {
    const el = orbitOf(c.now('el-start'), 'planet', c.G);
    return el
      ? nearest(el.period / PERIOD_AT_ONE(c), {
          same: 1,
          double: 2,
          x283: 2 ** 1.5,
          x4: 4,
        })
      : null;
  },
  flatNode: c => {
    const el = orbitOf(c.now('el-start'), 'planet', c.G);
    if (!el) return null;
    return Math.abs(el.Omega) < 1e-9 ? 'zero' : 'kept';
  },
  // l3-frames: which of the six elements a change of plane moves
  changedSet: c => {
    const a = orbitIn(c, 'frames-solar', 'b', 'system');
    const b = orbitIn(c, 'frames-solar', 'b', 'equatorial');
    if (!a || !b) return null;
    const moved = ['a', 'e', 'i', 'Omega', 'omega', 'M'].filter(k =>
      k === 'a' || k === 'e'
        ? Math.abs(a[k] - b[k]) > 1e-9 * (1 + Math.abs(a[k]))
        : Math.abs(Math.atan2(Math.sin(a[k] - b[k]), Math.cos(a[k] - b[k]))) >
          1e-9
    );
    return moved.length === 6
      ? 'all'
      : moved.join() === 'i,Omega,omega'
        ? 'three'
        : 'one';
  },
  equatorialLarger: c => {
    const a = ANSWERS.incBsys(c);
    const b = ANSWERS.incBeq(c);
    return a === null || b === null
      ? null
      : Math.abs(b - a) < 0.05
        ? 'same'
        : b > a
          ? 'larger'
          : 'smaller';
  },
  closerToInvariable: c => {
    const b = ANSWERS.incBinv(c);
    const k = ANSWERS.incCinv(c);
    return b === null || k === null ? null : k < b ? 'c' : 'b';
  },
  // l3-seen
  primaryCentred: c => {
    const o = ANSWERS.centerOffset(c);
    return o === null ? null : o < 1e-6 ? 'yes' : 'no';
  },
  transits: c => {
    const t = transitIn(c, 'seen-eclipse', 'planet');
    return t ? (t.transits ? 'yes' : 'no') : null;
  },
  transitLost: c => {
    const t = transitIn(c, 'seen-eclipse', 'planet');
    return t ? (t.transits ? 'kept' : 'lost') : null;
  },
  // l3-tilts
  mutualVsDifference: c => {
    const m = ANSWERS.mutualTwo(c);
    const f = c.sys('mutual-two');
    if (m === null || !f) return null;
    const ib = orbitOf(f, 'b', c.G).i / DEG;
    const ic = orbitOf(f, 'c', c.G).i / DEG;
    return m > Math.abs(ib - ic) + 0.05
      ? 'more'
      : m < Math.abs(ib - ic) - 0.05
        ? 'less'
        : 'same';
  },
  closerToPlane: c => {
    const b = ANSWERS.ibInv(c);
    const k = ANSWERS.icInv(c);
    return b === null || k === null ? null : k < b ? 'c' : 'b';
  },
  // l3-resonant: the argument librates when it never goes all the way round
  libration: c => {
    const hi = phiOf(c.recorded('phi-hi'));
    const lo = phiOf(c.recorded('phi-lo'));
    if (hi === null || lo === null) return null;
    return hi < Math.PI && lo > -Math.PI && hi - lo < Math.PI
      ? 'librates'
      : 'circulates';
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
    mode: 'nbody',
    minutes: { intro: 20, advanced: 30 },
    // The depths it can be read at (DEPTH.md): the introductory path is the
    // core, the advanced path is the advanced depth.
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['orbits'],
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
    mode: 'nbody',
    minutes: { intro: 25, advanced: 35 },
    // The depths it can be read at (DEPTH.md): the introductory path is the
    // core, the advanced path is the advanced depth.
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['exoplanets', 'observing', 'orbits'],
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
    mode: 'nbody',
    minutes: { intro: 20, advanced: 30 },
    // The depths it can be read at (DEPTH.md): the introductory path is the
    // core, the advanced path is the advanced depth.
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['exoplanets', 'orbits'],
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
    mode: 'nbody',
    minutes: { intro: 25, advanced: 35 },
    // The depths it can be read at (DEPTH.md): the introductory path is the
    // core, the advanced path is the advanced depth.
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['gravity', 'orbits'],
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

  // --- Curriculum II (Prompt 271) ---------------------------------------------------
  {
    id: 'l3-elements',
    mode: 'kepler',
    minutes: { intro: 30, advanced: 40 },
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['orbits'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: { open: 'el-start', set: { tool: 'elements', a: 'planet' } },
        check: {
          kind: 'tool',
          target: 'el-start',
          tool: 'elements',
          a: 'planet',
        },
      },
      {
        id: 'panel',
        kind: 'do',
        path: 'both',
        go: { panel: true },
        check: { kind: 'panel' },
      },
      {
        id: 'predict-a',
        kind: 'choose',
        path: 'both',
        options: ['same', 'double', 'x283', 'x4'],
        correct: null,
      },
      {
        id: 'edit-a',
        kind: 'do',
        path: 'both',
        go: { edit: { planet: { a: 2 } } },
        check: {
          kind: 'elements',
          target: 'el-start',
          body: 'planet',
          quantity: 'a',
          value: 2,
          tolerance: 0.01,
        },
      },
      {
        id: 'period',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'period', tolerance: 0.1, unit: ANSWER_UNIT.none },
      },
      {
        id: 'ratio',
        kind: 'choose',
        path: 'both',
        options: ['same', 'double', 'x283', 'x4'],
        correct: { answer: 'periodRatio' },
        answers: 'predict-a',
      },
      {
        id: 'edit-e',
        kind: 'do',
        path: 'both',
        go: { edit: { planet: { e: 0.7 } } },
        check: {
          kind: 'elements',
          target: 'el-start',
          body: 'planet',
          quantity: 'e',
          value: 0.7,
          tolerance: 0.005,
        },
      },
      {
        id: 'periapsis',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'periapsisDistance',
          tolerance: 0.01,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'edit-i',
        kind: 'do',
        path: 'both',
        go: { edit: { planet: { i: 60 } } },
        check: {
          kind: 'elements',
          target: 'el-start',
          body: 'planet',
          quantity: 'i',
          value: 60,
          tolerance: 0.5,
        },
      },
      {
        id: 'observe',
        kind: 'do',
        path: 'both',
        go: { observer: { az: -90, el: 0 } },
        check: { kind: 'observer', az: -90, el: 0 },
      },
      {
        id: 'height',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'maxHeight',
          tolerance: 0.01,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'before-node',
        kind: 'do',
        path: 'advanced',
        record: true,
        go: { pause: true },
        check: { kind: 'recorded', target: 'el-start' },
      },
      {
        id: 'edit-node',
        kind: 'do',
        path: 'advanced',
        go: { edit: { planet: { Omega: 100 } }, pause: true },
        check: {
          kind: 'elements',
          target: 'el-start',
          body: 'planet',
          quantity: 'Omega',
          value: 100,
          tolerance: 0.5,
        },
      },
      {
        id: 'after-node',
        kind: 'do',
        path: 'advanced',
        record: true,
        check: { kind: 'recorded', target: 'el-start' },
      },
      {
        id: 'node-tilt',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'nodeTilt', tolerance: 0.3, unit: 'deg' },
      },
      {
        id: 'predict-flat',
        kind: 'choose',
        path: 'both',
        options: ['kept', 'zero'],
        correct: null,
      },
      {
        id: 'edit-flat',
        kind: 'do',
        path: 'both',
        go: { edit: { planet: { i: 0 } } },
        check: {
          kind: 'elements',
          target: 'el-start',
          body: 'planet',
          quantity: 'i',
          value: 0,
          tolerance: 0.05,
        },
      },
      {
        id: 'flat-omega',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'flatOmega', tolerance: 0.5, unit: 'deg' },
      },
      {
        id: 'flat-node',
        kind: 'choose',
        path: 'both',
        options: ['kept', 'zero'],
        correct: { answer: 'flatNode' },
        answers: 'predict-flat',
      },
      {
        id: 'edit-m',
        kind: 'do',
        path: 'both',
        go: { edit: { planet: { M: 90 } }, pause: true },
        check: {
          kind: 'elements',
          target: 'el-start',
          body: 'planet',
          quantity: 'M',
          value: 90,
          tolerance: 0.5,
        },
      },
      {
        id: 'kept-m',
        kind: 'do',
        path: 'both',
        record: true,
        check: { kind: 'recorded', target: 'el-start' },
      },
      {
        id: 'distance',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'distanceKept',
          tolerance: 0.02,
          unit: ANSWER_UNIT.none,
        },
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-frames',
    mode: 'kepler',
    minutes: { intro: 25, advanced: 35 },
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['orbits'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: {
          open: 'frames-solar',
          set: { tool: 'elements', a: 'b', plane: 'system' },
        },
        check: {
          kind: 'tool',
          target: 'frames-solar',
          tool: 'elements',
          a: 'b',
        },
      },
      {
        id: 'i-system',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'incBsys', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'predict-eq',
        kind: 'choose',
        path: 'both',
        options: ['smaller', 'same', 'larger'],
        correct: null,
      },
      {
        id: 'plane-eq',
        kind: 'do',
        path: 'both',
        go: { set: { plane: 'equatorial' } },
        check: { kind: 'plane', target: 'frames-solar', plane: 'equatorial' },
      },
      {
        id: 'i-eq',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'incBeq', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'larger',
        kind: 'choose',
        path: 'both',
        options: ['smaller', 'same', 'larger'],
        correct: { answer: 'equatorialLarger' },
        answers: 'predict-eq',
      },
      {
        id: 'changed',
        kind: 'choose',
        path: 'both',
        options: ['all', 'three', 'one'],
        correct: { answer: 'changedSet' },
      },
      {
        id: 'plane-inv',
        kind: 'do',
        path: 'both',
        go: { set: { plane: 'invariable' } },
        check: { kind: 'plane', target: 'frames-solar', plane: 'invariable' },
      },
      {
        id: 'i-b-inv',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'incBinv', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'i-c-inv',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'incCinv', tolerance: 0.05, unit: 'deg' },
      },
      {
        id: 'closer',
        kind: 'choose',
        path: 'both',
        options: ['b', 'c'],
        correct: { answer: 'closerToInvariable' },
      },
      {
        id: 'plane-sky',
        kind: 'do',
        path: 'advanced',
        go: { observer: { az: -90, el: 0 }, set: { plane: 'sky' } },
        check: { kind: 'plane', target: 'frames-solar', plane: 'sky' },
      },
      {
        id: 'i-sky',
        kind: 'answer',
        path: 'advanced',
        expect: { answer: 'incBsky', tolerance: 0.1, unit: 'deg' },
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-seen',
    mode: 'kepler',
    minutes: { intro: 30, advanced: 40 },
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['exoplanets', 'observing', 'orbits'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open-binary',
        kind: 'do',
        path: 'both',
        go: {
          open: 'seen-binary',
          set: { tool: 'elements', a: 'companion', plane: 'system' },
          panel: true,
        },
        check: {
          kind: 'tool',
          target: 'seen-binary',
          tool: 'elements',
          a: 'companion',
        },
      },
      {
        id: 'observe',
        kind: 'do',
        path: 'both',
        go: { observer: { az: -90, el: 0 }, set: { plane: 'sky' } },
        check: { kind: 'plane', target: 'seen-binary', plane: 'sky' },
      },
      {
        id: 'i-sky',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'skyIncl', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'predict-centre',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: null,
      },
      {
        id: 'major',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'apparentMajor',
          tolerance: 0.01,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'minor',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'apparentMinor',
          tolerance: 0.01,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'offset',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'centerOffset',
          tolerance: 0.01,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'centre',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: { answer: 'primaryCentred' },
        answers: 'predict-centre',
      },
      {
        id: 'open-eclipse',
        kind: 'do',
        path: 'both',
        go: {
          open: 'seen-eclipse',
          set: { tool: 'elements', a: 'planet', plane: 'system' },
          observer: { az: -90, el: 0 },
        },
        check: {
          kind: 'tool',
          target: 'seen-eclipse',
          tool: 'elements',
          a: 'planet',
        },
      },
      {
        id: 'impact',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'impactStar',
          tolerance: 0.02,
          unit: ANSWER_UNIT.starRadii,
        },
      },
      {
        id: 'transits',
        kind: 'choose',
        path: 'both',
        options: ['yes', 'no'],
        correct: { answer: 'transits' },
      },
      {
        id: 'predict-omega',
        kind: 'choose',
        path: 'both',
        options: ['kept', 'lost'],
        correct: null,
      },
      {
        id: 'edit-omega',
        kind: 'do',
        path: 'both',
        go: { edit: { planet: { omega: 90 } } },
        check: {
          kind: 'elements',
          target: 'seen-eclipse',
          body: 'planet',
          quantity: 'omega',
          value: 90,
          tolerance: 0.5,
        },
      },
      {
        id: 'impact-after',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'impactStar',
          tolerance: 0.02,
          unit: ANSWER_UNIT.starRadii,
        },
      },
      {
        id: 'outcome',
        kind: 'choose',
        path: 'both',
        options: ['kept', 'lost'],
        correct: { answer: 'transitLost' },
        answers: 'predict-omega',
      },
      {
        id: 'restore',
        kind: 'do',
        path: 'advanced',
        go: { edit: { planet: { omega: 270 } } },
        check: {
          kind: 'elements',
          target: 'seen-eclipse',
          body: 'planet',
          quantity: 'omega',
          value: 270,
          tolerance: 0.5,
        },
      },
      {
        id: 'chord',
        kind: 'answer',
        path: 'advanced',
        expect: {
          answer: 'chordStar',
          tolerance: 0.02,
          unit: ANSWER_UNIT.starRadii,
        },
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-tilts',
    mode: 'kepler',
    minutes: { intro: 30, advanced: 40 },
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['exoplanets', 'gravity', 'orbits'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: {
          open: 'mutual-two',
          set: { tool: 'between', a: 'b', b: 'c', plane: 'system' },
        },
        check: {
          kind: 'tool',
          target: 'mutual-two',
          tool: 'between',
          a: 'b',
          b: 'c',
        },
      },
      {
        id: 'predict',
        kind: 'choose',
        path: 'both',
        options: ['less', 'same', 'more'],
        correct: null,
      },
      {
        id: 'mutual',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'mutualTwo', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'compare',
        kind: 'choose',
        path: 'both',
        options: ['less', 'same', 'more'],
        correct: { answer: 'mutualVsDifference' },
        answers: 'predict',
      },
      {
        id: 'plane-inv',
        kind: 'do',
        path: 'both',
        go: { set: { plane: 'invariable', tool: 'elements', a: 'b' } },
        check: { kind: 'plane', target: 'mutual-two', plane: 'invariable' },
      },
      {
        id: 'i-b',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'ibInv', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'i-c',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'icInv', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'sum',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'sumInv', tolerance: 0.2, unit: 'deg' },
      },
      {
        id: 'closer',
        kind: 'choose',
        path: 'both',
        options: ['b', 'c'],
        correct: { answer: 'closerToPlane' },
      },
      {
        id: 'open-r6',
        kind: 'do',
        path: 'both',
        mode: 'nbody',
        go: {
          open: 'R6',
          set: {
            tool: 'between',
            a: 'particle',
            b: 'perturber',
            follow: 'star',
            plane: 'system',
          },
        },
        check: {
          kind: 'tool',
          target: 'R6',
          tool: 'between',
          a: 'particle',
          b: 'perturber',
        },
      },
      {
        id: 'start',
        kind: 'do',
        path: 'both',
        mode: 'nbody',
        record: true,
        check: { kind: 'recorded', target: 'R6' },
      },
      {
        id: 'mutual-0',
        kind: 'answer',
        path: 'both',
        mode: 'nbody',
        expect: { answer: 'mutualR6start', tolerance: 0.1, unit: 'deg' },
      },
      {
        id: 'peak',
        kind: 'do',
        path: 'both',
        mode: 'nbody',
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
        id: 'mutual-peak',
        kind: 'answer',
        path: 'both',
        mode: 'nbody',
        expect: { answer: 'mutualR6peak', tolerance: 0.2, unit: 'deg' },
      },
      {
        id: 'kept',
        kind: 'choose',
        path: 'both',
        mode: 'nbody',
        options: ['same', 'different'],
        correct: { answer: 'kozaiKept' },
      },
      {
        id: 'predicted',
        kind: 'answer',
        path: 'advanced',
        mode: 'nbody',
        expect: {
          answer: 'ePredicted',
          tolerance: 0.005,
          unit: ANSWER_UNIT.none,
        },
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'l3-resonant',
    mode: 'nbody',
    minutes: { intro: 30, advanced: 40 },
    depths: ['core', 'advanced'],
    level: 'intro',
    tags: ['gravity', 'orbits'],
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      {
        id: 'predict',
        kind: 'choose',
        path: 'both',
        options: ['librates', 'circulates', 'still'],
        correct: null,
      },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        go: {
          open: 'res-21',
          set: { tool: 'elements', a: 'c', plane: 'system' },
        },
        check: { kind: 'tool', target: 'res-21', tool: 'elements', a: 'c' },
      },
      {
        id: 'panel',
        kind: 'do',
        path: 'both',
        go: { panel: true },
        check: { kind: 'panel' },
      },
      {
        id: 'ratio',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'periodRatio',
          tolerance: 0.02,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'window',
        kind: 'do',
        path: 'both',
        go: { set: { speed: '256' }, play: true },
        check: {
          kind: 'played',
          target: 'res-21',
          body: 'b',
          orbits: WINDOW_ORBITS,
        },
      },
      {
        id: 'phi-hi',
        kind: 'do',
        path: 'both',
        record: true,
        go: { pause: true },
        check: {
          kind: 'recorded',
          target: 'res-21',
          quantity: 'phi',
          inner: 'b',
          outer: 'c',
          primary: 'star',
          atLeast: 0.45,
        },
      },
      {
        id: 'phi-lo',
        kind: 'do',
        path: 'both',
        record: true,
        check: {
          kind: 'recorded',
          target: 'res-21',
          quantity: 'phi',
          inner: 'b',
          outer: 'c',
          primary: 'star',
          atMost: -0.45,
        },
      },
      {
        id: 'amplitude',
        kind: 'answer',
        path: 'both',
        expect: {
          answer: 'phiAmplitude',
          tolerance: 0.05,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'period',
        kind: 'answer',
        path: 'both',
        expect: { answer: 'phiPeriod', tolerance: 0.5, unit: ANSWER_UNIT.none },
      },
      {
        id: 'outcome',
        kind: 'choose',
        path: 'both',
        options: ['librates', 'circulates', 'still'],
        correct: { answer: 'libration' },
        answers: 'predict',
      },
      {
        id: 'window-periods',
        kind: 'answer',
        path: 'advanced',
        expect: {
          answer: 'windowPeriods',
          tolerance: 0.3,
          unit: ANSWER_UNIT.none,
        },
      },
      {
        id: 'kepler-open',
        kind: 'do',
        path: 'both',
        mode: 'kepler',
        go: {
          open: 'res-21',
          set: { tool: 'elements', a: 'c', plane: 'system' },
          play: true,
        },
        check: { kind: 'played', target: 'res-21', body: 'b', orbits: 50 },
      },
      {
        id: 'kepler-phi',
        kind: 'answer',
        path: 'both',
        mode: 'kepler',
        expect: { answer: 'phiNow', tolerance: 0.02, unit: ANSWER_UNIT.none },
      },
      {
        id: 'why',
        kind: 'choose',
        path: 'both',
        mode: 'kepler',
        options: ['pull', 'short', 'ratio'],
        correct: 'pull',
      },
      { id: 'flat', kind: 'read', path: 'both' },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
];

// A step runs in the mode it declares, or its guide's.
for (const g of GUIDES) for (const s of g.steps) s.mode ??= g.mode;

/**
 * Apply a step's `go.edit` through the lab ({bodyId: {element: value}}): each
 * body's orbit about its primary is rebuilt in the plane the lab shows, and
 * only it and what orbits it move (instruments.js editElements).
 */
export async function applyEdits(lab, edits) {
  for (const [id, e] of Object.entries(edits)) {
    const system = lab.now();
    const i = system.bodies.findIndex(b => b.id === id);
    await lab.replace(editElements(system, i, e, lab.G(), lab.axes()));
  }
}

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
