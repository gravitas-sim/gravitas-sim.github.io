// =============================================================================
// Writing a stellar model's answer onto a star in the scene
// -----------------------------------------------------------------------------
// A star in the sandbox already carries the fields a stellar model computes -
// temperature, luminosity, radius, age, phase - and the renderer, the habitable
// zone and the light curve all read them through js/stellar/state.js. What has
// never existed is the other direction: a way for a prescribed model to say
// "this is what that star is now" and have every surface follow.
//
// That is all this module is. It is pure - a plain object in, the same object
// mutated, nothing imported, no DOM, no clock - so the same functions run in
// the widget, in the authoring checker and in a unit test with an object
// literal for a star.
//
// The rule about what a model does not know
// -----------------------------------------------------------------------------
// A star's mass, age and remaining lifetime are things an evolutionary track
// supplies and a free H-R cursor does not. Put a cursor at 8000 K and 40 solar
// luminosities and you have specified a radius, because the Stefan-Boltzmann
// relation determines it - and you have specified nothing about what mass the
// star has, how old it is, or how long it has left. Several perfectly ordinary
// stars sit at that point at different ages, and so do things that are not
// ordinary at all.
//
// So `applySelection` writes only what the selection actually carries, and
// `clearUnsupplied` exists to take back the fields a previous, better-informed
// selection had written. A star showing an age from a track it is no longer on
// is a fabricated number, and it would be read by the inspector as though
// somebody had computed it.
// =============================================================================

/**
 * The fields a stellar model owns on a body.
 *
 * Named once, here, because three places have to agree on the list: the writer
 * below, the check that decides whether a write is needed, and whatever puts
 * the body back the way it was found.
 */
export const MODELED_FIELDS = Object.freeze([
  'temperature',
  'luminosityInSuns',
  'radiusInSuns',
  'ageYr',
  'stellarPhase',
  // The two masses. A track loses mass as it evolves and every track starts
  // from a different one, so a star switched from a 1 M☉ track to a 5 M☉ one
  // used to keep the first track's mass while showing the second's
  // temperature - a body that no model anywhere describes.
  'massInSuns',
  'initialMassInSuns',
  // Where the numbers came from: 'model' for a point on a track, 'free' for a
  // place somebody clicked on the diagram. Carried on the body so the
  // inspector, the notebook and the readout can all say the same thing about
  // it without asking the panel that happened to set it.
  'modelSource',
]);

/** What a body currently shows, as a plain object. @returns {object} */
export function readStarState(star) {
  const out = {};
  for (const key of MODELED_FIELDS) out[key] = star?.[key] ?? null;
  return out;
}

/** Put a body back to a state read earlier. @returns {void} */
export function writeStarState(star, saved) {
  if (!star || !saved) return;
  for (const key of MODELED_FIELDS) star[key] = saved[key] ?? null;
}

/**
 * What a selection from the stellar lab says about a star, in body fields.
 *
 * Only the fields the selection supplies. A free-cursor selection carries a
 * temperature, a luminosity and the radius those two determine, and carries no
 * age and no phase - so no age and no phase come out of here.
 *
 * @param {object} selection - From js/stellarLab.js selection()
 * @returns {object} Body fields to write, and only those the model knows
 */
/**
 * The source values that mean "a stellar model computed this".
 *
 * Three exist in the stellar code and they are not interchangeable words for
 * the same thing to a reader, but they are to this function: `model` is what
 * the lab hands out, `track` is what js/stellar/tracks.js stamps on a point it
 * interpolated, and `hypothetical` is a place somebody clicked on the diagram.
 *
 * Only the last one is free. Checking for `model` alone - which this did -
 * meant a raw track state was treated as a free point and quietly stripped of
 * its mass, its age and its phase, while every number that survived still
 * looked right.
 *
 * @param {string} source - From a selection
 * @returns {boolean} Whether a model stands behind it
 */
const isModeled = source => source === 'model' || source === 'track';

export function fieldsFromSelection(selection = {}) {
  const out = {};
  const put = (key, value) => {
    if (Number.isFinite(value)) out[key] = value;
  };
  put('temperature', selection.teffK);
  put('luminosityInSuns', selection.luminositySun);
  put('radiusInSuns', selection.radiusSun);
  // A mass, an age and a phase are a track's to give. `hypotheticalAt`
  // produces none of them and must not appear to: a point on the diagram is
  // two numbers and the radius they imply, and everything else about it is
  // unknown rather than inherited from whatever the star used to be.
  if (isModeled(selection.source)) {
    put('ageYr', selection.ageYr);
    // A track calls the present-day mass `currentMassSun` and the one it
    // started from `initialMassSun`; the population model calls the first
    // `massSun`. Both are read, because a star switched between the two
    // sources must not silently lose its mass at the boundary.
    put(
      'massInSuns',
      Number.isFinite(selection.currentMassSun)
        ? selection.currentMassSun
        : selection.massSun
    );
    put('initialMassInSuns', selection.initialMassSun);
    if (selection.phase) out.stellarPhase = selection.phase;
  }
  out.modelSource = isModeled(selection.source) ? 'model' : 'free';
  return out;
}

/**
 * Write a selection onto a star, and take back anything it cannot support.
 *
 * Returns whether anything changed, so a caller in a draw loop can skip the
 * work - and, more usefully, so a test can assert that a redraw with the same
 * selection writes nothing at all.
 *
 * @param {object} star - A body, or anything with the same fields
 * @param {object} selection - From js/stellarLab.js selection()
 * @returns {boolean} True if any field moved
 */
export function applySelection(star, selection) {
  if (!star || !selection) return false;
  const wanted = fieldsFromSelection(selection);
  let changed = false;
  for (const key of MODELED_FIELDS) {
    const next = Object.prototype.hasOwnProperty.call(wanted, key)
      ? wanted[key]
      : null;
    if (star[key] !== next) {
      star[key] = next;
      changed = true;
    }
  }
  return changed;
}

/**
 * Where on the H-R diagram a star already sits, if it says.
 *
 * Used the other way round from the above: a reader selects a star on the
 * canvas and the diagram has to move to it. Null when the star carries no
 * modeled temperature, because the alternative is estimating one from the
 * mass and then showing the estimate as though the star had been measured.
 *
 * @param {object} star - A body
 * @returns {?{teffK: number, luminositySun: number, ageYr: ?number,
 *   initialMassSun: ?number}} Where it is
 */
export function pointForStar(star) {
  if (!star) return null;
  const teffK = star.temperature;
  const luminositySun = star.luminosityInSuns;
  if (!Number.isFinite(teffK) || !Number.isFinite(luminositySun)) return null;
  return {
    teffK,
    luminositySun,
    ageYr: Number.isFinite(star.ageYr) ? star.ageYr : null,
    initialMassSun: Number.isFinite(star.initialMassInSuns)
      ? star.initialMassInSuns
      : null,
  };
}

/**
 * The track whose birth mass is closest to a star's, in log mass.
 *
 * In log because the tracks are spaced that way - 0.2, 0.5, 1, 2, 5, 10, 20,
 * 40 solar masses - and a linear nearest would put a 3-solar-mass star on the
 * 5 track. The masses are handed in rather than imported so this file stays a
 * leaf that a test can drive with three numbers.
 *
 * @param {number} massSun - The star's birth mass
 * @param {Array<{id: string, initialMassSun: number}>} tracks - The catalog
 * @returns {?string} A track id, or null
 */
export function nearestTrackByMass(massSun, tracks = []) {
  if (!Number.isFinite(massSun) || massSun <= 0 || !tracks.length) return null;
  const target = Math.log10(massSun);
  let best = null;
  let bestGap = Infinity;
  for (const track of tracks) {
    if (!Number.isFinite(track?.initialMassSun) || track.initialMassSun <= 0) {
      continue;
    }
    const gap = Math.abs(Math.log10(track.initialMassSun) - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = track.id;
    }
  }
  return best;
}
