// =============================================================================
// A model-drawn figure's declaration as an authoring rule (`ref/figure`)
// -----------------------------------------------------------------------------
// A step's `figure: {from, params, unit?, withhold?}` (js/lesson/figureSpec.js)
// names a figure that exists and gives it what it needs: the lesson's constants,
// or a recorded state with the scenario it was recorded from. Node-only, like
// variationRules.mjs: the sentences an author reads do not ship to students.
// The photograph form (`src`) is not this rule's.
// =============================================================================

import { FIGURES as NAMES } from '../../js/lesson/figureSpec.js';

export const FIGURE_RULE = 'ref/figure';
export const FIGURE_RULE_DESCRIPTION =
  'A figure drawn from the model names a figure that exists and gives it the numbers it needs';

const finite = v => Number.isFinite(v);
const BODY = ['x', 'y', 'vx', 'vy', 'm'];
const DISC = ['x', 'y', 'r'];

/** Each figure: its constants with their domains, and the parts of a recorded state. */
const FIGURES = {
  orbit: {
    ...NAMES.orbit,
    constants: { a: v => v > 0, e: v => v >= 0 && v < 1, omegaDeg: finite },
    required: ['a', 'e'],
    state: { primary: BODY, body: BODY },
  },
  transit: {
    ...NAMES.transit,
    constants: { k: v => v > 0 && v <= 1, b: (v, p) => v >= 0 && v < 1 + p.k },
    required: ['k', 'b'],
    state: { star: DISC, planet: DISC, observer: ['phiDeg', 'incDeg'] },
  },
};
const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * What is wrong with a step's declared figure, in words an author can act on.
 * @param {*} f - `step.figure`
 * @param {(id: string) => boolean} [hasScenario] - Whether a scenario exists
 * @returns {string[]} Problems; none for a photograph or a sound declaration
 */
export function figureProblems(f, hasScenario = () => true) {
  if (!isObject(f) || f.from === undefined) return [];
  const spec = Object.hasOwn(FIGURES, f.from) ? FIGURES[f.from] : null;
  if (!spec)
    return [
      `figure.from "${f.from}" names no figure; the figures are ${Object.keys(FIGURES).join(', ')}`,
    ];
  const bad = [];
  const p = f.params;
  if (f.src !== undefined)
    bad.push('a figure is drawn (from) or a photograph (src), not both');
  if (!isObject(p)) return [...bad, 'figure.params is missing'];
  if (p.state !== undefined) {
    if (!isObject(p.state))
      return [...bad, 'figure.params.state is not an object'];
    if (typeof p.scenarioId !== 'string' || !hasScenario(p.scenarioId))
      bad.push(
        `figure.params.scenarioId "${p.scenarioId ?? ''}" names no scenario; a recorded state says where it came from`
      );
    for (const [part, keys] of Object.entries(spec.state))
      for (const k of keys)
        if (!finite(p.state[part]?.[k]))
          bad.push(`figure.params.state.${part}.${k} is not a number`);
    if (f.from === 'orbit' && !(p.state.G > 0))
      bad.push('figure.params.state.G is not a positive number');
  } else {
    for (const k of spec.required)
      if (!finite(p[k]))
        bad.push(`figure.params.${k} is missing or not a number`);
    for (const [k, ok] of Object.entries(spec.constants))
      if (p[k] !== undefined && finite(p[k]) && !ok(p[k], p))
        bad.push(
          `figure.params.${k} = ${p[k]} is outside the range this figure can draw`
        );
    for (const k of Object.keys(p))
      if (!(k in spec.constants))
        bad.push(`figure.params.${k} is not a parameter of ${f.from}`);
  }
  if (
    f.withhold !== undefined &&
    !(
      Array.isArray(f.withhold) &&
      f.withhold.every(q => spec.quantities.includes(q))
    )
  )
    bad.push(`figure.withhold lists only ${spec.quantities.join(', ')}`);
  if (
    f.unit !== undefined &&
    !(typeof f.unit === 'string' && f.unit.length <= 12)
  )
    bad.push('figure.unit is a short string');
  return bad;
}

/**
 * Every figure finding in a catalog, in the form author:check prints.
 * @param {{investigations: Array<object>, scenarios: object, scenarioId?: Function}} inputs
 * @returns {Array<object>} Findings
 */
export function figureFindings(inputs) {
  const known = id => (inputs.scenarioId?.(id) ?? id) in inputs.scenarios;
  const out = [];
  for (const lesson of inputs.investigations)
    lesson.steps.forEach((step, i) => {
      for (const message of figureProblems(step.figure, known))
        out.push({
          level: 'error',
          rule: FIGURE_RULE,
          lesson: lesson.id,
          step: i,
          message,
        });
    });
  return out;
}
