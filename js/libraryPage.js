// =============================================================================
// /library/: everything a student or instructor can open, in one place
// -----------------------------------------------------------------------------
// Roadmap II Prompt 54 (LIBRARY.md), made to answer questions at scale by
// Roadmap III Prompt 163. The page reads library/library.json, which
// tools/build-library.mjs writes from the sources that own each thing.
//
// Four views, one page, no new destination:
//
//   start    the default: where you left off (from the one resume record), where
//            to start (a committed handful per audience and level), the
//            sequences and courses as pathways, and the subjects as topics with
//            their counts. No grid of everything.
//   browse   "Browse everything", or any filter or search: the full catalog with
//            four facets (subject, level, time, kind as a student sees it) and
//            the rest behind "More filters", a count on every option, and a
//            search that says why each result matched (js/library/search.js,
//            fetched on the first query).
//   topic    ?topic=<subject>: that subject's paragraph, sequences, courses,
//            investigations by level, datasets and scenarios (js/library/views.js).
//   item     ?item=<id>: what comes before, what comes next, what goes with it.
//
// The filters live in the address (?q=, ?kind=, ?subject=, ...), so a link can
// open the Library already narrowed. Nothing is stored but the one resume
// record (js/storage/local.js); progress badges are read from what each surface
// saved (js/library/progress.js). Its own bundle, like /catalog/.
// =============================================================================

import {
  NO_FILTERS,
  PROGRESSES,
  filterCatalog,
  loosening,
  progressBucket,
} from './data/investigations/browse.js';
import { LENGTHS, CALCULATIONS } from './data/investigations/sequences.js';
import { libraryCardHtml } from './library/card.js';
import { checkLibrary } from './library/format.js';
import { progressOf } from './library/progress.js';
import {
  pick,
  loadLanguage,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './library/i18n.js';
import { mountShell } from './shell.js';
import { KEY_NEXT_CONTEXT } from './names.js';
import { noteResume, put, readResume } from './storage/local.js';

const $ = id => document.getElementById(id);
const LEVELS = ['beginner', 'intro'];
const MATHEMATICS = ['none', 'arithmetic', 'algebra', 'logarithms'];
const GROUPS = ['all', 'subject', 'level', 'sequence'];
/** The filters the default row offers, then the ones behind "More filters". */
const EXTRA = ['mathematics', 'data', 'depth', 'prereq', 'sequence'];
const EMPTY = Object.freeze({
  ...NO_FILTERS,
  ...Object.fromEntries(EXTRA.map(k => [k, ''])),
});
/** The filters, in the address's words. `q` is the search box. */
const PARAMS = {
  q: 'query',
  ...Object.fromEntries(
    Object.keys(EMPTY)
      .filter(k => k !== 'query')
      .map(k => [k, k])
  ),
};

const state = {
  library: null,
  filters: { ...EMPTY },
  group: 'all',
  browse: false,
  topic: '',
  item: '',
  path: '',
};
let byId = new Map();
let localized = [];
let shown = {};
let students = [];
let progressCache = new Map();
/** The search's matches for the current query: id to {score, why}. */
let hits = null;
let searchModule = null;
let objectives = null;
let crumbsOriginal = null;

const escape = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Read what a link opened the page with. */
function readAddress() {
  const params = new URLSearchParams(location.search);
  for (const [param, key] of Object.entries(PARAMS))
    if (params.has(param)) state.filters[key] = params.get(param).trim();
  const group = params.get('group');
  if (GROUPS.includes(group)) state.group = group;
  state.browse = params.get('browse') === '1';
  state.topic = params.get('topic') || '';
  state.item = params.get('item') || '';
  state.path = params.get('path') || '';
}

/** Write it back, so the address is always a link to what is on screen. */
function writeAddress() {
  const params = new URLSearchParams();
  for (const [param, key] of Object.entries(PARAMS))
    if (state.filters[key]) params.set(param, state.filters[key]);
  if (state.group !== 'all') params.set('group', state.group);
  if (state.browse) params.set('browse', '1');
  if (state.topic) params.set('topic', state.topic);
  if (state.item) params.set('item', state.item);
  if (state.path) params.set('path', state.path);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

const narrowed = () => Object.values(state.filters).some(v => v !== '');

/** Which view the address asks for. */
const viewOf = () =>
  state.topic
    ? 'topic'
    : state.item
      ? 'item'
      : state.browse || narrowed()
        ? 'browse'
        : 'start';

/** The entries in the reader's language: what the search looks through. */
function localize() {
  localized = state.library.entries.map(e => ({
    ...e,
    title: pick(e.title),
    summary: pick(e.summary),
  }));
}

function progressFor(id) {
  if (!progressCache.has(id)) progressCache.set(id, progressOf(byId.get(id)));
  return progressCache.get(id);
}
const finished = id => progressBucket(progressFor(id)) === 'done';

/** The sequence a filter names, as a set of ids. */
const sequenceIds = id =>
  new Set(state.library.sequences.find(s => s.id === id)?.entries);

/** Whether a row passes the filters this file adds to browse.js's. */
function extras(entry, f) {
  return (
    (!students.includes(f.kind) || shown[entry.kind] === f.kind) &&
    (!f.mathematics || entry.mathematics === f.mathematics) &&
    (!f.data || entry.data === f.data) &&
    (!f.depth || (entry.depths ?? 0) >= 2) &&
    (!f.prereq || (entry.rel?.pre ?? []).every(finished)) &&
    (!f.sequence || sequenceIds(f.sequence).has(entry.id))
  );
}

/** The rows a filter set leaves, ranked by the search when there is a query. */
function match(f) {
  const base = {
    ...f,
    query: '',
    kind: students.includes(f.kind) ? '' : f.kind,
  };
  let rows = filterCatalog(localized, base, progressFor).filter(r =>
    extras(r.entry, f)
  );
  if (f.query && hits) {
    rows = rows
      .filter(r => hits.has(r.entry.id))
      .sort((a, b) => hits.get(b.entry.id).score - hits.get(a.entry.id).score);
    for (const r of rows) r.why = hits.get(r.entry.id).why;
  }
  return rows;
}

function fillSelect(id, key, values, labelOf, anyLabel) {
  const select = $(id);
  if (!select) return;
  const current = state.filters[key];
  select.innerHTML = [
    `<option value="">${escape(anyLabel)}</option>`,
    ...values.map(v => {
      const n = match({ ...state.filters, [key]: v }).length;
      return `<option value="${escape(v)}">${escape(
        t('lib.filter.option', { label: labelOf(v), n })
      )}</option>`;
    }),
  ].join('');
  select.value = values.includes(current) ? current : '';
}

function fillMenus() {
  const lib = state.library;
  const word = prefix => v => t(`lib.${prefix}.${v}`);
  fillSelect(
    'libSubject',
    'subject',
    lib.subjects.map(s => s.id),
    id => pick(lib.subjects.find(s => s.id === id).label),
    t('lib.filter.subject.any')
  );
  fillSelect(
    'libLevel',
    'level',
    LEVELS,
    word('level'),
    t('lib.filter.level.any')
  );
  fillSelect(
    'libLength',
    'length',
    LENGTHS,
    word('length'),
    t('lib.filter.length.any')
  );
  fillSelect(
    'libKind',
    'kind',
    students,
    word('kind'),
    t('lib.filter.kind.any')
  );
  fillSelect(
    'libMathematics',
    'mathematics',
    MATHEMATICS,
    word('mathematics'),
    t('lib.filter.mathematics.any')
  );
  fillSelect(
    'libCalculation',
    'calculation',
    CALCULATIONS,
    word('calculation'),
    t('lib.filter.calculation.any')
  );
  fillSelect(
    'libData',
    'data',
    ['authentic', 'synthetic'],
    word('data'),
    t('lib.filter.data.any')
  );
  fillSelect(
    'libDepth',
    'depth',
    ['deeper'],
    word('depth'),
    t('lib.filter.depth.any')
  );
  fillSelect(
    'libPrereq',
    'prereq',
    ['met'],
    word('prereq'),
    t('lib.filter.prereq.any')
  );
  fillSelect(
    'libSequence',
    'sequence',
    lib.sequences.map(s => s.id),
    id => pick(lib.sequences.find(s => s.id === id).title),
    t('lib.filter.sequence.any')
  );
  fillSelect(
    'libProgress',
    'progress',
    PROGRESSES,
    word('progress'),
    t('lib.filter.progress.any')
  );
  const group = $('libGroup');
  group.innerHTML = GROUPS.map(
    g => `<option value="${g}">${escape(t(`lib.group.${g}`))}</option>`
  ).join('');
  group.value = state.group;
}

const whyText = row =>
  row.why?.length
    ? t('lib.why', {
        fields: row.why.map(f => t(`lib.why.${f}`)).join(', '),
      })
    : '';

const cards = (rows, extra = {}) =>
  rows
    .map(row =>
      libraryCardHtml(byId.get(row.entry.id), {
        t,
        pick,
        shown,
        progress: row.progress,
        why: whyText(row),
        details: true,
        ...extra,
      })
    )
    .join('');

/** A titled list of cards; `ordered` for a sequence, whose order means something. */
function section(title, blurb, rows, ordered = false, seq = '') {
  const tag = ordered ? 'ol' : 'ul';
  return `<section class="lib-group"><h2>${escape(title)}</h2>${
    blurb ? `<p class="ui-note">${escape(blurb)}</p>` : ''
  }<${tag} class="lib-list"${seq ? ` data-seq="${escape(seq)}"` : ''}>${cards(
    rows,
    seq ? { path: `seq:${seq}` } : {}
  )}</${tag}></section>`;
}

function grouped(rows) {
  const lib = state.library;
  if (state.group === 'subject') {
    const out = lib.subjects
      .map(s => [s, rows.filter(r => r.entry.subjects?.includes(s.id))])
      .filter(([, list]) => list.length)
      .map(([s, list]) => section(pick(s.label), '', list));
    const none = rows.filter(r => !r.entry.subjects);
    if (none.length) out.push(section(t('lib.group.noSubject'), '', none));
    return out.join('');
  }
  if (state.group === 'level') {
    const out = LEVELS.map(level => [
      level,
      rows.filter(r => r.entry.level === level),
    ])
      .filter(([, list]) => list.length)
      .map(([level, list]) => section(t(`lib.level.${level}`), '', list));
    const none = rows.filter(r => !r.entry.level);
    if (none.length) out.push(section(t('lib.group.noLevel'), '', none));
    return out.join('');
  }
  if (state.group === 'sequence') {
    const shownRows = new Map(rows.map(r => [r.entry.id, r]));
    const out = lib.sequences
      .map(s => [s, s.entries.map(id => shownRows.get(id)).filter(Boolean)])
      .filter(([, list]) => list.length)
      .map(([s, list]) =>
        section(pick(s.title), pick(s.blurb), list, true, s.id)
      );
    return out.length
      ? out.join('')
      : `<p class="ui-state is-empty">${escape(t('lib.group.noSequence'))}</p>`;
  }
  return `<ul class="lib-list">${cards(rows)}</ul>`;
}

// --- The default view ---------------------------------------------------------

/** What an entry is called, from the index or, failing that, from the record. */
const titleOf = item => {
  const e = byId.get(item.id);
  return e
    ? pick(e.title)
    : item.title?.[document.documentElement.lang] || item.title?.en || '';
};

/**
 * Where you left off: the newest item of the one resume record, then the two
 * before it. A reader with no record yet but lessons begun still sees them,
 * from the progress records themselves.
 */
function fillContinue() {
  const items = readResume()
    .map(item => ({ item, title: titleOf(item) }))
    .filter(x => x.title);
  const link = ({ item, title }, label) => {
    const p = byId.has(item.id) ? progressFor(item.id) : null;
    const seen =
      p?.total && p.started && p.done < p.total
        ? ` <span class="ui-note">${escape(t('lib.continue.of', { n: p.done, total: p.total }))}</span>`
        : '';
    return `<li><a class="lib-resume" data-entry="${escape(item.id)}" href="${escape(item.route)}">${escape(label ?? title)}</a>${seen}</li>`;
  };
  let html = '';
  if (items.length) {
    const [last, ...recent] = items;
    html = `<ul id="libContinueList">${link(last, t('lib.continue.last', { title: last.title }))}</ul>${
      recent.length
        ? `<h3>${escape(t('lib.recent.title'))}</h3><ul>${recent
            .slice(0, 2)
            .map(x => link(x))
            .join('')}</ul>`
        : ''
    }`;
  } else {
    const going = localized
      .map(e => ({ e, p: progressFor(e.id) }))
      .filter(
        ({ e, p }) => e.format === 'lesson' && p.started && p.done < p.total
      )
      .slice(0, 3);
    if (going.length)
      html = `<ul id="libContinueList">${going
        .map(
          ({ e, p }) =>
            `<li><a class="lib-resume" data-entry="${escape(e.id)}" href="${escape(e.route)}">${escape(e.title)}</a> ${escape(t('lib.continue.of', { n: p.done, total: p.total }))}</li>`
        )
        .join('')}</ul>`;
  }
  $('libContinue').hidden = !html;
  $('libContinueBody').innerHTML = html;
}

function startHtml() {
  const lib = state.library;
  const groups = lib.starts
    .map(g => {
      const rows = g.entries
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(e =>
          libraryCardHtml(e, {
            t,
            pick,
            shown,
            progress: progressBucket(progressFor(e.id)),
            compact: true,
          })
        );
      return `<div class="lib-start-group"><h3>${escape(pick(g.audience))}</h3><ul class="lib-list">${rows.join('')}</ul></div>`;
    })
    .join('');
  const seqs = lib.sequences
    .filter(s => !s.id.startsWith('observatory-'))
    .map(
      s =>
        `<li><a href="?sequence=${escape(s.id)}&amp;group=sequence">${escape(pick(s.title))}</a> <span class="ui-note">${escape(t('lib.pathway.seq', { n: s.entries.length }))}</span></li>`
    );
  const courses = lib.entries
    .filter(e => e.kind === 'course')
    .map(
      e =>
        `<li class="lib-pathway-course" data-entry="${escape(e.id)}"><a class="lib-link" href="${escape(e.route)}">${escape(pick(e.title))}</a> <span class="ui-note">${escape(t('lib.pathway.course'))}</span></li>`
    );
  const topics = lib.subjects.map(
    s =>
      `<li><a href="?topic=${escape(s.id)}">${escape(pick(s.label))}</a> <span class="ui-note">${s.count}</span></li>`
  );
  return `<section class="lib-start" aria-labelledby="libStartTitle"><h2 id="libStartTitle">${escape(t('lib.start.title'))}</h2><p class="ui-note">${escape(t('lib.start.note'))}</p><div class="lib-start-grid">${groups}</div></section>
<section class="lib-pathways" aria-labelledby="libPathTitle"><h2 id="libPathTitle">${escape(t('lib.pathways.title'))}</h2><p class="ui-note">${escape(t('lib.pathways.note'))}</p><ul class="lib-links">${seqs.join('')}${courses.join('')}</ul></section>
<section class="lib-topics" aria-labelledby="libTopicsTitle"><h2 id="libTopicsTitle">${escape(t('lib.topics.title'))}</h2><p class="ui-note">${escape(t('lib.topics.note'))}</p><ul class="lib-links">${topics.join('')}</ul></section>`;
}

// --- Breadcrumb ---------------------------------------------------------------

/** The shell's breadcrumb, with the topic or the pathway and item appended. */
function setCrumbs(extra) {
  const ol = document.querySelector('.gs-crumbs ol');
  if (!ol) return;
  crumbsOriginal ??= ol.innerHTML;
  ol.innerHTML = crumbsOriginal;
  if (!extra.length) return;
  const here = ol.lastElementChild;
  here.removeAttribute('aria-current');
  here.innerHTML = `<a href="${escape(location.pathname)}">${here.innerHTML}</a>`;
  extra.forEach((x, i) => {
    const li = document.createElement('li');
    if (i === extra.length - 1) {
      li.setAttribute('aria-current', 'page');
      li.textContent = x.label;
    } else li.innerHTML = `<a href="${escape(x.href)}">${escape(x.label)}</a>`;
    ol.append(li);
  });
}

// --- Render -------------------------------------------------------------------

let drawn = 0;

async function renderDetail(kind) {
  const mine = ++drawn;
  const { topicView, itemView } = await import('./library/views.js');
  if (mine !== drawn) return;
  const c = { t, pick, shown, byId, path: state.path };
  const lib = state.library;
  const out =
    kind === 'topic'
      ? topicView(lib, state.topic, c)
      : itemView(lib, state.item, c);
  const box = $('libDetail');
  if (!out) {
    box.innerHTML = `<p class="ui-state is-empty">${escape(t(kind === 'topic' ? 'lib.topic.unknown' : 'lib.item.unknown'))}</p>`;
    setCrumbs([]);
    return;
  }
  box.innerHTML = out.html;
  document.title = `${out.title} | ${t('lib.doc.title')}`;
  setCrumbs(
    kind === 'topic'
      ? [{ label: out.title }]
      : [
          ...(out.pathway
            ? [{ label: out.pathway.title, href: out.pathway.href }]
            : []),
          { label: out.title },
        ]
  );
}

function render() {
  if (!state.library) return;
  translatePage();
  localize();
  progressCache = new Map();
  fillContinue();
  fillMenus();
  const view = viewOf();
  const f = state.filters;
  document.documentElement.dataset.view = view;
  $('libStart').hidden = view !== 'start';
  $('libFind').hidden = view === 'topic' || view === 'item';
  $('libDetail').hidden = view !== 'topic' && view !== 'item';
  $('libContinue').hidden = view !== 'start' || !$('libContinueBody').innerHTML;
  $('libMore').hidden = view !== 'browse';
  $('libBrowse').textContent = t(
    view === 'start' ? 'lib.browse' : 'lib.browse.back'
  );
  $('libClear').hidden = !narrowed();
  setCrumbs([]);
  $('libResults').innerHTML = '';
  $('libDetail').innerHTML = '';
  $('libEmpty').hidden = true;
  $('libCount').textContent = '';

  if (view !== 'start') $('libStart').innerHTML = '';
  if (view === 'start') {
    $('libStart').innerHTML = startHtml();
  } else if (view === 'browse') {
    const rows = match(f);
    const total = localized.length;
    $('libCount').textContent = narrowed()
      ? t('lib.count', { n: rows.length, total })
      : t('lib.count.all', { total });
    $('libResults').innerHTML = rows.length ? grouped(rows) : '';
    $('libEmpty').hidden = rows.length > 0;
    if (!rows.length) {
      $('libEmptyText').textContent = f.query
        ? t('lib.empty.search', { query: f.query })
        : t('lib.empty.filters');
      const relax = looseningOf(f);
      const button = $('libRelax');
      button.hidden = !relax;
      if (relax) {
        button.dataset.relax = relax.key;
        button.textContent = t('lib.empty.relax', {
          filter: t(`lib.filter.${relax.key}`),
          n: relax.count,
        });
      }
    }
  } else {
    renderDetail(view);
  }
  writeAddress();
}

/** A filter to drop that brings something back: browse.js's, over this file's rows. */
function looseningOf(f) {
  const keys = Object.keys(f).filter(k => f[k] && k !== 'format');
  let best = null;
  for (const key of keys) {
    const n = match({ ...f, [key]: '' }).length;
    if (n && (!best || n > best.count)) best = { key, count: n };
  }
  return best ?? (loosening(localized, f, progressFor) || null);
}

async function setFilter(key, value) {
  state.filters = { ...state.filters, [key]: value };
  if (key === 'query') await refreshHits();
  render();
}

/** Load the search the first time a query needs it, and rank for the query. */
async function refreshHits() {
  const q = state.filters.query;
  if (!q) {
    hits = null;
    return;
  }
  searchModule ??= await import('./library/search.js');
  objectives ??= await fetch(new URL('search-index.json', document.baseURI))
    .then(r => (r.ok ? r.json() : { objectives: {} }))
    .then(j => j.objectives)
    .catch(() => ({}));
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const lib = state.library;
  localize();
  hits = searchModule.rank(localized, q, {
    subjects: e =>
      (e.subjects ?? []).map(id =>
        pick(lib.subjects.find(s => s.id === id)?.label)
      ),
    facts: e =>
      [
        t(`lib.badge.${shown[e.kind] ?? e.kind}`),
        e.level && t(`lib.level.${e.level}`),
        e.length && t(`lib.length.${e.length}`),
        e.mathematics && t(`lib.mathematics.${e.mathematics}`),
        e.data && t(`lib.data.${e.data}`),
      ].filter(Boolean),
    objectives: id => (objectives[id]?.[lang] ?? []).join(' '),
  });
}

function wire() {
  const search = $('libSearch');
  search.value = state.filters.query;
  let timer = null;
  // An item opened from the Library is the one to continue from, and one
  // opened from a sequence remembers which, so finishing it can offer the next
  // (js/investigations/next.js).
  document.addEventListener('click', e => {
    const link = e.target.closest('.lib-link, .lib-resume');
    const row = link?.closest('[data-entry]');
    const entry = row && byId.get(row.dataset.entry);
    if (!entry) return;
    const seq = link.closest('[data-seq]')?.dataset.seq;
    try {
      noteResume({
        id: entry.id,
        route: entry.route,
        title: entry.title,
        ...(seq ? { path: { k: 'seq', id: seq } } : {}),
      });
      if (seq)
        put(
          KEY_NEXT_CONTEXT,
          JSON.stringify({ k: 'seq', id: seq }),
          'preferences'
        );
    } catch {
      /* no storage: nothing to resume, no next offered */
    }
  });
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => setFilter('query', search.value.trim()), 150);
  });
  search.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !search.value) return;
    e.preventDefault();
    clearTimeout(timer);
    search.value = '';
    setFilter('query', '');
  });
  for (const [id, key] of [
    ['libKind', 'kind'],
    ['libSubject', 'subject'],
    ['libLength', 'length'],
    ['libLevel', 'level'],
    ['libMathematics', 'mathematics'],
    ['libCalculation', 'calculation'],
    ['libData', 'data'],
    ['libDepth', 'depth'],
    ['libPrereq', 'prereq'],
    ['libSequence', 'sequence'],
    ['libProgress', 'progress'],
  ])
    $(id).addEventListener('change', e => setFilter(key, e.target.value));
  $('libGroup').addEventListener('change', e => {
    state.group = e.target.value;
    render();
  });
  $('libBrowse').addEventListener('click', () => {
    if (viewOf() === 'start') state.browse = true;
    else {
      state.browse = false;
      state.filters = { ...EMPTY };
      state.group = 'all';
      search.value = '';
      hits = null;
    }
    render();
    $('libBrowse').focus();
  });
  $('libClear').addEventListener('click', () => {
    clearTimeout(timer);
    search.value = '';
    hits = null;
    state.filters = { ...EMPTY };
    render();
    search.focus();
  });
  $('libRelax').addEventListener('click', async e => {
    const key = e.currentTarget.dataset.relax;
    if (key === 'query') search.value = '';
    await setFilter(key, '');
    search.focus();
  });
}

/** Fetch and check the index. */
async function load() {
  const res = await fetch(new URL('library.json', document.baseURI));
  if (!res.ok) throw new Error(String(res.status));
  return checkLibrary(await res.json());
}

async function start() {
  const lang = preferred();
  await loadLanguage(lang);
  setLanguage(lang);
  translatePage();
  mountShell({
    onLanguage: async lang => {
      await loadLanguage(lang);
      setLanguage(lang);
      translatePage();
      await refreshHits();
      render();
    },
  });
  readAddress();
  const status = $('libLoad');
  status.textContent = t('lib.loading');
  try {
    state.library = await load();
  } catch {
    status.className = 'ui-state is-error';
    status.textContent = t('lib.loadFailed');
    $('main').removeAttribute('aria-busy');
    document.documentElement.dataset.ready = 'error';
    return;
  }
  status.hidden = true;
  $('main').removeAttribute('aria-busy');
  byId = new Map(state.library.entries.map(e => [e.id, e]));
  shown = state.library.kindShown ?? {};
  students = [...new Set(state.library.kinds.map(k => shown[k] ?? k))];
  wire();
  await refreshHits();
  render();
  document.documentElement.dataset.ready = 'true';
}

start();
