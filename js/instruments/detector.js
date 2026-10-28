// =============================================================================
// A detector and an observing setup, built from a facility's cited values
// -----------------------------------------------------------------------------
// The detector kernel (js/kernels/detector/frame.js) and the ccd forward model
// (js/forward/models/ccd.js) take a detector spec and an imager setup. These
// build them from the instrument library instead of from numbers typed beside
// the call, and they keep the library's one rule: nothing is filled in.
//
//   detectorOf(id)        { detector, from, absent }. `detector` holds only the
//                         fields the table states (gain, readNoise, fullWell,
//                         darkRate, width, height), `from` says for each which
//                         source and qualifier it carries (and which end of a
//                         range was taken), and `absent` lists the fields the
//                         table lacks. The kernel's own defaults fill those
//                         when it normalises the spec; this module does not.
//   imagerSetupOf(id)     a gravitas.observing-setup/1 for an imager, or an
//                         InstrumentTableError naming what the table lacks (the
//                         pixel scale, or a seeing for the PSF unless the caller
//                         passes psfFwhm in arcsec).
//
// Units are checked, not converted: a table value in a unit the kernel does not
// take is an error, so a unit slip cannot pass through quietly.
//
// Pure: no DOM.
// =============================================================================

import { ID_OBSERVING_SETUP } from '../names.js';
import {
  InstrumentTableError,
  getInstrument,
  inUnit,
  pick,
  siteRecord,
} from './index.js';

/** The most pixels the detector kernel simulates in one frame. */
export const MAX_FRAME_PIXELS = 1_000_000;

// kernel field -> [table parameter, the unit the kernel takes]
const FIELDS = [
  ['gain', 'gain', 'electron/count'],
  ['readNoise', 'readNoise', 'electron'],
  ['fullWell', 'fullWell', 'electron'],
  ['darkRate', 'darkCurrent', 'electron/s/pix'],
];

/**
 * A detector spec from a facility's imager.
 * @param {string} id - A facility id
 * @param {{instrument?: string, range?: 'lo'|'mid'|'hi',
 *   size?: [number, number]}} [opts] - `size` is the cutout, in pixels, when
 *   the sensor is larger than the kernel's frame limit (or just smaller wanted)
 */
export function detectorOf(id, { instrument, range = 'mid', size } = {}) {
  const { instrument: ins } = getInstrument(id, instrument);
  if (ins.kind !== 'imager')
    throw new InstrumentTableError(`"${id}" ${ins.id} is not an imager`, {
      id,
    });
  const detector = {};
  const from = {};
  const absent = [];
  for (const [field, param, unit] of FIELDS) {
    const val = ins[param];
    if (!val) {
      absent.push(field);
      continue;
    }
    if (val.u !== unit)
      throw new InstrumentTableError(
        `${id}: ${param} is in ${val.u}, not the ${unit} the detector kernel takes`,
        { id, param }
      );
    detector[field] = pick(val, range);
    from[field] = {
      param,
      source: val.s,
      ...(val.at ? { at: val.at } : {}),
      ...(val.q ? { qualifier: val.q } : {}),
      ...(Array.isArray(val.v) ? { range: val.v, took: range } : {}),
    };
  }
  const w = size?.[0] ?? ins.sensorWidth?.v;
  const h = size?.[1] ?? ins.sensorHeight?.v;
  if (w === undefined || h === undefined) absent.push('width', 'height');
  else if (w * h > MAX_FRAME_PIXELS)
    throw new InstrumentTableError(
      `${id}: a ${w} x ${h} sensor is over the kernel's ${MAX_FRAME_PIXELS}-pixel frame; pass size: [width, height] for a cutout`,
      { id }
    );
  else {
    detector.width = w;
    detector.height = h;
    from.width = from.height = size
      ? { cutout: true }
      : { param: 'sensorWidth/sensorHeight', source: ins.sensorWidth.s };
  }
  return { detector, from, absent };
}

/** The PSF width in arcsec: the caller's, or the site's seeing for the band. */
function psfOf(id, band, psfFwhm) {
  if (psfFwhm !== undefined) return psfFwhm;
  const s = siteRecord(id)?.seeing;
  const val = s && 'v' in s ? s : s && band ? s[band] : undefined;
  if (!val)
    throw new InstrumentTableError(
      `the table has no seeing for "${id}"${band ? ` in ${band}` : ''}: pass psfFwhm in arcsec`,
      { id, field: 'seeing' }
    );
  return inUnit(val, 'arcsec');
}

/**
 * A gravitas.observing-setup/1 for an imager facility, ready for the ccd
 * forward model. The seeing is the PSF unless psfFwhm is given.
 * @param {string} id
 * @param {{instrument?: string, seed: string, band?: string, psfFwhm?: number,
 *   size?: [number, number], title?: string}} opts
 */
export function imagerSetupOf(id, opts) {
  const { instrument, seed, band, psfFwhm, size, title } = opts;
  const { instrument: ins } = getInstrument(id, instrument);
  if (ins.kind !== 'imager')
    throw new InstrumentTableError(`"${id}" ${ins.id} is not an imager`, {
      id,
    });
  if (!ins.pixelScale)
    throw new InstrumentTableError(
      `the table has no pixel scale for "${id}" ${ins.id}`,
      { id, field: 'pixelScale' }
    );
  const { detector } = detectorOf(id, { instrument, size });
  if (detector.width === undefined)
    throw new InstrumentTableError(`the table has no sensor size for "${id}"`, {
      id,
      field: 'sensorWidth',
    });
  return {
    format: ID_OBSERVING_SETUP,
    formatVersion: 1,
    seed,
    ...(title ? { title } : {}),
    instrument: {
      kind: 'imager',
      width: detector.width,
      height: detector.height,
      pixelScale: inUnit(ins.pixelScale, 'arcsec'),
      psfFwhm: psfOf(id, band, psfFwhm),
    },
  };
}
