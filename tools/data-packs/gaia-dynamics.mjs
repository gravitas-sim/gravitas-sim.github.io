// =============================================================================
// Galactic dynamics: three table packs (Roadmap II Prompt 92)
// -----------------------------------------------------------------------------
//   gaia-dr3-solar-neighbourhood   1,570 Gaia DR3 stars with radial velocities
//                                  within 1 kpc: the Sun's motion, the Oort
//                                  constants
//   gaia-dr3-ngc2420               Gaia DR3 astrometry of the NGC 2420 field
//                                  (the field of the SDSS photometry pack)
//   milky-way-rotation-curve       the Milky Way's circular-speed curve,
//                                  Bhattacharjee, Chaudhury and Kundu 2014
//
// Each is a table (js/tableObservation.js), opened by the Observatory and by the
// galactic lessons' instruments; none is a capability package. The Gaia packs
// are CC BY-NC 3.0 IGO (ESA's Gaia data licence), one pack per sample so that
// removing the data is removing the files (DECISION_REGISTER.md D-GAIA-01); the
// rotation curve is a published table from a journal and is not Gaia data.
//
// The Gaia samples are fixed by the queries below. They select on Gaia's own
// random_index, a column made for taking a reproducible random subset, so the
// same query returns the same rows from the same release; each answer is pinned
// by its SHA-256.
// =============================================================================

import { URLSearchParams } from 'node:url';

import {
  ENCODING,
  TABLE_VERSION,
  encodeTable,
  readCsv,
} from './table-columns.mjs';
import {
  fitMembership,
  icrsToGalactic,
  solarMotion,
  spaceVelocities,
} from '../../js/kernels/galactic/index.js';

const TAP = 'https://gea.esac.esa.int/tap-server/tap/sync';
const tapUrl = query =>
  `${TAP}?${new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query })}`;
const VIZ = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync';
const vizUrl = query =>
  `${VIZ}?${new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query })}`;

const NGC2420_CENTER = { ra: 114.602, dec: 21.575 };
const CONE = `1=CONTAINS(POINT('ICRS',ra,dec),CIRCLE('ICRS',${NGC2420_CENTER.ra},${NGC2420_CENTER.dec},0.2357023))`;
const SOLAR_COLS =
  'ra, dec, parallax, parallax_error, pmra, pmra_error, pmdec, pmdec_error, radial_velocity, radial_velocity_error, phot_g_mean_mag, bp_rp';
const SOLAR_WHERE =
  'ruwe<1.4 AND radial_velocity IS NOT NULL AND parallax_over_error>10';
export const QUERIES = {
  solar: `SELECT ${SOLAR_COLS} FROM gaiadr3.gaia_source WHERE ${SOLAR_WHERE} AND ((parallax>10 AND random_index<7000000) OR (parallax>1 AND parallax<=10 AND random_index<200000)) ORDER BY source_id`,
  solarNear: `SELECT COUNT(*) AS n FROM gaiadr3.gaia_source WHERE ${SOLAR_WHERE} AND parallax>10`,
  solarFar: `SELECT COUNT(*) AS n FROM gaiadr3.gaia_source WHERE ${SOLAR_WHERE} AND parallax>1 AND parallax<=10`,
  cluster: `SELECT ra, dec, parallax, parallax_error, pmra, pmra_error, pmdec, pmdec_error, phot_g_mean_mag, bp_rp FROM gaiadr3.gaia_source WHERE ruwe<1.4 AND phot_g_mean_mag<17.5 AND parallax IS NOT NULL AND pmra IS NOT NULL AND ${CONE} ORDER BY source_id`,
  clusterCone: `SELECT COUNT(*) AS n FROM gaiadr3.gaia_source WHERE phot_g_mean_mag<17.5 AND ${CONE}`,
  clusterRuwe: `SELECT COUNT(*) AS n FROM gaiadr3.gaia_source WHERE ruwe<1.4 AND phot_g_mean_mag<17.5 AND ${CONE}`,
  rotation: 'SELECT R0,V0,r,Vc,e_Vc FROM "J/ApJ/785/63/table2" ORDER BY recno',
};

const RETRIEVED = '2026-10-10';
const LICENSE_URL = 'https://www.cosmos.esa.int/web/gaia-users/license';
const GAIA_LICENSE = {
  status: 'cc-by-nc-3.0-igo',
  statement: `ESA's Gaia data licence page (${LICENSE_URL}, read ${RETRIEVED}) says: "Gaia data are distributed under the CC BY-NC 3.0 IGO license." and refers to ESA's Terms and Conditions for the use of data in the ESA space science archives for commercial use. This pack is a compact subset of Gaia DR3, offered under CC BY-NC 3.0 IGO: attribute ESA/Gaia/DPAC and the Gaia DR3 papers, do not use it commercially, and say that it is a selected and rounded subset of the archive (the selection is the query in the manifest and each column's rounding is stated).`,
  basis:
    'CC BY-NC 3.0 IGO permits copying, redistribution and adaptation, which includes a derived subset of the catalogue, with attribution and for non-commercial purposes; Gravitas is a free educational tool. It is the same licence, and so the same mechanism, as radiation-gaia-bandpasses (D-RAD-01), which the project owner shipped by explicit instruction; extending it to these Gaia samples is a delegated decision awaiting his review (DECISION_REGISTER.md D-GAIA-01), not a standing licence. Each sample is a pack of its own so that no other data is covered by the NC terms, and none may be bundled into a commercial redistribution of Gravitas (DATA_PACKS.md); removing the pack is removing its module, manifest and service-worker entry.',
  nonCommercial: true,
};
const GAIA_CITATIONS = [
  {
    text: 'Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1 (Gaia Data Release 3: summary of the content and survey properties)',
    doi: '10.1051/0004-6361/202243940',
  },
  {
    text: 'Gaia Collaboration, Prusti et al. 2016, A&A 595, A1 (The Gaia mission)',
    doi: '10.1051/0004-6361/201629272',
  },
  {
    text: 'Katz et al. 2023, A&A 674, A5 (Gaia DR3: properties and validation of the radial velocities)',
    doi: '10.1051/0004-6361/202244220',
  },
  {
    text: 'Lindegren et al. 2021, A&A 649, A2 (Gaia EDR3: astrometric solution; the RUWE statistic and the parallax zero-point)',
    doi: '10.1051/0004-6361/202039709',
  },
];
const GAIA_CREDIT =
  'ESA/Gaia/DPAC; Gaia Collaboration (Vallenari et al. 2023, A&A 674, A1). This work has made use of data from the European Space Agency (ESA) mission Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and Analysis Consortium (DPAC). NON-COMMERCIAL: CC BY-NC 3.0 IGO.';
const GAIA_FACILITY = {
  observatory: 'ESA Gaia',
  instrument:
    'Gaia astrometric, photometric and radial-velocity spectrometer instruments',
  pipeline:
    'Gaia DR3 (gaiadr3.gaia_source), via the ESA Gaia archive TAP service',
};
/** A pack's columns as its manifest describes them: without the encoder's step. */
const described = columns =>
  columns.map(c =>
    Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'step'))
  );
const col = (id, name, unit, step, description, uncertaintyOf) => ({
  id,
  name,
  unit,
  step,
  ...(uncertaintyOf ? { uncertaintyOf } : {}),
  description,
});
const rows = (raw, map) => readCsv(raw).map(map);
const pinned = (file, url, sha256) => ({ file, url, sha256 });

/** The published values the Sun's-motion check compares with. */
export const SCHONRICH2010 = {
  U: 11.1,
  W: 7.25,
  ref: 'Schonrich, Binney & Dehnen 2010, MNRAS 403, 1829',
};

// --- The solar neighbourhood -------------------------------------------------------

export const GAIA_SOLAR = {
  id: 'gaia-dr3-solar-neighbourhood',
  manifest: 'data-packs/gaia-dr3-solar-neighbourhood.json',
  capability: null,
  module: 'js/data/observations/gaiaSolarNeighbourhood.js',
  exportName: 'gaiaSolarNeighbourhood',
  transformVersion: TABLE_VERSION,
  table: true,
  raw: [
    {
      ...pinned(
        'gaia-dr3-solar-neighbourhood.csv',
        tapUrl(QUERIES.solar),
        '7b324e0a01f7928537a9d71be5b0bbc6eaaa44dc4b32ee1e3b7dd3a3e2127a35'
      ),
      bytes: 266354,
    },
    {
      ...pinned(
        'gaia-dr3-solar-near-pool.csv',
        tapUrl(QUERIES.solarNear),
        '56830b003675e9a7b84c45faaeb1469d94bf0a6c9174cad0d394ac03b0b46c70'
      ),
      bytes: 9,
    },
    {
      ...pinned(
        'gaia-dr3-solar-far-pool.csv',
        tapUrl(QUERIES.solarFar),
        '8a7d02161d531f2fdbef9fdb9cafdf8b6dc7846e2d7dea900926d02536a93ce6'
      ),
      bytes: 10,
    },
  ],
  columns: [
    col('ra', 'ra', 'deg', 0.006, 'right ascension, ICRS, epoch J2016.0'),
    col('dec', 'dec', 'deg', 0.004, 'declination, ICRS, epoch J2016.0'),
    col(
      'parallax',
      'parallax',
      'mas',
      0.02,
      'parallax (parallax), not corrected for the zero point'
    ),
    col(
      'parallax_err',
      'parallax error',
      'mas',
      0.001,
      'its one-sigma error (parallax_error)',
      'parallax'
    ),
    col(
      'pmra',
      'pm ra',
      'mas/yr',
      0.01,
      'proper motion in right ascension times cos(dec), mu_alpha* (pmra)'
    ),
    col(
      'pmra_err',
      'pm ra error',
      'mas/yr',
      0.001,
      'its one-sigma error (pmra_error)',
      'pm ra'
    ),
    col(
      'pmdec',
      'pm dec',
      'mas/yr',
      0.01,
      'proper motion in declination (pmdec)'
    ),
    col(
      'pmdec_err',
      'pm dec error',
      'mas/yr',
      0.001,
      'its one-sigma error (pmdec_error)',
      'pm dec'
    ),
    col(
      'rv',
      'radial velocity',
      'km/s',
      0.02,
      'heliocentric radial velocity from the Gaia spectrometer (radial_velocity)'
    ),
    col(
      'rv_err',
      'radial velocity error',
      'km/s',
      0.01,
      'its one-sigma error (radial_velocity_error)',
      'radial velocity'
    ),
    col('g', 'G', 'mag', 0.001, 'Gaia G magnitude (phot_g_mean_mag)'),
    col(
      'bp_rp',
      'BP-RP',
      'mag',
      0.001,
      'Gaia BP minus RP colour (bp_rp), not corrected for extinction'
    ),
  ],

  build(raw) {
    const table = rows(raw[0], r => ({
      ra: r.ra,
      dec: r.dec,
      parallax: r.parallax,
      parallax_err: r.parallax_error,
      pmra: r.pmra,
      pmra_err: r.pmra_error,
      pmdec: r.pmdec,
      pmdec_err: r.pmdec_error,
      rv: r.radial_velocity,
      rv_err: r.radial_velocity_error,
      g: r.phot_g_mean_mag,
      bp_rp: r.bp_rp === '' ? null : r.bp_rp,
    }));
    const near = readCsv(raw[1])[0].n;
    const far = readCsv(raw[2])[0].n;
    const { series, record } = encodeTable(table, this.columns);
    const nearKept = table.filter(r => r.parallax > 10).length;
    const meta = {
      id: this.id,
      version: '1.0.0',
      title:
        'The solar neighbourhood: 1,570 Gaia DR3 stars with radial velocities',
      object: {
        name: 'the solar neighbourhood (stars within 1 kpc of the Sun)',
        identifiers: ['Gaia DR3 (source ids are left out)'],
        frame: 'ICRS, epoch J2016.0',
      },
      facility: GAIA_FACILITY,
      dataType: 'catalog',
      origin: 'observed',
      credit: GAIA_CREDIT,
      license: GAIA_LICENSE,
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        "The cuts: RUWE below 1.4 (Gaia's flag for a poor astrometric solution), a parallax measured to more than 10 times its error (so that 1/parallax is a distance to 10 percent or better), and a Gaia radial velocity.",
        `Two strata of the stars that pass those cuts, each a random subset chosen by Gaia's own random_index: the nearer ${nearKept} stars (parallax above 10 mas, closer than 100 pc) are about 1 in ${Math.round(near / nearKept)} of the ${near.toLocaleString('en-US')} that pass; the remaining ${table.length - nearKept} (parallax 1 to 10 mas, 100 pc to 1 kpc) are about 1 in ${Math.round(far / (table.length - nearKept)).toLocaleString('en-US')} of the ${far.toLocaleString('en-US')}. The proportions are not the sky's: the near stratum is over-sampled so that the Sun's motion has stars near enough to be measured without the Galaxy's rotation in them.`,
        'Gaia measures radial velocities only for stars brighter than about G_RVS = 14, which favours bright stars; the sample is not volume-complete and its colours are not those of the stellar population.',
        'No parallax zero-point correction is applied (Lindegren et al. 2021 give about -0.017 mas on average: 1.7 percent at 100 pc, 1.7 percent at 1 kpc to the distance).',
        'Positions are rounded to 0.006 degree in right ascension and 0.004 degree in declination (22 and 14 arcsec), parallaxes to 0.02 mas, proper motions to 0.01 mas/yr, radial velocities to 0.02 km/s: good for Galactic coordinates to 0.01 degree and for velocities to under 0.1 km/s, not for a cross-match.',
        "Galactic longitude and latitude are not stored: the galactic kernel computes them from the position, and its transformation is tested against the values Gaia's archive gives.",
        "The Gaia source ids are left out; the query in the pack's manifest returns them.",
      ],
    };
    const manifestRest = {
      source: {
        archive: 'ESA Gaia archive, Gaia DR3',
        urls: this.raw.map(r => r.url),
        queries: [QUERIES.solar, QUERIES.solarNear, QUERIES.solarFar],
        citations: GAIA_CITATIONS,
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/gaia-dynamics.mjs',
        version: TABLE_VERSION,
        options: {
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          'Query Gaia DR3 for stars with RUWE below 1.4, a radial velocity and a parallax measured to better than 10 sigma, taking the random subset random_index < 7,000,000 of those with parallax above 10 mas and random_index < 200,000 of those with parallax 1 to 10 mas, ordered by source id.',
          'Count, in two further queries, every star passing the cuts in each stratum, for the sampling fractions.',
          `Encode as ${ENCODING}: each column a whole number of its step from an offset, int16 where the range fits.`,
        ],
        record: { rows: table.length, columns: record },
      },
      assumptions: [
        'Distance is 1/parallax with no zero-point correction and no prior; at parallax over error above 10 that is accurate to 10 percent or better, and the bias from the omitted correction is stated above.',
        "The Sun is at the origin; velocities are heliocentric until a student subtracts the Sun's motion.",
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /**
   * The check: the kernel, run on the stars within 100 pc, finds the Sun's U
   * and W within 3 km/s of Schonrich, Binney and Dehnen 2010 (V depends on how
   * far the sample lags the rotation, so it is not compared here).
   */
  validate(table) {
    const c = id => table.columns.find(x => x.id === id).values;
    const [ra, dec, parallax, pmRa, pmDec, rv] = [
      'ra',
      'dec',
      'parallax',
      'pmra',
      'pmdec',
      'rv',
    ].map(c);
    const stars = [];
    for (let i = 0; i < table.n; i++)
      stars.push({
        ra: ra[i],
        dec: dec[i],
        parallax: parallax[i],
        pmRa: pmRa[i],
        pmDec: pmDec[i],
        rv: rv[i],
      });
    const m = solarMotion(spaceVelocities(stars, { maxDistance: 0.1 }));
    return {
      check:
        "the kernel's solar motion from the stars within 100 pc has U and W within 3 km/s of Schonrich, Binney and Dehnen 2010",
      against: [
        {
          quantity: 'U',
          value: SCHONRICH2010.U,
          unit: 'km/s',
          ref: SCHONRICH2010.ref,
        },
        {
          quantity: 'W',
          value: SCHONRICH2010.W,
          unit: 'km/s',
          ref: SCHONRICH2010.ref,
        },
      ],
      result: {
        U: Number(m.U.toFixed(2)),
        W: Number(m.W.toFixed(2)),
        stars: m.n,
      },
      ok:
        Math.abs(m.U - SCHONRICH2010.U) < 3 &&
        Math.abs(m.W - SCHONRICH2010.W) < 3,
    };
  },
};

// --- NGC 2420 ---------------------------------------------------------------------

/** What the literature gives for the cluster, from Cantat-Gaudin et al. 2018 (Gaia DR2). */
export const NGC2420_GAIA = {
  pmra: { value: -1.2, unit: 'mas/yr' },
  pmdec: { value: -2.1, unit: 'mas/yr' },
  parallax: { value: 0.3, unit: 'mas' },
  ref: 'Cantat-Gaudin et al. 2018, A&A 618, A93 (Gaia DR2), approximate values',
};

export const GAIA_NGC2420 = {
  id: 'gaia-dr3-ngc2420',
  manifest: 'data-packs/gaia-dr3-ngc2420.json',
  capability: null,
  module: 'js/data/observations/gaiaNgc2420.js',
  exportName: 'gaiaNgc2420',
  transformVersion: TABLE_VERSION,
  table: true,
  raw: [
    {
      ...pinned(
        'gaia-dr3-ngc2420.csv',
        tapUrl(QUERIES.cluster),
        '62e9aa5b9d9d755c02a2c6a2a83a3f128d748bceb43d31d9199f842e0945f39c'
      ),
      bytes: 149370,
    },
    {
      ...pinned(
        'gaia-dr3-ngc2420-cone.csv',
        tapUrl(QUERIES.clusterCone),
        '9b09a72bf27d22eb1fe30e506b14725ff6fe462622b3cbf97b1b00fa14e0887d'
      ),
      bytes: 7,
    },
    {
      ...pinned(
        'gaia-dr3-ngc2420-ruwe.csv',
        tapUrl(QUERIES.clusterRuwe),
        'f31ce53b9574258526873e217b4169e9aee48e9ae98467917df4c0bf164ebd25'
      ),
      bytes: 6,
    },
  ],
  columns: [
    col('ra', 'ra', 'deg', 1e-5, 'right ascension, ICRS, epoch J2016.0'),
    col('dec', 'dec', 'deg', 1e-5, 'declination, ICRS, epoch J2016.0'),
    col(
      'parallax',
      'parallax',
      'mas',
      0.001,
      'parallax, not corrected for the zero point'
    ),
    col(
      'parallax_err',
      'parallax error',
      'mas',
      0.001,
      'its one-sigma error',
      'parallax'
    ),
    col(
      'pmra',
      'pm ra',
      'mas/yr',
      0.001,
      'proper motion in right ascension times cos(dec), mu_alpha*'
    ),
    col(
      'pmra_err',
      'pm ra error',
      'mas/yr',
      0.001,
      'its one-sigma error',
      'pm ra'
    ),
    col('pmdec', 'pm dec', 'mas/yr', 0.001, 'proper motion in declination'),
    col(
      'pmdec_err',
      'pm dec error',
      'mas/yr',
      0.001,
      'its one-sigma error',
      'pm dec'
    ),
    col('g', 'G', 'mag', 0.001, 'Gaia G magnitude'),
    col(
      'bp_rp',
      'BP-RP',
      'mag',
      0.001,
      'Gaia BP minus RP colour, not corrected for extinction'
    ),
  ],

  build(raw) {
    const table = rows(raw[0], r => ({
      ra: r.ra,
      dec: r.dec,
      parallax: r.parallax,
      parallax_err: r.parallax_error,
      pmra: r.pmra,
      pmra_err: r.pmra_error,
      pmdec: r.pmdec,
      pmdec_err: r.pmdec_error,
      g: r.phot_g_mean_mag,
      bp_rp: r.bp_rp === '' ? null : r.bp_rp,
    }));
    const cone = readCsv(raw[1])[0].n;
    const ruweOk = readCsv(raw[2])[0].n;
    if (ruweOk !== table.length)
      throw new Error(
        `the count says ${ruweOk} stars and the table holds ${table.length}`
      );
    const { series, record } = encodeTable(table, this.columns);
    const meta = {
      id: this.id,
      version: '1.0.0',
      title: 'NGC 2420: Gaia DR3 astrometry',
      object: {
        name: 'NGC 2420',
        identifiers: ['NGC 2420'],
        ra: NGC2420_CENTER.ra,
        dec: NGC2420_CENTER.dec,
        frame: 'ICRS, epoch J2016.0',
      },
      facility: GAIA_FACILITY,
      dataType: 'catalog',
      origin: 'observed',
      credit: GAIA_CREDIT,
      license: GAIA_LICENSE,
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [
        {
          column: 'ruwe',
          rule: 'a star with RUWE of 1.4 or more, whose astrometric solution Gaia flags as poor, is dropped',
          dropped: cone - ruweOk,
        },
      ],
      reductions: [
        `Every star within 14.14 arcmin of the same adopted center as the SDSS photometry pack (RA ${NGC2420_CENTER.ra}, Dec +${NGC2420_CENTER.dec}): ${cone} stars brighter than G = 17.5, of which ${ruweOk} have RUWE below 1.4 and are kept. The circle is the SDSS pack's, so the two tables can be set side by side.`,
        "Stars fainter than G = 17.5 are left out: their proper-motion errors approach the cluster's own spread.",
        "Gaia is not blind in the cluster's core, as SDSS is: its crowding limit is far higher, so the core is in this table.",
        'Positions are rounded to 0.00001 degree (0.04 arcsec), parallaxes, proper motions, errors and magnitudes to 0.001.',
        "The Gaia source ids are left out; the query in the pack's manifest returns them.",
      ],
    };
    const manifestRest = {
      source: {
        archive: 'ESA Gaia archive, Gaia DR3',
        urls: this.raw.map(r => r.url),
        queries: [QUERIES.cluster, QUERIES.clusterCone, QUERIES.clusterRuwe],
        citations: GAIA_CITATIONS,
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/gaia-dynamics.mjs',
        version: TABLE_VERSION,
        options: {
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          'Query Gaia DR3 for every star within 0.2357023 degree of the adopted center with RUWE below 1.4, G below 17.5 and a five-parameter astrometric solution, ordered by source id.',
          'Count, in two further queries, the stars in the same circle with and without the RUWE cut, for the mask.',
          `Encode as ${ENCODING}: each column a whole number of its step from an offset, int16 where the range fits.`,
        ],
        record: { rows: table.length, columns: record },
      },
      assumptions: [
        "Parallaxes are not corrected for the zero point (about -0.017 mas on average, Lindegren et al. 2021); at the cluster's 0.3 mas that is a 6 percent effect on its distance, which a lesson that quotes a distance says.",
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /**
   * The check: the cluster is there. A two-component mixture over proper
   * motion and parallax finds a cluster whose mean proper motion is within
   * 0.3 mas/yr and whose parallax is within 0.15 mas of the literature's, with
   * at least 100 members of probability above one half.
   */
  validate(table) {
    const c = id => table.columns.find(x => x.id === id).values;
    const [pmra, pmdec, plx, e1, e2, e3] = [
      'pmra',
      'pmdec',
      'parallax',
      'pmra_err',
      'pmdec_err',
      'parallax_err',
    ].map(c);
    const stars = [];
    for (let i = 0; i < table.n; i++)
      stars.push({ x: [pmra[i], pmdec[i], plx[i]], e: [e1[i], e2[i], e3[i]] });
    const fit = fitMembership(stars, {
      cluster: [-1, -2, 0.3],
      clusterSigma: [0.3, 0.3, 0.05],
      field: [0, -1, 1],
      fieldSigma: [3, 3, 1],
      fraction: 0.3,
    });
    const members = fit.p.filter(p => p > 0.5).length;
    const [mx, my, mp] = fit.cluster.mean;
    return {
      check:
        "a proper-motion and parallax mixture finds a cluster of at least 100 members within 0.3 mas/yr and 0.15 mas of the literature's values",
      against: [
        { quantity: 'pm ra', ...NGC2420_GAIA.pmra, ref: NGC2420_GAIA.ref },
        { quantity: 'pm dec', ...NGC2420_GAIA.pmdec, ref: NGC2420_GAIA.ref },
        {
          quantity: 'parallax',
          ...NGC2420_GAIA.parallax,
          ref: NGC2420_GAIA.ref,
        },
      ],
      result: {
        pmra: Number(mx.toFixed(3)),
        pmdec: Number(my.toFixed(3)),
        parallax: Number(mp.toFixed(3)),
        members,
        converged: fit.converged,
      },
      ok:
        fit.converged &&
        members >= 100 &&
        Math.abs(mx - NGC2420_GAIA.pmra.value) < 0.3 &&
        Math.abs(my - NGC2420_GAIA.pmdec.value) < 0.3 &&
        Math.abs(mp - NGC2420_GAIA.parallax.value) < 0.15,
    };
  },
};

// --- The Milky Way's rotation curve ------------------------------------------------

/** The sources of the tracer samples Bhattacharjee et al. 2014 combined, by region. */
export const ROTATION_SAMPLES = {
  disk: [
    'HI regions, tangent points: Westerhout 1976 (Maryland-Bonn survey); Burton & Gordon 1978, A&A 63, 7',
    'CO clouds, tangent points: Burton & Gordon 1978, A&A 63, 7; Clemens 1985, ApJ 295, 422',
    'HI regions, tangent points: Fich, Blitz & Stark 1989, ApJ 342, 272',
    'HII regions: Fich, Blitz & Stark 1989, ApJ 342, 272',
    'HII regions and reflection nebulae: Brand & Blitz 1993, A&A 275, 67',
    'Cepheids: Pont, Mayor & Burki 1994, A&A 285, 415',
    'Planetary nebulae: Maciel & Lago 2005, RMxAA 41, 383; Maciel 1984, A&AS 55, 253; Durand, Acker & Zijlstra 1998, A&AS 132, 13',
  ],
  halo: [
    'Blue horizontal-branch stars, SDSS DR8: Xue et al. 2011, ApJ 738, 79',
    'K giants, SDSS DR9: Xue et al. 2012 (arXiv:1211.0549)',
    'Globular clusters (Harris 1996, 2010), field blue horizontal-branch stars (Clewley et al. 2004) and dwarf spheroidals (McConnachie 2012)',
  ],
};
/** The boundary the paper draws between its disk and non-disk tracers. */
export const DISK_EDGE_KPC = 25;

export const MILKY_WAY_ROTATION = {
  id: 'milky-way-rotation-curve',
  manifest: 'data-packs/milky-way-rotation-curve.json',
  capability: null,
  module: 'js/data/observations/milkyWayRotationCurve.js',
  exportName: 'milkyWayRotationCurve',
  transformVersion: TABLE_VERSION,
  table: true,
  raw: [
    {
      ...pinned(
        'bhattacharjee-2014-table2.csv',
        vizUrl(QUERIES.rotation),
        '87570b536286827645d6649c569cbef37afba367ca6eab30f02028f1779a2e0b'
      ),
      bytes: 3979,
    },
  ],
  columns: [
    col(
      'r0',
      'Sun distance assumed',
      'kpc',
      0.1,
      "the Sun's distance from the Galactic center the curve was computed with (R0)"
    ),
    col(
      'v0',
      'Sun speed assumed',
      'km/s',
      1,
      "the Sun's circular speed the curve was computed with (V0)"
    ),
    col(
      'r',
      'galactocentric radius',
      'kpc',
      0.01,
      'distance from the Galactic center (r)'
    ),
    col(
      'vc',
      'circular speed',
      'km/s',
      0.01,
      'circular speed (Vc), for the R0 and V0 of its row'
    ),
    col(
      'vc_err',
      'circular speed error',
      'km/s',
      0.01,
      'its one-sigma error (e_Vc)',
      'circular speed'
    ),
    col(
      'region',
      'region',
      '',
      1,
      'which tracers the point combines: 1 disk tracers (r below 25 kpc), 2 halo tracers (r of 25 kpc or more)'
    ),
  ],

  build(raw) {
    const table = rows(raw[0], r => ({
      r0: r.R0,
      v0: r.V0,
      r: r.r,
      vc: r.Vc,
      vc_err: r.e_Vc,
      region: r.r < DISK_EDGE_KPC ? 1 : 2,
    }));
    const { series, record } = encodeTable(table, this.columns);
    const disk = table.filter(r => r.region === 1).length;
    const meta = {
      id: this.id,
      version: '1.0.0',
      title:
        "The Milky Way's rotation curve (Bhattacharjee, Chaudhury and Kundu 2014)",
      object: {
        name: 'the Milky Way',
        identifiers: ['the Galaxy'],
        frame: 'Galactocentric, for three assumed pairs of R0 and V0',
      },
      facility: {
        observatory: 'compilation of published tracer surveys',
        pipeline:
          'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, Table 2 (CDS J/ApJ/785/63)',
      },
      dataType: 'rotation-curve',
      origin: 'compilation',
      credit:
        'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, through CDS VizieR J/ApJ/785/63',
      license: {
        status: 'no-license-stated',
        statement: `The data table of a published paper (Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63, Table 2) as the CDS distributes it (J/ApJ/785/63/table2, read ${RETRIEVED}). The CDS record and the paper's machine-readable table state no licence; the table is reproduced whole, with the paper cited and credited.`,
        basis:
          "A published scientific data table, reproduced in full with citation and credit as scientific practice and the CDS's own acknowledgement policy expect, for education; the same basis as the other credited tables (D-SKY-02 is the same class of decision). 151 numbers, none of them the authors' code or text.",
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        `All ${table.length} points of the paper's Table 2, unchanged, in its three sets: R0 = 8.3 kpc with V0 = 244 km/s, R0 = 8.0 with V0 = 200 (the Sofue 2012 set) and R0 = 8.5 with V0 = 220 (the IAU 1985 values). ${disk} points have r below ${DISK_EDGE_KPC} kpc and ${table.length - disk} beyond. Radii and speeds are rounded to 0.01.`,
        `The "region" column is the one attribution the paper's table supports. Each disk-region point (r < ${DISK_EDGE_KPC} kpc) is the weighted average, in a radius bin, of the circular speeds from all of the paper's disk tracer samples; each halo-region point is the weighted average of its three non-disk samples in a 2 kpc bin. The table does not say which sample dominates a bin, so a point is cited by region, listing every sample that region combines, and no point is claimed for a single paper beyond that.`,
        "The curve depends on the Sun's distance and circular speed assumed, R0 and V0; the same data give a different curve for another pair (the paper tabulates three). The pack carries the one the CDS holds, and its R0 and V0 are in the title and the frame.",
        "The paper also derives these speeds under an assumption about the halo tracers' velocity anisotropy (beta = 0 for this set), which is a model assumption inside the outer points.",
      ],
    };
    const manifestRest = {
      source: {
        archive:
          'CDS VizieR J/ApJ/785/63 (Bhattacharjee, Chaudhury & Kundu 2014)',
        urls: this.raw.map(r => r.url),
        queries: [QUERIES.rotation],
        citations: [
          {
            text: 'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63 (Rotation curve of the Milky Way out to ~200 kpc)',
            doi: '10.1088/0004-637X/785/1/63',
          },
          {
            text: 'Sofue 2012, PASJ 64, 75 (Grand rotation curve and dark-matter halo in the Milky Way Galaxy), the R0 = 8.0 kpc, V0 = 200 km/s set',
            doi: '10.1093/pasj/64.4.75',
          },
          ...ROTATION_SAMPLES.disk.map(text => ({
            text: `Disk tracers: ${text}`,
          })),
          ...ROTATION_SAMPLES.halo.map(text => ({
            text: `Halo tracers: ${text}`,
          })),
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/gaia-dynamics.mjs',
        version: TABLE_VERSION,
        options: {
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          "Read the CDS table J/ApJ/785/63/table2 (r, Vc, e_Vc) in the paper's order.",
          `Add the region: 1 for r below ${DISK_EDGE_KPC} kpc, else 2, the paper's boundary between disk and non-disk tracers.`,
          `Encode as ${ENCODING}: each column a whole number of its step from an offset, int16 where the range fits.`,
        ],
        record: { rows: table.length, columns: record },
      },
      assumptions: [
        "Each row's own R0 and V0 (three sets of about 50 points), as the table holds them.",
        "The authors' errors are one sigma and are their weighted-average errors, not a spread of independent measurements.",
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return { meta, manifestRest, series };
  },

  /**
   * The check: the curve is the Milky Way's. Within each of the three sets the
   * points are in increasing radius, and between 5 and 15 kpc the speed stays
   * within 25 percent of that set's V0.
   */
  validate(table) {
    const c = id => table.columns.find(x => x.id === id).values;
    const [r, v, v0] = [c('r'), c('vc'), c('v0')];
    let inOrder = true;
    let worst = 0;
    let count = 0;
    for (let i = 0; i < table.n; i++) {
      if (i && v0[i] === v0[i - 1] && !(r[i] > r[i - 1])) inOrder = false;
      if (r[i] >= 5 && r[i] <= 15) {
        worst = Math.max(worst, Math.abs(v[i] / v0[i] - 1));
        count++;
      }
    }
    return {
      check:
        "within each set the points are in increasing radius, and between 5 and 15 kpc the speed stays within 25 percent of that set's V0",
      against: [
        {
          quantity: 'V0',
          value: 200,
          unit: 'km/s',
          ref: 'Bhattacharjee, Chaudhury & Kundu 2014, ApJ 785, 63 (and 244 and 220 for the other two sets)',
        },
      ],
      result: {
        points: table.n,
        between5and15: count,
        worstFraction: Number(worst.toFixed(3)),
        inOrder,
      },
      ok: inOrder && count >= 24 && worst < 0.25,
    };
  },
};

export const GALACTIC_PACKS = [GAIA_SOLAR, GAIA_NGC2420, MILKY_WAY_ROTATION];

// Used by the lessons' tests: the Galactic coordinates of a table row.
export const galacticOf = (ra, dec) => icrsToGalactic(ra, dec);
