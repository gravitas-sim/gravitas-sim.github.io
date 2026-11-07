// A Node worker_threads realm that answers the ensemble runner's messages the way a
// browser Worker running js/experiments/ensemble/worker.js does: `self` with
// postMessage and onmessage, then the worker module itself. Used by the validator and
// its tests to run each trial in a real realm of its own.
import { parentPort, workerData } from 'node:worker_threads';

globalThis.self = { postMessage: m => parentPort.postMessage(m) };
await import(workerData.worker);
parentPort.on('message', data => globalThis.self.onmessage({ data }));
