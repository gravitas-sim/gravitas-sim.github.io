// Faber-Jackson sample from SDSS DR18 early types (public domain). Raw:
// sources/sdss-dr18-early-types.csv.gz (query in fetch-sdss.mjs).
// Declared before any run: volume-limited cut z 0.02..0.07 and M_r < -19.5;
// M_r = petroMag_r - extinction_r - mu(z) with mu from the kernel, flat
// Lambda-CDM, Om 0.3, H0 70, no K-correction (stated, small at z < 0.07).
// Thinning: every k-th row by specObjID, smallest k keeping both ceilings
// (12 KiB raw, 5 KiB gzip). Derivative: sigma (km/s, 1 decimal as x10 integer)
// and M_r (x100 integer); z is not shipped, M_r is.
// R6 target, fixed in advance: Bernardi et al. 2003 (AJ 125, 1849 is Paper III;
// Paper II, astro-ph/0301624) print sigma ~ L^(0.25 +- 0.012). With
// log10 sigma = s * M + c, the exponent is a = -s / 0.4. Pass if
// |a - 0.25| <= 0.012, fitting log10 sigma on M_r (the <sigma|L> direction).
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { here, parseCsv, writeDerived, writeResult, ols, KiB } from './lib.mjs';
import { createCosmology } from './flrw.mjs';

const cos = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
const raw = parseCsv(gunzipSync(readFileSync(`${here}sources/sdss-dr18-early-types.csv.gz`)).toString());
const all = raw
  .map(r => ({ z: +r.z, sig: +r.velDisp, m: +r.petroMag_r - +r.extinction_r - cos.distanceModulus(+r.z) }))
  .filter(r => r.z >= 0.02 && r.z <= 0.07 && r.m < -19.5);
const fitOf = rs => {
  const f = ols(rs.map(r => r.m), rs.map(r => Math.log10(r.sig)));
  return { n: rs.length, slope: f.b, a: -f.b / 0.4, seA: f.seB / 0.4 };
};
const full = fitOf(all);
let chosen = null;
const log = [];
for (let k = 1; k <= 40 && !chosen; k++) {
  const rs = all.filter((_, i) => i % k === 0);
  const d = { id: 'sdss-dr18-faber-jackson', n: rs.length, units: { sigma: 0.1, M_r: 0.01 }, sigma: rs.map(r => Math.round(r.sig * 10)), M_r: rs.map(r => Math.round(r.m * 100)) };
  const m = writeDerived('sdss-dr18-faber-jackson', d);
  const ok = m.raw <= 12 * KiB && m.gzip <= 5 * KiB;
  log.push({ k, n: rs.length, raw: m.raw, gzip: m.gzip, ok });
  if (ok) chosen = { k, rs, d, m };
}
const shipped = chosen.rs.map(r => ({ sig: Math.round(r.sig * 10) / 10, m: Math.round(r.m * 100) / 100 }));
const f = ols(shipped.map(r => r.m), shipped.map(r => Math.log10(r.sig)));
const a = -f.b / 0.4;
writeResult('sdss-dr18-faber-jackson', {
  queryRows: raw.length,
  volumeLimitedRows: all.length,
  fullFit: full,
  thinning: log.slice(-1)[0],
  shippedFit: { n: shipped.length, a, seA: f.seB / 0.4 },
  published: { a: 0.25, err: 0.012, ref: 'Bernardi et al. 2003, astro-ph/0301624 (Paper II), abstract' },
  r6Pass: Math.abs(a - 0.25) <= 0.012,
  bytes: { raw: chosen.m.raw, gzip: chosen.m.gzip, sha256: chosen.m.sha256 },
  ceilings: { rawKiB: 12, gzipKiB: 5 },
});
console.log('faber-jackson full a', full.a.toFixed(3), 'shipped a', a.toFixed(3), 'n', shipped.length, chosen.m.raw, chosen.m.gzip, 'k', chosen.k);
