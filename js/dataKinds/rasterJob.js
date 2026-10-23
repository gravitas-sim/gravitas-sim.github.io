// =============================================================================
// Reading a PNG or a JPEG on the Worker pool (Prompt 188)
// -----------------------------------------------------------------------------
// The same shape as ./fitsJob.js, for the two pictures a person may bring that
// are display-only (./raster.js). The page checks the structure and the bounds
// (nothing is decoded, nothing is allocated for pixels), the job declares what
// the realm will hold, and the realm decodes:
//
//   planRasterRead   on the page: sniff, structure, bounds; the job's memory is
//                    the file plus the decoder's 4-byte RGBA frame plus the
//                    Float64 plane, and the file's buffer is made ready to move
//   runRasterJob     in the realm, which believes nothing it was sent: the
//                    header is read again, the bytes go to the browser's
//                    decoder (createImageBitmap) with no colour conversion, the
//                    frame is drawn over white on an OffscreenCanvas, and the
//                    decoder's own width and height must be the header's
//   readRasterOnPool both, with the pool: cancelling terminates the realm
//
// A refusal is an answer, not a failure: `refused` with the code and the reason.
// A decoder that rejects the bytes is `undecodable`; a realm without a decoder
// is `no-decoder`. After a job starts the caller's buffer is gone.
// =============================================================================

import { DataKindError, LIMITS } from './limits.js';
import {
  flipRows,
  lumaPlane,
  readRasterHeader,
  sniff,
  unknownFormat,
} from './raster.js';

export const RASTER_JOB = 'raster-read';
const MIME = { png: 'image/png', jpeg: 'image/jpeg' };

/** The bytes a read holds in the realm: the file, the RGBA frame, the Float64 plane. */
export const rasterMemory = (fileBytes, width, height) =>
  fileBytes + 12 * width * height;

function bytesOf(source) {
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (ArrayBuffer.isView(source))
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  throw new DataKindError(
    'unknown-format',
    'expected the bytes of a file (an ArrayBuffer or a typed array)'
  );
}

/**
 * Check a PNG or JPEG on the page and build the pool job.
 * @param {ArrayBuffer|ArrayBufferView} source
 * @returns {{ok: true, job: object, geometry: object}|{ok: false, code: string, message: string}}
 */
export function planRasterRead(source) {
  let bytes;
  let kind;
  let header;
  try {
    bytes = bytesOf(source);
    if (bytes.length > LIMITS.maxFileBytes)
      throw new DataKindError(
        'file-too-large',
        `the file is ${bytes.length} bytes; the most a frame and its headers can take is ${LIMITS.maxFileBytes}`
      );
    kind = sniff(bytes);
    if (kind !== 'png' && kind !== 'jpeg') throw unknownFormat(bytes);
    header = readRasterHeader(bytes, kind);
  } catch (e) {
    if (e instanceof DataKindError)
      return { ok: false, code: e.code, message: e.message };
    throw e;
  }
  const whole =
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength;
  const buffer = whole ? bytes.buffer : bytes.slice().buffer;
  return {
    ok: true,
    job: {
      index: 0,
      kind: RASTER_JOB,
      memoryBytes: rasterMemory(bytes.length, header.width, header.height),
      transfer: [buffer],
      payload: { buffer },
    },
    geometry: {
      kind,
      width: header.width,
      height: header.height,
      fileBytes: bytes.length,
      decodedBytes: 8 * header.width * header.height,
    },
  };
}

const refused = (echo, code, message) => ({
  result: { ...echo, status: 'refused', code, message },
  transfer: [],
});

/**
 * The realm's side of a job: decode, draw, gray.
 * @param {{index: number, jobId?: string, generation?: number, payload: {buffer: ArrayBuffer}}} msg
 * @param {{onProgress?: Function, isCancelled?: Function}} [hooks]
 * @returns {Promise<{result: object, transfer: ArrayBuffer[]}>}
 */
export async function runRasterJob(msg, hooks = {}) {
  const echo = {
    index: msg.index,
    jobId: msg.jobId,
    generation: msg.generation,
  };
  let bitmap = null;
  try {
    const bytes = new Uint8Array(msg.payload.buffer);
    const kind = sniff(bytes);
    if (kind !== 'png' && kind !== 'jpeg') throw unknownFormat(bytes);
    const { width, height } = readRasterHeader(bytes, kind);
    if (
      typeof createImageBitmap !== 'function' ||
      typeof OffscreenCanvas !== 'function'
    )
      return refused(
        echo,
        'no-decoder',
        'this browser cannot decode a picture in the background'
      );
    hooks.onProgress?.(0.1);
    try {
      bitmap = await createImageBitmap(new Blob([bytes], { type: MIME[kind] }), {
        colorSpaceConversion: 'none',
        premultiplyAlpha: 'none',
      });
    } catch {
      return refused(
        echo,
        'undecodable',
        `the browser could not decode this ${kind === 'png' ? 'PNG' : 'JPEG'}: its pixel data is damaged or is not what its header says`
      );
    }
    if (bitmap.width !== width || bitmap.height !== height)
      return refused(
        echo,
        'dimension-mismatch',
        `the header says ${width} by ${height} pixels and the decoder produced ${bitmap.width} by ${bitmap.height}`
      );
    hooks.onProgress?.(0.5);
    const canvas = new OffscreenCanvas(width, height);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff';
    g.fillRect(0, 0, width, height);
    g.drawImage(bitmap, 0, 0);
    bitmap.close();
    bitmap = null;
    const rgba = g.getImageData(0, 0, width, height).data;
    hooks.onProgress?.(0.8);
    const values = flipRows(
      lumaPlane(rgba, width, height, hooks),
      width,
      height
    );
    hooks.onProgress?.(1);
    return {
      result: {
        ...echo,
        status: 'ok',
        image: { kind, width, height, values, decodedBytes: 8 * width * height },
      },
      transfer: [values.buffer],
    };
  } catch (e) {
    if (e instanceof DataKindError)
      return refused(echo, e.code, e.message);
    throw e;
  } finally {
    bitmap?.close?.();
  }
}

/**
 * Read a picture in a pool realm.
 * @param {{batch: Function}} pool - From createPool, whose `spawn` starts js/dataKinds/fitsWorker.js
 * @param {ArrayBuffer|ArrayBufferView} source
 * @param {{signal?: AbortSignal, channel?: string, jobTimeoutMs?: number, onProgress?: Function}} [o]
 * @returns {Promise<{ok: true, image: object, geometry: object}|{ok: false, code: string, message: string}>}
 */
export async function readRasterOnPool(
  pool,
  source,
  { signal, channel, jobTimeoutMs, onProgress } = {}
) {
  if (signal?.aborted)
    return {
      ok: false,
      code: 'canceled',
      message: 'the read was canceled before it began',
    };
  const plan = planRasterRead(source);
  if (!plan.ok) return plan;
  const run = pool.batch([plan.job], {
    channel,
    jobTimeoutMs,
    noun: 'picture file',
    owner: 'image reader',
    accept: r => r?.status === 'ok' || r?.status === 'refused',
    onProgress: s => onProgress?.(s.fraction),
  });
  const stop = () => run.cancel('the read was canceled');
  signal?.addEventListener('abort', stop, { once: true });
  try {
    const out = await run.run();
    const r = out.trials[0];
    if (r?.status === 'ok')
      return { ok: true, image: r.image, geometry: plan.geometry };
    if (r?.status === 'refused')
      return { ok: false, code: r.code, message: r.message };
    return {
      ok: false,
      code: r?.status ?? 'workerFailed',
      message: r?.error ?? 'the read did not finish',
    };
  } finally {
    signal?.removeEventListener('abort', stop);
  }
}
