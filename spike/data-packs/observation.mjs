// Spike: the one in-memory shape an instrument reads a measured series from,
// whether it came from a curated pack or from a file a student chose.
//
//   {
//     quantity: 'relative-flux' | 'radial-velocity' | ...,
//     x:   { name, unit, values: Float64Array, scale?, reference? },
//     y:   { name, unit, values: Float64Array },
//     err: Float64Array | null,          // one-sigma, in y's unit
//     source: { kind: 'pack', id, version }
//           | { kind: 'student-file', name, bytes, format, dropped },
//   }
//
// Browser code: no Buffer, no fs. The decoders are the only code a lesson
// would load to read a pack, so their size is the runtime cost measured in
// the gate.

/** Base64 to bytes, without Buffer. */
function bytesOf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** tess-*-lc: runs of 10-minute bins, int16 ppm flux, uint8 error in steps. */
export function decodeLightCurve(pack) {
  // Little-endian by the format, whatever the machine's own order is.
  const fluxBytes = bytesOf(pack.flux);
  const flux = new DataView(fluxBytes.buffer);
  const err = bytesOf(pack.err);
  const n = pack.n;
  if (fluxBytes.length !== 2 * n || err.length !== n) throw new Error(`${pack.pack}: ${n} bins promised`);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const e = new Float64Array(n);
  let i = 0;
  for (const [start, count] of pack.runs) {
    for (let k = start; k < start + count; k++, i++) {
      x[i] = pack.t0 + (k + 0.5) * pack.binDays;
      y[i] = 1 + flux.getInt16(2 * i, true) / 1e6;
      e[i] = (err[i] * pack.errStepPpm) / 1e6;
    }
  }
  if (i !== n) throw new Error(`${pack.pack}: the runs cover ${i} bins, not ${n}`);
  return {
    quantity: 'relative-flux',
    x: { name: 'time', unit: 'd', values: x, scale: 'TDB', reference: 'BTJD' },
    y: { name: 'flux', unit: '', values: y },
    err: e,
    source: { kind: 'pack', id: pack.pack, version: pack.version },
  };
}

/** harps-*-rv: three plain columns. */
export function decodeRadialVelocity(pack) {
  const n = pack.t.length;
  if (pack.rv.length !== n || pack.err.length !== n) throw new Error(`${pack.pack}: ragged columns`);
  return {
    quantity: 'radial-velocity',
    x: { name: 'time', unit: 'd', values: Float64Array.from(pack.t, t => pack.t0 + t), scale: 'unstated', reference: 'BJD' },
    y: { name: 'rv', unit: 'm/s', values: Float64Array.from(pack.rv) },
    err: Float64Array.from(pack.err),
    source: { kind: 'pack', id: pack.pack, version: pack.version },
  };
}

/**
 * Whether an observation can be drawn and fitted: equal lengths, finite
 * values, positive errors, time non-decreasing.
 */
export function checkObservation(o) {
  const out = [];
  const n = o?.x?.values?.length ?? 0;
  if (!n) out.push('no rows');
  if (o?.y?.values?.length !== n) out.push('x and y differ in length');
  if (o?.err && o.err.length !== n) out.push('err differs in length');
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(o.x.values[i]) || !Number.isFinite(o.y.values[i])) {
      out.push(`row ${i + 1} is not finite`);
      break;
    }
    if (o.err && !(o.err[i] > 0)) {
      out.push(`row ${i + 1} has no positive error`);
      break;
    }
    if (i && o.x.values[i] < o.x.values[i - 1]) {
      out.push(`row ${i + 1} goes back in ${o.x.name}`);
      break;
    }
  }
  return out;
}
