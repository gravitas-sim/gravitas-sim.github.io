// =============================================================================
// Small tables: keep the rows that pass, and pair the rows of two tables
// -----------------------------------------------------------------------------
//   filterRows   conditions on columns, all of them or any of them. A value is
//                compared in its column's own unit, which the condition names,
//                so "mass > 30" cannot silently mean grams. A missing value
//                passes no condition and is counted, never dropped unsaid.
//   crossMatch   each row of A with the nearest row of B within a tolerance,
//                one to one, nearest pairs first: by a numeric column (a time,
//                an id) or by position on the sky (degrees, haversine). Rows
//                left without a partner are counted, and so are rows that had
//                more than one candidate, because the pairing then chose.
//
// Teaching-sized: 20,000 rows a table. Sorted neighbours, not all pairs, so a
// match is n log n.
// =============================================================================

export const VERSION = '1.0.0';
export const LIMITS = Object.freeze({ rows: 20_000, conditions: 8 });
export const OPERATORS = Object.freeze([
  '<',
  '<=',
  '>',
  '>=',
  '==',
  '!=',
  'contains',
]);

export class TableOpError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'TableOpError';
    this.code = code;
    this.detail = detail;
  }
}

const missing = v =>
  v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));

function column(table, id) {
  const c = table.columns.find(k => k.id === id);
  if (!c) throw new TableOpError('column', `no column ${id}`, { column: id });
  return c;
}

const TEST = {
  '<': (v, x) => v < x,
  '<=': (v, x) => v <= x,
  '>': (v, x) => v > x,
  '>=': (v, x) => v >= x,
  '==': (v, x) => v === x,
  '!=': (v, x) => v !== x,
  contains: (v, x) => String(v).toLowerCase().includes(String(x).toLowerCase()),
};

/**
 * @param {{columns: object[]}} table - gravitas.observation/1 columns
 * @param {Array<{column: string, op: string, value: number|string,
 *   unit?: string|null}>} conditions - `unit` must be the column's unit
 * @param {{join?: 'all'|'any'}} [opts]
 * @returns {{version: string, keep: number[], dropped: number,
 *   missing: Record<string, number>, rows: number}}
 */
export function filterRows(table, conditions, { join = 'all' } = {}) {
  if (!conditions.length)
    throw new TableOpError('noConditions', 'a filter needs a condition');
  if (conditions.length > LIMITS.conditions)
    throw new TableOpError(
      'tooMany',
      `${conditions.length} conditions; the limit is ${LIMITS.conditions}`
    );
  const n = table.columns[0]?.values.length ?? 0;
  if (n > LIMITS.rows)
    throw new TableOpError(
      'tooLarge',
      `${n} rows; the limit is ${LIMITS.rows}`,
      { n }
    );
  const tests = conditions.map(c => {
    if (!OPERATORS.includes(c.op))
      throw new TableOpError('operator', `no operator ${c.op}`, { op: c.op });
    const col = column(table, c.column);
    const numeric = col.role !== 'label';
    if (numeric && c.op !== 'contains') {
      if (typeof c.value !== 'number' || !Number.isFinite(c.value))
        throw new TableOpError(
          'value',
          `${c.column} is a number column; ${c.value} is not a number`,
          { column: c.column }
        );
      if ((c.unit ?? null) !== (col.unit ?? null))
        throw new TableOpError(
          'unit',
          `${c.column} is in ${col.unit ?? 'no stated unit'}; the condition says ${c.unit ?? 'none'}`,
          {
            column: c.column,
            unit: col.unit ?? null,
          }
        );
    }
    return { col, fn: TEST[c.op], value: c.value, id: c.column };
  });
  const keep = [];
  const miss = Object.fromEntries(tests.map(t => [t.id, 0]));
  for (let i = 0; i < n; i++) {
    const results = tests.map(t => {
      const v = t.col.values[i];
      if (missing(v)) {
        miss[t.id]++;
        return false;
      }
      return t.fn(v, t.value);
    });
    if (join === 'any' ? results.some(Boolean) : results.every(Boolean))
      keep.push(i);
  }
  return {
    version: VERSION,
    keep,
    dropped: n - keep.length,
    missing: miss,
    rows: n,
  };
}

/** Great-circle separation in degrees (haversine: exact near zero). */
export function separationDeg(ra1, dec1, ra2, dec2) {
  const r = Math.PI / 180;
  const s =
    Math.sin(((dec2 - dec1) * r) / 2) ** 2 +
    Math.cos(dec1 * r) *
      Math.cos(dec2 * r) *
      Math.sin(((ra2 - ra1) * r) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(s)))) / r;
}

/**
 * @param {{columns: object[]}} a
 * @param {{columns: object[]}} b
 * @param {{by: 'value', a: string, b: string, tolerance: number} |
 *   {by: 'sky', a: [string, string], b: [string, string],
 *   radiusArcsec: number}} how - Column ids; value columns must share a unit
 * @returns {{version: string, pairs: Array<{a: number, b: number,
 *   distance: number}>, unmatchedA: number, unmatchedB: number,
 *   ambiguous: number, unit: string|null}}
 */
export function crossMatch(a, b, how) {
  const na = a.columns[0]?.values.length ?? 0;
  const nb = b.columns[0]?.values.length ?? 0;
  if (na > LIMITS.rows || nb > LIMITS.rows)
    throw new TableOpError(
      'tooLarge',
      `the limit is ${LIMITS.rows} rows a table`
    );
  // dist(i, j): the separation of A's row i and B's row j. sa, sb: a sort
  // key on which a partner within tol is also within stol.
  let dist;
  let sa;
  let sb;
  let tol;
  let stol;
  let unit;
  if (how.by === 'value') {
    const ca = column(a, how.a);
    const cb = column(b, how.b);
    if ((ca.unit ?? null) !== (cb.unit ?? null))
      throw new TableOpError(
        'unit',
        `${how.a} is in ${ca.unit ?? 'no stated unit'} and ${how.b} in ${cb.unit ?? 'no stated unit'}`
      );
    if (!(how.tolerance >= 0))
      throw new TableOpError('tolerance', 'a tolerance is zero or more');
    dist = (i, j) => Math.abs(ca.values[i] - cb.values[j]);
    sa = i => ca.values[i];
    sb = j => cb.values[j];
    tol = stol = how.tolerance;
    unit = ca.unit ?? null;
  } else if (how.by === 'sky') {
    const [ra1, de1] = how.a.map(id => column(a, id));
    const [ra2, de2] = how.b.map(id => column(b, id));
    for (const c of [ra1, de1, ra2, de2])
      if (c.unit !== 'deg')
        throw new TableOpError('unit', `${c.id} is not in degrees`);
    if (!(how.radiusArcsec > 0))
      throw new TableOpError('tolerance', 'a radius is more than zero');
    dist = (i, j) =>
      separationDeg(
        ra1.values[i],
        de1.values[i],
        ra2.values[j],
        de2.values[j]
      ) * 3600;
    // A partner within r arcseconds is within r of it in declination.
    sa = i => de1.values[i];
    sb = j => de2.values[j];
    tol = how.radiusArcsec;
    stol = tol / 3600;
    unit = 'arcsec';
  } else throw new TableOpError('by', 'match by value or by sky');

  const B = [...Array(nb).keys()]
    .filter(j => Number.isFinite(sb(j)))
    .sort((p, q) => sb(p) - sb(q));
  const keys = B.map(sb);
  const lower = v => {
    let lo = 0;
    let hi = keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const candidates = [];
  const count = new Int32Array(na);
  for (let i = 0; i < na; i++) {
    const v = sa(i);
    if (!Number.isFinite(v)) continue;
    for (let k = lower(v - stol); k < keys.length && keys[k] <= v + stol; k++) {
      const d = dist(i, B[k]);
      if (d <= tol) {
        candidates.push({ a: i, b: B[k], distance: d });
        count[i]++;
      }
    }
  }
  candidates.sort((p, q) => p.distance - q.distance || p.a - q.a || p.b - q.b);
  const usedA = new Set();
  const usedB = new Set();
  const pairs = [];
  for (const c of candidates) {
    if (usedA.has(c.a) || usedB.has(c.b)) continue;
    usedA.add(c.a);
    usedB.add(c.b);
    pairs.push(c);
  }
  pairs.sort((p, q) => p.a - q.a);
  let ambiguous = 0;
  for (let i = 0; i < na; i++) if (count[i] > 1) ambiguous++;
  return {
    version: VERSION,
    pairs,
    unmatchedA: na - usedA.size,
    unmatchedB: nb - usedB.size,
    ambiguous,
    unit,
  };
}
