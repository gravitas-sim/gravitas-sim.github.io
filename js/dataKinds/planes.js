// =============================================================================
// The planes of an image, decoded within bounds (Prompt 157)
// -----------------------------------------------------------------------------
// The sidecar (./contract.js) says what the pixels are; this turns bytes into
// arrays. The size is checked against the declared shape and the page's
// decoded-image bytes (./limits.js) before any array exists, and a plane whose
// bytes are not exactly width x height x the encoding's width is refused. The
// data and variance planes become Float64Array (8 bytes a pixel, which is what
// they are budgeted at); a mask becomes Uint16Array.
//
// A built-in image pack keeps its pixels in a runtime module that
// js/observation.js decodes (`image-uint16/1`); `imagePlanesOfPack` reads one
// through that decoder, so the bytes of an existing pack are never changed.
// =============================================================================

import { DataKindError, checkFrame } from './limits.js';
import { ENCODINGS, INTEGER_ENCODINGS, validateImage } from './contract.js';
import { observationOf } from '../observation.js';

const READ = {
  uint8: (v, o) => v.getUint8(o),
  'uint16-le': (v, o) => v.getUint16(o, true),
  'int16-le': (v, o) => v.getInt16(o, true),
  'uint32-le': (v, o) => v.getUint32(o, true),
  'int32-le': (v, o) => v.getInt32(o, true),
  'float32-le': (v, o) => v.getFloat32(o, true),
  'float64-le': (v, o) => v.getFloat64(o, true),
};

/**
 * One plane's bytes as numbers.
 * @param {string} encoding - A key of ENCODINGS
 * @param {Uint8Array} bytes
 * @param {number} width
 * @param {number} height
 * @param {'float64'|'uint16'} [as]
 */
export function decodePlane(encoding, bytes, width, height, as = 'float64') {
  const size = ENCODINGS[encoding];
  if (!size)
    throw new DataKindError(
      'bad-encoding',
      `${encoding} is not a plane encoding`
    );
  const frame = checkFrame(width, height, { data: true });
  if (!frame.ok) throw new DataKindError(frame.code, frame.message);
  if (!(bytes instanceof Uint8Array) || bytes.length !== frame.pixels * size)
    throw new DataKindError(
      'bad-size',
      `a ${width} by ${height} plane of ${encoding} is ${frame.pixels * size} bytes; this holds ${bytes?.length}`
    );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const out =
    as === 'uint16'
      ? new Uint16Array(frame.pixels)
      : new Float64Array(frame.pixels);
  const get = READ[encoding];
  for (let i = 0, o = 0; i < out.length; i++, o += size) {
    const v = get(view, o);
    if (as === 'uint16' && v > 65535)
      throw new DataKindError(
        'bad-size',
        'a mask value does not fit in 16 bits'
      );
    out[i] = v;
  }
  return out;
}

/**
 * The arrays of an image the sidecar describes.
 * @param {object} doc - A gravitas.image
 * @param {{data: Uint8Array, variance?: Uint8Array, mask?: Uint8Array}} sources
 * @returns {{width: number, height: number, data: Float64Array, variance?: Float64Array, mask?: Uint16Array}}
 * @throws {DataKindError}
 */
export function readImagePlanes(doc, sources) {
  const v = validateImage(doc);
  if (!v.ok)
    throw new DataKindError(
      v.problems[0].code,
      `${v.problems[0].path} ${v.problems[0].message}`
    );
  const { width, height, planes } = doc;
  const out = {
    width,
    height,
    data: decodePlane(planes.data.encoding, sources.data, width, height),
  };
  if (planes.variance)
    out.variance = decodePlane(
      planes.variance.encoding,
      sources.variance,
      width,
      height
    );
  if (planes.mask) {
    if (!INTEGER_ENCODINGS.includes(planes.mask.encoding))
      throw new DataKindError('bad-encoding', 'a mask is whole numbers');
    out.mask = decodePlane(
      planes.mask.encoding,
      sources.mask,
      width,
      height,
      'uint16'
    );
  }
  return out;
}

/**
 * The pixels of an image data pack (js/data/observations/), by the pack's own
 * decoder, as a Float64 plane.
 * @param {{PACK: object, SERIES: object}} pack
 */
export function imagePlanesOfPack(pack) {
  const o = observationOf(pack);
  if (!o.image)
    throw new DataKindError(
      'not-an-image',
      `${pack?.PACK?.id} is not an image pack`
    );
  const { width, height, values } = o.image;
  const frame = checkFrame(width, height, { data: true });
  if (!frame.ok) throw new DataKindError(frame.code, frame.message);
  return {
    width,
    height,
    data: Float64Array.from(values),
    wcs: o.image.wcs,
    bits: o.image.bits,
    source: o.source,
  };
}
