// =============================================================================
// A derived quantity as a gravitas.artifact/1 envelope
// -----------------------------------------------------------------------------
// The result of a formula is a number made from other numbers, and the record
// says so: the formula as typed and the locale it was typed in, the inputs by
// id with a digest of the values each held, and the propagation rule. The
// uncertainty, where there is one, has the basis `derived`; a result that is a
// limit (./engine.js evaluate) says so, in a kind a 2.0.0 reader refuses, so
// legacyView() (js/platform/artifact.js) is how to hand it to one. Nothing here
// computes; ./engine.js did, and its result is handed in.
//
// Pure apart from the hash (js/hash.js sha256Hex, so the function is async).
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { sha256Hex } from '../hash.js';
import { RULE, compile, evaluate } from './engine.js';
import { fail } from './parse.js';

/**
 * One result from one number per input, where an input's uncertainty may be
 * any kind of the artifact envelope (Prompt 150; engine.js evaluate takes
 * sigma, assumed and none, and refuses the rest in words). `model-limited`
 * propagates its `floor`, the error that bounds it. A single `limit` input,
 * with every other input exact or unstated, gives a result that is a limit:
 * the formula is evaluated at the limit and at 1/4, 1/2 and 3/4 of it, must
 * rise or fall steadily across them (a check at four points, not a proof),
 * and the bound is the input's, flipped if the formula falls. A formula that
 * turns round, a second limit, or an input with an uncertainty beside a
 * limit is refused.
 * @param {string} source - The formula
 * @param {Record<string, {value: number, unit: string|null, sigma?: number,
 *   floor?: number, bound?: 'upper'|'lower', uncertainty?: string}>} inputs
 * @param {{locale?: string}} [opts]
 * @returns {{value: number, sigma: number|null, info: object,
 *   limit?: {bound: 'upper'|'lower'}}}
 * @throws {FormulaError}
 */
export function evaluateStates(source, inputs, opts) {
  const limits = Object.entries(inputs).filter(
    ([, v]) => v.uncertainty === 'limit'
  );
  if (!limits.length) {
    const mapped = {};
    for (const [k, v] of Object.entries(inputs))
      mapped[k] =
        v.uncertainty === 'model-limited'
          ? { ...v, uncertainty: 'sigma', sigma: v.floor }
          : v;
    return evaluate(source, mapped, opts);
  }
  const [[name, lim]] = limits;
  const end = String(source).length;
  const exact = v => ['assumed', 'none', undefined].includes(v.uncertainty);
  if (
    limits.length > 1 ||
    !Object.entries(inputs).every(([k, v]) => k === name || exact(v))
  )
    fail('limitMixed', { name }, 0, end);
  // No input carries a sigma into the result: it is a limit, not a value.
  const at = factor => {
    const scope = { inputs: {} };
    const data = {};
    for (const [k, v] of Object.entries(inputs)) {
      scope.inputs[k] = { unit: v.unit, uncertainty: 'none' };
      const value = k === name ? v.value * factor : v.value;
      data[k] = { values: [value], sigma: null };
    }
    const { info, run } = compile(source, scope, opts);
    return { info, value: run(data, { rows: 1 }).values[0] };
  };
  const top = at(1);
  const path = [0.25, 0.5, 0.75].map(f => at(f).value).concat(top.value);
  const steps = path.slice(1).map((v, i) => v - path[i]);
  const up = steps.every(d => d > 0);
  if (!Number.isFinite(top.value) || !(up || steps.every(d => d < 0)))
    fail('limitNonMonotone', { name }, 0, end);
  return {
    value: top.value,
    sigma: null,
    info: top.info,
    limit: { bound: up === (lim.bound !== 'lower') ? 'upper' : 'lower' },
  };
}

/**
 * @param {object} a
 * @param {string} a.id - The envelope's id
 * @param {string} a.formula - As typed
 * @param {string} [a.locale] - 'en' or 'es'
 * @param {{value: number, sigma: number|null, info: object}} a.result - From
 *   evaluate()
 * @param {Array<{name: string, id: string, value: number, unit: string|null,
 *   sigma?: number|null, digest?: string}>} a.inputs - What the formula read.
 *   A digest the caller has (an entry's, an observation's) is kept; without
 *   one, the digest is of the value, unit and sigma written here
 * @returns {Promise<object>} The envelope
 */
export async function derivationEnvelope({
  id,
  formula,
  locale = 'en',
  result,
  inputs,
}) {
  const used = new Set(result.info.inputs);
  const read = [];
  for (const i of inputs.filter(x => used.has(x.name))) {
    read.push({
      name: i.name,
      id: i.id,
      digest:
        i.digest ??
        (await sha256Hex(
          JSON.stringify([i.id, i.value, i.unit, i.sigma ?? null])
        )),
    });
  }
  const rule = result.info.rule === 'first-order' ? RULE : result.info.rule;
  const { info } = result;
  const sigma = result.sigma;
  return artifact({
    id,
    source: {
      kind: 'analysis',
      id: 'formula',
      version: '1',
      digest: await sha256Hex(
        JSON.stringify([formula, locale, read.map(r => r.digest)])
      ),
    },
    provenance: { derivation: { formula, locale, rule, inputs: read } },
    quantities: [
      {
        id: 'result',
        value: result.value,
        unit: info.unit,
        uncertainty: result.limit
          ? { kind: 'limit', bound: result.limit.bound, basis: 'derived' }
          : Number.isFinite(sigma)
            ? { kind: 'sigma', sigma, basis: 'derived' }
            : { kind: 'none' },
        origin: 'derived',
        ...(info.unit === null ? { label: info.unitText } : {}),
      },
    ],
    warnings: info.unit === null ? [`unit:result:${info.unitText}`] : [],
  });
}
