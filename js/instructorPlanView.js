// =============================================================================
// The panel that prints a course's activity list, and where an instructor writes
// the outcomes it maps to (an instructor module, Roadmap III Prompt 174)
// -----------------------------------------------------------------------------
// One panel for both places an instructor has a course open: the course builder
// (opened as `openTerm('plan')`, so the page needed one more line and no more
// imports) and the distribution kit (which has the package but cannot edit it).
// It builds the list in the page's language from the course as it stands,
// shows it, and prints it, saves it as a web page or as Markdown, or copies the
// Markdown. The list itself is js/instructorPlan.js and its words are
// js/instructorPlanText.js; this is only the form, drawn into an element the page
// gives it, with callbacks for everything the page owns. Nothing is stored and
// nothing is sent.
// =============================================================================

import {
  PLAN_CSS,
  buildPlan,
  fileName,
  statementFor,
  toHtml,
  toMarkdown,
} from './instructorPlan.js';
import { tr } from './instructorPlanText.js';

/** Make an element: `h('p', {className}, 'text', child)`. */
function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'className') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat())
    if (kid !== null && kid !== undefined && kid !== false) node.append(kid);
  return node;
}

/**
 * The Library's entries by id (textbook chapters and prerequisites), read when
 * the panel opens: one same-origin request, from the offline cache once visited.
 * @param {string} root - The site root's address
 * @returns {Promise<Map<string, object>>}
 */
export async function libraryEntries(root) {
  const res = await fetch(`${root}library/library.json`);
  if (!res.ok) throw new Error(String(res.status));
  return new Map((await res.json()).entries.map(e => [e.id, e]));
}

/** The list's own stylesheet, made to take the page's colors where it is previewed. */
const PREVIEW_CSS = `${PLAN_CSS}#plan-preview .plan{font:inherit;color:inherit;background:none;padding:0;max-width:none;overflow-wrap:anywhere}#plan-preview .plan a{color:inherit;text-decoration:underline}#plan-preview .plan .plan-note{background:none}#plan-preview .plan h1,#plan-preview .plan h2,#plan-preview .plan h3,#plan-preview .plan h4,#plan-preview .plan h5{border-color:currentColor}`;

/** Save text as a file. */
function saveText(name, text, type) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([text], { type })),
    download: name,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

/**
 * Print a plan alone: the list is put on the page in a root of its own, with
 * a stylesheet that hides everything else when printing, and both come off
 * when printing ends (the way js/submissionReview.js prints one section).
 * @param {string} html - toHtml(plan), a fragment
 */
export function printHtml(html) {
  const root = h('div', { id: 'plan-print-root' });
  root.innerHTML = html;
  const style = h(
    'style',
    { id: 'plan-print-style' },
    `@media screen{#plan-print-root{display:none}}@media print{body>*:not(#plan-print-root){display:none!important}#plan-print-root{display:block}}${PLAN_CSS}`
  );
  document.head.append(style);
  document.body.append(root);
  const done = () => {
    root.remove();
    style.remove();
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}

/**
 * Open the panel in its element.
 *
 * @param {object} ctx - What the page owns
 * @param {HTMLElement} ctx.host - The section to draw in
 * @param {() => object} ctx.source - The pack, read whenever the list is made
 * @param {() => ?object} ctx.manifest - A manifest (or what the kit makes of one) of it, or null while the course has problems
 * @param {(pack: object) => Promise<object>} ctx.facts - js/course/api.js courseFacts() of a pack
 * @param {{itemsOf: Function}} ctx.lib - js/course/pack.js's
 * @param {(pack: object, id: string) => string} ctx.nameOf - What an item is called, in the page's language
 * @param {(id: string, locale: string) => Promise<object>} ctx.load - A lesson, merged, in a language
 * @param {() => Promise<Map<string, object>>} ctx.entries - The Library's entries by id
 * @param {Map<string, object>} ctx.cards - The investigation manifest's cards by lesson id
 * @param {() => string} ctx.locale - 'en' or 'es'
 * @param {(edit: (pack: object) => void) => void} [ctx.edit] - Change the pack (the builder only: the kit holds a package it cannot edit)
 * @param {(text: string) => string} [ctx.shortHash] - The digest a Spanish text records of its English
 * @param {number} [ctx.level] - The heading level of the panel's title (2)
 * @returns {{refresh: (opts?: {light?: boolean}) => void, close: () => void}}
 */
export function openPlanPanel(ctx) {
  const { host } = ctx;
  const T = (id, vars) => tr(ctx.locale(), id, vars);
  const own = new Map();
  let made = null;
  let token = 0;
  let status = null;
  let preview = null;
  let timer = null;

  /** Build the plan as the course now stands: null while the course has problems. */
  async function prepare() {
    const pack = ctx.source();
    const manifest = ctx.manifest();
    if (!manifest) return null;
    const locale = ctx.locale();
    const facts = await ctx.facts(pack);
    // One at a time: Jest's linker, and the registry's cache, like it that way.
    for (const { item } of ctx.lib.itemsOf(pack)) {
      const key = `${locale}:${item.lesson}`;
      if (!item.lesson || own.has(key)) continue;
      try {
        own.set(key, (await ctx.load(item.lesson, locale))?.objectives || []);
      } catch {
        own.set(key, []);
      }
    }
    const entries = await ctx.entries().catch(() => new Map());
    return buildPlan(pack, {
      locale,
      lib: ctx.lib,
      facts,
      links: manifest,
      name: item => ctx.nameOf(pack, item.id),
      cards: ctx.cards,
      own: new Map(
        [...own]
          .filter(([k]) => k.startsWith(`${locale}:`))
          .map(([k, v]) => [k.slice(locale.length + 1), v])
      ),
      entries,
    });
  }

  const say = message => status && (status.textContent = message);

  async function drawPreview() {
    const mine = ++token;
    preview.textContent = '';
    say(T('p.loading'));
    const plan = await prepare();
    if (mine !== token) return;
    say('');
    made = plan;
    for (const b of host.querySelectorAll('[data-needs-plan]'))
      b.disabled = !plan;
    if (!plan) {
      preview.append(
        h('p', { className: 'ui-error', id: 'plan-fix' }, T('p.fixFirst'))
      );
      return;
    }
    preview.innerHTML = toHtml(plan, {
      headingLevel: (ctx.level ?? 2) + 2,
    });
  }

  /** The plan as it stands now (the course may have changed since the preview). */
  async function current() {
    return (await prepare()) || made;
  }

  // --- The outcomes editor (the builder only) -----------------------------------
  function editor() {
    const pack = ctx.source();
    const outs = pack.outcomes || [];
    const objectives = pack.objectives || [];
    const es = (pack.locales || []).includes('es');
    const box = h(
      'div',
      { id: 'plan-outcomes' },
      h(`h${(ctx.level ?? 2) + 1}`, { id: 'plan-out-h' }, T('p.out.h')),
      h('p', { className: 'ui-hint' }, T('p.out.lede'))
    );
    if (!objectives.length)
      box.append(h('p', { className: 'ui-hint' }, T('p.out.noObjectives')));
    outs.forEach((o, k) => {
      const n = k + 1;
      const idBase = `plan-out-${k}`;
      const fs = h(
        'fieldset',
        { className: 'ui-card', id: idBase },
        h('legend', {}, T('p.out.text', { n }))
      );
      const field = (locale, label) => {
        const id = `${idBase}-${locale}`;
        const input = h('input', {
          id,
          type: 'text',
          className: 'ui-input',
          maxlength: '300',
          value: o.text?.[locale] ?? '',
          lang: locale,
        });
        input.addEventListener('change', () =>
          ctx.edit(d => {
            const cur = { ...d.outcomes[k].text };
            const s = input.value.trim();
            if (locale === 'en') {
              if (s) cur.en = input.value;
              else delete cur.en;
            } else if (s) {
              cur.es = input.value;
              cur.esOf = ctx.shortHash(cur.en ?? '');
            } else {
              delete cur.es;
              delete cur.esOf;
            }
            d.outcomes[k].text = cur;
          })
        );
        return h(
          'div',
          { className: 'ui-field' },
          h('label', { for: id }, label),
          input
        );
      };
      fs.append(
        field('en', T('p.out.text', { n })),
        es ? field('es', T('p.out.textEs', { n })) : null
      );
      if (objectives.length)
        fs.append(
          h(
            'fieldset',
            { id: `${idBase}-map` },
            h('legend', {}, T('p.out.map', { n })),
            ...objectives.map((ob, j) => {
              const id = `${idBase}-ob-${j}`;
              const box1 = h('input', { type: 'checkbox', id });
              box1.checked = (ob.outcomes || []).includes(o.id);
              box1.addEventListener('change', () =>
                ctx.edit(d => {
                  const target = d.objectives[j];
                  const set = new Set(target.outcomes || []);
                  if (box1.checked) set.add(o.id);
                  else set.delete(o.id);
                  const kept = d.outcomes
                    .map(x => x.id)
                    .filter(x => set.has(x));
                  if (kept.length) target.outcomes = kept;
                  else delete target.outcomes;
                })
              );
              return h(
                'label',
                { className: 'ui-choice', for: id },
                box1,
                ` ${j + 1}. ${ob.text?.[ctx.locale()] || ob.text?.en || ob.id}`
              );
            })
          )
        );
      fs.append(
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: `${idBase}-remove`,
            onclick: () =>
              ctx.edit(d => {
                const gone = d.outcomes[k].id;
                d.outcomes.splice(k, 1);
                redrawAfter = 'plan-out-add';
                if (!d.outcomes.length) delete d.outcomes;
                for (const ob of d.objectives || [])
                  if (ob.outcomes) {
                    ob.outcomes = ob.outcomes.filter(x => x !== gone);
                    if (!ob.outcomes.length) delete ob.outcomes;
                  }
              }),
          },
          T('p.out.remove', { n })
        )
      );
      box.append(fs);
    });
    box.append(
      h(
        'p',
        { className: 'ui-hint', id: 'plan-out-count' },
        T('p.out.count', { n: outs.length, max: 12 }) +
          (es ? ` ${T('p.out.spanish')}` : '')
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'ui-button',
          id: 'plan-out-add',
          disabled: outs.length >= 12,
          onclick: () =>
            ctx.edit(d => {
              d.outcomes ||= [];
              let n = d.outcomes.length + 1;
              while (d.outcomes.some(x => x.id === `outcome-${n}`)) n++;
              d.outcomes.push({ id: `outcome-${n}`, text: { en: '' } });
              redrawAfter = `plan-out-${d.outcomes.length - 1}-en`;
            }),
        },
        T('p.out.add')
      )
    );
    return box;
  }

  /** The control to focus after a structural change redraws the editor. */
  let redrawAfter = null;

  function draw() {
    host.textContent = '';
    host.hidden = false;
    host.setAttribute('aria-labelledby', 'plan-h');
    status = h('p', {
      id: 'plan-status',
      className: 'ui-status',
      role: 'status',
      'aria-live': 'polite',
    });
    preview = h('div', {
      id: 'plan-preview',
      className: 'ui-card',
      tabindex: '-1',
    });
    const locale = ctx.locale();
    const button = (id, label, run) =>
      h(
        'button',
        {
          type: 'button',
          className: 'ui-button',
          id,
          'data-needs-plan': true,
          onclick: run,
        },
        label
      );
    const act = fn => async () => {
      const plan = await current();
      if (plan) fn(plan);
    };
    host.append(
      h('style', {}, PREVIEW_CSS),
      h(`h${ctx.level ?? 2}`, { id: 'plan-h', tabindex: '-1' }, T('p.h')),
      h('p', { className: 'ui-hint' }, T('p.lede')),
      h(
        'p',
        { className: 'ui-hint', id: 'plan-lang' },
        T('p.lang', { language: T(`p.lang.${locale}`) })
      ),
      h(
        'p',
        { className: 'ui-hint', id: 'plan-statement' },
        T('p.statement', { statement: statementFor(locale) })
      ),
      ctx.edit ? editor() : null,
      h(
        'div',
        { className: 'ui-actions' },
        button(
          'plan-print',
          T('p.print'),
          act(plan => {
            say(T('p.printing', { title: plan.title }));
            printHtml(toHtml(plan, { headingLevel: 1 }));
          })
        ),
        button(
          'plan-html',
          T('p.html'),
          act(plan => {
            const name = fileName(ctx.source(), plan.locale, 'html');
            saveText(
              name,
              toHtml(plan, { document: true }),
              'text/html;charset=utf-8'
            );
            say(T('p.saved', { file: name }));
          })
        ),
        button(
          'plan-md',
          T('p.md'),
          act(plan => {
            const name = fileName(ctx.source(), plan.locale, 'md');
            saveText(name, toMarkdown(plan), 'text/markdown;charset=utf-8');
            say(T('p.saved', { file: name }));
          })
        ),
        button(
          'plan-copy',
          T('p.copy'),
          act(async plan => {
            const text = toMarkdown(plan);
            try {
              await navigator.clipboard.writeText(text);
              say(T('p.copied', { title: plan.title, n: text.length }));
            } catch {
              say(T('p.copyFailed'));
            }
          })
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: 'plan-close',
            onclick: () => close(),
          },
          T('p.close')
        )
      ),
      status,
      h(`h${(ctx.level ?? 2) + 1}`, { id: 'plan-preview-h' }, T('p.preview')),
      preview
    );
    preview.setAttribute('aria-labelledby', 'plan-preview-h');
    if (redrawAfter) {
      host.querySelector(`#${redrawAfter}`)?.focus();
      redrawAfter = null;
    }
    drawPreview();
  }

  function close() {
    host.hidden = true;
    host.textContent = '';
    token++;
  }

  draw();

  return {
    /** A change in the page: the list again; the whole panel on a language change. */
    refresh({ light = false } = {}) {
      if (host.hidden) return;
      if (!light) return draw();
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The editor changes shape when outcomes are added or removed.
        const have = host.querySelectorAll('#plan-outcomes > fieldset').length;
        const want = (ctx.source().outcomes || []).length;
        const objectives = host.querySelectorAll(
          '#plan-out-0-map input'
        ).length;
        if (
          ctx.edit &&
          (have !== want ||
            (want && objectives !== (ctx.source().objectives || []).length))
        )
          draw();
        else drawPreview();
      }, 250);
    },
    close,
  };
}
