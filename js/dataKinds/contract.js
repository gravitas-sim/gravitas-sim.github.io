// =============================================================================
// What a number in an image, a sequence or a grid means (Prompt 157)
// -----------------------------------------------------------------------------
// Three kinds, each a JSON document with a schema (sdk/schemas) and a validator
// here, the document beside the pixels or the values it describes:
//
//   gravitas.image           one frame and its sidecar: time and time scale,
//                            exposure, pixel scale, world coordinates, and the
//                            pixel contract (units, linearity, saturation, gain
//                            and read-noise provenance, planes and masks,
//                            calibration state, every transform it went through)
//   gravitas.image-sequence  ordered frames of one shape, each with its own time
//   gravitas.grid            a precomputed table indexed by named parameters,
//                            with its generator and its exact inputs
//
// An image is `quantitative` or `display-only`. A display-only image (a JPEG, a
// stretched PNG, a cropped mosaic) can be marked and nothing more: `permits`
// refuses photometry and astrometry, in words. Photometry is allowed only when
// the contract is complete (units that are light, a linear range, a saturation
// level, noise from a variance plane or from a gain and a read noise whose
// source is stated, a calibration state, a time and an exposure) and nothing in
// the history stretched, re-encoded lossily or resampled without conserving flux.
//
// Not a reader of pixels: ./planes.js, ./fits.js and ./grid.js read them, within
// the bounds of ./limits.js. Pure; no DOM. Not installed (DATA_PACKS.md).
// =============================================================================

import { LIMITS, checkFrame, residentFrames } from './limits.js';
import { partProblems } from '../offlineParts.js';

/**
 * Why a WCS cannot be used, or null when it can: the rule of
 * js/observatory/wcs.js unusableWcs, written out again here on purpose. The
 * Observatory page imports that module, and a lazy chunk that imported it too
 * would put it in a chunk the page has to fetch (a request on a route the
 * marks instrument must not touch); tests/imageMeasure.test.js holds the two
 * to the same answers.
 * @returns {string|null}
 */
export function wcsUnusable(wcs) {
  if (!wcs) return 'the image has no world coordinates';
  const [a, b] = wcs.ctype || [];
  if (!/^RA---TAN/.test(a || '') || !/^DEC--TAN/.test(b || ''))
    return `it is projected as ${a || '?'} / ${b || '?'}, and only TAN is read here`;
  const ok = x =>
    Array.isArray(x) && x.length === 2 && x.every(Number.isFinite);
  if (!ok(wcs.crpix) || !ok(wcs.crval))
    return 'its reference pixel or position is missing';
  if (!wcs.cd && !(ok(wcs.cdelt) && Array.isArray(wcs.pc)))
    return 'it has neither a CD matrix nor PC and CDELT';
  return null;
}

/** The units of the two noise terms, the one spelling of each. */
export const GAIN_UNIT = 'electron/adu';
export const READ_NOISE_UNIT = 'electron';
export const IMAGE_FORMAT = 'gravitas.image';
export const SEQUENCE_FORMAT = 'gravitas.image-sequence';
export const GRID_FORMAT = 'gravitas.grid';
export const FORMAT_VERSION = 1;

/** What the kinds are, as the catalogue of data kinds lists them. */
export const DATA_KINDS = Object.freeze([
  {
    kind: 'image',
    format: IMAGE_FORMAT,
    what: 'one frame with its sidecar and pixel contract',
  },
  {
    kind: 'image-sequence',
    format: SEQUENCE_FORMAT,
    what: 'ordered frames of one shape, each with its own time',
  },
  {
    kind: 'grid',
    format: GRID_FORMAT,
    what: 'a precomputed table indexed by named parameters, with its generator',
  },
]);

export const USES = ['quantitative', 'display-only'];
/** Units that are light: linear in the photons received, in some stated scale. */
export const FLUX_UNITS = [
  'adu',
  'adu/s',
  'electron',
  'electron/s',
  'count',
  'count/s',
];
/** Values that are not light: bit fields, a picture's levels, a unit nobody recorded. */
export const OTHER_UNITS = ['flags', 'display', 'unknown'];
export const PIXEL_UNITS = [...FLUX_UNITS, ...OTHER_UNITS];
/** Plane encodings and their bytes a value: little-endian, the number named. */
export const ENCODINGS = Object.freeze({
  uint8: 1,
  'uint16-le': 2,
  'int16-le': 2,
  'uint32-le': 4,
  'int32-le': 4,
  'float32-le': 4,
  'float64-le': 8,
});
export const INTEGER_ENCODINGS = [
  'uint8',
  'uint16-le',
  'int16-le',
  'uint32-le',
  'int32-le',
];
export const GRID_ENCODINGS = ['float32-le', 'float64-le'];
export const TIME_SCALES = ['UTC', 'TAI', 'TT', 'TDB', 'TCB', 'UT1', 'local'];
export const TIME_FORMATS = ['iso', 'mjd', 'jd'];
export const TIME_REFERENCES = ['start', 'mid', 'end'];
export const CALIBRATION_STATES = [
  'raw',
  'bias-subtracted',
  'dark-subtracted',
  'flat-fielded',
  'calibrated',
];
export const LINEARITY = ['linear', 'corrected', 'nonlinear', 'unknown'];
export const NOISE_SOURCES = [
  'header',
  'measured',
  'calibration',
  'model',
  'assumed',
];
export const HISTORY_STEPS = [
  'decode',
  'crop',
  'resample',
  'rotate',
  'flip',
  'stretch',
  'reencode',
  'calibrate',
  'stack',
  'mask',
];
/** Steps that move pixels: positions mean something only if the WCS moved with them. */
export const GEOMETRIC_STEPS = ['crop', 'resample', 'rotate', 'flip', 'stack'];
export const SOURCE_KINDS = ['pack', 'fits', 'upload', 'synthetic'];
/** What `permits` is asked. */
export const OPERATIONS = ['marking', 'photometry', 'astrometry'];

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim() !== '';
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?Z?$/;

/** A problem list with the paths it was found at. */
function collector() {
  const problems = [];
  return {
    problems,
    add: (path, message, code = 'invalid') =>
      problems.push({ path, code, message }),
    result: extra => ({ ok: problems.length === 0, problems, ...extra }),
  };
}

/** A time as a number of days or milliseconds, for ordering; NaN when it is not one. */
function timeKey(t) {
  if (!isObject(t)) return NaN;
  if (t.format === 'iso')
    return typeof t.value === 'string'
      ? Date.parse(t.value.endsWith('Z') ? t.value : `${t.value}Z`)
      : NaN;
  return isNum(t.value) ? t.value : NaN;
}

function checkTime(t, path, add) {
  if (!isObject(t))
    return add(path, 'is a time: { value, scale, format, reference }');
  if (!TIME_SCALES.includes(t.scale))
    add(
      `${path}.scale`,
      `is one of ${TIME_SCALES.join(', ')}; a time with no scale is not a time`
    );
  if (!TIME_FORMATS.includes(t.format))
    add(`${path}.format`, `is one of ${TIME_FORMATS.join(', ')}`);
  if (!TIME_REFERENCES.includes(t.reference))
    add(
      `${path}.reference`,
      `is one of ${TIME_REFERENCES.join(', ')}: which instant of the exposure the value is`
    );
  if (t.format === 'iso') {
    if (!(
      typeof t.value === 'string' &&
      ISO.test(t.value) &&
      Number.isFinite(timeKey(t))
    ))
      add(`${path}.value`, 'is an ISO 8601 date and time');
  } else if (TIME_FORMATS.includes(t.format) && !isNum(t.value))
    add(`${path}.value`, `is a finite number (${t.format})`);
}

function checkExposure(e, path, add) {
  if (!isObject(e)) return add(path, 'is { seconds, kind }');
  if (!(isNum(e.seconds) && e.seconds > 0))
    add(`${path}.seconds`, 'is a positive number of seconds');
  if (!['effective', 'nominal'].includes(e.kind))
    add(`${path}.kind`, 'is effective or nominal');
}

function checkNoiseTerm(t, path, unit, min, add) {
  if (!isObject(t)) return add(path, 'is { value, unit, source }');
  if (!(isNum(t.value) && (min === 0 ? t.value >= 0 : t.value > 0)))
    add(
      `${path}.value`,
      min === 0 ? 'is a number, 0 or more' : 'is a positive number'
    );
  if (!isText(t.unit)) add(`${path}.unit`, `is a unit (${unit})`);
  if (!NOISE_SOURCES.includes(t.source))
    add(
      `${path}.source`,
      `says where it came from: one of ${NOISE_SOURCES.join(', ')}`
    );
  else if (t.source === 'assumed' && !isText(t.note))
    add(`${path}.note`, 'says why the value is assumed');
}

function checkPlanes(planes, add) {
  if (!isObject(planes) || !isObject(planes.data))
    return add('planes.data', 'is required: { encoding }');
  const enc = (p, path, only = Object.keys(ENCODINGS)) => {
    if (!only.includes(p?.encoding))
      add(`${path}.encoding`, `is one of ${only.join(', ')}`);
  };
  enc(planes.data, 'planes.data');
  if (planes.variance !== undefined) {
    if (!isObject(planes.variance))
      return add('planes.variance', 'is { encoding, unit, source }');
    enc(planes.variance, 'planes.variance');
    if (!isText(planes.variance.unit))
      add('planes.variance.unit', 'is the unit of the variance');
    if (!isText(planes.variance.source))
      add('planes.variance.source', 'says where the variance came from');
  }
  if (planes.mask !== undefined) {
    const m = planes.mask;
    if (!isObject(m))
      return add('planes.mask', 'is { encoding, bits, bitsSource }');
    enc(m, 'planes.mask', INTEGER_ENCODINGS);
    if (!(
      Array.isArray(m.bits) &&
      m.bits.length > 0 &&
      m.bits.every(
        b =>
          isObject(b) &&
          Number.isInteger(b.value) &&
          b.value > 0 &&
          isText(b.meaning)
      )
    ))
      add('planes.mask.bits', 'says what each bit means: [{ value, meaning }]');
    if (!isText(m.bitsSource))
      add(
        'planes.mask.bitsSource',
        'says where the meaning of the bits is documented'
      );
  }
}

function checkPixels(p, add) {
  if (!isObject(p))
    return add('pixels', 'is the pixel contract: { unit, ... }');
  if (!PIXEL_UNITS.includes(p.unit))
    add('pixels.unit', `is one of ${PIXEL_UNITS.join(', ')}`);
  const bitsOk =
    Array.isArray(p.bits) &&
    p.bits.length > 0 &&
    p.bits.every(
      b =>
        isObject(b) &&
        Number.isInteger(b.value) &&
        b.value > 0 &&
        isText(b.meaning)
    );
  if (p.unit === 'flags') {
    if (!bitsOk)
      add('pixels.bits', 'says what each bit means: [{ value, meaning }]');
    if (!isText(p.bitsSource))
      add(
        'pixels.bitsSource',
        'says where the meaning of the bits is documented'
      );
  } else if (p.bits !== undefined || p.bitsSource !== undefined)
    add('pixels.bits', 'belongs to an image of bit flags; light has no bits');
  const l = p.linearity;
  if (l !== undefined) {
    if (!isObject(l) || !LINEARITY.includes(l.status))
      add('pixels.linearity.status', `is one of ${LINEARITY.join(', ')}`);
    else if (l.status === 'linear' || l.status === 'corrected') {
      if (!(isNum(l.limit) && l.limit > 0))
        add(
          'pixels.linearity.limit',
          'is the highest pixel value that is still linear'
        );
      if (!isText(l.source))
        add('pixels.linearity.source', 'says how linearity is known');
    }
  }
  const s = p.saturation;
  if (s !== undefined) {
    if (!isObject(s))
      add(
        'pixels.saturation',
        'is { level, source } or { level: null, reason }'
      );
    else if (s.level === null) {
      if (!isText(s.reason))
        add(
          'pixels.saturation.reason',
          'says why there is no saturation level'
        );
    } else {
      if (!(isNum(s.level) && s.level > 0))
        add('pixels.saturation.level', 'is a positive number');
      if (!isText(s.source))
        add('pixels.saturation.source', 'says where the level comes from');
    }
  }
  if (p.gain !== undefined)
    checkNoiseTerm(p.gain, 'pixels.gain', GAIN_UNIT, 1, add);
  if (p.readNoise !== undefined)
    checkNoiseTerm(p.readNoise, 'pixels.readNoise', READ_NOISE_UNIT, 0, add);
}

function checkHistory(h, add) {
  if (!Array.isArray(h))
    return add(
      'history',
      'is the list of every transform the pixels went through, [] for none'
    );
  h.forEach((e, i) => {
    const at = `history[${i}]`;
    if (!isObject(e) || !HISTORY_STEPS.includes(e.step))
      return add(`${at}.step`, `is one of ${HISTORY_STEPS.join(', ')}`);
    if (!isText(e.tool)) add(`${at}.tool`, 'names the tool that did it');
    if (!isText(e.version)) add(`${at}.version`, 'names its version');
    if (typeof e.lossy !== 'boolean')
      add(`${at}.lossy`, 'says whether the step lost information');
    if (GEOMETRIC_STEPS.includes(e.step) && typeof e.wcsUpdated !== 'boolean')
      add(
        `${at}.wcsUpdated`,
        'says whether the world coordinates moved with the pixels'
      );
    if (e.step === 'resample' && typeof e.fluxConserving !== 'boolean')
      add(`${at}.fluxConserving`, 'says whether the resampling conserved flux');
  });
}

function checkSource(s, add) {
  if (!isObject(s) || !SOURCE_KINDS.includes(s.kind))
    return add('source.kind', `is one of ${SOURCE_KINDS.join(', ')}`);
  if (
    s.kind === 'synthetic' &&
    !(isObject(s.model) && isText(s.model.name) && isObject(s.model.parameters))
  )
    add(
      'source.model',
      'is the truth manifest of synthetic pixels: { name, parameters }'
    );
}

/** The planes a document declares, for the memory arithmetic. */
const planesOf = doc => ({
  data: true,
  variance: isObject(doc.planes?.variance),
  mask: isObject(doc.planes?.mask),
});

/**
 * Whether a document is a well-formed image sidecar.
 * @param {object} doc
 * @param {{shape?: boolean}} [o] - `shape`: the shape a sequence's frames share,
 *   which carries no format, time or exposure
 * @returns {{ok: boolean, problems: Array<{path: string, code: string, message: string}>}}
 */
export function validateImage(doc, { shape = false } = {}) {
  const c = collector();
  const { add } = c;
  if (!isObject(doc)) {
    add('', 'is not an object');
    return c.result();
  }
  if (!shape) {
    if (doc.format !== IMAGE_FORMAT) add('format', `is ${IMAGE_FORMAT}`);
    else if (doc.formatVersion !== FORMAT_VERSION)
      add(
        'formatVersion',
        `is ${FORMAT_VERSION}; this reads /${FORMAT_VERSION} only`
      );
    if (!isText(doc.id)) add('id', 'is required');
  } else {
    if (doc.time !== undefined)
      add('time', 'belongs to each frame, not to the shared shape');
    if (doc.exposure !== undefined)
      add('exposure', 'belongs to each frame, not to the shared shape');
  }
  if (!USES.includes(doc.use)) add('use', `is ${USES.join(' or ')}`);
  checkPlanes(doc.planes, add);
  const frame = checkFrame(
    doc.width,
    doc.height,
    isObject(doc.planes) ? planesOf(doc) : { data: true }
  );
  if (!frame.ok) add('width', frame.message, frame.code);
  checkPixels(doc.pixels, add);
  if (doc.time !== undefined && !shape) checkTime(doc.time, 'time', add);
  if (doc.exposure !== undefined && !shape)
    checkExposure(doc.exposure, 'exposure', add);
  if (
    doc.scale !== undefined &&
    !(
      isObject(doc.scale) &&
      isNum(doc.scale.arcsecPerPixel) &&
      doc.scale.arcsecPerPixel > 0
    )
  )
    add('scale.arcsecPerPixel', 'is a positive number');
  if (
    doc.wcs !== undefined &&
    doc.wcs !== null &&
    !(isObject(doc.wcs) && Array.isArray(doc.wcs.ctype))
  )
    add('wcs', 'is null or { ctype, crpix, crval, ... }');
  if (doc.calibration !== undefined) {
    if (!(
      isObject(doc.calibration) &&
      CALIBRATION_STATES.includes(doc.calibration.state)
    ))
      add('calibration.state', `is one of ${CALIBRATION_STATES.join(', ')}`);
  }
  checkHistory(doc.history, add);
  checkSource(doc.source, add);
  return c.result({ decodedBytes: frame.ok ? frame.bytes : null });
}

/** The image a sequence's frame `i` is: the shared shape, with that frame's time and exposure. */
export function frameOf(seq, i = 0) {
  const f = seq.frames[i];
  return {
    ...seq.frame,
    format: IMAGE_FORMAT,
    formatVersion: FORMAT_VERSION,
    id: `${seq.id}#${i}`,
    time: f.time,
    exposure: f.exposure,
  };
}

/**
 * Whether a document is a well-formed image sequence.
 * @returns {{ok: boolean, problems: object[], resident?: number}}
 */
export function validateImageSequence(doc) {
  const c = collector();
  const { add } = c;
  if (!isObject(doc)) {
    add('', 'is not an object');
    return c.result();
  }
  if (doc.format !== SEQUENCE_FORMAT) add('format', `is ${SEQUENCE_FORMAT}`);
  else if (doc.formatVersion !== FORMAT_VERSION)
    add(
      'formatVersion',
      `is ${FORMAT_VERSION}; this reads /${FORMAT_VERSION} only`
    );
  if (!isText(doc.id)) add('id', 'is required');
  const shape = validateImage(doc.frame, { shape: true });
  for (const p of shape.problems)
    add(`frame.${p.path}`.replace(/\.$/, ''), p.message, p.code);
  const frames = doc.frames;
  if (!Array.isArray(frames) || frames.length === 0)
    add('frames', 'is a list of at least one frame');
  else if (frames.length > LIMITS.maxFrames)
    add(
      'frames',
      `has ${frames.length} frames; a sequence may have ${LIMITS.maxFrames}`,
      'too-large'
    );
  else {
    let scale = null;
    let format = null;
    let last = -Infinity;
    frames.forEach((f, i) => {
      const at = `frames[${i}]`;
      if (!isObject(f)) return add(at, 'is { index, time, exposure }');
      if (f.index !== i)
        add(`${at}.index`, `is ${i}: frames are numbered from 0 in order`);
      for (const k of ['width', 'height', 'pixels', 'planes', 'use'])
        if (f[k] !== undefined)
          add(`${at}.${k}`, 'belongs to the shared shape, not to a frame');
      const before = c.problems.length;
      checkTime(f.time, `${at}.time`, add);
      checkExposure(f.exposure, `${at}.exposure`, add);
      if (c.problems.length === before) {
        scale ??= f.time.scale;
        format ??= f.time.format;
        if (f.time.scale !== scale || f.time.format !== format)
          add(
            `${at}.time`,
            'uses another time scale or format than the first frame: a sequence has one'
          );
        const k = timeKey(f.time);
        if (k < last)
          add(
            `${at}.time`,
            'is earlier than the frame before it: frames are in time order'
          );
        last = Math.max(last, k);
      }
      if (f.part !== undefined)
        for (const m of partProblems(f.part)) add(`${at}.part`, m);
    });
  }
  const resident = shape.ok
    ? residentFrames(doc.frame.width, doc.frame.height, planesOf(doc.frame))
    : 0;
  return c.result({ resident });
}

const B64 = /^[A-Za-z0-9+/]*={0,2}$/;
/** The bytes a base64 string holds, without decoding it; -1 if it is not base64. */
export function base64Bytes(s) {
  if (typeof s !== 'string' || s.length % 4 !== 0 || !B64.test(s)) return -1;
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  return (s.length / 4) * 3 - pad;
}

/** Axis lengths and cell count of a grid document, or the reason they are not usable. */
export function gridShape(doc) {
  const axes = Array.isArray(doc?.axes) ? doc.axes : [];
  if (axes.length < 1)
    return {
      error: {
        code: 'invalid',
        path: 'axes',
        message: 'is a list of at least one axis',
      },
    };
  if (axes.length > LIMITS.maxGridAxes)
    return {
      error: {
        code: 'too-large',
        path: 'axes',
        message: `has ${axes.length} axes; a grid may have ${LIMITS.maxGridAxes}`,
      },
    };
  const outputs = Array.isArray(doc.outputs) ? doc.outputs.length : 0;
  let cells = 1;
  const shape = [];
  for (let i = 0; i < axes.length; i++) {
    const n = Array.isArray(axes[i]?.values) ? axes[i].values.length : 0;
    if (n > LIMITS.maxGridAxisLength)
      return {
        error: {
          code: 'too-large',
          path: `axes[${i}].values`,
          message: `has ${n} values; an axis may have ${LIMITS.maxGridAxisLength}`,
        },
      };
    shape.push(n);
    cells *= Math.max(n, 1);
    if (cells * Math.max(outputs, 1) > LIMITS.maxGridValues)
      return {
        error: {
          code: 'too-large',
          path: 'axes',
          message: `the axes make more than ${LIMITS.maxGridValues} values with the outputs`,
        },
      };
  }
  return { shape, cells, outputs, values: cells * outputs };
}

/**
 * Whether a document is a well-formed grid.
 * @returns {{ok: boolean, problems: object[], shape?: number[], cells?: number}}
 */
export function validateGrid(doc) {
  const c = collector();
  const { add } = c;
  if (!isObject(doc)) {
    add('', 'is not an object');
    return c.result();
  }
  if (doc.format !== GRID_FORMAT) add('format', `is ${GRID_FORMAT}`);
  else if (doc.formatVersion !== FORMAT_VERSION)
    add(
      'formatVersion',
      `is ${FORMAT_VERSION}; this reads /${FORMAT_VERSION} only`
    );
  if (!isText(doc.id)) add('id', 'is required');
  const names = new Set();
  (Array.isArray(doc.axes) ? doc.axes : []).forEach((a, i) => {
    const at = `axes[${i}]`;
    if (!isObject(a) || !isText(a.name))
      return add(`${at}.name`, 'names the parameter');
    if (names.has(a.name)) add(`${at}.name`, `repeats "${a.name}"`);
    names.add(a.name);
    if (typeof a.unit !== 'string')
      add(`${at}.unit`, 'is the unit ("" for none)');
    const v = a.values;
    if (!Array.isArray(v) || v.length === 0 || !v.every(isNum))
      add(`${at}.values`, 'is a list of finite numbers');
    else if (v.some((x, k) => k > 0 && !(x > v[k - 1])))
      add(`${at}.values`, 'rises strictly: sorted, no repeats');
  });
  const outs = new Set();
  if (!(Array.isArray(doc.outputs) && doc.outputs.length > 0))
    add('outputs', 'is a list of at least one output');
  else
    doc.outputs.forEach((o, i) => {
      if (!isObject(o) || !isText(o.name))
        return add(`outputs[${i}].name`, 'names the quantity');
      if (outs.has(o.name)) add(`outputs[${i}].name`, `repeats "${o.name}"`);
      outs.add(o.name);
      if (typeof o.unit !== 'string')
        add(`outputs[${i}].unit`, 'is the unit ("" for none)');
    });
  const g = doc.generator;
  if (!(
    isObject(g) &&
    isText(g.name) &&
    isText(g.version) &&
    isObject(g.inputs) &&
    Object.keys(g.inputs).length > 0
  ))
    add(
      'generator',
      'says what made the table: { name, version, inputs } with the exact inputs'
    );
  const size = gridShape(doc);
  if (size.error) add(size.error.path, size.error.message, size.error.code);
  if (!['dense', 'keyed'].includes(doc.layout))
    add('layout', 'is dense or keyed');
  const s = doc.storage;
  if (!isObject(s)) add('storage', 'is where the values are');
  else if (doc.layout === 'dense') {
    if (!GRID_ENCODINGS.includes(s.encoding))
      add('storage.encoding', `is one of ${GRID_ENCODINGS.join(', ')}`);
    else if (!size.error) {
      const need = size.values * ENCODINGS[s.encoding];
      if ((s.data === undefined) === (s.part === undefined))
        add('storage', 'holds either data or a part, not both and not neither');
      else if (s.data !== undefined) {
        const have = base64Bytes(s.data);
        if (have < 0) add('storage.data', 'is base64');
        else if (have !== need)
          add(
            'storage.data',
            `holds ${have} bytes; ${size.shape.join(' x ')} values of ${s.encoding} need ${need}`,
            'bad-size'
          );
      } else {
        for (const m of partProblems(s.part)) add('storage.part', m);
        if (s.part?.bytes !== need)
          add(
            'storage.part',
            `says ${s.part?.bytes} bytes; ${size.shape.join(' x ')} values of ${s.encoding} need ${need}`,
            'bad-size'
          );
      }
    }
  } else if (doc.layout === 'keyed') {
    const keys = doc.keys;
    if (!(
      Array.isArray(keys) &&
      keys.length === (doc.axes?.length ?? -1) &&
      keys.every((k, i) => k === doc.axes[i]?.name)
    ))
      add('keys', 'names, in order, the table column of each axis');
    if (!(
      s.kind === 'pack-table' &&
      isText(s.pack) &&
      /^[0-9a-f]{64}$/.test(s.sha256 ?? '')
    ))
      add(
        'storage',
        'is { kind: "pack-table", pack, sha256 }: the rows live in a pack\'s table'
      );
    if (!(
      Number.isInteger(doc.rows) &&
      doc.rows > 0 &&
      doc.rows <= LIMITS.maxGridValues
    ))
      add('rows', 'is the number of table rows the cells cover');
    if (!(Array.isArray(doc.cells) && doc.cells.length > 0))
      add('cells', 'lists the populated cells: [{ at, count }]');
  }
  return c.result({ shape: size.shape, cells: size.cells });
}

const refuse = (code, message, extra) => ({
  ok: false,
  code,
  message,
  ...extra,
});

/** Whether the pixel contract holds what photometry needs; the missing items, in a fixed order. */
export function photometryGaps(doc) {
  const p = doc.pixels ?? {};
  const gaps = [];
  if (!['linear', 'corrected'].includes(p.linearity?.status))
    gaps.push('pixels.linearity');
  if (!(
    isNum(p.saturation?.level) ||
    (p.saturation?.level === null && isText(p.saturation?.reason))
  ))
    gaps.push('pixels.saturation');
  const variance = isObject(doc.planes?.variance);
  if (!(variance || (isObject(p.gain) && isObject(p.readNoise))))
    gaps.push('noise');
  if (!doc.calibration?.state) gaps.push('calibration.state');
  if (!doc.time) gaps.push('time');
  if (!doc.exposure) gaps.push('exposure');
  return gaps;
}

/**
 * Whether an image (or frame `i` of a sequence) may be marked, measured for
 * light, or measured for position; a refusal says why in words, with a code.
 * @param {object} doc - A gravitas.image, or a gravitas.image-sequence
 * @param {'marking'|'photometry'|'astrometry'} operation
 * @param {number} [i] - The frame, for a sequence
 * @returns {{ok: true}|{ok: false, code: string, message: string, missing?: string[]}}
 */
export function permits(doc, operation, i = 0) {
  if (!OPERATIONS.includes(operation))
    throw new RangeError(`not an operation: ${operation}`);
  const isSequence = doc?.format === SEQUENCE_FORMAT;
  const check = isSequence ? validateImageSequence(doc) : validateImage(doc);
  if (!check.ok) {
    const p = check.problems[0];
    return refuse(
      'invalid',
      `this is not a valid ${isSequence ? 'image sequence' : 'image'}: ${p.path} ${p.message}`
    );
  }
  const image = isSequence ? frameOf(doc, i) : doc;
  if (operation === 'marking') return { ok: true };
  if (image.use === 'display-only')
    return refuse(
      'display-only',
      `This image is display-only: it can be marked, but ${operation === 'photometry' ? 'photometry needs pixel values that measure light' : 'astrometry needs positions tied to the sky'}, and its pixels have been stretched, re-encoded or never had their units and provenance recorded.`
    );
  if (operation === 'astrometry') {
    if (!image.wcs)
      return refuse(
        'no-wcs',
        'This image has no world coordinate system, so a position in it cannot be a position on the sky.'
      );
    const why = wcsUnusable(image.wcs);
    if (why)
      return refuse(
        'wcs-unsupported',
        `This image's world coordinates cannot be used: ${why}.`
      );
    const moved = image.history.find(
      h => GEOMETRIC_STEPS.includes(h.step) && h.wcsUpdated === false
    );
    if (moved)
      return refuse(
        'geometry-unrecorded',
        `The image was changed by "${moved.step}" (${moved.tool}) without its world coordinates following, so its positions no longer match the sky.`
      );
    return { ok: true };
  }
  if (!FLUX_UNITS.includes(image.pixels.unit))
    return refuse(
      'not-flux',
      `The pixel values are ${image.pixels.unit === 'flags' ? 'bit flags' : image.pixels.unit === 'display' ? 'display levels' : 'in an unknown unit'}, not a measure of light, so there is no photometry to do.`
    );
  const missing = photometryGaps(image);
  if (missing.length)
    return refuse(
      'incomplete-contract',
      `Photometry needs the pixel contract complete; this one lacks: ${missing.join(', ')}.`,
      { missing }
    );
  const lossy = image.history.find(
    h =>
      h.lossy ||
      h.step === 'stretch' ||
      (h.step === 'resample' && h.fluxConserving === false)
  );
  if (lossy)
    return refuse(
      'lossy-history',
      `The pixels went through "${lossy.step}" (${lossy.tool}), which does not keep the measured light, so they cannot be measured for it.`
    );
  return { ok: true };
}

/**
 * `permits` for a data pack's runtime copy (PACK in js/data/observations/): an
 * image pack that states no pixel contract is display-only, whatever its
 * numbers are, and an image-sequence pack is judged by its sequence.
 * @param {object} pack - PACK
 * @param {'marking'|'photometry'|'astrometry'} operation
 * @param {number} [i] - The frame, for a sequence
 */
export function packPermits(pack, operation, i = 0) {
  const doc =
    pack?.dataType === 'image-sequence' ? pack.sequence : pack?.image?.sidecar;
  if (!doc) {
    if (!OPERATIONS.includes(operation))
      throw new RangeError(`not an operation: ${operation}`);
    if (pack?.dataType !== 'image' && pack?.dataType !== 'image-sequence')
      return refuse(
        'not-an-image',
        `${pack?.id ?? 'this pack'} is not an image.`
      );
    return operation === 'marking'
      ? { ok: true }
      : refuse(
          'display-only',
          `${pack.id} states no pixel contract, so it is display-only: it can be marked, and ${operation} waits for one.`
        );
  }
  return permits(doc, operation, i);
}
