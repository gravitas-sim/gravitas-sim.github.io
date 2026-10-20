// A Worker's draws, for tests/seedingEquivalence.test.js: the same module the
// page imports, run in another thread, answering with what it drew.
import { parentPort, workerData } from 'node:worker_threads';
import { stream, state, gaussian, engine } from '../../js/random/streams.js';

const draws = (next, n) => Array.from({ length: n }, () => next());
const out = {
  jobs: [...workerData.jobs]
    .reverse()
    .map(i => [i, draws(stream('experiments', 'run', 'job', i), 16)]),
  noise: draws(gaussian(stream('noise', String(workerData.seed))), 16),
  state: draws(state('forward', workerData.state), 16),
  engine: engine(workerData.state, () => draws(Math.random, 16)),
};
parentPort.postMessage(out);
