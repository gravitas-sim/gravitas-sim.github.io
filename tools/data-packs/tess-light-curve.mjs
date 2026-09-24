// =============================================================================
// A TESS SPOC light curve, reduced to a binned series a lesson can carry
// -----------------------------------------------------------------------------
// Pure: FITS units in (tools/data-packs/fits.mjs), the encoded series and a
// record of what was dropped out. No file system, no network - the build tool
// fetches and pins, this only transforms, so a test can hand it a synthetic
// FITS file and the same function makes the committed pack from the real one.
//
// What is done, in order, and nothing else:
//   1. The LIGHTCURVE table's TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR and QUALITY.
//   2. Cadences kept only where QUALITY is 0 and time, flux and error are all
//      finite numbers.
//   3. Flux and error divided by the median flux of the kept cadences.
//   4. Averaged into equal bins of `binMinutes` counted from t0, the first kept
//      time rounded down to a bin; a bin with fewer than `minPerBin` cadences
//      is dropped, and the bin error is the quadrature sum over the count.
//   5. Stored as `binned-relative-flux/1` (js/observation.js): bins as runs of
//      consecutive indices, flux as little-endian int16 parts per million
//      about 1, error as one byte in steps of `errStepPpm`.
//
// TRANSFORM_VERSION changes with any change to what this writes; the manifest
// records it, and `npm run packs:provenance` rebuilds from the pinned raw
// file and compares byte for byte.
// =============================================================================

import { Buffer } from 'node:buffer';

import { requireColumns } from './fits.mjs';

export const TRANSFORM_VERSION = '1.0.0';
export const ENCODING = 'binned-relative-flux/1';

const median = xs => {
  const s = Float64Array.from(xs).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Little-endian int16s as base64. */
function int16le(values) {
  const b = Buffer.alloc(2 * values.length);
  values.forEach((v, i) => b.writeInt16LE(v, 2 * i));
  return b.toString('base64');
}

/**
 * @param {Array<object>} units - readFits() of a SPOC light-curve file
 * @param {{binMinutes: number, minPerBin: number, errStepPpm: number}} opts
 * @returns {{series: object, record: object}}
 */
export function binLightCurve(units, { binMinutes, minPerBin, errStepPpm }) {
  const lc = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE');
  if (!lc) throw new Error('no LIGHTCURVE extension');
  const { TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR, QUALITY } = requireColumns(lc, [
    'TIME',
    'PDCSAP_FLUX',
    'PDCSAP_FLUX_ERR',
    'QUALITY',
  ]);
  const kept = [];
  let flagged = 0;
  let notFinite = 0;
  for (let i = 0; i < TIME.values.length; i++) {
    const t = TIME.values[i];
    const f = PDCSAP_FLUX.values[i];
    const e = PDCSAP_FLUX_ERR.values[i];
    if (QUALITY.values[i] !== 0) flagged++;
    else if (!Number.isFinite(t) || !Number.isFinite(f) || !Number.isFinite(e))
      notFinite++;
    else kept.push([t, f, e]);
  }
  if (!kept.length) throw new Error('no cadence survived the quality mask');
  const norm = median(kept.map(k => k[1]));
  const binDays = binMinutes / 1440;
  const t0 = Math.floor(kept[0][0] / binDays) * binDays;
  const bins = new Map();
  for (const [t, f, e] of kept) {
    const k = Math.floor((t - t0) / binDays);
    const b = bins.get(k) || { n: 0, f: 0, e2: 0 };
    b.n++;
    b.f += f / norm;
    b.e2 += (e / norm) ** 2;
    bins.set(k, b);
  }
  const rows = [...bins.entries()]
    .filter(([, b]) => b.n >= minPerBin)
    .sort((a, b) => a[0] - b[0])
    .map(([k, b]) => ({ k, flux: b.f / b.n, err: Math.sqrt(b.e2) / b.n }));

  const runs = [];
  for (const r of rows) {
    const last = runs.at(-1);
    if (last && last[0] + last[1] === r.k) last[1]++;
    else runs.push([r.k, 1]);
  }
  const ppm = rows.map(r => Math.round((r.flux - 1) * 1e6));
  const steps = rows.map(r => Math.round((r.err * 1e6) / errStepPpm));
  // Clipping would be a silent change to the data, so it is a failure instead.
  const clipped = ppm.filter(v => v < -32768 || v > 32767).length;
  const errClipped = steps.filter(s => s < 1 || s > 255).length;
  if (clipped || errClipped) {
    throw new Error(
      `${clipped} fluxes and ${errClipped} errors do not fit the encoding`
    );
  }
  const series = {
    encoding: ENCODING,
    t0,
    binDays,
    n: rows.length,
    runs,
    flux: int16le(ppm),
    errStepPpm,
    err: Buffer.from(Uint8Array.from(steps)).toString('base64'),
  };
  return {
    series,
    record: {
      cadences: TIME.values.length,
      flagged,
      notFinite,
      kept: kept.length,
      binsDropped: bins.size - rows.length,
      bins: rows.length,
      medianFlux: norm,
      fluxUnit: PDCSAP_FLUX.unit,
    },
  };
}

/**
 * The depth of the deepest phase slot when an observation is folded on a
 * period: the scientific check each TESS pack's manifest states, run on the
 * decoded pack (so on the committed file too, without the raw one).
 * @param {object} o - An observation (js/observation.js)
 * @param {number} periodD - The period to fold on, in days
 * @param {number} [slots=200] - Phase slots
 */
export function foldedDepth(o, periodD, slots = 200) {
  const sum = new Float64Array(slots);
  const count = new Uint32Array(slots);
  for (let i = 0; i < o.x.values.length; i++) {
    const phase = (((o.x.values[i] % periodD) + periodD) % periodD) / periodD;
    const s = Math.min(slots - 1, Math.floor(phase * slots));
    sum[s] += o.y.values[i];
    count[s]++;
  }
  let lowest = Infinity;
  for (let s = 0; s < slots; s++)
    if (count[s]) lowest = Math.min(lowest, sum[s] / count[s]);
  return 1 - lowest;
}
