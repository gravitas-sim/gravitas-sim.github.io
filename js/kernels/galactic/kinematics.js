// =============================================================================
// Galactic kernel: kinematic methods with their selection stated (Prompt 235)
// -----------------------------------------------------------------------------
// Three methods a student can run on the packs the Gravitas tree holds, each
// returned with its interval, the selection the sample carries (154's objects)
// and a status that says when the sample cannot support the method:
//
// - The Oort constants A and B, the first-order local expansion
//     4.74047 mu_l* [km/s/kpc] = cos b (A cos 2l + B) + parallax (U sin l - V cos l)
//   fitted to the neighbourhood pack (oortFit). It is first order in distance,
//   so a limit on distance is part of the method, a stated option. The factor
//   cos b is 1 only in the plane: motion.js's fitOortConstants leaves it out
//   and so returns A and B too small by the sky's mean cos b (KINEMATICS_GATE.md, AM1).
// - Velocity dispersions by [Fe/H] bin from the SEGUE pack's line-of-sight
//   velocities (dispersionByBin): maximum likelihood with each star's own
//   error and, where a star was excluded because its velocity sat in the
//   cluster's window, the probability of being outside the window; a sandwich
//   covariance, so a heavy tail widens the interval instead of hiding.
// - Asymmetric drift as the stated relation <V> = -V_sun - sigma_U^2 / k
//   (driftFit), with the LSR choice an option that reports both candidate
//   values and chooses neither (lsrOptions, D-GAIA-03).
//
// The Toomre diagram and the disk-halo separation are not here: they need
// thresholds from a cited source (KINEMATICS_GATE.md, leg T).
//
// Pure: no DOM, no clock. Velocities in km/s, parallax in mas, proper motions in
// mas/yr, distances in kpc, positions in degrees. Not re-exported by index.js,
// so the lessons that import the galactic index do not carry it.
// =============================================================================

import { K_PM, propermotionToGalactic } from './coords.js';
import { lsrCorrection, solarMotion } from './motion.js';
import { applyCuts, cutSelections } from './cuts.js';
import { selection, all } from '../statistics/selection.js';
import { normalCdf } from '../statistics/special.js';

const DEG = Math.PI / 180;

/** The constants these methods state, with where each comes from. */
export const KINEMATICS = Object.freeze({
  /** A and B are constrained when each is at least this many of its errors from zero. */
  oortSigmas: 3,
  /** The stated lag constant of the Stromberg relation, km/s (motion.js, BT08 4.8.2). */
  lagK: 80,
  /** A dispersion bin needs this many stars and sigma at least this many errors. */
  binMinStars: 15,
  binMinSigmas: 3,
  /** The drift slope is constrained at this many errors. */
  slopeSigmas: 3,
  /** Half the gap between D-GAIA-03's two candidate values for the Sun's V (3.77 and 12.24). */
  lsrHalfGap: 4.2,
  /** The second candidate value of D-GAIA-03, km/s (Schonrich, Binney and Dehnen 2010 as the register records it). */
  schonrichV: 12.24,
});

/** Gauss-Jordan inverse of a small matrix, partial pivoting. */
function inverse(a) {
  const n = a.length;
  const m = a.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (!(Math.abs(m[p][c]) > 0)) throw new Error('singular matrix');
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    for (let k = 0; k < 2 * n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      if (f === 0) continue;
      for (let k = 0; k < 2 * n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map(row => row.slice(n));
}

const median = values => {
  const s = Float64Array.from(values).sort();
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};

// ----- the Oort constants ----------------------------------------------------------

/**
 * The Oort constants from proper motions in Galactic longitude, with the
 * covariance, the residuals and a status.
 *
 * @param {Array<{ra: number, dec: number, parallax: number, pmRa: number, pmDec: number}>} stars
 * @param {{maxDistance?: number, weight?: 'distance'|'none', minSigmas?: number, planar?: boolean}} [opts]
 *   maxDistance in kpc, from the parallax as given (no zero point). The
 *   weight is 1/parallax^2 by default, the weight a distance-independent
 *   velocity scatter gives (an unweighted fit is dominated by the nearest
 *   stars, whose scatter in km/s/kpc is largest).
 * @returns {{status: 'constrained'|'not-constrained'|'refused', n: number, A: number,
 *   B: number, errA: number, errB: number, covAB: number, omega: number,
 *   omegaErr: number, solarU: number, solarV: number, rms: number,
 *   residuals: {l: Float64Array, y: Float64Array, fit: Float64Array, parallax: Float64Array},
 *   contract: object, assumes: string[]}}
 */
export function oortFit(stars, opts = {}) {
  const minSigmas = opts.minSigmas ?? KINEMATICS.oortSigmas;
  const weight = opts.weight ?? 'distance';
  // `planar` is the form of motion.js's fitOortConstants, which leaves out cos b; it is here for the gate's record only.
  const planar = opts.planar === true;
  const contract = {
    maxDistance: opts.maxDistance ?? null,
    weight,
    minSigmas,
    latitudeFactor: !planar,
  };
  const rows = [];
  for (const s of stars) {
    if (!(s.parallax > 0)) continue;
    if (opts.maxDistance !== undefined && 1 / s.parallax > opts.maxDistance)
      continue;
    const { l, b, pmL } = propermotionToGalactic(
      s.ra,
      s.dec,
      s.pmRa,
      s.pmDec
    );
    const y = K_PM * pmL;
    if (!Number.isFinite(y)) continue;
    const L = l * DEG;
    // The velocity along l of the Galaxy's rotation is d cos b (A cos 2l + B): the factor cos b is 1 only in the plane.
    const cb = planar ? 1 : Math.cos(b * DEG);
    rows.push({
      l,
      parallax: s.parallax,
      x: [
        cb * Math.cos(2 * L),
        cb,
        s.parallax * Math.sin(L),
        -s.parallax * Math.cos(L),
      ],
      y,
      w: weight === 'none' ? 1 : 1 / (s.parallax * s.parallax),
    });
  }
  const n = rows.length;
  const assumes = [
    'to first order in distance: the second-order terms of the Galaxy’s rotation grow with distance, so the stated distance limit is part of the method',
    'the stars share one velocity field and are not independent of each other: the errors come from the scatter about the fit',
    'the parallax is the catalogue value with no zero-point correction, and enters through the Sun’s reflex term and the weights only',
    'the weight 1/parallax^2 assumes a velocity scatter that does not depend on distance',
  ];
  if (n < 8)
    return {
      status: 'refused',
      n,
      why: 'too few stars for the Oort fit (8 are needed)',
      contract,
      assumes,
    };
  const k = 4;
  const ata = Array.from({ length: k }, () => new Array(k).fill(0));
  const atb = new Array(k).fill(0);
  for (const r of rows)
    for (let i = 0; i < k; i++) {
      atb[i] += r.w * r.x[i] * r.y;
      for (let j = 0; j < k; j++) ata[i][j] += r.w * r.x[i] * r.x[j];
    }
  const inv = inverse(ata);
  const p = inv.map(row => row.reduce((a, v, j) => a + v * atb[j], 0));
  let ss = 0;
  let sw = 0;
  const fit = new Float64Array(n);
  rows.forEach((r, i) => {
    fit[i] = r.x.reduce((a, v, j) => a + v * p[j], 0);
    const e = r.y - fit[i];
    ss += r.w * e * e;
    sw += r.w;
  });
  const scale = ss / (n - k);
  const cov = inv.map(row => row.map(v => v * scale));
  const [A, B, solarU, solarV] = p;
  const errA = Math.sqrt(cov[0][0]);
  const errB = Math.sqrt(cov[1][1]);
  const constrained =
    Math.abs(A) / errA >= minSigmas && Math.abs(B) / errB >= minSigmas;
  return {
    status: constrained ? 'constrained' : 'not-constrained',
    n,
    A,
    B,
    errA,
    errB,
    covAB: cov[0][1],
    omega: A - B,
    omegaErr: Math.sqrt(cov[0][0] + cov[1][1] - 2 * cov[0][1]),
    solarU,
    solarV,
    rms: Math.sqrt(ss / sw),
    residuals: {
      l: Float64Array.from(rows, r => r.l),
      y: Float64Array.from(rows, r => r.y),
      fit,
      parallax: Float64Array.from(rows, r => r.parallax),
    },
    contract,
    assumes,
  };
}

/** The neighbourhood pack's strata, from its manifest (`reductions`), as the selection's inclusion probabilities. */
export const NEIGHBOURHOOD_STRATA = Object.freeze([
  {
    id: 'near',
    label: 'parallax above 10 mas (closer than 100 pc)',
    kept: 489,
    ofTotal: 133468,
    oneIn: 273,
  },
  {
    id: 'far',
    label: 'parallax 1 to 10 mas (100 pc to 1 kpc)',
    kept: 1081,
    ofTotal: 9798805,
    oneIn: 9065,
  },
]);

/**
 * The selection the neighbourhood pack carries, as 154's objects, and what each
 * cut removes from the rows given. The pack's own cuts (RUWE below 1.4,
 * parallax over error above 10, a radial velocity) were made upstream, so each
 * removes nothing from the pack; the distance limit of an Oort contract removes
 * what it removes. The strata are inclusion probabilities, not cuts.
 *
 * @param {Array<{parallax: number, parallax_err: number, ruwe: number, rv: number}>} rows - the pack's rows
 * @param {{maxDistance?: number}} [opts]
 */
export function neighbourhoodSelection(rows, opts = {}) {
  const cuts = cutSelections({
    parallaxOverError: 10,
    ruwe: 1.4,
    radialVelocity: true,
  });
  const table = rows.map(r => ({
    poe: r.parallax / r.parallax_err,
    ruwe: r.ruwe,
    rv: r.rv,
    distance: 1 / r.parallax,
  }));
  if (opts.maxDistance !== undefined)
    cuts.push({
      id: 'distance',
      label: `distance limit (the method is first order in distance)`,
      limit: opts.maxDistance,
      selection: selection({
        name: 'distance limit',
        observable: 'distance',
        cut: { max: opts.maxDistance },
      }),
    });
  const counted = applyCuts(table, cuts);
  const strata = NEIGHBOURHOOD_STRATA.map(s => ({
    ...s,
    inPack: rows.filter(r => (s.id === 'near') === r.parallax >= 10).length,
  }));
  const stratumInclusion = selection({
    name: 'stratum',
    observable: 'parallax',
    probability: p => (p >= 10 ? 1 / 273 : 1 / 9065),
  });
  return {
    cuts: counted,
    strata,
    selection: all(counted.selection, stratumInclusion),
    statement: [
      `Gaia DR3 stars with RUWE below 1.4, a parallax more than 10 times its error and a radial velocity (cuts made upstream of the pack, so they remove ${counted.alone
        .filter(a => a.id !== 'distance')
        .reduce((s, a) => s + a.removed, 0)} of its ${counted.total} rows).`,
      `Two strata, a random subset of each: ${strata[0].label}, about 1 in ${strata[0].oneIn} of the ${strata[0].ofTotal.toLocaleString('en-US')} that pass (${strata[0].inPack} in the pack); ${strata[1].label}, about 1 in ${strata[1].oneIn.toLocaleString('en-US')} of the ${strata[1].ofTotal.toLocaleString('en-US')} (${strata[1].inPack} in the pack). The near stratum is over-sampled on purpose.`,
      'A radial velocity needs a bright star (G_RVS below about 14): the sample is not complete in distance and holds more bright, nearby stars than the sky does.',
      ...(opts.maxDistance !== undefined
        ? [
            `The Oort contract keeps stars nearer than ${opts.maxDistance} kpc by the catalogue parallax: ${counted.total - counted.alone.find(a => a.id === 'distance').removed} stars.`,
          ]
        : []),
    ],
  };
}

// ----- dispersions by metallicity bin ------------------------------------------------

/** The edges of the three [Fe/H] bins and their labels. */
export const SEGUE_BINS = Object.freeze({
  edges: Object.freeze([-1.0, -0.5]),
  labels: Object.freeze([
    '[Fe/H] < -1.0',
    '-1.0 <= [Fe/H] < -0.5',
    '[Fe/H] >= -0.5',
  ]),
});

/** The exclusion that removes the cluster NGC 2420 from a SEGUE sight line. */
export const SEGUE_EXCLUSION = Object.freeze({
  centre: Object.freeze({ ra: 114.602, dec: 21.575 }),
  innerRadiusArcmin: 10,
  velocityWindow: 5,
  fehWindow: 0.4,
});

const arcminFrom = (ra, dec, centre) => {
  const a = Math.sin(dec * DEG) * Math.sin(centre.dec * DEG);
  const b =
    Math.cos(dec * DEG) *
    Math.cos(centre.dec * DEG) *
    Math.cos((ra - centre.ra) * DEG);
  return (Math.acos(Math.max(-1, Math.min(1, a + b))) / DEG) * 60;
};

/**
 * The SEGUE sight line without the cluster, with what each exclusion removes.
 *
 * Rule 1 removes every star within the inner radius (the region SEGUE targeted
 * for the cluster). Rule 2 removes, outside it, a star whose radial velocity is
 * within the window of the inner stars' median and whose [Fe/H] is within the
 * metallicity window of theirs (the cluster's outskirts). The medians come
 * from the pack. Rule 2 removes field stars too, which leaves a hole in the
 * velocity distribution of the stars near the cluster's metallicity: a star
 * with `windowed` true is one the hole applies to, and the likelihood of
 * dispersionByBin divides by the probability of being outside it.
 *
 * @param {Array<{ra: number, dec: number, feh: number, rv: number, rvErr: number, snr?: number}>} rows
 * @param {Partial<typeof SEGUE_EXCLUSION>} [opts]
 */
export function segueField(rows, opts = {}) {
  const x = { ...SEGUE_EXCLUSION, ...opts };
  const sep = rows.map(r => arcminFrom(r.ra, r.dec, x.centre));
  const inner = rows.filter((r, i) => sep[i] < x.innerRadiusArcmin);
  if (inner.length < 10)
    return { status: 'refused', why: 'too few stars near the cluster centre' };
  const rvC = median(inner.map(r => r.rv));
  const fehC = median(inner.map(r => r.feh));
  const table = rows.map((r, i) => ({
    snr: r.snr ?? 10,
    sep: sep[i],
    member:
      Math.abs(r.rv - rvC) <= x.velocityWindow &&
      Math.abs(r.feh - fehC) <= x.fehWindow
        ? 1
        : 0,
  }));
  const cuts = [
    {
      id: 'sspp',
      label: 'SSPP adopted parameters (signal-to-noise above 10)',
      limit: 10,
      selection: selection({
        name: 'SSPP adopted parameters',
        observable: 'snr',
        cut: { min: 10 },
      }),
    },
    {
      id: 'innerRadius',
      label: `outside ${x.innerRadiusArcmin} arcmin of the cluster centre`,
      limit: x.innerRadiusArcmin,
      selection: selection({
        name: 'outside the cluster region',
        observable: 'sep',
        cut: { min: x.innerRadiusArcmin },
      }),
    },
    {
      id: 'outskirts',
      label: `not within ${x.velocityWindow} km/s and ${x.fehWindow} dex of the inner stars' medians`,
      limit: x.velocityWindow,
      selection: selection({
        name: 'not the cluster’s outskirts',
        observable: 'member',
        cut: { max: 0 },
      }),
    },
  ];
  const counted = applyCuts(table, cuts);
  const keep = new Set(counted.included);
  const window = [rvC - x.velocityWindow, rvC + x.velocityWindow];
  const survivors = [];
  rows.forEach((r, i) => {
    if (!keep.has(i)) return;
    survivors.push({
      index: i,
      ra: r.ra,
      dec: r.dec,
      feh: r.feh,
      v: r.rv,
      e: r.rvErr,
      windowed: Math.abs(r.feh - fehC) <= x.fehWindow,
    });
  });
  return {
    status: 'ok',
    survivors,
    window,
    cluster: { rv: rvC, feh: fehC, inner: inner.length },
    cuts: counted,
    selection: counted.selection,
    exclusion: x,
    statement: [
      `SEGUE stars within 30 arcmin of NGC 2420 with parameters adopted by the SSPP (signal-to-noise above 10): ${rows.length} in the pack. SEGUE chose its targets by colour and magnitude, and two fibres on a plate could not be closer than 55 arcsec, so this is not every star there, and no model of that selection is built.`,
      `Outside ${x.innerRadiusArcmin} arcmin of the cluster centre (the region targeted for the cluster): ${counted.steps[1].remaining} of ${rows.length} remain. The cluster's median velocity is ${rvC.toFixed(2)} km/s and its median [Fe/H] ${fehC.toFixed(2)} (from the pack, not the literature).`,
      `Excluding stars within ${x.velocityWindow} km/s of that velocity and ${x.fehWindow} dex of that [Fe/H] (the cluster's outskirts) removes ${counted.steps[2].removed} more and leaves ${counted.kept}. It removes field stars too: the likelihood divides by the probability of a velocity outside the window for every star within ${x.fehWindow} dex of the cluster's [Fe/H].`,
      'Velocities are along one line of sight (l about 198 degrees, b about +20): one component of the velocity ellipsoid, not three. A bin is whatever mixture of populations the metallicity puts in it.',
    ],
  };
}

const LN_2PI = Math.log(2 * Math.PI);

function logLik(mu, v, stars, window) {
  let ll = 0;
  for (const st of stars) {
    const s2 = v + st.e * st.e;
    const z = st.v - mu;
    ll -= 0.5 * (LN_2PI + Math.log(s2) + (z * z) / s2);
    if (window && st.windowed) {
      const s = Math.sqrt(s2);
      const p = normalCdf((window[1] - mu) / s) - normalCdf((window[0] - mu) / s);
      ll -= Math.log(Math.max(1 - p, 1e-300));
    }
  }
  return ll;
}

function starLogLik(mu, v, st, window) {
  const s2 = v + st.e * st.e;
  const z = st.v - mu;
  let ll = -0.5 * (LN_2PI + Math.log(s2) + (z * z) / s2);
  if (window && st.windowed) {
    const s = Math.sqrt(s2);
    const p = normalCdf((window[1] - mu) / s) - normalCdf((window[0] - mu) / s);
    ll -= Math.log(Math.max(1 - p, 1e-300));
  }
  return ll;
}

/**
 * Maximum likelihood of a Gaussian mean and intrinsic variance from velocities
 * with per-star errors, with an optional exclusion window, and the sandwich
 * covariance of (mean, sigma).
 *
 * @param {Array<{v: number, e: number, windowed?: boolean}>} stars
 * @param {{window?: [number, number]|null}} [opts]
 * @returns {{n: number, mean: number, sigma: number, meanErr: number, sigmaErr: number,
 *   covMeanSigma: number, atBoundary: boolean, logLik: number}}
 */
export function mleDispersion(stars, { window = null } = {}) {
  const n = stars.length;
  if (n < 3) throw new Error('a dispersion needs at least three stars');
  let mu = 0;
  let sw = 0;
  for (const s of stars) {
    mu += s.v / (1 + s.e * s.e);
    sw += 1 / (1 + s.e * s.e);
  }
  mu /= sw;
  let m2 = 0;
  let e2 = 0;
  for (const s of stars) {
    m2 += (s.v - mu) ** 2;
    e2 += s.e * s.e;
  }
  const scaleV = Math.max(m2 / (n - 1), 1);
  let v = Math.max(m2 / (n - 1) - e2 / n, 0.01 * scaleV);
  const hMu = 1e-4 * Math.sqrt(scaleV);
  const hV = 1e-4 * scaleV;
  const f = (a, b) => logLik(a, b, stars, window);
  const grad = (a, b) => [
    (f(a + hMu, b) - f(a - hMu, b)) / (2 * hMu),
    (f(a, b + hV) - f(a, b - hV)) / (2 * hV),
  ];
  const hess = (a, b) => {
    const f0 = f(a, b);
    const aa = (f(a + hMu, b) - 2 * f0 + f(a - hMu, b)) / (hMu * hMu);
    const bb = (f(a, b + hV) - 2 * f0 + f(a, b - hV)) / (hV * hV);
    const ab =
      (f(a + hMu, b + hV) -
        f(a + hMu, b - hV) -
        f(a - hMu, b + hV) +
        f(a - hMu, b - hV)) /
      (4 * hMu * hV);
    return [
      [aa, ab],
      [ab, bb],
    ];
  };
  let fx = f(mu, v);
  let atBoundary = false;
  for (let it = 0; it < 200; it++) {
    const g = grad(mu, v);
    const H = hess(mu, v);
    const det = H[0][0] * H[1][1] - H[0][1] * H[0][1];
    let dMu;
    let dV;
    if (H[0][0] < 0 && det > 0) {
      dMu = -(H[1][1] * g[0] - H[0][1] * g[1]) / det;
      dV = -(-H[0][1] * g[0] + H[0][0] * g[1]) / det;
    } else {
      dMu = 1e-3 * g[0] * scaleV;
      dV = 1e-3 * g[1] * scaleV * scaleV;
    }
    let t = 1;
    let moved = false;
    for (let k = 0; k < 60; k++) {
      const nMu = mu + t * dMu;
      let nV = v + t * dV;
      let clamped = false;
      if (nV < 0) {
        nV = 0;
        clamped = true;
      }
      const nf = f(nMu, nV);
      if (Number.isFinite(nf) && nf >= fx - 1e-12) {
        const step = Math.abs(nMu - mu) / Math.sqrt(scaleV) + Math.abs(nV - v) / scaleV;
        mu = nMu;
        v = nV;
        const gain = nf - fx;
        fx = nf;
        atBoundary = clamped;
        moved = step > 1e-12 && gain > 1e-13;
        break;
      }
      t *= 0.5;
    }
    if (!moved) break;
  }
  const H = hess(mu, v);
  const sigma = Math.sqrt(v);
  const info = [
    [-H[0][0], -H[0][1]],
    [-H[0][1], -H[1][1]],
  ];
  let covMV = [
    [NaN, NaN],
    [NaN, NaN],
  ];
  try {
    const ia = inverse(info);
    const B = [
      [0, 0],
      [0, 0],
    ];
    for (const st of stars) {
      const g = [
        (starLogLik(mu + hMu, v, st, window) -
          starLogLik(mu - hMu, v, st, window)) /
          (2 * hMu),
        (starLogLik(mu, v + hV, st, window) -
          starLogLik(mu, Math.max(v - hV, 0), st, window)) /
          (v + hV - Math.max(v - hV, 0)),
      ];
      B[0][0] += g[0] * g[0];
      B[0][1] += g[0] * g[1];
      B[1][1] += g[1] * g[1];
    }
    B[1][0] = B[0][1];
    const mul = (x, y) =>
      x.map((row, i) =>
        y[0].map((_, j) => row.reduce((a, c, k) => a + c * y[k][j], 0))
      );
    covMV = mul(mul(ia, B), ia);
  } catch {
    // singular information: the errors stay NaN and the status says so
  }
  const sigmaErr = sigma > 0 ? Math.sqrt(covMV[1][1]) / (2 * sigma) : NaN;
  return {
    n,
    mean: mu,
    sigma,
    meanErr: Math.sqrt(covMV[0][0]),
    sigmaErr,
    covMeanSigma: sigma > 0 ? covMV[0][1] / (2 * sigma) : NaN,
    atBoundary,
    logLik: fx,
  };
}

/** The bin a metallicity falls in, from the edges. */
export const binOf = (feh, edges = SEGUE_BINS.edges) => {
  let b = 0;
  while (b < edges.length && feh >= edges[b]) b++;
  return b;
};

/**
 * Line-of-sight velocity dispersion by [Fe/H] bin, the intrinsic value with each
 * star's measurement error removed, an exclusion window handled by the
 * likelihood, and a status per bin.
 *
 * @param {Array<{feh: number, v: number, e: number, windowed?: boolean}>} stars
 * @param {{window?: [number, number]|null, edges?: number[], minStars?: number, minSigmas?: number, uncorrected?: boolean}} [opts]
 *   `uncorrected: false` skips the second fit that ignores the window
 * @returns {Array<{bin: number, label: string, n: number, status: string, reason?: string,
 *   mean?: number, sigma?: number, sigmaErr?: number, meanErr?: number,
 *   uncorrected?: {mean: number, sigma: number, sigmaErr: number}}>}
 */
export function dispersionByBin(stars, opts = {}) {
  const edges = opts.edges ?? SEGUE_BINS.edges;
  const minStars = opts.minStars ?? KINEMATICS.binMinStars;
  const minSigmas = opts.minSigmas ?? KINEMATICS.binMinSigmas;
  const window = opts.window ?? null;
  const out = [];
  for (let b = 0; b <= edges.length; b++) {
    const members = stars.filter(s => binOf(s.feh, edges) === b);
    const label = SEGUE_BINS.labels[b] ?? `bin ${b + 1}`;
    if (members.length < Math.max(3, minStars)) {
      out.push({
        bin: b,
        label,
        n: members.length,
        status: 'not-constrained',
        reason: `fewer than ${minStars} stars`,
      });
      continue;
    }
    const fit = mleDispersion(members, { window });
    const plain =
      opts.uncorrected === false
        ? null
        : mleDispersion(members, { window: null });
    let status = 'constrained';
    let reason;
    if (fit.atBoundary || !(fit.sigma >= minSigmas * fit.sigmaErr)) {
      status = 'not-constrained';
      reason = 'the dispersion is not above its error (it may be below the measurement errors)';
    }
    out.push({
      bin: b,
      label,
      n: members.length,
      status,
      reason,
      mean: fit.mean,
      meanErr: fit.meanErr,
      sigma: fit.sigma,
      sigmaErr: fit.sigmaErr,
      uncorrected: plain && {
        mean: plain.mean,
        sigma: plain.sigma,
        sigmaErr: plain.sigmaErr,
      },
    });
  }
  return out;
}

// ----- asymmetric drift -------------------------------------------------------------

/**
 * Asymmetric drift as the stated relation <V> = -V_sun - sigma_U^2 / k, fitted to
 * groups of stars: a weighted straight line of each group's mean V against its
 * sigma_U^2. V_sun is minus the intercept (the Sun's V against a population at
 * rest in the LSR), k is minus 1 over the slope, and the slope's constraint is
 * a stated status.
 *
 * @param {Array<Array<{U: number, V: number, W: number}>>} groups
 * @param {{minStars?: number, slopeSigmas?: number}} [opts]
 */
export function driftFit(groups, opts = {}) {
  const minStars = opts.minStars ?? 5;
  const slopeSigmas = opts.slopeSigmas ?? KINEMATICS.slopeSigmas;
  const g = groups
    .map(vs => {
      const n = vs.length;
      if (n < minStars) return null;
      const mu = vs.reduce((a, x) => a + x.U, 0) / n;
      const mv = vs.reduce((a, x) => a + x.V, 0) / n;
      const su2 = vs.reduce((a, x) => a + (x.U - mu) ** 2, 0) / (n - 1);
      const sv2 = vs.reduce((a, x) => a + (x.V - mv) ** 2, 0) / (n - 1);
      return { n, sigmaU2: su2, meanV: mv, err: Math.sqrt(sv2 / n) };
    })
    .filter(Boolean);
  if (g.length < 3)
    return { status: 'refused', why: 'too few groups for the drift fit' };
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const x of g) {
    const w = 1 / (x.err * x.err);
    sw += w;
    sx += w * x.sigmaU2;
    sy += w * x.meanV;
    sxx += w * x.sigmaU2 * x.sigmaU2;
    sxy += w * x.sigmaU2 * x.meanV;
  }
  const det = sw * sxx - sx * sx;
  const slope = (sw * sxy - sx * sy) / det;
  const icpt = (sxx * sy - sx * sxy) / det;
  const slopeErr = Math.sqrt(sw / det);
  const icptErr = Math.sqrt(sxx / det);
  const slopeConstrained = slope < 0 && Math.abs(slope) / slopeErr >= slopeSigmas;
  let chi2 = 0;
  for (const x of g) chi2 += ((x.meanV - icpt - slope * x.sigmaU2) / x.err) ** 2;
  return {
    status: slopeConstrained ? 'constrained' : 'not-constrained',
    vSun: -icpt,
    vSunErr: icptErr,
    slope,
    slopeErr,
    k: slopeConstrained ? -1 / slope : null,
    kErr: slopeConstrained ? slopeErr / (slope * slope) : null,
    covInterceptSlope: -sx / det,
    chi2,
    dof: g.length - 2,
    groups: g,
    assumes: [
      'the relation <V> = -V_sun - sigma_U^2 / k is stated, not derived: groups must differ in dispersion for the slope to be measured',
      'the groups are colour bins of a sample that needs a radial velocity: colour is a stand-in for age, not age',
      'the errors are those of each group’s mean V; the scatter of sigma_U^2 about its true value is not propagated',
    ],
  };
}

/**
 * The two candidate values for the Sun's V against the local standard of rest,
 * both reported and neither chosen (D-GAIA-03): the sample's own Stromberg
 * correction and the independently determined value the register records.
 *
 * @param {Array<{U: number, V: number, W: number}>} velocities
 */
export function lsrOptions(velocities) {
  const m = solarMotion(velocities);
  return {
    chosen: null,
    sampleV: m.V,
    sampleVErr: m.errV,
    options: [
      {
        id: 'stromberg',
        label: 'the sample’s Stromberg correction, sigma_U^2 / 80',
        vSunLsr: m.V - lsrCorrection(m.sigma.U),
        source:
          'the relation of Binney and Tremaine (2008, section 4.8.2) with the stated k = 80 km/s, applied to this sample’s own dispersion',
      },
      {
        id: 'schonrich2010',
        label: 'an independent determination of the Sun’s motion',
        vSunLsr: KINEMATICS.schonrichV,
        source:
          'Schonrich, Binney and Dehnen (2010) as D-GAIA-03 records it; not derived from this sample',
      },
    ],
    note: 'Both values are shown and neither is chosen: the sample cannot decide between them (D-GAIA-03).',
  };
}
