// =============================================================================
// Galactic kernel: cluster membership from motion, as a probability
// -----------------------------------------------------------------------------
// A two-component mixture over any number of independent measurements per star
// (proper motions and parallax, say): a cluster that is narrow in every
// dimension about its own centre, and a field that is broad. Each star's
// per-measurement error widens both. The answer for a star is the probability
// that it came from the cluster component given its measurements, never a
// label; a threshold is a choice the caller makes and states.
//
// Fitted by expectation-maximisation. The intrinsic cluster width is estimated
// by the standard approximate update (the weighted mean square residual less
// the mean square error, floored), which is adequate when errors are smaller
// than the spread; the fit reports its iterations and whether it converged.
// Starting values are the caller's, so a result is reproducible.
//
// Pure: no DOM, no clock. Gaussians are independent between dimensions.
// =============================================================================

const gauss = (x, mu, s2) =>
  Math.exp((-0.5 * ((x - mu) * (x - mu))) / s2) / Math.sqrt(2 * Math.PI * s2);

/**
 * @param {Array<{x: number[], e: number[]}>} stars - measurements and one-sigma errors, per dimension
 * @param {{cluster: number[], clusterSigma: number[], field: number[],
 *   fieldSigma: number[], fraction?: number, iterations?: number,
 *   tolerance?: number}} start - starting centres and widths
 * @returns {{p: Float64Array, cluster: {mean: number[], sigma: number[]},
 *   field: {mean: number[], sigma: number[]}, fraction: number,
 *   iterations: number, converged: boolean, expected: number}}
 */
export function fitMembership(stars, start) {
  const n = stars.length;
  const d = start.cluster.length;
  let fc = start.fraction ?? 0.1;
  const cm = [...start.cluster];
  const cs = start.clusterSigma.map(s => s * s);
  const fm = [...start.field];
  const fs = start.fieldSigma.map(s => s * s);
  const p = new Float64Array(n);
  const maxIter = start.iterations ?? 200;
  const tol = start.tolerance ?? 1e-8;
  let converged = false;
  let it = 0;
  for (; it < maxIter; it++) {
    for (let i = 0; i < n; i++) {
      let lc = fc;
      let lf = 1 - fc;
      for (let k = 0; k < d; k++) {
        const e2 = stars[i].e[k] ** 2;
        lc *= gauss(stars[i].x[k], cm[k], cs[k] + e2);
        lf *= gauss(stars[i].x[k], fm[k], fs[k] + e2);
      }
      p[i] = lc / (lc + lf || 1);
    }
    let sum = 0;
    for (let i = 0; i < n; i++) sum += p[i];
    const next = Math.min(0.999, Math.max(0.001, sum / n));
    let shift = Math.abs(next - fc);
    fc = next;
    for (let k = 0; k < d; k++) {
      for (const [mean, s2, w] of [
        [cm, cs, i => p[i]],
        [fm, fs, i => 1 - p[i]],
      ]) {
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
          const wi = w(i) / (s2[k] + stars[i].e[k] ** 2);
          num += wi * stars[i].x[k];
          den += wi;
        }
        const mu = num / den;
        shift = Math.max(shift, Math.abs(mu - mean[k]));
        mean[k] = mu;
        let r2 = 0;
        let wsum = 0;
        for (let i = 0; i < n; i++) {
          const e2 = stars[i].e[k] ** 2;
          r2 += w(i) * ((stars[i].x[k] - mu) ** 2 - e2);
          wsum += w(i);
        }
        s2[k] = Math.max(
          1e-6 * Math.max(1, start.fieldSigma[k] ** 2),
          r2 / wsum
        );
      }
    }
    if (shift < tol) {
      converged = true;
      it++;
      break;
    }
  }
  let expected = 0;
  for (let i = 0; i < n; i++) expected += p[i];
  return {
    p,
    cluster: { mean: cm, sigma: cs.map(Math.sqrt) },
    field: { mean: fm, sigma: fs.map(Math.sqrt) },
    fraction: fc,
    iterations: it,
    converged,
    expected,
  };
}

/** How many stars have a membership probability of at least a threshold. */
export function countAbove(p, threshold) {
  let n = 0;
  for (const v of p) if (v >= threshold) n++;
  return n;
}
