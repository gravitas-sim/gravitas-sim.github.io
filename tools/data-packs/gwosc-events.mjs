// =============================================================================
// Five gravitational-wave events, from GWOSC strain, as a data pack
// -----------------------------------------------------------------------------
//   npm run gwosc:data         fetch what is missing, process, write the module
//                              and data-packs/gwosc-five-events.json
//   npm run gwosc:check        verify both, no network
//   npm run gwosc:provenance   rebuild both from the cached strain and compare
//
// Those commands run tools/build-gwosc-events.mjs, which hands this pack to
// tools/build-data-packs.mjs runDataset(): the build, check and rebuild every
// data pack goes through (DATA_PACKS.md), with each raw file fetched and
// checked against its pin by tools/data-packs/pinned.mjs. This file is the
// transformation. Until Roadmap II Prompt 62 it was a builder of its own and
// wrote its record as js/data/gw/gwoscEventsProvenance.js; the record is the
// pack manifest now, and it pins one more thing than the old record did: the
// GWOSC event-API answer each event's catalog values are copied from, which
// the build reads and holds the copied values to.
//
// What this is
// -----------------------------------------------------------------------------
// Five compact-binary mergers, each as a few seconds of whitened strain from
// one LIGO detector, at 1024 samples per second, with the noise spectrum the
// detector had at the time. From the heaviest to the lightest: GW190521,
// GW150914, GW190412, GW190814 and GW170817. The strain is an observation. The
// whitening, the noise spectrum and everything the lesson reads off the
// time-frequency map are measurements this project makes from it. The masses,
// distances and signal-to-noise ratios are GWOSC catalog values, copied, and
// the lesson says which is which on every screen.
//
// This is not js/data/gw/gw150914.js, and GW150914 is here anyway
// -----------------------------------------------------------------------------
// That module is the collaboration's published figure data: 0.2 s of strain
// they had already band-passed to 35-350 Hz and notched. A comparison across
// events has to put every event through the same processing, and that one had
// different processing before it arrived, so GW150914 is acquired again here
// from GWOSC's 32-second strain file and treated exactly like the other four.
// The figure data stays where it is, doing what it does: the listening lesson's
// two GW150914 screens are unchanged.
//
// How the five were chosen
// -----------------------------------------------------------------------------
// Nine candidates were fetched and put through the processing below before
// anything was written. An event is here only if its chirp is visible in the
// processed data and it adds a contrast the others do not. The four rejected,
// with the reason measured on 2026-09-23 and recorded in PROVENANCE.selection:
// GW151226 and GW170608, low-mass binary black holes whose tracks are at or
// below the noise pixel by pixel; GW170814, a near twin of GW150914 in mass;
// and GW200115, a neutron star-black hole pair whose largest energy near the
// catalog time is below what noise alone reaches. None of that is rebuilt by
// this tool - it is the record of a decision, not a computation.
//
// What is done to the numbers, in order
// -----------------------------------------------------------------------------
//   1. The 32-second, 4096 Hz text strain file, parsed as published.
//   2. The noise PSD, by a median Welch estimate over 4-second Hann segments
//      of the same file, leaving out the seconds around the merger for the
//      four black-hole events. GW170817 is in band for the whole file, so
//      nothing can be left out, and the record says so.
//   3. Whitened by that PSD - js/gw/match.js whiten(), the function the lab
//      uses, given the real noise rather than the design curve - and
//      band-limited to 20-400 Hz.
//   4. Scaled to unit standard deviation over the file, so the committed
//      numbers are in units of the detector's own noise.
//   5. A window cut around the merger, and every fourth sample kept: 4096 Hz
//      to 1024 Hz. Safe without a further filter because step 3 zeroed
//      everything above 400 Hz; the power that the window's edges leak above
//      the new Nyquist frequency is measured and must be under 0.1%.
//   6. Quantised to 16-bit integers, one scale per event. Eight bits were
//      tried first and moved one of the lesson's readings by 1.6 per cent; the
//      build now checks that every reading agrees to 1 per cent between the
//      committed copy and the full-precision data, and refuses otherwise.
//
// What is not done: no gating, no glitch subtraction, no inversion or shift
// between detectors, no template, no matched filter, no fit.
// =============================================================================

import { Buffer } from 'node:buffer';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { welchPsd, psdFunction } from '../../js/gw/psd.js';
import { whiten } from '../../js/gw/match.js';
import { fft, nextPowerOfTwo } from '../../js/gw/fft.js';
import { sha256 } from './pinned.mjs';
import {
  qScan,
  loudestInstant,
  loudestFrequencyAt,
  signalEnd,
} from '../../js/gw/qscan.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
// Overridable the way tools/docs-facts.mjs's cache is, so the tests can hand the
// tool an empty or a corrupt cache and see it refuse, without the network and
// without touching the real one.
const cacheDir = () =>
  process.env.GRAVITAS_GWOSC_CACHE
    ? path.resolve(process.env.GRAVITAS_GWOSC_CACHE)
    : path.join(REPO, '.gwosc-cache');

/**
 * The tool version that wrote the pack. A change to what this file writes
 * bumps it, and packs:check fails on a manifest that names another.
 */
export const TRANSFORM_VERSION = '1.0.0';

/** The rate GWOSC publishes, and the rate this bundle keeps. */
const SOURCE_RATE = 4096;
const RATE = 1024;
const DECIMATE = SOURCE_RATE / RATE;
const SOURCE_SECONDS = 32;

/** The band every event is whitened into, so the five are comparable. */
const BAND = [20, 400];

/** The Q-scan the widget draws, and the build uses to choose a detector. */
const SCAN = { fMin: 30, fMax: 400, rows: 48 };

/** The one line of provenance the readout shows. */
const CITATION =
  'GWOSC, LIGO/Virgo/KAGRA open data (CC BY 4.0); catalog values from GWTC-1 and GWTC-2.1';

const ARCHIVE = {
  name: 'Gravitational Wave Open Science Center',
  url: 'https://gwosc.org',
  attribution:
    'This research has made use of data or software obtained from the ' +
    'Gravitational Wave Open Science Center (gwosc.org), a service of the ' +
    'LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA.',
  // UTC, as GPS times are: the files were fetched at 04:03 UTC, which was
  // still 22 September where the build ran.
  retrieved: '2026-09-23 UTC',
};

/**
 * The five events.
 *
 * `values` is the event version the catalog numbers are copied from and
 * `strainRelease` the version whose 32-second files carry the strain. For the
 * three O3 events they are the same. For GW150914 they are not: GWTC-2.1
 * re-analysed it but publishes no strain of its own, which stays attached to
 * the GWTC-1 version. GW170817 is not in GWTC-2.1 at all, so its numbers are
 * GWTC-1's. Both facts are shown beside the values rather than smoothed over.
 *
 * Catalog numbers are {value, lower, upper, unit} exactly as GWOSC serves them,
 * lower and upper being offsets. A missing one is null and is shown as missing.
 *
 * `window` is seconds before and after the catalog GPS time, and each length
 * is what the lesson reads plus a margin, not a round number. The slice table
 * reaches 2 s before merger and the Q-scan's time resolution at 30 Hz is about
 * Q / (2 pi 30 Hz), 0.04 s at Q = 8, so the black-hole events get 2.5 s before.
 * GW170817 gets 6: its track is visible for about the last two, and the four
 * before that are where the model predicts a signal the data do not show,
 * which is the point the lesson makes with it. Windows of 4 and 8 s were tried
 * first and cost 26 KB for nothing the lesson reads.
 *
 * `q` is the Q-scan's quality factor. A long, slow chirp is better resolved at
 * higher Q; a merger that is over in a tenth of a second needs lower. *
 * The order is the order they were recorded in, and it is the order of the
 * widget's event control. It is deliberately not the order of their masses:
 * the lesson asks for a ranking by chirp mass made from the measurements, and
 * a list already sorted heaviest-first would be the answer.
 */
const EVENTS = [
  {
    id: 'GW150914',
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      bytes: 6934,
      sha256:
        '6fefd9719c8350eadae48c02e5e6a2a5151bd1d96c71bb00017a6b64f9614733',
    },
    strainRelease: { catalog: 'GWTC-1-confident', version: 3 },
    gps: 1126259462.4,
    window: [2.5, 0.5],
    q: 8,
    psdExclude: [2, 1],
    strain: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW150914/v3/H-H1_GWOSC_4KHZ_R1-1126259447-32.txt.gz',
        gpsStart: 1126259447,
        sha256:
          'fefe8717306109460b6c9cff74da6beb9e80ee624824b4b09bdd2c54ce9b4dfc',
        bytes: 1286320,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW150914/v3/L-L1_GWOSC_4KHZ_R1-1126259447-32.txt.gz',
        gpsStart: 1126259447,
        sha256:
          '43d30a710d6ed4a8f27d13f45182f3825cbe99f87287b518618c8ff0e25e0d7c',
        bytes: 1219514,
      },
    },
    catalog: {
      mass_1_source: { value: 34.6, lower: -2.6, upper: 4.4, unit: 'M_sun' },
      mass_2_source: { value: 30.0, lower: -4.6, upper: 2.9, unit: 'M_sun' },
      chirp_mass_source: {
        value: 27.9,
        lower: -1.5,
        upper: 1.7,
        unit: 'M_sun',
      },
      total_mass_source: {
        value: 64.5,
        lower: -3.2,
        upper: 3.7,
        unit: 'M_sun',
      },
      final_mass_source: {
        value: 61.5,
        lower: -2.9,
        upper: 3.4,
        unit: 'M_sun',
      },
      luminosity_distance: {
        value: 470.0,
        lower: -160.0,
        upper: 140.0,
        unit: 'Mpc',
      },
      redshift: { value: 0.1, lower: -0.03, upper: 0.03, unit: '' },
      network_matched_filter_snr: {
        value: 26.0,
        lower: -0.2,
        upper: 0.1,
        unit: '',
      },
    },
  },
  {
    id: 'GW170817',
    values: {
      catalog: 'GWTC-1-confident',
      version: 3,
      bytes: 20094,
      sha256:
        '2cd7e903b895f5d3a406383362172a411b127efdcf9be65590a8234b9352ddcb',
    },
    strainRelease: { catalog: 'GWTC-1-confident', version: 3 },
    gps: 1187008882.4,
    window: [6, 0.5],
    q: 24,
    // In band for the whole 32-second file: there is no stretch without the
    // signal in it to estimate the noise from. The median over segments is
    // barely moved by a signal this weak per segment, and the record says so.
    psdExclude: null,
    strain: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW170817/v3/H-H1_GWOSC_4KHZ_R1-1187008867-32.txt.gz',
        gpsStart: 1187008867,
        sha256:
          '3fa9b80df10c94922fea1d130ccb18c632176bb3b8e0ccb91ac16c19f1f822f1',
        bytes: 1282112,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW170817/v3/L-L1_GWOSC_4KHZ_R1-1187008867-32.txt.gz',
        gpsStart: 1187008867,
        sha256:
          'b2811cb625ddc624297a0c6bae8fe7d35c501f3415442525bc64bf8fc2dabbed',
        bytes: 1287611,
      },
    },
    catalog: {
      mass_1_source: { value: 1.46, lower: -0.1, upper: 0.12, unit: 'M_sun' },
      mass_2_source: { value: 1.27, lower: -0.09, upper: 0.09, unit: 'M_sun' },
      chirp_mass_source: {
        value: 1.186,
        lower: -0.001,
        upper: 0.001,
        unit: 'M_sun',
      },
      total_mass_source: { value: null, lower: null, upper: null, unit: null },
      final_mass_source: {
        value: 2.8,
        lower: null,
        upper: null,
        unit: 'M_sun',
      },
      luminosity_distance: {
        value: 40.0,
        lower: -15.0,
        upper: 7.0,
        unit: 'Mpc',
      },
      redshift: { value: 0.01, lower: 0.0, upper: 0.0, unit: '' },
      network_matched_filter_snr: {
        value: 33.0,
        lower: null,
        upper: null,
        unit: '',
      },
    },
  },
  {
    id: 'GW190412',
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      bytes: 18417,
      sha256:
        '54f05bdd9939ee55573bbfd0859aec49ef415d1994b00b88ebac358cba01b948',
    },
    strainRelease: { catalog: 'GWTC-2.1-confident', version: 4 },
    gps: 1239082262.1,
    window: [2.5, 0.5],
    q: 8,
    psdExclude: [2, 1],
    strain: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190412/v4/H-H1_GWOSC_4KHZ_R1-1239082247-32.txt.gz',
        gpsStart: 1239082247,
        sha256:
          'b9713b0ec82b6a1549560f5376f81ae16c4f462f9299736cd6dbfe9f89e7829d',
        bytes: 1334687,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190412/v4/L-L1_GWOSC_4KHZ_R1-1239082247-32.txt.gz',
        gpsStart: 1239082247,
        sha256:
          'f9f03a53deb7c2991faadb0d0f478326cf86933db6fb0e48fb8b8b803c63f1e7',
        bytes: 1337725,
      },
    },
    catalog: {
      mass_1_source: { value: 27.7, lower: -6.0, upper: 6.0, unit: 'M_sun' },
      mass_2_source: { value: 9.0, lower: -1.4, upper: 2.0, unit: 'M_sun' },
      chirp_mass_source: {
        value: 13.3,
        lower: -0.5,
        upper: 0.5,
        unit: 'M_sun',
      },
      total_mass_source: {
        value: 36.8,
        lower: -4.4,
        upper: 4.7,
        unit: 'M_sun',
      },
      final_mass_source: {
        value: 35.6,
        lower: -4.5,
        upper: 4.8,
        unit: 'M_sun',
      },
      luminosity_distance: {
        value: 720.0,
        lower: -220.0,
        upper: 240.0,
        unit: 'Mpc',
      },
      redshift: { value: 0.15, lower: -0.04, upper: 0.04, unit: '' },
      network_matched_filter_snr: {
        value: 19.8,
        lower: -0.3,
        upper: 0.2,
        unit: '',
      },
    },
  },
  {
    id: 'GW190521',
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 4,
      bytes: 18463,
      sha256:
        '23f6bb1e62531a16d367e9ddd85b2515e0da2afd4bd9dfabb84ec7ad49be2e81',
    },
    strainRelease: { catalog: 'GWTC-2.1-confident', version: 4 },
    gps: 1242442967.4,
    window: [2.5, 0.5],
    q: 8,
    psdExclude: [2, 1],
    strain: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190521/v4/H-H1_GWOSC_4KHZ_R1-1242442952-32.txt.gz',
        gpsStart: 1242442952,
        sha256:
          'cbd3588e77ad0f785a29b59438677da6875731ea871a3d46a28cd5c63d2f4ffa',
        bytes: 1359493,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190521/v4/L-L1_GWOSC_4KHZ_R1-1242442952-32.txt.gz',
        gpsStart: 1242442952,
        sha256:
          '2b75e9e8d938d7a0e0c710658964407fb8b976ca570ffe1cc0f39b14935a46ae',
        bytes: 1337447,
      },
    },
    catalog: {
      mass_1_source: { value: 98.4, lower: -21.7, upper: 33.6, unit: 'M_sun' },
      mass_2_source: { value: 57.2, lower: -30.1, upper: 27.1, unit: 'M_sun' },
      chirp_mass_source: {
        value: 63.3,
        lower: -14.6,
        upper: 19.6,
        unit: 'M_sun',
      },
      total_mass_source: {
        value: 153.1,
        lower: -16.2,
        upper: 42.2,
        unit: 'M_sun',
      },
      final_mass_source: {
        value: 147.4,
        lower: -16.0,
        upper: 40.0,
        unit: 'M_sun',
      },
      luminosity_distance: {
        value: 3310.0,
        lower: -1800.0,
        upper: 2790.0,
        unit: 'Mpc',
      },
      redshift: { value: 0.56, lower: -0.27, upper: 0.36, unit: '' },
      network_matched_filter_snr: {
        value: 14.3,
        lower: -0.4,
        upper: 0.5,
        unit: '',
      },
    },
  },
  {
    id: 'GW190814',
    values: {
      catalog: 'GWTC-2.1-confident',
      version: 3,
      bytes: 17616,
      sha256:
        'ba7d52087aa1e14500cad3501d9ca470bfd20d5ea59b0e205a0ab3cb1bb99344',
    },
    strainRelease: { catalog: 'GWTC-2.1-confident', version: 3 },
    gps: 1249852257.0,
    window: [2.5, 0.5],
    q: 8,
    psdExclude: [2, 1],
    strain: {
      H1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190814/v3/H-H1_GWOSC_4KHZ_R1-1249852241-32.txt.gz',
        gpsStart: 1249852241,
        sha256:
          '6887e6376f0e7cd4cfacccb1ec874657aa46fcf2e6f73a87b6e04f68ca0fc9f2',
        bytes: 1363019,
      },
      L1: {
        url: 'https://gwosc.org/eventapi/json/GWTC-2.1-confident/GW190814/v3/L-L1_GWOSC_4KHZ_R1-1249852241-32.txt.gz',
        gpsStart: 1249852241,
        sha256:
          '1c5a36fdb1b49439edca2b730e226550fc82e30ed903ab8960f23f0f8c2e3d1c',
        bytes: 1341387,
      },
    },
    catalog: {
      mass_1_source: { value: 23.3, lower: -1.4, upper: 1.4, unit: 'M_sun' },
      mass_2_source: { value: 2.6, lower: -0.1, upper: 0.1, unit: 'M_sun' },
      chirp_mass_source: {
        value: 6.11,
        lower: -0.05,
        upper: 0.06,
        unit: 'M_sun',
      },
      total_mass_source: {
        value: 25.9,
        lower: -1.3,
        upper: 1.3,
        unit: 'M_sun',
      },
      final_mass_source: {
        value: 25.7,
        lower: -1.3,
        upper: 1.3,
        unit: 'M_sun',
      },
      luminosity_distance: {
        value: 230.0,
        lower: -50.0,
        upper: 40.0,
        unit: 'Mpc',
      },
      redshift: { value: 0.05, lower: -0.01, upper: 0.01, unit: '' },
      network_matched_filter_snr: {
        value: 25.3,
        lower: -0.2,
        upper: 0.1,
        unit: '',
      },
    },
  },
];

/**
 * Transients GWOSC documents inside a window, which make a detector
 * unusable for it. Not a judgement made here: each entry cites where GWOSC
 * says so. The original analyses of GW170817 zeroed 0.2 s around this one.
 */
const DOCUMENTED_GLITCHES = [
  {
    event: 'GW170817',
    detector: 'L1',
    gps: 1187008881.389,
    what: 'a sub-5 ms saturation in a digital-to-analog converter, about 1.1 s before merger',
    source: 'https://gwosc.org/events/GW170817/',
  },
];

/** The detector-choice rule, stated once and applied by the build. */
const DETECTOR_RULE =
  'Of the two LIGO detectors, the one with the larger Q-scan energy within ' +
  '0.1 s of the catalog GPS time, excluding any detector with a transient ' +
  'GWOSC documents inside the window.';

/** The candidates tested and rejected before anything was written. */
const REJECTED = [
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
];

/** What a strain file is cached under. */
const cacheName = url => url.split('/').pop();

/** The GWOSC event-API answer an event's catalog values are copied from. */
const valuesPin = e => ({
  file: `${e.id}-${e.values.catalog}-v${e.values.version}.json`,
  url: `https://gwosc.org/eventapi/json/${e.values.catalog}/${e.id}/v${e.values.version}/`,
  bytes: e.values.bytes,
  sha256: e.values.sha256,
  // A day after the strain: these were first pinned by Roadmap II Prompt 62.
  retrieved: '2026-10-01',
});

/**
 * Every raw file, as the manifest pins it: each event's two strain files, then
 * the five event-API answers, read 2026-10-01 and byte-stable across fetches.
 */
const RAW = [
  ...EVENTS.flatMap(e =>
    ['H1', 'L1'].map(det => ({
      file: cacheName(e.strain[det].url),
      url: e.strain[det].url,
      bytes: e.strain[det].bytes,
      sha256: e.strain[det].sha256,
    }))
  ),
  ...EVENTS.map(valuesPin),
];

/**
 * Hold the catalog values copied into EVENTS to the event-API answer they
 * were copied from: every value and both offsets, the unit, and the GPS time.
 * @returns {string[]} Problems
 */
function catalogAgrees(event, answer) {
  const problems = [];
  const e = Object.values(answer.events || {})[0];
  if (!e || e.commonName !== event.id) {
    return [`${event.id}: the event-API answer is for ${e?.commonName}`];
  }
  if (e.GPS !== event.gps) {
    problems.push(`${event.id}: GPS ${event.gps}, GWOSC says ${e.GPS}`);
  }
  for (const [k, v] of Object.entries(event.catalog)) {
    const theirs = [e[k], e[`${k}_lower`], e[`${k}_upper`], e[`${k}_unit`]];
    if (
      JSON.stringify([v.value, v.lower, v.upper, v.unit]) !==
      JSON.stringify(theirs)
    ) {
      problems.push(
        `${event.id}: ${k} is ${JSON.stringify(v)}; GWOSC says ${JSON.stringify(theirs)}`
      );
    }
  }
  return problems;
}

/**
 * Parse GWOSC's text strain: comment lines starting with '#', then one strain
 * value per line. Refuses anything that is not 32 s at 4096 Hz of finite
 * numbers, because every later step assumes exactly that.
 */
function parseStrain(gz, label) {
  const text = gunzipSync(gz).toString('utf8');
  const values = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    values.push(Number(s));
  }
  const want = SOURCE_SECONDS * SOURCE_RATE;
  if (values.length !== want) {
    throw new Error(`${label}: ${values.length} samples, expected ${want}`);
  }
  const bad = values.findIndex(v => !Number.isFinite(v));
  if (bad >= 0)
    throw new Error(`${label}: sample ${bad} is not a finite number`);
  return Float64Array.from(values);
}

/** Standard deviation of a stretch, for putting whitened data in noise units. */
function stdOf(x, i0 = 0, i1 = x.length) {
  let m = 0;
  for (let i = i0; i < i1; i++) m += x[i];
  m /= i1 - i0;
  let v = 0;
  for (let i = i0; i < i1; i++) v += (x[i] - m) ** 2;
  return Math.sqrt(v / (i1 - i0));
}

/**
 * Fraction of a series' power above a frequency.
 *
 * By FFT with zero padding to a power of two. Padding interpolates the
 * spectrum without adding power, so the fraction is unchanged by it.
 */
function powerAbove(x, rate, fCut) {
  const n = nextPowerOfTwo(x.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  re.set(x);
  fft(re, im, false);
  let total = 0;
  let above = 0;
  for (let k = 1; k < n / 2; k++) {
    const p = re[k] * re[k] + im[k] * im[k];
    total += p;
    if ((k * rate) / n > fCut) above += p;
  }
  return total > 0 ? above / total : 0;
}

/**
 * Process one detector's file into the window the lesson uses.
 * @returns {object} The window at 1024 Hz, in noise units, and what it cost
 */
function processDetector(event, detector, raw) {
  const spec = event.strain[detector];
  const t = gps => gps - spec.gpsStart; // seconds from the file's first sample
  const tMerger = t(event.gps);

  const exclude = event.psdExclude
    ? [[tMerger - event.psdExclude[0], tMerger + event.psdExclude[1]]]
    : [];
  const est = welchPsd(raw, {
    sampleRate: SOURCE_RATE,
    segmentSeconds: 4,
    overlap: 0.5,
    average: 'median',
    exclude,
  });
  const white = whiten(raw, {
    sampleRate: SOURCE_RATE,
    psd: psdFunction(est),
    fLow: BAND[0],
    fHigh: BAND[1],
  });

  // whiten() tapers the first and last eighth of a sixteenth of the file with
  // a Tukey window; the noise scale is measured away from both tapers.
  const edge = Math.ceil(0.0625 * white.length) + SOURCE_RATE;
  const sigma = stdOf(white, edge, white.length - edge);
  for (let i = 0; i < white.length; i++) white[i] /= sigma;

  // The window, starting on a multiple of the decimation so the kept samples
  // are exactly every fourth one of the published grid.
  const i0 =
    Math.round(((tMerger - event.window[0]) * SOURCE_RATE) / DECIMATE) *
    DECIMATE;
  const i1 =
    Math.round(((tMerger + event.window[1]) * SOURCE_RATE) / DECIMATE) *
    DECIMATE;
  if (i0 < edge || i1 > white.length - edge) {
    throw new Error(
      `${event.id} ${detector}: the window runs into the whitening taper`
    );
  }
  const full = white.slice(i0, i1);
  const aliased = powerAbove(full, SOURCE_RATE, RATE / 2);
  if (aliased > 1e-3) {
    throw new Error(
      `${event.id} ${detector}: ${(aliased * 100).toFixed(3)}% of the power is above the ` +
        `new Nyquist frequency; decimating would alias it`
    );
  }
  const kept = new Float64Array(full.length / DECIMATE);
  for (let i = 0; i < kept.length; i++) kept[i] = full[i * DECIMATE];

  return {
    kept,
    t0: spec.gpsStart + i0 / SOURCE_RATE,
    psd: est,
    psdExcluded: exclude.map(([a, b]) => [
      Number((spec.gpsStart + a).toFixed(3)),
      Number((spec.gpsStart + b).toFixed(3)),
    ]),
    sigma,
    aliasedFraction: aliased,
  };
}

/** The Q-scan of a kept window, as the widget will compute it. */
const scanOf = (samples, q) => qScan(samples, { sampleRate: RATE, q, ...SCAN });

/** Energy near the catalog time, for choosing a detector. */
function energyNearMerger(event, processed) {
  const scan = scanOf(processed.kept, event.q);
  const tm = event.gps - processed.t0;
  return loudestInstant(scan, tm - 0.1, tm + 0.1).energy;
}

/**
 * The slices the lesson reads, so the build can check that quantising the
 * data does not change what a student will be told.
 */
//
// Inspiral only. Slices within a few hundredths of a second of the end are in
// the merger and ringdown, where the frequency is set by the remnant rather
// than by the chirp mass, and ordering events by chirp mass there is not
// expected to hold: 0.02 s before its end GW150914 reads 148 Hz, above the
// lighter GW190412. Two seconds out, nothing in any event clears the noise.
const SLICES = [1, 0.5, 0.3, 0.2, 0.1, 0.05];
function sliceTable(samples, event, t0) {
  const scan = scanOf(samples, event.q);
  const tc = event.gps - t0;
  const end = signalEnd(scan, tc - 0.1, tc + 0.1);
  if (end.time === null) return SLICES.map(() => null);
  return SLICES.map(tau => loudestFrequencyAt(scan, end.time - tau).freq);
}

/**
 * Little-endian int16 base64, one scale per event.
 *
 * Sixteen bits, not eight, and the reason is measured rather than assumed: at
 * 8 bits the loudest frequency 0.1 s before GW150914's merger moved by 1.6 per
 * cent between the full-precision data and the committed copy - more than the
 * 1 per cent the build allows - because near the noise ceiling a slice's peak
 * is flat and a hundredth of the noise moves it. Sixteen bits costs twice the
 * bytes and makes the question go away.
 */
function encodeInt16(values) {
  let peak = 0;
  for (const v of values) peak = Math.max(peak, Math.abs(v));
  const scale = 32767 / peak;
  const ints = new Int16Array(values.length);
  for (let i = 0; i < values.length; i++)
    ints[i] = Math.round(values[i] * scale);
  return {
    scale,
    ints,
    data: Buffer.from(ints.buffer, ints.byteOffset, ints.byteLength).toString(
      'base64'
    ),
  };
}

/**
 * The noise spectrum, sampled at a few frequencies a reader can compare.
 *
 * Each value is the broadband level: the median of the estimate over a tenth
 * either side of the frequency, not the one 0.25 Hz bin at it. A detector's
 * spectrum is full of narrow lines, and a single bin lands on one often
 * enough to matter - Hanford's value at 300 Hz, the fifth harmonic of the
 * 60 Hz mains, read three times the level on either side of it for both events
 * it is drawn for. The median over the band is not moved by the few bins a
 * line occupies, so what is reported is the noise floor a signal has to
 * clear, which is what the readout calls it.
 */
const ASD_FREQS = [20, 30, 50, 70, 100, 150, 200, 300, 400];
const asdAt = (psd, f) => {
  const band = [];
  for (let k = 0; k < psd.freq.length; k++) {
    if (psd.freq[k] >= 0.9 * f && psd.freq[k] <= 1.1 * f) band.push(psd.psd[k]);
  }
  band.sort((a, b) => a - b);
  const m = band.length;
  const median =
    m % 2 ? band[(m - 1) / 2] : 0.5 * (band[m / 2 - 1] + band[m / 2]);
  return Number(Math.sqrt(median).toPrecision(3));
};

async function prettierOptions() {
  try {
    return JSON.parse(
      await readFile(path.join(REPO, '.prettierrc.json'), 'utf8')
    );
  } catch {
    return {};
  }
}

/**
 * Read, check, process and choose, for every event.
 * @param {Uint8Array[]} rawFiles - In RAW's order, already checked against
 *   their pins by tools/data-packs/pinned.mjs
 */
function gather(rawFiles) {
  const out = [];
  for (const [k, event] of EVENTS.entries()) {
    const answer = JSON.parse(
      Buffer.from(rawFiles[EVENTS.length * 2 + k]).toString('utf8')
    );
    const disagree = catalogAgrees(event, answer);
    if (disagree.length) throw new Error(disagree.join('\n'));
    const processed = {};
    const record = { detectors: {} };
    for (const [d, det] of ['H1', 'L1'].entries()) {
      const spec = event.strain[det];
      const gz = Buffer.from(rawFiles[2 * k + d]);
      const raw = parseStrain(gz, `${event.id} ${det}`);
      processed[det] = processDetector(event, det, raw);
      const glitch = DOCUMENTED_GLITCHES.find(
        g =>
          g.event === event.id &&
          g.detector === det &&
          g.gps >= processed[det].t0 &&
          g.gps <= event.gps + event.window[1]
      );
      record.detectors[det] = {
        url: spec.url,
        gpsStart: spec.gpsStart,
        sha256: spec.sha256,
        bytes: spec.bytes,
        samples: raw.length,
        sampleRate: SOURCE_RATE,
        seconds: SOURCE_SECONDS,
        energyNearMerger: Number(
          energyNearMerger(event, processed[det]).toFixed(1)
        ),
        excluded: glitch
          ? {
              reason: `documented transient at GPS ${glitch.gps}: ${glitch.what}`,
              source: glitch.source,
            }
          : null,
      };
    }

    const usable = Object.entries(record.detectors).filter(
      ([, d]) => !d.excluded
    );
    const chosen = usable.sort(
      (a, b) => b[1].energyNearMerger - a[1].energyNearMerger
    )[0][0];
    const p = processed[chosen];

    // The measurement a student will be shown, from full precision and from
    // the committed 16-bit copy. They must agree slice for slice, or the
    // quantisation has changed the science and the build refuses.
    const { scale, ints, data } = encodeInt16(p.kept);
    const decoded = Float64Array.from(ints, v => v / scale);
    const before = sliceTable(p.kept, event, p.t0);
    const after = sliceTable(decoded, event, p.t0);
    // Null must match null; a frequency must agree to 1 per cent, a sixth of
    // the spacing between the map's rows.
    const differs = (a, b) =>
      (a === null) !== (b === null) ||
      (a !== null && Math.abs(a / b - 1) > 0.01);
    if (before.some((f, i) => differs(f, after[i]))) {
      throw new Error(
        `${event.id}: quantising to 16 bits changed the slice table\n` +
          `  full precision ${JSON.stringify(before)}\n  16-bit         ${JSON.stringify(after)}`
      );
    }
    let maxErr = 0;
    for (let i = 0; i < p.kept.length; i++)
      maxErr = Math.max(maxErr, Math.abs(decoded[i] - p.kept[i]));

    out.push({
      event,
      chosen,
      processed: p,
      data,
      scale,
      record: {
        ...record,
        chosen,
        rule: DETECTOR_RULE,
        psd: {
          method: 'Welch',
          segmentSeconds: 4,
          overlap: 0.5,
          window: 'Hann',
          average: 'median, bias-corrected',
          segments: p.psd.segments,
          excludedGps: p.psdExcluded.length ? p.psdExcluded : null,
          why: event.psdExclude
            ? `the ${event.psdExclude[0] + event.psdExclude[1]} s around the merger were left out, so the signal is not estimated as noise`
            : 'nothing left out: the signal is in band for the whole 32-second file, and too weak per 4-second segment to move a median appreciably',
        },
        whitening: {
          function: 'js/gw/match.js whiten()',
          band: BAND,
          noiseUnits: `divided by ${p.sigma.toExponential(4)}, the standard deviation of the whitened file away from its tapered ends`,
        },
        window: {
          gpsStart: Number(p.t0.toFixed(6)),
          before: event.window[0],
          after: event.window[1],
        },
        decimation: {
          from: SOURCE_RATE,
          to: RATE,
          method:
            'every fourth sample; no further filter, because whitening zeroed everything above 400 Hz',
          powerAboveNewNyquist: Number(p.aliasedFraction.toExponential(3)),
        },
        quantisation: {
          bits: 16,
          scale: Number(scale.toFixed(6)),
          stepInNoiseSigma: Number((1 / scale).toExponential(3)),
          maxErrorInNoiseSigma: Number(maxErr.toExponential(3)),
          sliceTableAgreesWithin: '1 per cent at every slice',
        },
        sourceSamples: SOURCE_SECONDS * SOURCE_RATE,
        keptSamples: p.kept.length,
        payloadSha256: sha256(Buffer.from(data, 'base64')),
      },
    });
  }
  return out;
}

/** The catalog papers and the strain releases, by GWOSC catalog name. */
const CATALOG_CITES = {
  'GWTC-1-confident': [
    {
      text: 'LIGO Scientific and Virgo Collaborations (Abbott et al.) 2019, Phys. Rev. X 9, 031040 (GWTC-1)',
      doi: '10.1103/PhysRevX.9.031040',
    },
    {
      text: 'GWOSC strain data release for GWTC-1',
      doi: '10.7935/82H3-HH23',
    },
  ],
  'GWTC-2.1-confident': [
    {
      text: 'LIGO Scientific and Virgo Collaborations (Abbott et al.) 2024, Phys. Rev. D 109, 022001 (GWTC-2.1)',
      doi: '10.1103/PhysRevD.109.022001',
    },
    {
      text: 'GWOSC strain data release for GWTC-2.1',
      doi: '10.7935/qf3a-3z67',
    },
  ],
};

/**
 * What the pack cites. Each DOI was resolved on 2026-10-01, through Crossref
 * for the papers and DataCite for the two data releases, and the record it
 * returned matches the text beside it. Until then the record paired each
 * catalog paper's text with its strain release's DOI.
 */
const CITATIONS = [
  ...CATALOG_CITES['GWTC-1-confident'],
  ...CATALOG_CITES['GWTC-2.1-confident'],
  {
    text: 'Abbott et al. 2021, SoftwareX 13, 100658 (O1 and O2 open data)',
    doi: '10.1016/j.softx.2021.100658',
  },
  {
    text: 'Abbott et al. 2023, ApJS 267, 29 (O3 open data)',
    doi: '10.3847/1538-4365/acdc9f',
  },
];

/**
 * The pack's runtime metadata and the rest of its manifest, from the strain.
 * @param {Uint8Array[]} rawFiles - RAW, pinned
 */
function build(rawFiles) {
  const rows = gather(rawFiles);
  const events = {};
  const records = {};
  for (const r of rows) {
    const e = r.event;
    events[e.id] = {
      detector: r.chosen,
      gps: e.gps,
      t0: Number(r.processed.t0.toFixed(6)),
      sampleRate: RATE,
      count: r.processed.kept.length,
      q: e.q,
      band: BAND,
      asd: {
        freq: ASD_FREQS,
        value: ASD_FREQS.map(f => asdAt(r.processed.psd, f)),
      },
      catalog: e.catalog,
      catalogVersion: `${e.values.catalog} v${e.values.version}`,
      strainVersion: `${e.strainRelease.catalog} v${e.strainRelease.version}`,
      scale: Number(r.scale.toFixed(6)),
      data: r.data,
    };
    records[e.id] = {
      values: {
        catalog: e.values.catalog,
        version: e.values.version,
        json: valuesPin(e).url,
        pinned: valuesPin(e).file,
        paperDoi: CATALOG_CITES[e.values.catalog][0].doi,
      },
      strainRelease: {
        ...e.strainRelease,
        json: `https://gwosc.org/eventapi/json/${e.strainRelease.catalog}/${e.id}/v${e.strainRelease.version}/`,
        dataDoi: CATALOG_CITES[e.strainRelease.catalog][1].doi,
      },
      ...r.record,
    };
  }
  const ids = rows.map(r => r.event.id);
  const sourceBytes = rows.reduce(
    (t, r) => t + r.record.detectors.H1.bytes + r.record.detectors.L1.bytes,
    0
  );
  const payloadBytes = rows.reduce((t, r) => t + r.data.length, 0);
  const excluded = rows.reduce(
    (n, r) =>
      n + Object.values(r.record.detectors).filter(d => d.excluded).length,
    0
  );

  const meta = {
    id: 'gwosc-five-events',
    version: '1.0.0',
    title: 'Five gravitational-wave events: whitened GWOSC strain',
    object: {
      name: 'Five compact-binary mergers',
      identifiers: ids,
    },
    facility: {
      observatory: 'LIGO Hanford and LIGO Livingston, through GWOSC',
      instrument: `one detector per event, ${SOURCE_SECONDS} s at ${SOURCE_RATE} Hz`,
      pipeline: 'GWOSC 4 kHz strain releases (GWTC-1 v3, GWTC-2.1 v4)',
    },
    dataType: 'strain',
    origin: 'observed',
    credit: CITATION,
    license: {
      status: 'cc-by-4.0',
      statement:
        'GWOSC data are released under CC BY 4.0. GWOSC asks that work using them cite the open-data papers and carry its acknowledgement (NOTICE).',
    },
    retrieved: ARCHIVE.retrieved.slice(0, 10),
    time: {
      scale: 'GPS',
      reference: 'seconds from each event’s t0, a GPS time EVENTS gives',
      unit: 's',
    },
    columns: [
      {
        name: 'time',
        unit: 's',
        description: 't0 + i / sampleRate',
      },
      {
        name: 'whitened strain',
        unit: '',
        description: `whitened by the detector’s own noise, band-limited to ${BAND[0]}-${BAND[1]} Hz, in units of its standard deviation`,
      },
    ],
    masks: [
      {
        column: 'detector',
        rule: 'a detector with a transient GWOSC documents inside the window is not used',
        dropped: excluded,
      },
    ],
    reductions: [
      `Whitened by the noise spectrum the detector had at the time and band-limited to ${BAND[0]}-${BAND[1]} Hz, in units of that noise.`,
      `A window around each merger, decimated from ${SOURCE_RATE} to ${RATE} samples a second.`,
      'Quantised to 16-bit integers, one scale per event.',
      'The masses, distances and signal-to-noise ratios are GWOSC’s catalog values, copied: Gravitas measured none of them.',
    ],
  };

  const manifestRest = {
    source: {
      archive: ARCHIVE.name,
      urls: [ARCHIVE.url, ...RAW.map(r => r.url)],
      citations: CITATIONS,
      acknowledgement: ARCHIVE.attribution,
      terms: ['https://gwosc.org/data/', 'https://gwosc.org/acknowledgement/'],
    },
    raw: RAW,
    transformation: {
      script: 'tools/data-packs/gwosc-events.mjs',
      version: TRANSFORM_VERSION,
      options: {
        band: BAND,
        sourceRate: SOURCE_RATE,
        rate: RATE,
        scan: SCAN,
        slices: SLICES,
      },
      steps: [
        `Parse the ${SOURCE_SECONDS}-second, ${SOURCE_RATE} Hz text strain file as published, refusing anything else.`,
        'Estimate the noise PSD by a median Welch estimate over 4-second Hann segments of the same file, leaving out the seconds around the merger for the four black-hole events.',
        `Whiten by that PSD with js/gw/match.js whiten() and band-limit to ${BAND[0]}-${BAND[1]} Hz.`,
        'Scale to unit standard deviation over the file, so the numbers are in units of the detector’s own noise.',
        `Cut a window around the merger and keep every ${DECIMATE}th sample, ${SOURCE_RATE} Hz to ${RATE} Hz; the power the window leaks above the new Nyquist frequency is measured and must be under 0.1%.`,
        'Quantise to 16-bit integers, one scale per event, refusing any quantisation that moves a reading of the slice table by more than 1 per cent.',
        'Hold every catalog value copied beside the strain to the GWOSC event-API answer it was copied from, pinned with the strain.',
      ],
      record: {
        detectorRule: DETECTOR_RULE,
        size: {
          sourceBytes,
          sourceFiles: rows.length * 2,
          payloadBase64Bytes: payloadBytes,
        },
      },
    },
    records,
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
      rejected: REJECTED,
    },
    documentedGlitches: DOCUMENTED_GLITCHES,
    notDone: [
      'No gating and no glitch subtraction. A detector with a documented transient in the window is not used instead.',
      'No time shift or sign change between detectors.',
      'No template, matched filter, fit or parameter estimate. Nothing here is a detection statistic.',
      'No chirp-mass estimate. One was tried - the 0PN relation inverted from pairs of points on the time-frequency track - and rejected: it failed outright on two of the five events, ran 16 per cent high on the one where it was stable, and depended on tuning a student could not see.',
    ],
    assumptions: [
      'The strain is as GWOSC publishes it; nothing is gated, subtracted, shifted or inverted.',
      'The catalog values are the GWOSC event versions named beside them, copied; Gravitas did not measure any of them.',
    ],
    compatible: {
      widgets: ['gw-events'],
      investigations: ['listening-to-spacetime'],
    },
    offline: 'core',
  };

  return {
    meta,
    manifestRest,
    render: PACK => renderModule(PACK, events, ids),
  };
}

/** The module the browser loads: PACK, the slice times and the five events. */
async function renderModule(PACK, events, ids) {
  const runtime = `// =============================================================================
// Five gravitational-wave events, as whitened GWOSC strain
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/data-packs/gwosc-events.mjs;
// run \`npm run gwosc:data\` to regenerate, \`npm run gwosc:check\` to verify the
// committed module offline, and \`npm run gwosc:provenance\` to rebuild it from
// the cached strain and compare byte for byte.
//
// OBSERVED STRAIN, from one LIGO detector per event, whitened by the noise that
// detector had at the time, band-limited to 20-400 Hz, in units of that noise,
// at 1024 samples per second. The catalog values beside each event are GWOSC's,
// copied, and are not measurements this project made. The full record - URLs,
// checksums, the detector-choice rule and the energies it compared, the noise
// estimate, the decimation and the quantisation - is the data pack's manifest,
// data-packs/gwosc-five-events.json, which nothing in the application loads.
// PACK is that manifest's runtime fields.
// =============================================================================

/* eslint-disable */

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/**
 * Seconds before the end of the chirp at which the lesson reads the loudest
 * frequency. The build checks that the 16-bit copy gives the same answer, to
 * 1 per cent, at each of these as the full-precision data did.
 */
export const BEFORE_MERGER = ${JSON.stringify(SLICES)};

/** The five events, keyed by name. Strain is base64 little-endian int16. */
export const EVENTS = ${JSON.stringify(events, null, 2)};

/** Every event, heaviest chirp mass first. */
export const EVENT_IDS = ${JSON.stringify(ids)};

/** Decoded events, made once each. */
const cache = new Map();

/**
 * One event's strain, decoded to noise units.
 * @param {string} id - A key of EVENTS
 * @returns {object} The event with \`samples\` as a Float64Array
 */
export function decodeEvent(id) {
  if (cache.has(id)) return cache.get(id);
  const e = EVENTS[id];
  if (!e) throw new Error('Unknown event: ' + id);
  const binary =
    typeof atob === 'function'
      ? atob(e.data)
      : Buffer.from(e.data, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
  const samples = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i++) samples[i] = ints[i] / e.scale;
  const decoded = { id, ...e, samples };
  delete decoded.data;
  cache.set(id, decoded);
  return decoded;
}
`;
  return (await import('prettier')).format(runtime, {
    parser: 'babel',
    ...(await prettierOptions()),
  });
}

/**
 * Verify a module against its manifest without the strain.
 * @returns {string[]} Problems
 */
function check(mod, manifest) {
  const problems = [];
  const { EVENTS: E, EVENT_IDS, BEFORE_MERGER, decodeEvent } = mod;
  const R = manifest.records;
  if (!mod.PACK?.credit) problems.push('the data module names no source');
  if (!Array.isArray(BEFORE_MERGER) || !BEFORE_MERGER.length)
    problems.push('no slice times');
  for (const k of [
    'records',
    'evidence',
    'selection',
    'documentedGlitches',
    'notDone',
  ]) {
    if (!manifest[k]) problems.push(`the manifest is missing ${k}`);
  }
  if (!manifest.source?.acknowledgement) problems.push('no GWOSC attribution');
  if (JSON.stringify(EVENT_IDS) !== JSON.stringify(EVENTS.map(e => e.id))) {
    problems.push(`events ${EVENT_IDS}, expected ${EVENTS.map(e => e.id)}`);
  }
  for (const spec of EVENTS) {
    const e = E?.[spec.id];
    const r = R?.[spec.id];
    if (!e || !r) {
      problems.push(`${spec.id}: missing`);
      continue;
    }
    if (sha256(Buffer.from(e.data, 'base64')) !== r.payloadSha256) {
      problems.push(
        `${spec.id}: the data does not match the payload checksum in its record`
      );
    }
    if (JSON.stringify(e.catalog) !== JSON.stringify(spec.catalog)) {
      problems.push(
        `${spec.id}: catalog values differ from the ones pinned in the tool`
      );
    }
    for (const det of ['H1', 'L1']) {
      if (r.detectors?.[det]?.sha256 !== spec.strain[det].sha256) {
        problems.push(
          `${spec.id} ${det}: source checksum is not the pinned one`
        );
      }
    }
    if (
      !['H1', 'L1'].includes(e.detector) ||
      r.detectors[e.detector].excluded
    ) {
      problems.push(`${spec.id}: uses a detector the record excludes`);
    }
    const d = decodeEvent(spec.id);
    if (d.samples.length !== e.count || !d.samples.every(Number.isFinite)) {
      problems.push(
        `${spec.id}: strain does not decode to ${e.count} finite samples`
      );
    }
    const seconds = e.count / e.sampleRate;
    if (Math.abs(seconds - (spec.window[0] + spec.window[1])) > 0.01) {
      problems.push(
        `${spec.id}: ${seconds} s of strain, expected ${spec.window[0] + spec.window[1]}`
      );
    }
    if (!(e.gps > e.t0 && e.gps < e.t0 + seconds)) {
      problems.push(
        `${spec.id}: the catalog time is outside the committed window`
      );
    }
  }
  return problems;
}

/**
 * The scientific check, on the committed strain: for each binary black hole,
 * the end of the chirp - the last instant anything in the time-frequency map
 * clears the noise - falls within 0.1 s of the time GWOSC's catalog gives.
 */
function validate(mod) {
  const endMinusCatalogMs = {};
  for (const id of mod.EVENT_IDS) {
    const d = mod.decodeEvent(id);
    const scan = scanOf(d.samples, d.q);
    const end = signalEnd(scan, 0, d.count / d.sampleRate).time;
    endMinusCatalogMs[id] =
      end === null ? null : Number(((end - (d.gps - d.t0)) * 1000).toFixed(1));
  }
  const holes = mod.EVENT_IDS.filter(id => id !== 'GW170817');
  return {
    check:
      'for each of the four binary black holes, the end of the chirp measured on the committed strain (js/gw/qscan.js signalEnd) is within 100 ms of the GWOSC catalog time. GW170817, a neutron-star pair whose track ends below the noise ceiling, is held to its discovery paper by tests/gwoscEvents.test.js instead.',
    against: EVENTS.map(e => ({
      quantity: `${e.id} merger time (GPS)`,
      value: e.gps,
      unit: 's',
      ref: `GWOSC ${e.values.catalog} v${e.values.version}`,
    })),
    result: { endMinusCatalogMs },
    ok: holes.every(
      id =>
        endMinusCatalogMs[id] !== null && Math.abs(endMinusCatalogMs[id]) <= 100
    ),
  };
}

/** The pack, as tools/build-data-packs.mjs builds, checks and rebuilds it. */
export const GWOSC_EVENTS = {
  id: 'gwosc-five-events',
  label: 'The five GWOSC events',
  manifest: 'data-packs/gwosc-five-events.json',
  // No capability package: the module is reached by the instrument's own
  // dynamic import and the Observatory's, and precached by name as before.
  capability: null,
  module: 'js/data/gw/gwoscEvents.js',
  transformVersion: TRANSFORM_VERSION,
  raw: RAW,
  cache: cacheDir,
  refetch: 'npm run gwosc:data',
  ownCommands: true,
  build,
  decode: mod => mod,
  check,
  validate,
};
