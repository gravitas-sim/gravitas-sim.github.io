// VERBATIM from js/kernels/cosmology/flrw.js at 2a6ce1c5 (v3 before Prompt 152):
// the 16-point Gauss-Legendre tables and `gl`, the composite rule
// js/numeric/quadrature.js reproduces. Only change: `export` added to gl.
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

/** Integral of f over [a, b]: n panels of 16 nodes. */
export function gl(f, a, b, n) {
  const h = (b - a) / n;
  const half = h / 2;
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const mid = a + (k + 0.5) * h;
    let s = 0;
    for (let i = 0; i < 8; i++)
      s += GL_W[i] * (f(mid - half * GL_X[i]) + f(mid + half * GL_X[i]));
    sum += s * half;
  }
  return sum;
}
