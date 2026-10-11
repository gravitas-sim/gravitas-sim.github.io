// =============================================================================
// A derived quantity as a gravitas.artifact/1 envelope
// -----------------------------------------------------------------------------
// The result of a formula is a number made from other numbers, and the record
// says so: the formula as typed and the locale it was typed in, the inputs by
// id with a digest of the values each held, and the propagation rule. The
// uncertainty, where there is one, has the basis `derived`. Nothing here
// computes; ./engine.js did, and its result is handed in.
//
// Pure apart from the hash (js/hash.js sha256Hex, so the function is async).
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { sha256Hex } from '../hash.js';
import { RULE } from './engine.js';

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
        uncertainty: Number.isFinite(sigma)
          ? { kind: 'sigma', sigma, basis: 'derived' }
          : { kind: 'none' },
        origin: 'derived',
        ...(info.unit === null ? { label: info.unitText } : {}),
      },
    ],
    warnings: info.unit === null ? [`unit:result:${info.unitText}`] : [],
  });
}
