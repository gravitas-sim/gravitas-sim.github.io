// =============================================================================
// Stellar activity: two TESS light-curve packs (Roadmap III Prompt 220)
// -----------------------------------------------------------------------------
//   tess-au-mic-s1    AU Microscopii, TESS sector 1: every kept 2-minute cadence, so that
//                     flares are resolved (the rotation search bins it to 30 minutes)
//   tess-ek-dra-s16   EK Draconis, TESS sector 16: 30-minute bins (rotation only)
//
// Both are tables (js/tableObservation.js) whose rows are a sidecar file the page
// fetches (variables/*.json). NASA TESS data released through MAST without
// restriction (D-R10-220-01 records the exact products, their SHA-256 and the date).
// The 2-minute table is not binned: a bin grid cannot carry the cadence's own time
// stamps, and a flare's equivalent duration integrates over them.
// =============================================================================

import { readFits, requireColumns } from './fits.mjs';
import { binLightCurve } from './tess-light-curve.mjs';
import { ENCODING, TABLE_VERSION, encodeTable } from './table-columns.mjs';
import { observationOf } from '../../js/observation.js';
import { findPeriod, refinePeriod } from '../../js/kernels/variables/period.js';
import { asSidecar, col, decodeSidecar, described } from './variables.mjs';

const RETRIEVED = '2026-10-30';

/** Means over bins of `minutes` counted from the first time; a bin with fewer than `minimum` points is dropped. */
function binSeries(t, y, minutes, minimum) {
  const w = minutes / 1440;
  const acc = new Map();
  for (let i = 0; i < t.length; i++) {
    const k = Math.floor((t[i] - t[0]) / w);
    const b = acc.get(k) ?? { n: 0, t: 0, y: 0 };
    b.n++;
    b.t += t[i];
    b.y += y[i];
    acc.set(k, b);
  }
  const keys = [...acc.keys()]
    .filter(k => acc.get(k).n >= minimum)
    .sort((a, b) => a - b);
  return {
    t: keys.map(k => acc.get(k).t / acc.get(k).n),
    y: keys.map(k => acc.get(k).y / acc.get(k).n),
  };
}

const median = xs => {
  const s = Float64Array.from(xs).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

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

/** The kept cadences of a SPOC light curve, flux and error over the median flux. */
function keptCadences(units) {
  const lc = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE');
  const cols = requireColumns(lc, [
    'TIME',
    'PDCSAP_FLUX',
    'PDCSAP_FLUX_ERR',
    'QUALITY',
  ]);
  const kept = [];
  let flagged = 0;
  let notFinite = 0;
  for (let i = 0; i < cols.TIME.values.length; i++) {
    const t = cols.TIME.values[i];
    const f = cols.PDCSAP_FLUX.values[i];
    const e = cols.PDCSAP_FLUX_ERR.values[i];
    if (cols.QUALITY.values[i] !== 0) flagged++;
    else if (!Number.isFinite(t) || !Number.isFinite(f) || !Number.isFinite(e))
      notFinite++;
    else kept.push([t, f, e]);
  }
  const norm = median(kept.map(k => k[1]));
  return {
    rows: kept.map(([t, f, e]) => ({
      time: t,
      flux: f / norm,
      flux_err: e / norm,
    })),
    record: {
      cadences: cols.TIME.values.length,
      flagged,
      notFinite,
      kept: kept.length,
      medianFlux: norm,
    },
  };
}

function activityTable({
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
  band,
  note,
  type,
}) {
  const cadence = binMinutes === null;
  const columns = [
    col(
      'time',
      'time',
      'd',
      cadence ? 1e-5 : 1e-4,
      cadence
        ? 'cadence mid-time, BTJD = BJD - 2457000'
        : 'bin centre, BTJD = BJD - 2457000'
    ),
    col('flux', 'flux', '', 2e-5, 'PDCSAP flux over its median'),
    col(
      'flux_err',
      'flux error',
      '',
      1e-6,
      cadence
        ? 'PDCSAP error over the median, one sigma'
        : 'propagated PDCSAP error over the median, one sigma, per bin',
      'flux'
    ),
  ];
  const options = cadence
    ? { binMinutes: null, quality: 0 }
    : { binMinutes, minPerBin: 3, errStepPpm: 5, fluxStepPpm: 20 };
  return {
    id,
    manifest: `data-packs/${id}.json`,
    capability: null,
    module: `js/data/observations/${id.replace(/-(\w)/g, (_, c) => c.toUpperCase())}.js`,
    exportName: id.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
    transformVersion: TABLE_VERSION,
    table: true,
    namedBy: ['js/activityData.js'],
    sidecar: `variables/${id}.json`,
    script: 'tools/data-packs/activity.mjs',
    decode: decodeSidecar,
    raw: [{ file, url, bytes, sha256: sha }],
    columns,
    build(raw) {
      const units = readFits(raw[0]);
      const P = units[0].cards;
      const H = units.find(u => u.cards.EXTNAME === 'LIGHTCURVE').cards;
      if (P.OBJECT !== `TIC ${tic}` || P.SECTOR !== sector)
        throw new Error(`the raw file is ${P.OBJECT} sector ${P.SECTOR}`);
      if (H.TIMESYS !== 'TDB' || H.BJDREFI + H.BJDREFF !== 2457000)
        throw new Error('not BTJD');
      let rows;
      let reduction;
      let record;
      if (cadence) {
        ({ rows, record } = keptCadences(units));
        reduction =
          'Every kept two-minute cadence is stored with its own time stamp; nothing is averaged.';
      } else {
        const { series: binned, record: r0 } = binLightCurve(units, options);
        record = r0;
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
        rows = Array.from(o.x.values ?? o.x, (t, i) => ({
          time: t,
          flux: (o.y.values ?? o.y)[i],
          flux_err: o.err[i],
        }));
        reduction = `${binMinutes}-minute bins average ${binMinutes / 2} two-minute cadences each; the bin error is the quadrature sum over the count.`;
      }
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
        ],
        reductions: [
          reduction,
          cadence
            ? 'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.00001 d (0.86 s); the manifest records the largest rounding.'
            : 'Flux is stored to 20 ppm, its error to 1 ppm and time to 0.0001 d (8.6 s); the manifest records the largest rounding.',
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
          script: 'tools/data-packs/activity.mjs',
          version: TABLE_VERSION,
          options: {
            ...options,
            columns: columns.map(({ id: c, step }) => ({ id: c, step })),
          },
          steps: [
            'Read TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR and QUALITY from the LIGHTCURVE binary table.',
            'Keep cadences with QUALITY 0 and a finite time, flux and error.',
            'Divide flux and error by the median kept flux.',
            cadence
              ? 'Keep every cadence (no binning).'
              : `Average into ${binMinutes}-minute bins from t0, keeping bins with at least ${options.minPerBin} cadences.`,
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
        offline: 'none',
      };
      return asSidecar(this, { meta, manifestRest, series });
    },
    validate(table) {
      const c = k => table.columns.find(x => x.id === k).values;
      const t = c('time');
      const f = c('flux');
      const b = cadence ? binSeries(t, f, 30, 8) : { t, y: f };
      const found = findPeriod(b.t, b.y, {
        minPeriod: 0.5,
        maxPeriod: 13,
        oversample: 8,
      });
      const best = refinePeriod(b.t, b.y, found.period, 4, 0.5 * found.width);
      const ok = band
        ? best.period >= band[0] && best.period <= band[1]
        : Math.abs(best.period - period.value) <= period.sigma;
      return {
        check: band
          ? `a period search and a four-harmonic refinement find a period inside the span of the cited literature values (${band[0]} to ${band[1]} d)`
          : `a period search and a four-harmonic refinement find the published period within its stated uncertainty (${period.sigma} d)`,
        against: [
          {
            quantity: 'period',
            ...(period ?? { value: band, unit: 'd', ref: note }),
          },
        ],
        result: {
          foundPeriod: Number(best.period.toFixed(4)),
          peakPeriod: Number(found.period.toFixed(4)),
          points: table.n,
        },
        ok,
      };
    },
  };
}

export const TESS_AU_MIC = activityTable({
  id: 'tess-au-mic-s1',
  file: 'tess2018206045859-s0001-0000000441420236-0120-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2018206045859-s0001-0000000441420236-0120-s_lc.fits',
  bytes: 2039040,
  sha: 'fe601f0f82b7d89c4d303e3c3acaa43efb61e38976b47482efce577e0029c9c3',
  tic: 441420236,
  sector: 1,
  title:
    'AU Microscopii: TESS sector 1 light curve (a spotted, flaring M dwarf)',
  name: 'AU Microscopii',
  binMinutes: null,
  period: {
    value: 4.85,
    sigma: 0.03,
    unit: 'd',
    ref: 'Gilbert et al. 2022, AJ 163, 147 (4.85 +- 0.03 d from all TESS sectors)',
  },
  note: 'AU Mic is a young, active M1 dwarf in the Beta Pictoris moving group with strong spot modulation and frequent flares; Gilbert et al. (2022) find 48 flares in 25.07 d of this sector at 2-minute cadence with their own pipeline.',
  type: 'The light is the TESS band (600 to 1000 nm). The star has a transiting planet whose transits are shallower than the flares and are not removed.',
});

export const TESS_EK_DRA = activityTable({
  id: 'tess-ek-dra-s16',
  file: 'tess2019253231442-s0016-0000000159613900-0152-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2019253231442-s0016-0000000159613900-0152-s_lc.fits',
  bytes: 1805760,
  sha: '3f3c139f46afab814e1587a7e8a03e73c18b2a8a514d67d72e944972988cd6ef',
  tic: 159613900,
  sector: 16,
  title: 'EK Draconis: TESS sector 16 light curve (a young Sun-like star)',
  name: 'EK Draconis',
  binMinutes: 30,
  band: [2.5, 2.9],
  note: 'EK Dra is a young (about 100 Myr) G1.5 dwarf whose rotation period is given as about 2.77 d (Audard et al. 1999; Ayres 2015; Namekata et al. 2022) and about 2.6 d (Gorgei et al. 2026); the difference is attributed to differential rotation. The band 2.5 to 2.9 d is the span of those values with 0.1 d of margin.',
  type: 'The light is the TESS band, not V; the run covers nine rotations, and spots evolve within it.',
});

export const ACTIVITY_PACKS = [TESS_AU_MIC, TESS_EK_DRA];
