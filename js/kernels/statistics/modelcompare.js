// =============================================================================
// Model comparison within the classes where each test is valid (Prompt 261)
// -----------------------------------------------------------------------------
// "Does the model fit, and is the more complex one worth it" has three honest
// answers, and which one applies depends on the PAIR of models, not on the
// data:
//
//   nested-regular      the simpler model is the other at a fixed value of
//                       some parameters, those parameters are free inside their
//                       space and nothing is searched: the F-test (Prompt 154)
//   nested-nonregular   nested, but a null value sits on a boundary (a zero
//                       amplitude or variance) or an extra parameter is found
//                       by a search (a period on a grid): the statistic's
//                       distribution is not an F, so its distribution under
//                       the simpler model is simulated, search included
//   non-nested          neither model contains the other: no test of nesting
//                       exists, and the answer is a penalised likelihood
//                       (AIC, AICc, BIC) with its stated limits, never evidence
//
// Leave-one-out cross-validation is valid for any pair and is the tool for
// small samples, where the criteria are refused.
//
// The caller declares three flags (nested, boundary, searched); none defaults,
// because the permissive reading is the one that produces a confident wrong
// p value. A test that does not apply is REFUSED with a code before it prints
// a number, as the F-test of Prompt 154 is.
//
// Pure and deterministic. Draws come from js/random/streams.js's `noise`
// stream (Prompt 149), one stream per draw keyed by its index, so a chunk of
// draws on a worker pool is identical to the same draws made serially. No
// clock, no unseeded generator. No sampler, no evidence, no model averaging
// (D-SAMPLER-01). See STATISTICS.md, "Model comparison II".
// =============================================================================

import { stream } from '../../random/streams.js';
import { fTest } from './compare.js';
import { sigmaOfLevel } from './intervals.js';
import { DRAW_BUDGET, StatisticsError } from './resample.js';
import { refused, allFinite, isCount } from './check.js';

const { Math, Number, Float64Array, Int32Array } = globalThis;

/** Where the criteria stop being trusted, and the draw and fold bounds. */
export const CRITERIA_LIMITS = Object.freeze({
  minN: 20,
  perParameter: 5,
  maxModels: 12,
});
export const CALIBRATION = Object.freeze({
  defaultDraws: DRAW_BUDGET.default - 1,
  maxDraws: DRAW_BUDGET.max,
});
export const LOO_LIMITS = Object.freeze({ minN: 5, maxN: 500 });

/** The three classes, the method that is valid for each and the sentence each rests on. */
export const PAIR_CLASSES = Object.freeze({
  'nested-regular': Object.freeze({
    label: 'nested and regular',
    primary: 'f-test',
    alsoValid: ['information-criteria', 'leave-one-out'],
    rests:
      'the simpler model is the larger one at fixed parameter values, those parameters are free inside their space, and none is searched',
  }),
  'nested-nonregular': Object.freeze({
    label: 'nested, with a boundary or a searched parameter',
    primary: 'simulation-calibrated',
    alsoValid: ['leave-one-out'],
    rests:
      'the statistic has no textbook distribution; its distribution under the simpler model is simulated with the search included',
  }),
  'non-nested': Object.freeze({
    label: 'non-nested',
    primary: 'information-criteria',
    alsoValid: ['leave-one-out'],
    rests:
      'neither model contains the other; a penalised likelihood ranks them and claims neither evidence nor a probability',
  }),
});

const FLAGS = ['nested', 'boundary', 'searched'];

/**
 * The class of a pair of models, from three declared flags.
 * @param {{nested: boolean, boundary: boolean, searched: boolean}} flags
 */
export function classifyPair(flags) {
  if (
    !flags ||
    typeof flags !== 'object' ||
    !FLAGS.every(f => typeof flags[f] === 'boolean')
  )
    return refused(
      'undeclared',
      'declare nested, boundary and searched, each true or false: the permissive reading is never the default'
    );
  const { nested, boundary, searched } = flags;
  const cls = !nested
    ? 'non-nested'
    : boundary || searched
      ? 'nested-nonregular'
      : 'nested-regular';
  const info = PAIR_CLASSES[cls];
  const refusedMethods = [];
  const notOffered = [];
  if (cls === 'non-nested') {
    refusedMethods.push({
      method: 'f-test',
      code: 'not-nested',
      why: 'the F-test compares a model with one nested in it; these two are not',
    });
    notOffered.push({
      method: 'simulation-calibrated',
      why: 'this kernel calibrates a statistic under a simpler model nested in the larger one',
    });
  } else if (cls === 'nested-nonregular') {
    refusedMethods.push(
      searched
        ? {
            method: 'f-test',
            code: 'searched',
            why: 'an extra parameter found by a search is not an F variable: simulate the search',
          }
        : {
            method: 'f-test',
            code: 'boundary',
            why: 'a null value on the boundary of the parameter space changes the reference distribution',
          }
    );
    notOffered.push({
      method: 'information-criteria',
      why: boundary
        ? 'a boundary breaks the asymptotics the criteria rest on'
        : 'a search over a grid costs more than the one parameter K would charge',
    });
  }
  return {
    status: 'ok',
    class: cls,
    label: info.label,
    primary: info.primary,
    alsoValid: [...info.alsoValid],
    refused: refusedMethods,
    notOffered,
    rests: info.rests,
    declared: { nested, boundary, searched },
  };
}

// ---------------------------------------------------------------------------
// Simulation-calibrated significance
// ---------------------------------------------------------------------------

function checkSeed(seed) {
  if (
    !(typeof seed === 'string' ? seed !== '' : Number.isFinite(seed)) ||
    seed === undefined
  )
    throw new StatisticsError(
      'seed',
      'a seed (a non-empty string or a number) is required: an unseeded draw would be one fixed stream for every caller'
    );
}

function checkDrawCount(draws) {
  if (!Number.isInteger(draws) || draws < 1)
    throw new StatisticsError(
      'draws',
      'the number of draws must be a whole number of at least 1'
    );
  if (draws > CALIBRATION.maxDraws)
    throw new StatisticsError(
      'budget',
      `${draws} draws is over the budget of ${CALIBRATION.maxDraws}`
    );
}

/**
 * Draws numbered `from` to `to - 1` of the statistic under the simpler model.
 * Draw i uses its own stream, keyed `seed:label:i`, so any chunk equals the
 * same indices drawn serially (the property a worker pool needs).
 * @param {{simulate: function(function(): number): number, seed: string|number,
 *   label?: string, from?: number, to: number}} args
 * @returns {{draws: Float64Array, stream: object}}
 */
export function calibrationDraws({
  simulate,
  seed,
  label = 'calibrated',
  from = 0,
  to,
}) {
  checkSeed(seed);
  if (typeof simulate !== 'function')
    throw new StatisticsError('simulate', 'simulate must be a function');
  if (!Number.isInteger(from) || from < 0 || !Number.isInteger(to) || to < from)
    throw new StatisticsError(
      'draws',
      'from and to must be whole numbers with 0 <= from <= to'
    );
  checkDrawCount(Math.max(1, to));
  const out = new Float64Array(to - from);
  for (let i = from; i < to; i++)
    out[i - from] = simulate(stream('noise', seed, label, i));
  return { draws: out, stream: stream('noise', seed, label).stream };
}

/**
 * The add-one p value from a set of simulated statistics: (1 + #{T* >= T}) /
 * (1 + B), never 0, exactly valid for exchangeable draws (Davison and Hinkley
 * 1997; North, Curtis and Sham 2002). When no draw reaches the observed value
 * the claim is p <= 1 / (1 + B).
 * @param {{observed: number, draws: ArrayLike<number>, level?: number,
 *   direction?: 'upper'|'lower'}} args
 */
export function pValueFromDraws({
  observed,
  draws,
  level,
  direction = 'upper',
}) {
  if (!Number.isFinite(observed))
    return refused('input', 'the observed statistic is not a finite number');
  const B = draws?.length ?? 0;
  if (!(B >= 1) || !isCount(B, 1))
    return refused('draws', 'no simulated statistics were given');
  if (direction !== 'upper' && direction !== 'lower')
    return refused('direction', 'direction is upper or lower');
  let bad = 0;
  let exceed = 0;
  for (let i = 0; i < B; i++) {
    const v = draws[i];
    if (!Number.isFinite(v)) bad++;
    else if (direction === 'upper' ? v >= observed : v <= observed) exceed++;
  }
  if (bad > 0)
    return {
      ...refused(
        'non-finite-draws',
        `${bad} of ${B} simulated statistics were not finite: dropping them would change the reference distribution, so no p value is given`
      ),
      nonFinite: bad,
    };
  if (level !== undefined) {
    if (!(level > 0 && level < 1))
      return refused('level', 'a level is between 0 and 1');
    if (1 / (1 + B) > level)
      return refused(
        'too-few-draws',
        `with ${B} draws the smallest p value is ${1 / (1 + B)}, above the level ${level}: more draws are needed`
      );
  }
  const p = (1 + exceed) / (1 + B);
  const atFloor = exceed === 0;
  const record = {
    status: 'ok',
    method: 'simulation-calibrated',
    observed,
    direction,
    draws: B,
    exceed,
    p,
    atFloor,
    floor: 1 / (1 + B),
    claim: atFloor ? `p <= ${1 / (1 + B)}` : `p = ${p}`,
    se: Math.sqrt((p * (1 - p)) / B),
    sigma: p >= 1 ? 0 : sigmaOfLevel(1 - p),
    sigmaIsBound: atFloor,
    assumes: [
      'the draws were made under the simpler model as fitted, with the same search the observed statistic went through',
      'the simpler model is the right null: a wrong variance or noise shape calibrates a different test',
    ],
  };
  if (level !== undefined) {
    record.level = level;
    record.significant = p <= level;
  }
  return record;
}

/**
 * Simulation-calibrated significance of a statistic that has no textbook
 * distribution (a searched or boundary alternative).
 * @param {{observed: number, simulate: function(function(): number): number,
 *   seed: string|number, label?: string, draws?: number, level?: number,
 *   direction?: 'upper'|'lower'}} args - `simulate(u)` draws one data set under
 *   the simpler model as fitted and returns the statistic, search included
 */
export function calibratedSignificance({
  observed,
  simulate,
  seed,
  label = 'calibrated',
  draws = CALIBRATION.defaultDraws,
  level,
  direction = 'upper',
}) {
  checkSeed(seed);
  checkDrawCount(draws);
  if (!Number.isFinite(observed))
    return refused('input', 'the observed statistic is not a finite number');
  if (level !== undefined && 1 / (1 + draws) > level && level > 0 && level < 1)
    return refused(
      'too-few-draws',
      `with ${draws} draws the smallest p value is ${1 / (1 + draws)}, above the level ${level}: more draws are needed`
    );
  const made = calibrationDraws({ simulate, seed, label, to: draws });
  const record = pValueFromDraws({
    observed,
    draws: made.draws,
    level,
    direction,
  });
  return record.status === 'ok' ? { ...record, stream: made.stream } : record;
}

// ---------------------------------------------------------------------------
// Information criteria
// ---------------------------------------------------------------------------

/**
 * AIC, AICc and BIC of two or more models fitted to the same n values with
 * Gaussian errors of one variance. A model is `{name, k, rss}` (the variance
 * is counted as one more parameter, K = k + 1) or `{name, K, lnL}`.
 * Reported as differences from the smallest value of each criterion; no
 * weights, no probabilities, no Bayes factor, no averaging: a difference is
 * not evidence.
 * @param {{n: number, models: object[]}} args
 */
export function informationCriteria({ n, models }) {
  if (!isCount(n, 1))
    return refused('counts', 'n must be a whole number of at least 1');
  if (
    !Array.isArray(models) ||
    models.length < 2 ||
    models.length > CRITERIA_LIMITS.maxModels
  )
    return refused(
      'models',
      `compare between 2 and ${CRITERIA_LIMITS.maxModels} models`
    );
  const rows = [];
  let searchedAny = false;
  for (const m of models) {
    let K;
    let lnL;
    if (m && m.rss !== undefined) {
      if (!isCount(m.k, 0))
        return refused('counts', 'k must be a whole number of at least 0');
      if (!Number.isFinite(m.rss) || m.rss < 0)
        return refused(
          'input',
          'a sum of squares is not a finite number, or is negative'
        );
      if (m.rss === 0)
        return refused(
          'zero-rss',
          'a perfect fit has an infinite likelihood: the criteria are undefined'
        );
      K = m.k + 1;
      lnL = -(n / 2) * (Math.log((2 * Math.PI * m.rss) / n) + 1);
    } else {
      if (!m || !isCount(m.K, 1))
        return refused(
          'counts',
          'K, the number of fitted parameters, must be a whole number of at least 1'
        );
      if (!Number.isFinite(m.lnL))
        return refused('input', 'a log-likelihood is not a finite number');
      K = m.K;
      lnL = m.lnL;
    }
    if (m.searched === true) searchedAny = true;
    rows.push({ name: m.name ?? null, K, lnL, searched: m.searched === true });
  }
  const kMax = Math.max(...rows.map(r => r.K));
  if (n < CRITERIA_LIMITS.minN || n < CRITERIA_LIMITS.perParameter * kMax)
    return refused(
      'sample-size',
      `the criteria are asymptotic: n = ${n} with at most K = ${kMax} fitted parameters is below ${CRITERIA_LIMITS.minN} values or ${CRITERIA_LIMITS.perParameter} per parameter; use leave-one-out`
    );
  for (const r of rows) {
    r.aic = -2 * r.lnL + 2 * r.K;
    r.aicc = r.aic + (2 * r.K * (r.K + 1)) / (n - r.K - 1);
    r.bic = -2 * r.lnL + r.K * Math.log(n);
  }
  const best = key => rows.reduce((a, r) => (r[key] < a[key] ? r : a));
  const preferred = {};
  for (const key of ['aic', 'aicc', 'bic']) {
    const b = best(key);
    preferred[key] = b.name ?? rows.indexOf(b);
    for (const r of rows)
      r[`d${key[0].toUpperCase()}${key.slice(1)}`] = r[key] - b[key];
  }
  const cautions = [];
  if (searchedAny)
    cautions.push(
      'searched parameter not penalised by K: a search over a grid costs more than one parameter, and no K stated here is calibrated'
    );
  return {
    status: 'ok',
    method: 'information-criteria',
    n,
    rows,
    preferred,
    disagree:
      preferred.aic !== preferred.bic ||
      preferred.aicc !== preferred.bic ||
      preferred.aic !== preferred.aicc,
    weights: null,
    evidence: null,
    cautions,
    assumes: [
      'Gaussian errors of one variance, the same data for every model',
      'a large enough sample for the asymptotic penalty (AICc is always reported)',
    ],
    limits: [
      'a difference in AIC or BIC is not evidence and BIC is not a Bayes factor',
      'no probability of a model, no weights, no model averaging',
      'a model with a searched parameter is charged one parameter for the search',
    ],
  };
}

// ---------------------------------------------------------------------------
// Leave-one-out cross-validation
// ---------------------------------------------------------------------------

/**
 * Deterministic leave-one-out cross-validation. Each model supplies
 * `fitPredict(train, test)`: fit on the rows listed in `train` (an Int32Array)
 * and return the prediction of row `test`. The score is the mean squared
 * prediction error; the others are compared with the best by the mean of the
 * paired differences of squared errors and its NAIVE standard error (the folds
 * share data, so it is too small: Bengio and Grandvalet 2004).
 * @param {{y: ArrayLike<number>, models: {name?: string,
 *   fitPredict: function(Int32Array, number): number}[]}} args
 */
export function leaveOneOut({ y, models }) {
  const n = y?.length ?? 0;
  if (n > LOO_LIMITS.maxN)
    throw new StatisticsError(
      'budget',
      `${n} rows needs ${n} fits per model: over the budget of ${LOO_LIMITS.maxN}`
    );
  if (!Array.isArray(models) || models.length < 1)
    return refused('models', 'give at least one model');
  if (n < LOO_LIMITS.minN)
    return refused(
      'sample-size',
      `leave-one-out needs at least ${LOO_LIMITS.minN} rows`
    );
  if (!allFinite(y))
    return refused('non-finite', 'an observation is NaN or infinite');
  const out = [];
  for (const m of models) {
    const residuals = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const train = new Int32Array(n - 1);
      for (let j = 0, k = 0; j < n; j++) if (j !== i) train[k++] = j;
      const pred = m.fitPredict(train, i);
      if (!Number.isFinite(pred))
        return refused(
          'non-finite',
          `the prediction of row ${i} by ${m.name ?? 'a model'} is not finite`
        );
      residuals[i] = y[i] - pred;
    }
    let s = 0;
    for (let i = 0; i < n; i++) s += residuals[i] * residuals[i];
    out.push({
      name: m.name ?? null,
      residuals,
      score: s / n,
      rmse: Math.sqrt(s / n),
    });
  }
  let bi = 0;
  for (let i = 1; i < out.length; i++) if (out[i].score < out[bi].score) bi = i;
  const against = out.map((r, i) => {
    if (i === bi) return { name: r.name, best: true };
    let sum = 0;
    let wins = 0;
    const d = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      d[j] = r.residuals[j] ** 2 - out[bi].residuals[j] ** 2;
      sum += d[j];
      if (d[j] > 0) wins++;
    }
    const mean = sum / n;
    let v = 0;
    for (let j = 0; j < n; j++) v += (d[j] - mean) ** 2;
    return {
      name: r.name,
      best: false,
      meanExtraError: mean,
      naiveSe: Math.sqrt(v / (n - 1) / n),
      rowsWhereBestWins: wins,
    };
  });
  return {
    status: 'ok',
    method: 'leave-one-out',
    n,
    models: out,
    best: out[bi].name ?? bi,
    against,
    seKind: 'naive',
    assumes: ['rows exchangeable: no dependence between neighbours'],
    limits: [
      'the standard error of a difference is naive and too small (the folds share data)',
      'with correlated rows (a time series) the held-out row is not independent of its neighbours',
    ],
  };
}

// ---------------------------------------------------------------------------
// The dispatcher
// ---------------------------------------------------------------------------

function rowsOf(label, entries) {
  return entries.map(([quantity, value, note = null]) => ({
    quantity,
    value,
    note,
    label,
  }));
}

/**
 * Name the class of a pair and run the method valid for it, refusing the rest.
 * @param {{pair: {nested: boolean, boundary: boolean, searched: boolean},
 *   n: number, models: object[], calibration?: object, loo?: object}} spec -
 *   `models` are the two models, the simpler first; each `{name, k, rss}` (or
 *   `{name, K, lnL}` for the criteria); `calibration` is the input of
 *   `calibratedSignificance`; `loo` the input of `leaveOneOut`
 */
export function compareModels(spec) {
  const cls = classifyPair(spec?.pair);
  if (cls.status !== 'ok') return cls;
  const { n, models } = spec;
  if (!Array.isArray(models) || models.length !== 2)
    return {
      ...refused('models', 'a comparison takes two models'),
      class: cls.class,
    };
  let result;
  let table;
  if (cls.class === 'nested-regular') {
    const [r, f] = models;
    result = fTest({
      rssReduced: r.rss,
      pReduced: r.k,
      rssFull: f.rss,
      pFull: f.k,
      n,
    });
    if (result.status === 'ok')
      table = rowsOf('F-test', [
        ['F', result.F],
        ['degrees of freedom', [result.d1, result.d2]],
        ['p', result.p, 'exact for nested regular models with Gaussian errors'],
      ]);
  } else if (cls.class === 'nested-nonregular') {
    if (!spec.calibration)
      result = {
        ...refused(
          'needs-simulation',
          'this pair needs a simulation-calibrated significance: supply the observed statistic and a function that draws it under the simpler model, search included'
        ),
      };
    else {
      result = calibratedSignificance(spec.calibration);
      if (result.status === 'ok')
        table = rowsOf('simulated significance', [
          ['statistic', result.observed],
          ['draws', result.draws],
          [
            result.atFloor ? 'p (bound)' : 'p',
            result.atFloor ? result.floor : result.p,
            result.atFloor ? 'p is at most this' : null,
          ],
          ['Monte Carlo standard error', result.se],
        ]);
    }
  } else {
    result = informationCriteria({ n, models });
    if (result.status === 'ok')
      table = rowsOf(
        'information criteria',
        result.rows.flatMap(r => [
          [`${r.name ?? 'model'}: dAIC`, r.dAic],
          [`${r.name ?? 'model'}: dAICc`, r.dAicc],
          [`${r.name ?? 'model'}: dBIC`, r.dBic],
        ])
      );
  }
  const out = {
    status: result.status,
    class: cls.class,
    label: cls.label,
    primary: cls.primary,
    refusedMethods: cls.refused,
    notOffered: cls.notOffered,
    result,
    table: table ?? [],
  };
  if (result.status !== 'ok') {
    out.code = result.code;
    out.why = result.why;
  }
  if (spec.loo) out.loo = leaveOneOut(spec.loo);
  return out;
}
