// An astrometric track: the star's reflex motion about the barycentre
// projected on the plane of the sky with js/observerGeometry.js, plus an
// optional proper motion. Offsets are in milliarcseconds from the barycentre's
// position at the first epoch's reference.
import { geometryOf, orbitOf, relativeState } from '../system.js';
import { projectPositionToSky } from '../../observerGeometry.js';
import { applyNoise, overExposure } from '../setup.js';
import { syntheticObservation, valueColumns } from '../observation.js';
import { epochsInDays, requireSetup } from './common.js';

export const ID = 'astrometry';
export const VERSION = '1.0.0';

/** The star's sky offset from the barycentre, mas, at time t (days). */
export function starOffsetMas(state, t, g = geometryOf(state)) {
  let x = 0;
  let y = 0;
  for (const pl of state.planets) {
    const o = orbitOf(state.star, pl);
    const { pos } = relativeState(o, t);
    const sky = projectPositionToSky(
      { x: -o.massRatio * pos.x, y: -o.massRatio * pos.y },
      g
    );
    x += sky.x;
    y += sky.y;
  }
  const k = 1000 / state.star.distancePc; // AU at d parsecs is 1/d arcsec
  return { x: x * k, y: y * k };
}

/** The reflex orbit's semi-major axis on the sky, mas, before projection. */
export const signatureMas = (state, i = 0) =>
  (orbitOf(state.star, state.planets[i]).a1AU * 1000) / state.star.distancePc;

export function run(state, rawSetup, opts = {}) {
  const setup = requireSetup(rawSetup, ['astrometer']);
  const plan = epochsInDays(setup);
  const g = geometryOf(state);
  const pm = state.star.properMotionMasPerYr ?? [0, 0];
  const t0 = plan.times[0];
  const n = setup.exposure.supersample;
  const at = (t, axis) =>
    overExposure(
      tt => starOffsetMas(state, tt, g)[axis],
      t,
      setup.exposure.time,
      n
    ) +
    (pm[axis === 'x' ? 0 : 1] * (t - t0)) / 365.25;
  const cleanX = Float64Array.from(plan.times, t => at(t, 'x'));
  const cleanY = Float64Array.from(plan.times, t => at(t, 'y'));
  // Each axis gets its own noise stream: a second setup seed suffix.
  const nx = applyNoise(cleanX, plan.times, plan.indices, setup);
  const ny = applyNoise(cleanY, plan.times, plan.indices, {
    ...setup,
    seed: `${setup.seed}:y`,
  });
  const parameters = [];
  state.planets.forEach((pl, i) => {
    const o = orbitOf(state.star, pl);
    parameters.push(
      {
        id: `${pl.id ?? i}.P`,
        name: `${pl.id ?? 'planet'}: period`,
        value: o.periodDays,
        unit: 'd',
      },
      {
        id: `${pl.id ?? i}.signature`,
        name: `${pl.id ?? 'planet'}: reflex semi-major axis`,
        value: signatureMas(state, i),
        unit: 'mas',
      }
    );
  });
  parameters.push(
    { id: 'pmx', name: 'proper motion x', value: pm[0], unit: 'mas/yr' },
    { id: 'pmy', name: 'proper motion y', value: pm[1], unit: 'mas/yr' }
  );
  return syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'time-series',
    title: opts.title ?? 'Synthetic astrometric track',
    columns: [
      {
        id: 'time',
        name: 'Time since the start of the run',
        unit: 'd',
        role: 'x',
        values: plan.times,
      },
      ...valueColumns('dx', 'Sky offset x', 'mas', nx.values, nx.sigma),
      ...valueColumns('dy', 'Sky offset y', 'mas', ny.values, ny.sigma),
    ],
    axes: { x: 'dx', y: 'dy' },
    truth: {
      parameters,
      injected: nx.injected,
      notes: [
        'Reflex motion only (and a straight proper motion); no parallax.',
        'The offsets are along the sky-plane axes of js/observerGeometry.js.',
      ],
    },
    extra: { time: { column: 'time', format: 'relative', scale: 'unknown' } },
  });
}
