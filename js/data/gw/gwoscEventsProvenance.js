// =============================================================================
// Where the five GWOSC events came from, and what was done to them
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-gwosc-events.mjs in the
// same run as js/data/gw/gwoscEvents.js, and verified by the same check.
//
// No module in the application imports this. It is the audit record: every
// source URL and checksum, both event versions and their DOIs, the detector
// choice and the numbers it was made on, the noise estimate, the window, the
// decimation and the quantisation, and the payload checksum the check
// recomputes from the data module.
// =============================================================================

/** The archive, the evidence categories, and what was and was not done. */
export const PROVENANCE = {
  archive: {
    name: 'Gravitational Wave Open Science Center',
    url: 'https://gwosc.org',
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
    attribution:
      'This research has made use of data or software obtained from the Gravitational Wave Open Science Center (gwosc.org), a service of the LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA.',
    catalogs: {
      'GWTC-1-confident': {
        paper:
          'LIGO Scientific and Virgo Collaborations, Phys. Rev. X 9, 031040 (2019)',
        doi: 'https://doi.org/10.7935/82H3-HH23',
      },
      'GWTC-2.1-confident': {
        paper:
          'LIGO Scientific and Virgo Collaborations, Phys. Rev. D 109, 022001 (2024)',
        doi: 'https://doi.org/10.7935/qf3a-3z67',
      },
    },
    openData: [
      'Abbott et al., SoftwareX 13, 100658 (2021) - O1 and O2 open data',
      'Abbott et al., Astrophys. J. Suppl. 267, 29 (2023) - O3 open data',
    ],
    retrieved: '2026-09-23 UTC',
  },
  kind: 'observed strain, processed by this project; catalog values copied',
  evidence: {
    observedStrain:
      'The strain in the data module. Measured by the LIGO detectors; published by GWOSC. Whitened, windowed, decimated and quantised by this project as recorded per event - never altered in any other way.',
    measuredFromStrain:
      'The noise spectrum, the time-frequency map, the end of the chirp - the last instant anything in it clears the noise, which is not the merger time the catalog publishes - and the loudest frequency at each time before that end. Computed by this project from the committed strain, in the browser, with js/gw/psd.js and js/gw/qscan.js.',
    catalogValue:
      'Masses, chirp mass, distance, redshift, final mass and network signal-to-noise ratio. Copied from the GWOSC event version named beside them. Gravitas did not measure any of them.',
    model:
      'Any curve computed from a formula - the leading-order chirp track, from the catalog chirp mass. Labelled as a model wherever it is drawn.',
    illustration: 'None in this bundle.',
  },
  selection: {
    rule: 'Included only if the chirp is visible in the processed data and the event adds a contrast the others do not. Nine candidates tested on 2026-09-23 UTC.',
    rejected: [
      {
        id: 'GW151226',
        why: 'Low-mass binary black hole, network SNR 13. Its track is at or below the noise pixel by pixel in both detectors: largest normalised Q-scan energy 17 (H1) and 23 (L1) against a noise maximum near 13, spread along a track a student could not follow.',
      },
      {
        id: 'GW170608',
        why: 'Low-mass binary black hole, network SNR 15. A faint track in each detector, energy 30 (H1) and 20 (L1), too weak along most of its length to measure.',
      },
      {
        id: 'GW170814',
        why: 'Clearly visible, but a near twin of GW150914 (source-frame chirp mass 24.1 against 28.6, both from GWTC-1): it would repeat a contrast rather than add one.',
      },
      {
        id: 'GW200115',
        why: 'A neutron star and a black hole, network SNR 11. Its largest energy within 0.1 s of the catalog time is 9.4 (H1) and 12.9 (L1), below what noise alone reaches in that many pixels. The catalog classification is honest; the data show nothing a student could see.',
      },
    ],
  },
  detectorRule:
    'Of the two LIGO detectors, the one with the larger Q-scan energy within 0.1 s of the catalog GPS time, excluding any detector with a transient GWOSC documents inside the window.',
  documentedGlitches: [
    {
      event: 'GW170817',
      detector: 'L1',
      gps: 1187008881.389,
      what: 'a sub-5 ms saturation in a digital-to-analog converter, about 1.1 s before merger',
      source: 'https://gwosc.org/events/GW170817/',
    },
  ],
  notDone: [
    'No gating and no glitch subtraction. A detector with a documented transient in the window is not used instead.',
    'No time shift or sign change between detectors.',
    'No template, matched filter, fit or parameter estimate. Nothing here is a detection statistic.',
    'No chirp-mass estimate. One was tried - the 0PN relation inverted from pairs of points on the time-frequency track - and rejected: it failed outright on two of the five events, ran 16 per cent high on the one where it was stable, and depended on tuning a student could not see.',
  ],
  size: {
    sourceBytes: 13149315,
    sourceFiles: 10,
    payloadBase64Bytes: 50520,
  },
};

/** Each event's record, keyed as in EVENTS. */
export const RECORDS = {
  GW150914: {
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW150914/v4/',
    },
    strainRelease: {
      catalog: 'GWTC-1-confident',
      version: 3,
      doi: 'https://doi.org/10.7935/82H3-HH23',
      json: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW150914/v3/',
    },
    detectors: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW150914/v3/H-H1_GWOSC_4KHZ_R1-1126259447-32.txt.gz',
        gpsStart: 1126259447,
        sha256:
          'fefe8717306109460b6c9cff74da6beb9e80ee624824b4b09bdd2c54ce9b4dfc',
        bytes: 1286320,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 80.1,
        excluded: null,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW150914/v3/L-L1_GWOSC_4KHZ_R1-1126259447-32.txt.gz',
        gpsStart: 1126259447,
        sha256:
          '43d30a710d6ed4a8f27d13f45182f3825cbe99f87287b518618c8ff0e25e0d7c',
        bytes: 1219514,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 45.4,
        excluded: null,
      },
    },
    chosen: 'H1',
    rule: 'Of the two LIGO detectors, the one with the larger Q-scan energy within 0.1 s of the catalog GPS time, excluding any detector with a transient GWOSC documents inside the window.',
    psd: {
      method: 'Welch',
      segmentSeconds: 4,
      overlap: 0.5,
      window: 'Hann',
      average: 'median, bias-corrected',
      segments: 11,
      excludedGps: [[1126259460.4, 1126259463.4]],
      why: 'the 3 s around the merger were left out, so the signal is not estimated as noise',
    },
    whitening: {
      function: 'js/gw/match.js whiten()',
      band: [20, 400],
      noiseUnits:
        'divided by 4.4421e-1, the standard deviation of the whitened file away from its tapered ends',
    },
    window: {
      gpsStart: 1126259459.900391,
      before: 2.5,
      after: 0.5,
    },
    decimation: {
      from: 4096,
      to: 1024,
      method:
        'every fourth sample; no further filter, because whitening zeroed everything above 400 Hz',
      powerAboveNewNyquist: 0.00005204,
    },
    quantisation: {
      bits: 16,
      scale: 4746.53756,
      stepInNoiseSigma: 0.0002107,
      maxErrorInNoiseSigma: 0.0001053,
      sliceTableAgreesWithin: '1 per cent at every slice',
    },
    sourceSamples: 131072,
    keptSamples: 3072,
    payloadSha256:
      '16e575fa985c74e4541a3441b78017836045d8342012df333281cbca0cd4dbcf',
  },
  GW170817: {
    values: {
      catalog: 'GWTC-1-confident',
      version: 3,
      doi: 'https://doi.org/10.7935/82H3-HH23',
      json: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW170817/v3/',
    },
    strainRelease: {
      catalog: 'GWTC-1-confident',
      version: 3,
      doi: 'https://doi.org/10.7935/82H3-HH23',
      json: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW170817/v3/',
    },
    detectors: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW170817/v3/H-H1_GWOSC_4KHZ_R1-1187008867-32.txt.gz',
        gpsStart: 1187008867,
        sha256:
          '3fa9b80df10c94922fea1d130ccb18c632176bb3b8e0ccb91ac16c19f1f822f1',
        bytes: 1282112,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 9.6,
        excluded: null,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW170817/v3/L-L1_GWOSC_4KHZ_R1-1187008867-32.txt.gz',
        gpsStart: 1187008867,
        sha256:
          'b2811cb625ddc624297a0c6bae8fe7d35c501f3415442525bc64bf8fc2dabbed',
        bytes: 1287611,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 17.6,
        excluded: {
          reason:
            'documented transient at GPS 1187008881.389: a sub-5 ms saturation in a digital-to-analog converter, about 1.1 s before merger',
          source: 'https://gwosc.org/events/GW170817/',
        },
      },
    },
    chosen: 'H1',
    rule: 'Of the two LIGO detectors, the one with the larger Q-scan energy within 0.1 s of the catalog GPS time, excluding any detector with a transient GWOSC documents inside the window.',
    psd: {
      method: 'Welch',
      segmentSeconds: 4,
      overlap: 0.5,
      window: 'Hann',
      average: 'median, bias-corrected',
      segments: 15,
      excludedGps: null,
      why: 'nothing left out: the signal is in band for the whole 32-second file, and too weak per 4-second segment to move a median appreciably',
    },
    whitening: {
      function: 'js/gw/match.js whiten()',
      band: [20, 400],
      noiseUnits:
        'divided by 4.3812e-1, the standard deviation of the whitened file away from its tapered ends',
    },
    window: {
      gpsStart: 1187008876.400391,
      before: 6,
      after: 0.5,
    },
    decimation: {
      from: 4096,
      to: 1024,
      method:
        'every fourth sample; no further filter, because whitening zeroed everything above 400 Hz',
      powerAboveNewNyquist: 0.00001201,
    },
    quantisation: {
      bits: 16,
      scale: 7502.502535,
      stepInNoiseSigma: 0.0001333,
      maxErrorInNoiseSigma: 0.00006663,
      sliceTableAgreesWithin: '1 per cent at every slice',
    },
    sourceSamples: 131072,
    keptSamples: 6656,
    payloadSha256:
      '44a9bdac4f49af49c6defef72bfea014d7a73ed1794e3a6a894a481fd03e9bb9',
  },
  GW190412: {
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190412/v4/',
    },
    strainRelease: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190412/v4/',
    },
    detectors: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190412/v4/H-H1_GWOSC_4KHZ_R1-1239082247-32.txt.gz',
        gpsStart: 1239082247,
        sha256:
          'b9713b0ec82b6a1549560f5376f81ae16c4f462f9299736cd6dbfe9f89e7829d',
        bytes: 1334687,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 23.3,
        excluded: null,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190412/v4/L-L1_GWOSC_4KHZ_R1-1239082247-32.txt.gz',
        gpsStart: 1239082247,
        sha256:
          'f9f03a53deb7c2991faadb0d0f478326cf86933db6fb0e48fb8b8b803c63f1e7',
        bytes: 1337725,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 41.3,
        excluded: null,
      },
    },
    chosen: 'L1',
    rule: 'Of the two LIGO detectors, the one with the larger Q-scan energy within 0.1 s of the catalog GPS time, excluding any detector with a transient GWOSC documents inside the window.',
    psd: {
      method: 'Welch',
      segmentSeconds: 4,
      overlap: 0.5,
      window: 'Hann',
      average: 'median, bias-corrected',
      segments: 11,
      excludedGps: [[1239082260.1, 1239082263.1]],
      why: 'the 3 s around the merger were left out, so the signal is not estimated as noise',
    },
    whitening: {
      function: 'js/gw/match.js whiten()',
      band: [20, 400],
      noiseUnits:
        'divided by 4.4826e-1, the standard deviation of the whitened file away from its tapered ends',
    },
    window: {
      gpsStart: 1239082259.599609,
      before: 2.5,
      after: 0.5,
    },
    decimation: {
      from: 4096,
      to: 1024,
      method:
        'every fourth sample; no further filter, because whitening zeroed everything above 400 Hz',
      powerAboveNewNyquist: 0.00003622,
    },
    quantisation: {
      bits: 16,
      scale: 6542.221115,
      stepInNoiseSigma: 0.0001529,
      maxErrorInNoiseSigma: 0.00007641,
      sliceTableAgreesWithin: '1 per cent at every slice',
    },
    sourceSamples: 131072,
    keptSamples: 3072,
    payloadSha256:
      'ee1adc9df6b2bec7783ac5c8dfbf0c7698eca39833894b409333e0bc7e956420',
  },
  GW190521: {
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190521/v4/',
    },
    strainRelease: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190521/v4/',
    },
    detectors: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190521/v4/H-H1_GWOSC_4KHZ_R1-1242442952-32.txt.gz',
        gpsStart: 1242442952,
        sha256:
          'cbd3588e77ad0f785a29b59438677da6875731ea871a3d46a28cd5c63d2f4ffa',
        bytes: 1359493,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 45.5,
        excluded: null,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190521/v4/L-L1_GWOSC_4KHZ_R1-1242442952-32.txt.gz',
        gpsStart: 1242442952,
        sha256:
          '2b75e9e8d938d7a0e0c710658964407fb8b976ca570ffe1cc0f39b14935a46ae',
        bytes: 1337447,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 94.8,
        excluded: null,
      },
    },
    chosen: 'L1',
    rule: 'Of the two LIGO detectors, the one with the larger Q-scan energy within 0.1 s of the catalog GPS time, excluding any detector with a transient GWOSC documents inside the window.',
    psd: {
      method: 'Welch',
      segmentSeconds: 4,
      overlap: 0.5,
      window: 'Hann',
      average: 'median, bias-corrected',
      segments: 11,
      excludedGps: [[1242442965.4, 1242442968.4]],
      why: 'the 3 s around the merger were left out, so the signal is not estimated as noise',
    },
    whitening: {
      function: 'js/gw/match.js whiten()',
      band: [20, 400],
      noiseUnits:
        'divided by 4.4764e-1, the standard deviation of the whitened file away from its tapered ends',
    },
    window: {
      gpsStart: 1242442964.900391,
      before: 2.5,
      after: 0.5,
    },
    decimation: {
      from: 4096,
      to: 1024,
      method:
        'every fourth sample; no further filter, because whitening zeroed everything above 400 Hz',
      powerAboveNewNyquist: 0.00008217,
    },
    quantisation: {
      bits: 16,
      scale: 7068.014283,
      stepInNoiseSigma: 0.0001415,
      maxErrorInNoiseSigma: 0.00007074,
      sliceTableAgreesWithin: '1 per cent at every slice',
    },
    sourceSamples: 131072,
    keptSamples: 3072,
    payloadSha256:
      '78ee138aea2df74af8c41425ab25ab9d92c690d5374331b9a67d84517795f0c9',
  },
  GW190814: {
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 3,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190814/v3/',
    },
    strainRelease: {
      catalog: 'GWTC-2.1-confident',
      version: 3,
      doi: 'https://doi.org/10.7935/qf3a-3z67',
      json: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190814/v3/',
    },
    detectors: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190814/v3/H-H1_GWOSC_4KHZ_R1-1249852241-32.txt.gz',
        gpsStart: 1249852241,
        sha256:
          '6887e6376f0e7cd4cfacccb1ec874657aa46fcf2e6f73a87b6e04f68ca0fc9f2',
        bytes: 1363019,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 16.6,
        excluded: null,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190814/v3/L-L1_GWOSC_4KHZ_R1-1249852241-32.txt.gz',
        gpsStart: 1249852241,
        sha256:
          '1c5a36fdb1b49439edca2b730e226550fc82e30ed903ab8960f23f0f8c2e3d1c',
        bytes: 1341387,
        samples: 131072,
        sampleRate: 4096,
        seconds: 32,
        energyNearMerger: 26.3,
        excluded: null,
      },
    },
    chosen: 'L1',
    rule: 'Of the two LIGO detectors, the one with the larger Q-scan energy within 0.1 s of the catalog GPS time, excluding any detector with a transient GWOSC documents inside the window.',
    psd: {
      method: 'Welch',
      segmentSeconds: 4,
      overlap: 0.5,
      window: 'Hann',
      average: 'median, bias-corrected',
      segments: 12,
      excludedGps: [[1249852255, 1249852258]],
      why: 'the 3 s around the merger were left out, so the signal is not estimated as noise',
    },
    whitening: {
      function: 'js/gw/match.js whiten()',
      band: [20, 400],
      noiseUnits:
        'divided by 4.4430e-1, the standard deviation of the whitened file away from its tapered ends',
    },
    window: {
      gpsStart: 1249852254.5,
      before: 2.5,
      after: 0.5,
    },
    decimation: {
      from: 4096,
      to: 1024,
      method:
        'every fourth sample; no further filter, because whitening zeroed everything above 400 Hz',
      powerAboveNewNyquist: 0.00007114,
    },
    quantisation: {
      bits: 16,
      scale: 6252.28683,
      stepInNoiseSigma: 0.0001599,
      maxErrorInNoiseSigma: 0.00007996,
      sliceTableAgreesWithin: '1 per cent at every slice',
    },
    sourceSamples: 131072,
    keptSamples: 3072,
    payloadSha256:
      'c7a270ba9e50c900587f1728a6caca259759f5b3ad784fb79f5e2816d0bfa772',
  },
};
