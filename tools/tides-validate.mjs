#!/usr/bin/env node
// =============================================================================
// The tides kernel against its committed thresholds (Prompt 204, part A)
// -----------------------------------------------------------------------------
//   npm run tides:validate               print the table
//   npm run tides:validate -- --json     print it as JSON
//
// tests/fixtures/tides/thresholds.json fixed every bound before js/kernels/tides/
// had been run (TIDAL_KERNEL.md, "The validation contract"). This runs the checks
// against the production module and judges them against those bounds, read from
// the file and not copied. The oracle's rows read the results pinned in
// tests/fixtures/tides/ (numpy, scipy: no Gravitas code). Tier (c) is not
// applicable and is stated, not run.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/tides/index.js';
import { rocheLimitRigid, tidalToSelfGravity } from '../js/tidalPhysics.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/tides');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const INPUTS = JSON.parse(
  readFileSync(path.join(HERE, 'tides-oracle/oracle-inputs.json'), 'utf8')
);
const ORACLE = read('oracle-results.json');
const C = THRESHOLDS.checks;
const YEAR = K.SECONDS_PER_YEAR;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const notApplicable = (id, note) =>
  rows.push({ id, measured: null, pass: null, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const rel = (a, b) => Math.abs(a - b) / (Math.abs(b) || 1);

function analytic() {
  const a1 = C['a1.roche.closed'].bounds.relative;
  const A = x => rel(x.m, x.o);
  // Roche against the oracle, and the identities.
  for (const c of INPUTS.roche) {
    const o = ORACLE.roche[c.id];
    for (const [kind, key] of [
      ['rigid', 'rigid'],
      ['fluid', 'fluid'],
      ['fluid-exact', 'fluidExact'],
    ]) {
      const r = K.rocheLimit({ ...c, kind });
      within(
        `a1.${c.id}.${kind}`,
        A({ m: r.distance, o: o[key] }),
        a1,
        'against the oracle'
      );
    }
    row(
      `a1.${c.id}.inside`,
      Number(K.rocheLimit({ ...c, kind: 'rigid' }).insidePrimary),
      Number(o.inside),
      K.rocheLimit({ ...c, kind: 'rigid' }).insidePrimary === o.inside
    );
    // Mass form and the self-gravity balance at the rigid limit.
    const Rs = 1e5;
    const Mp = ((c.primaryDensity * 4) / 3) * Math.PI * c.primaryRadius ** 3;
    const ms = ((c.satelliteDensity * 4) / 3) * Math.PI * Rs ** 3;
    const massForm = rocheLimitRigid(Mp, ms, Rs);
    within(
      `a1.${c.id}.mass-form`,
      rel(massForm, K.rocheLimit({ ...c, kind: 'rigid' }).distance),
      a1
    );
    within(
      `a1.${c.id}.balance`,
      Math.abs(tidalToSelfGravity(Mp, ms, Rs, massForm) - 1),
      a1,
      'tidal over self gravity at the rigid limit is 1'
    );
  }
  const eq = K.rocheLimit({
    primaryRadius: 1,
    primaryDensity: 1,
    satelliteDensity: 1,
    kind: 'rigid',
  });
  within('a1.equal-density', rel(eq.distance, 2 ** (1 / 3)), a1);
  within(
    'a1.fluid-over-rigid',
    rel(
      K.rocheLimit({ primaryRadius: 1, primaryDensity: 1, satelliteDensity: 1 })
        .distance / eq.distance,
      2.44 / 2 ** (1 / 3)
    ),
    a1
  );

  // Bulge.
  const a2 = C['a2.bulge.closed'].bounds.relative;
  for (const c of INPUTS.bulge) {
    const b = K.tidalBulge(c);
    within(`a2.${c.id}`, rel(b.height, ORACLE.bulge[c.id].height), a2);
    within(`a2.${c.id}.p2`, rel(b.bulgeHeight / b.height, 2 / 3), a2);
    within(`a2.${c.id}.trough`, rel(b.troughDepth / b.bulgeHeight, 0.5), a2);
  }
  const b0 = INPUTS.bulge[0];
  const h0 = K.tidalBulge(b0).height;
  within(
    'a2.scale.d',
    rel(K.tidalBulge({ ...b0, distance: 2 * b0.distance }).height, h0 / 8),
    a2
  );
  within(
    'a2.scale.m',
    rel(
      K.tidalBulge({ ...b0, perturberMass: 2 * b0.perturberMass }).height,
      2 * h0
    ),
    a2
  );
  within(
    'a2.scale.h2',
    rel(K.tidalBulge({ ...b0, h2: 2 * b0.h2 }).height, 2 * h0),
    a2
  );

  // Heating.
  const a3 = C['a3.heating.closed'].bounds;
  for (const c of INPUTS.heating) {
    const h = K.tidalHeating(c);
    const o = ORACLE.heating[c.id];
    within(`a3.${c.id}.power`, rel(h.power, o.power), a3.relative);
    within(`a3.${c.id}.period`, rel(h.period, o.period), a3.relative);
    within(
      `a3.${c.id}.perOrbit`,
      rel(h.energyPerOrbit, o.perOrbit),
      a3.relative
    );
    within(
      `a3.${c.id}.perOrbit.identity`,
      rel(h.energyPerOrbit, h.power * h.period),
      a3.relative
    );
  }
  const io = INPUTS.heating[0];
  const p0 = K.tidalHeating(io).power;
  within(
    'a3.scale.e2',
    rel(
      K.tidalHeating({ ...io, eccentricity: 2 * io.eccentricity }).power,
      4 * p0
    ),
    a3.relative
  );
  within(
    'a3.scale.k2overQ',
    rel(K.tidalHeating({ ...io, Q: io.Q / 2 }).power, 2 * p0),
    a3.relative
  );
  within(
    'a3.zero-e',
    K.tidalHeating({ ...io, eccentricity: 0 }).power,
    0,
    'no heating on a circular orbit'
  );
  const pa = K.tidalHeating(io).power;
  const pb = K.tidalHeating({
    ...io,
    semiMajorAxis: 2 * io.semiMajorAxis,
  }).power;
  within(
    'a3.exponent.a',
    Math.abs(Math.log2(pa / pb) - 7.5),
    a3.exponentAbsolute
  );

  // Evolution.
  const a4 = C['a4.evolution.closed'].bounds;
  for (const c of INPUTS.evolution) {
    const o = ORACLE.evolution[c.id];
    const r = K.recession(c);
    within(`a4.${c.id}.dadt`, rel(r.dadt, o.dadt), a4.relative);
    within(`a4.${c.id}.torque`, rel(r.torque, o.torque), a4.relative);
    within(`a4.${c.id}.dOmegaDt`, rel(r.dOmegaDt, o.dOmegaDt), a4.relative);
    within(
      `a4.${c.id}.I`,
      rel(r.momentOfInertia, o.momentOfInertia),
      a4.relative
    );
    row(`a4.${c.id}.sign`, r.sign, o.sign, r.sign === o.sign);
    let worst = 0;
    let worstSpin = 0;
    let worstL = 0;
    let rising = 0;
    let last = Infinity;
    let crossed = 0;
    let refusedAtCrossing = 0;
    const L0 = K.evolveCircular({ ...c, time: 0 }).totalAngularMomentum;
    let lastGood = 0;
    o.times.forEach((t, i) => {
      const nOracle = Math.sqrt(
        (ORACLE.G * (c.primaryMass + c.satelliteMass)) / o.a[i] ** 3
      );
      if ((o.omega[i] - nOracle) * o.sign <= 0) {
        // The oracle's own state has passed corotation: the model must end here.
        crossed++;
        try {
          K.evolveCircular({ ...c, time: t });
        } catch (e) {
          if (e instanceof K.TidesError && e.code === 'corotation') {
            refusedAtCrossing++;
          }
        }
        return;
      }
      lastGood = i;
      const s = K.evolveCircular({ ...c, time: t });
      worst = Math.max(worst, rel(s.a, o.a[i]));
      worstSpin = Math.max(worstSpin, rel(s.spin, o.omega[i]));
      worstL = Math.max(worstL, rel(s.totalAngularMomentum, L0));
      if (s.energy > last) rising++;
      last = s.energy;
    });
    within(
      `a4.${c.id}.a(t).ode`,
      worst,
      a4.odeRelative,
      'closed form against DOP853'
    );
    within(`a4.${c.id}.spin(t).ode`, worstSpin, a4.odeRelative);
    within(`a4.${c.id}.L+Iw`, worstL, a4.conservationRelative);
    row(
      `a4.${c.id}.energy.falls`,
      rising,
      0,
      rising === 0,
      'dissipation is positive'
    );
    row(
      `a4.${c.id}.corotation.agrees`,
      refusedAtCrossing,
      crossed,
      refusedAtCrossing === crossed,
      'a time where the oracle has passed corotation is refused'
    );
    const tEnd = o.times[lastGood];
    const s = K.evolveCircular({ ...c, time: tEnd });
    within(
      `a4.${c.id}.timeToReach`,
      rel(K.timeToReach({ ...c, target: s.a }), tEnd),
      a4.relative,
      'the inverse of a(t)'
    );
  }

  // Locking.
  const a5 = C['a5.locking.closed'].bounds;
  for (const c of INPUTS.locking) {
    const o = ORACLE.locking[c.id];
    const t = K.lockingTime(c);
    within(`a5.${c.id}.time`, rel(t.time, o.time), a5.relative);
    within(`a5.${c.id}.torque`, rel(t.torque, o.torque), a5.relative);
  }
  const l0 = INPUTS.locking[0];
  const t0 = K.lockingTime(l0).time;
  const scale = (name, change, factor) =>
    within(
      `a5.scale.${name}`,
      rel(K.lockingTime({ ...l0, ...change }).time, factor * t0),
      a5.relative
    );
  scale('spin', { spin: 2 * l0.spin }, 2);
  scale('Q', { Q: 2 * l0.Q }, 2);
  scale('k2', { k2: 2 * l0.k2 }, 0.5);
  scale('a', { semiMajorAxis: 2 * l0.semiMajorAxis }, 64);
  scale('m', { perturberMass: 2 * l0.perturberMass }, 0.25);

  // Rings.
  const a6 = C['a6.rings.closed'].bounds.relative;
  for (const c of INPUTS.resonance) {
    const r = K.resonanceRadius(c);
    within(
      `a6.${c.id}.radius`,
      rel(r.radius, ORACLE.resonance[c.id].radius),
      a6
    );
    within(
      `a6.${c.id}.period-ratio`,
      rel((c.semiMajorAxis / r.radius) ** 1.5, c.p / c.q),
      a6,
      'T_m / T_r at the radius is p / q'
    );
  }
  for (const c of INPUTS.toomre) {
    const t = K.toomreQ(c);
    within(`a6.toomre.${c.id}`, rel(t.Q, ORACLE.toomre[c.id].Q), a6);
    within(
      `a6.toomre.${c.id}.kappa`,
      rel(t.kappa, ORACLE.toomre[c.id].kappa),
      a6
    );
  }
}

// ---- (b) published ---------------------------------------------------------------

function published() {
  const b1 = C['b1.roche.published'].bounds;
  within(
    'b1.rigid.coefficient',
    rel(K.ROCHE_RIGID_COEFF, 1.26),
    b1.coefficientRelative
  );
  row(
    'b1.fluid.default',
    K.ROCHE_FLUID_COEFF,
    2.44,
    K.ROCHE_FLUID_COEFF === 2.44
  );
  within(
    'b1.fluid.chandrasekhar',
    rel(K.CHANDRASEKHAR_FLUID_COEFF, 2.4553),
    b1.chandrasekharRelative
  );
  const mars = {
    primaryRadius: 3.3895e6,
    primaryDensity: 3933,
    satelliteDensity: 1876,
  };
  const phobos = K.rocheRegimeAt({ ...mars, distance: 9.376e6 });
  row(
    'b1.phobos.regime',
    9.376e6,
    [phobos.rigid, phobos.fluid],
    phobos.regime === 'deforming',
    `rigid ${(phobos.rigid / 1e3).toFixed(0)} km, fluid ${(phobos.fluid / 1e3).toFixed(0)} km: outside rigid, inside fluid`
  );
  const RJ = 7.1492e7;
  const sl9 = K.rocheRegimeAt({
    primaryRadius: RJ,
    primaryDensity: 1326,
    satelliteDensity: 600,
    distance: 1.3 * RJ,
  });
  row(
    'b1.sl9.regime',
    1.3,
    [sl9.rigid / RJ, sl9.fluid / RJ],
    sl9.regime !== 'safe',
    'perijove inside the fluid limit'
  );
  const moon = K.rocheRegimeAt({
    primaryRadius: 6.3781e6,
    primaryDensity: 5514,
    satelliteDensity: 3344,
    distance: 3.844e8,
  });
  row('b1.moon.regime', 3.844e8, moon.fluid, moon.regime === 'safe');

  const b2 = C['b2.moon.recession'].bounds;
  const em = INPUTS.evolution[0];
  const r = K.recession(em);
  const cmYr = r.dadt * 100 * YEAR;
  within(
    'b2.recession',
    rel(cmYr, 3.82),
    b2.recessionRelative,
    `${cmYr.toFixed(3)} cm/yr against 3.82 +/- 0.07 (Dickey et al. 1994)`
  );
  const dayMsPerCentury = (-r.dOmegaDt / em.spin) * 86400 * 3.15576e9 * 1000;
  within(
    'b2.day',
    rel(dayMsPerCentury, 2.3),
    b2.dayRelative,
    `${dayMsPerCentury.toFixed(3)} ms per century against 2.3 (Stephenson and Morrison 1995)`
  );

  const b3 = C['b3.io.heating'].bounds;
  const io = INPUTS.heating[0];
  const power = K.tidalHeating(io).power;
  const range = [6e13, 1.6e14];
  row(
    'b3.io.prediction',
    power,
    [range[0] / b3.factor, range[1] * b3.factor],
    power >= range[0] / b3.factor && power <= range[1] * b3.factor,
    'k2 3/2, Q 100: within a factor 2 of the observed 0.6 to 1.6e14 W'
  );
  const bound = K.heatingRange(io);
  row('b3.io.upper-bound', bound.high, range[1], bound.high > range[1]);
  const need = K.requiredK2OverQ({ ...io, power: 0.5 * (range[0] + range[1]) });
  row(
    'b3.io.required-k2overQ',
    need.k2OverQ,
    K.K2_MAX / K.Q_MIN,
    need.withinModel,
    'the k2/Q the observed heat flow requires'
  );

  const b4 = C['b4.cassini.gap'].bounds.relative;
  const mimas = K.resonanceRadius({
    semiMajorAxis: 1.8552e8,
    p: 2,
    q: 1,
  }).radius;
  within(
    'b4.cassini',
    rel(mimas, 1.1758e8),
    b4,
    `${(mimas / 1e3).toFixed(0)} km against 117,580 km (Porco et al. 2005)`
  );

  const b5 = C['b5.locking.published'].bounds.years;
  for (const id of ['moon', 'io']) {
    const t = K.lockingTime(INPUTS.locking.find(c => c.id === id)).years;
    row(
      `b5.${id}.locks`,
      t,
      b5,
      t < b5,
      `${t.toExponential(2)} years against the age 4.5e9`
    );
  }
}

function notApplicableTier() {
  notApplicable('c.ensemble', C['c.ensemble'].what);
}

// ---- (d) refusals -----------------------------------------------------------------

function refusals() {
  const em = INPUTS.evolution[0];
  const io = INPUTS.heating[0];
  const lk = INPUTS.locking[0];
  const rk = {
    primaryRadius: 1e6,
    primaryDensity: 3000,
    satelliteDensity: 2000,
  };
  const cases = [
    ['input', () => K.rocheLimit(undefined)],
    ['input', () => K.rocheLimit(null)],
    ['input', () => K.rocheLimit({ ...rk, primaryRadius: NaN })],
    ['input', () => K.rocheLimit({ ...rk, primaryRadius: Infinity })],
    ['input', () => K.rocheLimit({ ...rk, primaryDensity: 0 })],
    ['input', () => K.rocheLimit({ ...rk, satelliteDensity: -1 })],
    ['input', () => K.rocheLimit({ ...rk, primaryRadius: '1e6' })],
    ['input', () => K.rocheLimit({ ...rk, kind: 'liquid' })],
    ['input', () => K.rocheRegimeAt({ ...rk, distance: 0 })],
    ['input', () => K.tidalBulge({ ...INPUTS.bulge[0], perturberMass: -1 })],
    ['input', () => K.tidalBulge({ ...INPUTS.bulge[0], bodyRadius: 0 })],
    ['input', () => K.tidalBulge({ ...INPUTS.bulge[0], h2: NaN })],
    [
      'orbit-inside-body',
      () => K.tidalBulge({ ...INPUTS.bulge[0], distance: 6e6 }),
    ],
    ['input', () => K.tidalHeating({ ...io, primaryMass: 0 })],
    ['input', () => K.tidalHeating({ ...io, eccentricity: NaN })],
    ['eccentricity', () => K.tidalHeating({ ...io, eccentricity: 0.11 })],
    ['eccentricity', () => K.tidalHeating({ ...io, eccentricity: -0.01 })],
    ['q-range', () => K.tidalHeating({ ...io, Q: 4.99 })],
    ['q-range', () => K.tidalHeating({ ...io, Q: 2e7 })],
    ['input', () => K.tidalHeating({ ...io, Q: NaN })],
    ['k2-range', () => K.tidalHeating({ ...io, k2: 0 })],
    ['k2-range', () => K.tidalHeating({ ...io, k2: 1.6 })],
    ['k2-range', () => K.tidalHeating({ ...io, k2: -0.1 })],
    ['orbit-inside-body', () => K.tidalHeating({ ...io, semiMajorAxis: 1e6 })],
    ['input', () => K.requiredK2OverQ({ ...io, power: -1 })],
    [
      'eccentricity',
      () => K.requiredK2OverQ({ ...io, eccentricity: 0, power: 1e13 }),
    ],
    ['input', () => K.recession({ ...em, spin: 0 })],
    ['input', () => K.recession({ ...em, satelliteMass: Infinity })],
    ['input', () => K.recession({ ...em, semiMajorAxis: '3.8e8' })],
    ['orbit-inside-body', () => K.recession({ ...em, semiMajorAxis: 6e6 })],
    ['alpha-range', () => K.recession({ ...em, alpha: 0.9 })],
    ['alpha-range', () => K.recession({ ...em, alpha: 0 })],
    ['q-range', () => K.recession({ ...em, Q: 1 })],
    ['input', () => K.evolveCircular({ ...em, time: NaN })],
    ['input', () => K.evolveCircular({ ...em })],
    ['input', () => K.timeToReach({ ...em, target: -1 })],
    ['input', () => K.lockingTime({ ...lk, spin: -1 })],
    ['input', () => K.lockingTime({ ...lk, perturberMass: 0 })],
    ['q-range', () => K.lockingTime({ ...lk, Q: 0.5 })],
    ['k2-range', () => K.lockingTime({ ...lk, k2: 2 })],
    ['orbit-inside-body', () => K.lockingTime({ ...lk, semiMajorAxis: 1e6 })],
    [
      'resonance-order',
      () => K.resonanceRadius({ semiMajorAxis: 1e8, p: 2, q: 2 }),
    ],
    [
      'resonance-order',
      () => K.resonanceRadius({ semiMajorAxis: 1e8, p: 1, q: 2 }),
    ],
    [
      'resonance-order',
      () => K.resonanceRadius({ semiMajorAxis: 1e8, p: 1.5, q: 1 }),
    ],
    [
      'resonance-order',
      () => K.resonanceRadius({ semiMajorAxis: 1e8, p: 2, q: 0 }),
    ],
    ['input', () => K.resonanceRadius({ semiMajorAxis: -1e8, p: 2, q: 1 })],
    [
      'resonance-order',
      () => K.resonanceRadius({ semiMajorAxis: 1e8, p: '2', q: 1 }),
    ],
    ['input', () => K.nearestResonances({ semiMajorAxis: 1e8, radius: 2e8 })],
    [
      'input',
      () =>
        K.toomreQ({
          primaryMass: 1e27,
          radius: 1e8,
          velocityDispersion: 0,
          surfaceDensity: 1,
        }),
    ],
    [
      'input',
      () =>
        K.toomreQ({
          primaryMass: 1e27,
          radius: 1e8,
          velocityDispersion: 1,
          surfaceDensity: 1,
          kind: 'gas',
        }),
    ],
  ];
  let refused = 0;
  const failures = [];
  for (const [code, call] of cases) {
    try {
      const out = call();
      failures.push(`${code}: returned ${JSON.stringify(out)}`);
    } catch (e) {
      if (e instanceof K.TidesError && e.code === code) refused++;
      else failures.push(`${code}: threw ${e && e.name} ${e && e.code}`);
    }
  }
  row(
    'd.refusals.hostile',
    refused,
    cases.length,
    refused === cases.length,
    failures.join('; ')
  );

  // Corotation: the Earth and the Moon at a stated k2/Q run far enough meet.
  let crossing = null;
  try {
    K.evolveCircular({ ...em, time: 1e12 * YEAR });
  } catch (e) {
    if (e instanceof K.TidesError) crossing = e;
  }
  row(
    'd.corotation.named',
    crossing && crossing.detail ? crossing.detail.time / YEAR : null,
    1e12,
    !!crossing && crossing.code === 'corotation' && crossing.detail.time > 0,
    'refused, with the time the spin meets the orbit'
  );
  if (crossing && crossing.detail) {
    const t = crossing.detail.time * (1 - 1e-9);
    const s = K.evolveCircular({ ...em, time: t });
    within(
      'd.corotation.consistent',
      rel(s.spin, s.n),
      1e-5,
      'spin equals n at the named time'
    );
  }
  // A moon that falls: the Mars-Phobos pair reaches the surface.
  const ph = INPUTS.evolution[2];
  let fell = null;
  try {
    K.evolveCircular({ ...ph, time: 1e10 * YEAR });
  } catch (e) {
    fell = e;
  }
  row(
    'd.contact.refused',
    fell && fell.code,
    'orbit-inside-body',
    !!fell && fell.code === 'orbit-inside-body'
  );
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  analytic();
  published();
  notApplicableTier();
  refusals();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = runValidation();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else {
    for (const r of out) {
      const v = r.measured === null ? '' : Number(r.measured).toPrecision(4);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag = r.pass === null ? 'N/A' : r.pass ? 'pass' : 'FAIL';
      process.stdout.write(
        `${tag.padEnd(6)}${r.id.padEnd(40)}${v.padEnd(12)}${b} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing of ${out.length}, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
