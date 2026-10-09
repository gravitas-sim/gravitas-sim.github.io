// SDSS DR18 galaxy redshift slice for the wedge plot. Raw:
// sources/sdss-dr18-redshift-slice.csv.gz (query in fetch-sdss.mjs: Legacy main
// sample, class GALAXY, zWarning 0, sciencePrimary, petroMag_r < 17.77,
// dec 0..2, ra 120..240, z 0.01..0.2). SDSS data are public domain.
// Columns kept: ra (integer x1e4 deg, rounded: a stated step, max error 0.5e-4
// deg = 0.18 arcsec), z (integer x1e8, the raw digits exactly).
// Dropped: specObjID, dec (the strip's limits are recorded instead), zErr,
// petroMag_r. Transform: restrict by the first candidate below that fits both
// ceilings (48 KiB raw, 20 KiB gzip); sort by ra; ra delta-coded.
// Candidates (declared before any run), in order:
//   A dec 0..0.5, ra 120..240, z<=0.2    B dec 0..0.5, z<=0.15
//   C dec 0..0.5, z<=0.12                D dec 0..0.25, z<=0.2
//   E dec 0..0.25, z<=0.15               F dec 0..0.25, z<=0.12
// Fidelity quantity: mean z of the shipped rows vs the same rows in the raw CSV.
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { here, parseCsv, writeDerived, writeResult, deltas, undelta, mean, KiB } from './lib.mjs';

const raw = parseCsv(gunzipSync(readFileSync(`${here}sources/sdss-dr18-redshift-slice.csv.gz`)).toString());
const cands = [
  ['A', 0.5, 0.2], ['B', 0.5, 0.15], ['C', 0.5, 0.12],
  ['D', 0.25, 0.2], ['E', 0.25, 0.15], ['F', 0.25, 0.12],
];
const log = [];
let chosen = null;
for (const [name, dmax, zmax] of cands) {
  const sel = raw.filter(r => +r.dec >= 0 && +r.dec < dmax && +r.z <= zmax);
  const rs = sel.map(r => ({ ra: Math.round(+r.ra * 1e4), z: Math.round(+r.z * 1e8), zraw: +r.z, raw: r }));
  rs.sort((a, b) => a.ra - b.ra || a.z - b.z);
  const d = {
    id: 'sdss-dr18-redshift-slice',
    n: rs.length,
    strip: { dec: [0, dmax], ra: [120, 240], zMax: zmax },
    units: { ra: 1e-4, z: 1e-8 },
    ra: deltas(rs.map(r => r.ra)),
    z: rs.map(r => r.z),
  };
  const m = writeDerived('sdss-dr18-redshift-slice.try', d);
  const ok = m.raw <= 48 * KiB && m.gzip <= 20 * KiB;
  log.push({ name, dmax, zmax, n: rs.length, raw: m.raw, gzip: m.gzip, ok });
  if (ok && !chosen) chosen = { name, d, rs, sel };
}
if (!chosen) {
  writeResult('sdss-dr18-redshift-slice', { chosen: null, candidates: log });
  console.log('sdss slice: nothing fits', JSON.stringify(log));
} else {
  const m = writeDerived('sdss-dr18-redshift-slice', chosen.d);
  const zs = undelta(chosen.d.ra) && chosen.d.z.map(v => v * 1e-8);
  const rawMean = mean(chosen.sel.map(r => +r.z));
  writeResult('sdss-dr18-redshift-slice', {
    chosen: chosen.name,
    bytes: { raw: m.raw, gzip: m.gzip, sha256: m.sha256 },
    ceilings: { rawKiB: 48, gzipKiB: 20 },
    candidates: log,
    rawRowsInQuery: raw.length,
    fidelity: { meanZ: { shipped: mean(zs), raw: rawMean, rel: Math.abs(mean(zs) - rawMean) / rawMean } },
  });
  console.log('sdss slice', chosen.name, chosen.d.n, m.raw, m.gzip, Math.abs(mean(zs) - rawMean) / rawMean);
}
