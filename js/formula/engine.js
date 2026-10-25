// =============================================================================
// The formula language: dimension checking, evaluation and propagation
// -----------------------------------------------------------------------------
// compile(text, scope) reads a formula (./parse.js), checks it against the
// units registry before it computes anything, and returns what it will give
// and a function that gives it:
//
//   - Every sum is of one dimension, every logarithm and exponential of a
//     dimensionless number, every power's exponent a plain number the formula
//     states; a sum of a length and a time is refused, naming the
//     sub-expression, with both dimensions written in SI.
//   - The result is in a registry unit (an input's own where the formula only
//     rescales it, else the registry's unit of its dimension), flagged
//     dimensionless when it is a ratio, or has no registry unit at all (a time
//     squared per length cubed), which the caller may refuse or write as text.
//   - Uncertainty is first-order, for uncorrelated inputs with a standard
//     deviation each, or for inputs whose correlation coefficients the caller
//     gives (Prompt 151: `correlations`, from an envelope's `correlatedWith`),
//     where the cross terms 2 rho gj gk sj sk are added and the rule says so;
//     with none given the inputs are treated as independent, and the rule says
//     that: every number carries its partial derivative with respect
//     to each input, so a quantity used twice (x - x, x * x) is differentiated
//     once, correctly, and not added in quadrature as two inputs. It is not
//     propagated, and the result says why, when an input has none, when an
//     aggregate and the rest of the formula share an input (they are then
//     correlated), and it is refused when an input has an interval.
//
// min, max and mean take a column (any expression of one) and give one number,
// over the rows that are not skipped and have a value.
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

import { FormulaError, LIMITS, fail, parse } from './parse.js';
import {
  CONSTANTS,
  ZERO,
  addDim,
  halfSteps,
  isOpaque,
  isZero,
  multOf,
  parseUnitText,
  sameDim,
  scaleDim,
  showDim,
  unitFor,
} from './units.js';

export const RULE = 'first-order-uncorrelated';

/** The uncertainty states a formula refuses, and the words for each. */
const REFUSED = {
  interval: 'interval',
  'not-constrained': 'notConstrained',
  failed: 'failed',
  limit: 'limit',
};

const MATH = {
  sqrt: [Math.sqrt, v => 0.5 / Math.sqrt(v)],
  log10: [Math.log10, v => 1 / (v * Math.LN10)],
  ln: [Math.log, v => 1 / v],
  exp: [Math.exp, Math.exp],
  abs: [Math.abs, Math.sign],
  sin: [Math.sin, Math.cos],
  cos: [Math.cos, v => -Math.sin(v)],
  tan: [Math.tan, v => 1 / Math.cos(v) ** 2],
  asin: [Math.asin, v => 1 / Math.sqrt(1 - v * v)],
  acos: [Math.acos, v => -1 / Math.sqrt(1 - v * v)],
  atan: [Math.atan, v => 1 / (1 + v * v)],
};
const DEG = Math.PI / 180;
/** The functions, by name: kind, the Math entry, and whether it is in degrees. */
const FUNCS = {
  to: { kind: 'to' },
  min: { kind: 'agg' },
  max: { kind: 'agg' },
  mean: { kind: 'agg' },
  abs: { kind: 'keep', b: 'abs' },
  sqrt: { kind: 'sqrt', b: 'sqrt' },
  log10: { kind: 'plain', b: 'log10' },
  ln: { kind: 'plain', b: 'ln' },
  exp: { kind: 'plain', b: 'exp' },
};
for (const f of ['sin', 'cos', 'tan']) {
  FUNCS[f] = { kind: 'trig', b: f };
  FUNCS[`${f}d`] = { kind: 'trig', b: f, deg: true };
}
for (const f of ['asin', 'acos', 'atan']) {
  FUNCS[f] = { kind: 'inverse', b: f };
  FUNCS[`${f}d`] = { kind: 'inverse', b: f, deg: true };
}
/** The function names, for a form that lists them. */
export const FUNCTIONS = Object.freeze(Object.keys(FUNCS));
export const CONSTANT_NAMES = Object.freeze(Object.keys(CONSTANTS));

const bare = x => x.k && x.u === null && isZero(x.d) && !x.ang;

/** The value of a node that stands for a constant: no column in it. */
const fold = n => ev(n, { cols: {}, aggs: new Map() }, 0)[0];

/**
 * Check a formula and make it computable.
 *
 * @param {string} source - The formula
 * @param {{inputs: Record<string, {unit: string|null,
 *   uncertainty?: string}>}} scope - The names a formula may
 *   use: a unit as a registry id or spelling (`''` is dimensionless, null is
 *   not stated and refused) and the kind of uncertainty the input has: sigma
 *   propagates, assumed is exact, none leaves the result without one, and an
 *   interval, a limit, not-constrained or failed is refused in words
 * @param {{locale?: string}} [opts] - 'en' or 'es': how numbers are written
 * @returns {{info: object, run: Function, ast: object}} `info` is the
 *   dimension, unit, inputs and uncertainty rule; `run(data, opts)` computes
 * @throws {FormulaError}
 */
export function compile(source, scope, { locale = 'en' } = {}) {
  const ast = parse(source, locale);
  const text = n => String(source).slice(n.s, n.e);
  const aggs = [];
  const aggCount = {};

  const an = n => {
    n.in = new Set();
    switch (n.t) {
      case 'num': {
        const u = n.unit === undefined ? null : parseUnitText(n.unit);
        if (n.unit !== undefined && !u)
          fail('unit', { unit: n.unit }, n.s, n.e);
        Object.assign(n, { d: u ? u.dim : ZERO, m: n.v * (u?.mult ?? 1) });
        Object.assign(n, { ang: u?.angle ?? false, u, k: true });
        break;
      }
      case 'name':
      case 'ref': {
        if (n.t === 'name' && Object.hasOwn(CONSTANTS, n.n)) {
          const c = CONSTANTS[n.n];
          Object.assign(n, { t: 'const', d: c.dim, m: c.value, ang: false });
          Object.assign(n, {
            u: c.unit ? parseUnitText(c.unit) : null,
            k: true,
          });
          break;
        }
        const spec = Object.hasOwn(scope.inputs, n.n) && scope.inputs[n.n];
        if (!spec) {
          const known = Object.keys(scope.inputs).slice(0, 12).join(', ');
          fail('unknownId', { name: n.n, known }, n.s, n.e);
        }
        if (spec.unit === null || spec.unit === undefined)
          fail('noUnit', { name: n.n }, n.s, n.e);
        const u =
          spec.unit === ''
            ? { dim: ZERO, mult: 1, id: '', scale: 1, text: '', angle: false }
            : parseUnitText(spec.unit);
        if (!u) fail('unit', { unit: spec.unit, name: n.n }, n.s, n.e);
        const refused = REFUSED[spec.uncertainty];
        if (refused) fail(refused, { name: n.n }, n.s, n.e);
        Object.assign(n, { t: 'ref', d: u.dim, m: u.mult, ang: u.angle });
        Object.assign(n, { u, k: false, in: new Set([n.n]) });
        break;
      }
      case 'str':
        fail('string', {}, n.s, n.e);
        break;
      case 'neg':
        an(n.a);
        Object.assign(n, {
          d: n.a.d,
          ang: n.a.ang,
          u: n.a.u,
          k: n.a.k,
          in: n.a.in,
        });
        break;
      case 'bin':
        bin(n);
        break;
      default:
        call(n);
    }
    return n;
  };

  const bin = n => {
    const { a, b } = n;
    an(a);
    an(b);
    n.in = new Set([...a.in, ...b.in]);
    n.k = a.k && b.k;
    const vars = { expr: text(n), left: text(a), right: text(b) };
    if (n.o === '+' || n.o === '-') {
      if (!sameDim(a.d, b.d))
        fail(
          'dimension',
          { ...vars, op: n.o, a: showDim(a.d), b: showDim(b.d) },
          n.s,
          n.e
        );
      if (isZero(a.d) && a.ang !== b.ang) fail('angleMix', vars, n.s, n.e);
      Object.assign(n, { d: a.d, ang: a.ang, u: a.u });
      return;
    }
    // A magnitude, a logarithm or a simulation quantity may be scaled by a
    // plain number (5[mag] * log10(d / 10[pc]), the distance modulus) and by
    // nothing else; multiplied or divided by a quantity of any kind it means
    // nothing.
    if (isOpaque(a.d) || isOpaque(b.d)) {
      const scaled =
        n.o !== '^' &&
        (isOpaque(a.d) ? isZero(b.d) : n.o === '*' && isZero(a.d));
      if (!scaled) fail('opaque', vars, n.s, n.e);
    }
    if (n.o === '^') {
      const p = b.k && isZero(b.d) ? fold(b) : NaN;
      if (!Number.isFinite(p)) fail('power', { expr: text(b) }, b.s, b.e);
      const d = scaleDim(a.d, p);
      if (!halfSteps(d)) fail('fractional', { ...vars, power: p }, n.s, n.e);
      Object.assign(n, {
        d,
        p,
        ang: p === 1 && a.ang,
        u: p === 1 ? a.u : null,
      });
      return;
    }
    const mul = n.o === '*';
    const d = addDim(a.d, b.d, mul ? 1 : -1);
    const ang = mul ? a.ang !== b.ang : a.ang && !b.ang;
    Object.assign(n, { d, ang: isZero(d) && ang });
    n.u = bare(b) ? a.u : mul && bare(a) ? b.u : null;
  };

  const call = n => {
    const F = Object.hasOwn(FUNCS, n.f) && FUNCS[n.f];
    if (!F) fail('unknownFn', { name: n.f }, n.s, n.e);
    const want = F.kind === 'to' ? 2 : 1;
    if (n.args.length !== want)
      fail('arity', { fn: n.f, want, got: n.args.length }, n.s, n.e);
    const x = an(n.args[0]);
    n.in = x.in;
    n.k = x.k;
    const vars = { fn: n.f, expr: text(x), dim: showDim(x.d) };
    n.u = null;
    n.ang = false;
    n.d = ZERO;
    if (F.kind === 'to') {
      const s = n.args[1];
      const target = s.t === 'str' && parseUnitText(s.v);
      if (!target) fail('unit', { unit: s.v ?? text(s) }, s.s, s.e);
      if (!sameDim(x.d, target.dim))
        fail('conversion', { ...vars, to: showDim(target.dim) }, n.s, n.e);
      Object.assign(n, { d: x.d, ang: target.angle, u: target, to: true });
      return;
    }
    if (F.kind === 'agg') {
      Object.assign(n, { d: x.d, ang: x.ang, u: x.u, k: false });
      for (const name of x.in) aggCount[name] = (aggCount[name] ?? 0) + 1;
      n.agg = aggs.length;
      aggs.push(n);
    } else if (F.kind === 'keep')
      Object.assign(n, { d: x.d, ang: x.ang, u: x.u });
    else if (F.kind === 'sqrt') {
      if (isOpaque(x.d)) fail('opaque', { expr: text(n) }, n.s, n.e);
      n.d = scaleDim(x.d, 0.5);
      if (!halfSteps(n.d))
        fail('fractional', { ...vars, power: 0.5 }, n.s, n.e);
    } else {
      if (!isZero(x.d)) fail('dimensionless', vars, x.s, x.e);
      if (F.kind === 'trig') n.deg = !!F.deg && !x.ang;
      if (F.kind === 'inverse') {
        if (x.ang) fail('notAngle', vars, x.s, x.e);
        n.ang = true;
        n.u = parseUnitText(F.deg ? 'deg' : 'rad');
      }
    }
  };

  an(ast);

  // Which inputs are used inside an aggregate and outside every one.
  const outside = new Set();
  const walk = n => {
    if (n.t === 'ref') outside.add(n.n);
    else if (n.agg === undefined)
      for (const c of [n.a, n.b, ...(n.args ?? [])]) if (c) walk(c);
  };
  walk(ast);
  const shared =
    [...outside].some(x => aggCount[x]) ||
    Object.values(aggCount).some(c => c > 1);
  const used = [...ast.in];
  // An input taken as exact adds no variance and leaves the others' theirs.
  const lacking = used.filter(
    x => !['sigma', 'assumed'].includes(scope.inputs[x].uncertainty)
  );
  const rule = !used.length
    ? 'exact'
    : lacking.length
      ? 'none'
      : shared
        ? 'shared'
        : 'first-order';
  // [j, k, rho] for each coefficient between two inputs the formula reads.
  // Trusting: js/formula/evidence.js checkCorrelations is the check.
  const pairs = [];
  if (rule === 'first-order')
    for (const { a, b, rho } of scope.correlations ?? []) {
      const [j, k] = [used.indexOf(a), used.indexOf(b)];
      if (j >= 0 && k >= 0 && rho) pairs.push([j, k, rho]);
    }

  const r = ast;
  let unit;
  let unitText;
  let mult;
  if (r.u && (r.u.id === null || r.u.scale === 1)) {
    ({ id: unit, text: unitText, mult } = r.u);
  } else if (r.ang && isZero(r.d)) {
    [unit, unitText, mult] = ['rad', 'rad', 1];
  } else {
    unit = unitFor(r.d);
    mult = unit === null ? 1 : multOf(unit);
    unitText = unit ?? showDim(r.d);
  }
  const info = {
    unit,
    unitText,
    dimension: showDim(r.d),
    dimensionless: isZero(r.d) && !r.ang,
    angle: r.ang,
    inputs: used,
    rule,
    correlated: pairs.length > 0,
    lacking: rule === 'none' ? lacking : [],
    aggregates: aggs.length,
  };

  const run = (data, { rows, skip } = {}) =>
    execute({ ast, used, rule, aggs, mult, scope, pairs }, data, rows, skip);
  return { info, run, ast };
}

/** The dual number of a node at a row: its value and its gradient (or null). */
function ev(n, c, i) {
  const J = c.J;
  const lin = (ga, ka, gb, kb) => {
    if (!ga && !gb) return null;
    const g = new Float64Array(J);
    for (let j = 0; j < J; j++)
      g[j] = (ga ? ka * ga[j] : 0) + (gb ? kb * gb[j] : 0);
    return g;
  };
  const fin = v => (Number.isFinite(v) ? v : NaN);
  switch (n.t) {
    case 'num':
    case 'const':
      return [n.m, null];
    case 'ref': {
      const col = c.cols[n.n];
      const x = col.x[i];
      let g = null;
      if (c.prop) {
        g = new Float64Array(J);
        g[col.j] = n.m;
      }
      return [typeof x === 'number' ? x * n.m : NaN, g];
    }
    case 'neg': {
      const [v, g] = ev(n.a, c, i);
      return [-v, lin(g, -1)];
    }
    case 'bin': {
      const [x, gx] = ev(n.a, c, i);
      const [y, gy] = ev(n.b, c, i);
      if (n.o === '+') return [x + y, lin(gx, 1, gy, 1)];
      if (n.o === '-') return [x - y, lin(gx, 1, gy, -1)];
      if (n.o === '*') return [x * y, lin(gx, y, gy, x)];
      if (n.o === '/') {
        const v = fin(x / y);
        return [v, lin(gx, 1 / y, gy, -v / y)];
      }
      return [fin(x ** n.p), lin(gx, n.p * x ** (n.p - 1))];
    }
    default: {
      if (n.to) return ev(n.args[0], c, i);
      if (n.agg !== undefined) {
        const a = aggregate(n, c);
        let g = null;
        if (c.prop) {
          g = new Float64Array(J);
          g[c.U + n.agg] = 1;
        }
        return [a.v, g];
      }
      const [x0, gx] = ev(n.args[0], c, i);
      const F = FUNCS[n.f];
      const k = n.deg ? DEG : 1;
      const [f, df] = MATH[F.b];
      const x = x0 * k;
      return [fin(f(x)), lin(gx, df(x) * k)];
    }
  }
}

/** One aggregate over its rows: its value, and the variance it carries. */
function aggregate(n, c) {
  const got = c.aggs.get(n);
  if (got) return got;
  const vs = [];
  const vars = [];
  for (let i = 0; i < c.rows; i++) {
    if (c.skip?.has(i)) continue;
    const [v, g] = ev(n.args[0], c, i);
    if (!Number.isFinite(v)) continue;
    vs.push(v);
    vars.push(c.prop ? variance(g, c, i) : 0);
  }
  let v = NaN;
  let w = 0;
  if (vs.length) {
    if (n.f === 'mean') {
      v = vs.reduce((s, x) => s + x, 0) / vs.length;
      w = vars.reduce((s, x) => s + x, 0) / vs.length ** 2;
    } else {
      const at = vs.reduce(
        (k, x, j) => ((n.f === 'max' ? x > vs[k] : x < vs[k]) ? j : k),
        0
      );
      [v, w] = [vs[at], vars[at]];
    }
  }
  const out = { v, w };
  c.aggs.set(n, out);
  if (c.prop) c.aggSigma[n.agg] = Math.sqrt(w);
  return out;
}

/** The variance of a result at a row, from its gradient and the inputs' sigmas. */
function variance(g, c, i) {
  if (!g) return 0;
  let s = 0;
  for (let j = 0; j < c.U; j++) s += (g[j] * c.sg[j][i]) ** 2;
  for (let a = 0; a < c.aggSigma.length; a++)
    s += (g[c.U + a] * c.aggSigma[a]) ** 2;
  for (const [j, k, rho] of c.pairs)
    s += 2 * rho * g[j] * g[k] * c.sg[j][i] * c.sg[k][i];
  return s;
}

function execute({ ast, used, rule, aggs, mult, pairs }, data, rows, skip) {
  const first = used.length ? data?.[used[0]]?.values : null;
  const n = rows ?? first?.length ?? 1;
  if (n > LIMITS.rows) fail('rows', { max: LIMITS.rows, rows: n });
  const cols = {};
  const sg = [];
  const prop = rule === 'first-order';
  used.forEach((name, j) => {
    const d = data?.[name];
    if (!d?.values || d.values.length !== n) fail('data', { name, rows: n });
    if (prop && (!d.sigma || d.sigma.length !== n))
      fail('data', { name, rows: n });
    cols[name] = { x: d.values, j };
    sg.push(d.sigma);
  });
  const c = {
    cols,
    sg,
    prop,
    pairs,
    rows: n,
    skip,
    U: used.length,
    J: used.length + aggs.length,
    aggs: new Map(),
    aggSigma: aggs.map(() => 0),
  };
  const values = new Float64Array(n);
  const sigma = prop ? new Float64Array(n) : null;
  let domain = 0;
  for (let i = 0; i < n; i++) {
    const [v, g] = ev(ast, c, i);
    values[i] = v / mult;
    if (prop)
      sigma[i] = Number.isFinite(v) ? Math.sqrt(variance(g, c, i)) / mult : NaN;
    if (!Number.isFinite(v) && used.every(u => Number.isFinite(cols[u].x[i])))
      domain++;
  }
  return { values, sigma, domain, rows: n };
}

/**
 * One result from one number per input: the convenience a question or a
 * notebook entry uses.
 * @param {string} source - The formula
 * @param {Record<string, {value: number, unit: string|null, sigma?: number,
 *   uncertainty?: 'sigma'|'assumed'|'none'}>} inputs - By name
 * @param {{locale?: string, correlations?: Array<{a: string, b: string,
 *   rho: number}>}} [opts] - `correlations` are coefficients between inputs,
 *   by name; absent, the inputs are treated as independent
 * @returns {{value: number, sigma: number|null, info: object}}
 * @throws {FormulaError}
 */
export function evaluate(source, inputs, opts) {
  const scope = { inputs: {}, correlations: opts?.correlations };
  const data = {};
  for (const [k, v] of Object.entries(inputs)) {
    const kind = v.uncertainty ?? (Number.isFinite(v.sigma) ? 'sigma' : 'none');
    scope.inputs[k] = { unit: v.unit, uncertainty: kind };
    data[k] = {
      values: [v.value],
      sigma: kind === 'sigma' ? [v.sigma] : kind === 'assumed' ? [0] : null,
    };
  }
  const { info, run } = compile(source, scope, opts);
  const out = run(data, { rows: 1 });
  return {
    value: out.values[0],
    sigma: out.sigma ? out.sigma[0] : null,
    info,
  };
}

export { FormulaError };
