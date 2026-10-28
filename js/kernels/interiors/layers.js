// The layer and rotation pack (Prompt 203): the typed in-situ layer means,
// published core radii, moment-of-inertia factors, radii and rotation periods
// the gate tested, and the body-level calls with their refusals. A lazy module
// (NEVER_PRECACHED).
//
// PROVENANCE, stated plainly: every number is typed from the cited publications
// and was NOT checked against them: nothing was downloaded, no retrieval date
// exists and `checked` stays false (tests/fixtures/interiors-gate/sources.json
// holds the same values; a test keeps them equal). The layer means are derived
// from the same reference models that give the published core radii, so a
// recovered core radius is a closure test, not an independent one
// (INTERIORS_GATE.md, "Authentic-data applicability").
import { refuse } from './constants.js';
import { twoLayerInvert } from './twoLayer.js';
import { rotationParameter, darwinRadauFlattening } from './radau.js';
import { G, G_SIGMA } from './constants.js';

const { Math } = globalThis;

export const LAYER_PROVENANCE = Object.freeze({
  retrieved: null,
  checked: false,
  note: 'typed from IAU WGCCRE (Archinal et al. 2018), JPL GM values, PREM (Dziewonski and Anderson 1981), InSight (Staehler et al. 2021), Konopliv et al. 2016 and Juno-era models; not re-read against them',
});

/** gm km^3/s^2, radii km, period s; rho kg/m^3; moment: published C / (M a^2). */
export const INTERIOR_BODIES = Object.freeze({
  earth: {
    name: 'Earth',
    gm: [398600.4418, 0.0008],
    equatorialRadius: [6378.137, 0.001],
    polarRadius: [6356.752, 0.001],
    period: 86164.0905,
    moment: [0.3307, 0.0001],
    layers: {
      rhoMantle: [4455, 100],
      rhoCore: [10950, 300],
      coreRadiusKm: [3480, 1],
    },
  },
  mars: {
    name: 'Mars',
    gm: [42828.375, 0.01],
    equatorialRadius: [3396.19, 0.1],
    polarRadius: [3376.2, 0.1],
    period: 88642.66,
    moment: [0.364, 0.001],
    layers: {
      rhoMantle: [3550, 50],
      rhoCore: [6000, 300],
      coreRadiusKm: [1830, 40],
    },
  },
  jupiter: {
    name: 'Jupiter',
    gm: [126686534, 100],
    equatorialRadius: [71492, 4],
    polarRadius: [66854, 10],
    period: 35729.711,
    moment: [0.264, 0.001],
  },
  saturn: {
    name: 'Saturn',
    gm: [37931207.8, 1],
    equatorialRadius: [60268, 4],
    polarRadius: [54364, 10],
    period: 38018,
    moment: [0.221, 0.002],
  },
});

/** The volumetric mean radius (a^2 b)^(1/3) and its first-order uncertainty, km. */
export function volumetricMean([a, sa], [b, sb]) {
  const v = Math.cbrt(a * a * b);
  return [v, Math.hypot(((2 / 3) * v * sa) / a, ((1 / 3) * v * sb) / b)];
}

const WHY_NOT_HYDROSTATIC = Object.freeze({
  mercury:
    'spin-orbit resonance: the observed figure is not a rotational equilibrium',
  venus:
    'the 243-day rotation gives q of about 6e-8: the figure is not rotational',
  moon: 'tidally locked: a fossil figure',
  mars: 'the Tharsis load: the observed flattening includes a non-hydrostatic part',
});
const WHY_NOT_TESTED = Object.freeze({
  mercury:
    'differentiated, with a published moment of inertia, but not tested by the gate',
  moon: 'differentiated, with a published moment of inertia, but not tested by the gate',
  venus: 'its moment of inertia is unmeasured and there is no published core',
  jupiter: 'a gas giant: the rock and iron model does not apply',
  saturn: 'a gas giant: the rock and iron model does not apply',
  uranus: 'an ice giant: the rock and iron model does not apply',
  neptune: 'an ice giant: the rock and iron model does not apply',
});

/** The core radius of a body with a tabulated layer model (Earth, Mars), with the moment it predicts and the published one. */
export function invertBody(id) {
  const MODEL = 'two-layer constant-density interior';
  const b = INTERIOR_BODIES[id];
  if (!b || !b.layers) {
    const why = WHY_NOT_TESTED[id];
    return why
      ? refuse(MODEL, 'not-tested', `${id}: ${why}`)
      : refuse(MODEL, 'unknown-body', `no body called ${String(id)}`);
  }
  const [meanR, meanS] = volumetricMean(b.equatorialRadius, b.polarRadius);
  const mass = (b.gm[0] * 1e9) / G;
  const sM = Math.hypot(b.gm[1] / b.gm[0], G_SIGMA / G) * mass;
  const r = twoLayerInvert({
    mass,
    radius: meanR * 1e3,
    rhoMantle: b.layers.rhoMantle[0],
    rhoCore: b.layers.rhoCore[0],
    sigma: {
      mass: sM,
      radius: meanS * 1e3,
      rhoMantle: b.layers.rhoMantle[1],
      rhoCore: b.layers.rhoCore[1],
    },
  });
  if (r.refused) return r;
  return {
    ...r,
    body: id,
    publishedCoreRadiusKm: b.layers.coreRadiusKm,
    publishedMoment: b.moment,
  };
}

/** The flattening of a body from its rotation and published moment, or a refusal naming why. */
export function oblatenessOf(id) {
  const MODEL = 'Darwin-Radau relation';
  if (WHY_NOT_HYDROSTATIC[id])
    return refuse(
      MODEL,
      'non-hydrostatic',
      `${id}: ${WHY_NOT_HYDROSTATIC[id]}`
    );
  const b = INTERIOR_BODIES[id];
  if (!b)
    return refuse(
      MODEL,
      'unknown-body',
      `no hydrostatic body called ${String(id)}`
    );
  const q = rotationParameter({
    gm: b.gm[0],
    equatorialRadius: b.equatorialRadius[0],
    period: b.period,
    sigma: { gm: b.gm[1], equatorialRadius: b.equatorialRadius[1] },
  });
  const f = darwinRadauFlattening({
    q: q.q,
    momentFactor: b.moment[0],
    sigma: { q: q.sigma, momentFactor: b.moment[1] },
  });
  if (f.refused) return f;
  const a = b.equatorialRadius[0];
  const c = b.polarRadius[0];
  return {
    ...f,
    body: id,
    q: q.q,
    observedFlattening: (a - c) / a,
    relativeDifference: (f.flattening - (a - c) / a) / ((a - c) / a),
  };
}
