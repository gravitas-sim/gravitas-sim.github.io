// =============================================================================
// A measured series, as an instrument reads it
// -----------------------------------------------------------------------------
// One in-memory shape for data that came from outside Gravitas, whether it
// arrived in a curated data pack (js/data/observations/, described in
// DATA_PACKS.md) or, later, from a file a student chose (Prompt 15 imports into
// this same shape):
//
//   {
//     quantity: 'relative-flux' | 'radial-velocity' | ...,
//     x:   { name, unit, values: Float64Array, scale?, reference? },
//     y:   { name, unit, values: Float64Array },
//     err: Float64Array | null,      one sigma, in y's unit
//     source: { kind: 'pack', id, version, credit },
//   }
//
// A pack module is content only - PACK, the metadata it is labelled and
// credited with, and SERIES, the encoded numbers - and this is the one decoder
// for it. The four datasets that came before packs each carry their own
// base64 decoder, all four reading integers in whatever byte order the machine
// has; an encoding here names its byte order, and a series in an encoding
// this build does not know is refused rather than guessed at.
//
// Pure: no DOM, no state, no imports. Browser and Node alike.
// =============================================================================

/** Base64 to bytes, without Buffer. */
function bytesOf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/**
 * `binned-relative-flux/1`: equal time bins stored as runs of consecutive bin
 * indices; flux as little-endian int16 parts per million about 1; the error as
 * one byte in steps of `errStepPpm`.
 */
function binnedRelativeFlux(series) {
  const n = series.n;
  const fluxBytes = bytesOf(series.flux);
  const err = bytesOf(series.err);
  if (fluxBytes.length !== 2 * n || err.length !== n) {
    throw new Error(
      `the series promises ${n} bins and holds a different number`
    );
  }
  const flux = new DataView(fluxBytes.buffer);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const e = new Float64Array(n);
  let i = 0;
  for (const [start, count] of series.runs) {
    if (i + count > n) break;
    for (let k = start; k < start + count; k++, i++) {
      x[i] = series.t0 + (k + 0.5) * series.binDays;
      y[i] = 1 + flux.getInt16(2 * i, true) / 1e6;
      e[i] = (err[i] * series.errStepPpm) / 1e6;
    }
  }
  const covered = series.runs.reduce((s, r) => s + r[1], 0);
  if (covered !== n)
    throw new Error(`the runs cover ${covered} bins, not ${n}`);
  return { quantity: 'relative-flux', x, y, err: e };
}

const ENCODINGS = { 'binned-relative-flux/1': binnedRelativeFlux };

/**
 * The observation a pack module holds.
 * @param {{PACK: object, SERIES: object}} pack - A module from js/data/observations/
 * @returns {object} The observation
 */
export function observationOf(pack) {
  const { PACK, SERIES } = pack || {};
  const decode = ENCODINGS[SERIES?.encoding];
  if (!PACK || !decode) {
    throw new Error(
      `not a data pack this build can read (${SERIES?.encoding ?? 'no encoding'})`
    );
  }
  const { quantity, x, y, err } = decode(SERIES);
  const [xCol, yCol] = PACK.columns;
  return {
    quantity,
    x: {
      name: xCol.name,
      unit: xCol.unit,
      values: x,
      scale: PACK.time?.scale,
      reference: PACK.time?.reference,
    },
    y: { name: yCol.name, unit: yCol.unit, values: y },
    err,
    source: {
      kind: 'pack',
      id: PACK.id,
      version: PACK.version,
      credit: PACK.credit,
    },
  };
}

/**
 * Whether an observation can be drawn and fitted: equal lengths, finite
 * values, positive errors, x never decreasing.
 * @returns {string[]} Problems, empty when there are none
 */
export function checkObservation(o) {
  const out = [];
  const n = o?.x?.values?.length ?? 0;
  if (!n) return ['it has no rows'];
  if (o.y?.values?.length !== n) out.push('x and y differ in length');
  if (o.err && o.err.length !== n) out.push('the errors differ in length');
  if (out.length) return out;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(o.x.values[i]) || !Number.isFinite(o.y.values[i])) {
      return [`row ${i + 1} is not a number`];
    }
    if (o.err && !(o.err[i] > 0)) return [`row ${i + 1} has no positive error`];
    if (i && o.x.values[i] < o.x.values[i - 1]) {
      return [`row ${i + 1} goes back in ${o.x.name}`];
    }
  }
  return out;
}
