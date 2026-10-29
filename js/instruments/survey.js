// =============================================================================
// A survey setup from a facility in the instrument library (Prompt 215)
// -----------------------------------------------------------------------------
// js/kernels/survey/ takes numbers; this reads them from a facility's cited table
// through the exposure calculator's adapter (js/instruments/exposure.js, Prompt 210)
// and adds the two the survey needs beyond a single exposure: the field of one
// pointing (the table's field area, or its field width times its field height) and
// the overhead of a frame (the table's cycle time, or its read-out time, plus the
// slew and settle the caller allows). The library keeps its rule: nothing is filled
// in. A throughput and a dark current are the caller's (SETUPS below holds the
// teaching values the panels use, each recorded as supplied), and a plan records
// which of its numbers are a facility's.
//
// Pure: no DOM. A lazy module: the table import makes it so.
// =============================================================================

import { InstrumentTableError, getInstrument, inUnit } from './index.js';
import { exposureSetupOf } from './exposure.js';

/**
 * The facilities the survey panels offer. `zeroPoint` is electrons per second at magnitude 0 at
 * the zenith for a SUPPLIED peak throughput of 0.5 through the band (as js/exposureWidgets.js
 * SETUPS; tests/surveyLessons.test.js recomputes them from the radiation kernel); `dark` is
 * supplied where the library has none. All are teaching values.
 */
export const SURVEY_SETUPS = Object.freeze([
  { id: 'lco-0m35', band: 'V', zeroPoint: 294339668.3281891, dark: 0.01 },
  { id: 'lco-1m0', band: 'V', zeroPoint: 3500543127.4462337, dark: 0.002 },
  { id: 'rubin', band: 'r', zeroPoint: 163847616767.59027, dark: 0.01 },
]);

const degrees = (rec, unit) => {
  if (!rec) return undefined;
  if (unit === 'deg') return inUnit(rec, 'deg');
  return undefined;
};

/** The field of one pointing of an imager, square degrees, with where it came from. */
export function fieldOf(ins) {
  if (ins.fieldArea && ins.fieldArea.u === 'deg2')
    return {
      deg2: ins.fieldArea.v,
      from: { param: 'fieldArea', source: ins.fieldArea.s },
    };
  if (ins.fieldWidth && ins.fieldHeight) {
    const w = degrees(ins.fieldWidth, 'deg');
    const h = degrees(ins.fieldHeight, 'deg');
    if (Number.isFinite(w) && Number.isFinite(h))
      return {
        deg2: w * h,
        from: { param: 'fieldWidth x fieldHeight', source: ins.fieldWidth.s },
      };
  }
  throw new InstrumentTableError(
    `the table states no field of view for "${ins.id}"`,
    { field: 'fieldOfView' }
  );
}

/** The seconds a frame costs beyond its exposure: the cycle or read-out time the table states, plus the slew. */
export function overheadOf(ins, slew = 0) {
  const c = ins.cycleTime ?? ins.readoutTime;
  if (!c || c.u !== 's')
    throw new InstrumentTableError(
      `the table states no cycle or read-out time for "${ins.id}"`,
      { field: 'cycleTime' }
    );
  return {
    seconds: c.v + slew,
    from: {
      param: ins.cycleTime ? 'cycleTime' : 'readoutTime',
      source: c.s,
      slew,
    },
  };
}

/**
 * The survey setup of a facility.
 * @param {string} id - A facility id
 * @param {object} [opts] - instrument, band, zeroPoint, darkRate, extinction, airmass, slew (seconds)
 * @returns {{setup: object, from: object, facility: string, instrument: string}}
 */
export function surveySetupOf(id, opts = {}) {
  const choice = SURVEY_SETUPS.find(
    s => s.id === id && (!opts.band || s.band === opts.band)
  );
  const { setup, from, facility, instrument } = exposureSetupOf(id, {
    ...(choice
      ? {
          band: choice.band,
          zeroPoint: choice.zeroPoint,
          darkRate: choice.dark,
        }
      : {}),
    ...opts,
  });
  const { instrument: ins } = getInstrument(id, instrument);
  const fov = fieldOf(ins);
  const oh = overheadOf(ins, opts.slew ?? 0);
  return {
    facility,
    instrument,
    setup: {
      zeroPoint: setup.zeroPoint,
      pixelScale: setup.pixelScale,
      fwhm: setup.fwhm,
      skyMag: setup.skyMag,
      readNoise: setup.readNoise,
      darkRate: setup.darkRate,
      fullWell: setup.fullWell ?? Infinity,
      fovDeg2: fov.deg2,
      overhead: oh.seconds,
      extinction:
        setup.extinction !== undefined
          ? setup.extinction * ((setup.airmass ?? 1) - 1)
          : 0,
    },
    from: { ...from, fieldOfView: fov.from, overhead: oh.from },
  };
}
