// =============================================================================
// Querying the bundled MIST evolutionary tracks
// -----------------------------------------------------------------------------
// Seven tracks, and the four questions anything wants to ask them: what is this
// star like at this age, what is it like at this named point, what range does
// the track cover, and what does a main-sequence star of this mass look like.
//
// What this will not do
// -----------------------------------------------------------------------------
// It will not answer outside a track. Ask for a 0.2 solar-mass star at fifteen
// trillion years and the answer is null with a reason, not an extrapolation:
// MESA stopped that track at terminal-age main sequence because it had run for
// 1.14 trillion years, and what happens afterwards is a question the bundled
// model does not address. The same goes for the far side of core collapse,
// which the 10 and 20 solar-mass tracks stop short of.
//
// It will not interpolate between tracks except at matched evolutionary points
// within the main sequence, where the comparison is meaningful because every
// track has the same two endpoints. Interpolating a 1 solar-mass star's
// hundredth row against a 20 solar-mass star's hundredth row would be
// arithmetic on two unrelated moments.
//
// Ages
// -----------------------------------------------------------------------------
// Zero is the first model on the MIST track, which is an early pre-main-
// sequence object already contracting on its Hayashi track - not the start of
// cloud collapse, which these models do not describe. Interpolation runs in
// log age, because a track's samples are decades apart at one end and
// millennia apart at the other and no linear axis can serve both. The bundled
// data was thinned with the same parameterisation and to a stated tolerance.
// =============================================================================

import {
  PROVENANCE,
  TRACKS,
  TRACK_IDS,
  decodeTrack,
} from '../data/stellar/mistTracks.js';
import {
  radiusFromLuminosityAndTemperature,
  luminosityClass,
} from './geometry.js';

export { PROVENANCE as TRACK_PROVENANCE, TRACK_IDS };

/**
 * The named stretches of a track, between the primary equivalent evolutionary
 * points, for each of the two kinds of track MIST distinguishes.
 *
 * A low-mass star and a high-mass one share their first five boundaries and
 * then diverge, and the divergence is not cosmetic: the same EEP index means
 * "start of thermal pulses on the asymptotic giant branch" for a 2 solar-mass
 * star and "carbon ignition" for a 20 solar-mass one. Naming both the same
 * thing would be wrong about half the catalogue, so they are two lists.
 */
const SEGMENTS = {
  'low-mass': [
    ['pre-main-sequence', 'pms', 'zams'],
    ['main-sequence', 'zams', 'tams'],
    ['red-giant-branch', 'tams', 'rgb-tip'],
    ['helium-ignition', 'rgb-tip', 'zacheb'],
    ['core-helium-burning', 'zacheb', 'tacheb'],
    ['early-asymptotic-giant-branch', 'tacheb', 'tpagb'],
    ['thermally-pulsing-agb', 'tpagb', 'post-agb'],
    ['post-agb-and-cooling', 'post-agb', 'wd-cooling'],
  ],
  'high-mass': [
    ['pre-main-sequence', 'pms', 'zams'],
    ['main-sequence', 'zams', 'tams'],
    // Not "red giant branch": a star of ten or twenty solar masses crossing
    // the diagram after the main sequence becomes a supergiant, and the EEP
    // that MIST calls the RGB tip is simply where its expansion turns over.
    ['post-main-sequence-expansion', 'tams', 'rgb-tip'],
    ['helium-ignition', 'rgb-tip', 'zacheb'],
    ['core-helium-burning', 'zacheb', 'tacheb'],
    ['advanced-burning', 'tacheb', 'carbon-burning'],
  ],
};

/** Cached per-track structure, built once. */
const structures = new Map();

/**
 * A track with its phase segments worked out.
 * @param {string} id - Track id
 * @returns {object} The decoded track plus its segments
 */
function structureOf(id) {
  if (structures.has(id)) return structures.get(id);
  const track = decodeTrack(id);
  const byName = new Map(track.eeps.map(e => [e.name, e]));
  const segments = [];
  for (const [key, fromName, toName] of SEGMENTS[track.type] || []) {
    const from = byName.get(fromName);
    const to = byName.get(toName);
    // A track that stops early simply has fewer segments. The 0.2 and 0.5
    // solar-mass tracks end at terminal-age main sequence and have two.
    if (!from || !to) continue;
    segments.push({
      key,
      fromEep: fromName,
      toEep: toName,
      fromIndex: from.at,
      toIndex: to.at,
      startYr: from.ageYr,
      endYr: to.ageYr,
      durationYr: to.ageYr - from.ageYr,
    });
  }
  const built = { ...track, segments, byName };
  structures.set(id, built);
  return built;
}

/** Every track, lightest first, as summaries. */
export const trackIds = () =>
  [...TRACK_IDS].sort(
    (a, b) => TRACKS[a].initialMassSun - TRACKS[b].initialMassSun
  );

/**
 * What a track covers, and what it does not.
 *
 * `complete` is the field that matters: false means MESA stopped before the
 * star was finished, and everything after the last age here is outside what
 * this application can say anything about.
 *
 * @param {string} id - Track id
 * @returns {?object} A summary, or null for an unknown id
 */
export function trackBounds(id) {
  if (!TRACKS[id]) return null;
  const t = structureOf(id);
  const last = t.count - 1;
  const endsAt = t.eeps[t.eeps.length - 1].name;
  return {
    id,
    initialMassSun: t.initialMassSun,
    type: t.type,
    samples: t.count,
    sourceRows: t.sourceRows,
    startYr: 10 ** t.logAgeYr[0],
    endYr: 10 ** t.logAgeYr[last],
    finalMassSun: t.massSun[last],
    endsAtEep: endsAt,
    /** True only where the track runs to a white dwarf. */
    complete: endsAt === 'wd-cooling',
    /** Why it stops, in one phrase a caption can print. */
    endsBecause:
      endsAt === 'wd-cooling'
        ? 'the star has become a cooling white dwarf'
        : endsAt === 'carbon-burning'
          ? 'the model stops at carbon ignition, before core collapse'
          : 'the model stops at the end of core hydrogen burning',
    segments: t.segments.map(s => ({ ...s })),
    thinning: t.thinning,
    /**
     * Samples that share a stored age with the one before them, and so cannot
     * be addressed by an age query. All of them are in the brief late phases;
     * stateAtEep() and trackSamples() reach them.
     */
    unreachableByAge: TRACKS[id].tiedToPrevious,
  };
}

/**
 * Find the sample bracketing an age, by binary search on log age.
 *
 * Where several samples share a stored age - which happens through the helium
 * flash and the thermal pulses, where MIST's own ages come as close as two
 * parts in ten billion - the *last* of them is returned. A star that has
 * reached that age has been through the earlier ones, so the most evolved
 * point is the right answer, and having a rule at all is what makes the answer
 * reproducible. Those samples are still reachable by evolutionary point and by
 * index; `trackBounds().unreachableByAge` says how many there are.
 *
 * @param {Float64Array} logAge - Non-decreasing
 * @param {number} target - log10 of the age wanted
 * @returns {[number, number, number]} Lower index, upper index, fraction
 */
function bracket(logAge, target) {
  const last = logAge.length - 1;
  if (target <= logAge[0]) return [0, 0, 0];
  if (target >= logAge[last]) return [last, last, 0];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (logAge[mid] <= target) lo = mid;
    else hi = mid;
  }
  // Walk to the end of a tied run, so the answer is the most evolved sample
  // sharing this age rather than whichever the search happened to stop on.
  while (lo < last && logAge[lo + 1] === logAge[lo]) lo++;
  if (lo >= last) return [last, last, 0];
  hi = lo + 1;
  const span = logAge[hi] - logAge[lo];
  return [lo, hi, span > 0 ? (target - logAge[lo]) / span : 0];
}

const lerp = (a, b, f) => a + (b - a) * f;

/**
 * Which named stretch an index falls in.
 * @param {object} t - A structure
 * @param {number} index - Sample index
 * @returns {?object} The segment
 */
function segmentAt(t, index) {
  for (const s of t.segments) {
    if (index >= s.fromIndex && index <= s.toIndex) return s;
  }
  return t.segments[t.segments.length - 1] || null;
}

/**
 * The state of a modelled star at an age.
 *
 * @param {string} id - Track id
 * @param {number} ageYr - Age in years since the start of the track
 * @returns {?object} A stellar state, or null when the age is outside the track
 */
export function stateAtAge(id, ageYr) {
  if (!TRACKS[id] || !(ageYr >= 0)) return null;
  const t = structureOf(id);
  const logAge = Math.log10(Math.max(ageYr, 1));
  const first = t.logAgeYr[0];
  const last = t.logAgeYr[t.count - 1];
  if (logAge < first - 1e-9 || logAge > last + 1e-9) return null;

  const [i0, i1, f] = bracket(t.logAgeYr, logAge);
  const logL = lerp(t.logL[i0], t.logL[i1], f);
  const logTeff = lerp(t.logTeff[i0], t.logTeff[i1], f);
  const massSun = lerp(t.massSun[i0], t.massSun[i1], f);
  const seg = segmentAt(t, f < 0.5 ? i0 : i1);
  return stateFrom(t, { ageYr, logL, logTeff, massSun, seg });
}

/**
 * The state at a named equivalent evolutionary point.
 * @param {string} id - Track id
 * @param {string} eepName - One of the names in the track's `eeps`
 * @returns {?object} A stellar state, or null if the track lacks that point
 */
export function stateAtEep(id, eepName) {
  if (!TRACKS[id]) return null;
  const t = structureOf(id);
  const eep = t.byName.get(eepName);
  if (!eep) return null;
  const i = eep.at;
  return stateFrom(t, {
    ageYr: eep.ageYr,
    logL: t.logL[i],
    logTeff: t.logTeff[i],
    massSun: t.massSun[i],
    seg: segmentAt(t, i),
  });
}

/** Assemble the shared representation from a point on a track. */
function stateFrom(t, { ageYr, logL, logTeff, massSun, seg }) {
  const luminositySun = 10 ** logL;
  const teffK = 10 ** logTeff;
  const radiusSun = radiusFromLuminosityAndTemperature(luminositySun, teffK);
  const ms = t.segments.find(s => s.key === 'main-sequence');
  return Object.freeze({
    source: 'track',
    trackId: t.id,
    initialMassSun: t.initialMassSun,
    currentMassSun: massSun,
    ageYr,
    teffK,
    luminositySun,
    radiusSun,
    phase: seg ? seg.key : 'unknown',
    phaseStartYr: seg ? seg.startYr : null,
    phaseEndYr: seg ? seg.endYr : null,
    phaseDurationYr: seg ? seg.durationYr : null,
    luminosityClass: luminosityClass(radiusSun, luminositySun),
    /** Total core-hydrogen-burning lifetime, as this model integrated it. */
    mainSequenceYr: ms ? ms.durationYr : null,
    /** How much of it is left. Negative ages before the main sequence give null. */
    remainingMainSequenceYr: ms
      ? Math.max(0, ms.endYr - Math.max(ageYr, ms.startYr))
      : null,
    /** Zero to one across the main sequence; null outside it. */
    mainSequenceFraction:
      ms && ageYr >= ms.startYr && ageYr <= ms.endYr && ms.durationYr > 0
        ? (ageYr - ms.startYr) / ms.durationYr
        : null,
    composition: PROVENANCE.composition,
    rotation: PROVENANCE.rotation,
    grid: PROVENANCE.grid,
    ageZeroPoint: PROVENANCE.units.age,
    estimated: false,
  });
}

/**
 * A main-sequence star of an arbitrary mass, part-way through its main sequence.
 *
 * Interpolated in log mass between the two bracketing tracks *at the same
 * fraction of the main sequence*, which is the one comparison across tracks
 * that means something: both endpoints are defined for every track, and a star
 * half-way through core hydrogen burning is the same kind of object whatever
 * its mass. Nothing else here interpolates between tracks.
 *
 * Returns null outside the grid rather than extrapolating. The grid runs from
 * 0.2 to 20 solar masses.
 *
 * @param {number} massSun - Initial mass, solar masses
 * @param {number} [fraction] - 0 at zero-age main sequence, 1 at terminal-age
 * @returns {?object} A stellar state, or null outside the grid
 */
export function mainSequenceAt(massSun, fraction = 0) {
  const ids = trackIds();
  const masses = ids.map(id => TRACKS[id].initialMassSun);
  if (!(massSun >= masses[0]) || !(massSun <= masses[masses.length - 1]))
    return null;
  const f = Math.min(1, Math.max(0, fraction));

  let hi = masses.findIndex(m => m >= massSun);
  if (hi < 0) return null;
  const lo = hi === 0 ? 0 : hi - 1;
  const w =
    masses[hi] === masses[lo]
      ? 0
      : (Math.log10(massSun) - Math.log10(masses[lo])) /
        (Math.log10(masses[hi]) - Math.log10(masses[lo]));

  const at = id => {
    const t = structureOf(id);
    const ms = t.segments.find(s => s.key === 'main-sequence');
    if (!ms) return null;
    return stateAtAge(id, ms.startYr + f * ms.durationYr);
  };
  const a = at(ids[lo]);
  const b = at(ids[hi]);
  if (!a || !b) return null;

  const mix = (x, y) => x + (y - x) * w;
  const logMix = (x, y) => 10 ** mix(Math.log10(x), Math.log10(y));
  const luminositySun = logMix(a.luminositySun, b.luminositySun);
  const teffK = logMix(a.teffK, b.teffK);
  return Object.freeze({
    source: 'main-sequence-interpolation',
    trackId: null,
    /** The two grid tracks this was interpolated between. */
    between: [a.trackId, b.trackId],
    initialMassSun: massSun,
    currentMassSun:
      mix(
        a.currentMassSun / a.initialMassSun,
        b.currentMassSun / b.initialMassSun
      ) * massSun,
    ageYr: logMix(Math.max(a.ageYr, 1), Math.max(b.ageYr, 1)),
    teffK,
    luminositySun,
    radiusSun: radiusFromLuminosityAndTemperature(luminositySun, teffK),
    phase: 'main-sequence',
    phaseStartYr: null,
    phaseEndYr: null,
    phaseDurationYr: logMix(a.mainSequenceYr, b.mainSequenceYr),
    luminosityClass: luminosityClass(
      radiusFromLuminosityAndTemperature(luminositySun, teffK),
      luminositySun
    ),
    mainSequenceYr: logMix(a.mainSequenceYr, b.mainSequenceYr),
    remainingMainSequenceYr:
      (1 - f) * logMix(a.mainSequenceYr, b.mainSequenceYr),
    mainSequenceFraction: f,
    composition: PROVENANCE.composition,
    rotation: PROVENANCE.rotation,
    grid: PROVENANCE.grid,
    ageZeroPoint: PROVENANCE.units.age,
    estimated: false,
  });
}

/**
 * The track nearest a mass, for a caller that wants a real one rather than a
 * blend. Returns null when the mass is outside the grid.
 *
 * @param {number} massSun - Initial mass, solar masses
 * @returns {?string} A track id
 */
export function nearestTrack(massSun) {
  const ids = trackIds();
  if (!Number.isFinite(massSun) || !ids.length) return null;
  let best = null;
  let bestGap = Infinity;
  for (const id of ids) {
    const gap = Math.abs(
      Math.log10(TRACKS[id].initialMassSun) - Math.log10(massSun)
    );
    if (gap < bestGap) {
      bestGap = gap;
      best = id;
    }
  }
  return best;
}

/**
 * Every sample of a track, for plotting.
 *
 * Returned as plain arrays rather than the internal typed ones, and freshly
 * built, so a caller that keeps them cannot edit the cache.
 *
 * @param {string} id - Track id
 * @returns {?object} Columns, or null for an unknown id
 */
export function trackSamples(id) {
  if (!TRACKS[id]) return null;
  const t = structureOf(id);
  const luminositySun = [];
  const teffK = [];
  const radiusSun = [];
  const ageYr = [];
  const massSun = [];
  const phase = [];
  for (let i = 0; i < t.count; i++) {
    const L = 10 ** t.logL[i];
    const T = 10 ** t.logTeff[i];
    luminositySun.push(L);
    teffK.push(T);
    radiusSun.push(radiusFromLuminosityAndTemperature(L, T));
    ageYr.push(10 ** t.logAgeYr[i]);
    massSun.push(t.massSun[i]);
    phase.push(segmentAt(t, i)?.key ?? 'unknown');
  }
  return {
    id,
    initialMassSun: t.initialMassSun,
    count: t.count,
    ageYr,
    massSun,
    luminositySun,
    teffK,
    radiusSun,
    phase,
    segments: t.segments.map(s => ({ ...s })),
  };
}
