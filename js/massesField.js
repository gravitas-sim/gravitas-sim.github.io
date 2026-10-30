// =============================================================================
// The views of the mass panels (Prompt 218, BINARY_MASSES.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/massesWidgets.js
// and tests/binaryMassesLessons.test.js (which recomputes every number a lesson
// states from them). Nothing is calculated here that the kernel or the inference
// core does not: the orbits are js/inference/binaryMasses.js over js/inference/rv.js
// and js/inference/binaries.js, the fits, their uncertainties and their rank
// analyses are js/inference/infer.js on the models of js/inference/binaryJoint.js,
// and the comparison stars are the MIST tracks (js/stellar/tracks.js).
//
// Every system is SYNTHETIC and says so: its truth is kept here so a lesson can
// state what the fit should return; its masses are what the reader is asked to
// weigh, its radii and temperatures are read from the MIST tracks at a stated
// fraction of each star's main-sequence life and rounded, and its velocities and
// light curve are made by the forward models with a seeded noise draw.
//
// Pure: no DOM, no clock. A fit is cached per system, so a lesson that moves a
// slider does not repeat it.
// =============================================================================

import { eclipseFlux } from './inference/binaries.js';
import {
  absoluteProperties,
  companionMinimumMass,
  elementsOf,
  massFunction,
  minimumMasses,
  rvPair,
} from './inference/binaryMasses.js';
import { fitOnce } from './inference/infer.js';
import { syntheticSb2 } from './inference/synthetic.js';
import { mainSequenceAt } from './stellar/tracks.js';

const { Math, Float64Array, Map } = globalThis;

/** The band the surface brightness ratio is stated in: TESS-like, 0.8 micrometers. */
export const BAND_UM = 0.8;
const HC_K = 14387.77; // hc/k, micrometer kelvin
/** The effective temperature of the Sun, K (IAU 2015 B3 nominal). */
export const TEFF_SUN = 5772;
/** The uncertainty adopted for the temperature of star 1, from "its spectrum" (an input, not a fit). */
export const SIGMA_T1 = 100;

const LD = { ldA: [0.35, 0.25], ldB: [0.42, 0.22] };

/**
 * The systems, by index. `kind` says what the data are: an eclipsing pair with
 * both velocity curves (the joint solution), a double-lined pair that does not
 * eclipse (minimum masses only) and a single-lined orbit (a mass function).
 * `fraction` is how far through its main-sequence life each star is, which fixed
 * its radius and temperature from the MIST tracks.
 */
export const SYSTEMS = Object.freeze([
  {
    id: 'a',
    kind: 'eclipsing',
    draw: 0,
    truth: {
      M1: 1.3,
      M2: 1.1,
      R1: 1.296,
      R2: 1.035,
      T1: 6860,
      T2: 6180,
      J: 0.735,
      P: 3.7,
      e: 0,
      w: 90,
      inc: 89.2,
      tc: 0.4,
    },
    fraction: [0.45, 0.25],
    sigmaFlux: 0.0003,
    sigmaRv: 0.7,
    nRv: 14,
  },
  {
    id: 'b',
    kind: 'eclipsing',
    draw: 0,
    truth: {
      M1: 1.5,
      M2: 1.35,
      R1: 1.62,
      R2: 1.379,
      T1: 7340,
      T2: 6990,
      J: 0.875,
      P: 6.2,
      e: 0.15,
      w: 48,
      inc: 88.4,
      tc: 0.9,
    },
    fraction: [0.6, 0.5],
    sigmaFlux: 0.00025,
    sigmaRv: 0.7,
    nRv: 16,
  },
  {
    id: 'c',
    kind: 'eclipsing',
    draw: 0,
    truth: {
      M1: 0.62,
      M2: 0.54,
      R1: 0.618,
      R2: 0.542,
      T1: 4360,
      T2: 4010,
      J: 0.694,
      P: 1.7,
      e: 0,
      w: 90,
      inc: 86.9,
      tc: 0.2,
    },
    fraction: [0.3, 0.3],
    sigmaFlux: 0.0003,
    sigmaRv: 0.7,
    nRv: 14,
  },
  {
    id: 'd',
    kind: 'eclipsing',
    draw: 0,
    truth: {
      M1: 2.6,
      M2: 2.0,
      R1: 2.089,
      R2: 1.633,
      T1: 10830,
      T2: 9330,
      J: 0.726,
      P: 5.1,
      e: 0,
      w: 90,
      inc: 88.6,
      tc: 0.6,
    },
    fraction: [0.35, 0.15],
    sigmaFlux: 0.0003,
    sigmaRv: 0.9,
    nRv: 14,
  },
  {
    id: 'q',
    kind: 'sb2',
    draw: 0,
    truth: {
      M1: 1.2,
      M2: 0.9,
      R1: 1.182,
      R2: 0.909,
      T1: 6540,
      T2: 5480,
      J: 0.571,
      P: 8.3,
      e: 0.1,
      w: 120,
      inc: 52,
      tc: 1.1,
    },
    fraction: [0.4, 0.4],
    sigmaFlux: 0.0003,
    sigmaRv: 0.7,
    nRv: 16,
  },
  {
    id: 'u',
    kind: 'sb1',
    draw: 0,
    truth: {
      M1: 1.0,
      M2: 0.45,
      R1: 0.95,
      R2: 0.45,
      T1: 5700,
      T2: 3500,
      J: 0.1,
      P: 12.4,
      e: 0.3,
      w: 200,
      inc: 70,
      tc: 0.7,
    },
    fraction: [0.4, 0.4],
    sigmaFlux: 0.0003,
    sigmaRv: 0.6,
    nRv: 16,
  },
]);

export const SYSTEM_COUNT = SYSTEMS.length;
/** The systems that eclipse, in the order a student solves them. */
export const ECLIPSING = SYSTEMS.filter(s => s.kind === 'eclipsing');
const idx = (v, n = SYSTEMS.length) =>
  Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));

/** The truth of a system as the forward models take it. */
export function truthOf(i) {
  const s = SYSTEMS[idx(i)];
  const el = elementsOf(s.truth);
  return {
    system: s,
    elements: el,
    params: {
      tc: s.truth.tc,
      P: s.truth.P,
      rsum: el.rsum,
      k: el.k,
      inc: s.truth.inc,
      J: s.truth.J,
      ecosw: el.ecosw,
      esinw: el.esinw,
      ...LD,
      thirdLight: 0,
      K1: el.K1,
      K2: el.K2,
      annuli: 64,
    },
  };
}

const CADENCE = 1 / 24;

/** The synthetic rows of a system (a fixed seed per system and per number of lined stars). */
export function dataOfSystem(i, singleLined = false) {
  const t = truthOf(i);
  const s = t.system;
  const t0 = s.truth.tc - 0.15 * s.truth.P;
  const span = 3 * s.truth.P;
  const n = Math.round(span / CADENCE);
  return syntheticSb2({
    seed: `binary-masses-218-lesson-${s.id}-${s.draw}`,
    truth: t.params,
    fluxTimes:
      s.kind === 'eclipsing'
        ? Float64Array.from({ length: n }, (_, j) => t0 + j * CADENCE)
        : null,
    sigmaFlux: s.sigmaFlux,
    span: [t0, t0 + span],
    nRv: s.nRv,
    sigmaRv: s.sigmaRv,
    gamma: 12,
    singleLined: singleLined || s.kind === 'sb1',
  });
}

/** The inference request for a system. */
export function requestOfSystem(i, singleLined = false) {
  const s = SYSTEMS[idx(i)];
  const P = s.truth.P;
  const model = s.kind === 'eclipsing' ? 'eclipsing-sb2' : 'sb2-orbit';
  return {
    model: { id: model, version: '1.0.0' },
    parameters: {
      tc: {
        mode: 'fitted',
        lo: s.truth.tc - 0.1 * P,
        hi: s.truth.tc + 0.1 * P,
      },
      P: { mode: 'fitted', lo: P * 0.985, hi: P * 1.015 },
    },
    settings: {
      ...(model === 'eclipsing-sb2' ? { ...LD, thirdLight: 0 } : {}),
      // A single-lined orbit has no mass to state: the companion's minimum is for this primary.
      ...(singleLined || s.kind === 'sb1' ? { assumedM1: s.truth.M1 } : {}),
    },
    algorithm: {},
  };
}

/** The standard deviation a fit states: scaled when the fit says its error bars were too small. */
export const sigmaOf = q => (q ? (q.sigmaScaled ?? q.sigma) : NaN);

const fits = new Map();

/** The fit of a system, the core's own result, with its refusal if it refused. */
export function fitOfSystem(i, singleLined = false) {
  const s = SYSTEMS[idx(i)];
  const key = `${s.id}:${singleLined ? 1 : 2}`;
  if (!fits.has(key)) {
    const data = dataOfSystem(i, singleLined);
    const request = requestOfSystem(i, singleLined);
    let fit = null;
    let error = null;
    try {
      fit = fitOnce(request, data);
    } catch (e) {
      error = e.message;
    }
    fits.set(key, { data, request, fit, error });
  }
  return fits.get(key);
}

const val = (fit, name) =>
  fit?.parameters.find(q => q.name === name) ||
  fit?.derived.find(q => q.name === name);

// ---- the solution panel ---------------------------------------------------------------

/**
 * One system, solved: the fit, the data folded on its period, the model
 * curves, and every quantity the panel states.
 * @param {{system?: number, lines?: number, view?: number, truth?: number}} v
 *   lines is 2 for both stars' velocities, 1 to hide the second star's
 */
export function solveView(v) {
  const i = idx(v.system, ECLIPSING.length + 2);
  const singleLined = Math.round(v.lines ?? 2) === 1;
  const run = fitOfSystem(i, singleLined);
  const s = SYSTEMS[i];
  const f = run.fit;
  let folded = null;
  if (f) {
    const P = val(f, 'P').value;
    const tc = val(f, 'tc').value;
    const phase = x => ((((x - tc) / P) % 1) + 1) % 1;
    const roles = run.data.roles;
    const rows = r => {
      const out = [];
      for (let k = 0; k < run.data.x.length; k++)
        if (roles[run.data.groups[k]] === r) out.push(k);
      return out;
    };
    const f0 = f.linear.f0 ?? 1;
    const gamma = f.linear.gamma ?? 0;
    const grid = Float64Array.from(
      { length: 361 },
      (_, k) => tc + (P * k) / 360
    );
    const orbit = {
      tc,
      P,
      K1: val(f, 'K1').value,
      K2: val(f, 'K2').value,
      ecosw: val(f, 'ecosw')?.value ?? 0,
      esinw: val(f, 'esinw')?.value ?? 0,
    };
    const model = rvPair(grid, orbit);
    folded = {
      flux: rows('flux').map(k => ({
        phase: phase(run.data.x[k]),
        y: run.data.y[k] / f0,
      })),
      rv1: rows('rv1').map(k => ({
        phase: phase(run.data.x[k]),
        y: run.data.y[k] - gamma,
      })),
      rv2: rows('rv2').map(k => ({
        phase: phase(run.data.x[k]),
        y: run.data.y[k] - gamma,
      })),
      grid: Array.from(grid, x => phase(x)),
      model1: Array.from(model.v1),
      model2: Array.from(model.v2),
      modelFlux:
        s.kind === 'eclipsing'
          ? Array.from(
              eclipseFlux(grid, {
                ...truthOf(i).params,
                tc,
                P,
                rsum: val(f, 'rsum').value,
                k: val(f, 'k').value,
                inc: val(f, 'inc').value,
                J: val(f, 'J').value,
                ecosw: orbit.ecosw,
                esinw: orbit.esinw,
              })
            )
          : null,
    };
  }
  const open = name =>
    f?.identifiability?.derived?.[name] ||
    f?.identifiability?.parameters?.[name];
  return {
    index: i,
    system: s,
    data: run.data,
    fit: f,
    error: run.error,
    singleLined: singleLined || s.kind === 'sb1',
    folded,
    open: name =>
      open(name)?.status === 'not constrained' ? open(name) : null,
    value: name => val(f, name),
    truth: truthOf(i),
  };
}

/** Pearson-style share of a derived quantity's variance that the inclination carries, by the fit's own covariance. */
export function inclinationShare(fit, name) {
  if (!fit?.covariance) return NaN;
  const names = fit.free;
  const j = names.indexOf('inc');
  if (j < 0) return NaN;
  const at = (theta, key) => {
    const q = Object.fromEntries(fit.parameters.map(p => [p.name, p.value]));
    names.forEach((n, k) => (q[n] = theta[k]));
    const e = Math.hypot(q.ecosw || 0, q.esinw || 0);
    const p = absoluteProperties({
      K1: q.K1,
      K2: q.K2,
      P: q.P,
      e,
      inc: q.inc,
      rsum: q.rsum,
      k: q.k,
    });
    return p[key];
  };
  const theta = names.map(n => val(fit, n).value);
  const grad = theta.map((x, k) => {
    const h = 1e-6 * (Math.abs(x) || 1);
    const up = theta.slice();
    const dn = theta.slice();
    up[k] += h;
    dn[k] -= h;
    return (at(up, name) - at(dn, name)) / (2 * h);
  });
  const C = fit.covariance;
  let all = 0;
  for (let a = 0; a < grad.length; a++)
    for (let b = 0; b < grad.length; b++) all += grad[a] * C[a][b] * grad[b];
  const only = grad[j] ** 2 * C[j][j];
  return only / all;
}

// ---- the minimum-mass panel -----------------------------------------------------------

/**
 * A system seen only in its velocities: the fit, the amplitudes, the minimum
 * masses and what the masses would be at an inclination the reader chooses.
 * @param {{system?: number, inc?: number}} v - system 0 the double-lined pair
 *   that does not eclipse, 1 the single-lined orbit; inc in degrees
 */
export function minimumView(v) {
  const which = Math.round(v.system ?? 0) === 1 ? 'u' : 'q';
  const i = SYSTEMS.findIndex(s => s.id === which);
  const run = fitOfSystem(i);
  const f = run.fit;
  const inc = Math.max(10, Math.min(90, v.inc ?? 90));
  const sin = Math.sin((inc * Math.PI) / 180);
  const out = {
    index: i,
    system: SYSTEMS[i],
    data: run.data,
    fit: f,
    error: run.error,
    inc,
    sin,
  };
  if (!f) return out;
  const e = val(f, 'e').value;
  if (SYSTEMS[i].kind === 'sb2') {
    const m = minimumMasses({
      K1: val(f, 'K1').value,
      K2: val(f, 'K2').value,
      P: val(f, 'P').value,
      e,
    });
    out.minimum = m;
    out.atInc = { M1: m.m1sin3i / sin ** 3, M2: m.m2sin3i / sin ** 3 };
  } else {
    const fm = massFunction(val(f, 'K1').value, val(f, 'P').value, e);
    const M1 = SYSTEMS[i].truth.M1;
    out.massFunction = fm;
    out.assumedM1 = M1;
    out.companionMinimum = companionMinimumMass(fm, M1);
    // The companion at the reader's inclination: M2^3 sin^3 i = f (M1 + M2)^2
    out.companionAtInc = companionMinimumMass(fm / sin ** 3, M1);
  }
  return out;
}

// ---- the mass-radius and mass-luminosity panel ---------------------------------------

/** The temperature of star 2 from star 1's and the surface brightness ratio, by the Planck ratio at BAND_UM. */
export function temperatureFromJ(T1, J) {
  const x1 = HC_K / (BAND_UM * T1);
  return HC_K / (BAND_UM * Math.log(1 + (Math.exp(x1) - 1) / J));
}

/** The MIST main-sequence band: zero age and terminal age, in log mass against log radius and log luminosity. */
export function mistBand(points = 41) {
  const lo = Math.log10(0.2);
  const hi = Math.log10(40);
  const out = {
    logM: [],
    zams: { logR: [], logL: [] },
    tams: { logR: [], logL: [] },
  };
  for (let k = 0; k < points; k++) {
    const m = 10 ** (lo + ((hi - lo) * k) / (points - 1));
    const a = mainSequenceAt(m, 0);
    const b = mainSequenceAt(m, 1);
    if (!a || !b) continue;
    out.logM.push(Math.log10(m));
    out.zams.logR.push(Math.log10(a.radiusSun));
    out.zams.logL.push(Math.log10(a.luminositySun));
    out.tams.logR.push(Math.log10(b.radiusSun));
    out.tams.logL.push(Math.log10(b.luminositySun));
  }
  return out;
}

/** The luminosity of a star from its radius and temperature, solar units, with the delta-method sigma. */
export function luminosity(R, sR, T, sT) {
  const L = R * R * (T / TEFF_SUN) ** 4;
  const rel = Math.hypot((2 * sR) / R, (4 * sT) / T);
  return { L, sigma: L * rel };
}

/**
 * The solved systems' stars with their luminosities. Star 1's temperature is
 * an input from the card (SIGMA_T1 stated), star 2's follows from the fitted
 * surface brightness ratio.
 */
export function solvedStars(values) {
  const stars = [];
  for (const s of ECLIPSING) {
    const g =
      values?.[s.id] ??
      SOLVED[s.id] ??
      compact(fitOfSystem(SYSTEMS.indexOf(s)).fit);
    if (!g) continue;
    const T1 = s.truth.T1;
    const T2 = temperatureFromJ(T1, g.J);
    const dT =
      Math.abs(
        temperatureFromJ(T1, g.J + 1e-5) - temperatureFromJ(T1, g.J - 1e-5)
      ) / 2e-5;
    const sT2 = Math.hypot(dT * g.sJ, SIGMA_T1 * (T2 / T1));
    stars.push({
      id: s.id,
      star: 1,
      M: g.M1,
      sM: g.sM1,
      R: g.R1,
      sR: g.sR1,
      T: T1,
      sT: SIGMA_T1,
      ...luminosity(g.R1, g.sR1, T1, SIGMA_T1),
    });
    stars.push({
      id: s.id,
      star: 2,
      M: g.M2,
      sM: g.sM2,
      R: g.R2,
      sR: g.sR2,
      T: T2,
      sT: sT2,
      ...luminosity(g.R2, g.sR2, T2, sT2),
    });
  }
  return stars;
}

/** The numbers the diagram needs of a joint fit, as the table SOLVED holds them. */
export function compact(fit) {
  if (!fit) return null;
  const q = Object.fromEntries(
    [...fit.parameters, ...fit.derived].map(p => [p.name, p])
  );
  return {
    M1: q.M1.value,
    sM1: sigmaOf(q.M1),
    M2: q.M2.value,
    sM2: sigmaOf(q.M2),
    R1: q.R1.value,
    sR1: sigmaOf(q.R1),
    R2: q.R2.value,
    sR2: sigmaOf(q.R2),
    J: q.J.value,
    sJ: sigmaOf(q.J),
  };
}

/**
 * Whether a solved star sits inside the MIST band at its mass: radius between
 * the zero-age and terminal-age values (the band the tracks draw).
 */
export function insideBand(mass, radius) {
  const a = mainSequenceAt(mass, 0);
  const b = mainSequenceAt(mass, 1);
  if (!a || !b) return null;
  return radius >= a.radiusSun * 0.97 && radius <= b.radiusSun * 1.03;
}

/** Precomputed solutions of the eclipsing systems (checked against a fresh fit by tests/binaryMassesLessons.test.js). */
export const SOLVED = Object.freeze({
  a: {
    M1: 1.302551752,
    sM1: 0.007594787926,
    M2: 1.103764002,
    sM2: 0.006879120562,
    R1: 1.296398216,
    sR1: 0.00251073236,
    R2: 1.035493306,
    sR2: 0.002070982971,
    J: 0.7356457314,
    sJ: 0.0004224490803,
  },
  b: {
    M1: 1.500583094,
    sM1: 0.009892108199,
    M2: 1.344208999,
    sM2: 0.009257305396,
    R1: 1.619387238,
    sR1: 0.005609388132,
    R2: 1.377302302,
    sR2: 0.005895262666,
    J: 0.8746022819,
    sJ: 0.0003970810535,
  },
  c: {
    M1: 0.6143226975,
    sM1: 0.005314681236,
    M2: 0.5323577918,
    sM2: 0.004878215382,
    R1: 0.6155961542,
    sR1: 0.006690736843,
    R2: 0.5393925104,
    sR2: 0.008424802989,
    J: 0.6938350618,
    sJ: 0.000834658286,
  },
  d: {
    M1: 2.578655653,
    sM1: 0.01796713364,
    M2: 2.005789452,
    sM2: 0.01547273648,
    R1: 2.086112445,
    sR1: 0.004892413,
    R2: 1.629910345,
    sR2: 0.004098661041,
    J: 0.726299124,
    sJ: 0.0005246501447,
  },
});

/** The diagram's view: a number of solved systems and the quantity on the vertical axis. */
export function diagramView(v) {
  const count = Math.max(
    0,
    Math.min(ECLIPSING.length, Math.round(v.systems ?? 1))
  );
  const stars = solvedStars().filter(st =>
    ECLIPSING.slice(0, count).some(s => s.id === st.id)
  );
  return {
    count,
    luminosity: Math.round(v.view ?? 0) === 1,
    band: mistBand(),
    stars,
  };
}
