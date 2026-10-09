// SPIKE (Prompt 87). T4.2-T4.5 numbers for the candidate subset. usage: node tools/check-catalogue.mjs <stars.json> <pmsafe_ref.json>
import fs from 'node:fs';
import { unpack, atEpoch } from '../lib/stars.js';
const [starsF, refF] = process.argv.slice(2);
const doc = JSON.parse(fs.readFileSync(starsF));
const ref = JSON.parse(fs.readFileSync(refF));
const DEG = Math.PI / 180;
const sep = (r1, d1, r2, d2) => Math.acos(Math.min(1, Math.sin(d1 * DEG) * Math.sin(d2 * DEG) + Math.cos(d1 * DEG) * Math.cos(d2 * DEG) * Math.cos((r1 - r2) * DEG))) / DEG;
let w0 = 0, wE = { 1900: 0, 2050: 0, 2100: 0 }, worst = {};
for (const row of doc.stars) {
  const s = unpack(row), r = ref[s.hr];
  w0 = Math.max(w0, sep(s.raDeg, s.decDeg, r.ra0, r.dec0) * 3600);
  for (const y of [1900, 2050, 2100]) {
    const jd = 2451545.0 + (y - 2000) * 365.25;
    const p = atEpoch(s, jd);
    const e = sep(p.raDeg, p.decDeg, r.at[y][0], r.at[y][1]) * 60;
    if (e > wE[y]) { wE[y] = e; worst[y] = s.hr + ' ' + s.bayer; }
  }
}
console.log(JSON.stringify({ stars: doc.stars.length, storedVsSourceJ2000_arcsec_max: +w0.toFixed(3), epochErr_arcmin_max: wE, worst }));
