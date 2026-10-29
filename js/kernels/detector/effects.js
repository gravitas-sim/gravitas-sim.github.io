// =============================================================================
// What a detector does to the light, besides noise: the effects (Prompt 211)
// -----------------------------------------------------------------------------
// Four stated models that js/kernels/detector/frame.js applies when a frame spec
// carries `effects` (DETECTOR_EFFECTS.md has the equations, the assumptions and
// the validation contract; tests/fixtures/detector-effects/thresholds.json fixed
// every bound before this file existed):
//
//   nonlinearity   the response near the full well: linear up to a knee, then a
//                  tanh roll-off, continuous with a continuous slope
//   cosmic rays    straight tracks through a thin layer, a seeded rate and
//                  direction, the deposit proportional to the length in each pixel
//   bleeding       the excess of a saturated run spills along its column, filling
//                  its neighbours up to the full well, bounded in length
//   flags          one bit a pixel for each effect, the frame's own truth
//
// Everything here is a pure function of numbers and a random stream; the frame
// model owns the order in which they are applied. A real detector's curve, rate
// and spill are measured, not these: every parameter is a stated default.
// =============================================================================

const { Math, Float64Array } = globalThis;

export const VERSION = '1.0.0';

/** One bit a pixel in the flag plane. */
export const FLAG = Object.freeze({
  saturated: 1,
  bleed: 2,
  cosmic: 4,
  nonlinear: 8,
});

/** What each bit means, as the image sidecar's mask plane names them. */
export const FLAG_MEANINGS = Object.freeze([
  { value: 1, meaning: 'saturated: the charge reached the full well' },
  {
    value: 2,
    meaning: 'bleed: charge spilled into this pixel from a saturated one',
  },
  { value: 4, meaning: 'cosmic ray: an event deposited charge in this pixel' },
  { value: 8, meaning: 'nonlinear: the charge is above the linear limit' },
]);

export const DEFAULT_NONLINEARITY = Object.freeze({
  kneeFraction: 0.8,
  safeDeviation: 0.01,
});
export const DEFAULT_COSMIC = Object.freeze({
  /** electrons per pixel of path: about 80 pairs per micron times a 15 micron pixel (assumed) */
  dedxPerPixel: 1200,
  /** the layer's thickness in pixels (assumed) */
  thicknessPx: 1,
  /** the longest projected track, pixels */
  maxLengthPx: 40,
});
export const DEFAULT_BLEED = Object.freeze({ maxLengthPx: 64 });

// ---- the nonlinear response -------------------------------------------------------

function checkResponse(fullWell, kneeFraction) {
  if (!(fullWell > 0)) throw new Error('the full well is a positive number');
  if (!(kneeFraction > 0 && kneeFraction < 1))
    throw new Error(
      'the nonlinearity’s knee is a fraction of the full well between 0 and 1'
    );
}

/**
 * Recorded electrons for collected electrons `e`: e up to the knee k, then
 * k + w tanh((e - k) / w) with w = fullWell - k.
 */
export function responseCurve(e, fullWell, kneeFraction) {
  checkResponse(fullWell, kneeFraction);
  const k = kneeFraction * fullWell;
  if (e <= k) return e;
  const w = fullWell - k;
  return k + w * Math.tanh((e - k) / w);
}

/** The collected electrons that record `s`; Infinity at or above the curve's ceiling. */
export function responseInverse(s, fullWell, kneeFraction) {
  checkResponse(fullWell, kneeFraction);
  const k = kneeFraction * fullWell;
  if (s <= k) return s;
  const w = fullWell - k;
  const q = (s - k) / w;
  return q >= 1 ? Infinity : k + w * Math.atanh(q);
}

/**
 * The electrons at which the response falls below the linear one by `fraction`
 * (1 - f(e)/e), or null when it never does within the full well.
 */
export function linearLimit(fraction, fullWell, kneeFraction) {
  checkResponse(fullWell, kneeFraction);
  if (!(fraction > 0 && fraction < 1))
    throw new Error('the deviation is a fraction between 0 and 1');
  const dev = e => 1 - responseCurve(e, fullWell, kneeFraction) / e;
  if (dev(fullWell) < fraction) return null;
  let lo = kneeFraction * fullWell;
  let hi = fullWell;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (dev(mid) < fraction) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// ---- cosmic-ray tracks --------------------------------------------------------------

/**
 * The electrons a straight track puts in each pixel of a W by H frame. A track
 * is `{ x, y, phi, theta }`: its entry point (pixel centres at integers), its
 * azimuth, and its zenith angle. Projected length L = min(thickness x tan theta,
 * maxLength); the deposit in a pixel is dedx x (projected length in it) / sin
 * theta; a track shorter than 1e-9 pixel puts dedx x thickness / cos theta in
 * its entry pixel. Returns [[index, electrons], ...] for pixels inside the frame.
 */
export function trackDeposit(track, W, H, params = {}) {
  const { dedxPerPixel, thicknessPx, maxLengthPx } = {
    ...DEFAULT_COSMIC,
    ...params,
  };
  const { x: x0, y: y0, phi, theta } = track;
  const L = Math.min(thicknessPx * Math.tan(theta), maxLengthPx);
  const out = [];
  if (L < 1e-9) {
    const i = Math.floor(x0 + 0.5);
    const j = Math.floor(y0 + 0.5);
    if (i >= 0 && i < W && j >= 0 && j < H)
      out.push([j * W + i, (dedxPerPixel * thicknessPx) / Math.cos(theta)]);
    return out;
  }
  const dx = L * Math.cos(phi);
  const dy = L * Math.sin(phi);
  const x1 = x0 + dx;
  const y1 = y0 + dy;
  const per = dedxPerPixel / Math.sin(theta);
  const iLo = Math.max(0, Math.floor(Math.min(x0, x1) + 0.5) - 1);
  const iHi = Math.min(W - 1, Math.floor(Math.max(x0, x1) + 0.5) + 1);
  const jLo = Math.max(0, Math.floor(Math.min(y0, y1) + 0.5) - 1);
  const jHi = Math.min(H - 1, Math.floor(Math.max(y0, y1) + 0.5) + 1);
  for (let j = jLo; j <= jHi; j++)
    for (let i = iLo; i <= iHi; i++) {
      let lo = 0;
      let hi = 1;
      let ok = true;
      for (const [p0, d, a, b] of [
        [x0, dx, i - 0.5, i + 0.5],
        [y0, dy, j - 0.5, j + 0.5],
      ]) {
        if (Math.abs(d) < 1e-15) {
          if (!(a <= p0 && p0 <= b)) ok = false;
          continue;
        }
        let t1 = (a - p0) / d;
        let t2 = (b - p0) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        lo = Math.max(lo, t1);
        hi = Math.min(hi, t2);
      }
      if (ok && hi > lo) out.push([j * W + i, per * (hi - lo) * L]);
    }
  return out;
}

/**
 * One event's geometry from four uniform draws: entry point uniform on the frame,
 * azimuth uniform, cos(zenith) = sqrt(1 - u).
 */
export function drawTrack(rng, W, H, params = {}) {
  const { dedxPerPixel, thicknessPx, maxLengthPx } = {
    ...DEFAULT_COSMIC,
    ...params,
  };
  const x = rng() * W - 0.5;
  const y = rng() * H - 0.5;
  const phi = 2 * Math.PI * rng();
  const u = rng();
  const cosT = Math.sqrt(1 - u);
  const theta = Math.acos(cosT);
  return {
    x,
    y,
    phi,
    theta,
    length: Math.min(thicknessPx * Math.tan(theta), maxLengthPx),
    total: (dedxPerPixel * thicknessPx) / cosT,
  };
}

// ---- charge bleeding ----------------------------------------------------------------

/**
 * Spill the excess of every run of pixels above the full well along the column
 * `q` (modified in place). Each run is set to the full well; half its excess goes
 * up and half down, filling consecutive pixels to the full well (a full pixel
 * passes the charge on and counts toward the length `cap`); what is left at the
 * cap or the edge is lost. Runs in order of increasing index. `touched`, if given,
 * is set to 1 where charge arrived. Returns the electrons lost.
 */
export function bleedInPlace(q, fullWell, cap, touched = null) {
  const n = q.length;
  let lost = 0;
  for (let y = 0; y < n; y++) {
    if (!(q[y] > fullWell)) continue;
    const a = y;
    while (y + 1 < n && q[y + 1] > fullWell) y++;
    const b = y;
    let excess = 0;
    for (let i = a; i <= b; i++) excess += q[i] - fullWell;
    for (let i = a; i <= b; i++) q[i] = fullWell;
    const half = excess / 2;
    for (const [step, start] of [
      [-1, a - 1],
      [1, b + 1],
    ]) {
      let rem = half;
      let p = start;
      let count = 0;
      while (rem > 0 && count < cap && p >= 0 && p < n) {
        const take = Math.min(Math.max(0, fullWell - q[p]), rem);
        if (take > 0) {
          q[p] += take;
          if (touched) touched[p] = 1;
        }
        rem -= take;
        count++;
        p += step;
      }
      lost += rem;
    }
  }
  return lost;
}

/** A column bled, as new arrays: { after, lost, touched: [indices] }. */
export function bleedColumn(values, fullWell, cap = DEFAULT_BLEED.maxLengthPx) {
  const after = Float64Array.from(values);
  const t = new Uint8Array(after.length);
  const lost = bleedInPlace(after, fullWell, cap, t);
  const touched = [];
  for (let i = 0; i < t.length; i++) if (t[i]) touched.push(i);
  return { after, lost, touched };
}

// ---- what a caller states ---------------------------------------------------------------

const on = v => v === true || (v !== null && typeof v === 'object');

/**
 * The effects a spec asks for, completed with defaults and checked. An absent
 * key is off, except `cosmic`: absent keeps the frame model's own cosmic rays
 * (the version before this prompt), `false` removes them, `true` or an object
 * switches to the track model.
 * @returns {{nonlinearity: ?object, cosmic: ('legacy'|null|object), bleed: ?object, fwhmPx: ?number}}
 */
export function normalizeEffects(effects = {}) {
  if (effects === null || typeof effects !== 'object')
    throw new Error('effects is an object of toggles');
  const merge = (value, defaults) =>
    value === true ? { ...defaults } : { ...defaults, ...value };
  const out = {
    nonlinearity: on(effects.nonlinearity)
      ? merge(effects.nonlinearity, DEFAULT_NONLINEARITY)
      : null,
    cosmic:
      effects.cosmic === undefined
        ? 'legacy'
        : on(effects.cosmic)
          ? merge(effects.cosmic, DEFAULT_COSMIC)
          : null,
    bleed: on(effects.bleed) ? merge(effects.bleed, DEFAULT_BLEED) : null,
    fwhmPx: effects.fwhmPx ?? null,
  };
  const n = out.nonlinearity;
  if (n) {
    if (!(n.kneeFraction > 0 && n.kneeFraction < 1))
      throw new Error(
        'the nonlinearity’s knee is a fraction of the full well between 0 and 1'
      );
    if (!(n.safeDeviation > 0 && n.safeDeviation < 1))
      throw new Error('the safe deviation is a fraction between 0 and 1');
  }
  const c = out.cosmic;
  if (c && c !== 'legacy') {
    if (!(c.dedxPerPixel > 0 && c.thicknessPx > 0 && c.maxLengthPx > 0))
      throw new Error(
        'a cosmic-ray track has a positive deposit, thickness and length'
      );
    if (c.rate !== undefined && !(c.rate >= 0))
      throw new Error('the cosmic-ray rate is zero or more');
  }
  if (out.bleed && !(out.bleed.maxLengthPx >= 1))
    throw new Error('the bleed length is at least one pixel');
  return out;
}
