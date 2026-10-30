// =============================================================================
// Candidates: a planet, and the blends that look like one (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// Light curves of a transit candidate at P = 3.2 d, made by the forward models
// the rest of the app uses, with white noise and a truth that says what made them:
//
//   planet             js/inference/transit.js, a limb-darkened sphere (k = 0.1)
//   blend-alternating  a diluted eclipsing binary (js/inference/binaries.js, Prompt
//                      217) at twice the candidate period: the odd candidate transits
//                      are its primary eclipses and the even its secondaries, seen
//                      through `thirdLight` = 0.98 of the target's constant light
//   blend-twin         the same binary with two equal stars: every candidate transit
//                      the same depth, so the odd-even and secondary tests pass by
//                      construction; only the centroid test or a velocity decides
//   eb-secondary       the binary at its true period 3.2 d, a secondary at phase 0.5
//
// Every curve is synthetic. Pure: no DOM; the noise is seeded.
// =============================================================================

import { eclipseFlux, contacts } from '../../inference/binaries.js';
import { gaussian } from '../../inference/synthetic.js';
import { limbDarkening, transitFlux, halfDuration } from '../../inference/transit.js';
import { SHAPE } from './frames.js';
import { boxDepth } from './depth.js';

const { Math, Float64Array, Map } = globalThis;

export const CANDIDATE = Object.freeze({
  P: 3.2,
  t0: 0.5,
  cadence: 3 / 1440,
  span: 30,
  sigmaWell: 0.0004,
  sigmaLow: 0.032,
});

export const BINARY = Object.freeze({
  rsum: 0.06,
  k: 0.9,
  inc: 90,
  J: 0.5,
  ecosw: 0,
  esinw: 0,
  ldA: [0.4, 0.22],
  ldB: [0.5, 0.18],
  thirdLight: 0.98,
  annuli: 64,
});

/** The time grid of a candidate. */
export function candidateTimes(o = {}) {
  const dt = o.cadence ?? CANDIDATE.cadence;
  const n = Math.floor((o.span ?? CANDIDATE.span) / dt);
  return Float64Array.from({ length: n }, (_, i) => i * dt);
}

const cache = new Map();

/**
 * The noise-free curve of a candidate kind and its ephemeris.
 * @param {'planet'|'blend-alternating'|'blend-twin'|'eb-secondary'} kind
 * @param {{thirdLight?: number, binary?: object, eps?: number,
 *   times?: ArrayLike<number>}} [o] - `eps` scales odd depths by 1 + eps and
 *   even by 1 - eps (a planet's, to test the odd-even difference)
 */
export function cleanCandidate(kind, o = {}) {
  const key = JSON.stringify([kind, o.thirdLight, o.binary, o.eps, o.cadence, o.span]);
  if (!o.times && cache.has(key)) return cache.get(key);
  const times = o.times ?? candidateTimes(o);
  const { P, t0 } = CANDIDATE;
  let flux;
  let duration;
  let truth;
  if (kind === 'planet') {
    const { u1, u2 } = limbDarkening(SHAPE.q1, SHAPE.q2);
    const p = { t0, P, ...SHAPE, u1, u2 };
    flux = transitFlux(times, p, { annuli: 96 });
    duration = 2 * halfDuration(p);
    const eps = o.eps ?? 0;
    if (eps !== 0)
      for (let i = 0; i < flux.length; i++) {
        const n = Math.round((times[i] - t0) / P);
        flux[i] = 1 - (1 - flux[i]) * (1 + (Math.abs(n) % 2 === 1 ? eps : -eps));
      }
    truth = { kind, ...SHAPE, eps };
  } else {
    const b = { ...BINARY, ...(o.binary ?? {}) };
    if (o.thirdLight !== undefined) b.thirdLight = o.thirdLight;
    if (kind === 'blend-twin') Object.assign(b, { k: 1, J: 1 });
    const trueP = kind === 'eb-secondary' ? P : 2 * P;
    // Odd candidate transits are the primary eclipses of the doubled-period binary.
    const tc = kind === 'eb-secondary' ? t0 : t0 + P;
    const p = { ...b, P: trueP, tc };
    flux = eclipseFlux(times, p);
    duration = contacts(p, 'primary').duration;
    truth = { kind, binary: p, trueP };
  }
  const out = { t: times, flux, ephemeris: { P, t0, duration }, truth };
  if (!o.times) cache.set(key, out);
  return out;
}

/**
 * A candidate with white noise.
 * @param {object} o - `kind`, `seed`, `sigma` (per point; default the well-powered value),
 *   and cleanCandidate's options
 * @returns {{t: Float64Array, y: Float64Array, dy: Float64Array, ephemeris: object, truth: object}}
 */
export function candidate(o) {
  const c = cleanCandidate(o.kind ?? 'planet', o);
  const sigma = o.sigma ?? CANDIDATE.sigmaWell;
  const draw = gaussian(o.seed ?? 'vetting-candidate');
  const y = new Float64Array(c.flux.length);
  for (let i = 0; i < y.length; i++) y[i] = c.flux[i] + sigma * draw();
  return {
    t: c.t,
    y,
    dy: new Float64Array(y.length).fill(sigma),
    ephemeris: c.ephemeris,
    truth: { ...c.truth, sigma },
    synthetic: true,
  };
}

/** The box depth of a noise-free curve: what an unbiased estimator of the series should give. */
export function truthDepth(clean, options = {}) {
  const dy = new Float64Array(clean.t.length).fill(1e-4);
  return boxDepth({ t: clean.t, y: clean.flux, dy }, clean.ephemeris, options);
}
