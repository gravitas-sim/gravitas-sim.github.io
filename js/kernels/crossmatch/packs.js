// =============================================================================
// A catalog from an observation data pack (DATA_PACKS.md)
// -----------------------------------------------------------------------------
// The packs state their epoch in the frame string ("ICRS, epoch J2016.0") and
// the rounding of their stored positions in the reductions prose ("Positions
// are rounded to 0.00001 degree"). This reads both from the record, so a catalog
// that does not state either is refused by the match and nothing is typed in.
// =============================================================================

const COLUMNS = Object.freeze({
  ra: 'ra',
  dec: 'dec',
  pmra: 'pmra',
  pmdec: 'pmdec',
  pmraErr: 'pmra_err',
  pmdecErr: 'pmdec_err',
});

/** The epoch (Julian year) a frame string names, or null. */
export function epochFromFrame(frame) {
  const m = /epoch J(\d+(?:\.\d+)?)/.exec(String(frame ?? ''));
  return m ? Number(m[1]) : null;
}

/**
 * The stored position step a pack's reductions state, as {raDeg, decDeg}, or
 * null when no sentence states one.
 */
export function positionStepFromReductions(reductions) {
  for (const r of reductions ?? []) {
    const m =
      /Positions are rounded to ([0-9.]+) degrees?(?: in right ascension and ([0-9.]+) degrees? in declination)?/.exec(
        String(r)
      );
    if (m) return { raDeg: Number(m[1]), decDeg: Number(m[2] ?? m[1]) };
  }
  return null;
}

/**
 * @param {{columns: Array<{id: string, unit: string, values: ArrayLike<number>}>}} table - the pack's decoded table (js/tableObservation.js tableOf)
 * @param {{id: string, object: {frame: string}, reductions: string[]}} record - the pack's record (PACK)
 * @param {Partial<typeof COLUMNS>} [names] - column ids where the pack's differ
 */
export function catalogFromPack(table, record, names = {}) {
  const map = { ...COLUMNS, ...names };
  const get = id => table.columns.find(c => c.id === id)?.values;
  const cat = {
    id: record.id,
    ra: get(map.ra),
    dec: get(map.dec),
    epoch: epochFromFrame(record.object?.frame),
    positionStep: positionStepFromReductions(record.reductions),
    columns: table.columns,
  };
  for (const k of ['pmra', 'pmdec', 'pmraErr', 'pmdecErr']) {
    const v = get(map[k]);
    if (v) cat[k] = v;
  }
  return cat;
}
