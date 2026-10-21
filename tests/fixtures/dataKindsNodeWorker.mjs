// A realm for tests/dataKindsPool.test.js: js/dataKinds/fitsWorker.js's
// protocol on a worker_threads Worker, so the pool, the transfer of buffers and
// the termination are the real ones.
import { parentPort } from 'node:worker_threads';

import { FITS_JOB, runFitsJob } from '../../js/dataKinds/fitsJob.js';

parentPort.on('message', msg => {
  if (msg.type !== 'run' || msg.kind !== FITS_JOB) {
    parentPort.postMessage({ type: 'error', message: 'FITS files only' });
    return;
  }
  try {
    const { result, transfer } = runFitsJob(msg, {
      onProgress: fraction =>
        parentPort.postMessage({ type: 'progress', fraction }),
    });
    parentPort.postMessage({ type: 'result', result }, transfer);
  } catch (err) {
    parentPort.postMessage({
      type: 'error',
      message: String(err?.message || err),
    });
  }
});
