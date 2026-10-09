// =============================================================================
// The course-pack builder (/studio/course/)
// -----------------------------------------------------------------------------
// The Studio's third page: a course assembled from what Gravitas already has
// - lessons, assignments cut from them, scenarios, the Observatory's data and
// the catalog's, and readings - in units, with objectives, prerequisites,
// time, optional introductory and advanced paths, and notes for the teacher
// and the student in English and Spanish side by side. What it makes is a
// gravitas.course-pack/2 file (js/course/pack.js, COURSE_PACKS.md), and from
// it the course home link, every item's link and embed, the manifest and the
// syllabus.
//
// It checks as it goes (js/course/review.js): the format, then the pack
// against this build - lessons that are gone or changed since they were
// pinned, what a lesson assumes that the course does not give first, an
// assignment's missing setup steps, licenses, translations, objectives no
// core item serves - and the reviewed upgrade that re-pins what an
// instructor has looked at. The preview is the course home itself
// (/course/?draft=1), reading the draft from this browser.
//
// The form helpers are the Investigation Composer's (js/composerPage.js):
// every control's id is its path in the document, so a complaint lands on
// the control that edits it. The history, drafts and differences are the
// Studio's (js/studio/model.js).
// =============================================================================

import { parseDocument } from './shareState.js';
import {
  t,
  setLocale,
  getLocale,
  preferredLocale,
  registerMessages,
  hasMessage,
} from './i18n/index.js';
import { EN_STUDIO } from './i18n/en.studio.js';
import { EN_COURSE } from './i18n/en.course.js';
import { SCENARIO_INFO, scenarioId } from './data/scenarioInfo.js';
import { scenarioTitle } from './i18n/scenario.js';
import { loadInvestigation } from './data/investigations/registry.js';
import { BUILTIN_COURSES } from './data/courses/index.js';
import {
  FORMAT,
  FORMAT_VERSION,
  ITEM_KINDS,
  PATHS,
  PINNING,
  ACCESS,
  itemsOf,
  migrateCoursePack,
  validateCoursePack,
} from './course/pack.js';
import {
  STATUS,
  auditCourse,
  dependencyGraph,
  estimate,
  pinFor,
  reviewCoursePack,
  shortHash,
  translationState,
  textsOf,
  upgradeCoursePack,
} from './course/review.js';
import {
  LESSONS,
  PLATFORM_API,
  courseApi,
  courseFacts,
  datasetsOf,
  newAssignmentId,
} from './course/api.js';
import { PREVIEW_KEY, courseLink, itemLink, rootOf } from './course/links.js';
import { courseManifest } from './course/manifest.js';
import { embedParams } from './embedOptions.js';
import { EMBED_ASPECT, figureMarkup } from './embedMarkup.js';
import {
  createHistory,
  createDrafts,
  semanticDiff,
  serialize,
} from './studio/model.js';
import { mountShell } from './shell.js';

const clone = v => JSON.parse(JSON.stringify(v));
const $ = id => document.getElementById(id);
const ROOT = rootOf(location.href, 2);
const LOCAL = { en: [EN_STUDIO, EN_COURSE] };
const LOADERS = {
  es: () =>
    Promise.all([
      import('./i18n/es.studio.js').then(m => m.ES_STUDIO),
      import('./i18n/es.course.js').then(m => m.ES_COURSE),
    ]),
};
const DRAFT_KEYS = {
  prefix: 'gravitas_course_draft:',
  last: 'gravitas_course_last',
};
/** What refuses a file outright, before it is opened to be fixed. */
const HOSTILE = new Set([
  'notObject',
  'unsafeKey',
  'tooLarge',
  'tooDeep',
  'notData',
  'number',
]);
const MAX_FILE = 512 * 1024;

let history = null;
let drafts = null;
let baseline = null;
let storageFailed = false;
let catalog = null;
/** Lessons loaded so far, by id, for every check after the first. */
const known = new Map();
/** The last verdict, and which edit it is for. */
let verdict = null;
let checkSeq = 0;
let checkTimer = 0;
let checkedFor = null;
/** Items the instructor has marked reviewed, for the upgrade. */
const reviewed = new Set();

const doc = () => history.current();
const today = () => new Date().toISOString().slice(0, 10);

// --- Cards --------------------------------------------------------------------

/** Which cards are open, by the id of the unit or item they hold. */
const openCards = new Set();
const cardKey = (d, base) => {
  let m = /^units\[(\d+)\]\.items\[(\d+)\]$/.exec(base);
  if (m) return `item:${d.units[m[1]]?.items?.[m[2]]?.id}`;
  m = /^units\[(\d+)\]$/.exec(base);
  if (m) return `unit:${d.units[m[1]]?.id}`;
  return null;
};

function card(d, base, summary, build) {
  const id = idOf(base);
  const key = cardKey(d, base);
  const node = el('details', {
    id,
    className: 'ui-card is-compact ui-disclosure',
  });
  node.open = openCards.has(key);
  node.append(
    el(
      'summary',
      {},
      summary,
      ' ',
      el('span', { id: `${id}-error`, className: 'ui-error', hidden: true })
    )
  );
  node.addEventListener('toggle', () => {
    if (node.open === openCards.has(key)) return;
    if (node.open) openCards.add(key);
    else openCards.delete(key);
    if (node.open) render();
  });
  if (node.open) build(node);
  return node;
}

/** Open the cards a path is in, and put focus on the control it names. */
function reveal(path) {
  const d = doc();
  let changed = false;
  for (const re of [/^units\[\d+\]/, /^units\[\d+\]\.items\[\d+\]/]) {
    const m = re.exec(path);
    const key = m && cardKey(d, m[0]);
    if (key && !openCards.has(key)) {
      openCards.add(key);
      changed = true;
    }
  }
  if (changed) render();
  const node = controlFor(path);
  (node?.tagName === 'DETAILS' ? node.querySelector('summary') : node)?.focus();
}

// --- Paths ----------------------------------------------------------------------

const idOf = path =>
  `cb-${path.replace(/\[(\d+)\]/g, '-$1').replace(/\./g, '-')}`;
const keysOf = path =>
  path
    .split(/\.|\[(\d+)\]/)
    .filter(k => k !== undefined && k !== '')
    .map(k => (/^\d+$/.test(k) ? Number(k) : k));
const getAt = (o, path) => keysOf(path).reduce((v, k) => v?.[k], o);

function setAt(o, path, value) {
  const keys = keysOf(path);
  let cur = o;
  keys.slice(0, -1).forEach((k, i) => {
    if (cur[k] === undefined || cur[k] === null)
      cur[k] = typeof keys[i + 1] === 'number' ? [] : {};
    cur = cur[k];
  });
  const last = keys.at(-1);
  if (value !== undefined) cur[last] = value;
  else if (Array.isArray(cur)) cur.splice(last, 1);
  else delete cur[last];
}

// typedNumber (js/answerParse.js) is fetched with the first number typed: the
// builder's route has no room for another module.
const numberOf = (text, typedNumber) => {
  const s = String(text).trim();
  if (s === '') return undefined;
  const n = typedNumber(s, getLocale());
  return Number.isFinite(n) ? n : s;
};

// --- Language ---------------------------------------------------------------------

async function useLanguage(id) {
  if (!LOCAL[id] && LOADERS[id]) LOCAL[id] = await LOADERS[id]();
  for (const table of LOCAL[id] || []) registerMessages(id, table);
  await setLocale(id);
  translateStatic();
  render();
}

function translateStatic() {
  for (const node of document.querySelectorAll('[data-i18n]'))
    node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-aria-label]'))
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  $('cb-preview').title = t('course.preview.frame');
}

// --- Editing ------------------------------------------------------------------------

function commit(edit) {
  const d = doc();
  edit(d);
  if (history.commit(d)) saveDraft(d);
  render();
}

function saveDraft(d) {
  storageFailed = !drafts.save(d).ok;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'className') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat())
    if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

function field(id, label, control, hint = '') {
  control.id = id;
  const row = el(
    'div',
    { className: 'ui-field' },
    el('label', { for: id }, label),
    control
  );
  const described = [];
  if (hint) {
    row.append(el('p', { id: `${id}-hint`, className: 'ui-hint' }, hint));
    described.push(`${id}-hint`);
  }
  row.append(
    el('p', { id: `${id}-error`, className: 'ui-error', hidden: true })
  );
  if (described.length)
    control.setAttribute('aria-describedby', described.join(' '));
  control.dataset.described = described.join(' ');
  return row;
}

function textInput(
  value,
  onCommit,
  { multiline = false, numeric = false } = {}
) {
  const input = el(multiline ? 'textarea' : 'input', {
    className: multiline ? 'ui-textarea' : 'ui-input',
    type: multiline ? undefined : 'text',
    inputmode: numeric ? 'numeric' : undefined,
    autocomplete: 'off',
    rows: multiline ? 3 : undefined,
  });
  input.value = value ?? '';
  input.addEventListener('change', () => onCommit(input.value));
  return input;
}

function select(options, value, onCommit) {
  const s = el('select', { className: 'ui-select' });
  for (const o of options) {
    if (o.group) {
      const g = el('optgroup', { label: o.group });
      for (const [v, label] of o.options)
        g.append(el('option', { value: v }, label));
      s.append(g);
    } else s.append(el('option', { value: o[0] }, o[1]));
  }
  s.value = value ?? '';
  s.addEventListener('change', () => onCommit(s.value));
  return s;
}

const button = (label, onclick, attrs = {}) =>
  el(
    'button',
    { type: 'button', className: 'ui-button', onclick, ...attrs },
    label
  );

function checkbox(id, label, checked, onChange) {
  const box = el('input', { type: 'checkbox', id });
  box.checked = !!checked;
  box.addEventListener('change', () => onChange(box.checked));
  return el('label', { className: 'ui-choice', for: id }, box, label);
}

/**
 * A text, English and Spanish side by side, with where its translation
 * stands; writing the Spanish records which English it translates.
 */
function pair(
  path,
  label,
  { multiline = false, hint = '', required = true } = {}
) {
  const v = getAt(doc(), path) || {};
  const put = (locale, text) =>
    commit(x => {
      const cur = { ...(getAt(x, path) || {}) };
      const s = text.trim();
      if (locale === 'en') {
        if (s) cur.en = text;
        else delete cur.en;
      } else if (s) {
        cur.es = text;
        cur.esOf = shortHash(cur.en ?? '');
      } else {
        delete cur.es;
        delete cur.esOf;
      }
      const empty = !cur.en && !cur.es;
      setAt(x, path, empty && !required ? undefined : empty ? {} : cur);
    });
  const state = v.en ? translationState(v, 'es') : null;
  const esLabel = el(
    'span',
    {},
    `${label} (${t('course.pair.es')}) `,
    state
      ? el(
          'span',
          { className: 'st-state', 'data-state': state },
          t(`course.state.${state}`)
        )
      : null
  );
  const esInput = textInput(v.es, s => put('es', s), { multiline });
  esInput.lang = 'es';
  const enInput = textInput(v.en, s => put('en', s), { multiline });
  enInput.lang = 'en';
  const esField = field(idOf(`${path}.es`), '', esInput);
  esField.querySelector('label').append(esLabel);
  return el(
    'div',
    { className: 'st-pair', id: idOf(path) },
    field(
      idOf(`${path}.en`),
      `${label} (${t('course.pair.en')})`,
      enInput,
      hint
    ),
    esField
  );
}

/** A plain field bound to a path. */
function plain(path, label, { hint = '', numeric = false, blankIs } = {}) {
  const v = getAt(doc(), path);
  return field(
    idOf(path),
    label,
    textInput(
      v,
      async s => {
        const reader = numeric
          ? (await import('./answerParse.js')).typedNumber
          : null;
        commit(x =>
          setAt(
            x,
            path,
            s.trim() === '' ? blankIs : numeric ? numberOf(s, reader) : s.trim()
          )
        );
      },
      { numeric }
    ),
    hint
  );
}

const lessonTitle = id =>
  (getLocale() === 'es' ? known.get(id)?.title?.es : null) ||
  LESSONS.find(m => m.id === id)?.title ||
  id;

// --- About ------------------------------------------------------------------------

function aboutSection(d) {
  const locales = el(
    'div',
    { className: 'ui-field' },
    checkbox(
      'cb-locales-es',
      t('course.field.spanish'),
      d.locales?.includes('es'),
      on =>
        commit(x => {
          x.locales = on ? ['en', 'es'] : ['en'];
        })
    )
  );
  return el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'cb-about-h' },
    el('h2', { id: 'cb-about-h' }, t('course.section.about')),
    el(
      'div',
      { className: 'ui-grid' },
      plain('id', t('course.field.id'), { hint: t('course.hint.id') }),
      plain('version', t('course.field.version')),
      field(
        idOf('pinning'),
        t('course.field.pinning'),
        select(
          PINNING.map(p => [p, t(`course.pinning.${p}`)]),
          d.pinning,
          v => commit(x => (x.pinning = v))
        ),
        t('course.hint.pinning')
      )
    ),
    locales,
    pair('title', t('course.field.title')),
    pair('summary', t('course.field.summary'), {
      multiline: true,
      required: false,
    }),
    pair('audience', t('course.field.audience'), { required: false }),
    pair('teacherGuide', t('course.field.teacherGuide'), {
      multiline: true,
      required: false,
      hint: t('course.hint.teacherGuide'),
    })
  );
}

function objectivesSection(d) {
  const list = d.objectives || [];
  return el(
    'section',
    {
      className: 'ui-card',
      'aria-labelledby': 'cb-obj-h',
      id: idOf('objectives'),
    },
    el('h2', { id: 'cb-obj-h' }, t('course.section.objectives')),
    el('p', { className: 'ui-hint' }, t('course.hint.objectives')),
    ...list.map((o, i) =>
      el(
        'fieldset',
        { id: idOf(`objectives[${i}]`) },
        el('legend', {}, t('course.objective.n', { n: i + 1 })),
        plain(`objectives[${i}].id`, t('course.field.id')),
        pair(`objectives[${i}].text`, t('course.field.objective')),
        el(
          'div',
          { className: 'ui-toolbar' },
          button(t('course.action.remove'), () =>
            commit(x => {
              const gone = x.objectives[i].id;
              x.objectives.splice(i, 1);
              for (const { item } of itemsOf(x))
                if (item.objectives)
                  item.objectives = item.objectives.filter(o => o !== gone);
            })
          )
        )
      )
    ),
    el(
      'div',
      { className: 'ui-toolbar' },
      button(t('course.action.addObjective'), () =>
        commit(x => {
          x.objectives ||= [];
          let n = x.objectives.length + 1;
          while (x.objectives.some(o => o.id === `objective-${n}`)) n++;
          x.objectives.push({ id: `objective-${n}`, text: { en: '' } });
        })
      )
    )
  );
}

function prerequisitesSection(d) {
  const list = d.prerequisites || [];
  const lessonOptions = LESSONS.map(m => [m.id, lessonTitle(m.id)]);
  return el(
    'section',
    {
      className: 'ui-card',
      'aria-labelledby': 'cb-pre-h',
      id: idOf('prerequisites'),
    },
    el('h2', { id: 'cb-pre-h' }, t('course.section.prerequisites')),
    ...list.map((p, i) =>
      el(
        'fieldset',
        { id: idOf(`prerequisites[${i}]`) },
        el('legend', {}, t('course.prerequisite.n', { n: i + 1 })),
        p.lesson !== undefined
          ? field(
              idOf(`prerequisites[${i}].lesson`),
              t('course.field.lesson'),
              select(lessonOptions, p.lesson, v =>
                commit(x => (x.prerequisites[i].lesson = v))
              )
            )
          : pair(`prerequisites[${i}].text`, t('course.field.prerequisite')),
        el(
          'div',
          { className: 'ui-toolbar' },
          button(t('course.action.remove'), () =>
            commit(x => x.prerequisites.splice(i, 1))
          )
        )
      )
    ),
    el(
      'div',
      { className: 'ui-toolbar' },
      button(t('course.action.addPrereqText'), () =>
        commit(x => (x.prerequisites ||= []).push({ text: { en: '' } }))
      ),
      button(t('course.action.addPrereqLesson'), () =>
        commit(x => (x.prerequisites ||= []).push({ lesson: LESSONS[0].id }))
      )
    )
  );
}

// --- Units and items --------------------------------------------------------------

const itemName = item => {
  const own = item.title?.[getLocale()] || item.title?.en;
  if (own) return own;
  if (item.lesson) return lessonTitle(item.lesson);
  if (item.kind === 'pack') return item.pack || item.id;
  if (item.kind === 'dataset')
    return (
      datasetsOf(catalog).get(item.dataset)?.title?.[getLocale()] ||
      datasetsOf(catalog).get(item.dataset)?.title?.en ||
      item.dataset
    );
  // By id: a pack made before ids names its scenario in English.
  if (item.kind === 'scenario')
    return scenarioTitle(scenarioId(item.scenario) ?? item.scenario);
  return item.id;
};

function freshId(x, base) {
  const have = new Set(itemsOf(x).map(({ item }) => item.id));
  let id = base;
  let n = 2;
  while (have.has(id)) id = `${base}-${n++}`;
  return id;
}

/** A new item of a kind, pinned to this build when it names a lesson. */
function newItem(x, kind) {
  const lesson = LESSONS[0].id;
  const base = { kind };
  switch (kind) {
    case 'lesson':
      return { ...base, id: freshId(x, lesson), lesson };
    case 'assignment':
      return {
        ...base,
        id: freshId(x, `${lesson}-assignment`),
        lesson,
        steps: [],
        assignment: { id: 'pending', created: today() },
      };
    case 'scenario': {
      const scenario = 'solar-system';
      return {
        ...base,
        id: freshId(x, 'solar-system'),
        minutes: 10,
        scenario,
        seed: 'orbit-1',
        title: { en: scenarioTitle(scenario) },
      };
    }
    case 'dataset':
      return {
        ...base,
        id: freshId(x, 'tess-light-curve'),
        minutes: 15,
        dataset: 'tess-light-curve',
      };
    case 'pack':
      // Filled when its link is pasted (readPackItem).
      return {
        ...base,
        id: freshId(x, 'investigation'),
        pack: '',
        version: '1.0.0',
        link: '',
      };
    case 'reading':
      return {
        ...base,
        id: freshId(x, 'reading'),
        minutes: 20,
        title: { en: '' },
        cite: { authors: '', year: new Date().getFullYear(), source: '' },
        access: 'open',
      };
  }
  return base;
}

/** After a lesson item's lesson or steps change: the pin, and an assignment's id. */
async function repin(path) {
  const x = doc();
  const item = getAt(x, path);
  if (!item?.lesson) return;
  const facts = await courseFacts(
    { units: [{ items: [item] }] },
    { load: id => loadInvestigation(id, 'en'), catalog, known }
  );
  const lesson = facts.lessons.get(item.lesson);
  if (!lesson) return;
  commit(y => {
    const it = getAt(y, path);
    if (!it || it.lesson !== item.lesson) return;
    if (it.kind === 'assignment') {
      it.steps = it.steps.filter(sid => lesson.hashes.has(sid));
      if (it.steps.length) {
        it.steps = lesson.resolve(it.steps).sids;
        it.assignment = { id: newAssignmentId(it), created: today() };
      }
    }
    it.pin = pinFor(it, lesson);
  });
}

/**
 * A pasted course item for an investigation pack, as /studio/course/packs/
 * makes it: the pack, its version, its link and its pin. The builder reads no
 * more of it than the format has fields for; that page is where the link is
 * opened and judged, which needs the lesson engine this route has no room for.
 */
function readPackItem(base, text) {
  let v = null;
  try {
    v = parseDocument(text);
  } catch {
    /* said below */
  }
  if (!v || typeof v !== 'object' || v.kind !== 'pack')
    return setStatus(t('course.status.packNotItem'));
  commit(x => {
    const it = getAt(x, base);
    if (it?.kind !== 'pack') return;
    for (const k of ['pack', 'version', 'link', 'pin'])
      if (v[k] !== undefined) it[k] = v[k];
    // A text in every language the course has.
    if (v.title && typeof v.title === 'object')
      it.title = Object.fromEntries(
        (x.locales || ['en']).map(l => [
          l,
          String(v.title[l] ?? v.title.en ?? ''),
        ])
      );
  });
  setStatus(t('course.status.packRead', { id: String(v.pack) }));
}

function unitsSection(d) {
  const units = d.units || [];
  return el(
    'section',
    {
      className: 'ui-card',
      'aria-labelledby': 'cb-units-h',
      id: idOf('units'),
    },
    el('h2', { id: 'cb-units-h' }, t('course.section.units')),
    el('p', { className: 'ui-hint' }, t('course.hint.units')),
    ...units.map((u, i) => unitCard(d, u, i)),
    el(
      'div',
      { className: 'ui-toolbar' },
      button(t('course.action.addUnit'), () =>
        commit(x => {
          let n = x.units.length + 1;
          while (x.units.some(u => u.id === `unit-${n}`)) n++;
          x.units.push({
            id: `unit-${n}`,
            title: { en: t('course.unit.n', { n }) },
            items: [],
          });
          openCards.add(`unit:unit-${n}`);
        })
      )
    )
  );
}

function unitCard(d, u, i) {
  const base = `units[${i}]`;
  const summary = `${t('course.unit.n', { n: i + 1 })}: ${u.title?.[getLocale()] || u.title?.en || u.id} (${t('course.unit.items', { count: u.items?.length || 0 })})`;
  return card(d, base, summary, node => {
    node.append(
      plain(`${base}.id`, t('course.field.id')),
      pair(`${base}.title`, t('course.field.unitTitle')),
      pair(`${base}.summary`, t('course.field.summary'), {
        multiline: true,
        required: false,
      }),
      el('h3', {}, t('course.unit.itemsHeading')),
      ...(u.items || []).map((item, j) => itemCard(d, item, i, j)),
      addItemRow(i),
      el(
        'div',
        { className: 'ui-toolbar' },
        button(t('course.action.up'), () => commit(x => move(x.units, i, -1)), {
          disabled: i === 0,
        }),
        button(
          t('course.action.down'),
          () => commit(x => move(x.units, i, 1)),
          {
            disabled: i === d.units.length - 1,
          }
        ),
        button(
          t('course.action.removeUnit'),
          () => commit(x => x.units.splice(i, 1)),
          {
            disabled: d.units.length === 1,
          }
        )
      )
    );
  });
}

const move = (list, i, by) => {
  const j = i + by;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
};

function addItemRow(i) {
  const id = `cb-add-${i}`;
  const kind = select(
    ITEM_KINDS.map(k => [k, t(`course.kind.${k}`)]),
    'lesson',
    () => {}
  );
  return el(
    'div',
    { className: 'ui-toolbar' },
    field(id, t('course.field.addKind'), kind),
    button(t('course.action.addItem'), () => {
      let path = null;
      commit(x => {
        const item = newItem(x, kind.value);
        x.units[i].items.push(item);
        openCards.add(`item:${item.id}`);
        path = `units[${i}].items[${x.units[i].items.length - 1}]`;
      });
      if (path) repin(path);
    })
  );
}

function itemCard(d, item, i, j) {
  const base = `units[${i}].items[${j}]`;
  const path = item.path || 'core';
  const summary = `${t(`course.kind.${item.kind}`)}: ${itemName(item)}${path !== 'core' ? ` (${t(`course.path.${path}`)})` : ''}`;
  return card(d, base, summary, node => fillItem(node, d, item, i, j, base));
}

function fillItem(node, d, item, i, j, base) {
  const earlier = itemsOf(d)
    .slice(
      0,
      itemsOf(d).findIndex(e => e.path === base)
    )
    .map(e => e.item);
  const common = [
    el(
      'div',
      { className: 'ui-grid' },
      plain(`${base}.id`, t('course.field.id')),
      field(
        idOf(`${base}.path`),
        t('course.field.path'),
        select(
          PATHS.map(p => [p, t(`course.path.${p}`)]),
          item.path || 'core',
          v =>
            commit(x => setAt(x, `${base}.path`, v === 'core' ? undefined : v))
        )
      ),
      plain(`${base}.minutes`, t('course.field.minutes'), {
        numeric: true,
        hint:
          item.kind === 'lesson' || item.kind === 'assignment'
            ? t('course.hint.minutesDerived')
            : '',
      })
    ),
  ];
  if ((d.objectives || []).length)
    common.push(
      el(
        'fieldset',
        { id: idOf(`${base}.objectives`) },
        el('legend', {}, t('course.field.objectives')),
        ...d.objectives.map((o, k) =>
          checkbox(
            `${idOf(`${base}.objectives`)}-${k}`,
            o.text?.[getLocale()] || o.text?.en || o.id,
            (item.objectives || []).includes(o.id),
            on =>
              commit(x => {
                const it = getAt(x, base);
                const set = new Set(it.objectives || []);
                if (on) set.add(o.id);
                else set.delete(o.id);
                it.objectives = d.objectives
                  .map(z => z.id)
                  .filter(z => set.has(z));
                if (!it.objectives.length) delete it.objectives;
              })
          )
        )
      )
    );
  if (earlier.length)
    common.push(
      el(
        'fieldset',
        { id: idOf(`${base}.needs`) },
        el('legend', {}, t('course.field.needs')),
        ...earlier.map((e, k) =>
          checkbox(
            `${idOf(`${base}.needs`)}-${k}`,
            itemName(e),
            (item.needs || []).includes(e.id),
            on =>
              commit(x => {
                const it = getAt(x, base);
                const set = new Set(it.needs || []);
                if (on) set.add(e.id);
                else set.delete(e.id);
                it.needs = earlier.map(z => z.id).filter(z => set.has(z));
                if (!it.needs.length) delete it.needs;
              })
          )
        )
      )
    );
  node.append(...common, ...kindFields(d, item, base));
  node.append(
    pair(`${base}.studentNote`, t('course.field.studentNote'), {
      multiline: true,
      required: false,
    }),
    pair(`${base}.teacherNote`, t('course.field.teacherNote'), {
      multiline: true,
      required: false,
    }),
    el(
      'div',
      { className: 'ui-toolbar' },
      button(
        t('course.action.up'),
        () => commit(x => move(x.units[i].items, j, -1)),
        { disabled: j === 0 }
      ),
      button(
        t('course.action.down'),
        () => commit(x => move(x.units[i].items, j, 1)),
        {
          disabled: j === d.units[i].items.length - 1,
        }
      ),
      button(t('course.action.remove'), () =>
        commit(x => {
          const gone = x.units[i].items[j].id;
          x.units[i].items.splice(j, 1);
          for (const { item: it } of itemsOf(x))
            if (it.needs) {
              it.needs = it.needs.filter(n => n !== gone);
              if (!it.needs.length) delete it.needs;
            }
        })
      )
    )
  );
}

function kindFields(d, item, base) {
  const lessonPick = () =>
    field(
      idOf(`${base}.lesson`),
      t('course.field.lesson'),
      select(
        LESSONS.map(m => [m.id, lessonTitle(m.id)]),
        item.lesson,
        v => {
          commit(x => {
            const it = getAt(x, base);
            it.lesson = v;
            if (it.kind === 'assignment') it.steps = [];
            delete it.pin;
          });
          repin(base);
        }
      )
    );
  switch (item.kind) {
    case 'lesson':
      return [lessonPick(), pinLine(item)];
    case 'pack':
      return [
        field(
          idOf(`${base}.item`),
          t('course.field.packItem'),
          textInput(
            item.link
              ? JSON.stringify({
                  kind: 'pack',
                  pack: item.pack,
                  version: item.version,
                  link: item.link,
                  ...(item.pin ? { pin: item.pin } : {}),
                })
              : '',
            v => readPackItem(base, v),
            { multiline: true }
          ),
          t('course.hint.packItem')
        ),
        field(
          idOf(`${base}.open`),
          t('course.field.packOpen'),
          el(
            'a',
            { className: 'ui-button', href: `${ROOT}studio/course/packs/` },
            t('course.action.packOpen')
          )
        ),
        pair(`${base}.title`, t('course.field.title'), { required: false }),
        pinLine(item),
      ];
    case 'assignment':
      return [
        lessonPick(),
        stepPicker(item, base),
        pair(`${base}.title`, t('course.field.assignmentTitle'), {
          required: false,
        }),
        pair(`${base}.intro`, t('course.field.assignmentIntro'), {
          multiline: true,
          required: false,
        }),
        pinLine(item),
      ];
    case 'scenario':
      return [
        el(
          'div',
          { className: 'ui-grid' },
          field(
            idOf(`${base}.scenario`),
            t('course.field.scenario'),
            select(
              Object.keys(SCENARIO_INFO).map(n => [n, scenarioTitle(n)]),
              item.scenario,
              v =>
                commit(x => {
                  const it = getAt(x, base);
                  it.scenario = v;
                  it.title = { en: SCENARIO_INFO[v]?.title || v };
                })
            )
          ),
          plain(`${base}.seed`, t('course.field.seed'), {
            hint: t('course.hint.seed'),
          })
        ),
        checkbox(
          idOf(`${base}.paused`),
          t('course.field.paused'),
          item.paused,
          on => commit(x => setAt(x, `${base}.paused`, on ? true : undefined))
        ),
        pair(`${base}.title`, t('course.field.title'), { required: false }),
      ];
    case 'dataset': {
      const all = [...datasetsOf(catalog).values()];
      const name = x => x.title?.[getLocale()] || x.title?.en || x.id;
      return [
        field(
          idOf(`${base}.dataset`),
          t('course.field.dataset'),
          select(
            [
              {
                group: t('course.dataset.builtin'),
                options: all
                  .filter(x => x.source === 'builtin')
                  .map(x => [x.id, name(x)]),
              },
              {
                group: t('course.dataset.catalog'),
                options: all
                  .filter(x => x.source === 'catalog')
                  .map(x => [x.id, name(x)]),
              },
            ].filter(g => g.options.length),
            item.dataset,
            v => commit(x => (getAt(x, base).dataset = v))
          ),
          t('course.hint.dataset')
        ),
        pair(`${base}.title`, t('course.field.title'), { required: false }),
      ];
    }
    case 'reading':
      return [
        pair(`${base}.title`, t('course.field.readingTitle')),
        el(
          'div',
          { className: 'ui-grid' },
          plain(`${base}.cite.authors`, t('course.field.authors')),
          plain(`${base}.cite.year`, t('course.field.year'), { numeric: true }),
          plain(`${base}.cite.source`, t('course.field.source')),
          plain(`${base}.cite.doi`, t('course.field.doi')),
          field(
            idOf(`${base}.cite.url`),
            t('course.field.url'),
            textInput(item.cite?.url, s =>
              commit(x => {
                let v = s.trim();
                // The canonical form, so what the reader is shown is where
                // the link goes (./course/pack.js safeUrl()).
                try {
                  if (v) v = new URL(v).href;
                } catch {
                  /* kept as typed, for the checks to say why */
                }
                setAt(x, `${base}.cite.url`, v || undefined);
              })
            ),
            t('course.hint.url')
          ),
          plain(`${base}.license`, t('course.field.license'), {
            hint: t('course.hint.license'),
          }),
          field(
            idOf(`${base}.access`),
            t('course.field.access'),
            select(
              ACCESS.map(a => [a, t(`course.access.${a}`)]),
              item.access,
              v => commit(x => (getAt(x, base).access = v))
            )
          )
        ),
      ];
  }
  return [];
}

/** How an item's pin stands, from the last check. */
function pinLine(item) {
  const r = verdict?.review?.find(x => x.id === item.id);
  const text = item.pin
    ? t('course.pin.line', { fp: item.pin.fp, n: item.pin.n })
    : t('course.pin.none');
  return el(
    'p',
    { className: 'ui-hint' },
    text,
    r ? ` ${t(`course.standing.${r.status}`)}` : ''
  );
}

/** The lesson's steps, to tick; the setup steps a choice needs arrive with it. */
function stepPicker(item, base) {
  const lesson = known.get(item.lesson);
  const box = el(
    'fieldset',
    { id: idOf(`${base}.steps`) },
    el('legend', {}, t('course.field.steps'))
  );
  if (!lesson) {
    box.append(el('p', { className: 'ui-hint' }, t('course.steps.loading')));
    return box;
  }
  const chosen = new Set(item.steps || []);
  // A step another chosen step needs (its world, or a result it uses) is
  // added whatever is ticked, so it is marked as needed rather than chosen.
  const steps = item.steps || [];
  const needed = new Set(
    steps.filter(sid =>
      lesson.resolve(steps.filter(z => z !== sid)).sids.includes(sid)
    )
  );
  box.append(
    el('p', { className: 'ui-hint' }, t('course.hint.steps', { n: lesson.n }))
  );
  const list = el('ol', { className: 'cb-steps' });
  lesson.steps.forEach((s, k) => {
    const id = `${idOf(`${base}.steps`)}-${k}`;
    list.append(
      el(
        'li',
        {},
        checkbox(
          id,
          `${s.title || s.sid} (${s.type})${needed.has(s.sid) ? ` ${t('course.steps.needed')}` : ''}`,
          chosen.has(s.sid),
          on => {
            commit(x => {
              const it = getAt(x, base);
              const set = new Set(it.steps || []);
              if (on) set.add(s.sid);
              else set.delete(s.sid);
              it.steps = lesson.sids.filter(z => set.has(z));
            });
            repin(base);
          }
        )
      )
    );
  });
  box.append(list);
  return box;
}

// --- Checks -------------------------------------------------------------------------

function describe(e) {
  for (const id of [`course.error.${e.code}`, `studio.error.${e.code}`])
    if (hasMessage(id)) return t(id, e.vars);
  return e.message;
}

function describeFinding(f) {
  return t(`course.audit.${f.code}`, {
    ...f.vars,
    title: f.vars.id ? itemName(itemById(f.vars.id) || { id: f.vars.id }) : '',
    lessonTitle: f.vars.lesson ? lessonTitle(f.vars.lesson) : '',
    needsTitle: f.vars.needs ? lessonTitle(f.vars.needs) : '',
    status: f.vars.status ? t(`course.standing.${f.vars.status}`) : '',
  });
}

const itemById = id => itemsOf(doc()).find(e => e.item.id === id)?.item;

function controlFor(path) {
  let p = path;
  while (p) {
    const node = $(idOf(p));
    if (node) return node;
    const cut = Math.max(p.lastIndexOf('.'), p.lastIndexOf('['));
    if (cut <= 0) break;
    p = p.slice(0, cut);
  }
  return null;
}

function labelOf(node) {
  if (node?.tagName === 'DETAILS')
    return (
      node.querySelector(':scope > summary')?.firstChild?.textContent || ''
    );
  const label = node && document.querySelector(`label[for="${node.id}"]`);
  return (
    label?.textContent ||
    node?.querySelector?.(':scope > legend')?.textContent ||
    ''
  );
}

function showOnField(node, message) {
  if (!node) return;
  node.setAttribute('aria-invalid', 'true');
  const note = $(`${node.id}-error`);
  if (!note) return;
  note.textContent = note.hidden ? message : `${note.textContent} ${message}`;
  note.hidden = false;
  if (node.matches('input, select, textarea'))
    node.setAttribute(
      'aria-describedby',
      `${node.dataset.described || ''} ${node.id}-error`.trim()
    );
}

function clearFieldErrors() {
  for (const node of $('cb-editor').querySelectorAll('[aria-invalid="true"]')) {
    node.removeAttribute('aria-invalid');
    if (node.dataset.described)
      node.setAttribute('aria-describedby', node.dataset.described);
    else node.removeAttribute('aria-describedby');
  }
  for (const note of $('cb-editor').querySelectorAll('.ui-error')) {
    note.textContent = '';
    note.hidden = true;
  }
}

async function check(d) {
  const errors = validateCoursePack(d, courseApi(catalog));
  if (errors.some(e => HOSTILE.has(e.code)))
    return { errors, findings: [], review: [], facts: null };
  const facts = await courseFacts(d, {
    load: id => loadInvestigation(id, 'en'),
    catalog,
    known,
  });
  const findings = errors.length ? [] : auditCourse(d, facts);
  const review = reviewCoursePack(d, facts);
  let links = null;
  if (!errors.length && !findings.some(f => f.level === 'error'))
    links = await makeLinks(d);
  return { errors, findings, review, facts, links };
}

function scheduleCheck() {
  const text = serialize(doc());
  if (text === checkedFor) return;
  checkedFor = text;
  clearTimeout(checkTimer);
  const seq = ++checkSeq;
  $('cb-checks-summary').textContent = t('course.checks.running');
  checkTimer = setTimeout(async () => {
    let r;
    const d = doc();
    const unseen = itemsOf(d).some(
      ({ item }) => item.kind === 'assignment' && !known.has(item.lesson)
    );
    try {
      r = await check(d);
    } catch (err) {
      r = {
        errors: [
          {
            path: '',
            code: 'crash',
            vars: {},
            message: String(err?.message || err),
          },
        ],
        findings: [],
        review: [],
        facts: null,
        links: null,
      };
    }
    if (seq !== checkSeq) return;
    verdict = r;
    // The first check loads the lessons an assignment's step list shows; the
    // editor is redrawn for that and nothing else, since a redraw would take
    // away what is being typed and not yet committed.
    if (unseen) renderEditorOnly();
    renderVerdict();
    document.body.dataset.checked = String(seq);
  }, 120);
}

const blocking = r =>
  r.errors.length > 0 || r.findings.some(f => f.level === 'error');

function renderVerdict() {
  const r = verdict;
  const d = doc();
  clearFieldErrors();
  const list = $('cb-checks');
  list.textContent = '';
  const entry = (level, path, text) => {
    const node = controlFor(path);
    if (level === 'error') showOnField(node, text);
    const where = labelOf(node);
    list.append(
      el(
        'li',
        { 'data-level': level === 'warning' ? 'warn' : level },
        el(
          'button',
          { type: 'button', className: 'ui-link', onclick: () => reveal(path) },
          where ? `${where}: ${text}` : text
        )
      )
    );
  };
  for (const e of r.errors) entry('error', e.path, describe(e));
  for (const f of r.findings) entry(f.level, f.path, describeFinding(f));
  if (!list.children.length) list.append(el('li', {}, t('studio.checks.none')));
  const errors =
    r.errors.length + r.findings.filter(f => f.level === 'error').length;
  const warnings = r.findings.filter(f => f.level === 'warning').length;
  $('cb-checks-summary').textContent = errors
    ? t('course.checks.errors', { count: errors })
    : warnings
      ? t('course.checks.warnings', { count: warnings })
      : t('course.checks.valid');
  const ok = !blocking(r);
  for (const id of ['cb-save', 'cb-manifest', 'cb-preview-go', 'cb-syllabus'])
    $(id).disabled = !ok;
  renderReview(r, d);
  renderEstimate(r, d);
  renderGraph(r, d);
  renderLinks(r, d);
}

// --- Review and upgrade --------------------------------------------------------------

function renderReview(r, d) {
  const list = $('cb-review');
  list.textContent = '';
  const rows = (r.review || []).filter(
    x =>
      x.kind === 'lesson' || x.kind === 'assignment' || x.status !== STATUS.SAME
  );
  const needs = rows.filter(x => x.needsReview || x.status !== STATUS.SAME);
  $('cb-review-summary').textContent = needs.length
    ? t('course.review.summary', {
        count: needs.length,
        pinning: t(`course.pinning.${d.pinning}`),
      })
    : t('course.review.clear', { count: rows.length });
  for (const x of needs) {
    const detail = [];
    if (x.detail?.stepsThen && x.detail.stepsThen !== x.detail.stepsNow)
      detail.push(
        t('course.review.steps', {
          then: x.detail.stepsThen,
          now: x.detail.stepsNow,
        })
      );
    if (x.detail?.missingSteps?.length)
      detail.push(
        t('course.review.missingSteps', {
          list: x.detail.missingSteps.join(', '),
        })
      );
    if (x.detail?.changedSteps?.length)
      detail.push(
        t('course.review.changedSteps', {
          list: x.detail.changedSteps.join(', '),
        })
      );
    if (x.detail?.pinnedPackage || x.detail?.currentPackage)
      detail.push(
        t('course.review.package', {
          then: x.detail.pinnedPackage?.join(' ') || '-',
          now: x.detail.currentPackage?.join(' ') || '-',
        })
      );
    const id = `cb-reviewed-${x.id}`;
    const canUpgrade = x.status !== STATUS.MISSING;
    list.append(
      el(
        'li',
        { 'data-level': x.needsReview ? 'warn' : '' },
        el(
          'strong',
          {},
          `${itemName(itemById(x.id) || { id: x.id })}: ${t(`course.standing.${x.status}`)}`
        ),
        detail.length ? el('span', {}, ` ${detail.join(' ')}`) : null,
        ' ',
        canUpgrade
          ? checkbox(id, t('course.review.mark'), reviewed.has(x.id), on => {
              if (on) reviewed.add(x.id);
              else reviewed.delete(x.id);
              $('cb-upgrade').disabled = !reviewed.size;
            })
          : el('span', { className: 'ui-hint' }, t('course.review.remove'))
      )
    );
  }
  $('cb-upgrade').disabled = !reviewed.size;
}

function upgrade() {
  if (!verdict?.facts) return;
  const result = upgradeCoursePack(doc(), verdict.facts, [...reviewed], {
    today: today(),
    newAssignmentId: item => newAssignmentId(item),
  });
  reviewed.clear();
  if (!result.upgraded.length)
    return setStatus(t('course.status.nothingUpgraded'));
  commit(x => {
    for (const k of Object.keys(x)) delete x[k];
    Object.assign(x, result.pack);
  });
  setStatus(
    t('course.status.upgraded', {
      count: result.upgraded.length,
      version: result.pack.version,
      bump: t(`course.bump.${result.bump}`),
    })
  );
}

// --- Time, dependencies and links -------------------------------------------------------

function minutesText(r) {
  if (!r) return t('course.time.unknown');
  return r.lo === r.hi
    ? t('course.time.minutes', { n: r.lo })
    : t('course.time.range', { lo: r.lo, hi: r.hi });
}

function renderEstimate(r, d) {
  const list = $('cb-estimate');
  list.textContent = '';
  if (!r.facts) return;
  const e = estimate(d, r.facts);
  const hours = x => (x / 60).toFixed(1);
  for (const p of PATHS)
    list.append(
      el(
        'li',
        {},
        t('course.time.path', {
          path: t(`course.path.${p}`),
          minutes: minutesText(e.paths[p]),
          lo: hours(e.paths[p].lo),
          hi: hours(e.paths[p].hi),
        })
      )
    );
  const kinds = new Map();
  for (const { item } of itemsOf(d))
    kinds.set(item.kind, (kinds.get(item.kind) || 0) + 1);
  list.append(
    el(
      'li',
      {},
      t('course.time.items', {
        list: [...kinds]
          .map(([k, n]) => `${t(`course.kind.${k}`)}: ${n}`)
          .join(', '),
      })
    )
  );
}

function renderGraph(r, d) {
  const host = $('cb-graph');
  host.textContent = '';
  if (!r.facts) return;
  const g = dependencyGraph(d, r.facts);
  const label = id => {
    const n = g.nodes.find(x => x.id === id);
    if (!n) return id;
    if (id.startsWith('item:'))
      return itemName(itemById(n.label) || { id: n.label });
    if (id.startsWith('lesson:')) return lessonTitle(n.label);
    if (id.startsWith('scenario:'))
      return scenarioTitle(scenarioId(n.label) ?? n.label);
    return n.label;
  };
  const byFrom = new Map();
  for (const e of g.edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }
  const rows = el('ul', { className: 'ui-issues' });
  for (const n of g.nodes.filter(
    x => x.id.startsWith('item:') || x.id.startsWith('lesson:')
  )) {
    const out = byFrom.get(n.id) || [];
    if (!out.length) continue;
    rows.append(
      el(
        'li',
        {},
        el('strong', {}, label(n.id)),
        ': ',
        out.map(e => `${t(`course.edge.${e.kind}`)} ${label(e.to)}`).join('; ')
      )
    );
  }
  host.append(
    el(
      'p',
      { className: 'ui-hint' },
      t('course.graph.summary', {
        nodes: g.nodes.length,
        edges: g.edges.length,
      })
    ),
    rows
  );
}

/** Every item's link in each language, and the course home's. */
async function makeLinks(d) {
  const items = new Map();
  for (const { item } of itemsOf(d)) {
    const entry = {};
    for (const locale of d.locales) {
      const link = await itemLink(item, { root: ROOT, locale });
      if (link) entry[locale] = link.href;
    }
    items.set(item.id, entry);
  }
  return { items, course: await courseLink(d, { root: ROOT }) };
}

function copyButton(text, label) {
  return button(label, async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t('course.status.copied'));
    } catch {
      setStatus(t('course.status.copyFailed'));
    }
  });
}

function renderLinks(r, d) {
  const host = $('cb-links');
  host.textContent = '';
  if (!r.links) {
    host.append(el('p', { className: 'ui-hint' }, t('course.links.fixFirst')));
    return;
  }
  const c = r.links.course;
  const home = el('input', {
    type: 'text',
    className: 'ui-input is-code',
    readonly: true,
    id: 'cb-course-link',
  });
  home.value = c.url;
  host.append(
    field(
      'cb-course-link',
      t('course.links.home'),
      home,
      c.comfortable
        ? t('course.links.length', { n: c.length })
        : t('course.links.tooLong', { n: c.length, limit: c.limit })
    ),
    el(
      'div',
      { className: 'ui-toolbar' },
      copyButton(c.url, t('course.links.copy')),
      el(
        'a',
        {
          className: 'ui-button',
          href: c.url,
          target: '_blank',
          rel: 'noopener',
          id: 'cb-course-open',
        },
        t('course.links.open')
      )
    )
  );
  const embed = figureMarkup({
    src: c.url,
    title: t('course.links.embedTitle', {
      title: d.title?.[getLocale()] || d.title?.en || d.id,
    }),
    aspect: { w: 4, h: 5 },
    height: 900,
  });
  const embedBox = el('textarea', {
    className: 'ui-textarea is-code',
    readonly: true,
    rows: 4,
    id: 'cb-course-embed',
  });
  embedBox.value = embed;
  host.append(
    field('cb-course-embed', t('course.links.homeEmbed'), embedBox),
    copyButton(embed, t('course.links.copyEmbed'))
  );

  const table = el(
    'table',
    { className: 'ui-table', id: 'cb-link-table' },
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', {}, t('course.links.item')),
        ...d.locales.map(l => el('th', {}, t(`course.pair.${l}`)))
      )
    )
  );
  const body = el('tbody');
  for (const { item } of itemsOf(d)) {
    const links = r.links.items.get(item.id) || {};
    const cells = d.locales.map(l =>
      el(
        'td',
        {},
        links[l]
          ? [
              el(
                'a',
                { href: links[l], target: '_blank', rel: 'noopener' },
                t('course.links.openShort')
              ),
              ' ',
              copyButton(links[l], t('course.links.copyShort')),
            ]
          : '-'
      )
    );
    body.append(
      el('tr', { 'data-item': item.id }, el('td', {}, itemName(item)), ...cells)
    );
  }
  table.append(body);
  host.append(el('div', { className: 'ui-table-wrap' }, table));

  // A scenario is the one item that can also be a figure in another page.
  for (const { item } of itemsOf(d)) {
    if (item.kind !== 'scenario') continue;
    const href =
      r.links.items.get(item.id)?.[getLocale()] ||
      r.links.items.get(item.id)?.en;
    if (!href) continue;
    const fragment = href.slice(href.indexOf('#'));
    const params = new URLSearchParams(
      embedParams({ lang: getLocale() === 'es' ? 'es' : null })
    );
    const markup = figureMarkup({
      src: `${ROOT}?${params}${fragment}`,
      title: t('course.links.figureTitle', { title: itemName(item) }),
      aspect: EMBED_ASPECT,
      caption: itemName(item),
      fallback: { href, text: t('course.links.figureFallback') },
    });
    const box = el('textarea', {
      className: 'ui-textarea is-code',
      readonly: true,
      rows: 4,
      id: `cb-embed-${item.id}`,
    });
    box.value = markup;
    host.append(
      field(
        `cb-embed-${item.id}`,
        t('course.links.figure', { title: itemName(item) }),
        box
      )
    );
  }
}

// --- Preview, manifest and files ---------------------------------------------------------

function stagePreview() {
  try {
    window.localStorage.setItem(PREVIEW_KEY, JSON.stringify(doc()));
    return true;
  } catch {
    storageFailed = true;
    return false;
  }
}

function preview() {
  if (!verdict || blocking(verdict))
    return setStatus(t('studio.status.fixFirst'));
  if (!stagePreview()) return;
  $('cb-preview').src = `${ROOT}course/?draft=1&t=${Date.now()}`;
  setStatus(t('course.status.previewed'));
}

function syllabus() {
  if (!verdict || blocking(verdict))
    return setStatus(t('studio.status.fixFirst'));
  if (!stagePreview()) return;
  window.open(`${ROOT}course/?draft=1`, '_blank', 'noopener');
}

function downloadText(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function savePack() {
  const d = doc();
  downloadText(`${d.id}.course.json`, serialize(d));
  baseline = d;
  render();
  setStatus(t('course.status.saved', { file: `${d.id}.course.json` }));
}

function saveManifest() {
  const r = verdict;
  if (!r?.facts || blocking(r)) return setStatus(t('studio.status.fixFirst'));
  const d = doc();
  const m = courseManifest(d, r.facts, {
    links: r.links.items,
    course: r.links.course.url,
  });
  downloadText(`${d.id}.course-manifest.json`, serialize(m));
  setStatus(
    t('course.status.manifest', { file: `${d.id}.course-manifest.json` })
  );
}

function blankCourse() {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id: 'my-course',
    version: '1.0.0',
    gravitas: PLATFORM_API,
    locales: ['en', 'es'],
    pinning: 'compatible',
    title: { en: '' },
    objectives: [{ id: 'objective-1', text: { en: '' } }],
    units: [
      {
        id: 'unit-1',
        title: { en: t('course.unit.n', { n: 1 }) },
        items: [],
      },
    ],
  };
}

function start(pack, message) {
  history.reset(pack);
  baseline = clone(pack);
  saveDraft(pack);
  verdict = null;
  checkedFor = null;
  reviewed.clear();
  render();
  if (message) setStatus(message);
}

/**
 * A pack by scenario id: one made before ids names its scenario items in
 * English, and is saved by id from here on.
 */
function byScenarioId(pack) {
  for (const { item } of itemsOf(pack))
    if (item?.kind === 'scenario' && scenarioId(item.scenario))
      item.scenario = scenarioId(item.scenario);
  return pack;
}

/** A file's pack, or why it is refused. */
function readPack(data) {
  if (!data || typeof data !== 'object' || data.format !== FORMAT)
    return { ok: false, message: t('course.file.notPack') };
  if (data.formatVersion > FORMAT_VERSION)
    return {
      ok: false,
      message: t('studio.file.newer', { version: data.formatVersion }),
    };
  const pack = byScenarioId(
    migrateCoursePack(data, { platform: PLATFORM_API })
  );
  // Refused outright only for what a hand-made or hostile file could carry
  // into the page; anything else opens, with the checks saying what to fix.
  const hostile = validateCoursePack(pack, { locales: ['en', 'es'] }).find(e =>
    HOSTILE.has(e.code)
  );
  if (hostile)
    return {
      ok: false,
      message: t('course.file.refused', { why: describe(hostile) }),
    };
  if (!pack.units || !Array.isArray(pack.units) || typeof pack.id !== 'string')
    return { ok: false, message: t('course.file.notPack') };
  return { ok: true, pack, migrated: data.formatVersion === 1 };
}

async function openFile(file) {
  if (file.size > MAX_FILE) return setStatus(t('course.file.tooLarge'));
  let data;
  try {
    data = parseDocument(await file.text(), true);
  } catch {
    return setStatus(t('studio.file.unreadable'));
  }
  const r = readPack(data);
  if (!r.ok) return setStatus(r.message);
  const existing = drafts.load(r.pack.id);
  if (existing && serialize(existing.doc) !== serialize(r.pack))
    return askConflict(existing.doc, r.pack);
  start(
    r.pack,
    r.migrated
      ? t('course.file.migrated', { id: r.pack.id })
      : t('studio.file.opened', { id: r.pack.id })
  );
}

function askConflict(mine, theirs) {
  const dialog = $('cb-conflict');
  $('cb-conflict-text').textContent = t('studio.conflict.text', {
    id: theirs.id,
  });
  const list = $('cb-conflict-diff');
  list.textContent = '';
  for (const c of semanticDiff(mine, theirs).slice(0, 50))
    list.append(
      el('li', {}, el('code', {}, c.path), ` ${t(`studio.diff.${c.kind}`)}`)
    );
  const choose = choice => {
    dialog.close();
    if (choice === 'replace')
      start(theirs, t('studio.file.opened', { id: theirs.id }));
    else if (choice === 'both') {
      let n = 2;
      while (drafts.load(`${theirs.id}-${n}`)) n++;
      start(
        { ...theirs, id: `${theirs.id}-${n}` },
        t('studio.conflict.kept', { id: `${theirs.id}-${n}` })
      );
    } else setStatus(t('studio.conflict.cancelled'));
  };
  $('cb-conflict-replace').onclick = () => choose('replace');
  $('cb-conflict-both').onclick = () => choose('both');
  $('cb-conflict-cancel').onclick = () => choose('cancel');
  dialog.showModal();
}

function applyRaw() {
  const note = $('cb-raw-error');
  let data;
  try {
    data = parseDocument($('st-raw-text').value, true);
  } catch (err) {
    note.textContent = t('studio.raw.notJson', { error: err.message });
    note.hidden = false;
    $('st-raw-text').focus();
    return;
  }
  const r = readPack(data);
  if (!r.ok) {
    note.textContent = r.message;
    note.hidden = false;
    return;
  }
  commit(x => {
    for (const k of Object.keys(x)) delete x[k];
    Object.assign(x, r.pack);
  });
  setStatus(t('studio.raw.applied'));
}

// --- Rendering -------------------------------------------------------------------------

function renderTranslation(d) {
  const texts = textsOf(d);
  const states = texts.map(x => ({ ...x, state: translationState(x.v, 'es') }));
  const count = s => states.filter(x => x.state === s).length;
  const [missing, stale] = ['missing', 'stale'].map(count);
  $('cb-translation-summary').textContent = !d.locales?.includes('es')
    ? t('course.translation.off')
    : missing + stale
      ? t('course.translation.summary', { total: texts.length, missing, stale })
      : t('course.translation.complete');
  const list = $('cb-translation');
  list.textContent = '';
  if (!d.locales?.includes('es')) return;
  for (const x of states.filter(x => x.state !== 'done').slice(0, 40)) {
    const node = controlFor(`${x.path}.en`);
    const where = labelOf(node) || x.path;
    list.append(
      el(
        'li',
        { 'data-level': x.state === 'stale' ? 'error' : 'warn' },
        el(
          'button',
          {
            type: 'button',
            className: 'ui-link',
            onclick: () => reveal(`${x.path}.es`),
          },
          t('course.translation.item', {
            where,
            state: t(`course.state.${x.state}`),
          })
        )
      )
    );
  }
}

function renderDiff(d) {
  const list = $('cb-diff');
  list.textContent = '';
  const changes = semanticDiff(baseline, d);
  const show = v => {
    const s = v === undefined ? '-' : JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 79)}…` : s;
  };
  for (const c of changes.slice(0, 200))
    list.append(
      el(
        'li',
        {},
        el('code', {}, c.path),
        ` ${t(`studio.diff.${c.kind}`)}: ${show(c.before)} → ${show(c.after)}`
      )
    );
  $('cb-diff-summary').textContent = changes.length
    ? t('studio.diff.count', { count: changes.length })
    : t('studio.diff.none');
}

function setStatus(message) {
  $('cb-status').textContent = message;
}

function renderEditorOnly() {
  const d = doc();
  const focused = document.activeElement?.id;
  const host = $('cb-editor');
  host.textContent = '';
  host.append(
    aboutSection(d),
    objectivesSection(d),
    prerequisitesSection(d),
    unitsSection(d)
  );
  if (focused && $(focused)) $(focused).focus();
}

function render() {
  if (!history) return;
  const d = doc();
  renderEditorOnly();
  $('cb-undo').disabled = !history.canUndo();
  $('cb-redo').disabled = !history.canRedo();
  $('st-raw-text').value = serialize(d);
  $('cb-raw-error').hidden = true;
  $('cb-storage').hidden = !storageFailed;
  renderDrafts();
  renderTranslation(d);
  renderDiff(d);
  if (verdict) renderVerdict();
  scheduleCheck();
}

function renderDrafts() {
  const s = $('cb-drafts');
  s.textContent = '';
  for (const draft of drafts.list()) {
    const title = draft.title?.[getLocale()] || draft.title?.en || draft.id;
    s.append(el('option', { value: draft.id }, `${title} (${draft.id})`));
  }
  s.value = doc().id;
}

// --- Start-up ---------------------------------------------------------------------------

async function openExample() {
  const pack = clone(await BUILTIN_COURSES['intro-astronomy']());
  start(pack, t('course.status.example'));
}

function wire() {
  $('cb-new').addEventListener('click', () =>
    start(blankCourse(), t('course.status.new'))
  );
  $('cb-example').addEventListener('click', openExample);
  $('cb-open').addEventListener('click', () => $('cb-file').click());
  $('cb-file').addEventListener('change', () => {
    const file = $('cb-file').files?.[0];
    $('cb-file').value = '';
    if (file) openFile(file);
  });
  $('cb-save').addEventListener('click', savePack);
  $('cb-manifest').addEventListener('click', saveManifest);
  $('cb-preview-go').addEventListener('click', preview);
  $('cb-syllabus').addEventListener('click', syllabus);
  $('cb-upgrade').addEventListener('click', upgrade);
  $('cb-undo').addEventListener('click', () => {
    const d = history.undo();
    if (d) (saveDraft(d), render(), setStatus(t('studio.status.undone')));
  });
  $('cb-redo').addEventListener('click', () => {
    const d = history.redo();
    if (d) (saveDraft(d), render(), setStatus(t('studio.status.redone')));
  });
  document.addEventListener('keydown', event => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const target = event.target;
    const typing =
      target?.tagName === 'TEXTAREA' ||
      (target?.tagName === 'INPUT' &&
        !['checkbox', 'radio', 'button', 'file'].includes(target.type));
    if (typing) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) $('cb-undo').click();
    else if ((key === 'z' && event.shiftKey) || key === 'y')
      $('cb-redo').click();
    else return;
    event.preventDefault();
  });
  $('cb-drafts-open').addEventListener('click', () => {
    const d = drafts.load($('cb-drafts').value);
    if (d) start(d.doc, t('studio.status.draftOpened', { id: d.doc.id }));
  });
  $('cb-drafts-delete').addEventListener('click', () => {
    const id = $('cb-drafts').value;
    if (id === doc().id) return setStatus(t('studio.status.draftInUse'));
    drafts.remove(id);
    renderDrafts();
    setStatus(t('studio.status.draftDeleted', { id }));
  });
  $('cb-raw-apply').addEventListener('click', applyRaw);
  $('cb-raw-revert').addEventListener('click', () => render());
}

/**
 * Add what the address names to the course being edited, or to a new one:
 * ?add=<investigation id> a whole investigation, ?activity=<fragment of an
 * activity link> that activity with its code kept, so the link already handed
 * out still opens it. Used from the adoption pages, the Library and the
 * activity builder (INSTRUCTOR_FLOW.md).
 * @param {boolean} hadDraft - Whether a draft was restored
 * @returns {Promise<?string>} A status message, or null when nothing was asked
 */
async function addFromAddress(hadDraft) {
  const params = new URLSearchParams(location.search);
  const lessonId = params.get('add');
  const fragment = params.get('activity');
  if (!lessonId && !fragment) return null;
  let item;
  if (fragment) {
    const { readSource } = await import('./teach/activity.js');
    const r = await readSource(`#${fragment}`);
    if (!r.ok || r.kind !== 'activity') return t('course.add.failed');
    const a = r.activity;
    item = {
      kind: 'assignment',
      id: 'pending',
      lesson: a.l,
      steps: [...a.s],
      ...(a.t ? { title: { en: a.t } } : {}),
      ...(a.n ? { intro: { en: a.n } } : {}),
      assignment: { id: a.i, created: a.c },
      ...(a.d ? { depth: a.d } : {}),
    };
  } else if (LESSONS.some(l => l.id === lessonId)) {
    item = { kind: 'lesson', id: 'pending', lesson: lessonId };
  } else return t('course.add.failed');
  if (!hadDraft) start(blankCourse());
  const path = `units[0].items[${doc().units[0].items.length}]`;
  commit(x => {
    item.id = freshId(
      x,
      item.kind === 'lesson' ? item.lesson : `${item.lesson}-activity`
    );
    x.units[0].items.push(item);
  });
  const facts = await courseFacts(
    { units: [{ items: [item] }] },
    { load: id => loadInvestigation(id, 'en'), catalog, known }
  );
  const lesson = facts.lessons.get(item.lesson);
  if (lesson)
    commit(x => {
      const it = getAt(x, path);
      if (it) it.pin = pinFor(it, lesson);
    });
  return t('course.add.done');
}

async function init() {
  let store = null;
  try {
    store = window.localStorage;
  } catch {
    store = null;
  }
  drafts = createDrafts(
    store ?? {
      getItem: () => null,
      setItem() {
        throw new Error('no storage');
      },
      removeItem() {},
      key: () => null,
      length: 0,
    },
    DRAFT_KEYS
  );
  // The catalog's data packs, when the catalog can be read: offline and
  // before it is precached, the built-in datasets are still offered.
  try {
    const res = await fetch(`${ROOT}catalog/catalog.json`);
    if (res.ok) catalog = await res.json();
  } catch {
    catalog = null;
  }
  await useLanguage(preferredLocale());
  wire();
  // ?open=<id>: the draft My work names, else the one saved last.
  const named = new URLSearchParams(location.search).get('open');
  const last = named && drafts.load(named) ? named : drafts.last();
  const draft = last ? drafts.load(last) : null;
  // A first visit opens the example course; New starts from nothing.
  history = createHistory(
    draft?.doc
      ? byScenarioId(draft.doc)
      : clone(await BUILTIN_COURSES['intro-astronomy']())
  );
  baseline = history.current();
  render();
  mountShell({ onLanguage: useLanguage });
  setStatus(
    draft
      ? t('studio.status.restored', { id: draft.doc.id })
      : t('course.status.example')
  );
  const added = await addFromAddress(Boolean(draft));
  if (added) setStatus(added);
  document.body.dataset.ready = 'true';
}

init();
