// =============================================================================
// A model-drawn figure's declaration as an authoring rule (`ref/figure`)
// -----------------------------------------------------------------------------
// A step's `figure: {from, params, lengthUnit?, withhold?}` (js/lesson/figureSpec.js)
// names a figure that exists and gives it what it needs: the lesson's constants,
// or a recorded state with the scenario it was recorded from. Node-only, like
// variationRules.mjs: the sentences an author reads do not ship to students.
// The photograph form (`src`) is not this rule's.
// =============================================================================

import {
  FIGURES as NAMES,
  shownQuantities,
} from '../../js/lesson/figureSpec.js';
import { figureFor } from '../../js/lessonFigures.js';
import { geometryFor, lineOfSightDepth } from '../../js/observerGeometry.js';
import { SCENARIO_PRESETS } from '../../js/scenarios.js';
import { DEFAULT_SETTINGS } from '../../js/appState.js';

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
 * @param {(id: string) => ?number} [scenarioG] - The G a scenario runs under
 * @returns {string[]} Problems; none for a photograph or a sound declaration
 */
export function figureProblems(
  f,
  hasScenario = () => true,
  scenarioG = () => undefined
) {
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
    if (f.from === 'orbit') {
      if (!(p.state.G > 0))
        bad.push('figure.params.state.G is not a positive number');
      else if (hasScenario(p.scenarioId)) {
        // Where the scenario's G can be resolved, the state must carry it.
        const g = scenarioG(p.scenarioId);
        if (g !== undefined && g !== p.state.G)
          bad.push(
            `figure.params.state.G is ${p.state.G}, but scenario "${p.scenarioId}" runs under G = ${g}; the state was not recorded from it`
          );
      }
    } else if (bad.length === 0) {
      const { star, planet, observer } = p.state;
      if (!(star.r > 0 && planet.r > 0))
        bad.push('figure.params.state radii must be greater than zero');
      else if (
        lineOfSightDepth(
          { x: planet.x - star.x, y: planet.y - star.y },
          geometryFor(observer.phiDeg, observer.incDeg)
        ) <= 0
      )
        bad.push(
          'figure.params.state has the planet behind the star: there is no transit to draw'
        );
    }
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
    f.lengthUnit !== undefined &&
    !(typeof f.lengthUnit === 'string' && f.lengthUnit.length <= 12)
  )
    bad.push('figure.lengthUnit is a short string');
  return bad;
}

/** The numbers a step expects as its answer: a numeric answer, or its fields' wanted values. */
const expectedNumbers = step =>
  [step.answer, ...(step.fields || []).map(f => f.want ?? f.hint)]
    .map(v =>
      typeof v === 'string' ? Number(v.replace(/[^0-9eE+\-.]/g, '')) : v
    )
    .filter(v => Number.isFinite(v) && v !== 0);

/**
 * Words that would hand over an answer: a step's expected number equal, to
 * three figures, to a quantity the figure's words name.
 * @param {object} step - A step with a drawn figure
 * @returns {string[]} Problems
 */
export function figureLeaks(step) {
  const r = figureFor(step.figure, 'en', { keepData: true });
  if (!r.ok) return [];
  const named = shownQuantities(step.figure, r.values);
  const three = x => Number(x.toPrecision(3));
  return expectedNumbers(step).flatMap(n =>
    named
      .filter(q => three(r.values[q]) === three(n))
      .map(
        q =>
          `the figure names its ${q} (${three(r.values[q])}), which is what this step expects; list it in figure.withhold`
      )
  );
}

/**
 * Every figure finding in a catalog, in the form author:check prints.
 * @param {{investigations: Array<object>, scenarios: object, scenarioId?: Function}} inputs
 * @returns {Array<object>} Findings
 */
export function figureFindings(inputs) {
  const key = id => inputs.scenarioId?.(id) ?? id;
  const known = id => key(id) in inputs.scenarios;
  const G = id =>
    SCENARIO_PRESETS[key(id)]?.gravitational_constant ??
    DEFAULT_SETTINGS.gravitational_constant;
  const out = [];
  for (const lesson of inputs.investigations)
    lesson.steps.forEach((step, i) => {
      const problems = figureProblems(step.figure, known, G);
      if (!problems.length && step.figure?.from)
        problems.push(...figureLeaks(step));
      for (const message of problems)
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
