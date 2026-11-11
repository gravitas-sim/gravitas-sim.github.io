// =============================================================================
// Terms in text: a definition one press away
// -----------------------------------------------------------------------------
// Prose that uses a glossary term marks it, `[[roche-limit]]` or
// `[[roche-limit|the Roche limit]]` (the words after the bar are what shows,
// for a plural or a sentence that needs another form). A surface that renders
// prose runs `markTerms` over it, and each mark becomes a button that opens the
// definition in place and closes it on a second press, never unbidden.
//
// The definitions are the glossary page's own, written from one table
// (tools/glossary.mjs): two lazy files, one per language, fetched the first
// time a reader looks at prose that holds a mark. An id the glossary does not
// define shows as its words and nothing else, and tests/glossaryTerms.test.js
// fails the source that wrote it.
//
// Lazy module: no start-up path reaches it. Callers test `hasTerms(text)`
// first, so a page with no marks never fetches it.
// =============================================================================

import { getLocale } from './i18n/index.js';

const MARK = /\[\[([a-z0-9-]+)(?:\|([^\]]*))?\]\]/g;

const WORDS = {
  en: { glossary: 'In the glossary', model: 'Assumptions on the model page' },
  es: {
    glossary: 'En el glosario',
    model: 'Supuestos en la página del modelo',
  },
};

/**
 * Whether a piece of prose holds a term mark.
 * @param {string} text - Prose
 * @returns {boolean} True when `markTerms` has work to do
 */
export const hasTerms = text => typeof text === 'string' && text.includes('[[');

/**
 * The ids a piece of prose marks, in order.
 * @param {string} text - Prose
 * @returns {string[]} The ids
 */
export const termsIn = text =>
  [...String(text).matchAll(MARK)].map(match => match[1]);

/**
 * A piece of prose without its marks: what a reader of plain text, a copied
 * note or a screen-reader label gets.
 * @param {string} text - Prose
 * @param {{[id: string]: string[]}} [names] - id -> [name, ...], for a mark with no words
 * @returns {string} The words
 */
export const plain = (text, names = {}) =>
  String(text).replace(MARK, (all, id, shown) => shown || names[id]?.[0] || id);

/** Where a term cannot become a button of its own. */
const INSIDE = 'button, a, label, summary, textarea, [role="button"]';

const tables = {};
let counter = 0;

/**
 * The definitions in one language.
 * @param {string} [locale] - Defaults to the reader's
 * @returns {Promise<{[id: string]: string[]}>} id -> [name, definition, model]
 */
export async function definitions(locale = getLocale()) {
  const lang = locale === 'es' ? 'es' : 'en';
  tables[lang] ??= (
    lang === 'es'
      ? await import('./explain/terms.es.js')
      : await import('./explain/terms.en.js')
  ).default;
  return tables[lang];
}

/** Open or close one term's definition after its button. */
function toggle(button, row, lang) {
  const open = button.nextElementSibling?.classList.contains('gl-def')
    ? button.nextElementSibling
    : null;
  if (open) {
    open.remove();
    button.setAttribute('aria-expanded', 'false');
    return;
  }
  const region = document.createElement('span');
  region.className = 'gl-def';
  region.id = `gl-def-${++counter}`;
  region.setAttribute('role', 'note');
  region.append(`${row[0]}: ${row[1]} `);
  const link = document.createElement('a');
  link.href = `/glossary/#t-${button.dataset.term}`;
  link.textContent = WORDS[lang].glossary;
  region.append(link);
  if (row[2]) {
    const more = document.createElement('a');
    more.href = `/model/#${row[2]}`;
    more.textContent = WORDS[lang].model;
    region.append(' ', more);
  }
  button.after(region);
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', region.id);
}

/**
 * Turn the marks under an element into term buttons.
 *
 * Only text is read and replaced, so nothing a reader typed or a lesson wrote
 * as markup is interpreted; an id with no definition keeps its words.
 *
 * @param {Element} root - What to scan
 * @param {string} [locale] - Defaults to the reader's
 * @returns {Promise<number>} How many terms were made
 */
export async function markTerms(root, locale = getLocale()) {
  const lang = locale === 'es' ? 'es' : 'en';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (hasTerms(n.data) && !n.parentElement?.closest('.gl-term, .gl-def'))
      nodes.push(n);
  if (!nodes.length) return 0;
  const table = await definitions(lang);
  let made = 0;
  for (const node of nodes) {
    const out = document.createDocumentFragment();
    let at = 0;
    for (const m of node.data.matchAll(MARK)) {
      out.append(node.data.slice(at, m.index));
      at = m.index + m[0].length;
      const row = table[m[1]];
      const shown = m[2] || row?.[0] || m[1];
      // Inside a control (an option, a link, a label) a second control would
      // nest, so the words stay words; the glossary page has the definition.
      if (!row || node.parentElement?.closest(INSIDE)) {
        out.append(shown);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gl-term';
      button.dataset.term = m[1];
      button.setAttribute('aria-expanded', 'false');
      button.textContent = shown;
      button.addEventListener('click', () => toggle(button, row, lang));
      out.append(button);
      made++;
    }
    out.append(node.data.slice(at));
    node.replaceWith(out);
  }
  return made;
}
