// A CCD frame as a gravitas.observation: the detector kernel's forward model
// (js/kernels/detector/frame.js, CALIBRATION_LAB.md) behind the forward-model
// contract. The imager setup gives the array and the optics (width, height,
// pixelScale in arcsec per pixel, psfFwhm in arcsec); the model state gives the
// detector, the scene and the kind of frame. The setup's noise block is not
// used: the noise of a CCD is its physics (photon, dark, read), a stated
// parameter of the detector, and the truth manifest lists each.
//
// Pixel coordinates in the observation and in `state.sources` are FITS's: 1 at
// the center of the first pixel (the image model's convention). The kernel
// counts from 0; the conversion is the one line below.
//
// state: {
//   kind: 'science' | 'bias' | 'dark' | 'flat'   (default science)
//   exposure: seconds
//   scene: { sky: electrons/s/pixel, sources: [{ x, y, rate: electrons/s }] }
//   detector: overrides of DEFAULT_DETECTOR (gain, readNoise, biasLevel, ...)
//   transparency, flatLevel, label
//   effects: optional, Prompt 211 (js/kernels/detector/effects.js): { nonlinearity, cosmic, bleed }.
//     The observation then has a `flags` column (role flag: 1 saturated, 2 bleed, 4 cosmic ray,
//     8 nonlinear) and the truth names the effects applied.
// }
import { syntheticObservation, valueColumns } from '../observation.js';
import { requireSetup } from './common.js';
import {
  simulateFrame,
  calibrationSet,
  normalizeDetector,
} from '../../kernels/detector/frame.js';

export const ID = 'ccd';
export const VERSION = '1.0.0';

function detectorFor(state, setup) {
  const { width, height, pixelScale, psfFwhm } = setup.instrument;
  if (!(pixelScale > 0 && psfFwhm > 0))
    throw new Error(
      'a ccd frame needs instrument.pixelScale and psfFwhm, in arcsec'
    );
  return normalizeDetector({
    ...(state.detector ?? {}),
    width,
    height,
    fwhm: psfFwhm / pixelScale,
  });
}

const toKernel = (state, setup) => {
  const detector = detectorFor(state, setup);
  const sources = (state.scene?.sources ?? []).map(s => ({
    x: s.x - 1,
    y: s.y - 1,
    rate: s.rate,
  }));
  return {
    seed: setup.seed,
    detector,
    scene: { ...(state.scene ?? {}), sources },
    // Prompt 211: stated effects (nonlinearity, cosmic-ray tracks, bleeding), each flagged in the frame's truth.
    ...(state.effects ? { effects: state.effects } : {}),
  };
};

export function run(state, rawSetup, opts = {}) {
  const setup = requireSetup(rawSetup, ['imager']);
  const base = toKernel(state, setup);
  const f = simulateFrame({
    ...base,
    kind: state.kind ?? 'science',
    exposure: state.exposure ?? 0,
    transparency: state.transparency ?? 1,
    flatLevel: state.flatLevel,
    label: state.label,
    ...(base.effects ? { effects: base.effects } : {}),
  });
  return observationOf(f, setup, state, opts);
}

/** A calibration set as observations: { bias: [...], dark: [...], flat: [...] }. */
export function runCalibrationSet(state, rawSetup, set = {}) {
  const setup = requireSetup(rawSetup, ['imager']);
  const base = toKernel(state, setup);
  const cs = calibrationSet(base, set);
  const wrap = frames =>
    frames.map((f, k) =>
      observationOf(
        f,
        setup,
        { ...state, kind: f.kind },
        {
          title: `Synthetic ${f.kind} frame ${k + 1}`,
          index: k,
        }
      )
    );
  return { bias: wrap(cs.bias), dark: wrap(cs.dark), flat: wrap(cs.flat) };
}

/** A kernel frame from an observation of this model: counts, size, exposure. */
export function frameFromObservation(o) {
  const p = id => o.synthetic?.truth?.parameters?.find(q => q.id === id)?.value;
  return {
    kind: o.synthetic?.truth?.injected?.frameKind ?? 'science',
    width: o.image.width,
    height: o.image.height,
    exposure: p('exposure') ?? 0,
    values: Float64Array.from(o.columns.find(c => c.id === 'counts').values),
  };
}

function observationOf(f, setup, state, opts) {
  const { width, height } = f;
  const { pixelScale } = setup.instrument;
  const t = f.truth;
  const px = new Float64Array(width * height);
  const py = new Float64Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      px[y * width + x] = x + 1;
      py[y * width + x] = y + 1;
    }
  const d = t.detector;
  const scaleDeg = pixelScale / 3600;
  const center = state.center ?? { ra: 0, dec: 0 };
  const wcs = {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: [(width + 1) / 2, (height + 1) / 2],
    crval: [center.ra, center.dec],
    cd: [
      [-scaleDeg, 0],
      [0, scaleDeg],
    ],
  };
  const P = (id, name, value, unit) => ({ id, name, value, unit });
  const obs = syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'image',
    title: opts.title ?? `Synthetic ${f.kind} frame`,
    columns: [
      { id: 'x', name: 'Pixel x', unit: 'pix', role: 'x', values: px },
      { id: 'y', name: 'Pixel y', unit: 'pix', role: 'x', values: py },
      ...valueColumns('counts', 'Counts', 'count', f.values, null),
      ...(t.effects
        ? [
            {
              id: 'flags',
              name: 'Effect flags',
              unit: '',
              role: 'flag',
              bits: t.effects.bits.map(b => ({ ...b })),
              values: Float64Array.from(t.effects.flags),
            },
          ]
        : []),
    ],
    axes: { x: 'x', y: 'y' },
    truth: {
      parameters: [
        P('exposure', 'exposure time', f.exposure, 's'),
        P('gain', 'gain, electrons per count', d.gain, ''),
        P('readNoise', 'read noise, electrons rms', d.readNoise, 'count'),
        P('biasLevel', 'bias level', d.biasLevel, 'count'),
        P(
          'darkRate',
          'dark current, electrons per second per pixel',
          d.darkRate,
          'electron/s'
        ),
        P('fullWell', 'full well, electrons', d.fullWell, 'count'),
        P('psfFwhm', 'PSF FWHM', setup.instrument.psfFwhm, 'arcsec'),
        ...(t.scene
          ? [
              P(
                'sky',
                'sky, electrons per second per pixel',
                t.scene.sky,
                'electron/s'
              ),
              P('transparency', 'transparency', t.transparency, ''),
              ...t.scene.sources.flatMap((s, k) => [
                P(`src${k}.x`, `source ${k}: x`, s.x + 1, 'pix'),
                P(`src${k}.y`, `source ${k}: y`, s.y + 1, 'pix'),
                P(
                  `src${k}.rate`,
                  `source ${k}: electrons per second`,
                  s.rate,
                  'electron/s'
                ),
              ]),
            ]
          : []),
        P('cosmicRays', 'cosmic-ray pixels added', t.cosmic.length, 'count'),
        P('saturated', 'saturated pixels', t.saturated, 'count'),
        ...(t.effects
          ? [
              P(
                'effectBleedPixels',
                'pixels that received bled charge',
                t.effects.bleed.pixels,
                'count'
              ),
              P(
                'effectBleedLost',
                'electrons lost by bleeding',
                t.effects.bleed.lost,
                'count'
              ),
              P(
                'effectCosmicTracks',
                'cosmic-ray tracks',
                t.effects.cosmicTracks.length,
                'count'
              ),
              ...(t.effects.linearLimitElectrons === null
                ? []
                : [
                    P(
                      'effectLinearLimit',
                      'electrons at 1 percent below linear',
                      t.effects.linearLimitElectrons,
                      'count'
                    ),
                  ]),
            ]
          : []),
      ],
      injected: {
        whiteSigma: 0,
        redSigma: 0,
        offset: 0,
        trend: 0,
        outlierRows: [],
        frameKind: f.kind,
        cosmicRays: t.cosmic,
      },
      columns: {
        flat: Array.from(t.flat),
        dark: Array.from(t.dark),
      },
      notes: [
        `${f.kind} frame. Counts = bias + electrons / gain, rounded. Electrons: Poisson light and dark, cosmic rays, read noise.`,
        t.effects
          ? `Effects applied: ${['nonlinearity', 'cosmic ray tracks', 'bleeding'].filter((_, k) => [t.effects.applied.nonlinearity, t.effects.applied.cosmic === 'tracks', t.effects.applied.bleed][k]).join(', ') || 'none'} (stated models, DETECTOR_EFFECTS.md); no charge-transfer loss; Gaussian PSF.`
          : 'No blooming, charge-transfer loss or nonlinearity; Gaussian PSF.',
        'The flat-field map and the dark map in the truth columns are what a calibration frame estimates.',
      ],
    },
    extra: { image: { width, height, wcs, x: 'x', y: 'y', value: 'counts' } },
  });
  obs.id = `synthetic:${ID}:${setup.seed}:${state.label ?? f.kind}${opts.index ?? ''}`;
  return obs;
}
