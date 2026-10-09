// Coma cluster members from SDSS DR18 spectroscopy (public domain). Raw:
// sources/sdss-dr18-coma-field.csv.gz (box ra 187..203, dec 25.5..30.5, cz
// 4000..10000 km/s, Legacy main sample). Declared before any run:
//   centre (194.953, 27.981) deg (Abell 1656, NED); members within 1.5 deg;
//   cz = c z (heliocentric, as SDSS gives); window 4000..10000 km/s;
//   iterative 3-sigma clipping (mean and standard deviation of the survivors,
//   repeated until the set is unchanged), as Colless & Dunn (1996) do;
//   sigma_cz = clipped standard deviation / 0.983 (their correction for a
//   3-sigma-clipped Gaussian).
// R6 target, fixed in advance: Colless & Dunn 1996 (ApJ 458, 435) print
// sigma_cz = 1038 +- 60 km/s and cz = 6917 +- 47 km/s for 465 galaxies.
// Pass if |sigma_cz - 1038| <= 60.
// Derivative: ra, dec as integers x1e4 relative to the centre rounded, z x1e8.
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { here, parseCsv, writeDerived, writeResult, mean, sd, KiB } from './lib.mjs';

const C = 299792.458;
const raw = parseCsv(gunzipSync(readFileSync(`${here}sources/sdss-dr18-coma-field.csv.gz`)).toString());
const RA0 = 194.953;
const DEC0 = 27.981;
const sep = (ra, dec) => {
  const r = Math.PI / 180;
  const c = Math.sin(dec * r) * Math.sin(DEC0 * r) + Math.cos(dec * r) * Math.cos(DEC0 * r) * Math.cos((ra - RA0) * r);
  return Math.acos(Math.min(1, c)) / r;
};
let s = raw.map(r => ({ ra: +r.ra, dec: +r.dec, z: +r.z, cz: +r.z * C })).filter(
  r => sep(r.ra, r.dec) <= 1.5 && r.cz >= 4000 && r.cz <= 10000
);
const inWindow = s.length;
for (;;) {
  const m = mean(s.map(r => r.cz));
  const d = sd(s.map(r => r.cz));
  const keep = s.filter(r => Math.abs(r.cz - m) <= 3 * d);
  if (keep.length === s.length) break;
  s = keep;
}
const cz = s.map(r => r.cz);
const sigmaCz = sd(cz) / 0.983;
const members = s.slice().sort((a, b) => a.z - b.z);
const d = {
  id: 'sdss-dr18-coma-members',
  n: members.length,
  centre: [RA0, DEC0],
  units: { dra: 1e-4, ddec: 1e-4, z: 1e-8 },
  dra: members.map(r => Math.round((r.ra - RA0) * 1e4)),
  ddec: members.map(r => Math.round((r.dec - DEC0) * 1e4)),
  z: members.map(r => Math.round(r.z * 1e8)),
};
const m = writeDerived('sdss-dr18-coma-members', d);
const shippedCz = d.z.map(v => (v * 1e-8) * C);
const sigmaShipped = sd(shippedCz) / 0.983;
writeResult('sdss-dr18-coma-members', {
  fieldRows: raw.length,
  inWindowWithin1p5deg: inWindow,
  members: s.length,
  meanCz: mean(cz),
  sigmaCzClippedSd: sd(cz),
  sigmaCz: sigmaCz,
  sigmaRestFrame: sigmaCz / (1 + mean(cz) / C),
  published: { sigmaCz: 1038, err: 60, meanCz: 6917, meanErr: 47, n: 465, ref: 'Colless & Dunn 1996, ApJ 458, 435' },
  r6Pass: Math.abs(sigmaCz - 1038) <= 60,
  fidelity: { sigmaShipped, rel: Math.abs(sigmaShipped - sigmaCz) / sigmaCz },
  bytes: { raw: m.raw, gzip: m.gzip, sha256: m.sha256 },
  ceilings: { rawKiB: 16, gzipKiB: 7, ok: m.raw <= 16 * KiB && m.gzip <= 7 * KiB },
});
console.log('coma', s.length, 'sigma', sigmaCz.toFixed(1), 'mean', mean(cz).toFixed(1), m.raw, m.gzip);
