// =============================================================================
// A disposable realm that reads one image file (Prompts 157 and 188)
// -----------------------------------------------------------------------------
// Started by readFitsOnPool (./fitsJob.js) or readRasterOnPool (./rasterJob.js)
// through js/workers/pool.js, one per file, terminated when it answers;
// cancelling terminates it. It imports the readers and nothing a page shows.
// The name is Prompt 157's (a FITS reader first); a PNG or a JPEG is the second
// kind of job it answers.
//
// Messages in:  { type: 'run', kind: 'fits-read' | 'raster-read', index, jobId,
//                 generation, payload: { buffer } }   (the buffer moves in)
// Messages out: { type: 'progress', fraction }, then exactly one of
//               { type: 'result', result }  (the plane's buffer moves out)
//               { type: 'error', message }
// =============================================================================

import { FITS_JOB, runFitsJob } from './fitsJob.js';
import { RASTER_JOB, runRasterJob } from './rasterJob.js';

const progress = fraction => self.postMessage({ type: 'progress', fraction });

self.onmessage = async e => {
  const msg = e.data || {};
  if (msg.type !== 'run' || (msg.kind !== FITS_JOB && msg.kind !== RASTER_JOB)) {
    self.postMessage({
      type: 'error',
      message: 'this realm reads image files only',
    });
    return;
  }
  try {
    const { result, transfer } =
      msg.kind === FITS_JOB
        ? runFitsJob(msg, { onProgress: progress })
        : await runRasterJob(msg, { onProgress: progress });
    self.postMessage({ type: 'result', result }, transfer);
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
