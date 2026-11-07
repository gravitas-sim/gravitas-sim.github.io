// A disposable realm for one trial of an ensemble experiment (Prompt 265). Started by
// the pool (js/workers/pool.js) through ./run.js, one per trial, and terminated when it
// answers, as js/experiments/experimentWorker.js is for a sweep. Messages in:
//   { type: 'run', manifest, job }   run one job: the trial's row comes back
//   { type: 'fingerprint' }          the engine's fingerprint in this realm
// Out: { type: 'result', result } | { type: 'fingerprint', fingerprint } |
// { type: 'error', message }. The engine's modules are imported only when the
// trial needs them (trial.js loadRealm), so a trial of the analytic world starts
// a realm without the engine in it.

import { runJob, loadRealm } from './trial.js';
import { engineFingerprint } from '../trialRunner.js';

self.onmessage = async e => {
  const msg = e.data || {};
  try {
    if (msg.type === 'run') {
      const result = await runJob(msg.manifest, msg.job, {
        now: () => performance.now(),
      });
      self.postMessage({ type: 'result', result });
    } else if (msg.type === 'fingerprint') {
      self.postMessage({
        type: 'fingerprint',
        fingerprint: engineFingerprint(await loadRealm()),
      });
    } else {
      self.postMessage({
        type: 'error',
        message: `unknown message ${msg.type}`,
      });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
