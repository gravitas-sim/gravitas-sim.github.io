// =============================================================================
// Pulsar kernel: the arrival phase of a folded profile by matched filter
// -----------------------------------------------------------------------------
// A folded profile p(b) on nbin bins is the template shape shifted by phi turns,
// scaled by a, plus noise of variance v_bin per bin. In the Fourier domain
// (X_k = sum_b x_b exp(-2 pi i k b / nbin), k = 1 .. nbin / 2 - 1)
//
//   P_k = a T_k exp(-2 pi i k phi) + noise,
//
// each of the real and imaginary parts of the noise having variance
// v = (nbin / 2) v_bin. The least-squares phase maximises
//
//   C(phi) = sum_k Re[ P_k conj(T_k) exp(2 pi i k phi) ]    (Taylor 1992 form),
//
// found by a scan of 16 nbin points and then bisection on the analytic
// derivative; the amplitude is a = C / sum |T_k|^2 and the phase variance
//
//   (v + a^2 v_T) / (a^2 (2 pi)^2 sum k^2 |T_k|^2),
//
// with v_T the template's own noise (the template is measured too). Harmonics
// kept are those with |T_k|^2 above 9 v_T: the rest are noise in the template.
// A profile is usable when a^2 sum |T_k|^2 / v >= snrMin^2.
//
// Pure: no DOM, no clock.
// =============================================================================

const { Math, Float64Array } = globalThis;

const tables = new Map();
function table(nbin) {
  let t = tables.get(nbin);
  if (!t) {
    const h = nbin / 2;
    const cos = new Float64Array(h * nbin);
    const sin = new Float64Array(h * nbin);
    for (let k = 0; k < h; k++)
      for (let b = 0; b < nbin; b++) {
        // the angle is reduced modulo one turn in integers: k b mod nbin
        const a = (2 * Math.PI * ((k * b) % nbin)) / nbin;
        cos[k * nbin + b] = Math.cos(a);
        sin[k * nbin + b] = Math.sin(a);
      }
    t = { cos, sin };
    tables.set(nbin, t);
  }
  return t;
}

/**
 * The harmonics k = 0 .. nbin / 2 - 1 of a profile: X_k = sum_b x_b exp(-2 pi i k b / nbin).
 * @returns {{nbin: number, re: Float64Array, im: Float64Array}}
 */
export function harmonics(profile) {
  const nbin = profile.length;
  const h = nbin / 2;
  const { cos, sin } = table(nbin);
  const re = new Float64Array(h);
  const im = new Float64Array(h);
  for (let k = 0; k < h; k++) {
    let a = 0;
    let b = 0;
    const o = k * nbin;
    for (let j = 0; j < nbin; j++) {
      a += profile[j] * cos[o + j];
      b -= profile[j] * sin[o + j];
    }
    re[k] = a;
    im[k] = b;
  }
  return { nbin, re, im };
}

/** Multiply harmonic k by exp(+2 pi i k phi): the profile moves back by phi turns. */
export function rotate(hm, phi) {
  const h = hm.re.length;
  const re = new Float64Array(h);
  const im = new Float64Array(h);
  for (let k = 0; k < h; k++) {
    const th = 2 * Math.PI * k * (phi - Math.round(phi));
    const c = Math.cos(th);
    const s = Math.sin(th);
    re[k] = hm.re[k] * c - hm.im[k] * s;
    im[k] = hm.re[k] * s + hm.im[k] * c;
  }
  return { nbin: hm.nbin, re, im };
}

/** The per-bin variance of a folded profile of noise sigma: sigma^2 mean(1 / n_b). */
export function binVariance(sigma, counts) {
  let s = 0;
  for (let b = 0; b < counts.length; b++) s += 1 / Math.max(1, counts[b]);
  return (sigma * sigma * s) / counts.length;
}

/**
 * The inverse-variance weighted mean of profiles (given as harmonics and per-bin
 * variances) and its per-bin variance, 1 / sum of the weights.
 * @param {Array<{re: Float64Array, im: Float64Array, varBin: number}>} list
 * @param {number} [skip] - the index of one member to leave out
 */
export function combine(list, skip = -1) {
  const h = list[0].re.length;
  const re = new Float64Array(h);
  const im = new Float64Array(h);
  let W = 0;
  for (let i = 0; i < list.length; i++) {
    if (i === skip) continue;
    const w = 1 / list[i].varBin;
    W += w;
    for (let k = 0; k < h; k++) {
      re[k] += w * list[i].re[k];
      im[k] += w * list[i].im[k];
    }
  }
  for (let k = 0; k < h; k++) {
    re[k] /= W;
    im[k] /= W;
  }
  return { nbin: list[0].nbin, re, im, varBin: 1 / W, weight: W };
}

/**
 * The arrival phase of `prof` against `tmpl`.
 * @param {{nbin: number, re: Float64Array, im: Float64Array, varBin: number}} prof
 * @param {{nbin: number, re: Float64Array, im: Float64Array, varBin: number}} tmpl
 * @param {{snrMin?: number, noiseMultiple?: number}} [o]
 * @returns {{usable: boolean, reason?: string, phase?: number, sigma?: number,
 *   amplitude?: number, snr?: number, harmonics?: number}}
 */
export function matchTemplate(prof, tmpl, o = {}) {
  const snrMin = o.snrMin ?? 5;
  const mult = o.noiseMultiple ?? 9;
  const nbin = prof.nbin;
  const h = nbin / 2;
  const vp = (nbin / 2) * prof.varBin;
  const vT = (nbin / 2) * tmpl.varBin;
  const A = [];
  const B = [];
  const ks = [];
  let sumT = 0;
  let sumK2T = 0;
  for (let k = 1; k < h; k++) {
    const t2 = tmpl.re[k] ** 2 + tmpl.im[k] ** 2;
    if (!(t2 > mult * vT)) continue;
    ks.push(k);
    A.push(prof.re[k] * tmpl.re[k] + prof.im[k] * tmpl.im[k]);
    B.push(prof.im[k] * tmpl.re[k] - prof.re[k] * tmpl.im[k]);
    sumT += t2;
    sumK2T += k * k * t2;
  }
  if (!ks.length) return { usable: false, reason: 'no-template-harmonics' };
  const C = phi => {
    let s = 0;
    for (let i = 0; i < ks.length; i++) {
      const th = 2 * Math.PI * ks[i] * phi;
      s += A[i] * Math.cos(th) - B[i] * Math.sin(th);
    }
    return s;
  };
  const dC = phi => {
    let s = 0;
    for (let i = 0; i < ks.length; i++) {
      const th = 2 * Math.PI * ks[i] * phi;
      s += 2 * Math.PI * ks[i] * (-A[i] * Math.sin(th) - B[i] * Math.cos(th));
    }
    return s;
  };
  const n = 16 * nbin;
  let best = 0;
  let bestV = -Infinity;
  for (let j = 0; j < n; j++) {
    const v = C(-0.5 + j / n);
    if (v > bestV) {
      bestV = v;
      best = j;
    }
  }
  let lo = -0.5 + (best - 1) / n;
  let hi = -0.5 + (best + 1) / n;
  let phi;
  if (dC(lo) >= 0 && dC(hi) <= 0) {
    for (let i = 0; i < 70; i++) {
      const mid = 0.5 * (lo + hi);
      if (dC(mid) > 0) lo = mid;
      else hi = mid;
    }
    phi = 0.5 * (lo + hi);
  } else {
    phi = -0.5 + best / n;
  }
  phi -= Math.round(phi);
  const a = C(phi) / sumT;
  if (!(a > 0))
    return { usable: false, reason: 'non-positive-amplitude', phase: phi };
  const snr = Math.sqrt((a * a * sumT) / vp);
  const sigma = Math.sqrt(
    (vp + a * a * vT) / (a * a * (2 * Math.PI) ** 2 * sumK2T)
  );
  return {
    usable: snr >= snrMin,
    reason: snr >= snrMin ? undefined : 'low-signal-to-noise',
    phase: phi,
    sigma,
    amplitude: a,
    snr,
    harmonics: ks.length,
  };
}

/** The total chi-square of a profile's harmonics 1 .. nbin / 2 - 1 against noise alone, with its dof. */
export function harmonicPower(hm, varBin) {
  const h = hm.re.length;
  const v = (hm.nbin / 2) * varBin;
  let s = 0;
  for (let k = 1; k < h; k++) s += hm.re[k] ** 2 + hm.im[k] ** 2;
  return { chi2: s / v, dof: 2 * (h - 1) };
}
