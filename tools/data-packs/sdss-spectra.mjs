// =============================================================================
// Four observed stellar spectra from the SDSS archive, as a data pack
// -----------------------------------------------------------------------------
//   npm run spectra:data         fetch what is missing, thin, write the module
//                                and data-packs/sdss-dr18-stellar-spectra.json
//   npm run spectra:check        verify both, no network
//   npm run spectra:provenance   rebuild both from the cached CSVs and compare
//
// Those commands run tools/build-sdss-spectra.mjs, which hands this pack to
// tools/build-data-packs.mjs runDataset(): the same build, check and rebuild
// every data pack goes through (DATA_PACKS.md), with the raw CSVs fetched and
// checked against their pins by tools/data-packs/pinned.mjs. This file is the
// transformation. Until Roadmap II Prompt 62 it was a builder of its own, with
// its own fetch and cache, and wrote its record as a JavaScript module
// (js/data/spectra/sdssSpectraProvenance.js); the record is the pack manifest
// now, and the module the browser loads carries the manifest's runtime fields
// as PACK.
//
// What this is
// -----------------------------------------------------------------------------
// Four spectra of four stars, observed with the SDSS spectrograph at Apache
// Point between March and November 2008 and published in SDSS DR18. One each of
// spectral type A, G, K and M. They are observations: photons that left four
// stars, were dispersed by a real grating and counted by a real CCD. Nothing in
// this file is computed by Gravitas, and nothing in it is a model.
//
// Four is four. This is not an atlas and it is not a survey: it is one example
// of each of four letters, chosen by the rule below, and the lesson that uses
// them says so.
//
// How the four were chosen
// -----------------------------------------------------------------------------
// The rule was fixed before any spectrum was plotted, and it is a rule about
// the catalog rather than about how a curve looks:
//
//   1. class = 'STAR' and zWarning = 0, so the pipeline is confident it
//      classified a star and nothing went wrong doing it.
//   2. plate < 3510, which is the SDSS legacy spectrograph rather than BOSS.
//      All four therefore share one instrument, one wavelength grid, one
//      resolution and one flux calibration - so the comparison the lesson asks
//      for is between stars and not between spectrographs.
//   3. One spectral class each, at a subtype that is not adjacent to a class
//      boundary, since at a boundary the letter itself is what is in doubt.
//   4. Of those, the highest snMedian: the cleanest available example, which is
//      also what leaves the most room to thin.
//   5. After selection, check that the class's defining signature is actually
//      present - measured, not assumed. See the note on the M star below.
//
// Two independent pipeline classifications agree on the letter for all four:
// the spectro1d `subClass`, and the ELODIE template match `elodieSpType`. That
// agreement is what licenses calling these A, G, K and M. No class here was
// inferred from a color.
//
// The M star, and why it is not the first one the rule found
// -----------------------------------------------------------------------------
// The highest-signal M dwarf in the catalog is an M0V, and it fails step 5. The
// defining feature of class M is the titanium-oxide band system, and the
// published TiO5 index of that M0V is 0.887 against 0.940 for the K star three
// hundred degrees hotter - a six per cent difference, which is not a feature a
// student can find. Step 3 excludes subtype 0 for exactly this reason and the
// rule then lands on an M1 whose TiO5 is 0.642. That is not a plot that looked
// better; it is the classification system's own criterion applied to the data.
//
// What is done to the numbers
// -----------------------------------------------------------------------------
// Trimmed to the wavelength range all four share, then averaged three adjacent
// pixels into one. Nothing else. No smoothing, no normalisation, no continuum
// fit, no shift to rest wavelength, no interpolation. The flux that arrives is
// the flux that is stored, to within the int16 quantisation recorded on each
// spectrum, and THINNING below carries the measured cost of the averaging in
// each of the four absorption features the lesson asks students to inspect.
// =============================================================================

import { Buffer } from 'node:buffer';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
// The same arithmetic the widget uses. See the note at the top of that file:
// if the build measured a feature one way and the widget measured it another,
// the difference between the two would be reported as the thinning error.
import {
  SPECTRAL_FEATURES,
  airToVacuum,
  bandDepth,
  tioFiveIndex,
} from '../../js/stellar/spectrumIndex.js';
import { sha256 } from './pinned.mjs';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/**
 * The tool version that wrote the pack. A change to what this file writes -
 * the series, the module's shape, the manifest's record - bumps it, and
 * packs:check fails on a manifest that names another (DATA_PACKS.md).
 */
export const TRANSFORM_VERSION = '1.0.0';

/** What the runtime copy of each spectrum keeps. Everything else is record. */
const RUNTIME_FIELDS = [
  'letter',
  'subClass',
  'elodieSpType',
  'elodieTEff',
  'plate',
  'mjd',
  'fiberID',
  'observed',
  'z',
  'zErr',
  'url',
  'count',
  'scale',
  'data',
];

/** The one line of credit the readout shows, as the GW lab does. */
const CREDIT = 'SDSS DR18 (Almeida et al. 2023, ApJS 267, 44)';

/** The archive, and what it asks to be told. */
const ARCHIVE = {
  name: 'Sloan Digital Sky Survey',
  release: 'DR18',
  catalogQuery:
    'https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch',
  spectrumBase:
    'https://dr18.sdss.org/optical/spectrum/view/data/format=csv/spec=lite',
  retrieved: '2026-09-21',
  acknowledgement:
    'Funding for the Sloan Digital Sky Survey has been provided by the Alfred ' +
    'P. Sloan Foundation, the Participating Institutions, the National Science ' +
    'Foundation, and the U.S. Department of Energy Office of Science. SDSS ' +
    'acknowledges support and resources from the Center for High-Performance ' +
    'Computing at the University of Utah. SDSS data are public; see ' +
    'https://www.sdss.org/collaboration/citing-sdss/ for the terms this ' +
    'acknowledgement satisfies.',
  terms: 'https://www.sdss.org/collaboration/citing-sdss/',
};

/**
 * What the pack cites. Each DOI was resolved through Crossref on 2026-10-01
 * and the record it returned matches the text beside it.
 */
const CITATIONS = [
  {
    text: 'Almeida et al. 2023, ApJS 267, 44 (SDSS DR18)',
    doi: '10.3847/1538-4365/acda98',
  },
  {
    text: 'Smee et al. 2013, AJ 146, 32 (the SDSS and BOSS spectrographs)',
    doi: '10.1088/0004-6256/146/2/32',
  },
  {
    text: 'Gunn et al. 2006, AJ 131, 2332 (the SDSS 2.5 m telescope)',
    doi: '10.1086/500975',
  },
  {
    text: 'Yanny et al. 2009, AJ 137, 4377 (SEGUE)',
    doi: '10.1088/0004-6256/137/5/4377',
  },
];

/**
 * The four spectra, with everything needed to find them again.
 *
 * `subClass` and `elodieSpType` are the archive's own two classifications and
 * are copied verbatim from the SpecObj row; `sha256` is of the CSV this bundle
 * was built from. The catalog query that produced every field here is recorded
 * in CATALOG_QUERY below, so none of it has to be taken on trust.
 */
const SOURCES = [
  {
    id: 'a',
    letter: 'A',
    plate: 3138,
    mjd: 54740,
    fiberID: 433,
    specObjID: '3533193009329971200',
    subClass: 'A0',
    elodieSpType: 'A1V',
    elodieTEff: 7852,
    elodieLogG: 3.18,
    elodieFeH: -1.67,
    snMedian: 108.2831,
    ra: 302.69822,
    dec: -11.853501,
    z: -0.0008099225,
    zErr: 3.089933e-6,
    survey: 'segue2',
    run2d: '104',
    observed: '2008-10-01',
    sha256: '0b1bfb79ef95e9a3b876b56c50f23486dcbc03b469083ca1d7d616095eec9276',
    bytes: 117130,
  },
  {
    id: 'g',
    letter: 'G',
    plate: 3128,
    mjd: 54776,
    fiberID: 178,
    specObjID: '3521863916999254016',
    subClass: 'G2',
    elodieSpType: 'G5',
    elodieTEff: 5625,
    elodieLogG: 4.2,
    elodieFeH: -0.21,
    snMedian: 127.4957,
    ra: 340.01167,
    dec: 13.415657,
    z: -0.0002128853,
    zErr: 8.202044e-6,
    survey: 'segue2',
    run2d: '104',
    observed: '2008-11-06',
    sha256: '85042d96f02152576ac4ee6ac6af11f88447b2687b22d1920806d1ffafc8087f',
    bytes: 120947,
  },
  {
    id: 'k',
    letter: 'K',
    plate: 3121,
    mjd: 54749,
    fiberID: 511,
    specObjID: '3514074151541383168',
    subClass: 'K3',
    elodieSpType: 'K3V',
    elodieTEff: 4775,
    elodieLogG: 4.409,
    elodieFeH: -0.12,
    snMedian: 115.9964,
    ra: 59.305354,
    dec: 11.870116,
    z: 3.935811e-5,
    zErr: 6.265696e-6,
    survey: 'segue2',
    run2d: '104',
    observed: '2008-10-10',
    sha256: '5372c5a05ad57ee8292c82efa71dd99667b2e3dea212ffb7ce378505a0d06f83',
    bytes: 118163,
  },
  {
    id: 'm',
    letter: 'M',
    plate: 2871,
    mjd: 54536,
    fiberID: 245,
    specObjID: '3232526053733853184',
    subClass: 'M1',
    elodieSpType: 'M2Vvar',
    elodieTEff: 3980,
    elodieLogG: 4.958,
    elodieFeH: -0.04,
    snMedian: 86.63696,
    ra: 166.17079,
    dec: 37.659994,
    z: 6.18252e-5,
    zErr: 8.059405e-6,
    survey: 'segue1',
    run2d: '26',
    observed: '2008-03-11',
    sha256: '67b0112fbb0aa205c67220685e791467cea9a58a76dfb43097c016d09c077d5f',
    bytes: 114698,
  },
];

/** The SkyServer query every catalog field above was copied from. */
const CATALOG_QUERY =
  'SELECT s.specObjID, s.plate, s.mjd, s.fiberID, s.class, s.subClass, ' +
  's.snMedian, s.ra, s.dec, s.z, s.zErr, s.zWarning, s.survey, s.instrument, ' +
  's.run2d, s.programname, s.elodieTEff, s.elodieLogG, s.elodieFeH, ' +
  's.elodieSpType FROM SpecObj AS s WHERE s.specObjID IN (' +
  SOURCES.map(s => s.specObjID).join(', ') +
  ')';

/**
 * The SDSS wavelength grid.
 *
 * Every SDSS spectrum is sampled at log10(lambda / Angstrom) = 1e-4 * i for
 * integer i, which is why this bundle stores no wavelength array at all: the
 * four spectra are four stretches of one grid and the build checks that they
 * really are before relying on it. Wavelengths are VACUUM and heliocentric,
 * which is the archive's convention and not this project's choice - the air
 * wavelengths quoted in a textbook are about 1.8 Angstroms shorter at H-alpha.
 */
const LOG_STEP = 1e-4;

/** Average this many adjacent pixels into one. See THINNING on the output. */
const BIN = 3;

/** The name a cached spectrum is filed under. */
const cacheName = s => `spec-${s.plate}-${s.mjd}-${s.fiberID}.csv`;

/** The URL a spectrum came from, and can be fetched from again. */
const sourceUrl = s =>
  `${ARCHIVE.spectrumBase}?plateid=${s.plate}&mjd=${s.mjd}&fiberid=${s.fiberID}`;

/**
 * Parse the archive's CSV into the grid index and the flux.
 *
 * The CSV's four columns are Wavelength, Flux, BestFit and SkyFlux. Only the
 * first two are read: BestFit is the pipeline's model of the star and SkyFlux
 * is what was subtracted, and neither is an observation of this star.
 *
 * @param {string} text - The CSV
 * @returns {{index: Int32Array, flux: Float64Array}} Grid indices and flux
 */
function parseCsv(text) {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim());
  if (header[0] !== 'Wavelength' || header[1] !== 'Flux') {
    throw new Error(`unexpected CSV header: ${lines[0]}`);
  }
  const index = [];
  const flux = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const lam = Number(parts[0]);
    const f = Number(parts[1]);
    if (!Number.isFinite(lam) || !Number.isFinite(f)) continue;
    index.push(Math.round(Math.log10(lam) / LOG_STEP));
    flux.push(f);
  }
  return { index: Int32Array.from(index), flux: Float64Array.from(flux) };
}

/**
 * Refuse a spectrum that is not on the grid this bundle assumes.
 *
 * The saving that makes four spectra cost thirteen kilobytes is that no
 * wavelength is stored. That is only sound if the grid really is the one
 * documented above, so it is checked rather than believed: every sample must
 * land on a distinct consecutive integer index, and the wavelength that
 * integer implies must agree with the one the archive printed to within the
 * rounding of the CSV itself.
 *
 * @param {object} parsed - From parseCsv
 * @param {string} text - The CSV, for re-reading the printed wavelengths
 * @param {object} src - A SOURCES entry, for the error message
 */
function assertOnGrid(parsed, text, src) {
  const { index } = parsed;
  for (let i = 1; i < index.length; i++) {
    if (index[i] !== index[i - 1] + 1) {
      throw new Error(
        `${src.id}: the wavelength grid jumps from index ${index[i - 1]} to ` +
          `${index[i]} at sample ${i}; this bundle stores no wavelengths and ` +
          'cannot represent a gap.'
      );
    }
  }
  const printed = text
    .trim()
    .split('\n')
    .slice(1)
    .map(l => Number(l.split(',')[0]))
    .filter(Number.isFinite);
  for (let i = 0; i < printed.length; i++) {
    const implied = 10 ** (index[i] * LOG_STEP);
    // Two things separate the reconstructed wavelength from the printed one,
    // and neither is an error. The CSV prints three decimals, which is half a
    // milliangstrom. And the pipeline stores log10(lambda) as float32, whose
    // ulp near 3.6 is about 2.4e-7 - a relative wavelength error of that times
    // ln 10, or five thousandths of an Angstrom out at 9200. The residuals
    // measured here run to 0.0032 A, inside that. The tolerance is therefore
    // the sum of the two, with a factor of two of margin, rather than a
    // constant that happens to pass.
    const tolerance = 0.0005 + printed[i] * 2.4e-7 * Math.LN10 * 2;
    if (Math.abs(implied - printed[i]) > tolerance) {
      throw new Error(
        `${src.id}: sample ${i} is printed at ${printed[i]} A but index ` +
          `${index[i]} implies ${implied.toFixed(4)} A`
      );
    }
  }
}

/** Average BIN adjacent samples into one, on the log grid. */
function binned(spec, bin) {
  const n = Math.floor(spec.flux.length / bin);
  const flux = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < bin; k++) sum += spec.flux[i * bin + k];
    flux[i] = sum / bin;
  }
  return {
    // The bin's center is the mean of its members' log wavelengths, which on a
    // uniform log grid is the middle one when bin is odd.
    logStart: spec.logStart + ((bin - 1) / 2) * spec.step,
    step: spec.step * bin,
    flux,
  };
}

/** Little-endian int16 base64, the encoding js/data/stellar/mistTracks.js uses. */
function encodeInt16(values, scale) {
  const ints = new Int16Array(values.length);
  for (let i = 0; i < values.length; i++)
    ints[i] = Math.round(values[i] * scale);
  return Buffer.from(ints.buffer, ints.byteOffset, ints.byteLength).toString(
    'base64'
  );
}

/** Read the project's prettier settings, so the output is a fixed point. */
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
 * Read every source, check it, trim it to the common grid and thin it.
 *
 * The order matters. The features are measured on the full-resolution archive
 * spectrum FIRST, then on the thinned copy, and the difference is what
 * THINNING reports. Measuring them only after thinning would report nothing.
 *
 * @param {Uint8Array[]} raw - The four CSVs, in SOURCES order, already
 *   checked against their pins by tools/data-packs/pinned.mjs
 * @returns {object} Everything the module template needs
 */
function gather(raw) {
  const read = [];
  for (const [i, src] of SOURCES.entries()) {
    const text = Buffer.from(raw[i]).toString('utf8');
    const parsed = parseCsv(text);
    assertOnGrid(parsed, text, src);
    if (!parsed.flux.every(Number.isFinite)) {
      throw new Error(`${src.id}: the archive CSV has a non-finite flux`);
    }
    read.push({ src, parsed, bytes: Buffer.byteLength(text), text });
  }

  // The stretch of the grid all four cover. Every spectrum is a run of
  // consecutive indices on one global grid, so this is an intersection of
  // integer ranges and not a resampling: no flux value moves.
  const lo = Math.max(...read.map(r => r.parsed.index[0]));
  const hi = Math.min(...read.map(r => r.parsed.index.at(-1)));
  const span = hi - lo + 1;
  const bins = Math.floor(span / BIN);
  const kept = bins * BIN;

  const spectra = {};
  const worst = {};
  for (const { src, parsed, bytes } of read) {
    const offset = lo - parsed.index[0];
    const full = {
      logStart: lo * LOG_STEP,
      step: LOG_STEP,
      flux: parsed.flux.slice(offset, offset + kept),
    };
    const thin = binned(full, BIN);

    // What the averaging cost, feature by feature, in percentage points of
    // band depth. This is the one number that cannot be recomputed later: it
    // needs the full-resolution spectrum, which is not committed.
    const thinning = {};
    for (const f of SPECTRAL_FEATURES) {
      const before = bandDepth(full, f);
      const after = bandDepth(thin, f);
      thinning[f.id] = {
        depth: Number((after * 100).toFixed(2)),
        shiftPP: Number((Math.abs(after - before) * 100).toFixed(2)),
      };
      worst[f.id] = Math.max(worst[f.id] || 0, thinning[f.id].shiftPP);
    }

    // One scale per spectrum, the largest that keeps every sample inside
    // int16. Chosen from the data rather than fixed, because the four differ
    // by a factor of three in flux and a shared scale would throw away two
    // bits on three of them.
    const peak = Math.max(...Array.from(thin.flux, Math.abs));
    const scale = Math.floor(32000 / peak);
    const data = encodeInt16(thin.flux, scale);

    // What the quantisation cost, as a fraction of the smallest flux in the
    // spectrum - the worst place for it to matter.
    const floorFlux = Math.min(...Array.from(thin.flux, Math.abs));
    spectra[src.id] = {
      letter: src.letter,
      specObjID: src.specObjID,
      plate: src.plate,
      mjd: src.mjd,
      fiberID: src.fiberID,
      observed: src.observed,
      ra: src.ra,
      dec: src.dec,
      subClass: src.subClass,
      elodieSpType: src.elodieSpType,
      elodieTEff: src.elodieTEff,
      elodieLogG: src.elodieLogG,
      elodieFeH: src.elodieFeH,
      snMedian: src.snMedian,
      z: src.z,
      zErr: src.zErr,
      survey: src.survey,
      run2d: src.run2d,
      url: sourceUrl(src),
      sourceSha256: src.sha256,
      sourceBytes: bytes,
      sourceSamples: parsed.flux.length,
      count: bins,
      scale,
      quantisation: Number(((1 / scale / floorFlux) * 100).toFixed(4)),
      tio5: Number(tioFiveIndex(thin).toFixed(4)),
      thinning,
      payloadSha256: sha256(Buffer.from(data, 'base64')),
      data,
    };
  }

  return {
    grid: {
      logStart: Number((lo * LOG_STEP + ((BIN - 1) / 2) * LOG_STEP).toFixed(8)),
      logStep: Number((LOG_STEP * BIN).toFixed(8)),
      count: bins,
      firstA: Number((10 ** ((lo + (BIN - 1) / 2) * LOG_STEP)).toFixed(3)),
      lastA: Number(
        (10 ** ((lo + (BIN - 1) / 2 + (bins - 1) * BIN) * LOG_STEP)).toFixed(3)
      ),
    },
    spectra,
    worst,
    span,
    kept,
  };
}

/** The pins of the four CSVs, as the manifest records them. */
const RAW = SOURCES.map(s => ({
  file: cacheName(s),
  url: sourceUrl(s),
  bytes: s.bytes,
  sha256: s.sha256,
}));

/**
 * The pack's runtime metadata and the rest of its manifest, from the CSVs.
 * @param {Uint8Array[]} raw - The four CSVs, pinned
 */
function build(raw) {
  const { grid, spectra, worst, span, kept } = gather(raw);
  const ids = SOURCES.map(s => s.id);

  const sourceBytes = ids.reduce((t, id) => t + spectra[id].sourceBytes, 0);
  const sourceSamples = ids.reduce((t, id) => t + spectra[id].sourceSamples, 0);
  const keptSamples = ids.reduce((t, id) => t + spectra[id].count, 0);
  const payloadBytes = ids.reduce((t, id) => t + spectra[id].data.length, 0);

  const runtime = {};
  const records = {};
  for (const id of ids) {
    runtime[id] = Object.fromEntries(
      RUNTIME_FIELDS.map(key => [key, spectra[id][key]])
    );
    // Everything but the flux, which the record identifies by its checksum.
    records[id] = Object.fromEntries(
      Object.entries(spectra[id]).filter(([key]) => key !== 'data')
    );
  }

  const meta = {
    id: 'sdss-dr18-stellar-spectra',
    version: '1.0.0',
    title:
      'Four observed stellar spectra: SDSS DR18, one each of A, G, K and M',
    object: {
      name: 'Four SDSS DR18 stars, one each of spectral type A, G, K and M',
      identifiers: ids.map(id => `SDSS specObjID ${spectra[id].specObjID}`),
    },
    facility: {
      observatory: 'Sloan Digital Sky Survey, Apache Point Observatory',
      instrument:
        'SDSS legacy spectrograph on the 2.5 m Sloan Foundation Telescope',
      pipeline: 'spectro1d (run2d 26 and 104), as released in DR18',
    },
    dataType: 'spectrum',
    origin: 'observed',
    credit: CREDIT,
    license: {
      status: 'public-domain',
      statement:
        'SDSS data are public; SDSS asks that work using them cite the data release and acknowledge the survey (NOTICE).',
      basis:
        'SDSS’s image-use policy, read 2026-10-01: “All SDSS data released in our public data releases are considered in the public domain” (source.terms). The acknowledgement SDSS asks for is in NOTICE.',
    },
    retrieved: ARCHIVE.retrieved,
    columns: [
      {
        name: 'wavelength',
        unit: 'Angstrom',
        description:
          'vacuum, heliocentric: sample i is at 10 ** (GRID.logStart + i * GRID.logStep)',
      },
      {
        name: 'flux',
        unit: '1e-17 erg/s/cm2/Angstrom',
        description:
          'as the archive published it, averaged over three samples; no uncertainty is carried',
      },
    ],
    masks: [],
    reductions: [
      `Averaged ${['one', 'two', 'three', 'four'][BIN - 1]} adjacent archive samples into one: ${kept.toLocaleString('en-US')} samples at a log step of ${LOG_STEP} became ${grid.count.toLocaleString('en-US')} at ${(LOG_STEP * BIN).toFixed(4)}. SDSS resolves about 2.2 samples, so the average costs resolution the spectrograph did not deliver.`,
      'Flux as little-endian int16, one scale per spectrum.',
      'The archive’s per-sample uncertainty is not in this bundle, so the flux has no uncertainty here.',
    ],
  };

  const manifestRest = {
    source: {
      archive: `${ARCHIVE.name} ${ARCHIVE.release}`,
      urls: [...RAW.map(r => r.url), ARCHIVE.catalogQuery],
      citations: CITATIONS,
      catalogQuery: CATALOG_QUERY,
      acknowledgement: ARCHIVE.acknowledgement,
      terms: [
        ARCHIVE.terms,
        'https://www.sdss.org/collaboration/image-use-policy/',
      ],
    },
    raw: RAW,
    transformation: {
      script: 'tools/data-packs/sdss-spectra.mjs',
      version: TRANSFORM_VERSION,
      options: { bin: BIN, logStep: LOG_STEP },
      steps: [
        `Parse the Wavelength and Flux columns of each archive CSV (BestFit, the pipeline's model, and SkyFlux, what was subtracted, are not read), and check every sample sits on the SDSS grid log10(lambda / Angstrom) = 1e-4 * i.`,
        `Trim the four to the ${span} grid indices all four cover, of which ${kept} are used, so they share one wavelength axis without resampling.`,
        `Average ${BIN} adjacent samples into one; the bin center is their mean log wavelength. SDSS's resolving power of about 2000 puts a resolution element at roughly 2.2 samples, so this costs resolution the spectrograph did not deliver; record.thinning has what it cost in each feature the lesson uses.`,
        'Quantise to little-endian int16, one integer scale per spectrum: value = round(flux * scale); flux = value / scale.',
      ],
      record: {
        grid,
        size: {
          sourceBytes,
          sourceSamples,
          keptSamples,
          payloadBase64Bytes: payloadBytes,
          thinningFactor: Number((sourceSamples / keptSamples).toFixed(2)),
          byteFactor: Number((sourceBytes / payloadBytes).toFixed(2)),
        },
        thinning: {
          measure:
            'band depth, in percentage points, of the four features the lesson uses, measured on the full-resolution archive spectrum and on the thinned copy. The shift is the difference.',
          worstShiftPP: Object.fromEntries(
            Object.entries(worst).map(([k, v]) => [k, Number(v.toFixed(2))])
          ),
          worstOverall: Number(Math.max(...Object.values(worst)).toFixed(2)),
        },
      },
    },
    // Each spectrum's archive identity, both classifications, and the
    // checksums of the CSV it came from and of the flux committed for it.
    records,
    selection: [
      "class = 'STAR' and zWarning = 0.",
      'plate < 3510, the SDSS legacy spectrograph, so all four share one instrument, one wavelength grid, one resolution and one flux calibration.',
      'One spectral class each, at a subtype not adjacent to a class boundary.',
      'Of those, the highest snMedian.',
      "After selection, the class's defining signature checked in the data: the highest-signal M dwarf in the catalog is an M0V whose TiO5 index is 0.887 against 0.940 for the K star, which is not a feature a student can find, and is excluded by the subtype rule above.",
    ],
    assumptions: [
      'Two independent pipeline classifications agree on the letter for all four: the spectro1d subClass and the ELODIE template match elodieSpType. No class here was inferred from a color.',
      'SDSS samples every spectrum at log10(lambda / Angstrom) = 1e-4 * i for integer i; all four are runs of consecutive i on that one grid, which is why no wavelength array is stored and why trimming moves no flux value. The build checks the grid rather than assuming it.',
      'Wavelengths are in vacuum and heliocentric, not shifted to rest: each star carries its own radial velocity, recorded as z, and the largest here is 2.0 Angstroms at H-alpha - a fifth of the narrowest window the lesson measures in.',
    ],
    notDone: [
      'No smoothing.',
      'No normalisation, of any kind. The four are stored in the flux units the archive published them in, so the continuum slope that separates an A star from an M star is in the committed data and is not a drawing decision.',
      'No continuum fitting or division.',
      'No resampling or interpolation onto a new wavelength grid.',
      'No shift to rest wavelength.',
      'No masking, sky subtraction or repair. What the pipeline delivered is what is here, including any sky residual it left behind.',
    ],
    caveats: [
      'Four spectra are four examples. This is not a spectral atlas, not a representative sample of anything, and not a survey. Each letter here is represented by exactly one star.',
      'The A star has a pipeline surface gravity of 3.18 and a metallicity of -1.67, so it is very probably not a main-sequence A dwarf; it is an A-type spectrum, which is all this bundle calls it.',
      'The M star is classified M2Vvar by the ELODIE match, and its H-alpha is filled in rather than absorbed - chromospheric emission, which is ordinary in an M dwarf. H-alpha is not one of the four features the lesson uses.',
      'snMedian is the pipeline median signal-to-noise over the whole spectrum. The blue end of every one of these is noisier than the red.',
    ],
    compatible: {
      widgets: ['spectra-compare', 'spectra-identify'],
      investigations: ['a-universe-of-stars'],
    },
    offline: 'core',
  };

  return {
    meta,
    manifestRest,
    render: PACK => renderModule(PACK, grid, runtime, ids),
  };
}

/** The module the browser loads: PACK, the grid and the four spectra. */
async function renderModule(PACK, grid, runtime, ids) {
  const body = `// =============================================================================
// Four observed stellar spectra from SDSS DR18
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/data-packs/sdss-spectra.mjs;
// run \`npm run spectra:data\` to regenerate, \`npm run spectra:check\` to verify
// the committed module offline, and \`npm run spectra:provenance\` to rebuild it
// from the cached archive CSVs and compare byte for byte.
//
// One star each of spectral type A, G, K and M, observed with the SDSS
// spectrograph in 2008. THESE ARE OBSERVATIONS. Nothing in this file is a
// model, a fit or a synthetic spectrum, and no number in it was computed by
// Gravitas - which is the distinction js/data/stellar/mistTracks.js sits on
// the other side of, and the one the lesson using both has to keep.
//
// Trimmed to the wavelength range all four share and averaged ${BIN} samples to
// one. Nothing else: no smoothing, no normalisation, no continuum fit, no
// shift to rest.
//
// This is the copy the browser loads, so it carries only what the widget
// reads. The full record - the archive, both pipeline classifications, the
// source and payload checksums, every transformation with its parameters, and
// what the averaging cost in each feature the lesson uses - is the data pack's
// manifest, data-packs/sdss-dr18-stellar-spectra.json, written by the same run
// and verified by the same check. PACK is that manifest's runtime fields.
// =============================================================================

/* eslint-disable */

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/**
 * The wavelength axis all four share.
 *
 * Sample i is at 10 ** (logStart + i * logStep) Angstroms, in vacuum. There is
 * no wavelength array because SDSS does not have one.
 */
export const GRID = ${JSON.stringify(grid, null, 2)};

/** The four spectra, base64 little-endian int16 flux. */
export const SPECTRA = ${JSON.stringify(runtime, null, 2)};

/**
 * The wavelength of one sample, in vacuum Angstroms.
 *
 * @param {number} i - Sample index
 * @returns {number} Angstroms
 */
export function wavelengthAt(i) {
  return 10 ** (GRID.logStart + i * GRID.logStep);
}

/** The whole wavelength axis, made once. */
let axis = null;

/** @returns {Float64Array} Vacuum Angstroms, one per sample */
export function wavelengths() {
  if (axis) return axis;
  axis = new Float64Array(GRID.count);
  for (let i = 0; i < GRID.count; i++) axis[i] = wavelengthAt(i);
  return axis;
}

/** Decoded spectra, made once each. */
const cache = new Map();

/**
 * One spectrum, decoded.
 *
 * The returned object is the shape js/stellar/spectrumIndex.js measures:
 * logStart, step and flux, plus the archive's own facts about the star.
 *
 * @param {string} id - A key of SPECTRA
 * @returns {object} The spectrum
 */
export function decodeSpectrum(id) {
  if (cache.has(id)) return cache.get(id);
  const spec = SPECTRA[id];
  if (!spec) throw new Error('Unknown spectrum: ' + id);
  const binary =
    typeof atob === 'function'
      ? atob(spec.data)
      : Buffer.from(spec.data, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
  const flux = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i++) flux[i] = ints[i] / spec.scale;
  const decoded = {
    id,
    letter: spec.letter,
    logStart: GRID.logStart,
    step: GRID.logStep,
    flux,
    count: spec.count,
    subClass: spec.subClass,
    elodieSpType: spec.elodieSpType,
    elodieTEff: spec.elodieTEff,
    plate: spec.plate,
    mjd: spec.mjd,
    fiberID: spec.fiberID,
    observed: spec.observed,
    z: spec.z,
    zErr: spec.zErr,
    url: spec.url,
  };
  cache.set(id, decoded);
  return decoded;
}

/** Every spectrum id, hottest first. */
export const SPECTRUM_IDS = ${JSON.stringify(ids)};
`;
  return (await import('prettier')).format(body, {
    parser: 'babel',
    ...(await prettierOptions()),
  });
}

/**
 * Verify a committed (or freshly built) module against its manifest, without
 * the archive. Structural validity and "these are SDSS's numbers" are
 * different claims, and only the second needs the CSVs; this half runs
 * anywhere, offline, forever.
 * @param {object} mod - The module's exports
 * @param {object} manifest - Its manifest
 * @returns {string[]} Problems
 */
function check(mod, manifest) {
  const problems = [];
  const { GRID, SPECTRA, SPECTRUM_IDS, decodeSpectrum, wavelengths } = mod;
  const RECORDS = manifest.records;
  if (!mod.PACK?.credit) problems.push('the data module names no source');
  for (const field of [
    'records',
    'selection',
    'assumptions',
    'notDone',
    'caveats',
  ]) {
    if (!manifest[field]) problems.push(`the manifest is missing ${field}`);
  }
  if (manifest.origin !== 'observed') {
    problems.push('the manifest does not say these are observations');
  }
  if (!manifest.source?.acknowledgement) {
    problems.push('the manifest carries no archive acknowledgement');
  }
  if (SPECTRUM_IDS?.length !== SOURCES.length) {
    problems.push(
      `${SPECTRUM_IDS?.length} spectra, expected ${SOURCES.length}`
    );
  }

  const lam = wavelengths();
  if (lam.length !== GRID.count) problems.push('the axis is the wrong length');
  for (let i = 1; i < lam.length; i++) {
    if (!(lam[i] > lam[i - 1])) {
      problems.push(`wavelength does not increase at ${i}`);
      break;
    }
  }

  for (const src of SOURCES) {
    const data = SPECTRA?.[src.id];
    const record = RECORDS?.[src.id];
    if (!data || !record) {
      problems.push(
        `${src.id}: missing from ${data ? 'the manifest records' : 'SPECTRA'}`
      );
      continue;
    }
    // The runtime copy carries exactly what the widget reads and nothing it
    // could be tempted to present as provenance.
    const extra = Object.keys(data).filter(k => !RUNTIME_FIELDS.includes(k));
    if (extra.length) {
      problems.push(`${src.id}: the runtime copy carries ${extra.join(', ')}`);
    }
    for (const k of RUNTIME_FIELDS) {
      if (k !== 'data' && k !== 'scale' && data[k] !== record[k]) {
        problems.push(
          `${src.id}: ${k} differs between the data and its record`
        );
      }
    }
    const spec = { ...record, data: data.data };
    for (const field of [
      'specObjID',
      'plate',
      'mjd',
      'fiberID',
      'observed',
      'ra',
      'dec',
      'subClass',
      'elodieSpType',
      'url',
      'sourceSha256',
      'payloadSha256',
      'thinning',
    ]) {
      if (
        spec[field] === undefined ||
        spec[field] === null ||
        spec[field] === ''
      ) {
        problems.push(`${src.id}: its record is missing ${field}`);
      }
    }
    // The record and the pin are the same file.
    const pin = manifest.raw?.find(r => r.file === cacheName(src));
    if (!pin || pin.sha256 !== spec.sourceSha256) {
      problems.push(`${src.id}: its record and the raw pin disagree`);
    }
    if (!/^[0-9a-f]{64}$/.test(spec.payloadSha256 || '')) {
      problems.push(`${src.id}: the payload checksum is not a SHA-256`);
    }
    if (sha256(Buffer.from(spec.data, 'base64')) !== spec.payloadSha256) {
      problems.push(`${src.id}: the payload does not match its own checksum`);
    }
    if (!spec.subClass?.startsWith(src.letter)) {
      problems.push(
        `${src.id}: subClass ${spec.subClass} does not support calling it ${src.letter}`
      );
    }
    if (!spec.elodieSpType?.startsWith(src.letter)) {
      problems.push(
        `${src.id}: elodieSpType ${spec.elodieSpType} does not support calling it ${src.letter}`
      );
    }
    const decoded = decodeSpectrum(src.id);
    if (decoded.flux.length !== GRID.count) {
      problems.push(
        `${src.id}: ${decoded.flux.length} samples, expected ${GRID.count}`
      );
    }
    if (!decoded.flux.every(Number.isFinite)) {
      problems.push(`${src.id}: flux is not all finite`);
    }
    for (const f of SPECTRAL_FEATURES) {
      const lo = airToVacuum(f.blue[0]);
      const hi = airToVacuum(f.red[1]);
      if (lo < lam[0] || hi > lam[lam.length - 1]) {
        problems.push(`${src.id}: feature ${f.id} is off the end of the grid`);
      }
      if (!Number.isFinite(bandDepth(decoded, f))) {
        problems.push(`${src.id}: feature ${f.id} does not measure`);
      }
    }
  }
  return problems;
}

/**
 * The scientific check, on the committed spectra: each star shows the
 * signature its two archive classifications give it.
 */
function validate(mod) {
  const depth = {};
  const tio5 = {};
  for (const id of mod.SPECTRUM_IDS) {
    const s = mod.decodeSpectrum(id);
    depth[id] = Object.fromEntries(
      SPECTRAL_FEATURES.map(f => [
        f.id,
        Number((bandDepth(s, f) * 100).toFixed(2)),
      ])
    );
    tio5[id] = Number(tioFiveIndex(s).toFixed(4));
  }
  const others = ['a', 'g', 'k'];
  const ok =
    ['g', 'k', 'm'].every(id => depth.a.hbeta > depth[id].hbeta) &&
    depth.g.cak > depth.a.cak &&
    depth.k.cak > depth.a.cak &&
    others.every(id => depth.m.nad > depth[id].nad) &&
    others.every(id => depth.m.tio > depth[id].tio) &&
    tio5.m < 0.75 &&
    others.every(id => tio5[id] > 0.9);
  return {
    check:
      'each star shows the signature its two archive classifications give it, measured on the committed spectra: H-beta deepest in the A star; Ca II K deeper in the G and K stars than in the A star; Na D and the TiO band deepest in the M star, whose TiO5 index is below 0.75 while the other three are above 0.9',
    against: SOURCES.map(s => ({
      quantity: `spectral type of ${s.id.toUpperCase()}`,
      value: `${s.subClass} / ${s.elodieSpType}`,
      unit: '',
      ref: 'SDSS DR18 SpecObj subClass and elodieSpType',
    })),
    result: { bandDepthPP: depth, tio5 },
    ok,
  };
}

/** The pack, as tools/build-data-packs.mjs builds, checks and rebuilds it. */
export const SDSS_SPECTRA = {
  id: 'sdss-dr18-stellar-spectra',
  label: 'The four SDSS spectra',
  manifest: 'data-packs/sdss-dr18-stellar-spectra.json',
  capability: 'capabilities/sdss-dr18-spectra.json',
  module: 'js/data/spectra/sdssSpectra.js',
  transformVersion: TRANSFORM_VERSION,
  raw: RAW,
  cache: () =>
    process.env.GRAVITAS_SDSS_CACHE
      ? path.resolve(process.env.GRAVITAS_SDSS_CACHE)
      : path.join(REPO, '.sdss-cache'),
  refetch: 'npm run spectra:data',
  ownCommands: true,
  // Bounded and named: on 2026-09-22 the spectrum service answered 502 after
  // holding the connection for 122 seconds.
  headers: {
    'User-Agent':
      'gravitas-spectra-build/1.0 (+https://gravitas-sim.github.io)',
  },
  build,
  decode: mod => mod,
  check,
  validate,
};
