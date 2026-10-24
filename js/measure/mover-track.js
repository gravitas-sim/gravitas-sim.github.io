// =============================================================================
// A moving object's track among static sources (Prompt 187, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// Sources measured on several frames, each with its sky position and uncertainty
// and the frame's time. The static sources keep their places; the mover is the
// source whose positions make a straight line in the tangent plane at a rate
// that is not zero:
//
//   static    seen in every frame within 4 sigma of where it was first seen
//   a track   a detection in two frames and the straight line through them; a
//             detection in another frame joins when it lies within 4 sigma of the
//             line (at least 3 detections in all); the line is then fitted by
//             weighted least squares, with its chi-squared and covariance
//   mover     a track whose rate is at least 5 sigma from zero and whose
//             residuals are consistent (p >= 0.001); a rate between 3 and 5 sigma
//             is "slow" (neither static nor a mover) and is not reported as one
//
// A track that shares a detection with a better one is dropped. Two movers are
// reported as such and none is chosen; no mover is "no-mover"; fewer than 3
// frames is "too-few-frames". The result is a rate in arcseconds per hour and a
// position angle (north through east) with their uncertainties and nothing more:
// three positions on a short arc do not give an orbit.
//
// Standard (tangent-plane) coordinates, x east and y north in arcseconds, about a
// reference direction (the mean of the sources unless the caller names one); no
// distortion, no parallax, no light time. Pure: no DOM, no clock, no network.
// =============================================================================

import { chi2Survival } from './astrometry.js';
import { epochJd, standard, unstandard } from './astrometric-series.js';

const { Math, Number } = globalThis;
const RAD = Math.PI / 180;
const finite = Number.isFinite;

export const VERSION = 1;
export const STEP = 'image-track';

/** The rules fixed before any measurement (tests hold them equal to thresholds.json). */
export const TRACK_RULES = Object.freeze({
  minFrames: 3,
  minDetections: 3,
  significance: 5,
  staticSigmas: 3,
  matchSigmas: 4,
  consistentPValue: 0.001,
  maxFrames: 200,
  maxSourcesPerFrame: 400,
  maxWork: 3e7,
});

const refuse = (code, message, data = {}) => ({
  ok: false,
  status: 'not-constrained',
  code,
  message,
  data,
});

/**
 * Check the frames and put them in time order, positions in standard coordinates.
 * A frame is { time: {value, format, scale}, sources: [{ ra, dec, sigma | sx, sy }] }
 * (degrees; arcseconds) or sources with { x, y } already in standard coordinates.
 */
export function prepare(frames, opts = {}) {
  if (!Array.isArray(frames) || !frames.length)
    return refuse('no-frames', 'there are no frames', { n: 0 });
  if (frames.length > TRACK_RULES.maxFrames)
    return refuse('too-many', `more than ${TRACK_RULES.maxFrames} frames`, {
      n: frames.length,
    });
  const sky = frames.some(f => f?.sources?.some(s => s?.ra !== undefined));
  let tangent = opts.tangent ?? null;
  if (sky && !tangent) {
    let X = 0;
    let Y = 0;
    let Z = 0;
    let count = 0;
    for (const f of frames)
      for (const s of f.sources ?? []) {
        if (!finite(s?.ra) || !finite(s?.dec)) continue;
        const a = s.ra * RAD;
        const d = s.dec * RAD;
        X += Math.cos(d) * Math.cos(a);
        Y += Math.cos(d) * Math.sin(a);
        Z += Math.sin(d);
        count++;
      }
    if (!count) return refuse('bad-source', 'no source has a position', {});
    tangent = [
      (((Math.atan2(Y, X) / RAD) % 360) + 360) % 360,
      Math.atan2(Z, Math.hypot(X, Y)) / RAD,
    ];
  }
  const out = [];
  for (let k = 0; k < frames.length; k++) {
    const f = frames[k];
    const t = epochJd(f?.time, { utcBefore2017: 'keep' });
    if (!t.ok) return { ...t, data: { ...t.data, frame: k + 1 } };
    const list = f.sources ?? [];
    if (list.length > TRACK_RULES.maxSourcesPerFrame)
      return refuse(
        'too-many',
        `more than ${TRACK_RULES.maxSourcesPerFrame} sources in frame ${k + 1}`,
        { frame: k + 1, n: list.length }
      );
    const sources = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const sx = Number(s?.sx ?? s?.sigma);
      const sy = Number(s?.sy ?? s?.sigma);
      if (!(sx > 0 && sy > 0 && finite(sx) && finite(sy)))
        return refuse(
          'bad-sigma',
          `source ${i + 1} of frame ${k + 1} needs a positive uncertainty`,
          { frame: k + 1, source: i + 1 }
        );
      let p;
      if (s?.ra !== undefined) {
        if (!(finite(s.ra) && finite(s.dec) && Math.abs(s.dec) <= 90))
          return refuse(
            'bad-source',
            `source ${i + 1} of frame ${k + 1} has no usable position`,
            { frame: k + 1, source: i + 1 }
          );
        p = standard(tangent, s.ra, s.dec);
        if (!p)
          return refuse(
            'bad-source',
            `source ${i + 1} of frame ${k + 1} is too far from the tangent point`,
            { frame: k + 1, source: i + 1 }
          );
      } else {
        if (!(finite(s?.x) && finite(s?.y)))
          return refuse(
            'bad-source',
            `source ${i + 1} of frame ${k + 1} has no usable position`,
            { frame: k + 1, source: i + 1 }
          );
        p = { x: s.x, y: s.y };
      }
      sources.push({
        x: p.x,
        y: p.y,
        sx,
        sy,
        frame: k,
        index: i,
        used: false,
        static: false,
      });
    }
    sources.sort((a, b) => a.x - b.x);
    out.push({ jd: t.jd, sources, src: k });
  }
  out.sort((a, b) => a.jd - b.jd);
  out.forEach((f, k) => f.sources.forEach(s => (s.rank = k)));
  return { ok: true, frames: out, tangent, sky };
}

/** Sources of a frame (sorted by x) within `tol` of (x, y): the nearest, or null. */
function nearest(frame, x, y, tol) {
  const arr = frame.sources;
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].x < x - tol) lo = mid + 1;
    else hi = mid;
  }
  let best = null;
  let bd = Infinity;
  for (let i = lo; i < arr.length && arr[i].x <= x + tol; i++) {
    const s = arr[i];
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= tol && d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

/** Weighted straight line x(t), y(t) through detections [{jd, x, y, sx, sy}]; null when singular. */
function lineFit(dets) {
  let sw = 0;
  let tw = 0;
  for (const d of dets) {
    const w = 1 / (d.sx * d.sy);
    sw += w;
    tw += w * d.jd;
  }
  const tRef = tw / sw;
  const axis = key => {
    let S = 0;
    let St = 0;
    let Stt = 0;
    let Sy = 0;
    let Sty = 0;
    for (const d of dets) {
      const sg = key === 'x' ? d.sx : d.sy;
      const w = 1 / (sg * sg);
      const t = d.jd - tRef;
      S += w;
      St += w * t;
      Stt += w * t * t;
      Sy += w * d[key];
      Sty += w * t * d[key];
    }
    const det = S * Stt - St * St;
    if (!(det > 0)) return null;
    const c0 = (Stt * Sy - St * Sty) / det;
    const v = (S * Sty - St * Sy) / det;
    return { c0, v, var0: Stt / det, varV: S / det };
  };
  const ax = axis('x');
  const ay = axis('y');
  if (!ax || !ay) return null;
  let chi2 = 0;
  const residuals = dets.map(d => {
    const t = d.jd - tRef;
    const dx = d.x - (ax.c0 + ax.v * t);
    const dy = d.y - (ay.c0 + ay.v * t);
    chi2 += (dx / d.sx) ** 2 + (dy / d.sy) ** 2;
    return { jd: d.jd, dx, dy, zx: dx / d.sx, zy: dy / d.sy };
  });
  return {
    tRef,
    x0: ax.c0,
    y0: ay.c0,
    vx: ax.v,
    vy: ay.v,
    varVx: ax.varV,
    varVy: ay.varV,
    chi2,
    dof: 2 * dets.length - 4,
    residuals,
  };
}

/**
 * The position angle (degrees, north through east) of the great circle at the
 * sky position of standard coordinates (x, y) toward the position one hour of
 * motion (dx, dy arcseconds) further: the local angle, which differs from the
 * tangent plane's by the convergence of the meridians.
 */
function bearing(tangent, x, y, dx, dy) {
  const p = unstandard(tangent, x, y);
  const q = unstandard(tangent, x + dx, y + dy);
  const d1 = p.dec * RAD;
  const d2 = q.dec * RAD;
  const dA = (q.ra - p.ra) * RAD;
  const b = Math.atan2(
    Math.sin(dA) * Math.cos(d2),
    Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(dA)
  );
  return (((b / RAD) % 360) + 360) % 360;
}

/** Rate (arcsec per hour), position angle (degrees, north through east) and significance of a line. */
function motionOf(fit) {
  const vx = fit.vx / 24;
  const vy = fit.vy / 24;
  const sx = Math.sqrt(fit.varVx) / 24;
  const sy = Math.sqrt(fit.varVy) / 24;
  const rate = Math.hypot(vx, vy);
  const sRate =
    rate > 0
      ? Math.sqrt((vx * sx) ** 2 + (vy * sy) ** 2) / rate
      : Math.hypot(sx, sy);
  const pa = (((Math.atan2(vx, vy) / RAD) % 360) + 360) % 360;
  const sPa =
    rate > 0
      ? Math.sqrt((vy * sx) ** 2 + (vx * sy) ** 2) / (rate * rate) / RAD
      : 180;
  const significance = Math.sqrt((vx / sx) ** 2 + (vy / sy) ** 2);
  return { rate, sRate, pa, sPa, significance, vx, vy, sx, sy };
}

/**
 * Find the mover among the static sources.
 * @param {object[]} frames - see `prepare`
 * @param {{tangent?: number[]}} [opts]
 */
export function findMover(frames, opts = {}) {
  const P = prepare(frames, opts);
  if (!P.ok) return P;
  const F = P.frames;
  if (F.length < TRACK_RULES.minFrames)
    return refuse(
      'too-few-frames',
      `a track needs at least ${TRACK_RULES.minFrames} frames; ${F.length} given`,
      { frames: F.length, need: TRACK_RULES.minFrames }
    );
  const n0 = F[0].sources.length;
  const nl = F[F.length - 1].sources.length;
  if (n0 * nl * F.length > TRACK_RULES.maxWork)
    return refuse(
      'too-large',
      'the frames hold too many sources to search for a track',
      {
        sources: Math.max(n0, nl),
        frames: F.length,
      }
    );
  // Static: a source of the first frame seen in every other frame near its place.
  let staticCount = 0;
  for (const s of F[0].sources) {
    const hits = [];
    for (let k = 1; k < F.length; k++) {
      const tol = TRACK_RULES.matchSigmas * Math.hypot(s.sx, s.sy);
      const m = nearest(F[k], s.x, s.y, tol);
      if (!m) break;
      hits.push(m);
    }
    if (hits.length === F.length - 1) {
      s.static = true;
      for (const h of hits) h.static = true;
      staticCount++;
    }
  }
  // Tracks from detections that are not static, in the first two and last two frames.
  const firsts = [0, 1].filter(k => k < F.length - 1);
  const lasts = [F.length - 2, F.length - 1].filter(k => k > 0);
  const tracks = [];
  const seen = new Set();
  for (const a of firsts)
    for (const b of lasts) {
      if (b <= a) continue;
      const fa = F[a];
      const fb = F[b];
      for (const sa of fa.sources) {
        if (sa.static) continue;
        for (const sb of fb.sources) {
          if (sb.static) continue;
          const span = fb.jd - fa.jd;
          if (!(span > 0)) continue;
          const dets = [];
          for (let k = 0; k < F.length; k++) {
            const fk = F[k];
            if (k === a) {
              dets.push({
                jd: fk.jd,
                x: sa.x,
                y: sa.y,
                sx: sa.sx,
                sy: sa.sy,
                src: sa,
              });
              continue;
            }
            if (k === b) {
              dets.push({
                jd: fk.jd,
                x: sb.x,
                y: sb.y,
                sx: sb.sx,
                sy: sb.sy,
                src: sb,
              });
              continue;
            }
            const u = (fk.jd - fa.jd) / span;
            const px = sa.x + (sb.x - sa.x) * u;
            const py = sa.y + (sb.y - sa.y) * u;
            const sigma = Math.hypot(sa.sx, sa.sy) / Math.SQRT2;
            const radius =
              TRACK_RULES.matchSigmas *
              sigma *
              Math.sqrt(1 + (1 - u) * (1 - u) + u * u);
            const m = nearest(fk, px, py, radius);
            if (m && !m.static)
              dets.push({
                jd: fk.jd,
                x: m.x,
                y: m.y,
                sx: m.sx,
                sy: m.sy,
                src: m,
              });
          }
          if (dets.length < TRACK_RULES.minDetections) continue;
          dets.sort((p, q) => p.jd - q.jd);
          const fit = lineFit(dets);
          if (!fit) continue;
          const key = dets.map(d => `${d.src.rank}:${d.src.index}`).join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          const p = chi2Survival(fit.chi2, fit.dof);
          if (!(p >= TRACK_RULES.consistentPValue)) continue;
          tracks.push({ dets, fit, p, motion: motionOf(fit) });
        }
      }
    }
  tracks.sort(
    (p, q) => q.dets.length - p.dets.length || p.fit.chi2 - q.fit.chi2
  );
  const taken = new Set();
  const kept = [];
  for (const tr of tracks) {
    const ids = tr.dets.map(d => d.src);
    if (ids.some(s => taken.has(s))) continue;
    kept.push(tr);
    ids.forEach(s => taken.add(s));
  }
  const movers = kept.filter(
    t => t.motion.significance >= TRACK_RULES.significance
  );
  const slow = kept.filter(
    t =>
      t.motion.significance < TRACK_RULES.significance &&
      t.motion.significance >= TRACK_RULES.staticSigmas
  );
  const describe = tr => ({
    frames: tr.dets.length,
    rate: {
      value: tr.motion.rate,
      sigma: tr.motion.sRate,
      unit: 'arcsec/hour',
    },
    positionAngle: {
      value: P.sky
        ? bearing(P.tangent, tr.fit.x0, tr.fit.y0, tr.motion.vx, tr.motion.vy)
        : tr.motion.pa,
      sigma: tr.motion.sPa,
      unit: 'deg',
      plane: tr.motion.pa,
      local: P.sky,
    },
    significance: tr.motion.significance,
    chi2: tr.fit.chi2,
    dof: tr.fit.dof,
    pValue: tr.p,
    start: { x: tr.fit.x0, y: tr.fit.y0, jd: tr.fit.tRef },
    velocity: {
      x: tr.fit.vx / 24,
      y: tr.fit.vy / 24,
      sx: tr.motion.sx,
      sy: tr.motion.sy,
    },
    positions: tr.dets.map(d => ({
      jd: d.jd,
      x: d.x,
      y: d.y,
      frame: d.src.frame,
      index: d.src.index,
    })),
    residuals: tr.fit.residuals,
  });
  const base = {
    staticSources: staticCount,
    frames: F.length,
    tangent: P.tangent,
  };
  if (movers.length > 1)
    return refuse(
      'several-movers',
      `${movers.length} sources move: none is chosen`,
      {
        ...base,
        movers: movers.map(describe),
      }
    );
  if (movers.length === 0)
    return refuse(
      'no-mover',
      slow.length
        ? 'no source moves by more than 5 sigma; one moves by 3 to 5 sigma, which is neither static nor a detection'
        : 'no source moves: every source is static',
      { ...base, slow: slow.map(describe) }
    );
  return { ok: true, ...describe(movers[0]), ...base, tangentUsed: P.tangent };
}

/** The result as the envelope's quantities (Prompt 150's kinds): the rate and the position angle. */
export function quantitiesOf(result) {
  // the units registry has mas/yr for an angular rate and no arcsec/hour:
  // 1 arcsec/hour = 1000 mas x 8766 hours/year (Julian) = 8,766,000 mas/yr
  const K = 1000 * 8766;
  return [
    {
      id: 'track.rate',
      label: 'rate of motion (1 arcsec/hour is 8,766,000 mas/yr)',
      value: result.rate.value * K,
      unit: 'mas/yr',
      origin: 'fitted',
      uncertainty: {
        kind: 'sigma',
        basis: 'data',
        sigma: result.rate.sigma * K,
      },
    },
    {
      id: 'track.pa',
      label: 'position angle (north through east)',
      value: result.positionAngle.value,
      unit: 'deg',
      origin: 'fitted',
      uncertainty: {
        kind: 'sigma',
        basis: 'data',
        sigma: result.positionAngle.sigma,
      },
    },
  ];
}

/** What lets a track be found again: the frames as given and the numbers it gave. */
export function reductionOf(frames, result) {
  return {
    step: STEP,
    version: VERSION,
    frames: frames.map(f => ({
      time: { ...f.time },
      sources: f.sources.map(s => ({ ...s })),
    })),
    result: {
      rate: result.rate.value,
      pa: result.positionAngle.value,
      frames: result.frames,
    },
  };
}

/** Run a record again; the numbers agree to a relative 1e-9. */
export function replay(red) {
  if (red?.step !== STEP || red.version !== VERSION)
    return refuse('record', 'this is not a record of this tool', {});
  const r = findMover(red.frames);
  if (!r.ok) return r;
  const same = (a, b) =>
    Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1e-12);
  return {
    ok: true,
    agrees:
      same(r.rate.value, red.result.rate) &&
      same(r.positionAngle.value, red.result.pa),
    result: r,
  };
}
