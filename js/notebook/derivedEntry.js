// =============================================================================
// A derived quantity, kept as a notebook entry
// -----------------------------------------------------------------------------
// A student's formula over numbers already in the notebook (js/formula/): "the
// period squared over the semi-major axis cubed, from the two I measured". The
// entry is an envelope (js/formula/evidence.js) that records the formula, the
// entries and quantities it read with a digest of each, and the propagation
// rule, and is kept like a fit's: its source digest names what it was made of.
//
// A quantity with no unit recorded has none stated, and the formula language
// refuses to check what has none (a unit is never guessed); one whose envelope
// gave an interval for its uncertainty is refused rather than treated as a
// standard deviation.
//
// Pure apart from the hash. A lazy module, with the panel that uses it.
// =============================================================================

import { evaluate } from '../formula/engine.js';
import { checkCorrelations, derivationEnvelope } from '../formula/evidence.js';
import { artifactEntry } from './artifactEntry.js';
import { SOURCE } from './entry.js';

/**
 * The quantities of the notebook a formula may name, as q1, q2, ... in notebook
 * order.
 * @param {Array<object>} entries - The notebook
 * @returns {Array<{name: string, entry: object, label: string, value: number,
 *   unit: string|null, sigma: number|null, kind: string}>}
 */
export function namedQuantities(entries) {
  const out = [];
  for (const entry of entries) {
    const env = entry.snapshot?.artifact?.quantities ?? [];
    (entry.snapshot?.quantities ?? []).forEach((q, i) => {
      if (!Number.isFinite(q.value)) return;
      out.push({
        name: `q${out.length + 1}`,
        entry,
        index: i,
        label: q.label,
        value: q.value,
        unit: q.unit ? q.unit : null,
        sigma: Number.isFinite(q.uncertainty) ? q.uncertainty : null,
        kind:
          env[i]?.uncertainty?.kind ??
          (Number.isFinite(q.uncertainty) ? 'sigma' : 'none'),
        envId: env[i]?.id,
        correlatedWith: env[i]?.correlatedWith ?? [],
      });
    });
  }
  return out;
}

/**
 * The coefficients between the named quantities that their envelopes state
 * (`correlatedWith`, by quantity id within one envelope), by name, for the
 * formula engine. Two quantities of different entries are never correlated by
 * this: nothing says they share data.
 * @param {Array<object>} quantities - From namedQuantities()
 * @returns {Array<{a: string, b: string, rho: number}>}
 */
export function correlationsOf(quantities) {
  const out = [];
  for (const q of quantities)
    for (const c of q.correlatedWith ?? []) {
      const other = quantities.find(
        x => x.entry === q.entry && x.envId === c.id
      );
      if (other && q.name < other.name)
        out.push({ a: q.name, b: other.name, rho: c.rho });
    }
  return out;
}

/**
 * @param {object} a
 * @param {string} a.formula - Over the names namedQuantities() gives
 * @param {string} a.title - What the new quantity is called
 * @param {string} [a.locale] - 'en' or 'es'
 * @param {Array<object>} a.quantities - From namedQuantities()
 * @param {?object} [a.context] - Where it was made (entry.js)
 * @returns {Promise<object>} A notebook entry
 * @throws {FormulaError} When the formula is refused
 */
export async function derivedEntry({
  formula,
  title,
  locale = 'en',
  quantities,
  context = null,
}) {
  const inputs = {};
  for (const q of quantities)
    inputs[q.name] = {
      value: q.value,
      unit: q.unit,
      sigma: q.sigma,
      uncertainty:
        q.kind === 'interval'
          ? 'interval'
          : q.sigma === null
            ? 'none'
            : 'sigma',
    };
  const correlations = correlationsOf(quantities);
  const result = evaluate(formula, inputs, { locale, correlations });
  checkCorrelations(correlations, result.info.inputs);
  const envelope = await derivationEnvelope({
    id: `derived:${title}`,
    formula,
    locale,
    result,
    correlations,
    inputs: quantities.map(q => ({
      name: q.name,
      id: `${q.entry.id}#${q.index}`,
      value: q.value,
      unit: q.unit,
      sigma: q.sigma,
      digest: q.entry.snapshot?.artifact?.source?.digest,
    })),
  });
  return artifactEntry({
    source: SOURCE.DERIVED_QUANTITY,
    envelope,
    title,
    labels: { quantity: () => title, note: () => formula },
    ...(context ? { context } : {}),
  });
}
