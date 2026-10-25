// =============================================================================
// Crater counting: diameters, size-frequency distributions, relative ages (Prompt 195)
// -----------------------------------------------------------------------------
// CRATER_COUNTING.md has the equations, the limits and the validation. Pure; no
// DOM, no clock, no network. Four things, each a closed form on top of Prompt
// 154's statistics kernel (the Garwood interval, the chi-square and beta
// functions) and Prompt 179's marks and scale:
//
//   diameterOf    a circle mark and the scale give a diameter with an uncertainty
//                 budget (scale, fit, recognition, foreshortening), component
//                 by component
//   cumulative    N(>=D) per square kilometre with exact Poisson intervals
//   relativeAge   the density ratio of two regions above one diameter, with the
//                 exact conditional-binomial (Clopper-Pearson) interval
//   powerLaw      the cumulative index above a diameter, maximum likelihood, with
//                 its exact chi-square interval and a constancy check
//
// Nothing here is an absolute age and nothing corrects for incompleteness,
// saturation, resurfacing or secondaries: they are stated inputs (a region's
// completeness limit) or refusals. A refusal is { status: 'refused', code, why }
// with a stable code; nothing is computed from what is refused.
// =============================================================================

import { poissonInterval } from '../kernels/statistics/intervals.js';
import {
  betaI,
  chi2Quantile,
  normalCdf,
} from '../kernels/statistics/special.js';
import { refused } from '../kernels/statistics/check.js';
import { lengthOf } from './scale.js';
import { PLACE_SIGMA } from './marks.js';

const { Math, Number } = globalThis;

export const DEFAULT_LEVEL = 0.95;
/** A diameter must span at least this many pixels to be a crater a person could place. */
export const MIN_PIXELS = 8;
/** The statements every relative age rests on and does not test. */
export const AGE_ASSUMES = Object.freeze([
  'the two surfaces share one production function (the same shape of the size-frequency distribution) and one terrain type',
  'neither is saturated above dMin, neither has been resurfaced in part, and secondaries are not a large share of either count',
  'both counts are complete above dMin (each region states its completeness limit, and a smaller dMin is refused)',
  'the craters are independent: a count over a small area is Poisson, a clustered one is not',
  'a larger density above the same diameter reads as a longer exposure: a density ratio, not an age in years',
]);

const finite = Number.isFinite;
const level = l => finite(l) && l > 0 && l < 1;
const LEVEL_WHY = 'the level is not between 0 and 1';
const KM_PER = Object.freeze({ km: 1, m: 1e-3 });

// ---- diameter from a circle mark ---------------------------------------------

/**
 * The factor by which the view stretches a radius: a view at emission angle E
 * compresses one image axis by cosE, so a radius at angle `theta` to that axis is
 * sqrt(cos^2(theta) / cosE^2 + sin^2(theta)) times longer on the ground.
 */
export const stretch = (theta, cosE) =>
  Math.sqrt(Math.cos(theta) ** 2 / cosE ** 2 + Math.sin(theta) ** 2);

/** The checked foreshortening { cosE, axis, sigmaCosE }, or a refusal. */
function foreshortening(f) {
  if (f === undefined || f === null) return { cosE: 1, sigmaCosE: 0 };
  const { cosE, axis, sigmaCosE = 0 } = f;
  if (!(finite(cosE) && cosE > 0 && cosE <= 1))
    return refused('foreshortening', 'cosE is not in (0, 1]');
  if (!(finite(sigmaCosE) && sigmaCosE >= 0))
    return refused('foreshortening', 'the sigma of cosE is not 0 or more');
  if (cosE < 1 && !finite(axis))
    return refused(
      'foreshortening-axis',
      'a view with cosE under 1 needs the image axis it compresses'
    );
  return { cosE, axis, sigmaCosE };
}

/** A scale (value, sigma and a unit, km/pix or m/pix) in km per pixel, or a refusal. */
function kmScale(scale) {
  if (!scale || !(scale.value > 0))
    return refused('scale', 'there is no scale: mark a reference pair first');
  const m = /^(.+)\/pix$/.exec(String(scale.unit ?? ''));
  const k = m && KM_PER[m[1]];
  if (!k)
    return refused(
      'scale-unit',
      `a scale in ${scale.unit ?? 'no unit'} is not a length per pixel: a crater diameter needs km or m per pixel (an angular scale needs a distance)`
    );
  return { value: scale.value * k, sigma: (scale.sigma ?? 0) * k };
}

/**
 * The diameter of a crater from its circle mark (a centre and a point on the rim,
 * js/measure/marks.js), in kilometres, with the budget of its relative
 * uncertainty by component and their quadrature sum.
 * @param {object} mark - { kind: 'circle', pts: [centre, rim], sigma }
 * @param {object} from - { scale, foreshortening?, recognition? }
 */
export function diameterOf(
  mark,
  { scale, foreshortening: fs, recognition = 0 } = {}
) {
  if (!mark || mark.kind !== 'circle')
    return refused('diameter', 'a crater diameter needs a circle mark');
  const r = lengthOf(mark);
  if (!(r > 0)) return refused('diameter', 'the circle has no radius');
  const s = kmScale(scale);
  if (s.status) return s;
  const f = foreshortening(fs);
  if (f.status) return f;
  if (!(finite(recognition) && recognition >= 0))
    return refused(
      'diameter',
      'the recognition is not a fraction of 0 or more'
    );
  const [c, p] = mark.pts;
  const theta = f.cosE < 1 ? Math.atan2(p[1] - c[1], p[0] - c[0]) - f.axis : 0;
  const factor = f.cosE < 1 ? stretch(theta, f.cosE) : 1;
  const sigmaR = Math.SQRT2 * (mark.sigma ?? PLACE_SIGMA);
  const budget = {
    scale: s.sigma / s.value,
    fit: sigmaR / r,
    recognition,
    foreshortening:
      f.cosE < 1
        ? (f.sigmaCosE * Math.cos(theta) ** 2) / (f.cosE ** 3 * factor ** 2)
        : 0,
  };
  const relative = Math.hypot(...Object.values(budget));
  const diameter = 2 * r * s.value * factor;
  return {
    status: 'ok',
    diameter,
    sigma: diameter * relative,
    relative,
    budget,
    factor,
    lengthUnit: 'km',
  };
}

/** The surface area of a region in km^2, stated or made from its footprint. */
export function regionArea({
  km2,
  relSigma = 0,
  pixels,
  scale,
  foreshortening: fs,
} = {}) {
  if (!(finite(relSigma) && relSigma >= 0))
    return refused('area', 'the relative sigma of the area is not 0 or more');
  if (km2 !== undefined) {
    if (!(finite(km2) && km2 > 0))
      return refused('area', 'the area is not a positive number');
    return { status: 'ok', km2, relSigma };
  }
  if (!(finite(pixels) && pixels > 0))
    return refused('area', 'the region has neither an area nor a footprint');
  const s = kmScale(scale);
  if (s.status) return s;
  const f = foreshortening(fs);
  if (f.status) return f;
  return {
    status: 'ok',
    km2: (pixels * s.value ** 2) / f.cosE,
    relSigma: Math.hypot(
      2 * (s.sigma / s.value),
      f.sigmaCosE / f.cosE,
      relSigma
    ),
  };
}

/**
 * Every circle mark of one tag, as a list of craters { id, D, sigma } (km); the
 * first mark that cannot be measured refuses the call, naming the mark.
 */
export function craterList(state, { tag = 'crater', frame, ...from } = {}) {
  const craters = [];
  let ignored = 0;
  for (const m of state.marks) {
    if (
      m.kind !== 'circle' ||
      m.tag !== tag ||
      (frame !== undefined && m.frame !== frame)
    ) {
      ignored++;
      continue;
    }
    const d = diameterOf(m, from);
    if (d.status !== 'ok') return { ...d, id: m.id };
    craters.push({ id: m.id, D: d.diameter, sigma: d.sigma });
  }
  return { status: 'ok', craters, ignored };
}

// ---- the lists -----------------------------------------------------------------

/** Diameters, with or without sigmas, as [{ D, sigma }] or a refusal. */
function listOf(craters) {
  if (!Array.isArray(craters) || craters.length < 1)
    return refused('counts', 'there are no craters in the list');
  const out = [];
  for (const c of craters) {
    const D = typeof c === 'number' ? c : c?.D;
    const sigma = typeof c === 'number' ? 0 : (c?.sigma ?? 0);
    if (!(finite(D) && D > 0) || !(finite(sigma) && sigma >= 0))
      return refused('diameter', 'a diameter is not a positive finite number');
    out.push({ D, sigma });
  }
  return out;
}

const countAtLeast = (list, t) => {
  let n = 0;
  for (const c of list) if (c.D >= t) n++;
  return n;
};

/** sqrt(2) steps upward from `from` while at or below the largest diameter. */
export function defaultThresholds(from, largest) {
  const out = [];
  for (let k = 0; from * 2 ** (k / 2) <= largest; k++)
    out.push(from * 2 ** (k / 2));
  return out;
}

/**
 * The cumulative size-frequency distribution: for each threshold the count of
 * craters at least that large, the density per km^2 and its exact Poisson
 * (Garwood) interval at `level`, a statement about counting error only. What the
 * diameters' own uncertainty does to the count at a threshold is reported apart
 * (`boundary`: the expected count and its sd) and never added to the interval.
 * @param {Array} craters - numbers, or { D, sigma } in km
 * @param {object} o - { area: number | { km2, relSigma }, thresholds?, dMin?, level? }
 */
export function cumulative(
  craters,
  { area, thresholds, dMin, level: lv = DEFAULT_LEVEL } = {}
) {
  if (!level(lv)) return refused('level', LEVEL_WHY);
  const list = listOf(craters);
  if (list.status) return list;
  const a = regionArea(typeof area === 'number' ? { km2: area } : (area ?? {}));
  if (a.status !== 'ok') return a;
  const largest = Math.max(...list.map(c => c.D));
  const from = dMin ?? Math.min(...list.map(c => c.D));
  if (!(finite(from) && from > 0))
    return refused(
      'dMin',
      'the smallest diameter counted is not a positive number'
    );
  const ts = thresholds ?? defaultThresholds(from, largest);
  if (!ts.every(t => finite(t) && t > 0))
    return refused('dMin', 'a threshold is not a positive number');
  const rows = ts.map(D => {
    const n = countAtLeast(list, D);
    const iv = poissonInterval([n], {
      exposure: a.km2,
      level: lv,
      method: 'garwood',
    });
    let expected = 0;
    let variance = 0;
    for (const c of list) {
      const p = c.sigma > 0 ? normalCdf((c.D - D) / c.sigma) : c.D >= D ? 1 : 0;
      expected += p;
      variance += p * (1 - p);
    }
    return {
      D,
      n,
      density: n / a.km2,
      lo: iv.lo,
      hi: iv.hi,
      boundary: { expected, sd: Math.sqrt(variance) },
    };
  });
  return {
    status: 'ok',
    level: lv,
    method: 'poisson-garwood',
    area: a,
    rows,
    note: 'counting error only; no correction for incompleteness, saturation or secondaries; the area has its own relative sigma',
  };
}

/** The table as comma-separated values, for the analysis tools (D, N, density, lo, hi). */
export const toCsv = sfd =>
  [
    'D_km,N,density_per_km2,lo_per_km2,hi_per_km2',
    ...sfd.rows.map(r => [r.D, r.n, r.density, r.lo, r.hi].join(',')),
  ].join('\n');

// ---- relative age ---------------------------------------------------------------

/** The x with I_x(a, b) = p, by bisection (I is increasing in x). */
function betaQuantile(p, a, b) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 300; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (betaI(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** The exact (Clopper-Pearson) interval of a binomial proportion, k of n. */
export function clopperPearson(k, n, lv = DEFAULT_LEVEL) {
  const alpha = (1 - lv) / 2;
  return {
    lo: k === 0 ? 0 : betaQuantile(alpha, k, n - k + 1),
    hi: k === n ? 1 : betaQuantile(1 - alpha, k + 1, n - k),
  };
}

/**
 * Which of two surfaces is older, as a density ratio above one diameter. Above
 * dMin the counts are na and nb in areas Aa and Ab; given their sum, na is
 * binomial with p = la Aa / (la Aa + lb Ab), whose exact interval maps to the ratio
 * R = la / lb = p / (1 - p) Ab / Aa. The verdict is 'a older', 'b older' or 'no
 * significant difference' (the interval holds 1).
 * @param {object} a - { craters, area, completeFrom?, scale? } (scale: km per pixel)
 * @param {object} b - the same
 * @param {object} o - { dMin, level?, minPixels? }
 */
export function relativeAge(
  a,
  b,
  { dMin, level: lv = DEFAULT_LEVEL, minPixels = MIN_PIXELS } = {}
) {
  if (!level(lv)) return refused('level', LEVEL_WHY);
  if (!(finite(dMin) && dMin > 0))
    return refused(
      'dMin',
      'the diameter above which to compare is not a positive number'
    );
  const regions = {};
  for (const [name, r] of [
    ['a', a],
    ['b', b],
  ]) {
    const list = listOf(r?.craters);
    if (list.status) return { ...list, why: `region ${name}: ${list.why}` };
    const ar = regionArea(
      typeof r.area === 'number' ? { km2: r.area } : (r.area ?? {})
    );
    if (ar.status !== 'ok') return { ...ar, why: `region ${name}: ${ar.why}` };
    if (finite(r.completeFrom) && dMin < r.completeFrom)
      return refused(
        'below-completeness',
        `dMin is below region ${name}'s completeness limit of ${r.completeFrom} km`
      );
    if (finite(r.scale) && dMin < minPixels * r.scale)
      return refused(
        'below-resolution',
        `dMin spans fewer than ${minPixels} pixels in region ${name}`
      );
    regions[name] = { n: countAtLeast(list, dMin), area: ar };
  }
  const { a: ra, b: rb } = regions;
  const n = ra.n + rb.n;
  const out = {
    dMin,
    level: lv,
    na: ra.n,
    nb: rb.n,
    areaA: ra.area.km2,
    areaB: rb.area.km2,
    densityA: ra.n / ra.area.km2,
    densityB: rb.n / rb.area.km2,
    areaRelSigma: { a: ra.area.relSigma, b: rb.area.relSigma },
  };
  if (n === 0)
    return {
      ...refused('not-constrained', 'neither region has a crater above dMin'),
      verdict: 'not constrained',
      ...out,
    };
  const f = rb.area.km2 / ra.area.km2;
  const ratioOf = p => (p >= 1 ? null : (p / (1 - p)) * f);
  const { lo, hi } = clopperPearson(ra.n, n, lv);
  const rLo = ratioOf(lo);
  const rHi = ratioOf(hi);
  let verdict = 'no significant difference';
  if (rLo > 1) verdict = 'a older';
  else if (rHi !== null && rHi < 1) verdict = 'b older';
  return {
    status: 'ok',
    ...out,
    method: 'clopper-pearson-conditional-binomial',
    ratio: rb.n === 0 ? null : ra.n === 0 ? 0 : (ra.n / rb.n) * f,
    lo: rLo,
    hi: rHi,
    verdict,
    assumes: AGE_ASSUMES,
    note: 'a density ratio of two surfaces above one diameter, not an age; counting error only (the areas carry their own relative sigmas)',
  };
}

// ---- the cumulative index ---------------------------------------------------------

const sumLog = (list, from) => {
  let n = 0;
  let s = 0;
  for (const c of list)
    if (c.D >= from) {
      n++;
      s += Math.log(c.D / from);
    }
  return { n, s };
};

/**
 * The cumulative index b of N(>=D) proportional to D^-b above dMin, by maximum
 * likelihood (n / S, S the sum of ln(D / dMin)), with the exact chi-square
 * interval, the unbiased (n - 1) / S beside it, and a check that the index above
 * 2 dMin agrees (a roll-off, saturation or a mixed population does not).
 */
export function powerLaw(craters, { dMin, level: lv = DEFAULT_LEVEL } = {}) {
  if (!level(lv)) return refused('level', LEVEL_WHY);
  if (!(finite(dMin) && dMin > 0))
    return refused(
      'dMin',
      'the smallest diameter of the fit is not a positive number'
    );
  const list = listOf(craters);
  if (list.status) return list;
  const { n, s } = sumLog(list, dMin);
  if (n < 5 || !(s > 0))
    return refused(
      'too-few',
      `${n} craters above dMin: at least 5 (not all at dMin) are needed`
    );
  const alpha = (1 - lv) / 2;
  const b = n / s;
  const se = b / Math.sqrt(n);
  const { n: n2, s: s2 } = sumLog(list, 2 * dMin);
  let constancy = {
    status: 'not-run',
    why: 'fewer than 5 craters above 2 dMin',
  };
  if (n2 >= 5 && s2 > 0) {
    const b2 = n2 / s2;
    const se2 = b2 / Math.sqrt(n2);
    const v = se2 * se2 - se * se;
    constancy =
      v > 0
        ? {
            status: 'ok',
            n2,
            b2,
            z: (b2 - b) / Math.sqrt(v),
            flag:
              Math.abs(b2 - b) / Math.sqrt(v) > 2 ? 'slope-not-constant' : null,
          }
        : { status: 'not-run', why: 'the two indices are not separable' };
  }
  return {
    status: 'ok',
    method: 'pareto-mle-chi2-exact',
    level: lv,
    dMin,
    n,
    index: b,
    unbiased: (n - 1) / s,
    se,
    lo: chi2Quantile(alpha, 2 * n) / (2 * s),
    hi: chi2Quantile(1 - alpha, 2 * n) / (2 * s),
    constancy,
    assumes: [
      'the craters above dMin follow one power law (the constancy check looks for a break at 2 dMin)',
      'the counts are complete above dMin; a roll-off below the completeness limit is not corrected here',
    ],
  };
}
