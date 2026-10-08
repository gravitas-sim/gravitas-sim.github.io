// =============================================================================
// The course home (/course/)
// -----------------------------------------------------------------------------
// What a student opens: a course pack (js/course/pack.js) as a page. Its
// units in order, each item with its time, its path, what it comes after,
// the student's note and a link that opens it; the objectives, the
// prerequisites and how long each path takes; a printable syllabus. Nothing
// is signed into and nothing is sent anywhere. The pack comes from, in turn:
//
//   ?course=<id>   a course Gravitas ships (js/data/courses/)
//   ?draft=1       the course-pack builder's preview, from this browser
//   #c2z...        a course link: the whole pack in the fragment
//   a file         "Open a course file", for a pack too long for a link
//
// Everything a pack says is written as text, never as markup, and the only
// addresses it can hold are a reading's, which the format limits to https.
// A pack is checked for its shape only: one that names a lesson this build
// no longer has still opens, with that item marked, so an archived course is
// never unreadable. The builder is where an instructor fixes it.
// =============================================================================

import { parseDocument } from './shareState.js';
import {
  LANGUAGES,
  language,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './course/i18n.js';
import { MANIFEST } from './data/investigations/manifest.js';
import {
  migrateCoursePack,
  validateCoursePack,
  itemsOf,
} from './course/pack.js';
import { estimate, minutesRange } from './course/review.js';
import {
  PREVIEW_KEY,
  itemLink,
  readCourseFragment,
  rootOf,
} from './course/links.js';
import { DATASETS } from './course/datasets.js';
import { progressOf } from './library/progress.js';
import { BUILTIN_COURSES } from './data/courses/index.js';
import { PLATFORM_API } from './platform/catalog.generated.js';

const MAX_FILE = 512 * 1024;

const $ = id => document.getElementById(id);
const ROOT = rootOf(location.href, 1);
const LESSONS = { en: new Map(MANIFEST.map(m => [m.id, m])) };
const DATA = new Map(DATASETS.map(d => [d.id, d]));
let pack = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'className') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat())
    if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

const words = v => (v && (v[language()] || v.en)) || '';
const lessonMeta = id =>
  (LESSONS[language()] || LESSONS.en).get(id) || LESSONS.en.get(id);

/** Where this browser has got to in an investigation: new, going or done. */
function status(id) {
  const p = progressOf({
    id,
    format: 'lesson',
    steps: lessonMeta(id)?.stepCount || 0,
  });
  return !p.started ? 'new' : p.total && p.done >= p.total ? 'done' : 'going';
}

/** Leave where the student is in this course, for the finish panel's next step. */
function remember(item) {
  const items = itemsOf(pack).map(x => x.item);
  try {
    localStorage.setItem(
      'gravitas_next_context',
      JSON.stringify({
        k: 'course',
        home: location.href,
        t: words(pack.title),
        i: items.indexOf(item),
        items: items.map(x => [x.lesson || '', x.depth || '', titleOf(x)]),
      })
    );
  } catch {
    /* no storage: no next offered */
  }
}

/** What an item is called, in the reader's language. */
function titleOf(item) {
  const own = words(item.title);
  if (own) return own;
  if (item.lesson) return lessonMeta(item.lesson)?.title || item.lesson;
  if (item.kind === 'dataset')
    return words(DATA.get(item.dataset)?.title) || item.dataset;
  return item.scenario || item.id;
}

/** Minutes as the reader would say them: "40 min", "4.5 h". */
function duration(r) {
  if (!r) return '';
  const fmt = n =>
    new Intl.NumberFormat(language(), { maximumFractionDigits: 1 }).format(n);
  if (r.hi < 90)
    return r.lo === r.hi
      ? t('courseHome.minutes', { n: fmt(r.lo) })
      : t('courseHome.minutesRange', { lo: fmt(r.lo), hi: fmt(r.hi) });
  const h = n => Math.round((n / 60) * 2) / 2;
  return h(r.lo) === h(r.hi)
    ? t('courseHome.hours', { n: fmt(h(r.lo)) })
    : t('courseHome.hoursRange', { lo: fmt(h(r.lo)), hi: fmt(h(r.hi)) });
}

/** What the time estimate needs to know about lessons: their cards. */
function lessonFacts() {
  const lessons = new Map();
  for (const m of MANIFEST)
    lessons.set(m.id, { duration: minutesRange(m.duration), n: m.stepCount });
  return { lessons };
}

// --- Opening a course ---------------------------------------------------------

/** A pack as the page will show it, or the reason it will not. */
function accept(raw, from) {
  const p = migrateCoursePack(raw, { platform: PLATFORM_API });
  const errors = validateCoursePack(p, { locales: ['en', 'es'] });
  if (errors.length) {
    showRefusal(errors[0]);
    return false;
  }
  pack = p;
  document.documentElement.dataset.source = from;
  render();
  return true;
}

async function openFromAddress() {
  const params = new URLSearchParams(location.search);
  const builtin = params.get('course');
  try {
    if (builtin && Object.hasOwn(BUILTIN_COURSES, builtin))
      return accept(await BUILTIN_COURSES[builtin](), 'builtin');
    if (params.has('draft')) {
      let text = null;
      try {
        text = localStorage.getItem(PREVIEW_KEY);
      } catch {
        /* no storage: nothing to preview */
      }
      if (text) return accept(parseDocument(text, true), 'draft');
    }
    if (/^#c\d+[zr]/.test(location.hash))
      return accept(await readCourseFragment(location.hash), 'link');
  } catch (err) {
    return showRefusal({ path: '', message: String(err?.message || err) });
  }
  showEmpty();
  return false;
}

async function openFile(file) {
  if (!file) return;
  if (file.size > MAX_FILE)
    return showRefusal({ path: '', message: t('courseHome.error.tooLarge') });
  try {
    accept(parseDocument(await file.text(), true), 'file');
  } catch {
    showRefusal({ path: '', message: t('courseHome.error.notJson') });
  }
}

function showRefusal(e) {
  pack = null;
  $('ch-course').hidden = true;
  $('ch-empty').hidden = true;
  const box = $('ch-refused');
  box.hidden = false;
  $('ch-refused-why').textContent = e.path
    ? `${e.path}: ${e.message}`
    : e.message;
  document.documentElement.dataset.ready = 'true';
}

function showEmpty() {
  $('ch-course').hidden = true;
  $('ch-refused').hidden = true;
  $('ch-empty').hidden = false;
  document.documentElement.dataset.ready = 'true';
}

// --- The page -----------------------------------------------------------------

const SHOWN = {
  all: ['core', 'intro', 'advanced'],
  core: ['core'],
  intro: ['core', 'intro'],
  advanced: ['core', 'advanced'],
};

function render() {
  if (!pack) return;
  $('ch-empty').hidden = true;
  $('ch-refused').hidden = true;
  const box = $('ch-course');
  box.hidden = false;
  const teacher = $('ch-teacher').checked;
  const shown = SHOWN[$('ch-path').value] || SHOWN.all;
  const time = estimate(pack, lessonFacts());
  const all = itemsOf(pack);
  const byId = new Map(all.map(({ item }) => [item.id, item]));
  const has = new Set(MANIFEST.map(m => m.id));
  document.title = t('courseHome.doc.titleOf', { title: words(pack.title) });

  const lessons = all.filter(({ item }) => item.lesson && has.has(item.lesson));
  const finished = lessons.filter(({ item }) => status(item.lesson) === 'done');
  const next = lessons.find(({ item }) => status(item.lesson) !== 'done')?.item;
  const progress = lessons.length
    ? el(
        'p',
        { className: 'ui-note', id: 'ch-progress' },
        t('courseHome.progress', {
          done: finished.length,
          total: lessons.length,
        }),
        next
          ? [
              ' ',
              // A button, not a #link: the pack itself lives in this page's fragment.
              Object.assign(
                el('button', {
                  type: 'button',
                  className: 'ui-button subtle',
                  text: t('courseHome.continue', { title: titleOf(next) }),
                }),
                {
                  onclick: () => {
                    const at = $(`ch-item-${next.id}`);
                    at.scrollIntoView();
                    at.querySelector('a, h3')?.focus?.();
                  },
                }
              ),
            ]
          : null
      )
    : null;

  const head = [
    el('h1', { id: 'ch-title', text: words(pack.title) }),
    progress,
    pack.summary ? el('p', { text: words(pack.summary) }) : null,
    pack.audience
      ? el('p', { className: 'ui-note', text: words(pack.audience) })
      : null,
    el(
      'ul',
      { className: 'ch-time', id: 'ch-time' },
      ...['core', 'intro', 'advanced']
        .filter(p => p === 'core' || all.some(({ item }) => item.path === p))
        .map(p =>
          el(
            'li',
            { 'data-path': p },
            el('strong', { text: `${t(`courseHome.path.${p}`)}: ` }),
            duration(time.paths[p])
          )
        )
    ),
  ];
  const guide =
    teacher && pack.teacherGuide
      ? el(
          'section',
          { className: 'ch-teacher', 'aria-labelledby': 'ch-guide-h' },
          el('h2', { id: 'ch-guide-h', text: t('courseHome.teacherGuide') }),
          el('p', { text: words(pack.teacherGuide) })
        )
      : null;
  const objectives = pack.objectives?.length
    ? el(
        'section',
        { 'aria-labelledby': 'ch-obj-h' },
        el('h2', { id: 'ch-obj-h', text: t('courseHome.objectives') }),
        el(
          'ol',
          {},
          ...pack.objectives.map(o => el('li', { text: words(o.text) }))
        )
      )
    : null;
  const prereqs = pack.prerequisites?.length
    ? el(
        'section',
        { 'aria-labelledby': 'ch-pre-h' },
        el('h2', { id: 'ch-pre-h', text: t('courseHome.prerequisites') }),
        el(
          'ul',
          {},
          ...pack.prerequisites.map(p =>
            p.lesson
              ? el(
                  'li',
                  {},
                  el('a', {
                    href: `${ROOT}#investigation=${encodeURIComponent(p.lesson)}`,
                    text: lessonMeta(p.lesson)?.title || p.lesson,
                  })
                )
              : el('li', { text: words(p.text) })
          )
        )
      )
    : null;

  const pending = [];
  const units = pack.units.map((u, ui) =>
    el(
      'section',
      { className: 'ch-unit', 'aria-labelledby': `ch-unit-${ui}` },
      el('h2', {
        id: `ch-unit-${ui}`,
        text: t('courseHome.unit', { n: ui + 1, title: words(u.title) }),
      }),
      u.summary ? el('p', { text: words(u.summary) }) : null,
      el(
        'ol',
        { className: 'ch-items' },
        ...u.items
          .filter(item => shown.includes(item.path || 'core'))
          .map(item => {
            const missing = item.lesson && !has.has(item.lesson);
            const open = el('a', {
              className: 'ui-button',
              target: '_blank',
              rel: 'noopener',
              hidden: true,
              text: t(`courseHome.open.${item.kind}`),
              // The visible words first, so a spoken command finds it.
              'aria-label': t('courseHome.openNamed', {
                action: t(`courseHome.open.${item.kind}`),
                title: titleOf(item),
              }),
            });
            if (!missing) pending.push({ item, open });
            const path = item.path || 'core';
            const needs = (item.needs || [])
              .filter(id => byId.has(id))
              .map(id => titleOf(byId.get(id)));
            return el(
              'li',
              {
                className: 'ui-card is-compact ch-item',
                id: `ch-item-${item.id}`,
                'data-kind': item.kind,
                'data-path': path,
              },
              el(
                'div',
                { className: 'ch-item-head' },
                el('span', {
                  className: 'ch-kind',
                  text: t(`courseHome.kind.${item.kind}`),
                }),
                el('h3', { text: titleOf(item) }),
                missing || !item.lesson || status(item.lesson) === 'new'
                  ? null
                  : el('span', {
                      className: 'ui-badge',
                      text: t(`courseHome.status.${status(item.lesson)}`),
                    }),
                path !== 'core'
                  ? el('span', {
                      className: 'ui-badge',
                      text: t(`courseHome.badge.${path}`),
                    })
                  : null,
                el('span', {
                  className: 'ui-note',
                  text: duration(time.items.get(item.id)),
                })
              ),
              needs.length
                ? el('p', {
                    className: 'ui-note',
                    text: t('courseHome.after', { list: needs.join('; ') }),
                  })
                : null,
              item.studentNote
                ? el('p', { text: words(item.studentNote) })
                : null,
              teacher && item.teacherNote
                ? el(
                    'p',
                    { className: 'ch-teacher' },
                    el('strong', { text: `${t('courseHome.teacherNote')}: ` }),
                    words(item.teacherNote)
                  )
                : null,
              item.kind === 'reading' ? citation(item) : null,
              missing
                ? el('p', {
                    className: 'ui-alert is-warning',
                    text: t('courseHome.missing'),
                  })
                : null,
              item.kind === 'dataset' && item.dataset.includes('.')
                ? el(
                    'p',
                    { className: 'ui-note' },
                    t('courseHome.install'),
                    ' ',
                    el('a', {
                      href: `${ROOT}catalog/`,
                      text: t('courseHome.catalog'),
                    })
                  )
                : null,
              el('p', { className: 'ch-actions' }, open)
            );
          })
      )
    )
  );

  box.replaceChildren(
    ...[
      ...head,
      guide,
      objectives,
      prereqs,
      ...units,
      el(
        'p',
        { className: 'ch-muted ch-foot' },
        t('courseHome.made', { version: pack.version, platform: pack.gravitas })
      ),
    ].filter(Boolean)
  );
  fillLinks(pending);
}

/** A reading's reference, and its terms. */
function citation(item) {
  const c = item.cite;
  const bits = [
    el('span', {
      text: `${c.authors} (${c.year}). ${words(item.title)}. ${c.source}.`,
    }),
  ];
  if (item.license)
    bits.push(
      ' ',
      el('span', { text: t('courseHome.license', { license: item.license }) })
    );
  bits.push(' ', el('span', { text: t(`courseHome.access.${item.access}`) }));
  return el('p', { className: 'ch-muted ch-cite' }, ...bits);
}

let linkSeq = 0;
/** The links, made after the page is drawn: an assignment's is compressed. */
async function fillLinks(pending) {
  const seq = ++linkSeq;
  for (const { item, open } of pending) {
    const link = await itemLink(item, { root: ROOT, locale: language() });
    if (seq !== linkSeq) return;
    if (!link) continue;
    open.href = link.href;
    open.hidden = false;
    open.addEventListener('click', () => remember(item));
    // A short address is worth printing; a fragment of a thousand characters
    // is not, and the printed syllabus says where to open it instead.
    if (link.href.length <= 120) open.dataset.print = link.href;
  }
  document.documentElement.dataset.ready = 'true';
}

// --- Start-up -----------------------------------------------------------------

function languageSwitch() {
  const host = $('langSwitch');
  host.replaceChildren(
    ...LANGUAGES.map(({ id, endonym }) => {
      const b = el('button', {
        type: 'button',
        className: 'ui-button',
        lang: id,
        text: endonym,
      });
      b.setAttribute('aria-pressed', String(language() === id));
      b.addEventListener('click', () => useLanguage(id));
      return b;
    })
  );
}

async function useLanguage(id) {
  setLanguage(id);
  if (id === 'es' && !LESSONS.es) {
    const m = await import('./data/investigations/manifest.es.js');
    LESSONS.es = new Map(m.MANIFEST.map(x => [x.id, x]));
  }
  translatePage();
  languageSwitch();
  render();
}

function wire() {
  $('ch-path').addEventListener('change', render);
  $('ch-teacher').addEventListener('change', render);
  $('ch-print').addEventListener('click', () => window.print());
  for (const id of ['ch-open', 'ch-open-empty'])
    $(id).addEventListener('click', () => $('ch-file').click());
  $('ch-file').addEventListener('change', () => {
    openFile($('ch-file').files[0]);
    $('ch-file').value = '';
  });
  window.addEventListener('hashchange', () => {
    if (/^#c\d+[zr]/.test(location.hash)) openFromAddress();
  });
}

async function init() {
  wire();
  await useLanguage(preferred());
  await openFromAddress();
}

init();
