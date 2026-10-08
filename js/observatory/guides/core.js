// =============================================================================
// Guided investigations: what every suite shares
// -----------------------------------------------------------------------------
// A suite (js/observatory/guides/suites.js) is data: guides of steps, the
// observations they open, how each answer is worked out and how each panel of
// numbers is drawn. What this module holds is the part no suite writes for
// itself, pure and DOM-free, so the runner (js/observatory/guidePanel.js), a
// suite's reference run and its tests all use the one copy:
//
//   stepsOn        a guide's steps on a path: the introductory one, or the
//                  advanced one, which only adds steps to it
//   evaluateCheck  whether a workspace holds what a `do` step asks for: an
//                  observation open, a measurement, a fold, a fit
//   parseAnswer,   a typed number, with a decimal comma or point, and whether
//   answerMatches  it is the expected one to a tolerance
//   answerKey      every step of a suite worked out from a reference run
//   seriesOf       the x, value and uncertainty columns a view shows
// =============================================================================

import { typedNumber } from '../../numberParse.js';

export const PATHS = ['intro', 'advanced'];

/** A guide's steps on one path. */
export function stepsOn(guide, path) {
  return guide.steps.filter(s => s.path === 'both' || s.path === path);
}

/** A typed number, read under the locale's decimal mark. */
export function parseAnswer(text, locale = 'en') {
  const n = typedNumber(text, locale);
  return Number.isFinite(n) ? n : null;
}

/** Whether a typed answer is the expected one, to its tolerance. */
export function answerMatches(typed, expected, tolerance) {
  return (
    Number.isFinite(typed) &&
    Number.isFinite(expected) &&
    Math.abs(typed - expected) <= tolerance + 1e-9 * Math.abs(expected)
  );
}

const within = (v, [lo, hi]) =>
  Number.isFinite(v) && v >= lo - 1e-12 && v <= hi + 1e-12;

/** A dotted path into an object: `stellarRadius.value`. */
const at = (o, path) =>
  path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);

/** A fit document's value of a fitted or derived quantity. */
export function fitValue(doc, name) {
  const fit = doc?.results?.fit;
  const p =
    fit?.parameters?.find(q => q.name === name) ??
    fit?.derived?.find(q => q.name === name);
  return p && Number.isFinite(p.value) ? p.value : null;
}

/**
 * Does the workspace hold what a `do` step asks for? Pure, on plain data.
 *
 *   opened    the target's observation is the one open
 *   folded    it is, and folded at a period in range
 *   measured  a current measurement node of the tool, with the params asked
 *             for, on the target, gives a quantity in range
 *   fitted    a fit of the target, with each setting (a dotted path into the
 *             fit's settings) in range, gives a parameter or derived value in
 *             range
 *   changed   the target is open with a change of the kind asked for: a
 *             derived column made of the columns named, a derived distance
 *             on the sky, or a crop of the column named whose ends are each
 *             in range
 *
 * A measured check's `params` name dotted paths too (`model.where.feh`).
 * @param {object} check - The step's check
 * @param {{source?: object, changes?: object[], nodes?: object[],
 *   fits?: object[]}} w - The workspace
 * @param {object} targets - The suite's TARGETS
 * @returns {{ok: true, evidence: object|null, value: number|null} |
 *   {ok: false, why: string, vars?: object}}
 */
export function evaluateCheck(check, w, targets) {
  const id = targets[check.target]?.observation;
  if (check.kind === 'opened') {
    return w.source?.id === id
      ? { ok: true, evidence: null, value: null }
      : { ok: false, why: 'notOpened' };
  }
  if (check.kind === 'folded') {
    if (w.source?.id !== id) return { ok: false, why: 'notOpened' };
    const fold = [...(w.changes || [])].reverse().find(c => c.op === 'fold');
    if (!fold) return { ok: false, why: 'noFold' };
    return within(fold.period, check.period)
      ? { ok: true, evidence: fold, value: fold.period }
      : { ok: false, why: 'foldPeriod', vars: { value: fold.period } };
  }
  if (check.kind === 'measured') {
    const mine = (w.nodes || []).filter(
      n =>
        n.tool === check.tool &&
        n.status === 'current' &&
        n.input?.observation === id &&
        Object.entries(check.params || {}).every(
          ([k, v]) => at(n.params || {}, k) === v
        )
    );
    if (!mine.length) return { ok: false, why: 'noMeasurement' };
    const n = mine.at(-1);
    const v = n.quantities.find(q => q.id === check.quantity)?.value;
    return within(v, check.within)
      ? { ok: true, evidence: n, value: v }
      : { ok: false, why: 'outside', vars: { value: v } };
  }
  if (check.kind === 'fitted') {
    const mine = (w.fits || []).filter(
      d =>
        d.data?.observation === id &&
        (!check.model || d.model?.id === check.model)
    );
    if (!mine.length) return { ok: false, why: 'noFit' };
    const settled = mine.filter(d =>
      Object.entries(check.settings || {}).every(([path, range]) =>
        within(at(d.settings || {}, path), range)
      )
    );
    if (!settled.length) return { ok: false, why: 'fitSettings' };
    const d = settled.at(-1);
    const v = fitValue(d, check.parameter);
    return within(v, check.within)
      ? { ok: true, evidence: d, value: v }
      : { ok: false, why: 'outside', vars: { value: v } };
  }
  if (check.kind === 'changed') {
    if (w.source?.id !== id) return { ok: false, why: 'notOpened' };
    const found = [...(w.changes || [])]
      .reverse()
      .find(c => c.op === check.op && changeMatches(c, check));
    if (!found) return { ok: false, why: 'noChange' };
    return { ok: true, evidence: found, value: null };
  }
  return { ok: false, why: 'unknown' };
}

/**
 * Whether a change is the one a check describes: a derived sum of exactly the
 * columns and factors named (in any order), a derived distance on the sky, or
 * a crop of the column named with each end in its range.
 */
function changeMatches(c, check) {
  if (c.op === 'derive' && check.terms) {
    if (!c.terms || c.terms.length !== check.terms.length) return false;
    const key = ts =>
      ts
        .map(t => `${t.column}:${t.factor}`)
        .sort()
        .join(',');
    return (
      key(c.terms) ===
      key(check.terms.map(([column, factor]) => ({ column, factor })))
    );
  }
  if (c.op === 'derive' && check.separation) return Boolean(c.separation);
  if (c.op === 'crop')
    return (
      c.column === check.column &&
      within(c.min, check.min) &&
      within(c.max, check.max)
    );
  return false;
}

/**
 * The light curve, spectrum or table a workspace view shows: its x column,
 * its value column and that column's uncertainty, where it has one, with
 * rows that are masked or not all finite left out.
 * @param {object} view - A gravitas.observation/1 after its changes
 * @param {{x?: string, y?: string}} [columns] - Other columns than the axes
 */
export function seriesOf(view, { x: xId, y: yId } = {}) {
  const col = id => view.columns.find(c => c.id === id);
  const x = col(xId ?? view.axes.x);
  const y = col(yId ?? view.axes.y);
  const e = view.columns.find(c => c.role === 'uncertainty' && c.of === y?.id);
  const masked = new Set();
  for (const m of view.masks || []) for (const r of m.rows) masked.add(r);
  const t = [];
  const f = [];
  const dy = e ? [] : null;
  for (let i = 0; i < (x?.values.length ?? 0); i++) {
    if (masked.has(i)) continue;
    const a = x.values[i];
    const b = y.values[i];
    const c = e ? e.values[i] : 1;
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(c > 0)) continue;
    t.push(a);
    f.push(b);
    if (dy) dy.push(c);
  }
  return { t, y: f, dy };
}

/**
 * The answer context a suite's ANSWERS and CORRECT functions read:
 *
 *   c.quantity(stepId, name)  a quantity of the measurement or fit that
 *                             passed that step's check, or a number of the
 *                             change that did (a crop's `min`), or null
 *   c.evidence(stepId)        that measurement node, fit document or change
 *   c.observation(target)     the target's observation, if it has been read
 *   c.pack(target)            its pack record (masks, crowding)
 *   c.series(target)          its light curve or spectrum, as seriesOf reads
 *
 * @param {{evidence: (id: string) => object|null,
 *   observation: (target: string) => object|null,
 *   values?: (id: string) => object|null}} source - Where they come from:
 *   the runner's state, or a reference run; `values` is what a reload kept
 */
export function answerContext(source) {
  const series = new Map();
  return {
    evidence: id => source.evidence(id) ?? null,
    observation: target => source.observation(target) ?? null,
    pack: target => source.observation(target)?.pack ?? null,
    series: target => {
      const o = source.observation(target);
      if (!o || o.kind === 'table' || o.kind === 'image') return null;
      if (!series.has(o)) series.set(o, seriesOf(o));
      return series.get(o);
    },
    quantity: (id, name) => {
      const e = source.evidence(id);
      if (!e) return source.values?.(id)?.[name] ?? null;
      if (e.quantities) {
        const v = e.quantities.find(q => q.id === name)?.value;
        return Number.isFinite(v) ? v : null;
      }
      if (e.op) return Number.isFinite(e[name]) ? e[name] : null;
      return fitValue(e, name);
    },
  };
}

/** The option a `choose` step accepts: an option, or null for a prediction. */
export function correctOption(suite, context, step) {
  if (step.correct === null) return null;
  if (typeof step.correct === 'string') return step.correct;
  return suite.CORRECT[step.correct.answer]?.(context, step) ?? undefined;
}

/**
 * The answer key: every step of every guide of a suite on each path, with what
 * passes it, worked out from a reference run.
 * @param {object} suite - A suite's SUITE
 * @param {{observations: object, nodes: object[], fits: object[],
 *   changes?: Record<string, object[]>}} run - Every target's observation,
 *   the measurements and fits a reader makes, and the changes a folded check
 *   sees, by target
 * @returns {Array<{guide: string, path: string, step: string, kind: string,
 *   expected: number|string|null, tolerance?: number, passes: boolean|null}>}
 *   `passes` is whether the run passes a `do` step's check
 */
export function answerKey(suite, run) {
  const rows = [];
  for (const guide of suite.GUIDES) {
    for (const p of PATHS) {
      const evidence = {};
      const context = answerContext({
        evidence: id => evidence[id],
        observation: t => run.observations[t],
      });
      for (const step of stepsOn(guide, p)) {
        const row = {
          guide: guide.id,
          path: p,
          step: step.id,
          kind: step.kind,
        };
        if (step.kind === 'do') {
          const target = step.check.target;
          const got = evaluateCheck(
            step.check,
            {
              source: run.observations[target],
              changes: run.changes?.[target] ?? [],
              nodes: run.nodes,
              fits: run.fits,
            },
            suite.TARGETS
          );
          if (got.ok) evidence[step.id] = got.evidence;
          row.passes = got.ok;
          row.expected = got.value ?? null;
        } else if (step.kind === 'answer') {
          const v = suite.ANSWERS[step.expect.answer](context, step);
          row.expected = Number.isFinite(v) ? v : null;
          row.tolerance = step.expect.tolerance;
          row.passes = null;
        } else if (step.kind === 'choose') {
          row.expected = correctOption(suite, context, step) ?? null;
          row.passes = null;
        } else {
          row.expected = null;
          row.passes = null;
        }
        rows.push(row);
      }
    }
  }
  return rows;
}

/** A key row with its numbers to six significant digits, as committed. */
export const rounded = r => ({
  ...r,
  expected:
    typeof r.expected === 'number'
      ? Number(r.expected.toPrecision(6))
      : r.expected,
});
