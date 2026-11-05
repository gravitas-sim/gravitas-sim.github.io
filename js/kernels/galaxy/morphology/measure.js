// =============================================================================
// Galaxy morphology kernel: the measurement (S3 to S12 of MORPH-RULE-1, GALAXY_MORPHOLOGY.md)
// -----------------------------------------------------------------------------
// measureGalaxy(frame, options) -> a result:
//   status 'ok'            geometry, total flux and magnitude, sizes, concentration, asymmetry, the profile and
//                          the isophotes, each number with a sigma from noise injection through the pipeline
//   status 'unresolved'    the source is no larger than the PSF allows to say: the total stands, the size is an
//                          upper limit, no size claim
//   status 'refused'       a code: not-a-frame, no-sky, sky-not-flat, no-source, low-signal,
//                          petrosian-not-reached, frame-too-small, growth-failed, band-mismatch
//
// What it assumes (and the validation says what it costs): independent pixel noise with the variance map
// given; a round Gaussian PSF of the declared FWHM, never deconvolved; concentric similar isophotes inside
// 2 r_P; a rim that is sky; the 'total' is the Petrosian flux inside 2 r_P, a fraction of the Sersic total
// that falls with n. A measured size is a size in the image as observed. Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../../statistics/check.js';
import { covarianceInterval } from '../../statistics/intervals.js';
import { stream, gaussian } from '../../../random/streams.js';
import { RULE, MAG_PER_LN } from './constants.js';
import { checkFrame, skyOf, startOf, eigenShape } from './frame.js';
import {
  aLimit,
  accumulate,
  fluxAt,
  areaAt,
  varAt,
  radiusAt,
  petrosian,
  momentsInside,
} from './growth.js';

const { Math, Float64Array } = globalThis;

const RAD = Math.PI / 180;
const wrapPa = pa => {
  let d = pa % Math.PI;
  if (d < 0) d += Math.PI;
  return d;
};

/** Sky-subtracted copy of the values. */
function subtract(values, level) {
  const out = new Float64Array(values.length);
  for (let i = 0; i < out.length; i++) out[i] = values[i] - level;
  return out;
}

/** S3 to S5: the fixed point of the second moments inside 2 r_P, and the totals at it. */
function fixedPoint(sub, variance, W, H, rim, fwhm, start, maxPasses) {
  let g = { x: start.x, y: start.y, q: start.q, pa: start.pa };
  let passes = 0;
  let converged = false;
  let last = null;
  for (; passes < maxPasses; passes++) {
    const lim = aLimit(g, W, H, rim);
    if (!(lim > 2 * fwhm))
      return refused(
        'frame-too-small',
        'the source is too close to the rim for any aperture'
      );
    const h = accumulate(sub, variance, W, H, g, lim);
    const rP = petrosian(h, lim, fwhm);
    if (!Number.isFinite(rP))
      return refused(
        'petrosian-not-reached',
        'eta never fell to the Petrosian level inside the frame less its rim: the galaxy fills the frame or is too faint'
      );
    if (RULE.totalRadiusFactor * rP > lim)
      return refused(
        'frame-too-small',
        'twice the Petrosian radius does not fit between the centre and the rim'
      );
    const m = momentsInside(sub, W, H, g, RULE.totalRadiusFactor * rP);
    if (!m)
      return refused(
        'no-source',
        'the flux inside the aperture is not positive'
      );
    const shape = eigenShape(m.sxx, m.sxy, m.syy);
    if (!(shape.q > 0))
      return refused('no-source', 'the second moments are degenerate');
    const next = { x: m.x, y: m.y, q: Math.min(shape.q, 1), pa: shape.pa };
    let dpa = Math.abs(next.pa - g.pa);
    dpa = Math.min(dpa, Math.PI - dpa);
    const done =
      Math.abs(next.q - g.q) < RULE.tolQ &&
      (dpa < RULE.tolPaDeg * RAD || next.q > 0.995) &&
      Math.hypot(next.x - g.x, next.y - g.y) < RULE.tolCentre;
    last = { h, rP };
    g = next;
    if (done) {
      converged = true;
      passes++;
      break;
    }
  }
  // the totals at the final shape
  const lim = aLimit(g, W, H, rim);
  const h = accumulate(sub, variance, W, H, g, lim);
  const rP = petrosian(h, lim, fwhm);
  if (!Number.isFinite(rP) || RULE.totalRadiusFactor * rP > lim)
    return refused(
      'frame-too-small',
      'twice the Petrosian radius does not fit between the centre and the rim'
    );
  void last;
  return { g, h, rP, passes, converged, lim };
}

/** Circular-aperture asymmetry about the centre minimising it, minus the background term. */
function asymmetryOf(sub, W, H, g, R, patchFrac) {
  if (g.x - R < 1 || g.y - R < 1 || g.x + R > W - 2 || g.y + R > H - 2)
    return { status: 'not-constrained', code: 'circle-outside-frame' };
  const xs = [];
  const ys = [];
  for (let j = Math.floor(g.y - R); j <= Math.ceil(g.y + R); j++)
    for (let i = Math.floor(g.x - R); i <= Math.ceil(g.x + R); i++)
      if (Math.hypot(i - g.x, j - g.y) <= R) {
        xs.push(i);
        ys.push(j);
      }
  const n = xs.length;
  const bil = (rx, ry) => {
    const i0 = Math.floor(rx);
    const j0 = Math.floor(ry);
    if (i0 < 0 || j0 < 0 || i0 + 1 >= W || j0 + 1 >= H) return null;
    const fx = rx - i0;
    const fy = ry - j0;
    const k = j0 * W + i0;
    return (
      sub[k] * (1 - fx) * (1 - fy) +
      sub[k + 1] * fx * (1 - fy) +
      sub[k + W] * (1 - fx) * fy +
      sub[k + W + 1] * fx * fy
    );
  };
  const sumAbs = (px, py, cx, cy, withNorm) => {
    let d = 0;
    let t = 0;
    for (let p = 0; p < px.length; p++) {
      const v = sub[py[p] * W + px[p]];
      const r = bil(2 * cx - px[p], 2 * cy - py[p]);
      if (r === null) continue;
      d += Math.abs(v - r);
      if (withNorm) t += Math.abs(v);
    }
    return { d, t };
  };
  const A = (cx, cy) => {
    const s = sumAbs(xs, ys, cx, cy, true);
    return s.t > 0 ? s.d / s.t : NaN;
  };
  let cx = g.x;
  let cy = g.y;
  let best = A(cx, cy);
  if (!Number.isFinite(best))
    return { status: 'not-constrained', code: 'no-flux' };
  let step = 0.5;
  for (let level = 0; level < 8; level++) {
    for (let moves = 0; moves < 20; moves++) {
      let improved = false;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const a = A(cx + dx * step, cy + dy * step);
          if (a < best) {
            best = a;
            cx += dx * step;
            cy += dy * step;
            improved = true;
          }
        }
      if (!improved) break;
    }
    step /= 2;
  }
  // the background patch: the corner circle farthest from the galaxy that fits, with the same fractional offset
  const norm = sumAbs(xs, ys, cx, cy, true).t;
  const corners = [
    [R + 2, R + 2],
    [W - 3 - R, R + 2],
    [R + 2, H - 3 - R],
    [W - 3 - R, H - 3 - R],
  ]
    .map(([x, y]) => [Math.round(x), Math.round(y)])
    .filter(
      ([x, y]) => x - R >= 1 && y - R >= 1 && x + R <= W - 2 && y + R <= H - 2
    )
    .sort(
      (a, b) =>
        Math.hypot(b[0] - cx, b[1] - cy) - Math.hypot(a[0] - cx, a[1] - cy)
    );
  if (
    !corners.length ||
    Math.hypot(corners[0][0] - cx, corners[0][1] - cy) < 2 * R
  )
    return {
      status: 'not-constrained',
      code: 'no-background-patch',
      raw: best,
      centre: { x: cx, y: cy },
    };
  const [px0, py0] = corners[0];
  const pcx = px0 + patchFrac.x;
  const pcy = py0 + patchFrac.y;
  const px = [];
  const py = [];
  for (let j = Math.floor(pcy - R); j <= Math.ceil(pcy + R); j++)
    for (let i = Math.floor(pcx - R); i <= Math.ceil(pcx + R); i++)
      if (Math.hypot(i - pcx, j - pcy) <= R) {
        px.push(i);
        py.push(j);
      }
  const bg = sumAbs(px, py, pcx, pcy, false).d * (n / px.length);
  const background = bg / norm;
  return {
    status: 'ok',
    value: best - background,
    raw: best,
    background,
    centre: { x: cx, y: cy },
  };
}

/** The isophote annuli: axis ratio and angle from the second moments of the flux in each annulus. */
function isophotesOf(sub, W, H, g, rP, fwhm) {
  const k = RULE.isophoteAnnuli;
  const e0 = fwhm;
  const e1 = RULE.totalRadiusFactor * rP;
  const edges = Array.from(
    { length: k + 1 },
    (_, j) => e0 * (e1 / e0) ** (j / k)
  );
  const acc = Array.from({ length: k }, () => ({ s: 0, xx: 0, xy: 0, yy: 0 }));
  const c = Math.cos(g.pa);
  const si = Math.sin(g.pa);
  const iq = 1 / g.q;
  const r = e1 + 1.5;
  for (
    let j = Math.max(0, Math.floor(g.y - r));
    j <= Math.min(H - 1, Math.ceil(g.y + r));
    j++
  )
    for (
      let i = Math.max(0, Math.floor(g.x - r));
      i <= Math.min(W - 1, Math.ceil(g.x + r));
      i++
    ) {
      const dx = i - g.x;
      const dy = j - g.y;
      const u = dx * c + dy * si;
      const v = (-dx * si + dy * c) * iq;
      const m = Math.sqrt(u * u + v * v);
      if (m < e0 || m >= e1) continue;
      let lo = 0;
      let hi = k - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (m >= edges[mid]) lo = mid;
        else hi = mid - 1;
      }
      const a = acc[lo];
      const val = sub[j * W + i];
      a.s += val;
      a.xx += val * dx * dx;
      a.xy += val * dx * dy;
      a.yy += val * dy * dy;
    }
  return acc.map((a, j) => {
    const base = {
      aInner: edges[j],
      aOuter: edges[j + 1],
      a: Math.sqrt(edges[j] * edges[j + 1]),
    };
    if (!(a.s > 0)) return { ...base, q: NaN, paDeg: NaN };
    const sh = eigenShape(a.xx / a.s, a.xy / a.s, a.yy / a.s);
    return { ...base, q: sh.q, paDeg: (sh.pa / RAD) % 180 };
  });
}

/** The totals of a curve of growth at twice the Petrosian radius (the aperture of S6 and S9). */
function totalsFrom(h, rP, skySigma) {
  const A = RULE.totalRadiusFactor * rP;
  const flux = fluxAt(h, A);
  const varFlux = varAt(h, A) + (areaAt(h, A) * skySigma) ** 2;
  return { flux, sigmaFlux: Math.sqrt(varFlux), h, A };
}

/** The same aperture applied to another band: its own growth curve at the first band's geometry. */
function totalsAt(sub, variance, W, H, g, rP, skySigma) {
  const A = RULE.totalRadiusFactor * rP;
  return totalsFrom(
    accumulate(sub, variance, W, H, g, A * 1.02 + 0.2),
    rP,
    skySigma
  );
}

/** One pass of the whole rule on one frame: the core of both the observed measurement and a noise draw. */
function core(image, psfFwhm, opts = {}) {
  const { width: W, height: H, variance } = image;
  const sky = skyOf(image);
  if (sky.status) return sky;
  const sub = subtract(image.values, sky.level);
  let start = opts.start;
  if (!start) {
    start = startOf(sub, variance, W, H, psfFwhm);
    if (start.status) return start;
  }
  const fp = fixedPoint(
    sub,
    variance,
    W,
    H,
    sky.rim,
    psfFwhm,
    start,
    opts.maxPasses ?? RULE.maxPasses
  );
  if (fp.status) return fp;
  const { g, h, rP } = fp;
  const tot = totalsFrom(h, rP, sky.sigma);
  const fluxT = tot.flux;
  if (!(fluxT > 0) || fluxT / tot.sigmaFlux < RULE.minSignalToNoise)
    return refused(
      'low-signal',
      'the flux inside twice the Petrosian radius is not at least 10 times its error'
    );
  const r50 = radiusAt(tot.h, 0.5 * fluxT);
  const r20 = radiusAt(tot.h, 0.2 * fluxT);
  const r80 = radiusAt(tot.h, 0.8 * fluxT);
  if (!(r20 > 0 && r50 > 0 && r80 > 0))
    return refused(
      'growth-failed',
      'the curve of growth does not reach the stated fractions'
    );
  const out = {
    status: 'ok',
    sky,
    g,
    rP,
    passes: fp.passes,
    converged: fp.converged,
    fluxT,
    sigmaFlux: tot.sigmaFlux,
    r50,
    r20,
    r80,
    r50c: r50 * Math.sqrt(g.q),
    c: 5 * Math.log10(r80 / r20),
    sub,
    h,
    frac: { x: g.x - Math.floor(g.x), y: g.y - Math.floor(g.y) },
  };
  if (!opts.skipAsymmetry)
    out.asym = asymmetryOf(sub, W, H, g, 2 * rP * Math.sqrt(g.q), {
      x: g.x - Math.floor(g.x),
      y: g.y - Math.floor(g.y),
    });
  out.isophotes = isophotesOf(sub, W, H, g, rP, psfFwhm);
  return out;
}

const sd = list => {
  const n = list.length;
  const m = list.reduce((s, v) => s + v, 0) / n;
  return Math.sqrt(list.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
};

/** Add a seeded Gaussian deviate of each pixel's true variance. */
function perturb(image, seed, label, k) {
  const draw = gaussian(stream('noise', seed, 'morphology-draw', label, k));
  const v = new Float64Array(image.values.length);
  for (let i = 0; i < v.length; i++)
    v[i] = image.values[i] + Math.sqrt(image.variance[i]) * draw();
  return { ...image, values: v };
}

/** The magnitude of a flux. */
const magOf = (flux, zeroPoint, exposure) =>
  (zeroPoint ?? 0) - 2.5 * Math.log10(flux / exposure);

/**
 * Measure a galaxy.
 * @param {{width, height, values, variance}} image frame of the reference band
 * @param {object} options
 *   psfFwhm (pixels, required), zeroPoint ({mag, source} or omit for an instrumental magnitude), exposure (s, 1),
 *   seed (0), draws (RULE.noiseDraws; 0 gives no sigmas), second ({image, psfFwhm}) for a colour, withProfile (true)
 */
export function measureGalaxy(image, options = {}) {
  const psfFwhm = options.psfFwhm;
  const bad = checkFrame(image, psfFwhm);
  if (bad) return bad;
  if (options.second) {
    const s2 = options.second;
    const b2 = checkFrame(s2.image, s2.psfFwhm);
    if (b2) return b2;
    if (s2.image.width !== image.width || s2.image.height !== image.height)
      return refused(
        'band-mismatch',
        'the second band must be on the same pixel grid as the first'
      );
  }
  const exposure = options.exposure ?? 1;
  const zp = options.zeroPoint?.mag;
  const seed = options.seed ?? 0;
  const draws = options.draws ?? RULE.noiseDraws;

  const obs = core(image, psfFwhm);
  if (obs.status !== 'ok') return obs;

  // the second band at the first band's aperture
  let second = null;
  if (options.second) {
    const s2 = options.second;
    const sky2 = skyOf(s2.image);
    if (sky2.status) return sky2;
    const sub2 = subtract(s2.image.values, sky2.level);
    const t2 = totalsAt(
      sub2,
      s2.image.variance,
      image.width,
      image.height,
      obs.g,
      obs.rP,
      sky2.sigma
    );
    if (!(t2.flux > 0))
      return refused(
        'low-signal',
        'the second band has no positive flux in the aperture'
      );
    second = {
      sky: sky2,
      flux: t2.flux,
      sigmaFlux: t2.sigmaFlux,
      psfFwhm: s2.psfFwhm,
    };
  }

  // S12: noise injection through the whole rule, from the observed solution
  const spread = {};
  let completed = 0;
  if (draws > 0) {
    const rows = [];
    for (let k = 0; k < draws; k++) {
      const p1 = perturb(image, seed, 'band1', k);
      const d = core(p1, psfFwhm, {
        start: obs.g,
        maxPasses: RULE.drawPasses,
      });
      if (d.status !== 'ok') continue;
      const row = {
        r50: d.r50,
        r50c: d.r50c,
        r20: d.r20,
        r80: d.r80,
        c: d.c,
        q: d.g.q,
        pa: d.g.pa,
        x: d.g.x,
        y: d.g.y,
        rP: d.rP,
        flux: d.fluxT,
        mag: magOf(d.fluxT, zp, exposure),
        a: d.asym?.status === 'ok' ? d.asym.value : NaN,
        iso: d.isophotes,
      };
      if (second) {
        const p2 = perturb(options.second.image, seed, 'band2', k);
        const sky2 = skyOf(p2);
        if (sky2.status) continue;
        const sub2 = subtract(p2.values, sky2.level);
        const t2 = totalsAt(
          sub2,
          p2.variance,
          image.width,
          image.height,
          d.g,
          d.rP,
          sky2.sigma
        );
        if (!(t2.flux > 0)) continue;
        row.colour = row.mag - magOf(t2.flux, zp, exposure);
      }
      rows.push(row);
    }
    completed = rows.length;
    if (completed >= RULE.minDraws) {
      for (const key of [
        'r50',
        'r50c',
        'r20',
        'r80',
        'c',
        'q',
        'x',
        'y',
        'rP',
        'flux',
        'mag',
      ])
        spread[key] = sd(rows.map(r => r[key]));
      // an angle's spread about the circular mean of the doubled angle
      const dbl = rows.map(r => 2 * r.pa);
      const cs = dbl.reduce((s, v) => s + Math.cos(v), 0) / completed;
      const sn = dbl.reduce((s, v) => s + Math.sin(v), 0) / completed;
      const mean = Math.atan2(sn, cs);
      const dev = dbl.map(v => {
        let d = v - mean;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        return d / 2;
      });
      spread.pa = Math.sqrt(
        dev.reduce((s, v) => s + v * v, 0) / (completed - 1)
      );
      const as = rows.map(r => r.a).filter(Number.isFinite);
      if (as.length >= RULE.minDraws) spread.a = sd(as);
      if (second) {
        const cs2 = rows.map(r => r.colour).filter(Number.isFinite);
        if (cs2.length >= RULE.minDraws) spread.colour = sd(cs2);
      }
      spread.isophotes = obs.isophotes.map((_, j) => {
        const qs = rows.map(r => r.iso[j].q).filter(Number.isFinite);
        return qs.length >= RULE.minDraws ? sd(qs) : NaN;
      });
    }
  }
  const flags = [];
  if (draws > 0 && completed < RULE.minDraws)
    flags.push('unstable-uncertainty');
  if (draws === 0) flags.push('no-uncertainty');
  if (zp === undefined) flags.push('no-zero-point');
  const sigma = key => spread[key] ?? NaN;

  const g = obs.g;
  const r50c = obs.r50c;
  const sR50c = sigma('r50c');
  const psfHalf = psfFwhm / 2;
  const unresolved =
    r50c <
    RULE.unresolvedFactor * psfHalf + (Number.isFinite(sR50c) ? sR50c : 0);

  const mag = magOf(obs.fluxT, zp, exposure);
  const sMag = MAG_PER_LN * (obs.sigmaFlux / obs.fluxT);
  const iv = (v, s) => (Number.isFinite(s) ? covarianceInterval(v, s) : null);
  const result = {
    status: unresolved ? 'unresolved' : 'ok',
    flags,
    label: 'measured in the image as observed, PSF included',
    uncertainty: { method: 'noise-injection', draws, completed },
    sky: { level: obs.sky.level, sigma: obs.sky.sigma },
    geometry: {
      x: g.x,
      y: g.y,
      q: g.q,
      paDeg: (wrapPa(g.pa) / RAD) % 180,
      rPetrosian: obs.rP,
      passes: obs.passes,
      converged: obs.converged,
      sigma: {
        x: sigma('x'),
        y: sigma('y'),
        q: sigma('q'),
        paDeg: sigma('pa') / RAD,
        rPetrosian: sigma('rP'),
      },
    },
    total: {
      flux: obs.fluxT,
      sigmaFlux: obs.sigmaFlux,
      sigmaFluxInjection: sigma('flux'),
      magnitude: mag,
      sigmaMagnitude: Number.isFinite(sigma('mag'))
        ? Math.max(sigma('mag'), sMag)
        : sMag,
      instrumental: zp === undefined,
      zeroPointSource: options.zeroPoint?.source ?? null,
    },
    concentration: { value: obs.c, sigma: sigma('c') },
    asymmetry:
      obs.asym.status === 'ok'
        ? {
            status: 'ok',
            value: obs.asym.value,
            raw: obs.asym.raw,
            background: obs.asym.background,
            sigma: sigma('a'),
          }
        : { status: obs.asym.status, code: obs.asym.code },
    isophotes: obs.isophotes.map((o, j) => ({
      ...o,
      sigmaQ: spread.isophotes ? spread.isophotes[j] : NaN,
    })),
  };
  if (unresolved) {
    result.size = {
      status: 'unresolved',
      upperLimit: r50c + 2 * (Number.isFinite(sR50c) ? sR50c : 0),
      psfHalfLightRadius: psfHalf,
    };
  } else {
    result.size = {
      status: 'ok',
      r50: obs.r50,
      r50Circular: r50c,
      r20: obs.r20,
      r80: obs.r80,
      sigma: {
        r50: sigma('r50'),
        r50Circular: sR50c,
        r20: sigma('r20'),
        r80: sigma('r80'),
      },
      interval: iv(obs.r50, sigma('r50')),
      psfHalfLightRadius: psfHalf,
    };
  }
  result.magnitudeInterval = iv(mag, result.total.sigmaMagnitude);
  if (options.withProfile !== false)
    result.profile = profileOf(obs, psfFwhm, zp, exposure);
  if (second) {
    const m2 = magOf(second.flux, zp, exposure);
    const sColour = Number.isFinite(sigma('colour'))
      ? sigma('colour')
      : MAG_PER_LN *
        Math.hypot(obs.sigmaFlux / obs.fluxT, second.sigmaFlux / second.flux);
    const ratio = second.psfFwhm / psfFwhm;
    const f2 = [...flags];
    if (ratio < 0.8 || ratio > 1.25) f2.push('psf-mismatch');
    result.colour = {
      value: mag - m2,
      sigma: sColour,
      secondMagnitude: m2,
      interval: iv(mag - m2, sColour),
      flags: f2.filter(f => f === 'psf-mismatch'),
    };
  }
  return result;
}

/** S7: the surface-brightness profile in log-spaced elliptical annuli. */
function profileOf(obs, fwhm, zp, exposure) {
  const k = RULE.profileAnnuli;
  const e0 = 0.5 * fwhm;
  const e1 = RULE.totalRadiusFactor * obs.rP;
  const out = [];
  for (let j = 0; j < k; j++) {
    const lo = e0 * (e1 / e0) ** (j / k);
    const hi = e0 * (e1 / e0) ** ((j + 1) / k);
    const area = areaAt(obs.h, hi) - areaAt(obs.h, lo);
    if (!(area > 0)) continue;
    const flux = fluxAt(obs.h, hi) - fluxAt(obs.h, lo);
    const sb = flux / area;
    const sigma = Math.sqrt(
      (varAt(obs.h, hi) - varAt(obs.h, lo)) / (area * area) + obs.sky.sigma ** 2
    );
    out.push({
      aInner: lo,
      aOuter: hi,
      a: Math.sqrt(lo * hi),
      area,
      surfaceBrightness: sb,
      sigma,
      signalToNoise: sb / sigma,
      interval: covarianceInterval(sb, sigma),
      magPerPixel2: sb > 0 ? magOf(sb, zp, exposure) : null,
    });
  }
  return out;
}
