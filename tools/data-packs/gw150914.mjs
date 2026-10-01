// =============================================================================
// The published GW150914 figure data, as a data pack
// -----------------------------------------------------------------------------
//   npm run gw:data         fetch what is missing, process, write the module
//                           and data-packs/gw150914-figure-data.json
//   npm run gw:check        verify both, no network
//   npm run gw:provenance   rebuild both from the cached traces and compare
//
// Those commands run tools/build-gw-data.mjs, which hands this pack to
// tools/build-data-packs.mjs runDataset(): the build, check and rebuild every
// data pack goes through (DATA_PACKS.md). Until Roadmap II Prompt 62 this was
// a builder of its own, which recorded the hash of whatever it read and
// compared nothing on a fresh download, and kept its record in a PROVENANCE
// object inside the module the browser loads. The eight inputs are pinned now,
// by size and SHA-256 - the pins are the hashes the old record carried, and a
// fresh download on 2026-10-01 matched every one - and checked whether they
// come from the cache or the network (tools/data-packs/pinned.mjs). The record
// is the pack manifest; the module carries PACK, its runtime fields.
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
// Nothing is shifted, inverted, filtered, normalized or aligned. The relative
// time shift and sign between Hanford and Livingston are *measured* here and
// recorded as findings, so that the lesson can ask a student to find the same
// thing rather than telling them the answer and hiding the evidence.
// =============================================================================

import { Buffer } from 'node:buffer';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/**
 * The tool version that wrote the pack. A change to what this file writes
 * bumps it, and packs:check fails on a manifest that names another.
 */
export const TRANSFORM_VERSION = '1.0.0';

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
    bytes: 173833,
    sha256: '3ce5475160fd6b39c41205c2055bfaf4e507981721a2eb4c5df0c99e2fa48d94',
    detector: 'H1',
    role: 'observed',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'observed-L1',
    file: 'fig1-observed-L.txt',
    bytes: 173974,
    sha256: 'dc41302512f3e28336680030a255cc1f4fb3ec43ea5267cc044c9015051ecd85',
    detector: 'L1',
    role: 'observed',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'reconstruction-H1',
    file: 'fig1-waveform-H.txt',
    bytes: 173827,
    sha256: '720a2ae7d4d0cfbe3af29ed42d1450ec8f312e4ec15e7fd1df80d5a3ca134c97',
    detector: 'H1',
    role: 'reconstruction',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'reconstruction-L1',
    file: 'fig1-waveform-L.txt',
    bytes: 173766,
    sha256: '35615f652c9dda90a947ccf2c6e97835dd784b563ded5ebe4d6810de09db6e0c',
    detector: 'L1',
    role: 'reconstruction',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'residual-H1',
    file: 'fig1-residual-H.txt',
    bytes: 173808,
    sha256: 'ae379352f21dbdde9c3b1e582fb3614627df169cd6f28ea4508f5b6611c4b50c',
    detector: 'H1',
    role: 'residual',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'residual-L1',
    file: 'fig1-residual-L.txt',
    bytes: 173942,
    sha256: '59ea4081a678f7c376399d320e1d896afca9797b7a71f8b656452f2fa78e8234',
    detector: 'L1',
    role: 'residual',
    unit: 'strain',
    scale21: true,
    rate: 4096,
  },
  {
    id: 'separation-H1',
    file: 'fig2-keplerian-separation-H.txt',
    bytes: 141558,
    sha256: 'c68e4dfe0108d1d2a78c4dd71b9938f8c3ba979ed89807441af2830cc8664358',
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
    bytes: 141537,
    sha256: '5580b8ee8aaaf2ef43f2bdc53addad33cd5252b37617b81500a60e45f1e9f0e6',
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
 * of a ramp is dominated by the step between its two ends, which is an artifact
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

/** The eight pins, as the manifest records them. */
const RAW = SOURCES.map(s => ({
  file: s.file,
  url: BASE + s.file,
  bytes: s.bytes,
  sha256: s.sha256,
}));

/** What the pack cites; each DOI resolved through Crossref on 2026-10-01. */
const CITATIONS = [
  {
    text: 'Abbott et al. (LIGO Scientific and Virgo Collaborations) 2016, Phys. Rev. Lett. 116, 061102 (GW150914)',
    doi: '10.1103/PhysRevLett.116.061102',
  },
  {
    text: 'Abbott et al. 2021, SoftwareX 13, 100658 (O1 and O2 open data)',
    doi: '10.1016/j.softx.2021.100658',
  },
];

/** The GWOSC acknowledgement, as the archive asks for it (NOTICE). */
const ATTRIBUTION =
  'This research has made use of data or software obtained from the ' +
  'Gravitational Wave Open Science Center (gwosc.org), a service of the ' +
  'LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA.';

/**
 * The pack's runtime metadata and the rest of its manifest, from the traces.
 * @param {Uint8Array[]} raw - The eight files, in SOURCES order, pinned
 */
function build(raw) {
  const traces = {};
  const decimated = {};

  for (const [k, src] of SOURCES.entries()) {
    const text = Buffer.from(raw[k]).toString('utf8');
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

  const meta = {
    id: 'gw150914-figure-data',
    version: '1.0.0',
    title: 'GW150914: the published figure data',
    object: {
      name: 'GW150914',
      identifiers: ['GW150914'],
      detectedAt: '2015-09-14T09:50:45Z',
      gpsEpoch: GPS_EPOCH,
    },
    facility: {
      observatory: 'LIGO Hanford and LIGO Livingston',
      instrument: 'Advanced LIGO, both detectors',
      pipeline:
        'figure data of Abbott et al. 2016, band-passed 35-350 Hz and notched by the collaborations before publication',
    },
    dataType: 'strain',
    origin: 'observed',
    credit: 'Abbott et al. (2016), Phys. Rev. Lett. 116, 061102',
    license: {
      status: 'cc-by-4.0',
      statement: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
    },
    retrieved: '2026-10-01',
    time: {
      scale: 'GPS',
      reference: `seconds after GPS ${GPS_EPOCH}`,
      unit: 's',
    },
    columns: [
      {
        name: 'time',
        unit: 's',
        description: 't0 + i / sampleRate, per trace',
      },
      {
        name: 'value',
        unit: '',
        description:
          'per trace: strain (valueScale x unitScale), or the Keplerian separation in Schwarzschild radii, or v/c - all three dimensionless',
      },
    ],
    masks: [],
    reductions: [
      'Decimated from 16384 Hz: the six strain traces keep every fourth sample, safe because the collaborations band-passed them first; the two figure-2 curves are averages of each block of sixteen.',
      'Quantised to 16-bit integers with a per-trace scale; the largest error is recorded on each trace.',
      'Nothing is shifted, inverted, filtered, normalised or aligned here.',
    ],
  };

  const manifestRest = {
    source: {
      archive: 'Gravitational Wave Open Science Center',
      urls: ['https://gwosc.org/events/GW150914/', ...RAW.map(r => r.url)],
      citations: CITATIONS,
      acknowledgement: ATTRIBUTION,
      terms: ['https://gwosc.org/data/', 'https://gwosc.org/acknowledgement/'],
    },
    raw: RAW,
    transformation: {
      script: 'tools/data-packs/gw150914.mjs',
      version: TRANSFORM_VERSION,
      options: { aliasTolerance: ALIAS_TOLERANCE },
      steps: [
        'Parse the published two-column text as-is.',
        'Decimate 16384 Hz to the rate recorded on each trace. The six strain traces keep every nth sample with no anti-alias filter, which is safe because the collaboration band-passed them to 35-350 Hz before publication; the measured power above each new Nyquist frequency is recorded on the trace and must be under 0.1%. The two figure-2 curves are block-averaged instead, which low-pass filters and decimates in one step.',
        'Quantise to 16-bit integers with a per-trace scale. The largest error this introduced is recorded per trace.',
        'Measure, and record without applying, the time shift and sign between the detectors and between each trace and its reconstruction, by cross-correlation.',
      ],
      record: { sourceSampleRate: 16384, findings },
    },
    notApplied: [
      'No time shift between detectors.',
      'No sign inversion.',
      'No additional filtering, whitening, normalization or alignment.',
    ],
    priorProcessingByPublisher: [
      'Band-pass 35-350 Hz.',
      'Band-reject filters at the instrumental line frequencies.',
    ],
    assumptions: [
      'Of the eight traces, only the two "observed" ones are measurements. The two reconstructions are the collaborations’ numerical-relativity waveform as each detector would see it, the two residuals are observed minus reconstruction, and the figure-2 separation and velocity are derived from the waveform model: each trace’s role says which it is.',
      'The time axis is the published one, seconds after GPS 1126259462 (2015-09-14T09:50:45Z).',
    ],
    compatible: {
      widgets: ['gw-real'],
      investigations: ['listening-to-spacetime'],
    },
    offline: 'core',
  };

  return {
    meta,
    manifestRest,
    render: PACK => renderModule(PACK, traces, findings),
  };
}

/** The module the browser loads: PACK, the findings and the traces. */
async function renderModule(PACK, traces, findings) {
  const body = `// =============================================================================
// GW150914, as published
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/data-packs/gw150914.mjs; run
// \`npm run gw:data\` to regenerate and \`npm run gw:check\` to verify.
//
// This is a measurement. Everything else this application draws under the word
// "gravitational wave" is a model or an illustration, and the interface keeps
// the two apart. PACK - the runtime fields of the data pack's manifest,
// data-packs/gw150914-figure-data.json, which holds the full record - travels
// with every capture made from these traces.
// =============================================================================

/* eslint-disable */

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/**
 * Measured from the traces by the build, and never applied to them: the time
 * shift and sign between the detectors, and between each trace and its
 * reconstruction, by cross-correlation.
 */
export const FINDINGS = ${JSON.stringify(findings, null, 2)};

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

  return (await import('prettier')).format(body, {
    parser: 'babel',
    ...(await prettierOptions()),
  });
}

async function prettierOptions() {
  try {
    const raw = await readFile(path.join(REPO, '.prettierrc.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Verify a module against its manifest without the sources: complete,
 * internally consistent and honest about itself. The cache is gitignored -
 * 1.4 MB of source text does not belong in the repository - so a fresh clone
 * cannot rebuild, and this is most of what a check there can say. The full
 * comparison runs whenever the cache is there (gw:check), and gw:provenance
 * makes a missing cache a failure.
 * @returns {string[]} Problems
 */
function check(mod, manifest) {
  const problems = [];
  const { PACK, TRACES, FINDINGS, decodeTrace } = mod;
  if (PACK?.object?.name !== 'GW150914') problems.push('PACK names no event');
  if (!PACK?.citations?.some(c => c.doi === '10.1103/PhysRevLett.116.061102'))
    problems.push('PACK does not cite the discovery paper');
  if (!manifest.source?.acknowledgement) problems.push('no GWOSC attribution');
  if (
    JSON.stringify(FINDINGS) !==
    JSON.stringify(manifest.transformation?.record?.findings)
  ) {
    problems.push('the findings are not the ones the manifest records');
  }
  for (const pin of manifest.raw || []) {
    if (!String(pin.url || '').startsWith(BASE)) {
      problems.push(`${pin.file}: URL is not the published one`);
    }
  }
  const ids = SOURCES.map(s => s.id);
  for (const id of ids)
    if (!TRACES?.[id]) problems.push(`trace ${id} is missing`);
  for (const id of Object.keys(TRACES || {})) {
    if (!ids.includes(id))
      problems.push(`trace ${id} is not one this tool writes`);
  }
  for (const [id, spec] of Object.entries(TRACES || {})) {
    let decoded;
    try {
      decoded = decodeTrace(id);
    } catch (err) {
      problems.push(`${id}: will not decode (${err.message})`);
      continue;
    }
    if (decoded.values.length !== spec.count) {
      problems.push(
        `${id}: says ${spec.count} samples, decodes ${decoded.values.length}`
      );
    }
    if (!decoded.values.every(Number.isFinite)) {
      problems.push(`${id}: decodes to something that is not a number`);
    }
    const scale = spec.unitScale || 1;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of decoded.values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    // Within a quantization step of the recorded range, in the trace's own
    // published units.
    const slack =
      (spec.quantizationError || 0) * 2 + Math.abs(spec.max - spec.min) * 1e-4;
    if (
      Math.abs(lo / scale - spec.min) > slack ||
      Math.abs(hi / scale - spec.max) > slack
    ) {
      problems.push(`${id}: decoded range does not match the recorded one`);
    }
  }
  return problems;
}

/**
 * The scientific check, on the committed traces: the signal reached
 * Livingston first and Hanford about 7 ms later, inverted, as the discovery
 * paper reports - measured here by cross-correlation, never applied.
 */
function validate(mod) {
  const h = mod.decodeTrace('observed-H1').values;
  const l = mod.decodeTrace('observed-L1').values;
  const found = alignment(Float64Array.from(h), Float64Array.from(l), 4096);
  return {
    check:
      'cross-correlating the committed H1 and L1 traces finds L1 leading by 5 to 10 ms with the sign inverted, and a correlation stronger than 0.5 in magnitude',
    against: [
      {
        quantity: 'arrival at H1 after L1',
        value: 6.9,
        unit: 'ms',
        ref: 'Abbott et al. 2016, PRL 116, 061102, figure 1 caption: arrived first at L1 and 6.9 (+0.5, -0.4) ms later at H1',
      },
    ],
    result: { observedHvsL: found },
    ok:
      found.inverted &&
      found.correlation < -0.5 &&
      -found.lagMs >= 5 &&
      -found.lagMs <= 10,
  };
}

/** The pack, as tools/build-data-packs.mjs builds, checks and rebuilds it. */
export const GW150914_FIGURES = {
  id: 'gw150914-figure-data',
  label: 'GW150914 data',
  manifest: 'data-packs/gw150914-figure-data.json',
  capability: null,
  module: 'js/data/gw/gw150914.js',
  transformVersion: TRANSFORM_VERSION,
  raw: RAW,
  cache: () =>
    process.env.GRAVITAS_GW_CACHE
      ? path.resolve(process.env.GRAVITAS_GW_CACHE)
      : path.join(REPO, '.gw-cache'),
  refetch: 'npm run gw:data',
  ownCommands: true,
  build,
  decode: mod => mod,
  check,
  validate,
};
