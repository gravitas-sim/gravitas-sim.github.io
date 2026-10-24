// =============================================================================
// The galactic packs from disk, for Node
// -----------------------------------------------------------------------------
// The three packs keep their rows in sidecar files (gaia/*.json) that a page
// fetches; a test or a tool reads the same files from the repository. Node only.
// =============================================================================

import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as solar from '../../js/data/observations/gaiaSolarNeighbourhood.js';
import * as cluster from '../../js/data/observations/gaiaNgc2420.js';
import * as rotation from '../../js/data/observations/milkyWayRotationCurve.js';

const ROOT = new URL('../../', import.meta.url);
const MODULES = { solar, cluster, rotation };

/** A pack as {PACK, SERIES}, which tableOf (js/tableObservation.js) reads. */
export function galacticPack(name) {
  const mod = MODULES[name];
  const text = readFileSync(new URL(mod.SIDECAR.file, ROOT), 'utf8');
  return { PACK: mod.PACK, SERIES: JSON.parse(text), SIDECAR: mod.SIDECAR };
}

/** A fetch that serves the sidecar files from the repository, by their site URLs. */
export const diskFetch = async url => {
  const file = new URL(`.${url}`, ROOT);
  try {
    const bytes = readFileSync(file);
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(bytes.toString('utf8')),
      // The image packs' frames files are checked byte for byte (Prompt 189).
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
    };
  } catch {
    return { ok: false, status: 404, json: async () => ({}) };
  }
};
