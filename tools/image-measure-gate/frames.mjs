// =============================================================================
// Synthetic frames with known truth (Prompt 178 prototype; spike code)
// -----------------------------------------------------------------------------
// Every frame is made from a seed and carries its truth manifest, and is
// labelled synthetic. Pure and isomorphic: the same file runs in Node (the
// precision ensembles) and in the browser harness (the interaction and timing
// measurements), so a frame never travels between them. Coordinates are FITS's:
// 1 is the centre of the first pixel, x along a row, y up, so the array index
// of (x, y) is (y - 1) * width + (x - 1).
//
// The noise model is the CCD's: Poisson in the electrons plus the read noise,
// as Gaussians of the same variance (var_adu = signal_adu / gain + (read /
// gain)^2), gain 1.5 e-/ADU, read noise 8 e-, a bias of 100 ADU and a sky 100
// ADU above it. The signal-to-noise of a source here is its peak over the
// background noise at the sky (9.7 ADU), the figure the thresholds are written
// in.
// =============================================================================

import { mulberry32 } from '../../js/rng.js';

export const GENERATOR = 'image-measure-gate frames 1';
export const NOISE = Object.freeze({ gain: 1.5, read: 8, bias: 100, sky: 100 });
/** The background noise (ADU) at the sky level. */
export const SKY_SIGMA = Math.sqrt(
  NOISE.sky / NOISE.gain + (NOISE.read / NOISE.gain) ** 2
);

export function makeRandom(seed) {
  const u = mulberry32(seed);
  const uniform = (a, b) => a + (b - a) * u();
  const logUniform = (a, b) => Math.exp(uniform(Math.log(a), Math.log(b)));
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const disk = radius => {
    const r = radius * Math.sqrt(u());
    const t = 2 * Math.PI * u();
    return [r * Math.cos(t), r * Math.sin(t)];
  };
  return { u, uniform, logUniform, gauss, disk };
}

/** Noise added in place to a plane of expected ADU values. */
function addNoise(data, rnd) {
  const { gain, read, bias } = NOISE;
  const rn2 = (read / gain) ** 2;
  for (let i = 0; i < data.length; i++) {
    const signal = data[i] - bias;
    data[i] += Math.sqrt(Math.max(signal, 0) / gain + rn2) * rnd.gauss();
  }
}

const BG = (x, y) =>
  NOISE.bias + NOISE.sky + 0.05 * (x - 512) + 0.03 * (y - 512);

/** A Gaussian point source added to a plane. */
function addStar(data, width, height, x0, y0, fwhm, peak) {
  const sigma = fwhm / 2.354820045;
  const reach = Math.ceil(5 * sigma);
  const xa = Math.max(1, Math.floor(x0) - reach);
  const xb = Math.min(width, Math.ceil(x0) + reach);
  const ya = Math.max(1, Math.floor(y0) - reach);
  const yb = Math.min(height, Math.ceil(y0) + reach);
  const k = -1 / (2 * sigma * sigma);
  for (let y = ya; y <= yb; y++)
    for (let x = xa; x <= xb; x++)
      data[(y - 1) * width + (x - 1)] +=
        peak * Math.exp(k * ((x - x0) ** 2 + (y - y0) ** 2));
}

const labelled = (seed, what) => ({
  synthetic: true,
  generator: GENERATOR,
  seed,
  what,
});

/**
 * A field of point sources: one per cell of a 48-pixel grid, at most 4 pixels
 * from the cell's centre, so no two are closer than 40 pixels. `clicks` are the
 * click each source gets: uniform in the capture disk.
 */
export function pointField({
  seed = 178,
  n = 300,
  size = 1024,
  capture = 3,
} = {}) {
  const rnd = makeRandom(seed);
  const cell = 48;
  const per = Math.floor((size - 2 * cell) / cell);
  const cells = [];
  for (let j = 0; j < per; j++)
    for (let i = 0; i < per; i++) cells.push([i, j]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd.u() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const data = new Float64Array(size * size);
  for (let y = 1; y <= size; y++)
    for (let x = 1; x <= size; x++) data[(y - 1) * size + (x - 1)] = BG(x, y);
  const truth = [];
  for (const [i, j] of cells.slice(0, n)) {
    const x = cell * (i + 1.5) + 0.5 + rnd.uniform(-4, 4);
    const y = cell * (j + 1.5) + 0.5 + rnd.uniform(-4, 4);
    const fwhm = rnd.uniform(2.5, 6);
    const snr = rnd.logUniform(20, 200);
    addStar(data, size, size, x, y, fwhm, snr * SKY_SIGMA);
    const [dx, dy] = rnd.disk(capture);
    truth.push({ x, y, fwhm, snr, click: { x: x + dx, y: y + dy } });
  }
  addNoise(data, rnd);
  return {
    id: `points-${seed}`,
    width: size,
    height: size,
    data,
    truth,
    manifest: labelled(seed, 'point sources'),
  };
}

/** The logistic edge of a disc: half intensity at the radius. */
const edge = (d, r, s) => 1 / (1 + Math.exp((d - r) / s));

/**
 * One circular feature: a bright disc on dark sky (`bright`, the Moon) or a dark
 * disc on a sloped, bright field (a sunspot). The truth radius is the half-
 * intensity edge. The click is a centre click and a limb click, each in the
 * capture disk of its truth.
 */
export function discFrame({
  seed,
  bright = true,
  size = 1024,
  capture = 3,
} = {}) {
  const rnd = makeRandom(seed);
  const r = rnd.logUniform(15, 300);
  const margin = r + 14;
  const x0 = rnd.uniform(margin, size - margin) + 0.5;
  const y0 = rnd.uniform(margin, size - margin) + 0.5;
  const s = rnd.uniform(0.6, 1.5);
  const snr = rnd.logUniform(30, 200);
  const amp = snr * SKY_SIGMA;
  const data = new Float64Array(size * size);
  const field = bright
    ? () => NOISE.bias + NOISE.sky
    : (x, y) => BG(x, y) + 4 * amp;
  const sign = bright ? 1 : -1;
  for (let y = 1; y <= size; y++)
    for (let x = 1; x <= size; x++) {
      const d = Math.hypot(x - x0, y - y0);
      data[(y - 1) * size + (x - 1)] =
        field(x, y) + sign * amp * (d > r + 12 ? 0 : edge(d, r, s));
    }
  addNoise(data, rnd);
  const theta = rnd.uniform(0, 2 * Math.PI);
  const [cx, cy] = rnd.disk(capture);
  const [lx, ly] = rnd.disk(capture);
  const click = {
    centre: { x: x0 + cx, y: y0 + cy },
    limb: {
      x: x0 + r * Math.cos(theta) + lx,
      y: y0 + r * Math.sin(theta) + ly,
    },
  };
  return {
    id: `${bright ? 'moon' : 'spot'}-${seed}`,
    width: size,
    height: size,
    data,
    truth: { x: x0, y: y0, r, edge: s, snr, bright },
    click,
    manifest: labelled(seed, bright ? 'bright disc' : 'dark disc'),
  };
}

/**
 * A moon sequence: a lunar disc of radius 220 pixels drifting across the frame
 * with twelve crater-like features (tags a to l) fixed on its surface, one frame
 * every half day, with the sidecar's known length (the lunar diameter, 3474.8
 * km) for the scale. The truth manifest holds every feature's position in every
 * frame.
 */
export function moonSequence({
  seed = 1787,
  frames = 6,
  size = 1024,
  R = 220,
} = {}) {
  const rnd = makeRandom(seed);
  const features = Array.from({ length: 12 }, (_, i) => {
    const rho = rnd.uniform(0.15, 0.8) * R;
    const t = rnd.uniform(0, 2 * Math.PI);
    return {
      tag: String.fromCharCode(97 + i),
      dx: rho * Math.cos(t),
      dy: rho * Math.sin(t),
    };
  });
  const out = [];
  const v = [rnd.uniform(18, 26), rnd.uniform(-10, 10)];
  for (let k = 0; k < frames; k++) {
    const x0 = 300 + v[0] * k + 0.5;
    const y0 = 512 + v[1] * k + 0.5;
    const data = new Float64Array(size * size);
    for (let y = 1; y <= size; y++)
      for (let x = 1; x <= size; x++) {
        const d = Math.hypot(x - x0, y - y0);
        data[(y - 1) * size + (x - 1)] =
          NOISE.bias +
          NOISE.sky +
          (d > R + 12 ? 0 : 60 * SKY_SIGMA * edge(d, R, 1));
      }
    const truth = features.map(f => ({
      tag: f.tag,
      x: x0 + f.dx,
      y: y0 + f.dy,
    }));
    for (const f of truth)
      addStar(data, size, size, f.x, f.y, 4.5, 25 * SKY_SIGMA);
    addNoise(data, rnd);
    out.push({
      id: `moon-seq-${seed}-f${k + 1}`,
      width: size,
      height: size,
      data,
      time: { value: 60000 + 0.5 * k, format: 'mjd', scale: 'UTC' },
      truth: { disc: { x: x0, y: y0, r: R }, features: truth },
    });
  }
  return {
    id: `moon-sequence-${seed}`,
    frames: out,
    knownLength: { value: 3474.8, unit: 'km', what: 'the lunar diameter' },
    manifest: labelled(seed, 'moon sequence'),
  };
}

/** A smooth 2,048-pixel frame with a few stars: for the decode and draw timings. */
export function largeFrame({ seed = 2048, size = 2048 } = {}) {
  const rnd = makeRandom(seed);
  const data = new Float64Array(size * size);
  for (let y = 1; y <= size; y++)
    for (let x = 1; x <= size; x++)
      data[(y - 1) * size + (x - 1)] = BG(x / 2, y / 2);
  for (let i = 0; i < 60; i++)
    addStar(
      data,
      size,
      size,
      rnd.uniform(40, size - 40),
      rnd.uniform(40, size - 40),
      rnd.uniform(3, 7),
      rnd.logUniform(20, 200) * SKY_SIGMA
    );
  addNoise(data, rnd);
  return {
    id: `large-${seed}`,
    width: size,
    height: size,
    data,
    manifest: labelled(seed, 'large frame'),
  };
}
