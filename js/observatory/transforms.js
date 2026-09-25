// =============================================================================
// Changes a reader makes to an observation, and how they are undone
// -----------------------------------------------------------------------------
// The workspace never edits an observation. It keeps the one it opened and a
// list of changes, and what the views show is that list replayed over it:
//
//   replay(source, [ {op: 'crop', ...}, {op: 'normalize', ...}, ... ])
//
// So every change is reversible without an inverse: undo is the list one
// shorter, redo is the list one longer again (./history.js), and a change
// that cannot be made to this observation is refused before it joins the list,
// so the list never holds one that fails. An export writes the list beside the
// source's identity, and the same source with the same list is the same file,
// byte for byte (./export.js).
//
// Some changes are reductions - binning is the one here - and a reduction is
// said out loud: replay() returns, beside the result, a note of everything
// that left rows out, averaged them or changed what the axis means, and the
// page lists those notes under "what you are seeing".
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

import {
  cannotConvert,
  cannotConvertTime,
  conversionFactor,
  parseUnit,
  timeOffset,
  unitId,
} from './units.js';
import { columnOf, maskedRows, rowCount, uncertaintyOf } from './schema.js';

const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** A copy that shares every column it does not change. */
function copy(o) {
  return {
    ...o,
    columns: [...o.columns],
    axes: { ...o.axes },
    masks: (o.masks || []).map(m => ({ ...m })),
    annotations: (o.annotations || []).map(a => ({ ...a })),
  };
}

function replaceColumn(o, id, next) {
  o.columns = o.columns.map(c => (c.id === id ? next : c));
}

/** The median of a column's finite values in rows no mask covers. */
function median(o, column) {
  const masked = maskedRows(o);
  const v = [];
  column.values.forEach((x, i) => {
    if (isNum(x) && !masked.has(i)) v.push(x);
  });
  if (!v.length) return NaN;
  v.sort((a, b) => a - b);
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Keep some rows, in order: every column, and the masks and annotations that
 * point at rows, follow. An annotation whose rows did not all survive goes.
 */
function keepRows(o, keep) {
  const next = copy(o);
  const index = new Map(keep.map((r, i) => [r, i]));
  next.columns = o.columns.map(c => {
    const values = ArrayBuffer.isView(c.values)
      ? new c.values.constructor(keep.length)
      : new Array(keep.length);
    keep.forEach((r, i) => (values[i] = c.values[r]));
    return { ...c, values };
  });
  next.masks = next.masks
    .map(m => ({
      ...m,
      rows: m.rows.filter(r => index.has(r)).map(r => index.get(r)),
    }))
    .filter(m => m.rows.length || m.source === 'reader');
  const before = next.annotations.length;
  next.annotations = next.annotations
    .filter(a => index.has(a.rows[0]) && index.has(a.rows[1]))
    .map(a => ({ ...a, rows: [index.get(a.rows[0]), index.get(a.rows[1])] }));
  return { next, droppedAnnotations: before - next.annotations.length };
}

/** A column's unit, parsed; null when not stated. */
const unitOf = c => parseUnit(c.unit).unit;

/**
 * Every change the workspace can make. Each has the kinds it applies to, a
 * check that says why it cannot be made (or null), and the change itself,
 * which returns the new observation and what to tell the reader about it.
 */
export const OPS = {
  /** Keep the rows whose value in one column lies in a range. */
  crop: {
    kinds: ['time-series', 'spectrum', 'table'],
    check(o, { column, min, max }) {
      const c = columnOf(o, column);
      if (!c || c.role === 'label')
        return 'there is no number column to crop by';
      if (!(isNum(min) && isNum(max) && min < max))
        return 'the range needs a lower and a higher end';
      return null;
    },
    apply(o, { column, min, max }) {
      const c = columnOf(o, column);
      const keep = [];
      c.values.forEach((v, i) => {
        if (isNum(v) && v >= min && v <= max) keep.push(i);
      });
      if (!keep.length) throw new Error('no rows lie in that range');
      const { next, droppedAnnotations } = keepRows(o, keep);
      return {
        o: next,
        note: {
          key: 'crop',
          vars: {
            column: c.name,
            min,
            max,
            kept: keep.length,
            of: rowCount(o),
            droppedAnnotations,
          },
        },
      };
    },
  },

  /** Leave rows out of the views and summaries, keeping them in the data. */
  mask: {
    kinds: ['time-series', 'spectrum', 'table', 'image'],
    check(o, { id, rows }) {
      const n = rowCount(o);
      if (typeof id !== 'string' || !id) return 'a mask needs an id';
      if ((o.masks || []).some(m => m.id === id))
        return 'that mask already exists';
      if (!Array.isArray(rows) || !rows.length)
        return 'nothing is selected to mask';
      if (!rows.every(r => Number.isInteger(r) && r >= 0 && r < n))
        return 'the rows are not in this observation';
      return null;
    },
    apply(o, { id, rows, label }) {
      const next = copy(o);
      const unique = [...new Set(rows)].sort((a, b) => a - b);
      next.masks.push({
        id,
        label: label || '',
        source: 'reader',
        rows: unique,
      });
      return {
        o: next,
        note: {
          key: 'mask',
          vars: { rows: unique.length, label: label || '' },
        },
      };
    },
  },

  /** Take away a mask the reader made. One that came with the data stays. */
  unmask: {
    kinds: ['time-series', 'spectrum', 'table', 'image'],
    check(o, { id }) {
      const m = (o.masks || []).find(k => k.id === id);
      if (!m) return 'there is no such mask';
      if (m.source !== 'reader')
        return 'a mask that came with the data is part of the data';
      return null;
    },
    apply(o, { id }) {
      const next = copy(o);
      next.masks = next.masks.filter(m => m.id !== id);
      return { o: next, note: null };
    },
  },

  /** Change a column's unit, and its uncertainty's with it. */
  convert: {
    kinds: ['time-series', 'spectrum', 'table', 'image'],
    check(o, { column, to }) {
      const c = columnOf(o, column);
      if (!c || c.role === 'label' || c.role === 'flag')
        return 'there is no number column to convert';
      if (o.time?.column === column)
        return 'a time column changes its format, not its unit';
      const target = parseUnit(to);
      if (!target.ok) return target.reason;
      return cannotConvert(unitOf(c), target.unit);
    },
    apply(o, { column, to }) {
      const next = copy(o);
      const target = parseUnit(to).unit;
      const from = unitOf(columnOf(o, column));
      const f = conversionFactor(from, target);
      const scaled = c => ({
        ...c,
        unit: unitId(target),
        values: Float64Array.from(c.values, v => v * f),
      });
      for (const c of o.columns) {
        if (c.id === column || c.of === column)
          replaceColumn(next, c.id, scaled(c));
      }
      return { o: next, note: null };
    },
  },

  /** Count a time column from another epoch in the same time system. */
  timeFormat: {
    kinds: ['time-series'],
    check(o, { to }) {
      if (!o.time) return 'there is no time column';
      return cannotConvertTime(o.time.format, to);
    },
    apply(o, { to }) {
      const next = copy(o);
      const dt = timeOffset(o.time.format, to);
      const c = columnOf(o, o.time.column);
      replaceColumn(next, c.id, {
        ...c,
        values: Float64Array.from(c.values, v => v + dt),
      });
      next.time = { ...o.time, format: to };
      return { o: next, note: null };
    },
  },

  /** Divide a column, and its uncertainty, by its median. */
  normalize: {
    kinds: ['time-series', 'spectrum'],
    check(o, { column }) {
      const c = columnOf(o, column);
      if (!c || c.role !== 'value')
        return 'there is no value column to normalize';
      const m = median(o, c);
      if (!isNum(m) || m === 0)
        return 'its median is zero or missing, so there is nothing to divide by';
      return null;
    },
    apply(o, { column }) {
      const next = copy(o);
      const c = columnOf(o, column);
      const m = median(o, c);
      for (const d of o.columns) {
        if (d.id === column || d.of === column) {
          replaceColumn(next, d.id, {
            ...d,
            unit: '',
            values: Float64Array.from(d.values, v => v / m),
          });
        }
      }
      return {
        o: next,
        note: {
          key: 'normalize',
          vars: { column: c.name, median: m, unit: c.unit },
        },
      };
    },
  },

  /** Phase-fold a time series on a period, from an epoch. */
  fold: {
    kinds: ['time-series'],
    check(o, { period, epoch }) {
      if (!o.time) return 'there is no time column';
      if (!(isNum(period) && period > 0))
        return 'the period must be a positive number';
      if (!isNum(epoch)) return 'the epoch must be a number';
      return null;
    },
    apply(o, { period, epoch }) {
      const next = copy(o);
      const t = columnOf(o, o.time.column);
      const phase = Float64Array.from(t.values, v => {
        const x = (v - epoch) / period;
        return x - Math.floor(x + 0.5);
      });
      next.columns = next.columns.filter(c => c.id !== 'phase');
      next.columns.push({
        id: 'phase',
        name: 'phase',
        unit: '',
        role: 'x',
        values: phase,
      });
      next.axes.x = 'phase';
      return {
        o: next,
        note: { key: 'fold', vars: { period, epoch, unit: t.unit } },
      };
    },
  },

  /**
   * Average into equal bins along the plotted axis. A reduction: the rows
   * become bins, and the page says how many and how.
   */
  bin: {
    kinds: ['time-series', 'spectrum'],
    check(o, { width }) {
      if (!(isNum(width) && width > 0))
        return 'the bin width must be a positive number';
      const x = columnOf(o, o.axes.x);
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of x.values) {
        if (isNum(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
      if (!(hi > lo)) return 'there is nothing to bin';
      if ((hi - lo) / width > 100000)
        return 'that would make more than 100,000 bins';
      if ((hi - lo) / width < 2) return 'that would make fewer than two bins';
      return null;
    },
    apply(o, { width }) {
      const x = columnOf(o, o.axes.x);
      const y = columnOf(o, o.axes.y);
      const { sigma } = uncertaintyOf(o, y.id);
      const masked = maskedRows(o);
      const bins = new Map();
      let used = 0;
      x.values.forEach((xv, i) => {
        const yv = y.values[i];
        if (!isNum(xv) || !isNum(yv) || masked.has(i)) return;
        const k = Math.floor(xv / width);
        let b = bins.get(k);
        if (!b)
          bins.set(k, (b = { n: 0, sum: 0, sum2: 0, var: 0, err: !!sigma }));
        b.n++;
        b.sum += yv;
        b.sum2 += yv * yv;
        const s = sigma?.values[i];
        if (sigma && isNum(s)) b.var += s * s;
        else b.err = false;
        used++;
      });
      const keys = [...bins.keys()].sort((a, b) => a - b);
      const xs = new Float64Array(keys.length);
      const ys = new Float64Array(keys.length);
      const es = new Float64Array(keys.length);
      const ns = new Float64Array(keys.length);
      let propagated = true;
      keys.forEach((k, i) => {
        const b = bins.get(k);
        xs[i] = (k + 0.5) * width;
        ys[i] = b.sum / b.n;
        ns[i] = b.n;
        if (b.err) es[i] = Math.sqrt(b.var) / b.n;
        else {
          propagated = false;
          const variance =
            b.n > 1 ? (b.sum2 - (b.sum * b.sum) / b.n) / (b.n - 1) : NaN;
          es[i] = b.n > 1 ? Math.sqrt(Math.max(0, variance) / b.n) : NaN;
        }
      });
      const next = copy(o);
      next.columns = [
        { ...x, values: xs },
        { ...y, values: ys },
        {
          id: `${y.id}-bin-error`,
          name: `${y.name} error`,
          unit: y.unit,
          role: 'uncertainty',
          of: y.id,
          values: es,
        },
        {
          id: 'bin-count',
          name: 'points in bin',
          unit: '',
          role: 'value',
          values: ns,
        },
      ];
      if (o.time?.column && o.time.column !== x.id) delete next.time;
      next.masks = [];
      const dropped = next.annotations.length;
      next.annotations = [];
      return {
        o: next,
        note: {
          key: propagated ? 'bin' : 'binScatter',
          vars: {
            width,
            unit: x.unit,
            bins: keys.length,
            rows: used,
            masked: masked.size,
            droppedAnnotations: dropped,
          },
        },
      };
    },
  },

  /** Take a spectrum to its rest frame, given a redshift. */
  restFrame: {
    kinds: ['spectrum'],
    check(o, { z }) {
      if (!o.spectral) return 'there is no spectral axis';
      if (o.spectral.frame === 'rest') return 'it is already in its rest frame';
      if (!(isNum(z) && z > -1))
        return 'the redshift must be a number above -1';
      return null;
    },
    apply(o, { z }) {
      const next = copy(o);
      const f = o.spectral.quantity === 'wavelength' ? 1 / (1 + z) : 1 + z;
      for (const c of o.columns) {
        if (c.id === o.spectral.column || c.of === o.spectral.column) {
          replaceColumn(next, c.id, {
            ...c,
            values: Float64Array.from(c.values, v => v * f),
          });
        }
      }
      next.spectral = { ...o.spectral, frame: 'rest', redshift: z };
      return { o: next, note: { key: 'restFrame', vars: { z } } };
    },
  },

  /** A note on some rows. */
  annotate: {
    kinds: ['time-series', 'spectrum', 'table', 'image'],
    check(o, { id, rows, text }) {
      if (typeof id !== 'string' || !id) return 'a note needs an id';
      if ((o.annotations || []).some(a => a.id === id))
        return 'that note already exists';
      if (typeof text !== 'string' || !text.trim()) return 'the note is empty';
      if (text.length > 500) return 'a note is at most 500 characters';
      const n = rowCount(o);
      if (!(
        Array.isArray(rows) &&
        rows.length === 2 &&
        Number.isInteger(rows[0]) &&
        rows[0] >= 0 &&
        rows[0] <= rows[1] &&
        rows[1] < n
      )) {
        return 'nothing is selected to note';
      }
      return null;
    },
    apply(o, { id, rows, text }) {
      const next = copy(o);
      next.annotations.push({
        id,
        rows: [rows[0], rows[1]],
        text: text.trim(),
      });
      return { o: next, note: null };
    },
  },

  /** Take a note away. */
  unannotate: {
    kinds: ['time-series', 'spectrum', 'table', 'image'],
    check(o, { id }) {
      return (o.annotations || []).some(a => a.id === id)
        ? null
        : 'there is no such note';
    },
    apply(o, { id }) {
      const next = copy(o);
      next.annotations = next.annotations.filter(a => a.id !== id);
      return { o: next, note: null };
    },
  },
};

/**
 * Why a change cannot be made to this observation, or null when it can.
 * @param {object} o - The observation as it stands
 * @param {{op: string}} change - The change, with its parameters
 */
export function whyNot(o, change) {
  const op = OPS[change?.op];
  if (!op) return `"${change?.op}" is not a change the workspace knows`;
  if (!op.kinds.includes(o.kind))
    return `a ${o.kind} cannot be changed that way`;
  return op.check(o, change);
}

/**
 * The observation after a list of changes, and what each one reduced.
 * @param {object} source - The observation as opened
 * @param {object[]} changes - In order
 * @returns {{o: object, notes: Array<{key: string, vars: object}>}}
 * @throws {Error} Naming the change that cannot be made
 */
export function replay(source, changes) {
  let o = source;
  const notes = [];
  changes.forEach((change, i) => {
    const why = whyNot(o, change);
    if (why) throw new Error(`change ${i + 1} (${change?.op}): ${why}`);
    const out = OPS[change.op].apply(o, change);
    o = out.o;
    if (out.note) notes.push(out.note);
  });
  return { o, notes };
}
