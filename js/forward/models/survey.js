// A survey of a synthetic universe: stars of known absolute magnitude, uniform
// in a cone, observed by an instrument with a magnitude limit, a completeness
// function and parallax and proper-motion errors that grow with faintness
// (js/survey/model.js has the physics and the statistics). The observation is
// a table of the stars the survey counted, labelled synthetic; the truth
// manifest holds what no catalogue tells you: every star's real absolute
// magnitude and distance, and the ids of the stars that were missed.
//
// The instrument is the catalogue kind, with the survey's own description in
// `instrument.survey` (validated here, not by the setup schema, which leaves
// an instrument's extra fields open): { skyAreaDeg2, completeness: { m50,
// width }, errors: { mag, parallax, pm: { floor, m0, slope } } }. The limit is
// `instrument.limitingMagnitude`.
import { syntheticObservation, valueColumns } from '../observation.js';
import { requireSetup } from './common.js';
import { makeUniverse, observe, malmquistBias } from '../../survey/model.js';

export const ID = 'survey';
export const VERSION = '1.0.0';

export function run(state, rawSetup, opts = {}) {
  const spec = state.universe;
  if (!spec) throw new Error('the survey model needs state.universe');
  const setup = requireSetup(rawSetup, ['catalogue']);
  if (!Number.isFinite(setup.instrument.limitingMagnitude))
    throw new Error('the survey needs instrument.limitingMagnitude');
  const sv = setup.instrument.survey ?? {};
  const u =
    spec.n && spec.M ? spec : makeUniverse({ seed: setup.seed, ...spec });
  const obs = observe(u, {
    limit: setup.instrument.limitingMagnitude,
    skyAreaDeg2: sv.skyAreaDeg2 ?? u.areaDeg2,
    completeness: sv.completeness ?? null,
    errors: sv.errors,
  });
  if (!obs.count) throw new Error('the survey counted no star');
  const rows = Array.from(obs.index);
  const pick = a => Float64Array.from(rows, i => a[i]);
  const columns = [
    {
      id: 'id',
      name: 'Star',
      unit: null,
      role: 'label',
      values: rows.map(i => u.ids[i]),
    },
    ...valueColumns(
      'mag',
      'Apparent magnitude (bolometric)',
      'mag',
      pick(obs.mObs),
      pick(obs.sigM)
    ),
    ...valueColumns(
      'parallax',
      'Parallax',
      'mas',
      pick(obs.plxObs),
      pick(obs.sigPlx)
    ),
    ...valueColumns(
      'pmra',
      'Proper motion in right ascension',
      'mas/yr',
      pick(obs.pmRaObs),
      pick(obs.sigPm)
    ),
    ...valueColumns(
      'pmdec',
      'Proper motion in declination',
      'mas/yr',
      pick(obs.pmDecObs),
      pick(obs.sigPm)
    ),
  ];
  const mq = malmquistBias(obs);
  const missing = [];
  for (let i = 0; i < u.n; i++) if (!obs.detected[i]) missing.push(u.ids[i]);
  return syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'table',
    title: opts.title ?? 'Synthetic magnitude-limited survey',
    columns,
    axes: { x: 'parallax', y: 'mag' },
    truth: {
      parameters: [
        { id: 'count', name: 'stars in the cone', value: u.n, unit: '' },
        { id: 'detected', name: 'stars counted', value: obs.count, unit: '' },
        {
          id: 'completeness',
          name: 'fraction of stars counted',
          value: obs.count / u.n,
          unit: '',
        },
        {
          id: 'meanM-all',
          name: 'mean absolute magnitude of all stars',
          value: mq.meanAll,
          unit: 'mag',
        },
        {
          id: 'meanM-counted',
          name: 'mean absolute magnitude of the counted stars',
          value: mq.meanCounted,
          unit: 'mag',
        },
        {
          id: 'malmquist',
          name: 'Malmquist bias (counted less all)',
          value: mq.bias,
          unit: 'mag',
        },
        {
          id: 'density',
          name: 'stars per cubic parsec',
          value: u.n / u.volume,
          unit: 'pc^-3',
        },
      ],
      columns: {
        id: rows.map(i => u.ids[i]),
        absoluteMagnitude: Array.from(pick(u.M)),
        distancePc: Array.from(pick(u.d)),
        trueMagnitude: Array.from(pick(u.m)),
      },
      missing,
      injected: null,
      notes: [
        'Bolometric magnitudes: no bolometric correction, no extinction, no binaries; stars uniform in space.',
        `Selection is on the measured magnitude (limit ${setup.instrument.limitingMagnitude}); ${missing.length} of ${u.n} stars were not counted.`,
        'Proper motions are drawn from an isotropic Gaussian velocity distribution unrelated to the stars’ masses.',
      ],
    },
  });
}
