// =============================================================================
// The lab's stated setup: the field, the exposures and the instrument
// -----------------------------------------------------------------------------
// What the three instruments and the lessons use, in one place, so a test can
// hold each number a lesson quotes to the kernel. Every figure is a stated
// parameter of the forward model; see CALIBRATION_LAB.md.
//
// The instrument is a 0.4 m teaching telescope (30 percent central
// obstruction) with a small CCD at 1 arcsec per pixel. `THROUGHPUT_V` is the
// telescope, filter and detector together at the V band's peak, an assumed 0.55;
// `ZERO_POINT_V` is the electrons per second of a V = 0 star (Vega system) that
// the radiation kernel's V band gives with it (tests/calibrationKernel.test.js
// holds the constant to that computation).
// =============================================================================

import {
  calibrationSet,
  simulateFrame,
  simulateSeries,
  DEFAULT_DETECTOR,
} from './frame.js';
import { collectingArea } from './snr.js';

export const VERSION = '1.0.0';

export const TELESCOPE = Object.freeze({
  diameterM: 0.4,
  obstruction: 0.3,
  pixelScale: 1,
  throughputV: 0.55,
});
export const AREA_M2 = collectingArea(
  TELESCOPE.diameterM,
  TELESCOPE.obstruction
);

/** Electrons per second from a V = 0 (Vega system) star; held to the kernel by a test. */
export const ZERO_POINT_V = 5.606e8;

/** Sky brightness choices, V magnitudes per square arcsecond. */
export const SKY_CHOICES = Object.freeze([
  { id: 'dark', mag: 21.5 },
  { id: 'suburb', mag: 20 },
  { id: 'moon', mag: 18.5 },
]);

/** Electrons per second from a star of V magnitude m (Vega system). */
export const rateFromMagnitude = m => ZERO_POINT_V * 10 ** (-0.4 * m);

/** Sky electrons per second per pixel, from a surface brightness. */
export const skyRateFromMagnitude = mag =>
  rateFromMagnitude(mag) * TELESCOPE.pixelScale ** 2;

/** The calibration set the lessons use (bias, dark, flat counts). */
export const LAB_SET = Object.freeze({
  nBias: 10,
  nDark: 7,
  darkExposure: 120,
  nFlat: 10,
  flatExposure: 5,
  flatLevel: 20000,
});

/** Stars of the single-frame field: positions (pixels, 0-based) and electrons per second. */
export const FRAME_FIELD = Object.freeze({
  sky: 3,
  exposure: 60,
  sources: Object.freeze([
    { id: 'A', x: 24, y: 24, rate: 600 },
    { id: 'B', x: 9, y: 11, rate: 900 },
    { id: 'C', x: 38, y: 37, rate: 400 },
    { id: 'D', x: 36, y: 10, rate: 9000 },
  ]),
});

/** The variable-star field. The variable first, then the comparison and a check. */
export const SERIES_FIELD = Object.freeze({
  sky: 3,
  exposure: 60,
  sources: Object.freeze([
    { id: 'V', x: 29, y: 15, rate: 800 },
    { id: 'C1', x: 14, y: 31, rate: 1100 },
    { id: 'C2', x: 36, y: 34, rate: 600 },
  ]),
  series: Object.freeze({
    count: 40,
    cadence: 0.008,
    variable: 0,
    period: 0.12,
    amplitude: 0.04,
    phase: 0.13,
    cloud: 0.1,
  }),
});

export const aperture = Object.freeze({ r: 5, rIn: 8, rOut: 13 });

const plain = s => s.map(({ x, y, rate }) => ({ x, y, rate }));

/** The calibration set for a draw of the lab's detector. */
export function labCalibration(draw = 1, detector = {}) {
  return calibrationSet(
    { seed: `lab:${draw}`, detector: { ...detector } },
    LAB_SET
  );
}

/** The single science frame for a draw and an exposure. */
export function labFrame(draw = 1, exposure = FRAME_FIELD.exposure, detector) {
  return simulateFrame({
    seed: `lab:${draw}`,
    detector,
    kind: 'science',
    label: 'science',
    exposure,
    scene: { sky: FRAME_FIELD.sky, sources: plain(FRAME_FIELD.sources) },
  });
}

/** The series for a draw. The series' own detector has no cosmic rays: that is the first investigation's subject. */
export function labSeries(draw = 1, over = {}) {
  const detector = { cosmicRate: 0, ...(over.detector ?? {}) };
  return simulateSeries(
    {
      seed: `lab:${draw}`,
      detector,
      exposure: SERIES_FIELD.exposure,
      scene: { sky: SERIES_FIELD.sky, sources: plain(SERIES_FIELD.sources) },
    },
    { ...SERIES_FIELD.series, ...(over.series ?? {}) }
  );
}

export const LAB_DETECTOR = DEFAULT_DETECTOR;
