// The reference corpus of THRESHOLDS.md: every built-in investigation as the
// pack a remix makes of it (English, Spanish and the digest of the English the
// Spanish was written from), plus the composer's example pack.
import { INVESTIGATIONS } from '../../js/data/investigations.js';
import { collectTexts } from '../../js/composer/compile.js';
import { EXAMPLE_INVESTIGATION } from '../../js/composer/example.js';

const HINTY =
  /^(steps\[\d+\]|bank\.items\[\d+\])\.(hints|feedback|misconceptions)/;
const OPTION = /^steps\[(\d+)\]\.options\[(\d+)\]$/;

export async function loadPacks() {
  const { remixBuiltin } = await import('../../js/composer/remixApi.js');
  const packs = [{ id: EXAMPLE_INVESTIGATION.id, pack: EXAMPLE_INVESTIGATION }];
  for (const inv of INVESTIGATIONS) {
    const r = await remixBuiltin(inv.id, { id: `rx-${inv.id}-1-0-0` });
    if (r) packs.push({ id: inv.id, pack: r.pack });
  }
  return packs;
}

/** @returns {{packs: Array, H: Array, S: Array, D: Array}} */
export async function corpus() {
  const packs = await loadPacks();
  const H = [];
  const S = [];
  const D = [];
  for (const { id, pack } of packs) {
    for (const t of collectTexts(pack)) {
      const row = { pack: id, path: t.path, en: t.en, es: t.es };
      if (t.es !== null) S.push(row);
      if (HINTY.test(t.path)) H.push(row);
      const m = OPTION.exec(t.path);
      if (m) {
        const step = pack.steps[+m[1]];
        if (Number.isInteger(step.answer) && step.answer !== +m[2])
          D.push({ ...row, step: +m[1], option: +m[2] });
      }
    }
  }
  return { packs, H, S, D };
}
