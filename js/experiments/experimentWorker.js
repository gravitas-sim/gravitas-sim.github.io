// =============================================================================
// A disposable realm for one trial of an experiment
// -----------------------------------------------------------------------------
// Started by js/experiments/scheduler.js, one per trial, and terminated as
// soon as it answers. Its own copy of the engine - js/physics.js evaluated
// fresh in this realm, with its own body lists and id counter - is the reason
// it exists (MULTI_WORLD_DECISION.md); js/experiments/trialRunner.js is what it
// does.
//
// Messages in:
//   { type: 'run', manifest, trial }      run one trial
//   { type: 'plan', manifest, trial }     build it and say what running it
//                                         would cost, without running it
//   { type: 'fingerprint' }               the engine's fingerprint
// Messages out: { type: 'progress', fraction }, then exactly one of
//   { type: 'result', result }, { type: 'plan', plan, fingerprint } or
//   { type: 'error', message }. A plan carries what the realm measured about
//   this device: its start-up, the build, and a short timed integration
//   (trialRunner.js calibrate()), which the page prices the experiment from.
//
// Bundled on its own by build.js, like js/physicsWorker.js, and started with
// `new Worker(new URL(...), { type: 'module' })`, so the same line works
// against the published sources and against dist/.
// =============================================================================

import * as physics from '../physics.js';
import * as build from '../world/build.js';
import * as scenarios from '../scenarios.js';
import * as appState from '../appState.js';
import * as rng from '../rng.js';
import * as timestep from '../timestep.js';
import * as units from '../units.js';
import {
  calibrate,
  engineFingerprint,
  planTrial,
  runTrial,
} from './trialRunner.js';

const modules = { physics, build, scenarios, appState, rng, timestep, units };

self.onmessage = e => {
  // A Worker's clock starts when the Worker is made, and the page posts its
  // one message straight away; the message waits until this module and the
  // engine have loaded. So the time now is what starting a realm costs here.
  const startMs = performance.now();
  const msg = e.data || {};
  try {
    if (msg.type === 'run') {
      let last = -1;
      const result = runTrial(modules, msg.manifest, msg.trial, {
        now: () => performance.now(),
        onProgress: fraction => {
          // A few messages a trial, not one a frame: the page redraws on
          // each, and a hundred realms each sending sixty a second would be
          // the freeze the scheduler exists to prevent.
          if (fraction - last >= 0.05) {
            last = fraction;
            self.postMessage({ type: 'progress', fraction });
          }
        },
      });
      self.postMessage({ type: 'result', result });
    } else if (msg.type === 'plan') {
      const building = performance.now();
      const { settings, ...plan } = planTrial(modules, msg.manifest, msg.trial);
      const buildMs = performance.now() - building;
      // Timed on the world just planned, before the fingerprint builds its own.
      const calibration = calibrate(
        modules,
        plan,
        msg.manifest.numerics?.sampleEvery || 1,
        { now: () => performance.now() }
      );
      const fingerprint = engineFingerprint(modules);
      self.postMessage({
        type: 'plan',
        plan: { ...plan, startMs, buildMs, calibration },
        fingerprint,
        maxTimestep: settings.max_timestep,
      });
    } else if (msg.type === 'fingerprint') {
      self.postMessage({
        type: 'plan',
        fingerprint: engineFingerprint(modules),
      });
    } else {
      self.postMessage({
        type: 'error',
        message: `unknown message ${msg.type}`,
      });
    }
  } catch (err) {
    // A realm that dies silently looks the same as one still thinking, so the
    // scheduler is told what went wrong and can report it.
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
