// A radial-velocity series from a system: the star's reflex motion about the
// barycentre, projected on the observer's line of sight with the same geometry
// the Radial Velocity panel uses (js/observerGeometry.js projectVelocityLOS;
// positive is receding). Planets' reflex velocities add.
import { AU_METERS, SECONDS_PER_DAY } from '../../constants.js';
import { projectVelocityLOS } from '../../observerGeometry.js';
import { overExposure } from '../setup.js';
import {
  conjunctionTime,
  geometryOf,
  orbitOf,
  relativeState,
} from '../system.js';
import { epochsInDays, requireSetup, timeSeries } from './common.js';

export const ID = 'radial-velocity';
export const VERSION = '1.0.0';
const AU_PER_DAY_TO_MS = AU_METERS / SECONDS_PER_DAY;

/** The semi-amplitude K, m/s, of one planet's reflex motion: exact. */
export function semiAmplitude(state, planetIndex = 0) {
  const o = orbitOf(state.star, state.planets[planetIndex]);
  const sinI = geometryOf(state).sinI;
  return (o.n * o.a1AU * sinI * AU_PER_DAY_TO_MS) / Math.sqrt(1 - o.e * o.e);
}

/** The star's radial velocity, m/s, at time t, systemic velocity excluded. */
export function starVelocity(state, t, g = geometryOf(state)) {
  let v = 0;
  for (const pl of state.planets) {
    const o = orbitOf(state.star, pl);
    const { vel } = relativeState(o, t);
    // The star moves opposite to the planet, scaled by the mass ratio.
    v += projectVelocityLOS(
      { x: -o.massRatio * vel.x, y: -o.massRatio * vel.y },
      g
    );
  }
  return v * AU_PER_DAY_TO_MS;
}

export function run(state, rawSetup, opts = {}) {
  const setup = requireSetup(rawSetup, ['spectrograph']);
  const plan = epochsInDays(setup);
  const g = geometryOf(state);
  const gamma = (state.star.systemicKmS ?? 0) * 1000;
  const n = setup.exposure.supersample;
  const clean = Float64Array.from(
    plan.times,
    t =>
      gamma +
      overExposure(tt => starVelocity(state, tt, g), t, setup.exposure.time, n)
  );
  const parameters = [];
  state.planets.forEach((pl, i) => {
    const o = orbitOf(state.star, pl);
    // The inference core's omega is measured from the line of sight's node;
    // here the planet's periapsis is measured from the reference axis, so it is
    // moved by the position angle and a quarter turn (checked against
    // js/inference/rv.js rvCurve to rounding in tests/forwardModels.test.js).
    const wEff = o.omega - g.positionAngleDeg * (Math.PI / 180) + Math.PI / 2;
    const tag = state.planets.length > 1 ? `${pl.id ?? i}.` : '';
    const add = (id, name, value, unit, fit) =>
      parameters.push({
        id: `${tag}${id}`,
        name: `${pl.id ?? 'planet'}: ${name}`,
        value,
        unit,
        ...(i === 0 && fit ? { fit } : {}),
      });
    add('P', 'period', o.periodDays, 'd', 'P');
    add('K', 'semi-amplitude', semiAmplitude(state, i), 'm/s', 'K');
    // The time of inferior conjunction is the transit time of the geometry.
    add('tc', 'time of inferior conjunction', conjunctionTime(o, g), 'd', 'tc');
    add(
      'sqrtEcosw',
      'sqrt(e) cos(omega)',
      Math.sqrt(o.e) * Math.cos(wEff),
      '',
      'sqrtEcosw'
    );
    add(
      'sqrtEsinw',
      'sqrt(e) sin(omega)',
      Math.sqrt(o.e) * Math.sin(wEff),
      '',
      'sqrtEsinw'
    );
    add('e', 'eccentricity', o.e, '');
  });
  parameters.push({
    id: 'gamma',
    name: 'systemic velocity',
    value: gamma,
    unit: 'm/s',
    fit: 'gamma',
  });
  return timeSeries({
    model: ID,
    version: VERSION,
    setup,
    plan,
    clean,
    title: opts.title ?? 'Synthetic radial-velocity series',
    quantity: 'Radial velocity',
    unit: 'm/s',
    truth: { parameters },
    notes: [
      'Two-body reflex motion per planet; planets do not interact.',
      'Stellar jitter is not modelled unless the setup adds red noise.',
    ],
  });
}
