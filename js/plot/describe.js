// =============================================================================
// What a curve does, in words (Prompt 280)
// -----------------------------------------------------------------------------
// A deterministic description of a chart's series, computed from its data and
// written from templates in English and Spanish. The same arrays give the same
// words on every machine: nothing here reads a clock, a random stream or the
// page, and every threshold is a named constant below.
//
// The bound, which is the point of the module
// -----------------------------------------------------------------------------
// A description names SHAPES and NUMBERS. It never says what they mean. A dip
// is "a dip", not a transit, an eclipse or a planet; a repeating pattern is
// "a pattern that repeats every P", not an orbit; a step is "a step", not a
// flare. The vocabulary below has no such word, and a test greps the whole
// template set for the words a lesson uses as its answers. Every number is
// written in the style of the uncertainty contract (Prompt 150, 151): a value
// with an uncertainty is "X ± Y (from the scatter of the points)", an interval
// that is not symmetric is "X +U −L", a value with no uncertainty to state is
// written alone.
//
// It also never gives away a held prediction. A lesson step that has not yet
// revealed its result is marked (js/lesson/held.js); the caller passes
// `held: true` and the description is then only what the axes already print:
// how many points and between which values. Not a shape, not a period, not an
// extremum.
//
// What it is not: a judgement of whether a shape is real or important, a
// substitute for the table every chart can open, or a claim that anyone who
// cannot see the curve has found it sufficient. No blind or low-vision reader
// has validated it (ACCESSIBILITY.md; the evidence-status record says UNKNOWN).
// =============================================================================

import { formatNumber } from '../format.js';
import { formatUncertain } from '../platform/uncertain.js';
import { polyfit } from '../numeric/polyfit.js';

/** Every threshold the classifier uses, so a test and the document can name it. */
export const LIMITS = Object.freeze({
  minPoints: 4,
  /** A step: the split's residual over the line's, at most this. */
  stepRatio: 0.35,
  stepSides: 3,
  /** A step is at least this fraction of the range, and this many sigma. */
  stepRange: 0.4,
  stepSigma: 4,
  /** A repeating sinusoid: the fraction of variance it explains, cycles seen. */
  powerMin: 0.6,
  cyclesMin: 2,
  periodogramPoints: 400,
  frequencies: 4000,
  /** A straight trend: R squared and slope over its uncertainty. */
  trendR2: 0.8,
  trendSigma: 5,
  /** A dip or a bump: sigma of the point-to-point noise, and range fraction. */
  excursionSigma: 3,
  excursionRange: 0.1,
  runMin: 3,
  /** Dips are a pattern when their spacings agree within this fraction. */
  spacing: 0.2,
  /** The most series described; the rest are counted. */
  series: 6,
});

// Read once: under Jest every free `Math` is a lookup through the VM's global.
const { Math, Number, Float64Array, Int32Array } = globalThis;
const finite = Number.isFinite;
const sorted = a => Float64Array.from(a).sort();
const median = a => {
  const s = sorted(a);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The finite points of two arrays, in x order (ties keep their order). */
function points(x, y, sigma) {
  const rows = [];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (finite(x[i]) && finite(y[i])) rows.push(i);
  }
  rows.sort((a, b) => x[a] - x[b] || a - b);
  const useSigma = sigma && rows.every(i => finite(sigma[i]) && sigma[i] > 0);
  return {
    xs: rows.map(i => x[i]),
    ys: rows.map(i => y[i]),
    ss: useSigma ? rows.map(i => sigma[i]) : null,
  };
}

/** The sums of squares about the mean of ys[from, to), from prefix sums. */
function splitSums(ys) {
  const n = ys.length;
  const s1 = new Float64Array(n + 1);
  const s2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    s1[i + 1] = s1[i] + ys[i];
    s2[i + 1] = s2[i] + ys[i] * ys[i];
  }
  return (a, b) => {
    const m = b - a;
    const s = s1[b] - s1[a];
    return { mean: s / m, ss: Math.max(0, s2[b] - s2[a] - (s * s) / m) };
  };
}

/** A straight line through the points: slope with its uncertainty, and R squared. */
function line(xs, ys, ss) {
  const fit = polyfit(xs, ys, 1, { sigma: ss });
  if (!fit) return null;
  let sse = 0;
  let sst = 0;
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  for (let i = 0; i < ys.length; i++) {
    sse += (ys[i] - fit.at(xs[i])) ** 2;
    sst += (ys[i] - mean) ** 2;
  }
  return {
    fit,
    sse,
    sst,
    slope: fit.coefficients[1] / fit.halfWidth,
    slopeSigma: Math.sqrt(Math.max(0, fit.covariance[1][1])) / fit.halfWidth,
    r2: sst > 0 ? 1 - sse / sst : 0,
  };
}

/**
 * The best sinusoid over the series, after its mean (or a visible straight
 * trend) is taken out: the
 * frequency of the highest peak (searched on a grid, then refined), the
 * fraction of the variance it explains and its amplitude. Least squares with
 * no offset on mean-free data: for uneven sampling it is the generalised
 * periodogram, not the classical one.
 */
function sinusoid(xs, ys, trend) {
  let n = xs.length;
  let px = xs;
  const mean = ys.reduce((a, b) => a + b, 0) / n;
  let py = ys.map((v, i) => v - (trend ? trend.fit.at(xs[i]) : mean));
  if (n > LIMITS.periodogramPoints) {
    // Bin means, so the cost is bounded and the answer is the same every time.
    const m = LIMITS.periodogramPoints;
    const sx = new Float64Array(m);
    const sy = new Float64Array(m);
    const c = new Int32Array(m);
    const span = xs[n - 1] - xs[0];
    for (let i = 0; i < n; i++) {
      const k = Math.min(m - 1, Math.floor(((xs[i] - xs[0]) / span) * m));
      sx[k] += xs[i];
      sy[k] += py[i];
      c[k]++;
    }
    px = [];
    py = [];
    for (let k = 0; k < m; k++) {
      if (c[k]) {
        px.push(sx[k] / c[k]);
        py.push(sy[k] / c[k]);
      }
    }
    n = px.length;
  }
  const span = px[n - 1] - px[0];
  const gaps = [];
  for (let i = 1; i < n; i++) gaps.push(px[i] - px[i - 1]);
  const dx = median(gaps);
  if (!(span > 0) || !(dx > 0)) return null;
  const yy = py.reduce((a, v) => a + v * v, 0);
  if (!(yy > 0)) return null;
  // The three-parameter least squares of a sine, a cosine and an offset: the
  // offset keeps a part of a cycle left at the ends from pulling the period.
  const at = f => {
    let S = 0;
    let C = 0;
    let SC = 0;
    let Ss = 0;
    let Cc = 0;
    let Ys = 0;
    let Yc = 0;
    let Y1 = 0;
    for (let i = 0; i < n; i++) {
      const w = 2 * Math.PI * f * px[i];
      const s = Math.sin(w);
      const c = Math.cos(w);
      S += s * s;
      C += c * c;
      SC += s * c;
      Ss += s;
      Cc += c;
      Ys += py[i] * s;
      Yc += py[i] * c;
      Y1 += py[i];
    }
    // Cramer's rule on [[S, SC, Ss], [SC, C, Cc], [Ss, Cc, n]].
    const det3 = (a, b, c, d, e, g, h, i, j) =>
      a * (e * j - g * i) - b * (d * j - g * h) + c * (d * i - e * h);
    const det = det3(S, SC, Ss, SC, C, Cc, Ss, Cc, n);
    if (!(Math.abs(det) > 1e-12 * n * n * n)) return { gain: 0 };
    const a = det3(Ys, SC, Ss, Yc, C, Cc, Y1, Cc, n) / det;
    const b = det3(S, Ys, Ss, SC, Yc, Cc, Ss, Y1, n) / det;
    const c = det3(S, SC, Ys, SC, C, Yc, Ss, Cc, Y1) / det;
    return { gain: a * Ys + b * Yc + c * Y1, a, b };
  };
  const fLow = LIMITS.cyclesMin / span;
  const fHigh = 0.5 / dx;
  const df = Math.max(0.2 / span, (fHigh - fLow) / LIMITS.frequencies);
  let best = { gain: -1 };
  let bestF = fLow;
  for (let f = fLow; f <= fHigh; f += df) {
    const r = at(f);
    if (r.gain > best.gain) {
      best = r;
      bestF = f;
    }
  }
  // Refine between the neighbours of the best grid frequency by golden-section
  // search, to far below the frequency's own uncertainty: a coarse grid would
  // set a floor on the period's error that the stated uncertainty does not have.
  let lo = Math.max(fLow, bestF - df);
  let hi = Math.min(fHigh, bestF + df);
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let k = 0; k < 40; k++) {
    const f1 = hi - phi * (hi - lo);
    const f2 = lo + phi * (hi - lo);
    if (at(f1).gain < at(f2).gain) lo = f1;
    else hi = f2;
  }
  bestF = (lo + hi) / 2;
  const refined = at(bestF);
  if (refined.gain >= best.gain) best = refined;
  if (!(best.gain > 0)) return null;
  const amplitude = Math.hypot(best.a, best.b);
  const sigmaRes = Math.sqrt(
    Math.max(0, (yy - best.gain) / Math.max(1, n - 3))
  );
  return {
    period: 1 / bestF,
    power: best.gain / yy,
    cycles: span * bestF,
    amplitude,
    sigmaAmplitude: sigmaRes * Math.sqrt(2 / n),
    // Montgomery and O'Donoghue (1999): the frequency's one-sigma from the
    // scatter about the sinusoid; the period's follows from it.
    sigmaPeriod:
      amplitude > 0
        ? ((1 / bestF) ** 2 * Math.sqrt(6) * sigmaRes) /
          (Math.PI * span * amplitude * Math.sqrt(n))
        : 0,
  };
}

/** Runs of consecutive points on one side of the baseline, beyond a threshold. */
function runs(ys, test, minLength) {
  const out = [];
  let from = -1;
  for (let i = 0; i <= ys.length; i++) {
    const on = i < ys.length && test(ys[i]);
    if (on && from < 0) from = i;
    if (!on && from >= 0) {
      if (i - from >= minLength) out.push([from, i - 1]);
      from = -1;
    }
  }
  return out;
}

/** How many points a series has and where x begins and ends: what the axes print. */
export function span(x, y) {
  const { xs } = points(x, y, null);
  const n = xs.length;
  return n
    ? { n, shape: 'few', x0: xs[0], x1: xs[n - 1] }
    : { n, shape: 'few' };
}

/**
 * What the data of one series do, as numbers and a shape name: no words.
 * @param {ArrayLike<number>} x
 * @param {ArrayLike<number>} y
 * @param {{sigma?: ArrayLike<number>, scatter?: boolean}} [o] - `scatter`
 *   asks for the correlation of a cloud, not the shape of a curve
 * @returns {object} `shape` is one of 'few', 'constant', 'scatter', 'step',
 *   'periodic', 'trend', 'dips', 'bumps' or 'irregular'
 */
export function analyse(x, y, { sigma = null, scatter = false } = {}) {
  const { xs, ys, ss } = points(x, y, sigma);
  const n = ys.length;
  const facts = { n, shape: 'few' };
  if (!n) return facts;
  let hi = 0;
  let lo = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (ys[i] > ys[hi]) hi = i;
    if (ys[i] < ys[lo]) lo = i;
    total += ys[i];
  }
  const mean = total / n;
  const range = ys[hi] - ys[lo];
  Object.assign(facts, {
    x0: xs[0],
    x1: xs[n - 1],
    yMin: ys[lo],
    yMax: ys[hi],
    atMin: xs[lo],
    atMax: xs[hi],
    mean,
  });
  if (n < LIMITS.minPoints || !(xs[n - 1] > xs[0])) return facts;
  const sd = Math.sqrt(ys.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1));
  facts.sd = sd;
  if (range <= 1e-9 * (Math.abs(mean) || 1))
    return { ...facts, shape: 'constant' };

  const L = line(xs, ys, ss);
  if (scatter) {
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - mean);
      sxx += (xs[i] - mx) ** 2;
      syy += (ys[i] - mean) ** 2;
    }
    const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
    const out = {
      ...facts,
      shape: 'scatter',
      r,
      slope: L?.slope,
      slopeSigma: L?.slopeSigma,
    };
    if (n > 3 && Math.abs(r) < 1) {
      // Fisher's transformation: the interval is asymmetric about r.
      const z = Math.atanh(r);
      const e = 1 / Math.sqrt(n - 3);
      out.rLow = Math.tanh(z - e);
      out.rHigh = Math.tanh(z + e);
    }
    return out;
  }

  // The noise: the scatter of the point-to-point differences, which a dip, a
  // step or a trend does not inflate the way the scatter about the mean is.
  const d = [];
  for (let i = 1; i < n; i++) d.push(ys[i] - ys[i - 1]);
  const dm = median(d);
  const noise = (1.4826 * median(d.map(v => Math.abs(v - dm)))) / Math.SQRT2;
  const gaps = [];
  for (let i = 1; i < n; i++) gaps.push(xs[i] - xs[i - 1]);
  const dx = median(gaps);

  // A step: two levels fit the series far better than one straight line.
  if (n >= 2 * LIMITS.stepSides + 2 && L) {
    const sums = splitSums(ys);
    let cut = -1;
    let sse = Infinity;
    for (let k = LIMITS.stepSides; k <= n - LIMITS.stepSides; k++) {
      const a = sums(0, k);
      const b = sums(k, n);
      if (a.ss + b.ss < sse) {
        sse = a.ss + b.ss;
        cut = k;
      }
    }
    if (cut > 0) {
      const a = sums(0, cut);
      const b = sums(cut, n);
      const size = b.mean - a.mean;
      const sigmaSize =
        Math.sqrt(sse / (n - 2)) * Math.sqrt(1 / cut + 1 / (n - cut));
      if (
        sse <= LIMITS.stepRatio * L.sse &&
        Math.abs(size) >= LIMITS.stepRange * range &&
        Math.abs(size) >= LIMITS.stepSigma * sigmaSize
      ) {
        return {
          ...facts,
          shape: 'step',
          before: a.mean,
          after: b.mean,
          size,
          sigmaSize,
          at: (xs[cut - 1] + xs[cut]) / 2,
        };
      }
    }
  }

  // A pattern that repeats: a sinusoid that explains most of the variance
  // and has been seen through at least two cycles.
  if (n >= 12) {
    // A straight line is taken out only when it is there to see.
    const trend =
      L && Math.abs(L.slope) >= LIMITS.trendSigma * L.slopeSigma ? L : null;
    const s = sinusoid(xs, ys, trend);
    if (s && s.power >= LIMITS.powerMin && s.cycles >= LIMITS.cyclesMin) {
      return { ...facts, shape: 'periodic', ...s };
    }
  }

  // A straight trend.
  if (
    L &&
    L.r2 >= LIMITS.trendR2 &&
    (!(L.slopeSigma > 0) ||
      Math.abs(L.slope) >= LIMITS.trendSigma * L.slopeSigma)
  ) {
    return {
      ...facts,
      shape: 'trend',
      slope: L.slope,
      slopeSigma: L.slopeSigma,
      r2: L.r2,
    };
  }

  // Dips or bumps: excursions from the middle value that last several points.
  const base = median(ys);
  const threshold = Math.max(
    LIMITS.excursionSigma * noise,
    LIMITS.excursionRange * range
  );
  const minRun = n >= 20 ? LIMITS.runMin : 2;
  const found = sign => {
    const list = runs(ys, v => sign * (v - base) > threshold, minRun);
    return list.map(([a, b]) => {
      const inside = ys
        .slice(a, b + 1)
        .map(v => sign * (v - base))
        .sort((p, q) => q - p);
      const k = Math.min(3, inside.length);
      return {
        centre: (xs[a] + xs[b]) / 2,
        duration: xs[b] - xs[a] + dx,
        depth: inside.slice(0, k).reduce((p, q) => p + q, 0) / k,
        k,
      };
    });
  };
  const down = found(-1);
  const up = found(1);
  const peak = list => list.reduce((m, r) => Math.max(m, r.depth), 0);
  const which =
    down.length && (!up.length || peak(down) >= peak(up)) ? down : up;
  if (which.length) {
    const mine = which === down ? 'dips' : 'bumps';
    const mean2 = key => which.reduce((a, r) => a + r[key], 0) / which.length;
    const out = {
      ...facts,
      shape: mine,
      count: which.length,
      baseline: base,
      depth: mean2('depth'),
      duration: mean2('duration'),
      centre: which[0].centre,
      sigmaDepth: noise > 0 ? noise * Math.sqrt(1 / which[0].k + 1.2 / n) : 0,
    };
    if (which.length >= 3) {
      const gap = [];
      for (let i = 1; i < which.length; i++)
        gap.push(which[i].centre - which[i - 1].centre);
      const mg = gap.reduce((a, b) => a + b, 0) / gap.length;
      if (Math.max(...gap) - Math.min(...gap) <= LIMITS.spacing * mg) {
        const v = gap.reduce((a, b) => a + (b - mg) ** 2, 0) / (gap.length - 1);
        out.period = mg;
        out.sigmaPeriod = Math.sqrt(v / gap.length);
      }
    }
    return out;
  }
  return { ...facts, shape: 'irregular' };
}

// -----------------------------------------------------------------------------
// The words. English and Spanish, template for template; the Spanish is
// unreviewed by a fluent speaker. Nothing in either names what a shape means.
// -----------------------------------------------------------------------------

const WORDS = {
  en: {
    basis: 'from the scatter of the points',
    interval: '68% interval from the number of points',
    chart: l => (l ? `Chart: ${l}. ` : ''),
    axes: (y, x) => (y && x ? `${y} against ${x}. ` : ''),
    named: l => (l ? `${l}: ` : ''),
    count: (n, a, b) => `${n} points, x from ${a} to ${b}.`,
    heldNote:
      'The shape of the curve, and every number computed from it, are not described until the result of the prediction you made is shown.',
    few: 'Too few points to describe a shape.',
    extremes: (hi, ax, lo, bx) =>
      ` Highest value ${hi} at x = ${ax}; lowest ${lo} at x = ${bx}.`,
    constant: v => ` The values are constant at ${v}.`,
    step: (a, b, d, x, basis) =>
      ` A step near x = ${x}: the values change from about ${a} to about ${b}, a change of ${d}${basis}.`,
    periodic: (p, mean, amp, cycles, basis) =>
      ` A pattern that repeats about every ${p}${basis}, around a middle value of ${mean}, with a semi-amplitude of ${amp}; ${cycles} repeats in view.`,
    trendUp: (s, r2) =>
      ` The values rise steadily, by ${s} in y per unit of x (a straight-line fit, R² = ${r2}).`,
    trendDown: (s, r2) =>
      ` The values fall steadily, by ${s} in y per unit of x (a straight-line fit, R² = ${r2}).`,
    dip: (n, depth, dur, base, x, basis) =>
      n === 1
        ? ` A dip near x = ${x}: the values fall ${depth} below the usual ${base}${basis} for about ${dur} in x.`
        : ` ${n} dips, the first near x = ${x}: each falls about ${depth} below the usual ${base}${basis} and lasts about ${dur} in x.`,
    bump: (n, depth, dur, base, x, basis) =>
      n === 1
        ? ` A rise near x = ${x}: the values climb ${depth} above the usual ${base}${basis} for about ${dur} in x.`
        : ` ${n} rises, the first near x = ${x}: each climbs about ${depth} above the usual ${base}${basis} and lasts about ${dur} in x.`,
    dipsEvery: (p, basis) => ` They come about every ${p}${basis}.`,
    irregular: (mean, sd) =>
      ` No step, repeating pattern, straight trend or dip stands out; the mean is ${mean} with a scatter of ${sd}.`,
    scatter: (r, basis, rel) => ` Correlation r = ${r}${basis}: ${rel}.`,
    together: 'the two rise together',
    opposite: 'one rises as the other falls',
    none: 'the interval includes zero, so no straight-line relation stands out',
    slope: (s, basis) =>
      ` Straight-line slope ${s}${basis} in y per unit of x.`,
    more: n =>
      ` ${n} more ${n === 1 ? 'series is' : 'series are'} not described here.`,
    keys: ' Press S to hear this chart and Escape to stop; the data table holds every value.',
  },
  es: {
    basis: 'a partir de la dispersión de los puntos',
    interval: 'intervalo del 68 % a partir del número de puntos',
    chart: l => (l ? `Gráfico: ${l}. ` : ''),
    axes: (y, x) => (y && x ? `${y} frente a ${x}. ` : ''),
    named: l => (l ? `${l}: ` : ''),
    count: (n, a, b) => `${n} puntos, x de ${a} a ${b}.`,
    heldNote:
      'La forma de la curva, y todo número calculado a partir de ella, no se describen hasta que se muestre el resultado de la predicción que hiciste.',
    few: 'Hay muy pocos puntos para describir una forma.',
    extremes: (hi, ax, lo, bx) =>
      ` Valor más alto ${hi} en x = ${ax}; el más bajo ${lo} en x = ${bx}.`,
    constant: v => ` Los valores son constantes, ${v}.`,
    step: (a, b, d, x, basis) =>
      ` Un escalón cerca de x = ${x}: los valores pasan de unos ${a} a unos ${b}, un cambio de ${d}${basis}.`,
    periodic: (p, mean, amp, cycles, basis) =>
      ` Un patrón que se repite cada ${p} aproximadamente${basis}, en torno a un valor medio de ${mean}, con una semiamplitud de ${amp}; ${cycles} repeticiones a la vista.`,
    trendUp: (s, r2) =>
      ` Los valores suben de forma regular, ${s} en y por unidad de x (ajuste de una recta, R² = ${r2}).`,
    trendDown: (s, r2) =>
      ` Los valores bajan de forma regular, ${s} en y por unidad de x (ajuste de una recta, R² = ${r2}).`,
    dip: (n, depth, dur, base, x, basis) =>
      n === 1
        ? ` Una caída cerca de x = ${x}: los valores bajan ${depth} respecto al valor habitual ${base}${basis} durante unos ${dur} en x.`
        : ` ${n} caídas, la primera cerca de x = ${x}: cada una baja unos ${depth} respecto al valor habitual ${base}${basis} y dura unos ${dur} en x.`,
    bump: (n, depth, dur, base, x, basis) =>
      n === 1
        ? ` Una subida cerca de x = ${x}: los valores suben ${depth} sobre el valor habitual ${base}${basis} durante unos ${dur} en x.`
        : ` ${n} subidas, la primera cerca de x = ${x}: cada una sube unos ${depth} sobre el valor habitual ${base}${basis} y dura unos ${dur} en x.`,
    dipsEvery: (p, basis) => ` Se repiten cada ${p} aproximadamente${basis}.`,
    irregular: (mean, sd) =>
      ` No destaca ningún escalón, patrón que se repita, tendencia recta ni caída; la media es ${mean} con una dispersión de ${sd}.`,
    scatter: (r, basis, rel) => ` Correlación r = ${r}${basis}: ${rel}.`,
    together: 'las dos magnitudes suben juntas',
    opposite: 'una sube cuando la otra baja',
    none: 'el intervalo incluye el cero, así que no destaca ninguna relación recta',
    slope: (s, basis) =>
      ` Pendiente de la recta ${s}${basis} en y por unidad de x.`,
    more: n =>
      ` ${n} ${n === 1 ? 'serie más no se describe' : 'series más no se describen'} aquí.`,
    keys: ' Pulsa S para escuchar este gráfico y Escape para detenerlo; la tabla de datos contiene cada valor.',
  },
};

/** The templates themselves, for a test of their parity and their vocabulary. */
export const TEMPLATES = WORDS;

/** Every word the templates can write, for a test of what they never say. */
export const TEMPLATE_TEXT = Object.freeze(
  Object.fromEntries(
    Object.entries(WORDS).map(([lang, w]) => [
      lang,
      Object.values(w)
        .map(v => (typeof v === 'function' ? v(...Array(6).fill('·')) : v))
        .join(' '),
    ])
  )
);

/** One series' facts as a paragraph (or its held form). */
export function sentence(
  facts,
  { lang = 'en', held = false, label = '' } = {}
) {
  const w = WORDS[lang] ?? WORDS.en;
  const locale = lang;
  const num = v => formatNumber(v, { sig: 3, locale });
  const q = (value, sigma, how = w.basis) =>
    sigma > 0
      ? {
          text: formatUncertain(
            { value, uncertainty: { kind: 'sigma', sigma, basis: 'data' } },
            { locale }
          ),
          basis: ` (${how})`,
        }
      : { text: num(value), basis: '' };
  let out = w.named(label);
  if (!facts.n) return `${out}${w.count(0, '-', '-')}`;
  out += w.count(facts.n, num(facts.x0), num(facts.x1));
  if (held) return `${out} ${w.heldNote}`;
  if (facts.shape === 'few') return `${out} ${w.few}`;
  out += w.extremes(
    num(facts.yMax),
    num(facts.atMax),
    num(facts.yMin),
    num(facts.atMin)
  );
  switch (facts.shape) {
    case 'constant':
      return out + w.constant(num(facts.mean));
    case 'step': {
      const d = q(facts.size, facts.sigmaSize);
      return (
        out +
        w.step(
          num(facts.before),
          num(facts.after),
          d.text,
          num(facts.at),
          d.basis
        )
      );
    }
    case 'periodic': {
      const p = q(facts.period, facts.sigmaPeriod);
      const a = q(facts.amplitude, facts.sigmaAmplitude);
      return (
        out +
        w.periodic(
          p.text,
          num(facts.mean),
          a.text,
          formatNumber(facts.cycles, { sig: 2, locale }),
          p.basis
        )
      );
    }
    case 'trend': {
      const s = q(Math.abs(facts.slope), facts.slopeSigma);
      return (
        out +
        (facts.slope >= 0 ? w.trendUp : w.trendDown)(
          s.text + s.basis,
          num(facts.r2)
        )
      );
    }
    case 'dips':
    case 'bumps': {
      const d = q(facts.depth, facts.sigmaDepth);
      let text =
        out +
        (facts.shape === 'dips' ? w.dip : w.bump)(
          facts.count,
          d.text,
          num(facts.duration),
          num(facts.baseline),
          num(facts.centre),
          d.basis
        );
      if (facts.period) {
        const p = q(facts.period, facts.sigmaPeriod);
        text += w.dipsEvery(p.text, p.basis);
      }
      return text;
    }
    case 'scatter': {
      const r =
        facts.rLow === undefined
          ? { text: num(facts.r), basis: '' }
          : {
              text: formatUncertain(
                {
                  value: facts.r,
                  uncertainty: {
                    kind: 'interval',
                    lo: facts.rLow,
                    hi: facts.rHigh,
                  },
                },
                { locale, sig: 2 }
              ),
              basis: ` (${w.interval})`,
            };
      const zero =
        facts.rLow !== undefined && facts.rLow <= 0 && facts.rHigh >= 0;
      const rel = zero ? w.none : facts.r > 0 ? w.together : w.opposite;
      let text = out + w.scatter(r.text, r.basis, rel);
      if (facts.slope !== undefined) {
        const s = q(facts.slope, facts.slopeSigma);
        text += w.slope(s.text, s.basis);
      }
      return text;
    }
    default:
      return out + w.irregular(num(facts.mean), num(facts.sd));
  }
}

/**
 * The description of a chart.
 * @param {Array<{label?: string, x: ArrayLike<number>, y: ArrayLike<number>,
 *   sigma?: ArrayLike<number>, mode?: string, hidden?: boolean}>} series
 * @param {{lang?: string, held?: boolean, label?: string, xTitle?: string,
 *   yTitle?: string}} [o] - `held` is js/lesson/held.js's answer for the step
 * @returns {{text: string, held: boolean, lang: string, series: object[]}}
 */
export function describe(
  series,
  { lang = 'en', held = false, label = '', xTitle = '', yTitle = '' } = {}
) {
  const w = WORDS[lang] ?? WORDS.en;
  const shown = series.filter(s => !s.hidden);
  const list = shown.slice(0, LIMITS.series).map(s => {
    // A held answer is never analysed: what is not computed cannot leak.
    const facts = held
      ? span(s.x, s.y)
      : analyse(s.x, s.y, { sigma: s.sigma, scatter: s.mode === 'points' });
    return {
      label: shown.length > 1 ? String(s.label ?? '') : '',
      facts,
      text: sentence(facts, {
        lang,
        held,
        label: shown.length > 1 ? String(s.label ?? '') : '',
      }),
    };
  });
  let text =
    w.chart(label) + w.axes(yTitle, xTitle) + list.map(s => s.text).join(' ');
  if (shown.length > LIMITS.series)
    text += w.more(shown.length - LIMITS.series);
  return { text: text.trim(), held, lang, series: list };
}

/** The line about keys, for a chart that offers the sound. */
export const keysLine = lang => (WORDS[lang] ?? WORDS.en).keys;
