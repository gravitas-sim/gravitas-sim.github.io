// The zone of a star at an age along a MIST track (js/stellar/tracks.js).
// Not in index.js: it reaches the track data, which a caller that only needs
// the limits or the orbit should not load.
import { stateAtAge, trackBounds } from '../../stellar/tracks.js';
import { HabitableZoneError, finite, params } from './errors.js';
import { zoneLimits } from './limits.js';

export const AGE_NOTE =
  'a model star on a MIST v1.2 track, not a named star: the age counts from the start of the track (an early pre-main-sequence model), and the 1 solar-mass track is about 11 percent brighter than the Sun at the Sun’s age';

/**
 * The star on a track at an age, and the zone around it.
 *
 * @param {{trackId:string, ageYr:number}} p
 * @returns {{note:string, star:object, zone:object}}
 */
export function zoneAtAge(p) {
  params(p);
  const bounds = typeof p.trackId === 'string' ? trackBounds(p.trackId) : null;
  if (!bounds) {
    throw new HabitableZoneError(
      'track',
      `unknown track: ${String(p.trackId)}`
    );
  }
  const ageYr = finite(p.ageYr, 'the age');
  if (!(ageYr >= bounds.startYr && ageYr <= bounds.endYr)) {
    throw new HabitableZoneError(
      'age-domain',
      `the track covers ${bounds.startYr} to ${bounds.endYr} years`,
      { ageYr, startYr: bounds.startYr, endYr: bounds.endYr }
    );
  }
  const s = stateAtAge(p.trackId, ageYr);
  if (!s) {
    throw new HabitableZoneError(
      'age-domain',
      'the track has no state at that age',
      {
        ageYr,
      }
    );
  }
  const zone = zoneLimits({ luminositySolar: s.luminositySun, teffK: s.teffK });
  return {
    note: AGE_NOTE,
    star: {
      trackId: p.trackId,
      initialMassSolar: bounds.initialMassSun,
      ageYr,
      luminositySolar: s.luminositySun,
      teffK: s.teffK,
      radiusSolar: s.radiusSun,
    },
    zone,
  };
}

/** The zone at each of several ages on one track. */
export function zonesAtAges({ trackId, agesYr }) {
  if (!Array.isArray(agesYr) || agesYr.length === 0) {
    throw new HabitableZoneError('input', 'agesYr must be a non-empty array');
  }
  return agesYr.map(ageYr => zoneAtAge({ trackId, ageYr }));
}
