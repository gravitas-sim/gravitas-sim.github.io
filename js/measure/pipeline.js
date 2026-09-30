// =============================================================================
// gravitas.pipeline/1: what was done to an observation, and what it gave
// -----------------------------------------------------------------------------
// A pipeline is the Observatory's workspace made inspectable end to end:
//
//   source        the observation as opened: its id, its source (pack or
//                 import, with version and any retrieval record) and the
//                 SHA-256 of its content
//   changes       the workspace's own list (js/observatory/transforms.js):
//                 selections and masks, calibrations (convert, normalize,
//                 time format), transformations (crop, fold, bin, rest
//                 frame) - each with how it treats uncertainty
//   measurements  one node per tool run (TOOLS below): the tool and its
//                 version, the parameters with their units, where in the
//                 changes it was taken (`at`, the number of changes before
//                 it) and the digest of the data it saw, the quantities it
//                 gave - each MEASURED, DERIVED or ASSUMED - and its warnings
//   fits          the fit panel's gravitas.inference/1 manifests, as they
//                 were recorded, when the reader chose to include one
//
// A node is a pure function of the data at its position and its parameters,
// so a node whose input no longer exists - an undo reached behind it - is
// STALE, not silently wrong, and recomputing it is the same arithmetic again.
// Reading a saved pipeline back replays the changes, recomputes every node
// with this build's tools and says whether each result is the one that was
// saved.
//
// Pure: no DOM. The page, the panel and the notebook are its callers.
// =============================================================================

import {
  searchPeriod,
  searchBox,
  VERSION as PERIOD_VERSION,
} from './periodogram.js';
import { measureLine, VERSION as LINE_VERSION } from './spectrumLine.js';
import { measureBand, VERSION as BAND_VERSION } from './bandIndex.js';
import { compareCurves, VERSION as CURVE_VERSION } from './curveCompare.js';
import { describeColumn, VERSION as DESCRIBE_VERSION } from './describe.js';
import {
  measureFlux,
  measureBits,
  VERSION as APERTURE_VERSION,
} from './aperture.js';
import {
  filterRows,
  crossMatch,
  VERSION as TABLE_VERSION,
} from './tableOps.js';
import { artifact } from '../platform/artifact.js';
import { unitIdOf } from '../units/registry.js';

export const FORMAT = 'gravitas.pipeline';
export const FORMAT_VERSION = 1;
export const KIND = Object.freeze({
  MEASURED: 'measured',
  DERIVED: 'derived',
  ASSUMED: 'assumed',
});

/**
 * How each workspace change treats uncertainty, for the pipeline view and
 * the methods summary. The operations are js/observatory/transforms.js's.
 */
export const CHANGE_CLASS = Object.freeze({
  crop: { stage: 'selection', uncertainty: 'kept' },
  mask: { stage: 'selection', uncertainty: 'kept' },
  unmask: { stage: 'selection', uncertainty: 'kept' },
  convert: { stage: 'calibration', uncertainty: 'scaled' },
  timeFormat: { stage: 'calibration', uncertainty: 'kept' },
  normalize: { stage: 'calibration', uncertainty: 'scaledAssumed' },
  fold: { stage: 'transformation', uncertainty: 'kept' },
  bin: { stage: 'transformation', uncertainty: 'propagated' },
  restFrame: { stage: 'transformation', uncertainty: 'kept' },
  derive: { stage: 'transformation', uncertainty: 'propagated' },
  annotate: { stage: 'annotation', uncertainty: 'kept' },
  unannotate: { stage: 'annotation', uncertainty: 'kept' },
});

export class PipelineError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
    this.detail = detail;
  }
}

const col = (o, id) => o.columns.find(c => c.id === id);
const masked = o => {
  const rows = new Set();
  for (const m of o.masks || []) for (const r of m.rows) rows.add(r);
  return rows;
};

/** The unmasked, finite rows of x, y and y's uncertainty. */
function series(o, xId, yId) {
  const x = col(o, xId);
  const y = col(o, yId);
  if (!x || !y)
    throw new PipelineError('columns', `no column ${!x ? xId : yId}`);
  const sigma =
    o.columns.find(c => c.role === 'uncertainty' && c.of === yId) || null;
  const skip = masked(o);
  const t = [];
  const v = [];
  const e = [];
  let withoutError = 0;
  for (let i = 0; i < x.values.length; i++) {
    if (
      skip.has(i) ||
      !Number.isFinite(x.values[i]) ||
      !Number.isFinite(y.values[i])
    )
      continue;
    const s = sigma?.values[i];
    if (sigma && !(s > 0)) {
      withoutError++;
      continue;
    }
    t.push(x.values[i]);
    v.push(y.values[i]);
    if (sigma) e.push(s);
  }
  const order = t.map((_, i) => i).sort((a, b) => t[a] - t[b]);
  return {
    t: order.map(i => t[i]),
    y: order.map(i => v[i]),
    dy: sigma ? order.map(i => e[i]) : null,
    xUnit: x.unit ?? null,
    yUnit: y.unit ?? null,
    masked: skip.size,
    withoutError,
  };
}

const q = (id, value, unit, kind, extra = {}) => ({
  id,
  value,
  unit,
  kind,
  ...extra,
});

/**
 * The tools. Each: which kinds of observation it measures, its version, how
 * it checks and runs, and the quantities it gives, each with its kind.
 */
export const TOOLS = Object.freeze({
  period: {
    kinds: ['time-series'],
    version: PERIOD_VERSION,
    expensive: true,
    async run(o, p, hooks) {
      const d = series(
        o,
        o.axes.x === 'phase' ? o.time?.column : o.axes.x,
        o.axes.y
      );
      const r = await searchPeriod(d, {
        ...hooks,
        minPeriod: p.minPeriod,
        maxPeriod: p.maxPeriod,
        oversample: p.oversample,
      });
      return {
        raw: { ...r, grid: undefined },
        grid: r.grid,
        quantities: [
          q('period', r.period, d.xUnit, KIND.MEASURED, {
            error: r.periodError,
            errorKind: KIND.DERIVED,
          }),
          q('power', r.power, '', KIND.MEASURED),
          q('falseAlarm', r.falseAlarm, '', KIND.DERIVED),
          q('amplitude', r.amplitude, d.yUnit, KIND.MEASURED),
          q('points', r.n, '', KIND.MEASURED),
        ],
        warnings: [
          ...r.warnings,
          ...(d.masked ? [{ code: 'maskedLeftOut', n: d.masked }] : []),
          ...(d.withoutError
            ? [{ code: 'noErrorLeftOut', n: d.withoutError }]
            : []),
        ],
        suggest: { fold: { period: r.period, epoch: d.t[0] } },
      };
    },
  },
  box: {
    kinds: ['time-series'],
    version: PERIOD_VERSION,
    expensive: true,
    async run(o, p, hooks) {
      const d = series(
        o,
        o.axes.x === 'phase' ? o.time?.column : o.axes.x,
        o.axes.y
      );
      const r = await searchBox(d, {
        ...hooks,
        minPeriod: p.minPeriod,
        maxPeriod: p.maxPeriod,
        durations: p.durations,
      });
      return {
        raw: { ...r, grid: undefined },
        grid: r.grid,
        quantities: [
          q('period', r.period, d.xUnit, KIND.MEASURED),
          q('epoch', r.epoch, d.xUnit, KIND.MEASURED),
          q('duration', r.duration, d.xUnit, KIND.MEASURED),
          q('depth', r.depth, d.yUnit, KIND.MEASURED),
          q('sde', r.sde, '', KIND.DERIVED),
          q('points', r.n, '', KIND.MEASURED),
        ],
        warnings: [
          ...r.warnings,
          ...(d.masked ? [{ code: 'maskedLeftOut', n: d.masked }] : []),
          ...(d.withoutError
            ? [{ code: 'noErrorLeftOut', n: d.withoutError }]
            : []),
        ],
        suggest: r.period
          ? { fold: { period: r.period, epoch: r.epoch } }
          : null,
      };
    },
  },
  line: {
    kinds: ['spectrum'],
    version: LINE_VERSION,
    async run(o, p) {
      const d = series(o, o.axes.x, o.axes.y);
      if (
        o.spectral?.medium &&
        p.restMedium &&
        o.spectral.medium !== p.restMedium
      )
        throw new PipelineError(
          'medium',
          `the spectrum is in ${o.spectral.medium}; the rest wavelength is in ${p.restMedium}`
        );
      const r = measureLine(
        { x: d.t, y: d.y, dy: d.dy },
        { line: p.line, blue: p.blue, red: p.red, rest: p.rest ?? null }
      );
      const quantities = [
        q('ew', r.ew, d.xUnit, KIND.MEASURED, {
          error: r.ewError,
          errorKind: r.weighted ? KIND.DERIVED : KIND.ASSUMED,
        }),
        q('center', r.center, d.xUnit, KIND.MEASURED, {
          error: r.centerError,
          errorKind: r.weighted ? KIND.DERIVED : KIND.ASSUMED,
        }),
        q('depth', r.depth, '', KIND.MEASURED),
      ];
      if (p.rest) {
        quantities.push(
          q('rest', p.rest, d.xUnit, KIND.ASSUMED, { cite: p.restCite ?? null })
        );
        quantities.push(
          q('velocity', r.velocity, 'km/s', KIND.DERIVED, {
            error: r.velocityError,
            errorKind: KIND.DERIVED,
          })
        );
      }
      return { raw: r, quantities, warnings: r.warnings };
    },
  },
  /** A band index on a spectrum: TiO5, or windows of the reader's own. */
  band: {
    kinds: ['spectrum'],
    version: BAND_VERSION,
    async run(o, p) {
      const d = series(o, o.axes.x, o.axes.y);
      const r = measureBand(
        { x: d.t, y: d.y, dy: d.dy },
        {
          band: p.band,
          reference: p.reference,
          medium: p.medium ?? 'vacuum',
          spectrumMedium: o.spectral?.medium ?? 'vacuum',
        }
      );
      return {
        raw: r,
        quantities: [
          q('index', r.index, '', KIND.MEASURED, {
            error: r.error,
            errorKind: d.dy ? KIND.DERIVED : KIND.ASSUMED,
          }),
          q('depth', r.depth, '', KIND.MEASURED),
          ...(p.cite
            ? [q('definition', null, '', KIND.ASSUMED, { cite: p.cite })]
            : []),
        ],
        warnings: r.warnings,
      };
    },
  },
  /**
   * A table's points against a family of model curves (./curveCompare.js):
   * the view's x as a color and y as a magnitude, against a model table's
   * curves - an isochrone per age, say - shifted by a distance modulus and a
   * reddening. The model is a table the page opens (hooks.model), named in
   * the parameters with the columns that make its color and magnitude.
   */
  curve: {
    kinds: ['table'],
    version: CURVE_VERSION,
    expensive: true,
    async run(o, p, hooks = {}) {
      // The columns plotted, which the parameters name: a reader's choice of
      // axes is not a change to the data, so it is recorded here instead.
      const xId = p.x ?? o.axes.x;
      const yId = p.y ?? o.axes.y;
      const d = series(o, xId, yId);
      if (!hooks.model)
        throw new PipelineError('model', 'there is no model to compare with');
      const m = await hooks.model(p.model.id);
      const mc = id => col(m, id)?.values;
      const [ca, cb] = p.model.color.map(mc);
      const mag = mc(p.model.magnitude);
      const by = mc(p.model.by);
      const seg = p.model.segments ? mc(p.model.segments) : null;
      const where = Object.entries(p.model.where || {}).map(([k, v]) => [
        mc(k),
        v,
      ]);
      if (!ca || !cb || !mag || !by || where.some(([c]) => !c))
        throw new PipelineError('model', 'the model has no such columns');
      // The model's curves: one per value of `by`, broken where `segments`
      // changes, from the rows that match `where`.
      const groups = new Map();
      for (let i = 0; i < mag.length; i++) {
        if (!where.every(([c, v]) => Math.abs(c[i] - v) < 1e-6)) continue;
        const key = by[i];
        if (!groups.has(key)) groups.set(key, new Map());
        const s = seg ? seg[i] : 0;
        const g = groups.get(key);
        if (!g.has(s)) g.set(s, []);
        g.get(s).push([ca[i] - cb[i], mag[i]]);
      }
      if (!groups.size)
        throw new PipelineError('model', 'no model curve matches the choice');
      const models = [...groups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([key, g]) => ({ key, segments: [...g.values()] }));
      const r = await compareCurves({ x: d.t, y: d.y }, models, {
        dm: p.dm,
        E: p.E,
        R: p.R,
        scale: p.scale,
        cap: p.cap,
        tolerance: p.tolerance,
        signal: hooks.signal,
        onProgress: hooks.onProgress,
      });
      const best = r.best;
      const toAge = logAge => 10 ** (logAge - 9);
      const ages = r.alike.map(a => a.key);
      // The best curve, shifted onto the view's own axes, to draw over it.
      const bestCurve = models.find(mm => mm.key === best.key);
      const points = [];
      for (const s of bestCurve.segments) {
        for (const [x, y] of s)
          points.push([x + best.E, y + best.dm + p.R * best.E]);
        points.push([NaN, NaN]);
      }
      return {
        raw: {
          models: r.models.map(mm => ({
            key: mm.key,
            stat: mm.stat,
            dm: mm.dm,
            E: mm.E,
          })),
          settings: r.settings,
        },
        overlay: {
          x: xId,
          y: yId,
          points,
          key: best.key,
        },
        quantities: [
          q(p.model.by, best.key, '', KIND.MEASURED),
          q('age', toAge(best.key), 'Gyr', KIND.DERIVED),
          q('ageLow', toAge(Math.min(...ages)), 'Gyr', KIND.DERIVED),
          q('ageHigh', toAge(Math.max(...ages)), 'Gyr', KIND.DERIVED),
          q('dm', best.dm, 'mag', KIND.MEASURED),
          q('distance', 10 ** (best.dm / 5 + 1), 'pc', KIND.DERIVED),
          q('reddening', best.E, 'mag', KIND.MEASURED),
          q('statistic', best.stat, '', KIND.MEASURED),
          q('points', r.points, '', KIND.MEASURED),
          q('R', p.R, '', KIND.ASSUMED, { cite: p.RCite ?? null }),
        ],
        warnings: [
          { code: 'noUncertainty' },
          ...r.warnings,
          ...(d.masked ? [{ code: 'maskedLeftOut', n: d.masked }] : []),
        ],
      };
    },
  },
  /** A column's count, median, mean, spread and extremes (./describe.js). */
  describe: {
    kinds: ['table', 'time-series', 'spectrum'],
    version: DESCRIBE_VERSION,
    async run(o, p) {
      const c = col(o, p.column);
      if (!c || c.role === 'label')
        throw new PipelineError('columns', `no number column ${p.column}`);
      const r = describeColumn(c.values, { skip: masked(o) });
      const unit = c.unit ?? '';
      return {
        raw: r,
        quantities: [
          q('n', r.n, '', KIND.MEASURED),
          q('median', r.median, unit, KIND.MEASURED),
          q('mean', r.mean, unit, KIND.MEASURED),
          q('sd', r.sd, unit, KIND.MEASURED),
          q('min', r.min, unit, KIND.MEASURED),
          q('max', r.max, unit, KIND.MEASURED),
        ],
        warnings: [
          ...(r.skipped ? [{ code: 'maskedLeftOut', n: r.skipped }] : []),
          ...(r.missing
            ? [{ code: 'missingLeftOut', n: r.missing, column: c.name }]
            : []),
        ],
      };
    },
  },
  aperture: {
    kinds: ['image'],
    version: APERTURE_VERSION,
    /**
     * Pixels here are FITS pixels, 1 at the center of the first, as the
     * image's own x and y columns count them; ./aperture.js counts from 0.
     * hooks.skyOf(wcs, x, y) and hooks.pixelScale(wcs) are the page's
     * js/observatory/wcs.js.
     */
    async run(o, p, hooks = {}) {
      const { width: w, height: h } = o.image;
      const xs = col(o, o.image.x).values;
      const ys = col(o, o.image.y).values;
      const vs = col(o, o.image.value).values;
      const skip = masked(o);
      // Built from the x and y columns, so row order does not matter, and a
      // masked pixel is missing, as it is from every summary.
      const values = new Float64Array(w * h).fill(NaN);
      for (let k = 0; k < vs.length; k++) {
        if (!skip.has(k)) values[(ys[k] - 1) * w + (xs[k] - 1)] = vs[k];
      }
      const img = { width: w, height: h, values };
      const circle =
        p.x === undefined || p.x === null
          ? {}
          : { x: p.x - 1, y: p.y - 1, r: p.r };
      const fits = c => c && { ...c, x: c.x + 1, y: c.y + 1 };
      if (p.mode === 'bits') {
        const wcs =
          hooks.skyOf && o.image.wcs
            ? {
                skyOf: (x, y) => hooks.skyOf(o.image.wcs, x + 1, y + 1),
                pixelArea: hooks
                  .pixelScale(o.image.wcs)
                  .reduce((a, b) => a * b),
              }
            : {};
        const r = measureBits(img, { bit: p.bit, ...circle }, wcs);
        const quantities = [q('count', r.count, 'pix', KIND.MEASURED)];
        const c = fits(r.centroid);
        if (c) {
          quantities.push(
            q('centroidX', c.x, 'pix', KIND.MEASURED),
            q('centroidY', c.y, 'pix', KIND.MEASURED)
          );
        }
        if (r.sky)
          quantities.push(
            q('ra', r.sky.ra, 'deg', KIND.DERIVED),
            q('dec', r.sky.dec, 'deg', KIND.DERIVED)
          );
        if (r.skyArea !== null)
          quantities.push(q('skyArea', r.skyArea, 'arcsec2', KIND.DERIVED));
        return { raw: { ...r, centroid: c }, quantities, warnings: r.warnings };
      }
      const r = measureFlux(img, {
        ...circle,
        rIn: p.rIn,
        rOut: p.rOut,
        gain: p.gain ?? null,
      });
      const unit = col(o, o.image.value).unit ?? null;
      const c = fits(r.centroid);
      const quantities = [
        q('sum', r.sum, unit, KIND.MEASURED),
        q('area', r.area, 'pix', KIND.MEASURED),
        q('background', r.background, unit, KIND.MEASURED, {
          error: r.backgroundScatter,
          errorKind: KIND.MEASURED,
        }),
        q('net', r.net, unit, KIND.DERIVED, {
          error: r.netError,
          errorKind: KIND.ASSUMED,
        }),
      ];
      if (c)
        quantities.push(
          q('centroidX', c.x, 'pix', KIND.MEASURED, {
            error: c.xError,
            errorKind: KIND.DERIVED,
          }),
          q('centroidY', c.y, 'pix', KIND.MEASURED, {
            error: c.yError,
            errorKind: KIND.DERIVED,
          })
        );
      return { raw: { ...r, centroid: c }, quantities, warnings: r.warnings };
    },
  },
  filter: {
    kinds: ['table'],
    version: TABLE_VERSION,
    async run(o, p) {
      const r = filterRows(o, p.conditions, { join: p.join });
      return {
        raw: r,
        quantities: [
          q('kept', r.keep.length, '', KIND.MEASURED),
          q('dropped', r.dropped, '', KIND.MEASURED),
        ],
        warnings: Object.entries(r.missing)
          .filter(([, n]) => n)
          .map(([column, n]) => ({ code: 'missingValues', column, n })),
        suggest: { mask: r.keep },
      };
    },
  },
  match: {
    kinds: ['table'],
    version: TABLE_VERSION,
    needsSecondTable: true,
    async run(o, p, hooks = {}) {
      if (!hooks.second)
        throw new PipelineError(
          'secondTable',
          'a cross-match needs a second table'
        );
      const r = crossMatch(o, hooks.second, p.how);
      return {
        raw: { ...r, pairs: r.pairs.slice(0, 5000) },
        quantities: [
          q('pairs', r.pairs.length, '', KIND.MEASURED),
          q('unmatched', r.unmatchedA, '', KIND.MEASURED),
          q('ambiguous', r.ambiguous, '', KIND.MEASURED),
        ],
        warnings: r.ambiguous ? [{ code: 'ambiguous', n: r.ambiguous }] : [],
      };
    },
  },
});

/** The tools that can measure an observation of this kind. */
export const toolsFor = o =>
  Object.keys(TOOLS).filter(id => TOOLS[id].kinds.includes(o.kind));

// --- Digests -----------------------------------------------------------------

async function sha256Hex(text) {
  const d = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(d), b =>
    b.toString(16).padStart(2, '0')
  ).join('');
}
const numbers = values =>
  Array.from(values, v =>
    Number.isFinite(v) ? v : typeof v === 'number' ? null : v
  );

/**
 * The SHA-256 of what an observation holds: its columns (ids, units, roles,
 * values), its masks and its axes. The same data gives the same digest in
 * every browser; a title or a note does not change it.
 */
export function contentDigest(o) {
  return sha256Hex(
    JSON.stringify({
      kind: o.kind,
      columns: o.columns.map(c => [
        c.id,
        c.unit ?? null,
        c.role,
        c.of ?? null,
        numbers(c.values),
      ]),
      masks: (o.masks || []).map(m => [m.id, m.rows]),
      axes: o.axes,
      image: o.image ? [o.image.width, o.image.height] : null,
    })
  );
}

// --- Nodes ---------------------------------------------------------------------

/** The next node id: one past the highest, so a removed id is never reused. */
export const nextId = nodes =>
  `m${nodes.reduce((m, x) => Math.max(m, Number(String(x.id).slice(1)) || 0), 0) + 1}`;

/**
 * Run a tool on an observation, as a node.
 * @param {object} view - The observation at the node's position
 * @param {{tool: string, params: object, at: number, id?: string}} spec
 * @param {object} [hooks] - signal, onProgress, wcs, second
 */
export async function runNode(view, spec, hooks = {}) {
  const tool = TOOLS[spec.tool];
  if (!tool) throw new PipelineError('tool', `no tool ${spec.tool}`);
  if (!tool.kinds.includes(view.kind))
    throw new PipelineError(
      'kind',
      `${spec.tool} measures ${tool.kinds.join(', ')}; this is ${view.kind}`
    );
  const digest = await contentDigest(view);
  const node = {
    id: spec.id,
    tool: spec.tool,
    version: tool.version,
    params: JSON.parse(JSON.stringify(spec.params)),
    at: spec.at,
    input: {
      observation: view.id,
      digest,
      ...(spec.second ? { second: spec.second } : {}),
    },
  };
  try {
    const out = await tool.run(view, spec.params, hooks);
    return {
      ...node,
      status: 'current',
      quantities: out.quantities,
      warnings: out.warnings,
      result: out.raw,
      grid: out.grid ?? null,
      suggest: out.suggest ?? null,
      overlay: out.overlay ?? null,
    };
  } catch (err) {
    if (err?.code === 'canceled') throw err;
    return {
      ...node,
      status: 'failed',
      error: {
        code: err?.code ?? 'error',
        message: String(err?.message ?? err),
        detail: err?.detail ?? {},
      },
      quantities: [],
      warnings: [],
    };
  }
}

/**
 * A unit as the registry names it, and the factor a value takes into it: a
 * column in `1e-3 d` holds thousandths of a day. Null is not stated.
 */
function registryUnit(unit) {
  if (unit === null || unit === undefined) return { id: null, scale: 1 };
  if (unit === '') return { id: '', scale: 1 };
  // As js/observatory/units.js unitId() writes a scaled unit: a number, a
  // space, the id ("0.001 d", "1e-17 erg/s/cm2/Angstrom"), or as data do,
  // "10^-3 d". A spelling with a space in it ("solar masses") is not a number
  // first, and stays whole.
  const m = /^(\S+)\s+(.+)$/.exec(unit);
  const scale = m ? Number(m[1].replace(/^10\^/, '1e')) : NaN;
  if (m && Number.isFinite(scale) && scale > 0)
    return { id: unitIdOf(m[2]) ?? m[2], scale };
  return { id: unitIdOf(unit) ?? unit, scale: 1 };
}

/**
 * A node's result as a gravitas.artifact/1 envelope (js/platform/artifact.js,
 * PROVENANCE.md): the tool and its version as the source, the content digest
 * of the data it read, each numeric quantity in its registry unit with its
 * uncertainty and origin, and what a quantity only cites as provenance.
 *
 * KIND's three values are envelope origins already. An error the tool derived
 * from the data has the basis `data`; one it had to assume, where the data
 * carry no uncertainty, `assumed`.
 *
 * @param {object} node - From runNode
 * @returns {object} The envelope
 */
export function nodeArtifact(node) {
  const citations = [];
  const quantities = [];
  for (const x of node.quantities || []) {
    if (x.cite) citations.push(x.cite);
    if (!Number.isFinite(x.value)) continue;
    const { id: unit, scale } = registryUnit(x.unit);
    quantities.push({
      id: x.id,
      value: x.value * scale,
      unit,
      uncertainty: Number.isFinite(x.error)
        ? {
            kind: 'sigma',
            sigma: x.error * scale,
            basis: x.errorKind === KIND.ASSUMED ? 'assumed' : 'data',
          }
        : { kind: 'none' },
      origin: x.kind,
    });
  }
  return artifact({
    id: node.id,
    source: {
      kind: 'pipeline',
      id: node.tool,
      version: String(node.version),
      digest: node.input?.digest,
    },
    ...(citations.length ? { provenance: { citations } } : {}),
    quantities,
    warnings: (node.warnings || []).map(w =>
      typeof w === 'string' ? w : (w?.message ?? String(w?.code ?? w))
    ),
  });
}

/**
 * Which nodes still see the data they were computed from.
 * @param {object[]} nodes
 * @param {(at: number) => Promise<string|null>} digestAt - The content
 *   digest of the view after `at` changes, or null when there are fewer
 */
export async function staleness(nodes, digestAt) {
  const out = [];
  for (const n of nodes) {
    const d = await digestAt(n.at);
    out.push(d !== null && d === n.input.digest ? 'current' : 'stale');
  }
  return out;
}

// --- The document ------------------------------------------------------------------

const PERSISTED = [
  'id',
  'tool',
  'version',
  'params',
  'at',
  'input',
  'status',
  'quantities',
  'warnings',
  'error',
];

/**
 * A pipeline as JSON. `workspace` is the Observatory's own save of the
 * observation and its changes (js/observatory/export.js observationJson),
 * so the source travels with the pipeline and reading it back replays.
 * @param {{source: object, digest: string, workspace: string,
 *   nodes: object[], fits?: object[], methods?: string[]}} p
 */
export function pipelineJson({
  source,
  digest,
  workspace,
  nodes,
  fits = [],
  methods = [],
}) {
  const doc = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    observation: {
      id: source.id,
      title: source.title,
      source: source.source,
      retrieved: source.retrieved ?? null,
      credit: source.credit ?? null,
      license: source.license ?? null,
      digest,
    },
    nodes: nodes.map(n =>
      Object.fromEntries(
        PERSISTED.filter(k => n[k] !== undefined).map(k => [k, n[k]])
      )
    ),
    fits,
    methods,
    workspace: JSON.parse(workspace),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/**
 * Read a pipeline file, or an Observatory save (a gravitas.observation/1
 * with a workspace), which becomes a pipeline with no measurements yet.
 * @returns {{ok: true, workspaceText: string, nodes: object[], fits: object[],
 *   migrated: string|null, digest: string|null} | {ok: false, code: string,
 *   detail?: object}}
 */
export function readPipeline(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, code: 'notJson' };
  }
  if (doc?.format === 'gravitas.observation') {
    return {
      ok: true,
      workspaceText: text,
      nodes: [],
      fits: [],
      migrated: 'observation',
      digest: null,
    };
  }
  if (doc?.format !== FORMAT) return { ok: false, code: 'notPipeline' };
  if (doc.formatVersion > FORMAT_VERSION)
    return { ok: false, code: 'newer', detail: { version: doc.formatVersion } };
  if (doc.formatVersion !== FORMAT_VERSION)
    return {
      ok: false,
      code: 'unknownVersion',
      detail: { version: doc.formatVersion },
    };
  if (!doc.workspace || !Array.isArray(doc.nodes))
    return { ok: false, code: 'incomplete' };
  const nodes = [];
  for (const n of doc.nodes) {
    if (!TOOLS[n?.tool])
      return { ok: false, code: 'unknownTool', detail: { tool: n?.tool } };
    if (!Number.isInteger(n.at) || n.at < 0)
      return { ok: false, code: 'badNode', detail: { id: n.id } };
    nodes.push(n);
  }
  return {
    ok: true,
    workspaceText: JSON.stringify(doc.workspace),
    nodes,
    fits: Array.isArray(doc.fits) ? doc.fits : [],
    migrated: null,
    digest: doc.observation?.digest ?? null,
  };
}

/**
 * Whether a recomputed node gives what the saved one said: the same
 * quantities to 1e-9 of their size, the same warnings. A node saved by
 * another version of its tool is compared too, and the difference named.
 */
export function sameResult(saved, now) {
  if (saved.status === 'failed' || now.status === 'failed')
    return saved.status === now.status;
  const a = saved.quantities || [];
  const b = now.quantities || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].unit !== b[i].unit ||
      a[i].kind !== b[i].kind
    )
      return false;
    for (const k of ['value', 'error']) {
      const x = a[i][k];
      const y = b[i][k];
      if (x === undefined && y === undefined) continue;
      if (x === null || y === null) {
        if (x !== y) return false;
        continue;
      }
      if (!(Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y))))
        return false;
    }
  }
  return true;
}
