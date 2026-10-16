// =============================================================================
// Galactic investigations: what the three instruments compute
// -----------------------------------------------------------------------------
// Pure functions over the galactic kernel (js/kernels/galactic, GALACTIC_DYNAMICS.md)
// and the three Gaia / rotation-curve packs. js/galacticWidgets.js draws what
// these return; tests/galacticInvestigations.test.js and
// tools/authoring/galacticModels.mjs recompute the lessons' expected values
// from the same functions. No DOM, no clock.
//
// ASSUMPTION, stated rather than hidden: the Sun's V relative to the local
// standard of rest has two published values that this sample cannot choose
// between. The Stromberg (asymmetric-drift) correction from the sample's own
// dispersion gives about 3.8 km/s (the old Dehnen and Binney 1998 value was
// 5.2); Schonrich, Binney and Dehnen 2010 give 12.24 +/- 0.47, by arguing
// that the lag depends on metallicity. The instrument offers both, labelled,
// beside "relative to these stars", and a lesson says which one it used.
// =============================================================================

import {
  spaceVelocities,
  solarMotion,
  lsrCorrection,
  fitOortConstants,
  fitMembership,
  countAbove,
  fitMassModel,
  curveAt,
  chiSquare,
  hammerAitoff,
  K_PM,
  propermotionToGalactic,
} from '../kernels/galactic/index.js';
import { tableOf } from '../tableObservation.js';

/** Schonrich, Binney and Dehnen 2010 (MNRAS 403, 1829): the Sun's motion relative to the LSR, km/s. */
export const SCHONRICH_2010 = Object.freeze({ U: 11.1, V: 12.24, W: 7.25 });

/** The three frames the Sun's V can be quoted in. */
export const FRAMES = Object.freeze(['stars', 'stromberg', 'schonrich']);

/** The rotation curve the lessons use: R0 = 8.3 kpc, V0 = 244 km/s, disk tracers. */
export const ROTATION_SET = Object.freeze({
  r0: 8.3,
  v0: 244,
  rMin: 2,
  rMax: 25,
});

const column = (t, id) => t.columns.find(c => c.id === id).values;

/** Where each pack's rows are (tools/data-packs/gaia-dynamics.mjs): sidecar files, not modules. */
export const GAIA_SIDECARS = Object.freeze({
  solar: '/gaia/solar-neighbourhood.json',
  cluster: '/gaia/ngc2420.json',
  rotation: '/gaia/milky-way-rotation-curve.json',
});

/** A pack's record from its (small) module and its rows from its sidecar file. */
async function packOf(load, url, fetchImpl) {
  const [mod, res] = await Promise.all([load(), fetchImpl(url)]);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return { PACK: mod.PACK, SERIES: await res.json() };
}

/**
 * The packs, as the instruments read them. Resolves to {solar, cluster,
 * rotation, packs}. A caller passes its own fetch so a test or a Worker can
 * supply the files; the default is the page's.
 */
export async function loadGalacticPacks(fetchImpl = globalThis.fetch) {
  const [s, c, r] = await Promise.all([
    packOf(
      () => import('../data/observations/gaiaSolarNeighbourhood.js'),
      GAIA_SIDECARS.solar,
      fetchImpl
    ),
    packOf(
      () => import('../data/observations/gaiaNgc2420.js'),
      GAIA_SIDECARS.cluster,
      fetchImpl
    ),
    packOf(
      () => import('../data/observations/milkyWayRotationCurve.js'),
      GAIA_SIDECARS.rotation,
      fetchImpl
    ),
  ]);
  return {
    solar: solarStars(s),
    cluster: clusterRows(c),
    rotation: rotationPoints(r),
    packs: { solar: s.PACK, cluster: c.PACK, rotation: r.PACK },
  };
}

/** The solar-neighbourhood pack as star objects. */
export function solarStars(pack) {
  const t = tableOf(pack);
  const c = id => column(t, id);
  return Array.from({ length: t.n }, (_, i) => ({
    ra: c('ra')[i],
    dec: c('dec')[i],
    parallax: c('parallax')[i],
    pmRa: c('pmra')[i],
    pmDec: c('pmdec')[i],
    rv: c('rv')[i],
    bp: c('bp_rp')[i],
  }));
}

/** NGC 2420's Gaia table as rows. */
export function clusterRows(pack) {
  const t = tableOf(pack);
  const c = id => column(t, id);
  return Array.from({ length: t.n }, (_, i) => ({
    pmRa: c('pmra')[i],
    pmDec: c('pmdec')[i],
    parallax: c('parallax')[i],
    ePmRa: c('pmra_err')[i],
    ePmDec: c('pmdec_err')[i],
    eParallax: c('parallax_err')[i],
    g: c('g')[i],
    bp: c('bp_rp')[i],
  }));
}

/** The rotation curve's chosen set, as the fit takes it (errors floored at 3 km/s). */
export function rotationPoints(pack, set = ROTATION_SET) {
  const t = tableOf(pack);
  const pts = [];
  for (let i = 0; i < t.n; i++) {
    const r = column(t, 'r')[i];
    if (column(t, 'v0')[i] === set.v0 && r >= set.rMin && r < set.rMax)
      pts.push({
        r,
        v: column(t, 'vc')[i],
        err: Math.max(column(t, 'vc_err')[i], 3),
      });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// The Sun's motion
// ---------------------------------------------------------------------------

/**
 * The Sun's motion from the stars within a distance, in one of three frames.
 * @param {Array<object>} stars - solarStars()
 * @param {{maxPc?: number, frame?: 'stars'|'stromberg'|'schonrich'}} [o]
 */
export function solarFacts(stars, o = {}) {
  const maxPc = o.maxPc ?? 100;
  const frame = o.frame ?? 'stars';
  const vel = spaceVelocities(stars, { maxDistance: maxPc / 1000 });
  const m = solarMotion(vel);
  const lag = lsrCorrection(m.sigma.U);
  let V = m.V;
  if (frame === 'stromberg') V = m.V - lag;
  if (frame === 'schonrich') V = SCHONRICH_2010.V;
  const speed = Math.hypot(m.U, V, m.W);
  return {
    ...m,
    V,
    VStars: m.V,
    lag,
    frame,
    speed,
    apexL: ((Math.atan2(V, m.U) * 180) / Math.PI + 360) % 360,
    apexB: (Math.asin(m.W / speed) * 180) / Math.PI,
    velocities: vel,
  };
}

/** A star's apex-direction position on the Hammer-Aitoff sky. */
export const skyOf = (l, b) => hammerAitoff(l, b);

// ---------------------------------------------------------------------------
// The rotating disk
// ---------------------------------------------------------------------------

/** The Oort fit and the data it was fitted to, binned in longitude for a plot. */
export function oortFacts(stars, weight = 'distance') {
  const fit = fitOortConstants(stars, { weight });
  // Binned in longitude, weighted by 1/parallax^2 as the fit is (when it is);
  // the Sun's own reflex is taken out with the fitted U and V, so the points
  // show A cos 2l + B alone.
  const rows = Array.from({ length: 12 }, () => []);
  for (const s of stars) {
    if (!(s.parallax > 0)) continue;
    const { l, pmL } = propermotionToGalactic(s.ra, s.dec, s.pmRa, s.pmDec);
    const L = (l * Math.PI) / 180;
    const y =
      K_PM * pmL -
      s.parallax * (fit.solarU * Math.sin(L) - fit.solarV * Math.cos(L));
    rows[Math.min(11, Math.floor(l / 30))].push({
      y,
      w: weight === 'none' ? 1 : 1 / (s.parallax * s.parallax),
    });
  }
  const points = rows.map((b, k) => {
    const sw = b.reduce((a, x) => a + x.w, 0);
    const mean = b.reduce((a, x) => a + x.w * x.y, 0) / sw;
    const err =
      Math.sqrt(b.reduce((a, x) => a + (x.w * (x.y - mean)) ** 2, 0)) / sw;
    return { l: k * 30 + 15, y: mean, err };
  });
  return { ...fit, points };
}

/** The mass model against the curve: the sliders' model, or a fit. */
export function massFacts(points, model, mode = 'mine') {
  if (mode === 'halo' || mode === 'stars') {
    const f = fitMassModel(points, { noHalo: mode === 'stars' });
    return {
      model: f.model,
      chi2: f.chi2,
      dof: f.dof,
      reduced: f.reduced,
      rms: f.rms,
      n: f.n,
      fitted: true,
    };
  }
  const c = chiSquare(points, model);
  const free = 4;
  const dof = Math.max(1, c.n - free);
  return {
    model,
    chi2: c.chi2,
    dof,
    reduced: c.chi2 / dof,
    rms: c.rms,
    n: c.n,
    fitted: false,
  };
}

/** The model's speed and its components at one radius. */
export const speedsAt = (r, model) => curveAt(r, model);

// ---------------------------------------------------------------------------
// Cluster membership
// ---------------------------------------------------------------------------

const START = {
  cluster: [-1, -2, 0.3],
  clusterSigma: [0.3, 0.3, 0.05],
  field: [0, -1, 1],
  fieldSigma: [3, 3, 1],
  fraction: 0.3,
};

/**
 * Membership probabilities by the kernel's mixture fit. `dims` is 2 for proper
 * motion alone, 3 for proper motion and parallax.
 * @param {Array<object>} rows - clusterRows()
 */
export function clusterFacts(rows, dims = 3, threshold = 0.5) {
  const stars = rows.map(r => ({
    x: [r.pmRa, r.pmDec, r.parallax].slice(0, dims),
    e: [r.ePmRa, r.ePmDec, r.eParallax].slice(0, dims),
  }));
  const fit = fitMembership(stars, {
    cluster: START.cluster.slice(0, dims),
    clusterSigma: START.clusterSigma.slice(0, dims),
    field: START.field.slice(0, dims),
    fieldSigma: START.fieldSigma.slice(0, dims),
    fraction: START.fraction,
  });
  const p = fit.p;
  const members = countAbove(p, threshold);
  let uncertain = 0;
  for (const v of p) if (v > 0.1 && v < 0.9) uncertain++;
  return {
    dims,
    threshold,
    n: rows.length,
    p,
    members,
    expected: fit.expected,
    uncertain,
    pmRa: fit.cluster.mean[0],
    pmDec: fit.cluster.mean[1],
    sigmaPm: fit.cluster.sigma[0],
    parallax: dims > 2 ? fit.cluster.mean[2] : NaN,
    converged: fit.converged,
    iterations: fit.iterations,
  };
}

/** Mean proper motion and parallax of the stars above a threshold, with the error of the mean. */
export function memberMeans(rows, p, threshold) {
  let n = 0;
  const s = [0, 0, 0];
  const ss = [0, 0, 0];
  rows.forEach((r, i) => {
    if (p[i] < threshold) return;
    n++;
    [r.pmRa, r.pmDec, r.parallax].forEach((v, k) => {
      s[k] += v;
      ss[k] += v * v;
    });
  });
  const mean = s.map(v => v / n);
  const err = ss.map((v, k) =>
    Math.sqrt(Math.max(0, v / n - mean[k] ** 2) / n)
  );
  return { n, mean, err };
}
