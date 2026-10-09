// SPIKE (Prompt 87), not production. Catalogue stars: unpack and move to an epoch.
const DEG = Math.PI / 180;
/** Unpack a compact row of the spike's star file to degrees. */
export const unpack = r => ({ hr: r[0], raDeg: r[1] / 1e4, decDeg: r[2] / 1e4, v: r[3] / 100, bv: r[4] == null ? null : r[4] / 100,
  pmRaArcsecYr: r[5] / 1000, pmDecArcsecYr: r[6] / 1000, bayer: r[7], name: r[8] || null });
/** Linear proper motion from J2000.0 to a date (radial motion and parallax neglected: stated). */
export function atEpoch(s, jdTt) {
  const yr = (jdTt - 2451545.0) / 365.25;
  const dec = s.decDeg + (s.pmDecArcsecYr * yr) / 3600;
  const cosd = Math.cos(((s.decDeg + dec) / 2) * DEG);
  return { raDeg: s.raDeg + (s.pmRaArcsecYr * yr) / 3600 / cosd, decDeg: dec };
}
