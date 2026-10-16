// =============================================================================
// What makes an observation the same observation
// -----------------------------------------------------------------------------
// An observation's id depends on how it arrived: `pack:tess-hd209458-s56@1.0.0`
// from the built-in pack, `installed:...` from the catalog, `import:...` from a
// file. The same bytes opened three ways have three ids, and a notebook entry,
// a fit or an analysis that cites only the id cannot tell that they agree.
//
// The digest here is of the thing itself, not of its name: where it came from
// (kind, id, version), every column's values with their units and roles, the
// masks, the axes, and the time and spectral metadata that say what the values
// mean (the same numbers counted in BTJD or in MJD are not the same data). It
// is written beside the id, never over it, so a file or a notebook that cites
// an id still reads.
//
// Pure: no DOM, no storage. Browser and Node alike.
// =============================================================================

import { sha256Hex } from '../hash.js';

const numbers = values =>
  Array.from(values, v =>
    Number.isFinite(v) ? v : typeof v === 'number' ? null : v
  );

/**
 * What the data of an observation hold: its columns (ids, units, roles,
 * values), its masks and its axes. A title or a note is not among them.
 * js/measure/pipeline.js contentDigest() hashes exactly this.
 * @param {object} o - gravitas.observation/1
 * @returns {object}
 */
export const contentPayload = o => ({
  kind: o.kind,
  columns: o.columns.map(c => [
    c.id,
    c.unit ?? null,
    c.role,
    c.of ?? null,
    numbers(c.values),
  ]),
  masks: (o.masks || []).map(m => [m.id, m.rows]),
  axes: o.axes,
  image: o.image ? [o.image.width, o.image.height] : null,
});

/**
 * The SHA-256 of an observation as an identity: its source, its data, and the
 * metadata that gives the data their meaning.
 * @param {object} o - gravitas.observation/1
 * @returns {Promise<string>} 64 hex digits
 */
export function observationDigest(o) {
  return sha256Hex(
    JSON.stringify({
      source: [
        o.source?.kind ?? null,
        o.source?.id ?? null,
        o.source?.version ?? null,
      ],
      ...contentPayload(o),
      image: o.image ?? null,
      time: o.time ?? null,
      spectral: o.spectral ?? null,
    })
  );
}
