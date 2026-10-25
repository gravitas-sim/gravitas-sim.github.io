// =============================================================================
// Reading a FITS file on the Worker pool (Prompt 157)
// -----------------------------------------------------------------------------
// A frame of 4 million pixels is a few tens of milliseconds of decoding and 32
// MiB of Float64; neither belongs on the page's thread or outside the pool's
// memory ledger (js/workers/pool.js, WORKER_POOL.md). So:
//
//   planFitsRead   on the page: the header is checked and the bounds applied
//                  (no pixel is decoded), the job declares what the realm will
//                  hold, the file's bytes plus the Float64 plane, and the file's
//                  buffer is made ready to MOVE into the realm (a view of part
//                  of a buffer is copied first, so nobody else's bytes move)
//   runFitsJob     in the realm: the whole read again, since a realm believes
//                  nothing it was sent, answering with the plane as a buffer
//                  that moves back
//   readFitsOnPool both, with the pool: cancellation terminates the realm
//
// A refusal is an answer, not a failure: status `refused` with the code and the
// reason (./fits.js). The pool's own statuses (canceled, timeout, resourceLimit,
// workerFailed) come back as the code. After a job starts the caller's buffer is
// gone (byteLength 0): the file's bytes belong to the realm.
// =============================================================================

import { DataKindError } from './limits.js';
import { locateImage, readFits } from './fits.js';

export const FITS_JOB = 'fits-read';

/**
 * Check the header on the page and build the pool job.
 * @param {ArrayBuffer|ArrayBufferView} source
 * @returns {{ok: true, job: object, geometry: object}|{ok: false, code: string, message: string}}
 */
export function planFitsRead(source) {
  let found;
  try {
    found = locateImage(source);
  } catch (e) {
    if (e instanceof DataKindError)
      return { ok: false, code: e.code, message: e.message };
    throw e;
  }
  const view = found.bytes;
  const whole =
    view.buffer instanceof ArrayBuffer &&
    view.byteOffset === 0 &&
    view.byteLength === view.buffer.byteLength;
  const buffer = whole ? view.buffer : view.slice().buffer;
  return {
    ok: true,
    job: {
      index: 0,
      kind: FITS_JOB,
      memoryBytes: found.fileBytes + found.decodedBytes,
      transfer: [buffer],
      payload: { buffer },
    },
    geometry: {
      width: found.width,
      height: found.height,
      bitpix: found.bitpix,
      hdu: found.hdu,
      fileBytes: found.fileBytes,
      decodedBytes: found.decodedBytes,
    },
  };
}

/**
 * The realm's side of a job.
 * @param {{index: number, jobId?: string, generation?: number, payload: {buffer: ArrayBuffer}}} msg
 * @param {{onProgress?: Function, isCancelled?: Function}} [hooks]
 * @returns {{result: object, transfer: ArrayBuffer[]}}
 */
export function runFitsJob(msg, hooks = {}) {
  const echo = {
    index: msg.index,
    jobId: msg.jobId,
    generation: msg.generation,
  };
  try {
    const { values, ...rest } = readFits(
      new Uint8Array(msg.payload.buffer),
      hooks
    );
    return {
      result: { ...echo, status: 'ok', image: { ...rest, values } },
      transfer: [values.buffer],
    };
  } catch (e) {
    if (e instanceof DataKindError)
      return {
        result: {
          ...echo,
          status: 'refused',
          code: e.code,
          message: e.message,
        },
        transfer: [],
      };
    throw e;
  }
}

/**
 * Read a file in a pool realm.
 * @param {{batch: Function}} pool - From createPool, whose `spawn` starts js/dataKinds/fitsWorker.js
 * @param {ArrayBuffer|ArrayBufferView} source
 * @param {{signal?: AbortSignal, channel?: string, jobTimeoutMs?: number, onProgress?: Function}} [o]
 * @returns {Promise<{ok: true, image: object}|{ok: false, code: string, message: string}>}
 */
export async function readFitsOnPool(
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
  const plan = planFitsRead(source);
  if (!plan.ok) return plan;
  const run = pool.batch([plan.job], {
    channel,
    jobTimeoutMs,
    noun: 'image file',
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
