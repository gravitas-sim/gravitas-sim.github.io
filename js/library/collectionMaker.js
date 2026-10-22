import {
  itemsOfCollection,
  readCollections,
  replaceSaved,
} from './collections.js';
import { entryIdOfItem } from './format.js';

// =============================================================================
// Teach: the instructor's collection (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// An instructor curates a short list by saving items in the Library, then, here,
// puts them in order, says in a sentence what each is for, picks a depth where
// an item has one, and names the set. The result is a collection, a course
// package with profile `collection` (js/course/pack.js), delivered by the
// course home link or as a file, like a course. Nothing is sent anywhere: the
// link holds the whole package. A student who opens it can keep it (the
// course home) and finds it in the Library and My work.
//
// The order, notes and depths are kept on the saved collection as they change;
// the title, summary and the two languages are written for the one being
// shared. Texts are the page's own: a Spanish text is written, never made up,
// and a collection with any Spanish needs every text in both languages.
// Written once: the controls have one handler each, set by assignment.
// Lazy: Teach loads this when the section is opened.
// =============================================================================

const DEPTHS = {
  lesson: ['core', 'quantitative', 'advanced'],
  guide: ['core', 'advanced'],
};
const DEPTH_WORDS = {
  core: ['core', 'núcleo'],
  quantitative: ['quantitative', 'cuantitativo'],
  advanced: ['advanced', 'avanzado'],
};

const slug = s =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids.filter(k => k !== null && k !== undefined));
  return n;
};

/** The two-language text of a field, or null. */
const pair = (en, es) => {
  const e = String(en ?? '').trim();
  return e ? { en: e, es: String(es ?? '').trim() } : null;
};

let library = null;
let state = null;

/**
 * Mount the editor.
 * @param {HTMLElement} host - Where it goes
 */
export async function mountMaker(host) {
  const [{ shortHash }, { courseLink }, pack, api] = await Promise.all([
    import('../assignments/assignment.js'),
    import('../course/links.js'),
    import('../course/pack.js'),
    import('../course/api.js'),
  ]);
  library ??= await fetch(new URL('/library/library.json', document.baseURI))
    .then(r => (r.ok ? r.json() : { entries: [] }))
    .catch(() => ({ entries: [] }));
  const byId = new Map(library.entries.map(e => [e.id, e]));
  const lang = () => (document.documentElement.lang === 'es' ? 1 : 0);
  const L = (en, es) => [en, es][lang()];
  const have = readCollections().saved;
  state = {
    items: have ? JSON.parse(JSON.stringify(itemsOfCollection(have))) : [],
    title: { en: '', es: '' },
    summary: { en: '', es: '' },
    link: '',
  };
  const nameOf = item => {
    const e = byId.get(entryIdOfItem(item));
    return e ? e.title[lang() ? 'es' : 'en'] || e.title.en : item.id;
  };

  /** What the form says, as a package, and what is wrong with it in words. */
  const build = () => {
    const missing = [];
    const need = (value, what) => {
      if (value && !value.es) missing.push(what);
      return value;
    };
    const title = need(
      pair(state.title.en, state.title.es),
      L('title', 'título')
    );
    const summary = need(
      pair(state.summary.en, state.summary.es),
      L('summary', 'resumen')
    );
    const items = state.items.map((item, i) => {
      const note = need(
        pair(item.note?.en, item.note?.es),
        L(`note ${i + 1}`, `nota ${i + 1}`)
      );
      const rest = Object.fromEntries(
        Object.entries(item).filter(
          ([k]) => k !== 'note' && k !== 'studentNote'
        )
      );
      return { ...rest, ...(note ? { studentNote: note } : {}) };
    });
    const spanish =
      [title, summary, ...items.map(i => i.studentNote)].some(t => t?.es) ||
      false;
    const withEsOf = t =>
      t ? (spanish ? { ...t, esOf: shortHash(t.en) } : { en: t.en }) : t;
    const out = {
      format: pack.FORMAT,
      formatVersion: pack.FORMAT_VERSION,
      id: slug(title?.en ?? '') || 'collection',
      version: '1.0.0',
      gravitas: '1.0.0',
      locales: spanish ? ['en', 'es'] : ['en'],
      pinning: 'compatible',
      profile: 'collection',
      title: withEsOf(title) ?? { en: '' },
      ...(summary ? { summary: withEsOf(summary) } : {}),
      units: [
        {
          id: 'set',
          title: spanish
            ? withEsOf({ en: 'List', es: 'Lista' })
            : { en: 'List' },
          items: items.map(i => ({
            ...i,
            ...(i.studentNote ? { studentNote: withEsOf(i.studentNote) } : {}),
          })),
        },
      ],
    };
    if (out.id === 'saved-items') out.id = 'saved-items-shared';
    return { pack: out, missing, spanish };
  };

  const readForm = () => {
    state.title = {
      en: host.querySelector('[data-f="title.en"]').value,
      es: host.querySelector('[data-f="title.es"]').value,
    };
    state.summary = {
      en: host.querySelector('[data-f="summary.en"]').value,
      es: host.querySelector('[data-f="summary.es"]').value,
    };
    host.querySelectorAll('[data-item]').forEach((row, i) => {
      const it = state.items[i];
      it.note = {
        en: row.querySelector('[data-f="note.en"]').value,
        es: row.querySelector('[data-f="note.es"]').value,
      };
      const d = row.querySelector('[data-f="depth"]');
      if (d) {
        if (d.value) it.depth = d.value;
        else delete it.depth;
      }
    });
  };
  /** The order, notes and depths go back to the saved collection as they change. */
  const persist = () => {
    const have = readCollections().saved;
    if (!have || !state.items.length) return;
    const items = state.items.map(item => {
      const { note, ...rest } = item;
      return {
        ...rest,
        ...(note?.en?.trim() ? { studentNote: { en: note.en.trim() } } : {}),
      };
    });
    replaceSaved({
      ...have,
      units: [{ ...have.units[0], items }],
    });
  };

  const say = text => {
    host.querySelector('[data-role="status"]').textContent = text;
  };

  const draw = () => {
    const f = (id, label, value, area) =>
      el(
        'div',
        { className: 'ui-field' },
        el('label', { htmlFor: id, textContent: label }),
        el(area ? 'textarea' : 'input', {
          id,
          className: area ? 'ui-textarea' : 'ui-input',
          value,
          ...(area ? { rows: 2 } : { type: 'text' }),
          maxLength: area ? 1200 : 120,
        })
      );
    const field = (key, id, label, value, area) => {
      const n = f(id, label, value, area);
      n.lastChild.dataset.f = key;
      return n;
    };
    if (!state.items.length) {
      host.replaceChildren(
        el('p', {
          className: 'ui-note',
          textContent: L(
            'Nothing is saved yet. Save lessons, scenarios and datasets with the Save button on a Library item page, then come back to order them and add notes.',
            'Todavía no hay nada guardado. Guarda lecciones, escenarios y conjuntos de datos con el botón Guardar de la página de un elemento de la Biblioteca y vuelve aquí para ordenarlos y añadir notas.'
          ),
        }),
        el(
          'p',
          {},
          el('a', {
            href: '/library/',
            textContent: L('Open the Library', 'Abrir la Biblioteca'),
          })
        )
      );
      return;
    }
    const list = el(
      'ol',
      { className: 'coll-items' },
      ...state.items.map((item, i) => {
        const kinds = DEPTHS[item.kind];
        const row = el(
          'li',
          { className: 'coll-item' },
          el('strong', { textContent: nameOf(item) }),
          kinds
            ? el(
                'div',
                { className: 'ui-field' },
                el('label', {
                  htmlFor: `coll-depth-${i}`,
                  textContent: L('Opens at depth', 'Se abre en la profundidad'),
                }),
                el(
                  'select',
                  { id: `coll-depth-${i}`, className: 'ui-select' },
                  el('option', {
                    value: '',
                    textContent: L(
                      'as the student chooses',
                      'la que elija el estudiante'
                    ),
                  }),
                  ...kinds.map(d =>
                    el('option', {
                      value: d,
                      textContent: DEPTH_WORDS[d][lang()],
                      selected: item.depth === d,
                    })
                  )
                )
              )
            : null,
          field(
            `note.en`,
            `coll-note-en-${i}`,
            L('Note for students (English)', 'Nota para estudiantes (inglés)'),
            item.note?.en ?? item.studentNote?.en ?? '',
            true
          ),
          field(
            `note.es`,
            `coll-note-es-${i}`,
            L('Note for students (Spanish)', 'Nota para estudiantes (español)'),
            item.note?.es ?? item.studentNote?.es ?? '',
            true
          ),
          el(
            'p',
            { className: 'coll-row-actions' },
            el('button', {
              type: 'button',
              className: 'ui-button',
              textContent: L('Earlier', 'Antes'),
              disabled: i === 0,
            }),
            el('button', {
              type: 'button',
              className: 'ui-button',
              textContent: L('Later', 'Después'),
              disabled: i === state.items.length - 1,
            }),
            el('button', {
              type: 'button',
              className: 'ui-button',
              textContent: L('Remove', 'Quitar'),
            })
          )
        );
        row.dataset.item = item.id;
        const [a, b, c] = row.querySelectorAll('.coll-row-actions button');
        a.dataset.act = 'up';
        b.dataset.act = 'down';
        c.dataset.act = 'remove';
        for (const btn of [a, b, c])
          btn.setAttribute('aria-label', `${btn.textContent}: ${nameOf(item)}`);
        return row;
      })
    );
    const status = el('p', { className: 'ui-hint' });
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.dataset.role = 'status';
    host.replaceChildren(
      el('p', {
        className: 'ui-note',
        textContent: L(
          'These are the items you saved in the Library, in the order saved. Name the set, say what each is for, and give your students the link or the file. Nothing is uploaded: the link holds the whole list.',
          'Estos son los elementos que guardaste en la Biblioteca, en el orden en que los guardaste. Pon nombre al conjunto, di para qué sirve cada uno y da a tus estudiantes el enlace o el archivo. No se sube nada: el enlace contiene toda la lista.'
        ),
      }),
      field(
        'title.en',
        'coll-title-en',
        L('Title (English)', 'Título (inglés)'),
        state.title.en
      ),
      field(
        'title.es',
        'coll-title-es',
        L('Title (Spanish)', 'Título (español)'),
        state.title.es
      ),
      field(
        'summary.en',
        'coll-summary-en',
        L('Summary (English, optional)', 'Resumen (inglés, opcional)'),
        state.summary.en,
        true
      ),
      field(
        'summary.es',
        'coll-summary-es',
        L('Summary (Spanish, optional)', 'Resumen (español, opcional)'),
        state.summary.es,
        true
      ),
      list,
      el(
        'p',
        { className: 'coll-actions' },
        Object.assign(
          el('button', {
            type: 'button',
            className: 'ui-button is-primary',
            textContent: L('Make the link', 'Crear el enlace'),
          }),
          { id: 'coll-link-make' }
        ),
        Object.assign(
          el('button', {
            type: 'button',
            className: 'ui-button',
            textContent: L('Download the file', 'Descargar el archivo'),
          }),
          { id: 'coll-file' }
        )
      ),
      status,
      el(
        'div',
        { className: 'ui-field' },
        el('label', {
          htmlFor: 'coll-link',
          textContent: L(
            'Link for your students',
            'Enlace para tus estudiantes'
          ),
        }),
        el('input', {
          id: 'coll-link',
          className: 'ui-input',
          type: 'text',
          readOnly: true,
          value: state.link,
        })
      )
    );
  };

  /** Problems, in words, or an empty list. */
  const check = () => {
    const { pack: made, missing } = build();
    if (!made.title.en)
      return [
        L('Name the collection first.', 'Primero pon nombre a la colección.'),
      ];
    if (missing.length)
      return [
        L(
          `Once one text has Spanish, every text needs it. Missing: ${missing.join(', ')}.`,
          `Cuando un texto tiene español, todos lo necesitan. Falta: ${missing.join(', ')}.`
        ),
      ];
    return pack
      .validateCoursePack(made, api.courseApi())
      .map(p => `${p.path}: ${p.message}`);
  };

  host.onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    const row = b.closest('[data-item]');
    if (row && b.dataset.act) {
      readForm();
      const i = state.items.findIndex(x => x.id === row.dataset.item);
      if (b.dataset.act === 'remove') state.items.splice(i, 1);
      else {
        const j = i + (b.dataset.act === 'up' ? -1 : 1);
        [state.items[i], state.items[j]] = [state.items[j], state.items[i]];
      }
      persist();
      draw();
      host
        .querySelector(
          `[data-item="${row.dataset.item}"] [data-act="${b.dataset.act}"]:not(:disabled)`
        )
        ?.focus();
      return;
    }
    if (b.id !== 'coll-link-make' && b.id !== 'coll-file') return;
    readForm();
    const problems = check();
    if (problems.length) {
      say(problems.join(' '));
      return;
    }
    const { pack: made } = build();
    if (b.id === 'coll-file') {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(made, null, 2)], { type: 'application/json' })
      );
      const a = el('a', { href: url, download: `${made.id}.collection.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      say(L('The file is downloaded.', 'El archivo se ha descargado.'));
      return;
    }
    const link = await courseLink(made, {
      root: new URL('/', document.baseURI).href,
    });
    state.link = link.url;
    host.querySelector('#coll-link').value = link.url;
    say(
      link.comfortable
        ? L(
            'The link is ready: copy it into your course page or message.',
            'El enlace está listo: cópialo en tu página de curso o mensaje.'
          )
        : L(
            'The link is long. A file is easier to hand out.',
            'El enlace es largo. Un archivo es más fácil de repartir.'
          )
    );
  };
  host.oninput = host.onchange = () => {
    readForm();
    persist();
    state.link = '';
    const out = host.querySelector('#coll-link');
    if (out) out.value = '';
  };
  new MutationObserver(() => {
    readForm();
    draw();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  draw();
}
