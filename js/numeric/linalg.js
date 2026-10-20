// Small dense linear algebra (Prompt 152, NUMERICS.md). Consumers: 154, 256.
// Matrices are arrays of row arrays, vectors plain arrays; inputs are never
// modified. The symmetric routines are js/inference/fit.js's, operation for
// operation (the authority; tests/numericRoutines.test.js compares them bit
// for bit), and null is the answer for a matrix the method cannot handle.
// Pure: no imports. For matrices up to about 10 x 10, not for large systems.
const { Math, Number } = globalThis;

/** The lower Cholesky factor L (A = L L^T) of a symmetric positive-definite A, or null. */
export function cholesky(A) {
  const n = A.length;
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
  return L;
}

const choleskySolve = (L, b) => {
  const n = b.length;
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
};

/** Solve A x = b for a symmetric positive-definite A (Cholesky); null if A is not one. */
export function solveSpd(A, b) {
  const L = cholesky(A);
  return L && choleskySolve(L, b);
}

/** The inverse of a symmetric positive-definite matrix, or null. */
export function invertSpd(A) {
  const n = A.length;
  const L = cholesky(A);
  if (!L) return null;
  const cols = [];
  for (let j = 0; j < n; j++) {
    const e = new Array(n).fill(0);
    e[j] = 1;
    cols.push(choleskySolve(L, e));
  }
  return cols[0].map((_, i) => cols.map(col => col[i]));
}

/**
 * Solve A x = b for any square A by Gaussian elimination with partial
 * pivoting. Null when a pivot is not larger than n EPS times the largest
 * entry (singular to working precision), or the answer is not finite.
 */
export function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  let big = 0;
  for (const r of A) for (const v of r) big = Math.max(big, Math.abs(v));
  const floor = n * Number.EPSILON * big;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > floor)) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x.every(Number.isFinite) ? x : null;
}

/** The inverse of any square matrix, column by column through `solve`; null if singular. */
export function inverse(A) {
  const n = A.length;
  const cols = [];
  for (let j = 0; j < n; j++) {
    const x = solve(
      A,
      Array.from({ length: n }, (_, i) => (i === j ? 1 : 0))
    );
    if (!x) return null;
    cols.push(x);
  }
  return cols[0].map((_, i) => cols.map(col => col[i]));
}

/**
 * Eigenvalues and eigenvectors of a symmetric matrix by cyclic Jacobi sweeps,
 * largest eigenvalue first: [{value, vector}] with unit vectors (columns of
 * the rotation). Stops when the off-diagonal sum of squares is below 1e-30
 * (an absolute test: scale a matrix of very large or small entries first) or
 * after 60 sweeps. Only the upper triangle's symmetry is assumed, not checked.
 */
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
  return A.map((r, i) => ({ value: r[i], vector: V.map(row => row[i]) })).sort(
    (a, b) => b.value - a.value
  );
}
