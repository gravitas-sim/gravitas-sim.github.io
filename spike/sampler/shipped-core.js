// The modules a shipped sampler would add to the Worker: the move, the
// diagnostics and the adapter over the core's likelihood. (The Worker task glue
// would be a few lines in js/inference/inferenceWorker.js.) The measurement
// entry for check-words.mjs; the core's own modules stay external.
export { createRun } from './ensemble.js';
export { report } from './diagnostics.js';
export { coreTarget } from './coreAdapter.js';
