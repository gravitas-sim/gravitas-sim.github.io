// =============================================================================
// The stellar kernel's Worker protocol (shared by the Worker and the tests)
// -----------------------------------------------------------------------------
// In:  {id, type: 'polytrope', n}            one Lane-Emden solution with its profile
//      {id, type: 'table'}                   xi1, mass and concentration for n = 0 to 4.5
//      {id, type: 'whiteDwarfCurve', muE}    the mass-radius relation (41 dwarfs)
// Out: {type: 'result', id, result} or {type: 'error', id, message}
// A solve is milliseconds to tens of milliseconds, so every request is answered
// whole; the Worker keeps the page from doing the arithmetic on its own thread.
// =============================================================================

import { solvePolytrope, polytropeTable } from './polytrope.js';
import { massRadiusCurve } from './whiteDwarf.js';

export function handle(data, post) {
  const { id, type } = data || {};
  try {
    let result;
    if (type === 'polytrope') result = solvePolytrope(Number(data.n));
    else if (type === 'table') result = polytropeTable();
    else if (type === 'whiteDwarfCurve')
      result = massRadiusCurve(undefined, data.muE ?? 2);
    else throw new Error(`unknown request ${type}`);
    post({ type: 'result', id, result });
  } catch (e) {
    post({ type: 'error', id, message: String(e?.message || e) });
  }
}
