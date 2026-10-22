import {
  dropCollection,
  entryIdOf,
  isSaved,
  itemOfEntry,
  itemsOfCollection,
  keepCollection,
  readCollections,
  removeSaved,
  toggleSaved,
} from './collections.js';

// =============================================================================
// Saved items and kept collections, drawn (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// The Library's item page gets a Save button, its start page a "Your
// collections" block, and a collection opened on the course home a Keep button.
// The record and its rules are js/library/collections.js; this is only the
// controls, written once: each host has one handler that reads the page's
// words and the entries from `current`, so a redraw never leaves an old
// closure behind. Loaded only when a collection exists or a button is pressed.
// =============================================================================

const escape = s =>
  String(s).replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

/** What the handlers read: the caller's words, entries and redraw. */
let current = { t: id => id, pick: x => x?.en ?? '', byId: new Map() };

/** The Save button of an item page. */
export function mountSave(box, entry, c) {
  current = { ...current, ...c };
  if (!entry || !itemOfEntry(entry)) return;
  const host = box.querySelector('.lib-item');
  if (!host || host.querySelector('.lib-save')) return;
  host
    .querySelector('p')
    ?.insertAdjacentHTML(
      'afterend',
      `<p class="lib-save"><button type="button" class="ui-button" data-save="${escape(entry.id)}" aria-pressed="${isSaved(entry.id)}">${escape(c.t('lib.save'))}</button> <span class="ui-note lib-save-note" role="status" aria-live="polite"></span></p>`
    );
  host.querySelector('.lib-save').onclick = e => {
    const b = e.target.closest('[data-save]');
    if (!b) return;
    const r = toggleSaved(entry);
    b.setAttribute('aria-pressed', String(r.saved));
    host.querySelector('.lib-save-note').textContent = current.t(
      r.full
        ? 'lib.save.full'
        : !r.ok
          ? 'lib.save.failed'
          : r.saved
            ? 'lib.save.done'
            : 'lib.save.removed'
    );
  };
}

/**
 * The block of the Library's start page: the student's own collection, then the
 * ones they kept. Returns how many collections it drew.
 * @param {HTMLElement} host - The block's body
 * @param {{t: Function, pick: Function, byId: Map, redraw: Function}} c
 */
export function drawCollections(host, c) {
  current = { ...current, ...c };
  const { t, pick, byId } = c;
  const have = readCollections();
  const list = (pack, own) => {
    const rows = itemsOfCollection(pack).map(item => {
      const e = byId.get(entryIdOf(item));
      const title = e ? pick(e.title) : item.title ? pick(item.title) : item.id;
      const name = e
        ? `<a class="lib-link" data-entry="${escape(e.id)}" href="${escape(e.route)}">${escape(title)}</a>`
        : escape(title);
      const note = item.studentNote
        ? ` <span class="ui-note">${escape(pick(item.studentNote))}</span>`
        : '';
      const rm = own
        ? ` <button type="button" class="ui-button" data-remove="${escape(item.id)}" aria-label="${escape(t('lib.collections.remove', { title }))}">${escape(t('lib.collections.removeShort'))}</button>`
        : '';
      return `<li>${name}${note}${rm}</li>`;
    });
    return `<ul class="lib-rows">${rows.join('')}</ul>`;
  };
  const parts = [];
  if (have.saved)
    parts.push(
      `<section class="lib-collection" data-collection="${escape(have.saved.id)}"><h3>${escape(t('lib.collections.saved'))}</h3>${list(have.saved, true)}<p><a href="/teaching/kit/#collections">${escape(t('lib.collections.share'))}</a></p></section>`
    );
  for (const { pack } of have.received) {
    const title = pick(pack.title);
    parts.push(
      `<section class="lib-collection" data-collection="${escape(pack.id)}"><h3>${escape(title)}</h3>${list(pack, false)}<p><button type="button" class="ui-button" data-drop="${escape(pack.id)}" aria-label="${escape(t('lib.collections.drop', { title }))}">${escape(t('lib.collections.dropShort'))}</button></p></section>`
    );
  }
  host.innerHTML = parts.join('');
  host.onclick = e => {
    const rm = e.target.closest('[data-remove]');
    const drop = e.target.closest('[data-drop]');
    if (rm) removeSaved(rm.dataset.remove);
    else if (drop) dropCollection(drop.dataset.drop);
    else return;
    current.redraw?.();
  };
  return parts.length;
}

/**
 * The Keep button of a collection opened on the course home. Nothing is kept
 * until it is pressed.
 * @param {HTMLElement} host
 * @param {object} pack - The collection
 * @param {{t: Function}} c
 */
export function mountKeep(host, pack, c) {
  if (!host) return;
  const kept = () =>
    readCollections().received.some(r => r.pack.id === pack.id);
  const say = id => {
    host.querySelector('.ch-keep-note').textContent = c.t(id);
  };
  host.innerHTML = `<button type="button" class="ui-button" aria-pressed="${kept()}">${escape(c.t('courseHome.keep'))}</button> <span class="ui-note ch-keep-note" role="status" aria-live="polite"></span>`;
  const button = host.querySelector('button');
  button.onclick = () => {
    const was = kept();
    const ok = was ? dropCollection(pack.id) : keepCollection(pack);
    button.setAttribute('aria-pressed', String(ok ? !was : was));
    say(
      !ok
        ? 'courseHome.keep.failed'
        : was
          ? 'courseHome.keep.dropped'
          : 'courseHome.keep.done'
    );
  };
}
