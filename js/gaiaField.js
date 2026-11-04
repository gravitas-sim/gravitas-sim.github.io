// =============================================================================
// The views of the Gaia astrometry panels (Prompt 233 Part B, GAIA_WORKFLOWS.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/gaiaWidgets.js and
// tests/gaiaLessons.test.js (which recomputes every number a lesson states from
// them). Nothing is calculated here that the kernel does not: the distance, its
// interval, the posterior, the zero point, the cuts and the cluster's mean
// parallax are js/kernels/galactic/gaia.js, imported from that module and not
// from the galactic index (the index does not export them: cuts.js reaches the
// statistics kernel).
//
// Two views:
//  - distanceView: ONE parallax as a distance, as a likelihood in 1/r, with a
//    prior only when asked and a zero point only as the number the student sets.
//  - sampleView: NGC 2420's 993 stars (pack 1.1.0), a selection by cuts, the
//    colour-magnitude diagram and the tangential velocities of what is left, and
//    the cluster's distance under the contract of leg E1 (members from proper
//    motion alone at probability 0.9, a per-star zero point, a 3-sigma clip,
//    no systematic floor). The neighbourhood pack is NOT used: its parallax is
//    rounded (E3) and gives no distance.
//
// Pure: no DOM, no clock. Distances in kpc, parallaxes in mas, proper motions in
// mas/yr, velocities in km/s.
// =============================================================================

import { fitMembership, K_PM } from './kernels/galactic/index.js';
import {
  LEVELS,
  POE_THRESHOLD,
  PRIORS,
  applyCuts,
  clusterParallax,
  cutSelections,
  distanceFromParallax,
  likelihoodCurve,
  parallaxZeroPoint,
  posterior,
  velocityAtFixedMotion,
} from './kernels/galactic/gaia.js';
import { tableOf } from './tableObservation.js';

const { Math, Float64Array } = globalThis;

export { POE_THRESHOLD, K_PM };

// ---- one parallax ------------------------------------------------------------

/** The distance panel's starting values: observed parallax and error (mas), zero point (mas), prior off, scale length (kpc), plot range (kpc), proper motion (mas/yr, 0 = none). */
export const DISTANCE_START = Object.freeze({
  plx: 0.4,
  err: 0.05,
  zp: 0,
  prior: 0,
  L: 1,
  range: 10,
  mu: 0,
});

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const isOn = x => (x ?? 0) >= 0.5;
const POINTS = 400;

/** The relative value of a posterior's density at r (linear between its grid points), 0 outside. */
function densityAt(post, r) {
  const g = post.r;
  if (r <= g[0] || r >= g[g.length - 1]) return 0;
  let lo = 0;
  let hi = g.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (g[m] <= r) lo = m;
    else hi = m;
  }
  const f = (r - g[lo]) / (g[hi] - g[lo]);
  return post.density[lo] * (1 - f) + post.density[hi] * f;
}

/**
 * One parallax as a distance. `v`: plx, err (mas), zp (the zero point as the
 * stated offset, mas, 0 for none), prior (0 none, 1 the exponentially decreasing
 * space density), L (its scale length, kpc), range (the plot's far edge, kpc), mu
 * (proper motion in mas/yr; 0 for none).
 * @returns {{record: object, curve: object, velocity: object|null, w: number, s: number}}
 */
export function distanceView(v = {}) {
  const w = { ...DISTANCE_START, ...v };
  const range = clamp(w.range, 1, 100);
  const withPrior = isOn(w.prior);
  const zeroPoint = w.zp ? { value: w.zp, sigma: 0 } : undefined;
  const prior = withPrior ? { name: 'edsd', L: Math.max(0.05, w.L) } : 'none';
  const record = distanceFromParallax({
    parallax: w.plx,
    error: w.err,
    zeroPoint,
    prior,
    level: LEVELS.one,
  });
  if (record.status === 'refused') return { record };
  const lc = likelihoodCurve({
    parallax: w.plx,
    error: w.err,
    zeroPoint,
    rMin: 0.02,
    rMax: range,
    n: POINTS,
  });
  const r = Array.from(lc.r);
  const curve = { r, likelihood: Array.from(lc.relative) };
  if (withPrior) {
    const L = prior.L;
    const lnTop = 2 * Math.log(2 * L) - 2;
    curve.prior = r.map(x => Math.exp(2 * Math.log(x) - x / L - lnTop));
    const post = posterior({
      parallax: w.plx,
      error: w.err,
      zeroPoint,
      prior,
      rMin: 0.001,
      rMax: Math.max(100, range),
    });
    const dens = r.map(x => densityAt(post, x));
    const top = Math.max(...dens) || 1;
    curve.posterior = dens.map(d => d / top);
  }
  const velocity = w.mu > 0 ? velocityAtFixedMotion(record, w.mu) : null;
  return {
    record,
    curve,
    velocity,
    range,
    w: record.parallax.corrected,
    s: record.parallax.totalError,
  };
}

// ---- NGC 2420 ----------------------------------------------------------------

/** The sample panel's starting values: no cut on, the zero point applied, the colour-magnitude view. */
export const SAMPLE_START = Object.freeze({
  view: 0,
  mag: 17.5,
  poe: 0,
  ruwe: 1.4,
  zp: 1,
});

/** The pack's own limits: G is below 17.5 and RUWE below 1.4, so a cut at either at the limit removes nothing. */
export const PACK_LIMITS = Object.freeze({ g: 17.5, ruwe: 1.4 });

/** Membership probability at which a star is counted a member: leg E1's committed contract. */
export const MEMBER_THRESHOLD = 0.9;
/** The clip, in sigma, of the cluster's mean parallax (leg E1's contract). */
export const CLIP_SIGMA = 3;

/** The pack's sidecar, as js/galactic/model.js names it. */
export const SIDECAR = '/gaia/ngc2420.json';

const col = (t, id) => t.columns.find(c => c.id === id).values;

/**
 * NGC 2420's table, ready for the panel: the columns it uses, the per-star zero
 * point, and every star's membership probability from proper motion alone (the
 * mixture fit of leg E1, started where that leg starts it).
 * @param {{PACK: object, SERIES: object}} pack
 */
export function prepareCluster(pack) {
  const t = tableOf(pack);
  const c = id => col(t, id);
  const n = t.n;
  const [plx, err, pmra, pmdec, pa, pd, g, bp, ruwe] = [
    'parallax',
    'parallax_err',
    'pmra',
    'pmdec',
    'pmra_err',
    'pmdec_err',
    'g',
    'bp_rp',
    'ruwe',
  ].map(c);
  const [nu, pc, el, pr] = ['nu_eff', 'pseudocolour', 'ecl_lat', 'params'].map(
    c
  );
  const zp = new Float64Array(n);
  let outOfRange = 0;
  for (let i = 0; i < n; i++) {
    const z = parallaxZeroPoint({
      g: g[i],
      nuEff: nu[i],
      pseudocolour: pc[i],
      eclLat: el[i],
      params: pr[i],
    });
    zp[i] = z.status === 'refused' ? NaN : z.value;
    if (z.status === 'refused' || !z.inRange) outOfRange++;
  }
  const fit = fitMembership(
    Array.from({ length: n }, (_, i) => ({
      x: [pmra[i], pmdec[i]],
      e: [pa[i], pd[i]],
    })),
    {
      cluster: [-1.2, -2.1],
      clusterSigma: [0.3, 0.3],
      field: [0, -1],
      fieldSigma: [3, 3],
      fraction: 0.3,
    }
  );
  return {
    n,
    plx,
    err,
    pmra,
    pmdec,
    g,
    bp,
    ruwe,
    zp,
    outOfRange,
    p: fit.p,
    converged: fit.converged,
    rows: Array.from({ length: n }, (_, i) => ({
      g: g[i],
      poe: plx[i] / err[i],
      ruwe: ruwe[i],
    })),
    dropped: droppedBy(pack),
  };
}

/** The stars the pack's own query dropped before any cut here (its manifest's mask), or null. */
function droppedBy(pack) {
  const m = pack?.PACK?.masks?.find?.(x => x.column === 'ruwe');
  return m && Number.isFinite(m.dropped) ? m.dropped : null;
}

/**
 * Fetch NGC 2420's pack (its small module and its sidecar) and prepare it.
 * @param {Function} [fetchImpl] - the page's fetch by default
 */
export async function loadCluster(fetchImpl = globalThis.fetch) {
  const [mod, res] = await Promise.all([
    import('./data/observations/gaiaNgc2420.js'),
    fetchImpl(SIDECAR),
  ]);
  if (!res.ok) throw new Error(`${SIDECAR}: HTTP ${res.status}`);
  return prepareCluster({ PACK: mod.PACK, SERIES: await res.json() });
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

/**
 * The cuts a setting switches on (`mag` below the pack's own limit, `poe` above
 * 0, `ruwe` below the pack's own limit), as the kernel names them.
 */
export function cutsOf(v = {}) {
  const w = { ...SAMPLE_START, ...v };
  const on = {};
  if (w.mag < PACK_LIMITS.g - 1e-9) on.magnitude = w.mag;
  if (w.poe > 0) on.parallaxOverError = w.poe;
  if (w.ruwe < PACK_LIMITS.ruwe - 1e-9) on.ruwe = w.ruwe;
  return on;
}

/**
 * NGC 2420 under a selection: what each cut removes, who is left, the
 * colour-magnitude diagram, the tangential velocities at the cluster's
 * distance, and the distance under leg E1's contract.
 * @param {ReturnType<typeof prepareCluster>} data
 * @param {object} v - mag, poe, ruwe, zp (1 applies the per-star zero point)
 */
export function sampleView(data, v = {}) {
  const w = { ...SAMPLE_START, ...v };
  const cuts = cutSelections(cutsOf(w));
  const ap = applyCuts(data.rows, cuts);
  const kept = new Set(ap.included);
  const useZp = isOn(w.zp);
  const members = [];
  const others = [];
  const removed = [];
  for (let i = 0; i < data.n; i++) {
    if (!kept.has(i)) removed.push(i);
    else if (data.p[i] >= MEMBER_THRESHOLD && Number.isFinite(data.zp[i]))
      members.push(i);
    else others.push(i);
  }
  const cl = members.length
    ? clusterParallax({
        stars: members.map(i => ({
          parallax: data.plx[i],
          error: data.err[i],
          zeroPoint: useZp ? data.zp[i] : 0,
        })),
        systematic: 0,
        clipSigma: CLIP_SIGMA,
      })
    : null;
  const ok = cl && cl.status === 'ok';
  const record = ok
    ? distanceFromParallax({ parallax: cl.mean, error: cl.error })
    : null;
  let velocity = null;
  if (record && record.distance !== null && members.length > 1) {
    const d = record.distance;
    const vra = members.map(i => K_PM * data.pmra[i] * d);
    const vdec = members.map(i => K_PM * data.pmdec[i] * d);
    const muMean = Math.hypot(
      mean(members.map(i => data.pmra[i])),
      mean(members.map(i => data.pmdec[i]))
    );
    velocity = {
      vra,
      vdec,
      meanRa: mean(vra),
      meanDec: mean(vdec),
      scatterRa: sd(vra),
      scatterDec: sd(vdec),
      muMean,
      speed: velocityAtFixedMotion(record, muMean),
    };
  }
  return {
    cuts: ap,
    on: cutsOf(w),
    kept: ap.kept,
    members,
    others,
    removed,
    cluster: ok ? cl : null,
    record,
    velocity,
    useZeroPoint: useZp,
  };
}

/** The colour-magnitude diagram of a sample view: three sets of {x, y} (colour, G), G for the axis negated by the caller. */
export function cmdOf(data, view) {
  const pick = ids => ({
    x: ids.map(i => data.bp[i]).filter(Number.isFinite),
    g: ids.filter(i => Number.isFinite(data.bp[i])).map(i => data.g[i]),
  });
  return {
    members: pick(view.members),
    others: pick(view.others),
    removed: pick(view.removed),
  };
}

/** The prior's label and its assumptions, from the kernel, for the panel and the tests. */
export const EDSD = PRIORS.edsd;
