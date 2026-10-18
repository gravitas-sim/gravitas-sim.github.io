// =============================================================================
// An uncertainty in text, and text as an uncertainty (Prompt 150)
// -----------------------------------------------------------------------------
// The two directions a person meets an uncertainty in: a quantity of an
// artifact envelope (js/platform/artifact.js) written at the precision its
// uncertainty sets, and a value typed with one read back into the envelope's
// own form. Beside the envelope, not in js/format.js: that module is a source
// of the instructor bundle, which cannot change without its passphrase, and
// nothing on a page imports this yet, so it costs no route a request until the
// first adopter (Prompt 151) does.
// =============================================================================

import {
  MINUS,
  NBSP,
  fixed,
  formatNumber,
  withUncertainty,
} from '../format.js';

/**
 * A quantity and its uncertainty as one string, the precision taken from the
 * uncertainty (Prompt 150): a sigma or the half-width of a symmetric interval
 * sets the decimals and the figures shown, an asymmetric interval writes
 * "v +p −m" at the smaller side's precision, a limit writes "< v" or "> v", a
 * model-limited value takes its floor as the sigma, and a value that carries
 * no uncertainty is written alone. A failed or unconstrained quantity is the
 * bare "-" of this module: the word for what it is belongs to the caller's
 * catalog. Which uncertainty it is (one sigma, a 68% interval) is the
 * caller's to say beside it, from `level` and `basis`.
 * @param {{value: number|null, uncertainty: object}} q - An envelope's quantity
 * @param {{sig?: number, locale?: string, method?: boolean}} [options] -
 *   `sig` is the uncertainty's significant figures, 2 by default; with
 *   `method` the result is {text, method}, where method is one of 'sigma',
 *   'half-width', 'asymmetric', 'limit', 'floor', 'exact' or the state's kind,
 *   so a caller can say how the figures were chosen
 * @returns {string|{text: string, method: string}}
 */
export function formatUncertain(q, options = {}) {
  const { sig = 2, locale, method = false } = options;
  const u = q?.uncertainty ?? { kind: 'none' };
  const value = q?.value;
  const out = (text, how) => (method ? { text, method: how } : text);
  if (!Number.isFinite(value)) return out('-', u.kind);
  if (u.kind === 'sigma' && u.sigma > 0)
    return out(withUncertainty(value, u.sigma, { sig, locale }), 'sigma');
  if (u.kind === 'model-limited' && u.floor > 0)
    return out(withUncertainty(value, u.floor, { sig, locale }), 'floor');
  if (u.kind === 'limit')
    return out(
      `${u.bound === 'lower' ? '>' : '<'}${NBSP}${formatNumber(value, { sig, locale })}`,
      'limit'
    );
  if (u.kind === 'interval' && u.hi > u.lo) {
    const plus = u.hi - value;
    const minus = value - u.lo;
    if (Math.abs(plus - minus) <= 1e-9 * (u.hi - u.lo))
      return out(
        withUncertainty(value, (u.hi - u.lo) / 2, { sig, locale }),
        'half-width'
      );
    const small = Math.min(plus, minus);
    if (small > 0) {
      const decimals = Math.max(
        0,
        -(Math.floor(Math.log10(small)) - (sig - 1))
      );
      const show = x => fixed(x, decimals, locale);
      return out(
        `${show(value)}${NBSP}+${show(plus)}${NBSP}${MINUS}${show(minus)}`,
        'asymmetric'
      );
    }
  }
  return out(
    formatNumber(value, { locale }),
    u.kind === 'none' ? 'exact' : u.kind
  );
}

/**
 * A value typed with its uncertainty, as the envelope would hold it (Prompt
 * 150): "9.81 ± 0.02" (or "+/-"), "9.81(2)" with the last digits in
 * brackets, "1.23 +0.05 -0.03", "< 3.2" and "> 3.2"; a bare number has none.
 * Every number is read by the shared reader, so the locale's decimal mark
 * and its refusals are the ones a typed answer meets. The uncertainty is
 * `assumed` in basis: it was stated, not estimated.
 * @param {string} text
 * @param {(raw: string, locale?: string) => {ok: boolean, value?: number,
 *   rest?: string}} readNumber - js/answerParse.js parseNumber
 * @param {string} [locale]
 * @returns {?{value: number, uncertainty: object}} Null when it is not one
 */
export function parseUncertain(text, readNumber, locale = 'en') {
  const raw = String(text ?? '').trim();
  const num = s => {
    const r = readNumber(s, locale);
    return r.ok && !r.rest ? r.value : NaN;
  };
  const assumed = { basis: 'assumed' };
  const limit = /^([<>])\s*(.+)$/.exec(raw);
  if (limit) {
    const value = num(limit[2]);
    return Number.isFinite(value)
      ? {
          value,
          uncertainty: {
            kind: 'limit',
            bound: limit[1] === '<' ? 'upper' : 'lower',
            ...assumed,
          },
        }
      : null;
  }
  const concise = /^(.*?\d)\((\d+)\)(.*)$/.exec(raw);
  if (concise && !concise[3].trim()) {
    const value = num(concise[1]);
    const decimal = /[.,](\d+)(?:[eE][+-]?\d+)?$/.exec(concise[1]);
    const exp = /[eE]([+-]?\d+)$/.exec(concise[1]);
    const sigma =
      Number(concise[2]) *
      10 ** (Number(exp?.[1] ?? 0) - (decimal ? decimal[1].length : 0));
    return Number.isFinite(value) && Number.isFinite(sigma)
      ? { value, uncertainty: { kind: 'sigma', sigma, ...assumed } }
      : null;
  }
  const pm = /^(.*?)\s*(?:±|\+\/-|\+-)\s*(.+)$/.exec(raw);
  if (pm) {
    const [value, sigma] = [num(pm[1]), num(pm[2])];
    return Number.isFinite(value) && sigma >= 0
      ? { value, uncertainty: { kind: 'sigma', sigma, ...assumed } }
      : null;
  }
  const asym = /^(.*?)\s+\+\s*(\S+)\s+[-\u2212]\s*(\S+)$/.exec(raw);
  if (asym) {
    const [value, plus, minus] = [num(asym[1]), num(asym[2]), num(asym[3])];
    return Number.isFinite(value) && plus >= 0 && minus >= 0
      ? {
          value,
          uncertainty: {
            kind: 'interval',
            lo: value - minus,
            hi: value + plus,
            ...assumed,
          },
        }
      : null;
  }
  const value = num(raw);
  return Number.isFinite(value)
    ? { value, uncertainty: { kind: 'none' } }
    : null;
}
