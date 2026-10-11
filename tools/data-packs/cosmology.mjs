// =============================================================================
// Cosmology and extragalactic data: four table packs (Roadmap II Prompt 91)
// -----------------------------------------------------------------------------
//   hubble-1929-table1        Hubble 1929, Table 1: 24 nebulae (US public domain)
//   des-sn5yr-hd              the DES five-year supernova Hubble diagram, 1,829 SNe
//                             (CC BY 4.0, Zenodo 10.5281/zenodo.12720778)
//   sdss-dr18-redshift-slice  2,911 galaxies of a 120 to 240 degree RA strip
//                             (SDSS DR18, public domain)
//   coma-cluster-quoted       the four numbers the Coma scenario and its virial
//                             instrument quote, with what is and is not sourced
//
// The verdicts are COSMOLOGY_GATE.md's (A for each); the register rows are
// D-COSMO-01, -02 and -04. Each is a table (js/tableObservation.js) whose rows
// are a sidecar file (cosmology/*.json) the page fetches, so no budget that
// counts JavaScript counts a table. The Cepheid table of the same gate is
// tools/data-packs/variables.mjs's shoes-r22-cepheids (Prompt 96).
//
// Not built, and why (COSMOLOGY_GATE.md): Pantheon+ (no license statement),
// SPARC (none), Faber-Jackson and the Coma dispersion from SDSS (the measured
// numbers miss the published ones, and the bar was not moved).
// =============================================================================

import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath, URLSearchParams } from 'node:url';

import { sha256 } from './pinned.mjs';
import {
  ENCODING,
  TABLE_VERSION,
  encodeTable,
  readCsv,
} from './table-columns.mjs';
import { asSidecar, col, decodeSidecar, described } from './variables.mjs';
import { createCosmology } from '../../js/kernels/cosmology/flrw.js';
import { fitSupernovae } from '../../js/kernels/cosmology/fit.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const HERE = path.join(REPO, 'tools/data-packs/cosmology');
const RETRIEVED = '2026-10-10';
const SCRIPT = 'tools/data-packs/cosmology.mjs';
const text = bytes => Buffer.from(bytes).toString('utf8');
const column = (t, id) => t.columns.find(c => c.id === id).values;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

const base = {
  capability: null,
  transformVersion: TABLE_VERSION,
  table: true,
  script: SCRIPT,
  decode: decodeSidecar,
};
const stem = id => id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const modulePath = id => `js/data/observations/${stem(id)}.js`;
const transformation = (options, steps, record) => ({
  script: SCRIPT,
  version: TABLE_VERSION,
  options,
  steps,
  record,
});

// --- Hubble 1929 -------------------------------------------------------------

const HUBBLE_ID = 'hubble-1929-table1';
const HUBBLE_COLUMNS = [
  col(
    'r',
    'distance',
    'Mpc',
    0.001,
    "the paper's r, in megaparsecs (its unit is 10^6 pc)"
  ),
  col(
    'v',
    'velocity',
    'km/s',
    1,
    "the paper's v, a radial velocity from the nebula's lines, km/s"
  ),
  col('mt', 'total visual magnitude', 'mag', 0.1, "the paper's m_t"),
];

export const HUBBLE_1929 = {
  ...base,
  id: HUBBLE_ID,
  manifest: `data-packs/${HUBBLE_ID}.json`,
  module: modulePath(HUBBLE_ID),
  exportName: stem(HUBBLE_ID),
  namedBy: ['js/cosmologyData.js'],
  sidecar: `cosmology/${HUBBLE_ID}.json`,
  cache: () => HERE,
  refetch: 'git checkout tools/data-packs/cosmology/hubble-1929-table1.tsv',
  raw: [
    {
      file: 'hubble-1929-table1.tsv',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC522427/',
      bytes: 1302,
      sha256:
        '0b1952297bcd2d2b6dba46c4cc9f66e70cb6ed01a5b631c83ffda5a86af81aed',
    },
  ],
  columns: HUBBLE_COLUMNS,
  build(raw) {
    const rows = text(raw[0])
      .split('\n')
      .filter(l => l && !l.startsWith('#'))
      .slice(1)
      .map(l => l.split('\t'))
      .map(f => ({ name: f[0], r: +f[1], v: +f[2], mt: +f[3], Mt: +f[4] }));
    if (rows.length !== 24)
      throw new Error(`${rows.length} rows, not Hubble's 24`);
    // The paper's printed absolute magnitudes, recomputed from m_t and r.
    const diff = rows.map(x => x.mt + 5 - 5 * Math.log10(x.r * 1e6) - x.Mt);
    const worst = Math.max(...diff.map(Math.abs));
    const off = diff.filter(d => Math.abs(d) > 0.051).length;
    if (worst > 0.075)
      throw new Error(
        `a row differs from the printed M_t by ${worst.toFixed(3)} mag: mistyped`
      );
    const { series, record } = encodeTable(rows, this.columns);
    const meta = {
      id: HUBBLE_ID,
      version: '1.0.0',
      title: "Hubble's 1929 distances and velocities of 24 nebulae (Table 1)",
      object: {
        name: 'Twenty-four extra-galactic nebulae',
        identifiers: rows.map(x => x.name),
        frame: 'distances in Mpc (the paper: 10^6 pc), velocities in km/s',
      },
      facility: {
        observatory:
          'Mount Wilson (Hubble) and Lowell (Slipher) velocities, as compiled by the paper',
        pipeline:
          'Hubble 1929, PNAS 15, 168, Table 1, typed from the page image',
      },
      dataType: 'catalog',
      origin: 'compilation',
      credit:
        'Hubble, E. 1929, PNAS 15, 168 (a United States work of 1929, public domain)',
      license: {
        status: 'public-domain',
        statement:
          'Published in the United States in 1929. The US Copyright Office (Circular 15A) says every work published in the United States before 1 January 1931 is in the public domain.',
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        `All 24 rows of Table 1, typed from the page image (PMC522427; pnas01016-0007.png, sha256 cc3f720d...), in the paper's order. The nebulae's names are in object.identifiers, in row order.`,
        `Checked against the paper's own printed absolute-magnitude column: M_t recomputed from m_t and r for every row. ${24 - off} rows agree within rounding; ${off} (NGC 5457, 3031 and 4826) differ by 0.066 to 0.071 mag, which is the paper's arithmetic, not a typing error. The printed mean, -15.5, is reproduced as ${(rows.reduce((s, x) => s + x.mt + 5 - 5 * Math.log10(x.r * 1e6), 0) / 24).toFixed(3)}.`,
        "The paper's m_s column (blank for nine rows) and its printed M_t are not kept. Distances, velocities and magnitudes keep the paper's digits.",
      ],
    };
    const manifestRest = {
      source: {
        archive:
          'Proceedings of the National Academy of Sciences, via PubMed Central (PMC522427)',
        urls: [this.raw[0].url],
        citations: [
          {
            text: 'Hubble, E. 1929, PNAS 15, 168 (A relation between distance and radial velocity among extra-galactic nebulae)',
            doi: '10.1073/pnas.15.3.168',
          },
        ],
      },
      raw: this.raw,
      transformation: transformation(
        { columns: this.columns.map(({ id, step }) => ({ id, step })) },
        [
          'Read the 24 rows typed from Table 1 (name, r, v, m_t, printed M_t).',
          "Recompute M_t = m_t + 5 - 5 log10(r in pc) and refuse a row more than 0.075 mag from the paper's.",
          `Store distance, velocity and m_t as ${ENCODING}.`,
        ],
        {
          rows: rows.length,
          worstPrintedMtDifference: Number(worst.toFixed(3)),
          rowsPastRounding: off,
          columns: record,
        }
      ),
      assumptions: [
        "The distances are Hubble's, which were about seven times too small (the Cepheid scale of 1929 was not yet corrected for Population II stars and dust); the slope they give is not the modern Hubble constant, and the lessons say why.",
        "The paper's solar-motion solution cannot be reproduced: the table carries no positions. A plain straight line is what the pack supports.",
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return asSidecar(this, { meta, manifestRest, series });
  },
  validate(table) {
    const r = column(table, 'r');
    const v = column(table, 'v');
    const n = r.length;
    const mr = mean(r);
    const mv = mean(v);
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (r[i] - mr) ** 2;
      sxy += (r[i] - mr) * (v[i] - mv);
    }
    const slope = sxy / sxx;
    const M = Array.from(
      r,
      (x, i) => column(table, 'mt')[i] + 5 - 5 * Math.log10(x * 1e6)
    );
    return {
      check:
        "a straight line through the 24 nebulae has Hubble's slope (465 +- 50 km/s/Mpc with solar motion) within the two errors, and the mean absolute magnitude is his printed -15.5 within 0.05",
      against: [
        {
          quantity: 'velocity-distance slope',
          value: 465,
          unit: 'km/s/Mpc',
          ref: 'Hubble 1929, PNAS 15, 168 (solar-motion solution)',
        },
        {
          quantity: 'mean absolute magnitude',
          value: -15.5,
          unit: 'mag',
          ref: 'Hubble 1929, PNAS 15, 168 (printed mean)',
        },
      ],
      result: {
        slope: Number(slope.toFixed(2)),
        meanMt: Number(mean(M).toFixed(3)),
        rows: n,
      },
      ok:
        Math.abs(slope - 465) <= Math.hypot(75, 50) &&
        Math.abs(mean(M) + 15.5) <= 0.05,
    };
  },
};

// --- DES-SN5YR ---------------------------------------------------------------

const DES_ID = 'des-sn5yr-hd';
const DES_COLUMNS = [
  col(
    'z',
    'redshift',
    '',
    1e-5,
    'zHD, the redshift corrected to the CMB frame and for peculiar velocity'
  ),
  col(
    'mu',
    'distance modulus',
    'mag',
    1e-4,
    "MU, on the release's scale: H0 = 70 and its fixed absolute magnitude"
  ),
  col(
    'mu_err',
    'distance modulus error',
    'mag',
    1e-4,
    'MUERR_FINAL, statistical, with the intrinsic scatter included',
    'distance modulus'
  ),
  col(
    'des',
    'survey',
    '',
    1,
    '1 for a supernova found by the Dark Energy Survey, 0 for the low-redshift compilation'
  ),
];

export const DES_SN5YR = {
  ...base,
  id: DES_ID,
  manifest: `data-packs/${DES_ID}.json`,
  module: modulePath(DES_ID),
  exportName: stem(DES_ID),
  namedBy: ['js/cosmologyData.js'],
  sidecar: `cosmology/${DES_ID}.json`,
  cache: () => HERE,
  refetch: 'git checkout tools/data-packs/cosmology/DES-SN5YR_HD.csv',
  raw: [
    {
      file: 'DES-SN5YR_HD.csv',
      url: 'https://doi.org/10.5281/zenodo.12720778',
      bytes: 91860,
      sha256:
        '95ab1e9f5460a056de37d2b4e28df73ce0c7fd471baba9fb37f1667f41b7901c',
    },
  ],
  columns: DES_COLUMNS,
  build(raw) {
    const all = readCsv(raw[0]);
    const rows = all
      .map(r => ({
        cid: +r.CID,
        des: r.IDSURVEY === 10 ? 1 : 0,
        z: +r.zHD,
        mu: +r.MU,
        mu_err: +r.MUERR_FINAL,
      }))
      .sort((a, b) => a.z - b.z || a.cid - b.cid);
    if (rows.length !== 1829)
      throw new Error(`${rows.length} supernovae, not 1829`);
    const { series, record } = encodeTable(rows, this.columns);
    const heavy = rows.filter(r => r.mu_err > 1).length;
    const rawZ = mean(all.map(r => +r.zHD));
    const rawMu = mean(all.map(r => +r.MU));
    const meta = {
      id: DES_ID,
      version: '1.0.0',
      title: 'Type Ia supernova Hubble diagram: DES-SN5YR, 1,829 supernovae',
      object: {
        name: 'Type Ia supernovae of the Dark Energy Survey five-year sample and its low-redshift companions',
        identifiers: ['DES-SN5YR'],
        frame:
          'redshift in the CMB frame; distance modulus on the release scale (H0 = 70)',
      },
      facility: {
        observatory:
          'Dark Energy Survey (CTIO) with low-redshift supernovae from other surveys',
        pipeline: 'DES-SN5YR-1.2, 4_DISTANCES_COVMAT/DES-SN5YR_HD.csv',
      },
      dataType: 'catalog',
      origin: 'compilation',
      credit:
        'Sanchez et al. 2024 and DES Collaboration 2024 (the record asks for both), Zenodo 10.5281/zenodo.12720778, CC BY 4.0',
      license: {
        status: 'cc-by-4.0',
        statement:
          "The Zenodo record's metadata gives CC BY 4.0, whose Share clause permits reproducing the material with attribution (read 2026-10-09). Cite Sanchez et al. 2024 (arXiv:2406.05046) and DES Collaboration 2024, ApJL 973, L14.",
        basis:
          'COSMOLOGY_GATE.md section 1: the license as read from the record, kept with its legal code; D-COSMO-02 (delegated).',
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        `All 1,829 rows of DES-SN5YR_HD.csv, sorted by redshift (then identifier). The identifier, the CMB-frame and heliocentric redshifts are not kept; IDSURVEY is reduced to one flag (10 is the Dark Energy Survey).`,
        `Statistical errors only: the published cosmology uses the full systematic covariance matrix (16 MB compressed), which is not shipped, and the statistical covariance in the release is all zeros. A fit to this table is therefore not the published fit.`,
        `The distance moduli are on a scale fixed to H0 = 70 and the survey's absolute magnitude, so H0 is not measured by these supernovae alone: they fix the shape of the curve, not its scale.`,
        `${heavy} of the 1,829 rows have an error above 1 mag (the largest 450): the survey's down-weighted candidates. They are kept, as the release keeps them, and carry almost no weight in a weighted fit.`,
        `Redshift is stored to 1e-5 and the modulus and its error to 1e-4 mag, the raw file's own digits: the mean redshift and mean modulus of the stored table equal the raw file's to better than 1e-12 relative (the manifest records the rounding).`,
      ],
    };
    const manifestRest = {
      source: {
        archive:
          'Zenodo (record 10.5281/zenodo.12720778, DES-SN5YR-1.2.zip, md5 9019a6ddc569553bc323e9e1b68a55bf)',
        urls: [this.raw[0].url],
        citations: [
          {
            text: 'Sanchez et al. 2024 (The Dark Energy Survey Supernova Program: cosmological analysis and systematic uncertainties)',
            url: 'https://arxiv.org/abs/2406.05046',
          },
          {
            text: 'DES Collaboration 2024, ApJL 973, L14 (The Dark Energy Survey: cosmology results with ~1500 new high-redshift type Ia supernovae using the full 5-year dataset)',
            doi: '10.3847/2041-8213/ad6f9f',
          },
          {
            text: 'Zenodo record, DES-SN5YR-1.2 data release',
            doi: '10.5281/zenodo.12720778',
          },
        ],
      },
      raw: this.raw,
      transformation: transformation(
        { columns: this.columns.map(({ id, step }) => ({ id, step })) },
        [
          'Read zHD, MU, MUERR_FINAL and IDSURVEY from DES-SN5YR_HD.csv (the file as the zip holds it).',
          'Sort by zHD, then by identifier.',
          `Store redshift, modulus, error and the survey flag as ${ENCODING}.`,
        ],
        { rows: rows.length, rawMeanZ: rawZ, rawMeanMu: rawMu, columns: record }
      ),
      assumptions: [
        'The errors are statistical and include an intrinsic-scatter term; they are treated as independent Gaussians.',
        'The raw file is committed beside this tool (tools/data-packs/cosmology/DES-SN5YR_HD.csv, 91,860 bytes, CC BY 4.0, from the zip member named in the record): the zip is too large to fetch for a 92 KB table.',
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return asSidecar(this, { meta, manifestRest, series });
  },
  validate(table) {
    const fit = fitSupernovae({
      x: column(table, 'z'),
      y: column(table, 'mu'),
      sigma: column(table, 'mu_err'),
    });
    return {
      check:
        'a flat Lambda-CDM fit with the offset solved gives Omega_m within 0.08 of the published flat value 0.352 +- 0.017 (statistical errors only here, the full covariance there)',
      against: [
        {
          quantity: 'Omega_m, flat Lambda-CDM, supernovae only',
          value: 0.352,
          unit: '',
          ref: 'DES Collaboration 2024, ApJL 973, L14',
        },
      ],
      result: {
        Om: Number(fit.Om.toFixed(3)),
        chi2: Number(fit.chi2.toFixed(1)),
        dof: fit.dof,
        supernovae: table.n,
      },
      ok: Math.abs(fit.Om - 0.352) <= 0.08,
    };
  },
};

// --- The SDSS redshift slice ---------------------------------------------------

const SDSS_ID = 'sdss-dr18-redshift-slice';
const SDSS_QUERY = `SELECT specObjID, ra, dec, z, zErr, petroMag_r
FROM SpecPhoto
WHERE class='GALAXY' AND zWarning=0 AND survey='sdss' AND sciencePrimary=1
  AND petroMag_r<17.77 AND dec BETWEEN 0 AND 2 AND ra BETWEEN 120 AND 240
  AND z BETWEEN 0.01 AND 0.2
ORDER BY specObjID`;
const SDSS_URL = `https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch?${new URLSearchParams({ cmd: SDSS_QUERY, format: 'csv' })}`;
const SLICE = { decMax: 0.5, zMax: 0.12, raRange: [120, 240] };
const SDSS_COLUMNS = [
  col(
    'ra',
    'right ascension',
    'deg',
    1e-4,
    'J2000, rounded to 1e-4 degree (0.36 arcsecond step, 0.18 arcsecond largest rounding)'
  ),
  col(
    'z',
    'redshift',
    '',
    1e-8,
    'the spectroscopic redshift, its eight digits kept'
  ),
];

export const SDSS_SLICE = {
  ...base,
  id: SDSS_ID,
  manifest: `data-packs/${SDSS_ID}.json`,
  module: modulePath(SDSS_ID),
  exportName: stem(SDSS_ID),
  namedBy: ['js/cosmologyData.js'],
  sidecar: `cosmology/${SDSS_ID}.json`,
  raw: [
    {
      file: 'sdss-dr18-redshift-slice-query.csv',
      url: SDSS_URL,
      bytes: 1163562,
      sha256:
        '251920df19f3ed7c22c2f43b8776df08c4df80041e550eb1968f86bd5c558aad',
    },
  ],
  columns: SDSS_COLUMNS,
  build(raw) {
    const all = readCsv(raw[0]);
    const sel = all.filter(
      r => r.dec >= 0 && r.dec < SLICE.decMax && r.z <= SLICE.zMax
    );
    const rows = sel
      .map(r => ({ ra: r.ra, z: r.z }))
      .sort((a, b) => a.ra - b.ra || a.z - b.z);
    if (rows.length !== 2911)
      throw new Error(`${rows.length} galaxies, not 2911`);
    const { series, record } = encodeTable(rows, this.columns);
    const meta = {
      id: SDSS_ID,
      version: '1.0.0',
      title:
        'SDSS DR18 galaxy redshifts in a 120 to 240 degree strip at declination 0 to 0.5 degrees (a wedge)',
      object: {
        name: 'The SDSS Legacy main galaxy sample in a thin equatorial strip',
        identifiers: ['SDSS DR18 SpecPhoto'],
        frame:
          'ICRS, J2000: right ascension 120 to 240 degrees, declination 0 to 0.5 degrees',
      },
      facility: {
        observatory: 'Sloan Digital Sky Survey (Apache Point 2.5 m)',
        pipeline: 'SDSS DR18 SkyServer, SpecPhoto',
      },
      dataType: 'catalog',
      origin: 'observed',
      credit:
        'SDSS-I/II (the Legacy main sample), Data Release 18: Almeida et al. 2023, ApJS 267, 44; Strauss et al. 2002, AJ 124, 1810',
      license: {
        status: 'public-domain',
        statement:
          'SDSS states that all data released in its public data releases are considered public domain (image-use policy, read 2026-10-09); it asks for the acknowledgement of the survey phase and the data release.',
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [
        {
          column: 'class, zWarning, sciencePrimary',
          rule: "class GALAXY, zWarning 0, the survey's primary spectrum",
          dropped: 0,
        },
        {
          column: 'petroMag_r',
          rule: 'r < 17.77, the Legacy main sample limit',
          dropped: 0,
        },
        {
          column: 'z, dec',
          rule: `z up to ${SLICE.zMax}, declination 0 to ${SLICE.decMax} degrees: the first cut of six declared before the run that fits the size ceilings`,
          dropped: all.length - rows.length,
        },
      ],
      reductions: [
        `The strip declination 0 to 0.5 degrees, right ascension 120 to 240 degrees and redshift up to ${SLICE.zMax}: ${rows.length} of the ${all.length} galaxies the query returned, sorted by right ascension.`,
        'Right ascension is rounded to 1e-4 degree (a stated step, largest rounding 0.18 arcsecond); the redshift keeps its eight digits. Declination, magnitudes, errors and identifiers are not kept: the strip is thin, and declination is its limits.',
        'This is a flux-limited sample (r < 17.77, fiber-limited, with fiber collisions): it thins with distance because fainter galaxies fall below the limit. A page that draws it must say so.',
      ],
    };
    const manifestRest = {
      source: {
        archive: 'SDSS Data Release 18, SkyServer SQL search',
        urls: [this.raw[0].url],
        citations: [
          {
            text: 'Almeida et al. 2023, ApJS 267, 44 (The Eighteenth Data Release of the Sloan Digital Sky Surveys)',
            doi: '10.3847/1538-4365/acda98',
          },
          {
            text: 'Strauss et al. 2002, AJ 124, 1810 (Spectroscopic target selection in the SDSS: the main galaxy sample)',
            doi: '10.1086/342343',
          },
        ],
      },
      raw: this.raw,
      transformation: transformation(
        {
          slice: SLICE,
          query: SDSS_QUERY,
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        [
          'Read ra, dec and z from the SkyServer answer to the query in options.query.',
          `Keep dec in [0, ${SLICE.decMax}) and z <= ${SLICE.zMax}.`,
          'Sort by right ascension, then redshift.',
          `Store right ascension and redshift as ${ENCODING}.`,
        ],
        { queryRows: all.length, rows: rows.length, columns: record }
      ),
      assumptions: [
        'The redshift is the survey pipeline\'s (zWarning 0), heliocentric: it includes the galaxy\'s peculiar velocity, which the "fingers of God" in a wedge diagram show.',
        'A wedge needs a distance: the page converts redshift with a stated cosmology (flat, Omega_m 0.3, H0 70 in the lessons).',
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return asSidecar(this, { meta, manifestRest, series });
  },
  validate(table) {
    const ra = column(table, 'ra');
    const z = column(table, 'z');
    const cos = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    const shells = [];
    for (let r0 = 100; r0 < 400; r0 += 25) {
      const counts = new Array(24).fill(0);
      for (let i = 0; i < table.n; i++) {
        const r = cos.comovingDistance(z[i]);
        if (r >= r0 && r < r0 + 25) {
          const k = Math.floor((ra[i] - 180 + 60) / 5);
          if (k >= 0 && k < 24) counts[k]++;
        }
      }
      const m = mean(counts);
      if (m > 0)
        shells.push(
          counts.reduce((s, c) => s + (c - m) ** 2, 0) / (counts.length - 1) / m
        );
    }
    const vmr = mean(shells);
    return {
      check:
        'galaxies in the strip are clustered: counts in 5-degree sectors of 25 Mpc shells (100 to 400 Mpc) have a variance-to-mean ratio above 2 (Poisson would give 1)',
      against: [
        {
          quantity: 'variance-to-mean ratio of counts in cells',
          value: 1,
          unit: '',
          ref: 'a Poisson (unclustered) sample',
        },
      ],
      result: { varianceToMean: Number(vmr.toFixed(1)), galaxies: table.n },
      ok: vmr > 2 && table.n === 2911,
    };
  },
};

// --- The Coma cluster's quoted numbers -------------------------------------------

const COMA_ID = 'coma-cluster-quoted';
const COMA_VALUES = {
  sigma: 1000,
  radius: 1.4,
  starMass: 3e13,
  gasMass: 1.2e14,
};
const COMA_COLUMNS = [
  col(
    'sigma',
    'line-of-sight velocity dispersion',
    'km/s',
    1,
    'as the scenario quotes it, rounded; Colless & Dunn 1996 print 1038 +- 60'
  ),
  col(
    'radius',
    'radius of the quoted virial mass',
    'Mpc',
    0.01,
    'the radius the virial mass is usually quoted within'
  ),
  col('star_mass', 'mass in galaxies', 'Msun', 1e10, 'a round teaching value'),
  col(
    'gas_mass',
    'mass in hot intracluster gas',
    'Msun',
    1e10,
    'a round teaching value from X-ray observations'
  ),
];

export const COMA_QUOTED = {
  ...base,
  id: COMA_ID,
  manifest: `data-packs/${COMA_ID}.json`,
  module: modulePath(COMA_ID),
  exportName: stem(COMA_ID),
  namedBy: ['js/cosmologyData.js'],
  sidecar: `cosmology/${COMA_ID}.json`,
  raw: [],
  columns: COMA_COLUMNS,
  build() {
    const row = {
      sigma: COMA_VALUES.sigma,
      radius: COMA_VALUES.radius,
      star_mass: COMA_VALUES.starMass,
      gas_mass: COMA_VALUES.gasMass,
    };
    const { series, record } = encodeTable([row], this.columns);
    const meta = {
      id: COMA_ID,
      version: '1.0.0',
      title:
        'The Coma cluster: the four values the Coma scenario and its virial instrument quote',
      object: {
        name: 'Coma cluster (Abell 1656)',
        identifiers: ['Abell 1656', 'Coma'],
        frame: 'a cluster at z = 0.023',
      },
      facility: {
        observatory: 'compiled from the literature',
        pipeline: 'js/darkMatterWidgets.js COMA, as the scenario quotes it',
      },
      dataType: 'catalog',
      origin: 'compilation',
      credit:
        'The values the Coma scenario quotes; the dispersion is compared with Colless & Dunn 1996, ApJ 458, 435',
      license: {
        status: 'cc-by-4.0',
        statement:
          "Gravitas's own record of the numbers its scenario quotes, licensed as its teaching material is (CC BY 4.0, LICENSES.md). The published values it is compared with are cited, not reproduced.",
        basis:
          'The four numbers are rounded facts a lesson uses; the pack records them, cites the one published value that was checked, and marks the rest as not sourced to a table here.',
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        'One row, four values, exactly as js/darkMatterWidgets.js quotes them (tests/cosmologyData.test.js holds the two to each other).',
        'The dispersion, 1000 km/s, sits inside Colless & Dunn 1996 (ApJ 458, 435), who print 1038 +- 60 km/s for the Coma cluster; the Prompt 90 gate measured 972.6 km/s from SDSS members, which missed the published value by more than its bar and is not used.',
        `Approximate, unsourced to a table in this repository: the radius (${COMA_VALUES.radius} Mpc), the stellar mass (3e13 Msun) and the gas mass (1.2e14 Msun) are round teaching values. They are not given a citation they do not have.`,
      ],
    };
    const manifestRest = {
      source: {
        archive: 'none: values quoted by the Gravitas Coma scenario',
        urls: ['https://doi.org/10.1086/176827'],
        citations: [
          {
            text: 'Colless & Dunn 1996, ApJ 458, 435 (Structure and dynamics of the Coma cluster), the published dispersion the quoted one is compared with',
            doi: '10.1086/176827',
          },
          {
            text: 'Zwicky 1933, Helvetica Physica Acta 6, 110 (the first virial argument for missing mass in Coma)',
          },
        ],
      },
      raw: [],
      transformation: transformation(
        { columns: this.columns.map(({ id, step }) => ({ id, step })) },
        [`Store the four quoted values as ${ENCODING}.`],
        { rows: 1, columns: record }
      ),
      assumptions: [
        'These are the numbers a lesson computes a virial mass from; they are not a measurement made by Gravitas.',
        'The published dispersion is 1038 +- 60 km/s; the quoted 1000 sits inside it.',
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return asSidecar(this, { meta, manifestRest, series });
  },
  validate(table) {
    const sigma = column(table, 'sigma')[0];
    return {
      check:
        "the quoted dispersion lies within Colless & Dunn's 1038 +- 60 km/s",
      against: [
        {
          quantity: 'line-of-sight velocity dispersion',
          value: 1038,
          unit: 'km/s',
          ref: 'Colless & Dunn 1996, ApJ 458, 435',
        },
      ],
      result: { sigma, publishedLow: 978, publishedHigh: 1098 },
      ok: sigma >= 978 && sigma <= 1098,
    };
  },
};

export const COSMOLOGY_PACKS = [
  HUBBLE_1929,
  DES_SN5YR,
  SDSS_SLICE,
  COMA_QUOTED,
];
export { sha256 };
