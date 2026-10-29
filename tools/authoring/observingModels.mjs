// =============================================================================
// The observing closeout investigations' expected values (Prompt 216)
// -----------------------------------------------------------------------------
// Each is the value a lesson of js/data/investigations/observing-sequence.js
// writes as a literal, recomputed from the instrument the lesson points at (the
// exposure planner, the sky panels, the strategy planner, the instrument
// library), in the unit the step asks for. tools/authoring/modelChecked.mjs
// spreads this table into MODELS. Node only: no route downloads any of it.
// =============================================================================

import './skyModels.mjs';
import { getInstrument, SITES } from '../../js/instruments/index.js';

/** The exposure planner's view of a setup (the planner loads lazily). */
const planner = async () => {
  await import('../../js/kernels/detector/pipeline.js');
  return import('../../js/exposureWidgets.js');
};
const seconds = async v => (await planner()).exposureView(v).plan.seconds;
const sky = async () => import('../../js/skyWidgets.js');
const ONE = 1.0857;

export const OBSERVING_MODELS = {
  'which-instrument-for-which-question/how-much-longer': {
    via: 'js/exposureWidgets.js exposureView (planExposure): the total exposure of the 0.35 m telescope over the 1.0 m telescope for a magnitude-22 star at a signal-to-noise of 20, one exposure',
    value: async () => {
      const at = setup => seconds({ setup, mag: 22, target: 20, exposures: 1 });
      return (await at(0)) / (await at(1));
    },
  },
  'which-instrument-for-which-question/the-field': {
    via: 'js/instruments (the library): the 0.35 m camera’s field (1.9 by 1.2 degrees) over the 1.0 m camera’s (26.5 arcminutes square)',
    value: () => {
      const a = getInstrument('lco-0m35').instrument;
      const b = getInstrument('lco-1m0').instrument;
      return (
        (a.fieldWidth.v * a.fieldHeight.v) /
        ((b.fieldWidth.v / 60) * (b.fieldHeight.v / 60))
      );
    },
  },
  'the-sky-background/sky-in-the-aperture': {
    via: 'js/exposureWidgets.js exposureView: Rubin r’s library sky (21.2) less 2.5 log10 of the area of a circle of 1.5 seeing radii',
    value: async () => {
      const { setup } = (await planner()).exposureView({
        setup: 3,
        mag: 23,
        target: 20,
        exposures: 2,
      });
      return setup.skyMag - 2.5 * Math.log10(Math.PI * (1.5 * setup.fwhm) ** 2);
    },
  },
  'the-sky-background/sky-over-the-star': {
    via: 'js/exposureWidgets.js exposureView: the light of the sky in the aperture over a magnitude-23 star',
    value: async () => {
      const { setup } = (await planner()).exposureView({
        setup: 3,
        mag: 23,
        target: 20,
        exposures: 2,
      });
      const m =
        setup.skyMag - 2.5 * Math.log10(Math.PI * (1.5 * setup.fwhm) ** 2);
      return 10 ** (0.4 * (23 - m));
    },
  },
  'the-sky-background/three-magnitudes-brighter': {
    via: 'js/exposureWidgets.js exposureView (planExposure): the total exposure with the sky 3 magnitudes brighter over the dark-sky exposure, Rubin r, magnitude 23, two exposures',
    value: async () => {
      const at = moon =>
        seconds({ setup: 3, mag: 23, target: 20, exposures: 2, moon });
      return (await at(3)) / (await at(0));
    },
  },
  'the-sky-background/a-redder-sky': {
    via: 'js/instruments (the library): the light per square arcsecond of Rubin’s sky in i over g, from the stated surface brightnesses',
    value: () => {
      const b = SITES['cerro-pachon'].skyBrightness;
      return 10 ** (0.4 * (b.g.v - b.i.v));
    },
  },
  'coordinates-and-time/a-day-that-is-short': {
    via: 'js/kernels/sky time.js gmstDeg: the sidereal time gained in one solar day, as a share of the solar day',
    value: async () => {
      const T = await import('../../js/kernels/sky/time.js');
      const j = T.julianDate(2025, 1, 1, 0);
      const d = (((T.gmstDeg(j + 1) - T.gmstDeg(j)) % 360) + 360) % 360;
      return (86400 * d) / (360 + d);
    },
  },
  'coordinates-and-time/the-panel-is-later': {
    via: 'js/skyWidgets.js turningFacts: the panel’s crossing for Sirius at 40 N less the one from the rounded sidereal time (6.792 h) and right ascension (6.752 h)',
    value: async () => {
      const W = await sky();
      const f = W.turningFacts({ lat: 40, nights: 0, star: 0 });
      const mine = 720 - (60 * (6.792 - 6.752)) / 1.0027379;
      return Number(f.transitMinAfterNoon.toFixed(1)) - Number(mine.toFixed(1));
    },
  },
  'a-night-at-the-telescope/station-weather': {
    via: 'js/strategyWidgets.js strategy-plan readout: the share of the planned visits the weather chain took, from the Visits row',
    value: async () => {
      const { whenWidgetsReady, allWidgets } =
        await import('../../js/widgets.js');
      await whenWidgetsReady();
      const w = allWidgets().find(x => x.id === 'strategy-plan');
      const v = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
      const row = w.readout(v).find(r => /^Visits/.test(r.label));
      const [, done, planned] = /(\d+) executed of (\d+)/.exec(row.value);
      return (100 * (planned - done)) / planned;
    },
  },
  'a-night-at-the-telescope/station-report': {
    via: 'js/exposureWidgets.js (the planner’s signal-to-noise target of 50): the quadrature sum of the photometric uncertainty (1.0857 over it) and the calibration’s 0.008 magnitude',
    value: () => Math.hypot(ONE / 50, 0.008),
  },
  'from-photons-to-a-number/the-magnitude-uncertainty': {
    via: 'js/exposureWidgets.js exposureView: 1.0857 over the signal-to-noise predicted for the frame’s own aperture',
    value: async () =>
      ONE /
      (await planner()).exposureView({
        setup: 1,
        mag: 19,
        target: 50,
        exposures: 1,
        airmass: 1.1,
      }).frame.predicted.snr,
  },
  'from-photons-to-a-number/the-rate-to-a-magnitude': {
    via: 'js/exposureWidgets.js exposureView: the frame’s signal over the plan’s exposure, over the setup’s zero point, less the extinction of 0.2 over 0.1 airmass',
    value: async () => {
      const P = await planner();
      const v = { setup: 1, mag: 19, target: 50, exposures: 1, airmass: 1.1 };
      const m = P.exposureView(v);
      const rate = m.frame.predicted.signal / m.plan.seconds;
      return -2.5 * Math.log10(rate / P.SETUPS[1].zeroPoint) - 0.2 * 0.1;
    },
  },
  'from-photons-to-a-number/adding-in-quadrature': {
    via: 'js/exposureWidgets.js exposureView: the quadrature sum of the photometric uncertainty (1.0857 over the predicted signal-to-noise) and the calibration’s 0.008 magnitude',
    value: async () =>
      Math.hypot(
        ONE /
          (await planner()).exposureView({
            setup: 1,
            mag: 19,
            target: 50,
            exposures: 1,
            airmass: 1.1,
          }).frame.predicted.snr,
        0.008
      ),
  },
};
