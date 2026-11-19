// =============================================================================
// The lesson engine's door to the stage
// -----------------------------------------------------------------------------
// js/lessonStage.js is 75 KB and brings the stellar model with it: the MIST
// tracks, the population sampler, the H-R geometry. A lesson that never stands
// a star, a pair or a hole on the canvas (Kepler's Laws among them) has no use
// for any of it, so the engine does not import it. It imports this, which holds
// the same names as small wrappers, and the stage arrives when a step that
// declares one is about to be shown (`loadStage`, awaited by the engine before
// it applies that step, and given the step's declaration).
//
// Until then the wrappers answer as an empty stage does: no staged stars, an
// empty key, nothing pinned, nothing to clear. Nothing that acts on a stage
// (restaging, placing, pinning) can be reached before the step that declares it
// has loaded the module, so those do nothing here rather than throw.
//
// A failed fetch is not remembered; the next call asks again. A browser keeps a
// failed module URL for the life of the page, so the second ask goes to a new
// URL, as js/widgets.js does for an instrument family (LAZY_CAPABILITIES.md).
// A bundled build has no second URL to ask for, and the caller's retry then
// fails the same way and offers a reload.
// =============================================================================

import { BINARY_SCALE, SCALE, stageOf } from './stage.js';

export { BINARY_SCALE, SCALE, stageOf };

let stage = null;
let pending = null;
let asked = 0;

/** Whether the stage code, and the kinds a declaration names, have arrived. */
export const stageLoaded = declared =>
  stage !== null && !stage.stageKindsPending(declared);

/**
 * Fetch the stage code, once, and the kinds a declaration names. Concurrent
 * callers share one import.
 *
 * @param {object} [declared] - The step's `stage` declaration
 * @returns {Promise<void>} Rejects with the import's own error
 */
export function loadStage(declared) {
  if (!stage) {
    pending ??= (
      asked++
        ? import(
            new URL(`../lessonStage.js?retry=${asked}`, import.meta.url).href
          )
        : import('../lessonStage.js')
    ).then(
      m => void (stage = m),
      err => {
        pending = null;
        throw err;
      }
    );
  }
  return (stage ? Promise.resolve() : pending).then(() =>
    stage.loadStageKinds(declared)
  );
}

const call =
  name =>
  (...args) =>
    stage?.[name](...args);

export const applyStage = (...args) =>
  stage?.applyStage(...args) ?? { built: false, roles: [], problems: {} };
export const stagedStars = () => stage?.stagedStars() ?? [];
export const stageKey = () => stage?.stageKey() ?? '';
export const stageMemo = () => stage?.stageMemo() ?? null;
export const adoptStage = (...args) => stage?.adoptStage(...args) ?? [];
export const stageScale = () => stage?.stageScale() ?? SCALE.DISPLAY;
export const stagedPopulation = () => stage?.stagedPopulation() ?? null;
export const pinnedSnapshots = () => stage?.pinnedSnapshots() ?? [];
export const stagePresence = () =>
  stage?.stagePresence() ?? { present: 0, total: 0, allGone: false };
export const fitStage = () => stage?.fitStage() ?? false;
export const centerOnSelected = () => stage?.centerOnSelected() ?? false;
export const clearStage = call('clearStage');
export const clearSnapshots = call('clearSnapshots');
export const pinSnapshot = call('pinSnapshot');
export const setStageScale = call('setStageScale');
export const becomeRemnant = call('becomeRemnant');
export const remnantKindOf = call('remnantKindOf');
export const placeBinary = call('placeBinary');
export const pulseSource = call('pulseSource');
export const setSourceMode = call('setSourceMode');
export const restageBinary = call('restageBinary');
export const restageHole = call('restageHole');
export const restagePopulation = call('restagePopulation');
export const restageStar = call('restageStar');
export const restageStarPair = call('restageStarPair');
export const stagedBarycenter = call('stagedBarycenter');

/**
 * What an instrument's context says about the stage, whether or not its code
 * has arrived (a step that stages has always waited for it).
 *
 * @returns {object} Entries to spread into the instrument context
 */
export const stageContext = () => ({
  /**
   * The stars this step stood on the canvas, as values.
   */
  stagedSample: () =>
    stagedStars().map(entry => ({
      role: entry.role,
      name: entry.star?.name ?? entry.role,
      bodyId: entry.star?.id ?? null,
      model: entry.model,
      anonymous: Boolean(entry.star?.anonymous),
    })),
  /** A cheap signature of the current stage, so a widget can memoise. */
  stageKey: () => stageKey(),
  /**
   * Change which gravitational-wave source is on the canvas.
   *
   * The beginner lesson's central claim is that motion is not what makes a
   * source radiate, and it needs a reader to be able to stand a static
   * mass, a spherically pulsing one and a binary on the canvas in turn.
   * This is what its source control calls.
   */
  setSourceMode,
  /** Breathe the single source, from the model clock. */
  pulseSource,
  /** Rebuild the staged pair when its components change. */
  restageBinary,
  /**
   * The units the staged binary is placed in.
   *
   * Handed over rather than imported, so an instrument can size an overlay
   * against the pair without js/gwWidgets.js taking a dependency on the
   * stage - and so there is one definition of the scale rather than a copy
   * of the constant in the widget.
   */
  binaryScale: () => BINARY_SCALE,
  /** Re-apply the population stage under a new brightness cut. */
  restagePopulation,
  /** What the population stage last put up: counts, cut, and provenance. */
  population: () => stagedPopulation(),
  /** Write a model's answer onto a staged star, sizing it as it goes. */
  restageStar,
  /**
   * Replace a staged star with the remnant its track's prescription names.
   *
   * The reader's selection follows it, because a white dwarf is a different
   * body class from a star and the card they have open must not close on
   * them. A prescription of 'unfinished' leaves the star where it is:
   * inventing a remnant for a model that stopped first is the one thing
   * js/stellar/endpoints.js exists to refuse.
   */
  becomeRemnant,
  /** Which remnant a staged role has become, if any. */
  remnantKindOf,
  /**
   * Put the staged binary where a waveform model says it is.
   *
   * The separation and phase come from the timeline the plot is drawn from,
   * so the picture on the canvas and the curve in the panel are one thing
   * described twice rather than two things that happen to look alike.
   */
  placeBinary,
  /**
   * Where the staged pair's balance point is, and how far each star is from
   * it - measured off the live bodies, not restated from the declaration.
   *
   * The ratio of the two arms is the inverse of the mass ratio, which is the
   * one relationship "Weighing the Stars" is built on, so it is read rather
   * than told.
   */
  barycenter: stagedBarycenter,
  /**
   * Rebuild the staged pair with different masses, same separation.
   *
   * A mass-ratio control has to restand the pair rather than edit a mass in
   * place: a star whose mass changed mid-orbit is on a path that no longer
   * closes, and the lesson would be showing a decaying spiral while calling
   * it a circle.
   */
  restageStarPair,
  /**
   * Rebuild the staged black hole with a different mass.
   *
   * A restage rather than an edit for the same reason the star pair is: the
   * orbiters' speeds were chosen for the old mass, and changing the central
   * mass under them would leave every one of them on a path that no longer
   * closes.
   */
  restageHole,
  /** Pin a labeled copy of a staged star as it is right now. */
  pinSnapshot,
  /** Every pinned snapshot, oldest first. */
  snapshots: pinnedSnapshots,
});
