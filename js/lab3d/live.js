// =============================================================================
// A live 3-D run: the engine advanced on demand, reported as snapshots
// -----------------------------------------------------------------------------
// The lab (/3d/) plays a system as it runs. That is the same engine run the
// diagnostics page uses (./engine.js createRun), with its sample interval as
// the lab's tick: advance(k) integrates exactly k intervals and returns one
// snapshot (./snapshot.js) with every interval's positions for the trails.
// Playing faster asks for more intervals a frame, never a longer step, so
// the physics does not depend on how fast anyone watches it.
//
// A session lasts as long as one engine run may: 100,000 intervals, or an
// hour of wall clock. It then stops with that status, and a page that wants
// more starts a new session from the last snapshot's numbers (`restartFrom`)
// and says that it did. The errors a snapshot reports are the run's own
// (./engine.js), measured against the session's start.
// =============================================================================

import { CEILINGS, createRun, runProblems } from './engine.js';
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from './snapshot.js';

// Kept in ./snapshot.js, which the page loads anyway: the page needs this and
// nothing else of this module, and importing it from here would bring the
// engine and the kernel (34 KB, three requests) to the page, whose Worker is
// the only place they run. Re-exported so this module's API is unchanged.
export { restartFrom } from './snapshot.js';

export const MAX_INTERVALS_PER_ADVANCE = 256;
export const SESSION_INTERVALS = CEILINGS.maxSamples;

/**
 * @param {object} system - A validated gravitas.system3d/1
 * @param {object} o
 * @param {number} o.interval - Simulation time per tick, in the system's units
 * @param {number} [o.closeWithin] - Report close approaches below this distance
 * @param {number} [o.escapeBeyond] - Report escapes beyond this distance
 * @param {string[]} [o.crossings] - Bodies whose z = 0 crossings to report
 * @returns {{problems: object[]} | {session: object}}
 */
export function createLive(system, o = {}) {
  if (!(o.interval > 0) || !Number.isFinite(o.interval))
    return { problems: [{ path: 'interval', code: 'interval' }] };
  const options = {
    span: o.interval * SESSION_INTERVALS,
    samples: SESSION_INTERVALS,
    positions: false,
    closeWithin: o.closeWithin,
    escapeBeyond: o.escapeBeyond,
    crossings: o.crossings,
    limits: {
      maxSamples: CEILINGS.maxSamples,
      maxEvents: CEILINGS.maxEvents,
      maxEvals: CEILINGS.maxEvals,
      maxWallMs: CEILINGS.maxWallMs,
    },
  };
  const problems = runProblems(system, options);
  if (problems.length) return { problems };

  const run = createRun(system, options);
  const s = run.state;
  const ids = system.bodies.map(b => b.id);
  let seq = 0;
  let seenEvents = 0;
  let seenWarnings = 0;
  let status = null;

  const snapshot = (trail, trailT) => {
    const out = run.result();
    const last = out.samples[out.samples.length - 1];
    const events = out.events.slice(seenEvents);
    seenEvents = out.events.length;
    const warnings = out.warnings.slice(seenWarnings);
    seenWarnings = out.warnings.length;
    return {
      format: SNAPSHOT_FORMAT,
      formatVersion: SNAPSHOT_VERSION,
      seq: seq++,
      t: s.t,
      ids,
      m: s.m.slice(),
      radius: s.radius.slice(),
      x: s.x.slice(),
      v: s.v.slice(),
      alive: s.alive.slice(),
      trail,
      trailT,
      events,
      warnings,
      errors: {
        energy: last.energy,
        angularMomentum: last.angularMomentum,
        momentum: last.momentum,
      },
      status,
    };
  };

  return {
    session: {
      ids,
      units: system.units,
      /** The state now, as a snapshot with no trail. */
      now: () => snapshot(new Float64Array(0), new Float64Array(0)),
      /**
       * Integrate k intervals (1 to MAX_INTERVALS_PER_ADVANCE) and report
       * them. A session that has stopped reports its last state again, with
       * its status.
       */
      advance(k) {
        const steps = Math.min(
          MAX_INTERVALS_PER_ADVANCE,
          Math.max(1, Math.floor(k) || 1)
        );
        const n = s.n;
        const trail = new Float64Array(steps * 3 * n);
        const trailT = new Float64Array(steps);
        let done = 0;
        while (done < steps && !status) {
          const finished = run.advance(0);
          trail.set(s.x, done * 3 * n);
          trailT[done] = s.t;
          done++;
          if (finished) status = run.result().status;
        }
        return snapshot(trail.slice(0, done * 3 * n), trailT.slice(0, done));
      },
      cancel: () => run.cancel(),
    },
  };
}
