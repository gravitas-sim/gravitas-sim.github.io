// Gauss-Legendre nodes on [-1, 1] and a composite rule, shared by the band and transmission models.
const cache = new Map();

/** The n-point Gauss-Legendre nodes and weights on [-1, 1] (Newton on P_n). */
export function gauss(n) {
  if (cache.has(n)) return cache.get(n);
  const x = [];
  const w = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let dp = 1;
    for (let it = 0; it < 100; it++) {
      let p0 = 1;
      let p1 = z;
      for (let j = 2; j <= n; j++) {
        const p2 = ((2 * j - 1) * z * p1 - (j - 1) * p0) / j;
        p0 = p1;
        p1 = p2;
      }
      dp = (n * (z * p1 - p0)) / (z * z - 1);
      const dz = p1 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x.push(z);
    w.push(2 / ((1 - z * z) * dp * dp));
  }
  const r = { x, w };
  cache.set(n, r);
  return r;
}

/** Integral of f on [a, b] by panels of at most `width` with an n-point rule. */
export function composite(f, a, b, width, n = 16) {
  const { x, w } = gauss(n);
  const panels = Math.max(1, Math.ceil((b - a) / width));
  const h = (b - a) / panels;
  let sum = 0;
  for (let p = 0; p < panels; p++) {
    const lo = a + p * h;
    for (let i = 0; i < n; i++) sum += w[i] * f(lo + 0.5 * h * (x[i] + 1));
  }
  return 0.5 * h * sum;
}
