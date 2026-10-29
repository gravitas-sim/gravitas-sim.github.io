// =============================================================================
// A frame with the detector's effects, its sidecar and its measurements (Prompt 211)
// -----------------------------------------------------------------------------
// The measuring half of the detector-effects panel. js/kernels/detector/frame.js
// makes the frame (synthetic, and it says so) with the effects the config asks
// for; this module writes the image sidecar of the data-kinds contract for it (the
// pixel limits, the mask plane with its named bits, the effect parameters) and
// measures each star with Prompt 180's tools, which refuse what the effects spoil.
// No statistic is computed here: every flux and noise is a tool's, every flag the
// frame's own truth.
//
// Two flags are kept apart on purpose: the flag plane is what the forward model
// did (its truth); the mask plane the tools see carries only the bleed and
// cosmic-ray bits (a pixel the tools cannot judge from its value alone). A
// saturated or nonlinear pixel is caught by its value against the contract's limit.
// Pure; no DOM (the instrument draws it).
// =============================================================================

import { permits } from './dataKinds/contract.js';
import { adapt, apertureFor, measure } from './measure/photometry.js';
import { detectIn, DEFAULTS as DETECT } from './measure/detect.js';
import { simulateFrame } from './kernels/detector/frame.js';
import { FLAG, FLAG_MEANINGS } from './kernels/detector/effects.js';
import { rateFromMagnitude } from './kernels/detector/lab.js';

const { Math, Float64Array, Uint8Array } = globalThis;

export const SIZE = 64;
export const DETECTOR = Object.freeze({
  width: SIZE,
  height: SIZE,
  gain: 1.5,
  readNoise: 8,
  biasLevel: 500,
  biasColumnSigma: 0,
  darkRate: 0.1,
  hotFraction: 0,
  fullWell: 50000,
  qeScatter: 0,
  vignette: 0,
  dustCount: 0,
  dustDepth: 0,
  cosmicRate: 0.15,
  fwhm: 2.8,
});
/** Photometry's radii in FWHM: aperture, annulus. */
export const RATIOS = Object.freeze({ r: 1.5, rIn: 2.5, rOut: 4 });
const SKY = 3;

/**
 * The field: one bright star, two faint ones on its column (on the bleed trail),
 * a faint control off every trail, and a ladder of four stars of rising brightness
 * to show the response. Positions in pixels (0-based); magnitudes in V.
 */
export const STARS = Object.freeze([
  { id: 'S', role: 'bright', x: 24.3, y: 31.6 },
  { id: 'N1', role: 'trail', x: 24.6, y: 16.7, mag: 14.5 },
  { id: 'N2', role: 'trail', x: 24.2, y: 46.5, mag: 14.5 },
  { id: 'C', role: 'control', x: 46.4, y: 18.7, mag: 14.5 },
  { id: 'L1', role: 'ladder', x: 8.3, y: 44.6, mag: 14.0 },
  { id: 'L2', role: 'ladder', x: 41.2, y: 36.4, mag: 13.2 },
  { id: 'L3', role: 'ladder', x: 54.5, y: 52.2, mag: 12.7 },
  { id: 'L4', role: 'ladder', x: 53.6, y: 8.4, mag: 12.4 },
  { id: 'L5', role: 'ladder', x: 11.4, y: 18.8, mag: 12.1 },
]);

export const DEFAULTS = Object.freeze({
  brightMag: 9.5,
  exposureS: 60,
  nonlinearity: false,
  cosmic: false,
  bleed: false,
  fwhmPx: 2.8,
  seed: 'detector-effects',
});

export function normalizeConfig(config = {}) {
  const c = { ...DEFAULTS, ...config };
  if (!(c.brightMag >= 4 && c.brightMag <= 16))
    throw new Error('the bright star’s magnitude is between 4 and 16');
  if (!(c.exposureS > 0 && c.exposureS <= 600))
    throw new Error('the exposure is between 0 and 600 seconds');
  if (!(c.fwhmPx >= 0.8 && c.fwhmPx <= 6))
    throw new Error('the profile’s width is between 0.8 and 6 pixels');
  return c;
}

const effectsOf = c => ({
  fwhmPx: c.fwhmPx,
  cosmic: c.cosmic ? { rate: DETECTOR.cosmicRate } : false,
  ...(c.nonlinearity ? { nonlinearity: true } : {}),
  ...(c.bleed ? { bleed: true } : {}),
});

/** The frame of a config: { config, frame, stars, detector }. Synthetic. */
export function effectsFrame(config = {}) {
  const c = normalizeConfig(config);
  const stars = STARS.map(s => ({
    ...s,
    mag: s.mag ?? c.brightMag,
    rate: rateFromMagnitude(s.mag ?? c.brightMag),
  }));
  const detector = { ...DETECTOR, fwhm: c.fwhmPx };
  const frame = simulateFrame({
    seed: c.seed,
    kind: 'science',
    exposure: c.exposureS,
    detector,
    effects: effectsOf(c),
    scene: {
      sky: SKY,
      sources: stars.map(({ x, y, rate }) => ({ x, y, rate })),
    },
  });
  return { config: c, frame, stars, detector: frame.truth.detector };
}

/** The sidecar of the data-kinds contract for a rendered frame (the pixels are ADU less the bias). */
export function effectsSidecar(r, { maskPlane = true } = {}) {
  const t = r.frame.truth;
  const fx = t.effects;
  const d = r.detector;
  const nl = fx.applied.nonlinearity;
  const limitE = fx.linearLimitElectrons;
  const level = fx.plateauElectrons / d.gain;
  const limit = (limitE ?? d.fullWell - 5 * d.readNoise) / d.gain;
  return {
    format: 'gravitas.image',
    formatVersion: 1,
    id: `${r.config.seed}:effects`,
    use: 'quantitative',
    width: r.frame.width,
    height: r.frame.height,
    planes: {
      data: { encoding: 'float64-le' },
      ...(maskPlane
        ? {
            mask: {
              encoding: 'uint8',
              bits: FLAG_MEANINGS.map(b => ({ ...b })),
              bitsSource: 'DETECTOR_EFFECTS.md (the flag bits)',
            },
          }
        : {}),
    },
    pixels: {
      unit: 'adu',
      linearity: {
        status: 'linear',
        limit,
        source: nl
          ? `the forward model's stated response, ${(100 * nl.safeDeviation).toFixed(0)} percent below linear at this level`
          : 'the forward model is linear below the full well; the limit is 5 read-noise sigma below the plateau',
      },
      saturation: {
        level,
        source: 'the response at the full well over the gain',
      },
      gain: { value: d.gain, unit: 'electron/adu', source: 'header' },
      readNoise: { value: d.readNoise, unit: 'electron', source: 'header' },
    },
    time: {
      value: '2026-01-01T00:00:00Z',
      scale: 'UTC',
      format: 'iso',
      reference: 'mid',
    },
    exposure: { seconds: r.config.exposureS, kind: 'effective' },
    calibration: { state: 'bias-subtracted' },
    history: [],
    source: {
      kind: 'synthetic',
      model: {
        name: 'ccd frame with effects (js/kernels/detector/frame.js, effects.js)',
        parameters: {
          effects: [
            ...(nl ? ['nonlinearity'] : []),
            ...(fx.applied.cosmic === 'tracks' ? ['cosmic rays (tracks)'] : []),
            ...(fx.applied.bleed ? ['bleeding'] : []),
          ].join(', '),
          kneeFraction: nl ? nl.kneeFraction : 'none',
          fullWellElectrons: d.fullWell,
          sampling: fx.sampling.regime,
          fwhmPx: fx.sampling.fwhmPx,
          assumed:
            'the response curve, the track deposit and the bleed rule are stated models, not measurements of a detector',
        },
      },
    },
  };
}

/** The pixels the tools see: counts less the bias, and the mask of the bits a value cannot show. */
export function adaptedEffectsFrame(
  r,
  { withMask = true, maskBits = FLAG.bleed | FLAG.cosmic } = {}
) {
  const f = r.frame;
  const t = f.truth;
  const flags = t.effects.flags;
  const W = f.width;
  const frame = {
    id: `${r.config.seed}:effects`,
    width: W,
    height: f.height,
    data: Float64Array.from(
      f.values,
      (v, i) => v - r.detector.biasLevel - t.biasPattern[i % W]
    ),
    mask: withMask ? Uint8Array.from(flags, b => (b & maskBits ? 1 : 0)) : null,
    sidecar: effectsSidecar(r, { maskPlane: withMask }),
  };
  return { frame, a: adapt(frame, permits) };
}

const NAMES = [
  [FLAG.saturated, 'saturated'],
  [FLAG.bleed, 'bleed'],
  [FLAG.cosmic, 'cosmic'],
  [FLAG.nonlinear, 'nonlinear'],
];

/** The flag names set anywhere within `r` pixels of (x, y). */
export function flagsNear(flags, W, H, x, y, r) {
  let bits = 0;
  for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(H - 1, Math.ceil(y + r)); j++)
    for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(W - 1, Math.ceil(x + r)); i++)
      if (Math.hypot(i - x, j - y) <= r) bits |= flags[j * W + i];
  return NAMES.filter(([b]) => bits & b).map(([, n]) => n);
}

/**
 * The marks table: every star, its truth, the tool's measurement or its refusal,
 * and the sidecar's flags near it.
 * @returns {{config, rows: Array<object>, sidecar: object, regime: string}}
 */
export function measureEffects(config = {}, { withMask = true } = {}) {
  const r = effectsFrame(config);
  const { a } = adaptedEffectsFrame(r, { withMask });
  const fx = r.frame.truth.effects;
  const ap = apertureFor(r.config.fwhmPx);
  const rAp = RATIOS.r * r.config.fwhmPx;
  const W = r.frame.width;
  const H = r.frame.height;
  const enc = 1 - Math.exp(-((rAp / (r.config.fwhmPx / 2.3548200450309493)) ** 2) / 2);
  const rows = r.stars.map(s => {
    const truth = s.rate * r.config.exposureS * enc;
    let peak = 0;
    for (let j = Math.max(0, Math.round(s.y) - 1); j <= Math.min(H - 1, Math.round(s.y) + 1); j++)
      for (let i = Math.max(0, Math.round(s.x) - 1); i <= Math.min(W - 1, Math.round(s.x) + 1); i++)
        peak = Math.max(peak, a.ok ? a.image.values[j * W + i] : 0);
    const base = {
      peak,
      id: s.id,
      role: s.role,
      mag: s.mag,
      x: s.x,
      y: s.y,
      truthElectrons: truth,
      flags: flagsNear(fx.flags, W, H, s.x, s.y, rAp),
    };
    if (!a.ok) return { ...base, code: a.code };
    const m = measure(a, {
      x: s.x,
      y: s.y,
      r: rAp,
      rIn: RATIOS.rIn * r.config.fwhmPx,
      rOut: RATIOS.rOut * r.config.fwhmPx,
    });
    if (!m.ok) return { ...base, code: m.code };
    return {
      ...base,
      net: m.net,
      sigma: m.sigma,
      snr: m.snr,
      pull: (m.net - truth) / m.sigma,
    };
  });
  return {
    config: r.config,
    result: r,
    rows,
    sidecar: a.ok ? null : null,
    regime: fx.sampling.regime,
    aperture: ap,
    ok: a.ok,
    code: a.ok ? null : a.code,
  };
}

/** Prompt 183's detector over the frame, for the flag it puts on a saturated source. */
export function detectEffects(r, { withMask = true } = {}) {
  const { a } = adaptedEffectsFrame(r, { withMask });
  if (!a.ok) return { ok: false, code: a.code };
  return detectIn(a, {
    ...DETECT,
    sigma: 5,
    fwhm: Math.max(1.5, r.config.fwhmPx),
    box: 16,
  });
}
