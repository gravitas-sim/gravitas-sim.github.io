// =============================================================================
// A telescope's frame: a synthetic double star and a faint field (TELESCOPES.md)
// -----------------------------------------------------------------------------
// The detector kernel's frame model (frame.js) fed by optics.js instead of one
// Gaussian: a telescope of stated aperture, obstruction, focal ratio, wavelength
// and seeing makes the profile; the pixel scale follows from the focal length and
// the pixel pitch; the stars' electrons come from lab.js (its zero point and its
// teaching telescope's area) scaled by this telescope's collecting area. The
// detector is clean (no flat, dark, hot pixels or cosmic rays: Prompts 175 and
// the calibration lab own those) and the frame is synthetic and says so.
//
// One wavelength sets the diffraction; the stars' brightness is in V whatever it
// is (a stated simplification). The seeing is an input in arcseconds.
//
// Pure: no DOM. A frame is a pure function of its config, the seed included.
// =============================================================================

import { simulateFrame } from './frame.js';
import { AREA_M2, ZERO_POINT_V, skyRateFromMagnitude } from './lab.js';
import {
  MOFFAT_BETA,
  OpticsError,
  collectingAreaM2,
  focalLengthM,
  opticsPsf,
  pixelScaleArcsec,
  toArcsec,
  toRad,
} from './optics.js';
import { stream } from '../../random/streams.js';

const { Math, Float64Array } = globalThis;

export const VERSION = '1.0.0';

/** What a config leaves out. */
export const DEFAULTS = Object.freeze({
  apertureM: 0.25,
  obstruction: 0.3,
  focalRatio: 8,
  pixelM: 1e-5,
  wavelengthNm: 550,
  seeingArcsec: 1,
  beta: MOFFAT_BETA,
  exposureS: 60,
  /** Pixels on a side; 'auto' makes it wide enough for the stars' profile (at least 64, at most 128). */
  size: 'auto',
  skyMag: 20,
  scene: 'pair',
  separationArcsec: 1,
  pairMag: 14,
  faintMag: 19,
  /** The reference stars are chosen, as at a telescope, to be well exposed and not saturated: this many electrons each (a magnitude is derived unless refMag is given). */
  refElectrons: 80000,
  refMag: null,
  magnitude: 15.5,
  seed: 'telescope',
});

/** The detector of these frames: clean, 8 electrons of read noise, 8 electrons per count, full well 500,000. */
export const DETECTOR = Object.freeze({
  gain: 8,
  readNoise: 8,
  biasLevel: 500,
  biasColumnSigma: 0,
  darkRate: 0,
  hotFraction: 0,
  qeScatter: 0,
  vignette: 0,
  dustCount: 0,
  cosmicRate: 0,
  fullWell: 500000,
  adcMax: 65535,
});

/** The reference stars every scene carries (positions as fractions of the frame; V magnitudes are `refMag` plus the offset). */
const REFERENCES = [
  [0.25, 0.25, 0],
  [0.75, 0.25, 0.4],
  [0.25, 0.75, 0.8],
];
/** The faint field: fractions of the frame and offsets in magnitude from `faintMag` (negative: brighter). */
const FIELD = [
  [0.78, 0.78, -3.2],
  [0.55, 0.15, -2.6],
  [0.4, 0.45, -2.0],
  [0.85, 0.5, -1.4],
  [0.55, 0.85, -0.8],
];
const FAINT_AT = [0.62, 0.45];

const finitePos = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || !(v > 0))
    throw new OpticsError('input', `${name} is a finite number above zero`);
  return v;
};

/** The config, completed and checked; the derived scale and focal length with it. */
export function normalizeTelescope(c = {}) {
  const t = { ...DEFAULTS, ...c };
  finitePos(t.apertureM, 'the aperture');
  finitePos(t.focalRatio, 'the focal ratio');
  finitePos(t.pixelM, 'the pixel pitch');
  finitePos(t.wavelengthNm, 'the wavelength');
  finitePos(t.exposureS, 'the exposure');
  if (!['pair', 'field', 'single'].includes(t.scene))
    throw new OpticsError('input', `no scene ${t.scene}`);
  if (
    typeof t.seeingArcsec !== 'number' ||
    !Number.isFinite(t.seeingArcsec) ||
    t.seeingArcsec < 0
  )
    throw new OpticsError('seeing', 'the seeing FWHM is zero or more');
  if (!(Number.isFinite(t.separationArcsec) && t.separationArcsec >= 0))
    throw new OpticsError('input', 'the separation is zero or more');
  const focalLength = focalLengthM(t.apertureM, t.focalRatio);
  const pixelScale = pixelScaleArcsec(focalLength, t.pixelM);
  let size = t.size;
  if (size === 'auto') {
    const fwhmPx = toArcsec(opticsOf(t).fwhm) / pixelScale;
    size = Math.min(128, Math.max(64, Math.ceil((16 * fwhmPx) / 8) * 8));
  }
  if (!(Number.isInteger(size) && size >= 16 && size <= 128))
    throw new OpticsError('input', 'the frame is 16 to 128 pixels square');
  return {
    ...t,
    size,
    focalLengthM: focalLength,
    pixelScaleArcsec: pixelScale,
  };
}

/** The optics (optics.js's psf) of a config. */
export function opticsOf(t) {
  return opticsPsf({
    apertureM: t.apertureM,
    wavelengthM: t.wavelengthNm * 1e-9,
    obstruction: t.obstruction,
    seeingRad: toRad(t.seeingArcsec),
    beta: t.beta,
  });
}

/** Electrons per second from a V = m star through this aperture (lab.js's zero point and area). */
export const starRate = (t, m) =>
  ZERO_POINT_V *
  (collectingAreaM2(t.apertureM, t.obstruction) / AREA_M2) *
  10 ** (-0.4 * m);

/** Sky electrons per second per pixel of this scale, from a surface brightness in V magnitudes per square arcsecond. */
export const skyRate = t =>
  skyRateFromMagnitude(t.skyMag) *
  (collectingAreaM2(t.apertureM, t.obstruction) / AREA_M2) *
  t.pixelScaleArcsec ** 2;

/**
 * The profile frame.js draws with: the combined profile's intensity per square pixel on a table, the radius
 * beyond which light is dropped (the larger of 5 FWHM and the 99.5 percent radius, at most 12 FWHM and the frame
 * size) and the sub-pixel grid.
 */
export function frameProfile(psf, scaleArcsec, size) {
  const px = toRad(scaleArcsec);
  const fwhmPx = psf.fwhm / px;
  let hi = psf.fwhm;
  while (psf.encircled(hi) < 0.995 && hi < 12 * psf.fwhm) hi *= 1.5;
  let lo = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (psf.encircled(mid) < 0.995) lo = mid;
    else hi = mid;
  }
  const reach = Math.min(Math.max(5 * fwhmPx, hi / px), 12 * fwhmPx, size);
  const stepPx = Math.min(1, psf.lambdaOverD / px, fwhmPx) / 16;
  const n = Math.min(4000, Math.ceil(reach / stepPx) + 2);
  const step = reach / (n - 2) > stepPx ? reach / (n - 2) : stepPx;
  const table = psf.table(step * px, n);
  const values = new Float64Array(table.length);
  for (let i = 0; i < table.length; i++) values[i] = table[i] * px * px;
  return {
    step,
    values,
    reach,
    subsamples: Math.max(3, Math.min(9, Math.ceil(6 / Math.max(fwhmPx, 0.5)))),
    enclosed: psf.encircled(reach * px),
  };
}

/** The stars of a scene: pixel positions (0-based, centres at integers), V magnitude, a role and an id. */
export function sceneStars(t) {
  const size = t.size;
  const draw = stream('noise', t.seed, 'offsets');
  const u = () => draw() - 0.5;
  const at = f => (size - 1) * f;
  const stars = [];
  if (t.scene === 'single') {
    stars.push({
      id: 'S',
      role: 'single',
      x: at(0.5) + u(),
      y: at(0.5) + u(),
      mag: t.magnitude,
    });
    return stars;
  }
  const refMag =
    t.refMag ??
    -2.5 * Math.log10(t.refElectrons / (starRate(t, 0) * t.exposureS));
  REFERENCES.forEach(([fx, fy, dm], i) =>
    stars.push({
      id: `R${i + 1}`,
      role: 'reference',
      x: at(fx) + u(),
      y: at(fy) + u(),
      mag: refMag + dm,
    })
  );
  if (t.scene === 'pair') {
    const cx = at(0.55) + u();
    const cy = at(0.55) + u();
    const half = t.separationArcsec / t.pixelScaleArcsec / 2;
    stars.push({ id: 'A', role: 'pair', x: cx - half, y: cy, mag: t.pairMag });
    stars.push({ id: 'B', role: 'pair', x: cx + half, y: cy, mag: t.pairMag });
  } else {
    FIELD.forEach(([fx, fy, dm], i) =>
      stars.push({
        id: `F${i + 1}`,
        role: 'field',
        x: at(fx) + u(),
        y: at(fy) + u(),
        mag: t.faintMag + dm,
      })
    );
    stars.push({
      id: 'faint',
      role: 'faint',
      x: at(FAINT_AT[0]) + u(),
      y: at(FAINT_AT[1]) + u(),
      mag: t.faintMag,
    });
  }
  return stars;
}

/**
 * One frame of a telescope: `{ frame, config, psf, stars, profile, truth }`. `frame.values` are counts (bias
 * included); `truth` is the manifest of what made the frame, and says it is synthetic.
 */
export function telescopeFrame(config = {}) {
  const t = normalizeTelescope(config);
  const psf = opticsOf(t);
  const profile = frameProfile(psf, t.pixelScaleArcsec, t.size);
  const stars = sceneStars(t);
  const frame = simulateFrame({
    seed: `${t.seed}:frame`,
    exposure: t.exposureS,
    detector: { ...DETECTOR, width: t.size, height: t.size },
    scene: {
      sky: skyRate(t),
      sources: stars.map(s => ({ x: s.x, y: s.y, rate: starRate(t, s.mag) })),
    },
    psf: profile,
  });
  return {
    frame,
    config: t,
    psf,
    profile,
    stars: stars.map(s => ({
      ...s,
      rate: starRate(t, s.mag),
      electrons: starRate(t, s.mag) * t.exposureS,
    })),
    truth: {
      synthetic: true,
      combinedFwhmArcsec: toArcsec(psf.fwhm),
      combinedFwhmPx: psf.fwhm / toRad(t.pixelScaleArcsec),
      airyFwhmArcsec: toArcsec(psf.airyFwhm),
      rayleighArcsec: toArcsec(psf.rayleigh),
      pixelScaleArcsec: t.pixelScaleArcsec,
      focalLengthM: t.focalLengthM,
      encircledAtReach: profile.enclosed,
    },
  };
}
