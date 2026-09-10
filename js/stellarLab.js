// =============================================================================
// The Stellar Lab, without a canvas
// -----------------------------------------------------------------------------
// What the lab *is* - which star is selected, how it was chosen, what is pinned
// against it, which of the two size scales is in use, and which synthetic
// population is on screen - lives here, where it can be tested without a
// browser. js/stellarWidgets.js draws it.
//
// Two ways to choose a star, and they are not the same kind of thing
// -----------------------------------------------------------------------------
//   'free'   a cursor anywhere in the plotted range. Temperature and
//            luminosity are what the reader chose; the radius follows from
//            them exactly; the mass, the age and the lifetime are NOT
//            reported, because a point on this diagram does not fix any of
//            them. The lab offers nearby models instead, as a list, and
//            nothing snaps.
//   'model'  a point on one of the eight bundled tracks, at an age. Mass,
//            phase, age and lifetime are all real and all reported.
//
// The distinction is the point. A student who can put a cursor anywhere and
// still be told a mass has been taught that an H-R position determines one,
// which is exactly the misconception the diagram is most often used to create.
// =============================================================================

import {
  trackIds,
  trackBounds,
  trackSamples,
  stateAtAge,
  stateAtSample,
  sampleAtAge,
  mainSequenceAt,
  nearestTrack,
} from './stellar/tracks.js';
import { hypotheticalAt, inRange, AXES } from './stellar/hr.js';
import {
  luminosityClass,
  radiusFromLuminosityAndTemperature,
} from './stellar/geometry.js';
import { spectralType } from './stellar/state.js';
import { synthesisePopulation, brightSubset } from './stellar/population.js';

/** How the reader is choosing a star. */
export const MODE = Object.freeze({ FREE: 'free', MODEL: 'model' });

/** How the comparison stage draws its stars. */
export const SIZE_MODE = Object.freeze({
  /** One linear scale for every star. A red dwarf beside a supergiant is a dot. */
  TRUE: 'true',
  /** Each star enlarged to fill its own box. Not comparable, and says so. */
  FIT: 'fit',
});

/** At most this many stars pinned at once. Four fits, five does not. */
export const MAX_PINNED = 4;

/**
 * Solar System orbital radii, for the one comparison that makes a supergiant
 * mean something.
 *
 * Labelled as a size comparison and not as a prediction: a supergiant of 800
 * solar radii is bigger than the Earth's orbit, and that is a statement about
 * a length rather than about what would happen to the Earth.
 */
export const ORBIT_REFERENCES = Object.freeze([
  { key: 'mercury', radiusSun: 83.2 },
  { key: 'earth', radiusSun: 215.0 },
  { key: 'mars', radiusSun: 327.6 },
  { key: 'jupiter', radiusSun: 1120.3 },
]);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Build a lab state.
 * @param {object} [spec]
 * @returns {object} A mutable lab state
 */
export function createLab({
  mode = MODE.MODEL,
  trackId = 'm100',
  ageFraction = null,
  teffK = 5772,
  luminositySun = 1,
  sizeMode = SIZE_MODE.TRUE,
  guides = false,
  regions = true,
  pace = PACE.TIME,
  populationSeed = 'stellar-population-1',
  populationCount = 400,
} = {}) {
  const id = trackIds().includes(trackId) ? trackId : 'm100';
  const state = {
    mode,
    trackId: id,
    /**
     * Where along the whole track, 0 to 1 in log age.
     *
     * Logarithmic because a track runs from a few hundred years to as much as
     * a trillion, and a linear slider would spend its entire travel inside the
     * last percent of the star's life. The cost is that the midpoint of the
     * slider is a few million years in - deep in the pre-main-sequence - so
     * the default is set from the middle of the main sequence rather than from
     * the middle of the slider.
     */
    ageFraction:
      ageFraction === null
        ? midMainSequenceFraction(id, pace)
        : clamp(ageFraction, 0, 1),
    teffK,
    luminositySun,
    sizeMode,
    guides,
    regions,
    pace,
    pinned: [],
    populationSeed,
    populationCount,
    population: null,
    populationView: 'all',
    thresholdFlux: 1e-4,
    distancePc: 100,
    /** Bumped whenever the selection changes, so a drawing can memoise. */
    generation: 0,
  };
  return state;
}

/**
 * The slider position that lands half way through the main sequence.
 *
 * The useful default: a star in the middle of its longest phase, which is
 * where a reader opening the lab expects to find one.
 *
 * @param {string} trackId - Which track
 * @returns {number} A fraction, 0 to 1
 */
/**
 * The two ways the age slider can be paced.
 *
 * TIME is logarithmic in years, so how far the handle has travelled is how far
 * through the star's life it is. It is the honest one for "how long did that
 * last", and it is useless for looking at anything after the main sequence: on
 * a solar-mass track the whole red-giant branch is two thousandths of its
 * travel.
 *
 * PHASE is uniform along the track's stored samples, which the reduction put
 * where the star changes fastest. Every phase becomes reachable, and the cost
 * is that the handle no longer measures time. Any view using it has to say so,
 * and the readout does.
 */
export const PACE = Object.freeze({ TIME: 'time', PHASE: 'phase' });

export function midMainSequenceFraction(trackId, pace = PACE.TIME) {
  const b = trackBounds(trackId);
  const ms = b?.segments.find(x => x.key === 'main-sequence');
  if (!ms) return 0.5;
  const ageYr = ms.startYr + 0.5 * ms.durationYr;
  return pace === PACE.PHASE
    ? sampleAtAge(trackId, ageYr)
    : fractionForAge(trackId, ageYr);
}

/**
 * The age a fraction along a track corresponds to.
 *
 * Logarithmic, because a track's first sample is at a few hundred years and
 * its last at up to a trillion: a linear slider would spend its whole travel
 * in the final percent of the star's life.
 *
 * @param {string} trackId - Which track
 * @param {number} fraction - 0 to 1
 * @returns {number} An age in years
 */
export function ageForFraction(trackId, fraction) {
  const b = trackBounds(trackId);
  if (!b) return NaN;
  const lo = Math.log10(Math.max(b.startYr, 1));
  const hi = Math.log10(b.endYr);
  return 10 ** (lo + clamp(fraction, 0, 1) * (hi - lo));
}

/** And back again, so a caller that knows an age can move the slider. */
export function fractionForAge(trackId, ageYr) {
  const b = trackBounds(trackId);
  if (!b || !(ageYr > 0)) return 0;
  const lo = Math.log10(Math.max(b.startYr, 1));
  const hi = Math.log10(b.endYr);
  return clamp((Math.log10(ageYr) - lo) / (hi - lo), 0, 1);
}

/**
 * The star the lab is currently describing.
 *
 * One object in both modes, with `source` saying which. In free mode the mass,
 * the age and the lifetime are null and `nearby` holds the alternatives; in
 * model mode they are the track's own.
 *
 * @param {object} state - Lab state
 * @returns {object} A description
 */
export function selection(state) {
  if (state.mode === MODE.FREE) {
    const h = hypotheticalAt(state.teffK, state.luminositySun);
    return Object.freeze({
      ...h,
      spectralType: spectralType(h.teffK),
      luminosityClass: luminosityClass(h.radiusSun, h.luminositySun),
      label: 'free',
    });
  }
  const s =
    state.pace === PACE.PHASE
      ? stateAtSample(state.trackId, state.ageFraction)
      : stateAtAge(
          state.trackId,
          ageForFraction(state.trackId, state.ageFraction)
        );
  const ageYr = s ? s.ageYr : ageForFraction(state.trackId, state.ageFraction);
  if (!s) {
    return Object.freeze({
      source: 'model',
      teffK: NaN,
      luminositySun: NaN,
      radiusSun: NaN,
      massSun: NaN,
      ageYr,
      outsideTrack: true,
      label: 'model',
    });
  }
  return Object.freeze({
    source: 'model',
    trackId: state.trackId,
    teffK: s.teffK,
    luminositySun: s.luminositySun,
    radiusSun: s.radiusSun,
    massSun: s.currentMassSun,
    initialMassSun: s.initialMassSun,
    ageYr: s.ageYr,
    phase: s.phase,
    phaseDurationYr: s.phaseDurationYr,
    mainSequenceYr: s.mainSequenceYr,
    remainingMainSequenceYr: s.remainingMainSequenceYr,
    mainSequenceFraction: s.mainSequenceFraction,
    spectralType: spectralType(s.teffK),
    luminosityClass: s.luminosityClass,
    nearby: Object.freeze([]),
    ambiguous: false,
    inRange: inRange(s.teffK, s.luminositySun),
    label: 'model',
  });
}

/** Move the free cursor, clamped to the plotted range. */
export function setCursor(state, teffK, luminositySun) {
  state.teffK = clamp(teffK, AXES.teffMinK, AXES.teffMaxK);
  state.luminositySun = clamp(
    luminositySun,
    AXES.luminosityMin,
    AXES.luminosityMax
  );
  state.generation++;
}

/**
 * Adopt one of the nearby models as the selection.
 *
 * The deliberate half of "find nearby model examples": the cursor does not
 * move on its own, and a reader who wants one of the alternatives asks for it.
 *
 * @param {object} state - Lab state
 * @param {object} match - One entry from selection().nearby
 * @returns {boolean} Whether it was adopted
 */
export function adoptModel(state, match) {
  if (!match?.trackId) return false;
  state.mode = MODE.MODEL;
  state.trackId = match.trackId;
  state.ageFraction = fractionForAge(match.trackId, match.ageYr);
  state.generation++;
  return true;
}

/**
 * Switch how the age slider is paced, keeping the star where it is.
 *
 * The handle means a different thing in each pacing, so the fraction is
 * re-derived from the age rather than carried across: a student who was
 * looking at a red giant is still looking at that red giant afterwards.
 *
 * @param {object} state - Lab state
 * @param {string} pace - PACE.TIME or PACE.PHASE
 */
export function setPace(state, pace) {
  if (pace === state.pace) return;
  const now = selection(state);
  state.pace = pace;
  if (Number.isFinite(now.ageYr)) {
    state.ageFraction =
      pace === PACE.PHASE
        ? sampleAtAge(state.trackId, now.ageYr)
        : fractionForAge(state.trackId, now.ageYr);
  }
  state.generation++;
}

/** Switch between the two ways of choosing, carrying the position across. */
export function setMode(state, mode) {
  if (mode === state.mode) return;
  if (mode === MODE.FREE) {
    // Leaving model mode: the cursor starts where the model was, so the
    // switch does not teleport.
    const s = selection(state);
    if (Number.isFinite(s.teffK)) {
      state.teffK = s.teffK;
      state.luminositySun = s.luminositySun;
    }
  } else {
    // Entering model mode: land on the nearest track rather than nowhere.
    const near = nearestTrackForCursor(state);
    if (near) {
      state.trackId = near.trackId;
      state.ageFraction = fractionForAge(near.trackId, near.ageYr);
    }
  }
  state.mode = mode;
  state.generation++;
}

/** The single closest model to the free cursor, or null. */
export function nearestTrackForCursor(state) {
  const h = hypotheticalAt(state.teffK, state.luminositySun);
  if (h.nearby.length) return h.nearby[0];
  // Nothing within the search radius: fall back to the nearest track by mass
  // through the main sequence, which is at least a real model.
  const id = nearestTrack(1);
  const ms = mainSequenceAt(trackSamples(id)?.initialMassSun ?? 1, 0.5);
  return ms ? { trackId: id, ageYr: ms.ageYr } : null;
}

/**
 * Pin the current selection for comparison.
 * @param {object} state - Lab state
 * @returns {boolean} Whether it was added
 */
export function pin(state) {
  if (state.pinned.length >= MAX_PINNED) return false;
  const s = selection(state);
  if (!Number.isFinite(s.radiusSun)) return false;
  state.pinned.push({
    key: `${s.source}:${s.trackId ?? ''}:${s.teffK.toFixed(2)}:${s.luminositySun.toExponential(4)}`,
    source: s.source,
    trackId: s.trackId ?? null,
    teffK: s.teffK,
    luminositySun: s.luminositySun,
    radiusSun: s.radiusSun,
    massSun: Number.isFinite(s.massSun) ? s.massSun : null,
    ageYr: Number.isFinite(s.ageYr) ? s.ageYr : null,
    phase: s.phase ?? null,
    spectralType: s.spectralType,
    luminosityClass: s.luminosityClass,
  });
  state.generation++;
  return true;
}

/** Remove the most recently pinned star, or all of them. */
export function unpin(state, all = false) {
  if (all) state.pinned.length = 0;
  else state.pinned.pop();
  state.generation++;
}

/** The keys a comparison can be ordered by. */
export const ORDERINGS = Object.freeze([
  'radiusSun',
  'teffK',
  'luminositySun',
  'massSun',
]);

/**
 * The pinned stars in order, with ratios against the smallest.
 *
 * A star whose mass nobody knows - a free-cursor point - sorts last under a
 * mass ordering and reports a null ratio rather than a number, because there
 * is no number.
 *
 * @param {object} state - Lab state
 * @param {string} [by] - One of ORDERINGS
 * @returns {Array<object>} The pinned stars, ordered, with ratios
 */
export function comparison(state, by = 'radiusSun') {
  const key = ORDERINGS.includes(by) ? by : 'radiusSun';
  const rows = state.pinned.map(p => ({ ...p }));
  rows.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0;
    if (!Number.isFinite(av)) return 1;
    if (!Number.isFinite(bv)) return -1;
    return av - bv;
  });
  const base = rows.find(r => Number.isFinite(r[key]));
  for (const row of rows) {
    row.ratio =
      base && Number.isFinite(row[key]) && base[key] > 0
        ? row[key] / base[key]
        : null;
    row.orderedBy = key;
  }
  return rows;
}

/**
 * How many solar radii one pixel is worth, on the true-size scale.
 *
 * Set by the largest pinned star, so the whole comparison fits. A star three
 * hundred thousand times smaller than the largest is then a fraction of a
 * pixel, which is the honest picture and the reason the interface draws a
 * marker for it and says what the marker is.
 *
 * @param {Array<object>} rows - From comparison()
 * @param {number} widthPx - The room available for one star
 * @returns {number} Solar radii per pixel
 */
export function trueScaleFor(rows, widthPx) {
  const largest = rows.reduce(
    (m, r) => (Number.isFinite(r.radiusSun) ? Math.max(m, r.radiusSun) : m),
    0
  );
  return largest > 0 ? largest / (widthPx / 2) : 1;
}

/** The synthetic population, made once per seed and count. */
export function populationOf(state) {
  const key = `${state.populationSeed}:${state.populationCount}`;
  if (!state.population || state.population.key !== key) {
    state.population = {
      key,
      ...synthesisePopulation({
        seed: state.populationSeed,
        count: state.populationCount,
      }),
    };
  }
  return state.population;
}

/** The population's bright subset under the current threshold. */
export function brightOf(state) {
  return brightSubset(populationOf(state), {
    distancePc: state.distancePc,
    thresholdFlux: state.thresholdFlux,
  });
}

/**
 * A capture-ready snapshot of the selection and the comparison.
 * @param {object} state - Lab state
 * @returns {object} Plain data
 */
export function snapshotOf(state) {
  const s = selection(state);
  const b = state.mode === MODE.MODEL ? trackBounds(state.trackId) : null;
  return {
    mode: state.mode,
    source: s.source,
    trackId: s.trackId ?? null,
    grid: 'MIST v1.2, solar composition, no rotation',
    teffK: s.teffK,
    luminositySun: s.luminositySun,
    radiusSun: s.radiusSun,
    massSun: Number.isFinite(s.massSun) ? s.massSun : null,
    initialMassSun: Number.isFinite(s.initialMassSun) ? s.initialMassSun : null,
    ageYr: Number.isFinite(s.ageYr) ? s.ageYr : null,
    phase: s.phase ?? null,
    spectralType: s.spectralType,
    luminosityClass: s.luminosityClass,
    mainSequenceYr: Number.isFinite(s.mainSequenceYr) ? s.mainSequenceYr : null,
    ambiguous: Boolean(s.ambiguous),
    nearbyCount: s.nearby?.length ?? 0,
    trackComplete: b ? b.complete : null,
    trackEndsBecause: b ? b.endsBecause : null,
    sizeMode: state.sizeMode,
    pinned: state.pinned.map(p => ({ ...p })),
  };
}

/** Radius from two of the three, for a caller that has them. */
export { radiusFromLuminosityAndTemperature };
