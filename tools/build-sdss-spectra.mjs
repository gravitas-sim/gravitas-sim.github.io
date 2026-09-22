#!/usr/bin/env node
// =============================================================================
// Bundle four observed stellar spectra from the SDSS archive
// -----------------------------------------------------------------------------
//   npm run spectra:data         download (or reuse a cache), thin, write the module
//   npm run spectra:check        verify the checked-in module, no network
//   npm run spectra:provenance   regenerate from the cached source and compare
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

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as prettier from 'prettier';
// The same arithmetic the widget uses. See the note at the top of that file:
// if the build measured a feature one way and the widget measured it another,
// the difference between the two would be reported as the thinning error.
import {
  SPECTRAL_FEATURES,
  airToVacuum,
  bandDepth,
  tioFiveIndex,
} from '../js/stellar/spectrumIndex.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const OUT = path.join(REPO, 'js', 'data', 'spectra', 'sdssSpectra.js');
/**
 * The audit record, beside the data rather than inside it.
 *
 * Nothing in the browser reads the provenance: the widget needs a letter, two
 * classifications, a plate, an MJD, a fiber, a date and the flux. Kept in the
 * same module, the record was 8.4 KB of the 23 KB chunk every reader of the
 * lesson downloaded and never used. It is committed, generated and verified
 * exactly as before - it is simply a module nothing in the application graph
 * imports, so the bundler never ships it.
 */
const OUT_PROVENANCE = path.join(
  REPO,
  'js',
  'data',
  'spectra',
  'sdssSpectraProvenance.js'
);

/** What the runtime copy of each spectrum keeps. Everything else is audit. */
const RUNTIME_FIELDS = [
  'letter',
  'subClass',
  'elodieSpType',
  'elodieTEff',
  'plate',
  'mjd',
  'fiberID',
  'observed',
  'url',
  'count',
  'scale',
  'data',
];

/** The one line of provenance the readout does show, as the GW lab does. */
const CITATION = 'SDSS DR18 (Almeida et al. 2023, ApJS 267, 44)';
const CACHE = path.join(REPO, '.sdss-cache');

/** The archive, and what it asks to be told. */
const ARCHIVE = {
  name: 'Sloan Digital Sky Survey',
  release: 'DR18',
  releasePaper: 'Almeida et al. 2023, ApJS 267, 44 (SDSS-IV/V Data Release 18)',
  instrument:
    'SDSS spectrograph on the 2.5 m Sloan Foundation Telescope, Apache Point Observatory',
  instrumentPaper:
    'Smee et al. 2013, AJ 146, 32; Gunn et al. 2006, AJ 131, 2332',
  surveyPaper: 'Yanny et al. 2009, AJ 137, 4377 (SEGUE)',
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

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

/** The name a cached spectrum is filed under. */
const cacheName = s => `spec-${s.plate}-${s.mjd}-${s.fiberID}.csv`;

/** The URL a spectrum came from, and can be fetched from again. */
const sourceUrl = s =>
  `${ARCHIVE.spectrumBase}?plateid=${s.plate}&mjd=${s.mjd}&fiberid=${s.fiberID}`;

/**
 * Fetch one spectrum, or read it from the local cache.
 * @param {object} src - A SOURCES entry
 * @param {boolean} offline - Refuse to reach the network
 * @returns {Promise<string>} The CSV text
 */
async function fetchSource(src, offline) {
  const cached = path.join(CACHE, cacheName(src));
  if (existsSync(cached)) return readFile(cached, 'utf8');
  if (offline) {
    throw new Error(
      `${cacheName(src)} is not in ${path.relative(REPO, CACHE)} and --offline ` +
        `was given. Run \`npm run spectra:data\` once to populate the cache.`
    );
  }
  // Bounded. On 2026-09-22 the spectrum service answered 502 after holding
  // the connection for 122 seconds; without a limit that is two minutes per
  // spectrum before the build reports anything at all.
  const res = await fetch(sourceUrl(src), {
    signal: AbortSignal.timeout(60_000),
    headers: {
      'User-Agent':
        'gravitas-spectra-build/1.0 (+https://gravitas-sim.github.io)',
    },
  });
  if (!res.ok) throw new Error(`${sourceUrl(src)}: HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, text);
  return text;
}

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
 * @param {boolean} offline - Refuse to reach the network
 * @returns {Promise<object>} Everything the module template needs
 */
async function gather(offline) {
  const read = [];
  for (const src of SOURCES) {
    const text = await fetchSource(src, offline);
    const digest = sha256(Buffer.from(text));
    if (digest !== src.sha256) {
      throw new Error(
        `${cacheName(src)} is not the file this bundle was built from.\n` +
          `  expected ${src.sha256}\n  got      ${digest}\n` +
          `  from ${sourceUrl(src)}\n` +
          '  Either the archive reissued the spectrum or the cache is stale. ' +
          'Delete the cached file and fetch it again; if the checksum still ' +
          'differs, the change is real and belongs in SOURCES with a note.'
      );
    }
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

/** Build the module text. */
async function build({ offline }) {
  const { grid, spectra, worst, span, kept } = await gather(offline);
  const ids = SOURCES.map(s => s.id);

  const sourceBytes = ids.reduce((t, id) => t + spectra[id].sourceBytes, 0);
  const sourceSamples = ids.reduce((t, id) => t + spectra[id].sourceSamples, 0);
  const keptSamples = ids.reduce((t, id) => t + spectra[id].count, 0);
  const payloadBytes = ids.reduce((t, id) => t + spectra[id].data.length, 0);

  const provenance = {
    archive: ARCHIVE,
    catalogQuery: CATALOG_QUERY,
    kind: 'observation',
    what:
      'Four observed stellar spectra, one each of spectral type A, G, K and M. ' +
      'These are measurements of four real stars. Nothing here is a model, a ' +
      'fit or a synthetic spectrum, and no quantity in this file was computed ' +
      'by Gravitas.',
    selection: [
      "class = 'STAR' and zWarning = 0.",
      'plate < 3510, the SDSS legacy spectrograph, so all four share one ' +
        'instrument, one wavelength grid, one resolution and one flux ' +
        'calibration.',
      'One spectral class each, at a subtype not adjacent to a class boundary.',
      'Of those, the highest snMedian.',
      "After selection, the class's defining signature checked in the data: " +
        'the highest-signal M dwarf in the catalog is an M0V whose TiO5 index ' +
        'is 0.887 against 0.940 for the K star, which is not a feature a ' +
        'student can find, and is excluded by the subtype rule above.',
    ],
    classification:
      'Two independent pipeline classifications agree on the letter for all ' +
      'four: the spectro1d subClass and the ELODIE template match ' +
      'elodieSpType. No class here was inferred from a color.',
    grid: {
      convention:
        'SDSS samples every spectrum at log10(lambda / Angstrom) = 1e-4 * i ' +
        'for integer i. All four of these are runs of consecutive i on that ' +
        'one grid, which is why no wavelength array is stored and why ' +
        'trimming to the common range moves no flux value. The build checks ' +
        'the grid rather than assuming it.',
      frame:
        'VACUUM wavelengths, heliocentric. Not shifted to rest: each star ' +
        'carries its own radial velocity, recorded as z, and the largest here ' +
        'is 2.0 Angstroms at H-alpha - a fifth of the narrowest window this ' +
        'bundle measures in, and below the sample spacing after thinning.',
    },
    units: {
      wavelength: 'Angstrom, vacuum',
      flux: '1e-17 erg / s / cm^2 / Angstrom',
    },
    transformations: [
      {
        step: 'trim',
        from: 'four spectra of about 3,800 samples each, over slightly different wavelength ranges',
        to: `the ${span} grid indices all four cover, of which ${kept} are used`,
        why: 'so the four share one wavelength axis and can be plotted and compared without resampling any of them',
        parameters: `common index range, ${BIN}-divisible truncation`,
        lossless: true,
      },
      {
        step: 'bin',
        from: `${kept} samples per spectrum at log step ${LOG_STEP}`,
        to: `${grid.count} samples per spectrum at log step ${LOG_STEP * BIN}`,
        why:
          'size. The archive sampling oversamples the instrument: the SDSS ' +
          'resolving power of about 2000 puts a resolution element at roughly ' +
          `2.2 samples, so averaging ${BIN} of them costs resolution the ` +
          'spectrograph did not deliver. The cost was measured rather than ' +
          'assumed - see thinning below.',
        parameters: `arithmetic mean of ${BIN} adjacent samples; bin center is their mean log wavelength`,
        lossless: false,
      },
      {
        step: 'quantise',
        from: 'float flux as the archive printed it, to three decimals',
        to: 'little-endian int16, one integer scale per spectrum',
        why: 'size',
        parameters: 'value = round(flux * scale); flux = value / scale',
        lossless: false,
      },
    ],
    notDone: [
      'No smoothing.',
      'No normalisation, of any kind. The four are stored in the flux units ' +
        'the archive published them in, so the continuum slope that separates ' +
        'an A star from an M star is in the committed data and is not a ' +
        'drawing decision.',
      'No continuum fitting or division.',
      'No resampling or interpolation onto a new wavelength grid.',
      'No shift to rest wavelength.',
      'No masking, sky subtraction or repair. What the pipeline delivered is ' +
        'what is here, including any sky residual it left behind.',
    ],
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
        'band depth, in percentage points, of the four features the lesson ' +
        'uses, measured on the full-resolution archive spectrum and on the ' +
        'thinned copy. The shift is the difference.',
      worstShiftPP: Object.fromEntries(
        Object.entries(worst).map(([k, v]) => [k, Number(v.toFixed(2))])
      ),
      worstOverall: Number(Math.max(...Object.values(worst)).toFixed(2)),
    },
    caveats: [
      'Four spectra are four examples. This is not a spectral atlas, not a ' +
        'representative sample of anything, and not a survey. Each letter ' +
        'here is represented by exactly one star.',
      'The A star has a pipeline surface gravity of 3.18 and a metallicity of ' +
        '-1.67, so it is very probably not a main-sequence A dwarf; it is an ' +
        'A-type spectrum, which is all this bundle calls it.',
      'The M star is classified M2Vvar by the ELODIE match, and its H-alpha ' +
        'is filled in rather than absorbed - chromospheric emission, which is ' +
        'ordinary in an M dwarf. H-alpha is not one of the four features the ' +
        'lesson uses.',
      'snMedian is the pipeline median signal-to-noise over the whole ' +
        'spectrum. The blue end of every one of these is noisier than the red.',
    ],
  };

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

  const body = `// =============================================================================
// Four observed stellar spectra from SDSS DR18
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-sdss-spectra.mjs; run
// \`npm run spectra:data\` to regenerate, \`npm run spectra:check\` to verify the
// committed module offline, and \`npm run spectra:provenance\` to rebuild it
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
// what the averaging cost in each feature the lesson uses - is its sibling,
// js/data/spectra/sdssSpectraProvenance.js, generated by the same run and
// verified by the same check.
// =============================================================================

/* eslint-disable */

/** The source, as the readout names it. The full record is the sibling file. */
export const CITATION = ${JSON.stringify(CITATION)};

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
    url: spec.url,
  };
  cache.set(id, decoded);
  return decoded;
}

/** Every spectrum id, hottest first. */
export const SPECTRUM_IDS = ${JSON.stringify(ids)};
`;

  const provenanceBody = `// =============================================================================
// Where the four SDSS spectra came from, and what was done to them
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-sdss-spectra.mjs in the
// same run as js/data/spectra/sdssSpectra.js, and verified by the same check.
//
// The audit record for the four observed spectra. No module in the
// application imports this: the browser never needs it, and keeping it out of
// the lazy data chunk is the whole reason it is a separate file. Tests, the
// build tool and anybody checking the work read it here.
//
// RECORDS carries each spectrum's full archive identity and both checksums:
// sourceSha256 is of the CSV the archive served, payloadSha256 of the int16
// flux committed beside this file. The check recomputes the second from the
// data module, so the two files cannot drift apart without failing.
// =============================================================================

/** Where every number came from, and what was done to it. */
export const PROVENANCE = ${JSON.stringify(provenance, null, 2)};

/** Each spectrum's archive record, keyed as in SPECTRA. */
export const RECORDS = ${JSON.stringify(records, null, 2)};
`;

  const options = { parser: 'babel', ...(await prettierOptions()) };
  return {
    runtime: await prettier.format(body, options),
    provenance: await prettier.format(provenanceBody, options),
  };
}

/**
 * Verify the committed module without the archive.
 *
 * Structural validity and "these are SDSS's numbers" are different claims and
 * only the second one needs the CSVs, which is the same split
 * tools/build-gw-data.mjs and tools/build-stellar-tracks.mjs make. This half
 * runs anywhere, offline, forever.
 */
async function structuralCheck() {
  const problems = [];
  if (!existsSync(OUT)) return ['js/data/spectra/sdssSpectra.js is missing'];
  if (!existsSync(OUT_PROVENANCE)) {
    return ['js/data/spectra/sdssSpectraProvenance.js is missing'];
  }
  const { GRID, SPECTRA, SPECTRUM_IDS, CITATION, decodeSpectrum, wavelengths } =
    await import(pathToFileURL(OUT).href);
  const { PROVENANCE, RECORDS } = await import(
    pathToFileURL(OUT_PROVENANCE).href
  );
  if (!CITATION) problems.push('the data module names no source');

  for (const field of [
    'archive',
    'catalogQuery',
    'kind',
    'selection',
    'classification',
    'grid',
    'units',
    'transformations',
    'notDone',
    'size',
    'thinning',
    'caveats',
  ]) {
    if (!PROVENANCE?.[field]) problems.push(`provenance is missing ${field}`);
  }
  if (PROVENANCE?.kind !== 'observation') {
    problems.push('provenance does not say these are observations');
  }
  if (!PROVENANCE?.archive?.acknowledgement) {
    problems.push('provenance carries no archive acknowledgement');
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
      problems.push(`${src.id}: missing from ${data ? 'RECORDS' : 'SPECTRA'}`);
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
        problems.push(`${src.id}: provenance is missing ${field}`);
      }
    }
    if (!/^[0-9a-f]{64}$/.test(spec.sourceSha256 || '')) {
      problems.push(`${src.id}: the source checksum is not a SHA-256`);
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

const args = process.argv.slice(2);
const check = args.includes('--check');
const offline = args.includes('--offline');
// The same flag as tools/build-gw-data.mjs and tools/build-stellar-tracks.mjs,
// for the same reason: normal CI must not fail because an observatory's web
// server is down, and a provenance claim must not quietly become a structural
// one when it is.
const requireSources = args.includes('--require-sources');
const haveCache = SOURCES.every(s =>
  existsSync(path.join(CACHE, cacheName(s)))
);

try {
  if (check) {
    const problems = await structuralCheck();
    if (problems.length) {
      console.error('The spectra have problems:');
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    if (!haveCache && requireSources) {
      console.error(
        'Provenance NOT verified: the archive CSVs are not cached.\n' +
          `  ${path.relative(REPO, CACHE)} does not hold all four, so\n` +
          '  js/data/spectra/sdssSpectra.js could not be regenerated from\n' +
          `  ${ARCHIVE.spectrumBase} and compared. Structural validity says the\n` +
          '  module is complete and self-consistent. It does not say the numbers\n' +
          "  are SDSS's. Run `npm run spectra:data` once, then run this again."
      );
      process.exit(1);
    }
    if (!haveCache) {
      console.log(
        'The four spectra are complete and internally consistent.\n' +
          '  PROVENANCE NOT VERIFIED: the archive CSVs are not cached, so the\n' +
          '  module was not regenerated and compared byte for byte. This run\n' +
          '  checked the structure of what is checked in, not where it came from.\n' +
          '  Run `npm run spectra:data` once to fetch them, or\n' +
          '  `npm run spectra:provenance` to make the missing sources a failure\n' +
          '  rather than a caveat.'
      );
      process.exit(0);
    }
    const next = await build({ offline: true });
    const stale = [
      [OUT, next.runtime],
      [OUT_PROVENANCE, next.provenance],
    ].filter(
      ([file, text]) => !existsSync(file) || readFileSync(file, 'utf8') !== text
    );
    if (stale.length) {
      console.error(
        stale.map(([file]) => path.relative(REPO, file)).join(' and ') +
          ' is not what\ntools/build-sdss-spectra.mjs would write. Run ' +
          '`npm run spectra:data` and commit the result.'
      );
      process.exit(1);
    }
    console.log(
      'The four spectra are current, and regenerate byte for byte from the ' +
        'cached\n  SDSS DR18 CSVs whose checksums PROVENANCE records - ' +
        'provenance verified.'
    );
  } else {
    const next = await build({ offline });
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, next.runtime);
    await writeFile(OUT_PROVENANCE, next.provenance);
    for (const [file, text] of [
      [OUT, next.runtime],
      [OUT_PROVENANCE, next.provenance],
    ]) {
      const kb = (Buffer.byteLength(text) / 1024).toFixed(1);
      console.log(`Wrote ${path.relative(REPO, file)} (${kb} KB)`);
    }
    const mod = await import(`${pathToFileURL(OUT).href}?t=${Date.now()}`);
    const prov = await import(
      `${pathToFileURL(OUT_PROVENANCE).href}?t=${Date.now()}`
    );
    const p = prov.PROVENANCE;
    console.log(
      `  grid ${mod.GRID.firstA} - ${mod.GRID.lastA} A, ${mod.GRID.count} samples, shared`
    );
    for (const id of mod.SPECTRUM_IDS) {
      const s = prov.RECORDS[id];
      console.log(
        `  ${s.letter}  ${String(s.subClass).padEnd(4)} / ${String(s.elodieSpType).padEnd(7)} ` +
          `${String(s.elodieTEff).padStart(5)} K  S/N ${String(Math.round(s.snMedian)).padStart(3)}  ` +
          `TiO5 ${s.tio5.toFixed(3)}  ${s.sourceSamples} -> ${s.count} samples`
      );
    }
    console.log(
      `  ${(p.size.sourceBytes / 1024).toFixed(0)} KB of CSV -> ` +
        `${(p.size.payloadBase64Bytes / 1024).toFixed(1)} KB of base64 ` +
        `(${p.size.byteFactor}x), worst band-depth shift ${p.thinning.worstOverall} pp`
    );
  }
} catch (err) {
  console.error(String(err.message || err));
  process.exit(1);
}
