// =============================================================================
// A scenario pack's 3-D system: reading one in, and the link that opens it
// -----------------------------------------------------------------------------
// Roadmap II Prompt 105 (LAB3D.md, "On the platform"). A scenario pack may
// carry a `system3d` block (js/platform/scenario.js): a gravitas.system3d/1
// for the 3-D lab, beside whatever world the pack makes in the Sandbox. This
// is the Studio's side of it, loaded only when a 3-D system is in play (the
// Studio's start-up path imports none of it):
//
//   packFromSystem3d   a pack from the lab's file, or from an Orbital System
//                      Builder file, which migrates as LAB3D.md specifies: it
//                      becomes the 3-D system its recorded numbers give, in the
//                      plane z = 0, with the file's G folded into the masses
//   labLink            the link that opens the block in the lab, or in its
//                      embed (js/lab3d/link.js), with the pack's identity in
//                      the system's provenance so evidence made from it cites
//                      the pack
//
// Nothing is run here, and a link carries no code: it is the system's own
// numbers, which the lab validates as it validates any file.
// =============================================================================

import { canonicalJsonExact, fnv1a32 } from './hash.js';
import { blankPack } from './scenarioPack.js';
import { migrateSystem, validateSystem } from './lab3d/state.js';
import { systemFragment } from './lab3d/link.js';

/**
 * A pack from a 3-D system file or a 2-D builder file.
 * @param {object} data - The parsed file
 * @returns {{ok: true, pack: object, migrated: boolean} |
 *   {ok: false, code: string, vars?: object}}
 */
export function packFromSystem3d(data) {
  const read = migrateSystem(data);
  if (!read.ok) return read;
  const problems = validateSystem(read.system);
  if (problems.length)
    return { ok: false, code: problems[0].code, vars: problems[0].vars };
  // The seed is the system's: the same numbers give the same pack.
  const pack = blankPack(fnv1a32(canonicalJsonExact(read.system.bodies)));
  // The Sandbox world a 3-D pack makes beside it has nobody in it: the lab is
  // its subject.
  pack.settings = { placement: 'Empty' };
  pack.system3d = read.system;
  return { ok: true, pack, migrated: read.migrated };
}

/** The pack's own 3-D problems by the lab's checks: [] when there is none. */
export const checkSystem3d = pack =>
  pack?.system3d === undefined ? [] : validateSystem(pack.system3d);

/**
 * The link that opens a pack's 3-D system.
 * @param {object} pack - A pack with a `system3d`
 * @param {{origin?: string, embed?: boolean}} [o] - Where the site is, and
 *   whether the link is the lab's embed (reduced quality and motion, no chrome)
 * @returns {Promise<{ok: true, href: string} | {ok: false, code: string}>}
 */
export async function labLink(pack, { origin = '', embed = false } = {}) {
  if (!pack?.system3d) return { ok: false, code: 'noSystem3d' };
  const system = {
    ...pack.system3d,
    provenance: {
      ...(pack.system3d.provenance ?? {}),
      from: `scenario-pack ${pack.id} ${pack.version}`,
    },
  };
  const made = await systemFragment(system);
  if (!made.ok) return made;
  return {
    ok: true,
    href: `${origin}/3d/${embed ? '?embed=1&ev=1' : ''}#${made.fragment}`,
  };
}
