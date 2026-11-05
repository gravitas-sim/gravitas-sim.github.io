// =============================================================================
// Galaxy morphology kernel: elliptical apertures, the curve of growth, the Petrosian radius (S3 to S6)
// -----------------------------------------------------------------------------
// accumulate()     flux, area and variance of sub-pixels in bins of the elliptical radius m
//                  m = sqrt(u^2 + (v / q)^2), u along the major axis at angle pa (radians, from +x in
//                  array coordinates), v across it; s by s sub-pixels per pixel, flux spread uniformly
// cumAt(), radiusAt()   the cumulative curve and its inverse (first crossing, linear inside a bin)
// petrosian()      eta(a) = <I>(0.8 a to 1.25 a) / <I>(< a), first crossing of the contract's level
// momentsInside()  centre and second moments of the flux inside an ellipse, weights from the sub-pixel count
// Pure: no DOM, no clock.
// =============================================================================

import { RULE } from './constants.js';

const { Math, Float64Array } = globalThis;

/** The largest semi-major axis whose ellipse stays inside the frame less the rim. */
export function aLimit(g, W, H, rim) {
  const c = Math.cos(g.pa);
  const s = Math.sin(g.pa);
  const kx = Math.sqrt(c * c + g.q * g.q * s * s);
  const ky = Math.sqrt(s * s + g.q * g.q * c * c);
  return Math.min(
    (g.x - (rim - 0.5)) / kx,
    (W - rim - 0.5 - g.x) / kx,
    (g.y - (rim - 0.5)) / ky,
    (H - rim - 0.5 - g.y) / ky
  );
}

/** Flux, area and variance in bins of m, with prefix sums. */
export function accumulate(
  sub,
  variance,
  W,
  H,
  g,
  mMax,
  s = RULE.subSamples,
  dm = RULE.binPixels
) {
  const nb = Math.ceil(mMax / dm) + 1;
  const flux = new Float64Array(nb);
  const area = new Float64Array(nb);
  const vari = new Float64Array(nb);
  const c = Math.cos(g.pa);
  const si = Math.sin(g.pa);
  const iq = 1 / g.q;
  const w = 1 / (s * s);
  const idm = 1 / dm;
  const off = new Float64Array(s);
  for (let a = 0; a < s; a++) off[a] = (a + 0.5) / s - 0.5;
  const r = mMax + 1.5;
  const i0 = Math.max(0, Math.floor(g.x - r));
  const i1 = Math.min(W - 1, Math.ceil(g.x + r));
  const j0 = Math.max(0, Math.floor(g.y - r));
  const j1 = Math.min(H - 1, Math.ceil(g.y + r));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const k = j * W + i;
      const val = sub[k] * w;
      const vv = variance[k] * w;
      for (let b = 0; b < s; b++) {
        const y = j + off[b] - g.y;
        for (let a = 0; a < s; a++) {
          const x = i + off[a] - g.x;
          const u = x * c + y * si;
          const v = (-x * si + y * c) * iq;
          const m = Math.sqrt(u * u + v * v);
          const bin = (m * idm) | 0;
          if (bin < nb) {
            flux[bin] += val;
            area[bin] += w;
            vari[bin] += vv;
          }
        }
      }
    }
  const prefix = bins => {
    const out = new Float64Array(nb + 1);
    for (let k = 0; k < nb; k++) out[k + 1] = out[k] + bins[k];
    return out;
  };
  return {
    nb,
    dm,
    flux,
    cumFlux: prefix(flux),
    cumArea: prefix(area),
    cumVar: prefix(vari),
  };
}

const interp = (cum, bins, dm, a) => {
  if (!(a > 0)) return 0;
  const t = a / dm;
  const k = Math.floor(t);
  if (k >= bins) return cum[bins];
  return cum[k] + (t - k) * (cum[k + 1] - cum[k]);
};

export const fluxAt = (h, a) => interp(h.cumFlux, h.nb, h.dm, a);
export const areaAt = (h, a) => interp(h.cumArea, h.nb, h.dm, a);
export const varAt = (h, a) => interp(h.cumVar, h.nb, h.dm, a);

/** The first semi-major axis at which the cumulative flux reaches f, or NaN. */
export function radiusAt(h, f) {
  const cum = h.cumFlux;
  for (let k = 0; k < h.nb; k++)
    if (cum[k + 1] >= f && cum[k + 1] > cum[k])
      return (k + (f - cum[k]) / (cum[k + 1] - cum[k])) * h.dm;
  return NaN;
}

/**
 * The Petrosian radius: the first grid radius at which eta falls to the level, interpolated in log a.
 * @returns {number} the radius, or NaN when eta stays above the level up to the largest radius that fits
 */
export function petrosian(h, aMax, fwhm, rule = RULE) {
  const [f0, f1] = rule.annulusFactors;
  let prevA = NaN;
  let prevEta = NaN;
  for (
    let a = rule.gridStartFwhm * fwhm;
    f1 * a <= aMax;
    a *= rule.radiusGridRatio
  ) {
    const inside = fluxAt(h, a) / areaAt(h, a);
    const dArea = areaAt(h, f1 * a) - areaAt(h, f0 * a);
    const ann = (fluxAt(h, f1 * a) - fluxAt(h, f0 * a)) / dArea;
    const eta = fluxAt(h, a) > 0 ? ann / inside : -Infinity;
    if (eta <= rule.petrosianEta) {
      if (!Number.isFinite(prevEta)) return a;
      const t = (prevEta - rule.petrosianEta) / (prevEta - eta);
      const tt = Number.isFinite(t) ? t : 1;
      return Math.exp(Math.log(prevA) + tt * (Math.log(a) - Math.log(prevA)));
    }
    prevA = a;
    prevEta = eta;
  }
  return NaN;
}

/** The flux-weighted centre and second moments inside the ellipse of semi-major axis A (sub-pixel weights). */
export function momentsInside(sub, W, H, g, A, s = RULE.subSamples) {
  const c = Math.cos(g.pa);
  const si = Math.sin(g.pa);
  const iq = 1 / g.q;
  const w = 1 / (s * s);
  const off = new Float64Array(s);
  for (let a = 0; a < s; a++) off[a] = (a + 0.5) / s - 0.5;
  const r = A + 1.5;
  const i0 = Math.max(0, Math.floor(g.x - r));
  const i1 = Math.min(W - 1, Math.ceil(g.x + r));
  const j0 = Math.max(0, Math.floor(g.y - r));
  const j1 = Math.min(H - 1, Math.ceil(g.y + r));
  const wt = new Float64Array((i1 - i0 + 1) * (j1 - j0 + 1));
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      let count = 0;
      for (let b = 0; b < s; b++) {
        const y = j + off[b] - g.y;
        for (let a = 0; a < s; a++) {
          const x = i + off[a] - g.x;
          const u = x * c + y * si;
          const v = (-x * si + y * c) * iq;
          if (u * u + v * v <= A * A) count++;
        }
      }
      const weight = count * w * sub[j * W + i];
      wt[n++] = weight;
      sw += weight;
      sx += weight * i;
      sy += weight * j;
    }
  if (!(sw > 0)) return null;
  const x = sx / sw;
  const y = sy / sw;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  n = 0;
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const weight = wt[n++];
      const dx = i - x;
      const dy = j - y;
      sxx += weight * dx * dx;
      sxy += weight * dx * dy;
      syy += weight * dy * dy;
    }
  return { x, y, sxx: sxx / sw, sxy: sxy / sw, syy: syy / sw, flux: sw };
}
