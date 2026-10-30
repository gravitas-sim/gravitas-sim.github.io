// =============================================================================
// Synthetic clusters, with their truth
// -----------------------------------------------------------------------------
// Stars drawn the way the fit's model says they are made, plus what it does
// not know: a selection in magnitude, optional binaries, and a share of field
// stars. Every dataset carries its truth manifest (origin 'synthetic'). The
// draws come from js/random/streams.js's `forward` stream keyed by the seed,
// so a seed gives the same cluster on every engine.
// =============================================================================

const { Math, Float64Array, Uint8Array } = globalThis;
import { stream, gaussian } from '../../random/streams.js';
import { ERROR_MODEL, EXTINCTION_RATIO, WINDOW } from './constants.js';
import { sigmaAt } from './hess.js';
import { isochroneAt, mainSequenceOf, pieces } from './isochrones.js';

/** The field's density in g (proportional to 10^(0.3 g)) and colour (a mixture of two Gaussians). */
export const FIELD = Object.freeze({
  slope: 0.3,
  colour: [
    { weight: 0.6, mean: 0.55, sd: 0.15 },
    { weight: 0.4, mean: 1.2, sd: 0.2 },
  ],
});

/** The selection the model does not know: a logistic in the noisy g. */
export const SELECTION = Object.freeze({ g50: 19.0, width: 0.5 });
export const keepProbability = (g, s = SELECTION) =>
  s ? 1 / (1 + Math.exp((g - s.g50) / s.width)) : 1;

const fluxSum = (a, b) => -2.5 * Math.log10(10 ** (-0.4 * a) + 10 ** (-0.4 * b));

/**
 * @param {object} set - parseIsochrones
 * @param {{logAge: number, dm: number, feh: number, E: number, N: number,
 *   epsTrue?: number, fb?: number, R?: number, selection?: object|null,
 *   noise?: boolean, errorModel?: object, binaryQ?: [number, number]}} spec
 * @param {number|string} seed
 * @returns {{g: Float64Array, r: Float64Array, colour: Float64Array,
 *   member: Uint8Array, mass: Float64Array, truth: object}}
 */
export function drawCluster(set, spec, seed, ...labels) {
  const R = spec.R ?? EXTINCTION_RATIO;
  const eps = spec.epsTrue ?? 0.15;
  const fb = spec.fb ?? 0;
  const sel = spec.selection === undefined ? SELECTION : spec.selection;
  const em = spec.errorModel ?? ERROR_MODEL;
  const noise = spec.noise !== false;
  const [qlo, qhi] = spec.binaryQ ?? [0.3, 1];
  const draw = stream('forward', seed, 'cluster', ...labels);
  const normal = gaussian(stream('forward', seed, 'cluster', ...labels, 'normal'));
  const iso = eps < 1 ? isochroneAt(set, spec.feh, spec.logAge) : null;
  const pcs = iso ? pieces(iso, 0.01) : null;
  const ms = iso ? mainSequenceOf(iso) : null;
  const cum = pcs ? new Float64Array(pcs.w.length) : null;
  if (pcs) {
    let s = 0;
    for (let i = 0; i < pcs.w.length; i++) cum[i] = s += pcs.w[i];
  }
  const [g0, g1] = WINDOW.g;
  const [c0, c1] = WINDOW.colour;
  const A = 10 ** (FIELD.slope * g0);
  const B = 10 ** (FIELD.slope * g1);
  const out = { g: [], r: [], colour: [], member: [], mass: [] };
  let tries = 0;
  while (out.g.length < spec.N) {
    if (++tries > 2000 * spec.N) throw new Error('the selection keeps no stars');
    const isField = draw() < eps;
    let gApp;
    let rApp;
    let mass = NaN;
    if (isField) {
      gApp = Math.log10(A + draw() * (B - A)) / FIELD.slope;
      const u = draw();
      const comp = u < FIELD.colour[0].weight ? FIELD.colour[0] : FIELD.colour[1];
      const c = comp.mean + comp.sd * normal();
      rApp = gApp - c;
    } else {
      const x = draw() * cum.at(-1);
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < x) lo = mid + 1;
        else hi = mid;
      }
      let g = pcs.g[lo];
      let r = g - pcs.c[lo];
      mass = pcs.m[lo];
      if (fb > 0 && draw() < fb) {
        const q = qlo + (qhi - qlo) * draw();
        const sec = ms(q * mass);
        if (sec) {
          g = fluxSum(g, sec.g);
          r = fluxSum(r, sec.r);
        }
      }
      gApp = g + spec.dm + R * spec.E;
      rApp = r + spec.dm + (R - 1) * spec.E; // A_r = A_g - E(g - r)
    }
    let gObs = gApp;
    let rObs = rApp;
    if (noise) {
      gObs += sigmaAt(gApp, em) * normal();
      rObs += sigmaAt(rApp, em) * normal();
    }
    const cObs = gObs - rObs;
    if (gObs < g0 || gObs >= g1 || cObs < c0 || cObs >= c1) continue;
    if (draw() >= keepProbability(gObs, sel)) continue;
    out.g.push(gObs);
    out.r.push(rObs);
    out.colour.push(cObs);
    out.member.push(isField ? 0 : 1);
    out.mass.push(mass);
  }
  return {
    g: Float64Array.from(out.g),
    r: Float64Array.from(out.r),
    colour: Float64Array.from(out.colour),
    member: Uint8Array.from(out.member),
    mass: Float64Array.from(out.mass),
    truth: {
      origin: 'synthetic',
      logAge: spec.logAge,
      dm: spec.dm,
      feh: spec.feh,
      E: spec.E,
      R,
      N: spec.N,
      epsTrue: eps,
      fb,
      selection: sel,
      seed: String(seed),
      labels: labels.map(String),
      members: out.member.reduce((a, b) => a + b, 0),
    },
  };
}
