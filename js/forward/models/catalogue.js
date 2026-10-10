// A photometric catalogue from a synthetic stellar population (js/stellar/
// population.js): each star is a blackbody of its temperature and radius at a
// distance, observed through decoded bandpasses of the radiation kernel
// (js/kernels/radiation/photometry.js abMag / vegaMag), with white noise in
// magnitudes and a limiting magnitude in the first band. The stars below the
// limit are missing from the catalogue and listed in the truth manifest, which
// is what makes the selection effect visible.
//
// The caller decodes the bands (the packs load lazily); this module stays pure:
// `opts.bands` maps a band id to decodeBand() output.
import { PARSEC_M, SOLAR_RADIUS_M } from '../../constants.js';
import {
  abMag,
  blackbodySed,
  vegaMag,
} from '../../kernels/radiation/photometry.js';
import { applyNoise, uniformAt } from '../setup.js';
import { syntheticObservation, valueColumns } from '../observation.js';
import { requireSetup } from './common.js';

export const ID = 'catalogue';
export const VERSION = '1.0.0';

/** A star's distance, pc: fixed, or uniform in volume out to a limit. */
export function distanceOf(spec, seed, index) {
  if (spec.kind === 'fixed') return spec.pc;
  return spec.maxPc * Math.cbrt(uniformAt(`${seed}:distance`, index));
}

/** Magnitude of a blackbody star of this temperature, radius and distance. */
export function starMagnitude(
  band,
  teffK,
  radiusSun,
  distancePc,
  system = 'ab'
) {
  const scale = ((radiusSun * SOLAR_RADIUS_M) / (distancePc * PARSEC_M)) ** 2;
  const sed = blackbodySed(teffK, scale);
  return system === 'vega' ? vegaMag(band, sed) : abMag(band, sed);
}

export function run(state, rawSetup, opts = {}) {
  const stars = state.population?.stars;
  if (!stars?.length)
    throw new Error('the catalogue model needs state.population.stars');
  const setup = requireSetup(rawSetup, ['catalogue']);
  const ids = [].concat(setup.instrument.bandpass ?? []);
  if (!ids.length) throw new Error('the catalogue needs instrument.bandpass');
  const bands = ids.map(id => {
    const b = opts.bands?.[id];
    if (!b) throw new Error(`no decoded band "${id}" was given`);
    return b;
  });
  const system = setup.instrument.magSystem ?? 'ab';
  const dist = state.distance ?? { kind: 'fixed', pc: 100 };
  const limit = setup.instrument.limitingMagnitude;
  const rows = [];
  const missing = [];
  stars.forEach((st, i) => {
    const d = distanceOf(dist, setup.seed, i);
    const clean = bands.map(b =>
      starMagnitude(b, st.teffK, st.radiusSun, d, system)
    );
    // The limit applies to the noise-free magnitude: it is the sky, not the draw.
    if (Number.isFinite(limit) && clean[0] > limit) missing.push(st.id);
    else rows.push({ st, d, clean, index: i });
  });
  if (!rows.length)
    throw new Error('every star is fainter than the limiting magnitude');
  const nb = bands.length;
  const columns = [
    {
      id: 'id',
      name: 'Star',
      unit: null,
      role: 'label',
      values: rows.map(r => r.st.id),
    },
  ];
  let injected = null;
  bands.forEach((b, k) => {
    // One noise stream per band; each draw keyed by the star's own index.
    const idx = Int32Array.from(rows, r => r.index);
    const noisy = applyNoise(
      Float64Array.from(rows, r => r.clean[k]),
      idx,
      idx,
      {
        ...setup,
        seed: `${setup.seed}:${b.id}`,
      }
    );
    injected ??= noisy.injected;
    columns.push(
      ...valueColumns(
        `mag-${b.id}`,
        `Magnitude, ${b.id} (${system.toUpperCase()})`,
        'mag',
        noisy.values,
        noisy.sigma
      )
    );
  });
  const first = `mag-${bands[0].id}`;
  const second = nb > 1 ? `mag-${bands[1].id}` : first;
  return syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'table',
    title: opts.title ?? 'Synthetic photometric catalogue',
    columns,
    axes: { x: second, y: first },
    truth: {
      parameters: [
        {
          id: 'count',
          name: 'stars in the population',
          value: stars.length,
          unit: '',
        },
        {
          id: 'detected',
          name: 'stars above the limit',
          value: rows.length,
          unit: '',
        },
      ],
      columns: {
        id: rows.map(r => r.st.id),
        teffK: rows.map(r => r.st.teffK),
        radiusSun: rows.map(r => r.st.radiusSun),
        massSun: rows.map(r => r.st.massSun),
        distancePc: rows.map(r => r.d),
      },
      missing,
      injected,
      notes: [
        'Blackbody stars: no bolometric correction beyond a blackbody, no extinction, no binaries.',
        `Stars fainter than the limit in ${bands[0].id} are missing: ${missing.length} of ${stars.length}.`,
      ],
    },
  });
}
