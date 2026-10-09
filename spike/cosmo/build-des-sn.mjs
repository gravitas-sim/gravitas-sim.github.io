// DES-SN5YR Hubble diagram (1829 SNe Ia). Raw: sources/DES-SN5YR_HD.csv, from
// Zenodo record 10.5281/zenodo.12720778 (DES-SN5YR-1.2.zip, CC BY 4.0), the file
// 4_DISTANCES_COVMAT/DES-SN5YR_HD.csv, taken by HTTP range request from the zip
// whose MD5 is 9019a6ddc569553bc323e9e1b68a55bf.
// Columns kept: zHD, MU, MUERR_FINAL, survey class (DES or low-z).
// Columns dropped: CID, zCMB, zHEL; IDSURVEY is reduced to one bit (10 = DES).
// Transform: sort by zHD then CID; z as integer x1e5, MU and MUERR as integer
// x1e4 (the raw files' own digits, no rounding); z delta-coded.
// Candidates, in order, first one inside both ceilings wins:
//   1. all rows, survey bit kept     2. all rows, survey bit dropped
//   3. every second row (a thinning, so not byte-exact)
import { readText, parseCsv, writeDerived, writeResult, deltas, undelta, mean, KiB } from './lib.mjs';

const rows = parseCsv(readText('sources/DES-SN5YR_HD.csv')).map(r => ({
  cid: r.CID,
  des: r.IDSURVEY === '10' ? 1 : 0,
  z: Math.round(+r.zHD * 1e5),
  mu: Math.round(+r.MU * 1e4),
  err: Math.round(+r.MUERR_FINAL * 1e4),
}));
rows.sort((a, b) => a.z - b.z || +a.cid - +b.cid);

const pack = (rs, survey) => ({
  id: 'des-sn5yr-hd',
  n: rs.length,
  units: { z: 1e-5, mu: 1e-4, err: 1e-4 },
  z: deltas(rs.map(r => r.z)),
  mu: rs.map(r => r.mu),
  err: rs.map(r => r.err),
  ...(survey ? { des: rs.map(r => r.des).join('') } : {}),
});
const cands = [
  ['all rows, survey bit kept', pack(rows, true), rows],
  ['all rows, survey bit dropped', pack(rows, false), rows],
  ['every second row', pack(rows.filter((_, i) => i % 2 === 0), false), rows.filter((_, i) => i % 2 === 0)],
];
const log = [];
let chosen = null;
for (const [name, d, rs] of cands) {
  const m = writeDerived('des-sn5yr-hd.try', d);
  const ok = m.raw <= 32 * KiB && m.gzip <= 14 * KiB;
  log.push({ name, raw: m.raw, gzip: m.gzip, ok });
  if (ok && !chosen) chosen = { name, d, rs, m };
}
const stats = rs => ({
  n: rs.length,
  meanZ: mean(rs.map(r => r.z * 1e-5)),
  meanMu: mean(rs.map(r => r.mu * 1e-4)),
  meanErr: mean(rs.map(r => r.err * 1e-4)),
});
// Fidelity: the shipped file, decoded, against the raw CSV's selected rows.
const rawAll = parseCsv(readText('sources/DES-SN5YR_HD.csv'));
let fidelity = null;
if (chosen) {
  const m = writeDerived('des-sn5yr-hd', chosen.d);
  const z = undelta(chosen.d.z).map(v => v * 1e-5);
  const mu = chosen.d.mu.map(v => v * 1e-4);
  const sel = chosen.name === 'every second row' ? null : rawAll;
  if (sel) {
    const rz = mean(sel.map(r => +r.zHD));
    const rm = mean(sel.map(r => +r.MU));
    fidelity = {
      meanZ: { shipped: mean(z), raw: rz, rel: Math.abs(mean(z) - rz) / rz },
      meanMu: { shipped: mean(mu), raw: rm, rel: Math.abs(mean(mu) - rm) / rm },
    };
  }
  writeResult('des-sn5yr-hd', {
    chosen: chosen.name,
    bytes: { raw: m.raw, gzip: m.gzip, sha256: m.sha256 },
    ceilings: { rawKiB: 32, gzipKiB: 14 },
    candidates: log,
    stats: stats(chosen.rs),
    fidelity,
    rawRows: rawAll.length,
  });
  console.log('des-sn5yr', chosen.name, m.raw, m.gzip, JSON.stringify(fidelity && { z: fidelity.meanZ.rel, mu: fidelity.meanMu.rel }));
} else {
  writeResult('des-sn5yr-hd', { chosen: null, candidates: log });
  console.log('des-sn5yr: no candidate inside the ceilings', JSON.stringify(log));
}
