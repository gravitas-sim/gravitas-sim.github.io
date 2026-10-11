// =============================================================================
// The variable-star data the instruments and lessons read
// -----------------------------------------------------------------------------
// Three table packs (tools/data-packs/variables.mjs): two TESS light curves and
// the Cepheid period-luminosity table. Each pack's record is a small module and
// its rows are a sidecar file fetched at run time, so no route that reaches
// this loader carries a light curve. A caller passes its own fetch so a test or
// a Worker can supply the files.
// =============================================================================

import { tableOf } from './tableObservation.js';
import { magnitudesOf } from './kernels/variables/fit.js';

/** Where each pack's rows are: sidecar files, not modules. */
export const VARIABLES_SIDECARS = Object.freeze({
  suDra: '/variables/tess-su-dra-s15.json',
  etaAql: '/variables/tess-eta-aql-s81.json',
  cepheids: '/variables/shoes-r22-cepheids.json',
  sample: '/variables/class-sample.json',
});

/** The anchors' distance moduli are published values, not rows: see the pack's manifest. */
export const ANCHORS = Object.freeze({
  lmc: Object.freeze({
    mu: 18.477,
    sigma: 0.026,
    ref: 'Pietrzynski et al. 2019, Nature 567, 200',
  }),
  n4258: Object.freeze({
    mu: 29.397,
    sigma: 0.032,
    ref: 'Reid, Pesce & Riess 2019, ApJ 886, L27',
  }),
});

const column = (t, id) => t.columns.find(c => c.id === id).values;

async function packOf(load, url, fetchImpl) {
  const [mod, res] = await Promise.all([load(), fetchImpl(url)]);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return { PACK: mod.PACK, SERIES: await res.json() };
}

/** A TESS light-curve pack as time, magnitude (about the star's median) and error. */
export function lightCurveOf(pack) {
  const t = tableOf(pack);
  const flux = column(t, 'flux');
  const err = column(t, 'flux_err');
  return {
    pack: pack.PACK,
    t: column(t, 'time'),
    flux,
    fluxError: err,
    mag: magnitudesOf(flux),
    magError: Float64Array.from(
      err,
      (e, i) => (2.5 / Math.LN10) * (e / flux[i])
    ),
    tmag: pack.PACK.object.tessMagnitude,
  };
}

/** The Cepheid table as one sample per host. */
export function cepheidsOf(pack) {
  const t = tableOf(pack);
  const host = column(t, 'host');
  const period = column(t, 'period');
  const mw = column(t, 'mw');
  const out = { lmc: [], n4258: [], m101: [] };
  const key = { 1: 'lmc', 2: 'n4258', 3: 'm101' };
  for (let i = 0; i < t.n; i++) out[key[host[i]]].push(i);
  const sample = idx => ({
    periods: Float64Array.from(idx, i => period[i]),
    mags: Float64Array.from(idx, i => mw[i]),
  });
  return {
    pack: pack.PACK,
    lmc: sample(out.lmc),
    n4258: sample(out.n4258),
    m101: sample(out.m101),
  };
}

/** The synthetic labelled sample: rows of {id, cls, period, amplitude, r21, ...}. */
export async function loadClassSample(fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(VARIABLES_SIDECARS.sample);
  if (!res.ok) throw new Error(`${VARIABLES_SIDECARS.sample}: HTTP ${res.status}`);
  const j = await res.json();
  return j.rows.map(r => ({
    ...r,
    logP: Math.log10(r.period),
    logAmp: Math.log10(Math.max(r.amplitude, 1e-4)),
  }));
}

/** Everything, from the sidecars. Resolves to {suDra, etaAql, cepheids, sample}. */
export async function loadVariablesData(fetchImpl = globalThis.fetch) {
  const [a, b, c, sample] = await Promise.all([
    packOf(
      () => import('./data/observations/tessSuDraS15.js'),
      VARIABLES_SIDECARS.suDra,
      fetchImpl
    ),
    packOf(
      () => import('./data/observations/tessEtaAqlS81.js'),
      VARIABLES_SIDECARS.etaAql,
      fetchImpl
    ),
    packOf(
      () => import('./data/observations/shoesR22Cepheids.js'),
      VARIABLES_SIDECARS.cepheids,
      fetchImpl
    ),
    loadClassSample(fetchImpl),
  ]);
  return {
    suDra: lightCurveOf(a),
    etaAql: lightCurveOf(b),
    cepheids: cepheidsOf(c),
    sample,
  };
}
