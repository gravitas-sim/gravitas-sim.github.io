// =============================================================================
// GW150914, as published
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-gw-data.mjs; run
// `npm run gw:data` to regenerate and `npm run gw:check` to verify.
//
// This is a measurement. Everything else this application draws under the word
// "gravitational wave" is a model or an illustration, and the interface keeps
// the two apart. The provenance block below travels with every capture made
// from these traces.
// =============================================================================

/* eslint-disable */

/** Where every number here came from, and what was done to it. */
export const PROVENANCE = {
  event: 'GW150914',
  detectedAt: '2015-09-14T09:50:45Z',
  gpsEpoch: 1126259462,
  timeAxis: 'seconds after GPS 1126259462',
  paper: 'Abbott et al. (2016), Phys. Rev. Lett. 116, 061102',
  doi: '10.1103/PhysRevLett.116.061102',
  arxiv: 'arXiv:1602.03837',
  archive: 'Gravitational Wave Open Science Center',
  eventPage: 'https://gwosc.org/events/GW150914/',
  baseUrl: 'https://gwosc.org/GW150914data/P150914/',
  license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
  attribution:
    'This research has made use of data or software obtained from the Gravitational Wave Open Science Center (gwosc.org), a service of the LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA.',
  sourceSampleRate: 16384,
  processing: [
    'Parsed the published two-column text as-is.',
    'Decimated 16384 Hz to the rate recorded on each trace. The six strain traces kept every nth sample with no anti-alias filter, which is safe because the collaboration band-passed them to 35-350 Hz before publication; the measured power above each new Nyquist frequency is recorded on the trace. The two figure-2 curves were block-averaged instead, which low-pass filters and decimates in one step.',
    'Quantized to 16-bit integers with a per-trace scale. The largest error this introduced is recorded per trace.',
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
  findings: {
    observedHvsL: {
      correlation: -0.757,
      lagMs: -7.324,
      inverted: true,
    },
    reconstructionHvsL: {
      correlation: -0.9768,
      lagMs: -7.568,
      inverted: true,
    },
    observedVsReconstructionH1: {
      correlation: 0.8756,
      lagMs: 0,
      inverted: false,
    },
    observedVsReconstructionL1: {
      correlation: 0.8327,
      lagMs: 0,
      inverted: false,
    },
  },
  inputs: [
    {
      file: 'fig1-observed-H.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig1-observed-H.txt',
      bytes: 173833,
      sha256:
        '3ce5475160fd6b39c41205c2055bfaf4e507981721a2eb4c5df0c99e2fa48d94',
    },
    {
      file: 'fig1-observed-L.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig1-observed-L.txt',
      bytes: 173974,
      sha256:
        'dc41302512f3e28336680030a255cc1f4fb3ec43ea5267cc044c9015051ecd85',
    },
    {
      file: 'fig1-waveform-H.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig1-waveform-H.txt',
      bytes: 173827,
      sha256:
        '720a2ae7d4d0cfbe3af29ed42d1450ec8f312e4ec15e7fd1df80d5a3ca134c97',
    },
    {
      file: 'fig1-waveform-L.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig1-waveform-L.txt',
      bytes: 173766,
      sha256:
        '35615f652c9dda90a947ccf2c6e97835dd784b563ded5ebe4d6810de09db6e0c',
    },
    {
      file: 'fig1-residual-H.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig1-residual-H.txt',
      bytes: 173808,
      sha256:
        'ae379352f21dbdde9c3b1e582fb3614627df169cd6f28ea4508f5b6611c4b50c',
    },
    {
      file: 'fig1-residual-L.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig1-residual-L.txt',
      bytes: 173942,
      sha256:
        '59ea4081a678f7c376399d320e1d896afca9797b7a71f8b656452f2fa78e8234',
    },
    {
      file: 'fig2-keplerian-separation-H.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig2-keplerian-separation-H.txt',
      bytes: 141558,
      sha256:
        'c68e4dfe0108d1d2a78c4dd71b9938f8c3ba979ed89807441af2830cc8664358',
    },
    {
      file: 'fig2-postNewtonian-velocity-H.txt',
      url: 'https://gwosc.org/GW150914data/P150914/fig2-postNewtonian-velocity-H.txt',
      bytes: 141537,
      sha256:
        '5580b8ee8aaaf2ef43f2bdc53addad33cd5252b37617b81500a60e45f1e9f0e6',
    },
  ],
};

/** The traces themselves, base64 little-endian int16. */
export const TRACES = {
  'observed-H1': {
    detector: 'H1',
    role: 'observed',
    unit: 'strain',
    valueScale: 0.00003524529125157,
    unitScale: 1e-21,
    t0: 0.25,
    sampleRate: 4096,
    count: 861,
    min: -0.997674973,
    max: 1.12784932,
    quantizationError: 0.0000176,
    decimation: 'kept every 4 samples',
    aliasFractionAtSource: 0.0000202,
    data: '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',
  },
  'observed-L1': {
    detector: 'L1',
    role: 'observed',
    unit: 'strain',
    valueScale: 0.00003213465145133,
    unitScale: 1e-21,
    t0: 0.25,
    sampleRate: 4096,
    count: 861,
    min: -0.801652744,
    max: 1.02830885,
    quantizationError: 0.0000161,
    decimation: 'kept every 4 samples',
    aliasFractionAtSource: 0.0000333,
    data: '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',
  },
  'reconstruction-H1': {
    detector: 'H1',
    role: 'reconstruction',
    unit: 'strain',
    valueScale: 0.00003854207341388,
    unitScale: 1e-21,
    t0: 0.25004979725,
    sampleRate: 4096,
    count: 860,
    min: -1.12667693,
    max: 1.23334635,
    quantizationError: 0.0000193,
    decimation: 'kept every 4 samples',
    aliasFractionAtSource: 0.00000938,
    data: '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',
  },
  'reconstruction-L1': {
    detector: 'L1',
    role: 'reconstruction',
    unit: 'strain',
    valueScale: 0.00003188823913226,
    unitScale: 1e-21,
    t0: 0.250007805063,
    sampleRate: 4096,
    count: 861,
    min: -1.02042365,
    max: 0.883024382,
    quantizationError: 0.0000159,
    decimation: 'kept every 4 samples',
    aliasFractionAtSource: 6.57e-7,
    data: '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',
  },
  'residual-H1': {
    detector: 'H1',
    role: 'residual',
    unit: 'strain',
    valueScale: 0.00001600978688603,
    unitScale: 1e-21,
    t0: 0.25,
    sampleRate: 4096,
    count: 861,
    min: -0.51231318,
    max: 0.461230982,
    quantizationError: 0.00000795,
    decimation: 'kept every 4 samples',
    aliasFractionAtSource: 0.0000111,
    data: '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',
  },
  'residual-L1': {
    detector: 'L1',
    role: 'residual',
    unit: 'strain',
    valueScale: 0.00001577564452118,
    unitScale: 1e-21,
    t0: 0.25,
    sampleRate: 4096,
    count: 861,
    min: -0.444529974,
    max: 0.504820625,
    quantizationError: 0.00000787,
    decimation: 'kept every 4 samples',
    aliasFractionAtSource: 0.000136,
    data: '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',
  },
  'separation-H1': {
    detector: 'H1',
    role: 'separation',
    unit: 'schwarzschild-radii',
    valueScale: 0.0001469335304747,
    unitScale: 1,
    t0: 0.250019280094,
    sampleRate: 1024,
    count: 176,
    min: 1.60824594,
    max: 4.70187298,
    quantizationError: 0.0000728,
    decimation: 'mean of every 16 samples',
    aliasFractionAtSource: null,
    data: 'AH3XfK18hHxZfC98BHzZe617gntWeyl7/XrQeqN6d3pKeh168HnDeZd5ank9eRB543i2eIl4XHgueAB40nekd3V3RncXd+d2t3aGdlV2I3bxdb51i3VYdSR18HS8dId0U3QedOlztHN/c0pzFHPecqhycnI7cgRyzHGUcVxxInHpcK5wc3A4cPtvvm+Bb0JvA2/DboNuQ24CbsBtfm08bfpst2x0bDBs7Guna2JrHGvWao9qR2r+abVpamkfadJohWg2aOdnl2dFZ/NmoGZMZvhlo2VNZfdkn2RHZO5jlGM4Y9xifmIfYr9hXWH5YJRgLWDEX1pf7V5/Xg9enl0qXbVcPlzFW0pbzVpOWsxZSFnAWDZYqVcYV4NW61VPVa5UCVRfU7FS/lFHUYpQx0/+Ti9OWU16TJNLo0qpSaRIk0d2RkpFD0TEQmdB9j9vPs88Ezs4OTo3FTXFMkgwmy3BKg==',
  },
  'velocity-H1': {
    detector: 'H1',
    role: 'velocity',
    unit: 'v/c',
    valueScale: 0.00001700799167091,
    unitScale: 1,
    t0: 0.250019280094,
    sampleRate: 1024,
    count: 176,
    min: 0.326073818,
    max: 0.544255733,
    quantizationError: 0.00000849,
    decimation: 'mean of every 16 samples',
    aliasFractionAtSource: null,
    data: '5ErwSv1KCksWSyNLMEs9S0pLWEtlS3NLgEuOS5tLqUu3S8VL00vhS+9L/UsLTBlMJ0w2TERMU0xiTHBMf0yOTJ1MrUy8TMxM20zrTPtMC00cTSxNPU1NTV5Nb02BTZJNo021TcdN2U3rTf1ND04iTjROR05aTm1OgU6VTqhOvE7RTuVO+k4PTyVPO09QT2dPfU+UT6tPwk/aT/JPClAiUDtQVFBtUIZQoFC6UNVQ71ALUSZRQlFeUXtRmFG2UdRR8lERUjFSUFJxUpJSs1LVUvhSG1M+U2JTh1OsU9JT+FMfVEdUcFSZVMNU71QbVUhVdVWkVdVVBlY4VmtWoFbWVg1XRld/V7tX+Fc2WHdYuVj9WERZjFnXWSVadVrIWh5beFvVWzVcmlwCXW9d4V1YXtVeWF/iX3RgDmGxYV5iF2PcY69kkWWFZo1nrGjlaTtrtWxXbihwL3J1dAJ32nkAfQ==',
  },
};

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
