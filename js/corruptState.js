// Saved data the browser holds but this build cannot read: keep, export, or
// discard - and discard only after an export has been taken.
import { openDialog, closeDialog } from './dialog.js';
import { t } from './i18n/index.js';
import { announce } from './notify.js';

/**
 * @param {{raw: string, filename: string, discard: Function}} opts - The text
 *   as stored, the name for its export, and what removes it
 * @returns {HTMLElement} The dialog
 */
export function recoverCorrupt({ raw, filename, discard }) {
  const panel = document.createElement('div');
  panel.className = 'modal-panel';
  panel.id = 'corruptStateDialog';
  panel.setAttribute('aria-labelledby', 'corruptStateTitle');
  panel.innerHTML = `<h2 id="corruptStateTitle"></h2><p></p><div class="ui-toolbar">
    <button type="button" class="ui-button" data-act="keep"></button>
    <button type="button" class="ui-button" data-act="export"></button>
    <button type="button" class="ui-button" data-act="discard" disabled></button></div>`;
  const text = [
    'h2',
    'p',
    '[data-act=keep]',
    '[data-act=export]',
    '[data-act=discard]',
  ];
  ['title', 'body', 'keep', 'export', 'discard'].forEach((k, i) => {
    panel.querySelector(text[i]).textContent = t(`failure.corrupt.${k}`);
  });
  panel.hidden = true;
  document.body.append(panel);
  const done = () => closeDialog(panel);
  panel.addEventListener('click', e => {
    const act = e.target.dataset?.act;
    if (act === 'keep') done();
    if (act === 'export') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([raw], { type: 'text/plain' }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      panel.querySelector('[data-act=discard]').disabled = false;
    }
    if (act === 'discard') {
      discard();
      done();
    }
  });
  openDialog(panel, {
    isolate: true,
    initialFocus: '[data-act=keep]',
    onClose: () => setTimeout(() => panel.remove(), 700),
  });
  announce(t('failure.corrupt.body'));
  return panel;
}
