// =============================================================================
// The cosmology data the instruments and lessons read
// -----------------------------------------------------------------------------
// Four table packs (tools/data-packs/cosmology.mjs): Hubble's 1929 table, the
// DES five-year supernova Hubble diagram, an SDSS redshift strip and the
// numbers the Coma scenario quotes. Each pack's record is a small module and its
// rows are a sidecar file fetched at run time, so no route that reaches this
// loader carries a table. A caller passes its own fetch so a test or a Worker
// can supply the files. The Cepheid table of the distance ladder is
// js/variablesData.js's.
// =============================================================================

import { tableOf } from './tableObservation.js';

/** Where each pack's rows are: sidecar files, not modules. */
export const COSMOLOGY_SIDECARS = Object.freeze({
  hubble: '/cosmology/hubble-1929-table1.json',
  des: '/cosmology/des-sn5yr-hd.json',
  pantheon: '/cosmology/pantheon-plus-hd.json',
  sdss: '/cosmology/sdss-dr18-redshift-slice.json',
  coma: '/cosmology/coma-cluster-quoted.json',
});

const column = (t, id) => t.columns.find(c => c.id === id).values;

async function packOf(load, url, fetchImpl) {
  const [mod, res] = await Promise.all([load(), fetchImpl(url)]);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return { PACK: mod.PACK, SERIES: await res.json() };
}

/** Hubble's 24 nebulae: names in row order, distance (Mpc), velocity (km/s), m_t. */
export function hubbleOf(pack) {
  const t = tableOf(pack);
  return {
    pack: pack.PACK,
    names: pack.PACK.object.identifiers,
    r: column(t, 'r'),
    v: column(t, 'v'),
    mt: column(t, 'mt'),
  };
}

/** The supernova table: redshift, distance modulus, error, and the survey flag. */
export function supernovaeOf(pack) {
  const t = tableOf(pack);
  return {
    pack: pack.PACK,
    z: column(t, 'z'),
    mu: column(t, 'mu'),
    err: column(t, 'mu_err'),
    des: column(t, 'des'),
  };
}

/** The redshift strip: right ascension (degrees) and redshift. */
export function stripOf(pack) {
  const t = tableOf(pack);
  return { pack: pack.PACK, ra: column(t, 'ra'), z: column(t, 'z') };
}

/** The four numbers the Coma scenario quotes. */
export function comaOf(pack) {
  const t = tableOf(pack);
  return {
    pack: pack.PACK,
    sigma: column(t, 'sigma')[0],
    radius: column(t, 'radius')[0],
    starMass: column(t, 'star_mass')[0],
    gasMass: column(t, 'gas_mass')[0],
  };
}

/**
 * The Pantheon+SH0ES table (pack `pantheon-plus-hd`, no licence stated,
 * credited; DECISION_REGISTER.md D-RIGHTS-04): redshift, SH0ES-scale modulus,
 * its covariance-diagonal error (plotting only), the Cepheid-calibrator flag
 * and the survey code. Fetched on its own, so no caller of loadCosmologyData
 * pays for it.
 */
export async function loadPantheonPlus(fetchImpl = globalThis.fetch) {
  const pack = await packOf(
    () => import('./data/observations/pantheonPlusHd.js'),
    COSMOLOGY_SIDECARS.pantheon,
    fetchImpl
  );
  const t = tableOf(pack);
  return {
    pack: pack.PACK,
    z: column(t, 'z'),
    mu: column(t, 'mu'),
    err: column(t, 'mu_err'),
    calibrator: column(t, 'cal'),
    survey: column(t, 'survey'),
  };
}

/** Everything, from the sidecars: {hubble, supernovae, strip, coma}. */
export async function loadCosmologyData(fetchImpl = globalThis.fetch) {
  const [a, b, c, d] = await Promise.all([
    packOf(
      () => import('./data/observations/hubble1929Table1.js'),
      COSMOLOGY_SIDECARS.hubble,
      fetchImpl
    ),
    packOf(
      () => import('./data/observations/desSn5yrHd.js'),
      COSMOLOGY_SIDECARS.des,
      fetchImpl
    ),
    packOf(
      () => import('./data/observations/sdssDr18RedshiftSlice.js'),
      COSMOLOGY_SIDECARS.sdss,
      fetchImpl
    ),
    packOf(
      () => import('./data/observations/comaClusterQuoted.js'),
      COSMOLOGY_SIDECARS.coma,
      fetchImpl
    ),
  ]);
  return {
    hubble: hubbleOf(a),
    supernovae: supernovaeOf(b),
    strip: stripOf(c),
    coma: comaOf(d),
  };
}
