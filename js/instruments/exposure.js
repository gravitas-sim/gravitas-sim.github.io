// =============================================================================
// An exposure plan for a facility in the instrument library
// -----------------------------------------------------------------------------
// The exposure calculator (js/kernels/detector/snr.js, planExposure) takes
// numbers; this reads them from a facility's cited table (js/data/instruments.js,
// INSTRUMENTS.md) and keeps the library's rule: nothing is filled in. A value
// the table states comes through with its source; a value the table lacks must
// be supplied by the caller and is recorded as supplied, so a plan always says
// which of its numbers are a facility's and which are somebody's assumption.
// The library states no throughput or zero point for any facility and states a
// dark current for only some, so those are the caller's (EXPOSURE_PLANNING.md).
//
//   exposureSetupOf(id, opts)  { setup, from }. `setup` is the field
//                              set planExposure takes, minus the source and the
//                              target; `from` says for each field where it
//                              came from (a table source, or `supplied`).
//   planFor(id, opts)          the setup and the plan together.
//
// The zero point from a throughput and a passband, and the airmass from an
// altitude, are in js/instruments/exposureSky.js, which reaches the radiation and
// sky kernels; this module does not, so a panel that takes both as numbers
// does not load them.
//
// The extinction coefficient is the site's when the table states one and the
// caller's otherwise (Prompt 212's measured site extinction, when it lands,
// replaces the stated coefficient). The airmass is the caller's. The seeing scales with
// airmass as X^0.6, a stated model, never a measurement.
//
// Pure: no DOM. A lazy module: the table import makes it so.
// =============================================================================

import {
  InstrumentTableError,
  getInstrument,
  inUnit,
  pick,
  siteRecord,
} from './index.js';
import { collectingArea, planExposure } from '../kernels/detector/snr.js';

/** Kolmogorov seeing grows with airmass as X^0.6 (the Rubin depth model's note b). */
export const SEEING_AIRMASS_EXPONENT = 0.6;

export const seeingAtAirmass = (fwhm, airmass) =>
  fwhm * airmass ** SEEING_AIRMASS_EXPONENT;

/** Collecting area, m^2, of a facility's telescope, with where it came from. */
export function areaOf(id) {
  const { facility } = getInstrument(id);
  const t = facility.telescope;
  const d = t?.effectiveAperture ?? t?.aperture;
  if (!d || d.u !== 'm')
    throw new InstrumentTableError(`the table has no aperture for "${id}"`, {
      id,
      field: 'aperture',
    });
  const o = t.obstructionDiameter;
  const obstruction = o && !t.effectiveAperture ? o.v / d.v : 0;
  return {
    areaM2: collectingArea(d.v, obstruction),
    from: {
      param: t.effectiveAperture ? 'effectiveAperture' : 'aperture',
      source: d.s,
      ...(obstruction ? { obstruction: 'obstructionDiameter' } : {}),
    },
  };
}

const bandValue = (rec, band, unit) => {
  if (!rec) return undefined;
  const val = 'v' in rec ? rec : band ? rec[band] : undefined;
  return val && val.u === unit ? val : undefined;
};

/**
 * The plan's setup from a facility's imager.
 * @param {string} id - A facility id
 * @param {object} [opts]
 * @param {string} [opts.instrument]
 * @param {string} [opts.band] - the band the sky and the extinction are read for
 * @param {'lo'|'mid'|'hi'} [opts.range] - which end of a table range to take
 * @param {number} [opts.zeroPoint] - electrons per second at magnitude 0 at the zenith
 * @param {number} [opts.pixelScale] - arcsec per pixel
 * @param {number} [opts.fwhm] - zenith seeing, arcsec
 * @param {number} [opts.skyMag] - mag per square arcsec
 * @param {number} [opts.readNoise] - electrons
 * @param {number} [opts.darkRate] - electrons per second per pixel
 * @param {number} [opts.extinction] - magnitudes per airmass
 * @param {number} [opts.airmass]
 */
export function exposureSetupOf(id, opts = {}) {
  const { instrument, band, range = 'mid' } = opts;
  const { facility, instrument: ins } = getInstrument(id, instrument);
  if (ins.kind !== 'imager')
    throw new InstrumentTableError(`"${id}" ${ins.id} is not an imager`, {
      id,
    });
  const site = siteRecord(id);
  const from = {};
  const setup = {};
  const take = (field, supplied, tableVal, param, unit) => {
    if (Number.isFinite(supplied)) {
      setup[field] = supplied;
      from[field] = { supplied: true };
      return;
    }
    if (tableVal) {
      setup[field] = Array.isArray(tableVal.v)
        ? pick(tableVal, range)
        : tableVal.v;
      from[field] = {
        param,
        source: tableVal.s,
        ...(tableVal.at ? { at: tableVal.at } : {}),
        ...(tableVal.q ? { qualifier: tableVal.q } : {}),
        ...(Array.isArray(tableVal.v)
          ? { range: tableVal.v, took: range }
          : {}),
      };
      return;
    }
    throw new InstrumentTableError(
      `the table has no ${param} for "${id}"${band && unit.includes('mag') ? ` in ${band}` : ''}: supply ${field} (${unit})`,
      { id, field }
    );
  };
  const unitOf = (val, unit, param) => {
    if (val && val.u !== unit)
      throw new InstrumentTableError(
        `${id}: ${param} is in ${val.u}, not the ${unit} the exposure calculator takes`,
        { id, param }
      );
    return val;
  };
  // the table may state the scale in arcmin per pixel (TESS): convert by the registry's factors
  const px = ins.pixelScale
    ? {
        ...ins.pixelScale,
        v: inUnit(ins.pixelScale, 'arcsec'),
        u: 'arcsec/pix',
      }
    : undefined;
  take('pixelScale', opts.pixelScale, px, 'pixelScale', 'arcsec/pix');
  take(
    'readNoise',
    opts.readNoise,
    unitOf(ins.readNoise, 'electron', 'readNoise'),
    'readNoise',
    'electron'
  );
  take(
    'darkRate',
    opts.darkRate,
    unitOf(ins.darkCurrent, 'electron/s/pix', 'darkCurrent'),
    'darkCurrent',
    'electron/s/pix'
  );
  const fw = ins.fullWell;
  if (fw) {
    setup.fullWell = pick(fw, range);
    from.fullWell = {
      param: 'fullWell',
      source: fw.s,
      ...(fw.q ? { qualifier: fw.q } : {}),
    };
  }
  take(
    'fwhm',
    opts.fwhm,
    bandValue(site?.seeing, band, 'arcsec'),
    'seeing',
    'arcsec'
  );
  take(
    'skyMag',
    opts.skyMag,
    bandValue(site?.skyBrightness, band, 'mag/arcsec2'),
    'sky brightness',
    'mag/arcsec2'
  );
  // The zero point: the caller's, or a throughput through a passband, never the table's.
  if (Number.isFinite(opts.zeroPoint)) {
    setup.zeroPoint = opts.zeroPoint;
    from.zeroPoint = { supplied: true };
  } else {
    throw new InstrumentTableError(
      `the table states no zero point or throughput for "${id}": supply zeroPoint (electrons per second at magnitude 0 at the zenith; js/instruments/exposureSky.js zeroPointOf makes one from a throughput and a passband)`,
      { id, field: 'zeroPoint' }
    );
  }
  // Airmass and extinction.
  const X = Number.isFinite(opts.airmass) ? opts.airmass : 1;
  setup.airmass = X;
  if (X !== 1 || Number.isFinite(opts.extinction)) {
    const kTab = bandValue(site?.extinction, band, 'mag/airmass');
    if (Number.isFinite(opts.extinction)) {
      setup.extinction = opts.extinction;
      from.extinction = { supplied: true };
    } else if (kTab) {
      setup.extinction = kTab.v;
      from.extinction = { param: 'extinction', source: kTab.s, at: kTab.at };
    } else {
      throw new InstrumentTableError(
        `the table has no extinction for "${id}"${band ? ` in ${band}` : ''}: supply extinction (mag per airmass) for an airmass other than 1`,
        { id, field: 'extinction' }
      );
    }
    if (X > 1) {
      from.fwhm = {
        ...from.fwhm,
        model: `zenith seeing times X^${SEEING_AIRMASS_EXPONENT}`,
      };
      setup.fwhm = seeingAtAirmass(setup.fwhm, X);
    }
  }
  return { facility: facility.id, instrument: ins.id, setup, from };
}

/**
 * The setup and the plan: `source`, `targetSnr` and the rest of planExposure's
 * inputs go in `plan`; the facility's values fill the setup.
 * @returns {{plan: object, setup: object, from: object, facility: string, instrument: string}}
 */
export function planFor(id, opts, plan) {
  const { setup, from, facility, instrument } = exposureSetupOf(id, opts);
  const { fwhm, ...rest } = setup;
  const result = planExposure({ ...rest, fwhm, ...plan });
  return { plan: result, setup, from, facility, instrument };
}
