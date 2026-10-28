// The comparison of bodies side by side (Prompt 203, Part A): the rows the
// workbench's table and plots draw. Pure; INTERIORS.md.
import { refuse } from './constants.js';
import { PLANET_IDS } from './bodies.js';
import { bulkOf, equilibriumOf } from './bulk.js';

/** The quantities a comparison offers: id, label, unit, how to read it from a row. */
export const QUANTITIES = Object.freeze([
  { id: 'density', unit: 'kg/m3', pick: r => r.density },
  { id: 'gravity', unit: 'm/s2', pick: r => r.gravity },
  { id: 'escapeSpeed', unit: 'm/s', pick: r => r.escapeSpeed },
  { id: 'mass', unit: 'kg', pick: r => r.mass },
  {
    id: 'temperature',
    unit: 'K',
    pick: r => ({ value: r.temperature, sigma: null }),
  },
]);

/** Rows for the chosen bodies, in the order chosen; refuses an empty or unknown selection. */
export function compareBodies(ids = PLANET_IDS) {
  const MODEL = 'comparison';
  if (!Array.isArray(ids) || ids.length === 0)
    return refuse(MODEL, 'empty', 'choose at least one body');
  if (new Set(ids).size !== ids.length)
    return refuse(MODEL, 'duplicate', 'a body appears twice');
  const rows = [];
  for (const id of ids) {
    const b = bulkOf(id);
    if (b.refused) return b;
    const t = equilibriumOf(id);
    if (t.refused) return t;
    rows.push({ ...b, temperature: t.temperature });
  }
  return { model: MODEL, rows, quantities: QUANTITIES.map(q => q.id) };
}
