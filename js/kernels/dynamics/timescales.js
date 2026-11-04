// Dynamical timescales (Prompt 237, DYNAMICS.md): the crossing and dynamical times, the half-mass
// and local relaxation times with a stated Coulomb logarithm, the mass-segregation and evaporation
// times as cited orders of magnitude and the collisionless-versus-collisional criterion.
//
// Every function returns a record: { status: 'ok', value, unit: 'Myr', relation, assumes } or
// { status: 'refused', code, why }. Lengths in parsecs, speeds in km/s, masses in solar masses.
import { refused } from '../statistics/check.js';
import { fixed } from '../../format.js';
import {
  CITED,
  CRITERION,
  G_PC_KMS2_MSUN,
  PC_PER_KMS_MYR,
} from './constants.js';

const { Math, Number } = globalThis;
const positive = x => Number.isFinite(x) && x > 0;

const ok = (value, relation, assumes) => ({
  status: 'ok',
  value,
  unit: 'Myr',
  relation,
  assumes,
});

/** The dynamical (free-fall scale) time sqrt(R^3 / (G M)). */
export function dynamicalTime({ radius, mass }) {
  if (!positive(radius) || !positive(mass))
    return refused('input', 'the radius and the mass must be positive numbers');
  const t = Math.sqrt(radius ** 3 / (G_PC_KMS2_MSUN * mass)) * PC_PER_KMS_MYR;
  return ok(t, 't_dyn = sqrt(R^3 / (G M))', [
    'R and M are the radius and the mass inside it',
  ]);
}

/** The crossing time R / v for a stated size and speed. */
export function crossingTime({ radius, speed }) {
  if (!positive(radius) || !positive(speed))
    return refused(
      'input',
      'the radius and the speed must be positive numbers'
    );
  return ok((radius / speed) * PC_PER_KMS_MYR, 't_cross = R / v', [
    'v is the speed the question means (the rms speed, not a line-of-sight component)',
  ]);
}

/** ln(b_max / b_min), refused unless b_max > b_min > 0. */
export function coulombLogarithm({ bmax, bmin }) {
  if (!positive(bmax) || !positive(bmin))
    return refused('input', 'both impact parameters must be positive numbers');
  if (!(bmax > bmin))
    return refused(
      'range',
      'b_max must exceed b_min: the logarithm of a ratio of one or less is not a Coulomb logarithm'
    );
  return {
    status: 'ok',
    value: Math.log(bmax / bmin),
    unit: '',
    relation: 'ln Lambda = ln(b_max / b_min)',
  };
}

function lnLambdaOf(N, gamma) {
  if (!positive(gamma))
    return { fail: refused('input', 'gamma must be a positive number') };
  const L = Math.log(gamma * N);
  if (!(L >= 1))
    return {
      fail: refused(
        'coulomb',
        `ln(gamma N) = ${Number.isFinite(L) ? fixed(L, 2) : 'not finite'} is below 1: the relation does not apply to so few stars`
      ),
    };
  return { L };
}

/**
 * The half-mass relaxation time, Spitzer's form: c N^(1/2) r_h^(3/2) / (m^(1/2) G^(1/2) ln(gamma N)).
 * `gamma` is stated by the caller (0.11 for equal masses, 0.02 for a mass spectrum are listed in
 * CITED.gamma); it is never defaulted silently, the record carries it.
 */
export function halfMassRelaxationTime({ N, halfMassRadius, meanMass, gamma }) {
  if (!Number.isInteger(N) || N < 2)
    return refused(
      'input',
      'the number of stars must be a whole number of at least 2'
    );
  if (!positive(halfMassRadius) || !positive(meanMass))
    return refused(
      'input',
      'the half-mass radius and the mean mass must be positive numbers'
    );
  const { L, fail } = lnLambdaOf(N, gamma);
  if (fail) return fail;
  const t =
    ((CITED.spitzerRelaxation.value * Math.sqrt(N) * halfMassRadius ** 1.5) /
      (Math.sqrt(meanMass * G_PC_KMS2_MSUN) * L)) *
    PC_PER_KMS_MYR;
  return {
    ...ok(t, 't_rh = c N^(1/2) r_h^(3/2) / (m^(1/2) G^(1/2) ln(gamma N))', [
      `c = ${CITED.spitzerRelaxation.value} (${CITED.spitzerRelaxation.source})`,
      `ln(gamma N) with gamma = ${gamma}: ${fixed(L, 2)}`,
      'a self-gravitating system of N stars of one mean mass, in or near virial equilibrium',
    ]),
    coulombLogarithm: L,
    gamma,
  };
}

/**
 * The local relaxation time v^3 / (8 pi G^2 m rho ln Lambda) of Chandrasekhar's theory: v the rms
 * speed, rho the mass density, m the mass of a field star, ln Lambda stated by the caller.
 */
export function localRelaxationTime({ speed, massDensity, mass, lnLambda }) {
  if (!positive(speed) || !positive(massDensity) || !positive(mass))
    return refused(
      'input',
      'the speed, the mass density and the mass must be positive numbers'
    );
  if (!(Number.isFinite(lnLambda) && lnLambda >= 1))
    return refused(
      'coulomb',
      'the Coulomb logarithm must be stated and at least 1'
    );
  const t =
    (speed ** 3 /
      (8 * Math.PI * G_PC_KMS2_MSUN ** 2 * mass * massDensity * lnLambda)) *
    PC_PER_KMS_MYR;
  return ok(t, 't_relax = v^3 / (8 pi G^2 m rho ln Lambda)', [
    `ln Lambda = ${lnLambda}`,
    'two-body relaxation in a uniform background of stars of one mass (Chandrasekhar 1942)',
  ]);
}

/** The mass-segregation time (m_mean / m) t_rh of a star above the mean: an order of magnitude. */
export function segregationTime({ halfMassRelaxation, meanMass, mass }) {
  if (!positive(halfMassRelaxation) || !positive(meanMass) || !positive(mass))
    return refused(
      'input',
      'the relaxation time and the masses must be positive numbers'
    );
  if (mass < meanMass)
    return refused(
      'range',
      'a star below the mean mass does not sink: it is the heavy stars that segregate'
    );
  return ok(
    (meanMass / mass) * halfMassRelaxation,
    't_seg = (m_mean / m) t_rh',
    [
      'an order of magnitude (Spitzer 1969): a factor of a few either way, never a prediction of one star',
      CITED.segregation.source,
    ]
  );
}

/** The evaporation time c t_rh with c given or the cited 300: an order of magnitude. */
export function evaporationTime({
  halfMassRelaxation,
  coefficient = CITED.evaporation.value,
}) {
  if (!positive(halfMassRelaxation) || !positive(coefficient))
    return refused(
      'input',
      'the relaxation time and the coefficient must be positive numbers'
    );
  return ok(coefficient * halfMassRelaxation, 't_ev = c t_rh', [
    `c = ${coefficient} (${CITED.evaporation.source}) for an isolated, tidally truncated cluster`,
    'an order of magnitude: a cluster in a tidal field, with a mass spectrum or with binaries evaporates at another rate',
  ]);
}

/** Collisionless (T <= 0.1 t_rh), collisional (T >= t_rh) or transitional: a stated convention. */
export function criterion({ time, halfMassRelaxation }) {
  if (!positive(time) || !positive(halfMassRelaxation))
    return refused(
      'input',
      'the time and the relaxation time must be positive numbers'
    );
  const ratio = time / halfMassRelaxation;
  const kind =
    ratio <= CRITERION.collisionlessBelow
      ? 'collisionless'
      : ratio >= CRITERION.collisionalAbove
        ? 'collisional'
        : 'transitional';
  return {
    status: 'ok',
    kind,
    ratio,
    rule: `collisionless when T <= ${CRITERION.collisionlessBelow} t_rh, collisional when T >= ${CRITERION.collisionalAbove} t_rh`,
    assumes: ['a convention, not a law: relaxation is gradual'],
  };
}
