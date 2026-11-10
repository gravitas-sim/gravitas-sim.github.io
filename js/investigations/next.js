// =============================================================================
// What next, when an investigation is finished
// -----------------------------------------------------------------------------
// Lazy: fetched when the finish panel opens. It offers, in this order, a deeper
// depth if the investigation has one, the next entry of the Library sequence
// the student came from, and the next item of the course they came from. Where
// they came from is one small record the Library and the course home leave
// when a link is followed (gravitas_next_context); it is only believed when the
// investigation just finished is in it, so a stale record offers nothing.
// Failing that, or after it, the Library's own relations (Prompt 163,
// tools/build-relations.mjs): what the index says comes next after this
// investigation, up to two, and one related item. Nothing here is sent
// anywhere; the Library index is a file of the site.
// =============================================================================

import { noteResume, put } from '../storage/local.js';
import { getLocale } from '../i18n/index.js';
import { KEY_INVESTIGATION_PREFIX, KEY_NEXT_CONTEXT } from '../names.js';

export const CONTEXT_KEY = KEY_NEXT_CONTEXT;

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
  let index = null;
  const library = async () =>
    (index ??= await (await fetch('/library/library.json')).json());
  try {
    if (ctx?.k === 'seq') {
      const lib = await library();
      // A renamed sequence still answers to the id it was stored under.
      const sid = lib.sequenceAliases?.[ctx.id] ?? ctx.id;
      const seq = lib.sequences.find(s => s.id === sid);
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
          put(CONTEXT_KEY, JSON.stringify(ctx), 'preferences');
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
  try {
    const lib = await library();
    const rel = lib.entries.find(e => e.id === `investigation:${id}`)?.rel;
    const entry = x => lib.entries.find(e => e.id === x);
    const have = new Set(
      out.map(li => li.querySelector('a')?.getAttribute('href'))
    );
    const opened = e => () =>
      noteResume({ id: e.id, route: e.route, title: e.title });
    let added = 0;
    for (const nid of rel?.next ?? []) {
      const e = entry(nid);
      if (!e || have.has(e.route) || added >= 2) continue;
      have.add(e.route);
      added++;
      link(e.route, say('rel', { title: word(e.title) }), opened(e));
    }
    const related = (rel?.related ?? [])
      .map(entry)
      .find(e => e && !have.has(e.route));
    if (related)
      link(
        related.route,
        say('related', { title: word(related.title) }),
        opened(related)
      );
  } catch {
    /* offline and not cached: the rest of the list stands */
  }
  list.replaceChildren(...out);
}

/**
 * "You may want X first" (Prompt 276): the investigations the Library says
 * this one builds on that this browser has not finished, each a link. Advice,
 * inside the panel's More: nothing is locked, and an investigation that is
 * itself finished gets none. Left hidden when there is nothing to say or the
 * Library's index cannot be read (offline and not cached).
 *
 * @param {HTMLElement} el - The paragraph the words ride on (data-say-en, -es)
 * @param {string} id - The investigation that is open
 */
export async function beforeThis(el, id) {
  el.hidden = true;
  let lib;
  try {
    lib = await (await fetch('/library/library.json')).json();
  } catch {
    return;
  }
  const es = getLocale() === 'es';
  const entry = x => lib.entries.find(e => e.id === x);
  // Finished as the Library counts it: every step of the lesson seen.
  const done = e => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          KEY_INVESTIGATION_PREFIX + e.id.replace(/^[a-z]+:/, '')
        )
      );
      return Array.isArray(saved?.visited) && saved.visited.length >= e.steps;
    } catch {
      return false;
    }
  };
  const here = entry(`investigation:${id}`);
  if (!here || done(here)) return;
  const need = (here.prerequisites ?? [])
    .map(entry)
    .filter(e => e?.format === 'lesson' && !done(e));
  if (!need.length) return;
  const parts = [el.dataset[es ? 'sayEs' : 'sayEn']];
  need.forEach((e, i) => {
    const a = document.createElement('a');
    a.href = e.route;
    a.textContent = (es && e.title.es) || e.title.en;
    a.addEventListener('click', () =>
      noteResume({ id: e.id, route: e.route, title: e.title })
    );
    parts.push(i ? ', ' : ' ', a);
  });
  el.replaceChildren(...parts);
  el.hidden = false;
}
