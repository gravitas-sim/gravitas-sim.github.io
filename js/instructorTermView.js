// =============================================================================
// The panel for a course on the course builder: use it as it comes, or start
// a new term (Prompt 168)
// -----------------------------------------------------------------------------
// An instructor with one built-in course and fifteen minutes presses one
// button, and gets the link for their students, the course file to keep, and a
// plain list of what changed under the course since it was pinned. The same
// panel, opened on a course the instructor already has, starts its next term.
// The logic is js/instructorTerm.js; this is only the form and the result, drawn
// into an element the page gives it, with callbacks for everything the page
// owns (the draft, the facts, the download) and the modules it already holds
// (so this lazy file adds no chunk to the page's start-up).
// =============================================================================

import { startTerm, termLabel } from './instructorTerm.js';
import { tr } from './instructorTermText.js';

/**
 * A term to start the field with: the season the date falls in and the year, in
 * the page's language. The instructor changes it as they like.
 * @param {'en'|'es'} locale
 * @param {Date} [now]
 * @returns {string}
 */
export function suggestTerm(locale, now = new Date()) {
  const m = now.getMonth();
  const season = m <= 4 ? 0 : m <= 6 ? 1 : 2;
  const names =
    locale === 'es'
      ? ['Primavera', 'Verano', 'Otoño']
      : ['Spring', 'Summer', 'Fall'];
  return `${names[season]} ${now.getFullYear()}`;
}

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
 * Open the panel in its element.
 *
 * @param {object} ctx - What the page owns
 * @param {HTMLElement} ctx.host - The section to draw in
 * @param {'use'|'next'} ctx.mode - A shipped course as it comes, or the next term
 * @param {() => object} ctx.source - The pack to copy, read when the button is pressed
 * @param {(pack: object) => Promise<object>} ctx.facts - This build's facts for it
 * @param {(pack: object) => number} ctx.problems - How many problems the pack has
 * @param {(pack: object, message: string) => void} ctx.apply - Open the copy in the builder
 * @param {(pack: object, id: string) => string} ctx.nameOf - An item's name
 * @param {(name: string, text: string) => void} ctx.download - Save a file
 * @param {(pack: object) => string} ctx.serialize - The file's text
 * @param {() => string} ctx.locale - 'en' or 'es'
 * @param {string} ctx.root - The site's root address
 * @param {() => string} ctx.today - `YYYY-MM-DD`
 * @param {object} ctx.lib - The modules js/instructorTerm.js is given (see there)
 * @param {Function} ctx.courseLink - js/course/links.js courseLink
 * @returns {{refresh: () => void, close: () => void}}
 */
export function openTermPanel(ctx) {
  const { host, mode } = ctx;
  const T = (id, vars) => tr(ctx.locale(), id, vars);
  let typed = suggestTerm(ctx.locale());
  let error = null;
  let busy = false;
  let result = null;
  let note = '';

  const titleOf = pack =>
    pack.title?.[ctx.locale()] || pack.title?.en || pack.id;

  function form() {
    const source = ctx.source();
    const input = h('input', {
      id: 'cb-term-input',
      className: 'ui-input',
      type: 'text',
      maxlength: 40,
      autocomplete: 'off',
      'aria-describedby': `cb-term-hint${error ? ' cb-term-error' : ''}`,
      'aria-invalid': error ? 'true' : null,
    });
    input.value = typed;
    input.addEventListener('input', () => {
      typed = input.value;
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    });
    return [
      h('p', { className: 'ui-hint' }, T(`p.${mode}.lede`)),
      h(
        'p',
        { className: 'ui-hint', id: 'cb-term-source' },
        T('p.course', { title: titleOf(source), version: source.version })
      ),
      h(
        'div',
        { className: 'ui-field' },
        h('label', { for: 'cb-term-input' }, T('p.term')),
        input,
        h(
          'p',
          { className: 'ui-hint', id: 'cb-term-hint' },
          T(`p.term.hint.${mode}`)
        ),
        error
          ? h(
              'p',
              { className: 'ui-error', id: 'cb-term-error', role: 'alert' },
              error
            )
          : null
      ),
      h(
        'div',
        { className: 'ui-toolbar' },
        mode === 'next'
          ? h(
              'button',
              {
                type: 'button',
                className: 'ui-button',
                id: 'cb-term-keep',
                onclick: () => {
                  const pack = ctx.source();
                  ctx.download(`${pack.id}.course.json`, ctx.serialize(pack));
                },
              },
              T('p.keep')
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button is-primary',
            id: 'cb-term-go',
            disabled: busy,
            onclick: go,
          },
          T(`p.go.${mode}`)
        )
      ),
    ];
  }

  function stateLine(row) {
    const steps =
      (row.changedSteps.length
        ? T('r.steps.changed', { n: row.changedSteps.length })
        : '') +
      (row.missingSteps.length
        ? T('r.steps.missing', { n: row.missingSteps.length })
        : '');
    return T('r.item', {
      name: ctx.nameOf(result.pack, row.id),
      standing: T(`st.${row.standing}`),
      steps,
    });
  }

  function outcome() {
    const { pack, report, link } = result;
    const input = h('input', {
      id: 'cb-term-link',
      className: 'ui-input is-code',
      type: 'text',
      readonly: true,
    });
    input.value = link.url;
    const moved = report.items.filter(r => r.result !== 'same');
    const kit = `${ctx.root}teaching/kit/#${link.url.slice(link.url.indexOf('#') + 1)}`;
    return [
      h('h3', { id: 'cb-term-ready-h' }, T('r.h')),
      h(
        'p',
        { className: 'ui-status', id: 'cb-term-ready' },
        T('r.ready', {
          title: pack.term ? `${titleOf(pack)} (${pack.term})` : titleOf(pack),
        })
      ),
      h(
        'div',
        { className: 'ui-field' },
        h('label', { for: 'cb-term-link' }, T('r.link')),
        input,
        link.comfortable
          ? null
          : h('p', { className: 'ui-hint' }, T('r.long', { n: link.length }))
      ),
      h(
        'div',
        { className: 'ui-toolbar' },
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button is-primary',
            id: 'cb-term-copy',
            onclick: async () => {
              try {
                await navigator.clipboard.writeText(link.url);
                note = T('r.copied');
              } catch {
                input.select();
                note = T('r.copyFailed');
              }
              if (status) status.textContent = note;
            },
          },
          T('r.copy')
        ),
        h(
          'a',
          {
            className: 'ui-button',
            id: 'cb-term-open',
            href: link.url,
            target: '_blank',
            rel: 'noopener',
          },
          T('r.open')
        ),
        h(
          'a',
          {
            className: 'ui-button',
            id: 'cb-term-kit',
            href: kit,
            target: '_blank',
            rel: 'noopener',
          },
          T('r.kit')
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: 'cb-term-save',
            onclick: () => {
              const file = `${pack.id}.course.json`;
              ctx.download(file, ctx.serialize(pack));
              note = T('r.saved', { file });
              if (status) status.textContent = note;
            },
          },
          T('r.save')
        )
      ),
      h('p', {
        className: 'ui-status',
        id: 'cb-term-note',
        role: 'status',
        'aria-live': 'polite',
      }),
      report.rekeyed.length
        ? h(
            'p',
            { id: 'cb-term-keys' },
            T(pack.term ? 'r.keys.term' : 'r.keys.noterm', {
              n: report.rekeyed.length,
            })
          )
        : h('p', { id: 'cb-term-keys' }, T('r.keys.none')),
      moved.length
        ? [
            h(
              'p',
              { id: 'cb-term-changes' },
              moved.length === 1
                ? T('r.changed.one')
                : T('r.changed.many', { n: moved.length })
            ),
            h(
              'ul',
              { className: 'ui-issues', id: 'cb-term-changed' },
              moved.map(row => h('li', {}, stateLine(row)))
            ),
          ]
        : h('p', { id: 'cb-term-changes' }, T('r.same')),
      report.refused.length
        ? h(
            'p',
            { className: 'ui-error', id: 'cb-term-refused' },
            T('r.refused', {
              ids: report.refused.map(id => ctx.nameOf(pack, id)).join(', '),
            })
          )
        : null,
      h('p', { className: 'ui-hint' }, T('r.next')),
      h(
        'div',
        { className: 'ui-toolbar' },
        h(
          'a',
          {
            className: 'ui-button',
            href: `${ctx.root}instructors/submissions/`,
            id: 'cb-term-review',
          },
          T('r.review')
        )
      ),
    ];
  }

  let status = null;

  function draw() {
    host.textContent = '';
    host.append(
      h('h2', { id: 'cb-term-h' }, T(`p.${mode}.h`)),
      ...(result ? [] : form()),
      ...(result ? outcome() : []),
      h(
        'div',
        { className: 'ui-toolbar' },
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: 'cb-term-close',
            onclick: () => {
              host.hidden = true;
              host.textContent = '';
            },
          },
          T('p.close')
        )
      )
    );
    status = host.querySelector('#cb-term-note');
    if (status) status.textContent = note;
  }

  async function go() {
    if (busy) return;
    const source = ctx.source();
    const parsed = termLabel(typed);
    if (!parsed.ok) {
      error = T(`p.term.${parsed.reason}`, { max: 40 });
      draw();
      host.querySelector('#cb-term-input')?.focus();
      return;
    }
    if (ctx.problems(source) > 0) {
      error = T('p.fixFirst');
      draw();
      return;
    }
    error = null;
    busy = true;
    try {
      const facts = await ctx.facts(source);
      const made = startTerm(source, facts, {
        term: parsed.term,
        today: ctx.today(),
        lib: ctx.lib,
      });
      const link = await ctx.courseLink(made.pack, { root: ctx.root });
      result = { ...made, link };
      ctx.apply(made.pack, T('r.ready', { title: titleOf(made.pack) }));
      draw();
      host.querySelector('#cb-term-ready-h')?.setAttribute('tabindex', '-1');
      host.querySelector('#cb-term-ready-h')?.focus();
    } finally {
      busy = false;
    }
  }

  host.hidden = false;
  draw();
  host.querySelector('#cb-term-input')?.focus();
  return { refresh: draw, close: () => (host.hidden = true) };
}
