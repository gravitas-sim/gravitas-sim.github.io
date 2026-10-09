// SPIKE (Prompt 87), not production. The renderer's frame: one 3x3 matrix per
// instant (precession, nutation, sidereal rotation, the site's latitude), so a
// star is nine multiplications, an arcsine, an arctangent and the refraction.
// Annual aberration (20.5 arcseconds, 0.35 arcminute at most) is left out, and
// that is stated: it is under a thousandth of the drawing's width. The accuracy
// chain with aberration is coords.js makeFrame/observed (measure.mjs T2.3).
import { precessionAngles, nutation, meanObliquityDeg, gastDeg, ttFromUt, wrap360 } from './time.js';
import { refractionFromTrue } from './coords.js';
const DEG = Math.PI / 180, RAD = 180 / Math.PI;
const Rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; };
const Ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
const Rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
const mul = (a, b) => { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j]; return o; };

/** Unit vector of J2000 RA/Dec (degrees). */
export const unitVector = (raDeg, decDeg) => { const a = raDeg * DEG, d = decDeg * DEG, c = Math.cos(d); return [c * Math.cos(a), c * Math.sin(a), Math.sin(d)]; };

/** @returns {(x:number,y:number,z:number)=>{altDeg,azDeg,altGeomDeg}} for J2000 unit vectors */
export function makeFastFrame(o) {
  const jdTt = o.dtSec != null ? o.jdUt + o.dtSec / 86400 : ttFromUt(o.jdUt);
  const { zeta, z, theta } = precessionAngles(jdTt);
  const { dpsiArcsec, depsArcsec } = nutation(jdTt);
  const eps = meanObliquityDeg(jdTt) * DEG;
  const P = mul(Rz(-z), mul(Ry(theta), Rz(-zeta)));
  const N = mul(Rx(-(eps + (depsArcsec / 3600) * DEG)), mul(Rz(-(dpsiArcsec / 3600) * DEG), Rx(eps)));
  const lst = (gastDeg(o.jdUt, jdTt) + o.lonDeg) * DEG;
  const phi = o.latDeg * DEG, sp = Math.sin(phi), cp = Math.cos(phi);
  const Hh = [0, 1, 0, -sp, 0, cp, cp, 0, sp]; // rows: East, North, Up from the hour-angle frame
  const M = mul(Hh, mul(Rz(lst), mul(N, P)));
  const press = o.pressureHpa ?? 1010, temp = o.tempC ?? 10;
  return (x, y, zc) => {
    const E = M[0] * x + M[1] * y + M[2] * zc, Nn = M[3] * x + M[4] * y + M[5] * zc, U = M[6] * x + M[7] * y + M[8] * zc;
    const altG = Math.asin(Math.max(-1, Math.min(1, U))) * RAD;
    const alt = press > 0 ? altG + refractionFromTrue(altG, press, temp) : altG;
    return { altDeg: alt, altGeomDeg: altG, azDeg: wrap360(Math.atan2(E, Nn) * RAD) };
  };
}
