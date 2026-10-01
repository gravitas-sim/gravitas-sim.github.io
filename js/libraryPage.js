// =============================================================================
// /library/: everything a student or instructor can open, in one place
// -----------------------------------------------------------------------------
// Roadmap II Prompt 54 (LIBRARY.md). The page reads library/library.json,
// which tools/build-library.mjs writes from the sources that own each thing,
// and filters it with the functions the lesson browser inside the application
// uses (js/data/investigations/browse.js): the same search, the same subject,
// time, arithmetic and progress filters, and the Library's own kind, format
// and level. Every card links to the page that runs its entry.
//
// The filters live in the address (?q=, ?kind=, ...), so a link can open the
// Library already narrowed: Home's "see all" links do. Nothing is stored; the
// progress badges are read from what each surface saved (js/library/progress.js).
// Its own bundle, like /catalog/: nothing in the simulation imports it.
// =============================================================================

import {
  NO_FILTERS,
  PROGRESSES,
  filterCatalog,
  isFiltered,
  loosening,
} from './data/investigations/browse.js';
import { LENGTHS, CALCULATIONS } from './data/investigations/sequences.js';
import { libraryCardHtml } from './library/card.js';
import { checkLibrary } from './library/format.js';
import { progressOf } from './library/progress.js';
import {
  pick,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './library/i18n.js';
import { mountShell } from './shell.js';

const $ = id => document.getElementById(id);
const LEVELS = ['beginner', 'intro'];
const GROUPS = ['all', 'subject', 'level', 'sequence'];
/** The filters, in the address's words. `q` is the search box. */
const PARAMS = {
  q: 'query',
  ...Object.fromEntries(
    Object.keys(NO_FILTERS)
      .filter(k => k !== 'query')
      .map(k => [k, k])
  ),
};

const state = { library: null, filters: { ...NO_FILTERS }, group: 'all' };
let byId = new Map();
let localized = [];

const escape = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Read the filters a link opened the page with. */
function readAddress() {
  const params = new URLSearchParams(location.search);
  for (const [param, key] of Object.entries(PARAMS))
    if (params.has(param)) state.filters[key] = params.get(param).trim();
  const group = params.get('group');
  if (GROUPS.includes(group)) state.group = group;
}

/** Write them back, so the address is always a link to what is on screen. */
function writeAddress() {
  const params = new URLSearchParams();
  for (const [param, key] of Object.entries(PARAMS))
    if (state.filters[key]) params.set(param, state.filters[key]);
  if (state.group !== 'all') params.set('group', state.group);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

/** The entries in the reader's language: what the search looks through. */
function localize() {
  localized = state.library.entries.map(e => ({
    ...e,
    title: pick(e.title),
    summary: pick(e.summary),
  }));
}

const progressFor = id => progressOf(byId.get(id));

function fillSelect(select, values, labelOf, anyLabel, current) {
  select.innerHTML = [
    `<option value="">${escape(anyLabel)}</option>`,
    ...values.map(
      v => `<option value="${escape(v)}">${escape(labelOf(v))}</option>`
    ),
  ].join('');
  select.value = values.includes(current) ? current : '';
}

function fillMenus() {
  const lib = state.library;
  const f = state.filters;
  const formats = [...new Set(lib.entries.map(e => e.format))];
  const kinds = lib.kinds.filter(k => lib.entries.some(e => e.kind === k));
  fillSelect(
    $('libKind'),
    kinds,
    k => t(`lib.kind.${k}`),
    t('lib.filter.kind.any'),
    f.kind
  );
  fillSelect(
    $('libFormat'),
    formats,
    v => t(`lib.format.${v}`),
    t('lib.filter.format.any'),
    f.format
  );
  fillSelect(
    $('libSubject'),
    lib.subjects.map(s => s.id),
    id => {
      const s = lib.subjects.find(x => x.id === id);
      return t('lib.filter.subject.option', {
        subject: pick(s.label),
        n: s.count,
      });
    },
    t('lib.filter.subject.any'),
    f.subject
  );
  fillSelect(
    $('libLength'),
    LENGTHS,
    v => t(`lib.length.${v}`),
    t('lib.filter.length.any'),
    f.length
  );
  fillSelect(
    $('libCalculation'),
    CALCULATIONS,
    v => t(`lib.calculation.${v}`),
    t('lib.filter.calculation.any'),
    f.calculation
  );
  fillSelect(
    $('libLevel'),
    LEVELS,
    v => t(`lib.level.${v}`),
    t('lib.filter.level.any'),
    f.level
  );
  fillSelect(
    $('libProgress'),
    PROGRESSES,
    v => t(`lib.progress.${v}`),
    t('lib.filter.progress.any'),
    f.progress
  );
  const group = $('libGroup');
  group.innerHTML = GROUPS.map(
    g => `<option value="${g}">${escape(t(`lib.group.${g}`))}</option>`
  ).join('');
  group.value = state.group;
}

const cards = rows =>
  rows
    .map(row =>
      libraryCardHtml(byId.get(row.entry.id), {
        t,
        pick,
        progress: row.progress,
      })
    )
    .join('');

/** A titled list of cards; `ordered` for a sequence, whose order means something. */
function section(title, blurb, rows, ordered = false) {
  const tag = ordered ? 'ol' : 'ul';
  return `<section class="lib-group"><h2>${escape(title)}</h2>${
    blurb ? `<p class="ui-note">${escape(blurb)}</p>` : ''
  }<${tag} class="lib-list">${cards(rows)}</${tag}></section>`;
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
    const shown = new Map(rows.map(r => [r.entry.id, r]));
    const out = lib.sequences
      .map(s => [s, s.entries.map(id => shown.get(id)).filter(Boolean)])
      .filter(([, list]) => list.length)
      .map(([s, list]) => section(pick(s.title), pick(s.blurb), list, true));
    return out.length
      ? out.join('')
      : `<p class="ui-state is-empty">${escape(t('lib.group.noSequence'))}</p>`;
  }
  return `<ul class="lib-list">${cards(rows)}</ul>`;
}

function render() {
  if (!state.library) return;
  translatePage();
  localize();
  fillMenus();
  const f = state.filters;
  const narrowed = isFiltered(f);
  const rows = filterCatalog(localized, f, progressFor);
  const total = localized.length;
  $('libCount').textContent = narrowed
    ? t('lib.count', { n: rows.length, total })
    : t('lib.count.all', { total });
  $('libClear').hidden = !narrowed;
  $('libResults').innerHTML = rows.length ? grouped(rows) : '';

  const empty = $('libEmpty');
  empty.hidden = rows.length > 0;
  if (!rows.length) {
    $('libEmptyText').textContent = f.query
      ? t('lib.empty.search', { query: f.query })
      : t('lib.empty.filters');
    const relax = loosening(localized, f, progressFor);
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
  writeAddress();
}

function setFilter(key, value) {
  state.filters = { ...state.filters, [key]: value };
  render();
}

function wire() {
  const search = $('libSearch');
  search.value = state.filters.query;
  let timer = null;
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
    ['libFormat', 'format'],
    ['libSubject', 'subject'],
    ['libLength', 'length'],
    ['libCalculation', 'calculation'],
    ['libLevel', 'level'],
    ['libProgress', 'progress'],
  ])
    $(id).addEventListener('change', e => setFilter(key, e.target.value));
  $('libGroup').addEventListener('change', e => {
    state.group = e.target.value;
    render();
  });
  $('libClear').addEventListener('click', () => {
    clearTimeout(timer);
    search.value = '';
    state.filters = { ...NO_FILTERS };
    render();
    search.focus();
  });
  $('libRelax').addEventListener('click', e => {
    const key = e.currentTarget.dataset.relax;
    if (key === 'query') search.value = '';
    setFilter(key, '');
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
  setLanguage(preferred());
  translatePage();
  mountShell({
    onLanguage: lang => {
      setLanguage(lang);
      translatePage();
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
    document.documentElement.dataset.ready = 'error';
    return;
  }
  status.hidden = true;
  $('main').removeAttribute('aria-busy');
  byId = new Map(state.library.entries.map(e => [e.id, e]));
  wire();
  render();
  document.documentElement.dataset.ready = 'true';
}

start();
