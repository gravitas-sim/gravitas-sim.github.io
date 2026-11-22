// =============================================================================
// A link that could not be opened: why, who can fix it, and the one way on
// -----------------------------------------------------------------------------
// Every link that names work (an assignment, an activity, a pack, an
// investigation) can arrive broken, cut short by a mail program, made by a
// newer build or naming something that is gone. A toast said so for two seconds
// and left a bare sandbox behind it. This puts the same sentence in a dialog
// that stays until it is closed (#linkNotice) and adds what a student needs
// next: whether they can mend it or only the sender can, and the one way on that
// exists: the investigation on its own, a reload, or the Library.
//
// Loaded only when a link is refused (js/notify.js refuseLink), and the dialog's
// markup (js/fragments/link-notice.html) is fetched with it, once, so no visit
// pays for either. It never opens anything that failed validation: the way on
// is a plain investigation link.
// =============================================================================

/** The fragment's host (tools/index-fragments.mjs) and its file's name. */
const HOST = 'link-notice';

/** The one fetch of the markup, shared by refusals that arrive together. */
let mounting = null;

/** Put the dialog on the page once; false where it cannot be. */
function mount() {
  if (document.getElementById('linkNotice')) return Promise.resolve(true);
  mounting ??= (async () => {
    // Not through js/i18n/dom.js: a module of its own here would be a chunk
    // every route loads. The markup has no translated attributes to apply.
    try {
      const res = await fetch(
        new URL(`js/fragments/${HOST}.html`, document.baseURI)
      );
      const host = document.querySelector(`template[data-host="${HOST}"]`);
      if (!res.ok || !host) return false;
      const tpl = document.createElement('template');
      tpl.innerHTML = await res.text();
      if (!document.getElementById('linkNotice')) host.after(tpl.content);
      return true;
    } catch {
      return false;
    } finally {
      mounting = null;
    }
  })();
  return mounting;
}

/**
 * Show the dialog for a refused link.
 *
 * @param {object} what
 * @param {string} what.why - The sentence that says what went wrong
 * @param {'you'|'sender'} [what.who] - Who can fix it
 * @param {?string} [what.lesson] - An investigation that exists, to open alone
 * @param {boolean} [what.reload] - A reload is the way on
 * @returns {Promise<boolean>} False where the dialog could not be put on the
 *   page (offline without it, say): the caller then says it another way
 */
export async function refuseLink({
  why,
  who = 'sender',
  lesson = null,
  reload,
}) {
  if (!(await mount())) return false;
  const d = document.getElementById('linkNotice');
  if (!d || typeof d.showModal !== 'function') return false;
  d.querySelector('#linkNoticeWhy').textContent = why;
  for (const p of d.querySelectorAll('[data-who]'))
    p.hidden = p.dataset.who !== who;
  // Described by what went wrong and by the line that says who can mend it.
  d.setAttribute(
    'aria-describedby',
    `linkNoticeWhy ${who === 'you' ? 'linkNoticeYou' : 'linkNoticeSender'}`
  );
  // The Library is beside the page, not at the site root (a project page lives
  // under a path).
  d.querySelector('#linkNoticeLibrary').href = new URL(
    'library/',
    document.baseURI
  ).href;
  const way = lesson ? 'Alone' : reload ? 'Reload' : 'Library';
  for (const k of ['Alone', 'Reload', 'Library'])
    d.querySelector(`#linkNotice${k}`).hidden = k !== way;
  d.querySelector('#linkNoticeAlone').onclick = () => {
    d.close();
    location.hash = `#investigation=${encodeURIComponent(lesson)}`;
  };
  d.querySelector('#linkNoticeReload').onclick = () => location.reload();
  if (!d.open) d.showModal();
  // The way on takes the focus: the first thing a keyboard reader can do.
  d.querySelector(`#linkNotice${way}`).focus();
  return true;
}
