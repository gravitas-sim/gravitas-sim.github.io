#!/usr/bin/env node
// =============================================================================
// Observation data packs: build, check, reproduce
// -----------------------------------------------------------------------------
//   npm run packs:data         fetch any missing raw product, build every pack
//   npm run packs:check        verify the committed packs, no network, no cache
//   npm run packs:provenance   rebuild every pack from the cached raw products
//                              and compare byte for byte
//
// A pack is three files: the manifest in data-packs/ (the full record -
// sources, pins, transformation, validation), the runtime module in
// js/data/observations/ (the metadata an interface shows and the encoded
// series, nothing else), and the capability package in capabilities/ that
// ships the module and says its offline class. This writes the first two; the
// third is hand-written and checked against them. DATA_PACKS.md describes the
// format, OBSERVATION_DATA_PACK_GATE.md the decision behind it.
//
// Raw products are never committed. They are fetched only here, into
// .packs-cache/ (gitignored), and read only after their pin matches
// (tools/data-packs/pinned.mjs). No lesson depends on an archive being up.
// =============================================================================

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readFits } from './data-packs/fits.mjs';
import { pinnedBytes, sha256 } from './data-packs/pinned.mjs';
import {
  agreesWithPackage,
  runtimeMeta,
  validateDataPack,
} from './data-packs/schema.mjs';
import {
  binLightCurve,
  foldedDepth,
  TRANSFORM_VERSION,
} from './data-packs/tess-light-curve.mjs';
import {
  APERTURE_BITS,
  APERTURE_VERSION,
  BITS_SOURCE,
  encodeAperture,
  readAperture,
} from './data-packs/tess-aperture.mjs';
import { checkObservation, observationOf } from '../js/observation.js';
import { separation, skyOf } from '../js/observatory/wcs.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE =
  process.env.GRAVITAS_PACKS_CACHE || path.join(REPO, '.packs-cache');

// --- The packs ----------------------------------------------------------------

/**
 * HD 209458 in TESS sector 56. The first transiting exoplanet, and the star
 * *Can You Detect This Planet?* and *Design the Schedule* are built on.
 *
 * Twenty-minute bins, as the gate recommended: half the bytes of ten-minute
 * bins, the same transit depth to 1e-4, and ingress (about 25 minutes)
 * resolved into a bin or two. A lesson that measures ingress shape is the
 * reason to change it, and pays for the bytes when it does.
 */
const TESS_HD209458_S56 = {
  id: 'tess-hd209458-s56-lc',
  manifest: 'data-packs/tess-hd209458-s56-lc.json',
  capability: 'capabilities/tess-hd209458-s56.json',
  module: 'js/data/observations/tessHd209458S56.js',
  exportName: 'tessHd209458S56',
  transformVersion: TRANSFORM_VERSION,
  raw: [
    {
      file: 'tess2022244194134-s0056-0000000420814525-0243-s_lc.fits',
      url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2022244194134-s0056-0000000420814525-0243-s_lc.fits',
      bytes: 2039040,
      sha256:
        '1b76b4a4b73e24954fa6e29a7e28a174685113ecdbad1bf10ef0e7b766ce99e9',
    },
  ],
  options: { binMinutes: 20, minPerBin: 3, errStepPpm: 5 },
  // Published values for the check; none of them is written into the data.
  period: {
    value: 3.52474859,
    unit: 'd',
    ref: 'Knutson et al. 2007, ApJ 655, 564',
  },
  radiusRatioSquared: {
    value: 0.0146,
    unit: '',
    ref: 'Torres et al. 2008, ApJ 677, 1324 (Rp/Rs = 0.12086)',
  },
  // Limb darkening deepens a central transit below (Rp/Rs)^2 - by about a
  // tenth for a G0 star in the TESS band - so the check allows that much.
  depthTolerance: 0.003,

  /** @param {Uint8Array[]} raw */
  build(raw) {
    const units = readFits(raw[0]);
    const { series, record } = binLightCurve(units, this.options);
    const P = units[0].cards;
    const H = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE').cards;
    if (P.OBJECT !== 'TIC 420814525' || P.SECTOR !== 56) {
      throw new Error(
        `the raw file is ${P.OBJECT} sector ${P.SECTOR}, not this pack`
      );
    }
    if (H.TIMESYS !== 'TDB' || H.BJDREFI + H.BJDREFF !== 2457000) {
      throw new Error(
        `time system ${H.TIMESYS} BJD - ${H.BJDREFI + H.BJDREFF}, not BTJD`
      );
    }
    const { binMinutes, minPerBin, errStepPpm } = this.options;
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'HD 209458: TESS sector 56 light curve',
      object: {
        name: 'HD 209458',
        identifiers: [P.OBJECT],
        ra: P.RA_OBJ,
        dec: P.DEC_OBJ,
        frame: 'ICRS, epoch J2000',
        tessMagnitude: P.TESSMAG,
      },
      facility: {
        observatory: 'TESS',
        instrument: `camera ${P.CAMERA}, CCD ${P.CCD}, 2-minute cadence`,
        pipeline: `SPOC ${P.PROCVER}`,
      },
      dataType: 'light-curve',
      origin: 'observed',
      credit: 'TESS, sector 56 (NASA; SPOC light curve from MAST)',
      license: {
        status: 'public-domain',
        statement:
          'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
      },
      retrieved: '2026-09-24',
      time: { scale: H.TIMESYS, reference: 'BTJD = BJD - 2457000', unit: 'd' },
      columns: [
        {
          name: 'time',
          unit: 'd',
          description: 'bin center: t0 + (index + 0.5) x binDays, in BTJD',
        },
        { name: 'flux', unit: '', description: 'PDCSAP flux over its median' },
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
          rule: `a bin with fewer than ${minPerBin} kept cadences is dropped`,
          dropped: record.binsDropped,
        },
      ],
    };
    const manifestRest = {
      source: {
        archive: 'MAST (Barbara A. Mikulski Archive for Space Telescopes)',
        urls: this.raw.map(r => r.url),
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
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/tess-light-curve.mjs',
        version: TRANSFORM_VERSION,
        options: this.options,
        steps: [
          'Read TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR and QUALITY from the LIGHTCURVE binary table.',
          'Keep cadences with QUALITY 0 and a finite time, flux and error.',
          'Divide flux and error by the median kept flux.',
          `Average into ${binMinutes}-minute bins from t0, keeping bins with at least ${minPerBin} cadences; the bin error is the quadrature sum over the count.`,
          `Encode as binned-relative-flux/1: runs of bin indices, little-endian int16 ppm flux, uint8 error in ${errStepPpm} ppm steps.`,
        ],
        record,
      },
      assumptions: [
        'PDCSAP flux has had instrumental systematics and crowding removed by SPOC; that correction is used as published.',
        'Times are barycentric dynamical time for the target, as SPOC corrects them.',
      ],
      reductions: [
        `${binMinutes}-minute bins average ${binMinutes / 2} two-minute cadences each, which rounds ingress and egress to a bin.`,
        `Flux is kept to 1 ppm and its error to ${errStepPpm} ppm.`,
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /** The scientific check, on a decoded observation. */
  validate(o) {
    const depth = foldedDepth(o, this.period.value);
    const expected = this.radiusRatioSquared.value;
    return {
      check: `folding on the published period finds a transit of the published depth, within ${this.depthTolerance}`,
      against: [
        { quantity: 'period', ...this.period },
        { quantity: '(Rp/Rs)^2', ...this.radiusRatioSquared },
      ],
      result: { foldedDepth: Number(depth.toFixed(5)) },
      ok: Math.abs(depth - expected) <= this.depthTolerance,
    };
  },
};

/**
 * The same light curve's aperture mask: the 11 x 13 pixels read out around
 * HD 209458, and which of them the light curve summed. An image, and a small
 * one, copied as published. It is the image the observation workspace opens,
 * and the answer to where the light in the light curve came from.
 */
const TESS_HD209458_S56_APERTURE = {
  id: 'tess-hd209458-s56-aperture',
  manifest: 'data-packs/tess-hd209458-s56-aperture.json',
  capability: 'capabilities/tess-hd209458-s56.json',
  module: 'js/data/observations/tessHd209458S56Aperture.js',
  exportName: 'tessHd209458S56Aperture',
  transformVersion: APERTURE_VERSION,
  raw: TESS_HD209458_S56.raw,
  // The header's own count, and the target's catalog position as the header
  // gives it: the check holds the pixels to both.
  npixsap: { value: 23, ref: 'NPIXSAP in the APERTURE header' },
  target: {
    ra: 330.7950845247853,
    dec: 18.8843189579296,
    ref: 'TIC 420814525, RA_OBJ and DEC_OBJ in the APERTURE header (ICRS)',
  },

  /** @param {Uint8Array[]} raw */
  build(raw) {
    const units = readFits(raw[0]);
    const P = units[0].cards;
    if (P.OBJECT !== 'TIC 420814525' || P.SECTOR !== 56) {
      throw new Error(
        `the raw file is ${P.OBJECT} sector ${P.SECTOR}, not this pack`
      );
    }
    const a = readAperture(units);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'HD 209458: TESS sector 56 aperture mask',
      object: {
        name: 'HD 209458',
        identifiers: [P.OBJECT],
        ra: P.RA_OBJ,
        dec: P.DEC_OBJ,
        frame: 'ICRS, epoch J2000',
        tessMagnitude: P.TESSMAG,
      },
      facility: {
        observatory: 'TESS',
        instrument: `camera ${P.CAMERA}, CCD ${P.CCD}, 2-minute cadence`,
        pipeline: `SPOC ${P.PROCVER}`,
      },
      dataType: 'image',
      origin: 'observed',
      credit: 'TESS, sector 56 (NASA; SPOC light-curve aperture from MAST)',
      license: {
        status: 'public-domain',
        statement:
          'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
      },
      retrieved: '2026-09-24',
      columns: [
        {
          name: 'aperture flags',
          unit: '',
          description:
            'each pixel is the bit-wise OR of the bits in image.bits, as the archive has it',
        },
      ],
      masks: [],
      reductions: [],
      image: {
        width: a.width,
        height: a.height,
        pixels:
          'row by row from the lowest; x along a row and y up, 1 at the center of the first pixel, as in FITS',
        wcs: a.wcs,
        bits: APERTURE_BITS,
        bitsSource: BITS_SOURCE,
        ccdCorner: a.record.ccdCorner,
      },
    };
    const manifestRest = {
      source: {
        archive: 'MAST (Barbara A. Mikulski Archive for Space Telescopes)',
        urls: this.raw.map(r => r.url),
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
            text: BITS_SOURCE,
            url: 'https://ntrs.nasa.gov/citations/20180007935',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/tess-aperture.mjs',
        version: APERTURE_VERSION,
        options: {},
        steps: [
          'Read the APERTURE image extension of the light curve: NAXIS1 x NAXIS2 32-bit integers.',
          'Refuse any pixel that is not a combination of the documented bits.',
          'Copy the TAN world coordinates (CRPIX, CRVAL, CDELT, PC) from the same header.',
          'Encode as image-uint16/1: little-endian 16-bit pixels, row by row from the lowest.',
        ],
        record: a.record,
      },
      assumptions: [
        'The bit meanings are the SPOC data products document’s; the file carries no description of its own bits.',
        'The world coordinates are the extension’s as published; they are not refitted.',
      ],
      reductions: [],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series: encodeAperture(a) };
  },

  /** The scientific check, on a decoded image. */
  validate(o) {
    const { width, height, values, wcs } = o.image;
    let optimal = 0;
    let collected = 0;
    let sx = 0;
    let sy = 0;
    let n = 0;
    values.forEach((v, i) => {
      if (v & 1) collected++;
      if (v & 2) optimal++;
      if (v & 8) {
        sx += (i % width) + 1;
        sy += Math.floor(i / width) + 1;
        n++;
      }
    });
    const center = n ? skyOf(wcs, sx / n, sy / n) : null;
    const offset = center ? separation(center, this.target) * 3600 : Infinity;
    return {
      check:
        'the optimal aperture holds the NPIXSAP pixels the header counts, every pixel was collected, and the flux-weighted-centroid pixels center within one pixel (about 19 arcseconds) of the target',
      against: [
        { quantity: 'optimal-aperture pixels', ...this.npixsap },
        { quantity: 'target position (deg)', ...this.target },
      ],
      result: {
        optimalPixels: optimal,
        collectedPixels: collected,
        centroidOffsetArcsec: Number(offset.toFixed(2)),
      },
      ok:
        optimal === this.npixsap.value &&
        collected === width * height &&
        offset < 19,
    };
  },
};

export const PACKS = [TESS_HD209458_S56, TESS_HD209458_S56_APERTURE];

// --- Writing -------------------------------------------------------------------

async function formatJs(text, file) {
  // Imported here rather than at the top so the check can run under Jest,
  // where the prettier package does not load as an ES module.
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(path.join(REPO, file))) || {};
  return prettier.format(text, { ...options, filepath: path.join(REPO, file) });
}

async function moduleText(pack, meta, series) {
  const body = `// =============================================================================
// ${meta.title}
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs from
// ${pack.raw.map(r => r.file).join(', ')};
// \`npm run packs:check\` verifies it offline and \`npm run packs:provenance\`
// rebuilds it from the pinned raw product and compares byte for byte.
//
// THIS IS AN OBSERVATION. The full record - sources, checksums, every step of
// the transformation and the check it passed - is ${pack.manifest}.
// This module carries only what an instrument shows: PACK, to label and credit
// the data, and SERIES, the numbers, which js/observation.js decodes.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(meta, null, 2)};

/** The series, encoded as SERIES.encoding says; see js/observation.js. */
export const SERIES = ${JSON.stringify(series, null, 2)};
`;
  return formatJs(body, pack.module);
}

/**
 * Build one pack from its raw bytes: the module text and the manifest.
 * @returns {Promise<{moduleText: string, manifest: object, validation: object}>}
 */
export async function buildPack(pack, raw) {
  const { meta, manifestRest, series } = pack.build(raw);
  const core = {
    format: 'gravitas.observation-data-pack',
    formatVersion: 1,
    ...meta,
    ...manifestRest,
  };
  // The runtime metadata is cut from the manifest, never written separately,
  // so the two cannot say different things.
  const PACK = runtimeMeta(core);
  const observation = observationOf({ PACK, SERIES: series });
  const problems = checkObservation(observation);
  if (problems.length) throw new Error(`${pack.id}: ${problems[0]}`);
  const { ok, ...validation } = pack.validate(observation);
  if (!ok)
    throw new Error(
      `${pack.id} fails its check: ${validation.check} (${JSON.stringify(validation.result)})`
    );
  const text = await moduleText(pack, PACK, series);
  const manifest = {
    ...core,
    derived: {
      file: pack.module,
      bytes: Buffer.byteLength(text),
      sha256: sha256(text),
    },
    validation,
  };
  return {
    moduleText: text,
    manifest,
    manifestText: `${JSON.stringify(manifest, null, 2)}\n`,
  };
}

// --- Checking ------------------------------------------------------------------

const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

/**
 * Everything that can be verified without the raw products.
 * @param {{root?: string}} [opts] - A copy of the repository to check instead
 * @returns {Promise<string[]>} Problems, empty when there are none
 */
export async function checkPacks({ root = REPO } = {}) {
  const problems = [];
  for (const pack of PACKS) {
    const say = message => problems.push(`${pack.id}: ${message}`);
    const at = rel => path.join(root, rel);
    if (!existsSync(at(pack.manifest))) {
      say(`${pack.manifest} is missing`);
      continue;
    }
    const manifest = readJson(at(pack.manifest));
    for (const p of validateDataPack(manifest)) say(`${p.path} ${p.message}`);
    if (manifest.id !== pack.id) say(`the manifest is for ${manifest.id}`);
    if (JSON.stringify(manifest.raw) !== JSON.stringify(pack.raw))
      say('the manifest pins different raw products from the tool');
    if (manifest.transformation?.version !== pack.transformVersion) {
      say(
        `made by transformation ${manifest.transformation?.version}; the tool is ${pack.transformVersion}`
      );
    }

    if (!existsSync(at(pack.module))) {
      say(`${pack.module} is missing`);
      continue;
    }
    const bytes = readFileSync(at(pack.module));
    if (
      bytes.length !== manifest.derived?.bytes ||
      sha256(bytes) !== manifest.derived?.sha256
    ) {
      say(
        `${pack.module} is not the file its manifest records (${bytes.length} bytes, ${sha256(bytes)})`
      );
    }
    const mod = await import(pathToFileURL(at(pack.module)).href);
    if (JSON.stringify(mod.PACK) !== JSON.stringify(runtimeMeta(manifest))) {
      say("the module's PACK is not the manifest's runtime fields");
    }
    let observation;
    try {
      observation = observationOf(mod);
    } catch (err) {
      say(`will not decode: ${err.message}`);
      continue;
    }
    for (const p of checkObservation(observation)) say(p);
    const { ok, result } = pack.validate(observation);
    if (!ok) say(`fails its check: ${JSON.stringify(result)}`);
    if (
      JSON.stringify(result) !== JSON.stringify(manifest.validation?.result)
    ) {
      say(
        `its check gives ${JSON.stringify(result)}; the manifest records ${JSON.stringify(manifest.validation?.result)}`
      );
    }

    if (!existsSync(at(pack.capability))) {
      say(`${pack.capability} is missing`);
      continue;
    }
    for (const p of agreesWithPackage(
      manifest,
      readJson(at(pack.capability)),
      pack.manifest
    )) {
      say(`${p.path} ${p.message}`);
    }
  }
  return problems;
}

/** Rebuild every pack from the cache and compare with what is committed. */
async function provenance() {
  const problems = [];
  for (const pack of PACKS) {
    const raw = await Promise.all(
      pack.raw.map(pin => pinnedBytes(pin, { cache: CACHE, offline: true }))
    );
    const built = await buildPack(pack, raw);
    if (
      readFileSync(path.join(REPO, pack.module), 'utf8') !== built.moduleText
    ) {
      problems.push(
        `${pack.id}: ${pack.module} does not rebuild from the raw product`
      );
    }
    if (
      readFileSync(path.join(REPO, pack.manifest), 'utf8') !==
      built.manifestText
    ) {
      problems.push(
        `${pack.id}: ${pack.manifest} does not rebuild from the raw product`
      );
    }
  }
  return problems;
}

async function main(argv) {
  const check = argv.includes('--check');
  if (check && argv.includes('--require-sources')) {
    const problems = [...(await checkPacks()), ...(await provenance())];
    for (const p of problems) console.error(`  ${p}`);
    if (problems.length) process.exit(1);
    const n = PACKS.length;
    console.log(
      `${n} data pack${n === 1 ? ' rebuilds' : 's rebuild'} byte for byte from the pinned raw products.`
    );
    return;
  }
  if (check) {
    const problems = await checkPacks();
    for (const p of problems) console.error(`  ${p}`);
    if (problems.length) process.exit(1);
    console.log(
      `${PACKS.length} data pack${PACKS.length === 1 ? '' : 's'} valid, decoded and checked.`
    );
    return;
  }
  for (const pack of PACKS) {
    const raw = await Promise.all(
      pack.raw.map(pin =>
        pinnedBytes(pin, { cache: CACHE, offline: argv.includes('--offline') })
      )
    );
    const built = await buildPack(pack, raw);
    mkdirSync(path.dirname(path.join(REPO, pack.module)), { recursive: true });
    mkdirSync(path.dirname(path.join(REPO, pack.manifest)), {
      recursive: true,
    });
    writeFileSync(path.join(REPO, pack.module), built.moduleText);
    writeFileSync(path.join(REPO, pack.manifest), built.manifestText);
    console.log(
      `${pack.id}: ${built.manifest.derived.bytes} bytes, ${JSON.stringify(built.manifest.validation.result)}`
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
