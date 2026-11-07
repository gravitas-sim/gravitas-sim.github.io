// =============================================================================
// SPIKE, never merged (Prompt 263 Part B, tests/fixtures/crossmatch/
// clustering-thresholds.json): the angular pair counter and the Landy-Szalay
// estimator, as the gate's prototype.
// -----------------------------------------------------------------------------
// Pair counts by angular separation bins on unit vectors: a sweep over the
// vectors sorted by z (a pair within a chord is within that chord in z), the bin
// found from the dot product with no trigonometry in the inner loop. Optional
// block tags give the block-pair count matrices a delete-one jackknife needs.
// =============================================================================

const DEG = Math.PI / 180;

/** Unit vectors, packed. */
export function vectors(ra, dec) {
  const n = ra.length;
  const u = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const c = Math.cos(dec[i] * DEG);
    u[3 * i] = c * Math.cos(ra[i] * DEG);
    u[3 * i + 1] = c * Math.sin(ra[i] * DEG);
    u[3 * i + 2] = Math.sin(dec[i] * DEG);
  }
  return u;
}

const byZ = u => {
  const n = u.length / 3;
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (p, q) => u[3 * p + 2] - u[3 * q + 2] || p - q
  );
  const s = new Float64Array(3 * n);
  const z = new Float64Array(n);
  const idx = new Int32Array(n);
  order.forEach((o, k) => {
    s[3 * k] = u[3 * o];
    s[3 * k + 1] = u[3 * o + 1];
    s[3 * k + 2] = u[3 * o + 2];
    z[k] = u[3 * o + 2];
    idx[k] = o;
  });
  return { s, z, idx, n };
};

/**
 * Pair counts per bin of [edges[k], edges[k+1]) degrees.
 * @param {Float64Array} U - packed unit vectors
 * @param {Float64Array|null} V - the other set, or null for the pairs within U (i < j)
 * @param {number[]} edgesDeg
 * @param {{blockU?: Int32Array, blockV?: Int32Array, blocks?: number}} [o]
 * @returns {Float64Array} counts per bin, or per (block U, block V, bin) with blocks
 */
export function pairCounts(U, V, edgesDeg, o = {}) {
  const nb = o.blocks ?? 0;
  const K = edgesDeg.length - 1;
  const cosE = edgesDeg.map(e => Math.cos(e * DEG));
  const cmax = cosE[0];
  const cmin = cosE[K];
  const chordMax = 2 * Math.sin((edgesDeg[K] * DEG) / 2);
  const a = byZ(U);
  const self = V === null;
  const b = self ? a : byZ(V);
  const out = new Float64Array(nb ? nb * nb * K : K);
  for (let i = 0; i < a.n; i++) {
    const zi = a.z[i];
    const x = a.s[3 * i];
    const y = a.s[3 * i + 1];
    const w = a.s[3 * i + 2];
    const bi = nb ? o.blockU[a.idx[i]] : 0;
    let j;
    if (self) j = i + 1;
    else {
      let l = 0;
      let h = b.n;
      const t = zi - chordMax;
      while (l < h) {
        const m = (l + h) >> 1;
        if (b.z[m] < t) l = m + 1;
        else h = m;
      }
      j = l;
    }
    for (; j < b.n && b.z[j] - zi <= chordMax; j++) {
      const d = x * b.s[3 * j] + y * b.s[3 * j + 1] + w * b.s[3 * j + 2];
      if (d > cmax || d <= cmin) continue;
      let k = 0;
      while (k < K - 1 && d <= cosE[k + 1]) k++;
      if (nb) {
        const bj = (self ? o.blockU : o.blockV)[b.idx[j]];
        out[(bi * nb + bj) * K + k]++;
      } else out[k]++;
    }
  }
  return out;
}

/** w_k = (DD/N_DD - 2 DR/N_DR + RR/N_RR) / (RR/N_RR); NaN where RR is zero. */
export function landySzalay({ DD, DR, RR, nD, nR }) {
  const ndd = (nD * (nD - 1)) / 2;
  const ndr = nD * nR;
  const nrr = (nR * (nR - 1)) / 2;
  return Array.from(DD, (dd, k) => {
    const rr = RR[k] / nrr;
    return (dd / ndd - (2 * DR[k]) / ndr + rr) / rr;
  });
}

/** sigma_k = (1 + max(w_k, 0)) / sqrt(DD_k) (AM2). */
export const poissonSigma = (w, DD) =>
  Array.from(w, (v, k) => (1 + Math.max(v, 0)) / Math.sqrt(DD[k]));

/** T and its degrees of freedom: bins with DD >= 5 contribute (w/sigma)^2 (AM2). */
export function statisticT(w, sigma, DD) {
  let T = 0;
  let df = 0;
  w.forEach((v, k) => {
    if (DD[k] >= 5 && Number.isFinite(v) && sigma[k] > 0) {
      T += (v / sigma[k]) ** 2;
      df++;
    }
  });
  return { T, df };
}

/**
 * Landy-Szalay with a delete-one jackknife over `blocks` blocks.
 * @param {Float64Array} D
 * @param {Float64Array} R
 * @param {number[]} edgesDeg
 * @param {{blockD: Int32Array, blockR: Int32Array, blocks: number}} jk
 */
export function landySzalayJackknife(D, R, edgesDeg, jk) {
  const K = edgesDeg.length - 1;
  const nb = jk.blocks;
  const dd = pairCounts(D, null, edgesDeg, { blockU: jk.blockD, blocks: nb });
  const rr = pairCounts(R, null, edgesDeg, { blockU: jk.blockR, blocks: nb });
  const dr = pairCounts(D, R, edgesDeg, {
    blockU: jk.blockD,
    blockV: jk.blockR,
    blocks: nb,
  });
  const nDb = new Float64Array(nb);
  const nRb = new Float64Array(nb);
  for (const b of jk.blockD) nDb[b]++;
  for (const b of jk.blockR) nRb[b]++;
  const sum = (m, drop) => {
    const out = new Float64Array(K);
    for (let p = 0; p < nb; p++)
      for (let q = 0; q < nb; q++) {
        if (p === drop || q === drop) continue;
        for (let k = 0; k < K; k++) out[k] += m[(p * nb + q) * K + k];
      }
    return out;
  };
  const nD = D.length / 3;
  const nR = R.length / 3;
  const full = {
    DD: sum(dd, -1),
    DR: sum(dr, -1),
    RR: sum(rr, -1),
    nD,
    nR,
  };
  const w = landySzalay(full);
  const reps = [];
  for (let b = 0; b < nb; b++)
    reps.push(
      landySzalay({
        DD: sum(dd, b),
        DR: sum(dr, b),
        RR: sum(rr, b),
        nD: nD - nDb[b],
        nR: nR - nRb[b],
      })
    );
  const sigma = Array.from({ length: K }, (_, k) => {
    const m = reps.reduce((s, r) => s + r[k], 0) / nb;
    return Math.sqrt(
      ((nb - 1) / nb) * reps.reduce((s, r) => s + (r[k] - m) ** 2, 0)
    );
  });
  return { ...full, w, sigma };
}
