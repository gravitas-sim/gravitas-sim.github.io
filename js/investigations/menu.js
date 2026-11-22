// The drop-down a measure field with `options` shows instead of a text box, fetched
// when a lesson opens with such a field (js/investigations.js, `loadSeams`): the
// lesson route carries none of it, and `slots.menu` (js/investigations/stepView.js) is
// set only there. It imports only what figures.js does (the
// decimal mark is read here, not from js/answerParse.js): a module of the
// start-up chunk it shared with a lazy file would be split into a chunk of its own.

import { getLocale, t } from '../i18n/index.js';
import { escapeHtml as escape } from '../lessonMarkup.js';

/** An option's text: a number in the reader's decimal mark ("9,21" in Spanish), anything else as written. */
const text = o =>
  typeof o === 'number'
    ? String(o).replace('.', getLocale().startsWith('es') ? ',' : '.')
    : String(o);

/** The menu for one field; a stored choice with a decimal comma is read as a point to match the option's own number. */
export const select = (key, options, saved) => {
  const chosen = String(saved ?? '').replace(/^(\d+),(\d+)$/, '$1.$2');
  return `<select data-field="${escape(key).replace(/"/g, '&quot;')}"><option value="">${escape(t('inv.field.choose'))}</option>${options
    .map(
      o =>
        `<option${chosen === String(o) ? ' selected' : ''}>${escape(text(o))}</option>`
    )
    .join('')}</select>`;
};
