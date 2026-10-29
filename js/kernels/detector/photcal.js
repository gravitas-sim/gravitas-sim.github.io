// =============================================================================
// Photometric calibration: from counts to a catalogue magnitude, through the air
// -----------------------------------------------------------------------------
// Prompt 212, PHOTOMETRIC_CALIBRATION.md. Beside reduce.js, which turns pixels
// into net counts; this turns net counts into a magnitude on a catalogue's
// scale, with the uncertainty the fit leaves.
//
//   instrumental magnitude   m = -2.5 log10(N / t)           (N counts in t seconds)
//   one band's equation      M - m = Z1 - k (X - 1) + c C  [ - k2 C (X - 1) ]
//
// M is a standard star's catalogue magnitude, X its airmass, C its catalogue
// colour index. Z1 is the zero point AT UNIT AIRMASS, the exposure kernel's
// convention (snr.js extinctionMag = k (X - 1)); the zero point outside the
// atmosphere is Z0 = Z1 - k. k is the first-order ATMOSPHERIC extinction in
// magnitudes per airmass; c the colour term; k2 the extinction's own dependence
// on colour (optional). Atmospheric extinction is not the interstellar
// extinction of the radiation kernel: different cause, different units, never
// added to it.
//
// A second equation turns a target's two instrumental magnitudes into a colour:
//   C = mu (b - v) + Zc - kc (X - 1).
//
// The fit is weighted linear least squares, weights 1 / (sigma_m^2 + sigma_M^2),
// solved on column-scaled normal equations (js/numeric/linalg.js). Where the
// chi-square rejects the fit (p < 0.01) the covariance is multiplied by
// chi2 / dof and the interval uses Student's t. A term the data cannot fix is
// reported "not-constrained", never as a zero. A standard above the airmass limit
// is excluded with a flag; a target above it is refused.
//
// Pure: no DOM, no random numbers (the nights come from js/photcalField.js).
// =============================================================================

import { invertSpd, eigenSymmetric } from '../../numeric/linalg.js';
import { chi2Sf, normalQuantile, tQuantile } from '../statistics/special.js';

const { Math, Number, Set, Map } = globalThis;

export const VERSION = '1.0.0';
export const MODEL_ID = 'photometric-calibration/linear';

/** The stated limits (thresholds.json "constants"). */
export const LIMITS = Object.freeze({
  /** Above this airmass the linear law is not trusted: a standard is excluded, a target refused. */
  airmass: 2.5,
  /** Distinct standards a colour term needs. */
  standards: 3,
  /** The airmass span an extinction coefficient needs, and the colour span a colour term needs. */
  airmassSpan: 0.3,
  colourSpan: 0.3,
  /** Distinct standards a second-order extinction needs. */
  secondOrderStandards: 5,
  /** Lack of fit is declared below this chi-square p value. */
  lackOfFitP: 0.01,
  /** The largest colour term a good V-like filter has: the systematic when the term is not constrained. */
  unconstrainedColourSigma: 0.1,
  /** A target this close (airmass) to the standards' mean needs no extinction coefficient. */
  extinctionTolerance: 0.1,
  /** A normalised residual beyond this is flagged, not removed. */
  outlier: 4,
});

/** The levels an interval is given at: one and two standard deviations, as a person reads them. */
export const LEVELS = Object.freeze([0.6827, 0.95]);

/** 2.5 / ln 10: a fractional flux error as a magnitude error. */
export const MAG_PER_FRACTION = 2.5 / Math.LN10;

const refuse = (code, extra = {}) => ({ ok: false, code, ...extra });
const finite = Number.isFinite;

// ---- counts to an instrumental magnitude ----------------------------------------------------------------------

/**
 * The instrumental magnitude of net counts in an exposure, with its error.
 * @param {{counts: number, seconds: number, sigmaCounts?: number}} a
 * @returns {{ok: true, m: number, sigma: number}|{ok: false, code: string}}
 */
export function instrumentalMagnitude({ counts, seconds, sigmaCounts = 0 }) {
  if (!(finite(counts) && counts > 0)) return refuse('non-positive-counts');
  if (!(finite(seconds) && seconds > 0)) return refuse('bad-exposure');
  if (!(finite(sigmaCounts) && sigmaCounts >= 0)) return refuse('bad-sigma');
  return {
    ok: true,
    m: -2.5 * Math.log10(counts / seconds),
    sigma: (MAG_PER_FRACTION * sigmaCounts) / counts,
  };
}

// ---- the weighted linear fit ------------------------------------------------------------------------------

/**
 * Weighted linear least squares y = A theta on column-scaled normal equations.
 * @param {{y: number[], sigma: number[], columns: Array<{name: string, values: number[]}>}} p
 * @returns {{ok: true, theta: number[], cov: number[][], chi2: number, dof: number, residuals: number[], conditioning: number}|{ok: false, code: string}}
 */
export function fitLinear({ y, sigma, columns, groups = null, shared = null }) {
  const n = y.length;
  const p = columns.length;
  if (n < p || p === 0) return refuse('too-few-observations');
  if (groups && shared && shared.some(t => t > 0))
    return fitShared({ y, sigma, columns, groups, shared });
  const w = sigma.map(s => 1 / (s * s));
  const scale = columns.map(c => {
    let s = 0;
    for (let i = 0; i < n; i++) s += w[i] * c.values[i] * c.values[i];
    return Math.sqrt(s);
  });
  if (scale.some(s => !(s > 0))) return refuse('rank-deficient');
  const B = Array.from({ length: p }, () => new Array(p).fill(0));
  const rhs = new Array(p).fill(0);
  for (let i = 0; i < n; i++)
    for (let a = 0; a < p; a++) {
      const ai = (columns[a].values[i] * Math.sqrt(w[i])) / scale[a];
      rhs[a] += ai * (y[i] * Math.sqrt(w[i]));
      for (let b = 0; b <= a; b++)
        B[a][b] += ai * ((columns[b].values[i] * Math.sqrt(w[i])) / scale[b]);
    }
  for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) B[a][b] = B[b][a];
  const values = eigenSymmetric(B).map(e => e.value);
  const conditioning =
    Math.max(...values) / Math.max(Math.min(...values), 1e-300);
  if (!(Math.min(...values) > 1e-12 * Math.max(...values)))
    return refuse('rank-deficient', { conditioning });
  const inv = invertSpd(B);
  if (!inv) return refuse('rank-deficient', { conditioning });
  const thetaScaled = inv.map(row =>
    row.reduce((s, v, j) => s + v * rhs[j], 0)
  );
  const theta = thetaScaled.map((v, a) => v / scale[a]);
  const cov = inv.map((row, a) => row.map((v, b) => v / (scale[a] * scale[b])));
  const residuals = [];
  let chi2 = 0;
  for (let i = 0; i < n; i++) {
    let f = 0;
    for (let a = 0; a < p; a++) f += columns[a].values[i] * theta[a];
    const r = y[i] - f;
    residuals.push(r);
    chi2 += (r * r) / (sigma[i] * sigma[i]);
  }
  return { ok: true, theta, cov, chi2, dof: n - p, residuals, conditioning };
}

/**
 * The same fit when observations of one star share an error: a standard's catalogue magnitude is one number however
 * many times the star was observed, so its error `shared` (the same for every row of a `groups` key) enters every
 * row alike. The observations' covariance is block diagonal, D + tau^2 1 1' per star (D the instrumental variances),
 * and its inverse is D^-1 - tau^2 D^-1 1 1' D^-1 / (1 + tau^2 1' D^-1 1) (the Woodbury identity): generalised least
 * squares without a matrix larger than the number of terms.
 */
function fitShared({ y, sigma, columns, groups, shared }) {
  const n = y.length;
  const p = columns.length;
  const blocks = new Map();
  for (let i = 0; i < n; i++) {
    if (!blocks.has(groups[i])) blocks.set(groups[i], []);
    blocks.get(groups[i]).push(i);
  }
  const N = Array.from({ length: p }, () => new Array(p).fill(0));
  const rhs = new Array(p).fill(0);
  const info = [];
  for (const idx of blocks.values()) {
    const tau2 = shared[idx[0]] ** 2;
    let s = 0;
    for (const i of idx) s += 1 / (sigma[i] * sigma[i]);
    const f = tau2 / (1 + tau2 * s);
    info.push({ idx, f });
    // A' D^-1 A, A' D^-1 y and the rank-one corrections
    const colSum = new Array(p).fill(0);
    let ySum = 0;
    for (const i of idx) {
      const wi = 1 / (sigma[i] * sigma[i]);
      ySum += wi * y[i];
      for (let a = 0; a < p; a++) {
        const ai = columns[a].values[i];
        colSum[a] += wi * ai;
        rhs[a] += wi * ai * y[i];
        for (let b = 0; b <= a; b++) N[a][b] += wi * ai * columns[b].values[i];
      }
    }
    for (let a = 0; a < p; a++) {
      rhs[a] -= f * colSum[a] * ySum;
      for (let b = 0; b <= a; b++) N[a][b] -= f * colSum[a] * colSum[b];
    }
  }
  for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) N[a][b] = N[b][a];
  const scale = N.map((r, a) => Math.sqrt(r[a]));
  if (scale.some(v => !(v > 0))) return refuse('rank-deficient');
  const B = N.map((r, a) => r.map((v, b) => v / (scale[a] * scale[b])));
  const values = eigenSymmetric(B).map(e => e.value);
  const conditioning =
    Math.max(...values) / Math.max(Math.min(...values), 1e-300);
  if (!(Math.min(...values) > 1e-12 * Math.max(...values)))
    return refuse('rank-deficient', { conditioning });
  const inv = invertSpd(B);
  if (!inv) return refuse('rank-deficient', { conditioning });
  const theta = inv.map(
    (row, a) =>
      row.reduce((s, v, j) => s + (v * rhs[j]) / scale[j], 0) / scale[a]
  );
  const cov = inv.map((row, a) => row.map((v, b) => v / (scale[a] * scale[b])));
  const residuals = new Array(n);
  for (let i = 0; i < n; i++) {
    let f = 0;
    for (let a = 0; a < p; a++) f += columns[a].values[i] * theta[a];
    residuals[i] = y[i] - f;
  }
  let chi2 = 0;
  for (const { idx, f } of info) {
    let rr = 0;
    let rs = 0;
    for (const i of idx) {
      const wi = 1 / (sigma[i] * sigma[i]);
      rr += wi * residuals[i] * residuals[i];
      rs += wi * residuals[i];
    }
    chi2 += rr - f * rs * rs;
  }
  return { ok: true, theta, cov, chi2, dof: n - p, residuals, conditioning };
}

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const span = a => (a.length ? Math.max(...a) - Math.min(...a) : 0);

/** The statistic of a finished fit: the p value, the lack-of-fit decision and the scale it asks for. */
function judge(fit) {
  const { chi2, dof } = fit;
  if (!(dof > 0)) return { p: null, lackOfFit: false, scale: 1 };
  const p = chi2Sf(chi2, dof);
  const lackOfFit = chi2 > dof && p < LIMITS.lackOfFitP;
  return { p, lackOfFit, scale: lackOfFit ? chi2 / dof : 1 };
}

// ---- the night's observations: what is usable -------------------------------------------------------------

/**
 * Sort a night's observations into the usable and the excluded, or refuse it.
 * An observation: {id, star?, X, m, sigma, M, sigmaM?, C?, flags?: string[]}.
 * `flags` carries what the photometry tool said of the measurement (`saturated`,
 * `masked`, ...): such a standard is excluded and named, never kept.
 */
function sortObservations(observations, airmassLimit, needColour) {
  if (!Array.isArray(observations) || observations.length === 0)
    return refuse('empty-night');
  const seen = new Set();
  const used = [];
  const flags = [];
  const excluded = [];
  for (const o of observations) {
    if (o == null || typeof o !== 'object') return refuse('bad-input');
    if (seen.has(o.id)) return refuse('duplicate-id', { id: o.id });
    seen.add(o.id);
    const bad =
      !finite(o.m) ||
      !finite(o.M) ||
      !(finite(o.sigma) && o.sigma >= 0) ||
      !(o.sigmaM === undefined || (finite(o.sigmaM) && o.sigmaM >= 0)) ||
      !(finite(o.X) && o.X >= 1) ||
      (needColour && !finite(o.C));
    if (bad) return refuse('bad-input', { id: o.id });
    if (Array.isArray(o.flags) && o.flags.length) {
      excluded.push(o.id);
      flags.push({ code: 'excluded', id: o.id, reason: o.flags.join(',') });
      continue;
    }
    if (o.X > airmassLimit) {
      excluded.push(o.id);
      flags.push({ code: 'airmass-above-limit', id: o.id, airmass: o.X });
      continue;
    }
    used.push(o);
  }
  if (used.length === 0) return refuse('no-usable-standards', { flags });
  return { ok: true, used, flags, excluded };
}

const starOf = o => o.star ?? o.id;

// ---- the night's solution --------------------------------------------------------------------------------

/**
 * Solve one band's equation from a night of standards.
 * @param {object[]} observations
 * @param {object} [options]
 * @param {boolean} [options.second=false] - also fit the colour-dependent extinction k2, if the night constrains it
 * @param {boolean} [options.colour=true] - fit a colour term (false holds c at zero by choice, not by refusal)
 * @param {{k?: number, c?: number, k2?: number}} [options.fixed] - terms held at a stated value, not fitted (sigma 0: exact by decision)
 * @param {number} [options.airmassLimit]
 * @param {{k: number, sigma: number, source?: string}} [options.extinctionPrior] - the site's cited coefficient
 */
export function solveNight(observations, options = {}) {
  const limit = options.airmassLimit ?? LIMITS.airmass;
  const fixed = { ...(options.fixed ?? {}) };
  if (options.colour === false && fixed.c === undefined) fixed.c = 0;
  const wantColour = fixed.c === undefined;
  const sorted = sortObservations(observations, limit, wantColour);
  if (!sorted.ok) return sorted;
  const { used, flags } = sorted;
  const prior = options.extinctionPrior;
  if (prior && !(finite(prior.k) && finite(prior.sigma) && prior.sigma > 0))
    return refuse('bad-prior');

  // Which terms the night can fix.
  const stars = new Map();
  for (const o of used) stars.set(starOf(o), o.C);
  const nStars = stars.size;
  const colours = [...stars.values()].filter(finite);
  const airmasses = used.map(o => o.X);
  const airSpan = span(airmasses);
  const colSpan = span(colours);
  const fixedK = fixed.k !== undefined;
  const useExtinction =
    !fixedK && airSpan >= LIMITS.airmassSpan && used.length >= 2;
  const extinctionStatus = fixedK
    ? 'fixed'
    : useExtinction
      ? 'constrained'
      : prior
        ? 'prior'
        : 'not-constrained';
  let colourStatus = 'constrained';
  let colourWhy = null;
  if (!wantColour) {
    colourStatus = 'fixed';
  } else if (nStars < LIMITS.standards) {
    colourStatus = 'not-constrained';
    colourWhy = 'too-few-standards';
  } else if (colSpan < LIMITS.colourSpan) {
    colourStatus = 'not-constrained';
    colourWhy = 'colour-span-too-small';
  }
  const useColour = colourStatus === 'constrained';
  let secondStatus = 'not-fitted';
  if (fixed.k2 !== undefined) secondStatus = 'fixed';
  else if (options.second) {
    secondStatus =
      useColour && useExtinction && nStars >= LIMITS.secondOrderStandards
        ? 'constrained'
        : 'not-constrained';
  }
  const useSecond = secondStatus === 'constrained';

  const Xmean = mean(airmasses);
  const withK = useExtinction || (Boolean(prior) && !fixedK);
  // Every standard at the zenith: the extinction term vanishes and the zero point is fixed by the night.
  const zenith = !withK && !fixedK && airmasses.every(x => x <= 1 + 1e-9);
  // With no extinction information at all the zero point is fitted at the standards' mean airmass.
  const atMean = !withK && !fixedK && !zenith;
  const xcol = atMean ? airmasses.map(() => 0) : airmasses.map(x => -(x - 1));
  const columns = [{ name: atMean ? 'Zref' : 'Z1', values: used.map(() => 1) }];
  if (withK) columns.push({ name: 'k', values: xcol });
  if (useColour) columns.push({ name: 'c', values: used.map(o => o.C) });
  if (useSecond)
    columns.push({ name: 'k2', values: used.map(o => -o.C * (o.X - 1)) });

  // Terms held at a stated value come off the left side: M - m - (what they contribute).
  const held = o =>
    (fixedK ? -fixed.k * (o.X - 1) : 0) +
    (fixed.c !== undefined ? fixed.c * (o.C ?? 0) : 0) -
    (fixed.k2 !== undefined ? fixed.k2 * (o.C ?? 0) * (o.X - 1) : 0);
  const y = used.map(o => o.M - o.m - held(o));
  // A standard's catalogue error is one number shared by every observation of the star (generalised least squares);
  // `catalogue: 'independent'` is the plainer model, every observation's catalogue error its own.
  const sharedMode = options.catalogue !== 'independent';
  const sigma = used.map(o =>
    sharedMode ? o.sigma : Math.hypot(o.sigma, o.sigmaM ?? 0)
  );
  const rows = { y: y.slice(), sigma: sigma.slice(), columns };
  if (sharedMode) {
    rows.groups = used.map(starOf);
    rows.shared = used.map(o => o.sigmaM ?? 0);
  }
  let priorRow = false;
  if (prior && !useExtinction) {
    // The site's coefficient as one more observation of k: a Gaussian prior.
    priorRow = true;
    rows.y.push(prior.k);
    rows.sigma.push(prior.sigma);
    if (sharedMode) {
      rows.groups.push('\u0000prior');
      rows.shared.push(0);
    }
    for (const c of columns) c.values = [...c.values, c.name === 'k' ? 1 : 0];
  }
  const fit = fitLinear(rows);
  if (!fit.ok) return { ...fit, flags };
  const verdict = judge(fit);
  const cov = fit.cov.map(r => r.map(v => v * verdict.scale));
  const order = columns.map(c => c.name);
  const idx = Object.fromEntries(order.map((n, i) => [n, i]));
  const get = n => (n in idx ? fit.theta[idx[n]] : null);
  const sig = n => (n in idx ? Math.sqrt(cov[idx[n]][idx[n]]) : null);

  const param = (value, sigmaV, status, extra = {}) => ({
    value,
    sigma: sigmaV,
    status,
    ...extra,
  });
  const parameters = {
    Z1: atMean
      ? param(null, null, 'not-constrained')
      : param(get('Z1'), sig('Z1'), 'constrained'),
    k: fixedK
      ? param(fixed.k, 0, 'fixed')
      : withK
        ? param(get('k'), sig('k'), extinctionStatus)
        : param(null, null, 'not-constrained'),
    c: useColour
      ? param(get('c'), sig('c'), 'constrained')
      : param(wantColour ? null : fixed.c, wantColour ? null : 0, colourStatus),
    k2: useSecond
      ? param(get('k2'), sig('k2'), 'constrained')
      : fixed.k2 !== undefined
        ? param(fixed.k2, 0, 'fixed')
        : param(null, null, secondStatus),
  };
  if (!atMean && (withK || fixedK)) {
    const i = idx.Z1;
    const j = idx.k;
    parameters.Z0 = param(
      get('Z1') - parameters.k.value,
      withK
        ? Math.sqrt(cov[i][i] + cov[j][j] - 2 * cov[i][j])
        : Math.sqrt(cov[i][i]),
      'derived'
    );
  }
  const reference =
    atMean || zenith
      ? param(
          get(atMean ? 'Zref' : 'Z1'),
          sig(atMean ? 'Zref' : 'Z1'),
          'constrained',
          {
            airmass: atMean ? Xmean : 1,
          }
        )
      : null;

  // Flags the night itself raises.
  if (verdict.lackOfFit)
    flags.push({ code: 'lack-of-fit', p: verdict.p, scale: verdict.scale });
  if (!(fit.dof > 0)) flags.push({ code: 'no-degrees-of-freedom' });
  if (colourStatus === 'not-constrained')
    flags.push({ code: 'colour-term-not-constrained', reason: colourWhy });
  if (extinctionStatus === 'prior')
    flags.push({ code: 'extinction-from-prior', source: prior.source ?? null });
  if (extinctionStatus === 'not-constrained' && !zenith)
    flags.push({ code: 'extinction-not-constrained' });
  if (secondStatus === 'not-constrained')
    flags.push({ code: 'second-order-not-constrained' });

  const nUsed = used.length;
  // the error each residual is judged against: the instrumental and the catalogue error together
  const total = used.map((o, i) =>
    sharedMode ? Math.hypot(sigma[i], o.sigmaM ?? 0) : sigma[i]
  );
  const residuals = used.map((o, i) => ({
    id: o.id,
    star: starOf(o),
    X: o.X,
    C: o.C ?? null,
    residual: fit.residuals[i],
    sigma: total[i] * Math.sqrt(verdict.scale),
    normalised: fit.residuals[i] / (total[i] * Math.sqrt(verdict.scale)),
  }));
  for (const r of residuals)
    if (Math.abs(r.normalised) > LIMITS.outlier)
      flags.push({ code: 'outlier', id: r.id, normalised: r.normalised });
  const chi2Used = fit.chi2;
  const rms = Math.sqrt(
    residuals.reduce((s, r) => s + r.residual * r.residual, 0) / nUsed
  );
  const colourMean = colours.length ? mean(colours) : null;
  const colourSd = colours.length > 1 ? sd(colours) : 0;
  const result = {
    ok: true,
    version: VERSION,
    model: {
      id: MODEL_ID,
      version: VERSION,
      terms: order.filter(n => n !== 'Zref'),
    },
    options: {
      second: Boolean(options.second),
      colour: wantColour,
      airmassLimit: limit,
      catalogue: sharedMode ? 'shared' : 'independent',
    },
    fixed,
    parameters,
    reference,
    order,
    theta: fit.theta,
    cov,
    chi2: chi2Used,
    dof: fit.dof,
    p: verdict.p,
    lackOfFit: verdict.lackOfFit,
    scale: verdict.scale,
    rms,
    residuals,
    used: used.map(o => o.id),
    excluded: sorted.excluded,
    flags,
    night: {
      standards: nStars,
      observations: nUsed,
      airmassMean: Xmean,
      airmassSpan: airSpan,
      colourMean,
      colourSd,
      colourSpan: colSpan,
      priorRow,
      conditioning: fit.conditioning,
    },
    prior: prior
      ? { k: prior.k, sigma: prior.sigma, source: prior.source ?? null }
      : null,
  };
  // Is a colour-dependent extinction hiding in a first-order fit? The nested model's chi-square drop, on one
  // degree of freedom, says so far more sharply than the first fit's own chi-square (the first fit absorbs part of it).
  if (
    !options.second &&
    !options._nested &&
    fixed.k2 === undefined &&
    useColour &&
    useExtinction &&
    nStars >= LIMITS.secondOrderStandards
  ) {
    const next = solveNight(observations, {
      ...options,
      second: true,
      _nested: true,
    });
    if (next.ok && next.parameters.k2.status === 'constrained') {
      const delta = fit.chi2 - next.chi2;
      const pD = chi2Sf(Math.max(delta, 0), 1);
      result.secondOrder = {
        deltaChi2: delta,
        p: pD,
        k2: next.parameters.k2.value,
        sigma: next.parameters.k2.sigma,
        detected: pD < LIMITS.lackOfFitP,
      };
      if (result.secondOrder.detected)
        flags.push({
          code: 'second-order-extinction-suspected',
          deltaChi2: delta,
          p: pD,
        });
    }
  }
  return result;
}

/** The magnitude equation's regressors for one star at an airmass and colour, in the solution's order. */
function regressors(sol, X, C) {
  return sol.order.map(n =>
    n === 'Z1' || n === 'Zref'
      ? 1
      : n === 'k'
        ? -(X - 1)
        : n === 'c'
          ? C
          : /* k2 */ -C * (X - 1)
  );
}

const quad = (a, S) => {
  let s = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length; j++) s += a[i] * S[i][j] * a[j];
  return s;
};

/** The interval at a level: normal while errors are taken at face value, Student's t when the fit rescaled them. */
export function intervalAt(value, sigmaV, level, dof, rescaled) {
  const p = (1 + level) / 2;
  const q = rescaled && dof > 0 ? tQuantile(p, dof) : normalQuantile(p);
  return { level, lo: value - q * sigmaV, hi: value + q * sigmaV };
}

// ---- the colour equation --------------------------------------------------------------------------------

/**
 * Solve the colour equation C = mu c_inst + Zc - kc (X - 1) from standards observed in two bands.
 * An observation: {id, star?, X, cinst, sigmaInst, C, sigmaC?} with cinst = m_b - m_v. The regression of the catalogue
 * colour on the noisy instrumental one is slightly attenuated; stated, not corrected. The weights take mu as 1.
 */
export function solveColour(observations, options = {}) {
  const limit = options.airmassLimit ?? LIMITS.airmass;
  if (!Array.isArray(observations) || observations.length === 0)
    return refuse('empty-night');
  const used = [];
  const flags = [];
  for (const o of observations) {
    if (
      !(finite(o.cinst) && finite(o.C) && finite(o.X) && o.X >= 1) ||
      !(finite(o.sigmaInst) && o.sigmaInst >= 0)
    )
      return refuse('bad-input', { id: o.id });
    if (o.X > limit) {
      flags.push({ code: 'airmass-above-limit', id: o.id, airmass: o.X });
      continue;
    }
    used.push(o);
  }
  if (used.length < 3) return refuse('too-few-observations', { flags });
  const cs = used.map(o => o.cinst);
  if (span(cs) < LIMITS.colourSpan)
    return refuse('colour-span-too-small', { flags });
  const airSpan = span(used.map(o => o.X));
  const withK = airSpan >= LIMITS.airmassSpan;
  const columns = [
    { name: 'Zc', values: used.map(() => 1) },
    { name: 'mu', values: cs },
  ];
  if (withK) columns.push({ name: 'kc', values: used.map(o => -(o.X - 1)) });
  const sigma = used.map(o => Math.hypot(o.sigmaInst, o.sigmaC ?? 0));
  const fit = fitLinear({ y: used.map(o => o.C), sigma, columns });
  if (!fit.ok) return { ...fit, flags };
  const verdict = judge(fit);
  const cov = fit.cov.map(r => r.map(v => v * verdict.scale));
  if (verdict.lackOfFit)
    flags.push({ code: 'lack-of-fit', p: verdict.p, scale: verdict.scale });
  if (!withK) flags.push({ code: 'extinction-not-constrained' });
  return {
    ok: true,
    order: columns.map(c => c.name),
    theta: fit.theta,
    cov,
    chi2: fit.chi2,
    dof: fit.dof,
    p: verdict.p,
    lackOfFit: verdict.lackOfFit,
    scale: verdict.scale,
    airmassMean: mean(used.map(o => o.X)),
    flags,
    parameters: Object.fromEntries(
      columns.map((c, i) => [
        c.name,
        {
          value: fit.theta[i],
          sigma: Math.sqrt(cov[i][i]),
          status: 'constrained',
        },
      ])
    ),
  };
}

// ---- a calibrated magnitude -----------------------------------------------------------------------------

/**
 * Calibrate a target.
 * @param {object} sol - from solveNight
 * @param {{id?: string, m: number, sigma: number, X: number, C?: number, sigmaC?: number,
 *   bands?: {m: number, sigma: number, solution: object}}} target
 *   `C` the target's colour index (with `sigmaC`), or `bands` an instrumental magnitude in the other band with the
 *   colour equation's solution (the colour is then mu (m_b - m), and the target's own m enters twice); with neither the
 *   colour is the standards' mean, flagged `colour-assumed-typical`, with their spread as its error.
 * @returns {{ok: true, M: number, sigma: number, intervals: object[], flags: object[], parts: object}|{ok: false, code: string}}
 */
export function calibrate(sol, target) {
  if (!sol?.ok) return refuse('no-solution');
  const { id = null, m, sigma, X } = target;
  if (!(finite(m) && finite(sigma) && sigma >= 0 && finite(X) && X >= 1))
    return refuse('bad-input', { id });
  const limit = sol.options.airmassLimit;
  if (X > limit)
    return refuse('airmass-above-limit', { id, airmass: X, limit });
  const flags = [];
  const P = sol.parameters;
  if (
    sol.reference &&
    Math.abs(X - sol.reference.airmass) > LIMITS.extinctionTolerance
  )
    return refuse('extinction-not-constrained', {
      id,
      airmass: X,
      reference: sol.reference.airmass,
    });
  // The colour, its error, and how the target's own magnitude enters the colour.
  let C;
  let sigmaC = 0;
  let dCdm = 0; // d(colour)/d(m): nonzero only for the two-band colour
  let colourVar = 0;
  let colourFrom = 'given';
  if (finite(target.C)) {
    C = target.C;
    sigmaC = finite(target.sigmaC) ? target.sigmaC : 0;
    colourVar = sigmaC * sigmaC;
  } else if (target.bands?.solution?.ok) {
    const cs = target.bands.solution;
    const mu = cs.parameters.mu.value;
    const cinst = target.bands.m - m;
    const a = cs.order.map(n =>
      n === 'Zc' ? 1 : n === 'mu' ? cinst : -(X - 1)
    );
    C = a.reduce((s, v, i) => s + v * cs.theta[i], 0);
    dCdm = -mu;
    // the other band's noise and the colour equation's own parameters; the target's own noise through m below
    colourVar =
      mu * mu * target.bands.sigma * target.bands.sigma + quad(a, cs.cov);
    sigmaC = Math.sqrt(colourVar + mu * mu * sigma * sigma);
    colourFrom = 'two-bands';
  } else {
    C = sol.night.colourMean ?? 0;
    sigmaC = sol.night.colourSd ?? 0;
    colourVar = sigmaC * sigmaC;
    colourFrom = 'assumed';
    flags.push({ code: 'colour-assumed-typical', colour: C, sigma: sigmaC });
  }
  const a = regressors(sol, X, C);
  const fx = sol.fixed ?? {};
  const held =
    (fx.k !== undefined ? -fx.k * (X - 1) : 0) +
    (fx.c !== undefined ? fx.c * C : 0) -
    (fx.k2 !== undefined ? fx.k2 * C * (X - 1) : 0);
  const M0 = m + held + a.reduce((s, v, i) => s + v * sol.theta[i], 0);
  // derivative of M with respect to the colour: c - k2 (X - 1)
  const cTerm =
    P.c.status === 'constrained' || P.c.status === 'fixed'
      ? (P.c.value ?? 0)
      : 0;
  const k2Term =
    P.k2.status === 'constrained' || P.k2.status === 'fixed' ? P.k2.value : 0;
  const dMdC = cTerm - k2Term * (X - 1);
  const scale = sol.scale;
  // the target's own noise scales with the night when the night's errors were rescaled
  // (1 + dM/dC dC/dm)^2: the target's m enters the magnitude directly and, for a two-band colour, through the colour
  const own = scale * sigma * sigma * (1 + dMdC * dCdm) ** 2;
  const paramVar = quad(a, sol.cov);
  const colourPart = dMdC * dMdC * colourVar;
  let systematic = 0;
  if (P.c.status === 'not-constrained') {
    const dC = Math.abs(C - (sol.night.colourMean ?? C));
    systematic = LIMITS.unconstrainedColourSigma * dC;
    flags.push({
      code: 'colour-term-not-constrained',
      reason: 'systematic-added',
      sigma: systematic,
    });
  }
  if (P.k.status === 'prior') flags.push({ code: 'extinction-from-prior' });
  if (sol.lackOfFit) flags.push({ code: 'lack-of-fit', scale });
  const variance = own + paramVar + colourPart + systematic * systematic;
  const sigmaM = Math.sqrt(variance);
  return {
    ok: true,
    id,
    M: M0,
    sigma: sigmaM,
    intervals: LEVELS.map(l =>
      intervalAt(M0, sigmaM, l, sol.dof, sol.lackOfFit)
    ),
    colour: { value: C, sigma: sigmaC, from: colourFrom },
    airmass: X,
    flags,
    parts: {
      own: Math.sqrt(own),
      parameters: Math.sqrt(paramVar),
      colour: Math.sqrt(colourPart),
      systematic,
    },
  };
}

/** The magnitude an instrument would read for a star, from a night's truth: the forward model of the equation. */
export function expectedInstrumental(truth, { M, X, C }) {
  return (
    M -
    (truth.Z1 -
      truth.k * (X - 1) +
      (truth.c ?? 0) * C -
      (truth.k2 ?? 0) * C * (X - 1))
  );
}
