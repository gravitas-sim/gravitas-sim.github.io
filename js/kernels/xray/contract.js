// =============================================================================
// The counts-series contract (Prompt 243, HIGH_ENERGY.md and X_RAY_COUNTS_GATE.md)
// -----------------------------------------------------------------------------
// A series of counts is not a series of fluxes. Before a rate, a hardness ratio or a
// period is computed from one, the series must say what each bin counted and over
// what time it could have counted: the live exposure of every bin, the good-time
// intervals the bins lie in, how dead time was treated, the time system and whether
// the edges are barycentric, the energy bands, and the background. A series that
// does not say is REFUSED, by a code a caller can switch on, and nothing is guessed.
//
//   { format: 'gravitas.counts-series/1', label, synthetic,
//     time: { system, barycentric, epoch },
//     start[], stop[], exposure[],                       seconds since the epoch; live seconds per bin
//     bands: [{ id, lo, hi, unit }],                     ordered by energy, not overlapping
//     counts: { [bandId]: integer[] },                   source region
//     background: { kind: 'region', areaRatio, counts: { [bandId]: integer[] }, exposure? }
//               | { kind: 'rate', rate: { [bandId]: c/s in the source region } }
//               | { kind: 'none', negligible: true },
//     deadTime: { kind: 'in-exposure' } | { kind: 'fraction', fraction[] },
//     gti: [[start, stop], ...] }
//
// The contract names no instrument and no archive: it is the set of statements a
// product's documentation must make before this kernel will use the product.
// =============================================================================

import { refused } from '../statistics/check.js';

const { Math, Number, Float64Array, Array } = globalThis;

export const FORMAT = 'gravitas.counts-series/1';
export const TIME_SYSTEMS = Object.freeze(['TDB', 'TT', 'UTC', 'MET']);

/** Every code a refusal of this kernel carries. */
export const REFUSAL_CODES = Object.freeze([
  'format',
  'noGti',
  'gtiInvalid',
  'timeSystem',
  'bins',
  'binOutsideGti',
  'exposure',
  'exposureBeyondGti',
  'deadTime',
  'counts',
  'bands',
  'background',
  'notBarycentric',
  'undersampled',
  'simulations',
  'noCounts',
  'bandsNeeded',
  'noQuietLevel',
  'tooFew',
  'tooLarge',
]);

const isNum = Number.isFinite;
const isCount = v => Number.isInteger(v) && v >= 0;
const asArray = v => (Array.isArray(v) || ArrayBuffer.isView(v) ? v : null);

/** Seconds of [a, b] inside the good-time intervals (ordered, not overlapping). */
function overlapWithGti(a, b, gti) {
  let s = 0;
  for (let k = 0; k < gti.length; k++) {
    const lo = Math.max(a, gti[k][0]);
    const hi = Math.min(b, gti[k][1]);
    if (hi > lo) s += hi - lo;
  }
  return s;
}

/**
 * Check a counts series against the contract. On success the record carries a
 * normalised view (typed arrays, a live mask, band lists) that every other entry point
 * of the kernel reads; on failure a refusal { status: 'refused', code, why }.
 */
export function validateSeries(series) {
  if (!series || typeof series !== 'object' || series.format !== FORMAT)
    return refused('format', `the series' format is not ${FORMAT}`);
  if (series.synthetic === true && typeof series.label !== 'string')
    return refused('format', 'a synthetic series must carry its label');

  const time = series.time;
  if (!time || !TIME_SYSTEMS.includes(time.system))
    return refused(
      'timeSystem',
      `the time system is not stated as one of ${TIME_SYSTEMS.join(', ')}`
    );
  if (typeof time.barycentric !== 'boolean')
    return refused(
      'timeSystem',
      'whether the bin edges are barycentric is not stated (true or false)'
    );

  const gti = series.gti;
  if (!Array.isArray(gti) || gti.length === 0)
    return refused(
      'noGti',
      'the series has no good-time intervals; a counts series without them cannot say when the detector was looking'
    );
  for (let k = 0; k < gti.length; k++) {
    const g = gti[k];
    if (!Array.isArray(g) || g.length !== 2 || !isNum(g[0]) || !isNum(g[1]))
      return refused(
        'gtiInvalid',
        `good-time interval ${k + 1} is not a pair of numbers`
      );
    if (!(g[1] > g[0]))
      return refused('gtiInvalid', `good-time interval ${k + 1} has no length`);
    if (k > 0 && g[0] < gti[k - 1][1])
      return refused(
        'gtiInvalid',
        `good-time intervals ${k} and ${k + 1} are out of order or overlap`
      );
  }

  const start = asArray(series.start);
  const stop = asArray(series.stop);
  if (!start || !stop || start.length !== stop.length || start.length < 1)
    return refused('bins', 'the bin edges are missing or of different lengths');
  const n = start.length;
  const exposure = asArray(series.exposure);
  if (!exposure)
    return refused(
      'exposure',
      'the exposure (live seconds) of every bin is not given'
    );
  if (exposure.length !== n)
    return refused(
      'bins',
      'the exposure array does not have one value per bin'
    );
  for (let i = 0; i < n; i++) {
    if (!isNum(start[i]) || !isNum(stop[i]) || !(stop[i] > start[i]))
      return refused(
        'bins',
        `bin ${i + 1} does not have finite edges with stop after start`
      );
    if (i > 0 && start[i] < stop[i - 1] - 1e-9 * (stop[i - 1] - start[i - 1]))
      return refused(
        'bins',
        `bins ${i} and ${i + 1} are out of order or overlap`
      );
    if (!isNum(exposure[i]) || exposure[i] < 0)
      return refused(
        'exposure',
        `the exposure of bin ${i + 1} is not 0 or more`
      );
  }

  const bands = series.bands;
  if (!Array.isArray(bands) || bands.length < 1)
    return refused('bands', 'no energy band is stated');
  const ids = [];
  for (let k = 0; k < bands.length; k++) {
    const b = bands[k];
    if (!b || typeof b.id !== 'string' || ids.includes(b.id))
      return refused('bands', `band ${k + 1} has no unique id`);
    if (
      !isNum(b.lo) ||
      !isNum(b.hi) ||
      !(b.hi > b.lo) ||
      typeof b.unit !== 'string'
    )
      return refused('bands', `band ${b.id} has no energy range and unit`);
    if (b.unit !== bands[0].unit)
      return refused('bands', 'the bands do not share one energy unit');
    if (k > 0 && b.lo < bands[k - 1].hi)
      return refused(
        'bands',
        `bands ${bands[k - 1].id} and ${b.id} overlap or are not ordered by energy`
      );
    ids.push(b.id);
  }

  const counts = {};
  for (const id of ids) {
    const c = asArray(series.counts?.[id]);
    if (!c || c.length !== n)
      return refused(
        'counts',
        `band ${id} has no counts array with one value per bin`
      );
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (!isCount(c[i]))
        return refused(
          'counts',
          `a count in band ${id} (bin ${i + 1}) is not a whole number of 0 or more`
        );
      out[i] = c[i];
    }
    counts[id] = out;
  }

  const live = new Uint8Array(n);
  const width = new Float64Array(n);
  const expo = new Float64Array(n);
  const overlap = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    width[i] = stop[i] - start[i];
    expo[i] = exposure[i];
    if (expo[i] === 0) {
      for (const id of ids)
        if (counts[id][i] > 0)
          return refused('exposure', `bin ${i + 1} has counts but no exposure`);
      continue;
    }
    overlap[i] = overlapWithGti(start[i], stop[i], gti);
    if (!(overlap[i] > 0))
      return refused(
        'binOutsideGti',
        `bin ${i + 1} has exposure but lies outside every good-time interval`
      );
    if (expo[i] > overlap[i] + 1e-9 * width[i])
      return refused(
        'exposureBeyondGti',
        `the exposure of bin ${i + 1} exceeds its overlap with the good-time intervals`
      );
    live[i] = 1;
  }

  const dt = series.deadTime;
  if (!dt || (dt.kind !== 'in-exposure' && dt.kind !== 'fraction'))
    return refused(
      'deadTime',
      "the dead-time treatment is not stated ('in-exposure' or 'fraction')"
    );
  if (dt.kind === 'fraction') {
    const f = asArray(dt.fraction);
    if (!f || f.length !== n)
      return refused(
        'deadTime',
        'the dead-time fractions do not have one value per bin'
      );
    for (let i = 0; i < n; i++) {
      if (!isNum(f[i]) || f[i] < 0 || f[i] >= 1)
        return refused(
          'deadTime',
          `the dead-time fraction of bin ${i + 1} is not in [0, 1)`
        );
      if (
        live[i] &&
        Math.abs(expo[i] - overlap[i] * (1 - f[i])) > 1e-6 * width[i]
      )
        return refused(
          'deadTime',
          `the dead-time fraction of bin ${i + 1} does not reproduce its exposure from the good-time overlap`
        );
    }
  }

  const bk = series.background;
  let background;
  if (!bk || typeof bk !== 'object')
    return refused('background', 'the background is not stated');
  if (bk.kind === 'none') {
    if (bk.negligible !== true)
      return refused(
        'background',
        "'none' must say negligible: true, and the caller owns the claim"
      );
    background = { kind: 'none' };
  } else if (bk.kind === 'rate') {
    const rate = {};
    for (const id of ids) {
      if (!isNum(bk.rate?.[id]) || bk.rate[id] < 0)
        return refused(
          'background',
          `the background rate of band ${id} is not 0 or more`
        );
      rate[id] = bk.rate[id];
    }
    background = { kind: 'rate', rate };
  } else if (bk.kind === 'region') {
    if (!isNum(bk.areaRatio) || !(bk.areaRatio > 0))
      return refused(
        'background',
        'the area ratio of the source to the background region is not positive'
      );
    const bc = {};
    for (const id of ids) {
      const c = asArray(bk.counts?.[id]);
      if (!c || c.length !== n)
        return refused(
          'background',
          `band ${id} has no background counts with one value per bin`
        );
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        if (!isCount(c[i]))
          return refused(
            'background',
            `a background count in band ${id} (bin ${i + 1}) is not a whole number of 0 or more`
          );
        out[i] = c[i];
      }
      bc[id] = out;
    }
    let bexp = expo;
    if (bk.exposure !== undefined) {
      const e = asArray(bk.exposure);
      if (!e || e.length !== n)
        return refused(
          'background',
          'the background exposure does not have one value per bin'
        );
      bexp = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        if (!isNum(e[i]) || e[i] < 0 || (live[i] && !(e[i] > 0)))
          return refused(
            'background',
            `the background exposure of bin ${i + 1} is not positive`
          );
        bexp[i] = e[i];
      }
    }
    background = {
      kind: 'region',
      areaRatio: bk.areaRatio,
      counts: bc,
      exposure: bexp,
    };
  } else
    return refused(
      'background',
      "the background kind is 'region', 'rate' or 'none'"
    );

  const nLive = live.reduce((a, b) => a + b, 0);
  return {
    status: 'ok',
    n,
    nLive,
    start: Float64Array.from(start),
    stop: Float64Array.from(stop),
    width,
    exposure: expo,
    live,
    bands: bands.map(b => ({ id: b.id, lo: b.lo, hi: b.hi, unit: b.unit })),
    bandIds: ids,
    counts,
    background,
    gti: gti.map(g => [g[0], g[1]]),
    time: {
      system: time.system,
      barycentric: time.barycentric,
      epoch: time.epoch ?? null,
    },
    synthetic: series.synthetic === true,
    label: typeof series.label === 'string' ? series.label : null,
  };
}

/** Carry the synthetic flag and label onto a result record (a result never loses them). */
export function stamp(result, view) {
  if (result?.status === 'ok' && view?.synthetic) {
    result.synthetic = true;
    result.label = view.label;
  }
  return result;
}

/**
 * The counts of a band choice per bin: a band id, or 'total' for the sum of all bands,
 * or a list of ids. Returns a Float64Array of the source-region counts, and the background
 * region's counts when the background is a region.
 */
export function bandCounts(view, band = 'total') {
  const ids =
    band === 'total' ? view.bandIds : Array.isArray(band) ? band : [band];
  for (const id of ids)
    if (!view.counts[id])
      return refused('bands', `band ${id} is not in the series`);
  const n = view.n;
  const src = new Float64Array(n);
  for (const id of ids)
    for (let i = 0; i < n; i++) src[i] += view.counts[id][i];
  let bkg = null;
  if (view.background.kind === 'region') {
    bkg = new Float64Array(n);
    for (const id of ids)
      for (let i = 0; i < n; i++) bkg[i] += view.background.counts[id][i];
  }
  return { status: 'ok', ids, src, bkg };
}
