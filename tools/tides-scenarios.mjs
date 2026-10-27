#!/usr/bin/env node
// =============================================================================
// The ring and Roche scenarios, measured (Prompt 204 part 2)
// -----------------------------------------------------------------------------
// Builds 'ring-gap' and 'roche-pass' through the real world builder under a
// seed, steps the unmodified engine (no extra force) and reads the legs of
// tests/fixtures/tides/display-thresholds.json: s1 to s6 for the ring and r1
// to r4 for the pass. The bounds are the committed ones; this file only
// measures and says pass or fail against them.
//
//   node tools/tides-scenarios.mjs          print the measurements
//   node tools/tides-scenarios.mjs --write  rewrite tests/fixtures/tides/display-record.json
//
// `extent` is the one term the thresholds left to this file: twice the 90th
// percentile of the particles' distances from the median position, so one
// escaper does not decide it.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as physics from '../js/physics.js';
import { applyPreset } from '../js/scenarios.js';
import { ENGINE_GEOMETRY, buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';
import { bumpWorldGeneration } from '../js/engine/state.js';
import { resonanceRadius, rocheLimit } from '../js/kernels/tides/index.js';

const noop = () => {};
const ROOT = new URL('../', import.meta.url);
const THRESHOLDS = JSON.parse(
  readFileSync(new URL('tests/fixtures/tides/display-thresholds.json', ROOT))
);
export const RECORD_FILE = 'tests/fixtures/tides/display-record.json';

/** Build a scenario under a seed through the world builder; the settings it left. */
export function build(key, seed) {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  physics.setStateReference(state);
  withSeed(seed, () =>
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => null,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    })
  );
  // A second world of the same shape would otherwise run against the first
  // one's cached bodies.
  bumpWorldGeneration();
  return settings;
}

const round = (v, d = 4) => Number(v.toPrecision(d));
const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);

/** The ring: moons (or none, for the control), 20 orbits of the resonant moon. */
export function measureRing(withMoons = true) {
  const run = THRESHOLDS.scenarios['ring-gap'].run;
  const settings = build('ring-gap', run.seed);
  const planet = physics.gas_giants[0];
  const G = settings.gravitational_constant;
  const resonant = physics.planets.find(p => p.name === 'Resonant moon');
  const shepherd = physics.planets.find(p => p.name === 'Shepherd moon');
  const aM = dist(resonant, planet);
  const aS = dist(shepherd, planet);
  const aRes = resonanceRadius({ semiMajorAxis: aM, p: 2, q: 1 }).radius;
  const hill = aS * Math.cbrt(shepherd.mass / (3 * planet.mass));
  const period =
    2 * Math.PI * Math.sqrt(aM ** 3 / (G * (planet.mass + resonant.mass)));
  if (!withMoons) physics.planets.length = 0;
  const radius = b => dist(b, planet);
  const ecc = b => {
    const x = b.pos.x - planet.pos.x;
    const y = b.pos.y - planet.pos.y;
    const vx = b.vel.x - planet.vel.x;
    const vy = b.vel.y - planet.vel.y;
    const r = Math.hypot(x, y);
    const mu = G * (planet.mass + b.mass);
    const h = x * vy - y * vx;
    return Math.hypot((vy * h) / mu - x / r, (-vx * h) / mu - y / r);
  };
  const hw = run.windowHalfWidth * aM;
  const mean = a =>
    a.length ? a.reduce((s, b) => s + ecc(b), 0) / a.length : NaN;
  const band = (c, lo, hi, list) =>
    list.filter(b => {
      const d = Math.abs(radius(b) - c);
      return d >= lo && d < hi;
    });
  const stats = () => {
    const ps = physics.asteroids.filter(b => b.alive !== false);
    const win = band(aRes, 0, hw, ps);
    const flankList = [...band(aRes, run.flankFrom * hw, run.flankTo * hw, ps)];
    const lane = band(aS, 2 * hill, 4 * hill, ps).length;
    const edgeCut = 0.76 * aM - 0.03 * aM;
    return {
      alive: ps.length,
      window: win.length,
      flankMean: flankList.length / 2,
      thinning: win.length / (flankList.length / 2),
      eccWindow: mean(win),
      eccFlank: mean(flankList),
      eccRatio: mean(win) / mean(flankList),
      lane,
      outer: ps.filter(b => radius(b) > edgeCut).length,
      finite: ps.every(
        b => Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y)
      ),
    };
  };
  const start = stats();
  const dt = 0.1;
  const steps = Math.round((run.orbitsOfResonantMoon * period) / dt);
  for (let i = 0; i < steps; i++) physics.updatePhysics(dt);
  const end = stats();
  return {
    aMoon: aM,
    aResonance: aRes,
    kernelResonance: resonanceRadius({ semiMajorAxis: aM, p: 2, q: 1 }).radius,
    ringInner: Math.min(...physics.asteroids.map(radius)),
    period,
    hillRadius: hill,
    dt,
    steps,
    start,
    end,
    laneRatio: end.lane / start.lane,
    outerRatio: end.outer / start.outer,
    aliveFraction: end.alive / start.alive,
  };
}

/** The pass at `q` planet radii; the clump's extent against time after periapsis. */
export function measureRoche(q = 1.3) {
  const run = THRESHOLDS.scenarios['roche-pass'].run;
  const params = ENGINE_GEOMETRY['roche-pass'].steps[0].rule.params;
  const kept = params.periapsisRadii;
  params.periapsisRadii = q;
  let settings;
  try {
    settings = build('roche-pass', run.seed);
  } finally {
    if (kept === undefined) delete params.periapsisRadii;
    else params.periapsisRadii = kept;
  }
  const planet = physics.gas_giants[0];
  const parts = physics.asteroids;
  const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const centre = () => ({
    x: med(parts.map(b => b.pos.x)),
    y: med(parts.map(b => b.pos.y)),
  });
  const extent = () => {
    const c = centre();
    const d = parts
      .map(b => Math.hypot(b.pos.x - c.x, b.pos.y - c.y))
      .sort((a, b) => a - b);
    return 2 * d[Math.floor(0.9 * d.length)];
  };
  const away = () => {
    const c = centre();
    return Math.hypot(c.x - planet.pos.x, c.y - planet.pos.y);
  };
  const G = settings.gravitational_constant;
  const mc = parts.reduce((s, b) => s + b.mass, 0);
  const rhoRatio = (planet.mass / mc) * (2 / planet.radius) ** 3;
  const start = extent();
  const r0 = away();
  const dt = q > 2 ? 0.02 : 0.01;
  let t = 0;
  let minAway = Infinity;
  let tPeri = 0;
  // Run past periapsis until the centre is back at the starting distance.
  let passed = false;
  for (let i = 0; i < 40000; i++) {
    physics.updatePhysics(dt);
    t += dt;
    const a = away();
    if (a < minAway) {
      minAway = a;
      tPeri = t;
    } else if (a > minAway * 1.05) passed = true;
    if (passed && a >= r0) break;
  }
  const end = extent();
  const unit = rhoRatio ** (1 / 3) * planet.radius;
  return {
    q,
    G,
    particles: parts.length,
    planetRadius: planet.radius,
    densityRatio: rhoRatio,
    rigidLimitRadii: 2 ** (1 / 3) * rhoRatio ** (1 / 3),
    fluidLimitRadii: 2.44 * rhoRatio ** (1 / 3),
    kernelRigidRadii: rocheLimit({
      primaryRadius: 1,
      primaryDensity: rhoRatio,
      satelliteDensity: 1,
      kind: 'rigid',
    }).distance,
    kernelFluidRadii: rocheLimit({
      primaryRadius: 1,
      primaryDensity: rhoRatio,
      satelliteDensity: 1,
      kind: 'fluid',
    }).distance,
    periapsisRadii: minAway / planet.radius,
    startExtent: start,
    endExtent: end,
    ratio: end / start,
    tPeriapsis: tPeri,
    tEnd: t,
    aliveFraction: parts.filter(b => b.alive !== false).length / parts.length,
    finite: parts.every(
      b => Number.isFinite(b.pos.x) && Number.isFinite(b.pos.y)
    ),
    unit,
  };
}

/** One measurement, by name, in this process. */
export function runLeg(name, fluidRadii) {
  if (name === 'ring') return measureRing(true);
  if (name === 'control') return measureRing(false);
  if (name === 'pass') return measureRoche(1.3);
  if (name === 'ctl') return measureRoche(1.5 * fluidRadii);
  throw new Error(`unknown leg ${name}`);
}

/**
 * Each measurement runs in a process of its own: the engine keeps module state
 * (caches, settings) between worlds, and a measurement that depends on what ran
 * before it is not one.
 */
export function inChild(name, fluidRadii = 0) {
  const out = execFileSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--leg', name, String(fluidRadii)],
    { maxBuffer: 1 << 26, encoding: 'utf8' }
  );
  return JSON.parse(out);
}

/** Everything, with each committed leg judged against its bound. */
export function measureAll() {
  const T = THRESHOLDS.scenarios;
  const ring = inChild('ring');
  const control = inChild('control');
  const pass = inChild('pass');
  const ctl = inChild('ctl', pass.fluidLimitRadii);
  const leg = (id, value, ok, extra = {}) => ({
    id,
    value: round(value),
    pass: ok,
    ...extra,
  });
  const legs = [
    leg(
      's1.resonance.radius',
      Math.abs(ring.aResonance / ring.kernelResonance - 1),
      Math.abs(ring.aResonance / ring.kernelResonance - 1) <= 1e-12
    ),
    leg(
      's2.eccentricity',
      ring.end.eccRatio,
      ring.end.eccRatio >=
        T['ring-gap'].checks['s2.eccentricity'].bounds.ratioAtLeast
    ),
    leg(
      's3.thinning',
      ring.end.thinning,
      ring.end.thinning <=
        T['ring-gap'].checks['s3.thinning'].bounds.ratioAtMost
    ),
    leg(
      's4b.lane',
      ring.laneRatio,
      ring.laneRatio <=
        T['ring-gap'].revision.checks['s4b.lane'].bounds.ratioAtMost
    ),
    leg(
      's5.control.thinning',
      control.end.thinning,
      control.end.thinning >=
        T['ring-gap'].checks['s5.control'].bounds.ratioAtLeast
    ),
    leg(
      's5.control.eccentricity',
      control.end.eccWindow,
      control.end.eccWindow <
        T['ring-gap'].checks['s5.control'].bounds.eccentricityBelow
    ),
    leg(
      's6.bodies',
      ring.aliveFraction,
      ring.aliveFraction >=
        T['ring-gap'].checks['s6.bodies'].bounds.fractionAtLeast &&
        ring.end.finite
    ),
    leg(
      'r1.limits',
      Math.max(
        Math.abs(pass.kernelRigidRadii / pass.rigidLimitRadii - 1),
        Math.abs(pass.kernelFluidRadii / pass.fluidLimitRadii - 1)
      ),
      pass.periapsisRadii < pass.rigidLimitRadii &&
        Math.abs(pass.kernelRigidRadii / pass.rigidLimitRadii - 1) < 1e-9 &&
        Math.abs(pass.kernelFluidRadii / pass.fluidLimitRadii - 1) < 1e-9
    ),
    leg(
      'r2.stretch',
      pass.ratio,
      pass.ratio >= T['roche-pass'].checks['r2.stretch'].bounds.ratioAtLeast
    ),
    leg(
      'r3.control',
      ctl.ratio,
      ctl.ratio <= T['roche-pass'].checks['r3.control'].bounds.ratioAtMost
    ),
    leg(
      'r4.bodies',
      pass.aliveFraction,
      pass.aliveFraction >=
        T['roche-pass'].checks['r4.bodies'].bounds.fractionAtLeast &&
        pass.finite
    ),
  ];
  // Not a committed leg: how much the control's answer depends on its exact
  // periapsis. Sixty bodies, and one that escapes sets the largest extent.
  const factors = [0.985, 0.995, 0.9995, 1.0005, 1.005, 1.015, 1.02];
  const sweepRatios = factors.map(
    f => inChild('ctl', pass.fluidLimitRadii * f).ratio
  );
  sweepRatios.push(ctl.ratio);
  sweepRatios.sort((a, b) => a - b);
  const ctlSweep = {
    what: 'the control run at periapsis factors about 1.5 times the fluid limit; sorted extent ratios (not a committed leg)',
    factors: [...factors, 1],
    ratios: sweepRatios.map(r => round(r)),
    underBound: sweepRatios.filter(
      r => r <= T['roche-pass'].checks['r3.control'].bounds.ratioAtMost
    ).length,
    runs: sweepRatios.length,
  };
  return { ring, control, pass, ctl, ctlSweep, legs };
}

const LEG = process.argv.indexOf('--leg');
if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  if (LEG > 0) {
    process.stdout.write(
      JSON.stringify(
        runLeg(process.argv[LEG + 1], Number(process.argv[LEG + 2]))
      )
    );
  } else {
    const all = measureAll();
    for (const l of all.legs)
      console.log(`${l.pass ? 'pass' : 'FAIL'}  ${l.id}  ${l.value}`);
    if (process.argv.includes('--write')) {
      const round5 = (k, v) =>
        typeof v === 'number' && Number.isFinite(v)
          ? Number(v.toPrecision(5))
          : v;
      writeFileSync(
        new URL(RECORD_FILE, ROOT),
        `${JSON.stringify(all, round5, 2)}\n`
      );
      console.log('wrote', RECORD_FILE);
    }
  }
}
