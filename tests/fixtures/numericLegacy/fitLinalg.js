// VERBATIM from js/inference/fit.js at 2a6ce1c5 (v3 before Prompt 152): solveSpd,
// invertSpd and eigenSymmetric, the authority js/numeric/linalg.js reproduces.
// Only change: `export` added to eigenSymmetric, which fit.js keeps private.
// tests/numericRoutines.test.js compares the new module with this copy bit for
// bit in one process, so the proof survives the day fit.js adopts the module.
const { Math } = globalThis;

/** Solve A x = b for a small symmetric positive-definite A (Cholesky). */
export function solveSpd(A, b) {
  const n = b.length;
  const L = A.map(r => r.slice());
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = L[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0)) return null;
        L[i][i] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
    for (let j = i + 1; j < n; j++) L[i][j] = 0;
  }
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

/** The inverse of a small symmetric positive-definite matrix, or null. */
export function invertSpd(A) {
  const n = A.length;
  const out = [];
  for (let j = 0; j < n; j++) {
    const e = new Array(n).fill(0);
    e[j] = 1;
    const col = solveSpd(A, e);
    if (!col) return null;
    out.push(col);
  }
  return out[0].map((_, i) => out.map(col => col[i]));
}

/** Eigenvalues and vectors of a small symmetric matrix (cyclic Jacobi). */
export function eigenSymmetric(M) {
  const n = M.length;
  const A = M.map(r => r.slice());
  const V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-30) break;
    for (let p = 0; p < n - 1; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.hypot(theta, 1));
        const c = 1 / Math.hypot(t, 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
  }
  // Columns of V are the vectors; largest eigenvalue first.
  return A.map((r, i) => ({ value: r[i], vector: V.map(row => row[i]) })).sort(
    (a, b) => b.value - a.value
  );
}
