// A transit light curve from a system: the planet's disk crossing the star's,
// seen from the observer's geometry. Circular orbits, quadratic limb darkening
// (Kipping q1, q2), the Gravitas inference core's own transit model so a fit
// with that model recovers the truth parameters by name.
import { AU_METERS, EARTH_RADIUS_M, SOLAR_RADIUS_M } from '../../constants.js';
import { limbDarkening, transitFlux } from '../../inference/transit.js';
import { conjunctionTime, geometryOf, orbitOf } from '../system.js';
import { epochsInDays, requireSetup, timeSeries } from './common.js';

export const ID = 'transit';
export const VERSION = '1.0.0';

/** Transit parameters of one planet, as the inference core names them. */
export function transitParameters(state, planetIndex = 0) {
  const star = state.star;
  const pl = state.planets[planetIndex];
  const o = orbitOf(star, pl);
  const g = geometryOf(state);
  const aRs = o.aM / (star.radiusSun * SOLAR_RADIUS_M);
  const k =
    (pl.radiusEarth * EARTH_RADIUS_M) / (star.radiusSun * SOLAR_RADIUS_M);
  const b = aRs * Math.abs(g.cosI);
  const t0 = conjunctionTime(o, g);
  const { q1, q2 } = star.limb ?? { q1: 0.36, q2: 0.3 };
  return { t0, P: o.periodDays, k, aRs, b, q1, q2, e: o.e };
}

export function run(state, rawSetup, opts = {}) {
  const setup = requireSetup(rawSetup, ['photometer']);
  const plan = epochsInDays(setup);
  const deficits = new Float64Array(plan.times.length);
  const parameters = [];
  const exposure = setup.exposure.time;
  state.planets.forEach((pl, i) => {
    const p = transitParameters(state, i);
    if (p.e > 1e-9)
      throw new Error(
        `the transit model needs a circular orbit; ${pl.id ?? i} has e = ${p.e}`
      );
    const { u1, u2 } = limbDarkening(p.q1, p.q2);
    const f = transitFlux(
      plan.times,
      { ...p, u1, u2 },
      {
        exposure,
        supersample:
          setup.exposure.supersample > 1 ? setup.exposure.supersample : 11,
        annuli: 96,
      }
    );
    for (let j = 0; j < f.length; j++) deficits[j] += 1 - f[j];
    const tag = state.planets.length > 1 ? `${pl.id ?? i}.` : '';
    const add = (id, name, value, unit) =>
      parameters.push({
        id: `${tag}${id}`,
        name: `${pl.id ?? 'planet'}: ${name}`,
        value,
        unit,
        ...(i === 0 ? { fit: id } : {}),
      });
    add('t0', 'mid-transit time', p.t0, 'd');
    add('P', 'period', p.P, 'd');
    add('k', 'radius ratio Rp/R*', p.k, '');
    add('aRs', 'a/R*', p.aRs, '');
    add('b', 'impact parameter', p.b, '');
    add('q1', 'limb darkening q1', p.q1, '');
    add('q2', 'limb darkening q2', p.q2, '');
  });
  const f0 = state.star.baselineFlux ?? 1;
  const clean = Float64Array.from(deficits, d => f0 * (1 - d));
  return timeSeries({
    model: ID,
    version: VERSION,
    setup,
    plan,
    clean,
    title: opts.title ?? 'Synthetic transit light curve',
    quantity: 'Relative flux',
    unit: '',
    truth: { parameters },
    notes: [
      'Circular orbits and quadratic limb darkening only.',
      'Several planets add their deficits; overlapping transits are not treated.',
      'Each point is the mean over its exposure.',
    ],
  });
}

export { AU_METERS };
