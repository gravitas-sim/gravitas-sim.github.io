#!/usr/bin/env node
// =============================================================================
// Does the engine run backwards?
// -----------------------------------------------------------------------------
// Headless. Nothing here ships and nothing here costs a byte of bundle.
//
// The question is narrow and empirical: pin the step, switch off every stage
// that destroys information, integrate N steps forward, negate the step,
// integrate N steps back, and see how far from the start we land. Do it for
// three systems and all three integrators, across step sizes, and look at how
// the error scales.
//
// The expectation going in is that velocity Verlet returns and symplectic Euler
// does not, and the reason is worth stating because it is the whole lesson:
// symplectic and time-symmetric are different properties. Symplectic Euler
// conserves a shadow Hamiltonian and keeps its energy error bounded forever,
// which is why it is the default - and it is not self-adjoint. Running it
// backwards does not undo it:
//
//   forward    v' = v + a(x) dt        then   x' = x + v' dt
//   backward   w  = v' - a(x') dt      then   y  = x' - w dt
//
// and w = v only if a(x') = a(x), which is exactly what a step changes. The
// per-step return error is dt*(a(x') - a(x)) = O(dt^2).
//
// Velocity Verlet is its own adjoint. Half a kick on the old acceleration, a
// full drift, half a kick on the new one - reversed, the same three operations
// in the same order with the signs flipped, and every term cancels. It should
// return to floating point.
//
// RK4 is fourth-order and not symmetric, so it should return well but not
// exactly, with a per-step error of O(dt^5).
//
//   node tools/reversibility-probe.mjs
//   node tools/reversibility-probe.mjs --json
// =============================================================================

import { installDomShim } from './dom-shim.mjs';
import { substepPlan } from '../js/timestep.js';

installDomShim();

const P = await import('../js/physics.js');
const { TRAPPIST1_PLANETS, TRAPPIST1_STAR } =
  await import('../js/data/trappist1.js');
const { IRREVERSIBLE } = await import('../js/data/irreversible.js');
const asJson = process.argv.includes('--json');

const BODY_LISTS = [
  'bh_list',
  'planets',
  'stars',
  'gas_giants',
  'asteroids',
  'comets',
  'debris',
  'particles',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'accretion_disk_particles',
];

/**
 * Every stage that destroys information, switched off.
 *
 * This is the control. A reverse run that hits a merge, a collapse or a cull
 * is not measuring the integrator, it is measuring the thing it hit - and the
 * point of this probe is to isolate the integrator so that the audit which
 * follows can attribute everything else.
 */
const REVERSIBLE_LAB = {
  gravitational_constant: 1,
  mutual_gravity: true,
  star_only_gravity: false,
  // The three that delete or rewrite a body.
  enable_star_merging: false,
  dynamic_object_properties: false,
  orbit_decay_rate: 0,
  // A static hole is a one-way force: it pulls and is not pulled. That is a
  // broken third law, not an irreversibility, but it makes the system
  // non-autonomous in a way that muddies the measurement.
  bh_behavior: 'Orbiting',
  // Newtonian, no halo, no MOND. A background field is reversible, but it is
  // one more thing to have to argue about.
  galaxy_gravity: 'newtonian',
  galaxy_kpc_per_unit: 0,
  galaxy_msun_per_unit: 0,
  dark_matter_halo: false,
  // No softening floor within any separation used here, so the force law is a
  // clean inverse square in both directions. The clamp is reversible, but it
  // has a kink, and a kink is where a difference would hide.
  min_interaction_distance: 1e-9,
  // Substepping is applied by the harness, the way js/render.js applies it,
  // rather than by the engine. Zero here keeps the engine out of it.
  max_timestep: 0,
};

const clear = () => {
  for (const key of BODY_LISTS) {
    if (Array.isArray(P[key])) P[key].length = 0;
  }
  P.resetPhysicsObjectCounter?.();
};

/** Every body currently on the table, in a stable order. */
const bodies = () => {
  const out = [];
  for (const key of BODY_LISTS) {
    for (const o of P[key] || []) out.push(o);
  }
  return out;
};

const snapshot = () =>
  bodies().map(o => ({
    x: o.pos.x,
    y: o.pos.y,
    vx: o.vel.x,
    vy: o.vel.y,
    m: o.mass,
  }));

/**
 * How far a return landed from where it started.
 *
 * Reported relative to the size of the excursion rather than in raw units, so
 * that a tight orbit and a wide one can be compared: returning to within a
 * metre means something different on a 10-unit orbit and a 10,000-unit one.
 */
function returnError(before, after, travelled) {
  if (before.length !== after.length) {
    // Not a return error at all. A body left the scene, and whatever it hit on
    // the way out - the cull, a merge - is the thing being measured. Named
    // rather than blanked, because a blank row reads as "no data" when it is
    // in fact the most interesting result on the page.
    return { lost: before.length - after.length };
  }
  let dx = 0;
  let dv = 0;
  for (let i = 0; i < before.length; i++) {
    dx = Math.max(
      dx,
      Math.hypot(after[i].x - before[i].x, after[i].y - before[i].y)
    );
    dv = Math.max(
      dv,
      Math.hypot(after[i].vx - before[i].vx, after[i].vy - before[i].vy)
    );
  }
  return { dx, dv, relative: travelled > 0 ? dx / travelled : dx };
}

/** How far the furthest body moved during the forward leg. */
function excursion(start, mid) {
  let d = 0;
  for (let i = 0; i < start.length && i < mid.length; i++) {
    d = Math.max(d, Math.hypot(mid[i].x - start[i].x, mid[i].y - start[i].y));
  }
  return d;
}

// The constructor shape the validation suite uses: position and velocity as
// objects, mass in solar units, and the three flags that keep a body out of
// the housekeeping. `persistent` matters most - a body culled mid-run would
// read as an integrator failure.
const star = (x, y, vx, vy, massUnits) => {
  const s = new P.StarObject({ x, y }, { x: vx, y: vy }, massUnits / 1000);
  s.mass = massUnits;
  s.radius = 0.5;
  s.intact = true;
  s.persistent = true;
  return s;
};

const planet = (x, y, vx, vy, massUnits) => {
  const b = new P.Planet({ x, y }, { x: vx, y: vy });
  b.mass = massUnits;
  b.radius = 0.5;
  b.intact = true;
  b.persistent = true;
  return b;
};

// --- The three systems -------------------------------------------------------
//
// A clean pair, a real packed system, and a chaotic one. The third matters
// most: a system whose trajectories diverge exponentially is where a reversible
// scheme has to prove it is reversing the arithmetic rather than being rescued
// by a well-behaved orbit.

/**
 * The step ceiling each system is integrated under, as a scenario would set it.
 *
 * TRAPPIST-1 is the reason the ceiling exists. Its innermost planet orbits in
 * 0.82 time units, so an uncapped 0.2 step gives it four steps per orbit, the
 * planets leave immediately and the run measures the cull rather than the
 * integrator. Capping puts substepPlan on both legs, which is the point: the
 * plan was unsigned until this branch, and a backward step was returning one
 * uncapped leap.
 */
const STEP_CAP = {
  'two-body': 0,
  'trappist-1': 0.004,
  'three-body-chaotic': 0,
  destructive: 0,
};

const SYSTEMS = {
  'two-body': () => {
    clear();
    // Circular, mass ratio 1000:1, radius 100. Period 2*pi*sqrt(r^3/GM).
    P.stars.push(star(0, 0, 0, 0, 1000));
    P.stars.push(star(100, 0, 0, Math.sqrt(1000 / 100), 1));
  },
  'trappist-1': () => {
    clear();
    // Built the way js/world/build.js builds it, from the same data: 100 units
    // per AU, the published semi-major axes, planets spaced evenly in phase so
    // no two start near each other, and radii at 0.115 units per Earth radius.
    //
    // The radius matters more than it looks. Adjacent orbits here are as
    // little as 0.43 units apart, and a first attempt at this gave every body
    // a radius of 0.5 and put them all on the same ray - so the inner three
    // were touching before the first step and the run lost them to a
    // collision at every step size, which reads exactly like an integrator
    // that cannot cope.
    const starMass = TRAPPIST1_STAR.massInSuns * 1000;
    const host = star(0, 0, 0, 0, starMass);
    host.radius = 0.12;
    P.stars.push(host);
    const AU = 100;
    const RADIUS_UNITS_PER_EARTH = 0.115;
    TRAPPIST1_PLANETS.forEach((p, i) => {
      const r = p.a * AU;
      const theta = (i / TRAPPIST1_PLANETS.length) * 2 * Math.PI;
      const v = Math.sqrt(starMass / r);
      const b = planet(
        r * Math.cos(theta),
        r * Math.sin(theta),
        -v * Math.sin(theta),
        v * Math.cos(theta),
        Math.max(p.mass * 0.000003003, 1e-7)
      );
      b.radius = p.radius * RADIUS_UNITS_PER_EARTH;
      P.planets.push(b);
    });
  },
  // Built to trip the audit rather than to be integrated well: a hole with
  // something falling into it, two rocky bodies aimed at each other, and a
  // fragment thrown hard enough to leave the view. Its return error is not
  // interesting; which operations fire is.
  destructive: () => {
    clear();
    const hole = new P.BlackHole({ x: 0, y: 0 }, 5, { x: 0, y: 0 });
    hole.radius = 3;
    hole.intact = true;
    P.bh_list.push(hole);
    // Straight in.
    P.stars.push(star(140, 0, -1.2, 0, 40));
    // Two rocky bodies on a closing course, well inside the view.
    P.planets.push(planet(-200, 30, 1.4, 0, 0.5));
    P.planets.push(planet(-120, 30, -1.4, 0, 0.5));
    // And one asteroid leaving for good.
    const a = new P.Asteroid({ x: 300, y: 300 }, { x: 40, y: 40 });
    a.mass = 1e-6;
    a.radius = 0.4;
    a.intact = true;
    P.asteroids.push(a);
  },
  'three-body-chaotic': () => {
    clear();
    // Three equal masses on a deliberately unbalanced triangle. No symmetry to
    // rescue it: the bodies pass close, the trajectories separate
    // exponentially, and a forward-then-back run has to survive that.
    P.stars.push(star(-60, 0, 0.6, 1.1, 300));
    P.stars.push(star(70, 30, -0.9, 0.4, 300));
    P.stars.push(star(10, -80, 0.3, -1.4, 300));
  },
};

const INTEGRATORS = ['Symplectic Euler', 'Velocity Verlet', 'RK4'];

/**
 * One forward-and-back run.
 *
 * Substepping is applied here exactly as js/render.js applies it, so that the
 * plan is part of what is being tested rather than bypassed.
 */
function probe(buildSystem, integrator, dt, steps, maxStep = 0) {
  buildSystem();
  P.updatePhysicsSettings({
    ...REVERSIBLE_LAB,
    integrator,
    max_timestep: maxStep,
  });
  P.setStateReference({
    frame_count: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    paused: false,
  });
  // After the bodies are pushed, not before. The engine caches the object
  // lists and keys that cache off list lengths, so rebuilding a system into
  // the same shape leaves it integrating the previous run's discarded bodies
  // while the snapshot reads the new ones - which shows up as a system that
  // does not move and a return error of exactly zero. That is the most
  // convincing wrong answer this probe could produce, so the excursion is
  // asserted below rather than assumed.
  P.bumpWorldGeneration();

  const start = snapshot();
  const advance = signedDt => {
    const { substeps, step } = substepPlan(signedDt, maxStep);
    for (let i = 0; i < substeps; i++) P.updatePhysics(step);
    return { substeps, step };
  };

  let plan = null;
  for (let i = 0; i < steps; i++) plan = advance(dt);
  const mid = snapshot();
  for (let i = 0; i < steps; i++) advance(-dt);
  const back = snapshot();

  const travelled = excursion(start, mid);
  // A run where nothing moved returns perfectly and means nothing. Anything
  // that fails to travel is reported as such rather than as a success.
  const moved = travelled > 1e-9;
  return {
    ...returnError(start, back, travelled),
    travelled,
    moved,
    plan,
  };
}

// --- Run ---------------------------------------------------------------------
const STEPS = [0.2, 0.1, 0.05, 0.025];
const COUNTS = [50, 200, 800];
const results = [];

for (const [name, build] of Object.entries(SYSTEMS)) {
  for (const integrator of INTEGRATORS) {
    for (const dt of STEPS) {
      for (const n of COUNTS) {
        const r = probe(build, integrator, dt, n, STEP_CAP[name]);
        results.push({ system: name, integrator, dt, steps: n, ...r });
      }
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ results }, null, 2));
} else {
  const e = v =>
    v === undefined ? '        -' : v.toExponential(2).padStart(9);
  const verdict = r => {
    if (r.lost === undefined) return r.moved === false ? '  DID NOT MOVE' : '';
    const n = Math.abs(r.lost);
    const noun = `bod${n === 1 ? 'y' : 'ies'}`;
    // A negative loss is a gain. Printing "LOST -12 bodies" for a scene that
    // built an accretion disk is a sign error in the reader's head, not in
    // the arithmetic, and it is the kind of thing that makes an instrument
    // stop being believed.
    return r.lost > 0 ? `  LOST ${n} ${noun}` : `  GAINED ${n} ${noun}`;
  };
  console.log('Return error after N steps forward and N steps back\n');
  console.log(
    'Every irreversible stage is off: no merging, no collapse, no decay,\n' +
      'no dynamic properties, orbiting holes, softening below every separation.\n' +
      'What is left is the integrator.\n'
  );
  for (const system of Object.keys(SYSTEMS)) {
    console.log(`  ${system}`);
    console.log(
      '    integrator          dt     N        |dx|       |dv|   |dx|/excursion'
    );
    for (const integrator of INTEGRATORS) {
      for (const row of results.filter(
        r => r.system === system && r.integrator === integrator
      )) {
        console.log(
          `    ${integrator.padEnd(17)}${String(row.dt).padStart(6)}${String(row.steps).padStart(6)}   ` +
            `${e(row.dx)}  ${e(row.dv)}  ${e(row.relative)}${verdict(row)}`
        );
      }
    }
    console.log('');
  }
}

// --- What the numbers say ----------------------------------------------------
//
// The scaling is the claim, not any single figure. At fixed N, halving the step
// should divide symplectic Euler's return error by about four - the per-step
// error is dt*(a(x') - a(x)) and a(x') - a(x) is itself O(dt) - while a
// self-adjoint scheme has nothing to divide, because its error is already the
// floating-point floor.
if (!asJson) {
  const fit = (system, integrator, steps) => {
    const rows = results
      .filter(
        r =>
          r.system === system &&
          r.integrator === integrator &&
          r.steps === steps &&
          r.dx > 0
      )
      .sort((a, b) => a.dt - b.dt);
    if (rows.length < 2) return null;
    // Slope of log(error) against log(dt), least squares.
    const lx = rows.map(r => Math.log(r.dt));
    const ly = rows.map(r => Math.log(r.dx));
    const mx = lx.reduce((a, b) => a + b, 0) / lx.length;
    const my = ly.reduce((a, b) => a + b, 0) / ly.length;
    let cov = 0;
    let varx = 0;
    for (let i = 0; i < lx.length; i++) {
      cov += (lx[i] - mx) * (ly[i] - my);
      varx += (lx[i] - mx) ** 2;
    }
    return varx > 0 ? cov / varx : null;
  };

  console.log('How the return error scales with the step, at N = 50');
  console.log(
    '  (slope of log error against log dt; 0 means "already at the floor")\n'
  );
  for (const system of Object.keys(SYSTEMS)) {
    for (const i of INTEGRATORS) {
      const p = fit(system, i, 50);
      const rows = results.filter(
        r =>
          r.system === system &&
          r.integrator === i &&
          r.steps === 50 &&
          r.dx > 0
      );
      const worst = rows.length ? Math.max(...rows.map(r => r.dx)) : NaN;
      // A slope fitted through numbers that are all 1e-16 is fitting noise.
      // Printing the worst error beside it is what makes that visible instead
      // of letting a reader take -0.79 for a measurement.
      const floor = worst < 1e-12 ? '   at the floating-point floor' : '';
      console.log(
        `  ${system.padEnd(20)} ${i.padEnd(17)} slope ${
          p === null ? ' n/a ' : p.toFixed(2).padStart(5)
        }   worst ${worst.toExponential(1)}${floor}`
      );
    }
  }
  console.log(
    '\n  Symplectic Euler near 2 is the prediction: it is symplectic and it is not\n' +
      '  self-adjoint, and those are different properties. Velocity Verlet near 0\n' +
      '  is a scheme already at the floating-point floor at every step size. RK4\n' +
      '  is fourth-order and not symmetric: it returns well and not exactly.'
  );
}

// --- And now with the irreversible stages switched back on -------------------
//
// Everything above ran with merging, collapse and decay disabled, so that the
// only thing being measured was the scheme. This is the other half: the same
// forward-and-back run with the engine as it actually ships, naming which of
// the audited operations fired and what it took with it.
//
// Attribution is by list: the audit knows which array each cull empties, so a
// list that shrank names the operation that shrank it. A merge and a
// fragmentation are told apart by whether the total went down or up - a merge
// turns two bodies into one, a shower turns one into several.
if (!asJson) {
  const inventory = () =>
    Object.fromEntries(BODY_LISTS.map(k => [k, (P[k] || []).length]));

  console.log('\n\nWith the irreversible stages left on\n');
  console.log(
    '  The runs above disabled them to isolate the integrator. These do not.\n' +
      '  Anything named here is information the engine destroyed, which no\n' +
      '  choice of scheme can give back.\n'
  );

  const byList = new Map(
    IRREVERSIBLE.filter(o => o.kind === 'cull').map(o => [o.detail.list, o])
  );

  for (const [name, build] of Object.entries(SYSTEMS)) {
    build();
    P.updatePhysicsSettings({
      ...REVERSIBLE_LAB,
      integrator: 'Velocity Verlet',
      // As shipped, not as convenient: the three the control above switched off.
      enable_star_merging: true,
      dynamic_object_properties: true,
      orbit_decay_rate: 0.005,
      max_timestep: STEP_CAP[name],
    });
    P.setStateReference({
      frame_count: 0,
      zoom: 1,
      pan: { x: 0, y: 0 },
      paused: false,
    });
    P.bumpWorldGeneration();

    const before = inventory();
    const start = snapshot();
    const cap = STEP_CAP[name];
    const go = d => {
      const { substeps, step } = substepPlan(d, cap);
      for (let i = 0; i < substeps; i++) P.updatePhysics(step);
    };
    for (let i = 0; i < 400; i++) go(0.05);
    for (let i = 0; i < 400; i++) go(-0.05);
    const after = inventory();
    const back = snapshot();

    const hits = [];
    for (const key of BODY_LISTS) {
      const delta = after[key] - before[key];
      if (delta === 0) continue;
      const op = byList.get(key);
      if (delta < 0) {
        hits.push(
          `${op ? op.id : `lost:${key}`} - ${-delta} ${key} gone (${
            op
              ? `${op.detail.buffer}x view-width cull, ${IRREVERSIBLE_LINE(op)}`
              : 'merged or absorbed'
          })`
        );
        continue;
      }
      // Which operation made bodies depends on which list grew. Attributing by
      // the sign alone put an accretion disk down to a rocky collision, which
      // is the wrong line of the wrong file: the disk is fed by what the hole
      // ate, and the rocky shower lands in `debris`.
      const source =
        key === 'accretion_disk_particles'
          ? 'merge:absorption - the disk a black hole builds out of what it ate'
          : key === 'debris'
            ? 'fragment:rocky-collision - an unseeded shower, unreproducible'
            : `appeared:${key}`;
      hits.push(`${source}; ${delta} new ${key}`);
    }
    // Only what actually fired. The first version of this printed the damping
    // line every time, including for systems with no black hole in them for
    // the damping to act on - an instrument that names operations that did not
    // happen is worse than no instrument, because it teaches the reader to
    // discount it.
    if (before.bh_list > 0) {
      hits.push(
        'damping:orbit_decay - black-hole velocities multiplied by ' +
          '(1 - 0.005 dt) each step; nothing records the energy removed'
      );
    }

    const sameCount = start.length === back.length;
    const err = sameCount
      ? Math.max(
          ...start.map((b, i) => Math.hypot(back[i].x - b.x, back[i].y - b.y))
        )
      : null;

    console.log(`  ${name}`);
    console.log(
      `    return error after 400 steps each way: ${
        err === null
          ? (() => {
              const d = back.length - start.length;
              return d > 0
                ? `not computable, the scene ended with ${d} more bodies than it started with`
                : `not computable, ${-d} bodies did not come back`;
            })()
          : err.toExponential(2)
      }`
    );
    for (const h of hits) console.log(`      ${h}`);
    if (!hits.length) {
      console.log(
        '      nothing fired: no body left the view, nothing touched anything,'
      );
      console.log(
        '      and there is no hole here to damp. The scheme is the only thing'
      );
      console.log('      standing between this run and an exact return.');
    }
    console.log('');
  }
}

/** Where an audited operation lives, for a reader who wants to go and look. */
function IRREVERSIBLE_LINE(op) {
  return `js/physics.js:${op.line}`;
}
