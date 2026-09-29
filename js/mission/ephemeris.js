// =============================================================================
// Reading the educational ephemeris pack
// -----------------------------------------------------------------------------
// gravitas.ephemeris-pack/1 (EPHEMERIS.md): Chebyshev coefficients fitted by
// tools/build-ephemeris.mjs to JPL Horizons (DE441) states. The pack module
// (js/data/ephemeris/solarSystem2025.js) holds them as base64; this decodes
// them once and evaluates any body's state at any time in the range:
//
//   position   km, heliocentric (the Sun's center), ecliptic of J2000.0
//   velocity   km/s, the same
//   time       Julian date, TDB
//
// A time outside the pack's range is refused, never extrapolated: a
// Chebyshev series outside its interval is a polynomial going wherever it
// likes. Pure: the page, the Worker, the tool and the tests share it.
// =============================================================================

const { floor, min, max } = Math;

export const EPHEMERIS_FORMAT = 'gravitas.ephemeris-pack';
export const JD_J2000 = 2451545.0;

/** Base64 to bytes, in a browser, a Worker or Node. */
function bytesOf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Segment k's first day, and how many there are: the builder's rule. */
const segmentCount = (start, stop, days) =>
  Math.ceil((stop - start) / days - 1e-9);
const segmentStart = (start, stop, days, count, k) =>
  k === count - 1 ? stop - days : start + k * days;

/**
 * An ephemeris from a pack's runtime part and its data.
 * @returns {{pack, bodies: string[], range: {startJd, stopJd}, stateAt(id, jd)}}
 */
export function createEphemeris(pack, data) {
  if (pack?.format !== EPHEMERIS_FORMAT || pack.formatVersion !== 1)
    throw new Error('ephemeris: not a gravitas.ephemeris-pack/1');
  const { startJd, stopJd } = pack.range;
  const tables = {};
  for (const b of pack.bodies) {
    const bytes = bytesOf(data[b.id]);
    const n = b.degree;
    const per = 16 + 4 * (n - 1);
    if (bytes.length !== b.bytes || bytes.length !== b.segments * 3 * per)
      throw new Error(
        `ephemeris: ${b.id} has ${bytes.length} bytes, not ${b.bytes}`
      );
    const view = new DataView(bytes.buffer);
    const c = new Float64Array(b.segments * 3 * (n + 1));
    let o = 0;
    let q = 0;
    for (let s = 0; s < b.segments * 3; s++) {
      c[q++] = view.getFloat64(o, true);
      c[q++] = view.getFloat64(o + 8, true);
      for (let k = 2; k <= n; k++)
        c[q++] = view.getFloat32(o + 16 + 4 * (k - 2), true);
      o += per;
    }
    if (segmentCount(startJd, stopJd, b.segmentDays) !== b.segments)
      throw new Error(`ephemeris: ${b.id} has the wrong number of segments`);
    tables[b.id] = { c, n, days: b.segmentDays, count: b.segments };
  }
  const T = new Float64Array(32);
  const U = new Float64Array(32);
  return {
    pack,
    bodies: pack.bodies.map(b => b.id),
    range: { startJd, stopJd },
    /** Position (km) and velocity (km/s) of a body at a TDB Julian date. */
    stateAt(id, jd) {
      const t = tables[id];
      if (!t)
        throw Object.assign(new Error(`ephemeris: no body ${id}`), {
          code: 'body',
        });
      if (!(jd >= startJd && jd <= stopJd))
        throw Object.assign(new Error(`ephemeris: ${jd} is outside the pack`), {
          code: 'outOfRange',
        });
      let k = min(t.count - 1, max(0, floor((jd - startJd) / t.days)));
      // The last segment ends on the last day and so starts inside the one
      // before it; a time in that overlap belongs to whichever holds it.
      let a = segmentStart(startJd, stopJd, t.days, t.count, k);
      if (jd > a + t.days) {
        k = t.count - 1;
        a = segmentStart(startJd, stopJd, t.days, t.count, k);
      }
      const half = t.days / 2;
      const x = (jd - a) / half - 1;
      const n = t.n;
      T[0] = 1;
      T[1] = x;
      U[0] = 0;
      U[1] = 1;
      for (let j = 2; j <= n; j++) {
        T[j] = 2 * x * T[j - 1] - T[j - 2];
        U[j] = 2 * T[j - 1] + 2 * x * U[j - 1] - U[j - 2];
      }
      const r = [0, 0, 0];
      const v = [0, 0, 0];
      for (let ax = 0; ax < 3; ax++) {
        const o = (k * 3 + ax) * (n + 1);
        let p = 0;
        let d = 0;
        for (let j = 0; j <= n; j++) {
          p += t.c[o + j] * T[j];
          d += t.c[o + j] * U[j];
        }
        r[ax] = p;
        v[ax] = d / half / 86400;
      }
      return { r, v };
    },
  };
}

/** A check set's rows for one body: [jd, x, y, z, vx, vy, vz] each. */
export function checkRows(check, id) {
  const bytes = bytesOf(check.data[id]);
  const view = new DataView(bytes.buffer);
  const out = [];
  for (let i = 0; i < check.rows[id]; i++)
    out.push(
      Array.from({ length: 7 }, (_, k) =>
        view.getFloat64(8 * (7 * i + k), true)
      )
    );
  return out;
}

/** A calendar date, YYYY-MM-DD (00:00), as a Julian date; NaN if not a date. */
export function jdOfDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m) return NaN;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (new Date(ms).toISOString().slice(0, 10) !== date) return NaN;
  return ms / 86400000 + 2440587.5;
}

/** A Julian date as a calendar date, YYYY-MM-DD. */
export const dateOfJd = jd =>
  new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 10);
