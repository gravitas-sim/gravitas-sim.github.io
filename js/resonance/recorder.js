// =============================================================================
// The resonance recorder
// -----------------------------------------------------------------------------
// A resonant angle is not something you can read off a single frame. Whether it
// librates or circulates is a statement about a stretch of history, and the
// whole lesson depends on having one. So the four resonance instruments do not
// each keep their own: they share this, which samples the live world once per
// frame and hands back a series.
//
// Three problems it exists to solve, none of them obvious until the thing is
// running:
//
//   The frame rate is not the sampling rate anyone wants. At sixty frames a
//   second a three-minute observation is eleven thousand samples, and every
//   instrument reduces the whole series on every frame. So the buffer decimates
//   itself: when it fills it throws away every second sample and doubles its
//   minimum interval, which keeps the coverage uniform, the cost flat, and the
//   history complete back to the start.
//
//   Four instruments, one frame. They must not each add a sample. Recording is
//   keyed on the simulated clock, so the second and later calls in a frame are
//   no-ops and every instrument sees exactly the same series.
//
//   A world can be replaced underneath it. Reloading the scenario, scrubbing
//   the timeline backwards or switching to a different one has to clear the
//   history rather than splice two incompatible runs together, and the tell is
//   either a clock that has gone backwards or a set of body names that has
//   changed.
// =============================================================================

import { resonanceElements } from './elements.js';

/** Above this the buffer halves itself rather than growing. */
const MAX_SAMPLES = 2000;

/**
 * A history of orbital elements, sampled from a live world.
 *
 * @param {{maxSamples?: number}} [opts] - Buffer size before decimation
 * @returns {Object} record / series / reset / stats
 */
export function createRecorder(opts = {}) {
  const maxSamples = opts.maxSamples || MAX_SAMPLES;

  /** @type {Array<{t: number, el: Object}>} */
  let samples = [];
  let lastClock = null;
  let interval = 0;
  let signature = '';
  let discarded = 0;

  const reset = () => {
    samples = [];
    lastClock = null;
    interval = 0;
    discarded = 0;
  };

  return {
    /**
     * Take one sample, if this frame has not already been taken.
     *
     * @param {Object} input
     * @param {number} input.clock - Simulated time
     * @param {Object} input.primary - The body the elements are measured about
     * @param {Array<Object>} input.bodies - The orbiting bodies
     * @param {number} input.G - Gravitational constant
     * @returns {boolean} True if a sample was added
     */
    record({ clock, primary, bodies, G }) {
      if (!primary || !Array.isArray(bodies) || !bodies.length) return false;
      if (!Number.isFinite(clock)) return false;

      // A new world, or the same one restarted. Either way the old history
      // describes something else.
      const sig = `${primary.name}|${bodies.map(b => b.name).join(',')}`;
      if (sig !== signature) {
        signature = sig;
        reset();
      } else if (lastClock !== null && clock < lastClock - 1e-9) {
        reset();
      }

      // One sample per frame, whichever instrument asks first.
      if (lastClock !== null && clock <= lastClock) return false;
      // ...and no more often than the current decimation allows, so that the
      // series a caller reads is evenly spaced whatever the frame rate did.
      if (samples.length && clock - samples[samples.length - 1].t < interval) {
        lastClock = clock;
        return false;
      }

      const el = {};
      for (const body of bodies) {
        const e = resonanceElements(body, primary, G);
        if (e) el[body.name] = e;
      }
      samples.push({ t: clock, el });
      lastClock = clock;

      if (samples.length > maxSamples) {
        // Keep every other sample, and from now on take them half as often.
        // The window is unchanged; only its resolution halves, and it halves
        // once per doubling of the run rather than continuously.
        samples = samples.filter((_, i) => i % 2 === 0);
        discarded++;
        const span = samples[samples.length - 1].t - samples[0].t;
        interval = span / Math.max(1, samples.length - 1);
      }
      return true;
    },

    /** @returns {Array<{t:number, el:Object}>} The history, oldest first */
    series: () => samples,

    /** @returns {number} Simulated time covered, or 0 */
    window: () =>
      samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0,

    /**
     * What the buffer has done to itself, for an instrument that wants to say
     * how coarse its own data is.
     * @returns {{samples:number, interval:number, halvings:number}} Stats
     */
    stats: () => ({
      samples: samples.length,
      interval,
      halvings: discarded,
    }),

    reset,
  };
}

/**
 * The one recorder the instruments share.
 *
 * A module singleton rather than something the lesson owns, because the four
 * instruments are shown one at a time in the same panel and a student who
 * switches between them should not lose the run they have been watching.
 */
export const recorder = createRecorder();

/**
 * Pull the bodies of interest out of a live lesson context.
 *
 * The primary is the heaviest body present, which is right for all three
 * scenarios: Jupiter among its moons, the Sun among the planets. Everything
 * else, in the order the engine holds them, is what gets measured.
 *
 * @param {Object} ctx - The live lesson context from js/investigations.js
 * @returns {{primary: Object, bodies: Array<Object>, G: number}|null}
 */
export function partition(ctx) {
  const all = (ctx?.bodies || []).filter(b => b && b.alive !== false && b.name);
  if (all.length < 2) return null;
  let primary = all[0];
  for (const b of all) if ((b.mass || 0) > (primary.mass || 0)) primary = b;
  const bodies = all.filter(b => b !== primary);
  return bodies.length ? { primary, bodies, G: ctx.G } : null;
}
