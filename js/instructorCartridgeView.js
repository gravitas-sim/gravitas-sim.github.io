// =============================================================================
// The panel that exports a course as a Thin Common Cartridge (an instructor
// module, Roadmap III Prompt 169)
// -----------------------------------------------------------------------------
// One panel for both places an instructor has a course open: the course
// builder (opened as `openTerm('cartridge')`, so the page needed one more line
// and no more imports) and the distribution kit. It says what the file is, in
// words, what it leaves out, and where an import has been checked (the table
// says NOT VERIFIED until a recorded import says otherwise), and makes the
// file when asked. The cartridge itself is js/instructorCartridge.js and its
// words are js/instructorCartridgeText.js; this is only the form, drawn into an
// element the page gives it, with callbacks for everything the page owns.
// =============================================================================

import { buildCartridge, cartridgeBytes } from './instructorCartridge.js';
import {
  IMPORT_STATUS,
  statusStatement,
  tr,
} from './instructorCartridgeText.js';

/** The link length above which some mail programs and platforms cut a link (shareState.js COMFORTABLE_URL_LENGTH, held equal by a test). */
export const LONG_LINK = 8000;

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
 * @param {() => object} ctx.source - The pack, read when the panel draws and when the button is pressed
 * @param {() => ?object} ctx.manifest - js/course/manifest.js courseManifest() of it, or null while the course has problems
 * @param {(pack: object, id: string) => string} ctx.nameOf - What an item is called, in the page's language
 * @param {(name: string, bytes: Uint8Array, type: string) => void} ctx.download - Save a file
 * @param {() => string} ctx.locale - 'en' or 'es'
 * @param {number} [ctx.level] - The heading level of the panel's title (2)
 * @returns {{refresh: () => void, close: () => void}}
 */
export function openCartridgePanel(ctx) {
  const { host } = ctx;
  let notes = false;
  let made = '';
  const T = (id, vars) => tr(ctx.locale(), id, vars);

  /** The cartridge as the options now stand, or null while the course has problems. */
  function prepare() {
    const pack = ctx.source();
    const manifest = ctx.manifest();
    if (!manifest) return null;
    const locale = ctx.locale();
    const built = buildCartridge(pack, manifest, {
      locale,
      notes,
      name: item => ctx.nameOf(pack, item.id),
    });
    return { built, home: manifest.course.home || '' };
  }

  function draw() {
    host.textContent = '';
    host.hidden = false;
    host.setAttribute('aria-labelledby', 'cc-h');
    const prepared = prepare();
    const parts = [
      h(`h${ctx.level ?? 2}`, { id: 'cc-h', tabindex: '-1' }, T('p.h')),
      h('p', { className: 'ui-hint' }, T('p.lede')),
    ];
    if (!prepared) {
      parts.push(
        h('p', { className: 'ui-error', id: 'cc-fix' }, T('p.fixFirst'))
      );
    } else {
      const { built, home } = prepared;
      const left = built.left.length
        ? T('p.left', {
            n: built.left.length,
            names: built.left.map(l => l.name).join(', '),
          })
        : '';
      const long =
        home.length > LONG_LINK ? T('p.long', { n: home.length }) : '';
      parts.push(
        h(
          'p',
          { className: 'ui-hint', id: 'cc-lang' },
          T('p.lang', { language: T(`p.lang.${ctx.locale()}`) })
        ),
        h(
          'div',
          { className: 'ui-field' },
          h(
            'label',
            { className: 'ui-choice', for: 'cc-notes' },
            h('input', {
              type: 'checkbox',
              id: 'cc-notes',
              checked: notes,
              onchange: e => {
                notes = e.target.checked;
                draw();
                host.querySelector('#cc-notes')?.focus();
              },
            }),
            T('p.notes')
          )
        ),
        h(
          'p',
          { id: 'cc-count' },
          T('p.count', {
            links: built.counts.links,
            modules: built.counts.modules,
            left,
          }) + long
        )
      );
    }
    parts.push(
      h(
        'p',
        { id: 'cc-status', className: 'ui-status' },
        T('p.status', {
          statement: statusStatement(ctx.locale()),
        })
      ),
      h(
        'table',
        { className: 'ui-table', id: 'cc-table' },
        h('caption', {}, T('p.table.h')),
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            ...['lms', 'status', 'seen'].map(k =>
              h('th', { scope: 'col' }, T(`p.table.${k}`))
            )
          )
        ),
        h(
          'tbody',
          {},
          IMPORT_STATUS.map(r =>
            h(
              'tr',
              { 'data-lms': r.lms },
              h('th', { scope: 'row' }, r.lms),
              h('td', {}, r.status),
              h('td', {}, r.seen ? `${r.date}: ${r.seen}` : T('p.empty'))
            )
          )
        )
      ),
      h('p', { className: 'ui-hint' }, T('p.table.note')),
      h(
        'div',
        { className: 'ui-toolbar' },
        prepared
          ? h(
              'button',
              {
                type: 'button',
                className: 'ui-button is-primary',
                id: 'cc-go',
                onclick: go,
              },
              T('p.go')
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: 'cc-close',
            onclick: () => {
              host.hidden = true;
              host.textContent = '';
            },
          },
          T('p.close')
        )
      ),
      h('p', {
        className: 'ui-status',
        id: 'cc-made',
        role: 'status',
        'aria-live': 'polite',
      })
    );
    host.append(...parts.filter(Boolean));
    host.querySelector('#cc-made').textContent = made;
  }

  function go() {
    const prepared = prepare();
    const out = host.querySelector('#cc-made');
    if (!prepared) return void (out.textContent = T('p.fixFirst'));
    try {
      const { built } = prepared;
      ctx.download(built.file, cartridgeBytes(built), 'application/zip');
      made = T('p.made', { file: built.file, ...built.counts });
    } catch (err) {
      made = T('p.failed', { reason: err.message });
    }
    out.textContent = made;
  }

  draw();
  host.querySelector('#cc-h')?.focus();
  return {
    refresh: () => host.hidden || draw(),
    close: () => (host.hidden = true),
  };
}
