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

/** The derivation's rule when coefficients between inputs were used. */
export const RULE_CORRELATED = 'first-order-correlated';
import { fail } from './parse.js';

/**
 * That the coefficients given between the inputs a formula read are usable:
 * each between -1 and 1 and between two different inputs, one value for a
 * pair, and together a correlation matrix (positive semi-definite, or some
 * direction would give the result a negative variance; Cholesky, with a small
 * tolerance). Refused with `correlation` when not. The formula engine trusts
 * what it is given; this is the check the callers that take coefficients from
 * an envelope make first.
 * @param {Array<{a: string, b: string, rho: number}>} correlations - By name
 * @param {string[]} used - The inputs the formula read (info.inputs)
 * @throws {FormulaError}
 */
export function checkCorrelations(correlations, used) {
  const n = used.length;
  const seen = new Map();
  for (const { a, b, rho } of correlations) {
    if (!used.includes(a) || !used.includes(b)) continue;
    const key = [a, b].sort().join('\u0000');
    if (
      a === b ||
      !(Math.abs(rho) <= 1) ||
      (seen.has(key) && seen.get(key) !== rho)
    )
      fail('correlation', { name: `${a}, ${b}` });
    seen.set(key, rho);
  }
  const R = used.map((a, i) =>
    used.map((b, j) =>
      i === j
        ? 1
        : (correlations.find(
            c => (c.a === a && c.b === b) || (c.a === b && c.b === a)
          )?.rho ?? 0)
    )
  );
  const L = R.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = R[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      const bad = () => fail('correlation', { name: used.join(', ') });
      if (i === j) {
        if (s < -1e-9) bad();
        L[i][i] = Math.sqrt(Math.max(s, 0));
      } else if (L[j][j] > 1e-12) L[i][j] = s / L[j][j];
      else if (Math.abs(s) > 1e-9) bad();
    }
}

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
 * @param {Array<{a: string, b: string, rho: number}>} [a.correlations] - The
 *   coefficients between inputs, by name, that the result was computed with
 *   (engine.js evaluate); kept in the derivation, by input id, when the rule
 *   used them, and part of the source digest then
 * @returns {Promise<object>} The envelope
 */
export async function derivationEnvelope({
  id,
  formula,
  locale = 'en',
  result,
  inputs,
  correlations = [],
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
  const correlated = result.info.correlated;
  const rule = correlated
    ? RULE_CORRELATED
    : result.info.rule === 'first-order'
      ? RULE
      : result.info.rule;
  const idOf = new Map(read.map(r => [r.name, r.id]));
  const used_ = correlated
    ? correlations
        .filter(c => idOf.has(c.a) && idOf.has(c.b) && c.rho !== 0)
        .map(c => ({ a: idOf.get(c.a), b: idOf.get(c.b), rho: c.rho }))
    : [];
  const { info } = result;
  const sigma = result.sigma;
  return artifact({
    id,
    source: {
      kind: 'analysis',
      id: 'formula',
      version: '1',
      digest: await sha256Hex(
        JSON.stringify(
          used_.length
            ? [formula, locale, read.map(r => r.digest), used_]
            : [formula, locale, read.map(r => r.digest)]
        )
      ),
    },
    provenance: {
      derivation: {
        formula,
        locale,
        rule,
        inputs: read,
        ...(used_.length ? { correlations: used_ } : {}),
      },
    },
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
