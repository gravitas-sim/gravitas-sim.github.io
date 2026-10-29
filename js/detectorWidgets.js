// =============================================================================
// The detector instruments
// -----------------------------------------------------------------------------
// Three instruments over the detector kernel (js/kernels/detector,
// CALIBRATION_LAB.md). All frames are SYNTHETIC: made by a stated forward model
// of a CCD from a seed, so every number has a known truth; the instrument says
// so in its first row.
//
//   ccd-frames        a bias, a dark, a flat and a raw science frame, then the
//                     science frame after each calibration step, with the
//                     photometry of four stars at each stage
//   ccd-snr           the CCD equation for a star in an aperture, the noise
//                     terms, the exposure that reaches a target and the
//                     faintest star it reaches
//   diff-photometry   forty frames of one field with a variable star: raw and
//                     differential light curves, the fit, the check star
//
// Every number a lesson asks for is a row of the readout under the picture,
// which is also the table alternative to the picture. The kernel is pure and the
// page only draws it; nothing is loaded from a file.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_DETECTOR } from './i18n/en.detector.js';
import { ES_DETECTOR } from './i18n/es.detector.js';
import { formatNumber, withUnit } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import {
  calibrate,
  maskCosmicRays,
  masterBias,
  masterDark,
  masterFlat,
  gainFromPairs,
  aperturePhotometry,
  aperturePixels,
} from './kernels/detector/reduce.js';
import { fractionIn } from './kernels/detector/frame.js';
import {
  mastersVariance,
  buildMasters,
  reduceSeries,
  fitLightCurve,
} from './kernels/detector/pipeline.js';
import {
  noiseTerms,
  exposureForSnr,
  snrAt,
  dominantTerm,
  limitingMagnitude,
} from './kernels/detector/snr.js';
import {
  FRAME_FIELD,
  SERIES_FIELD,
  SKY_CHOICES,
  LAB_DETECTOR,
  labCalibration,
  labFrame,
  labSeries,
  rateFromMagnitude,
  skyRateFromMagnitude,
  ZERO_POINT_V,
  aperture,
} from './kernels/detector/lab.js';

registerMessages('en', EN_DETECTOR);
registerMessages('es', ES_DETECTOR);

const num = (v, sig = 3) => formatNumber(v, { sig, sci: false });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
const isOn = x => x >= 0.5;
const GAIN = LAB_DETECTOR.gain;
const READ = LAB_DETECTOR.readNoise;
const DARK = LAB_DETECTOR.darkRate;
const SIGMA_PIX = LAB_DETECTOR.fwhm / (2 * Math.sqrt(2 * Math.LN2));
const sourceRow = key => ({
  label: t('detW.row.source'),
  value: t(key),
  emphasis: true,
});

// -----------------------------------------------------------------------------
// Drawing helpers
// -----------------------------------------------------------------------------

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const ticks = (lo, hi) => {
  const raw = (hi - lo) / 6;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    out.push(Math.abs(v) < 1e-9 ? 0 : v);
  return out;
};

function plot(
  canvas,
  xr,
  yr,
  labels,
  { base = 260, logX = false, logY = false } = {}
) {
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(base, 210));
  const r = { x: 56, y: 12, w: w - 70, h: h - 44 };
  const fx = logX ? Math.log10 : x => x;
  const fy = logY ? Math.log10 : y => y;
  const X = x => r.x + ((fx(x) - fx(xr[0])) / (fx(xr[1]) - fx(xr[0]))) * r.w;
  const Y = y => r.y + ((fy(y) - fy(yr[0])) / (fy(yr[1]) - fy(yr[0]))) * r.h;
  g.strokeStyle = colors.grid;
  g.lineWidth = 1;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.muted;
  const decades = (lo, hi) => {
    const out = [];
    for (
      let e = Math.ceil(Math.log10(lo));
      e <= Math.floor(Math.log10(hi));
      e++
    )
      out.push(10 ** e);
    return out;
  };
  const xt = logX ? decades(...xr) : ticks(...xr);
  const yt = logY ? decades(Math.min(...yr), Math.max(...yr)) : ticks(...yr);
  g.textBaseline = 'top';
  g.textAlign = 'center';
  for (const v of xt)
    g.fillText(String(Math.round(v * 1e6) / 1e6), X(v), r.y + r.h + 4);
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  for (const v of yt)
    g.fillText(String(Math.round(v * 1e6) / 1e6), r.x - 5, Y(v));
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillText(t(labels[0]), r.x, r.y + r.h + 20);
  g.textAlign = 'right';
  g.fillText(t(labels[1]), r.x + r.w, r.y + 2);
  g.save();
  g.beginPath();
  g.rect(r.x, r.y, r.w, r.h);
  g.clip();
  return { g, r, X, Y, colors, done: () => g.restore() };
}
const dot = (g, x, y, rad, fill) => {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, rad, 0, 2 * Math.PI);
  g.fill();
};
// -----------------------------------------------------------------------------
// What a CCD records
// -----------------------------------------------------------------------------

export const VIEWS = Object.freeze([
  'bias',
  'dark',
  'flat',
  'raw',
  'minusBias',
  'minusDark',
  'calibrated',
  'masked',
]);

const frameCache = new Map();

/** Enclosed fraction of a star's light inside the aperture's pixels, exact for the PSF. */
function enclosedFraction(img, star) {
  let s = 0;
  for (const i of aperturePixels(img, star.x, star.y, aperture.r)) {
    const x = i % img.width;
    const y = Math.floor(i / img.width);
    s +=
      fractionIn(x - 0.5, x + 0.5, star.x, SIGMA_PIX) *
      fractionIn(y - 0.5, y + 0.5, star.y, SIGMA_PIX);
  }
  return s;
}

/** The whole calibration story for a draw and an exposure, computed once. */
export function frameStory(draw, exposure) {
  const key = `${draw}:${exposure}`;
  if (frameCache.has(key)) return frameCache.get(key);
  const cs = labCalibration(draw);
  const masters = buildMasters(cs, { gain: GAIN });
  const raw = labFrame(draw, exposure);
  const bias = masterBias(cs.bias, { gain: GAIN });
  const pair = gainFromPairs(cs.bias[0], cs.bias[1], cs.flat[0], cs.flat[1]);
  const dark = masterDark(cs.dark, masters.bias, { gain: GAIN });
  const flat = masterFlat(cs.flat, masters.bias, masters.dark);
  const s4 = calibrate(raw, { bias: masters.bias });
  const s5 = calibrate(raw, { bias: masters.bias, dark: masters.dark });
  const s6 = calibrate(raw, masters);
  const electrons = {
    ...s6.image,
    values: Float64Array.from(s6.image.values, v => v * GAIN),
  };
  const cr = maskCosmicRays(electrons, { readNoise: READ });
  const s7 = {
    ...cr.image,
    values: Float64Array.from(cr.image.values, v => v / GAIN),
  };
  const images = [
    cs.bias[0],
    cs.dark[0],
    cs.flat[0],
    raw,
    s4.image,
    s5.image,
    s6.image,
    s7,
  ];
  const extra = mastersVariance(masters, {
    readNoise: READ,
    darkRate: DARK,
    exposure,
  });
  const stars = FRAME_FIELD.sources.map(star => {
    const out = {
      id: star.id,
      truth: star.rate * exposure * enclosedFraction(raw, star),
    };
    out.stages = images.slice(3).map((img, k) => {
      const stage = k + 3;
      const e = {
        ...img,
        values: Float64Array.from(img.values, v => v * GAIN),
      };
      return aperturePhotometry(e, {
        x: star.x,
        y: star.y,
        r: aperture.r,
        rIn: aperture.rIn,
        rOut: aperture.rOut,
        readNoise: READ,
        darkPerPixel: stage >= 5 ? DARK * exposure : 0,
        extraVariance: stage >= 5 ? extra : 0,
        mask: stage === 7 ? cr.mask : null,
        saturation: 0.99 * LAB_DETECTOR.fullWell,
      });
    });
    return out;
  });
  const flatN = flat.image.values;
  const W = flat.image.width;
  const patch = (cx, cy) => {
    let s = 0;
    for (let y = cy - 2; y <= cy + 2; y++)
      for (let x = cx - 2; x <= cx + 2; x++) s += flatN[y * W + x];
    return s / 25;
  };
  const story = {
    cs,
    raw,
    images,
    masters,
    bias,
    pair,
    dark,
    flat,
    stars,
    flagged: cr.count,
    mask: cr.mask,
    saturated: raw.truth.saturated,
    cosmicInjected: raw.truth.cosmic.length,
    cornerOverCenter: patch(3, 3) / patch(Math.floor(W / 2), Math.floor(W / 2)),
  };
  frameCache.set(key, story);
  if (frameCache.size > 12) frameCache.delete(frameCache.keys().next().value);
  return story;
}

function drawFrame(canvas, v) {
  const view = clamp(v.view, 0, 7);
  const s = frameStory(clamp(v.draw, 1, 8), clamp(v.exposure, 10, 300));
  const img = s.images[view];
  const colors = palette();
  const { ctx: g, w, h } = surface(canvas, responsiveHeight(300, 220));
  const side = Math.min(w, h);
  const scale = Math.max(1, Math.floor(side / img.width));
  const x0 = Math.round((w - scale * img.width) / 2);
  const sorted = Float64Array.from(img.values).sort();
  const lo = sorted[Math.floor(0.02 * sorted.length)];
  let hi = sorted[Math.floor(0.995 * sorted.length)];
  if (hi <= lo) hi = lo + 1;
  // A square-root stretch, so faint structure and bright stars both show.
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const f = Math.min(
        1,
        Math.max(0, (img.values[y * img.width + x] - lo) / (hi - lo))
      );
      const c = Math.round(255 * Math.sqrt(f));
      g.fillStyle = `rgb(${c},${c},${c})`;
      g.fillRect(x0 + x * scale, y * scale, scale, scale);
    }
  if (view === 7) {
    g.strokeStyle = colors.warn;
    g.lineWidth = 1;
    // Flagged pixels are outlined: those the mask replaced.
    const m = s.mask;
    for (let i = 0; i < m.length; i++)
      if (m[i])
        g.strokeRect(
          x0 + (i % img.width) * scale + 0.5,
          Math.floor(i / img.width) * scale + 0.5,
          scale - 1,
          scale - 1
        );
  }
  g.font = typeAt(TYPE.TICK);
  g.fillStyle = colors.warn;
  g.textBaseline = 'top';
  g.textAlign = 'left';
  for (const star of FRAME_FIELD.sources)
    g.fillText(star.id, x0 + (star.x + 3) * scale, (star.y - 6) * scale);
}

const FRAMES = {
  id: 'ccd-frames',
  get title() {
    return t('detW.f.title');
  },
  get note() {
    return t('detW.f.note');
  },
  animated: false,
  controls: [
    {
      id: 'view',
      get label() {
        return t('detW.f.control.view');
      },
      min: 0,
      max: 7,
      step: 1,
      value: 3,
      decimals: 0,
      format: v => t(`detW.f.view.${VIEWS[clamp(v, 0, 7)]}`),
    },
    {
      id: 'exposure',
      get label() {
        return t('detW.f.control.exposure');
      },
      min: 10,
      max: 300,
      step: 10,
      value: 60,
      decimals: 0,
      format: v => `${num(v)} s`,
    },
    {
      id: 'draw',
      get label() {
        return t('detW.f.control.draw');
      },
      min: 1,
      max: 8,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => `#${clamp(v, 1, 8)}`,
    },
  ],
  presets: [
    {
      values: { view: 0, exposure: 60, draw: 1 },
      get label() {
        return t('detW.f.preset.bias');
      },
    },
    {
      values: { view: 3, exposure: 60, draw: 1 },
      get label() {
        return t('detW.f.preset.raw');
      },
    },
    {
      values: { view: 6, exposure: 60, draw: 1 },
      get label() {
        return t('detW.f.preset.calibrated');
      },
    },
  ],
  draw: drawFrame,
  readout(v) {
    const view = clamp(v.view, 0, 7);
    const exposure = clamp(v.exposure, 10, 300);
    const s = frameStory(clamp(v.draw, 1, 8), exposure);
    const img = s.images[view];
    const vals = img.values;
    const m = mean(vals);
    const rows = [
      sourceRow('detW.f.source'),
      {
        label: t('detW.f.row.mean'),
        value: withUnit(num(m, 4), t('detW.u.counts')),
      },
      {
        label: t('detW.f.row.rms'),
        value: withUnit(num(sd(vals), 3), t('detW.u.counts')),
      },
      {
        label: t('detW.f.row.range'),
        value: `${num(Math.min(...vals), 4)} to ${num(Math.max(...vals), 4)}`,
      },
      {
        label: t('detW.f.row.biasLevel'),
        value: withUnit(
          num(s.bias.node.quantities[0].value, 4),
          t('detW.u.counts')
        ),
        emphasis: true,
      },
      {
        label: t('detW.f.row.read'),
        value: withUnit(num(s.pair.readNoise, 3), t('detW.u.e')),
        emphasis: true,
      },
      {
        label: t('detW.f.row.gain'),
        value: num(s.pair.gain, 3),
        emphasis: true,
      },
      {
        label: t('detW.f.row.dark'),
        value: withUnit(
          num(s.dark.node.quantities[3].value, 3),
          t('detW.u.eps')
        ),
        emphasis: true,
      },
      {
        label: t('detW.f.row.corner'),
        value: `${num(100 * s.cornerOverCenter, 3)} %`,
        emphasis: true,
      },
      { label: t('detW.f.row.saturated'), value: String(s.saturated) },
      {
        label: t('detW.f.row.flagged'),
        value: String(s.flagged),
        emphasis: true,
      },
    ];
    if (view >= 3)
      for (const star of s.stars) {
        const p = star.stages[view - 3];
        rows.push({
          label: t('detW.f.row.star', { id: star.id }),
          value:
            view >= 6
              ? `${num(p.net, 4)} ± ${num(p.sigma, 2)} ${t('detW.u.e')} (${t('detW.f.truth')} ${num(star.truth, 4)})`
              : `${num(p.net, 4)} ${t('detW.u.e')} (${t('detW.f.truth')} ${num(star.truth, 4)})`,
          emphasis: true,
        });
      }
    rows.push({ label: t('detW.f.row.how'), value: t('detW.f.value.how') });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// Signal-to-noise and exposure time
// -----------------------------------------------------------------------------

/** Everything the CCD equation says for one choice of star, aperture and sky. */
export function snrView(v) {
  const mag = Math.min(24, Math.max(8, v.mag));
  const exposure = Math.max(1, v.exposure);
  const radius = Math.max(1, v.radius);
  const sky = SKY_CHOICES[clamp(v.sky, 0, 2)];
  const rate = rateFromMagnitude(mag);
  const enclosed =
    1 - Math.exp(-(radius * radius) / (2 * SIGMA_PIX * SIGMA_PIX));
  const npix = Math.PI * radius * radius;
  const rIn = radius + 3;
  const rOut = radius + 8;
  const nBackground = Math.PI * (rOut * rOut - rIn * rIn);
  const p = {
    rate: rate * enclosed,
    skyRate: skyRateFromMagnitude(sky.mag),
    darkRate: DARK,
    readNoise: READ,
    npix,
    nBackground,
  };
  const terms = noiseTerms({
    signal: p.rate * exposure,
    npix,
    sky: p.skyRate * exposure,
    dark: DARK * exposure,
    readNoise: READ,
    nBackground,
  });
  const target = Math.max(1, v.target);
  const needed = exposureForSnr({ ...p, snr: target });
  // The faintest star (SNR 5 in this exposure): the kernel's closed form.
  const limit = limitingMagnitude(
    { ...p, zeroPoint: ZERO_POINT_V, enclosed },
    exposure,
    5
  );
  return {
    mag,
    exposure,
    radius,
    sky,
    rate,
    enclosed,
    npix,
    p,
    terms,
    target,
    needed,
    limit,
    dominant: dominantTerm(p, exposure),
  };
}

function drawSnr(canvas, v) {
  const a = snrView(v);
  const p = plot(
    canvas,
    [1, 3600],
    [0.1, 3000],
    ['detW.s.axisT', 'detW.s.axisSnr'],
    {
      logX: true,
      logY: true,
    }
  );
  const curve = (fn, color, dash) => {
    p.g.strokeStyle = color;
    p.g.lineWidth = 2;
    p.g.setLineDash(dash);
    p.g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const tt = 10 ** ((i / 120) * Math.log10(3600));
      const x = p.X(tt);
      const y = p.Y(Math.max(fn(tt), 1e-3));
      if (i === 0) p.g.moveTo(x, y);
      else p.g.lineTo(x, y);
    }
    p.g.stroke();
    p.g.setLineDash([]);
  };
  curve(tt => snrAt(a.p, tt), p.colors.accent, []);
  // The ideal: no sky, dark or read noise, only the star's own photons.
  curve(tt => Math.sqrt(a.p.rate * tt), p.colors.muted, [5, 4]);
  p.g.strokeStyle = p.colors.warn;
  p.g.lineWidth = 1.5;
  p.g.beginPath();
  p.g.moveTo(p.X(1), p.Y(a.target));
  p.g.lineTo(p.X(3600), p.Y(a.target));
  p.g.stroke();
  dot(p.g, p.X(a.exposure), p.Y(Math.max(a.terms.snr, 1e-3)), 5, p.colors.warn);
  p.done();
}

const SNR = {
  id: 'ccd-snr',
  get title() {
    return t('detW.s.title');
  },
  get note() {
    return t('detW.s.note');
  },
  animated: false,
  controls: [
    {
      id: 'mag',
      get label() {
        return t('detW.s.control.mag');
      },
      min: 10,
      max: 21,
      step: 0.5,
      value: 15,
      decimals: 1,
      format: v => `V = ${num(v)}`,
    },
    {
      id: 'exposure',
      get label() {
        return t('detW.s.control.exposure');
      },
      min: 1,
      max: 1200,
      step: 1,
      value: 60,
      decimals: 0,
      format: v => `${num(v)} s`,
    },
    {
      id: 'radius',
      get label() {
        return t('detW.s.control.radius');
      },
      min: 1,
      max: 10,
      step: 0.5,
      value: 5,
      decimals: 1,
      format: v => `${num(v)} px`,
    },
    {
      id: 'sky',
      get label() {
        return t('detW.s.control.sky');
      },
      min: 0,
      max: 2,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => t(`detW.s.sky.${SKY_CHOICES[clamp(v, 0, 2)].id}`),
    },
    {
      id: 'target',
      get label() {
        return t('detW.s.control.target');
      },
      min: 5,
      max: 200,
      step: 5,
      value: 100,
      decimals: 0,
      format: v => `SNR ${num(v)}`,
    },
  ],
  presets: [
    {
      values: { mag: 15, exposure: 60, radius: 5, sky: 1, target: 100 },
      get label() {
        return t('detW.s.preset.bright');
      },
    },
    {
      values: { mag: 19, exposure: 60, radius: 3, sky: 1, target: 20 },
      get label() {
        return t('detW.s.preset.faint');
      },
    },
    {
      values: { mag: 15, exposure: 60, radius: 5, sky: 2, target: 100 },
      get label() {
        return t('detW.s.preset.moon');
      },
    },
  ],
  draw: drawSnr,
  readout(v) {
    const a = snrView(v);
    const T = a.terms;
    return [
      sourceRow('detW.s.source'),
      {
        label: t('detW.s.row.rate'),
        value: withUnit(num(a.rate, 4), t('detW.u.eps')),
      },
      {
        label: t('detW.s.row.enclosed'),
        value: `${num(100 * a.enclosed, 3)} %`,
      },
      { label: t('detW.s.row.pixels'), value: num(a.npix, 3) },
      {
        label: t('detW.s.row.sky'),
        value: withUnit(num(a.p.skyRate, 3), t('detW.u.epspp')),
      },
      {
        label: t('detW.s.row.signal'),
        value: withUnit(num(T.source, 4), t('detW.u.e')),
        emphasis: true,
      },
      {
        label: t('detW.s.row.skyVar'),
        value: withUnit(num(T.sky, 4), t('detW.u.e2')),
      },
      {
        label: t('detW.s.row.darkVar'),
        value: withUnit(num(T.dark, 4), t('detW.u.e2')),
      },
      {
        label: t('detW.s.row.readVar'),
        value: withUnit(num(T.read, 4), t('detW.u.e2')),
      },
      {
        label: t('detW.s.row.noise'),
        value: withUnit(num(T.noise, 4), t('detW.u.e')),
        emphasis: true,
      },
      { label: t('detW.s.row.snr'), value: num(T.snr, 4), emphasis: true },
      {
        label: t('detW.s.row.dominant'),
        value: t(`detW.s.term.${a.dominant}`),
        emphasis: true,
      },
      {
        label: t('detW.s.row.needed'),
        value: withUnit(num(a.needed, 4), 's'),
        emphasis: true,
      },
      {
        label: t('detW.s.row.limit'),
        value: `V = ${num(a.limit, 3)}`,
        emphasis: true,
      },
      { label: t('detW.s.row.how'), value: t('detW.s.value.how') },
    ];
  },
};

// -----------------------------------------------------------------------------
// A variable star from frames
// -----------------------------------------------------------------------------

export const REDUCTIONS = Object.freeze([
  { skip: { bias: true, dark: true, flat: true, cosmic: true } },
  { skip: { flat: true, cosmic: true } },
  { skip: { cosmic: true } },
  { skip: {} },
]);

const seriesCache = new Map();
const calCache = new Map();

/** The series, its reduction at a chosen level, and the fit, computed once. */
export function seriesView(v) {
  const draw = clamp(v.draw, 1, 8);
  const reduction = clamp(v.reduction, 0, 3);
  const key = `${draw}:${reduction}`;
  if (seriesCache.has(key)) return seriesCache.get(key);
  let base = calCache.get(draw);
  if (!base) {
    base = {
      masters: buildMasters(labCalibration(draw), { gain: GAIN }),
      series: labSeries(draw),
    };
    calCache.set(draw, base);
    if (calCache.size > 4) calCache.delete(calCache.keys().next().value);
  }
  const stars = SERIES_FIELD.sources.map(s => ({ id: s.id, x: s.x, y: s.y }));
  const red = reduceSeries(base.series, base.masters, {
    gain: GAIN,
    readNoise: READ,
    darkRate: DARK,
    stars,
    comparison: 'C1',
    check: 'C2',
    skip: REDUCTIONS[reduction].skip,
  });
  const fit = fitLightCurve(red, { minPeriod: 0.05, maxPeriod: 0.3 });
  const inst = id => Float64Array.from(red.flux[id], f => -2.5 * Math.log10(f));
  const out = {
    draw,
    reduction,
    red,
    fit,
    series: base.series,
    instrumental: { V: inst('V'), C1: inst('C1'), C2: inst('C2') },
    meanDm: mean(red.dm),
    truthMeanDm:
      -2.5 *
      Math.log10(SERIES_FIELD.sources[0].rate / SERIES_FIELD.sources[1].rate),
  };
  seriesCache.set(key, out);
  if (seriesCache.size > 8) seriesCache.delete(seriesCache.keys().next().value);
  return out;
}

function drawSeries(canvas, v) {
  const s = seriesView(v);
  const mode = clamp(v.mode, 0, 3);
  const y =
    mode === 0
      ? s.instrumental.V
      : mode === 1
        ? s.instrumental.C1
        : mode === 2
          ? s.red.dm
          : s.red.check;
  const sig =
    mode >= 2 ? (mode === 2 ? s.red.dmSigma : s.red.checkSigma) : null;
  const lo = Math.min(...y);
  const hi = Math.max(...y);
  const pad = 0.1 * (hi - lo || 0.05);
  const t = s.red.times;
  const p = plot(
    canvas,
    [0, t[t.length - 1]],
    [hi + pad, lo - pad],
    ['detW.d.axisT', mode < 2 ? 'detW.d.axisInst' : 'detW.d.axisDiff']
  );
  for (let i = 0; i < t.length; i++) {
    if (sig) {
      p.g.strokeStyle = p.colors.muted;
      p.g.beginPath();
      p.g.moveTo(p.X(t[i]), p.Y(y[i] - sig[i]));
      p.g.lineTo(p.X(t[i]), p.Y(y[i] + sig[i]));
      p.g.stroke();
    }
    dot(p.g, p.X(t[i]), p.Y(y[i]), 3, p.colors.accent);
  }
  if (mode === 2) {
    const f = s.fit;
    p.g.strokeStyle = p.colors.warn;
    p.g.lineWidth = 2;
    p.g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const tt = (i / 200) * t[t.length - 1];
      const arg = (2 * Math.PI * tt) / f.period;
      const yy = f.c + f.a * Math.sin(arg) + f.b * Math.cos(arg);
      if (i === 0) p.g.moveTo(p.X(tt), p.Y(yy));
      else p.g.lineTo(p.X(tt), p.Y(yy));
    }
    p.g.stroke();
  }
  p.done();
}

const DIFF = {
  id: 'diff-photometry',
  get title() {
    return t('detW.d.title');
  },
  get note() {
    return t('detW.d.note');
  },
  animated: false,
  controls: [
    {
      id: 'mode',
      get label() {
        return t('detW.d.control.mode');
      },
      min: 0,
      max: 3,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(`detW.d.mode.${clamp(v, 0, 3)}`),
    },
    {
      id: 'reduction',
      get label() {
        return t('detW.d.control.reduction');
      },
      min: 0,
      max: 3,
      step: 1,
      value: 3,
      decimals: 0,
      format: v => t(`detW.d.reduction.${clamp(v, 0, 3)}`),
    },
    {
      id: 'draw',
      get label() {
        return t('detW.d.control.draw');
      },
      min: 1,
      max: 8,
      step: 1,
      value: 1,
      decimals: 0,
      format: v => `#${clamp(v, 1, 8)}`,
    },
    {
      id: 'truth',
      get label() {
        return t('detW.d.control.truth');
      },
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: v => t(isOn(v) ? 'detW.d.truth.show' : 'detW.d.truth.hide'),
    },
  ],
  presets: [
    {
      values: { mode: 0, reduction: 3, draw: 1, truth: 0 },
      get label() {
        return t('detW.d.preset.raw');
      },
    },
    {
      values: { mode: 2, reduction: 3, draw: 1, truth: 0 },
      get label() {
        return t('detW.d.preset.diff');
      },
    },
    {
      values: { mode: 2, reduction: 3, draw: 1, truth: 1 },
      get label() {
        return t('detW.d.preset.truth');
      },
    },
  ],
  draw: drawSeries,
  readout(v) {
    const s = seriesView(v);
    const f = s.fit;
    const rows = [
      sourceRow('detW.d.source'),
      { label: t('detW.d.row.frames'), value: String(s.red.times.length) },
      {
        label: t('detW.d.row.rawScatter'),
        value: withUnit(num(s.red.targetScatterRaw, 3), 'mag'),
        emphasis: true,
      },
      {
        label: t('detW.d.row.checkScatter'),
        value: withUnit(num(s.red.checkScatter, 3), 'mag'),
        emphasis: true,
      },
      {
        label: t('detW.d.row.meanDm'),
        value: withUnit(num(s.meanDm, 3), 'mag'),
        emphasis: true,
      },
      {
        label: t('detW.d.row.period'),
        value: withUnit(num(f.period, 3), 'd'),
        emphasis: true,
      },
      {
        label: t('detW.d.row.amplitude'),
        value: `${num(f.amplitude, 3)} ± ${num(f.sigmaAmplitude, 2)} mag`,
        emphasis: true,
      },
      {
        label: t('detW.d.row.chi2'),
        value: num(f.chi2 / f.dof, 3),
      },
    ];
    if (isOn(v.truth))
      rows.push(
        {
          label: t('detW.d.row.truthPeriod'),
          value: withUnit(num(SERIES_FIELD.series.period, 3), 'd'),
        },
        {
          label: t('detW.d.row.truthAmplitude'),
          value: withUnit(num(SERIES_FIELD.series.amplitude, 3), 'mag'),
        },
        {
          label: t('detW.d.row.truthDm'),
          value: withUnit(num(s.truthMeanDm, 3), 'mag'),
        }
      );
    rows.push({ label: t('detW.d.row.how'), value: t('detW.d.value.how') });
    return rows;
  },
};

export const DETECTOR_WIDGETS = [FRAMES, SNR, DIFF];
