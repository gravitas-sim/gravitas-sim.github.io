#!/usr/bin/env node
// =============================================================================
// The tidal-torque gate's harness (Prompt 204, part B; SPIKE: never merged)
// -----------------------------------------------------------------------------
//   node tools/tidal-torque-gate.mjs [--json]
//
// Runs G1 to G7 of tests/fixtures/tidal-torque-gate/thresholds.json against the
// engine with the seam (js/engine/forces.js tidalPairs), judging each against
// the bound in the file and not a copy. The reference is the independent DOP853
// run pinned in tests/fixtures/tidal-torque-gate/oracle-results.json; the closed
// form is the kernel's (js/kernels/tides, with the engine's G and the stated
// rate). The harness advances the planet's spin by the trapezoid rule after each
// step (TIDAL_TORQUE_GATE.md, clarifications).
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as physics from '../js/physics.js';
import { tidalPairs, tidalPairTerms } from '../js/engine/forces.js';
import { evolveCircular } from '../js/kernels/tides/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(readFileSync(path.join(HERE, '..', p), 'utf8'));
const TH = read('tests/fixtures/tidal-torque-gate/thresholds.json');
const INP = read('tools/tidal-torque-gate-oracle/oracle-inputs.json');
const REF = read('tests/fixtures/tidal-torque-gate/oracle-results.json');
const B = TH.bounds;
const SCHEMES = Object.keys(TH.harness.stepsPerOrbit);

const { G, M, m, a0, R, alpha, eps0, orbits } = INP;
const muTot = G * (M + m);
const n0 = Math.sqrt(muTot / a0 ** 3);
const T0 = (2 * Math.PI) / n0;
const spin0 = INP.spinOverN0 * n0;
const I = alpha * M * R * R;
const kq = INP.k2 / INP.Q;
const rate = eps0 / (1.5 * kq * (m / M) * (R / a0) ** 5);

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const rel = (a, b) => Math.abs(a - b) / (Math.abs(b) || 1);

function setup(scheme, strength) {
  for (const l of [physics.planets, physics.stars, physics.asteroids])
    l.length = 0;
  physics.bh_list.length = 0;
  physics.updatePhysicsSettings({
    gravitational_constant: G,
    mutual_gravity: true,
    follow_mode: 'None',
    bh_behavior: 'Static',
    integrator: scheme,
  });
  physics.setStateReference({
    frame_count: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    paused: false,
  });
  physics.updatePhysics(1e-9);
  const planet = new physics.Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
  const moon = new physics.Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
  planet.mass = M;
  moon.mass = m;
  planet.radius = 1;
  moon.radius = 1;
  const vrel = Math.sqrt(muTot / a0);
  planet.pos = { x: -(m / (M + m)) * a0, y: 0 };
  moon.pos = { x: (M / (M + m)) * a0, y: 0 };
  planet.vel = { x: 0, y: -(m / (M + m)) * vrel };
  moon.vel = { x: 0, y: (M / (M + m)) * vrel };
  physics.planets.push(planet, moon);
  tidalPairs.length = 0;
  const pair = {
    planetId: planet.id,
    moonId: moon.id,
    eps0: strength,
    a0,
    spin: spin0,
  };
  tidalPairs.push(pair);
  return { planet, moon, pair };
}

/** Osculating semi-major axis of the relative orbit, and its angular momentum. */
function state(planet, moon) {
  const rx = moon.pos.x - planet.pos.x;
  const ry = moon.pos.y - planet.pos.y;
  const vx = moon.vel.x - planet.vel.x;
  const vy = moon.vel.y - planet.vel.y;
  const r = Math.hypot(rx, ry);
  const a = 1 / (2 / r - (vx * vx + vy * vy) / muTot);
  const mu = (M * m) / (M + m);
  return {
    a,
    r,
    rx,
    ry,
    vx,
    vy,
    L: mu * (rx * vy - ry * vx),
    E: -(G * M * m) / (2 * a),
    px: M * planet.vel.x + m * moon.vel.x,
    py: M * planet.vel.y + m * moon.vel.y,
  };
}

/** One run: returns the orbit-end samples and the account. */
function run(scheme, perOrbit, strength = eps0) {
  const { planet, moon, pair } = setup(scheme, strength);
  const dt = T0 / perOrbit;
  let s = state(planet, moon);
  const start = s;
  let intTau = 0;
  let intWork = 0;
  const terms = st => {
    const t = tidalPairTerms(pair, planet, moon, G);
    const vTheta = (-st.ry * st.vx + st.rx * st.vy) / st.r; // v_rel . theta-hat * r / r
    return {
      tau: strength === 0 ? 0 : t.torque,
      power: t.force * ((-st.ry * st.vx + st.rx * st.vy) / st.r) * (1 / 1),
    };
  };
  let prev = terms(s);
  const samples = [{ a: s.a, L: s.L, E: s.E, spin: pair.spin }];
  for (let k = 0; k < orbits; k++) {
    for (let i = 0; i < perOrbit; i++) {
      physics.updatePhysics(dt);
      s = state(planet, moon);
      const cur = terms(s);
      intTau += 0.5 * (prev.tau + cur.tau) * dt;
      intWork += 0.5 * (prev.power + cur.power) * dt;
      pair.spin -= (0.5 * (prev.tau + cur.tau) * dt) / I;
      prev = cur;
    }
    samples.push({ a: s.a, L: s.L, E: s.E, spin: pair.spin });
  }
  return { start, end: s, samples, intTau, intWork, planet, moon, pair };
}

function main() {
  // ---- G3, G4, G5, G6, G7 per scheme -------------------------------------------
  const cf = evolveCircular({
    primaryMass: M,
    primaryRadius: R,
    satelliteMass: m,
    semiMajorAxis: a0,
    k2: INP.k2,
    Q: INP.Q,
    spin: spin0,
    alpha,
    G,
    rate,
    time: orbits * T0,
  });
  const dA = cf.a - a0;
  row(
    'ref.closedForm.vs.oracle',
    rel(cf.a, REF.aEnd),
    null,
    true,
    `closed form ${cf.a} against DOP853 ${REF.aEnd}`
  );
  const fits = {};
  for (const scheme of SCHEMES) {
    const Ns = TH.harness.stepsPerOrbit[scheme];
    const errs = [];
    let finest = null;
    for (const N of Ns) {
      const r = run(scheme, N);
      errs.push(Math.abs(r.end.a - REF.aEnd) / a0);
      finest = r;
    }
    // slope of log err against log dt (dt proportional to 1 / N)
    const xs = Ns.map(N => Math.log(1 / N));
    const ys = errs.map(e => Math.log(e));
    const mx = xs.reduce((p, c) => p + c, 0) / xs.length;
    const my = ys.reduce((p, c) => p + c, 0) / ys.length;
    const slope =
      xs.reduce((p, x, i) => p + (x - mx) * (ys[i] - my), 0) /
      xs.reduce((p, x) => p + (x - mx) ** 2, 0);
    fits[scheme] = { errs, slope };
    const [lo, hi] = B['G4.order'].bounds[scheme];
    row(
      `G4.order.${scheme}`,
      slope,
      [lo, hi],
      slope >= lo && slope <= hi,
      `errors ${errs.map(e => e.toExponential(2)).join(', ')} at ${Ns.join(', ')} steps per orbit`
    );

    const dNum = finest.end.a - a0;
    const g3 = Math.abs(dNum - dA) / Math.abs(dA);
    row(
      `G3.closedForm.${scheme}`,
      g3,
      B['G3.closed.form'].bounds[scheme],
      g3 <= B['G3.closed.form'].bounds[scheme],
      `change in a ${dNum} against closed form ${dA}`
    );

    const vOrb = Math.sqrt(muTot / a0);
    const p = Math.hypot(finest.end.px, finest.end.py) / (m * vOrb);
    row(
      `G5.momentum.${scheme}`,
      p,
      B['G5.momentum'].bounds.relative,
      p <= B['G5.momentum'].bounds.relative
    );

    const dL = finest.end.L - finest.start.L;
    const dE = finest.end.E - finest.start.E;
    const rL = Math.abs(dL - finest.intTau) / Math.abs(dL);
    const rE = Math.abs(dE - finest.intWork) / Math.abs(dE);
    const b6 = B['G6.budget'].bounds[scheme];
    row(
      `G6.angularMomentum.${scheme}`,
      rL,
      b6,
      rL <= b6,
      `change ${dL}, integral of torque ${finest.intTau}`
    );
    row(
      `G6.energy.${scheme}`,
      rE,
      b6,
      rE <= b6,
      `change ${dE}, work ${finest.intWork}`
    );

    // G7: total energy at orbit ends never rises; the fall matches the closed form.
    const tot = finest.samples.map(x => x.E + 0.5 * I * x.spin * x.spin);
    let rise = 0;
    for (let i = 1; i < tot.length; i++) if (tot[i] > tot[i - 1]) rise++;
    row(
      `G7.rises.${scheme}`,
      rise,
      0,
      rise === 0,
      'orbit-end samples of the total energy'
    );
    const fall = tot[0] - tot[tot.length - 1];
    const fallCf =
      (-G * M * m) / (2 * a0) + 0.5 * I * spin0 * spin0 - cf.energy;
    const d7 = rel(fall, fallCf);
    row(
      `G7.dissipation.${scheme}`,
      d7,
      B['G7.dissipation'].bounds.dissipationRelative,
      d7 <= B['G7.dissipation'].bounds.dissipationRelative,
      `fall ${fall}, closed form ${fallCf}`
    );
  }

  // ---- G2: zero strength is bit-identical to the pair absent --------------------
  for (const scheme of SCHEMES) {
    const N = TH.harness.stepsPerOrbit[scheme][0];
    const zero = run(scheme, N, 0);
    // pair absent: same run with an empty registry
    const absent = (() => {
      const { planet, moon } = setup(scheme, 0);
      tidalPairs.length = 0;
      const dt = T0 / N;
      for (let k = 0; k < orbits * N; k++) physics.updatePhysics(dt);
      return state(planet, moon);
    })();
    const same = ['a', 'L', 'E', 'px', 'py', 'rx', 'ry', 'vx', 'vy'].every(k =>
      Object.is(zero.end[k], absent[k])
    );
    row(
      `G2.zeroStrength.${scheme}`,
      same ? 0 : 1,
      0,
      same,
      'bit-identical to the pair absent'
    );
  }
  return fits;
}

const fits = main();
if (process.argv.includes('--json'))
  process.stdout.write(`${JSON.stringify({ rows, fits }, null, 1)}\n`);
else {
  for (const r of rows) {
    const v = typeof r.measured === 'number' ? r.measured.toPrecision(5) : '';
    const tag = r.pass === null ? 'n/a' : r.pass ? 'pass' : 'FAIL';
    process.stdout.write(
      `${tag.padEnd(6)}${r.id.padEnd(38)}${v.padEnd(14)}${JSON.stringify(r.bound)} ${r.note}\n`
    );
  }
}
process.exit(rows.some(r => r.pass === false) ? 1 : 0);
