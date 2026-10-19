// =============================================================================
// Two estimates of one quantity, compared (Prompt 151, part C)
// -----------------------------------------------------------------------------
// "Do these two results agree?" is a question about the difference, and the
// difference's uncertainty is
//
//     Var(A - B) = Var(A) + Var(B) - 2 Cov(A, B)
//
// which is the sum in quadrature only when the two are independent. Two
// estimates made from the same data, or with the same calibration, are not:
// their errors move together, the covariance is positive, and treating them as
// independent overstates the difference's uncertainty and so understates how
// far apart they are. This takes the covariance when it is known (a stated
// covariance, a correlation coefficient, or the coefficient an envelope's
// `correlatedWith` gives between two quantities of one fit), and when it is not
// it says it assumed independence, and says so louder when the two are known to
// share their data. The significance is the difference over its sigma under the
// assumption that the errors are Gaussian, and the result carries that
// assumption with it.
//
// Pure: no DOM, no catalogs here (`describeComparison` takes the translator).
// A lazy module: nothing on a page imports it until the comparison instrument
// does.
// =============================================================================

import { formatNumber } from '../format.js';
import { formatUncertain } from '../platform/uncertain.js';

/**
 * The complementary error function: the series for small arguments and the
 * continued fraction for large ones, each to about 1e-14 relative.
 * @param {number} x
 * @returns {number} erfc(x)
 */
export function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 2) {
    let term = x;
    let sum = x;
    for (let n = 1; n < 100; n++) {
      term *= (-x * x) / n;
      sum += term / (2 * n + 1);
      if (Math.abs(term) < 1e-18) break;
    }
    return 1 - (2 / Math.sqrt(Math.PI)) * sum;
  }
  // erfc(x) = exp(-x^2)/sqrt(pi) / (x + (1/2)/(x + (2/2)/(x + (3/2)/(x + ...))))
  let t = x;
  for (let n = 80; n >= 1; n--) t = x + n / 2 / t;
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * t);
}

/**
 * The number of standard deviations a two-sided Gaussian interval of
 * confidence `level` spans on each side (0.6827 gives 1), by bisection.
 * @param {number} level - In (0, 1)
 * @returns {number} z
 */
export function zForLevel(level) {
  let [lo, hi] = [0, 40];
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (1 - erfc(mid / Math.SQRT2) < level) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The standard deviation an estimate's uncertainty stands for, or why it
 * cannot be taken as one.
 * @param {{value: number, uncertainty?: object}} q - An envelope's quantity
 * @returns {{sigma: number}|{reason: string}} `reason` is one of 'none',
 *   'asymmetric', 'level', 'limit', 'failed', 'not-constrained'
 */
export function sigmaOf(q) {
  const u = q?.uncertainty;
  const kind = u?.kind ?? 'none';
  if (kind === 'sigma' && u.sigma >= 0) return { sigma: u.sigma };
  if (kind === 'assumed') return { sigma: 0 };
  if (kind === 'model-limited' && u.floor >= 0)
    return { sigma: Math.hypot(u.floor, u.sigma ?? 0) };
  if (kind === 'interval') {
    const [plus, minus] = [u.hi - q.value, q.value - u.lo];
    if (Math.abs(plus - minus) > 1e-9 * (u.hi - u.lo))
      return { reason: 'asymmetric' };
    return u.level > 0 && u.level < 1
      ? { sigma: plus / zForLevel(u.level) }
      : { reason: 'level' };
  }
  if (['limit', 'failed', 'not-constrained'].includes(kind))
    return { reason: kind };
  return { reason: 'none' };
}

/**
 * The coefficient an envelope states between two of its quantities
 * (`correlatedWith`, read from either side), or null when it states none.
 * @param {{quantities: Array<object>}} envelope
 * @param {string} idA
 * @param {string} idB
 * @returns {?number}
 */
export function correlationBetween(envelope, idA, idB) {
  const find = (from, to) =>
    envelope.quantities
      .find(q => q.id === from)
      ?.correlatedWith?.find(c => c.id === to)?.rho;
  return find(idA, idB) ?? find(idB, idA) ?? null;
}

/**
 * Compare two estimates of one quantity.
 * @param {{value: number, uncertainty?: object}} a - An envelope's quantity
 * @param {{value: number, uncertainty?: object}} b - The other
 * @param {{covariance?: number, rho?: number,
 *   shared?: ?('data'|'calibration')}} [options] - What is known of how the two
 *   move together. `covariance` is in the quantity's units squared and wins
 *   over `rho`; `shared` says the two are known to come from the same data or
 *   calibration, whether or not a coefficient is known
 * @returns {{ok: true, difference: number, sigma: number, nSigma: number,
 *   p: number, covariance: number, independent: boolean,
 *   shared: ?string, assumptions: string[]}
 *   | {ok: false, reason: string, which?: 'a'|'b'}} `assumptions` lists
 *   'gaussian', then 'independent' or 'covariance', then 'sharedUnknown' when
 *   the two are known to share data and nothing says how
 */
export function compareEstimates(a, b, options = {}) {
  if (!Number.isFinite(a?.value) || !Number.isFinite(b?.value))
    return { ok: false, reason: 'value' };
  const sa = sigmaOf(a);
  if ('reason' in sa) return { ok: false, reason: sa.reason, which: 'a' };
  const sb = sigmaOf(b);
  if ('reason' in sb) return { ok: false, reason: sb.reason, which: 'b' };
  const { shared = null } = options;
  let cov = 0;
  let known = false;
  if (Number.isFinite(options.covariance)) {
    [cov, known] = [options.covariance, true];
  } else if (Number.isFinite(options.rho)) {
    if (Math.abs(options.rho) > 1) return { ok: false, reason: 'covariance' };
    [cov, known] = [options.rho * sa.sigma * sb.sigma, true];
  }
  if (Math.abs(cov) > sa.sigma * sb.sigma * (1 + 1e-9))
    return { ok: false, reason: 'covariance' };
  const difference = a.value - b.value;
  const variance = Math.max(sa.sigma ** 2 + sb.sigma ** 2 - 2 * cov, 0);
  const sigma = Math.sqrt(variance);
  const nSigma =
    sigma > 0 ? Math.abs(difference) / sigma : difference === 0 ? 0 : Infinity;
  const p = Number.isFinite(nSigma) ? erfc(nSigma / Math.SQRT2) : 0;
  return {
    ok: true,
    difference,
    sigma,
    nSigma,
    p,
    covariance: cov,
    independent: !known,
    shared,
    assumptions: [
      'gaussian',
      known ? 'covariance' : 'independent',
      ...(shared && !known ? ['sharedUnknown'] : []),
    ],
  };
}

/**
 * A comparison as sentences, in the reader's language: the difference with its
 * uncertainty, how many sigma that is and how often chance alone would give a
 * difference at least that large, then every assumption it rests on. Or why
 * the two cannot be compared.
 * @param {object} result - compareEstimates()'s
 * @param {(id: string, vars?: object) => string} t - The translator
 * @param {{locale?: string, unit?: string}} [options]
 * @returns {string}
 */
export function describeComparison(result, t, { locale, unit = '' } = {}) {
  if (!result.ok)
    return t(`compareW.est.refused.${result.reason}`, {
      which: result.which ? t(`compareW.est.which.${result.which}`) : '',
    });
  const u = unit ? ` ${unit}` : '';
  const diff = formatUncertain(
    {
      value: result.difference,
      uncertainty: { kind: 'sigma', sigma: result.sigma },
    },
    { locale }
  );
  const head = t('compareW.est.result', {
    diff: `${diff}${u}`,
    n: formatNumber(result.nSigma, { sig: 3, locale }),
    p:
      result.p < 1e-4 ? '< 0.0001' : formatNumber(result.p, { sig: 2, locale }),
  });
  const why = result.assumptions.map(a => t(`compareW.est.assume.${a}`));
  return [head, ...why].join(' ');
}
