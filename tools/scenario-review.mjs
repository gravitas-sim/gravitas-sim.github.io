#!/usr/bin/env node
// =============================================================================
// The binary, three-body, flyby and slingshot scenarios, measured
// -----------------------------------------------------------------------------
// Builds eleven sandbox scenarios through the page's world builder under a
// seed, steps the unmodified engine the way the page steps it (js/timestep.js
// frameAdvance, then substepPlan, one updatePhysics per piece) at 30, 60 and
// 120 frames a second, and reads each claim of
// tests/fixtures/scenario-review/claims.json. That file is the spec: its
// numbers, tolerances, grids and measures are read from it here and are never
// written by this file. A measure that cannot be computed as written is
// recorded NOT RUN with the reason; nothing is reinterpreted to make it pass.
//
//   node tools/scenario-review.mjs                print every member's table
//   node tools/scenario-review.mjs --only a,b     only those members
//   node tools/scenario-review.mjs --jobs 2       members in child processes (2 at most)
//   node tools/scenario-review.mjs --write        rewrite tests/fixtures/scenario-review/record.json
//
// Units. SOLAR_MASS_UNIT and SIM_UNITS_PER_AU are js/constants.js; G is the
// row's gravitational_constant, and the runner checks that the engine's own
// copy (physicsSettings) is the same number. A "year" is the Kepler unit at
// that G: the period of 1 AU about 1 solar mass.
//
// Where a start is varied it is made the way the page makes it. The lab
// variables of js/scenarios.js (LAB_VARIABLES) are carried across a rebuild of
// the same scenario, so buildAt() sets them on the settings and tells
// applyPreset the scenario is being re-entered, which is what the Refresh
// button does after a panel writes one. Anything that is not a lab variable
// (a body deleted, a body nudged) is done to the built world, as the page's
// inspector and the Experiment Bench do it.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as physics from '../js/physics.js';
import {
  applyPreset,
  resetPresetMemory,
  SCENARIO_PRESETS,
} from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { normalizeSeed, withSeed } from '../js/rng.js';
import { bumpWorldGeneration, physicsSettings } from '../js/engine/state.js';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import { setTier } from '../js/quality.js';
import {
  AU_METERS,
  EARTH_MASS_UNIT,
  JUPITER_MASSES_PER_SOLAR_MASS,
  SIM_UNITS_PER_AU,
  SOLAR_MASS_UNIT,
} from '../js/constants.js';
import {
  asymptoticSpeed,
  deflectionAngle,
  measuredDeflection,
} from '../js/gravityAssist.js';
import { startAssistWatch, stopAssistWatch } from '../js/assistWatch.js';
import { jacobiConstant, massRatio } from '../js/cr3bp.js';

const ROOT = new URL('../', import.meta.url);
export const CLAIMS_FILE = 'tests/fixtures/scenario-review/claims.json';
export const RECORD_FILE = 'tests/fixtures/scenario-review/record.json';
export const CLAIMS = JSON.parse(readFileSync(new URL(CLAIMS_FILE, ROOT)));
export const FORMAT = 'gravitas.scenario-record/1';

/** Frames a second, and the real seconds one frame stands for. */
export const RATES = { 30: 1 / 30, 60: 1 / 60, 120: 1 / 120 };
export const AUDIT_SEEDS = ['audit', 'audit-2'];
const AU = SIM_UNITS_PER_AU;
// One simulation length unit in kilometres, from the constants (a unit is
// 0.01 AU) and, for the nudge, the value the Experiment Bench converts with.
const KM_PER_UNIT = AU_METERS / AU / 1000;
const BENCH_UNIT_KM = 1.495978707e6; // js/experiments/bench.js applyPerturbation
const noop = () => {};
// withSeed() takes the 32-bit integer the page stores (setWorldSeed runs text
// through normalizeSeed first). Handed the text 'audit' it would seed 0 for
// every word, so 'audit' and 'audit-2' would build the same world.
const engine = (seed, fn) => withSeed(normalizeSeed(seed), fn);

// -----------------------------------------------------------------------------
// Rows
// -----------------------------------------------------------------------------

const sig = (v, d = 6) =>
  typeof v === 'number' && Number.isFinite(v) && v !== 0
    ? Number(v.toPrecision(d))
    : typeof v === 'number' && !Number.isFinite(v)
      ? String(v)
      : v;
const clean = v => (Array.isArray(v) ? v.map(clean) : sig(v));

const BOUND_KEYS = [
  'value',
  'values',
  'unit',
  'tolerance',
  'bound',
  'range',
  'grid',
  'step',
  'limitSeparations',
  'threshold',
  'radiusAU',
  'what',
];

/**
 * The bound a row carries: exactly the committed fields of the claim, and its
 * measure in words, so a row says what it was held to. Pure; the test builds
 * the same object from claims.json to prove no bound moved.
 * @param {object} claim - One entry of a member's claims
 * @returns {object} The bound
 */
export function boundFor(claim) {
  const out = {};
  for (const k of BOUND_KEYS) if (claim[k] !== undefined) out[k] = claim[k];
  if (claim.measure) out.measure = claim.measure;
  return out;
}

/** A short text of a bound, for the table. */
const boundText = claim => {
  const b = boundFor(claim);
  const parts = [];
  if (b.values) parts.push(`${b.values.join(', ')}`);
  else if (b.value !== undefined) parts.push(String(b.value));
  if (b.tolerance !== undefined) parts.push(`+-${b.tolerance * 100}%`);
  if (b.bound !== undefined) parts.push(`< ${b.bound}`);
  if (b.range) parts.push(`in ${b.range.join('..')}`);
  if (b.limitSeparations !== undefined)
    parts.push(`< ${b.limitSeparations} sep`);
  if (b.threshold !== undefined) parts.push(`> ${b.threshold * 100}%`);
  return parts.join(' ') || '(see measure)';
};

/** One claim's reading at one rate and seed. pass: true, false or null (recorded, or NOT RUN). */
function row(claim, value, pass, note = '', status) {
  return {
    claim: claim.id,
    value: clean(value),
    bound: boundFor(claim),
    pass,
    status: status ?? (pass === null ? 'recorded' : pass ? 'pass' : 'fail'),
    note,
  };
}
const notRun = (claim, reason) => row(claim, null, null, reason, 'NOT RUN');

const within = (m, v, tol) => Math.abs(m - v) <= tol * Math.abs(v);

/** A card number read from the built world, held to the claim's tolerance. */
function cardRow(claim, measured, note = '') {
  const got = Array.isArray(measured) ? measured : [measured];
  // One card number for several bodies ("two stars of two solar masses each")
  // is held for every one of them.
  const want = claim.values ?? got.map(() => claim.value);
  const ok =
    got.length === want.length &&
    got.every((m, i) => within(m, want[i], claim.tolerance));
  return row(claim, Array.isArray(measured) ? got : got[0], ok, note);
}

/** A count held by equality. */
const countRow = (claim, n, note = '') =>
  row(claim, n, n === claim.value, note);

// -----------------------------------------------------------------------------
// Building and stepping, as the page does
// -----------------------------------------------------------------------------

const clone = o => JSON.parse(JSON.stringify(o));
const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'debris',
];
const allBodies = () => LISTS.flatMap(l => physics[l]);

/**
 * Build a scenario under a seed through the page's builder.
 *
 * @param {string} key - Scenario id
 * @param {number|string} seed - World seed
 * @param {object} [vary] - Lab variables to carry across the build, as the
 *   page carries them when the same scenario is rebuilt (see the header)
 * @returns {object} The settings the build left
 */
export function buildAt(key, seed, vary = null) {
  const settings = clone(DEFAULT_SETTINGS);
  settings.preset_scenario = key;
  if (vary) {
    // applyPreset reads the lab variables off the settings before it resets
    // them, but only when the same scenario was the last one set up. The row's
    // own values stand in for what a student's panel would hold; the varied
    // ones replace them.
    Object.assign(settings, clone(SCENARIO_PRESETS[key]), vary);
    resetPresetMemory(key);
  } else {
    // A second build of the same lab in one process would otherwise carry the
    // defaults (not the row's values) as the "reader's" variables.
    resetPresetMemory(null);
  }
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  physics.setStateReference(state);
  withBuild(seed, () =>
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
  bumpWorldGeneration();
  // The page zeroes the clock when it loads a scenario; the build alone does not.
  physics.resetSimulationTime();
  if (vary) {
    for (const [k, v] of Object.entries(vary)) {
      if (settings[k] !== v) {
        throw new Error(
          `${key}: ${k} was not carried (${settings[k]} not ${v})`
        );
      }
    }
  }
  if (
    physicsSettings.gravitational_constant !== settings.gravitational_constant
  ) {
    throw new Error(`${key}: the engine's G differs from the row's`);
  }
  return settings;
}
const withBuild = (seed, fn) => engine(seed, fn);

/** The step plan the page takes at a frame rate for the row's speed and cap. */
export function planFor(settings, rate) {
  const dtSim = frameAdvance(RATES[rate], settings.sim_speed, physics.DT);
  return substepPlan(dtSim, settings.max_timestep);
}

/**
 * Step the world until the clock reaches `until` or onStep says stop, one
 * updatePhysics per piece of the page's step plan, inside the seeded engine.
 * @returns {{steps: number, plan: object, stopped: boolean}} What it did
 */
function run(settings, rate, seed, until, onStep) {
  const plan = planFor(settings, rate);
  let steps = 0;
  let stopped = false;
  const limit = 3e7;
  engine(seed, () => {
    while (steps < limit) {
      for (let i = 0; i < plan.substeps; i++) {
        physics.updatePhysics(plan.step);
        steps++;
        const t = physics.getSimulationTime();
        if (onStep(t, plan.step) === 'stop') stopped = true;
        if (stopped || t >= until) return;
      }
    }
  });
  return { steps, plan, stopped };
}

/** A year at this G: the period of 1 AU about 1 solar mass. */
const yearAt = G => 2 * Math.PI * Math.sqrt(AU ** 3 / (G * SOLAR_MASS_UNIT));

// -----------------------------------------------------------------------------
// Small orbital arithmetic
// -----------------------------------------------------------------------------

const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
const speedOf = b => Math.hypot(b.vel.x, b.vel.y);

/** Mass-weighted centre (position and velocity) of a list of bodies. */
function centreOf(list) {
  let M = 0;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  for (const b of list) {
    M += b.mass;
    x += b.mass * b.pos.x;
    y += b.mass * b.pos.y;
    vx += b.mass * b.vel.x;
    vy += b.mass * b.vel.y;
  }
  return { M, x: x / M, y: y / M, vx: vx / M, vy: vy / M };
}

/** Two-body elements of `b` about a point mass at `c` (mass M), with mu = G(M + m). */
function elementsAbout(b, c, G) {
  const rx = b.pos.x - c.x;
  const ry = b.pos.y - c.y;
  const vx = b.vel.x - c.vx;
  const vy = b.vel.y - c.vy;
  const r = Math.hypot(rx, ry);
  const v2 = vx * vx + vy * vy;
  const mu = G * (c.M + b.mass);
  const energy = v2 / 2 - mu / r;
  const h = rx * vy - ry * vx;
  const ex = ((v2 - mu / r) * rx - (rx * vx + ry * vy) * vx) / mu;
  const ey = ((v2 - mu / r) * ry - (rx * vx + ry * vy) * vy) / mu;
  const a = energy < 0 ? -mu / (2 * energy) : Infinity;
  return {
    r,
    v: Math.sqrt(v2),
    mu,
    energy,
    h,
    e: Math.hypot(ex, ey),
    a,
    bound: energy < 0,
    period: energy < 0 ? 2 * Math.PI * Math.sqrt(a ** 3 / mu) : Infinity,
  };
}

const presentIn = (b, listName) =>
  b.alive !== false && physics[listName].includes(b);

/** Tracked bodies: a body and the list it was built in, so loss is checkable. */
const track = (listName, list = physics[listName]) =>
  list.map(body => ({ body, listName }));

/** The closest pair at t = 0 by the gap between collision radii (contact is the sum of obj.radius). */
function startOverlap() {
  const bodies = allBodies();
  let count = 0;
  let worst = { gap: Infinity };
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const gap =
        dist(bodies[i], bodies[j]) - (bodies[i].radius + bodies[j].radius);
      if (gap < 0) count++;
      if (gap < worst.gap)
        worst = { gap, a: bodies[i].name, b: bodies[j].name };
    }
  }
  return { count, worst };
}

const steps200 = (period, step) => ({
  period,
  step,
  stepsPerPeriod: period / step,
  finding: !(period / step >= 200),
});

// -----------------------------------------------------------------------------
// The members
// -----------------------------------------------------------------------------
// Each returns, for one rate and seed, its claims' rows and (at 60 frames a
// second) the steps per period of the fastest body its claims watch.

const claimsOf = id => {
  const m = CLAIMS.members[id];
  return Object.fromEntries(m.claims.map(c => [c.id, c]));
};

/** Whether the star/heavier-body lists still hold every tracked body. */
const lostOf = tracked => tracked.filter(t => !presentIn(t.body, t.listName));

// ---- binary-pair ------------------------------------------------------------

function binaryPair({ rate, seed }) {
  const c = claimsOf('binary-pair');
  const settings = buildAt('binary-pair', seed);
  const G = settings.gravitational_constant;
  const [A, B] = physics.stars;
  const year = yearAt(G);
  const rows = [];
  const sep0 = dist(A, B);
  rows.push(
    cardRow(
      c.masses,
      [A.mass / SOLAR_MASS_UNIT, B.mass / SOLAR_MASS_UNIT],
      'both stars'
    )
  );
  rows.push(cardRow(c.separation, sep0 / AU));
  rows.push(countRow(c.stars, physics.stars.length));
  const el0 = elementsAbout(
    B,
    { M: A.mass, x: A.pos.x, y: A.pos.y, vx: A.vel.x, vy: A.vel.y },
    G
  );
  const com0 = centreOf([A, B]);
  const theta0 = Math.atan2(B.pos.y - A.pos.y, B.pos.x - A.pos.x);
  const dir = el0.h >= 0 ? 1 : -1;
  let thetaU = theta0;
  let prev = theta0;
  let prevTurns = 0;
  let prevT = 0;
  const returns = [0];
  let drift = 0;
  let everUnbound = false;
  let lostAt = null;
  const tracked = [...track('stars')];
  const until = CLAIMS.members['binary-pair'].duration.t;
  const out = run(settings, rate, seed, until, t => {
    if (lostOf(tracked).length) {
      lostAt = t;
      return 'stop';
    }
    const th = Math.atan2(B.pos.y - A.pos.y, B.pos.x - A.pos.x);
    let d = th - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    thetaU += d;
    prev = th;
    const turns = (dir * (thetaU - theta0)) / (2 * Math.PI);
    if (Math.floor(turns) > Math.floor(prevTurns)) {
      const k = Math.floor(turns);
      returns.push(
        prevT + ((k - prevTurns) / (turns - prevTurns)) * (t - prevT)
      );
    }
    prevTurns = turns;
    prevT = t;
    const com = centreOf([A, B]);
    drift = Math.max(drift, Math.hypot(com.x - com0.x, com.y - com0.y));
    const e = elementsAbout(
      B,
      { M: A.mass, x: A.pos.x, y: A.pos.y, vx: A.vel.x, vy: A.vel.y },
      G
    );
    if (!e.bound) everUnbound = true;
  });
  const n = returns.length - 1;
  const period = n >= 1 ? returns[n] / n : NaN;
  rows.push(
    n >= 1
      ? cardRow(
          c.period,
          period / year,
          `${n} returns of the separation angle in ${sig(until)} t`
        )
      : notRun(
          c.period,
          'the separation vector did not return to its angle within the run'
        )
  );
  rows.push(
    row(
      c['balance-point'],
      drift / sep0,
      drift / sep0 < c['balance-point'].bound,
      "largest drift of the stars' mass-weighted centre, over the initial separation"
    )
  );
  const bad =
    (lostAt !== null ? 1 : 0) +
    (everUnbound ? 1 : 0) +
    (physics.stars.length !== 2 ? 1 : 0);
  rows.push(
    row(
      c.stable,
      bad,
      bad === 0,
      'bodies lost, merged or ever unbound (count of failures)'
    )
  );
  return {
    rows,
    steps: out,
    spp: steps200(el0.period, out.plan.step),
    watched: 'the two stars (their mutual orbit)',
  };
}

// ---- binary-star-system -----------------------------------------------------

function binaryStarSystem({ rate, seed }) {
  const c = claimsOf('binary-star-system');
  const settings = buildAt('binary-star-system', seed);
  const G = settings.gravitational_constant;
  const rows = [];
  const stars = [...physics.stars];
  const sep0 = stars.length === 2 ? dist(stars[0], stars[1]) : NaN;
  const planets = track('planets');
  const giants = track('gas_giants');
  rows.push(countRow(c.planets, physics.planets.length));
  rows.push(countRow(c.stars, physics.stars.length));
  rows.push(
    row(
      c['built-population'],
      `${physics.gas_giants.length} gas giants, ${physics.asteroids.length} asteroids`,
      null,
      `also ${physics.comets.length} comets, ${physics.bh_list.length} black holes at t = 0; recorded for the card`
    )
  );
  const R = c['planets-kept'].radiusAU * AU;
  const farthest = new Map([...planets, ...giants].map(t => [t.body, 0]));
  const lostPlanets = new Set();
  const until = CLAIMS.members['binary-star-system'].duration.t;
  // Period of the fastest body watched: the stars' own orbit, or a planet's
  // orbit about the pair, whichever is shorter.
  const c0 = centreOf(stars);
  const periods = [
    ...planets.map(t => elementsAbout(t.body, c0, G).period),
    ...giants.map(t => elementsAbout(t.body, c0, G).period),
  ];
  const binaryPeriod = elementsAbout(
    stars[1],
    {
      M: stars[0].mass,
      x: stars[0].pos.x,
      y: stars[0].pos.y,
      vx: stars[0].vel.x,
      vy: stars[0].vel.y,
    },
    G
  ).period;
  const out = run(settings, rate, seed, until, () => {
    // The barycentre of the binary (the stars as they stand now).
    const live = stars.filter(s => presentIn(s, 'stars'));
    const cen = live.length ? centreOf(live) : { x: 0, y: 0 };
    for (const t of [...planets, ...giants]) {
      if (!presentIn(t.body, t.listName)) {
        lostPlanets.add(t.body);
        continue;
      }
      const d = Math.hypot(t.body.pos.x - cen.x, t.body.pos.y - cen.y);
      if (d > farthest.get(t.body)) farthest.set(t.body, d);
    }
  });
  const kept = t => !lostPlanets.has(t.body) && farthest.get(t.body) <= R;
  const keptPlanets = planets.filter(kept).length;
  const keptGiants = giants.filter(kept).length;
  rows.push(
    row(
      c['planets-kept'],
      keptPlanets,
      keptPlanets === 5,
      `of ${planets.length} planets (${keptGiants} of ${giants.length} giants) stayed within ${c['planets-kept'].radiusAU} AU of the stars' barycentre and present for ${sig(until)} t; the 5 is the card's count`
    )
  );
  const ratio = sep0 / AU;
  rows.push(
    row(
      c['alpha-centauri'],
      ratio,
      ratio >= 23 / 2 && ratio <= 23 * 2,
      'built separation in AU against 23 AU, within a factor of two (11.5 to 46 AU)'
    )
  );
  const fastest = Math.min(binaryPeriod, ...periods.filter(Number.isFinite));
  return {
    rows,
    steps: out,
    spp: steps200(fastest, out.plan.step),
    watched:
      "the stars' mutual orbit and the planets and giants about the pair (shortest period)",
  };
}

// ---- the binary labs --------------------------------------------------------

/** Binary geometry read from a built lab: masses, a, e, planet, period. */
function readBinaryLab(settings) {
  const G = settings.gravitational_constant;
  const [s1, s2] = [...physics.stars].sort((a, b) => b.mass - a.mass);
  const planet = physics.planets[0];
  const rel = elementsAbout(
    s2,
    { M: s1.mass, x: s1.pos.x, y: s1.pos.y, vx: s1.vel.x, vy: s1.vel.y },
    G
  );
  return { G, heavy: s1, light: s2, planet, rel, a: rel.a, period: rel.period };
}

/** Whether `body` is unbound from the pair's joint centre (their joint mass) now. */
function unboundFromPair(body, stars, G) {
  const e = elementsAbout(body, centreOf(stars), G);
  return !e.bound;
}

/**
 * Whether `body` is ejected from the stars: its energy in the field of both,
 * with the pair's centre-of-mass velocity removed, is positive. Unlike the
 * joint-centre test this does not call a planet bound to one star of a close
 * pair unbound, which that test does when its orbital speed carries it past
 * the pair's escape speed at the pair's distance.
 */
function ejectedFromStars(body, stars, G) {
  const c = centreOf(stars);
  let energy = Math.hypot(body.vel.x - c.vx, body.vel.y - c.vy) ** 2 / 2;
  for (const s of stars) energy -= (G * s.mass) / dist(body, s);
  return energy > 0;
}

/** One lab run of `periods` binary periods; the planet's fate and extent. */
function binaryLabRun({ key, vary, rate, seed, periods, circum, window: win }) {
  const settings = buildAt(key, seed, vary);
  const lab = readBinaryLab(settings);
  const until = periods * lab.period;
  const stars = [lab.heavy, lab.light];
  const planet = lab.planet;
  const R = circum ? 10 * lab.a : 0.62 * lab.a;
  const centre = () =>
    circum ? centreOf(stars) : { x: lab.heavy.pos.x, y: lab.heavy.pos.y };
  let farthest = 0;
  let nearest = Infinity;
  let leftAt = null;
  let lost = false;
  let lostStar = false;
  const r0 = Math.hypot(planet.pos.x - centre().x, planet.pos.y - centre().y);
  const samples = [];
  const out = run(settings, rate, seed, until, t => {
    if (!presentIn(planet, 'planets')) {
      lost = true;
      return 'stop';
    }
    if (!stars.every(s => presentIn(s, 'stars'))) lostStar = true;
    const cen = centre();
    const d = Math.hypot(planet.pos.x - cen.x, planet.pos.y - cen.y);
    if (d > farthest) farthest = d;
    if (d < nearest) nearest = d;
    if (win) samples.push([t, d]);
    if (d > R && leftAt === null) {
      leftAt = t;
      if (circum) return 'stop';
    }
  });
  const tEnd = physics.getSimulationTime();
  const liveStars = stars.filter(s => presentIn(s, 'stars'));
  let endUnbound = false;
  if (!lost && liveStars.length === 2) {
    endUnbound = circum
      ? unboundFromPair(planet, liveStars, lab.G)
      : !elementsAbout(
          planet,
          {
            M: lab.heavy.mass,
            x: lab.heavy.pos.x,
            y: lab.heavy.pos.y,
            vx: lab.heavy.vel.x,
            vy: lab.heavy.vel.y,
          },
          lab.G
        ).bound;
  }
  const endEjected =
    !lost &&
    liveStars.length === 2 &&
    ejectedFromStars(planet, liveStars, lab.G);
  return {
    settings,
    lab,
    out,
    until,
    tEnd,
    r0,
    farthest,
    nearest,
    leftAt,
    lost,
    lostStar,
    endUnbound,
    endEjected,
    samples,
    R,
  };
}

function binaryPlanetLab({ rate, seed }) {
  const c = claimsOf('binary-planet-lab');
  const key = 'binary-planet-lab';
  const rows = [];
  const base = binaryLabRun({
    key,
    vary: null,
    rate,
    seed,
    periods: CLAIMS.members[key].duration.periods,
  });
  const { settings } = base;
  // The world as built is read before the run moves it; rebuild to read t = 0.
  const w0 = buildAt(key, seed);
  const l0 = readBinaryLab(w0);
  const heavyFirst = [
    l0.heavy.mass / SOLAR_MASS_UNIT,
    l0.light.mass / SOLAR_MASS_UNIT,
  ];
  rows.push(cardRow(c.masses, heavyFirst, 'heavier first'));
  rows.push(
    cardRow(
      c.separation,
      l0.a / AU,
      "semi-major axis of the stars' relative orbit"
    )
  );
  rows.push(
    cardRow(c.eccentricity, l0.rel.e, "from the stars' relative state")
  );
  rows.push(cardRow(c['planet-mass'], l0.planet.mass / EARTH_MASS_UNIT));
  const pe = elementsAbout(
    l0.planet,
    {
      M: l0.heavy.mass,
      x: l0.heavy.pos.x,
      y: l0.heavy.pos.y,
      vx: l0.heavy.vel.x,
      vy: l0.heavy.vel.y,
    },
    l0.G
  );
  rows.push(
    cardRow(
      c['planet-distance'],
      dist(l0.planet, l0.heavy) / AU,
      `distance from the heavier star at t = 0; its osculating semi-major axis is ${sig(pe.a / AU)} AU`
    )
  );
  const bad =
    (base.lost ? 1 : 0) + (base.lostStar ? 1 : 0) + (base.endEjected ? 1 : 0);
  rows.push(
    row(
      c.stable,
      bad,
      bad === 0,
      `planet lost ${base.lost}, a star lost ${base.lostStar}, planet ended unbound from the pair ${base.endEjected}; farthest ${sig(base.farthest / AU)} AU from the heavier star over ${sig(base.until)} t`
    )
  );
  // The boundary: the planet distance (a lab variable, in separations) moved
  // outward in steps from the row's own value.
  const claim = c.boundary;
  const start = settings.binary_lab_planet_a;
  const found = [];
  let first = null;
  const trial = [];
  for (let k = 0; ; k++) {
    const a = Math.round((start + k * claim.step) * 1e6) / 1e6;
    if (a >= claim.limitSeparations - 1e-9) break;
    const r = binaryLabRun({
      key,
      vary: { binary_lab_planet_a: a },
      rate,
      seed,
      periods: CLAIMS.members[key].duration.periods,
    });
    const crossed = !r.lost && (r.leftAt !== null || r.endUnbound);
    trial.push(`${a}:${r.lost ? 'lost' : crossed ? 'leaves' : 'stays'}`);
    if (crossed) {
      first = a;
      found.push(a);
      break;
    }
  }
  rows.push(
    row(
      claim,
      first === null ? `none below ${claim.limitSeparations}` : first,
      first !== null,
      `starts (separations): ${trial.join(', ')}; "leaves" is past 0.62 separations of the heavier star at any time, or unbound from it at the end; a lost planet is not counted`
    )
  );
  const wp = elementsAbout(
    l0.planet,
    {
      M: l0.heavy.mass,
      x: l0.heavy.pos.x,
      y: l0.heavy.pos.y,
      vx: l0.heavy.vel.x,
      vy: l0.heavy.vel.y,
    },
    l0.G
  ).period;
  return {
    rows,
    steps: base.out,
    spp: steps200(wp, base.out.plan.step),
    watched: 'the planet about the heavier star',
  };
}

function circumbinaryPlanetLab({ rate, seed }) {
  const c = claimsOf('circumbinary-planet-lab');
  const key = 'circumbinary-planet-lab';
  const rows = [];
  const periods = CLAIMS.members[key].duration.periods;
  const w0 = buildAt(key, seed);
  const l0 = readBinaryLab(w0);
  const cen0 = centreOf([l0.heavy, l0.light]);
  rows.push(
    cardRow(
      c['planet-distance'],
      Math.hypot(l0.planet.pos.x - cen0.x, l0.planet.pos.y - cen0.y) / AU,
      "distance from the stars' barycentre at t = 0"
    )
  );
  // The stable run: the planet at the row's own distance, all 50 periods
  // (not stopping at a leave; this run only watches the band).
  const stable = (() => {
    const settings = buildAt(key, seed);
    const lab = readBinaryLab(settings);
    const stars = [lab.heavy, lab.light];
    const until = periods * lab.period;
    let lo = Infinity;
    let hi = 0;
    let lost = false;
    const out = run(settings, rate, seed, until, () => {
      if (!presentIn(lab.planet, 'planets')) {
        lost = true;
        return 'stop';
      }
      const cen = centreOf(stars.filter(s => presentIn(s, 'stars')));
      const d = Math.hypot(lab.planet.pos.x - cen.x, lab.planet.pos.y - cen.y);
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    });
    const live = stars.filter(s => presentIn(s, 'stars'));
    const ejected =
      !lost && live.length === 2 && ejectedFromStars(lab.planet, live, lab.G);
    return {
      lab,
      out,
      lo,
      hi,
      lost,
      lostStar: live.length < 2,
      ejected,
      until,
    };
  })();
  const inBand = stable.lo >= 30 * AU && stable.hi <= 50 * AU;
  rows.push(
    row(
      c.stable,
      `${sig(stable.lo / AU, 4)} to ${sig(stable.hi / AU, 4)} AU`,
      inBand && !stable.lost && !stable.lostStar && !stable.ejected,
      `over ${periods} binary periods (${sig(stable.until)} t); planet lost ${stable.lost}, a star lost ${stable.lostStar}, planet ejected ${stable.ejected}; must stay between 30 and 50 AU of the barycentre`
    )
  );
  // The inward grid, each start a lab variable carried across the build.
  const claim = c['walks-out'];
  const results = [];
  for (const a of claim.grid) {
    const r = binaryLabRun({
      key,
      vary: { binary_lab_planet_a: a },
      rate,
      seed,
      periods,
      circum: true,
      window: true,
    });
    let left = r.leftAt !== null || r.endUnbound;
    const tEvent = r.leftAt !== null ? r.leftAt : r.tEnd;
    // Rising: the mean distance in the window before the leave (or the run's
    // end), against the mean in the opening window; each window is a tenth of
    // the run, shortened to half the time to the event when that is shorter.
    const w = Math.min(0.1 * r.until, 0.5 * tEvent);
    const mean = (t0, t1) => {
      const s = r.samples.filter(p => p[0] >= t0 && p[0] <= t1);
      return s.length ? s.reduce((x, p) => x + p[1], 0) / s.length : NaN;
    };
    const first = mean(0, w);
    const last = mean(tEvent - w, tEvent);
    const rising = last > first;
    results.push({
      a,
      left,
      rising,
      lost: r.lost,
      tEvent,
      ratio: last / first,
      ejectedAtEnd: r.endUnbound,
    });
    left = left && !r.lost;
  }
  const ok = results.some(r => r.left && !r.lost && r.rising);
  rows.push(
    row(
      claim,
      results
        .map(
          r =>
            `${r.a}: ${r.lost ? 'lost' : r.left ? `leaves at ${sig(r.tEvent / stable.lab.period, 4)} T` : 'stays'}${r.left && !r.lost ? `, distance ratio ${sig(r.ratio, 3)}` : ''}`
        )
        .join('; '),
      ok,
      'leaves: beyond 10 separations at any time, or unbound from the barycentre at the end; rises: mean distance in the window before the leave (a tenth of the run) above the mean in the first window of the run'
    )
  );
  const lab = stable.lab;
  return {
    rows,
    steps: stable.out,
    spp: steps200(lab.period, stable.out.plan.step),
    watched: "the binary's own orbit (the planet is far slower)",
  };
}

// ---- lagrange-point-lab -----------------------------------------------------

function lagrangePointLab({ rate, seed }) {
  const c = claimsOf('lagrange-point-lab');
  const key = 'lagrange-point-lab';
  const rows = [];
  const read = () => {
    const settings = buildAt(key, seed);
    const [p, s] = [...physics.stars].sort((a, b) => b.mass - a.mass);
    const tracer = physics.planets[0];
    const G = settings.gravitational_constant;
    const rel = elementsAbout(
      s,
      { M: p.mass, x: p.pos.x, y: p.pos.y, vx: p.vel.x, vy: p.vel.y },
      G
    );
    return { settings, p, s, tracer, G, rel };
  };
  // Run 1: with the tracer. Records the Jacobi constant, the rotating-frame
  // excursion and both star paths.
  const w = read();
  rows.push(
    cardRow(c['mass-ratio'], w.s.mass / w.p.mass, 'secondary over primary')
  );
  rows.push(cardRow(c.separation, dist(w.p, w.s) / AU));
  rows.push(
    row(
      c.circular,
      w.rel.e,
      w.rel.e < c.circular.bound,
      'eccentricity of the pair at t = 0'
    )
  );
  const revolutions = CLAIMS.members[key].duration.revolutions;
  const until = revolutions * w.rel.period;
  const mu = massRatio(w.p.mass, w.s.mass);
  // The tracer's state in the rotating frame, as js/cr3bpPanel.js tracerState
  // reads it: origin at the pair's barycentre, x along the pair, lengths in
  // the instantaneous separation, mean motion from that separation.
  const state = () => {
    const { p, s, tracer, G } = w;
    const M = p.mass + s.mass;
    const ox = (p.mass * p.pos.x + s.mass * s.pos.x) / M;
    const oy = (p.mass * p.pos.y + s.mass * s.pos.y) / M;
    const sx = s.pos.x - p.pos.x;
    const sy = s.pos.y - p.pos.y;
    const sep = Math.hypot(sx, sy);
    const cos = sx / sep;
    const sin = sy / sep;
    const dx = (tracer.pos.x - ox) / sep;
    const dy = (tracer.pos.y - oy) / sep;
    const x = dx * cos + dy * sin;
    const y = -dx * sin + dy * cos;
    const n = Math.sqrt((G * M) / sep ** 3);
    const bvx = (p.mass * p.vel.x + s.mass * s.vel.x) / M;
    const bvy = (p.mass * p.vel.y + s.mass * s.vel.y) / M;
    const wx = (tracer.vel.x - bvx) / (sep * n);
    const wy = (tracer.vel.y - bvy) / (sep * n);
    const rx = wx * cos + wy * sin;
    const ry = -wx * sin + wy * cos;
    return { x, y, vx: rx + y, vy: ry - x };
  };
  const s0 = state();
  const C0 = jacobiConstant(s0, mu);
  let dC = 0;
  let excursion = 0;
  const pathA = [];
  const out = run(w.settings, rate, seed, until, () => {
    const st = state();
    const C = jacobiConstant(st, mu);
    dC = Math.max(dC, Math.abs(C - C0) / Math.abs(C0));
    excursion = Math.max(excursion, Math.hypot(st.x - s0.x, st.y - s0.y));
    pathA.push(w.p.pos.x, w.p.pos.y, w.s.pos.x, w.s.pos.y);
  });
  rows.push(
    row(
      c.jacobi,
      dC,
      dC < c.jacobi.bound,
      `largest change of the tracer's Jacobi constant (C = ${sig(C0, 5)} at t = 0) over ${revolutions} revolutions (${sig(until)} t), as a fraction of C`
    )
  );
  // Run 2: the tracer removed (deleted from the built world, as a student
  // would), the stars' paths compared step for step.
  const w2 = read();
  w2.tracer.alive = false;
  physics.planets.splice(physics.planets.indexOf(w2.tracer), 1);
  const pathB = [];
  run(w2.settings, rate, seed, until, () =>
    pathB.push(w2.p.pos.x, w2.p.pos.y, w2.s.pos.x, w2.s.pos.y)
  );
  const sep = dist(w.p, w.s);
  let dev = 0;
  const m = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < m; i += 2)
    dev = Math.max(
      dev,
      Math.hypot(pathA[i] - pathB[i], pathA[i + 1] - pathB[i + 1])
    );
  const stays = excursion < 0.1 && dev / sep < 1e-9;
  rows.push(
    row(
      c['tracer-stays'],
      `tracer excursion ${sig(excursion, 4)} separations; star paths differ by ${sig(dev / sep, 3)} separations`,
      stays,
      'excursion is the largest rotating-frame distance from the start, in separations (limit 0.1); the star paths are compared with the tracer deleted (limit 1e-9); both must hold'
    )
  );
  return {
    rows,
    steps: out,
    spp: steps200(w.rel.period, out.plan.step),
    watched: 'the binary (the tracer is slower or comparable)',
  };
}

// ---- three-body-sensitivity-lab --------------------------------------------

const configDistance = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++)
    s += (a[i][0] - b[i][0]) ** 2 + (a[i][1] - b[i][1]) ** 2;
  return Math.sqrt(s);
};

function threeBodyRun({ rate, seed, nudgeKm = 0, until }) {
  const settings = buildAt('three-body-sensitivity-lab', seed);
  const stars = [...physics.stars];
  const alpha = stars.find(s => s.name === 'Alpha');
  // The Experiment Bench nudges the captured start of a body along an axis by
  // km / UNIT_KM (js/experiments/bench.js applyPerturbation).
  if (nudgeKm) alpha.pos.x += nudgeKm / BENCH_UNIT_KM;
  const start = stars.map(s => [s.pos.x, s.pos.y]);
  const sides = () => [
    dist(stars[0], stars[1]),
    dist(stars[1], stars[2]),
    dist(stars[2], stars[0]),
  ];
  const sides0 = sides();
  const times = [];
  const series = [];
  let departedAt = null;
  let prevDev = 0;
  let prevT = 0;
  const out = run(settings, rate, seed, until, t => {
    times.push(t);
    series.push(stars.map(s => [s.pos.x, s.pos.y]));
    const dev = Math.max(...sides().map((s, i) => Math.abs(s / sides0[i] - 1)));
    if (departedAt === null && dev > 0.1) {
      departedAt = prevT + ((0.1 - prevDev) / (dev - prevDev)) * (t - prevT);
    }
    prevDev = dev;
    prevT = t;
  });
  return { settings, stars, start, sides0, times, series, departedAt, out };
}

// The three-body member needs both runs at every rate before the
// divergence claim can be judged, so it is assembled across rates.
function threeBodyAll(seed) {
  const key = 'three-body-sensitivity-lab';
  const c = claimsOf(key);
  const until = CLAIMS.members[key].duration.t;
  const perRate = {};
  let nudgeMeasured = null;
  for (const rate of Object.keys(RATES)) {
    const A = threeBodyRun({ rate, seed, until });
    const a0 = A.start.map(p => [...p]);
    buildAt(key, seed);
    const stars = [...physics.stars];
    const sidesKm = [
      dist(stars[0], stars[1]),
      dist(stars[1], stars[2]),
      dist(stars[2], stars[0]),
    ].map(s => s * KM_PER_UNIT);
    const masses = stars.map(s => s.mass / SOLAR_MASS_UNIT);
    const cen = centreOf(stars);
    const omega =
      stars.reduce(
        (x, s) =>
          x +
          Math.hypot(s.vel.x - cen.vx, s.vel.y - cen.vy) /
            Math.hypot(s.pos.x - cen.x, s.pos.y - cen.y),
        0
      ) / 3;
    const B = threeBodyRun({ rate, seed, nudgeKm: 1500, until });
    nudgeMeasured =
      Math.hypot(B.start[0][0] - a0[0][0], B.start[0][1] - a0[0][1]) *
      KM_PER_UNIT;
    // Divergence: when the two runs' configuration distance first reaches 1 u.
    let tDiv = null;
    const n = Math.min(A.series.length, B.series.length);
    let prev = configDistance(a0, B.start);
    let prevT = 0;
    for (let i = 0; i < n; i++) {
      const d = configDistance(A.series[i], B.series[i]);
      if (tDiv === null && d >= 1) {
        const f =
          (Math.log(1) - Math.log(prev)) / (Math.log(d) - Math.log(prev));
        tDiv = prevT + f * (A.times[i] - prevT);
      }
      prev = d;
      prevT = A.times[i];
    }
    const Trot = (2 * Math.PI) / omega;
    perRate[rate] = {
      A,
      B,
      tDiv,
      Trot,
      departedAt: A.departedAt,
      masses,
      sidesKm,
      plan: A.out.plan,
    };
  }
  const times = Object.keys(RATES).map(r => perRate[r].tDiv);
  const haveAll = times.every(t => t !== null);
  const mean = haveAll ? times.reduce((x, y) => x + y, 0) / 3 : NaN;
  const spread = haveAll
    ? (Math.max(...times) - Math.min(...times)) / mean
    : NaN;
  return { c, perRate, nudgeMeasured, spread, mean, haveAll, until };
}

// ---- gravity-assist-lab and -heliocentric ----------------------------------

/** Run one flyby to its end the way the page records it; the page's own watcher plus a body-state log. */
function flybyRun({ key, rate, seed, removeProbe = false, maxSteps }) {
  const settings = buildAt(key, seed);
  const G = settings.gravitational_constant;
  const planet = physics.gas_giants[0];
  const probe = physics.planets[0];
  const star = physics.stars[0] ?? null;
  const log = { t: [], probe: [], planet: [], star: [] };
  let record = null;
  if (removeProbe) {
    physics.planets.splice(0, physics.planets.length);
  } else {
    // armAssistRun in js/assistPanel.js: gate from the settings, mu = G times
    // the planet's mass, the planet in gas_giants[0] and the probe in planets[0].
    startAssistWatch(
      {
        gate: settings.assist_gate,
        mu: G * planet.mass,
        impactParameter: settings.assist_impact_parameter,
      },
      {
        onStep: physics.onPhysicsStep,
        bodies: () => ({
          planet: physics.gas_giants[0],
          probe: physics.planets[0],
        }),
        onFinish: s => (record = s),
      }
    );
  }
  const t0 = {
    probe: { x: probe.pos.x, y: probe.pos.y, vx: probe.vel.x, vy: probe.vel.y },
    planet: {
      x: planet.pos.x,
      y: planet.pos.y,
      vx: planet.vel.x,
      vy: planet.vel.y,
    },
    star: star
      ? { x: star.pos.x, y: star.pos.y, vx: star.vel.x, vy: star.vel.y }
      : null,
  };
  let nSteps = 0;
  const out = run(settings, rate, seed, 5e6, () => {
    nSteps++;
    log.probe.push([probe.pos.x, probe.pos.y, probe.vel.x, probe.vel.y]);
    log.planet.push([planet.pos.x, planet.pos.y, planet.vel.x, planet.vel.y]);
    if (star) log.star.push([star.pos.x, star.pos.y, star.vel.x, star.vel.y]);
    log.t.push(physics.getSimulationTime());
    if (removeProbe) return nSteps >= maxSteps ? 'stop' : undefined;
    if (record) return 'stop';
    if (!presentIn(probe, 'planets')) return 'stop';
  });
  stopAssistWatch();
  return { settings, G, planet, probe, star, log, t0, record, out };
}

/** Min over the log of 2 pi r / v for the probe about the planet: the flyby's shortest dynamical period. */
function flybyPeriod(run_, G) {
  let best = Infinity;
  for (let i = 0; i < run_.log.t.length; i++) {
    const p = run_.log.probe[i];
    const q = run_.log.planet[i];
    const r = Math.hypot(p[0] - q[0], p[1] - q[1]);
    const v = Math.hypot(p[2] - q[2], p[3] - q[3]);
    best = Math.min(best, (2 * Math.PI * r) / v);
  }
  void G;
  return best;
}

function gravityAssistLab({ rate, seed }) {
  const c = claimsOf('gravity-assist-lab');
  const key = 'gravity-assist-lab';
  const rows = [];
  const r = flybyRun({ key, rate, seed });
  const { planet, probe, G } = r;
  const w0 = r.t0;
  rows.push(
    cardRow(
      c['planet-mass'],
      (planet.mass / SOLAR_MASS_UNIT) * JUPITER_MASSES_PER_SOLAR_MASS,
      'Jupiter masses'
    )
  );
  rows.push(
    cardRow(
      c['spacecraft-mass'],
      probe.mass / EARTH_MASS_UNIT,
      `Earth masses; the row gives it ${sig(probe.mass / planet.mass)} of the planet's mass`
    )
  );
  rows.push(countRow(c['no-star'], r.star ? 1 : 0, 'stars in the world'));
  const rec = r.record;
  if (!rec || !rec.complete) {
    const why = `the flyby did not complete (lost ${rec?.lost}, after ${r.out.steps} steps)`;
    rows.push(notRun(c['relative-speed'], why), notRun(c.deflection, why));
    return {
      rows,
      steps: r.out,
      spp: steps200(flybyPeriod(r, G), r.out.plan.step),
      watched: 'the spacecraft at closest approach (2 pi r / v)',
    };
  }
  const gate = r.settings.assist_gate;
  // The relative speed at the two readings, the second brought to exactly the
  // gate distance by interpolating between the last two steps.
  const rel = i => {
    const p = r.log.probe[i];
    const q = r.log.planet[i];
    return {
      r: Math.hypot(p[0] - q[0], p[1] - q[1]),
      v: Math.hypot(p[2] - q[2], p[3] - q[3]),
    };
  };
  const n = r.log.t.length;
  const last = rel(n - 1);
  const before = rel(n - 2);
  const f = (gate - before.r) / (last.r - before.r);
  const vOut = before.v + f * (last.v - before.v);
  const vIn = Math.hypot(
    w0.probe.vx - w0.planet.vx,
    w0.probe.vy - w0.planet.vy
  );
  const resRaw = Math.abs(vOut - vIn) / vIn;
  rows.push(
    row(
      c['relative-speed'],
      resRaw,
      resRaw < c['relative-speed'].bound,
      `relative speed ${sig(vIn, 9)} in at the gate (${gate} u), ${sig(vOut, 9)} out at the same distance; the page's own corrected-to-infinity residual is ${sig(Math.abs(rec.relativeResidual), 3)} (the row comment says 1e-8)`
    )
  );
  // Deflection against the two-body hyperbola from the incoming speed and
  // the impact parameter, read from the built state.
  const mu = G * (planet.mass + probe.mass);
  const rx = w0.probe.x - w0.planet.x;
  const ry = w0.probe.y - w0.planet.y;
  const rvx = w0.probe.vx - w0.planet.vx;
  const rvy = w0.probe.vy - w0.planet.vy;
  const rr = Math.hypot(rx, ry);
  const vinf = asymptoticSpeed(Math.hypot(rvx, rvy), rr, mu);
  const b = Math.abs(rx * rvy - ry * rvx) / vinf;
  const predicted = deflectionAngle(mu, b, vinf);
  const measured = Math.abs(rec.deflection);
  const rel2 = Math.abs(measured - predicted) / predicted;
  const deg = x => (x * 180) / Math.PI;
  const planetTurn = measuredDeflection(
    { x: w0.planet.vx, y: w0.planet.vy },
    { x: r.log.planet[n - 1][2], y: r.log.planet[n - 1][3] }
  );
  const commentOk = Math.abs(deg(measured) - deg(predicted)) < 0.01;
  rows.push(
    row(
      c.deflection,
      `${sig(deg(measured), 6)} deg measured at the gate, ${sig(deg(predicted), 6)} deg two-body`,
      rel2 < c.deflection.tolerance && commentOk,
      `relative difference ${sig(rel2, 3)} (limit ${c.deflection.tolerance}); the row comment says better than 0.01 deg and the difference is ${sig(Math.abs(deg(measured) - deg(predicted)), 3)} deg (${commentOk ? 'holds' : 'does not hold'}); the planet's own velocity turns ${sig(Math.abs(deg(planetTurn)), 3)} deg (the comment's 0.01 deg); impact parameter ${sig(b, 6)} u, speed at infinity ${sig(vinf, 6)}`
    )
  );
  return {
    rows,
    steps: r.out,
    spp: steps200(flybyPeriod(r, G), r.out.plan.step),
    watched: 'the spacecraft at closest approach (2 pi r / v)',
  };
}

function gravityAssistHeliocentric({ rate, seed }) {
  const c = claimsOf('gravity-assist-heliocentric');
  const key = 'gravity-assist-heliocentric';
  const rows = [];
  const r = flybyRun({ key, rate, seed });
  const { planet, probe, G } = r;
  rows.push(
    cardRow(
      c['planet-orbit'],
      Math.hypot(r.t0.planet.x - r.t0.star.x, r.t0.planet.y - r.t0.star.y) / AU,
      'planet to star at t = 0'
    )
  );
  const rec = r.record;
  const spp = steps200(
    Math.min(
      flybyPeriod(r, G),
      (2 * Math.PI * Math.hypot(r.t0.planet.x, r.t0.planet.y)) /
        Math.hypot(r.t0.planet.vx, r.t0.planet.vy)
    ),
    r.out.plan.step
  );
  const watched =
    "the spacecraft at closest approach (2 pi r / v) and the planet's orbit (shorter)";
  if (!rec || !rec.complete) {
    const why = `the flyby did not complete (lost ${rec?.lost}, after ${r.out.steps} steps)`;
    for (const id of ['gains', 'momentum', 'panel'])
      rows.push(notRun(c[id], why));
    return { rows, steps: r.out, spp, watched };
  }
  const n = r.log.t.length;
  // The two instants the page reads: the start, and the first step outward
  // past the gate (the watcher's own "after" step is the last one logged).
  const aboutStar = (i, body) => {
    const q = r.log.star[i];
    return { vx: body[i][2] - q[2], vy: body[i][3] - q[3] };
  };
  const speedStar = (i, body) =>
    Math.hypot(aboutStar(i, body).vx, aboutStar(i, body).vy);
  const probe0 = {
    vx: r.t0.probe.vx - r.t0.star.vx,
    vy: r.t0.probe.vy - r.t0.star.vy,
  };
  const sBefore = Math.hypot(probe0.vx, probe0.vy);
  const sAfter = speedStar(n - 1, r.log.probe);
  rows.push(
    row(
      c.gains,
      `${sig(sBefore, 6)} before, ${sig(sAfter, 6)} after`,
      sAfter > sBefore,
      `spacecraft speed about the star at the gate going in, and at the first step past the gate going out (change ${sig((sAfter - sBefore) / sBefore, 4)})`
    )
  );
  // Momentum about the star, as written: each body's change of momentum (its
  // velocity relative to the star) between the same two instants.
  const planet0 = {
    vx: r.t0.planet.vx - r.t0.star.vx,
    vy: r.t0.planet.vy - r.t0.star.vy,
  };
  const pa = aboutStar(n - 1, r.log.planet);
  const qa = aboutStar(n - 1, r.log.probe);
  const dPl = {
    x: planet.mass * (pa.vx - planet0.vx),
    y: planet.mass * (pa.vy - planet0.vy),
  };
  const dPr = {
    x: probe.mass * (qa.vx - probe0.vx),
    y: probe.mass * (qa.vy - probe0.vy),
  };
  const mag = v => Math.hypot(v.x, v.y);
  const mismatch = mag({ x: dPl.x + dPr.x, y: dPl.y + dPr.y }) / mag(dPr);
  // Not part of the claim: the planet's change beyond its own unperturbed
  // orbit, from a control run of the same steps with the spacecraft removed.
  const ctl = flybyRun({ key, rate, seed, removeProbe: true, maxSteps: n });
  const ctlEnd = ctl.log.planet[n - 1];
  const ctlStar = ctl.log.star[n - 1];
  const recoil = {
    x: planet.mass * (pa.vx - (ctlEnd[2] - ctlStar[2])),
    y: planet.mass * (pa.vy - (ctlEnd[3] - ctlStar[3])),
  };
  const alt = mag({ x: recoil.x + dPr.x, y: recoil.y + dPr.y }) / mag(dPr);
  rows.push(
    row(
      c.momentum,
      mismatch,
      mismatch < c.momentum.tolerance,
      `|planet change + spacecraft change| / |spacecraft change|, both about the star between the two instants; the planet's own orbital turning over the flyby is in the planet's change (planet ${sig(mag(dPl), 4)}, spacecraft ${sig(mag(dPr), 4)}), which is also what the page's own ledger line compares (its mismatch ${sig(rec.ledgerMismatch, 4)}). Not the claim: against a control run without the spacecraft the planet's recoil leaves a mismatch of ${sig(alt, 4)}`
    )
  );
  // The panel's approximation figure (js/assistPanel.js caveatText): the
  // percentage by which the speed relative to the planet changed, from the
  // watcher's two readings; recomputed here from the bodies' logged states.
  const panelFigure = Math.abs(
    (rec.vInfAfter - rec.vInfBefore) / rec.vInfBefore
  );
  const mu = G * planet.mass;
  const rel = (i, log0) => {
    const p = log0
      ? [r.t0.probe.x, r.t0.probe.y, r.t0.probe.vx, r.t0.probe.vy]
      : r.log.probe[i];
    const q = log0
      ? [r.t0.planet.x, r.t0.planet.y, r.t0.planet.vx, r.t0.planet.vy]
      : r.log.planet[i];
    const rr = Math.hypot(p[0] - q[0], p[1] - q[1]);
    const v = Math.hypot(p[2] - q[2], p[3] - q[3]);
    return asymptoticSpeed(v, rr, mu);
  };
  const vin = rel(0, true);
  const vout = rel(n - 1, false);
  const indep = Math.abs((vout - vin) / vin);
  const agree =
    Math.abs(panelFigure - indep) <= c.panel.tolerance * Math.abs(indep);
  rows.push(
    row(
      c.panel,
      `${sig(panelFigure * 100, 4)} % panel, ${sig(indep * 100, 4)} % recomputed`,
      agree,
      'the panel figure is |vInfAfter - vInfBefore| / vInfBefore from the watcher; the recomputation reads the same two instants from the logged body states with the same vis-viva correction; the shown value is rounded to two figures in the page'
    )
  );
  return { rows, steps: r.out, spp, watched };
}

// ---- rogue-encounter --------------------------------------------------------

function rogueEncounter({ rate, seed }) {
  const c = claimsOf('rogue-encounter');
  const settings = buildAt('rogue-encounter', seed);
  const G = settings.gravitational_constant;
  const rows = [];
  const hole = physics.bh_list[0];
  const star = physics.stars[0];
  rows.push(cardRow(c['hole-mass'], hole.mass / SOLAR_MASS_UNIT));
  rows.push(countRow(c.planets, physics.planets.length));
  rows.push(countRow(c.giants, physics.gas_giants.length));
  rows.push(
    row(
      c.asteroids,
      physics.asteroids.length,
      physics.asteroids.length >= 1,
      'asteroids at t = 0'
    )
  );
  const ov = startOverlap();
  rows.push(
    row(
      c['start-overlap'],
      ov.count,
      ov.count === 0,
      `pairs closer than the sum of their radii; closest gap ${sig(ov.worst.gap, 4)} u (${ov.worst.a} and ${ov.worst.b})`
    )
  );
  const mob = [...track('planets'), ...track('gas_giants')];
  const as0 = new Map();
  const centreStar = () => ({
    M: star.mass,
    x: star.pos.x,
    y: star.pos.y,
    vx: star.vel.x,
    vy: star.vel.y,
  });
  for (const t of mob)
    as0.set(t.body, elementsAbout(t.body, centreStar(), G).a);
  // The same test at t = 0, so a reader can see how much of the end count is
  // the frame: the hole's own motion makes most of the system unbound from the
  // joint centre before anything has happened.
  const jointStart = centreOf([star, hole]);
  const ejectedAtStart = mob.filter(
    t => !elementsAbout(t.body, jointStart, G).bound
  ).length;
  const last = new Map();
  const until = CLAIMS.members['rogue-encounter'].duration.t;
  const periods = mob.map(t => elementsAbout(t.body, centreStar(), G).period);
  const out = run(settings, rate, seed, until, () => {
    if (!presentIn(hole, 'bh_list') || !presentIn(star, 'stars')) return;
    for (const t of mob) {
      if (presentIn(t.body, t.listName))
        last.set(t.body, [dist(t.body, hole), dist(t.body, star)]);
    }
  });
  const holeAlive = presentIn(hole, 'bh_list');
  const starAlive = presentIn(star, 'stars');
  const centre = [star, hole].filter((b, i) =>
    i === 0 ? starAlive : holeAlive
  );
  let ejected = 0;
  let captured = 0;
  let toHole = 0;
  let reshaped = 0;
  let lostOther = 0;
  const reshapedA = [];
  let reshapedBoundA = 0;
  for (const t of mob) {
    if (!presentIn(t.body, t.listName)) {
      const [dh, ds] = last.get(t.body) ?? [Infinity, Infinity];
      if (dh < ds) toHole++;
      else lostOther++;
      continue;
    }
    if (!centre.length) continue;
    const joint = elementsAbout(t.body, centreOf(centre), G);
    if (!joint.bound) ejected++;
    if (holeAlive) {
      const eh = elementsAbout(
        t.body,
        {
          M: hole.mass,
          x: hole.pos.x,
          y: hole.pos.y,
          vx: hole.vel.x,
          vy: hole.vel.y,
        },
        G
      );
      const es = starAlive ? elementsAbout(t.body, centreStar(), G) : null;
      if (eh.bound && (!es || eh.energy < es.energy)) captured++;
    }
    if (starAlive) {
      const es = elementsAbout(t.body, centreStar(), G);
      const a0 = as0.get(t.body);
      const changed = !es.bound || Math.abs(es.a - a0) / a0 > 0.5;
      if (changed) {
        reshaped++;
        reshapedA.push(t.body.name);
        if (es.bound) reshapedBoundA++;
      }
    }
  }
  const disrupted = toHole + reshaped;
  rows.push(
    row(
      c.ejection,
      ejected,
      ejected >= 1,
      `planets and giants unbound from the star and hole together (their joint centre and joint mass) at t = ${sig(until)}; by the same test ${ejectedAtStart} were already unbound at t = 0; ${reshaped - reshapedBoundA} are unbound from the star alone at the end`
    )
  );
  rows.push(
    row(
      c.capture,
      captured,
      captured >= 1,
      'bound to the hole, and more tightly than to the star'
    )
  );
  rows.push(
    row(
      c.disruption,
      disrupted,
      disrupted >= 1,
      `${toHole} lost nearer the hole than the star (merged into it), ${reshaped} bound-or-not about the star with a changed by more than 50% or unbound from the star (${lostOther} more lost elsewhere); hole mass at the end ${sig(hole.mass / SOLAR_MASS_UNIT, 8)} Msun`
    )
  );
  const fastest = Math.min(...periods.filter(Number.isFinite));
  return {
    rows,
    steps: out,
    spp: steps200(fastest, out.plan.step),
    watched: 'the planets and giants about the star',
  };
}

// ---- slingshot --------------------------------------------------------------

function slingshotRun({ rate, seed, control }) {
  const settings = buildAt('slingshot', seed);
  const G = settings.gravitational_constant;
  const holes = [...physics.bh_list].sort((a, b) => b.mass - a.mass);
  if (control) {
    // The companion deleted from the built world, as the inspector does; the
    // planets and giants are the very ones the seeded build drew.
    physics.bh_list.splice(physics.bh_list.indexOf(holes[1]), 1);
    holes.length = 1;
  }
  const mob = [...track('planets'), ...track('gas_giants')];
  const centre = () => centreOf(holes.filter(h => presentIn(h, 'bh_list')));
  const speedAbout = b => {
    const cen = centre();
    return Math.hypot(b.vel.x - cen.vx, b.vel.y - cen.vy);
  };
  const s0 = new Map(mob.map(t => [t.body, speedAbout(t.body)]));
  const peak = new Map(mob.map(t => [t.body, 0]));
  const cen0 = centre();
  const periods = mob
    .map(t => elementsAbout(t.body, cen0, G).period)
    .filter(Number.isFinite);
  const until = CLAIMS.members.slingshot.duration.t;
  const out = run(settings, rate, seed, until, () => {
    for (const t of mob) {
      if (!presentIn(t.body, t.listName)) continue;
      const s = speedAbout(t.body);
      if (s > peak.get(t.body)) peak.set(t.body, s);
    }
  });
  let gained = 0;
  let gainedPeak = 0;
  let unbound = 0;
  let lost = 0;
  const thr = CLAIMS.members.slingshot.claims.find(
    x => x.id === 'gain'
  ).threshold;
  const live = holes.filter(h => presentIn(h, 'bh_list'));
  for (const t of mob) {
    if (!presentIn(t.body, t.listName)) {
      lost++;
      continue;
    }
    if (speedAbout(t.body) > (1 + thr) * s0.get(t.body)) gained++;
    if (peak.get(t.body) > (1 + thr) * s0.get(t.body)) gainedPeak++;
    if (live.length && !elementsAbout(t.body, centreOf(live), G).bound)
      unbound++;
  }
  return {
    settings,
    out,
    gained,
    gainedPeak,
    unbound,
    lost,
    n: mob.length,
    periods,
    holes,
  };
}

function slingshot({ rate, seed }) {
  const c = claimsOf('slingshot');
  const rows = [];
  const w = slingshotRun({ rate, seed, control: false });
  // t = 0 readings from a fresh build (the run above moved the first).
  buildAt('slingshot', seed);
  const hs = [...physics.bh_list].sort((a, b) => b.mass - a.mass);
  rows.push(
    cardRow(
      c.masses,
      hs.map(h => h.mass / SOLAR_MASS_UNIT),
      'larger first'
    )
  );
  const ov = startOverlap();
  rows.push(
    row(
      c['start-overlap'],
      ov.count,
      ov.count === 0,
      `pairs closer than the sum of their radii; closest gap ${sig(ov.worst.gap, 4)} u (${ov.worst.a} and ${ov.worst.b})`
    )
  );
  const ctl = slingshotRun({ rate, seed, control: true });
  rows.push(
    row(
      c.gain,
      [w.gained, ctl.gained],
      w.gained >= 1 && w.gained > ctl.gained,
      `bodies whose speed about the hole centre at t = ${sig(CLAIMS.members.slingshot.duration.t)} exceeds 1.2 times their start speed: with the companion ${w.gained} of ${w.n}, without ${ctl.gained} of ${ctl.n} (by peak speed during the run, the other way to read "rises": ${w.gainedPeak} and ${ctl.gainedPeak}, which would ${w.gainedPeak >= 1 && w.gainedPeak > ctl.gainedPeak ? 'pass' : 'fail'} here); bodies lost: ${w.lost} and ${ctl.lost}`
    )
  );
  rows.push(
    row(
      c.escape,
      [w.unbound, ctl.unbound],
      null,
      `bodies unbound from the hole centre at the end, with and without the companion (no bound set by the claim)`
    )
  );
  const fastest = Math.min(...w.periods);
  return {
    rows,
    steps: w.out,
    spp: steps200(fastest, w.out.plan.step),
    watched:
      'the bound planets and giants about the hole pair (shortest period)',
  };
}

// ---- slingshot-gauntlet -----------------------------------------------------

function slingshotGauntlet({ rate, seed }) {
  const c = claimsOf('slingshot-gauntlet');
  const key = 'slingshot-gauntlet';
  const settings = buildAt(key, seed);
  const G = settings.gravitational_constant;
  const star = physics.stars[0];
  const holes = [
    ...physics.bh_list,
    ...physics.neutron_stars,
    ...physics.white_dwarfs,
  ];
  // The field's radius as js/world/build.js reads it when it fires the star.
  const field = Math.max(
    120,
    ...holes.map(h => Math.hypot(h.pos.x, h.pos.y) + (h.radius || 0))
  );
  const behaviour = settings.bh_behavior;
  // Speed at infinity from the speed here and the holes' pull (the page's
  // convention for a reading at a finite distance, js/gravityAssist.js).
  const vInfinity = () => {
    let phi = 0;
    for (const h of holes) phi += (G * h.mass) / dist(star, h);
    const v2 = speedOf(star) ** 2 - 2 * phi;
    return v2 > 0 ? Math.sqrt(v2) : NaN;
  };
  const entryRaw = speedOf(star);
  const entryInf = vInfinity();
  let exit = null;
  let swallowed = false;
  let minD = Infinity;
  const cap = CLAIMS.members[key].duration.until.match(/t = (\d+)/)[1] * 1;
  const periodAtClosest = { v: Infinity };
  const out = run(settings, rate, seed, cap, () => {
    if (!presentIn(star, 'stars')) {
      swallowed = true;
      return 'stop';
    }
    let nearest = Infinity;
    for (const h of holes) nearest = Math.min(nearest, dist(star, h));
    minD = Math.min(minD, nearest);
    const v = speedOf(star);
    const t = (2 * Math.PI * nearest) / v;
    if (t < periodAtClosest.v) periodAtClosest.v = t;
    const rStar = Math.hypot(star.pos.x, star.pos.y);
    const far =
      Math.max(...holes.map(h => Math.hypot(h.pos.x, h.pos.y))) + 2 * field;
    if (rStar > far) {
      exit = { raw: v, inf: vInfinity(), t: physics.getSimulationTime() };
      return 'stop';
    }
  });
  const spp = steps200(periodAtClosest.v, out.plan.step);
  const watched = 'the fast star at its closest pass to a hole (2 pi r / v)';
  if (swallowed)
    return {
      rows: [
        notRun(
          c.slingshot,
          `the fast star was absorbed at t = ${sig(physics.getSimulationTime())} before it left the field; no exit reading exists`
        ),
      ],
      steps: out,
      spp,
      watched,
    };
  if (!exit) {
    return {
      rows: [
        notRun(
          c.slingshot,
          `the fast star had not left the field by t = ${cap}; no exit reading exists`
        ),
      ],
      steps: out,
      spp,
      watched,
    };
  }
  const change = (exit.inf - entryInf) / entryInf;
  const rawChange = (exit.raw - entryRaw) / entryRaw;
  return {
    rows: [
      row(
        c.slingshot,
        change,
        Math.abs(change) > c.slingshot.tolerance,
        `speed at infinity (speed corrected for the holes' potential, the page's convention for a far reading) ${sig(entryInf, 5)} in at t = 0, ${sig(exit.inf, 5)} out at t = ${sig(exit.t, 4)}; raw speeds ${sig(entryRaw, 5)} and ${sig(exit.raw, 5)} (change ${sig(rawChange, 4)}); holes ${behaviour}; closest pass ${sig(minD, 4)} u; the claim holds only if the change exceeds ${c.slingshot.tolerance}`
      ),
    ],
    steps: out,
    spp,
    watched,
  };
}

// -----------------------------------------------------------------------------
// The registry, the per-member driver and the verdicts
// -----------------------------------------------------------------------------

const MEMBERS = {
  'binary-pair': binaryPair,
  'binary-star-system': binaryStarSystem,
  'binary-planet-lab': binaryPlanetLab,
  'circumbinary-planet-lab': circumbinaryPlanetLab,
  'lagrange-point-lab': lagrangePointLab,
  'three-body-sensitivity-lab': null, // assembled across rates below
  'gravity-assist-lab': gravityAssistLab,
  'gravity-assist-heliocentric': gravityAssistHeliocentric,
  'rogue-encounter': rogueEncounter,
  slingshot,
  'slingshot-gauntlet': slingshotGauntlet,
};
export const MEMBER_IDS = Object.keys(MEMBERS);
for (const id of MEMBER_IDS) {
  if (!CLAIMS.members[id]) throw new Error(`claims.json has no member ${id}`);
}
if (Object.keys(CLAIMS.members).length !== MEMBER_IDS.length) {
  throw new Error('claims.json holds members this runner does not know');
}

/** Whether a built world differs between two seeds (so it must run under the audit pair). */
export function drawsRandomly(id) {
  const snap = seed => {
    buildAt(id, seed);
    return JSON.stringify(
      allBodies().map(b => [b.name, b.mass, b.pos.x, b.pos.y, b.vel.x, b.vel.y])
    );
  };
  return snap(AUDIT_SEEDS[0]) !== snap(AUDIT_SEEDS[1]);
}

/** The seeds a member runs under: its own in claims.json, else the audit pair if it draws, else 1. */
export function seedsFor(id) {
  const given = CLAIMS.members[id].seeds;
  if (given) return given;
  return drawsRandomly(id) ? AUDIT_SEEDS : [1];
}

/**
 * Measure one member at every rate and seed.
 * @param {string} id - Member id
 * @param {object} [opts]
 * @param {string[]} [opts.rates] - Rates to run (default all three)
 * @param {boolean} [opts.log] - Print progress to stderr
 * @returns {{id: string, seeds: Array, rows: Array, stepsPerPeriod: object}} Its rows
 */
export function measureMember(
  id,
  { rates = Object.keys(RATES), log = false } = {}
) {
  setTier('full');
  const seeds = seedsFor(id);
  const rows = [];
  let spp = null;
  const t0 = Date.now();
  const note = msg =>
    log &&
    process.stderr.write(
      `[${id}] ${msg} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`
    );
  for (const seed of seeds) {
    if (id === 'three-body-sensitivity-lab') {
      const all = threeBodyAll(seed);
      const c = all.c;
      for (const rate of rates) {
        const p = all.perRate[rate];
        const rr = [];
        rr.push(cardRow(c.masses, p.masses, 'each of the three'));
        rr.push(countRow(c.stars, p.masses.length));
        rr.push(
          cardRow(
            c.size,
            p.sidesKm.reduce((x, y) => x + y, 0) / 3,
            `side of the triangle at t = 0, mean of ${p.sidesKm.map(s => sig(s, 4)).join(', ')} km`
          )
        );
        rr.push(
          cardRow(
            c.offset,
            all.nudgeMeasured,
            `the two starts' Alpha positions differ by 1500 km / ${BENCH_UNIT_KM} km per unit, read back through the constants' ${sig(KM_PER_UNIT, 7)} km per unit`
          )
        );
        const N = p.departedAt === null ? null : p.departedAt / p.Trot;
        const maxN = all.until / p.Trot;
        rr.push(
          N === null
            ? row(
                c['comes-apart'],
                `no side departs by 10% in ${sig(maxN, 3)} rotations`,
                false,
                `rotation period ${sig(p.Trot, 5)} t`
              )
            : row(
                c['comes-apart'],
                N,
                N >= c['comes-apart'].range[0] &&
                  N <= c['comes-apart'].range[1],
                `rigid rotations before a side departs by 10% (at t = ${sig(p.departedAt, 4)}); rotation period ${sig(p.Trot, 5)} t`
              )
        );
        rr.push(
          p.tDiv === null
            ? notRun(
                c.divergence,
                `the two runs never differ by 1 u within ${all.until} t at ${rate} frames a second`
              )
            : !all.haveAll
              ? notRun(
                  c.divergence,
                  `the runs did not reach 1 u at every rate, so the spread of the three times cannot be formed`
                )
              : row(
                  c.divergence,
                  p.tDiv,
                  all.spread <= c.divergence.tolerance,
                  `time the two runs differ by 1 u (configuration distance over all three stars); the three rates' times are ${Object.keys(
                    RATES
                  )
                    .map(r => sig(all.perRate[r].tDiv, 5))
                    .join(
                      ', '
                    )} t, spread ${sig(all.spread, 3)} of their mean, limit ${c.divergence.tolerance}; the same verdict stands at each rate`
                )
        );
        for (const r of rr) rows.push({ rate: Number(rate), seed, ...r });
        if (rate === '60')
          spp = {
            ...steps200(p.Trot, p.plan.step),
            watched: "the triangle's rigid rotation",
          };
        note(`seed ${seed}, ${rate} fps done`);
      }
      continue;
    }
    for (const rate of rates) {
      const res = MEMBERS[id]({ rate, seed });
      for (const r of res.rows) rows.push({ rate: Number(rate), seed, ...r });
      if (rate === '60')
        spp = { ...res.spp, watched: res.watched, steps: res.steps.steps };
      note(
        `seed ${seed}, ${rate} fps done (${res.steps?.steps ?? '?'} steps, step ${sig(res.steps?.plan?.step, 4)})`
      );
    }
  }
  return { id, seeds, rows, stepsPerPeriod: spp };
}

/** The mechanical verdict from a member's rows; pure, shared with the test. */
export function verdictFrom(rows, claims) {
  const failing = [];
  const notRunIds = [];
  for (const claim of claims) {
    const mine = rows.filter(r => r.claim === claim.id);
    if (mine.some(r => r.pass === false)) failing.push(claim.id);
    else if (mine.some(r => r.status === 'NOT RUN')) notRunIds.push(claim.id);
  }
  const keep = failing.length === 0 && notRunIds.length === 0;
  // A card number or count that disagrees with the world may be the card's
  // wording or the world; a behaviour that fails is the world. A person decides.
  const leans = {};
  for (const id of failing) {
    const kind = claims.find(c => c.id === id).kind;
    leans[id] = ['cardNumber', 'count', 'comparison'].includes(kind)
      ? 'REFRAME'
      : 'CORRECT';
  }
  return {
    verdict: keep ? 'KEEP' : 'REFRAME or CORRECT',
    failing,
    notRun: notRunIds,
    leans,
  };
}

// -----------------------------------------------------------------------------
// Output
// -----------------------------------------------------------------------------

function table(result) {
  const claims = CLAIMS.members[result.id].claims;
  const lines = [`\n== ${result.id} (seeds ${result.seeds.join(', ')}) ==`];
  for (const claim of claims) {
    lines.push(`${claim.id}  [${boundText(claim)}]`);
    for (const r of result.rows.filter(x => x.claim === claim.id)) {
      const v = typeof r.value === 'object' ? JSON.stringify(r.value) : r.value;
      lines.push(
        `    ${String(r.rate).padStart(3)} fps seed ${String(r.seed).padEnd(8)} ${String(v).padEnd(44)} ${r.status}${r.note ? `   ${r.note}` : ''}`
      );
    }
  }
  const v = verdictFrom(result.rows, claims);
  lines.push(
    `verdict: ${v.verdict}${v.failing.length ? `; failing ${v.failing.join(', ')}` : ''}${v.notRun.length ? `; not run ${v.notRun.join(', ')}` : ''}`
  );
  const s = result.stepsPerPeriod;
  if (s)
    lines.push(
      `steps per period at 60 fps (${s.watched}): ${sig(s.stepsPerPeriod, 5)} (period ${sig(s.period, 5)} t, step ${sig(s.step, 5)})${s.finding ? '  FINDING: fewer than 200' : ''}`
    );
  return lines.join('\n');
}

/** The record file's content from member results. */
export function recordFrom(results) {
  const members = {};
  for (const r of results) {
    const claims = CLAIMS.members[r.id].claims;
    members[r.id] = {
      seeds: r.seeds,
      rates: Object.keys(RATES).map(Number),
      stepsPerPeriod: r.stepsPerPeriod
        ? {
            watched: r.stepsPerPeriod.watched,
            period: sig(r.stepsPerPeriod.period, 6),
            step: sig(r.stepsPerPeriod.step, 6),
            stepsPerPeriod: sig(r.stepsPerPeriod.stepsPerPeriod, 6),
            minimum: 200,
            finding: r.stepsPerPeriod.finding,
          }
        : null,
      rows: r.rows,
      verdictSuggested: verdictFrom(r.rows, claims),
    };
  }
  return {
    format: FORMAT,
    claims: CLAIMS_FILE,
    note: 'Measured by tools/scenario-review.mjs against the claims and tolerances committed in claims.json; no bound here was chosen after a run. verdictSuggested is mechanical (KEEP when every row of every claim passes; otherwise the failing and NOT RUN claims are listed and a person decides REFRAME or CORRECT). Scene checks in a browser are NOT RUN here.',
    members,
  };
}

async function runChild(id) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), '--member', id],
      {
        cwd: fileURLToPath(ROOT),
        stdio: ['ignore', 'pipe', 'inherit'],
      }
    );
    let out = '';
    child.stdout.on('data', d => (out += d));
    child.on('close', code => {
      const line = out.split('\n').find(l => l.startsWith('MEMBER-RESULT '));
      if (code !== 0 || !line)
        return reject(new Error(`member ${id} exited ${code}`));
      resolve(JSON.parse(line.slice('MEMBER-RESULT '.length)));
    });
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = n => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  if (argv.includes('--member')) {
    const res = measureMember(arg('--member'), { log: true });
    process.stdout.write(`MEMBER-RESULT ${JSON.stringify(res)}\n`);
    return;
  }
  const only = arg('--only')?.split(',');
  const ids = only ?? MEMBER_IDS;
  for (const id of ids)
    if (!MEMBER_IDS.includes(id)) throw new Error(`unknown member ${id}`);
  const jobs = Math.min(2, Math.max(1, Number(arg('--jobs') ?? 1)));
  const started = Date.now();
  const results = [];
  if (jobs === 1) {
    for (const id of ids) results.push(measureMember(id, { log: true }));
  } else {
    const queue = [...ids];
    const worker = async () => {
      while (queue.length) results.push(await runChild(queue.shift()));
    };
    await Promise.all(Array.from({ length: jobs }, worker));
  }
  results.sort((a, b) => MEMBER_IDS.indexOf(a.id) - MEMBER_IDS.indexOf(b.id));
  for (const r of results) console.log(table(r));
  console.log(
    `\nran ${ids.length} member(s) in ${((Date.now() - started) / 1000).toFixed(0)} s`
  );
  if (argv.includes('--write')) {
    if (only) throw new Error('--write needs every member; drop --only');
    writeFileSync(
      new URL(RECORD_FILE, ROOT),
      JSON.stringify(recordFrom(results), null, 2) + '\n'
    );
    console.log(`wrote ${RECORD_FILE}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
