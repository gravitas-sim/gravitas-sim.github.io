// =============================================================================
// Playing a stellar life
// -----------------------------------------------------------------------------
// One age, and everything else derived from it. The temperature, the radius,
// the luminosity, the colour, the current mass and the phase are all read from
// the same position on the same track, so they cannot disagree about what the
// star is doing - which is the failure this module exists to make impossible.
//
// This clock is not the simulation's
// -----------------------------------------------------------------------------
// Nothing here touches the N-body integrator. A stellar lifetime is billions
// of years and the sandbox's clock counts days; integrating orbits for a
// stellar lifetime is not slow, it is meaningless. The playback advances an
// age along a published track and the sandbox does not know it happened.
//
// Two clocks a viewer can choose between
// -----------------------------------------------------------------------------
// PACE.TIME runs the age logarithmically, so equal seconds on screen are equal
// *ratios* of age, and how far the handle has moved is how far through the
// life it is. It is the one to answer "how long did that last" with, and it is
// useless for looking at anything after the main sequence.
//
// PACE.PHASE runs along the track's own stored samples, which the reduction
// placed where the star changes fastest. Every phase becomes reachable and the
// handle stops being a clock. Anything showing it has to say so, and
// `durationSummary` exists so that a viewer can see what the pacing is hiding:
// the real length of each phase beside the share of the playback it gets.
//
// Seeking is a pure function of the age
// -----------------------------------------------------------------------------
// There is no accumulated state to get out of step - no particles, no spawned
// events, no remnant that outlives a scrub backwards. The trace is recomputed
// from the track between two positions rather than appended to as time passes,
// so seeking backwards shortens it and seeking forwards lengthens it, and
// running the same playback twice draws the same picture.
// =============================================================================

import { trackBounds, trackSamples, sampleAtAge } from './tracks.js';
import { endpointFor } from './endpoints.js';
import { clamp } from '../utils.js';

/** How the playhead is paced. See the note above. */
export const PACE = Object.freeze({ TIME: 'time', PHASE: 'phase' });

/**
 * The conceptual stages, which are not the same list as the track's phases.
 *
 * CLOUD is before the track begins and has no place on the diagram: MIST's
 * pre-main-sequence tracks start at a star that already has a photosphere, and
 * a collapsing cloud does not have one. It is drawn as an illustration with no
 * temperature and no luminosity attached, because inventing either would be
 * the falsest precision in this whole feature.
 */
export const STAGE = Object.freeze({
  CLOUD: 'cloud',
  TRACK: 'track',
  REMNANT: 'remnant',
});

/** How long the cloud illustration lasts, as a share of the playback. */
const CLOUD_SHARE = 0.06;

/** And the remnant card at the end. */
const REMNANT_SHARE = 0.08;

/**
 * A playback of one track.
 *
 * @param {object} [opts] - Options
 * @param {string} [opts.trackId] - Which star
 * @param {string} [opts.pace] - PACE.TIME or PACE.PHASE
 * @param {number} [opts.position] - 0 to 1 across the whole playback
 * @param {boolean} [opts.playing] - Whether it is running
 * @param {number} [opts.rate] - Playback positions per second
 * @returns {object} Playback state
 */
export function createPlayback({
  trackId = 'm100',
  pace = PACE.PHASE,
  position = 0,
  playing = false,
  rate = 0.06,
} = {}) {
  return {
    trackId,
    pace,
    /** 0 to 1 across cloud, track and remnant together. */
    position: clamp(position, 0, 1),
    playing,
    rate,
    /** Bumped whenever the state a drawing depends on changes. */
    generation: 0,
  };
}

/** The three stages' shares of the playhead, for the current track. */
function shares(trackId) {
  const end = endpointFor(trackId);
  // A star still on its main sequence has no remnant to show, so the whole of
  // the rest of the playhead belongs to the track.
  const remnant = end && end.kind !== 'unfinished' ? REMNANT_SHARE : 0;
  return { cloud: CLOUD_SHARE, track: 1 - CLOUD_SHARE - remnant, remnant };
}

/**
 * Which stage a position falls in, and how far through that stage it is.
 *
 * @param {object} state - Playback state
 * @param {number} [at] - A position, defaulting to the current one
 * @returns {{stage: string, within: number, trackFraction: number}} Where
 */
export function stageAt(state, at = state.position) {
  const s = shares(state.trackId);
  const p = clamp(at, 0, 1);
  if (p < s.cloud) {
    return { stage: STAGE.CLOUD, within: p / s.cloud, trackFraction: 0 };
  }
  const afterCloud = p - s.cloud;
  // A track with no endpoint has no remnant stage to reach, however far the
  // playhead is dragged: the 0.2 solar-mass model stops on its main sequence
  // and there is nothing after it to show.
  if (s.remnant <= 0) {
    const f = s.track > 0 ? Math.min(1, afterCloud / s.track) : 1;
    return { stage: STAGE.TRACK, within: f, trackFraction: f };
  }
  // The boundary belongs to the remnant. Without the tolerance the position
  // that "next phase" seeks to - cloud plus track, in floating point - lands
  // an ulp short of it, and pressing the button to the end stopped one step
  // before the thing it was pressing towards.
  if (afterCloud < s.track - 1e-9) {
    const f = s.track > 0 ? afterCloud / s.track : 0;
    return { stage: STAGE.TRACK, within: f, trackFraction: f };
  }
  const f = s.remnant > 0 ? (afterCloud - s.track) / s.remnant : 1;
  return {
    stage: STAGE.REMNANT,
    within: clamp(f, 0, 1),
    trackFraction: 1,
  };
}

/** The playhead position at which the track itself begins. @returns {number} */
export const trackStartsAt = trackId => shares(trackId).cloud;

/** And where it ends. @returns {number} */
export const trackEndsAt = trackId =>
  shares(trackId).cloud + shares(trackId).track;

/**
 * Move the playhead to a position.
 *
 * @param {object} state - Playback state
 * @param {number} position - 0 to 1
 */
export function seek(state, position) {
  const next = clamp(position, 0, 1);
  if (next === state.position) return;
  state.position = next;
  state.generation++;
}

/**
 * Advance the playhead by a wall-clock interval.
 *
 * Stops at the end rather than wrapping: a life that looped back to a
 * collapsing cloud would be a claim nothing here supports.
 *
 * @param {object} state - Playback state
 * @param {number} dtSeconds - Elapsed wall-clock seconds
 * @returns {boolean} Whether it is still running
 */
export function advance(state, dtSeconds) {
  if (!state.playing) return false;
  const next = state.position + state.rate * Math.max(0, dtSeconds);
  if (next >= 1) {
    seek(state, 1);
    state.playing = false;
    return false;
  }
  seek(state, next);
  return true;
}

/** Back to the beginning, stopped. @param {object} state - Playback state */
export function restart(state) {
  state.playing = false;
  seek(state, 0);
}

/**
 * The phases of a track, with how long each really lasts and how much of the
 * playback it gets.
 *
 * The second number is the point. Under phase pacing a main sequence lasting
 * ten billion years and a helium flash lasting a couple of million can occupy
 * comparable stretches of the playhead, and a viewer who is not told that will
 * read the animation as a statement about duration. It is not.
 *
 * @param {object} state - Playback state
 * @returns {Array<object>} One row per phase
 */
export function durationSummary(state) {
  const bounds = trackBounds(state.trackId);
  if (!bounds) return [];
  const total = bounds.endYr - bounds.startYr;
  const t = trackSamples(state.trackId);
  const rows = [];
  for (const seg of bounds.segments) {
    // The share of the playhead is the share of whatever the pacing runs on:
    // log age for TIME, stored samples for PHASE.
    let share;
    if (state.pace === PACE.PHASE) {
      let n = 0;
      for (let i = 0; i < t.count; i++) if (t.phase[i] === seg.key) n++;
      share = t.count > 1 ? n / t.count : 0;
    } else {
      const lo = Math.log10(Math.max(bounds.startYr, 1));
      const hi = Math.log10(bounds.endYr);
      const a = Math.log10(Math.max(seg.startYr, 1));
      const b = Math.log10(Math.max(seg.startYr + seg.durationYr, 1));
      share = hi > lo ? (b - a) / (hi - lo) : 0;
    }
    rows.push({
      key: seg.key,
      startYr: seg.startYr,
      durationYr: seg.durationYr,
      fractionOfLife: total > 0 ? seg.durationYr / total : 0,
      shareOfPlayback: share,
      // The ratio a caption should quote when it warns that the animation is
      // not to scale in time. 1 means this phase gets its fair share.
      exaggeration:
        total > 0 && seg.durationYr > 0
          ? share / (seg.durationYr / total)
          : null,
    });
  }
  return rows;
}

/**
 * Where the phase boundaries fall on the playhead.
 *
 * @param {object} state - Playback state
 * @returns {Array<{key: string, at: number}>} Boundaries, in order
 */
export function phaseMarks(state) {
  const bounds = trackBounds(state.trackId);
  if (!bounds) return [];
  const s = shares(state.trackId);
  return bounds.segments.map(seg => ({
    key: seg.key,
    at: s.cloud + s.track * fractionForAgeUnder(state, seg.startYr),
  }));
}

/** Where an age sits along the track, under the current pacing. */
function fractionForAgeUnder(state, ageYr) {
  const bounds = trackBounds(state.trackId);
  if (!bounds) return 0;
  if (state.pace === PACE.PHASE) return sampleAtAge(state.trackId, ageYr);
  const lo = Math.log10(Math.max(bounds.startYr, 1));
  const hi = Math.log10(bounds.endYr);
  return hi > lo
    ? clamp((Math.log10(Math.max(ageYr, 1)) - lo) / (hi - lo), 0, 1)
    : 0;
}

/**
 * Jump to the start of the next or previous phase.
 *
 * From the cloud, forward lands on the start of the track. From the last
 * phase, forward lands on the remnant card if there is one and the end of the
 * track if there is not.
 *
 * @param {object} state - Playback state
 * @param {number} direction - +1 or -1
 * @returns {?string} The phase landed on, or null at either end
 */
export function stepPhase(state, direction) {
  const marks = phaseMarks(state);
  if (!marks.length) return null;
  const s = shares(state.trackId);
  const stops = [
    { key: STAGE.CLOUD, at: 0 },
    ...marks,
    ...(s.remnant > 0 ? [{ key: STAGE.REMNANT, at: s.cloud + s.track }] : []),
  ];
  const here = state.position;
  const EPS = 1e-6;
  if (direction > 0) {
    const next = stops.find(m => m.at > here + EPS);
    if (!next) return null;
    seek(state, next.at);
    return next.key;
  }
  const before = stops.filter(m => m.at < here - EPS);
  const prev = before[before.length - 1];
  if (!prev) return null;
  seek(state, prev.at);
  return prev.key;
}

/**
 * The path the star has taken so far, for drawing on the diagram.
 *
 * Recomputed from the track between the start and the playhead rather than
 * accumulated as the playback runs. That is what makes seeking backwards
 * shorten it instead of leaving a tail behind, and what makes two runs of the
 * same playback draw the same line.
 *
 * @param {object} state - Playback state
 * @param {number} [maxPoints] - A cap, so a long track is not drawn row by row
 * @returns {Array<{teffK: number, luminositySun: number}>} The path
 */
export function traceTo(state, maxPoints = 160) {
  const where = stageAt(state);
  if (where.stage === STAGE.CLOUD) return [];
  const t = trackSamples(state.trackId);
  if (!t) return [];
  const upTo = positionOnTrack(state, where.trackFraction);
  const last = Math.min(t.count - 1, Math.floor(upTo * (t.count - 1)));
  const step = Math.max(1, Math.ceil((last + 1) / maxPoints));
  const out = [];
  for (let i = 0; i <= last; i += step) {
    out.push({ teffK: t.teffK[i], luminositySun: t.luminositySun[i] });
  }
  // Always include where the star actually is, or the head of the trace lags
  // the marker by up to `step` samples.
  if (last >= 0 && out[out.length - 1]?.teffK !== t.teffK[last]) {
    out.push({ teffK: t.teffK[last], luminositySun: t.luminositySun[last] });
  }
  return out;
}

/** A fraction along the track, as a fraction of the stored samples. */
function positionOnTrack(state, trackFraction) {
  if (state.pace === PACE.PHASE) return trackFraction;
  // Under time pacing the fraction is logarithmic in age, so it has to be
  // turned into an age and then into a sample position.
  const bounds = trackBounds(state.trackId);
  if (!bounds) return trackFraction;
  const lo = Math.log10(Math.max(bounds.startYr, 1));
  const hi = Math.log10(bounds.endYr);
  return sampleAtAge(state.trackId, 10 ** (lo + trackFraction * (hi - lo)));
}

/**
 * The age the playhead is at, or null where there is not one.
 *
 * The cloud has no age on the track's clock, and saying it does - by
 * extrapolating backwards from the first sample - would be inventing a
 * collapse time the model does not contain.
 *
 * @param {object} state - Playback state
 * @returns {?number} An age in years
 */
export function ageAt(state) {
  const where = stageAt(state);
  if (where.stage === STAGE.CLOUD) return null;
  const t = trackSamples(state.trackId);
  if (!t) return null;
  const upTo = positionOnTrack(state, where.trackFraction);
  const exact = clamp(upTo, 0, 1) * (t.count - 1);
  const i = Math.min(t.count - 2, Math.floor(exact));
  const f = t.count > 1 ? exact - i : 0;
  return t.ageYr[i] + (t.ageYr[i + 1] - t.ageYr[i]) * f;
}

/**
 * Everything a view needs, from one position.
 *
 * @param {object} state - Playback state
 * @returns {object} The stage, the star if there is one, and the endpoint
 */
export function frameOf(state) {
  const where = stageAt(state);
  const endpoint = endpointFor(state.trackId);
  return Object.freeze({
    stage: where.stage,
    within: where.within,
    trackFraction: where.trackFraction,
    ageYr: ageAt(state),
    endpoint,
    // True only where the model supports a photosphere. The cloud has none and
    // a neutron star or a black hole has none either, so neither is given a
    // position on the diagram.
    onDiagram:
      where.stage === STAGE.TRACK ||
      (where.stage === STAGE.REMNANT && Boolean(endpoint?.plottable)),
  });
}
