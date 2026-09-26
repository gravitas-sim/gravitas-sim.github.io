#!/usr/bin/env node
// =============================================================================
// SU Draconis, an RR Lyrae star, as TESS saw it in sector 15
// -----------------------------------------------------------------------------
//   node extensions/su-dra-tess-s15/build.mjs   (raw file in .packs-cache/, or
//                                               GRAVITAS_PACKS_CACHE=<dir>)
//
// This data-pack extension's transformation script. It writes series.json and
// pack.json beside itself from the SPOC light curve MAST serves, and it
// reaches Gravitas only through the SDK's public API (sdk/lib/api.mjs): the
// FITS reader and the binning every TESS pack uses, both public since SDK
// 1.2.0 because this extension needed them (CATALOG.md, "What the SDK lacked").
//
// Why SU Dra, and not RR Lyr itself: the TESS Input Catalog lists RR Lyrae
// (TIC 159717514) at Tmag 16.6 against its V of 7.2, so SPOC sized a 4-pixel
// aperture for a faint star, took 92% of the light for contamination, and
// wrote a PDCSAP flux that goes negative. SU Dra (TIC 142848794) is catalogued
// at Tmag 9.45 against V 9.83, loses 1.5% of its aperture's light to
// neighbors, and is a fundamental-mode RR Lyrae with no Blazhko modulation,
// so one period describes all 26 days.
//
// The raw file is not committed: it is 1.9 MB, and its URL and checksum pin
// it. Code, so it belongs to the pull request and is never in the archive.
// =============================================================================

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  binTessLightCurve,
  checkObservation,
  observationOf,
  readFits,
} from '../../sdk/lib/api.mjs';

export const VERSION = '1.0.0';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = {
  file: 'tess2019226182529-s0015-0000000142848794-0151-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2019226182529-s0015-0000000142848794-0151-s_lc.fits',
  bytes: 1906560,
  sha256: 'feea6b25dd3d2a9762365b4fd4588887640076381999a43f53f87bd892e6e4a0',
};
// Monson et al. 2017, AJ 153, 96, Table 1 ("RRL Galactic Calibrators and
// Ephemerides"): SU Dra, RRab, no Blazhko period listed.
const PERIOD_D = 0.66042001;
const BIN = { binMinutes: 10, minPerBin: 3, errStepPpm: 5, fluxStepPpm: 20 };
const sha256 = b => createHash('sha256').update(b).digest('hex');
const json = v => `${JSON.stringify(v, null, 2)}\n`;

function rawBytes() {
  // Where the built-in packs' raw files are kept too (DATA_PACKS.md).
  const dir =
    process.env.GRAVITAS_PACKS_CACHE ||
    path.join(HERE, '..', '..', '.packs-cache');
  const file = path.join(dir, RAW.file);
  if (!existsSync(file)) {
    throw new Error(
      `${RAW.file} is not in ${dir}: fetch it from ${RAW.url}, or set GRAVITAS_PACKS_CACHE`
    );
  }
  const bytes = readFileSync(file);
  if (bytes.length !== RAW.bytes || sha256(bytes) !== RAW.sha256) {
    throw new Error(
      `${RAW.file} is not the file this pack pins (${bytes.length} bytes, ${sha256(bytes)})`
    );
  }
  return bytes;
}

/** Build the two files, and return them without writing. */
export function build(bytes = rawBytes()) {
  const units = readFits(new Uint8Array(bytes));
  const head = units[0].cards;
  const { series, record } = binTessLightCurve(units, BIN);
  const PACK = {
    id: 'su-dra-tess-s15',
    version: VERSION,
    title: 'SU Draconis: an RR Lyrae star, TESS sector 15',
    object: {
      name: 'SU Dra',
      identifiers: [`TIC ${head.TICID}`],
      ra: head.RA_OBJ,
      dec: head.DEC_OBJ,
      frame: 'ICRS, epoch J2000',
      tessMagnitude: head.TESSMAG,
    },
    facility: {
      observatory: 'TESS',
      instrument: `camera ${head.CAMERA}, CCD ${head.CCD}, 2-minute cadence`,
      pipeline: `SPOC ${head.PROCVER}`,
    },
    dataType: 'light-curve',
    origin: 'observed',
    credit: 'TESS, sector 15 (NASA; SPOC light curve from MAST)',
    license: {
      status: 'public-domain',
      statement:
        'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
    },
    retrieved: '2026-09-25',
    time: { scale: 'TDB', reference: 'BTJD = BJD - 2457000', unit: 'd' },
    columns: [
      {
        name: 'time',
        unit: 'd',
        description: 'bin centre: t0 + (index + 0.5) x binDays, in BTJD',
      },
      {
        name: 'flux',
        unit: '',
        description: 'PDCSAP flux over its median',
      },
      {
        name: 'flux error',
        unit: '',
        uncertaintyOf: 'flux',
        description:
          'propagated PDCSAP error over the median, one sigma, per bin',
      },
    ],
    masks: [
      {
        column: 'QUALITY',
        rule: 'any nonzero flag drops the cadence',
        dropped: record.flagged,
      },
      {
        column: 'TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR',
        rule: 'a cadence without a finite value in all three is dropped',
        dropped: record.notFinite,
      },
      {
        column: 'bin',
        rule: `a bin with fewer than ${BIN.minPerBin} kept cadences is dropped`,
        dropped: record.binsDropped,
      },
    ],
    reductions: [
      `${BIN.binMinutes}-minute bins average up to ${BIN.binMinutes / 2} two-minute cadences each; the pulsation's rise from minimum to maximum, 0.155 of a cycle or about two and a half hours, spans fifteen bins.`,
      `Flux is kept in steps of ${BIN.fluxStepPpm} ppm and its error in steps of ${BIN.errStepPpm} ppm (binned-relative-flux/2): the star swings from about 0.77 to 1.46 of its median, far past the 3.3% that binned-relative-flux/1 holds.`,
    ],
  };
  const seriesText = json({ PACK, SERIES: series });
  const o = observationOf({ PACK, SERIES: series });
  const problems = checkObservation(o);
  if (problems.length)
    throw new Error(`the series is not clean: ${problems[0]}`);
  const pack = {
    format: 'gravitas.observation-data-pack',
    formatVersion: 1,
    ...PACK,
    source: {
      archive: 'MAST (Barbara A. Mikulski Archive for Space Telescopes)',
      urls: [RAW.url],
      citations: [
        {
          text: 'TESS Light Curves - All Sectors, STScI/MAST',
          doi: '10.17909/t9-nmc8-f686',
        },
        {
          text: 'Ricker et al. 2015, JATIS 1, 014003 (TESS)',
          doi: '10.1117/1.JATIS.1.1.014003',
        },
        {
          text: 'Jenkins et al. 2016, Proc. SPIE 9913, 99133E (SPOC)',
          doi: '10.1117/12.2233418',
        },
        {
          text: 'Monson et al. 2017, AJ 153, 96, Table 1 (period of SU Dra)',
        },
      ],
    },
    raw: [RAW],
    derived: {
      file: 'series.json',
      bytes: Buffer.byteLength(seriesText),
      sha256: sha256(seriesText),
    },
    transformation: {
      script: 'build.mjs',
      version: VERSION,
      steps: [
        `Read ${RAW.file} with the SDK's readFits(), pinned by its checksum.`,
        "Mask, normalize and bin it with the SDK's binTessLightCurve(), the pipeline every TESS pack uses: QUALITY 0 and finite values only, divided by the median, 10-minute bins of at least 3 cadences.",
        `Encode it as binned-relative-flux/2, flux in steps of ${BIN.fluxStepPpm} ppm.`,
      ],
    },
    assumptions: [
      'PDCSAP flux has had instrumental systematics and crowding removed by SPOC; that correction is used as published. Its crowding estimate is sound here: CROWDSAP is 0.985.',
      'Times are barycentric dynamical time for the target, as SPOC corrects them.',
      "The star's period does not change measurably across one sector. RR Lyrae periods drift by parts in a billion a day.",
    ],
    validation: {
      check:
        'a 20-harmonic Fourier series fits best at the published period, within 0.00005 d',
      against: [
        {
          quantity: 'period',
          value: PERIOD_D,
          unit: 'd',
          ref: 'Monson et al. 2017, AJ 153, 96, Table 1',
        },
      ],
      rule: {
        kind: 'harmonic-period',
        periodDays: PERIOD_D,
        windowDays: 0.002,
        harmonics: 20,
        tolerance: 0.00005,
      },
    },
    compatible: { widgets: [], investigations: [] },
    offline: 'optional',
  };
  return {
    'series.json': seriesText,
    'pack.json': json(pack),
    record,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  for (const f of ['series.json', 'pack.json'])
    writeFileSync(path.join(HERE, f), out[f]);
  console.log(
    `su-dra-tess-s15: ${out.record.bins} bins from ${out.record.kept} of ${out.record.cadences} cadences`
  );
}
