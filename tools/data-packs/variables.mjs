// =============================================================================
// Variable stars and the distance ladder: three table packs (Roadmap II Prompt 96)
// -----------------------------------------------------------------------------
//   tess-su-dra-s15       SU Draconis, an RR Lyrae star, TESS sector 15, 20-minute bins
//   tess-eta-aql-s81      Eta Aquilae, a classical Cepheid, TESS sector 81, 60-minute bins
//   shoes-r22-cepheids    Cepheid periods and Wesenheit magnitudes in the LMC, NGC 4258
//                         and M101 (Riess et al. 2022, ApJL 934, L7, Table 2)
//
// Each is a table (js/tableObservation.js) whose rows are a sidecar file the
// page fetches (variables/*.json), so that no budget that counts JavaScript
// counts a light curve. The two light curves are NASA TESS data released
// through MAST without restriction; the Cepheid table is from a paper under
// CC BY 4.0 (rights: DECISION_REGISTER.md D-LADDER-01).
// =============================================================================

import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFits } from './fits.mjs';
import { binLightCurve } from './tess-light-curve.mjs';
import { sha256 } from './pinned.mjs';
import { ENCODING, TABLE_VERSION, encodeTable } from './table-columns.mjs';
import { observationOf } from '../../js/observation.js';
import { tableOf } from '../../js/tableObservation.js';
import { findPeriod, refinePeriod } from '../../js/kernels/variables/period.js';
import { fitLeavitt } from '../../js/kernels/variables/ladder.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const RETRIEVED = '2026-10-10';

/** What a build() returns when the rows are a sidecar file (as tools/data-packs/gaia-dynamics.mjs). */
export function asSidecar(pack, { meta, manifestRest, series }) {
  const sidecar = `${JSON.stringify(series)}\n`;
  return {
    meta,
    manifestRest,
    sidecar,
    render: async PACK => {
      const body = `// =============================================================================
// ${meta.title}
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-data-packs.mjs
// (${pack.script ?? 'tools/data-packs/variables.mjs'}) from ${pack.raw.length ? pack.raw.map(r => r.file).join(', ') : 'its own record'};
// \`npm run packs:check\` verifies it offline and \`npm run packs:provenance\`
// rebuilds it from the pinned raw product and compares byte for byte. The full
// record is ${pack.manifest}.
//
// The rows are not here. They are the sidecar ${pack.sidecar}, a table-columns/1
// series that the page fetches, so that a budget that counts JavaScript does not
// count a table; SIDECAR records its size and checksum.
// =============================================================================

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/** The sidecar: where the rows are, and what they must be. */
export const SIDECAR = ${JSON.stringify({
        file: pack.sidecar,
        bytes: Buffer.byteLength(sidecar),
        sha256: sha256(sidecar),
      })};
`;
      const prettier = await import('prettier');
      const options =
        (await prettier.resolveConfig(path.join(REPO, pack.module))) || {};
      return prettier.format(body, {
        ...options,
        filepath: path.join(REPO, pack.module),
      });
    },
  };
}
export const decodeSidecar = mod =>
  tableOf({ PACK: mod.PACK, SERIES: JSON.parse(mod.SIDECAR_TEXT) });

export const col = (id, name, unit, step, description, uncertaintyOf) => ({
  id,
  name,
  unit,
  step,
  ...(uncertaintyOf ? { uncertaintyOf } : {}),
  description,
});
export const described = columns =>
  columns.map(c =>
    Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'step'))
  );

const TESS_CITATIONS = [
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
];
const TESS_LICENSE = {
  status: 'public-domain',
  statement:
    'NASA mission data, released through MAST without restriction on reuse. MAST asks that work using its data acknowledge the mission and the archive.',
};

/**
 * A TESS light curve as a table: time (BTJD), flux over its median, error.
 * The binning is the one every TESS pack uses (tools/data-packs/tess-light-curve.mjs).
 */
function tessTable({
  id,
  file,
  url,
  bytes,
  sha,
  tic,
  sector,
  title,
  name,
  binMinutes,
  period,
  tolerance,
  note,
  type,
}) {
  const columns = [
    col('time', 'time', 'd', 1e-4, 'bin centre, BTJD = BJD - 2457000'),
    col('flux', 'flux', '', 2e-5, 'PDCSAP flux over its median'),
    col(
      'flux_err',
      'flux error',
      '',
      1e-6,
      'propagated PDCSAP error over the median, one sigma, per bin',
      'flux'
    ),
  ];
  const options = { binMinutes, minPerBin: 3, errStepPpm: 5, fluxStepPpm: 20 };
  return {
    id,
    manifest: `data-packs/${id}.json`,
    capability: null,
    module: `js/data/observations/${id.replace(/-(\w)/g, (_, c) => c.toUpperCase())}.js`,
    exportName: id.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
    transformVersion: TABLE_VERSION,
    table: true,
    namedBy: ['js/variablesData.js'],
    sidecar: `variables/${id}.json`,
    decode: decodeSidecar,
    raw: [{ file, url, bytes, sha256: sha }],
    columns,
    build(raw) {
      const units = readFits(raw[0]);
      const { record } = binLightCurve(units, options);
      const { series: binned } = binLightCurve(units, options);
      const P = units[0].cards;
      const H = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE').cards;
      if (P.OBJECT !== `TIC ${tic}` || P.SECTOR !== sector)
        throw new Error(`the raw file is ${P.OBJECT} sector ${P.SECTOR}`);
      if (H.TIMESYS !== 'TDB' || H.BJDREFI + H.BJDREFF !== 2457000)
        throw new Error('not BTJD');
      const o = observationOf({
        PACK: {
          dataType: 'light-curve',
          time: { scale: 'TDB', reference: 'BTJD', unit: 'd' },
          columns: [
            { name: 'time', unit: 'd' },
            { name: 'flux', unit: '' },
            { name: 'flux error', unit: '', uncertaintyOf: 'flux' },
          ],
        },
        SERIES: binned,
      });
      const rows = Array.from(o.x.values ?? o.x, (t, i) => ({
        time: t,
        flux: (o.y.values ?? o.y)[i],
        flux_err: o.err[i],
      }));
      const { series, record: enc } = encodeTable(rows, this.columns);
      const meta = {
        id,
        version: '1.0.0',
        title,
        object: {
          name,
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
        credit: `TESS, sector ${sector} (NASA; SPOC light curve from MAST)`,
        license: TESS_LICENSE,
        retrieved: RETRIEVED,
        time: {
          scale: H.TIMESYS,
          reference: 'BTJD = BJD - 2457000',
          unit: 'd',
        },
        columns: described(columns),
        masks: [
          {
            column: 'QUALITY',
            rule: 'any nonzero flag drops the cadence',
            dropped: record.flagged,
          },
          {
            column: 'bin',
            rule: `a bin with fewer than ${options.minPerBin} kept cadences is dropped`,
            dropped: record.binsDropped,
          },
        ],
        reductions: [
          `${binMinutes}-minute bins average ${binMinutes / 2} two-minute cadences each; the bin error is the quadrature sum over the count.`,
          'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.0001 d (8.6 s); the manifest records the largest rounding.',
          note,
        ],
      };
      const manifestRest = {
        source: {
          archive: 'MAST (Barbara A. Mikulski Archive for Space Telescopes)',
          urls: this.raw.map(r => r.url),
          citations: TESS_CITATIONS,
        },
        raw: this.raw,
        transformation: {
          script: 'tools/data-packs/variables.mjs',
          version: TABLE_VERSION,
          options: {
            ...options,
            columns: columns.map(({ id: c, step }) => ({ id: c, step })),
          },
          steps: [
            'Read TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR and QUALITY from the LIGHTCURVE binary table.',
            'Keep cadences with QUALITY 0 and a finite time, flux and error.',
            'Divide flux and error by the median kept flux.',
            `Average into ${binMinutes}-minute bins from t0, keeping bins with at least ${options.minPerBin} cadences.`,
            `Store time, flux and error as ${ENCODING}.`,
          ],
          record: { ...record, rows: rows.length, columns: enc },
        },
        assumptions: [
          'PDCSAP flux has had instrumental systematics and crowding removed by SPOC; that correction is used as published.',
          'Times are barycentric dynamical time for the target, as SPOC corrects them.',
          type,
        ],
        compatible: { widgets: [], investigations: [] },
        offline: 'optional',
      };
      return asSidecar(this, { meta, manifestRest, series });
    },
    validate(table) {
      const c = k => table.columns.find(x => x.id === k).values;
      const t = c('time');
      const mag = Float64Array.from(c('flux'), f => -2.5 * Math.log10(f));
      const found = findPeriod(t, mag, {
        minPeriod: 0.2,
        maxPeriod: 15,
        oversample: 8,
      });
      // The sinusoid's peak, then the period a six-harmonic series prefers.
      const best = refinePeriod(t, mag, found.period, 6, 0.5 * found.width);
      const rel = Math.abs(best.period / period.value - 1);
      return {
        check: `a period search and a six-harmonic refinement find the published period within ${100 * tolerance} percent`,
        against: [{ quantity: 'period', ...period }],
        result: {
          foundPeriod: Number(best.period.toFixed(5)),
          peakPeriod: Number(found.period.toFixed(5)),
          fraction: Number(rel.toFixed(4)),
          points: table.n,
        },
        ok: rel <= tolerance,
      };
    },
  };
}

export const TESS_SU_DRA = tessTable({
  id: 'tess-su-dra-s15',
  file: 'tess2019226182529-s0015-0000000142848794-0151-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2019226182529-s0015-0000000142848794-0151-s_lc.fits',
  bytes: 1906560,
  sha: 'feea6b25dd3d2a9762365b4fd4588887640076381999a43f53f87bd892e6e4a0',
  tic: 142848794,
  sector: 15,
  title: 'SU Draconis: TESS sector 15 light curve (an RR Lyrae star)',
  name: 'SU Draconis',
  binMinutes: 20,
  period: {
    value: 0.66042001,
    unit: 'd',
    ref: 'Monson et al. 2017, AJ 153, 96, Table 1',
  },
  tolerance: 0.001,
  note: 'SU Dra is a fundamental-mode RR Lyrae star with no Blazhko modulation, so one period describes the whole run.',
  type: 'The light is the TESS band (600 to 1000 nm), not V: amplitudes read from it are smaller than the V amplitudes of the literature.',
});

export const TESS_ETA_AQL = tessTable({
  id: 'tess-eta-aql-s81',
  file: 'tess2024196212429-s0081-0000000111010123-0276-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2024196212429-s0081-0000000111010123-0276-s_lc.fits',
  bytes: 1949760,
  sha: '552107abb14a0cc390c1ca4ff8ecfd2ba91581be725dd9ce527c1f5c1db546c1',
  tic: 111010123,
  sector: 81,
  title: 'Eta Aquilae: TESS sector 81 light curve (a classical Cepheid)',
  name: 'Eta Aquilae',
  binMinutes: 60,
  period: {
    value: 7.1767,
    unit: 'd',
    ref: 'GCVS (Samus et al. 2017): 7.176641 d',
  },
  tolerance: 0.02,
  note: 'Eta Aql is a naked-eye star (Tmag 3.1), saturated in TESS: the SPOC aperture collects the bleed trails and the light curve carries systematics at the few-percent level, which is why the residuals about a Fourier fit are larger than the photon noise. The run covers about 3.7 cycles of its period.',
  type: 'The light is the TESS band, not V or I; the run is short, so the period from it is good to a few tenths of a percent and no better.',
});

// --- The Cepheid table --------------------------------------------------------

const SHOES_COMMIT = 'c447f0fea703fcd0fff57de5000947b5ca81286b';
const HOSTS = { LMC: [1, 1], N4258: [2, 4], M101: [3, 4] };

export const SHOES_CEPHEIDS = {
  id: 'shoes-r22-cepheids',
  manifest: 'data-packs/shoes-r22-cepheids.json',
  capability: null,
  module: 'js/data/observations/shoesR22Cepheids.js',
  exportName: 'shoesR22Cepheids',
  transformVersion: TABLE_VERSION,
  table: true,
  namedBy: ['js/variablesData.js'],
  sidecar: 'variables/shoes-r22-cepheids.json',
  decode: decodeSidecar,
  raw: [
    {
      file: 'shoes-r22-table2.tex',
      url: `https://raw.githubusercontent.com/PantheonPlusSH0ES/DataRelease/${SHOES_COMMIT}/SH0ES_Data/table2.tex`,
      bytes: 329678,
      sha256:
        'd4b9af2b5d65118f7ac44a41b7e8cd662dfd42a63b5c359ca402d8be3b4dbba4',
    },
  ],
  columns: [
    col('host', 'host', '', 1, 'which galaxy: 1 the LMC, 2 NGC 4258, 3 M101'),
    col('period', 'period', 'd', 0.001, 'pulsation period'),
    col(
      'mw',
      'Wesenheit magnitude',
      'mag',
      0.001,
      'm_W = F160W - 0.386 (F555W - F814W), the reddening-free magnitude of R22 eq. 7'
    ),
  ],
  build(raw) {
    const text = Buffer.from(raw[0]).toString('utf8');
    const all = text
      .split('\n')
      .filter(l => l.includes('&') && !l.startsWith('\\'))
      .map(l =>
        l
          .replace(/\\\\.*$/, '')
          .split('&')
          .map(s => s.trim())
      )
      .map(f => ({ host: f[0], P: f[4], col: +f[5], H: +f[7], oh: +f[9] }));
    const rows = [];
    for (const [name, [code, every]] of Object.entries(HOSTS))
      all
        .filter(r => r.host === name)
        .filter((_, i) => i % every === 0)
        .forEach(r =>
          rows.push({
            host: code,
            period: +r.P,
            mw: Number((r.H - 0.386 * r.col).toFixed(3)),
          })
        );
    const { series, record } = encodeTable(rows, this.columns);
    const count = code => rows.filter(r => r.host === code).length;
    const meta = {
      id: this.id,
      version: '1.0.0',
      title:
        'Cepheids in the LMC, NGC 4258 and M101: periods and Wesenheit magnitudes (Riess et al. 2022)',
      object: {
        name: 'Cepheids of three galaxies',
        identifiers: ['LMC', 'NGC 4258', 'M101'],
        frame: 'HST WFC3 F160W, F555W, F814W',
      },
      facility: {
        observatory: 'HST WFC3 (SH0ES program)',
        pipeline:
          'Riess et al. 2022, ApJ 934, L7, Table 2 (as held by the SH0ES data release)',
      },
      dataType: 'catalog',
      origin: 'compilation',
      credit:
        'Riess et al. 2022, ApJ 934, L7 (CC BY 4.0); the table as the SH0ES data release holds it',
      license: {
        status: 'cc-by-4.0',
        statement: `The paper's publisher page and Crossref record say original content may be used under CC BY 4.0 (read ${RETRIEVED}); the repository copy of the table has no licence of its own, so the pack relies on the paper's. Attribute Riess et al. 2022, ApJ 934, L7.`,
        basis:
          'A published table from a CC BY 4.0 article, reduced to periods and Wesenheit magnitudes with the paper cited and credited; the same finding as the cosmology gate (COSMOLOGY_GATE.md, D-COSMO-07), made again here because the pack does not depend on that delegated verdict (D-LADDER-01).',
      },
      retrieved: RETRIEVED,
      columns: described(this.columns),
      masks: [],
      reductions: [
        `All ${count(1)} LMC rows, every fourth NGC 4258 row (${count(2)}) and every fourth M101 row (${count(3)}), in the table's order.`,
        "The Wesenheit magnitude is F160W - 0.386 (F555W - F814W) to 0.001 mag; coordinates, identifiers, the colour, the individual errors and the metallicity are not kept. The table's errors do not carry the covariance (the paper's own note), so the lessons fit the scatter about the relation instead.",
        "Periods are the table's digits (to 0.001 d); the LMC and the two hosts are HST-only measurements, so the LMC slope is not the paper's, which leans on ground data.",
      ],
    };
    const manifestRest = {
      source: {
        archive: 'SH0ES data release (PantheonPlusSH0ES/DataRelease on GitHub)',
        urls: this.raw.map(r => r.url),
        citations: [
          {
            text: 'Riess et al. 2022, ApJ 934, L7 (A comprehensive measurement of the local value of the Hubble constant)',
            doi: '10.3847/2041-8213/ac5c5b',
          },
          {
            text: 'Pietrzynski et al. 2019, Nature 567, 200 (the LMC distance from eclipsing binaries)',
            doi: '10.1038/s41586-019-0999-4',
          },
          {
            text: 'Reid, Pesce & Riess 2019, ApJ 886, L27 (the NGC 4258 maser distance)',
            doi: '10.3847/2041-8213/ab552d',
          },
          {
            text: 'Leavitt & Pickering 1912, Harvard College Observatory Circular 173',
          },
        ],
      },
      raw: this.raw,
      transformation: {
        script: 'tools/data-packs/variables.mjs',
        version: TABLE_VERSION,
        options: {
          hosts: HOSTS,
          columns: this.columns.map(({ id, step }) => ({ id, step })),
        },
        steps: [
          'Read the rows of Table 2 (host, period, F555W-F814W, F160W).',
          'Keep every LMC row and every fourth NGC 4258 and M101 row.',
          'Compute m_W = F160W - 0.386 (F555W - F814W), to 0.001 mag.',
          `Store host code, period and m_W as ${ENCODING}.`,
        ],
        record: { rows: rows.length, columns: record },
      },
      assumptions: [
        "The Wesenheit coefficient 0.386 is the paper's (R_V = 3.3); the lessons check it against the radiation kernel's extinction law.",
        'Anchor distance moduli are published values, not in this table: the LMC 18.477 +- 0.026 (Pietrzynski et al. 2019) and NGC 4258 29.397 +- 0.032 (Reid et al. 2019).',
      ],
      compatible: { widgets: [], investigations: [] },
      offline: 'optional',
    };
    return asSidecar(this, { meta, manifestRest, series });
  },
  validate(table) {
    const c = k => table.columns.find(x => x.id === k).values;
    const host = c('host');
    const lmc = [];
    for (let i = 0; i < table.n; i++) if (host[i] === 1) lmc.push(i);
    const fit = fitLeavitt(
      lmc.map(i => c('period')[i]),
      lmc.map(i => c('mw')[i])
    );
    return {
      check:
        "the LMC Cepheids' Wesenheit slope is within 0.1 mag/dex of the paper's -3.284",
      against: [
        {
          quantity: 'LMC Wesenheit slope',
          value: -3.284,
          unit: 'mag/dex',
          ref: 'Riess et al. 2022, ApJL 934, L7',
        },
      ],
      result: {
        slope: Number(fit.b.toFixed(3)),
        error: Number(fit.sigmaB.toFixed(3)),
        stars: fit.n,
      },
      ok: Math.abs(fit.b + 3.284) <= 0.1 && lmc.length > 300,
    };
  },
};

export const VARIABLES_PACKS = [TESS_SU_DRA, TESS_ETA_AQL, SHOES_CEPHEIDS];
