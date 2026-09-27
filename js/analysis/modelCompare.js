// =============================================================================
// Which of a few named models the data prefer, and by how much
// -----------------------------------------------------------------------------
// Compares fits made by the inference core (js/inference/infer.js fitOnce) to
// one observation, with metrics a student can recompute by hand:
//
//   -2 ln L   from each fit's own residuals and the data's uncertainties,
//             sum r²/v + sum ln(2 pi v), v = sigma² + jitter²; for a fit with
//             no uncertainties, n ln(2 pi RSS / n) + n, with the noise level
//             one more fitted number
//   k         the numbers the fit chose: n minus its degrees of freedom
//   AIC       -2 ln L + 2k (Akaike 1974), AICc its small-sample correction
//             (Hurvich and Tsai 1989), and the Akaike weights (Burnham and
//             Anderson 2002, section 2.9)
//   BIC       -2 ln L + k ln n (Schwarz 1978)
//   nested    for a model that is another with parameters fixed, the
//             likelihood-ratio statistic and its chi-square p-value (Wilks
//             1938), flagged when a fixed value sits on the edge of the fuller
//             model's range, where the chi-square reference does not hold
//             (Self and Liang 1987)
//
// And beside the numbers, what the residuals of each look like: their scatter
// in units of the uncertainties, the share beyond three, a runs test of their
// signs, and their lag-one autocorrelation. A model the metrics prefer whose
// residuals still have structure is the best of a poor set, and says so.
//
// A constant is always among the models: one level for each group of the
// data. It is the "nothing here" a signal has to beat.
//
// Fits are compared only on the same rows with the same uncertainties. Two
// fits to differently masked data, or one weighted and one not, have
// likelihoods of different things, and the comparison refuses them by name.
// None of this is a probability that a model is true.
// =============================================================================

import { chiSquareSf } from './stats.js';

export const MODEL_COMPARISON = { id: 'model-comparison', version: '1.0.0' };
export const MAX_MODELS = 6;

/** A fingerprint of the rows a fit saw: which rows, their values and errors. */
export function dataKey(d) {
  let h = 0x811c9dc5;
  const mix = x => {
    const b = new Uint8Array(new Float64Array([x]).buffer);
    for (const v of b) {
      h ^= v;
      h = Math.imul(h, 0x01000193);
    }
  };
  for (const r of d.rows) mix(r);
  for (const v of d.y) mix(v);
  if (d.sigma) for (const v of d.sigma) mix(v);
  else mix(NaN);
  return `${d.rows.length}:${(h >>> 0).toString(16)}`;
}

/**
 * The constant model: a weighted mean for each group of the data (one group
 * when the data have none), as a fit result shaped like the core's.
 */
export function constantFit(d) {
  const n = d.y.length;
  const groups = d.groups || new Array(n).fill(0);
  const levels = [...new Set(groups)];
  const sum = new Map();
  for (const g of levels) sum.set(g, { w: 0, wy: 0 });
  for (let i = 0; i < n; i++) {
    const w = d.sigma ? 1 / d.sigma[i] ** 2 : 1;
    const s = sum.get(groups[i]);
    s.w += w;
    s.wy += w * d.y[i];
  }
  const residuals = new Float64Array(n);
  let chi2 = 0;
  for (let i = 0; i < n; i++) {
    const s = sum.get(groups[i]);
    residuals[i] = d.y[i] - s.wy / s.w;
    chi2 += d.sigma ? (residuals[i] / d.sigma[i]) ** 2 : residuals[i] ** 2;
  }
  return {
    status: 'ok',
    model: { id: 'constant', version: '1.0.0' },
    n,
    dof: n - levels.length,
    chi2,
    residuals,
    weighted: Boolean(d.sigma),
    scaled: false,
    nuisance: null,
    free: [],
    parameters: [],
    warnings: [],
    redNoise: null,
  };
}

/** -2 ln L of a fit, from its residuals. */
export function minusTwoLnL(fit, d) {
  const n = fit.residuals.length;
  if (!d.sigma) {
    let rss = 0;
    for (const r of fit.residuals) rss += r * r;
    return { value: n * Math.log((2 * Math.PI * rss) / n) + n, extra: 1 };
  }
  const s2 = (fit.nuisance?.jitter?.value ?? 0) ** 2;
  let out = 0;
  for (let i = 0; i < n; i++) {
    const v = d.sigma[i] ** 2 + s2;
    out += fit.residuals[i] ** 2 / v + Math.log(2 * Math.PI * v);
  }
  return { value: out, extra: 0 };
}

/**
 * What the residuals look like, ordered by x: their spread in units of the
 * uncertainty, the share beyond 3, the Wald-Wolfowitz runs test of their
 * signs (z; |z| above 2 is structure), and the lag-one autocorrelation.
 */
export function residualSummary(fit, d) {
  const n = fit.residuals.length;
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => d.x[a] - d.x[b]
  );
  const s2 = (fit.nuisance?.jitter?.value ?? 0) ** 2;
  const z = order.map(
    i => fit.residuals[i] / (d.sigma ? Math.sqrt(d.sigma[i] ** 2 + s2) : 1)
  );
  let ss = 0;
  let beyond = 0;
  for (const v of z) {
    ss += v * v;
    if (d.sigma && Math.abs(v) > 3) beyond++;
  }
  const rms = Math.sqrt(ss / n);
  // Runs of one sign.
  const signs = z.filter(v => v !== 0).map(v => v > 0);
  let runs = signs.length ? 1 : 0;
  for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) runs++;
  const np = signs.filter(Boolean).length;
  const nm = signs.length - np;
  const N = np + nm;
  let runsZ = null;
  if (np > 0 && nm > 0 && N > 2) {
    const mu = (2 * np * nm) / N + 1;
    const varR = ((mu - 1) * (mu - 2)) / (N - 1);
    runsZ = varR > 0 ? (runs - mu) / Math.sqrt(varR) : null;
  }
  let num = 0;
  let den = 0;
  const m = z.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) {
    den += (z[i] - m) ** 2;
    if (i) num += (z[i] - m) * (z[i - 1] - m);
  }
  return {
    rms: d.sigma ? rms : null,
    beyond3: d.sigma ? beyond / n : null,
    runs,
    runsZ,
    lag1: den > 0 ? num / den : null,
    beta: fit.redNoise?.beta ?? null,
  };
}

/**
 * Parameters a request fixes, and the ranges of those it frees. A parameter
 * the request does not name is free over the model's own range, as the core
 * fits it.
 */
function modesOf(request, modelParams) {
  const fixed = {};
  const free = {};
  const asked = request?.parameters || {};
  const names = new Set([
    ...modelParams.map(q => q.name),
    ...Object.keys(asked),
  ]);
  for (const name of names) {
    const p = asked[name] || {};
    if (p.mode === 'fixed') fixed[name] = p.value;
    else {
      const def = modelParams.find(q => q.name === name) || {};
      free[name] = {
        lo: p.lo ?? def.lo ?? -Infinity,
        hi: p.hi ?? def.hi ?? Infinity,
      };
    }
  }
  return { fixed, free };
}

const sameSettings = (a, b) =>
  JSON.stringify(a?.settings || {}) === JSON.stringify(b?.settings || {});

/**
 * Is `simple` the model `full` with some of its parameters fixed? If so, the
 * degrees of freedom between them, and whether a fixed value is on the edge
 * of the range the fuller model searched.
 */
export function nestedIn(simple, full, modelParams) {
  // A constant is every model here with its signal set to zero (a transit's
  // depth, an orbit's semi-amplitude), which is the edge of that parameter's
  // range: nested, and on the boundary.
  if (simple.fit.model.id === 'constant')
    return { nested: true, boundary: true, constant: true };
  if (simple.fit.model.id !== full.fit.model.id) return { nested: false };
  if (!sameSettings(simple.request, full.request)) return { nested: false };
  const a = modesOf(simple.request, modelParams);
  const b = modesOf(full.request, modelParams);
  let freed = 0;
  let boundary = false;
  for (const name of new Set([
    ...Object.keys(a.fixed),
    ...Object.keys(a.free),
  ])) {
    const inA = name in a.fixed ? 'fixed' : 'free';
    const inB = name in b.fixed ? 'fixed' : 'free';
    if (inA === 'free' && inB === 'fixed') return { nested: false };
    if (inA === 'fixed' && inB === 'fixed' && a.fixed[name] !== b.fixed[name])
      return { nested: false };
    if (inA === 'fixed' && inB === 'free') {
      const v = a.fixed[name];
      const { lo, hi } = b.free[name];
      if (!(v >= lo && v <= hi)) return { nested: false };
      if (v === lo || v === hi) boundary = true;
      freed++;
    }
  }
  return freed ? { nested: true, boundary } : { nested: false };
}

/**
 * The comparison.
 * @param {Array<{label: string, fit: object, request: object, data: object,
 *   document?: object}>} entries - Fits from the inference core, each with the
 *   request that made it, the data it saw (infer.js dataFrom) and, for the
 *   export, its gravitas.inference/1 document
 * @param {{models?: object, constant?: boolean}} [o] `models` is the core's
 *   MODELS, for parameter ranges
 * @returns {object} See ANALYSIS_LAB.md
 */
export function compareModels(entries, o = {}) {
  const refused = [];
  const warnings = [];
  const usable = [];
  let key = null;
  for (const e of entries.slice(0, MAX_MODELS)) {
    if (e.fit?.status !== 'ok') {
      refused.push({ label: e.label, reason: 'notFitted' });
      continue;
    }
    const k = dataKey(e.data);
    key ??= k;
    if (k !== key) {
      refused.push({ label: e.label, reason: 'otherData' });
      continue;
    }
    usable.push(e);
  }
  if (entries.length > MAX_MODELS)
    warnings.push({ code: 'tooManyModels', detail: { max: MAX_MODELS } });
  if (!usable.length)
    return {
      tool: MODEL_COMPARISON,
      models: [],
      nested: [],
      refused,
      warnings,
      preferred: null,
    };
  const d = usable[0].data;
  if (o.constant !== false)
    usable.unshift({
      label: 'constant',
      fit: constantFit(d),
      request: null,
      data: d,
      builtIn: true,
    });

  const rows = usable.map(e => {
    const L = minusTwoLnL(e.fit, e.data);
    const n = e.fit.residuals.length;
    const k = n - e.fit.dof + L.extra;
    const aic = L.value + 2 * k;
    const aicc = n - k - 1 > 0 ? aic + (2 * k * (k + 1)) / (n - k - 1) : null;
    const bic = L.value + k * Math.log(n);
    const params = o.models?.[e.fit.model.id]?.parameters || [];
    const { fixed } = e.request
      ? modesOf(e.request, [
          ...params,
          ...(o.models?.[e.fit.model.id]?.nuisance || []),
        ])
      : { fixed: {} };
    return {
      label: e.label,
      builtIn: Boolean(e.builtIn),
      model: e.fit.model,
      free: e.fit.free || [],
      fixed,
      n,
      k,
      chi2: e.fit.chi2,
      dof: e.fit.dof,
      reducedChi2: e.fit.dof > 0 ? e.fit.chi2 / e.fit.dof : null,
      m2lnL: L.value,
      aic,
      aicc,
      bic,
      scaled: Boolean(e.fit.scaled),
      jitter: e.fit.nuisance?.jitter?.value ?? null,
      residuals: residualSummary(e.fit, e.data),
      fitWarnings: (e.fit.warnings || []).map(w => w.code ?? w),
    };
  });
  const minAic = Math.min(...rows.map(r => r.aic));
  const minBic = Math.min(...rows.map(r => r.bic));
  const weights = rows.map(r => Math.exp(-(r.aic - minAic) / 2));
  const W = weights.reduce((a, b) => a + b, 0);
  rows.forEach((r, i) => {
    r.dAic = r.aic - minAic;
    r.dBic = r.bic - minBic;
    r.weight = weights[i] / W;
  });

  const nested = [];
  for (const a of usable)
    for (const b of usable) {
      if (a === b) continue;
      const params = [
        ...(o.models?.[b.fit.model.id]?.parameters || []),
        ...(o.models?.[b.fit.model.id]?.nuisance || []),
      ];
      const rel = nestedIn(a, b, params);
      if (!rel.nested) continue;
      const ra = rows[usable.indexOf(a)];
      const rb = rows[usable.indexOf(b)];
      const df = rb.k - ra.k;
      if (!(df > 0)) continue;
      const delta = Math.max(0, ra.m2lnL - rb.m2lnL);
      nested.push({
        simpler: ra.label,
        fuller: rb.label,
        delta,
        df,
        p: chiSquareSf(delta, df),
        boundary: rel.boundary,
      });
    }

  const byAic = rows.find(r => r.dAic === 0);
  const byBic = rows.find(r => r.dBic === 0);
  const second = rows
    .filter(r => r !== byAic)
    .reduce((m, r) => Math.min(m, r.dAic), Infinity);
  // Burnham and Anderson (2002, p. 70): within 2, both have substantial
  // support; 4 to 7, considerably less; above 10, essentially none.
  const strength =
    second < 2
      ? 'none'
      : second < 4
        ? 'weak'
        : second <= 10
          ? 'positive'
          : 'strong';

  if (byAic && byBic && byAic !== byBic)
    warnings.push({
      code: 'criteriaDisagree',
      detail: { aic: byAic.label, bic: byBic.label },
    });
  if (rows.some(r => r.scaled))
    warnings.push({ code: 'scaledErrors', detail: {} });
  if (!d.sigma) warnings.push({ code: 'unweighted', detail: {} });
  if (byAic && byAic.reducedChi2 > 2)
    warnings.push({
      code: 'poorBest',
      detail: { label: byAic.label, reducedChi2: byAic.reducedChi2 },
    });
  if (
    byAic &&
    byAic.residuals.runsZ !== null &&
    Math.abs(byAic.residuals.runsZ) > 3
  )
    warnings.push({
      code: 'structuredResiduals',
      detail: { label: byAic.label, z: byAic.residuals.runsZ },
    });
  for (const r of rows) {
    if (r.fitWarnings.includes('degenerate'))
      warnings.push({ code: 'degenerate', detail: { label: r.label } });
    if (r.fitWarnings.includes('atBound'))
      warnings.push({ code: 'atBound', detail: { label: r.label } });
  }
  if (nested.some(x => x.boundary))
    warnings.push({ code: 'boundary', detail: {} });

  return {
    tool: MODEL_COMPARISON,
    data: { rows: d.rows.length, weighted: Boolean(d.sigma), key },
    models: rows,
    nested,
    preferred: byAic
      ? { byAic: byAic.label, byBic: byBic?.label ?? null, strength }
      : null,
    refused,
    warnings,
  };
}
