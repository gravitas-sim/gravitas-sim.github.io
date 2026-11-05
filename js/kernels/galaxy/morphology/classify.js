// =============================================================================
// Galaxy morphology kernel: the classification function (Prompt 249)
// -----------------------------------------------------------------------------
// classifyMorphology(measures, rule) applies a rule the CALLER supplies:
//   rule = { name, source, irregularAsymmetryAtLeast, smoothCompactConcentrationAtLeast, labels? }
// with a source string and NO default: a published rule's boundaries are published numbers the kernel does not
// hold. The order is asymmetry first (an asymmetric galaxy is 'irregular' whatever its concentration), then
// concentration (at least the cut is 'smooth-compact', else 'disk-like'). A measure within its own sigma of the
// boundary that decides the class returns not-constrained and names the two classes it lies between.
// measures = { concentration: {value, sigma}, asymmetry: {status, value, sigma} }. Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../../statistics/check.js';

const { Number } = globalThis;

const LABELS = Object.freeze({
  irregular: 'irregular',
  compact: 'smooth-compact',
  disk: 'disk-like',
});

export function classifyMorphology(measures, rule) {
  if (
    !rule ||
    typeof rule.source !== 'string' ||
    !rule.source.trim() ||
    !Number.isFinite(rule.irregularAsymmetryAtLeast) ||
    !Number.isFinite(rule.smoothCompactConcentrationAtLeast)
  )
    return refused(
      'missing-rule',
      'a rule {name, source, irregularAsymmetryAtLeast, smoothCompactConcentrationAtLeast} with a source string is required; the kernel holds no published boundary'
    );
  const L = { ...LABELS, ...(rule.labels ?? {}) };
  const c = measures?.concentration;
  const a = measures?.asymmetry;
  if (!c || !Number.isFinite(c.value))
    return refused('no-concentration', 'the measures carry no concentration');
  const cs = Number.isFinite(c.sigma) ? c.sigma : 0;
  const aOk = a && a.status === 'ok' && Number.isFinite(a.value);
  const as = aOk && Number.isFinite(a.sigma) ? a.sigma : 0;
  const cutA = rule.irregularAsymmetryAtLeast;
  const cutC = rule.smoothCompactConcentrationAtLeast;
  const base = { rule: rule.name ?? null, source: rule.source };
  if (aOk) {
    if (Math.abs(a.value - cutA) <= as)
      return {
        status: 'not-constrained',
        code: 'asymmetry-at-boundary',
        between: [L.irregular, a.value >= cutA ? L.disk : L.compact],
        ...base,
        why: 'the asymmetry is within one sigma of the boundary that decides irregular',
      };
    if (a.value >= cutA) return { status: 'ok', class: L.irregular, ...base };
  }
  if (Math.abs(c.value - cutC) <= cs)
    return {
      status: 'not-constrained',
      code: 'concentration-at-boundary',
      between: [L.disk, L.compact],
      ...base,
      why: 'the concentration is within one sigma of the boundary between disk-like and smooth-compact',
    };
  return {
    status: 'ok',
    class: c.value >= cutC ? L.compact : L.disk,
    ...base,
    asymmetryUsed: Boolean(aOk),
  };
}
