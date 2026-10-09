// Hubble (1929), Proc. Natl. Acad. Sci. 15, 168, Table 1: 24 nebulae.
// Raw product: the PMC page images sources/pnas01016-0007.png (Table 1) and
// pnas01016-0008.png (the printed solutions). The table below was typed from
// the image; the check that it was typed right is the paper's own printed
// column M_t, recomputed from m_t and r for every row, and the printed mean
// of that column (-15.5).
// Columns kept: object, r (Mpc: the paper's unit is 10^6 pc), v (km/s), m_t.
// Dropped, and listed: m_s (blank for 9 rows) and the printed M_t (derived).
// Transform steps: none beyond typing; no rounding; r kept at the paper's digits.
import { writeDerived, writeResult, mean, ols, KiB, here } from './lib.mjs';

const T = [
  ['S. Mag.', 0.032, 170, 1.5, -16.0],
  ['L. Mag.', 0.034, 290, 0.5, -17.2],
  ['N.G.C. 6822', 0.214, -130, 9.0, -12.7],
  ['N.G.C. 598', 0.263, -70, 7.0, -15.1],
  ['N.G.C. 221', 0.275, -185, 8.8, -13.4],
  ['N.G.C. 224', 0.275, -220, 5.0, -17.2],
  ['N.G.C. 5457', 0.45, 200, 9.9, -13.3],
  ['N.G.C. 4736', 0.5, 290, 8.4, -15.1],
  ['N.G.C. 5194', 0.5, 270, 7.4, -16.1],
  ['N.G.C. 4449', 0.63, 200, 9.5, -14.5],
  ['N.G.C. 4214', 0.8, 300, 11.3, -13.2],
  ['N.G.C. 3031', 0.9, -30, 8.3, -16.4],
  ['N.G.C. 3627', 0.9, 650, 9.1, -15.7],
  ['N.G.C. 4826', 0.9, 150, 9.0, -15.7],
  ['N.G.C. 5236', 0.9, 500, 10.4, -14.4],
  ['N.G.C. 1068', 1.0, 920, 9.1, -15.9],
  ['N.G.C. 5055', 1.1, 450, 9.6, -15.6],
  ['N.G.C. 7331', 1.1, 500, 10.4, -14.8],
  ['N.G.C. 4258', 1.4, 500, 8.7, -17.0],
  ['N.G.C. 4151', 1.7, 960, 12.0, -14.2],
  ['N.G.C. 4382', 2.0, 500, 10.0, -16.5],
  ['N.G.C. 4472', 2.0, 850, 8.8, -17.7],
  ['N.G.C. 4486', 2.0, 800, 9.7, -16.8],
  ['N.G.C. 4649', 2.0, 1090, 9.5, -17.0],
];
const PRINTED_MEAN_M = -15.5;

const names = T.map(r => r[0]);
const r = T.map(x => x[1]);
const v = T.map(x => x[2]);
const mt = T.map(x => x[3]);
const Mrecomputed = T.map(x => x[3] + 5 - 5 * Math.log10(x[1] * 1e6));
const diffs = T.map((x, i) => Mrecomputed[i] - x[4]);
const worst = Math.max(...diffs.map(Math.abs));
const mismatches = diffs.filter(d => Math.abs(d) > 0.051).length;
const meanRecomputed = mean(Mrecomputed);

// v = a + K r, and v = K0 r through the origin (Hubble's own K is solved with
// the solar-motion terms, which need positions the table does not carry).
const fit = ols(r, v);
const K0 = r.reduce((s, x, i) => s + x * v[i], 0) / r.reduce((s, x) => s + x * x, 0);

const derived = {
  id: 'hubble-1929-table1',
  columns: ['object', 'r_Mpc', 'v_kms', 'm_t'],
  rows: T.map(x => [x[0], x[1], x[2], x[3]]),
};
const m = writeDerived('hubble-1929-table1', derived);
writeResult('hubble-1929-table1', {
  rows: T.length,
  bytes: { raw: m.raw, gzip: m.gzip, sha256: m.sha256 },
  ceilings: { rawKiB: 2, gzipKiB: 1, rawOk: m.raw <= 2 * KiB, gzipOk: m.gzip <= 1 * KiB },
  printedColumnCheck: {
    rowsCheckedAgainstPrintedMt: T.length,
    worstAbsDifferenceMag: +worst.toFixed(4),
    rowsDifferingByMoreThanRounding: mismatches,
    meanRecomputed: +meanRecomputed.toFixed(4),
    printedMean: PRINTED_MEAN_M,
    meanDifference: +(meanRecomputed - PRINTED_MEAN_M).toFixed(4),
  },
  fits: {
    interceptSlopeOLS: { v0_kms: +fit.a.toFixed(3), K_kms_per_Mpc: +fit.b.toFixed(3), seK: +fit.seB.toFixed(3) },
    throughOriginK_kms_per_Mpc: +K0.toFixed(3),
    hubble1929PrintedK: '465 +- 50 (24 objects, with solar motion), 513 +- 60 (9 groups), round value 500',
  },
  names: names.length,
});
console.log('hubble1929', m.raw, m.gzip, 'worst', worst.toFixed(3), 'mismatches', mismatches, 'mean', meanRecomputed.toFixed(3), 'K0', K0.toFixed(1), 'K', fit.b.toFixed(1));
