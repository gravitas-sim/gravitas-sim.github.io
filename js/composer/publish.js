// =============================================================================
// The composer's remix, publish and link-preview actions
// -----------------------------------------------------------------------------
// Prompt 78 (REMIX.md). Loaded by js/composerPage.js only when one of them is
// pressed, so the composer's own route does not carry the lesson registry, the
// remix rules or the link codec.
// =============================================================================

import { packLink } from './packLink.js';
import { loadOriginal, remixBuiltin, remixInvestigation } from './remixApi.js';

/**
 * A remix of a built-in, under an id no draft has.
 *
 * @param {string} from - A built-in investigation id
 * @param {Iterable<string>} taken - Ids already in use
 * @returns {Promise<?{pack: object, kept: Array}>}
 */
export async function remixNew(from, taken) {
  const used = new Set(taken);
  let id = `my-${from}`.slice(0, 60);
  for (let n = 2; used.has(id); n++) id = `my-${from}-${n}`.slice(0, 60);
  return remixBuiltin(from, { id });
}

/** What a remix keeps from its original, as remixInvestigation lists it. */
export async function keptOf(pack) {
  const o = await loadOriginal(pack.derivedFrom?.id);
  return o ? remixInvestigation(o.en, o.es, { id: 'x' }).kept : [];
}

/**
 * The link for a pack: a remix as its difference from its original.
 * @param {object} pack - A valid pack
 */
export async function publish(pack) {
  const base = pack.derivedFrom
    ? (await remixBuiltin(pack.derivedFrom.id, { id: 'base' }))?.pack
    : null;
  return packLink(pack, { root: `${location.origin}/`, base });
}

/**
 * Every status below is worded after a language switch in progress has landed
 * (js/composerPage.js passes ctx.languageSettled), so it is said in the
 * language the reader chose and not the one they were leaving.
 */
const settled = c => c.languageSettled?.();

export async function remix(c) {
  const from = c.$('cp-remix-from').value;
  const got = await remixNew(from, c.taken());
  await settled(c);
  if (!got) return c.setStatus(c.t('composer.status.remixFailed'));
  c.start(
    got.pack,
    c.t('composer.status.remixed', { id: got.pack.derivedFrom.id })
  );
}

export async function publishLink(c) {
  await settled(c);
  if (!c.ok()) return c.setStatus(c.t('composer.publish.fixFirst'));
  const link = await publish(c.doc());
  await settled(c);
  c.$('cp-link').value = link.url;
  c.$('cp-link-note').textContent = c.t(
    link.comfortable ? 'composer.publish.ok' : 'composer.publish.long',
    { length: link.length, limit: link.limit }
  );
}

/** The preview is the delivery path a student's link takes (js/remix/open.js). */
export async function preview(c) {
  await settled(c);
  if (!c.ok()) return c.setStatus(c.t('studio.status.fixFirst'));
  const { url } = await publish(c.doc());
  await settled(c);
  c.$('cp-preview').src = url;
  c.setStatus(c.t('composer.status.previewed'));
}

/**
 * The answer key for this pack, as a download: nothing leaves the page. A key
 * asked for while the check that follows an edit (a remix just made, say) is
 * still running waits for it, and one that cannot be made says so in the status.
 */
async function key(c, locale) {
  try {
    await settled(c);
    for (let i = 0; i < 150 && !c.verdict(); i++)
      await new Promise(r => setTimeout(r, 100));
    if (!c.ok()) return c.setStatus(c.t('studio.status.fixFirst'));
    const { saveKey } = await import('./packKey.js');
    await saveKey(c.doc(), c.compiled(), c.texts(), locale);
  } catch {
    // A language chosen a moment ago may still be loading; say it in that one.
    await settled(c);
    c.setStatus(c.t('composer.key.failed'));
  }
}
export const keyEn = c => key(c, 'en');
export const keyEs = c => key(c, 'es');

/** What a remix keeps from its original, listed for the author. */
export async function renderKept(c, d) {
  c.$('cp-kept-card').hidden = false;
  const kept = await keptOf(d);
  const list = c.$('cp-kept');
  list.textContent = '';
  for (const k of kept)
    list.append(
      c.el(
        'li',
        {},
        k.sid === null
          ? c.t('composer.kept.lesson')
          : c.t('composer.kept.step', { sid: k.sid }),
        ': ',
        c.el('code', {}, k.fields.join(', '))
      )
    );
}
