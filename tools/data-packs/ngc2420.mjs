// =============================================================================
// NGC 2420, and the models it is compared with: three table packs
// -----------------------------------------------------------------------------
// The data of the stellar-populations suite (STELLAR_POPULATIONS.md), built by
// tools/build-data-packs.mjs like every pack, from raw products pinned by
// tools/data-packs/pinned.mjs:
//
//   sdss-dr18-ngc2420-photometry   SDSS DR18 PSF photometry of the stars
//                                  around the open cluster NGC 2420
//   sdss-dr18-ngc2420-segue        SEGUE's stellar parameters for the spectra
//                                  taken around it (SSPP)
//   mist-sdss-isochrones           MIST v1.2 isochrones in the SDSS bands, a model
//
// Each is a table (js/tableObservation.js), opened only by the Observatory, so
// none is a capability package: a package's loader lands in
// js/platform/builtins.js, which the application reaches, and these tables
// are for the Observatory alone.
//
// NGC 2420 is one of the two open clusters the SEGUE Stellar Parameter
// Pipeline was calibrated on (Lee et al. 2008b), which is why SDSS has both
// imaging and a few hundred spectra of it. The SkyServer answers are
// byte-stable, but a header line could change without the data changing, so
// each is pinned over its data lines, as a VizieR answer is.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { URLSearchParams } from 'node:url';

import {
  ENCODING,
  TABLE_VERSION,
  encodeTable,
  readCsv,
} from './table-columns.mjs';

const SQL = 'https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch';
const urlOf = cmd => `${SQL}?${new URLSearchParams({ cmd, format: 'csv' })}`;

/** The adopted center, and the cluster's published parameters, cited. */
export const NGC2420 = {
  ra: 114.602,
  dec: 21.575,
  centerRef: 'Cantat-Gaudin et al. 2020, A&A 640, A1 (VizieR J/A+A/640/A1)',
  // Lee et al. 2008b, AJ 136, 2050, Table 1, from WEBDA: the mean of three
  // literature radial velocities.
  rv: { value: 74.0, unit: 'km/s', ref: 'Lee et al. 2008b, AJ 136, 2050' },
};

const CONE = 'dbo.fGetNearbyObjEq(114.602,21.575,14.1421)';
const SPEC = 'dbo.fGetNearbySpecObjEq(114.602,21.575,30)';
export const QUERIES = {
  photometry: `SELECT s.ra, s.dec, s.psfMag_g, s.psfMagErr_g, s.psfMag_r, s.psfMagErr_r FROM ${CONE} AS nb JOIN Star AS s ON s.objID = nb.objID WHERE s.clean = 1 AND s.psfMag_g < 22.5 ORDER BY s.objID`,
  photometryCounts: `SELECT SUM(CASE WHEN s.clean = 1 AND s.psfMag_g < 22.5 THEN 1 ELSE 0 END) AS kept, SUM(CASE WHEN s.clean = 0 AND s.psfMag_g < 22.5 THEN 1 ELSE 0 END) AS unclean, SUM(CASE WHEN s.clean = 0 AND s.psfMag_g < 14.5 THEN 1 ELSE 0 END) AS uncleanBright, SUM(CASE WHEN s.psfMag_g >= 22.5 THEN 1 ELSE 0 END) AS faint FROM ${CONE} AS nb JOIN Star AS s ON s.objID = nb.objID`,
  core: 'SELECT SUM(CASE WHEN nb.distance < 2 THEN 1 ELSE 0 END) AS within2, COUNT(*) AS within3 FROM dbo.fGetNearbyObjEq(114.602,21.575,3) AS nb JOIN PhotoObjAll AS s ON s.objID = nb.objID',
  segue: `SELECT s.ra, s.dec, ph.psfMag_g, ph.psfMag_r, p.elodiervfinal, p.elodiervfinalerr, p.teffadop, p.teffadopunc, p.loggadop, p.loggadopunc, p.fehadop, p.fehadopunc, p.snr FROM ${SPEC} AS nb JOIN sppParams AS p ON p.specobjid = nb.specObjID JOIN SpecObj AS s ON s.specobjid = p.specobjid LEFT JOIN PhotoObj AS ph ON ph.objid = p.bestobjid WHERE p.teffadop > 0 AND p.seguePrimary = 1 ORDER BY p.specobjid`,
  segueCounts: `SELECT COUNT(*) AS spectra, SUM(CASE WHEN p.seguePrimary = 1 THEN 1 ELSE 0 END) AS primaryOnes, SUM(CASE WHEN p.seguePrimary = 1 AND p.teffadop > 0 THEN 1 ELSE 0 END) AS kept FROM ${SPEC} AS nb JOIN sppParams AS p ON p.specobjid = nb.specObjID`,
};

/** Great-circle distance between two positions, in arcminutes. */
export function arcmin(ra1, dec1, ra2, dec2) {
  const r = Math.PI / 180;
  const s =
    Math.sin(((dec2 - dec1) * r) / 2) ** 2 +
    Math.cos(dec1 * r) *
      Math.cos(dec2 * r) *
      Math.sin(((ra2 - ra1) * r) / 2) ** 2;
  return ((2 * Math.asin(Math.min(1, Math.sqrt(s)))) / r) * 60;
}

const SDSS_LICENSE = {
  status: 'public-domain',
  statement:
    'SDSS data are in the public domain. SDSS asks that work using them acknowledge the survey and cite the data release (NOTICE).',
};
const SDSS_CITATIONS = [
  {
    text: 'Almeida et al. 2023, ApJS 267, 44 (SDSS DR18)',
    doi: '10.3847/1538-4365/acda98',
  },
  {
    text: 'York et al. 2000, AJ 120, 1579 (the Sloan Digital Sky Survey)',
    doi: '10.1086/301513',
  },
];
const SDSS_FACILITY = {
  observatory: 'SDSS',
  instrument: '2.5 m Sloan Foundation Telescope, Apache Point Observatory',
};
const OBJECT = {
  name: 'NGC 2420',
  identifiers: ['NGC 2420'],
  ra: NGC2420.ra,
  dec: NGC2420.dec,
  frame: 'ICRS, epoch J2000',
};
const RETRIEVED = '2026-09-27';

/** A pack's columns as its manifest describes them: without the encoder's step. */
const described = columns =>
  columns.map(c =>
    Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'step'))
  );

// --- The photometry ------------------------------------------------------------

export const NGC2420_PHOTOMETRY = {
  id: 'sdss-dr18-ngc2420-photometry',
  manifest: 'data-packs/sdss-dr18-ngc2420-photometry.json',
  capability: null,
  module: 'js/data/observations/sdssNgc2420Photometry.js',
  exportName: 'sdssNgc2420Photometry',
  transformVersion: TABLE_VERSION,
  table: true,
  raw: [
    {
      file: 'sdss-dr18-ngc2420-photometry.csv',
      url: urlOf(QUERIES.photometry),
      canonical: 'data-lines',
      sha256:
        '060b80173201014eb09651b41f25834c27f84313dfa3fe48b7f8098346340652',
    },
    {
      file: 'sdss-dr18-ngc2420-photometry-counts.csv',
      url: urlOf(QUERIES.photometryCounts),
      canonical: 'data-lines',
      sha256:
        'a560d138ef176f7965585a2fede2edbd3f7c5fdef1b1d166967781b1545ac67d',
    },
    {
      file: 'sdss-dr18-ngc2420-core-counts.csv',
      url: urlOf(QUERIES.core),
      canonical: 'data-lines',
      sha256:
        'ab75ade6cbae53090510440d5070f19c6e912b6e397f54e486ebaac4d2b84566',
    },
  ],
  columns: [
    {
      id: 'ra',
      name: 'ra',
      unit: 'deg',
      step: 1e-5,
      description: 'right ascension, ICRS',
    },
    {
      id: 'dec',
      name: 'dec',
      unit: 'deg',
      step: 1e-5,
      description: 'declination, ICRS',
    },
    {
      id: 'g',
      name: 'g',
      unit: 'mag',
      step: 0.001,
      description:
        'SDSS g PSF magnitude (psfMag_g), not corrected for extinction',
    },
    {
      id: 'g_err',
      name: 'g error',
      unit: 'mag',
      step: 0.0005,
      uncertaintyOf: 'g',
      description: 'its one-sigma error (psfMagErr_g)',
    },
    {
      id: 'r',
      name: 'r',
      unit: 'mag',
      step: 0.001,
      description:
        'SDSS r PSF magnitude (psfMag_r), not corrected for extinction',
    },
    {
      id: 'r_err',
      name: 'r error',
      unit: 'mag',
      step: 0.0005,
      uncertaintyOf: 'r',
      description: 'its one-sigma error (psfMagErr_r)',
    },
  ],

  build(raw) {
    const rows = readCsv(raw[0]).map(r => ({
      ra: r.ra,
      dec: r.dec,
      g: r.psfMag_g,
      g_err: r.psfMagErr_g,
      r: r.psfMag_r,
      r_err: r.psfMagErr_r,
    }));
    const counts = readCsv(raw[1])[0];
    const core = readCsv(raw[2])[0];
    if (counts.kept !== rows.length)
      throw new Error(
        `the counts say ${counts.kept} kept and the table holds ${rows.length}`
      );
    const { series, record } = encodeTable(rows, this.columns);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'NGC 2420: SDSS DR18 photometry',
      object: OBJECT,
      facility: {
        ...SDSS_FACILITY,
        pipeline: 'SDSS DR18 imaging (the Star view, PSF magnitudes)',
      },
      dataType: 'catalog',
      origin: 'observed',
      credit: 'SDSS DR18 imaging (Almeida et al. 2023)',
      license: SDSS_LICENSE,
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [
        {
          column: 'clean',
          rule: "SDSS's clean-photometry flag: a star that is saturated, near an edge or deblended badly is dropped",
          dropped: counts.unclean,
        },
        {
          column: 'psfMag_g',
          rule: 'a star fainter than g = 22.5, where SDSS photometry becomes incomplete, is dropped',
          dropped: counts.faint,
        },
      ],
      reductions: [
        `Every star within 14.14 arcmin of the adopted center (RA ${NGC2420.ra}, Dec +${NGC2420.dec}; ${NGC2420.centerRef}): a circle of 10 arcmin and an annulus of the same area around it, so the cluster and a field of equal size can be compared.`,
        `Of the stars dropped as not clean, ${counts.uncleanBright} are brighter than g = 14.5, where SDSS saturates: the cluster's brightest giants are not in this table.`,
        `SDSS's standard photometry has almost nothing at the cluster's center: ${core.within2} detections of any kind within 2 arcmin and ${core.within3} within 3 (DR18 PhotoObjAll), because its pipeline does not separate stars in so crowded a field (An et al. 2008 remeasured such fields for that reason). The core is missing from this table, not from the sky.`,
        'Positions are rounded to 0.00001 degree (0.04 arcsec), magnitudes to 1 mmag and their errors to 0.5 mmag.',
        "The SDSS object ids are left out; the query in the pack's manifest returns them.",
      ],
    };
    const manifestRest = {
      source: {
        archive: 'SDSS SkyServer, Data Release 18',
        urls: this.raw.map(r => r.url),
        queries: [QUERIES.photometry, QUERIES.photometryCounts, QUERIES.core],
        citations: [
          ...SDSS_CITATIONS,
          {
            text: 'An et al. 2008, ApJS 179, 326 (SDSS photometry of crowded cluster fields)',
            doi: '10.1086/592090',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/ngc2420.mjs',
        version: TABLE_VERSION,
        options: {
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          'Query the SDSS DR18 Star view for every star within 14.1421 arcmin of the adopted center with clean photometry and g < 22.5, ordered by object id.',
          'Count, in a second query over the same circle, the stars that are not clean or fainter, for the masks.',
          `Encode as ${ENCODING}: each column a whole number of its step from an offset, int16 where the range fits.`,
        ],
        record: { rows: rows.length, columns: record },
      },
      assumptions: [
        'PSF magnitudes, as the SDSS pipeline measures them; not corrected for extinction, which a reader applies with a reddening they choose.',
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /**
   * The check: a cluster is there, around the hole SDSS leaves at its center.
   * Stars brighter than g = 20 are more than 1.2 times as dense between 3 and
   * 8 arcmin of the center as between 10 and 14.14 arcmin, which is field.
   */
  validate(table) {
    const col = id => table.columns.find(c => c.id === id).values;
    const [ra, dec, g] = ['ra', 'dec', 'g'].map(col);
    let inner = 0;
    let outer = 0;
    for (let i = 0; i < table.n; i++) {
      if (!(g[i] < 20)) continue;
      const d = arcmin(NGC2420.ra, NGC2420.dec, ra[i], dec[i]);
      if (d >= 3 && d < 8) inner++;
      else if (d >= 10) outer++;
    }
    const contrast = inner / (64 - 9) / (outer / (200 - 100));
    return {
      check:
        'stars brighter than g = 20 are more than 1.2 times as dense between 3 and 8 arcmin of the center as between 10 and 14.14 arcmin',
      against: [
        {
          quantity: 'center',
          value: `${NGC2420.ra}, ${NGC2420.dec}`,
          ref: NGC2420.centerRef,
        },
      ],
      result: { contrast: Number(contrast.toFixed(3)), inner, outer },
      ok: contrast > 1.2,
    };
  },
};

// --- The spectroscopic parameters -------------------------------------------------

export const NGC2420_SEGUE = {
  id: 'sdss-dr18-ngc2420-segue',
  manifest: 'data-packs/sdss-dr18-ngc2420-segue.json',
  capability: null,
  module: 'js/data/observations/sdssNgc2420Segue.js',
  exportName: 'sdssNgc2420Segue',
  transformVersion: TABLE_VERSION,
  table: true,
  raw: [
    {
      file: 'sdss-dr18-ngc2420-segue.csv',
      url: urlOf(QUERIES.segue),
      canonical: 'data-lines',
      sha256:
        'ce9828dac31e88170b251b376d5b146a7a5fd336d83050fb86d073cadba9ca29',
    },
    {
      file: 'sdss-dr18-ngc2420-segue-counts.csv',
      url: urlOf(QUERIES.segueCounts),
      canonical: 'data-lines',
      sha256:
        'a2aca23af48f4dce12cb8fed57b107e2f3e1a65a79cd5409604a44243a840443',
    },
  ],
  columns: [
    {
      id: 'ra',
      name: 'ra',
      unit: 'deg',
      step: 2e-5,
      description: 'right ascension of the fiber, ICRS',
    },
    {
      id: 'dec',
      name: 'dec',
      unit: 'deg',
      step: 2e-5,
      description: 'declination of the fiber, ICRS',
    },
    {
      id: 'g',
      name: 'g',
      unit: 'mag',
      step: 0.001,
      description:
        "the star's SDSS g PSF magnitude (psfMag_g of its best photometric object), not corrected for extinction",
    },
    {
      id: 'r',
      name: 'r',
      unit: 'mag',
      step: 0.001,
      description: 'its SDSS r PSF magnitude, the same way',
    },
    {
      id: 'rv',
      name: 'radial velocity',
      unit: 'km/s',
      step: 0.01,
      description: 'heliocentric radial velocity (ELODIERVFINAL, SSPP)',
    },
    {
      id: 'rv_err',
      name: 'radial velocity error',
      unit: 'km/s',
      step: 0.01,
      uncertaintyOf: 'radial velocity',
      description: 'its error (ELODIERVFINALERR)',
    },
    {
      id: 'teff',
      name: 'Teff',
      unit: 'K',
      step: 1,
      description: 'adopted effective temperature (TEFFADOP, SSPP)',
    },
    {
      id: 'teff_err',
      name: 'Teff error',
      unit: 'K',
      step: 1,
      uncertaintyOf: 'Teff',
      description: 'its uncertainty (TEFFADOPUNC)',
    },
    {
      id: 'logg',
      name: 'log g',
      unit: 'dex',
      step: 0.001,
      description: 'adopted surface gravity, log of cm/s^2 (LOGGADOP, SSPP)',
    },
    {
      id: 'logg_err',
      name: 'log g error',
      unit: 'dex',
      step: 0.001,
      uncertaintyOf: 'log g',
      description: 'its uncertainty (LOGGADOPUNC)',
    },
    {
      id: 'feh',
      name: '[Fe/H]',
      unit: 'dex',
      step: 0.001,
      description: 'adopted iron abundance relative to the Sun (FEHADOP, SSPP)',
    },
    {
      id: 'feh_err',
      name: '[Fe/H] error',
      unit: 'dex',
      step: 0.001,
      uncertaintyOf: '[Fe/H]',
      description: 'its uncertainty (FEHADOPUNC)',
    },
    {
      id: 'snr',
      name: 'S/N',
      unit: '',
      step: 0.01,
      description: 'the spectrum’s mean signal-to-noise per pixel (SNR, SSPP)',
    },
  ],

  build(raw) {
    const rows = readCsv(raw[0]).map(r => ({
      ra: r.ra,
      dec: r.dec,
      g: r.psfMag_g,
      r: r.psfMag_r,
      rv: r.elodiervfinal,
      rv_err: r.elodiervfinalerr,
      teff: r.teffadop,
      teff_err: r.teffadopunc,
      logg: r.loggadop,
      logg_err: r.loggadopunc,
      feh: r.fehadop,
      feh_err: r.fehadopunc,
      snr: r.snr,
    }));
    const counts = readCsv(raw[1])[0];
    if (counts.kept !== rows.length)
      throw new Error(
        `the counts say ${counts.kept} kept and the table holds ${rows.length}`
      );
    const { series, record } = encodeTable(rows, this.columns);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'NGC 2420: SEGUE stellar parameters',
      object: OBJECT,
      facility: {
        ...SDSS_FACILITY,
        instrument: `${SDSS_FACILITY.instrument}, SDSS spectrographs (R ~ 1800)`,
        pipeline: 'SEGUE Stellar Parameter Pipeline, DR18 (sppParams)',
      },
      dataType: 'catalog',
      origin: 'observed',
      credit:
        'SDSS DR18 SEGUE spectroscopy and SSPP parameters (Almeida et al. 2023; Lee et al. 2008a)',
      license: SDSS_LICENSE,
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [
        {
          column: 'seguePrimary',
          rule: 'a second spectrum of a star already in the table is dropped',
          dropped: counts.spectra - counts.primaryOnes,
        },
        {
          column: 'teffadop',
          rule: 'a spectrum for which SSPP adopted no parameters is dropped',
          dropped: counts.primaryOnes - counts.kept,
        },
      ],
      reductions: [
        'Every spectrum within 30 arcmin of the adopted center: the region SEGUE targeted around the cluster (Lee et al. 2008b). SEGUE chose its targets by color and magnitude, and two fibers could not be placed within 55 arcsec of each other, so this is not every star there.',
        'Positions are rounded to 0.00002 degree (0.07 arcsec), velocities to 0.01 km/s, Teff to 1 K, log g and [Fe/H] to 0.001 dex.',
        "The spectrum ids are left out; the query in the pack's manifest returns them.",
      ],
    };
    const manifestRest = {
      source: {
        archive: 'SDSS SkyServer, Data Release 18',
        urls: this.raw.map(r => r.url),
        queries: [QUERIES.segue, QUERIES.segueCounts],
        citations: [
          ...SDSS_CITATIONS,
          {
            text: 'Lee et al. 2008a, AJ 136, 2022 (the SEGUE Stellar Parameter Pipeline)',
            doi: '10.1088/0004-6256/136/5/2022',
          },
          {
            text: 'Lee et al. 2008b, AJ 136, 2050 (its validation on globular and open clusters, NGC 2420 among them)',
            doi: '10.1088/0004-6256/136/5/2050',
          },
          {
            text: 'Yanny et al. 2009, AJ 137, 4377 (SEGUE)',
            doi: '10.1088/0004-6256/137/5/4377',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/ngc2420.mjs',
        version: TABLE_VERSION,
        options: {
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          "Query SSPP's parameters for every SEGUE spectrum within 30 arcmin of the adopted center, one spectrum per star (seguePrimary) and only those with adopted parameters, with the fiber's position and the star's PSF magnitudes, ordered by spectrum id.",
          'Count, in a second query over the same circle, every spectrum, the primary ones and those kept, for the masks.',
          `Encode as ${ENCODING}: each column a whole number of its step from an offset, int16 where the range fits.`,
        ],
        record: { rows: rows.length, columns: record },
      },
      assumptions: [
        "SSPP's adopted parameters, as published. Lee et al. 2008b found SSPP's [Fe/H] low by about 0.3 dex for stars of near-solar metallicity; that is not corrected here.",
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /**
   * The check: the cluster is in it. The median radial velocity of the
   * spectra within 10 arcmin of the center is within 5 km/s of the cluster's
   * published velocity.
   */
  validate(table) {
    const col = id => table.columns.find(c => c.id === id).values;
    const [ra, dec, rv] = ['ra', 'dec', 'rv'].map(col);
    const near = [];
    for (let i = 0; i < table.n; i++)
      if (arcmin(NGC2420.ra, NGC2420.dec, ra[i], dec[i]) < 10) near.push(rv[i]);
    near.sort((a, b) => a - b);
    const median =
      near.length % 2
        ? near[near.length >> 1]
        : (near[near.length / 2 - 1] + near[near.length / 2]) / 2;
    return {
      check:
        "the median radial velocity within 10 arcmin of the center is within 5 km/s of the cluster's",
      against: [{ quantity: 'radial velocity', ...NGC2420.rv }],
      result: { median: Number(median.toFixed(2)), spectra: near.length },
      ok: Math.abs(median - NGC2420.rv.value) <= 5,
    };
  },
};

// --- The isochrones -------------------------------------------------------------

const MIST_FILE = 'MIST_v1.2_vvcrit0.0_SDSSugriz.txz';
/** The metallicities and ages kept: around NGC 2420's, and the Sun's. */
export const ISO_FEH = ['m0.50', 'm0.25', 'p0.00'];
export const ISO_AGES = [9.0, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6];
// MIST's phases: 0 the main sequence, 2 the subgiant and red-giant branches,
// 3 core helium burning. Pre-main sequence and everything after, left out.
const ISO_PHASES = new Set([0, 2, 3]);
// Stars fainter than this absolute g are below the photometry at the
// cluster's distance (g = 22.5 at a distance modulus near 12).
const ISO_FAINTEST = 11;
// How far a thinned isochrone may stray from MIST's, in color and magnitude.
const ISO_TOLERANCE = 0.005;

/** Ramer-Douglas-Peucker, in the (x, y) plane: the indices kept. */
function thin(xs, ys, tol) {
  const keep = new Uint8Array(xs.length);
  keep[0] = keep[xs.length - 1] = 1;
  const stack = [[0, xs.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1;
    let at = -1;
    const dx = xs[b] - xs[a];
    const dy = ys[b] - ys[a];
    const len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (xs[i] - xs[a]) - dx * (ys[i] - ys[a])) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return [...keep.keys()].filter(i => keep[i]);
}

/** One MIST .iso.cmd file's rows, by column name. */
export function readIsoCmd(text) {
  const lines = text.split('\n');
  const head = lines.find(l => /^#\s+EEP\s/.test(l));
  if (!head) throw new Error('no column header in the isochrone file');
  const names = head.replace(/^#/, '').trim().split(/\s+/);
  return lines
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const v = l.trim().split(/\s+/).map(Number);
      return Object.fromEntries(names.map((n, i) => [n, v[i]]));
    });
}

export const MIST_ISOCHRONES = {
  id: 'mist-sdss-isochrones',
  manifest: 'data-packs/mist-sdss-isochrones.json',
  capability: null,
  module: 'js/data/observations/mistSdssIsochrones.js',
  exportName: 'mistSdssIsochrones',
  transformVersion: TABLE_VERSION,
  table: true,
  raw: [
    {
      file: MIST_FILE,
      url: `https://mist.science/data/tarballs_v1.2/${MIST_FILE}`,
      bytes: 79889196,
      sha256:
        '374ce58c2a0fd4d8bdaadfebbcdcb8568bcedb139e3dede595d00f3cbd37d404',
    },
  ],
  columns: [
    {
      id: 'feh',
      name: '[Fe/H]',
      unit: 'dex',
      step: 0.01,
      description: "the isochrone's initial iron abundance",
    },
    {
      id: 'logAge',
      name: 'log age',
      unit: 'dex',
      step: 0.001,
      description: 'log10 of its age in years',
    },
    {
      id: 'phase',
      name: 'phase',
      unit: '',
      step: 1,
      description:
        "MIST's phase: 0 main sequence, 2 subgiant and red-giant branches, 3 core helium burning",
    },
    {
      id: 'mass',
      name: 'initial mass',
      unit: 'Msun',
      step: 0.0001,
      description: "the star's initial mass, in solar masses",
    },
    {
      id: 'g',
      name: 'g',
      unit: 'mag',
      step: 0.001,
      description: 'absolute SDSS g magnitude (AB), with no extinction',
    },
    {
      id: 'r',
      name: 'r',
      unit: 'mag',
      step: 0.001,
      description: 'absolute SDSS r magnitude (AB), with no extinction',
    },
    {
      id: 'logTeff',
      name: 'log Teff',
      unit: 'dex',
      step: 0.0001,
      description: 'log10 of the effective temperature in K',
    },
    {
      id: 'logL',
      name: 'log L',
      unit: 'dex',
      step: 0.0001,
      description: 'log10 of the luminosity in solar luminosities',
    },
  ],

  build(raw) {
    const stem = MIST_FILE.replace('.txz', '');
    const rows = [];
    const kept = {};
    for (const feh of ISO_FEH) {
      const member = `${stem}/MIST_v1.2_feh_${feh}_afe_p0.0_vvcrit0.0_SDSSugriz.iso.cmd`;
      const text = execFileSync('tar', ['-xJO', '-f', '-', member], {
        input: Buffer.from(raw[0]),
        maxBuffer: 1 << 27,
      }).toString('utf8');
      const all = readIsoCmd(text);
      for (const age of ISO_AGES) {
        const iso = all.filter(
          r =>
            Math.abs(r.log10_isochrone_age_yr - age) < 1e-6 &&
            ISO_PHASES.has(r.phase) &&
            r.SDSS_g < ISO_FAINTEST
        );
        if (!iso.length) throw new Error(`no isochrone at ${feh} ${age}`);
        // Thinned phase by phase, so a jump between phases is never a line.
        for (const phase of ISO_PHASES) {
          const part = iso.filter(r => r.phase === phase);
          if (part.length < 2) continue;
          const idx = thin(
            part.map(r => r.SDSS_g - r.SDSS_r),
            part.map(r => r.SDSS_g),
            ISO_TOLERANCE
          );
          for (const i of idx) {
            const r = part[i];
            rows.push({
              feh: r['[Fe/H]_init'],
              logAge: age,
              phase,
              mass: r.initial_mass,
              g: r.SDSS_g,
              r: r.SDSS_r,
              logTeff: r.log_Teff,
              logL: r.log_L,
            });
          }
          kept[`${feh} ${age} ${phase}`] = `${idx.length} of ${part.length}`;
        }
      }
    }
    const { series, record } = encodeTable(rows, this.columns);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'MIST v1.2 isochrones in the SDSS bands (a model)',
      object: {
        name: 'MIST isochrones',
        identifiers: [stem],
        frame: 'absolute magnitudes',
      },
      facility: {
        observatory: 'MIST (MESA Isochrones and Stellar Tracks)',
        instrument: 'MESA r7503, non-rotating (v/vcrit = 0), [a/Fe] = 0',
        pipeline: 'MIST v1.2 synthetic photometry, SDSS ugriz (AB)',
      },
      dataType: 'model-grid',
      origin: 'model',
      credit:
        'MIST v1.2 (Dotter 2016; Choi et al. 2016), built on MESA (Paxton et al. 2011, 2013, 2015)',
      license: {
        status: 'no-license-stated',
        statement:
          'MIST asks that Dotter 2016, Choi et al. 2016 and the MESA instrument papers be cited by any publication using the models, and states no separate redistribution license.',
        basis:
          'A heavily reduced derived subset for teaching, attributed in full, with the exact source and checksum recorded so the originals can be recovered, as for the MIST tracks Gravitas already ships (NOTICE).',
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        `Three metallicities ([Fe/H] = ${ISO_FEH.map(f => f.replace('m', '-').replace('p', '+')).join(', ')}) and seven ages (log age ${ISO_AGES[0]} to ${ISO_AGES.at(-1)}, 1 to 4 Gyr) of MIST's 15 and 107.`,
        `Only the main sequence, the subgiant and red-giant branches and core helium burning, and only stars brighter than absolute g = ${ISO_FAINTEST}.`,
        `Each phase of each isochrone thinned (Ramer-Douglas-Peucker) to within ${ISO_TOLERANCE} mag of MIST's in g and g - r.`,
        'Absolute magnitudes with no extinction: a comparison with a cluster adds its distance modulus and its extinction.',
      ],
    };
    const manifestRest = {
      source: {
        archive: 'MIST, mist.science',
        urls: this.raw.map(r => r.url),
        citations: [
          {
            text: 'Dotter 2016, ApJS 222, 8 (MIST 0)',
            doi: '10.3847/0067-0049/222/1/8',
          },
          {
            text: 'Choi et al. 2016, ApJ 823, 102 (MIST I)',
            doi: '10.3847/0004-637X/823/2/102',
          },
          {
            text: 'Paxton et al. 2011, ApJS 192, 3 (MESA)',
            doi: '10.1088/0067-0049/192/1/3',
          },
          {
            text: 'Paxton et al. 2013, ApJS 208, 4 (MESA)',
            doi: '10.1088/0067-0049/208/1/4',
          },
          {
            text: 'Paxton et al. 2015, ApJS 220, 15 (MESA)',
            doi: '10.1088/0067-0049/220/1/15',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/ngc2420.mjs',
        version: TABLE_VERSION,
        options: {
          feh: ISO_FEH,
          ages: ISO_AGES,
          phases: [...ISO_PHASES],
          faintest: ISO_FAINTEST,
          tolerance: ISO_TOLERANCE,
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          `Read the ${ISO_FEH.length} metallicities' .iso.cmd files from the MIST tarball.`,
          'Keep the chosen ages, and the rows of the main-sequence, giant-branch and core-helium-burning phases brighter than the faintest kept.',
          'Thin each phase of each isochrone in the (g - r, g) plane to the tolerance.',
          `Encode as ${ENCODING}.`,
        ],
        record: { rows: rows.length, kept, columns: record },
      },
      assumptions: [
        'A model, not an observation: MIST at scaled-solar abundances, without rotation, binaries or extinction. A cluster compared with it is compared with these assumptions too.',
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /**
   * The check: along the solar-metallicity main sequence at log age 9.6, a
   * star of one solar mass - interpolated in mass between the points kept -
   * is within 0.1 dex of the Sun's luminosity and 0.01 dex of its
   * temperature. MIST is calibrated to the Sun, so a mistake in reading or
   * thinning the columns would break it.
   */
  validate(table) {
    const col = id => table.columns.find(c => c.id === id).values;
    const [feh, age, phase, mass, logL, logTeff] = [
      'feh',
      'logAge',
      'phase',
      'mass',
      'logL',
      'logTeff',
    ].map(col);
    const ms = [];
    for (let i = 0; i < table.n; i++)
      if (
        Math.abs(feh[i]) < 0.005 &&
        Math.abs(age[i] - 9.6) < 1e-6 &&
        phase[i] === 0
      )
        ms.push(i);
    ms.sort((a, b) => mass[a] - mass[b]);
    const k = ms.findIndex(i => mass[i] >= 1);
    const [a, b] = [ms[k - 1], ms[k]];
    const f = (1 - mass[a]) / (mass[b] - mass[a]);
    const at = v => v[a] + f * (v[b] - v[a]);
    const L = at(logL);
    const T = at(logTeff);
    return {
      check:
        "on the solar-metallicity main sequence at log age 9.6, a 1 Msun star (interpolated in mass) is within 0.1 dex of log L = 0 and 0.01 dex of the Sun's log Teff",
      against: [
        {
          quantity: 'solar Teff',
          value: 5772,
          unit: 'K',
          ref: 'IAU 2015 Resolution B3 (Prsa et al. 2016)',
        },
      ],
      result: { logL: Number(L.toFixed(4)), logTeff: Number(T.toFixed(4)) },
      ok: Math.abs(L) < 0.1 && Math.abs(T - Math.log10(5772)) < 0.01,
    };
  },
};
