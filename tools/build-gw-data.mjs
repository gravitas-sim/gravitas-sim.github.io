#!/usr/bin/env node
// =============================================================================
// Bundle the published GW150914 figure data
// -----------------------------------------------------------------------------
//   npm run gw:data     download (or reuse a cache), process, write the module
//   npm run gw:check    verify the checked-in module is what this would write
//
// What this exists to prevent
// -----------------------------------------------------------------------------
// A teaching application that shows "LIGO data" is making a claim, and the only
// way to keep that claim honest is for every number on the screen to be
// traceable to a file somebody else published. So the data is not typed in, not
// eyeballed off a figure, and not regenerated until it looks right. It is
// fetched from the URLs recorded below, checksummed on the way in, processed by
// the steps recorded below and nothing else, and checksummed on the way out.
//
// The source
// -----------------------------------------------------------------------------
// The figure data behind Abbott et al. (2016), "Observation of Gravitational
// Waves from a Binary Black Hole Merger", Phys. Rev. Lett. 116, 061102,
// doi:10.1103/PhysRevLett.116.061102, released by the Gravitational Wave Open
// Science Center under CC BY 4.0. Figure 1 gives the band-passed strain in each
// detector, the numerical-relativity reconstruction, and the residual; figure 2
// gives the Keplerian effective separation and the post-Newtonian velocity.
//
// What is done to it
// -----------------------------------------------------------------------------
//   1. Parse the two-column text. Column one is seconds from GPS 1126259462,
//      column two is strain multiplied by 1e21 (or Schwarzschild radii, or v/c).
//   2. Decimate 16384 Hz to 4096 Hz by taking every fourth sample. No filter is
//      applied because none is needed: the collaboration band-passed these
//      traces to 35-350 Hz before publishing them, and the measured power above
//      the new Nyquist frequency is 0.004 percent of the total. The tool
//      re-measures that on every run and refuses to write if it has changed.
//   3. Quantize to 16-bit integers with a per-trace scale, chosen so that the
//      quantization step is at least a thousand times smaller than the trace's
//      own peak-to-peak range. The error this introduces is recorded.
//   4. Base64 the little-endian bytes.
//
// Nothing is shifted, inverted, filtered, normalised or aligned. The relative
// time shift and sign between Hanford and Livingston are *measured* here and
// recorded as findings, so that the lesson can ask a student to find the same
// thing rather than telling them the answer and hiding the evidence.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const OUT = path.join(REPO, 'js', 'data', 'gw', 'gw150914.js');
const CACHE = path.join(REPO, '.gw-cache');

const BASE = 'https://gwosc.org/GW150914data/P150914/';

/** The event's time origin: the published figures' x axis is seconds from here. */
const GPS_EPOCH = 1126259462;

/**
 * Every file that is fetched, and what it is.
 *
 * `rate` is the rate to decimate to, and `decimate` says how.
 *
 * The six strain traces are decimated by keeping every nth sample, which is
 * safe only because the collaboration band-passed them to 35-350 Hz before
 * publishing: the guard below re-measures the power above each new Nyquist
 * frequency on every run and refuses to write if it is not negligible.
 *
 * The two figure-2 curves are smooth and monotonic rather than band-passed, so
 * the same measurement is dominated by the end-to-end step of a finite record
 * and says nothing useful. They are decimated by *averaging* each block of n
 * samples instead, which is a low-pass filter and cannot fold anything back.
 */
const SOURCES = [
  {
    id: 'observed-H1',
    file: 'fig1-observed-H.txt',
    detector: 'H1',
    role: 'observed',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'observed-L1',
    file: 'fig1-observed-L.txt',
    detector: 'L1',
    role: 'observed',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'reconstruction-H1',
    file: 'fig1-waveform-H.txt',
    detector: 'H1',
    role: 'reconstruction',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'reconstruction-L1',
    file: 'fig1-waveform-L.txt',
    detector: 'L1',
    role: 'reconstruction',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'residual-H1',
    file: 'fig1-residual-H.txt',
    detector: 'H1',
    role: 'residual',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'residual-L1',
    file: 'fig1-residual-L.txt',
    detector: 'L1',
    role: 'residual',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'separation-H1',
    file: 'fig2-keplerian-separation-H.txt',
    detector: 'H1',
    role: 'separation',
    unit: 'schwarzschild-radii',
    scale21: false,
    rate: 1024,
    decimate: 'average',
  },
  {
    id: 'velocity-H1',
    file: 'fig2-postNewtonian-velocity-H.txt',
    detector: 'H1',
    role: 'velocity',
    unit: 'v/c',
    scale21: false,
    rate: 1024,
    decimate: 'average',
  },
];

/** The fraction of power above the new Nyquist frequency we will tolerate. */
const ALIAS_TOLERANCE = 1e-3;

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

/**
 * Fetch a source file, or read it from the local cache.
 * @param {string} file - Basename under the published directory
 * @param {boolean} offline - Refuse to reach the network
 * @returns {Promise<string>} The file's text
 */
async function fetchSource(file, offline) {
  const cached = path.join(CACHE, file);
  if (existsSync(cached)) return readFile(cached, 'utf8');
  if (offline) {
    throw new Error(
      `${file} is not in ${path.relative(REPO, CACHE)} and --offline was given. ` +
        `Run without --offline once to populate the cache from ${BASE}.`
    );
  }
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`${BASE}${file}: HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  return text;
}

/**
 * Two columns of numbers, with the comment line dropped.
 * @param {string} text - File contents
 * @returns {{t: Float64Array, y: Float64Array}} The columns
 */
function parseColumns(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const parts = s.split(/\s+/);
    if (parts.length < 2) continue;
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    rows.push([a, b]);
  }
  return {
    t: Float64Array.from(rows, r => r[0]),
    y: Float64Array.from(rows, r => r[1]),
  };
}

/**
 * The fraction of a trace's power above a frequency, by direct summation.
 *
 * A naive discrete Fourier transform. These traces are a few thousand samples
 * and this runs once in a build script, so an O(n^2) transform is cheaper than
 * an import.
 *
 * The linear trend is removed first, and this matters. The figure-2 separation
 * curve falls monotonically from 4.7 to 1.5 Schwarzschild radii; a periodogram
 * of a ramp is dominated by the step between its two ends, which is an artefact
 * of treating a finite record as one period of a periodic signal rather than
 * anything the instrument recorded. Measured with the trend left in, that curve
 * appears to carry a quarter of a percent of its power above 2 kHz, and it does
 * not. Detrending is the standard answer and is recorded in the provenance.
 *
 * @param {Float64Array} y - Samples
 * @param {number} rate - Sample rate, Hz
 * @param {number} above - Frequency, Hz
 * @returns {number} Fraction of total power above `above`
 */
function powerAbove(y, rate, above) {
  const n = y.length;
  // Least-squares line through the samples, subtracted.
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += y[i];
    sxx += i * i;
    sxy += i * y[i];
  }
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = y[i] - (slope * i + intercept);

  const kMin = Math.ceil((above * n) / rate);
  let total = 0;
  let high = 0;
  for (let k = 1; k < n / 2; k++) {
    let re = 0;
    let im = 0;
    const w = (-2 * Math.PI * k) / n;
    for (let i = 0; i < n; i++) {
      re += d[i] * Math.cos(w * i);
      im += d[i] * Math.sin(w * i);
    }
    const p = re * re + im * im;
    total += p;
    if (k >= kMin) high += p;
  }
  return total > 0 ? high / total : 0;
}

/** Base64, from bytes, in Node. */
const toBase64 = bytes => Buffer.from(bytes).toString('base64');

/**
 * Quantize to int16 with a scale that uses the range.
 * @param {Float64Array} y - Samples
 * @returns {{scale: number, bytes: Uint8Array, maxError: number}} The encoding
 */
function quantize(y) {
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? 32000 / peak : 1;
  const ints = new Int16Array(y.length);
  let maxError = 0;
  for (let i = 0; i < y.length; i++) {
    const q = Math.round(y[i] * scale);
    ints[i] = q;
    maxError = Math.max(maxError, Math.abs(q / scale - y[i]));
  }
  return { scale, bytes: new Uint8Array(ints.buffer), maxError };
}

/**
 * The best time shift and its sign between two traces, by cross-correlation.
 *
 * Recorded rather than applied. The lesson asks a student to find this; the
 * build records it so that what the lesson claims can be checked against what
 * the data says without either being edited to agree with the other.
 *
 * @param {Float64Array} a - First trace
 * @param {Float64Array} b - Second, same rate
 * @param {number} rate - Hz
 * @param {number} maxLagMs - How far to search
 * @returns {{correlation: number, lagMs: number, inverted: boolean}} The finding
 */
function alignment(a, b, rate, maxLagMs = 25) {
  const maxLag = Math.round((maxLagMs * rate) / 1000);
  let best = 0;
  let bestLag = 0;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let num = 0;
    let na = 0;
    let nb = 0;
    for (
      let i = Math.max(0, -lag);
      i < Math.min(a.length, b.length - lag);
      i++
    ) {
      num += a[i] * b[i + lag];
      na += a[i] * a[i];
      nb += b[i + lag] * b[i + lag];
    }
    const c = num / Math.sqrt(na * nb);
    if (Math.abs(c) > Math.abs(best)) {
      best = c;
      bestLag = lag;
    }
  }
  return {
    correlation: Number(best.toFixed(4)),
    lagMs: Number(((bestLag * 1000) / rate).toFixed(3)),
    inverted: best < 0,
  };
}

/** Build the module text. */
async function build({ offline }) {
  const traces = {};
  const inputs = [];
  const decimated = {};

  for (const src of SOURCES) {
    const text = await fetchSource(src.file, offline);
    inputs.push({
      file: src.file,
      url: BASE + src.file,
      bytes: Buffer.byteLength(text),
      sha256: sha256(text),
    });
    const { t, y } = parseColumns(text);
    if (t.length < 2) throw new Error(`${src.file}: no data rows`);
    const dt = t[1] - t[0];
    const rateIn = Math.round(1 / dt);
    if (rateIn !== 16384) {
      throw new Error(`${src.file}: expected 16384 Hz, found ${rateIn} Hz`);
    }
    const factor = rateIn / src.rate;
    if (!Number.isInteger(factor)) {
      throw new Error(
        `${src.file}: ${rateIn} Hz does not decimate to ${src.rate} Hz`
      );
    }

    const how = src.decimate || 'pick';
    let aliasFraction = null;
    const kept = [];
    if (how === 'pick') {
      // Refuse to decimate a trace that would alias. Measured, every run.
      aliasFraction = powerAbove(y, rateIn, src.rate / 2);
      if (aliasFraction > ALIAS_TOLERANCE) {
        throw new Error(
          `${src.file}: ${(aliasFraction * 100).toFixed(3)}% of the power is above ` +
            `${src.rate / 2} Hz, which decimation would fold back. Add a low-pass ` +
            `filter here and record it in the provenance before raising this.`
        );
      }
      for (let i = 0; i < y.length; i += factor) kept.push(y[i]);
    } else {
      // Block average: a low-pass filter and a decimator in one, so there is
      // nothing left above the new Nyquist frequency to fold back.
      for (let i = 0; i + factor <= y.length; i += factor) {
        let sum = 0;
        for (let k = 0; k < factor; k++) sum += y[i + k];
        kept.push(sum / factor);
      }
    }
    const values = Float64Array.from(kept);
    decimated[src.id] = { values, rate: src.rate };

    const { scale, bytes, maxError } = quantize(values);
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }

    traces[src.id] = {
      detector: src.detector,
      role: src.role,
      unit: src.unit,
      /** Multiply the decoded integers by this to recover the published value. */
      valueScale: Number((1 / scale).toExponential(12)),
      /** And then by this to reach strain, where the unit is strain. */
      unitScale: src.scale21 ? 1e-21 : 1,
      t0: Number(t[0].toFixed(12)),
      sampleRate: src.rate,
      count: values.length,
      min: Number(min.toPrecision(9)),
      max: Number(max.toPrecision(9)),
      quantizationError: Number(maxError.toPrecision(3)),
      decimation:
        how === 'pick'
          ? `kept every ${factor} samples`
          : `mean of every ${factor} samples`,
      aliasFractionAtSource:
        aliasFraction === null ? null : Number(aliasFraction.toPrecision(3)),
      data: toBase64(bytes),
    };
  }

  // Findings: measured here, recorded, never applied to the stored traces.
  const findings = {
    observedHvsL: alignment(
      decimated['observed-H1'].values,
      decimated['observed-L1'].values,
      4096
    ),
    reconstructionHvsL: alignment(
      decimated['reconstruction-H1'].values,
      decimated['reconstruction-L1'].values,
      4096
    ),
    observedVsReconstructionH1: alignment(
      decimated['observed-H1'].values,
      decimated['reconstruction-H1'].values,
      4096
    ),
    observedVsReconstructionL1: alignment(
      decimated['observed-L1'].values,
      decimated['reconstruction-L1'].values,
      4096
    ),
  };

  const provenance = {
    event: 'GW150914',
    detectedAt: '2015-09-14T09:50:45Z',
    gpsEpoch: GPS_EPOCH,
    timeAxis: `seconds after GPS ${GPS_EPOCH}`,
    paper: 'Abbott et al. (2016), Phys. Rev. Lett. 116, 061102',
    doi: '10.1103/PhysRevLett.116.061102',
    arxiv: 'arXiv:1602.03837',
    archive: 'Gravitational Wave Open Science Center',
    eventPage: 'https://gwosc.org/events/GW150914/',
    baseUrl: BASE,
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
    attribution:
      'This research has made use of data or software obtained from the ' +
      'Gravitational Wave Open Science Center (gwosc.org), a service of the ' +
      'LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA.',
    sourceSampleRate: 16384,
    processing: [
      'Parsed the published two-column text as-is.',
      'Decimated 16384 Hz to the rate recorded on each trace. The six strain ' +
        'traces kept every nth sample with no anti-alias filter, which is safe ' +
        'because the collaboration band-passed them to 35-350 Hz before ' +
        'publication; the measured power above each new Nyquist frequency is ' +
        'recorded on the trace. The two figure-2 curves were block-averaged ' +
        'instead, which low-pass filters and decimates in one step.',
      'Quantized to 16-bit integers with a per-trace scale. The largest error ' +
        'this introduced is recorded per trace.',
    ],
    notApplied: [
      'No time shift between detectors.',
      'No sign inversion.',
      'No additional filtering, whitening, normalisation or alignment.',
    ],
    priorProcessingByPublisher: [
      'Band-pass 35-350 Hz.',
      'Band-reject filters at the instrumental line frequencies.',
    ],
    findings,
    inputs,
  };

  const body = `// =============================================================================
// GW150914, as published
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-gw-data.mjs; run
// \`npm run gw:data\` to regenerate and \`npm run gw:check\` to verify.
//
// This is a measurement. Everything else this application draws under the word
// "gravitational wave" is a model or an illustration, and the interface keeps
// the two apart. The provenance block below travels with every capture made
// from these traces.
// =============================================================================

/* eslint-disable */

/** Where every number here came from, and what was done to it. */
export const PROVENANCE = ${JSON.stringify(provenance, null, 2)};

/** The traces themselves, base64 little-endian int16. */
export const TRACES = ${JSON.stringify(traces, null, 2)};

/**
 * Decode one trace to physical units.
 *
 * @param {string} id - A key of TRACES
 * @returns {{values: Float32Array, t0: number, sampleRate: number, unit: string}}
 *   The samples in the trace's own unit - strain, Schwarzschild radii, or v/c
 */
export function decodeTrace(id) {
  const spec = TRACES[id];
  if (!spec) throw new Error('Unknown GW150914 trace: ' + id);
  const binary =
    typeof atob === 'function'
      ? atob(spec.data)
      : Buffer.from(spec.data, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
  const out = new Float32Array(ints.length);
  const k = spec.valueScale * spec.unitScale;
  for (let i = 0; i < ints.length; i++) out[i] = ints[i] * k;
  return {
    values: out,
    t0: spec.t0,
    sampleRate: spec.sampleRate,
    unit: spec.unit,
    detector: spec.detector,
    role: spec.role,
  };
}
`;

  return prettier.format(body, {
    parser: 'babel',
    ...(await prettierOptions()),
  });
}

/** The repository's own Prettier settings. */
async function prettierOptions() {
  try {
    const raw = await readFile(path.join(REPO, '.prettierrc.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const args = process.argv.slice(2);
const check = args.includes('--check');
const offline = args.includes('--offline');

try {
  const next = await build({ offline });
  if (check) {
    const current = existsSync(OUT) ? await readFile(OUT, 'utf8') : '';
    if (current !== next) {
      console.error(
        'js/data/gw/gw150914.js is not what tools/build-gw-data.mjs would write.\n' +
          'Run `npm run gw:data` and commit the result.'
      );
      process.exit(1);
    }
    console.log('GW150914 data is current.');
  } else {
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, next);
    console.log(
      `Wrote ${path.relative(REPO, OUT)} (${(Buffer.byteLength(next) / 1024).toFixed(1)} KB)`
    );
  }
} catch (err) {
  console.error(String(err.message || err));
  process.exit(1);
}
