// =============================================================================
// The instrument library: look a facility up, read its site
// -----------------------------------------------------------------------------
// js/data/instruments.js is generated from the cited source table
// (tools/instruments/*.json, INSTRUMENTS.md). This module is how code reads it:
// a facility by id, its site in the shape the observing-window planner takes,
// and one number out of a value that may be a range. It does not estimate: a
// quantity the table lacks is absent here too, and asking for one is an error
// that names the field, never a default.
//
// Pure: no DOM. The data import makes this a lazy module; nothing that does
// not call it pays for the table.
// =============================================================================

import { FACILITIES, SITES, SOURCES } from '../data/instruments.js';
import { UNITS, unitIdOf } from '../units/registry.js';

/** A request the table cannot answer: the facility, the field and why. */
export class InstrumentTableError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InstrumentTableError';
    Object.assign(this, details);
  }
}

export { FACILITIES, SITES, SOURCES };
export const facilityIds = () => FACILITIES.map(f => f.id);
/** The real facilities, apart from the typical entries. */
export const realFacilities = () => FACILITIES.filter(f => !f.typical);

/** A facility by id. */
export function getFacility(id) {
  const f = FACILITIES.find(x => x.id === id);
  if (!f)
    throw new InstrumentTableError(
      `no facility "${id}" in the instrument library (${facilityIds().join(', ')})`,
      { id }
    );
  return f;
}

/** A facility's instrument: the named one, or its only or first one. */
export function getInstrument(id, instrument) {
  const f = getFacility(id);
  const ins = instrument
    ? f.instruments.find(i => i.id === instrument)
    : f.instruments[0];
  if (!ins)
    throw new InstrumentTableError(
      `facility "${id}" has no instrument "${instrument}"`,
      { id, instrument }
    );
  return { facility: f, instrument: ins };
}

/** The site record a facility names, or undefined for a typical entry. */
export const siteRecord = id => {
  const f = getFacility(id);
  return f.site ? SITES[f.site] : undefined;
};

/**
 * One number out of a value: the number itself, or the low end, middle or high
 * end of a range. The choice is the caller's and is reported, not hidden.
 * @param {{v: number|number[]}} val
 * @param {'lo'|'mid'|'hi'} [range]
 */
export function pick(val, range = 'mid') {
  if (!Array.isArray(val.v)) return val.v;
  const [lo, hi] = val.v;
  return range === 'lo' ? lo : range === 'hi' ? hi : (lo + hi) / 2;
}

/** A value's number in the named angle or length unit (a registry id), by factor. */
export function inUnit(val, unit, range = 'mid') {
  const parts = val.u.split('/');
  const from = unitIdOf(val.u) ?? unitIdOf(parts[0]);
  const to = unitIdOf(unit);
  if (UNITS[from].dim !== UNITS[to].dim)
    throw new InstrumentTableError(`${val.u} is not a ${unit}`, {
      unit: val.u,
    });
  const n = pick(val, range);
  return from === to ? n : (n * UNITS[from].factor) / UNITS[to].factor;
}

/**
 * A facility's ground site in the shape the observing-window planner takes:
 * { name, latitudeDeg, longitudeDeg, elevationM }. A space facility has no
 * site on the ground, and the error says so.
 */
export function siteOf(id) {
  const f = getFacility(id);
  const s = siteRecord(id);
  if (!s || s.kind !== 'ground')
    throw new InstrumentTableError(
      `facility "${id}" has no ground site (${s ? s.kind : 'a typical entry'})`,
      { id }
    );
  const need = k => {
    if (!s[k])
      throw new InstrumentTableError(
        `the site of "${id}" has no ${k} in the table`,
        { id, field: k }
      );
    return s[k];
  };
  return {
    name: s.name,
    latitudeDeg: inUnit(need('latitude'), 'deg'),
    longitudeDeg: inUnit(need('longitude'), 'deg'),
    ...(s.elevation ? { elevationM: inUnit(s.elevation, 'm') } : {}),
    facility: f.id,
  };
}
