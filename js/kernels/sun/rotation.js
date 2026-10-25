// =============================================================================
// Solar kernel: rotation from tracked spots, bounded by the tracers available
// -----------------------------------------------------------------------------
// (Prompt 194, SUN_KERNEL.md.) Three things:
//
//   trackRotation   tracked spot positions in frames with their own P, B0, L0 give
//                   the synodic and the sidereal rate and period, each with an
//                   uncertainty, a warning near the limb and refusals
//   fitRotationLaw  rates at stated latitudes against the fixed-form law
//                   omega = A + B sin^2 + C sin^4: only the coefficients named free
//                   are fitted (default only A), never more of them than there
//                   are distinct latitudes
//   compareToLaw    one tracer's rate against the law, no fit
//
// The coefficients are data, with a citation and `checked: false` (typed from the
// publications, not re-read at their source). Nothing here fits an unrestricted
// latitude law. Times are UT Julian dates; rates are degrees per day.
// =============================================================================

import { apparentSun } from '../sky/solar.js';
import { ttFromUt } from '../sky/time.js';
import { refused } from '../statistics/check.js';
import { CARRINGTON_SIDEREAL_DEG_PER_DAY, subEarth } from './ephemeris.js';
import { diskToHeliographic, positionSigma } from './geometry.js';

const { Math, Number } = globalThis;
const DEG = Math.PI / 180;
const finite = Number.isFinite;

/** Degrees per day in one microradian per second. */
const URAD_S = (86400e-6 * 180) / Math.PI;

/**
 * Reference laws, omega(phi) = A + B sin^2(phi) + C sin^4(phi), sidereal degrees
 * per day, from the cited microradian-per-second coefficients. Both carry
 * `checked: false`: typed by the session that built the kernel from the
 * publications, not re-read. The first is the primary; the pair's difference is
 * the tracer systematic a single-law comparison carries.
 */
export const LAWS = Object.freeze({
  howard1990: Object.freeze({
    id: 'howard1990',
    A: 2.894 * URAD_S,
    B: -0.428 * URAD_S,
    C: -0.37 * URAD_S,
    unit: 'degree/day, sidereal',
    tracer: 'small magnetic features, not sunspots (a few percent apart)',
    citation:
      'Howard, Harvey and Forgach 1990, Solar Physics 130, 295: 2.894, -0.428, -0.370 microradian/s',
    checked: false,
  }),
  snodgrass1990: Object.freeze({
    id: 'snodgrass1990',
    A: 2.851 * URAD_S,
    B: -0.343 * URAD_S,
    C: -0.474 * URAD_S,
    unit: 'degree/day, sidereal',
    tracer: 'Doppler features in the photosphere',
    citation:
      'Snodgrass and Ulrich 1990, Astrophysical Journal 351, 309: 2.851, -0.343, -0.474 microradian/s',
    checked: false,
  }),
});
export const PRIMARY_LAW = LAWS.howard1990;

/** The spread among groups' rates about the law, degrees per day. */
export const GROUP_SCATTER_FLOOR = 0.3;
/** The annual precession in longitude, degrees per day (5028.796 arcsec per century). */
export const PRECESSION_DEG_PER_DAY = 5028.796195 / 3600 / 36525;
/** The stated accuracy of the Earth's rate from the sky kernel's Sun, degrees per day. */
export const EARTH_RATE_SIGMA = 5e-4;
const Z95 = 1.959964;
const MU_WARN = 0.35;
const MU_MIN = 0.1;
const MIN_POINTS = 3;
const REL_SIGMA_REFUSE = 0.5;
const DEFAULT_SIGMA_PX = 1;

/** The law's sidereal rate at a latitude, degrees per day. */
export function lawRate(latDeg, law = PRIMARY_LAW) {
  const s2 = Math.sin(latDeg * DEG) ** 2;
  return law.A + law.B * s2 + law.C * s2 * s2;
}

/** The two published laws' difference at a latitude (the tracer systematic). */
export const tracerSpread = latDeg =>
  Math.abs(
    lawRate(latDeg, LAWS.howard1990) - lawRate(latDeg, LAWS.snodgrass1990)
  );

/** The Earth's mean heliocentric rate over a window of UT Julian dates, degrees per day, sidereal. */
export function earthOrbitalRate(jdUt0, jdUt1) {
  const span = jdUt1 - jdUt0;
  const n = Math.max(1, Math.ceil(Math.abs(span) / 20));
  let total = 0;
  let prev = apparentSun(ttFromUt(jdUt0)).longitudeDeg;
  for (let i = 1; i <= n; i++) {
    const cur = apparentSun(ttFromUt(jdUt0 + (span * i) / n)).longitudeDeg;
    total += ((((cur - prev) % 360) + 540) % 360) - 180;
    prev = cur;
  }
  return total / span - PRECESSION_DEG_PER_DAY;
}

/**
 * The Earth's mean rate along the solar equator over a window, degrees per day,
 * sidereal: the turn of the sub-Earth point's longitude measured from the node of
 * the solar equator, dL0/dt plus Carrington's 360 / 25.38. The solar equator is
 * inclined 7.25 degrees to the ecliptic, so this differs from the ecliptic rate
 * by up to 0.8 percent (0.008 degree a day), and it is the rate the Stonyhurst
 * longitude of a feature actually loses: the sidereal correction uses it.
 */
export function earthRateInSolarEquator(jdUt0, jdUt1) {
  const span = jdUt1 - jdUt0;
  const n = Math.max(1, Math.ceil(Math.abs(span) / 10));
  let total = 0;
  let prev = subEarth(jdUt0).l0Deg;
  for (let i = 1; i <= n; i++) {
    const cur = subEarth(jdUt0 + (span * i) / n).l0Deg;
    total += ((((cur - prev) % 360) + 540) % 360) - 180;
    prev = cur;
  }
  return total / span + CARRINGTON_SIDEREAL_DEG_PER_DAY;
}

/** A synodic rate from a sidereal one given the Earth's rate over the window. */
export const synodicFromSidereal = (sidereal, earthRate) =>
  sidereal - earthRate;
/** A sidereal rate from a synodic one. */
export const siderealFromSynodic = (synodic, earthRate) => synodic + earthRate;
/** The period in days of a rate in degrees per day (null if it does not turn). */
export const periodDays = rate => (rate > 0 ? 360 / rate : null);

const bounds = (rate, sigma) => {
  const lo = rate - Z95 * sigma;
  const hi = rate + Z95 * sigma;
  return {
    periodLo: hi > 0 ? 360 / hi : null,
    periodHi: lo > 0 ? 360 / lo : null,
  };
};

/** Weighted least-squares line y = a + b t; the slope's sigma is without the Birge ratio. */
function wls(t, y, w) {
  let sw = 0;
  let st = 0;
  let sy = 0;
  for (let i = 0; i < t.length; i++) {
    sw += w[i];
    st += w[i] * t[i];
    sy += w[i] * y[i];
  }
  const tb = st / sw;
  const yb = sy / sw;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < t.length; i++) {
    sxx += w[i] * (t[i] - tb) ** 2;
    sxy += w[i] * (t[i] - tb) * (y[i] - yb);
  }
  const slope = sxy / sxx;
  const intercept = yb - slope * tb;
  let chi2 = 0;
  for (let i = 0; i < t.length; i++)
    chi2 += w[i] * (y[i] - intercept - slope * t[i]) ** 2;
  return { slope, intercept, sigma: Math.sqrt(1 / sxx), chi2 };
}

/**
 * A spot's tracked positions to its rotation. `points` is a list of
 * { jd, x, y, sigmaPx?, disk } (disk: cx, cy, radiusPx, pDeg, b0Deg, l0Deg,
 * distanceAu?). Returns the synodic and sidereal rate with sigma and period, the
 * Carrington-frame route as a check, the mean latitude, the points' converted
 * positions, the warnings, and `precise` (false whenever any point is within
 * mu 0.35 of the limb: foreshortening). Refuses with a code, never a number.
 */
export function trackRotation(points, opts = {}) {
  const law = opts.law ?? PRIMARY_LAW;
  if (!Array.isArray(points) || points.length < MIN_POINTS)
    return refused(
      'too-few',
      `a rotation needs at least ${MIN_POINTS} positions`
    );
  const used = [];
  let excluded = 0;
  for (const p of points) {
    if (!p || !finite(p.jd))
      return refused('bad-time', 'a position has no time');
    const sigmaPx = p.sigmaPx ?? opts.sigmaPx ?? DEFAULT_SIGMA_PX;
    if (!(finite(sigmaPx) && sigmaPx > 0))
      return refused('bad-sigma', 'a placement sigma is not a positive number');
    const pos = diskToHeliographic(p.x, p.y, p.disk);
    if (pos.status === 'refused') return pos;
    if (pos.mu < MU_MIN) {
      excluded++;
      continue;
    }
    const sg = positionSigma(p.x, p.y, p.disk, sigmaPx);
    used.push({
      jd: p.jd,
      ...pos,
      sigmaLonDeg: Math.max(sg.sigmaLonDeg, 1e-9),
      sigmaLatDeg: Math.max(sg.sigmaLatDeg, 1e-9),
    });
  }
  if (used.length < MIN_POINTS)
    return refused(
      excluded > 0 ? 'limb' : 'too-few',
      excluded > 0
        ? `${excluded} position(s) are within mu ${MU_MIN} of the limb and are not used; ${used.length} remain`
        : 'too few usable positions'
    );
  const jds = used.map(u => u.jd);
  const jd0 = Math.min(...jds);
  const jd1 = Math.max(...jds);
  if (!(jd1 > jd0))
    return refused('bad-time', 'all the positions are at one time');
  const t = jds.map(j => j - jd0);
  const w = used.map(u => 1 / u.sigmaLonDeg ** 2);
  const fit = wls(
    t,
    used.map(u => u.lonStonyDeg),
    w
  );
  const dof = used.length - 2;
  const birge = Math.max(1, fit.chi2 / dof);
  const sigSyn = fit.sigma * Math.sqrt(birge);
  if (
    !(Math.abs(fit.slope) > 0) ||
    sigSyn > REL_SIGMA_REFUSE * Math.abs(fit.slope)
  )
    return refused(
      'not-constrained',
      'the rate is not constrained by these positions (its sigma exceeds half its size)'
    );
  const earthEcliptic = earthOrbitalRate(jd0, jd1);
  const earth = earthRateInSolarEquator(jd0, jd1);
  const sidRate = siderealFromSynodic(fit.slope, earth);
  const sigSid = Math.hypot(sigSyn, EARTH_RATE_SIGMA);
  // The Carrington route: the longitude in the rotating frame, unwrapped.
  const lonC = [];
  let prev = used[0].lonCarringtonDeg;
  for (const u of used) {
    prev += ((((u.lonCarringtonDeg - prev) % 360) + 540) % 360) - 180;
    lonC.push(prev);
  }
  const fitC = wls(t, lonC, w);
  const sidC = fitC.slope + CARRINGTON_SIDEREAL_DEG_PER_DAY;
  const sigC = fitC.sigma * Math.sqrt(Math.max(1, fitC.chi2 / dof));
  // the mean latitude, weighted
  let sw = 0;
  let sl = 0;
  for (const u of used) {
    const wl = 1 / u.sigmaLatDeg ** 2;
    sw += wl;
    sl += wl * u.latDeg;
  }
  const latMean = sl / sw;
  const latSd = Math.sqrt(
    used.reduce((a, u) => a + (u.latDeg - latMean) ** 2, 0) / (used.length - 1)
  );
  const warnings = [];
  if (used.some(u => u.mu < MU_WARN))
    warnings.push({
      code: 'foreshortening',
      why: `a position is within mu ${MU_WARN} of the limb: a pixel there is many degrees of longitude, so the uncertainty is widened and the rate is not precise`,
    });
  if (excluded > 0)
    warnings.push({
      code: 'limb-excluded',
      why: `${excluded} position(s) within mu ${MU_MIN} of the limb were left out`,
    });
  return {
    n: points.length,
    nUsed: used.length,
    excluded,
    jd0,
    jd1,
    synodic: {
      rate: fit.slope,
      sigma: sigSyn,
      period: periodDays(fit.slope),
      ...bounds(fit.slope, sigSyn),
    },
    earthRate: earth,
    earthRateEcliptic: earthEcliptic,
    sidereal: {
      rate: sidRate,
      sigma: sigSid,
      period: periodDays(sidRate),
      ...bounds(sidRate, sigSid),
    },
    carringtonRoute: {
      siderealRate: sidC,
      sigma: sigC,
      differenceFromSynodicRoute: sidC - sidRate,
    },
    latitude: { deg: latMean, sdDeg: latSd },
    chi2: fit.chi2,
    dof,
    birge,
    precise: warnings.every(x => x.code !== 'foreshortening'),
    warnings,
    law: compareToLaw({ latDeg: latMean, rate: sidRate, sigma: sigSid }, law),
    points: used.map((u, i) => ({
      jd: u.jd,
      latDeg: u.latDeg,
      lonStonyDeg: u.lonStonyDeg,
      lonCarringtonDeg: u.lonCarringtonDeg,
      mu: u.mu,
      sigmaLonDeg: u.sigmaLonDeg,
      residualDeg: u.lonStonyDeg - fit.intercept - fit.slope * t[i],
    })),
  };
}

const checkLaw = law =>
  Boolean(law) && finite(law.A) && finite(law.B) && finite(law.C);

/**
 * One tracer {latDeg, rate, sigma} (sidereal degrees per day) against the law,
 * no fit: the prediction, the difference, and its z against the fit's sigma
 * and the group-to-group scatter floor (0.3 degrees per day) in quadrature.
 */
export function compareToLaw(
  tracer,
  law = PRIMARY_LAW,
  floor = GROUP_SCATTER_FLOOR
) {
  if (!checkLaw(law)) return refused('bad-law', 'the law needs A, B and C');
  const { latDeg, rate, sigma } = tracer ?? {};
  if (!(finite(latDeg) && Math.abs(latDeg) <= 90 && finite(rate)))
    return refused('bad-law', 'the tracer needs a latitude and a rate');
  if (!(finite(sigma) && sigma > 0))
    return refused('bad-sigma', 'the tracer sigma is not a positive number');
  const predicted = lawRate(latDeg, law);
  const sigmaTotal = Math.hypot(sigma, floor);
  const difference = rate - predicted;
  return {
    predicted,
    difference,
    sigmaFit: sigma,
    sigmaTotal,
    z: difference / sigmaTotal,
    agrees: Math.abs(difference) <= 2 * sigmaTotal,
    spreadAmongLaws: tracerSpread(latDeg),
  };
}

const BASIS = Object.freeze({
  A: () => 1,
  B: s2 => s2,
  C: s2 => s2 * s2,
});

/** Solve the small system M x = v by Gauss-Jordan with partial pivoting; also returns M^-1. */
function solve(M, v) {
  const n = v.length;
  const a = M.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    v[i],
  ]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-300) return null;
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c];
    for (let k = 0; k < a[c].length; k++) a[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let k = 0; k < a[r].length; k++) a[r][k] -= f * a[c][k];
    }
  }
  return {
    x: a.map(row => row[2 * n]),
    inverse: a.map(row => row.slice(n, 2 * n)),
  };
}

/**
 * Tracers {latDeg, rate, sigma} against the fixed-form law, fitting only the
 * coefficients named in `opts.free` (a subset of A, B, C; default ['A']) with the
 * rest held at the law's. Refuses when more coefficients are free than there are
 * distinct latitudes: two latitudes cannot determine three coefficients. When the
 * number free equals the number of observations the solution is exact (zeroDof)
 * and carries no goodness of fit.
 */
export function fitRotationLaw(tracers, opts = {}) {
  const law = opts.law ?? PRIMARY_LAW;
  if (!checkLaw(law)) return refused('bad-law', 'the law needs A, B and C');
  const free = opts.free ?? ['A'];
  if (
    !Array.isArray(free) ||
    free.length === 0 ||
    new Set(free).size !== free.length ||
    free.some(k => !(k in BASIS))
  )
    return refused(
      'bad-free',
      'the free coefficients must be a non-empty subset of A, B, C'
    );
  if (!Array.isArray(tracers) || tracers.length === 0)
    return refused('too-few', 'there are no tracers');
  const rows = [];
  for (const t of tracers) {
    if (!t || !finite(t.latDeg) || Math.abs(t.latDeg) > 90 || !finite(t.rate))
      return refused('bad-law', 'a tracer needs a latitude and a rate');
    if (!(finite(t.sigma) && t.sigma > 0))
      return refused('bad-sigma', 'a tracer sigma is not a positive number');
    rows.push({
      latDeg: t.latDeg,
      rate: t.rate,
      s2: Math.sin(t.latDeg * DEG) ** 2,
      w: 1 / t.sigma ** 2,
    });
  }
  const distinct = [];
  for (const r of rows)
    if (!distinct.some(s => Math.abs(s - r.s2) <= 1e-3)) distinct.push(r.s2);
  if (free.length > distinct.length)
    return refused(
      'under-determined',
      `${free.length} coefficients are free but the tracers span ${distinct.length} distinct latitude(s): ${distinct.length} latitudes cannot determine ${free.length} coefficients`
    );
  const fixedPart = s2 =>
    ['A', 'B', 'C']
      .filter(k => !free.includes(k))
      .reduce((a, k) => a + law[k] * BASIS[k](s2), 0);
  const p = free.length;
  const M = Array.from({ length: p }, () => new Array(p).fill(0));
  const v = new Array(p).fill(0);
  for (const r of rows) {
    const b = free.map(k => BASIS[k](r.s2));
    const y = r.rate - fixedPart(r.s2);
    for (let i = 0; i < p; i++) {
      v[i] += r.w * b[i] * y;
      for (let j = 0; j < p; j++) M[i][j] += r.w * b[i] * b[j];
    }
  }
  const sol = solve(M, v);
  if (!sol)
    return refused(
      'under-determined',
      'the latitudes do not separate the coefficients'
    );
  const values = Object.fromEntries(['A', 'B', 'C'].map(k => [k, law[k]]));
  free.forEach((k, i) => {
    values[k] = sol.x[i];
  });
  let chi2 = 0;
  const residuals = rows.map(r => {
    const predicted = values.A + values.B * r.s2 + values.C * r.s2 * r.s2;
    chi2 += r.w * (r.rate - predicted) ** 2;
    return {
      latDeg: r.latDeg,
      rate: r.rate,
      predicted,
      residual: r.rate - predicted,
      z: (r.rate - predicted) * Math.sqrt(r.w),
    };
  });
  const dof = rows.length - p;
  const birge = dof > 0 ? Math.max(1, chi2 / dof) : 1;
  const params = {};
  free.forEach((k, i) => {
    const sigma = Math.sqrt(sol.inverse[i][i] * birge);
    params[k] = {
      value: sol.x[i],
      sigma,
      lo: sol.x[i] - Z95 * sigma,
      hi: sol.x[i] + Z95 * sigma,
    };
  });
  const warnings = [];
  if (p >= 2)
    warnings.push({
      code: 'correlated',
      why: 'the coefficients are strongly correlated over a few latitudes: read the combination, not each one',
    });
  return {
    law: law.id,
    free,
    fixed: Object.fromEntries(
      ['A', 'B', 'C'].filter(k => !free.includes(k)).map(k => [k, law[k]])
    ),
    params,
    values,
    chi2: dof > 0 ? chi2 : null,
    dof,
    birge,
    zeroDof: dof <= 0,
    nLatitudes: distinct.length,
    residuals,
    warnings,
  };
}
