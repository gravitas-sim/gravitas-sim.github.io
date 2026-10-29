// =============================================================================
// A telescope's frame, searched and measured with the tools the Observatory ships
// (Prompt 208, TELESCOPES.md)
// -----------------------------------------------------------------------------
// The measuring half of the telescope panel: js/kernels/detector/telescope.js
// makes the frame (a synthetic one, and it says so); Prompt 183's tools
// (js/measure/detect.js) detect the sources and fit the stars' point-spread
// function with a Moffat model; this module only matches what they list to the
// stars that were placed. No statistic is computed here: every width and every
// signal to noise is a tool's own, and every quantity that is not a measurement
// (the Rayleigh separation, the dip, the light gathered) is the kernel's.
//
// Two numbers are kept apart on purpose: `rayleighArcsec` is the first dark ring
// of the aperture's diffraction pattern (a criterion, computed) and
// `measuredFwhmArcsec` is the full width at half maximum of the model fitted to
// the reference stars of this frame (a measurement of a profile, with the seeing
// and the fit's own model in it). The width is not the resolution limit.
// Pure; no DOM (the instrument draws it).
// =============================================================================

import { permits } from './dataKinds/contract.js';
import { adapt } from './measure/photometry.js';
import {
  DEFAULTS as DETECT,
  detectIn,
  fitStar,
  measurePsf,
} from './measure/detect.js';
import {
  DETECTOR,
  skyRate,
  telescopeFrame,
} from './kernels/detector/telescope.js';
import { snrAt } from './kernels/detector/snr.js';
import {
  collectingAreaM2,
  EYE_PUPIL_M,
  lightGathering,
  pairDip,
  toArcsec,
  toRad,
} from './kernels/detector/optics.js';

const { Math, Float64Array } = globalThis;

/** The match between a placed star and a listed source, pixels. */
export const MATCH_PX = 2.5;

/** The contract Prompt 180's and 183's tools need: a quantitative synthetic frame, bias subtracted, in ADU. */
function contract(r) {
  const t = r.config;
  const sat = DETECTOR.fullWell / DETECTOR.gain;
  return {
    format: 'gravitas.image',
    formatVersion: 1,
    id: `${t.seed}:frame`,
    use: 'quantitative',
    width: t.size,
    height: t.size,
    planes: { data: { encoding: 'float64-le' } },
    pixels: {
      unit: 'adu',
      linearity: {
        status: 'linear',
        limit: 0.9 * sat,
        source: 'the forward model has no nonlinearity below full well',
      },
      saturation: { level: sat, source: 'full well over the gain' },
      gain: { value: DETECTOR.gain, unit: 'electron/adu', source: 'header' },
      readNoise: {
        value: DETECTOR.readNoise,
        unit: 'electron',
        source: 'header',
      },
    },
    time: {
      value: '2026-01-01T00:00:00Z',
      scale: 'UTC',
      format: 'iso',
      reference: 'mid',
    },
    exposure: { seconds: t.exposureS, kind: 'effective' },
    calibration: { state: 'bias-subtracted' },
    history: [],
    source: {
      kind: 'synthetic',
      model: {
        name: 'telescope frame (js/kernels/detector/telescope.js)',
        parameters: {
          apertureM: t.apertureM,
          obstruction: t.obstruction,
          wavelengthNm: t.wavelengthNm,
          seeingArcsec: t.seeingArcsec,
        },
      },
    },
  };
}

/** The frame as the tools take it (counts less the bias), adapted. */
export function adaptedFrame(r) {
  const frame = {
    id: `${r.config.seed}:frame`,
    width: r.frame.width,
    height: r.frame.height,
    data: Float64Array.from(r.frame.values, v => v - DETECTOR.biasLevel),
    mask: null,
    sidecar: contract(r),
  };
  return { frame, a: adapt(frame, permits) };
}

const near = (s, p, r = MATCH_PX) => Math.hypot(s.x - p.x, s.y - p.y) <= r;

/**
 * Make the frame of a config and measure it. The width comes from the reference stars (isolated, well exposed)
 * by Prompt 183's Moffat fit; a `single` scene fits its one star. `det` is `detectIn`'s list at `sigma`.
 */
export function measureTelescope(config = {}, { sigma = 4 } = {}) {
  const r = telescopeFrame(config);
  const t = r.config;
  const { a } = adaptedFrame(r);
  const px = t.pixelScaleArcsec;
  const out = {
    ok: false,
    result: r,
    config: t,
    synthetic: true,
    pixelScaleArcsec: px,
    rayleighArcsec: toArcsec(r.psf.rayleigh),
    airyFwhmArcsec: toArcsec(r.psf.airyFwhm),
    truthFwhmArcsec: toArcsec(r.psf.fwhm),
    lightGathering: lightGathering(t, { apertureM: 0.1 }),
    againstEye: lightGathering(t, { apertureM: EYE_PUPIL_M }),
    areaM2: collectingAreaM2(t.apertureM, t.obstruction),
  };
  if (!a.ok) return { ...out, code: a.code };
  const guess = Math.max(2, r.truth.combinedFwhmPx);
  const det = detectIn(a, {
    ...DETECT,
    sigma,
    fwhm: Math.min(Math.max(guess, 1.5), 12),
    box: Math.min(256, Math.max(16, Math.round(4 * r.truth.combinedFwhmPx))),
  });
  if (!det.ok) return { ...out, code: det.code };
  out.det = det;
  out.a = a;
  out.sources = det.sources;
  const placed = r.stars;
  const radius = Math.max(MATCH_PX, 0.75 * r.truth.combinedFwhmPx);
  const matched = s => placed.find(p => near(s, p, radius)) ?? null;
  out.sources.forEach(s => (s.placed = matched(s)));
  const refs = det.sources.filter(
    s =>
      s.placed &&
      (s.placed.role === 'reference' || s.placed.role === 'single') &&
      !s.flags.includes('saturated') &&
      !s.flags.includes('edge')
  );
  out.saturated = det.sources.some(s => s.flags.includes('saturated'));
  if (refs.length) {
    const fits = refs.map(s => ({
      id: s.placed.id,
      x: s.x,
      y: s.y,
      flux: s.flux ?? s.segmentFlux,
      fwhm: Math.max(guess, 1.5),
    }));
    const psf = measurePsf(a, det, fits, { model: 'moffat' });
    out.psf = psf;
    if (psf.ok) {
      out.measuredFwhmPx = psf.fwhm.mean;
      out.measuredFwhmSigmaPx = psf.fwhm.sigma;
      out.measuredFwhmArcsec = psf.fwhm.mean * px;
      out.measuredFwhmSigmaArcsec = psf.fwhm.sigma * px;
      out.modelLimited = psf.modelLimited;
      out.beta = psf.beta?.mean ?? null;
    }
  }
  // The pair: the model's dip (the kernel's) and what the list holds near it.
  if (t.scene === 'pair') {
    const dip = pairDip(r.psf, toRad(t.separationArcsec));
    out.pair = {
      separationArcsec: t.separationArcsec,
      dip: dip.dip,
      midpointOverPeak: dip.ratio,
      listed: det.sources.filter(s => s.placed?.role === 'pair').length,
      sources: det.sources.filter(s => {
        const c = placed.filter(p => p.role === 'pair');
        const mx = (c[0].x + c[1].x) / 2;
        const my = (c[0].y + c[1].y) / 2;
        return (
          Math.hypot(s.x - mx, s.y - my) <= Math.max(3, c[1].x - c[0].x + 3)
        );
      }).length,
      rayleighRatio: t.separationArcsec / out.rayleighArcsec,
    };
  }
  if (t.scene === 'field') {
    const f = det.sources.find(s => s.placed?.role === 'faint') ?? null;
    const p = placed.find(s => s.role === 'faint');
    // The signal to noise the CCD equation gives for the faint star in an aperture one FWHM in radius (a prediction
    // from the stated rates; the detector's own list is the measurement).
    const rAp = r.psf.fwhm;
    const npix = Math.PI * (rAp / toRad(px)) ** 2;
    const expectedSnr = snrAt(
      {
        rate: p.rate * r.psf.encircled(rAp),
        npix,
        skyRate: skyRate(t),
        readNoise: DETECTOR.readNoise,
      },
      t.exposureS
    );
    out.faint = {
      detected: Boolean(f),
      snr: f?.snr ?? null,
      expectedSnr,
      electrons: p.electrons,
      magnitude: p.mag,
      listed: det.sources.length,
      field: placed
        .filter(s => s.role === 'field')
        .map(s => ({
          id: s.id,
          mag: s.mag,
          found: det.sources.some(q => q.placed?.id === s.id),
        })),
    };
  }
  out.ok = true;
  return out;
}

/** The brightest source's Moffat fit (the ensemble's contract, TELESCOPES.md C1 and C2). */
export function fitBrightest(config = {}, { sigma = 4 } = {}) {
  const r = telescopeFrame({ scene: 'single', ...config });
  const { a } = adaptedFrame(r);
  if (!a.ok) return { ok: false, code: a.code, result: r };
  const guess = Math.max(2, r.truth.combinedFwhmPx);
  const det = detectIn(a, {
    ...DETECT,
    sigma,
    fwhm: Math.min(Math.max(guess, 1.5), 12),
  });
  if (!det.ok || !det.sources.length)
    return { ok: false, code: det.code ?? 'no-sources', result: r };
  const top = [...det.sources].sort((p, q) => (q.flux ?? 0) - (p.flux ?? 0))[0];
  const fit = fitStar(
    a,
    det,
    {
      x: top.x,
      y: top.y,
      flux: top.flux ?? top.segmentFlux,
      fwhm: Math.max(guess, 1.5),
    },
    { model: 'moffat' }
  );
  return { ok: fit.ok, code: fit.code, fit, result: r, det };
}
