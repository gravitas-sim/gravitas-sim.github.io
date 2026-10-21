// Root finding on a bracket (Prompt 152, NUMERICS.md). Consumers: 200, 227.
// Pure: no imports, no clock, no randomness; only + - * / and abs, so the same
// f gives the same answer on every Node. f must be continuous on the bracket.
const { Math, Number } = globalThis;
const EPS = Number.EPSILON;

const notBracketed = () => new RangeError('the root is not bracketed');

/**
 * Brent's zeroin (bisection, secant and inverse quadratic interpolation).
 * Needs f(a) and f(b) of opposite sign (a zero at an end is returned as is) or
 * throws RangeError. Stops when the bracket is within 2 EPS |x| + xTol/2 of x;
 * never takes more evaluations than bisection would (maxIter).
 * @returns {{x: number, fx: number, iterations: number, converged: boolean}}
 */
export function brent(f, a, b, { xTol = 1e-12, maxIter = 100 } = {}) {
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return { x: a, fx: 0, iterations: 0, converged: true };
  if (fb === 0) return { x: b, fx: 0, iterations: 0, converged: true };
  if (!((fa < 0 && fb > 0) || (fa > 0 && fb < 0))) throw notBracketed();
  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;
  for (let i = 1; i <= maxIter; i++) {
    if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
      c = a;
      fc = fa;
      d = e = b - a;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }
    const tol = 2 * EPS * Math.abs(b) + 0.5 * xTol;
    const m = 0.5 * (c - b);
    if (Math.abs(m) <= tol || fb === 0)
      return { x: b, fx: fb, iterations: i, converged: true };
    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p;
      let q;
      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        const t = fa / fc;
        const r = fb / fc;
        p = s * (2 * m * t * (t - r) - (b - a) * (r - 1));
        q = (t - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      p = Math.abs(p);
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else d = e = m;
    } else d = e = m;
    a = b;
    fa = fb;
    b += Math.abs(d) > tol ? d : m > 0 ? tol : -tol;
    fb = f(b);
  }
  return { x: b, fx: fb, iterations: maxIter, converged: false };
}

/**
 * Newton's method with the derivative df. With `bracket: [lo, hi]` (f of
 * opposite signs there, else RangeError) a step that leaves the bracket or
 * fails to halve the last one is replaced by bisection (a step already within
 * xTol is taken as it is, whatever rounding does at the bracket's edge), so it
 * cannot diverge; without it the method is plain Newton and reports converged: false for a
 * zero or non-finite derivative or step. Stops when |dx| <= xTol (1 + |x|).
 * @returns {{x: number, fx: number, iterations: number, converged: boolean}}
 */
export function newton(
  f,
  df,
  x0,
  { bracket, xTol = 1e-12, maxIter = 100 } = {}
) {
  let x = x0;
  let lo = 0;
  let hi = 0;
  if (bracket) {
    lo = bracket[0];
    hi = bracket[1];
    const fl = f(lo);
    const fh = f(hi);
    if (fl === 0) return { x: lo, fx: 0, iterations: 0, converged: true };
    if (fh === 0) return { x: hi, fx: 0, iterations: 0, converged: true };
    if (!((fl < 0 && fh > 0) || (fl > 0 && fh < 0))) throw notBracketed();
    if (fl > 0) [lo, hi] = [hi, lo];
    if (!(x > Math.min(lo, hi) && x < Math.max(lo, hi))) x = 0.5 * (lo + hi);
  }
  let step = Infinity;
  let fx = f(x);
  for (let i = 1; i <= maxIter; i++) {
    if (fx === 0) return { x, fx, iterations: i - 1, converged: true };
    if (bracket) {
      if (fx < 0) lo = x;
      else hi = x;
    }
    const d = df(x);
    let dx = -fx / d;
    if (bracket) {
      const inside = (x + dx - lo) * (x + dx - hi) < 0;
      const small = Math.abs(dx) <= xTol * (1 + Math.abs(x));
      if (!small && !(inside && Math.abs(dx) <= 0.5 * Math.abs(step)))
        dx = 0.5 * (lo + hi) - x;
    } else if (!Number.isFinite(dx))
      return { x, fx, iterations: i, converged: false };
    step = dx;
    x += dx;
    fx = f(x);
    if (Math.abs(dx) <= xTol * (1 + Math.abs(x)))
      return { x, fx, iterations: i, converged: true };
  }
  return { x, fx, iterations: maxIter, converged: false };
}
