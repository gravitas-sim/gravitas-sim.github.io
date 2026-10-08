// =============================================================================
// What next, when an investigation is finished
// -----------------------------------------------------------------------------
// Lazy: fetched when the finish panel opens. It offers, in this order, a deeper
// depth if the investigation has one, the next entry of the Library sequence
// the student came from, and the next item of the course they came from. Where
// they came from is one small record the Library and the course home leave
// when a link is followed (gravitas_next_context); it is only believed when the
// investigation just finished is in it, so a stale record offers nothing.
// Nothing here is sent anywhere; the Library index is a file of the site.
// =============================================================================

import { getLocale } from '../i18n/index.js';

export const CONTEXT_KEY = 'gravitas_next_context';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(CONTEXT_KEY));
  } catch {
    return null;
  }
};

/**
 * Fill the list.
 * @param {HTMLElement} list - The list the words ride on (data-*-en, data-*-es)
 * @param {{id: string, deeper: ?string, onDeeper: Function}} ctx
 */
export async function whatNext(list, { id, deeper, onDeeper }) {
  const es = getLocale() === 'es';
  const say = (name, vars) =>
    list.dataset[name + (es ? 'Es' : 'En')].replace(
      /\{(\w+)\}/g,
      (_, k) => vars[k]
    );
  const word = o => (o && (es ? o.es : o.en)) || o?.en || '';
  const out = [];
  const add = (node, then) => {
    const li = document.createElement('li');
    li.append(node);
    if (then) node.addEventListener('click', then);
    out.push(li);
  };
  const link = (href, text, then) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    add(a, then);
  };

  if (deeper) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-button';
    b.textContent = deeper;
    add(b, onDeeper);
  }

  const ctx = read();
  try {
    if (ctx?.k === 'seq') {
      const lib = await (await fetch('/library/library.json')).json();
      const seq = lib.sequences.find(s => s.id === ctx.id);
      const at = seq?.entries.indexOf(`investigation:${id}`) ?? -1;
      const next =
        at >= 0 && lib.entries.find(e => e.id === seq.entries[at + 1]);
      if (next)
        link(
          next.route,
          say('seq', { name: word(seq.title), title: word(next.title) })
        );
    } else if (ctx?.k === 'course') {
      const at =
        ctx.items[ctx.i]?.[0] === id
          ? ctx.i
          : ctx.items.findIndex(x => x[0] === id);
      const next = at >= 0 && ctx.items[at + 1];
      if (next) {
        const title = next[2];
        const name = ctx.t;
        const move = () => {
          ctx.i = at + 1;
          localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
        };
        link(
          next[0]
            ? `/#investigation=${next[0]}${next[1] ? `/${next[1]}` : ''}`
            : ctx.home,
          say('course', { name, title }),
          move
        );
      }
      if (at >= 0) link(ctx.home, say('home', { name: ctx.t }));
    }
  } catch {
    /* offline and not cached: the rest of the list stands */
  }
  list.replaceChildren(...out);
}
