// =============================================================================
// Visual binaries: the photocentre contract, the mass sum and the mass fraction
// (Prompt 218 Part B, VISUAL_BINARY_GATE.md)
// -----------------------------------------------------------------------------
// Prompt 187's fitter turns relative astrometry of a pair into a Keplerian apparent
// orbit or refuses. This module says what that orbit can be made to weigh, and what
// it cannot, when both stars shine:
//
//   mass sum       (a / parallax)^3 / P^2, through 187's massSum, which needs a
//                  parallax with its uncertainty and its frame statement (a literature
//                  value is a parallax with a citation); refused without them
//   mass fraction  B = M2 / (M1 + M2) from the two components' own offsets about the
//                  moving barycentre: star 1 at c + mu (t - t0) - B r(t), star 2 at
//                  c + mu (t - t0) + (1 - B) r(t), r the relative orbit; B is the weighted
//                  regression of the offsets on the fitted r(t) (a constant offset and a
//                  proper motion are fitted with it)
//   photocentre    an orbit of the LIGHT-WEIGHTED CENTRE of an unresolved pair is the
//                  relative ellipse scaled by (l - B), l the secondary's fraction of the
//                  light in the band: its amplitude is |B - l| a. With a parallax it gives
//                  the photocentre mass function (M1 + M2) |B - l|^3, NOT a mass. A mass of
//                  the companion needs a stated light fraction and a stated primary mass,
//                  and the equation has two roots when f < M1 l^3 (the half turn of the
//                  photocentre is the node ambiguity): both are returned, the second flagged
//
// Pure: no DOM, no clock, no network. Positions in arcseconds (x north, y east), epochs
// in Julian years. Star 1 is the primary; the relative orbit is star 2 minus star 1 and
// B is the mass fraction of star 2.
// =============================================================================

import {
  FRAME_STATEMENT,
  KEPLER_K,
  LEVELS,
  epochYear,
  fitOrbit,
  massSum,
  predict,
} from './orbit-fit.js';
import { invertSpd } from '../numeric/linalg.js';
import { stream, gaussian } from '../random/streams.js';

const { Math, Number } = globalThis;
const finite = Number.isFinite;

export const VERSION = 1;
export const STEP = 'visual-binary';

/** Rules the module keeps (tests hold them equal to tests/fixtures/visual-binary/thresholds.json where the file states them). */
export const RULES = Object.freeze({
  /** a photocentre orbit's semi-major axis must exceed this many of its own standard deviations */
  amplitudeSnr: 5,
  draws: 20000,
});
const Z = Object.freeze({ 0.6827: 1, 0.95: 1.959963984540054 });

/** The words of the contract, in one place for the panel, the model page and the tests. */
export const CONTRACT = Object.freeze({
  photocentre:
    'the photocentre of a pair is (l − B) times the relative vector from the barycentre, l the secondary’s fraction of the light in the band and B its fraction of the mass: the relative ellipse scaled by (l − B)',
  massFunction:
    'with a parallax the photocentre orbit gives (M1 + M2) |B − l|³, a mass function and not a mass',
  roots:
    'the companion’s mass needs a stated light fraction and a stated primary mass; the equation has a second root when the companion would be lighter than its share of the light, and the orbit alone does not choose',
  convention:
    'star 1 is the primary, the relative orbit is star 2 minus star 1, B is the mass fraction of star 2; exchanging the labels turns B into 1 − B',
  frame: FRAME_STATEMENT,
});

/** A refusal: the code and English message are the module's; `data` is what a page needs to say it in another language. */
const refuse = (code, message, data = {}) => ({
  ok: false,
  status: 'not-constrained',
  code,
  message,
  data,
});

// ---- the contract's arithmetic ----------------------------------------------------

/** The signed photocentre factor: the photocentre is this times the relative vector from the barycentre. */
export const photocentreFactor = (B, l) => l - B;

/** The photocentre's semi-major axis for a relative semi-major axis a. */
export const photocentreAxis = (a, B, l) => Math.abs(l - B) * a;

/** The photocentre offsets for relative offsets `rel` ({x, y}[]) of a pair with mass fraction B and light fraction l. */
export const photocentreOffsets = (rel, B, l) =>
  rel.map(p => ({ x: (l - B) * p.x, y: (l - B) * p.y }));

/** The plug-in sum (a / parallax)^3 / P^2 in solar masses: a and the parallax in arcseconds, P in Julian years. */
export const plugInSum = (aArcsec, periodYears, parallaxArcsec) =>
  (KEPLER_K * aArcsec ** 3) / (parallaxArcsec ** 3 * periodYears ** 2);

/** The photocentre mass function (M1 + M2) |B − l|³ from the two masses and the light fraction. */
export const photocentreFunction = (m1, m2, l) =>
  (m1 + m2) * Math.abs(m2 / (m1 + m2) - l) ** 3;

/**
 * The mass fractions B that give a photocentre mass function f for a primary of mass m1 and a
 * light fraction l: M1 (B − l)³ / (1 − B) = f above l (always one root) and
 * M1 (l − B)³ / (1 − B) = f below l (one root when f < M1 l³). Each root with its companion mass.
 */
export function companionRoots(f, m1, l) {
  if (!(f > 0) || !(m1 > 0) || !(l >= 0) || !(l < 1)) return [];
  const bisect = (g, lo, hi, increasing) => {
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) > 0 === increasing) hi = mid;
      else lo = mid;
      if (hi - lo < 1e-15) break;
    }
    return 0.5 * (lo + hi);
  };
  const out = [];
  const up = B => (m1 * (B - l) ** 3) / (1 - B) - f;
  const Bu = bisect(up, l, 1 - 1e-15, true);
  out.push({ side: 'above', B: Bu, M2: (Bu * m1) / (1 - Bu) });
  if (l > 0 && f < m1 * l ** 3) {
    const down = B => (m1 * (l - B) ** 3) / (1 - B) - f;
    // decreasing from m1 l^3 at B = 0 to 0 at B = l
    const Bd = bisect(down, 0, l, false);
    out.push({ side: 'below', B: Bd, M2: (Bd * m1) / (1 - Bd) });
  }
  return out;
}

// ---- the series ---------------------------------------------------------------------

/** Relative series from a components series; a refusal when a component or a sigma is missing. */
function relativeOf(epochs) {
  const out = [];
  for (const [i, e] of epochs.entries()) {
    const a = e?.A;
    const b = e?.B;
    if (![a?.x, a?.y, b?.x, b?.y].every(finite))
      return refuse('series', `epoch ${i + 1} lacks a position of a component`, {
        index: i,
      });
    if (!(a.sigma > 0) || !(b.sigma > 0))
      return refuse(
        'series',
        `epoch ${i + 1} needs a positive uncertainty for each component`,
        { index: i }
      );
    out.push({
      time: e.time,
      x: b.x - a.x,
      y: b.y - a.y,
      sigma: Math.hypot(a.sigma, b.sigma),
    });
  }
  return { ok: true, epochs: out };
}

const quantile = (sorted, f) =>
  sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
const intervalsOf = sorted =>
  LEVELS.map(level => ({
    level,
    lo: quantile(sorted, (1 - level) / 2),
    hi: quantile(sorted, (1 + level) / 2),
  }));

/** Seeded parallax and ln(a^3 / P^2) draws of the orbit, as 187's massSum draws them. */
function sumDraws(fit, sum, label) {
  const g = gaussian(stream('noise', 'visual-binary-draws', label));
  const lnK3 =
    3 * Math.log(fit.elements.a.value) - 2 * Math.log(fit.elements.P.value);
  const sL = fit.gradients.sigmaLnK3;
  const { value: p0, sigma: sp } = sum.parallax;
  const out = new Float64Array(RULES.draws);
  for (let i = 0; i < RULES.draws; i++) {
    let plx;
    do plx = p0 + sp * g();
    while (!(plx > 0));
    out[i] = (KEPLER_K * Math.exp(lnK3 + sL * g())) / (plx * plx * plx);
  }
  return { draws: out, g };
}

// ---- the mass sum -------------------------------------------------------------------

/**
 * The mass sum of a fitted relative orbit: 187's massSum, plus the one refusal this module
 * adds, a literature value (`literature: true`) without its citation string.
 */
export function massSumOf(fit, parallax) {
  if (parallax?.literature && !String(parallax.source ?? '').trim())
    return refuse(
      'frame',
      'a literature parallax needs its citation: the reference is the source',
      {}
    );
  return massSum(fit, parallax);
}

// ---- the mass fraction --------------------------------------------------------------

/**
 * B from the two components' offsets and the fitted relative orbit.
 * @param {object} fit - a fit from fitOrbit of the relative series
 * @param {{time, A: {x, y, sigma}, B: {x, y, sigma}}[]} epochs
 */
export function massFraction(fit, epochs) {
  if (!fit?.ok) return refuse('no-orbit', 'there is no orbit to refer to', {});
  const years = epochs.map(e => epochYear(e.time));
  if (!years.every(finite))
    return refuse('series', 'an epoch has no usable time', {});
  const model = predict(fit, years);
  const tMid = years.reduce((s, v) => s + v, 0) / years.length;
  // unknowns: cx, mux, cy, muy, B; rows: star 1's offset, star 2's offset minus r
  const rows = [];
  for (let k = 0; k < epochs.length; k++) {
    const tau = years[k] - tMid;
    const r = [model[k].x, model[k].y];
    for (const coord of [0, 1]) {
      const base = [0, 0, 0, 0, -r[coord]];
      base[2 * coord] = 1;
      base[2 * coord + 1] = tau;
      const A = epochs[k].A;
      const B = epochs[k].B;
      rows.push({
        row: base,
        y: coord === 0 ? A.x : A.y,
        w: 1 / A.sigma,
      });
      rows.push({
        row: base,
        y: (coord === 0 ? B.x : B.y) - r[coord],
        w: 1 / B.sigma,
      });
    }
  }
  const N = Array.from({ length: 5 }, () => new Float64Array(5));
  const b = new Float64Array(5);
  for (const { row, y, w } of rows) {
    for (let i = 0; i < 5; i++) {
      if (row[i] === 0) continue;
      b[i] += w * w * row[i] * y;
      for (let j = 0; j < 5; j++) N[i][j] += w * w * row[i] * row[j];
    }
  }
  const cov0 = invertSpd(N.map(r => Array.from(r)));
  if (!cov0)
    return refuse('conditioning', 'the offsets cannot fix the mass fraction', {});
  const theta = cov0.map(r => r.reduce((s, v, j) => s + v * b[j], 0));
  let chi2 = 0;
  for (const { row, y, w } of rows) {
    const res = y - row.reduce((s, v, i) => s + v * theta[i], 0);
    chi2 += w * w * res * res;
  }
  const dof = rows.length - 5;
  const scale = chi2 / dof > 1 ? Math.sqrt(chi2 / dof) : 1;
  const sigma = Math.sqrt(cov0[4][4]) * scale;
  const value = theta[4];
  return {
    ok: true,
    value,
    sigma,
    intervals: LEVELS.map(level => ({
      level,
      lo: value - Z[level] * sigma,
      hi: value + Z[level] * sigma,
    })),
    chi2,
    dof,
    scale,
    barycentre: {
      offset: [theta[0], theta[2]],
      properMotion: [theta[1], theta[3]],
      tRef: tMid,
    },
    convention: CONTRACT.convention,
  };
}

/** M1 and M2 from the sum's and the fraction's draws together (a seeded Monte Carlo). */
function massesOf(fit, sum, fraction) {
  const { draws, g } = sumDraws(fit, sum, 'masses');
  const m1 = new Float64Array(draws.length);
  const m2 = new Float64Array(draws.length);
  for (let i = 0; i < draws.length; i++) {
    let B;
    do B = fraction.value + fraction.sigma * g();
    while (!(B > 0 && B < 1));
    m1[i] = (1 - B) * draws[i];
    m2[i] = B * draws[i];
  }
  const s1 = Float64Array.from(m1).sort();
  const s2 = Float64Array.from(m2).sort();
  const M = sum.value;
  const B = Math.min(Math.max(fraction.value, 0), 1);
  return {
    ok: true,
    unit: 'solar masses',
    M1: { value: (1 - B) * M, intervals: intervalsOf(s1) },
    M2: { value: B * M, intervals: intervalsOf(s2) },
    method: 'seeded Monte Carlo, 20,000 draws of the sum and of B',
  };
}

/**
 * A resolved pair.
 * `series.epochs` are either components ({time, A: {x, y, sigma}, B: {x, y, sigma}}, the mass
 * sum and the mass fraction follow) or a relative series ({time, x, y, sigma}, the mass sum
 * only, the fraction saying why not). One component alone is refused.
 * @param {object} series
 * @param {object} parallax - {value, sigma, unit?, frame, source?, literature?}
 * @param {{depth?: 'circular'|'elliptical'}} [opts]
 */
export function solveResolved(series, parallax, opts = {}) {
  const eps = series?.epochs;
  if (!Array.isArray(eps) || eps.length === 0)
    return refuse('series', 'a series needs epochs', {});
  const withA = eps.every(e => e?.A);
  const withB = eps.every(e => e?.B);
  const relative = eps.every(e => finite(e?.x) && finite(e?.y));
  let rel;
  let comps = null;
  if (withA && withB) {
    rel = relativeOf(eps);
    if (!rel.ok) return rel;
    comps = eps;
  } else if (relative) {
    rel = { ok: true, epochs: eps };
  } else {
    return refuse(
      'needs-each-component',
      'one component’s offsets alone fix no orbit: give both components or the relative offsets',
      {}
    );
  }
  const fit = fitOrbit({ epochs: rel.epochs }, opts);
  if (!fit.ok) return fit;
  const sum = massSumOf(fit, parallax);
  const fraction = comps
    ? massFraction(fit, comps)
    : refuse(
        'needs-each-component',
        'the mass fraction needs each component’s offsets, not the relative offsets only',
        {}
      );
  const masses = sum.ok && fraction.ok ? massesOf(fit, sum, fraction) : null;
  return {
    ok: true,
    kind: comps ? 'components' : 'relative',
    orbit: fit,
    sum,
    fraction,
    masses,
    frameStatement: sum.ok ? sum.frameStatement : FRAME_STATEMENT[parallax?.frame] ?? null,
    convention: CONTRACT.convention,
  };
}

// ---- the photocentre ----------------------------------------------------------------

/** A fit-like record from published elements: a (arcseconds or milliarcseconds) and P with their sigmas, uncorrelated. */
export function orbitFromElements({ a, P }) {
  const scale = a?.unit === 'mas' ? 1e-3 : 1;
  const va = a?.value * scale;
  const sa = a?.sigma * scale;
  if (![va, sa, P?.value, P?.sigma].every(finite) || !(va > 0) || !(P.value > 0))
    return refuse('elements', 'the elements need a, P and their uncertainties', {});
  return {
    ok: true,
    kind: 'published-elements',
    elements: {
      a: { value: va, sigma: sa },
      P: { value: P.value, sigma: P.sigma },
    },
    gradients: {
      sigmaLnK3: Math.hypot((3 * sa) / va, (2 * P.sigma) / P.value),
    },
    note: 'the correlation of a and P is taken as zero',
  };
}

/**
 * An orbit of a photocentre about the barycentre: the photocentre mass function, and, with a
 * stated light fraction and primary mass, the companion's mass with both roots.
 * @param {object} orbitOrSeries - a series for fitOrbit ({epochs: [{time, x, y, sigma}]}) or
 *   an orbit from fitOrbit or orbitFromElements
 * @param {object} parallax - as for solveResolved
 * @param {{lightFraction?: {value, sigma}, primaryMass?: {value, sigma}}} [given]
 */
export function solvePhotocentre(orbitOrSeries, parallax, given = {}, opts = {}) {
  const fit = orbitOrSeries?.ok ? orbitOrSeries : fitOrbit(orbitOrSeries, opts);
  if (!fit.ok) return fit;
  const snr = fit.elements.a.value / fit.elements.a.sigma;
  if (!(snr >= RULES.amplitudeSnr))
    return refuse(
      'amplitude',
      `the photocentre’s orbit is only ${snr.toFixed(1)} times its uncertainty; it needs ${RULES.amplitudeSnr}`,
      { snr, need: RULES.amplitudeSnr }
    );
  const sum = massSumOf(fit, parallax);
  const result = {
    ok: true,
    orbit: fit,
    massFunction: sum.ok
      ? {
          ok: true,
          value: sum.value,
          intervals: sum.intervals,
          unit: 'solar masses',
          label: 'photocentre mass function',
          what: CONTRACT.massFunction,
          parallax: sum.parallax,
        }
      : sum,
    frameStatement: sum.ok ? sum.frameStatement : null,
    companion: null,
  };
  if (!sum.ok) return result;
  const l = given.lightFraction;
  const m = given.primaryMass;
  if (!(finite(l?.value) && l.value >= 0 && l.value < 1 && l.sigma >= 0)) {
    result.companion = refuse(
      'light-fraction',
      'a companion’s mass needs the light fraction of the secondary in the band: a dark companion is never assumed',
      {}
    );
    return result;
  }
  if (!(finite(m?.value) && m.value > 0 && m.sigma >= 0)) {
    result.companion = refuse(
      'primary-mass',
      'a companion’s mass needs a stated mass of the primary',
      {}
    );
    return result;
  }
  const roots = companionRoots(sum.value, m.value, l.value);
  const { draws, g } = sumDraws(fit, sum, 'companion');
  const above = [];
  let belowCount = 0;
  const below = [];
  for (let i = 0; i < draws.length; i++) {
    let li;
    do li = l.value + l.sigma * g();
    while (!(li >= 0 && li < 1));
    let mi;
    do mi = m.value + m.sigma * g();
    while (!(mi > 0));
    const r = companionRoots(draws[i], mi, li);
    above.push(r[0].M2);
    if (r[1]) {
      belowCount++;
      below.push(r[1].M2);
    }
  }
  const sortedAbove = Float64Array.from(above).sort();
  const out = roots.map(r => {
    if (r.side === 'above')
      return {
        ...r,
        flag: null,
        intervals: intervalsOf(sortedAbove),
        share: 1,
      };
    const sb = Float64Array.from(below).sort();
    return {
      ...r,
      flag: 'ambiguous-root',
      intervals: intervalsOf(sb),
      share: belowCount / draws.length,
    };
  });
  result.companion = {
    ok: true,
    unit: 'solar masses',
    roots: out,
    ambiguous: out.length > 1,
    lightFraction: l,
    primaryMass: m,
    what: CONTRACT.roots,
    method: 'seeded Monte Carlo, 20,000 draws of the function, the light fraction and the primary’s mass',
  };
  return result;
}
