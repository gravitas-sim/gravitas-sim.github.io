// Prototype (spike): convergence diagnostics for createRun()'s ensembles, and
// the refusal rule of THRESHOLDS.md. Split R-hat (Gelman and Rubin 1992, split
// as in Vehtari et al. 2021, without rank normalization), the integrated
// autocorrelation time with Sokal's automatic window (c = 5), the effective
// sample size, and the acceptance fraction.

const { Math, Float64Array } = globalThis;

export const LIMITS = Object.freeze({
  rhat: 1.05,
  ess: 400,
  stepsPerTau: 50,
  acceptLo: 0.1,
  acceptHi: 0.9,
});

/** R-hat over sequences of equal length (already split). */
export function rhatOf(seqs) {
  const m = seqs.length;
  const n = seqs[0].length;
  if (m < 2 || n < 4) return NaN;
  const means = seqs.map(s => {
    let t = 0;
    for (let i = 0; i < n; i++) t += s[i];
    return t / n;
  });
  const vars = seqs.map((s, k) => {
    let t = 0;
    for (let i = 0; i < n; i++) t += (s[i] - means[k]) ** 2;
    return t / (n - 1);
  });
  const grand = means.reduce((x, y) => x + y, 0) / m;
  const B = (n * means.reduce((x, y) => x + (y - grand) ** 2, 0)) / (m - 1);
  const W = vars.reduce((x, y) => x + y, 0) / m;
  if (!(W > 0)) return B > 0 ? Infinity : 1;
  return Math.sqrt(((n - 1) / n) * 1 + B / n / W);
}

/**
 * Integrated autocorrelation time of several traces of one quantity, from
 * their mean autocorrelation function, Sokal's window M >= c tau.
 * @returns {{tau: number, windowReached: boolean}}
 */
export function autocorrTime(traces, c = 5) {
  const n = traces[0].length;
  const maxLag = Math.floor(n / 3);
  const centered = traces.map(s => {
    let m = 0;
    for (let i = 0; i < n; i++) m += s[i];
    m /= n;
    return Float64Array.from(s, v => v - m);
  });
  const c0 = centered.map(s => {
    let t = 0;
    for (let i = 0; i < n; i++) t += s[i] * s[i];
    return t;
  });
  if (!c0.every(v => v > 0)) return { tau: Infinity, windowReached: false };
  let tau = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    let rho = 0;
    centered.forEach((s, k) => {
      let t = 0;
      for (let i = 0; i + lag < n; i++) t += s[i] * s[i + lag];
      rho += t / c0[k];
    });
    rho /= centered.length;
    tau += 2 * rho;
    if (lag >= c * tau) return { tau: Math.max(1, tau), windowReached: true };
  }
  return { tau: Math.max(1, tau), windowReached: false };
}

const splitHalves = s => {
  const h = s.length >> 1;
  return [s.subarray(0, h), s.subarray(h, 2 * h)];
};

/** The post-burn-in trace of parameter k: walker w of ensemble E. */
function walkerTrace(run, E, w, k) {
  const out = new Float64Array(run.post);
  for (let t = 0; t < run.post; t++)
    out[t] = E.chain[(t * run.W + w) * run.d + k];
  return out;
}

/**
 * Diagnostics for every parameter, and the refusal decision.
 * @param {object} run - createRun()'s object, finished
 * @param {string[]} names
 */
export function diagnose(run, names = []) {
  const per = [];
  const reasons = [];
  let tried = 0;
  let accepted = 0;
  for (const E of run.ensembles) {
    tried += E.tried;
    accepted += E.accepted;
  }
  const acceptance = accepted / tried;
  if (!(acceptance >= LIMITS.acceptLo && acceptance <= LIMITS.acceptHi))
    reasons.push(
      `acceptance fraction ${acceptance.toFixed(2)} is outside 0.10-0.90`
    );
  for (let k = 0; k < run.d; k++) {
    const meanTraces = run.ensembles.map(E =>
      E.mean.slice(run.burn * run.d).filter((_, i) => i % run.d === k)
    );
    const rMean = rhatOf(meanTraces.flatMap(splitHalves));
    const walkerSeqs = [];
    for (const E of run.ensembles)
      for (let w = 0; w < run.W; w++)
        walkerSeqs.push(...splitHalves(walkerTrace(run, E, w, k)));
    const rWalker = rhatOf(walkerSeqs);
    const { tau, windowReached } = autocorrTime(meanTraces);
    const ess = (run.post * run.W * run.M) / tau;
    const name = names[k] ?? `x${k + 1}`;
    per.push({
      name,
      rhatEnsembles: rMean,
      rhatWalkers: rWalker,
      tau,
      ess,
      stepsPerTau: run.post / tau,
      windowReached,
    });
    if (!(rMean < LIMITS.rhat))
      reasons.push(
        `${name}: R-hat of the ensembles is ${fmt(rMean)}, not below ${LIMITS.rhat}`
      );
    if (!(rWalker < LIMITS.rhat))
      reasons.push(
        `${name}: R-hat of the walkers is ${fmt(rWalker)}, not below ${LIMITS.rhat}`
      );
    if (!(ess >= LIMITS.ess))
      reasons.push(
        `${name}: effective sample size ${fmt(ess)} is under ${LIMITS.ess}`
      );
    if (!windowReached || !(run.post >= LIMITS.stepsPerTau * tau))
      reasons.push(
        `${name}: ${run.post} steps are under ${LIMITS.stepsPerTau} autocorrelation times (${fmt(tau)})`
      );
  }
  return { acceptance, parameters: per, reasons, ok: reasons.length === 0 };
}

const fmt = v => (Number.isFinite(v) ? v.toPrecision(3) : String(v));

/** The thinned trace data a plot and its table are drawn from. */
export function traces(run, names = [], maxPoints = 200) {
  const stride = Math.max(1, Math.ceil(run.steps / maxPoints));
  return Array.from({ length: run.d }, (_, k) => ({
    name: names[k] ?? `x${k + 1}`,
    stride,
    ensembles: run.ensembles.map(E => {
      const out = [];
      for (let t = 0; t < run.steps; t += stride)
        out.push(E.mean[t * run.d + k]);
      return out;
    }),
  }));
}

/** Pooled post-burn-in draws as one Float64Array per parameter. */
export function pooled(run) {
  const n = run.M * run.post * run.W;
  const out = Array.from({ length: run.d }, () => new Float64Array(n));
  let idx = 0;
  for (const E of run.ensembles) {
    for (let r = 0; r < run.post * run.W; r++, idx++)
      for (let k = 0; k < run.d; k++) out[k][idx] = E.chain[r * run.d + k];
  }
  return out;
}

export function quantile(sorted, q) {
  const p = (sorted.length - 1) * q;
  const i = Math.floor(p);
  const f = p - i;
  return i + 1 < sorted.length
    ? sorted[i] * (1 - f) + sorted[i + 1] * f
    : sorted[i];
}

/**
 * What the sampler may say: summaries only when the diagnostics pass.
 * @returns {{status: 'ok'|'refused', reasons: string[], diagnostics, traces,
 *   summary?: object[]}}
 */
export function report(run, names = []) {
  const diagnostics = diagnose(run, names);
  const out = {
    status: diagnostics.ok ? 'ok' : 'refused',
    reasons: diagnostics.reasons,
    diagnostics,
    traces: traces(run, names),
  };
  if (!diagnostics.ok) return out;
  const draws = pooled(run);
  out.summary = draws.map((x, k) => {
    const s = Float64Array.from(x).sort();
    let m = 0;
    for (const v of x) m += v;
    m /= x.length;
    let v2 = 0;
    for (const v of x) v2 += (v - m) ** 2;
    return {
      name: names[k] ?? `x${k + 1}`,
      mean: m,
      sd: Math.sqrt(v2 / (x.length - 1)),
      q16: quantile(s, 0.16),
      q50: quantile(s, 0.5),
      q84: quantile(s, 0.84),
    };
  });
  return out;
}
