// =============================================================================
// The stellar-activity light curves the instruments and lessons read (Prompt 220)
// -----------------------------------------------------------------------------
// Two table packs (tools/data-packs/activity.mjs): AU Microscopii (TESS sector 1,
// every kept 2-minute cadence) and EK Draconis (sector 16, 30-minute bins). Each
// pack's record is a small module and its rows are a sidecar file fetched at run
// time, so no route that reaches this loader carries a light curve. A caller passes
// its own fetch so a test or a Worker can supply the files.
// =============================================================================

import { tableOf } from './tableObservation.js';
import * as AU_MIC from './data/observations/tessAuMicS1.js';
import * as EK_DRA from './data/observations/tessEkDraS16.js';

/** Where each pack's rows are: sidecar files, not modules. */
export const ACTIVITY_SIDECARS = Object.freeze({
  auMic: '/variables/tess-au-mic-s1.json',
  ekDra: '/variables/tess-ek-dra-s16.json',
});

const MODULES = Object.freeze({ auMic: AU_MIC, ekDra: EK_DRA });
const column = (t, id) => t.columns.find(c => c.id === id).values;

/** A pack and its decoded rows as time (BTJD, days), flux over the median and its error. */
export function activityCurveOf(pack) {
  const t = tableOf(pack);
  return {
    pack: pack.PACK,
    t: column(t, 'time'),
    flux: column(t, 'flux'),
    err: column(t, 'flux_err'),
  };
}

/** One star by key ('auMic' or 'ekDra'), from its sidecar. */
export async function loadActivityCurve(id, fetchImpl = globalThis.fetch) {
  const mod = MODULES[id];
  if (!mod) throw new Error(`no activity light curve called ${id}`);
  const res = await fetchImpl(ACTIVITY_SIDECARS[id]);
  if (!res.ok) throw new Error(`${ACTIVITY_SIDECARS[id]}: HTTP ${res.status}`);
  return activityCurveOf({ PACK: mod.PACK, SERIES: await res.json() });
}
