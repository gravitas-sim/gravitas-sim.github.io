// =============================================================================
// When to take a sample, and when to give up
// -----------------------------------------------------------------------------
// The bookkeeping of a recorded phase, with the world taken out of it.
//
// A phase is asked for N frames of simulated time and driven by animation
// frames, which are not the same thing. A backgrounded tab, a paused
// simulation, a frame the engine skipped: all of them tick without advancing
// the clock. Deciding what to do about that turns out to be four separate
// decisions, and the runner used to make all four wrong:
//
//   sample on every tick            so a stalled run recorded the same instant
//                                   over and over, and a series with repeated
//                                   times is not a series
//   count those towards the cap     so a stall could end the run at the sample
//                                   ceiling and be reported as a run that had
//                                   measured too much rather than one that had
//                                   measured nothing
//   no sample at the start          so N advances produced N samples spanning
//                                   (N-1) steps, while the phase reported a
//                                   duration of N
//   one outcome for two failures    so a stalled phase and a capped phase were
//                                   indistinguishable downstream
//
// So the rules are here, pure, and the runner does nothing but read the clock
// and do as it is told. Tested by scripting a clock rather than by running a
// simulation, which is the only way to test a permanent stall at all.
// =============================================================================

/** How a phase ended. */
export const PHASE_OUTCOME = Object.freeze({
  /** It covered the frames it was asked for. */
  COMPLETE: 'complete',
  /** It ran out of sample budget first. Real samples, too many of them. */
  SAMPLE_CAPPED: 'sampleCapped',
  /** The clock stopped advancing and the tick ceiling ended it. */
  STALLED: 'stalled',
  /** Somebody pressed stop. */
  CANCELLED: 'cancelled',
  /** Still going. */
  RUNNING: 'running',
});

/**
 * How many ticks a phase is allowed before a stall is declared.
 *
 * Ten per requested frame is generous enough that an ordinary slow machine
 * never reaches it, and the flat hundred and twenty keeps a very short phase
 * from giving up on a single slow start.
 *
 * @param {number} frames - Frames asked for
 * @returns {number} The ceiling
 */
export const tickCeilingFor = frames => frames * 10 + 120;

/**
 * The sampling policy for one phase.
 *
 * @param {object} cfg - `frames`, `maxSamples`, and optionally `tickCeiling`
 * @returns {object} The sampler
 */
export function createPhaseSampler({ frames, maxSamples, tickCeiling }) {
  const wanted = Math.max(1, Math.round(frames));
  const cap = Math.max(2, Math.round(maxSamples));
  const ceiling = Number.isFinite(tickCeiling)
    ? tickCeiling
    : tickCeilingFor(wanted);

  let startClock = null;
  let lastClock = null;
  let advanced = 0;
  let ticks = 0;
  let stalled = 0;
  let samples = 0;
  let outcome = PHASE_OUTCOME.RUNNING;

  return {
    /**
     * Record the initial state, at the clock the phase starts from.
     *
     * Always taken, and taken before anything advances. Without it the first
     * sample is one frame in, so a phase reporting a span of N frames holds a
     * series spanning N-1 of them - and the two phases of a reliability check
     * are then compared over slightly different stretches of their own runs.
     *
     * @param {number} clock - The simulation clock now
     * @returns {boolean} Whether to take a sample; always true
     */
    start(clock) {
      startClock = clock;
      lastClock = clock;
      samples = 1;
      return true;
    },

    /**
     * One animation frame has happened. What should the runner do?
     *
     * @param {number} clock - The simulation clock now
     * @param {boolean} [cancelled] - Whether a stop was asked for
     * @returns {{sample: boolean, done: boolean, outcome: string}} What to do
     */
    tick(clock, cancelled = false) {
      if (cancelled) {
        outcome = PHASE_OUTCOME.CANCELLED;
        return { sample: false, done: true, outcome };
      }
      ticks++;

      // Nothing moved. It counts towards the stall diagnostics and towards the
      // ceiling that stops an unadvancing run spinning for ever, and towards
      // nothing else: no sample, and no step towards the sample cap.
      if (!(clock > lastClock)) {
        stalled++;
        if (ticks >= ceiling) {
          outcome = PHASE_OUTCOME.STALLED;
          return { sample: false, done: true, outcome };
        }
        return { sample: false, done: false, outcome };
      }

      lastClock = clock;
      advanced++;
      samples++;

      // The cap is about how much evidence one phase may hold, so it is
      // counted in samples that exist and reached only by advancing.
      if (samples >= cap) {
        outcome = PHASE_OUTCOME.SAMPLE_CAPPED;
        return { sample: true, done: true, outcome };
      }
      if (advanced >= wanted) {
        outcome = PHASE_OUTCOME.COMPLETE;
        return { sample: true, done: true, outcome };
      }
      if (ticks >= ceiling) {
        // Advancing, but so slowly that the ceiling arrived first. Not a
        // stall in the "nothing is moving" sense, and not complete either.
        outcome = PHASE_OUTCOME.STALLED;
        return { sample: true, done: true, outcome };
      }
      return { sample: true, done: false, outcome };
    },

    /** @returns {object} What happened, for the phase record */
    report() {
      return {
        outcome,
        advancedFrames: advanced,
        requestedFrames: wanted,
        ticks,
        stalledFrames: stalled,
        samples,
        startClock,
        lastClock,
        sampleCapHit: outcome === PHASE_OUTCOME.SAMPLE_CAPPED,
        stalledOut: outcome === PHASE_OUTCOME.STALLED,
        cancelled: outcome === PHASE_OUTCOME.CANCELLED,
        complete: outcome === PHASE_OUTCOME.COMPLETE,
        /** Fraction of the way through, for a progress readout. */
        fraction: advanced / wanted,
      };
    },
  };
}
