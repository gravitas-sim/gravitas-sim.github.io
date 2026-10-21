// =============================================================================
// A disposable realm that reads one FITS file (Prompt 157)
// -----------------------------------------------------------------------------
// Started by readFitsOnPool (./fitsJob.js) through js/workers/pool.js, one per
// file, terminated when it answers; cancelling terminates it. It imports the
// reader and nothing a page shows.
//
// Messages in:  { type: 'run', kind: 'fits-read', index, jobId, generation,
//                 payload: { buffer } }   (the buffer moves in)
// Messages out: { type: 'progress', fraction }, then exactly one of
//               { type: 'result', result }  (the plane's buffer moves out)
//               { type: 'error', message }
// =============================================================================

import { FITS_JOB, runFitsJob } from './fitsJob.js';

self.onmessage = e => {
  const msg = e.data || {};
  if (msg.type !== 'run' || msg.kind !== FITS_JOB) {
    self.postMessage({
      type: 'error',
      message: 'this realm reads FITS files only',
    });
    return;
  }
  try {
    const { result, transfer } = runFitsJob(msg, {
      onProgress: fraction => self.postMessage({ type: 'progress', fraction }),
    });
    self.postMessage({ type: 'result', result }, transfer);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
