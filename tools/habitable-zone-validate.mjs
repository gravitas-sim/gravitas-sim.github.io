#!/usr/bin/env node
// =============================================================================
// The habitable-zone kernel against its committed thresholds (Prompt 205)
// -----------------------------------------------------------------------------
//   npm run habitablezone:validate               print the table
//   npm run habitablezone:validate -- --json     print it as JSON
//
// tests/fixtures/habitable-zone-ii/thresholds.json fixed every bound before
// js/kernels/habitablezone/ had been run (HABITABLE_ZONE_II.md, "The validation
// contract"). This runs the checks against the production modules and judges
// them against those bounds, read from the file and not copied. The oracle's
// rows read the results pinned in tests/fixtures/habitable-zone-ii/ (numpy,
// scipy: no Gravitas code). Tier (c) and the escape row are not applicable and
// are stated, not run.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/habitablezone/index.js';
import { zoneAtAge, zonesAtAges } from '../js/kernels/habitablezone/age.js';
import { lockingTime } from '../js/kernels/tides/tides.js';
import * as H from '../js/habitability.js';
import { stateAtEep } from '../js/stellar/tracks.js';
import {
  AU_METERS,
  EARTH_MASS_KG,
  EARTH_RADIUS_M,
  SOLAR_MASS_KG,
} from '../js/constants.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/habitable-zone-ii');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const INPUTS = JSON.parse(
  readFileSync(
    path.join(HERE, 'habitable-zone-oracle/oracle-inputs.json'),
    'utf8'
  )
);
const ORACLE = read('oracle-results.json');
const C = THRESHOLDS.checks;
const KEYS = K.LIMIT_KEYS;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const notApplicable = (id, note) =>
  rows.push({ id, measured: null, pass: null, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const rel = (a, b) => Math.abs(a - b) / (Math.abs(b) || 1);
const asKernel = o => ({
  luminositySolar: o.luminosity,
  semiMajorAU: o.semiMajorAU,
  eccentricity: o.eccentricity,
});
const flag = (id, ok, note) => row(id, Number(ok), 1, !!ok, note);

function analytic() {
  // a1: the limit fluxes against the oracle.
  const a1 = C['a1.limits.closed'].bounds;
  let worst = 0;
  for (const t of INPUTS.teffs) {
    const o = ORACLE.fluxes[String(t)];
    for (const key of KEYS)
      worst = Math.max(worst, rel(K.limitFlux(key, t), o[key]));
  }
  within(
    'a1.fluxes.oracle',
    worst,
    a1.relative,
    `${INPUTS.teffs.length} temperatures, four limits`
  );
  const sunTerms = {
    recentVenus: 1.7763,
    runawayGreenhouse: 1.0385,
    maximumGreenhouse: 0.3507,
    earlyMars: 0.3207,
  };
  for (const key of KEYS) {
    within(
      `a1.constant-term.${key}`,
      Math.abs(K.limitFlux(key, K.SUN_TEFF_K) - sunTerms[key]),
      a1.constantTermAbsolute,
      'at 5780 K only the constant survives'
    );
  }

  // a2: the edges against the oracle, the inverse-square round trip, scaling, nesting.
  const a2 = C['a2.edges.closed'].bounds;
  let wEdge = 0;
  let wRound = 0;
  let wScale = 0;
  let nested = true;
  for (const s of INPUTS.stars) {
    const z = K.zoneLimits({ luminositySolar: s.luminosity, teffK: s.teff });
    const o = ORACLE.edges[s.id];
    for (const key of KEYS) {
      wEdge = Math.max(wEdge, rel(z.limits[key].distanceAU, o[key]));
      wRound = Math.max(
        wRound,
        rel(
          K.fluxAtDistance(s.luminosity, z.limits[key].distanceAU),
          z.limits[key].flux
        )
      );
      const z4 = K.zoneLimits({
        luminositySolar: 4 * s.luminosity,
        teffK: s.teff,
      });
      wScale = Math.max(
        wScale,
        rel(z4.limits[key].distanceAU, 2 * z.limits[key].distanceAU)
      );
    }
    const { conservative: c, optimistic: p } = z;
    nested =
      nested &&
      p.innerAU < c.innerAU &&
      c.innerAU < c.outerAU &&
      c.outerAU < p.outerAU &&
      K.zoneEdges({ luminositySolar: s.luminosity, teffK: s.teff }).innerAU ===
        c.innerAU &&
      K.zoneEdges(
        { luminositySolar: s.luminosity, teffK: s.teff },
        'optimistic'
      ).outerAU === p.outerAU;
  }
  within(
    'a2.edges.oracle',
    wEdge,
    a2.relative,
    `${INPUTS.stars.length} stars, four limits`
  );
  within(
    'a2.roundtrip',
    wRound,
    a2.relative,
    'the flux at the returned distance is the limit'
  );
  within(
    'a2.scaling.sqrt-L',
    wScale,
    a2.scalingRelative,
    'four times the luminosity doubles an edge'
  );
  flag(
    'a2.nested',
    nested,
    'optimistic inner < conservative inner < conservative outer < optimistic outer'
  );

  // a3: the orbit.
  const a3 = C['a3.orbit.closed'].bounds;
  let wFlux = 0;
  let wMean = 0;
  let wClosed = 0;
  let wSampled = 0;
  let betweenExtremes = true;
  let wExisting = 0;
  for (const o of INPUTS.orbits) {
    const r = K.orbitFluxes(asKernel(o));
    const or = ORACLE.orbits[o.id];
    wFlux = Math.max(
      wFlux,
      rel(r.periapsisFlux, or.periapsisFlux),
      rel(r.apoapsisFlux, or.apoapsisFlux),
      rel(r.meanFlux, or.meanFluxClosed)
    );
    wMean = Math.max(wMean, rel(r.meanFlux, or.meanFluxSampled));
    betweenExtremes =
      betweenExtremes &&
      r.meanFlux >= r.apoapsisFlux * (1 - 1e-15) &&
      r.meanFlux <= r.periapsisFlux * (1 + 1e-15);
    for (const b of or.bands) {
      const f = K.fractionOfYearInBand({
        semiMajorAU: o.semiMajorAU,
        eccentricity: o.eccentricity,
        innerAU: b.innerAU,
        outerAU: b.outerAU,
      });
      wClosed = Math.max(wClosed, rel(f, b.closed));
      wSampled = Math.max(wSampled, Math.abs(f - b.sampled));
      const fe = H.fractionOfYearInZone(
        {
          semiMajorAU: o.semiMajorAU,
          eccentricity: o.eccentricity,
          luminositySolar: o.luminosity,
        },
        { innerAU: b.innerAU, outerAU: b.outerAU }
      );
      wExisting = Math.max(wExisting, Math.abs(f - fe));
    }
  }
  within(
    'a3.fluxes.oracle',
    wFlux,
    a3.relative,
    `${INPUTS.orbits.length} orbits`
  );
  within(
    'a3.mean.sampled',
    wMean,
    a3.relative,
    'the time average of the flux, by quadrature in mean anomaly'
  );
  flag(
    'a3.mean.between',
    betweenExtremes,
    'the mean lies between apoapsis and periapsis'
  );
  within(
    'a3.band.closed',
    wClosed,
    a3.relative,
    'against the oracle closed form'
  );
  within(
    'a3.band.sampled',
    wSampled,
    a3.samplingAbsolute,
    'against the oracle sampling of Kepler solutions'
  );
  within(
    'a3.band.existing-sampler',
    wExisting,
    a3.existingSamplerAbsolute,
    'js/habitability.js, 4,000 samples'
  );
  const circ = { semiMajorAU: 1, eccentricity: 0 };
  flag(
    'a3.circular',
    K.fractionOfYearInBand({ ...circ, innerAU: 0.9, outerAU: 1.1 }) === 1 &&
      K.fractionOfYearInBand({ ...circ, innerAU: 1.1, outerAU: 1.5 }) === 0,
    'a circular orbit is in or out'
  );
  flag(
    'a3.bounds',
    K.fractionOfYearInBand({
      semiMajorAU: 1,
      eccentricity: 0.4,
      innerAU: 0,
      outerAU: 0.5,
    }) === 0 &&
      K.fractionOfYearInBand({
        semiMajorAU: 1,
        eccentricity: 0.4,
        innerAU: 0,
        outerAU: 3,
      }) === 1 &&
      K.fractionOfYearInBand({
        semiMajorAU: 1,
        eccentricity: 0.4,
        innerAU: 1.7,
        outerAU: 3,
      }) === 0,
    'a band outside the orbit holds none of the year, one around it holds all'
  );

  // a4: the locking radius.
  const a4 = C['a4.locking.closed'].bounds;
  let wLock = 0;
  let wRoundTrip = 0;
  let rangeOk = true;
  const base = INPUTS.locking[0];
  for (const c of INPUTS.locking) {
    const r = K.lockingRadius(c);
    wLock = Math.max(wLock, rel(r.radiusAU, ORACLE.locking[c.id].radiusAU));
    const t = lockingTime({
      perturberMass: c.starMassSun * SOLAR_MASS_KG,
      satelliteMass: c.planetMassEarth * EARTH_MASS_KG,
      satelliteRadius: c.planetRadiusEarth * EARTH_RADIUS_M,
      semiMajorAxis: r.radiusAU * AU_METERS,
      k2: c.k2,
      Q: c.Q,
      spin: (2 * Math.PI) / (c.spinPeriodHours * 3600),
      alpha: c.alpha,
    }).years;
    wRoundTrip = Math.max(wRoundTrip, rel(t, c.ageYr));
    const rg = K.lockingRadiusRange({ ...c, Q: 100 });
    rangeOk =
      rangeOk &&
      rg.lowAU < rg.radiusAU &&
      rg.radiusAU < rg.highAU &&
      rel(rg.lowAU / rg.radiusAU, 10 ** (-1 / 6)) <= a4.relative &&
      rel(rg.highAU / rg.radiusAU, 10 ** (1 / 6)) <= a4.relative;
  }
  within(
    'a4.radius.oracle',
    wLock,
    a4.relative,
    `${INPUTS.locking.length} stars and planets`
  );
  within(
    'a4.roundtrip.tides-kernel',
    wRoundTrip,
    a4.relative,
    'lockingTime at the radius is the age'
  );
  flag(
    'a4.range',
    rangeOk,
    'Q 1000 and Q 10 about Q 100 are 10^(1/6) either way'
  );
  const r0 = K.lockingRadius(base).radiusAU;
  const expo = (changed, factor) =>
    Math.log(K.lockingRadius({ ...base, ...changed }).radiusAU / r0) /
    Math.log(factor);
  for (const [name, changed, factor, want] of [
    ['star-mass', { starMassSun: 2 * base.starMassSun }, 2, 1 / 3],
    ['age', { ageYr: 2 * base.ageYr }, 2, 1 / 6],
    ['k2', { k2: 2 * base.k2 }, 2, 1 / 6],
    ['spin-rate', { spinPeriodHours: base.spinPeriodHours / 2 }, 2, -1 / 6],
  ]) {
    within(
      `a4.exponent.${name}`,
      Math.abs(expo(changed, factor) - want),
      a4.exponentAbsolute
    );
  }

  // a5: the zone along a MIST track.
  const a5 = C['a5.age.closed'].bounds.relative;
  const track = THRESHOLDS.ages.track;
  const TR = ORACLE.track[track];
  let wStar = 0;
  let wZone = 0;
  let wSc = 0;
  for (const age of THRESHOLDS.ages.years) {
    const o = TR[repr(age)];
    const z = zoneAtAge({ trackId: track, ageYr: age });
    wStar = Math.max(
      wStar,
      rel(z.star.luminositySolar, o.luminosity),
      rel(z.star.teffK, o.teff)
    );
    for (const key of KEYS) {
      wZone = Math.max(wZone, rel(z.zone.limits[key].distanceAU, o.edges[key]));
      wSc = Math.max(
        wSc,
        rel(
          z.zone.limits[key].distanceAU ** 2 * z.zone.limits[key].flux,
          z.star.luminositySolar
        )
      );
    }
  }
  within(
    'a5.star.oracle',
    wStar,
    a5,
    'luminosity and temperature at three ages'
  );
  within('a5.edges.oracle', wZone, a5, 'four edges at three ages');
  within(
    'a5.edges.scaling',
    wSc,
    1e-12,
    'flux times distance squared is the luminosity'
  );
  for (const [id, ages] of Object.entries(INPUTS.extraTrackAges)) {
    for (const age of ages) {
      const o = ORACLE.track[id][repr(age)];
      let z;
      try {
        z = zoneAtAge({ trackId: id, ageYr: age });
        within(
          `a5.extra.${id}.${age}`,
          Math.max(
            rel(z.star.luminositySolar, o.luminosity),
            rel(z.star.teffK, o.teff)
          ),
          a5
        );
      } catch (e) {
        // m200 at these ages may leave the domain: the refusal is the answer
        flag(
          `a5.extra.${id}.${age}`,
          e instanceof K.HabitableZoneError && e.code === 'teff-domain',
          `refused: ${e.code}`
        );
      }
    }
  }
  const last = ORACLE.track.m020[repr(INPUTS.extraTrackAges.m020[0])].lastAgeYr;
  let accepted = false;
  try {
    zoneAtAge({ trackId: 'm020', ageYr: last });
    accepted = true;
  } catch (e) {
    accepted = `${e.code}`;
  }
  flag(
    'a5.end.accepted',
    accepted === true,
    `the last stored age of m020: ${accepted}`
  );
  let beyond = null;
  try {
    zoneAtAge({ trackId: 'm020', ageYr: last * (1 + 1e-12) });
  } catch (e) {
    beyond = e.code;
  }
  flag(
    'a5.end.refused',
    beyond === 'age-domain',
    `1e-12 past the end: ${beyond}`
  );
}

/** Node's repr of a float, as the oracle's Python keys it ("1000000000.0"). */
function repr(x) {
  return Number.isInteger(x) ? `${x}.0` : String(x);
}

function published() {
  // b1: the Sun against the published two-figure edges.
  const sun = K.zoneLimits({ luminositySolar: 1, teffK: K.SUN_TEFF_K });
  const b1 = C['b1.sun.published'].bounds.relative;
  for (const [key, quoted] of [
    ['recentVenus', 0.75],
    ['runawayGreenhouse', 0.99],
    ['maximumGreenhouse', 1.7],
    ['earlyMars', 1.77],
  ]) {
    within(
      `b1.sun.${key}`,
      rel(sun.limits[key].distanceAU, quoted),
      b1,
      `${sun.limits[key].distanceAU.toFixed(4)} AU against ${quoted}`
    );
  }

  // b2: the same parameterisation as the panel and the ring.
  const b2 = C['b2.existing.authority'].bounds.relative;
  let wFlux = 0;
  for (let t = 2600; t <= 7200; t += 115) {
    for (const key of KEYS)
      wFlux = Math.max(
        wFlux,
        rel(K.limitFlux(key, t), H.effectiveFluxAt(key, t))
      );
  }
  within(
    'b2.fluxes',
    wFlux,
    b2,
    '41 temperatures, four limits, js/habitability.js effectiveFluxAt'
  );
  let wEdges = 0;
  for (const s of INPUTS.stars.slice(0, 6)) {
    for (const model of ['conservative', 'optimistic']) {
      const e = K.zoneEdges(
        { luminositySolar: s.luminosity, teffK: s.teff },
        model
      );
      const h = H.habitableZoneBounds(
        { luminositySolar: s.luminosity, teffK: s.teff },
        model
      );
      wEdges = Math.max(
        wEdges,
        rel(e.innerAU, h.innerAU),
        rel(e.outerAU, h.outerAU),
        rel(e.innerFlux, h.innerFlux),
        rel(e.outerFlux, h.outerFlux)
      );
    }
  }
  within('b2.edges', wEdges, b2, 'six stars, both models, habitableZoneBounds');
  let wExt = 0;
  for (const o of INPUTS.orbits) {
    const k = K.orbitFluxes(asKernel(o));
    const h = H.orbitExtremes({
      semiMajorAU: o.semiMajorAU,
      eccentricity: o.eccentricity,
      luminositySolar: o.luminosity,
    });
    wExt = Math.max(
      wExt,
      rel(k.periapsisFlux, h.periapsisInsolation),
      rel(k.apoapsisFlux, h.apoapsisInsolation),
      rel(k.periapsisAU, h.periapsisAU)
    );
  }
  within('b2.extremes', wExt, b2, 'orbitExtremes');
  flag(
    'b2.coefficients.same-domain',
    H.HZ_TEFF_RANGE.min === K.HZ_TEFF_DOMAIN.min &&
      H.HZ_TEFF_RANGE.max === K.HZ_TEFF_DOMAIN.max,
    'the same temperature range'
  );

  // b3: the 1 solar-mass track.
  const ages = THRESHOLDS.ages.years;
  const track = THRESHOLDS.ages.track;
  const z = ages.map(age => zoneAtAge({ trackId: track, ageYr: age }));
  const L = z.map(x => x.star.luminositySolar);
  const gough = t => 1 / (1 + 0.4 * (1 - t / 4.57e9));
  const b3 = C['b3.luminosity.ratio'].bounds.relative;
  within(
    'b3.ratio.1Gyr',
    rel(L[0] / L[1], gough(1e9) / gough(4.57e9)),
    b3,
    `${(L[0] / L[1]).toFixed(4)} against ${gough(1e9).toFixed(4)}`
  );
  within(
    'b3.ratio.8Gyr',
    rel(L[2] / L[1], gough(8e9) / gough(4.57e9)),
    b3,
    `${(L[2] / L[1]).toFixed(4)} against ${gough(8e9).toFixed(4)}`
  );
  const zams = stateAtEep(track, 'zams');
  within(
    'b3.zams',
    rel(zams.luminositySun, gough(0) / gough(4.57e9)),
    C['b3.zams'].bounds.relative,
    `${zams.luminositySun.toFixed(4)} against ${gough(0).toFixed(4)}`
  );
  within(
    'b3.model-star',
    rel(L[1], 1),
    C['b3.model-star'].bounds.relative,
    `${L[1].toFixed(4)} L_sun at 4.57 Gyr: a model star, not the Sun`
  );
  const inner = z.map(x => x.zone.conservative.innerAU);
  const outer = z.map(x => x.zone.conservative.outerAU);
  const width = z.map((_, i) => outer[i] - inner[i]);
  flag(
    'b3.movement',
    inner[0] < inner[1] &&
      inner[1] < inner[2] &&
      outer[0] < outer[1] &&
      outer[1] < outer[2] &&
      width[0] < width[1] &&
      width[1] < width[2],
    `inner ${inner.map(x => x.toFixed(3)).join(', ')}; outer ${outer.map(x => x.toFixed(3)).join(', ')} AU`
  );
  flag(
    'b3.many-ages',
    zonesAtAges({ trackId: track, agesYr: ages }).length === 3,
    'zonesAtAges'
  );

  // b4: locking inequalities for an Earth-like planet.
  const earthlike = { ...K.LOCKING_DEFAULTS };
  const R = (m, age) =>
    K.lockingRadius({ ...earthlike, starMassSun: m, ageYr: age }).radiusAU;
  const rSun = R(1, 4.5e9);
  flag(
    'b4.earth-sun',
    1 > rSun,
    `the locking radius is ${rSun.toFixed(3)} AU; the Earth is at 1 AU`
  );
  const rPro = R(0.1221, 4.85e9);
  flag('b4.proxima-b', 0.0485 < rPro, `${rPro.toFixed(3)} AU against 0.0485`);
  const rTr = R(0.0898, 7.6e9);
  flag('b4.trappist1-h', 0.0619 < rTr, `${rTr.toFixed(3)} AU against 0.0619`);
  const m2 = zoneAtAge({ trackId: 'm020', ageYr: 5e9 });
  const r2 = R(0.2, 5e9);
  flag(
    'b4.m-dwarf-zone-locked',
    m2.zone.conservative.innerAU < r2,
    `inner edge ${m2.zone.conservative.innerAU.toFixed(3)} AU, locking radius ${r2.toFixed(3)} AU`
  );
  const r1 = R(1, 4.57e9);
  flag(
    'b4.sun-like-zone-free',
    z[1].zone.conservative.innerAU > r1,
    `inner edge ${z[1].zone.conservative.innerAU.toFixed(3)} AU, locking radius ${r1.toFixed(3)} AU`
  );
}

function notApplicableTier() {
  notApplicable('b5.escape', C['b5.escape'].what);
  notApplicable('c.ensemble', 'no uncertainty estimator to cover');
}

function refusals() {
  const sun = { luminositySolar: 1, teffK: 5780 };
  const orbit = { luminositySolar: 1, semiMajorAU: 1, eccentricity: 0.1 };
  const band = {
    semiMajorAU: 1,
    eccentricity: 0.1,
    innerAU: 0.9,
    outerAU: 1.1,
  };
  const lock = { starMassSun: 1, ageYr: 4.5e9 };
  const cases = [
    ['teff-domain', () => K.zoneLimits({ ...sun, teffK: 2599.999 })],
    ['teff-domain', () => K.zoneLimits({ ...sun, teffK: 7200.001 })],
    ['teff-domain', () => K.zoneLimits({ ...sun, teffK: 0 })],
    ['teff-domain', () => K.zoneLimits({ ...sun, teffK: -5780 })],
    ['teff-domain', () => K.limitFlux('runawayGreenhouse', 2566)],
    ['teff-domain', () => K.fluxLimits({ teffK: 10000 })],
    ['teff-domain', () => K.zoneEdges({ ...sun, teffK: 3e4 })],
    ['input', () => K.zoneLimits({ ...sun, teffK: NaN })],
    ['input', () => K.zoneLimits({ ...sun, teffK: Infinity })],
    ['input', () => K.zoneLimits({ ...sun, teffK: '5780' })],
    ['input', () => K.zoneLimits({ luminositySolar: 1 })],
    ['input', () => K.zoneLimits(null)],
    ['input', () => K.zoneLimits([])],
    ['input', () => K.zoneLimits(5)],
    ['luminosity', () => K.zoneLimits({ ...sun, luminositySolar: 0 })],
    ['luminosity', () => K.zoneLimits({ ...sun, luminositySolar: -1 })],
    ['luminosity', () => K.zoneLimits({ ...sun, luminositySolar: NaN })],
    ['luminosity', () => K.zoneLimits({ ...sun, luminositySolar: '1' })],
    ['luminosity', () => K.zoneLimits({ ...sun, luminositySolar: Infinity })],
    ['limit', () => K.limitFlux('moistGreenhouse', 5780)],
    ['limit', () => K.limitFlux(undefined, 5780)],
    ['limit', () => K.limitFlux('toString', 5780)],
    ['limit', () => K.limitFlux('__proto__', 5780)],
    ['model', () => K.zoneEdges(sun, 'cozy')],
    ['input', () => K.distanceForFlux(1, 0)],
    ['luminosity', () => K.distanceForFlux(0, 1)],
    ['orbit', () => K.fluxAtDistance(1, 0)],
    ['orbit', () => K.fluxAtDistance(1, -1)],
    ['orbit', () => K.fluxAtDistance(1, NaN)],
    ['eccentricity', () => K.orbitFluxes({ ...orbit, eccentricity: 1 })],
    ['eccentricity', () => K.orbitFluxes({ ...orbit, eccentricity: -0.1 })],
    ['eccentricity', () => K.orbitFluxes({ ...orbit, eccentricity: 1.5 })],
    ['input', () => K.orbitFluxes({ ...orbit, eccentricity: NaN })],
    ['orbit', () => K.orbitFluxes({ ...orbit, semiMajorAU: 0 })],
    ['luminosity', () => K.orbitFluxes({ ...orbit, luminositySolar: 0 })],
    [
      'band',
      () => K.fractionOfYearInBand({ ...band, innerAU: 1.1, outerAU: 0.9 }),
    ],
    ['band', () => K.fractionOfYearInBand({ ...band, innerAU: 1, outerAU: 1 })],
    ['band', () => K.fractionOfYearInBand({ ...band, innerAU: -0.1 })],
    ['input', () => K.fractionOfYearInBand({ ...band, outerAU: NaN })],
    [
      'eccentricity',
      () => K.fractionOfYearInBand({ ...band, eccentricity: 1 }),
    ],
    ['orbit', () => K.fractionOfYearInBand({ ...band, semiMajorAU: -1 })],
    ['input', () => K.lockingRadius({})],
    ['input', () => K.lockingRadius(null)],
    ['input', () => K.lockingRadius({ ...lock, starMassSun: 0 })],
    ['input', () => K.lockingRadius({ ...lock, ageYr: -1 })],
    ['input', () => K.lockingRadius({ ...lock, ageYr: NaN })],
    ['input', () => K.lockingRadius({ ...lock, planetRadiusEarth: 0 })],
    ['input', () => K.lockingRadius({ ...lock, spinPeriodHours: 0 })],
    ['q-range', () => K.lockingRadius({ ...lock, Q: 4 })],
    ['q-range', () => K.lockingRadius({ ...lock, Q: 1e8 })],
    ['q-range', () => K.lockingRadiusRange({ ...lock, Q: 5 })],
    ['k2-range', () => K.lockingRadius({ ...lock, k2: 2 })],
    ['k2-range', () => K.lockingRadius({ ...lock, k2: 0 })],
    ['alpha-range', () => K.lockingRadius({ ...lock, alpha: 0.5 })],
    ['orbit', () => K.lockedWithinAge(lock, 0)],
    ['track', () => zoneAtAge({ trackId: 'nope', ageYr: 1e9 })],
    ['track', () => zoneAtAge({ ageYr: 1e9 })],
    ['input', () => zoneAtAge({ trackId: 'm100', ageYr: NaN })],
    ['age-domain', () => zoneAtAge({ trackId: 'm100', ageYr: 0 })],
    ['age-domain', () => zoneAtAge({ trackId: 'm100', ageYr: -1e9 })],
    ['age-domain', () => zoneAtAge({ trackId: 'm100', ageYr: 1e12 })],
    ['teff-domain', () => zoneAtAge({ trackId: 'm200', ageYr: 1e8 })],
    ['input', () => zonesAtAges({ trackId: 'm100', agesYr: [] })],
  ];
  let refused = 0;
  const failures = [];
  for (const [code, call] of cases) {
    try {
      const out = call();
      failures.push(`${code}: returned ${JSON.stringify(out).slice(0, 60)}`);
    } catch (e) {
      if (e && e.code === code) refused++;
      else failures.push(`${code}: threw ${e && e.name} ${e && e.code}`);
    }
  }
  row(
    'd.refusals.hostile',
    refused,
    cases.length,
    refused === cases.length &&
      cases.length >= C['d.refusals'].bounds.minimumCases,
    failures.join('; ')
  );

  // d.domain: the edges are in, a thousandth outside is out.
  let ok = true;
  for (const t of [2600, 7200]) {
    try {
      K.zoneLimits({ ...sun, teffK: t });
    } catch {
      ok = false;
    }
  }
  flag('d.domain.edges-accepted', ok, '2600 K and 7200 K');
  for (const t of [2599.999, 7200.001]) {
    let err = null;
    try {
      K.zoneLimits({ ...sun, teffK: t });
    } catch (e) {
      err = e;
    }
    flag(
      `d.domain.refused.${t}`,
      !!err &&
        err.code === 'teff-domain' &&
        err.detail.teffK === t &&
        err.detail.min === 2600 &&
        err.detail.max === 7200,
      'the detail names the temperature and both bounds'
    );
  }
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
