// =============================================================================
// The quality tier
// -----------------------------------------------------------------------------
// Gravitas runs on whatever the school has, and what the school has is often a
// 2019 Chromebook with an integrated GPU and two cores. The existing adaptive
// detail helps a little - it scales a trail budget between 0.6 and 1.0 - but it
// cannot do the three things that actually matter on that machine: draw fewer
// pixels, draw fewer bodies, and stop drawing the expensive effects at all.
//
// So there is an explicit tier, and it is chosen by measurement.
//
// Why not a user-agent string
// -----------------------------------------------------------------------------
// Because it does not answer the question. The same Chromebook model runs at
// 55fps on an empty Solar System and 12fps on Galactic Collision; a MacBook Pro
// with forty other tabs open and a thermal problem is slower than either. What
// matters is the frame rate this machine is achieving on this scenario right
// now, and that is measurable. Nothing in this file reads navigator.userAgent,
// navigator.deviceMemory or hardwareConcurrency: those describe the label on
// the box, not the frame rate.
//
// What is measured
// -----------------------------------------------------------------------------
// The interval between animation frames, which is what the reader actually
// experiences. Not the time spent inside the frame callback: on a machine that
// is compositing slowly, or throttled, or sharing a core with a video call, the
// work can finish in 8ms and still be presented at 20fps. The interval catches
// that and the work time does not.
//
// Samples are filtered before they count:
//
//   the first 1.5 seconds are discarded start-up is not representative: the
//                                       world is being built and the starfield
//                                       generated. Timed rather than counted in
//                                       frames, because 45 frames is 0.75s at
//                                       60fps and 4.5s at 10fps - which would
//                                       make the slowest machines, the ones
//                                       this exists for, wait longest for help
//   intervals over 500ms are discarded  a backgrounded tab, a garbage
//                                       collection, a breakpoint. rAF stops
//                                       entirely in a hidden tab, and counting
//                                       the resumption as a slow frame would
//                                       demote a machine for being minimised
//   the median is used, not the mean    one 300ms hitch should not outvote a
//                                       hundred good frames, and on a loaded
//                                       machine the distribution is skewed
//
// Hysteresis, because flapping is worse than either tier
// -----------------------------------------------------------------------------
// Dropping to the low tier raises the frame rate, which - with a single
// threshold - would immediately qualify the machine to go back up, which would
// lower it again. So the thresholds are far apart (below 32fps to drop, above
// 48fps to return) and a promotion additionally requires the machine to have
// held that rate for a while. The asymmetry is deliberate: being slow to
// promote costs some fidelity, being quick to demote costs a stutter.
// =============================================================================

/**
 * Time ignored at start-up, while the first world and starfield are built.
 *
 * Measured in milliseconds rather than in frames, and that is the whole point.
 * A frame count is a different amount of time on every machine: 45 frames is
 * three quarters of a second at 60fps and four and a half seconds at 10fps, so
 * a frame-counted warm-up makes the slowest machines - the ones this tier
 * exists for - wait longest before anything is done for them.
 */
const WARMUP_MS = 1500;

/** An interval longer than this is an interruption, not a slow frame. */
const OUTLIER_MS = 500;

/** The most intervals the median is taken over. */
const WINDOW = 120;

/**
 * The least evidence a decision may be made on.
 *
 * Both, not either: 24 samples is meaningless if they arrived in a tenth of a
 * second, and two seconds is meaningless if it contains four frames. Together
 * they mean a decision is never taken on a hiccup, and - because the span is in
 * time - a machine running at 10fps is judged after about two seconds rather
 * than after the twelve a 120-frame window would have cost it.
 */
const MIN_SAMPLES = 24;
const MIN_SPAN_MS = 2000;

/** Below this measured rate the machine gets the low tier. */
const DEMOTE_FPS = 32;

/** Above this it may have the full tier back. */
const PROMOTE_FPS = 48;

/** How long a promotion has to be earned before it is granted, in milliseconds. */
const PROMOTE_DWELL_MS = 8000;

/** The tiers, in order. */
export const TIERS = ['low', 'full'];

const intervals = [];
let seen = 0;
let last = 0;
let first = 0;
let tier = 'full';
let auto = true;
let aboveSince = 0;
let listeners = [];

/** @returns {string} The tier currently in force */
export const currentTier = () => tier;

/** @returns {boolean} Whether the tier is being chosen by measurement */
export const isAuto = () => auto;

/**
 * The median of the current window, in frames per second.
 *
 * @returns {?number} Measured frame rate, or null before there is enough data
 */
export function measuredFps() {
  if (intervals.length < MIN_SAMPLES) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median > 0 ? 1000 / median : null;
}

/** @returns {object} Everything the diagnostics readout and the tests want */
export function qualityReport() {
  return {
    tier,
    auto,
    fps: measuredFps(),
    samples: intervals.length,
    framesSeen: seen,
  };
}

/**
 * Subscribe to tier changes.
 *
 * @param {Function} fn - Called with the new tier
 * @returns {Function} Unsubscribe
 */
export function onTierChange(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(f => f !== fn);
  };
}

function announce() {
  for (const fn of listeners) {
    try {
      fn(tier);
    } catch {
      /* a listener's problem is not the sampler's */
    }
  }
}

/**
 * Force a tier, or hand the decision back to the measurement.
 *
 * @param {string} next - 'auto', 'full' or 'low'
 */
export function setTier(next) {
  if (next === 'auto') {
    auto = true;
    // The window is kept: the machine has not changed, so what was measured
    // about it is still the best evidence there is.
    return;
  }
  if (!TIERS.includes(next)) return;
  auto = false;
  if (tier !== next) {
    tier = next;
    announce();
  }
}

/** The wall-clock time the current window spans, in milliseconds. */
const windowSpan = () => intervals.reduce((sum, dt) => sum + dt, 0);

/** Forget everything measured. Used when the world changes out from under it. */
export function resetSamples() {
  intervals.length = 0;
  seen = 0;
  last = 0;
  first = 0;
  aboveSince = 0;
}

/**
 * Record one animation frame.
 *
 * Called from the render loop with the rAF timestamp. Deliberately cheap: two
 * comparisons and an array write on most frames, a sort on none of them - the
 * median is only computed when somebody asks for it.
 *
 * @param {number} timestamp - The rAF timestamp for this frame
 */
export function sampleFrame(timestamp) {
  seen++;
  const previous = last;
  last = timestamp;
  if (!first) first = timestamp;
  if (timestamp - first < WARMUP_MS || !previous) return;

  const dt = timestamp - previous;
  // An interruption rather than a slow frame. Also resets the promotion clock:
  // whatever the machine was doing, it was not rendering.
  if (!(dt > 0) || dt > OUTLIER_MS) {
    aboveSince = 0;
    return;
  }

  intervals.push(dt);
  if (intervals.length > WINDOW) intervals.shift();
  if (!auto) return;
  // Enough evidence is either two seconds of frames or a full window of them.
  //
  // Requiring both was wrong and silently disabled the whole classifier on fast
  // machines: 120 samples at 150fps span 0.8 seconds, so the two-second gate
  // could never be met, no decision was ever taken, and the tier stayed
  // wherever it happened to be. The span gate exists to stop a decision being
  // made on a handful of frames; a full window is not a handful.
  const enough =
    intervals.length >= WINDOW ||
    (intervals.length >= MIN_SAMPLES && windowSpan() >= MIN_SPAN_MS);
  if (!enough) return;

  const fps = measuredFps();
  if (fps === null) return;

  if (tier === 'full' && fps < DEMOTE_FPS) {
    tier = 'low';
    aboveSince = 0;
    announce();
    return;
  }

  if (tier === 'low') {
    if (fps > PROMOTE_FPS) {
      // Accumulated in milliseconds, so the dwell is the same eight seconds
      // whether the machine recovered to 50fps or to 144.
      aboveSince += dt;
      if (aboveSince >= PROMOTE_DWELL_MS) {
        tier = 'full';
        aboveSince = 0;
        announce();
      }
    } else {
      aboveSince = 0;
    }
  }
}

// --- What the tier actually does ----------------------------------------------

/**
 * The fraction of native resolution to render at.
 *
 * The simulation canvas has never applied devicePixelRatio - its backing store
 * is innerWidth by innerHeight - so on the machines this tier is for it is
 * already at 1:1 and there is nothing to give back except native resolution
 * itself. 0.7 is 49% of the pixels, which is the single largest saving
 * available on a fill-rate-bound integrated GPU, and at the distance a
 * projected or laptop screen is viewed the softness is visible but not
 * confusing: the bodies are discs and the trails are wide.
 *
 * @returns {number} A scale factor for the canvas backing store
 */
export const renderScale = () => (tier === 'low' ? 0.7 : 1);

/**
 * Caps applied to the generic population settings when a world is built.
 *
 * Only the counts a scenario asks for generically. Scenarios that place every
 * body by hand - the resonance systems, TRAPPIST-1, the galaxy discs - are left
 * alone, because their body count is the physics rather than a decoration, and
 * a Laplace resonance with two of its three moons removed is not a cheaper
 * version of the lesson but a wrong one.
 *
 * @returns {?object} Caps by settings key, or null at the full tier
 */
export function populationCaps() {
  if (tier !== 'low') return null;
  return {
    num_asteroids: 40,
    num_comets: 8,
    num_planets: 12,
    num_gas_giants: 4,
    num_micro_stars: 60,
    num_stars: 40,
  };
}

/**
 * Render features switched off at the low tier.
 *
 * Each of these is a full-screen or per-body pass that an integrated GPU pays
 * for in fill rate: the lensing shader samples the frame buffer, the wave
 * overlay strokes dozens of expanding rings, and the bloom layer is a second
 * full-size canvas composited every frame.
 *
 * @returns {?object} Settings overrides, or null at the full tier
 */
export function renderOverrides() {
  if (tier !== 'low') return null;
  return {
    show_object_lensing: false,
    lensing_quality: 'off',
    show_gravitational_waves: false,
    show_accretion_disk: false,
    // Presentation, not population. Both of these were once returned from
    // populationCaps(), which applied its result by writing into the live
    // SETTINGS - so a slow machine permanently rewrote the reader's own
    // settings, and those rewritten values then travelled out in share links,
    // saved states and the A/B bench's canonical hash. Neither key is read
    // during construction at all, so a read-time override here is both the
    // correct place and the only one that has any effect.
    star_density: 2500,
    trail_length: 8,
  };
}
