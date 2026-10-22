// The FITS reader, its job and its worker, measured beside the instrument and not
// counted in it (IMAGE_MEASUREMENT_GATE.md). A measurement entry for bytes.mjs.
import * as fits from '../../../js/dataKinds/fits.js';
import * as job from '../../../js/dataKinds/fitsJob.js';
import * as worker from '../../../js/dataKinds/fitsWorker.js';

export { fits, job, worker };
