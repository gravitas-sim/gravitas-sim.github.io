// Quadrature (Prompt 152, NUMERICS.md). Consumers: 200, 255. The rule and its
// panel arithmetic are those of js/kernels/cosmology/flrw.js, digit for digit.
// Pure: no imports. Finite intervals and finite integrands only; an infinite
// range is mapped by the caller (flrw integrates in u = ln(1 + z)).
const { Math } = globalThis;

// 16-point Gauss-Legendre on [-1, 1]: the eight positive nodes and weights.
const GL_X = [
  0.0950125098376374, 0.2816035507792589, 0.4580167776572274,
  0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326,
  0.9894009349916499,
];
const GL_W = [
  0.1894506104550685, 0.1826034150449236, 0.1691565193950025,
  0.1495959888165767, 0.1246289712555339, 0.0951585116824928,
  0.0622535239386479, 0.0271524594117541,
];

/**
 * Integral of f over [a, b] in `panels` equal panels of 16 nodes each. Exact
 * for a polynomial of degree 31 per panel; for an analytic f the error falls
 * faster than any power of the panel width. Reversed limits give the negative.
 */
export function gaussLegendre(f, a, b, panels = 1) {
  const h = (b - a) / panels;
  const half = h / 2;
  let sum = 0;
  for (let k = 0; k < panels; k++) {
    const mid = a + (k + 0.5) * h;
    let s = 0;
    for (let i = 0; i < 8; i++)
      s += GL_W[i] * (f(mid - half * GL_X[i]) + f(mid + half * GL_X[i]));
    sum += s * half;
  }
  return sum;
}

/**
 * Adaptive Gauss-Legendre: a panel is split in two until one panel and its two
 * halves agree to the local tolerance (halved at each split), starting from
 * max(absTol, relTol |whole|). `error` is the sum of the accepted panels'
 * disagreements, an estimate and not a bound; a panel that hits maxDepth is
 * accepted as it stands and reported (converged: false), as is any
 * non-finite value. Integrable endpoint singularities converge slowly.
 * @returns {{value: number, error: number, evaluations: number, converged: boolean}}
 */
export function adaptive(
  f,
  a,
  b,
  { absTol = 1e-12, relTol = 1e-10, maxDepth = 20 } = {}
) {
  let evaluations = 0;
  const g = x => (evaluations++, f(x));
  const whole = gaussLegendre(g, a, b);
  let error = 0;
  let converged = Number.isFinite(whole);
  const go = (lo, hi, coarse, tol, depth) => {
    const mid = 0.5 * (lo + hi);
    const left = gaussLegendre(g, lo, mid);
    const right = gaussLegendre(g, mid, hi);
    const fine = left + right;
    const diff = Math.abs(fine - coarse);
    if (diff <= tol) {
      error += diff;
      return fine;
    }
    if (depth >= maxDepth || !Number.isFinite(fine)) {
      error += diff;
      converged = false;
      return fine;
    }
    return (
      go(lo, mid, left, tol / 2, depth + 1) +
      go(mid, hi, right, tol / 2, depth + 1)
    );
  };
  const value = go(a, b, whole, Math.max(absTol, relTol * Math.abs(whole)), 0);
  return { value, error, evaluations, converged };
}
