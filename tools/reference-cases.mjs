#!/usr/bin/env node
// =============================================================================
// The sandbox's reference cases, stepped the way the page steps them
// -----------------------------------------------------------------------------
// Builds shipped scenarios through the page's builder, steps them with the
// page's frame policy (frameAdvance, then substepPlan, one updatePhysics per
// piece, all inside the engine's seeded stream) and judges each result against
// a bound committed in tests/fixtures/reference-cases/thresholds.json before
// this file existed. References are written in tools/reference-physics.mjs.
//
//   node tools/reference-cases.mjs                judge every case, compare with the record
//   node tools/reference-cases.mjs --study        also run the step study (long: about 15 CPU-minutes)
//   node tools/reference-cases.mjs --write        run everything and rewrite the record
//   node tools/reference-cases.mjs --write --keep-study   rewrite the judged rows, keep the recorded study
//   node tools/reference-cases.mjs --only R4,R5   only those cases (R1..R6, R4x, tiers)
//   node tools/reference-cases.mjs --strict       exit 1 on any FAIL, recorded or not
//   node tools/reference-cases.mjs --jobs 2       child processes at a time (default 2)
//
// A failing case is a result, not an error: it is printed as FAIL with its
// number and exits 0 when the record says it fails. The exit status is 1 when
// a row differs from the record (a regression, or a fix that has not flipped
// its row), and with --strict also on any FAIL.
//
// Each leg (a case at one rate, a step of the study, the camera at one rate,
// the tiers) runs in a process of its own, as tools/tides-scenarios.mjs does,
// so one leg's world never meets another's cached bodies.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const THRESHOLDS = JSON.parse(
  readFileSync(
    new URL('tests/fixtures/reference-cases/thresholds.json', ROOT),
    'utf8'
  )
);
export const RECORD_FILE = 'tests/fixtures/reference-cases/record.json';
const COND = THRESHOLDS.conditions;
const RATES = Object.keys(COND.rates);
const STEPS = COND.stepStudy.steps;
const STEP_LABELS = COND.stepStudy.labels;
const TIERS = COND.tiers;
const CASE_IDS = ['R1', 'R2', 'R3', 'R4', 'R4x', 'R5'];
const SCENARIO = {
  R1: 'solar-system',
  R2: 'keplers-2nd-law',
  R3: 'binary-pair',
  R4: 'gravity-assist-heliocentric',
  R4x: 'three-body-sensitivity-lab',
  R5: 'tidal-disruption-event',
};
const INTEGRATOR = {
  R1: 'Symplectic Euler',
  R2: 'Symplectic Euler',
  R3: 'Symplectic Euler',
  R4: 'Velocity Verlet',
  R4x: 'Symplectic Euler',
  R5: 'Symplectic Euler',
};
// The horizons the thresholds file states in words.
const UNTIL = { R4: 1200, R4x: 300 };

// Rough CPU seconds of a leg at a step of 1/24, to start the longest first;
// a leg's cost scales with the inverse of its step.
const COST = { R1: 43, R2: 2, R3: 9, R4: 0.6, R4x: 0.01, R5: 0.01 };

const sig = (v, d = 4) =>
  typeof v === 'number' && Number.isFinite(v) && v !== 0
    ? Number(v.toPrecision(d))
    : v;

// -----------------------------------------------------------------------------
// The leg, in a child process
// -----------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const arg = n => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);

async function loadEngine() {
  const physics = await import('../js/physics.js');
  const { build } = await import('./tides-scenarios.mjs');
  const { engine } = await import('../js/random/streams.js');
  const { frameAdvance, substepPlan } = await import('../js/timestep.js');
  const { setTier } = await import('../js/quality.js');
  const ref = await import('./reference-physics.mjs');
  const { resetPresetMemory } = await import('../js/scenarios.js');
  return {
    physics,
    build,
    engine,
    frameAdvance,
    substepPlan,
    setTier,
    ref,
    resetPresetMemory,
  };
}

async function runLeg(spec) {
  const E = await loadEngine();
  E.setTier('full');
  if (spec.kind === 'case' || spec.kind === 'study') {
    const mode =
      spec.kind === 'case'
        ? { rate: spec.rate }
        : { step: STEPS[spec.stepIndex], label: STEP_LABELS[spec.stepIndex] };
    return { spec, ...(await CASES[spec.id](E, mode)) };
  }
  if (spec.kind === 'tiers') return { spec, ...(await tierLeg(E)) };
  if (spec.kind === 'camera')
    return { spec, ...(await cameraLeg(E, spec.rate)) };
  throw new Error(`unknown leg ${JSON.stringify(spec)}`);
}

// -----------------------------------------------------------------------------
// Driving frames the way the page does
// -----------------------------------------------------------------------------

/**
 * A driver is either a rate (a frame of real seconds, turned into simulated
 * time and split exactly as js/render.js gameLoop does) or a fixed step (one
 * updatePhysics call of h, whatever the frame rate).
 */
function driver(E, settings, mode) {
  const { physics, frameAdvance, substepPlan } = E;
  if (mode.rate !== undefined) {
    const seconds = COND.rates[mode.rate].frameSeconds;
    const dtSim = frameAdvance(seconds, settings.sim_speed, physics.DT);
    const plan = substepPlan(dtSim, settings.max_timestep);
    return {
      mode,
      step: plan.step,
      substeps: plan.substeps,
      capped: plan.capped,
      frame(onStep) {
        for (let i = 0; i < plan.substeps; i++) {
          physics.updatePhysics(plan.step);
          if (onStep() === 'stop') return true;
        }
        return false;
      },
    };
  }
  return {
    mode,
    step: mode.step,
    substeps: 1,
    capped: false,
    frame(onStep) {
      physics.updatePhysics(mode.step);
      return onStep() === 'stop';
    },
  };
}

/** Frames until the clock reaches `until` (checked at frame boundaries) or onStep says stop. */
function run(E, drv, until, onStep) {
  let steps = 0;
  const counted = () => {
    steps++;
    return onStep();
  };
  const limit = 5e7;
  while (E.physics.getSimulationTime() < until && steps < limit) {
    if (drv.frame(counted)) break;
  }
  return steps;
}

const find = (E, name) => {
  for (const l of [
    'stars',
    'planets',
    'gas_giants',
    'asteroids',
    'comets',
    'bh_list',
  ]) {
    const b = E.physics[l].find(x => x.name === name);
    if (b) return b;
  }
  throw new Error(`no body named ${name}`);
};

const row = (quantity, value, bound, extra = {}) => ({
  quantity,
  value,
  bound,
  ...extra,
});

/** Online peak over the first and last tenth of the elapsed time. */
function windows(total) {
  return {
    first: 0,
    last: 0,
    note(t, v) {
      if (t <= 0.1 * total) this.first = Math.max(this.first, v);
      if (t >= 0.9 * total) this.last = Math.max(this.last, v);
    },
    ratio() {
      return this.first > 0 ? this.last / this.first : NaN;
    },
  };
}

// -----------------------------------------------------------------------------
// R1, R2: a test particle about a fixed star
// -----------------------------------------------------------------------------

async function restrictedTwoBody(E, mode, which) {
  const { physics, build, engine, ref } = E;
  const T = THRESHOLDS.cases[which];
  const settings = build(SCENARIO[which], COND.seed);
  const star = physics.stars[0];
  const body = find(E, which === 'R1' ? 'Earth' : 'Eccentric Orbiter');
  const mu = settings.gravitational_constant * star.mass;
  const rel0 = { x: body.pos.x - star.pos.x, y: body.pos.y - star.pos.y };
  const vel0 = { x: body.vel.x - star.vel.x, y: body.vel.y - star.vel.y };
  const el = ref.elements(rel0, vel0, mu);
  const total = T.run.orbits * el.period;
  const drv = driver(E, settings, mode);
  const dt = drv.step;
  const E0 = el.eps;
  const L0 = el.h;
  const sgn = Math.sign(L0);
  const eccentric = which === 'R2';
  const peaks = windows(total);
  let maxE = 0;
  let maxL = 0;
  let rmin = Infinity;
  let rmax = 0;
  // Sidereal crossings (R1) and periapsis passages (R2).
  const crossings = [];
  let theta = Math.atan2(rel0.y, rel0.x);
  let phiPrev = 0;
  let nextTarget = 2 * Math.PI;
  let tPrev = 0;
  // The start is a consistent (x, v) pair and sits at an apsis for R2; the first
  // passage counted is the one the integrated orbit reaches.
  let fPrev = NaN;
  let steps = 0;
  const onStep = () => {
    steps++;
    const t = physics.getSimulationTime();
    const x = body.pos.x - star.pos.x;
    const y = body.pos.y - star.pos.y;
    const vx = body.vel.x - star.vel.x;
    const vy = body.vel.y - star.vel.y;
    const r = Math.hypot(x, y);
    const e = (vx * vx + vy * vy) / 2 - mu / r;
    const dE = Math.abs((e - E0) / E0);
    maxE = Math.max(maxE, dE);
    peaks.note(t, dE);
    maxL = Math.max(maxL, Math.abs((x * vy - y * vx - L0) / L0));
    rmin = Math.min(rmin, r);
    rmax = Math.max(rmax, r);
    if (!eccentric) {
      const th = Math.atan2(y, x);
      let d = th - theta;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      theta = th;
      const phiNew = phiPrev + sgn * d;
      while (phiNew >= nextTarget) {
        crossings.push(
          tPrev + ((nextTarget - phiPrev) / (phiNew - phiPrev)) * (t - tPrev)
        );
        nextTarget += 2 * Math.PI;
      }
      phiPrev = phiNew;
    } else {
      const f = x * vx + y * vy;
      if (fPrev < 0 && f >= 0)
        crossings.push(tPrev + (-fPrev / (f - fPrev)) * (t - tPrev));
      fPrev = f;
    }
    tPrev = t;
  };
  let tEnd = 0;
  engine(COND.seed, () => {
    run(E, drv, total, onStep);
    tEnd = physics.getSimulationTime();
  });
  const period =
    crossings.length >= 3
      ? (crossings[crossings.length - 1] - crossings[0]) /
        (crossings.length - 1)
      : NaN;
  const periodErr = Math.abs(period / el.period - 1);
  const kep = ref.keplerState(el, rel0, vel0, mu, tEnd);
  const endErr =
    Math.hypot(
      body.pos.x - star.pos.x - kep.x,
      body.pos.y - star.pos.y - kep.y
    ) / el.a;
  const rows = [];
  let bounds;
  if (!eccentric) {
    const b2 = T.checks.energy.factor * (el.n * dt) ** 2;
    rows.push(row('energy', maxE, b2));
    rows.push(row('growth', peaks.ratio(), T.checks.growth.bound));
    rows.push(row('angularMomentum', maxL, T.checks.angularMomentum.bound));
    rows.push(
      row('period', periodErr, T.checks.period.factor * (el.n * dt) ** 2)
    );
    bounds = { omegaDt: el.n * dt };
  } else {
    const shadow = ref.maxEnergyShadow(el, mu);
    const turn = (dt * el.vp) / el.rp;
    rows.push(row('energy', maxE, T.checks.energy.factor * dt * shadow));
    rows.push(row('growth', peaks.ratio(), T.checks.growth.bound));
    rows.push(row('angularMomentum', maxL, T.checks.angularMomentum.bound));
    const apsides = Math.max(
      Math.abs(rmin - el.rp) / el.rp,
      Math.abs(rmax - el.ra) / el.ra
    );
    rows.push(row('apsides', apsides, T.checks.apsides.factor * turn));
    rows.push(row('period', periodErr, T.checks.period.factor * turn * turn));
    bounds = { turnAngle: turn, shadowAmplitude: shadow };
  }
  return {
    step: dt,
    substeps: drv.substeps,
    steps,
    rows,
    reported: {
      endPositionOverA: endErr,
      stepsPerOrbit: el.period / dt,
      orbitsRun: tEnd / el.period,
      periodsMeasured: crossings.length,
      ...bounds,
    },
  };
}

// -----------------------------------------------------------------------------
// R3: the binary
// -----------------------------------------------------------------------------

async function binary(E, mode) {
  const { physics, build, engine, ref } = E;
  const T = THRESHOLDS.cases.R3;
  const settings = build(SCENARIO.R3, COND.seed);
  const G = settings.gravitational_constant;
  const rmin = physics.minInteractionDistance();
  const A = physics.stars[0];
  const B = physics.stars[1];
  const both = [A, B];
  const mu = G * (A.mass + B.mass);
  const rel0 = { x: B.pos.x - A.pos.x, y: B.pos.y - A.pos.y };
  const vel0 = { x: B.vel.x - A.vel.x, y: B.vel.y - A.vel.y };
  const el = ref.elements(rel0, vel0, mu);
  const total = T.run.orbits * el.period;
  const drv = driver(E, settings, mode);
  const dt = drv.step;
  const E0 = ref.nbodyEnergy(both, G, rmin);
  const L0 = ref.angularMomentum(both);
  const p0 = ref.momentum(both);
  const pScale = both.reduce(
    (s, b) => s + b.mass * Math.hypot(b.vel.x, b.vel.y),
    0
  );
  const c0 = ref.centre(both);
  const sep0 = Math.hypot(rel0.x, rel0.y);
  const sgn = Math.sign(el.h);
  const peaks = windows(total);
  let maxE = 0;
  let maxL = 0;
  let maxP = 0;
  let maxC = 0;
  const crossings = [];
  let theta = Math.atan2(rel0.y, rel0.x);
  let phiPrev = 0;
  let nextTarget = 2 * Math.PI;
  let tPrev = 0;
  let steps = 0;
  const onStep = () => {
    steps++;
    const t = physics.getSimulationTime();
    const dE = Math.abs((ref.nbodyEnergy(both, G, rmin) - E0) / E0);
    maxE = Math.max(maxE, dE);
    peaks.note(t, dE);
    maxL = Math.max(maxL, Math.abs((ref.angularMomentum(both) - L0) / L0));
    const p = ref.momentum(both);
    maxP = Math.max(maxP, Math.hypot(p.x - p0.x, p.y - p0.y) / pScale);
    const c = ref.centre(both);
    maxC = Math.max(maxC, Math.hypot(c.x - c0.x, c.y - c0.y) / sep0);
    const x = B.pos.x - A.pos.x;
    const y = B.pos.y - A.pos.y;
    const th = Math.atan2(y, x);
    let d = th - theta;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    theta = th;
    const phiNew = phiPrev + sgn * d;
    while (phiNew >= nextTarget) {
      crossings.push(
        tPrev + ((nextTarget - phiPrev) / (phiNew - phiPrev)) * (t - tPrev)
      );
      nextTarget += 2 * Math.PI;
    }
    phiPrev = phiNew;
    tPrev = t;
  };
  let tEnd = 0;
  engine(COND.seed, () => {
    run(E, drv, total, onStep);
    tEnd = physics.getSimulationTime();
  });
  const period =
    crossings.length >= 3
      ? (crossings[crossings.length - 1] - crossings[0]) /
        (crossings.length - 1)
      : NaN;
  const kep = ref.keplerState(el, rel0, vel0, mu, tEnd);
  const endErr =
    Math.hypot(B.pos.x - A.pos.x - kep.x, B.pos.y - A.pos.y - kep.y) / el.a;
  const bound2 = T.checks.energy.factor * (el.n * dt) ** 2;
  return {
    step: dt,
    substeps: drv.substeps,
    steps,
    rows: [
      row('energy', maxE, bound2),
      row('growth', peaks.ratio(), T.checks.growth.bound),
      row('angularMomentum', maxL, T.checks.angularMomentum.bound),
      row('momentum', maxP, T.checks.momentum.bound),
      row('barycentre', maxC, T.checks.barycentre.bound),
      row(
        'period',
        Math.abs(period / el.period - 1),
        T.checks.period.factor * (el.n * dt) ** 2
      ),
    ],
    reported: {
      endSeparationOverA: endErr,
      stepsPerOrbit: el.period / dt,
      orbitsRun: tEnd / el.period,
      omegaDt: el.n * dt,
    },
  };
}

// -----------------------------------------------------------------------------
// R4: the gravity assist, against RK4
// -----------------------------------------------------------------------------

async function assist(E, mode) {
  const { physics, build, engine, ref } = E;
  const T = THRESHOLDS.cases.R4;
  const settings = build(SCENARIO.R4, COND.seed);
  const G = settings.gravitational_constant;
  const rmin = physics.minInteractionDistance();
  const sun = physics.stars[0];
  const planet = physics.gas_giants[0];
  const craft = find(E, 'Spacecraft');
  const bodies = [sun, planet, craft];
  const drv = driver(E, settings, mode);
  const E0 = ref.nbodyEnergy(bodies, G, rmin);
  const L0 = ref.angularMomentum(bodies);
  const p0 = ref.momentum(bodies);
  const pScale = bodies.reduce(
    (s, b) => s + b.mass * Math.hypot(b.vel.x, b.vel.y),
    0
  );
  const st = ref.nbodyState(bodies);
  const v0 = { x: craft.vel.x, y: craft.vel.y };
  let maxE = 0;
  let maxP = 0;
  let maxL = 0;
  let closest = Infinity;
  let steps = 0;
  const onStep = () => {
    steps++;
    maxE = Math.max(
      maxE,
      Math.abs((ref.nbodyEnergy(bodies, G, rmin) - E0) / E0)
    );
    const p = ref.momentum(bodies);
    maxP = Math.max(maxP, Math.hypot(p.x - p0.x, p.y - p0.y) / pScale);
    maxL = Math.max(maxL, Math.abs((ref.angularMomentum(bodies) - L0) / L0));
    closest = Math.min(
      closest,
      Math.hypot(craft.pos.x - planet.pos.x, craft.pos.y - planet.pos.y)
    );
  };
  let tEnd = 0;
  engine(COND.seed, () => {
    run(E, drv, UNTIL.R4, onStep);
    tEnd = physics.getSimulationTime();
  });
  ref.rk4Advance(st, tEnd, 1e-3, G, rmin);
  const dvSim = Math.hypot(craft.vel.x - v0.x, craft.vel.y - v0.y);
  const dvRef = Math.hypot(st.vx[2] - v0.x, st.vy[2] - v0.y);
  return {
    step: drv.step,
    substeps: drv.substeps,
    steps,
    rows: [
      row('energy', maxE, T.checks.energy.bound),
      row('craftDv', Math.abs(dvSim - dvRef) / dvRef, T.checks.craftDv.bound),
      row('momentum', maxP, T.checks.momentum.bound),
      row('angularMomentum', maxL, T.checks.angularMomentum.bound),
    ],
    reported: {
      closestApproach: closest,
      craftPositionError: Math.hypot(
        craft.pos.x - st.x[2],
        craft.pos.y - st.y[2]
      ),
      endTime: tEnd,
      dvSim,
      dvRef,
    },
  };
}

// -----------------------------------------------------------------------------
// R4x: a hard three-body pass
// -----------------------------------------------------------------------------

async function threeBody(E, mode) {
  const { physics, build, engine, ref } = E;
  const T = THRESHOLDS.cases.R4x;
  const settings = build(SCENARIO.R4x, COND.seed);
  const G = settings.gravitational_constant;
  const rmin = physics.minInteractionDistance();
  const alpha = find(E, 'Alpha');
  const beta = find(E, 'Beta');
  const gamma = find(E, 'Gamma');
  const trio = [alpha, beta, gamma];
  const side = Math.hypot(alpha.pos.x - gamma.pos.x, alpha.pos.y - gamma.pos.y);
  beta.pos.x += 1;
  const drv = driver(E, settings, mode);
  const E0 = ref.nbodyEnergy(trio, G, rmin);
  let maxBefore = 0;
  let maxAll = 0;
  let tClose = null;
  let minSep = Infinity;
  let steps = 0;
  const onStep = () => {
    steps++;
    const t = physics.getSimulationTime();
    if (!trio.every(b => b.alive !== false)) return 'stop';
    const dE = Math.abs((ref.nbodyEnergy(trio, G, rmin) - E0) / E0);
    let ms = Infinity;
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        ms = Math.min(
          ms,
          Math.hypot(
            trio[i].pos.x - trio[j].pos.x,
            trio[i].pos.y - trio[j].pos.y
          )
        );
    minSep = Math.min(minSep, ms);
    if (tClose === null && ms < 0.3 * side) {
      tClose = t;
      return 'stop';
    }
    maxBefore = Math.max(maxBefore, dE);
    maxAll = Math.max(maxAll, dE);
  };
  engine(COND.seed, () => run(E, drv, UNTIL.R4x, onStep));
  return {
    step: drv.step,
    substeps: drv.substeps,
    steps,
    rows: [row('energy', maxBefore, T.checks.energy.bound)],
    reported: {
      timeOfCloseApproach: tClose,
      minimumSeparation: minSep,
      energyErrorThroughTheRun: maxAll,
      side,
    },
  };
}

// -----------------------------------------------------------------------------
// R5: tidal stripping
// -----------------------------------------------------------------------------

async function tidal(E, mode) {
  const { physics, build, engine, ref } = E;
  const T = THRESHOLDS.cases.R5;
  const settings = build(SCENARIO.R5, COND.seed);
  const hole = physics.bh_list[0];
  const star = find(E, 'Doomed star');
  const mu = settings.gravitational_constant * hole.mass;
  const rel0 = { x: star.pos.x - hole.pos.x, y: star.pos.y - hole.pos.y };
  const vel0 = { x: star.vel.x - hole.vel.x, y: star.vel.y - hole.vel.y };
  const el = ref.elements(rel0, vel0, mu);
  const tPeri = ref.timeToPeriapsis(el);
  const threshold = hole.radius * 5;
  const m0 = star.mass;
  const drv = driver(E, settings, mode);
  const seen = new WeakSet();
  let created = 0;
  let nearest = { dt: Infinity, err: NaN, t: NaN };
  let massFraction = NaN;
  let passed = false;
  let steps = 0;
  const onStep = () => {
    steps++;
    const t = physics.getSimulationTime();
    for (const d of physics.debris)
      if (!seen.has(d)) {
        seen.add(d);
        created++;
      }
    const x = star.pos.x - hole.pos.x;
    const y = star.pos.y - hole.pos.y;
    const gap = Math.abs(t - tPeri);
    if (gap < nearest.dt) {
      const k = ref.keplerState(el, rel0, vel0, mu, t);
      nearest = { dt: gap, err: Math.hypot(x - k.x, y - k.y) / el.rp, t };
    }
    if (t > tPeri) passed = true;
    if (passed && Math.hypot(x, y) > threshold) {
      massFraction = star.mass / m0;
      return 'stop';
    }
  };
  engine(COND.seed, () => run(E, drv, 100 * tPeri, onStep));
  return {
    step: drv.step,
    substeps: drv.substeps,
    steps,
    rows: [row('position', nearest.err, T.checks.position.bound)],
    data: { massFraction, fragments: created },
    reported: {
      periapsisTime: tPeri,
      sampleTime: nearest.t,
      periapsisDistance: el.rp,
      fragmentsCreated: created,
      massFraction,
    },
  };
}

const CASES = {
  R1: (E, m) => restrictedTwoBody(E, m, 'R1'),
  R2: (E, m) => restrictedTwoBody(E, m, 'R2'),
  R3: binary,
  R4: assist,
  R4x: threeBody,
  R5: tidal,
};

// -----------------------------------------------------------------------------
// Tiers: the world is the same at every tier
// -----------------------------------------------------------------------------

const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'debris',
];

function digest(physics) {
  const h = createHash('sha256');
  const counts = {};
  for (const l of LISTS) {
    counts[l] = physics[l].length;
    for (const b of physics[l])
      h.update(
        [l, b.name, b.mass, b.pos.x, b.pos.y, b.vel.x, b.vel.y].join('|') + '\n'
      );
  }
  return { counts, hash: h.digest('hex').slice(0, 16) };
}

async function tierLeg(E) {
  const { physics, build, setTier } = E;
  const rows = [];
  for (const scenario of THRESHOLDS.cases.tiers.scenarios) {
    const seen = {};
    for (const tier of TIERS) {
      setTier(tier);
      // A laboratory scenario built twice in one process carries its variables
      // from the first settings object (js/scenarios.js applyPreset); forget it.
      E.resetPresetMemory();
      build(scenario, COND.seed);
      seen[tier] = digest(physics);
    }
    setTier('full');
    for (const tier of TIERS) {
      const a = seen[tier];
      const b = seen.full;
      const countDiff = LISTS.reduce(
        (s, l) => s + Math.abs(a.counts[l] - b.counts[l]),
        0
      );
      rows.push({
        id: `tiers.${scenario}@${tier}`,
        quantity: 'equal',
        value: countDiff + (a.hash === b.hash ? 0 : 1),
        bound: 0,
        condition: `${scenario} at the ${tier} tier against full`,
        hash: a.hash,
        bodies: Object.values(a.counts).reduce((s, n) => s + n, 0),
      });
    }
  }
  return { rows };
}

// -----------------------------------------------------------------------------
// R6: the camera
// -----------------------------------------------------------------------------

async function cameraLeg(E, rate) {
  const { physics, build, engine, frameAdvance, substepPlan } = E;
  const canvas = globalThis.__referenceCanvas;
  const C = COND.camera;
  const seconds = COND.rates[rate].frameSeconds;
  const live = () => {
    const out = new Set();
    for (const l of LISTS)
      for (const b of physics[l])
        if (b.alive !== false) out.add(`${l}:${b.id}`);
    return out;
  };
  const one = (width, height, zoom, panAU) => {
    E.resetPresetMemory();
    const settings = build('solar-system', COND.seed);
    canvas.width = width;
    canvas.height = height;
    const state = {
      zoom,
      pan: { x: -panAU * 100 * zoom, y: 0 },
      frameOffset: { x: 0, y: 0 },
      paused: true,
      frame_count: 0,
    };
    physics.setStateReference(state);
    const dtSim = frameAdvance(seconds, settings.sim_speed, physics.DT);
    const plan = substepPlan(dtSim, settings.max_timestep);
    engine(COND.seed, () => {
      for (let f = 0; f < C.frames; f++)
        for (let i = 0; i < plan.substeps; i++)
          physics.updatePhysics(plan.step);
    });
    return live();
  };
  const rows = [];
  const control = {};
  for (const zoom of C.zooms) {
    for (const panAU of C.panAU) {
      // The reference ignores the view: a zero-sized canvas keeps every body.
      const reference = one(0, 0, zoom, panAU);
      let worst = 0;
      let worstEqual = true;
      const detail = [];
      for (const [w, h] of C.canvases) {
        const got = one(w, h, zoom, panAU);
        let deleted = 0;
        for (const k of reference) if (!got.has(k)) deleted++;
        worst = Math.max(worst, deleted);
        if (got.size !== reference.size) worstEqual = false;
        detail.push({ canvas: `${w}x${h}`, deleted, live: got.size });
      }
      rows.push({
        id: `R6.deleted@${rate}.z${zoom}.p${panAU}`,
        quantity: 'deleted',
        value: worst,
        bound: THRESHOLDS.cases.R6.checks.deleted.bound,
        condition: `zoom ${zoom}, pan ${panAU} AU, ${rate === 'clamp' ? 'at the slow-frame clamp' : `${rate} frames a second`}`,
        liveEqual: worstEqual,
        referenceLive: reference.size,
        detail,
      });
    }
  }
  // The control: a view panned far away must delete, or this harness cannot see a cull.
  const far = one(1366, 800, 0.25, 100000);
  const ref0 = one(0, 0, 0.25, 0);
  control.deletedAtHundredThousandAU = [...ref0].filter(
    k => !far.has(k)
  ).length;
  return { rows, control };
}

// -----------------------------------------------------------------------------
// The parent: schedule legs, judge, compare with the record
// -----------------------------------------------------------------------------

function runChild(spec) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), '--leg', JSON.stringify(spec)],
      { cwd: fileURLToPath(ROOT), stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d));
    child.stderr.on('data', d => (err += d));
    child.on('close', code => {
      const line = out.split('\n').find(l => l.startsWith('LEG-RESULT '));
      if (code !== 0 || !line)
        return reject(
          new Error(
            `leg ${JSON.stringify(spec)} exited ${code}: ${err.slice(-600)}${out.slice(-300)}`
          )
        );
      resolve(JSON.parse(line.slice('LEG-RESULT '.length)));
    });
  });
}

async function pool(specs, jobs, costOf) {
  const queue = [...specs].sort((a, b) => costOf(b) - costOf(a));
  const results = [];
  let failure = null;
  const worker = async () => {
    while (queue.length && !failure) {
      const spec = queue.shift();
      try {
        results.push(await runChild(spec));
      } catch (e) {
        failure = e;
      }
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
  if (failure) throw failure;
  return results;
}

// A rate's step as a multiple of 1/24 (sim_speed 1): 120 fps is 1, the clamp 6.
const RATE_STEP = { 120: 1, 60: 2, 30: 4, clamp: 6 };
const legCost = spec => {
  if (spec.kind === 'case') return COST[spec.id] / RATE_STEP[spec.rate];
  if (spec.kind === 'study')
    return COST[spec.id] / (STEPS[spec.stepIndex] * 24);
  return 1;
};

const passes = r => Number.isFinite(r.value) && r.value <= r.bound;

function judge(results, wantedCases, wantStudy) {
  const rows = [];
  const steps = [];
  const study = [];
  const reported = {};
  const spread = {};
  for (const res of results) {
    const { spec } = res;
    if (spec.kind === 'case') {
      steps.push({
        case: spec.id,
        rate: spec.rate,
        substeps: res.substeps,
        step: sig(res.step, 6),
      });
      for (const r of res.rows)
        rows.push({
          id: `${spec.id}.${r.quantity}@${spec.rate}`,
          case: spec.id,
          quantity: r.quantity,
          rate: spec.rate,
          step: sig(res.step, 6),
          value: sig(r.value),
          bound: sig(r.bound),
          pass: passes(r),
          limit: '',
        });
      reported[`${spec.id}@${spec.rate}`] = Object.fromEntries(
        Object.entries(res.reported).map(([k, v]) => [k, sig(v)])
      );
      if (spec.id === 'R5') spread[spec.rate] = res.data;
    } else if (spec.kind === 'camera' || spec.kind === 'tiers') {
      for (const r of res.rows) {
        const { id, ...rest } = r;
        rows.push({
          id,
          case: spec.kind === 'camera' ? 'R6' : 'tiers',
          ...rest,
          rate: spec.rate,
          pass: passes(r),
          limit: '',
        });
      }
      if (res.control) reported[`R6.control@${spec.rate}`] = res.control;
    } else if (spec.kind === 'study') {
      const bounds = {};
      const values = {};
      for (const r of res.rows) {
        values[r.quantity] = sig(r.value);
        bounds[r.quantity] = sig(r.bound);
      }
      study.push({
        case: spec.id,
        scenario: SCENARIO[spec.id],
        integrator: INTEGRATOR[spec.id],
        label: STEP_LABELS[spec.stepIndex],
        step: STEPS[spec.stepIndex],
        steps: res.steps,
        values,
        bounds,
        pass: Object.fromEntries(res.rows.map(r => [r.quantity, passes(r)])),
        reported: Object.fromEntries(
          Object.entries(res.reported ?? {}).map(([k, v]) => [k, sig(v)])
        ),
        data: res.data
          ? Object.fromEntries(
              Object.entries(res.data).map(([k, v]) => [k, sig(v)])
            )
          : undefined,
      });
    }
  }
  // The across-rate rows of R5.
  if (wantedCases.has('R5') && RATES.every(r => spread[r])) {
    const T = THRESHOLDS.cases.R5.checks;
    const spreadOf = key => {
      const v = RATES.map(r => spread[r][key]);
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      return mean === 0 ? 0 : (Math.max(...v) - Math.min(...v)) / mean;
    };
    for (const [quantity, key, bound] of [
      ['massSpread', 'massFraction', T.massSpread.bound],
      ['fragmentSpread', 'fragments', T.fragmentSpread.bound],
    ]) {
      const value = spreadOf(key);
      rows.push({
        id: `R5.${quantity}`,
        case: 'R5',
        quantity,
        rate: 'all',
        value: sig(value),
        bound,
        pass: value <= bound,
        limit: '',
        perRate: Object.fromEntries(
          RATES.map(r => [r, sig(spread[r][key], 6)])
        ),
      });
    }
  }
  // Orders observed in the study: log2 of the error ratio at h and h/2.
  for (const id of CASE_IDS) {
    const list = study
      .filter(s => s.case === id)
      .sort((a, b) => b.step - a.step);
    for (let i = 1; i < list.length; i++) {
      list[i].order = {};
      for (const q of Object.keys(list[i].values)) {
        const a = list[i - 1].values[q];
        const b = list[i].values[q];
        if (a > 0 && b > 0) list[i].order[q] = sig(Math.log2(a / b), 3);
      }
    }
  }
  void wantStudy;
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  study.sort((a, b) =>
    a.case === b.case ? b.step - a.step : a.case < b.case ? -1 : 1
  );
  return { rows, steps, study, reported };
}

function closeEnough(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return a === b;
  if (a === b) return true;
  return Math.abs(a - b) <= 1e-3 * Math.max(Math.abs(a), Math.abs(b)) + 1e-300;
}

async function main() {
  const only = arg('--only');
  const wanted = new Set(only ? only.split(',') : [...CASE_IDS, 'R6', 'tiers']);
  const write = flag('--write');
  // --write also runs the step study unless --keep-study says to leave the
  // recorded one (it is the long part, and the judged rows do not depend on it).
  const study = flag('--study') || (write && !flag('--keep-study'));
  const jobs = Number(arg('--jobs') ?? 2);
  if (write && only) throw new Error('--write needs every case: drop --only');

  const specs = [];
  for (const id of CASE_IDS)
    if (wanted.has(id))
      for (const rate of RATES) specs.push({ kind: 'case', id, rate });
  if (wanted.has('R6'))
    for (const rate of RATES) specs.push({ kind: 'camera', rate });
  if (wanted.has('tiers')) specs.push({ kind: 'tiers' });
  if (study)
    for (const id of CASE_IDS)
      if (wanted.has(id))
        for (let stepIndex = 0; stepIndex < STEPS.length; stepIndex++)
          specs.push({ kind: 'study', id, stepIndex });

  const results = await pool(specs, jobs, legCost);
  const out = judge(results, wanted, study);

  console.log('# rows: pass|FAIL id value (bound)');
  for (const r of out.rows)
    console.log(`${r.pass ? 'pass' : 'FAIL'} ${r.id} ${r.value}`);
  console.log('# bounds');
  for (const r of out.rows)
    console.log(`# ${r.id} value ${r.value} bound ${r.bound}`);
  const failing = out.rows.filter(r => !r.pass).map(r => r.id);
  console.log(
    `# ${out.rows.length} rows, ${out.rows.length - failing.length} pass, ${failing.length} fail`
  );
  if (study) {
    console.log('# step study (reported, not judged)');
    for (const s of out.study)
      console.log(
        `# ${s.case} ${s.integrator} ${s.label} ${JSON.stringify(s.values)} bounds ${JSON.stringify(s.bounds)} order ${JSON.stringify(s.order ?? {})}`
      );
  }

  const recordUrl = new URL(RECORD_FILE, ROOT);
  const prior = existsSync(recordUrl)
    ? JSON.parse(readFileSync(recordUrl, 'utf8'))
    : null;
  if (write) {
    const limits = new Map((prior?.rows ?? []).map(r => [r.id, r.limit ?? '']));
    for (const r of out.rows) if (!r.pass) r.limit = limits.get(r.id) ?? '';
    const record = {
      format: 'gravitas.reference-record/1',
      thresholds: 'tests/fixtures/reference-cases/thresholds.json',
      note: 'Written by node tools/reference-cases.mjs --write. A row that fails keeps `limit` empty until the change that states the limit in the product fills it; a change that fixes a row flips that row in its own change. `steps` is what each run stated: the substeps and the step the page would take at that rate.',
      steps: out.steps.sort((a, b) =>
        a.case === b.case
          ? a.rate < b.rate
            ? -1
            : 1
          : a.case < b.case
            ? -1
            : 1
      ),
      rows: out.rows,
      failing,
      reported: out.reported,
      study: study ? out.study : (prior?.study ?? []),
    };
    writeFileSync(recordUrl, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`# wrote ${RECORD_FILE}`);
    return flag('--strict') && failing.length ? 1 : 0;
  }
  if (!prior) {
    console.log('# no record: run with --write');
    return 1;
  }
  // Compare with the record: every produced row, as recorded.
  const byId = new Map(prior.rows.map(r => [r.id, r]));
  let differs = 0;
  for (const r of out.rows) {
    const rec = byId.get(r.id);
    if (!rec) {
      console.log(`DIFF ${r.id} is not in the record`);
      differs++;
    } else if (rec.pass !== r.pass || !closeEnough(rec.value, r.value)) {
      console.log(
        `DIFF ${r.id}: recorded ${rec.pass ? 'pass' : 'FAIL'} ${rec.value}, now ${r.pass ? 'pass' : 'FAIL'} ${r.value}`
      );
      differs++;
    }
  }
  if (!only) {
    const have = new Set(out.rows.map(r => r.id));
    for (const rec of prior.rows)
      if (!have.has(rec.id)) {
        console.log(`DIFF ${rec.id} is in the record and was not produced`);
        differs++;
      }
  }
  if (study) {
    for (const s of out.study) {
      const rec = prior.study.find(
        p => p.case === s.case && p.label === s.label
      );
      if (!rec) {
        console.log(`DIFF study ${s.case} ${s.label} is not in the record`);
        differs++;
        continue;
      }
      for (const q of Object.keys(s.values))
        if (!closeEnough(rec.values[q], s.values[q])) {
          console.log(
            `DIFF study ${s.case} ${s.label} ${q}: recorded ${rec.values[q]}, now ${s.values[q]}`
          );
          differs++;
        }
    }
  }
  console.log(`# ${differs} differences from the record`);
  return differs || (flag('--strict') && failing.length) ? 1 : 0;
}

async function legMain() {
  const spec = JSON.parse(arg('--leg'));
  // The camera leg needs a canvas before step.js is first imported (the
  // element is read once, at module load, and is mutated between runs).
  if (spec.kind === 'camera') {
    const canvas = { width: 0, height: 0 };
    const nothing = () => null;
    globalThis.document = {
      getElementById: id => (id === 'simulationCanvas' ? canvas : null),
      querySelector: nothing,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({
        style: {},
        getContext: nothing,
        addEventListener: () => {},
        setAttribute: () => {},
        appendChild: () => {},
      }),
      documentElement: { style: {}, classList: { add() {}, remove() {} } },
      body: { appendChild() {}, classList: { add() {}, remove() {} } },
    };
    globalThis.__referenceCanvas = canvas;
  }
  const out = await runLeg(spec);
  process.stdout.write(`LEG-RESULT ${JSON.stringify(out)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  if (flag('--leg')) {
    legMain().then(
      () => process.exit(0),
      e => {
        console.error(e);
        process.exit(2);
      }
    );
  } else {
    main().then(
      code => process.exit(code),
      e => {
        console.error(e);
        process.exit(2);
      }
    );
  }
}
