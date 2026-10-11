// =============================================================================
// The notebook's "derive a quantity" form
// -----------------------------------------------------------------------------
// Opened from the notebook panel (js/notebookPanel.js), loaded only then. It
// lists the numbers the notebook holds as q1, q2, ... with their units and
// uncertainties, takes a formula over them (js/formula/) and a title, says at
// once what the formula would give or why it is refused, and hands the
// resulting entry to the panel as a draft, to be given words and kept.
// =============================================================================

import { compile } from '../formula/engine.js';
import { FormulaError, useNumberReader } from '../formula/parse.js';
import { parseNumber } from '../answerParse.js';
import { t, getLocale, registerMessages } from '../i18n/index.js';
import { formatNumber } from '../format.js';
import { EN_FORMULA } from '../i18n/en.formula.js';
import { ES_FORMULA } from '../i18n/es.formula.js';
import { derivedEntry, namedQuantities } from './derivedEntry.js';

useNumberReader(parseNumber);
registerMessages('en', EN_FORMULA);
registerMessages('es', ES_FORMULA);

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (v !== undefined && v !== false) n.setAttribute(k, String(v));
  }
  n.append(...kids);
  return n;
};

const words = e => {
  if (!(e instanceof FormulaError)) throw e;
  return t(`formula.err.${e.code}`, e.vars);
};

/**
 * @param {HTMLElement} host - Where the form goes
 * @param {{entries: () => object[], offer: (entry: object) => void}} ctx
 * @returns {{update: () => void}}
 */
export function mountDerivedPanel(host, ctx) {
  const list = el('ul', { class: 'nb-derive-list' });
  const title = el('input', {
    class: 'ui-input',
    id: 'nbDeriveTitle',
    type: 'text',
    autocomplete: 'off',
  });
  const text = el('input', {
    class: 'ui-input',
    id: 'nbDeriveText',
    type: 'text',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': 'nbDerivePreview',
  });
  const preview = el('p', { id: 'nbDerivePreview', class: 'ui-status' });
  const go = el('button', {
    class: 'ui-button',
    id: 'nbDeriveGo',
    type: 'button',
    text: t('nb.formula.go'),
  });
  const label = (s, input) =>
    el('label', { class: 'ui-field' }, el('span', { text: s }), input);
  host.replaceChildren(
    el('p', { text: t('nb.formula.intro') }),
    list,
    label(t('nb.formula.title'), title),
    label(t('nb.formula.text'), text),
    preview,
    go
  );

  const scope = qs => {
    const inputs = {};
    for (const q of qs)
      inputs[q.name] = {
        unit: q.unit,
        uncertainty:
          q.kind === 'interval'
            ? 'interval'
            : q.sigma === null
              ? 'none'
              : 'sigma',
      };
    return { inputs };
  };
  const show = () => {
    const qs = namedQuantities(ctx.entries());
    list.replaceChildren(
      ...qs.map(q =>
        el('li', {
          text: t('nb.formula.row', {
            name: q.name,
            label: q.label,
            value: formatNumber(q.value, { sig: 4 }),
            unit: q.unit ?? t('nb.formula.noUnit'),
          }),
        })
      )
    );
    preview.classList.remove('is-error');
    preview.textContent = '';
    if (!qs.length) preview.textContent = t('nb.formula.none');
    if (!text.value.trim() || !qs.length) return;
    try {
      const { info } = compile(text.value, scope(qs), { locale: getLocale() });
      preview.textContent = t('nb.formula.preview', {
        unit: info.unit === '' ? t('obs.formula.plain') : info.unitText,
        why: t(`obs.formula.why.${info.rule}`, {
          lacking: info.lacking.join(', '),
        }),
      });
    } catch (e) {
      preview.classList.add('is-error');
      preview.textContent = words(e);
    }
  };
  text.addEventListener('input', show);
  go.addEventListener('click', async () => {
    const qs = namedQuantities(ctx.entries());
    try {
      const entry = await derivedEntry({
        formula: text.value,
        title: title.value.trim() || text.value.trim(),
        locale: getLocale(),
        quantities: qs,
      });
      text.value = '';
      title.value = '';
      show();
      ctx.offer(entry);
    } catch (e) {
      preview.classList.add('is-error');
      preview.textContent = words(e);
    }
  });
  show();
  return { update: show };
}
