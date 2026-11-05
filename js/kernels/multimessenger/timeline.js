// =============================================================================
// The multi-messenger timeline: events of two messengers across bands
// -----------------------------------------------------------------------------
// One event, two messengers, many bands. The two messengers are gravitational
// waves and photons; gamma rays, X-rays, ultraviolet, optical, infrared and radio
// light are bands of the photon messenger. An event states WHICH messenger and,
// for a photon, WHICH band, and its time states its SYSTEM (GPS, Fermi MET, UTC,
// MJD) and its DEFINITION (a catalogue's merger time, an instrument's trigger,
// the first detection, a peak). The timeline puts every time on one continuous
// scale (timescales.js) and reports offsets from a named reference event.
//
// An offset is the difference of two stated instants, not a travel time and not
// an emission delay: instrument triggers, onsets and catalogue merger times are
// different instants of different processes, and the difference between the
// definitions is part of every delay (SPEED.md in MULTIMESSENGER.md).
// =============================================================================

import {
  MESSENGERS,
  PHOTON_BANDS,
  TIME_DEFINITIONS,
  finite,
  refuse,
} from './constants.js';
import { SYSTEMS, formatUtc, fromT72, toT72 } from './timescales.js';

const hint = `the two messengers are ${MESSENGERS.join(' and ')}; gamma-ray, x-ray, ultraviolet, optical, infrared and radio are bands of photons`;

/**
 * Validate and freeze one event.
 * @param {object} e
 * @param {string} e.id - unique within a timeline
 * @param {string} e.label - what a person reads
 * @param {'gravitational-wave'|'photon'} e.messenger
 * @param {string|null} e.band - one of PHOTON_BANDS for a photon, null for gravitational waves
 * @param {{value: number|string, system: string, definition: string, sigmaS?: number}} e.time
 * @param {string} [e.source] - where the time came from
 * @param {string} [e.note]
 */
export function makeEvent(e) {
  if (!e || typeof e.id !== 'string' || !e.id)
    refuse('bad-event', 'an event needs an id');
  if (!MESSENGERS.includes(e.messenger))
    refuse(
      'bad-messenger',
      `'${String(e.messenger)}' is not a messenger: ${hint}`,
      {
        hint,
      }
    );
  if (e.messenger === 'photon') {
    if (!PHOTON_BANDS.includes(e.band))
      refuse(
        'bad-band',
        `a photon event states its band, one of ${PHOTON_BANDS.join(', ')}`
      );
  } else if (e.band != null) {
    refuse('bad-band', 'gravitational waves have no photon band');
  }
  const t = e.time;
  if (!t || !SYSTEMS.includes(t.system))
    refuse(
      'unknown-system',
      `an event's time states its system, one of ${SYSTEMS.join(', ')}`
    );
  if (!TIME_DEFINITIONS.includes(t.definition))
    refuse(
      'definition-required',
      `an event's time states what it is the time of, one of ${TIME_DEFINITIONS.join(', ')}`
    );
  if (t.sigmaS != null && !(finite(t.sigmaS, 'sigmaS') >= 0))
    refuse('bad-sigma', 'a time uncertainty is not negative');
  return Object.freeze({
    id: e.id,
    label: e.label ?? e.id,
    messenger: e.messenger,
    band: e.band ?? null,
    time: Object.freeze({ ...t, sigmaS: t.sigmaS ?? null }),
    source: e.source ?? null,
    note: e.note ?? null,
  });
}

/**
 * The timeline: every event on the continuous scale, sorted, with its offset from the reference.
 * @param {object[]} events - from makeEvent
 * @param {{reference: string, leapTable: object}} opts
 * @returns {{reference: string, entries: object[]}} each entry keeps id, label, messenger, band, system, definition,
 *   t72 (SI s since 1972-01-01 UTC), utc (ISO string), offsetS from the reference, sigmaOffsetS (quadrature sum of the
 *   two uncertainties, null if either is absent)
 */
export function buildTimeline(events, { reference, leapTable }) {
  if (!Array.isArray(events) || !events.length)
    refuse('bad-event', 'a timeline needs events');
  const ids = new Set(events.map(e => e.id));
  if (ids.size !== events.length)
    refuse('bad-event', 'event ids must be unique');
  const ref = events.find(e => e.id === reference);
  if (!ref) refuse('bad-event', `no reference event '${String(reference)}'`);
  const t72 = e => toT72(e.time, leapTable);
  const t0 = t72(ref);
  const entries = events
    .map(e => {
      const t = t72(e);
      const sigma =
        e.time.sigmaS != null && ref.time.sigmaS != null
          ? Math.hypot(e.time.sigmaS, ref.time.sigmaS)
          : null;
      return {
        id: e.id,
        label: e.label,
        messenger: e.messenger,
        band: e.band,
        system: e.time.system,
        definition: e.time.definition,
        source: e.source,
        note: e.note,
        t72: t,
        utc: formatUtc(fromT72(t, 'UTC', leapTable)),
        offsetS: t - t0,
        sigmaOffsetS: e.id === ref.id ? 0 : sigma,
      };
    })
    .sort((a, b) => a.t72 - b.t72 || (a.id < b.id ? -1 : 1));
  return { reference, entries };
}
