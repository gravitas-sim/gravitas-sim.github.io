// =============================================================================
// Synthetic belts and populations, with their truth manifests (Prompt 198)
// -----------------------------------------------------------------------------
// Everything here is SYNTHETIC and says so: a catalog drawn from a stated smooth
// density with stated gaps injected, so that the depletion the kernel measures can
// be compared with the depletion that was put in; populations whose class is known
// by construction; a survey that finds objects by a magnitude limit. Every draw is
// from a named stream of js/random/streams.js; the manifest carries the seed.
// =============================================================================

import { stream, gaussian } from '../../random/streams.js';
import { ORBIT_CLASSES } from './belts.js';
import { detectionLimitH } from './selection.js';

const { Math, Float64Array } = globalThis;

/** The smooth density a synthetic belt is drawn from (an unnormalised mixture of two Gaussians). */
export const SYNTHETIC_DENSITY = Object.freeze({
  components: Object.freeze([
    Object.freeze({ weight: 0.4, mean: 2.4, sigma: 0.2 }),
    Object.freeze({ weight: 0.6, mean: 2.95, sigma: 0.3 }),
  ]),
  rangeAu: Object.freeze([1.9, 3.6]),
});

const pdf = a =>
  SYNTHETIC_DENSITY.components.reduce(
    (s, c) =>
      s +
      (c.weight / (c.sigma * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((a - c.mean) / c.sigma) ** 2),
    0
  );

/** A sharp outer edge: 1 below 3.20 AU, falling by a factor of 20 to 3.30 AU, 0.05 above. */
export const cliffFactor = a =>
  a <= 3.2 ? 1 : a >= 3.3 ? 0.05 : Math.exp((-Math.log(20) * (a - 3.2)) / 0.1);

/** The V-shaped thinning of one gap at a: dmax (1 - |a - centre| / half-width), 0 outside. */
const thinning = (gaps, a) => {
  let d = 0;
  for (const g of gaps)
    d += g.dmax * Math.max(0, 1 - Math.abs(a - g.centerAu) / g.halfWidthAu);
  return d;
};

const simpson = (f, lo, hi, N = 4001) => {
  const h = (hi - lo) / (N - 1);
  let s = 0;
  for (let k = 0; k < N; k++)
    s += (k === 0 || k === N - 1 ? 1 : k % 2 ? 4 : 2) * f(lo + k * h);
  return (s * h) / 3;
};

/**
 * The depletion of a window that the injection puts in: one minus the injected
 * density over the density without the injection, integrated over the window.
 */
export function truthDepletion(gap, { gaps, cliff = false } = {}) {
  const g = cliff ? cliffFactor : () => 1;
  const lo = gap.centerAu - gap.halfWidthAu;
  const hi = gap.centerAu + gap.halfWidthAu;
  const base = simpson(a => pdf(a) * g(a), lo, hi);
  const kept = simpson(a => pdf(a) * g(a) * (1 - thinning(gaps, a)), lo, hi);
  return 1 - kept / base;
}

/**
 * A synthetic belt: n0 candidates from the smooth density, each kept with
 * probability 1 - thinning (injected gaps, V-shaped, half-width the window's).
 * e and i are truncated normals and carry no structure.
 * @param {{n0: number, seed: string|number, label?: string, gaps?: Array<{id, centerAu,
 *   halfWidthAu, dmax}>, cliff?: boolean}} args
 */
export function syntheticBelt({
  n0,
  seed,
  label = 'belt',
  gaps = [],
  cliff = false,
}) {
  const u = stream('noise', seed, label);
  const gs = gaussian(stream('noise', seed, label, 'normal'));
  const [lo, hi] = SYNTHETIC_DENSITY.rangeAu;
  const a = [];
  const e = [];
  const inc = [];
  const comps = SYNTHETIC_DENSITY.components;
  for (let k = 0; k < n0; k++) {
    let x;
    do {
      const c = u() < comps[0].weight ? comps[0] : comps[1];
      x = c.mean + c.sigma * gs();
    } while (x < lo || x >= hi || (cliff && u() > cliffFactor(x)));
    if (gaps.length && u() < thinning(gaps, x)) continue;
    let ecc;
    do ecc = 0.15 + 0.08 * gs();
    while (ecc < 0 || ecc > 0.4);
    let ii;
    do ii = Math.abs(8 * gs());
    while (ii > 30);
    a.push(x);
    e.push(ecc);
    inc.push(ii);
  }
  return {
    a: Float64Array.from(a),
    e: Float64Array.from(e),
    i: Float64Array.from(inc),
    truth: {
      synthetic: true,
      label: 'synthetic belt: not a catalog',
      seed,
      stream: label,
      n0,
      n: a.length,
      density: SYNTHETIC_DENSITY,
      cliff,
      gaps: gaps.map(g => ({
        ...g,
        truthDepletion: truthDepletion(g, { gaps, cliff }),
      })),
    },
  };
}

/**
 * Populations of known class: `counts` (class id to number) members each drawn
 * uniformly inside the class's box (shrunk by a thousandth of its width from each
 * edge, a plutino or twotino anywhere in its window with e in [0.05, 0.3]), plus
 * `other` orbits outside every box.
 */
export function syntheticPopulations({
  counts,
  other = 0,
  seed,
  label = 'populations',
}) {
  const u = stream('noise', seed, label);
  const rows = [];
  const members = [];
  const inside = (r, k, lo2, hi2) => lo2 + (hi2 - lo2) * (0.001 + 0.998 * r());
  for (const c of ORBIT_CLASSES) {
    for (let k = 0; k < (counts[c.id] ?? 0); k++) {
      const isRes = c.id === 'plutino' || c.id === 'twotino';
      rows.push({
        a: inside(u, k, c.a[0], c.a[1]),
        e: isRes ? 0.05 + 0.25 * u() : inside(u, k, c.e[0], c.e[1]),
        i: isRes ? 40 * u() : inside(u, k, c.i[0], c.i[1]),
      });
      members.push(c.id);
    }
  }
  for (let k = 0; k < other; k++) {
    rows.push({ a: 3.3 + 0.3 * u(), e: 0.1, i: 5 });
    members.push('other');
  }
  const total = {};
  for (const id of members) total[id] = (total[id] ?? 0) + 1;
  return {
    rows,
    truth: {
      synthetic: true,
      label: 'synthetic populations: not a catalog',
      seed,
      stream: label,
      members,
      counts: total,
    },
  };
}

/**
 * A magnitude-limited survey of a population uniform in a over `range`: H drawn
 * from N(<H) = 10^(alpha (H - hMax)) up to hMax, an object found when H is at most
 * the survey's reach at its distance. `found` is a mask over `a`.
 */
export function syntheticSurvey({
  n,
  seed,
  label = 'survey',
  range = [2.0, 3.5],
  alpha = 0.5,
  vLim = 21,
  hMax = 22,
}) {
  const u = stream('noise', seed, label);
  const a = new Float64Array(n);
  const H = new Float64Array(n);
  const found = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    a[k] = range[0] + (range[1] - range[0]) * u();
    H[k] = hMax + Math.log10(Math.max(u(), 1e-300)) / alpha;
    found[k] = H[k] <= detectionLimitH(a[k], vLim) ? 1 : 0;
  }
  return {
    a,
    H,
    found,
    truth: {
      synthetic: true,
      label: 'synthetic survey: not a discovery history',
      seed,
      stream: label,
      n,
      range,
      alpha,
      vLim,
      hMax,
    },
  };
}
