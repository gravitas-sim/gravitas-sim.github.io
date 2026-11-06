// =============================================================================
// Projected geometry: separations, the angular-diameter distance, radii (Prompt 250, rule R10)
// -----------------------------------------------------------------------------
// Sky positions are in degrees. The separation of two of them is the great-circle angle by the haversine
// formula; the physical projected separation is that angle times D_A(z_c) of the caller's flat cosmology
// (the cosmology kernel's flrw.js). The half-number radius is the median projected distance of the members
// from the caller's centre; the harmonic radius is N (N - 1) / 2 over the sum of 1 / R_ij. A radius belongs
// to the aperture the members were chosen in; the centre is the caller's and carries no uncertainty here.
// =============================================================================

import { caseBootstrap } from '../../statistics/index.js';
import { createCosmology } from '../../cosmology/flrw.js';
import { DEGREES, DRAWS, refused } from './constants.js';
import { median } from './velocity.js';

/** Great-circle angle (radians) between two sky positions in degrees. */
export function separation(ra1, dec1, ra2, dec2) {
  const p1 = dec1 * DEGREES;
  const p2 = dec2 * DEGREES;
  const s1 = Math.sin((p1 - p2) / 2);
  const s2 = Math.sin(((ra1 - ra2) * DEGREES) / 2);
  const a = s1 * s1 + Math.cos(p1) * Math.cos(p2) * s2 * s2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** A flat cosmology or a refusal. */
export function cosmologyOf(c) {
  const { H0, Om, OL } = c ?? {};
  if (![H0, Om, OL].every(Number.isFinite) || !(H0 > 0) || Om < 0 || OL < 0)
    return refused('bad-cosmology', 'H0 > 0, Om >= 0 and OL >= 0 are required');
  if (Math.abs(Om + OL - 1) > 1e-9)
    return refused('bad-cosmology', 'the cosmology must be flat (Om + OL = 1)');
  return createCosmology({ H0, Om, OL });
}

/**
 * The point at angular distance `delta` (radians) and bearing `bearing` (radians from north) from a
 * centre (degrees): the inverse of `separation`, used by the generators.
 */
export function destination(ra0, dec0, bearing, delta) {
  const p0 = dec0 * DEGREES;
  const dec = Math.asin(
    Math.sin(p0) * Math.cos(delta) +
      Math.cos(p0) * Math.sin(delta) * Math.cos(bearing)
  );
  const ra =
    ra0 * DEGREES +
    Math.atan2(
      Math.sin(bearing) * Math.sin(delta) * Math.cos(p0),
      Math.cos(delta) - Math.sin(p0) * Math.sin(dec)
    );
  return { ra: (((ra / DEGREES) % 360) + 360) % 360, dec: dec / DEGREES };
}

/** Projected distances (Mpc) of sky positions from a centre. */
export const projectedDistances = (sky, centre, daMpc) =>
  sky.map(g => separation(g.ra, g.dec, centre.ra, centre.dec) * daMpc);

/** The pair separations (Mpc) of sky positions, as rows. */
export function pairMatrix(sky, daMpc) {
  const n = sky.length;
  const rows = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d =
        separation(sky[i].ra, sky[i].dec, sky[j].ra, sky[j].dec) * daMpc;
      rows[i][j] = d;
      rows[j][i] = d;
    }
  return rows;
}

/** Harmonic radius of the points indexed by `idx` (a multiset): pairs of one galaxy with itself skipped. */
export function harmonicRadius(rows, idx = null) {
  const n = idx ? idx.length : rows.length;
  let sum = 0;
  let pairs = 0;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const i = idx ? idx[a] : a;
      const j = idx ? idx[b] : b;
      if (i === j) continue;
      sum += 1 / rows[i][j];
      pairs++;
    }
  return pairs / sum;
}

/**
 * The projected radius of a member set with its bootstrap uncertainty.
 * @param {{sky: {ra: number, dec: number}[], centre: {ra: number, dec: number}, daMpc: number,
 *   kind: 'half-number'|'harmonic', draws?: number, seed?: string}} p
 */
export function projectedRadius({
  sky,
  centre,
  daMpc,
  kind,
  draws = DRAWS,
  seed = 'clusters',
}) {
  const n = sky.length;
  let value;
  let statistic;
  if (kind === 'half-number') {
    const d = Float64Array.from(projectedDistances(sky, centre, daMpc));
    value = median(d);
    statistic = idx => median(Float64Array.from(idx, i => d[i]));
  } else if (kind === 'harmonic') {
    const rows = pairMatrix(sky, daMpc);
    value = harmonicRadius(rows);
    statistic = idx => harmonicRadius(rows, idx);
  } else return refused('bad-radius-kind', `unknown radius kind ${kind}`);
  const boot = caseBootstrap({ n, statistic, draws, seed, label: 'radius' });
  if (boot.status !== 'ok') return boot;
  const finite = Array.from(boot.samples).filter(Number.isFinite);
  const m = finite.reduce((s, v) => s + v, 0) / finite.length;
  const sd = Math.sqrt(
    finite.reduce((s, v) => s + (v - m) * (v - m), 0) / (finite.length - 1)
  );
  return { status: 'ok', kind, mpc: value, sigmaMpc: sd, draws };
}
