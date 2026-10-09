// =============================================================================
// An investigation pack as a link, and back
// -----------------------------------------------------------------------------
// Prompt 78 (REMIX.md). A pack travels like a course does: deflated, in the
// fragment of an address on this site, behind a tag that says what it is (a
// world starts with a digit, an assignment with `a`, a submission `s`, a course
// `c`, an investigation `i`). Nothing is sent anywhere; the page that opens it
// is the static application.
//
// The caps are the course link's and a world link's - js/shareState.js: a link
// past COMFORTABLE_URL_LENGTH is reported, so its author can send a file
// instead, and one that inflates past MAX_INFLATED_BYTES is refused unread.
//
// What the link holds depends on what the pack is. A pack written from scratch
// travels whole (`p`). A remix travels as its difference from the faithful copy
// of its original (`d`, js/platform/remix.js remixDelta), because the original
// is in the application and a whole copy of one is several times what a link
// may carry. Either way what the reader gets is a pack, and it is checked as one.
// =============================================================================

import {
  COMFORTABLE_URL_LENGTH,
  decodeTagged,
  encodeTagged,
} from '../shareState.js';
import { remixDelta } from '../platform/remix.js';

export const PACK_TAG = 'i';
export const PACK_LINK_VERSION = 1;

/** Whether a fragment is an investigation link, without decoding it. */
export const isPackFragment = hash => /^#?i\d+[zr]./.test(String(hash || ''));

/**
 * The link for a pack.
 *
 * @param {object} pack - A valid pack
 * @param {object} options
 * @param {string} options.root - The site's root, ending in a slash
 * @param {?object} [options.base] - For a remix, remixInvestigation()'s pack
 *   for its original, so the link can carry the difference
 * @returns {Promise<{url: string, fragment: string, length: number,
 *   comfortable: boolean, limit: number, form: 'pack'|'delta'}>}
 */
export async function packLink(pack, { root, base = null }) {
  const form = pack.derivedFrom && base ? 'delta' : 'pack';
  const payload =
    form === 'delta' ? { d: remixDelta(pack, base) } : { p: pack };
  const fragment = await encodeTagged(PACK_TAG, PACK_LINK_VERSION, payload);
  const url = `${root}#${fragment}`;
  return {
    url,
    fragment,
    length: url.length,
    comfortable: url.length <= COMFORTABLE_URL_LENGTH,
    limit: COMFORTABLE_URL_LENGTH,
    form,
  };
}

/**
 * What an investigation link holds.
 *
 * Never throws: a link is something a person pasted.
 *
 * @param {string} hash - The address's fragment
 * @returns {Promise<{ok: true, pack?: object, delta?: object}|
 *   {ok: false, reason: string}>} A reason is wrongKind, newerVersion,
 *   corrupt, tooLarge or notPack
 */
export async function readPackFragment(hash) {
  let decoded;
  try {
    decoded = await decodeTagged(PACK_TAG, hash, PACK_LINK_VERSION);
  } catch (err) {
    const raw = String(err?.message || '');
    return {
      ok: false,
      reason: ['wrongKind', 'newerVersion', 'tooLarge'].includes(raw)
        ? raw
        : 'corrupt',
    };
  }
  const p = decoded.payload;
  const only = k =>
    p && typeof p === 'object' && Object.keys(p).length === 1 && k in p;
  if (only('p') && p.p && typeof p.p === 'object')
    return { ok: true, pack: p.p };
  if (only('d') && p.d && typeof p.d === 'object')
    return { ok: true, delta: p.d };
  return { ok: false, reason: 'notPack' };
}
