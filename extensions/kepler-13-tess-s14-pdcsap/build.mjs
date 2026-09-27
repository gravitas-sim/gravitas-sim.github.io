#!/usr/bin/env node
// =============================================================================
// Kepler-13A and its hot Jupiter, as TESS saw it in sector 14
// -----------------------------------------------------------------------------
//   node extensions/kepler-13-tess-s14-<flux>/build.mjs  (raw file in
//        .packs-cache/, or GRAVITAS_PACKS_CACHE=<dir>)
//
// One of two data-pack extensions made from the same SPOC light curve, and
// this is its transformation script; the two directories' scripts are the
// same but for FLUX below. It reaches Gravitas only through the SDK's public
// API (sdk/lib/api.mjs). A data-pack extension provides one pack, so:
//
//   - **kepler-13-tess-s14-sap**: SAP_FLUX, all the light in the aperture;
//   - **kepler-13-tess-s14-pdcsap**: PDCSAP_FLUX, the same after SPOC removed
//     systematics and the light it attributes to other stars.
//
// Why Kepler-13: its A star, which the planet orbits, has a companion 1.2"
// away (TIC 1717079066, 0.25 mag fainter in the TESS band) that TESS cannot
// separate: its pixels are 21" across. So SPOC's CROWDSAP, the fraction of the
// aperture's light it gives to the target, is 0.549, and the SAP transit is a
// little over half the PDCSAP one. The published radius of Kepler-13Ab has
// ranged from 1.4 to 2.3 Jupiter radii (NASA Exoplanet Archive), mostly over
// that light and the star's radius: the lesson the Exoplanet Observatory's
// "diluted light" investigation is built on.
//
// The raw file is not committed: it is 1.96 MB, and its URL and checksum pin
// it. The SDK version this needs is 1.3.0, which reads SAP and records the
// crowding (sdk/README.md).
// =============================================================================

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  binTessLightCurve,
  checkObservation,
  foldedDepth,
  observationOf,
  readFits,
} from '../../sdk/lib/api.mjs';

/** Which of the two this directory builds: 'pdcsap' or 'sap'. */
const FLUX = 'pdcsap';
export const VERSION = '1.0.0';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = {
  file: 'tess2019198215352-s0014-0000000158324245-0150-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2019198215352-s0014-0000000158324245-0150-s_lc.fits',
  bytes: 1964160,
  sha256: '06ce86a5dac99a7ee4152199330025dc7f6c6d25e426e571fda4e221e35ed342',
};
// The published values the checks are against; none is written into the data.
const PERIOD = {
  value: 1.763588,
  unit: 'd',
  ref: 'Esteves et al. 2015, ApJ 804, 150 (KOI-13 b)',
};
const RADIUS_RATIO = {
  value: 0.087373,
  ref: 'Esteves et al. 2015, ApJ 804, 150 (Rp/R* = 0.087373 +- 0.000023)',
};
const BIN = { binMinutes: 20, minPerBin: 3, errStepPpm: 5, crowding: true };
const sha256 = b => createHash('sha256').update(b).digest('hex');
const json = v => `${JSON.stringify(v, null, 2)}\n`;

function rawBytes() {
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

/** What each of the two packs is, and how it is checked. */
const VARIANTS = {
  pdcsap: {
    flux: 'PDCSAP',
    title: 'Kepler-13A: TESS sector 14 light curve, corrected (PDCSAP)',
    fluxText: 'PDCSAP flux over its median',
    errText: 'propagated PDCSAP error over the median, one sigma, per bin',
    assumption:
      "PDCSAP flux has had instrumental systematics and crowding removed by SPOC: it subtracts the fraction 1 - CROWDSAP of the aperture's light as other stars', and divides by FLFRCSAP. Here that is the companion B, and the correction assumes the planet orbits A.",
    // Limb and gravity darkening deepen the transit below (Rp/R*)^2 by about a
    // tenth for an A star in the TESS band, and binning rounds its bottom.
    check: {
      check:
        "folding on the published period finds the published radius ratio's depth, within 0.0015",
      expected: Number((RADIUS_RATIO.value ** 2).toFixed(5)),
      tolerance: 0.0015,
    },
  },
  sap: {
    flux: 'SAP',
    title: 'Kepler-13A: TESS sector 14 light curve, as collected (SAP)',
    fluxText: 'SAP flux (all the light in the aperture) over its median',
    errText: 'propagated SAP error over the median, one sigma, per bin',
    assumption:
      "SAP flux is the aperture's light as collected: it holds the companion's light as well as A's, so a transit on A is diluted by the fraction CROWDSAP. Systematics are not removed.",
    // The same transit diluted by CROWDSAP: the depth over the corrected one
    // is that fraction, within what systematics and binning leave.
    check: {
      check:
        'folding on the published period finds the corrected depth times CROWDSAP, within 0.001',
      expectedFrom: 'crowding',
      tolerance: 0.001,
    },
  },
};

function variant(units, key) {
  const v = VARIANTS[key];
  const head = units[0].cards;
  const { series, record } = binTessLightCurve(units, { ...BIN, flux: v.flux });
  const id = `kepler-13-tess-s14-${key}`;
  const PACK = {
    id,
    version: VERSION,
    title: v.title,
    object: {
      name: 'Kepler-13',
      identifiers: [`TIC ${head.TICID}`, 'KOI-13', 'Kepler-13 A'],
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
    credit: 'TESS, sector 14 (NASA; SPOC light curve from MAST)',
    license: {
      status: 'public-domain',
      statement:
        'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
    },
    retrieved: '2026-09-26',
    time: { scale: 'TDB', reference: 'BTJD = BJD - 2457000', unit: 'd' },
    columns: [
      {
        name: 'time',
        unit: 'd',
        description: 'bin centre: t0 + (index + 0.5) x binDays, in BTJD',
      },
      { name: 'flux', unit: '', description: v.fluxText },
      {
        name: 'flux error',
        unit: '',
        uncertaintyOf: 'flux',
        description: v.errText,
      },
    ],
    masks: [
      {
        column: 'QUALITY',
        rule: 'any nonzero flag drops the cadence',
        dropped: record.flagged,
      },
      {
        column: `TIME, ${v.flux}_FLUX, ${v.flux}_FLUX_ERR`,
        rule: 'a cadence without a finite value in all three is dropped',
        dropped: record.notFinite,
      },
      {
        column: 'bin',
        rule: `a bin with fewer than ${BIN.minPerBin} kept cadences is dropped`,
        dropped: record.binsDropped,
      },
    ],
    // What the pipeline says of the light in the aperture, as its header
    // records it (the LIGHTCURVE extension's CROWDSAP and FLFRCSAP).
    crowding: record.crowding,
    reductions: [
      `${BIN.binMinutes}-minute bins average up to ${BIN.binMinutes / 2} two-minute cadences each; the transit, about 3.2 hours long, spans nine or ten bins.`,
      `Flux is kept to 1 ppm and its error to ${BIN.errStepPpm} ppm (binned-relative-flux/1).`,
    ],
  };
  const seriesText = json({ PACK, SERIES: series });
  const o = observationOf({ PACK, SERIES: series });
  const problems = checkObservation(o);
  if (problems.length)
    throw new Error(`${id}: the series is not clean: ${problems[0]}`);
  return { key, id, PACK, series, seriesText, record, o };
}

/** Build this directory's two files, and return them without writing. */
export function build(bytes = rawBytes()) {
  const units = readFits(new Uint8Array(bytes));
  const head = units[0].cards;
  if (head.TICID !== 158324245 || head.SECTOR !== 14)
    throw new Error(`the raw file is TIC ${head.TICID} sector ${head.SECTOR}`);
  // The collected pack's check is against the corrected pack's depth, so the
  // corrected series is binned here either way; only FLUX's is written.
  const pdcDepth = foldedDepth(variant(units, 'pdcsap').o, PERIOD.value);
  const out = {};
  for (const b of [variant(units, FLUX)]) {
    const v = VARIANTS[b.key];
    const expected =
      v.check.expectedFrom === 'crowding'
        ? Number((pdcDepth * b.record.crowding.crowdsap).toFixed(5))
        : v.check.expected;
    const depth = foldedDepth(b.o, PERIOD.value);
    if (Math.abs(depth - expected) > v.check.tolerance)
      throw new Error(
        `${b.id} fails its check: depth ${depth.toFixed(5)}, expected ${expected}`
      );
    const pack = {
      format: 'gravitas.observation-data-pack',
      formatVersion: 1,
      ...b.PACK,
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
            text: 'Esteves et al. 2015, ApJ 804, 150 (2015ApJ...804..150E): the period and radius ratio the pack is checked against',
          },
          {
            text: 'Shporer et al. 2014, ApJ 788, 92 (2014ApJ...788...92S): the planet orbits Kepler-13A',
          },
        ],
      },
      raw: [RAW],
      derived: {
        file: 'series.json',
        bytes: Buffer.byteLength(b.seriesText),
        sha256: sha256(b.seriesText),
      },
      transformation: {
        script: 'build.mjs',
        version: VERSION,
        steps: [
          `Read ${RAW.file} with the SDK's readFits(), pinned by its checksum.`,
          `Mask, normalize and bin ${v.flux}_FLUX with the SDK's binTessLightCurve(), the pipeline every TESS pack uses: QUALITY 0 and finite values only, divided by the median, ${BIN.binMinutes}-minute bins of at least ${BIN.minPerBin} cadences; the header's CROWDSAP and FLFRCSAP recorded.`,
          'Encode it as binned-relative-flux/1.',
        ],
        record: b.record,
      },
      assumptions: [
        v.assumption,
        'Times are barycentric dynamical time for the target, as SPOC corrects them.',
        'Which star the planet orbits is not in these data: 21-arcsecond pixels cannot separate A and B, 1.2 arcseconds apart. That it orbits A comes from other observations (Shporer et al. 2014 and the work it cites).',
      ],
      validation: {
        check: v.check.check,
        against: [
          { quantity: 'period', ...PERIOD },
          {
            quantity: '(Rp/R*)^2',
            value: Number((RADIUS_RATIO.value ** 2).toFixed(5)),
            unit: '',
            ref: RADIUS_RATIO.ref,
          },
        ],
        rule: {
          kind: 'folded-depth',
          periodDays: PERIOD.value,
          expected,
          tolerance: v.check.tolerance,
        },
        result: { foldedDepth: Number(depth.toFixed(5)) },
      },
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    out['series.json'] = b.seriesText;
    out['pack.json'] = json(pack);
    out.record = b.record;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  for (const f of ['series.json', 'pack.json'])
    writeFileSync(path.join(HERE, f), out[f]);
  const r = out.record;
  console.log(
    `kepler-13-tess-s14-${FLUX}: ${r.bins} bins from ${r.kept} of ${r.cadences} cadences; CROWDSAP ${r.crowding.crowdsap}`
  );
}
