// =============================================================================
// The Investigation Composer (/studio/lesson/)
// -----------------------------------------------------------------------------
// A page for composing a guided investigation as data: the steps a student
// reads, predicts, explores, measures and answers, the scenario and
// instrument each opens, the questions it draws from a bank, the remediation
// a wrong answer earns, and every word in English and Spanish, side by side.
// What it makes is a gravitas.investigation-pack/1 file
// (js/platform/investigation.js); js/composer/compile.js turns one into the
// lesson and Spanish shadow the engine runs, and js/authoring/rules.js - the
// checker every lesson in the repository passes - judges the result.
//
// It edits a document, never the repository and never code: nothing an author
// writes is run, a numeric variant's answer is computed by a vetted relation
// (js/platform/relations.js), and a pack cannot name a function. Every
// committed edit is an undo step and a draft in this browser, as in the
// Scenario Studio, whose model (js/studio/model.js) this shares. The preview
// is the real lesson engine opening the compiled draft from this browser
// (js/authoring/preview.js installDraft); the answer key and the sample lab
// report are what an instructor and a student would see.
// =============================================================================

import {
  t,
  setLocale,
  getLocale,
  preferredLocale,
  registerMessages,
  hasMessage,
} from './i18n/index.js';
import { parseNumber } from './answerParse.js';
import { EN_STUDIO } from './i18n/en.studio.js';
import { EN_COMPOSER } from './i18n/en.composer.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { MANIFEST } from './data/investigations/manifest.js';
import { scenarioTitle } from './i18n/scenario.js';
import { randomSeed } from './rng.js';
import {
  FORMAT,
  FORMAT_VERSION,
  STEP_TYPES,
  migrateInvestigationPack,
  makeChecker,
} from './platform/investigation.js';
import {
  BANK_FORMAT,
  BANK_FORMAT_VERSION,
  ITEM_KINDS,
  ATTEMPT_RULES,
  validateQuestionBankWith,
} from './platform/questionBank.js';
import {
  RELATIONS,
  RELATION_IDS,
  evaluateRelation,
} from './platform/relations.js';
import {
  collectTexts,
  digest,
  estimate,
  lessonModule,
  outsideDuration,
} from './composer/compile.js';
import {
  packApi,
  checkInvestigationPack,
  WIDGET_FAMILIES,
} from './composer/api.js';
import { EXAMPLE_INVESTIGATION } from './composer/example.js';
import {
  createHistory,
  createDrafts,
  semanticDiff,
  serialize,
} from './studio/model.js';

/** A copy of plain data: a pack is JSON, so this loses nothing. */
const clone = v => JSON.parse(JSON.stringify(v));
const $ = id => document.getElementById(id);
const LOCAL = { en: [EN_STUDIO, EN_COMPOSER] };
const LOADERS = {
  es: () =>
    Promise.all([
      import('./i18n/es.studio.js').then(m => m.ES_STUDIO),
      import('./i18n/es.composer.js').then(m => m.ES_COMPOSER),
    ]),
};
const LANGUAGES = [
  { id: 'en', endonym: 'English' },
  { id: 'es', endonym: 'Español' },
];
/** js/authoring/preview.js DRAFT_KEY: where the engine looks for the draft. */
const PREVIEW_KEY = 'gravitas_composer_preview';
const DRAFT_KEYS = {
  prefix: 'gravitas_composer_draft:',
  last: 'gravitas_composer_last',
};

let history = null;
let drafts = null;
let baseline = null;
let storageFailed = false;
/** The last verdict from checkInvestigationPack, and which edit it is for. */
let verdict = null;
let checkSeq = 0;
let checkTimer = 0;
let reportUrl = null;

const doc = () => history.current();

/**
 * Which cards are open, by what they hold rather than where it is: a step by
 * its id, a bank item by its own, so a card stays open when steps move. A
 * closed card builds nothing but its summary, which is what keeps a long
 * investigation's page light enough to scroll and to check.
 */
const openCards = new Set();
const cardKey = (d, base) => {
  let m = /^steps\[(\d+)\]/.exec(base);
  if (m) return `step:${d.steps[m[1]]?.sid}`;
  m = /^bank\.items\[(\d+)\]/.exec(base);
  if (m) return `item:${d.bank?.items?.[m[1]]?.id}`;
  return null;
};

/** A collapsible card whose contents are built only while it is open. */
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

/** Open the card a path is in, and put focus on the control it names. */
function reveal(path) {
  const m = /^(steps\[\d+\]|bank\.items\[\d+\])/.exec(path);
  const key = m && cardKey(doc(), m[1]);
  if (key && !openCards.has(key)) {
    openCards.add(key);
    render();
  }
  const node = controlFor(path);
  (node?.tagName === 'DETAILS' ? node.querySelector('summary') : node)?.focus();
}

// --- Paths ------------------------------------------------------------------
//
// Every control's id is its path in the document ('steps[2].title.en' is
// cp-steps-2-title-en), so a complaint the validator makes about a path lands
// on the control that edits it, or on the nearest one around it.

const idOf = path =>
  `cp-${path.replace(/\[(\d+)\]/g, '-$1').replace(/\./g, '-')}`;
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

/**
 * A number from a field, read in the author's language (js/answerParse.js):
 * "3,14" in Spanish, "1,234" as a thousand in English, and nothing ambiguous.
 * What cannot be read is kept, so the checks can say so.
 */
const numberOf = text => {
  const s = String(text).trim();
  if (s === '') return undefined;
  const r = parseNumber(s, getLocale());
  return r.ok && !r.rest ? r.value : s;
};

// --- Language ---------------------------------------------------------------

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
  $('cp-preview').title = t('composer.preview.frame');
  const host = $('langSwitch');
  host.textContent = '';
  for (const { id, endonym } of LANGUAGES) {
    const b = el(
      'button',
      { type: 'button', className: 'ui-button', lang: id },
      endonym
    );
    b.setAttribute('aria-pressed', String(getLocale() === id));
    b.addEventListener('click', () => useLanguage(id));
    host.append(b);
  }
}

// --- Editing ----------------------------------------------------------------

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
    inputmode: numeric ? 'decimal' : undefined,
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

/** Where a text stands: translated, missing its Spanish, or out of date. */
const stateOf = v =>
  !v?.en
    ? null
    : !v.es
      ? 'missing'
      : v.esOf && v.esOf !== digest(v.en)
        ? 'stale'
        : 'done';

/**
 * A text, English and Spanish side by side, with where its translation
 * stands. Writing the Spanish records which English it translates; editing
 * the English afterwards marks the Spanish out of date until it is rewritten.
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
        cur.esOf = digest(cur.en ?? '');
      } else {
        delete cur.es;
        delete cur.esOf;
      }
      const empty = !cur.en && !cur.es;
      setAt(x, path, empty && !required ? undefined : empty ? {} : cur);
    });
  const state = stateOf(v);
  const esLabel = el(
    'span',
    {},
    `${label} (${t('composer.pair.es')}) `,
    state
      ? el(
          'span',
          { className: 'st-state', 'data-state': state },
          t(`composer.state.${state}`)
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
      `${label} (${t('composer.pair.en')})`,
      enInput,
      hint
    ),
    esField
  );
}

// --- About ------------------------------------------------------------------

function aboutSection(d) {
  const lessons = MANIFEST.map(m => [m.id, m.title]);
  const scenarios = Object.keys(SCENARIO_INFO).map(n => [n, scenarioTitle(n)]);
  const objectives = el(
    'fieldset',
    { id: idOf('objectives') },
    el('legend', {}, t('composer.field.objectives'))
  );
  (d.objectives || []).forEach((_, i) => {
    objectives.append(
      pair(`objectives[${i}]`, t('composer.objective', { n: i + 1 }))
    );
    if ((d.objectives || []).length > 1)
      objectives.append(
        button(t('composer.objective.remove', { n: i + 1 }), () =>
          commit(x => x.objectives.splice(i, 1))
        )
      );
  });
  objectives.append(
    el('p', {
      id: `${idOf('objectives')}-error`,
      className: 'ui-error',
      hidden: true,
    })
  );
  objectives.append(
    button(t('composer.objective.add'), () =>
      commit(x => (x.objectives ||= []).push({ en: '' }))
    )
  );

  const prereqs = el(
    'fieldset',
    { id: idOf('prerequisites') },
    el('legend', {}, t('composer.field.prerequisites'))
  );
  (d.prerequisites || []).forEach((r, i) => {
    const at = `prerequisites[${i}]`;
    if ('lesson' in r)
      prereqs.append(
        field(
          idOf(`${at}.lesson`),
          t('composer.prereq.lesson'),
          select(lessons, r.lesson, v =>
            commit(x => (x.prerequisites[i] = { lesson: v }))
          )
        )
      );
    else prereqs.append(pair(`${at}.text`, t('composer.prereq.text')));
    prereqs.append(
      button(t('composer.prereq.remove', { n: i + 1 }), () =>
        commit(x => {
          x.prerequisites.splice(i, 1);
          if (!x.prerequisites.length) delete x.prerequisites;
        })
      )
    );
  });
  prereqs.append(
    el(
      'div',
      { className: 'ui-toolbar' },
      button(
        `${t('composer.prereq.add')}: ${t('composer.prereq.lesson')}`,
        () =>
          commit(x => (x.prerequisites ||= []).push({ lesson: lessons[0][0] }))
      ),
      button(`${t('composer.prereq.add')}: ${t('composer.prereq.text')}`, () =>
        commit(x => (x.prerequisites ||= []).push({ text: { en: '' } }))
      )
    )
  );

  return el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'cp-about-h' },
    el('h2', { id: 'cp-about-h' }, t('composer.section.about')),
    el(
      'div',
      { className: 'ui-grid' },
      field(
        idOf('id'),
        t('composer.field.id'),
        textInput(d.id, v => commit(x => (x.id = v.trim()))),
        t('composer.hint.id')
      ),
      field(
        idOf('version'),
        t('composer.field.version'),
        textInput(d.version, v => commit(x => (x.version = v.trim())))
      ),
      field(
        idOf('duration'),
        t('composer.field.duration'),
        textInput(d.duration, v => commit(x => (x.duration = v.trim()))),
        t('composer.hint.duration')
      ),
      field(
        idOf('thumbnail'),
        t('composer.field.thumbnail'),
        select(
          [['', t('composer.thumbnail.first')], ...scenarios],
          d.thumbnail,
          v => commit(x => (v ? (x.thumbnail = v) : delete x.thumbnail))
        )
      ),
      field(
        idOf('seed'),
        t('composer.field.seed'),
        textInput(d.seed, v => commit(x => (x.seed = numberOf(v))), {
          numeric: true,
        }),
        t('composer.hint.seed')
      )
    ),
    el(
      'div',
      { className: 'ui-toolbar' },
      button(
        t('studio.action.newSeed'),
        () => commit(x => (x.seed = randomSeed())),
        { id: 'cp-seed-new' }
      )
    ),
    pair('title', t('composer.field.title')),
    pair('subtitle', t('composer.field.subtitle')),
    pair('summary', t('composer.field.summary'), { multiline: true }),
    pair('level', t('composer.field.level')),
    objectives,
    prereqs
  );
}

// --- Steps ------------------------------------------------------------------

const typeName = type => t(`composer.type.${type}`);
/** Whether a step is one a `when` may follow: graded, and reached by everyone. */
const gradedStep = s =>
  !s.when &&
  (s.type === 'predict' ||
    (s.type === 'question' &&
      (s.from !== undefined || s.kind === 'choice' || s.kind === 'numeric')));

function renameSid(x, i, next) {
  const old = x.steps[i].sid;
  x.steps[i].sid = next;
  for (const s of x.steps) {
    if (s.reveal === old) s.reveal = next;
    if (s.when?.sid === old) s.when.sid = next;
    if (s.requires) s.requires = s.requires.map(r => (r === old ? next : r));
  }
}

/** A fresh step id no step has. */
function freshSid(x, base) {
  const taken = new Set(x.steps.map(s => s.sid));
  let n = x.steps.length + 1;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function newStep(x, type) {
  const s = {
    sid: freshSid(x, type),
    type,
    title: { en: '' },
    body: { en: '' },
  };
  if (type === 'explore') s.checklist = [{ en: '' }];
  if (type === 'measure') s.fields = [{ id: 'value', label: { en: '' } }];
  if (type === 'predict') {
    const later = x.steps.at(-1)?.sid;
    Object.assign(s, {
      prompt: { en: '' },
      options: [{ en: '' }, { en: '' }],
      answer: 0,
      because: { en: '' },
      reveal: later,
    });
  }
  if (type === 'question')
    Object.assign(s, {
      kind: 'choice',
      prompt: { en: '' },
      options: [{ en: '' }, { en: '' }],
      answer: 0,
      because: { en: '' },
      scoring: { points: 1, attempts: 'first' },
    });
  return s;
}

function listOf(
  path,
  items,
  label,
  make,
  { min = 0, addLabel, removeLabel } = {}
) {
  const fs = el('fieldset', { id: idOf(path) }, el('legend', {}, label));
  items.forEach((_, j) => {
    fs.append(make(`${path}[${j}]`, j));
    if (items.length > min)
      fs.append(
        button(removeLabel(j + 1), () =>
          commit(x => getAt(x, path).splice(j, 1))
        )
      );
  });
  fs.append(
    el('p', { id: `${idOf(path)}-error`, className: 'ui-error', hidden: true })
  );
  return { fs, add: onAdd => fs.append(button(addLabel, () => commit(onAdd))) };
}

function choiceOptions(base, s, { answerKey = 'answer' } = {}) {
  const radios = el(
    'fieldset',
    { id: idOf(`${base}.${answerKey}`) },
    el('legend', {}, t('composer.option.right'))
  );
  const { fs, add } = listOf(
    `${base}.options`,
    s.options || [],
    t('composer.step.options'),
    (at, j) => pair(at, t('composer.option', { n: j + 1 })),
    {
      min: 2,
      addLabel: t('composer.option.add'),
      removeLabel: n => t('composer.option.remove', { n }),
    }
  );
  add(x => getAt(x, `${base}.options`).push({ en: '' }));
  (s.options || []).forEach((_, j) => {
    const r = el('input', {
      type: 'radio',
      name: idOf(`${base}.${answerKey}`),
      id: `${idOf(`${base}.${answerKey}`)}-${j}`,
    });
    r.checked = s[answerKey] === j;
    r.addEventListener('change', () =>
      commit(x => (getAt(x, base)[answerKey] = j))
    );
    radios.append(
      el(
        'label',
        { className: 'ui-choice' },
        r,
        t('composer.option', { n: j + 1 })
      )
    );
  });
  radios.append(
    el('p', {
      id: `${idOf(`${base}.${answerKey}`)}-error`,
      className: 'ui-error',
      hidden: true,
    })
  );
  return [fs, radios];
}

function scoringFields(base, s) {
  return el(
    'div',
    { className: 'ui-grid' },
    field(
      idOf(`${base}.scoring.points`),
      t('composer.scoring.points'),
      textInput(
        s.scoring?.points,
        v => commit(x => setAt(x, `${base}.scoring.points`, numberOf(v))),
        { numeric: true }
      )
    ),
    field(
      idOf(`${base}.scoring.attempts`),
      t('composer.scoring.attempts'),
      select(
        ATTEMPT_RULES.map(a => [a, t(`composer.attempts.${a}`)]),
        s.scoring?.attempts,
        v => commit(x => setAt(x, `${base}.scoring.attempts`, v))
      )
    )
  );
}

/** The answer parser's units, for a numeric answer that accepts more than one. */
function expectFields(base, s) {
  const units = packApi().units;
  const e = s.expect;
  const dims = [
    ['', t('composer.expect.none')],
    ...Object.keys(units).map(d => [d, d]),
  ];
  const out = [
    field(
      idOf(`${base}.expect.dimension`),
      t('composer.expect.dimension'),
      select(dims, e?.dimension, v =>
        commit(x => {
          if (!v) delete getAt(x, base).expect;
          else
            setAt(x, `${base}.expect`, {
              dimension: v,
              unit: units[v][0],
              accept: [units[v][0]],
            });
        })
      )
    ),
  ];
  if (e?.dimension && units[e.dimension]) {
    out.push(
      field(
        idOf(`${base}.expect.unit`),
        t('composer.expect.unit'),
        select(
          units[e.dimension].map(u => [u, u]),
          e.unit,
          v => commit(x => setAt(x, `${base}.expect.unit`, v))
        )
      ),
      field(
        idOf(`${base}.expect.accept`),
        t('composer.expect.accept'),
        textInput((e.accept || []).join(', '), v =>
          commit(x => {
            const list = v
              .split(',')
              .map(u => u.trim())
              .filter(Boolean);
            setAt(x, `${base}.expect.accept`, list.length ? list : undefined);
          })
        )
      )
    );
  }
  return el('div', { className: 'ui-grid' }, ...out);
}

/** A question's parts, whether it is a step's own or a bank item. */
function questionParts(base, s, { bankItem = false } = {}) {
  const parts = [
    pair(`${base}.prompt`, t('composer.step.prompt'), { multiline: true }),
  ];
  if (s.kind === 'choice') parts.push(...choiceOptions(base, s));
  if (s.kind === 'numeric') {
    const relation = bankItem ? s.variants?.relation : undefined;
    const grid = el('div', { className: 'ui-grid' });
    if (!relation) {
      grid.append(
        field(
          idOf(`${base}.answer`),
          t('composer.numeric.answer'),
          textInput(
            s.answer,
            v => commit(x => setAt(x, `${base}.answer`, numberOf(v))),
            { numeric: true }
          )
        ),
        field(
          idOf(`${base}.tolerance`),
          t('composer.numeric.tolerance'),
          textInput(
            s.tolerance,
            v => commit(x => setAt(x, `${base}.tolerance`, numberOf(v))),
            { numeric: true }
          )
        )
      );
    }
    grid.append(
      field(
        idOf(`${base}.unit`),
        t('composer.numeric.unit'),
        textInput(s.unit, v =>
          commit(x => setAt(x, `${base}.unit`, v.trim() || undefined))
        )
      )
    );
    parts.push(grid, expectFields(base, s));
    parts.push(
      pair(`${base}.hints.concept`, t('composer.hints.concept'), {
        multiline: true,
        required: false,
      })
    );
    parts.push(
      pair(`${base}.hints.method`, t('composer.hints.method'), {
        multiline: true,
        required: false,
      })
    );
    parts.push(
      pair(`${base}.worked`, t('composer.step.worked'), {
        multiline: true,
        required: false,
      })
    );
  }
  if (s.kind === 'short')
    parts.push(
      pair(`${base}.rubric`, t('composer.step.rubric'), { multiline: true })
    );
  parts.push(
    pair(`${base}.because`, t('composer.step.because'), {
      multiline: true,
      required: s.kind !== 'short',
    })
  );
  parts.push(scoringFields(base, s));
  return parts;
}

/** The fields a question keeps whichever kind it becomes. */
const STEP_KEEP = [
  'sid',
  'type',
  'title',
  'body',
  'tip',
  'setup',
  'tool',
  'when',
  'requires',
];

function switchQuestion(x, i, value) {
  const s = x.steps[i];
  const kept = Object.fromEntries(
    STEP_KEEP.filter(k => k in s).map(k => [k, s[k]])
  );
  if (value.startsWith('bank:')) x.steps[i] = { ...kept, from: value.slice(5) };
  else {
    const kind = value.slice(7);
    const fresh = {
      kind,
      prompt: s.prompt ?? { en: '' },
      scoring: s.scoring ?? { points: 1, attempts: 'first' },
    };
    if (kind === 'choice')
      Object.assign(fresh, {
        options: s.options ?? [{ en: '' }, { en: '' }],
        answer: 0,
        because: s.because ?? { en: '' },
      });
    if (kind === 'numeric')
      Object.assign(fresh, {
        answer: 1,
        tolerance: 0.1,
        because: s.because ?? { en: '' },
      });
    if (kind === 'short') fresh.rubric = { en: '' };
    x.steps[i] = { ...kept, ...fresh };
  }
}

function stepCard(s, i, d) {
  const base = `steps[${i}]`;
  const title = (getLocale() === 'es' && s.title?.es) || s.title?.en || s.sid;
  const legend = t('composer.step.legend', {
    n: i + 1,
    type: typeName(s.type),
  });
  return card(d, base, `${legend}: ${title}`, node => fillStep(node, s, i, d));
}

function fillStep(card, s, i, d) {
  const base = `steps[${i}]`;
  card.append(
    el(
      'div',
      { className: 'ui-grid' },
      field(
        idOf(`${base}.sid`),
        t('composer.step.sid'),
        textInput(s.sid, v => commit(x => renameSid(x, i, v.trim()))),
        t('composer.hint.sid')
      )
    )
  );
  card.append(pair(`${base}.title`, t('composer.step.title')));
  card.append(
    pair(`${base}.body`, t('composer.step.body'), { multiline: true })
  );

  if (s.type === 'explore') {
    const { fs, add } = listOf(
      `${base}.checklist`,
      s.checklist || [],
      t('composer.step.checklist'),
      (at, j) => pair(at, t('composer.checklist.item', { n: j + 1 })),
      {
        min: 1,
        addLabel: t('composer.checklist.add'),
        removeLabel: n => t('composer.checklist.remove', { n }),
      }
    );
    add(x => x.steps[i].checklist.push({ en: '' }));
    card.append(fs);
  }
  if (s.type === 'measure') {
    const { fs, add } = listOf(
      `${base}.fields`,
      s.fields || [],
      t('composer.step.fields'),
      (at, j) =>
        el(
          'div',
          {},
          el(
            'div',
            { className: 'ui-grid' },
            field(
              idOf(`${at}.id`),
              t('composer.measure.id'),
              textInput(s.fields[j].id, v =>
                commit(x => (x.steps[i].fields[j].id = v.trim()))
              )
            ),
            field(
              idOf(`${at}.unit`),
              t('composer.measure.unit'),
              textInput(s.fields[j].unit, v =>
                commit(x => setAt(x, `${at}.unit`, v.trim() || undefined))
              )
            )
          ),
          pair(`${at}.label`, t('composer.measure.label'))
        ),
      {
        min: 1,
        addLabel: t('composer.measure.add'),
        removeLabel: n => t('composer.measure.remove', { n }),
      }
    );
    add(x =>
      x.steps[i].fields.push({
        id: `value${x.steps[i].fields.length + 1}`,
        label: { en: '' },
      })
    );
    card.append(fs);
  }
  if (s.type === 'predict') {
    card.append(
      pair(`${base}.prompt`, t('composer.step.prompt'), { multiline: true })
    );
    card.append(...choiceOptions(base, s));
    card.append(
      pair(`${base}.because`, t('composer.step.because'), { multiline: true })
    );
    const later = d.steps
      .slice(i + 1)
      .map((x, k) => [x.sid, `${i + k + 2}. ${x.sid}`]);
    card.append(
      field(
        idOf(`${base}.reveal`),
        t('composer.step.reveal'),
        select([['', t('composer.reveal.choose')], ...later], s.reveal, v =>
          commit(x => (x.steps[i].reveal = v || undefined))
        )
      )
    );
  }
  if (s.type === 'question') {
    const bankIds = (d.bank?.items || []).map(item => item.id);
    const value = s.from !== undefined ? `bank:${s.from}` : `inline:${s.kind}`;
    card.append(
      field(
        idOf(`${base}.from`),
        t('composer.question.source'),
        select(
          [
            ['inline:choice', t('composer.source.choice')],
            ['inline:numeric', t('composer.source.numeric')],
            ['inline:short', t('composer.source.short')],
            ...bankIds.map(b => [
              `bank:${b}`,
              t('composer.source.bank', { id: b }),
            ]),
          ],
          value,
          v => commit(x => switchQuestion(x, i, v))
        )
      )
    );
    if (s.from === undefined) card.append(...questionParts(base, s));
  }

  card.append(
    pair(`${base}.tip`, t('composer.step.tip'), {
      multiline: true,
      required: false,
    })
  );

  // Where it starts, and what it docks.
  const scenarios = Object.keys(SCENARIO_INFO).map(n => [n, scenarioTitle(n)]);
  const setup = s.setup;
  const setupGrid = el(
    'div',
    { className: 'ui-grid' },
    field(
      idOf(`${base}.setup.scenario`),
      t('composer.step.setup'),
      select(
        [['', t('composer.setup.keep')], ...scenarios],
        setup?.scenario,
        v =>
          commit(x =>
            v
              ? (x.steps[i].setup = {
                  ...(x.steps[i].setup || {}),
                  scenario: v,
                })
              : delete x.steps[i].setup
          )
      )
    )
  );
  if (setup) {
    const paused = el('input', {
      type: 'checkbox',
      id: idOf(`${base}.setup.paused`),
    });
    paused.checked = setup.paused === true;
    paused.addEventListener('change', () =>
      commit(x =>
        setAt(x, `${base}.setup.paused`, paused.checked ? true : undefined)
      )
    );
    setupGrid.append(
      field(
        idOf(`${base}.setup.seed`),
        t('composer.setup.seed'),
        textInput(setup.seed, v =>
          commit(x => setAt(x, `${base}.setup.seed`, v.trim() || undefined))
        ),
        t('composer.hint.setupSeed')
      ),
      field(
        idOf(`${base}.setup.zoom`),
        t('composer.setup.zoom'),
        textInput(
          setup.zoom,
          v => commit(x => setAt(x, `${base}.setup.zoom`, numberOf(v))),
          { numeric: true }
        )
      ),
      el(
        'label',
        { className: 'ui-choice' },
        paused,
        t('composer.setup.paused')
      )
    );
  }
  const families = Object.entries(WIDGET_FAMILIES).map(([family, ids]) => ({
    group: family,
    options: ids.map(w => [w, w]),
  }));
  setupGrid.append(
    field(
      idOf(`${base}.tool.id`),
      t('composer.step.tool'),
      select([['', t('composer.tool.none')], ...families], s.tool?.id, v =>
        commit(x =>
          v ? (x.steps[i].tool = { id: v }) : delete x.steps[i].tool
        )
      )
    )
  );
  card.append(setupGrid);

  if (i > 0) {
    const options = [['', t('composer.when.everyone')]];
    d.steps.slice(0, i).forEach((x, k) => {
      // A held prediction only once it is marked (whenHeld).
      const markedAt = d.steps.findIndex(y => x.reveal && y.sid === x.reveal);
      if (!gradedStep(x) || markedAt > i) return;
      options.push(
        [`incorrect:${x.sid}`, t('composer.when.incorrect', { n: k + 1 })],
        [`correct:${x.sid}`, t('composer.when.correct', { n: k + 1 })]
      );
    });
    card.append(
      field(
        idOf(`${base}.when`),
        t('composer.step.when'),
        select(options, s.when ? `${s.when.is}:${s.when.sid}` : '', v =>
          commit(x => {
            if (!v) delete x.steps[i].when;
            else {
              const [is, ...sid] = v.split(':');
              x.steps[i].when = { sid: sid.join(':'), is };
            }
          })
        ),
        t('composer.hint.when')
      )
    );
  }

  const n = i + 1;
  card.append(
    el(
      'div',
      { className: 'ui-toolbar' },
      button(
        t('composer.step.up', { n }),
        () => commit(x => x.steps.splice(i - 1, 0, x.steps.splice(i, 1)[0])),
        { disabled: i === 0 }
      ),
      button(
        t('composer.step.down', { n }),
        () => commit(x => x.steps.splice(i + 1, 0, x.steps.splice(i, 1)[0])),
        { disabled: i === d.steps.length - 1 }
      ),
      button(t('composer.step.duplicate', { n }), () =>
        commit(x => {
          const copy = clone(x.steps[i]);
          copy.sid = freshSid(x, copy.sid);
          openCards.add(`step:${copy.sid}`);
          x.steps.splice(i + 1, 0, copy);
        })
      ),
      button(
        t('composer.step.remove', { n }),
        () => commit(x => x.steps.splice(i, 1)),
        { disabled: d.steps.length <= 2 }
      )
    )
  );
  return card;
}

function stepsSection(d) {
  const section = el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'cp-steps-h' },
    el('h2', { id: 'cp-steps-h' }, t('composer.section.steps')),
    el('p', {
      id: `${idOf('steps')}-error`,
      className: 'ui-error',
      hidden: true,
    })
  );
  const every = open => () => {
    for (const s of doc().steps) {
      if (open) openCards.add(`step:${s.sid}`);
      else openCards.delete(`step:${s.sid}`);
    }
    render();
  };
  section.append(
    el(
      'div',
      { className: 'ui-toolbar' },
      button(t('composer.steps.openAll'), every(true), { id: 'cp-steps-open' }),
      button(t('composer.steps.closeAll'), every(false), {
        id: 'cp-steps-close',
      })
    )
  );
  d.steps.forEach((s, i) => section.append(stepCard(s, i, d)));
  const kind = select(
    STEP_TYPES.map(type => [type, typeName(type)]),
    'read',
    () => {}
  );
  section.append(
    el(
      'div',
      { className: 'ui-toolbar' },
      field('cp-add-type', t('composer.step.addType'), kind),
      button(
        t('composer.step.add'),
        () =>
          commit(x => {
            // Before the closing step, which stays last.
            const added = newStep(x, kind.value);
            openCards.add(`step:${added.sid}`);
            x.steps.splice(Math.max(x.steps.length - 1, 0), 0, added);
          }),
        { id: 'cp-add-step' }
      )
    )
  );
  return section;
}

// --- Bank -------------------------------------------------------------------

function newItem(x, kind) {
  const taken = new Set((x.bank?.items || []).map(i => i.id));
  let n = 1;
  while (taken.has(`question-${n}`)) n++;
  const item = {
    id: `question-${n}`,
    version: 1,
    kind,
    prompt: { en: '' },
    scoring: { points: 1, attempts: 'first' },
    a11y: { textOnly: true },
  };
  if (kind === 'choice')
    Object.assign(item, {
      options: [{ en: '' }, { en: '' }],
      answer: 0,
      because: { en: '' },
    });
  if (kind === 'numeric')
    Object.assign(item, { answer: 1, tolerance: 0.1, because: { en: '' } });
  if (kind === 'short') item.rubric = { en: '' };
  return item;
}

function variantFields(base, item) {
  const out = [];
  const mode =
    item.variants?.relation !== undefined
      ? 'relation'
      : item.variants?.shuffle
        ? 'shuffle'
        : 'none';
  const modes = [['none', t('composer.variants.none')]];
  if (item.kind === 'choice')
    modes.push(['shuffle', t('composer.variants.shuffle')]);
  if (item.kind === 'numeric')
    modes.push(['relation', t('composer.variants.relation')]);
  if (item.kind === 'short') return out;
  out.push(
    field(
      idOf(`${base}.variants`),
      t('composer.item.variants'),
      select(modes, mode, v =>
        commit(x => {
          const it = getAt(x, base);
          if (v === 'none') delete it.variants;
          if (v === 'shuffle') it.variants = { shuffle: true };
          if (v === 'relation') {
            const r = RELATION_IDS[0];
            delete it.answer;
            delete it.tolerance;
            it.unit = RELATIONS[r].output.unit || undefined;
            it.variants = {
              relation: r,
              values: [defaultValues(r)],
              tolerancePct: 5,
            };
          }
          if (
            v !== 'relation' &&
            it.kind === 'numeric' &&
            it.answer === undefined
          )
            Object.assign(it, { answer: 1, tolerance: 0.1 });
        })
      )
    )
  );
  if (mode !== 'relation') return out;
  const v = item.variants;
  const r = RELATIONS[v.relation];
  out.push(
    field(
      idOf(`${base}.variants.relation`),
      t('composer.item.relation'),
      select(
        RELATION_IDS.map(id => [id, t(`composer.relation.${id}`)]),
        v.relation,
        next =>
          commit(x => {
            const it = getAt(x, base);
            it.variants = {
              relation: next,
              values: [defaultValues(next)],
              tolerancePct: it.variants.tolerancePct,
            };
            if (RELATIONS[next].output.unit)
              it.unit = RELATIONS[next].output.unit;
            else delete it.unit;
          })
      ),
      t('composer.hint.relation')
    ),
    field(
      idOf(`${base}.variants.tolerancePct`),
      t('composer.item.tolerancePct'),
      textInput(
        v.tolerancePct,
        val =>
          commit(x => setAt(x, `${base}.variants.tolerancePct`, numberOf(val))),
        { numeric: true }
      )
    )
  );
  if (!r) return out;
  const values = el(
    'fieldset',
    { id: idOf(`${base}.variants.values`) },
    el('legend', {}, t('composer.item.variants'))
  );
  (v.values || []).forEach((set, k) => {
    const at = `${base}.variants.values[${k}]`;
    const got = evaluateRelation(v.relation, set);
    const row = el('div', { className: 'ui-grid' });
    for (const [name, spec] of Object.entries(r.inputs)) {
      row.append(
        field(
          idOf(`${at}.${name}`),
          `${t('composer.item.values', { n: k + 1 })}: ${name} (${spec.unit})`,
          textInput(
            set[name],
            val => commit(x => setAt(x, `${at}.${name}`, numberOf(val))),
            { numeric: true }
          )
        )
      );
    }
    values.append(row);
    if (got.ok)
      values.append(
        el(
          'p',
          { className: 'ui-hint' },
          t('composer.values.answer', {
            answer: got.answer,
            unit: r.output.unit,
          })
        )
      );
    if (v.values.length > 1)
      values.append(
        button(t('composer.values.remove', { n: k + 1 }), () =>
          commit(x => getAt(x, `${base}.variants.values`).splice(k, 1))
        )
      );
  });
  values.append(
    el('p', {
      id: `${idOf(`${base}.variants.values`)}-error`,
      className: 'ui-error',
      hidden: true,
    })
  );
  values.append(
    button(t('composer.values.add'), () =>
      commit(x =>
        getAt(x, `${base}.variants.values`).push(defaultValues(v.relation))
      )
    )
  );
  out.push(values);
  return out;
}

const defaultValues = id =>
  Object.fromEntries(
    Object.entries(RELATIONS[id].inputs).map(([k, spec]) => [
      k,
      Math.max(1, spec.min),
    ])
  );

function bankSection(d) {
  const items = d.bank?.items || [];
  const section = el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'cp-bank-h' },
    el('h2', { id: 'cp-bank-h' }, t('composer.section.bank')),
    el('p', { className: 'ui-hint' }, t('composer.hint.bank'))
  );
  items.forEach((item, i) => {
    const base = `bank.items[${i}]`;
    section.append(
      card(d, base, t('composer.item.legend', { id: item.id }), node =>
        fillItem(node, item, i, base)
      )
    );
  });
  return finishBank(section);
}

function fillItem(card, item, i, base) {
  const textOnly = el('input', {
    type: 'checkbox',
    id: idOf(`${base}.a11y.textOnly`),
  });
  textOnly.checked = item.a11y?.textOnly === true;
  textOnly.addEventListener('change', () =>
    commit(x => setAt(x, `${base}.a11y.textOnly`, textOnly.checked))
  );
  card.append(
    el(
      'div',
      { className: 'ui-grid' },
      field(
        idOf(`${base}.id`),
        t('composer.item.id'),
        textInput(item.id, v =>
          commit(x => {
            const old = x.bank.items[i].id;
            x.bank.items[i].id = v.trim();
            for (const s of x.steps) if (s.from === old) s.from = v.trim();
          })
        )
      ),
      field(
        idOf(`${base}.version`),
        t('composer.item.version'),
        textInput(
          item.version,
          v => commit(x => (x.bank.items[i].version = numberOf(v))),
          { numeric: true }
        ),
        t('composer.hint.itemVersion')
      ),
      field(
        idOf(`${base}.kind`),
        t('composer.item.kind'),
        select(
          ITEM_KINDS.map(k => [k, t(`composer.kind.${k}`)]),
          item.kind,
          v =>
            commit(x => {
              const fresh = newItem({ bank: { items: [] } }, v);
              x.bank.items[i] = {
                ...fresh,
                id: item.id,
                version: item.version,
                prompt: item.prompt,
                scoring: item.scoring,
                a11y: item.a11y,
              };
            })
        )
      )
    ),
    ...variantFields(base, item),
    ...questionParts(base, item, { bankItem: true }),
    el(
      'label',
      { className: 'ui-choice' },
      textOnly,
      t('composer.a11y.textOnly')
    ),
    pair(`${base}.a11y.note`, t('composer.a11y.note'), {
      multiline: true,
      required: item.a11y?.textOnly === false,
    }),
    el(
      'div',
      { className: 'ui-toolbar' },
      button(t('composer.item.duplicate', { id: item.id }), () =>
        commit(x => {
          const copy = clone(x.bank.items[i]);
          copy.id = newItem(x, copy.kind).id;
          openCards.add(`item:${copy.id}`);
          x.bank.items.splice(i + 1, 0, copy);
        })
      ),
      button(t('composer.item.remove', { id: item.id }), () =>
        commit(x => {
          x.bank.items.splice(i, 1);
          if (!x.bank.items.length) delete x.bank;
        })
      )
    )
  );
}

function finishBank(section) {
  const kind = select(
    ITEM_KINDS.map(k => [k, t(`composer.kind.${k}`)]),
    'numeric',
    () => {}
  );
  section.append(
    el(
      'div',
      { className: 'ui-toolbar' },
      field('cp-add-kind', t('composer.item.kind'), kind),
      button(
        t('composer.item.add'),
        () =>
          commit(x => {
            const added = newItem(x, kind.value);
            openCards.add(`item:${added.id}`);
            (x.bank ||= { items: [] }).items.push(added);
          }),
        { id: 'cp-add-item' }
      )
    )
  );
  return section;
}

// --- Checks and everything on the side ----------------------------------------

/** A complaint in the reader's language: the composer's words, then the Studio's. */
function describe(e) {
  for (const id of [`composer.error.${e.code}`, `studio.error.${e.code}`])
    if (hasMessage(id)) return t(id, e.vars);
  return e.message;
}

/** The control a validator path is about, or the nearest one around it. */
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

/** The document the last check was asked for, so a redraw alone is not re-checked. */
let checkedFor = null;

function scheduleCheck() {
  const text = serialize(doc());
  if (text === checkedFor) return;
  checkedFor = text;
  clearTimeout(checkTimer);
  const seq = ++checkSeq;
  $('cp-checks-summary').textContent = t('composer.checks.running');
  checkTimer = setTimeout(async () => {
    let r;
    try {
      r = await checkInvestigationPack(doc());
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
        compiled: null,
      };
    }
    if (seq !== checkSeq) return;
    verdict = r;
    renderVerdict();
  }, 120);
}

const blocking = r =>
  r.errors.length > 0 || r.findings.some(f => f.level === 'error');

/** Take down what the last verdict put on the fields, before showing the next. */
function clearFieldErrors() {
  for (const node of $('cp-editor').querySelectorAll('[aria-invalid="true"]')) {
    node.removeAttribute('aria-invalid');
    if (node.dataset.described)
      node.setAttribute('aria-describedby', node.dataset.described);
    else node.removeAttribute('aria-describedby');
  }
  for (const note of $('cp-editor').querySelectorAll('.ui-error')) {
    note.textContent = '';
    note.hidden = true;
  }
}

function renderVerdict() {
  const r = verdict;
  const d = doc();
  clearFieldErrors();
  const list = $('cp-checks');
  list.textContent = '';
  for (const e of r.errors) {
    const node = controlFor(e.path);
    const text = describe(e);
    showOnField(node, text);
    const where = labelOf(node);
    list.append(
      el(
        'li',
        { 'data-level': 'error' },
        el(
          'button',
          {
            type: 'button',
            className: 'ui-link',
            onclick: () => reveal(e.path),
          },
          where ? `${where}: ${text}` : text
        )
      )
    );
  }
  for (const f of r.findings) {
    const node =
      f.step === null || f.step === undefined
        ? null
        : $(idOf(`steps[${f.step}]`));
    const text =
      f.step === null || f.step === undefined
        ? t('composer.checks.lesson', { message: f.message })
        : t('composer.checks.rule', { n: f.step + 1, message: f.message });
    if (node && f.level === 'error') showOnField(node, f.message);
    list.append(
      el(
        'li',
        { 'data-level': f.level },
        el(
          'button',
          {
            type: 'button',
            className: 'ui-link',
            onclick: () =>
              reveal(
                f.step === null || f.step === undefined
                  ? ''
                  : `steps[${f.step}]`
              ),
          },
          text
        )
      )
    );
  }
  if (!list.children.length) list.append(el('li', {}, t('studio.checks.none')));
  const count =
    r.errors.length + r.findings.filter(f => f.level === 'error').length;
  $('cp-checks-summary').textContent = r.errors.length
    ? `${t('composer.checks.count', { count })} ${t('composer.checks.format')}`
    : count
      ? t('composer.checks.count', { count })
      : t('composer.checks.valid');
  const ok = !blocking(r);
  for (const id of ['cp-save', 'cp-export', 'cp-preview-go', 'cp-report-go'])
    $(id).disabled = !ok;
  $('cp-export-es').disabled = !(ok && r.compiled?.shadow);
  $('cp-save-bank').disabled = !(
    d.bank?.items?.length && !r.errors.some(e => e.path.startsWith('bank'))
  );
  $('cp-preview-author').hidden = !ok;
  if (ok) $('cp-preview-author').href = previewUrl(d, 'author');
  renderEstimate(r, d);
  renderKey(r);
}

function renderEstimate(r, d) {
  const list = $('cp-estimate');
  list.textContent = '';
  if (!r.compiled) return;
  const e = estimate(r.compiled.lesson);
  const points = Object.values(r.compiled.scoring).reduce(
    (a, s) => a + (s.points || 0),
    0
  );
  list.append(
    el(
      'li',
      {},
      t('composer.estimate.minutes', { minutes: e.minutes, words: e.words })
    )
  );
  const outside = outsideDuration(e.minutes, d.duration);
  list.append(
    el(
      'li',
      { 'data-level': outside ? 'warn' : undefined },
      t(outside ? 'composer.estimate.outside' : 'composer.estimate.card', {
        duration: d.duration,
      })
    )
  );
  const parts = Object.entries(e.steps).map(([k, n]) => {
    const [type, kind] = k.split(':');
    return `${n} × ${kind ? t(`composer.kind.${kind}`) : typeName(type)}`;
  });
  list.append(
    el(
      'li',
      {},
      t('composer.estimate.steps', {
        count: r.compiled.lesson.steps.length,
        list: parts.join(', '),
      })
    )
  );
  list.append(
    el('li', {}, t('composer.estimate.graded', { count: e.graded, points }))
  );
}

function renderTranslation(d) {
  const texts = collectTexts(d);
  const count = s => texts.filter(x => x.status === s).length;
  const [done, missing, stale] = ['done', 'missing', 'stale'].map(count);
  $('cp-translation-summary').textContent =
    missing + stale
      ? t('composer.translation.summary', {
          done,
          total: texts.length,
          missing,
          stale,
        })
      : t('composer.translation.complete');
  const list = $('cp-translation');
  list.textContent = '';
  for (const x of texts.filter(x => x.status !== 'done').slice(0, 40)) {
    const node = controlFor(`${x.path}.en`);
    const where =
      node?.tagName === 'DETAILS'
        ? `${labelOf(node)} (${x.path.replace(/^.*?\]\.?/, '')})`
        : labelOf(node) || x.path;
    list.append(
      el(
        'li',
        { 'data-level': x.status === 'stale' ? 'error' : 'warn' },
        el(
          'button',
          {
            type: 'button',
            className: 'ui-link',
            onclick: () => reveal(`${x.path}.es`),
          },
          t('composer.translation.item', {
            where,
            state: t(`composer.state.${x.status}`),
          })
        )
      )
    );
  }
}

function renderKey(r) {
  const host = $('cp-key');
  host.textContent = '';
  if (!r.compiled) return;
  const { lesson, scoring, variants } = r.compiled;
  const rows = [];
  lesson.steps.forEach((s, i) => {
    if (s.type !== 'predict' && s.type !== 'question') return;
    let answer = '';
    if (s.type === 'predict') {
      const at = lesson.steps.findIndex(x => x.sid === s.reveal);
      answer = `${s.options[s.answer] ?? ''} (${t('composer.key.prediction', { n: at + 1 })})`;
    } else if (s.kind === 'choice') answer = s.options[s.answer] ?? '';
    else if (s.kind === 'numeric')
      answer = `${s.answer} ± ${s.tolerance} ${s.unit ?? ''}`.trim();
    else answer = t('composer.key.rubric', { rubric: s.rubric });
    const v = variants[s.sid];
    const note = v
      ? v.order
        ? t('composer.key.shuffled')
        : t('composer.key.variant', { index: v.index + 1, count: v.count })
      : '';
    rows.push(
      el(
        'tr',
        {},
        el('td', {}, `${i + 1}. ${s.title}`),
        el('td', {}, answer, note ? el('br') : null, note),
        el(
          'td',
          {},
          scoring[s.sid]
            ? `${scoring[s.sid].points} (${t(`composer.attempts.${scoring[s.sid].attempts}`)})`
            : '-'
        )
      )
    );
  });
  if (!rows.length)
    return host.append(
      el('p', { className: 'ui-hint' }, t('composer.key.none'))
    );
  host.append(
    el(
      'table',
      { className: 'ui-table' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', { scope: 'col' }, t('composer.key.step')),
          el('th', { scope: 'col' }, t('composer.key.answer')),
          el('th', { scope: 'col' }, t('composer.key.points'))
        )
      ),
      el('tbody', {}, rows)
    )
  );
}

function renderDiff(d) {
  const list = $('cp-diff');
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
  $('cp-diff-summary').textContent = changes.length
    ? t('studio.diff.count', { count: changes.length })
    : t('studio.diff.none');
}

function setStatus(message) {
  $('cp-status').textContent = message;
}

function render() {
  if (!history) return;
  const d = doc();
  const focused = document.activeElement?.id;
  const host = $('cp-editor');
  host.textContent = '';
  host.append(aboutSection(d), stepsSection(d), bankSection(d));
  $('cp-undo').disabled = !history.canUndo();
  $('cp-redo').disabled = !history.canRedo();
  $('st-raw-text').value = serialize(d);
  $('cp-raw-error').hidden = true;
  $('cp-storage').hidden = !storageFailed;
  renderDrafts();
  renderTranslation(d);
  renderDiff(d);
  if (verdict) renderVerdict();
  scheduleCheck();
  if (focused && $(focused)) $(focused).focus();
}

function renderDrafts() {
  const s = $('cp-drafts');
  s.textContent = '';
  for (const draft of drafts.list()) {
    const title = draft.title?.[getLocale()] || draft.title?.en || draft.id;
    s.append(el('option', { value: draft.id }, `${title} (${draft.id})`));
  }
  s.value = doc().id;
}

// --- Preview, answer key and report ----------------------------------------

const previewUrl = (d, view) =>
  `${location.origin}/?author=draft-${d.id}${view === 'student' ? '&view=student' : ''}`;

/** Leave the compiled draft where the engine's preview looks for it. */
function stagePreview() {
  const c = verdict?.compiled;
  if (!c) return false;
  const lesson = { ...c.lesson, id: `draft-${c.lesson.id}` };
  try {
    window.localStorage.setItem(
      PREVIEW_KEY,
      JSON.stringify({ lesson, shadow: c.shadow })
    );
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
  $('cp-preview').src = previewUrl(doc(), 'student');
  setStatus(t('composer.status.previewed'));
}

/** A lab report as a student would hand it in, with every answer the key's. */
async function sampleReport() {
  const c = verdict?.compiled;
  if (!c || blocking(verdict)) return setStatus(t('studio.status.fixFirst'));
  try {
    const [
      { buildLabReport, reportMessages },
      { checkAnswer },
      { decodeEntities },
      { stepKey },
    ] = await Promise.all([
      import('./labReport.js'),
      import('./answerCheck.js'),
      import('./lessonMarkup.js'),
      import('./investigations/progressSchema.js'),
    ]);
    await reportMessages();
    const lesson = c.lesson;
    const responses = {};
    for (const s of lesson.steps) {
      const key = stepKey(lesson.id, s.sid);
      if (s.type === 'predict' || s.kind === 'choice')
        responses[key] = String(s.answer);
      else if (s.kind === 'numeric') responses[key] = String(s.answer);
      else if (s.kind === 'short') responses[key] = s.because || s.rubric || '';
      if (s.type === 'explore')
        s.checklist.forEach((_, j) => (responses[`${key}:check:${j}`] = true));
      if (s.type === 'measure')
        for (const f of s.fields) responses[`${key}:${f.id}`] = '1';
    }
    const bytes = buildLabReport({
      investigation: lesson,
      plot: null,
      name: t('composer.report.heading'),
      submissionToken: '',
      responses,
      attempts: {},
      visited: new Set(lesson.steps.map(s => s.sid)),
      startedAt: new Date().toISOString(),
      links: [],
      stepIdFor: index => stepKey(lesson.id, lesson.steps[index]?.sid),
      assignment: null,
      binding: null,
      checkAnswer: (step, value) => checkAnswer(step, value, { locale: 'en' }),
      decodeEntities,
      t,
      locale: getLocale(),
    });
    if (reportUrl) URL.revokeObjectURL(reportUrl);
    reportUrl = URL.createObjectURL(
      new Blob([bytes], { type: 'application/pdf' })
    );
    $('cp-report-open').href = reportUrl;
    $('cp-report-open').hidden = false;
    setStatus(t('composer.report.made'));
  } catch (err) {
    setStatus(
      t('composer.report.failed', { error: String(err?.message || err) })
    );
  }
}

// --- Files ------------------------------------------------------------------

function blankInvestigation(seed) {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id: 'my-investigation',
    version: '1.0.0',
    locales: ['en', 'es'],
    title: { en: '' },
    subtitle: { en: '' },
    summary: { en: '' },
    level: {
      en: 'Introductory astronomy',
      es: 'Astronomía introductoria',
      esOf: digest('Introductory astronomy'),
    },
    duration: '15-20 min',
    objectives: [{ en: '' }],
    seed,
    steps: [
      {
        sid: 'start',
        type: 'read',
        title: { en: '' },
        body: { en: '' },
        setup: { scenario: 'Solar System' },
      },
      { sid: 'close', type: 'read', title: { en: '' }, body: { en: '' } },
    ],
  };
}

function start(pack, message) {
  history.reset(pack);
  baseline = clone(pack);
  saveDraft(pack);
  verdict = null;
  checkedFor = null;
  render();
  if (message) setStatus(message);
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
  downloadText(`${d.id}.investigation.json`, serialize(d));
  baseline = d;
  render();
  setStatus(t('composer.status.saved', { file: `${d.id}.investigation.json` }));
}

function saveBank() {
  const d = doc();
  const bank = {
    format: BANK_FORMAT,
    formatVersion: BANK_FORMAT_VERSION,
    id: `${d.id}-bank`,
    version: d.version,
    locales: d.locales,
    title: d.title,
    items: d.bank?.items || [],
  };
  downloadText(`${d.id}.bank.json`, serialize(bank));
  setStatus(t('composer.status.bankSaved', { file: `${d.id}.bank.json` }));
}

/** What a maintainer adds to js/data/investigations/ (and es/), one file a click. */
function exportModule(which) {
  const c = verdict?.compiled;
  if (!c || blocking(verdict)) return setStatus(t('studio.status.fixFirst'));
  const id = c.lesson.id;
  const header = [
    `// ${id}${which === 'es' ? ' - es' : ''}: exported by the Investigation Composer (/studio/lesson/)`,
    `// from ${id}.investigation.json, version ${doc().version}, variant seed ${doc().seed}.`,
    '// Run `npx prettier --write` over it, then `npm run author:strict`.',
    '',
  ].join('\n');
  if (which === 'es') {
    if (!c.shadow) return;
    downloadText(
      `${id}.es.js`,
      lessonModule(c.shadow, { header }),
      'text/javascript'
    );
    return setStatus(
      t('composer.status.exportedEs', { file: `${id}.es.js`, id })
    );
  }
  downloadText(
    `${id}.js`,
    lessonModule(c.lesson, { header }),
    'text/javascript'
  );
  setStatus(t('composer.status.exported', { file: `${id}.js` }));
}

async function openFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return setStatus(t('studio.file.unreadable'));
  }
  if (data?.format === BANK_FORMAT) return mergeBank(data);
  const r = migrateInvestigationPack(data);
  if (!r.ok)
    return setStatus(
      r.code === 'newer'
        ? t('studio.file.newer', r.vars)
        : t('composer.file.notPack')
    );
  const existing = drafts.load(r.pack.id);
  if (existing && serialize(existing.doc) !== serialize(r.pack))
    return askConflict(existing.doc, r.pack);
  start(r.pack, t('studio.file.opened', { id: r.pack.id }));
}

/** A bank file's items, into this investigation's bank: new ones added, clashes refused. */
function mergeBank(bank) {
  const problems = validateQuestionBankWith(bank, packApi(), makeChecker);
  if (problems.length) {
    const first = problems[0];
    return setStatus(
      `${t('composer.file.notPack')} (${first.path || '-'}: ${describe(first)})`
    );
  }
  const d = doc();
  const have = new Map((d.bank?.items || []).map(i => [i.id, i]));
  const clash = bank.items
    .filter(i => have.has(i.id) && serialize(have.get(i.id)) !== serialize(i))
    .map(i => i.id);
  if (clash.length)
    return setStatus(t('composer.status.bankClash', { ids: clash.join(', ') }));
  const fresh = bank.items.filter(i => !have.has(i.id));
  commit(x =>
    (x.bank ||= { items: [] }).items.push(...fresh.map(i => clone(i)))
  );
  setStatus(t('composer.status.bankMerged', { count: fresh.length }));
}

function askConflict(mine, theirs) {
  const dialog = $('cp-conflict');
  $('cp-conflict-text').textContent = t('studio.conflict.text', {
    id: theirs.id,
  });
  const list = $('cp-conflict-diff');
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
  $('cp-conflict-replace').onclick = () => choose('replace');
  $('cp-conflict-both').onclick = () => choose('both');
  $('cp-conflict-cancel').onclick = () => choose('cancel');
  dialog.showModal();
}

function applyRaw() {
  const note = $('cp-raw-error');
  let data;
  try {
    data = JSON.parse($('st-raw-text').value);
  } catch (err) {
    note.textContent = t('studio.raw.notJson', { error: err.message });
    note.hidden = false;
    $('st-raw-text').focus();
    return;
  }
  const r = migrateInvestigationPack(data);
  if (!r.ok) {
    note.textContent =
      r.code === 'newer'
        ? t('studio.file.newer', r.vars)
        : t('composer.file.notPack');
    note.hidden = false;
    return;
  }
  commit(x => {
    for (const k of Object.keys(x)) delete x[k];
    Object.assign(x, r.pack);
  });
  setStatus(t('studio.raw.applied'));
}

// --- Start-up ---------------------------------------------------------------

function wire() {
  $('cp-new').addEventListener('click', () =>
    start(blankInvestigation(randomSeed()), t('composer.status.new'))
  );
  $('cp-open').addEventListener('click', () => $('cp-file').click());
  $('cp-file').addEventListener('change', () => {
    const file = $('cp-file').files?.[0];
    $('cp-file').value = '';
    if (file) openFile(file);
  });
  $('cp-save').addEventListener('click', savePack);
  $('cp-save-bank').addEventListener('click', saveBank);
  $('cp-export').addEventListener('click', () => exportModule('en'));
  $('cp-export-es').addEventListener('click', () => exportModule('es'));
  $('cp-preview-go').addEventListener('click', preview);
  $('cp-preview-author').addEventListener('click', () => stagePreview());
  $('cp-report-go').addEventListener('click', sampleReport);
  $('cp-undo').addEventListener('click', () => {
    const d = history.undo();
    if (d) (saveDraft(d), render(), setStatus(t('studio.status.undone')));
  });
  $('cp-redo').addEventListener('click', () => {
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
    if (key === 'z' && !event.shiftKey) $('cp-undo').click();
    else if ((key === 'z' && event.shiftKey) || key === 'y')
      $('cp-redo').click();
    else return;
    event.preventDefault();
  });
  $('cp-drafts-open').addEventListener('click', () => {
    const d = drafts.load($('cp-drafts').value);
    if (d) start(d.doc, t('studio.status.draftOpened', { id: d.doc.id }));
  });
  $('cp-drafts-delete').addEventListener('click', () => {
    const id = $('cp-drafts').value;
    if (id === doc().id) return setStatus(t('studio.status.draftInUse'));
    drafts.remove(id);
    renderDrafts();
    setStatus(t('studio.status.draftDeleted', { id }));
  });
  $('cp-raw-apply').addEventListener('click', applyRaw);
  $('cp-raw-revert').addEventListener('click', () => render());
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
  await useLanguage(preferredLocale());
  wire();
  const last = drafts.last();
  const draft = last ? drafts.load(last) : null;
  // A first visit opens the example, which shows every part of the format;
  // New starts from nothing.
  history = createHistory(draft?.doc ?? clone(EXAMPLE_INVESTIGATION));
  baseline = history.current();
  render();
  setStatus(
    draft
      ? t('studio.status.restored', { id: draft.doc.id })
      : t('composer.status.example')
  );
  document.body.dataset.ready = 'true';
}

init();
