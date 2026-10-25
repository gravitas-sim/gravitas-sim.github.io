// =============================================================================
// The synthetic image sequence (Prompt 193, SATELLITE_EPHEMERIS.md)
// -----------------------------------------------------------------------------
// One frame per epoch of the observing plan (cadence.js), rendered by the CCD
// forward model (js/forward/models/ccd.js): Jupiter's disk, the four moons at
// their ephemeris positions with their magnitudes, seeing, photon and read
// noise, all seeded. The frames are SYNTHETIC and say so in their truth
// manifest; none is an observed image. They are made on the page when asked
// for, never stored, and a digest of their pixels is stable across runs.
//
// The frame is turned so that Jupiter's projected equator is horizontal, east
// to the right (x positive east) and the projected pole up. It is calibrated
// (bias and dark removed, flat) and has no cosmic rays: what a student gets
// after the calibration lab's steps.
//
// `measureFrame` is the measurement: the moons' centroids near the positions
// the ephemeris overlay predicts, and Jupiter's by the disk's own centroid.
// Pure: no DOM.
// =============================================================================

import { fnvHex8 } from '../hash.js';
import { ID_OBSERVING_SETUP } from '../names.js';
import { run as runCcd } from '../forward/models/ccd.js';
import { gaussian as normals, stream } from '../random/streams.js';
import { MOON_IDS, moonsAt } from './galilean.js';

export const SEQUENCE = Object.freeze({
  width: 480,
  height: 40,
  pixelScale: 3,
  psfFwhm: 4.5,
  exposureS: 1.5,
  /** Electrons per second of a star of magnitude 0. */
  zeroPointRate: 4e6,
  magnitudes: Object.freeze({
    jupiter: -2.7,
    io: 5.0,
    europa: 5.3,
    ganymede: 4.6,
    callisto: 5.65,
  }),
  /** Image motion in each moon's position, Jupiter radii, one sigma (seeded). */
  seeingSigmaRj: 0.03,
  skyRate: 3,
  seed: 'galilean-sequence-193',
});

const DETECTOR = Object.freeze({
  biasLevel: 0,
  biasColumnSigma: 0,
  darkRate: 0,
  hotFraction: 0,
  qeScatter: 0,
  vignette: 0,
  dustCount: 0,
  cosmicRate: 0,
});

const rate = mag => SEQUENCE.zeroPointRate * 10 ** (-0.4 * mag);

/** Pixel position (FITS, 1 at the first pixel's centre) of an offset (x, y) in Jupiter radii. */
export function pixelOf(view, x, y) {
  const ppr = view.arcsecPerRj / SEQUENCE.pixelScale;
  return {
    px: (SEQUENCE.width + 1) / 2 + x * ppr,
    py: (SEQUENCE.height + 1) / 2 + y * ppr,
    pixelsPerRj: ppr,
  };
}

/** The disk of Jupiter as a lattice of faint point sources (equatorial radius 1, polar 0.935). */
function diskSources(view) {
  const { pixelsPerRj: ppr } = pixelOf(view, 0, 0);
  const c = pixelOf(view, 0, 0);
  const step = 1.1 / ppr;
  const out = [];
  // A lattice symmetric about the centre, so the disk's centroid is its centre.
  const K = Math.floor(1 / step);
  const KV = Math.floor(0.935 / (step * 0.935));
  for (let i = -K; i <= K; i++)
    for (let j = -KV; j <= KV; j++) {
      const u = i * step;
      const v = j * step * 0.935;
      if (u * u + (v / 0.935) ** 2 <= 1)
        out.push({ x: c.px + u * ppr, y: c.py + v * ppr });
    }
  const each = (rate(SEQUENCE.magnitudes.jupiter) / out.length) * 1;
  return out.map(s => ({ ...s, rate: each }));
}

/**
 * Render the frame of one epoch.
 * @param {object} model - openGalilean()
 * @param {{jdTt: number, jdUt: number}} epoch
 * @param {number} index - The epoch's index in the plan (keys the noise)
 * @returns {{width, height, counts: Float64Array, view: object, truth: Object<string, {x, y, px, py}>, observation: object}}
 */
export function renderFrame(model, epoch, index) {
  const { view, moons } = moonsAt(model, epoch.jdTt);
  const rand = normals(stream('noise', `${SEQUENCE.seed}-${index}`));
  const truth = {};
  const sources = diskSources(view);
  for (const id of MOON_IDS) {
    // Image motion, drawn in the order of MOON_IDS, so a frame is the same on every run.
    const x = moons[id].x + SEQUENCE.seeingSigmaRj * rand();
    const y = moons[id].y + SEQUENCE.seeingSigmaRj * rand();
    const p = pixelOf(view, x, y);
    truth[id] = {
      x,
      y,
      px: p.px,
      py: p.py,
      trueX: moons[id].x,
      trueY: moons[id].y,
    };
    sources.push({ x: p.px, y: p.py, rate: rate(SEQUENCE.magnitudes[id]) });
  }
  const setup = {
    format: ID_OBSERVING_SETUP,
    formatVersion: 1,
    seed: `${SEQUENCE.seed}-${index}`,
    instrument: {
      kind: 'imager',
      width: SEQUENCE.width,
      height: SEQUENCE.height,
      pixelScale: SEQUENCE.pixelScale,
      psfFwhm: SEQUENCE.psfFwhm,
    },
  };
  const observation = runCcd(
    {
      kind: 'science',
      exposure: SEQUENCE.exposureS,
      scene: { sky: SEQUENCE.skyRate, sources },
      detector: DETECTOR,
      label: `galilean-${index}`,
    },
    setup,
    { title: `Synthetic frame ${index + 1} of the Jupiter sequence` }
  );
  const counts = Float64Array.from(
    observation.columns.find(c => c.id === 'counts').values
  );
  return {
    width: SEQUENCE.width,
    height: SEQUENCE.height,
    counts,
    view,
    truth,
    observation,
  };
}

/** The median of a few values. */
const median = a => {
  const s = Array.from(a).sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)];
};

/** Centroid of the light above the local background in a box around (px, py), or null. */
export function centroid(frame, px, py, half = 3) {
  const { width, height, counts } = frame;
  const x0 = Math.max(1, Math.round(px) - half);
  const x1 = Math.min(width, Math.round(px) + half);
  const y0 = Math.max(1, Math.round(py) - half);
  const y1 = Math.min(height, Math.round(py) + half);
  const edge = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (x === x0 || x === x1 || y === y0 || y === y1)
        edge.push(counts[(y - 1) * width + (x - 1)]);
  const bg = median(edge);
  let s = 0;
  let sx = 0;
  let sy = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = counts[(y - 1) * width + (x - 1)] - bg;
      if (v <= 0) continue;
      s += v;
      sx += v * x;
      sy += v * y;
    }
  if (!(s > 0)) return null;
  return { px: sx / s, py: sy / s, flux: s };
}

/**
 * Jupiter's centre: the weighted centroid of the connected region around the
 * brightest pixel that is above a tenth of it, each pixel counted at the
 * fraction of the saturation level it holds (so the soft edge, not only the
 * flat top, places the centre). A moon not touching the disk is not in it.
 */
export function diskCentre(frame) {
  const { width, height, counts } = frame;
  let max = 0;
  let at = 0;
  for (let i = 0; i < counts.length; i++)
    if (counts[i] > max) {
      max = counts[i];
      at = i;
    }
  const seen = new Uint8Array(counts.length);
  const stack = [at];
  seen[at] = 1;
  let s = 0;
  let sx = 0;
  let sy = 0;
  while (stack.length) {
    const i = stack.pop();
    const w = counts[i] / max;
    s += w;
    sx += w * ((i % width) + 1);
    sy += w * (Math.floor(i / width) + 1);
    const x = i % width;
    const y = Math.floor(i / width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (!seen[j] && counts[j] >= 0.1 * max) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return { px: sx / s, py: sy / s, weight: s };
}

/**
 * Measure a frame: each moon's offset from Jupiter in Jupiter radii, from the
 * centroid near the position the ephemeris predicts (the overlay) and the
 * disk's own centre. A moon within 1.8 radii of the centre is on or beside
 * the disk and is not measured; a moon whose predicted position is within 7
 * pixels of another's is blended and is not measured.
 * @returns {{moons: Object<string, {x: number, y: number}|null>, jupiter: object, overlay: Object}}
 */
export function measureFrame(model, epoch, frame) {
  const { moons, view } = moonsAt(model, epoch.jdTt);
  const jup = diskCentre(frame);
  const overlay = {};
  for (const id of MOON_IDS)
    overlay[id] = pixelOf(view, moons[id].x, moons[id].y);
  const out = {};
  for (const id of MOON_IDS) {
    const near = MOON_IDS.some(
      o =>
        o !== id &&
        Math.hypot(
          overlay[o].px - overlay[id].px,
          overlay[o].py - overlay[id].py
        ) < 7
    );
    if (Math.hypot(moons[id].x, moons[id].y) < 1.8 || near) {
      out[id] = null;
      continue;
    }
    const c = centroid(frame, overlay[id].px, overlay[id].py);
    out[id] = c
      ? {
          x: (c.px - jup.px) / overlay[id].pixelsPerRj,
          y: (c.py - jup.py) / overlay[id].pixelsPerRj,
        }
      : null;
  }
  return {
    moons: out,
    jupiter: jup,
    overlay,
    pixelsPerRj: overlay.io.pixelsPerRj,
  };
}

/** A short digest of the pixels (js/hash.js over every seventh rounded count), 8 hex digits. */
export function frameDigest(frame) {
  const sample = [];
  for (let i = 0; i < frame.counts.length; i += 7)
    sample.push(Math.round(frame.counts[i]) & 0xffff);
  return fnvHex8(sample.join(','));
}
