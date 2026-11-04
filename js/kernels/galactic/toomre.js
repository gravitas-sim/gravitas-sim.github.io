// =============================================================================
// Galactic kernel: the Toomre diagram and two published disk-halo rules (Prompt 235, legs T)
// -----------------------------------------------------------------------------
// Every number of a rule is read from tests/fixtures/kinematics/disk-halo-source.json
// (Venn et al. 2004, Table 3; Bensby et al. 2014, Section 2 and Table A.1) and handed
// in; none is typed here. A rule is applied only in its own frame: Venn's velocities
// are Galactic-rest-frame (a disk star has V near 220 km/s), Bensby's are relative
// to the local standard of rest (a disk star has V near 0). Velocities in km/s.
//
// Prototype on a spike branch, never merged (KINEMATICS_GATE.md, addendum).
// =============================================================================

/** The Toomre coordinates of a velocity: the rotational component V and T = sqrt(U^2 + W^2). */
export const toomreCoordinates = ({ U, V, W }) => ({ V, T: Math.hypot(U, W) });

/** A heliocentric velocity referred to a frame in which the Sun moves with `sun` (rest frame or LSR). */
export const referTo = ({ U, V, W }, sun) => ({
  U: U + sun.U,
  V: V + sun.V,
  W: W + sun.W,
});

const logNormal = (x, mu, sigma) =>
  -0.5 * ((x - mu) / sigma) ** 2 - Math.log(sigma);

const VENN_CLASSES = ['thin disk', 'thick disk', 'halo'];
const BENSBY_CLASSES = ['thin disk', 'thick disk', 'halo'];

/** The Venn rule's source: the rows of Table 3 and the solar motion that fixes its frame. */
export function vennRule(file) {
  const s = file.sources[0];
  return { rows: s.rows, sun: s.solarMotion, classes: VENN_CLASSES };
}

/**
 * Venn et al. 2004: the class of largest Gaussian-ellipsoid density, uniform prior.
 * @param {{U:number,V:number,W:number}} uvw - Galactic rest frame
 */
export function vennClass(uvw, rule) {
  let best = null;
  let bestLog = -Infinity;
  for (const c of rule.classes) {
    const r = rule.rows[c];
    const lp =
      logNormal(uvw.U, r.U, r.sigmaU) +
      logNormal(uvw.V, r.V, r.sigmaV) +
      logNormal(uvw.W, r.W, r.sigmaW);
    if (lp > bestLog) {
      bestLog = lp;
      best = c;
    }
  }
  return best;
}

const numberAfter = (text, pattern) => {
  const m = pattern.exec(text);
  if (!m) throw new Error(`criterion not found: ${pattern}`);
  return Number(m[1]);
};

/** The Bensby rule's source: Table A.1 and the three cuts, read out of the file's criterion text. */
export function bensbyRule(file) {
  const s = file.sources[1];
  const c = s.criterion;
  return {
    rows: s.tableA1_velocity_dispersions_and_asymmetric_drift_km_s,
    sun: s.solarMotion,
    classes: BENSBY_CLASSES,
    thickOverThin: numberAfter(
      c['thick disk candidate'],
      /TD\/D\s*>\s*([0-9.]+)/
    ),
    thinOverThick: numberAfter(
      c['thin disk candidate'],
      /TD\/D\s*<\s*([0-9.]+)/
    ),
    thickOverHalo: numberAfter(c.halo, /TD\/H\s*<\s*([0-9.]+)/),
  };
}

/** log of X f for each class (Eq. A.1 with the fractions of Table A.1), in the LSR frame. */
const logWeights = (uvw, rule) => {
  const out = {};
  for (const k of rule.classes) {
    const r = rule.rows[k];
    out[k] =
      Math.log(r.X) -
      Math.log((2 * Math.PI) ** 1.5) +
      logNormal(uvw.U, r.Uasym, r.sigmaU) +
      logNormal(uvw.V, r.Vasym, r.sigmaV) +
      logNormal(uvw.W, 0, r.sigmaW);
  }
  return out;
};

/** TD/D and TD/H of Eq. A.3. */
export function bensbyRatios(uvw, rule) {
  const l = logWeights(uvw, rule);
  return {
    TDoverD: Math.exp(l['thick disk'] - l['thin disk']),
    TDoverH: Math.exp(l['thick disk'] - l.halo),
  };
}

/**
 * Bensby et al. 2014: halo TD/H below the file's bound; otherwise thick TD/D above
 * its bound, thin below its bound, else 'between'. `strictHalo` also requires thick
 * (TD/D above the bound), the paper's nesting; the validator reports how many stars differ.
 */
export function bensbyClass(uvw, rule, { strictHalo = false } = {}) {
  const { TDoverD, TDoverH } = bensbyRatios(uvw, rule);
  if (
    TDoverH < rule.thickOverHalo &&
    (!strictHalo || TDoverD > rule.thickOverThin)
  )
    return 'halo';
  if (TDoverD > rule.thickOverThin) return 'thick disk';
  if (TDoverD < rule.thinOverThick) return 'thin disk';
  return 'between';
}
