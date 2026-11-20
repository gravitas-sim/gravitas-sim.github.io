// =============================================================================
// A link that could not be opened: why, who can fix it, and the one way on
// -----------------------------------------------------------------------------
// Every link that names work (an assignment, an activity, a pack, a lesson)
// can arrive broken, cut short by a mail program, made by a newer build or
// naming something that is gone. A toast said so for two seconds and left a
// bare sandbox behind it. This puts the same sentence in a dialog that stays
// until it is closed (#linkNotice, js/fragments/lesson-finish.html) and adds
// what a student needs next: whether they can mend it or only the sender can,
// and the one way on that exists: the investigation on its own, a reload, or
// the Library.
//
// Loaded only when a link is refused (js/notify.js refuseLink). It imports
// nothing, so a refusal never fetches a second module, and it never opens
// anything that failed validation: the way on is a plain investigation link.
// =============================================================================

/**
 * Show the dialog for a refused link.
 *
 * @param {object} what
 * @param {string} what.why - The sentence that says what went wrong
 * @param {'you'|'sender'} [what.who] - Who can fix it
 * @param {?string} [what.lesson] - An investigation that exists, to open alone
 * @param {boolean} [what.reload] - A reload is the way on
 * @returns {boolean} False where the dialog is not on the page (the caller
 *   then says it another way)
 */
export function refuseLink({ why, who = 'sender', lesson = null, reload }) {
  const d = document.getElementById('linkNotice');
  if (!d || typeof d.showModal !== 'function') return false;
  d.querySelector('#linkNoticeWhy').textContent = why;
  for (const p of d.querySelectorAll('[data-who]'))
    p.hidden = p.dataset.who !== who;
  const way = lesson ? 'Alone' : reload ? 'Reload' : 'Library';
  for (const k of ['Alone', 'Reload', 'Library'])
    d.querySelector(`#linkNotice${k}`).hidden = k !== way;
  d.querySelector('#linkNoticeAlone').onclick = () => {
    d.close();
    location.hash = `#investigation=${encodeURIComponent(lesson)}`;
  };
  d.querySelector('#linkNoticeReload').onclick = () => location.reload();
  if (!d.open) d.showModal();
  return true;
}
