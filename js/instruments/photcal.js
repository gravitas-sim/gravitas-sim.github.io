// =============================================================================
// The calibration's two adapters: the site's cited extinction, and the record
// -----------------------------------------------------------------------------
// siteExtinction reads the instrument library (Prompt 209, js/data/instruments.js)
// for the atmospheric extinction coefficient a site's source states, in
// magnitudes per airmass, with the source it comes from. A site that states none
// (the Las Cumbres sites) returns null: the answer is "not stated", never a
// default and never a zero. extinctionPrior wraps it as the Gaussian prior the
// kernel (js/kernels/detector/photcal.js) takes when a night's airmass span is
// too narrow to fix the coefficient; the table states no uncertainty, so the
// prior's sigma is the caller's and says so.
//
// calibrationRecord writes a solved night and its calibrated targets as a
// gravitas.artifact envelope (Prompt 150): each fitted number with its sigma, a
// term the night left open as a failed quantity that says why (never a zero), the
// calibrated magnitudes with an interval, the fit record with its covariance and
// rank, and the flags as warnings.
//
// This is atmospheric extinction, k, magnitudes per airmass. The radiation
// kernel's interstellar extinction (A_V, R_V) is a different quantity and is not
// read here.
// =============================================================================

import { siteRecord, SOURCES } from './index.js';
import { artifact } from '../platform/artifact.js';
import { LEVELS, MODEL_ID, VERSION } from '../kernels/detector/photcal.js';

/** The prior's sigma when the caller gives none: a stated assumption, as wide as a typical night-to-night scatter. */
export const ASSUMED_PRIOR_SIGMA = 0.05;

/**
 * The extinction coefficient a facility's site states for a band, or null.
 * @param {string} facilityId
 * @param {string} band
 * @returns {{k: number, band: string, unit: 'mag/airmass', source: string, sourceTitle: ?string, at: ?string, note: ?string}|null}
 */
export function siteExtinction(facilityId, band) {
  const site = siteRecord(facilityId);
  const rec = site?.extinction;
  if (!rec) return null;
  const val = 'v' in rec ? rec : rec[band];
  if (!val || val.u !== 'mag/airmass' || !Number.isFinite(val.v)) return null;
  const src = SOURCES[val.s];
  return {
    k: val.v,
    band,
    unit: 'mag/airmass',
    source: val.s,
    sourceTitle: src?.title ?? null,
    at: val.at ?? null,
    note: val.n ?? null,
  };
}

/**
 * The site's coefficient as the kernel's prior, with the prior's sigma marked as the caller's assumption.
 * @returns {{k: number, sigma: number, source: string, assumedSigma: boolean, from: object}|null}
 */
export function extinctionPrior(facilityId, band, sigma) {
  const e = siteExtinction(facilityId, band);
  if (!e) return null;
  return {
    k: e.k,
    sigma: sigma ?? ASSUMED_PRIOR_SIGMA,
    source: e.source,
    assumedSigma: sigma === undefined,
    from: e,
  };
}

// ---- the record -------------------------------------------------------------------------------------------

const PARAM = {
  Z1: { id: 'zero-point', unit: 'mag' },
  k: { id: 'extinction', unit: null },
  c: { id: 'colour-term', unit: '' },
  k2: { id: 'colour-extinction', unit: null },
};

/**
 * A solved night and its calibrated targets as an artifact envelope.
 * @param {object} solution - from solveNight
 * @param {object[]} calibrated - results of calibrate() (refusals are recorded as failed quantities)
 * @param {{id: string, source: {kind?: string, id: string, digest?: string}, citations?: object[], targets?: object[]}} ctx
 */
export function calibrationRecord(solution, calibrated, ctx) {
  const basis = solution.lackOfFit ? 'scaled' : 'data';
  const quantities = [];
  const rank = { free: 0, notConstrained: [] };
  const cited = [...(ctx.citations ?? [])];
  const reasonOf = key =>
    solution.flags.find(f => f.code === `${key}-not-constrained`)?.reason ??
    'the night leaves it open';
  for (const [key, meta] of Object.entries(PARAM)) {
    const p = solution.parameters[key];
    if (!p || (key === 'k2' && p.status === 'not-fitted')) continue;
    if (key === 'c' && p.status === 'fixed') continue;
    rank.free += 1;
    if (p.value === null || p.status === 'not-constrained') {
      rank.notConstrained.push(meta.id);
      quantities.push({
        id: meta.id,
        value: null,
        unit: meta.unit,
        uncertainty: {
          kind: 'failed',
          reason: `not-constrained: ${key === 'c' ? reasonOf('colour-term') : 'the night leaves it open'}`,
        },
        origin: 'fitted',
      });
      continue;
    }
    quantities.push({
      id: meta.id,
      value: p.value,
      unit: meta.unit,
      uncertainty:
        p.status === 'prior'
          ? { kind: 'sigma', sigma: p.sigma, basis: 'assumed' }
          : { kind: 'sigma', sigma: p.sigma, basis },
      origin: p.status === 'prior' ? 'assumed' : 'fitted',
    });
  }
  const fitted = quantities.filter(q => q.value !== null).map(q => q.id);
  if (solution.parameters.Z0 && solution.parameters.Z0.value !== null)
    quantities.push({
      id: 'zero-point-outside-atmosphere',
      value: solution.parameters.Z0.value,
      unit: 'mag',
      uncertainty: {
        kind: 'sigma',
        sigma: solution.parameters.Z0.sigma,
        basis,
      },
      origin: 'derived',
    });
  for (const c of calibrated) {
    const id = `magnitude.${c.id ?? 'target'}`;
    if (!c.ok) {
      quantities.push({
        id,
        value: null,
        unit: 'mag',
        uncertainty: { kind: 'failed', reason: c.code },
        origin: 'derived',
      });
      continue;
    }
    const iv = c.intervals.find(x => x.level === LEVELS[1]) ?? c.intervals[1];
    quantities.push({
      id,
      value: c.M,
      unit: 'mag',
      uncertainty: {
        kind: 'interval',
        lo: iv.lo,
        hi: iv.hi,
        level: iv.level,
        basis,
      },
      origin: 'derived',
    });
  }
  const order = solution.order
    .map(n => (n === 'Zref' ? null : PARAM[n].id))
    .filter(Boolean)
    .filter(id => fitted.includes(id));
  const keep = solution.order
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n !== 'Zref' && fitted.includes(PARAM[n].id));
  const fit =
    keep.length === 0
      ? undefined
      : {
          model: { id: MODEL_ID, version: VERSION },
          parameters: order,
          covariance: {
            order,
            values: keep.map(a => keep.map(b => solution.cov[a.i][b.i])),
            units: keep.map(({ n }) => PARAM[n].unit),
          },
          statistic: {
            name: 'chi-square',
            value: solution.chi2,
            dof: solution.dof,
          },
          residuals: { n: solution.used.length, rms: solution.rms },
          convergence: { converged: true },
          rank: {
            free: rank.free,
            rank: rank.free - rank.notConstrained.length,
            status: rank.notConstrained.length ? 'deficient' : 'full',
            notConstrained: rank.notConstrained,
          },
        };
  const warnings = [
    ...solution.flags.map(f => `${f.code}${f.id ? `:${f.id}` : ''}`),
    ...calibrated.flatMap(c => [
      ...(c.ok ? c.flags : []).map(f => `${f.code}:${c.id ?? 'target'}`),
    ]),
  ];
  return artifact({
    id: ctx.id,
    source: {
      kind: ctx.source?.kind ?? 'forward-model',
      id: ctx.source?.id ?? ctx.id,
      ...(ctx.source?.digest ? { digest: ctx.source.digest } : {}),
    },
    quantities,
    provenance: {
      ...(cited.length ? { citations: cited } : {}),
      reductions: [
        {
          step: 'photometric-calibration',
          version: VERSION,
          note: 'atmospheric (site) extinction in magnitudes per airmass, not the interstellar extinction of the radiation kernel',
        },
      ],
    },
    warnings,
    made: { tool: 'photometric-calibration' },
    ...(fit ? { fit } : {}),
  });
}
