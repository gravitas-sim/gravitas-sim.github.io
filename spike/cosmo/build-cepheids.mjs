// Cepheid period-luminosity sample from Riess et al. (2022), ApJ Letters 934,
// L7, Table 2 (the paper is CC BY 4.0). Raw: sources/shoes-r22-table2.tex, the
// table as the SH0ES data release holds it (repository commit
// c447f0fea703fcd0fff57de5000947b5ca81286b). Declared before any run:
// hosts LMC (all rows), N4258 and M101 (every 4th row in table order);
// Wesenheit magnitude m_W = F160W - 0.386 (F555W - F814W) (R22 eq. 7, R = 0.386),
// 3 decimals; kept columns: P (days, the table's digits), m_W; the host's
// [O/H] stored once per host. Dropped: coordinates, ids, the colour, errors
// (the table's errors do not carry the covariance and are not shipped).
// Ceilings 8 KiB raw, 4 KiB gzip.
// R6 target, fixed in advance: R22 print the LMC P-L slope -3.284 +- 0.017
// mag/dex (period range 5..120 d). Fit m_W = a + b (log10 P - 1) on the shipped
// LMC rows with 5 < P < 120 d and one pass of 3.3-sigma clipping; pass if
// |b + 3.284| <= 0.017.
import { readText, writeDerived, writeResult, ols, KiB } from './lib.mjs';

const rows = readText('sources/shoes-r22-table2.tex')
  .split('\n')
  .filter(l => l.includes('&') && !l.startsWith('\\'))
  .map(l => l.replace(/\\\\.*$/, '').split('&').map(s => s.trim()))
  .map(f => ({ host: f[0], P: f[4], col: +f[5], H: +f[7], oh: +f[9] }));
const keep = { LMC: 1, N4258: 4, M101: 4 };
const out = {};
for (const [host, step] of Object.entries(keep)) {
  const hr = rows.filter(r => r.host === host).filter((_, i) => i % step === 0);
  out[host] = {
    OH: hr[0].oh,
    P: hr.map(r => +r.P),
    mW: hr.map(r => +(r.H - 0.386 * r.col).toFixed(3)),
  };
}
const d = { id: 'shoes-r22-cepheids', R: 0.386, hosts: out };
const m = writeDerived('shoes-r22-cepheids', d);
const fitHost = h => {
  let pts = h.P.map((p, i) => ({ x: Math.log10(p) - 1, y: h.mW[i], p })).filter(r => r.p > 5 && r.p < 120);
  let f = ols(pts.map(r => r.x), pts.map(r => r.y));
  pts = pts.filter(r => Math.abs(r.y - f.a - f.b * r.x) <= 3.3 * f.rms);
  f = ols(pts.map(r => r.x), pts.map(r => r.y));
  return { n: pts.length, slope: f.b, seSlope: f.seB, intercept: f.a };
};
const lmc = fitHost(out.LMC);
const hostFits = Object.fromEntries(Object.keys(out).map(h => [h, fitHost(out[h])]));
writeResult('shoes-r22-cepheids', {
  rowsShipped: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.P.length])),
  bytes: { raw: m.raw, gzip: m.gzip, sha256: m.sha256 },
  ceilings: { rawKiB: 8, gzipKiB: 4 },
  hostFits,
  published: { lmcSlope: -3.284, err: 0.017, ref: 'Riess et al. 2022, ApJL 934, L7, section on P-L slopes (arXiv:2112.04510)' },
  r6Pass: Math.abs(lmc.slope + 3.284) <= 0.017,
  noteTableCaveat: 'R22 table 2 notes: errors omit covariance; selections need new artificial-star tests.',
});
console.log('cepheids', m.raw, m.gzip, 'LMC slope', lmc.slope.toFixed(3), '+-', lmc.seSlope.toFixed(3), JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.P.length]))));
