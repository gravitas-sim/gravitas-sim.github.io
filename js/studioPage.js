// =============================================================================
// The Scenario Studio (/studio/)
// -----------------------------------------------------------------------------
// A page for making a scenario as data: its settings, its bodies, the seed
// that makes it the same world every time, the instruments it opens with, and
// its title and summary in English and Spanish. What it makes is a
// gravitas.scenario-pack/1 file (js/platform/scenario.js), which the SDK
// validates, tests and archives, and a link the application opens.
//
// It edits a document, never the repository and never code. Every committed
// edit is a snapshot in an undo history and is saved to this browser as a
// draft; the checks are the pack validator's, shown on the field each is
// about; the preview is the application itself, embedded, opening the pack's
// link. js/studio/model.js holds the history, the drafts and the differences,
// js/scenarioPack.js the arithmetic, and this file the page.
//
// Bodies come in the two forms the application already has. An orbital
// system is entered as the Orbital System Builder takes it - elements, not
// vectors (ORBITAL_SYSTEM_BUILDER.md) - and typed bodies as precise placement
// takes them, a position, a velocity and a mass. Units are written on every
// field, and nothing is converted behind the author's back: what is typed is
// what the file holds.
// =============================================================================

import {
  t,
  setLocale,
  getLocale,
  preferredLocale,
  registerMessages,
  hasMessage,
} from './i18n/index.js';
import { EN } from './i18n/en.js';
import { EN_STUDIO } from './i18n/en.studio.js';
import { EN_BUILDER } from './i18n/en.builder.js';
import { EN_PLACEMENT } from './i18n/en.placement.js';
import { DEFAULT_SETTINGS } from './appState.js';
import { INTEGRATORS } from './physics.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { TAG_ORDER } from './data/scenarioTags.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';
import { encodePayload, parseDocument } from './shareState.js';
import { randomSeed } from './rng.js';
import {
  SETTING_RULES,
  STARTING_PANELS,
  STARTING_TOOLS,
  POPULATION_COUNTS,
  migrateScenarioPack,
} from './platform/scenario.js';
import {
  checkPack,
  compileScenarioPack,
  blankPack,
  settingsFromScenario,
  packFromOrbitalSystem,
  packBodies,
  packCautions,
  GENERATED_SCENARIOS,
  BUILDER_TYPES,
  SYSTEM_TYPES,
} from './scenarioPack.js';
import { TYPE_NAME_KEY, SYSTEM_FORMAT } from './systemSpec.js';
import {
  createHistory,
  createDrafts,
  semanticDiff,
  serialize,
} from './studio/model.js';
import { drop, put } from './storage/local.js';

const $ = id => document.getElementById(id);
const LOCAL = { en: [EN_STUDIO, EN_BUILDER, EN_PLACEMENT] };
const LOADERS = {
  es: () =>
    Promise.all([
      import('./i18n/es.studio.js').then(m => m.ES_STUDIO),
      import('./i18n/es.builder.js').then(m => m.ES_BUILDER),
      import('./i18n/es.placement.js').then(m => m.ES_PLACEMENT),
    ]),
};

/** Each rail instrument's label, from the application's own catalog. */
const RAIL_LABEL = {
  lightCurve: 'rail.toggleLightCurve',
  radialVelocity: 'rail.toggleRadialVelocity',
  rotationCurve: 'rail.toggleRotationCurve',
  astrometry: 'rail.toggleAstrometry',
  pauseAtEvent: 'rail.togglePauseAtEvent',
  view3d: 'rail.toggle3DView',
  ruler: 'rail.toggleRuler',
  protractor: 'rail.toggleProtractor',
  stopwatch: 'rail.toggleStopwatch',
};

/** The two languages the page is written in. */
const LANGUAGES = [
  { id: 'en', endonym: 'English' },
  { id: 'es', endonym: 'Español' },
];

let history = null;
let drafts = null;
/** The document as it was last opened, started or saved: what "changes" means. */
let baseline = null;
/** Where the scenario started, when it was a built-in: its name. */
let startedFrom = null;
let storageFailed = false;

const doc = () => history.current();

// --- Language -------------------------------------------------------------

async function useLanguage(id) {
  if (!LOCAL[id] && LOADERS[id]) LOCAL[id] = await LOADERS[id]();
  for (const table of LOCAL[id] || []) registerMessages(id, table);
  await setLocale(id);
  translateStatic();
  render();
}

function translateStatic() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  }
  // The built-in scenarios, by their titles in this language; the choice
  // survives a change of language.
  const from = $('st-from');
  const chosen = from.value;
  const generated = el('optgroup', { label: t('studio.from.generated') });
  const handBuilt = el('optgroup', { label: t('studio.from.handBuilt') });
  for (const name of Object.keys(SCENARIO_INFO)) {
    (GENERATED_SCENARIOS.includes(name) ? generated : handBuilt).append(
      el('option', { value: name }, scenarioTitle(name))
    );
  }
  from.textContent = '';
  from.append(generated, handBuilt);
  if (chosen) from.value = chosen;
  const host = $('langSwitch');
  host.textContent = '';
  for (const { id, endonym } of LANGUAGES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-button';
    b.lang = id;
    b.textContent = endonym;
    b.setAttribute('aria-pressed', String(getLocale() === id));
    b.addEventListener('click', () => useLanguage(id));
    host.append(b);
  }
}

// --- Editing ----------------------------------------------------------------

/**
 * Apply an edit and commit it: one undo step, one saved draft.
 * @param {Function} edit - Mutates a copy of the document
 */
function commit(edit) {
  const d = doc();
  edit(d);
  if (history.commit(d)) saveDraft(d);
  render();
}

function saveDraft(d) {
  const r = drafts.save(d);
  storageFailed = !r.ok;
}

/** Set a value at a dotted path of the document, or remove it. */
function setAt(d, path, value) {
  const keys = path.split('.');
  let o = d;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  const last = keys.at(-1);
  if (value === undefined) delete o[last];
  else o[last] = value;
}

/** A number from a field, or undefined when it is empty or not a number. */
const numberOf = text => {
  const s = String(text).trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};

// --- Rendering ----------------------------------------------------------------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'className') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c !== null && c !== undefined) node.append(c);
  }
  return node;
}

/** A labelled field with a hint and a place for its error. */
function field(id, label, control, hint = '') {
  control.id = id;
  const described = [];
  const row = el(
    'div',
    { className: 'ui-field' },
    el('label', { for: id }, label),
    control
  );
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
    spellcheck: numeric ? 'false' : undefined,
    rows: multiline ? 3 : undefined,
  });
  input.value = value ?? '';
  input.addEventListener('change', () => onCommit(input.value));
  return input;
}

function select(options, value, onCommit) {
  const s = el('select', { className: 'ui-select' });
  for (const [v, label] of options) {
    const o = el('option', { value: v }, label);
    s.append(o);
  }
  s.value = value;
  s.addEventListener('change', () => onCommit(s.value));
  return s;
}

function aboutSection(d) {
  const text = (key, locale, multiline) =>
    field(
      `st-${key}-${locale}`,
      t(`studio.field.${key}`, { language: t(`studio.language.${locale}`) }),
      textInput(
        d[key]?.[locale],
        v => commit(x => setAt(x, `${key}.${locale}`, v)),
        { multiline }
      )
    );
  const tags = el(
    'fieldset',
    { id: 'st-tags', className: 'ui-choices' },
    el('legend', {}, t('studio.field.tags'))
  );
  for (const tag of TAG_ORDER) {
    const box = el('input', { type: 'checkbox', id: `st-tag-${tag}` });
    box.checked = (d.tags || []).includes(tag);
    box.addEventListener('change', () =>
      commit(x => {
        const set = new Set(x.tags || []);
        if (box.checked) set.add(tag);
        else set.delete(tag);
        x.tags = TAG_ORDER.filter(id => set.has(id));
      })
    );
    tags.append(
      el('label', { className: 'ui-choice' }, box, t(`tag.${tag}.label`))
    );
  }
  return el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'st-about-h' },
    el('h2', { id: 'st-about-h' }, t('studio.section.about')),
    el(
      'div',
      { className: 'ui-grid' },
      field(
        'st-id',
        t('studio.field.id'),
        textInput(d.id, v => commit(x => (x.id = v.trim()))),
        t('studio.hint.id')
      ),
      field(
        'st-version',
        t('studio.field.version'),
        textInput(d.version, v => commit(x => (x.version = v.trim())))
      )
    ),
    el(
      'div',
      { className: 'ui-grid' },
      text('title', 'en'),
      text('title', 'es')
    ),
    el(
      'div',
      { className: 'ui-grid' },
      text('summary', 'en', true),
      text('summary', 'es', true)
    ),
    tags
  );
}

/** A setting's label: the Settings panel's where it has one, else the Studio's. */
function settingLabel(key) {
  const camel = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const panel = `settings.label.${camel}`;
  return hasMessage(panel) ? t(panel) : t(`studio.setting.${key}`);
}

const shown = v =>
  v === null
    ? t('studio.value.none')
    : Array.isArray(v)
      ? v.join(', ')
      : String(v);

function settingControl(key, rule, d) {
  const set = key in (d.settings || {});
  const value = set ? d.settings[key] : undefined;
  const def = DEFAULT_SETTINGS[key];
  const put = v => commit(x => setAt(x, `settings.${key}`, v));
  if (rule.kind === 'bool' || rule.kind === 'option') {
    const options =
      rule.kind === 'bool'
        ? [
            ['on', t('studio.value.on')],
            ['off', t('studio.value.off')],
          ]
        : (rule.options === 'integrators' ? INTEGRATORS : rule.options).map(
            o => [
              JSON.stringify(o),
              o === null ? t('studio.value.none') : String(o),
            ]
          );
    const current = !set
      ? ''
      : rule.kind === 'bool'
        ? value
          ? 'on'
          : 'off'
        : JSON.stringify(value);
    const defLabel =
      rule.kind === 'bool'
        ? def
          ? t('studio.value.on')
          : t('studio.value.off')
        : shown(def);
    return select(
      [['', t('studio.value.default', { value: defLabel })], ...options],
      current,
      v =>
        put(
          v === ''
            ? undefined
            : rule.kind === 'bool'
              ? v === 'on'
              : JSON.parse(v)
        )
    );
  }
  if (rule.kind === 'numbers') {
    const input = textInput(
      set ? value.join(', ') : '',
      v => {
        const s = v.trim();
        put(s === '' ? undefined : s.split(/[,\s]+/).map(numberOf));
      },
      { numeric: true }
    );
    input.placeholder = shown(def) || t('studio.value.none');
    return input;
  }
  const input = textInput(set ? String(value) : '', v => put(numberOf(v)), {
    numeric: true,
  });
  input.placeholder = String(def);
  return input;
}

function settingsSection(d) {
  const groups = {};
  for (const [key, rule] of Object.entries(SETTING_RULES))
    (groups[rule.group] ||= []).push([key, rule]);
  const section = el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'st-world-h' },
    el('h2', { id: 'st-world-h' }, t('studio.section.world')),
    el('p', { className: 'ui-hint' }, t('studio.hint.settings'))
  );
  for (const [group, list] of Object.entries(groups)) {
    const box = el(
      'details',
      {
        className: 'ui-disclosure',
        open: group === 'physics' || group === 'population',
      },
      el('summary', {}, t(`studio.group.${group}`))
    );
    const grid = el('div', { className: 'ui-grid st-grid-3' });
    for (const [key, rule] of list) {
      const range =
        rule.kind === 'int' || rule.kind === 'number'
          ? t('studio.hint.range', { min: rule.min, max: rule.max })
          : '';
      grid.append(
        field(
          `st-setting-${key}`,
          settingLabel(key),
          settingControl(key, rule, d),
          range
        )
      );
    }
    box.append(grid);
    section.append(box);
  }
  return section;
}

/** The population off, as a pack that brings its own bodies needs it. */
function clearPopulation(x) {
  x.settings ||= {};
  for (const key of POPULATION_COUNTS) x.settings[key] = 0;
  x.settings.enable_asteroids = false;
  x.settings.placement = 'Empty';
}

const typeOptions = () =>
  SYSTEM_TYPES.map(type => [type, t(TYPE_NAME_KEY[type])]);
const massUnit = type =>
  t(`builder.mass.${BUILDER_TYPES[type]?.unit ?? 'suns'}`);

function systemSection(d) {
  const section = el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'st-bodies-h' },
    el('h2', { id: 'st-bodies-h' }, t('studio.section.bodies')),
    el('p', { className: 'ui-hint' }, t('studio.hint.bodies'))
  );
  // An orbital system, as the builder takes it.
  const sys = el(
    'div',
    { id: 'st-system', className: 'st-subsection', tabindex: '-1' },
    el('h3', {}, t('studio.system.heading'))
  );
  const bodies = d.system?.bodies;
  if (!bodies) {
    sys.append(
      el('p', { className: 'ui-hint' }, t('studio.system.none')),
      el(
        'button',
        {
          type: 'button',
          className: 'ui-button',
          id: 'st-system-add',
          onclick: () =>
            commit(x => {
              x.system = {
                bodies: [
                  { name: t('builder.name.star'), type: 'Star', mass: 1 },
                  {
                    name: t('builder.name.planet'),
                    type: 'Planet',
                    mass: 1,
                    primary: 0,
                    a: 1,
                    e: 0,
                    omega: 0,
                    phase: 0,
                    retrograde: false,
                  },
                ],
              };
              clearPopulation(x);
              x.settings.mutual_gravity = true;
              x.settings.bh_behavior = 'Orbiting';
              x.settings.orbit_decay_rate = 0;
            }),
        },
        t('studio.system.add')
      )
    );
  } else {
    bodies.forEach((b, i) => {
      const put = (key, v) =>
        commit(x => {
          if (v === undefined) delete x.system.bodies[i][key];
          else x.system.bodies[i][key] = v;
        });
      const at = key => `st-sys-${i}-${key}`;
      const row = el(
        'fieldset',
        { className: 'st-body' },
        el(
          'legend',
          {},
          i === 0
            ? t('builder.body.root')
            : t('builder.body.companion', { n: i + 1 })
        )
      );
      const grid = el('div', { className: 'ui-grid st-grid-4' });
      grid.append(
        field(
          at('name'),
          t('builder.field.name'),
          textInput(b.name, v => put('name', v.trim() || undefined))
        ),
        field(
          at('type'),
          t('builder.field.type'),
          select(typeOptions(), b.type, v => put('type', v))
        ),
        field(
          at('mass'),
          t('builder.field.mass', { unit: massUnit(b.type) }),
          textInput(b.mass, v => put('mass', numberOf(v)), { numeric: true })
        ),
        field(
          at('radius'),
          t('builder.field.radius'),
          textInput(b.radius, v => put('radius', numberOf(v)), {
            numeric: true,
          })
        )
      );
      if (i > 0) {
        grid.append(
          field(
            at('primary'),
            t('builder.field.primary'),
            select(
              bodies
                .slice(0, i)
                .map((p, j) => [String(j), p.name || String(j + 1)]),
              String(b.primary ?? 0),
              v => put('primary', Number(v))
            )
          ),
          field(
            at('a'),
            t('builder.field.a'),
            textInput(b.a, v => put('a', numberOf(v)), { numeric: true })
          ),
          field(
            at('e'),
            t('builder.field.e'),
            textInput(b.e, v => put('e', numberOf(v)), { numeric: true })
          ),
          field(
            at('omega'),
            t('builder.field.omega'),
            textInput(b.omega, v => put('omega', numberOf(v)), {
              numeric: true,
            })
          ),
          field(
            at('phase'),
            t('builder.field.phase'),
            textInput(b.phase, v => put('phase', numberOf(v)), {
              numeric: true,
            })
          ),
          field(
            at('retrograde'),
            t('builder.field.direction'),
            select(
              [
                ['prograde', t('builder.direction.prograde')],
                ['retrograde', t('builder.direction.retrograde')],
              ],
              b.retrograde ? 'retrograde' : 'prograde',
              v => put('retrograde', v === 'retrograde')
            )
          )
        );
      }
      row.append(grid);
      if (i > 0) {
        row.append(
          el(
            'button',
            {
              type: 'button',
              className: 'ui-button',
              id: `st-sys-${i}-remove`,
              onclick: () =>
                commit(x => {
                  const gone = x.system.bodies.splice(i, 1)[0];
                  // Companions of the removed body go round what it went round.
                  for (const c of x.system.bodies) {
                    if (c.primary === i) c.primary = gone.primary ?? 0;
                    else if (c.primary > i) c.primary -= 1;
                  }
                }),
            },
            t('builder.remove', { name: b.name || String(i + 1) })
          )
        );
      }
      sys.append(row);
    });
    sys.append(
      el(
        'div',
        { className: 'ui-toolbar' },
        el(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: 'st-sys-add',
            onclick: () =>
              commit(x => {
                const n = x.system.bodies.length;
                x.system.bodies.push({
                  type: 'Planet',
                  mass: 1,
                  primary: 0,
                  a: 1 + n,
                  e: 0,
                  omega: 0,
                  phase: 0,
                  retrograde: false,
                });
              }),
          },
          t('builder.add')
        ),
        el(
          'button',
          {
            type: 'button',
            className: 'ui-button',
            id: 'st-system-remove',
            onclick: () => commit(x => delete x.system),
          },
          t('studio.system.remove')
        )
      )
    );
  }
  section.append(sys);

  // Typed bodies, as precise placement takes them.
  const typed = el(
    'div',
    { id: 'st-typed', className: 'st-subsection' },
    el('h3', {}, t('studio.typed.heading'))
  );
  (d.bodies || []).forEach((b, i) => {
    const put = (key, v) =>
      commit(x => {
        if (v === undefined) delete x.bodies[i][key];
        else x.bodies[i][key] = v;
      });
    const at = key => `st-body-${i}-${key}`;
    const len = t('place.precise.unit.length');
    const speed = t('place.precise.unit.speed');
    const row = el(
      'fieldset',
      { className: 'st-body' },
      el('legend', {}, t('studio.typed.body', { n: i + 1 }))
    );
    row.append(
      el(
        'div',
        { className: 'ui-grid st-grid-4' },
        field(
          at('name'),
          t('builder.field.name'),
          textInput(b.name, v => put('name', v.trim() || undefined))
        ),
        field(
          at('type'),
          t('builder.field.type'),
          select(typeOptions(), b.type, v => put('type', v))
        ),
        field(
          at('mass'),
          t('builder.field.mass', { unit: massUnit(b.type) }),
          textInput(b.mass, v => put('mass', numberOf(v)), { numeric: true })
        ),
        field(
          at('radius'),
          t('builder.field.radius'),
          textInput(b.radius, v => put('radius', numberOf(v)), {
            numeric: true,
          })
        ),
        field(
          at('x'),
          t('place.precise.field.x', { unit: len }),
          textInput(b.x, v => put('x', numberOf(v) ?? 0), { numeric: true })
        ),
        field(
          at('y'),
          t('place.precise.field.y', { unit: len }),
          textInput(b.y, v => put('y', numberOf(v) ?? 0), { numeric: true })
        ),
        field(
          at('vx'),
          t('place.precise.field.vx', { unit: speed }),
          textInput(b.vx, v => put('vx', numberOf(v) ?? 0), { numeric: true })
        ),
        field(
          at('vy'),
          t('place.precise.field.vy', { unit: speed }),
          textInput(b.vy, v => put('vy', numberOf(v) ?? 0), { numeric: true })
        )
      ),
      el(
        'button',
        {
          type: 'button',
          className: 'ui-button',
          id: `st-body-${i}-remove`,
          onclick: () =>
            commit(x => {
              x.bodies.splice(i, 1);
              if (!x.bodies.length) delete x.bodies;
            }),
        },
        t('studio.typed.remove', { n: i + 1 })
      )
    );
    typed.append(row);
  });
  typed.append(
    el(
      'button',
      {
        type: 'button',
        className: 'ui-button',
        id: 'st-body-add',
        onclick: () =>
          commit(x => {
            if (!x.bodies?.length && !x.system) clearPopulation(x);
            (x.bodies ||= []).push({
              type: 'Star',
              mass: 1,
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
            });
          }),
      },
      t('studio.typed.add')
    )
  );
  section.append(typed);
  return section;
}

function instrumentsSection(d) {
  const box = (list, key) => {
    const set = el(
      'fieldset',
      { id: `st-${key}`, className: 'ui-choices' },
      el('legend', {}, t(`studio.field.${key}`))
    );
    for (const id of list) {
      const input = el('input', { type: 'checkbox', id: `st-${key}-${id}` });
      input.checked = (d[key] || []).includes(id);
      input.addEventListener('change', () =>
        commit(x => {
          const s = new Set(x[key] || []);
          if (input.checked) s.add(id);
          else s.delete(id);
          const next = list.filter(v => s.has(v));
          if (next.length) x[key] = next;
          else delete x[key];
        })
      );
      set.append(
        el('label', { className: 'ui-choice' }, input, t(RAIL_LABEL[id]))
      );
    }
    return set;
  };
  return el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'st-instruments-h' },
    el('h2', { id: 'st-instruments-h' }, t('studio.section.instruments')),
    el('p', { className: 'ui-hint' }, t('studio.hint.instruments')),
    box(STARTING_PANELS, 'open'),
    box(STARTING_TOOLS, 'tools')
  );
}

function startSection(d) {
  const paused = el('input', { type: 'checkbox', id: 'st-paused' });
  paused.checked = d.paused === true;
  paused.addEventListener('change', () =>
    commit(x => {
      if (paused.checked) x.paused = true;
      else delete x.paused;
    })
  );
  return el(
    'section',
    { className: 'ui-card', 'aria-labelledby': 'st-start-h' },
    el('h2', { id: 'st-start-h' }, t('studio.section.start')),
    el(
      'div',
      { className: 'ui-grid st-grid-3' },
      field(
        'st-seed',
        t('studio.field.seed'),
        textInput(d.seed, v => commit(x => (x.seed = numberOf(v))), {
          numeric: true,
        }),
        t('studio.hint.seed')
      ),
      field(
        'st-zoom',
        t('studio.field.zoom'),
        textInput(
          d.camera?.zoom,
          v =>
            commit(x => {
              const z = numberOf(v);
              if (z === undefined) delete x.camera;
              else x.camera = { ...(x.camera || {}), zoom: z };
            }),
          { numeric: true }
        ),
        t('studio.hint.zoom')
      ),
      field(
        'st-inclination',
        t('studio.field.inclination'),
        textInput(
          d.observer?.inclination,
          v =>
            commit(x => {
              const n = numberOf(v);
              x.observer ||= {};
              if (n === undefined) delete x.observer.inclination;
              else x.observer.inclination = n;
              if (!Object.keys(x.observer).length) delete x.observer;
            }),
          { numeric: true }
        ),
        t('studio.hint.inclination')
      )
    ),
    el(
      'div',
      { className: 'ui-toolbar' },
      el(
        'button',
        {
          type: 'button',
          className: 'ui-button',
          id: 'st-seed-new',
          onclick: () => commit(x => (x.seed = randomSeed())),
        },
        t('studio.action.newSeed')
      ),
      el('label', { className: 'ui-choice' }, paused, t('studio.field.paused'))
    )
  );
}

// --- Checks, differences, preview ---------------------------------------------

/** A validator complaint, in the reader's language. */
function describe(e) {
  if (e.code.includes('.')) return t(e.code, e.vars);
  const id = `studio.error.${e.code}`;
  return hasMessage(id) ? t(id, e.vars) : e.message;
}

/** The field a validator path is about. */
function fieldFor(path) {
  let m;
  if ((m = /^(title|summary)\.(\w+)$/.exec(path))) return `st-${m[1]}-${m[2]}`;
  if ((m = /^settings\.(\w+)$/.exec(path))) return `st-setting-${m[1]}`;
  if ((m = /^system\.bodies\[(\d+)\]\.(\w+)$/.exec(path)))
    return `st-sys-${m[1]}-${m[2]}`;
  if ((m = /^bodies\[(\d+)\]\.(\w+)$/.exec(path)))
    return `st-body-${m[1]}-${m[2]}`;
  if (path.startsWith('system')) return 'st-system';
  if (path.startsWith('tags')) return 'st-tags';
  if (path.startsWith('open')) return 'st-open';
  if (path.startsWith('tools')) return 'st-tools';
  if (path.startsWith('camera')) return 'st-zoom';
  if (path.startsWith('observer')) return 'st-inclination';
  return { id: 'st-id', version: 'st-version', seed: 'st-seed' }[path] ?? null;
}

function showErrors(errors) {
  const byField = new Map();
  for (const e of errors) {
    const id = fieldFor(e.path);
    if (id) byField.set(id, [...(byField.get(id) || []), describe(e)]);
  }
  for (const [id, messages] of byField) {
    const control = $(id);
    const note = $(`${id}-error`);
    if (!control) continue;
    control.setAttribute('aria-invalid', 'true');
    if (note) {
      note.textContent = messages.join(' ');
      note.hidden = false;
      control.setAttribute(
        'aria-describedby',
        `${control.dataset.described || ''} ${id}-error`.trim()
      );
    }
  }
}

/** Cautions about the system the pack builds, from the builder's own checks. */
function cautions(d) {
  const out = [];
  if (startedFrom && !GENERATED_SCENARIOS.includes(startedFrom)) {
    out.push(
      t('studio.caution.handBuilt', { scenario: scenarioTitle(startedFrom) })
    );
  }
  try {
    const { bodies } = packBodies(d);
    const first = bodies.length - (d.bodies?.length ?? 0);
    const names = bodies.map(
      (b, i) => b.name || t('studio.typed.body', { n: i - first + 1 })
    );
    for (const c of packCautions(d)) {
      const [one, two] = c.bodies.map(i => names[i]);
      out.push(t(c.key, { ...c.vars, first: one, second: two, name: one }));
    }
  } catch {
    /* an invalid system or body is reported by the validator */
  }
  return out;
}

function renderChecks(d, errors) {
  const list = $('st-checks');
  list.textContent = '';
  for (const e of errors) {
    const id = fieldFor(e.path);
    // Named by its field's own label, so the list reads without the form.
    const label =
      id && document.querySelector(`label[for="${id}"], #${id} > legend`);
    const text = label ? `${label.textContent}: ${describe(e)}` : describe(e);
    const button = el(
      'button',
      { type: 'button', className: 'ui-link', onclick: () => $(id)?.focus() },
      text
    );
    list.append(el('li', { 'data-level': 'error' }, id ? button : text));
  }
  for (const c of cautions(d)) {
    list.append(
      el(
        'li',
        { 'data-level': 'caution' },
        t('studio.checks.caution', { text: c })
      )
    );
  }
  if (!list.children.length) list.append(el('li', {}, t('studio.checks.none')));
  $('st-checks-summary').textContent = errors.length
    ? t('studio.checks.count', { count: errors.length })
    : t('studio.checks.valid');
}

function renderDiff(d) {
  const list = $('st-diff');
  list.textContent = '';
  const changes = semanticDiff(baseline, d);
  // Each value as JSON, so an empty text reads "" rather than as nothing, and
  // whole up to a line's length; a longer one (a whole system, say) is cut,
  // and the raw view has all of it.
  const show = v => {
    const s = v === undefined ? '-' : JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 79)}…` : s;
  };
  for (const c of changes.slice(0, 200)) {
    list.append(
      el(
        'li',
        {},
        el('code', {}, c.path),
        ` ${t(`studio.diff.${c.kind}`)}: ${show(c.before)} → ${show(c.after)}`
      )
    );
  }
  $('st-diff-summary').textContent = changes.length
    ? t('studio.diff.count', { count: changes.length })
    : t('studio.diff.none');
}

async function linkFor(d, { embed = false } = {}) {
  const fragment = await encodePayload(compileScenarioPack(d));
  return `${location.origin}/${embed ? '?embed=1' : ''}#${fragment}`;
}

async function preview() {
  const d = doc();
  if (checkPack(d).length) {
    setStatus(t('studio.status.fixFirst'));
    return;
  }
  $('st-preview').src = await linkFor(d, { embed: true });
  setStatus(t('studio.status.previewed'));
}

function setStatus(message) {
  $('st-status').textContent = message;
}

/** Everything that follows from the document. */
function render() {
  if (!history) return;
  const d = doc();
  const focused = document.activeElement?.id;
  const host = $('st-editor');
  host.textContent = '';
  host.append(
    aboutSection(d),
    settingsSection(d),
    systemSection(d),
    instrumentsSection(d),
    startSection(d)
  );
  const errors = checkPack(d);
  showErrors(errors);
  renderChecks(d, errors);
  renderDiff(d);
  const valid = errors.length === 0;
  for (const id of ['st-save', 'st-copy', 'st-preview-go'])
    $(id).disabled = !valid;
  $('st-open-app').hidden = !valid;
  if (valid) linkFor(d).then(href => ($('st-open-app').href = href));
  $('st-undo').disabled = !history.canUndo();
  $('st-redo').disabled = !history.canRedo();
  $('st-raw-text').value = serialize(d);
  $('st-raw-error').hidden = true;
  $('st-storage').hidden = !storageFailed;
  renderDrafts();
  if (focused && $(focused)) $(focused).focus();
}

function renderDrafts() {
  const s = $('st-drafts');
  const current = doc().id;
  s.textContent = '';
  for (const draft of drafts.list()) {
    const title = draft.title?.[getLocale()] || draft.title?.en || draft.id;
    s.append(el('option', { value: draft.id }, `${title} (${draft.id})`));
  }
  s.value = current;
}

// --- Starting points and files ------------------------------------------------

function start(pack, { from = null, message } = {}) {
  history.reset(pack);
  baseline = JSON.parse(JSON.stringify(pack));
  startedFrom = from;
  saveDraft(pack);
  render();
  if (message) setStatus(message);
}

function fromScenario(name) {
  const pack = blankPack(randomSeed());
  const { settings, dropped } = settingsFromScenario(name);
  pack.settings = settings;
  pack.id =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'scenario';
  // Each language from its own catalog: English always, Spanish when the page
  // is in Spanish and so has it. A field left empty is the author's to write,
  // and the checks say so.
  const es = getLocale() === 'es';
  pack.title = {
    en: EN_STUDIO['studio.copyOf'].replace(
      '{title}',
      EN[`scenario.${name}.title`] ?? name
    ),
    es: es ? t('studio.copyOf', { title: scenarioTitle(name) }) : '',
  };
  pack.summary = {
    en: EN[`scenario.${name}.summary`] ?? '',
    es: es ? scenarioSummary(name) : '',
  };
  pack.tags = [...(SCENARIO_INFO[name]?.tags || [])];
  start(pack, {
    from: name,
    message: dropped.length
      ? t('studio.status.startedDropped', {
          scenario: scenarioTitle(name),
          keys: dropped.join(', '),
        })
      : t('studio.status.started', { scenario: scenarioTitle(name) }),
  });
}

function download() {
  const d = doc();
  const blob = new Blob([serialize(d)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `${d.id}.scenario.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  baseline = d;
  render();
  setStatus(t('studio.status.saved', { file: `${d.id}.scenario.json` }));
}

/** Read a file: a scenario pack, or an Orbital System Builder file. */
async function openFile(file) {
  let data;
  try {
    data = parseDocument(await file.text(), true);
  } catch {
    setStatus(t('studio.file.unreadable'));
    return;
  }
  let pack;
  if (data?.format === SYSTEM_FORMAT) {
    const r = packFromOrbitalSystem(data);
    if (!r.ok) return setStatus(t(r.key, r.vars));
    pack = r.pack;
  } else {
    const r = migrateScenarioPack(data);
    if (!r.ok) return setStatus(t(`studio.file.${r.code}`, r.vars));
    pack = r.pack;
  }
  const existing = drafts.load(pack.id);
  if (existing && serialize(existing.doc) !== serialize(pack)) {
    return askConflict(existing.doc, pack);
  }
  start(pack, { message: t('studio.file.opened', { id: pack.id }) });
}

/** A file with the id of a different draft: say what differs, and ask. */
function askConflict(mine, theirs) {
  const dialog = $('st-conflict');
  $('st-conflict-text').textContent = t('studio.conflict.text', {
    id: theirs.id,
  });
  const list = $('st-conflict-diff');
  list.textContent = '';
  for (const c of semanticDiff(mine, theirs).slice(0, 50)) {
    list.append(
      el('li', {}, el('code', {}, c.path), ` ${t(`studio.diff.${c.kind}`)}`)
    );
  }
  const choose = choice => {
    dialog.close();
    if (choice === 'replace')
      start(theirs, { message: t('studio.file.opened', { id: theirs.id }) });
    else if (choice === 'both') {
      let n = 2;
      while (drafts.load(`${theirs.id}-${n}`)) n++;
      start(
        { ...theirs, id: `${theirs.id}-${n}` },
        { message: t('studio.conflict.kept', { id: `${theirs.id}-${n}` }) }
      );
    } else setStatus(t('studio.conflict.cancelled'));
  };
  $('st-conflict-replace').onclick = () => choose('replace');
  $('st-conflict-both').onclick = () => choose('both');
  $('st-conflict-cancel').onclick = () => choose('cancel');
  dialog.showModal();
}

/** Apply the raw JSON view, or say why not. The document is untouched until it parses. */
function applyRaw() {
  const note = $('st-raw-error');
  let data;
  try {
    data = parseDocument($('st-raw-text').value, true);
  } catch (err) {
    note.textContent = t('studio.raw.notJson', { error: err.message });
    note.hidden = false;
    $('st-raw-text').focus();
    return;
  }
  const r = migrateScenarioPack(data);
  if (!r.ok) {
    note.textContent = t(`studio.file.${r.code}`, r.vars);
    note.hidden = false;
    return;
  }
  commit(x => {
    for (const k of Object.keys(x)) delete x[k];
    Object.assign(x, r.pack);
  });
  setStatus(t('studio.raw.applied'));
}

// --- Start-up ----------------------------------------------------------------

function wire() {
  $('st-new').addEventListener('click', () =>
    start(blankPack(randomSeed()), { message: t('studio.status.new') })
  );
  $('st-from-go').addEventListener('click', () =>
    fromScenario($('st-from').value)
  );
  $('st-open').addEventListener('click', () => $('st-file').click());
  $('st-file').addEventListener('change', () => {
    const file = $('st-file').files?.[0];
    $('st-file').value = '';
    if (file) openFile(file);
  });
  $('st-save').addEventListener('click', download);
  $('st-copy').addEventListener('click', async () => {
    const href = await linkFor(doc());
    try {
      await navigator.clipboard.writeText(href);
      setStatus(t('studio.status.copied'));
    } catch {
      setStatus(t('studio.status.copyFailed'));
    }
  });
  $('st-preview-go').addEventListener('click', preview);
  $('st-undo').addEventListener('click', () => {
    const d = history.undo();
    if (d) (saveDraft(d), render(), setStatus(t('studio.status.undone')));
  });
  $('st-redo').addEventListener('click', () => {
    const d = history.redo();
    if (d) (saveDraft(d), render(), setStatus(t('studio.status.redone')));
  });
  document.addEventListener('keydown', event => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    // Text fields keep their own undo, for the typing they hold; a checkbox
    // or a list holds none, so there the keys undo the document.
    const target = event.target;
    const typing =
      target?.tagName === 'TEXTAREA' ||
      (target?.tagName === 'INPUT' &&
        !['checkbox', 'radio', 'button', 'file'].includes(target.type));
    if (typing) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) $('st-undo').click();
    else if ((key === 'z' && event.shiftKey) || key === 'y')
      $('st-redo').click();
    else return;
    event.preventDefault();
  });
  $('st-drafts-open').addEventListener('click', () => {
    const d = drafts.load($('st-drafts').value);
    if (d)
      start(d.doc, {
        message: t('studio.status.draftOpened', { id: d.doc.id }),
      });
  });
  $('st-drafts-delete').addEventListener('click', () => {
    const id = $('st-drafts').value;
    if (id === doc().id) return setStatus(t('studio.status.draftInUse'));
    drafts.remove(id);
    renderDrafts();
    setStatus(t('studio.status.draftDeleted', { id }));
  });
  $('st-raw-apply').addEventListener('click', applyRaw);
  $('st-raw-revert').addEventListener('click', () => render());
}

async function init() {
  let store;
  try {
    const raw = window.localStorage;
    store = {
      get length() {
        return raw.length;
      },
      key: i => raw.key(i),
      getItem: k => raw.getItem(k),
      setItem: (k, v) => put(k, v, 'drafts', raw),
      removeItem: k => drop(k, raw),
    };
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
    }
  );
  await useLanguage(preferredLocale());
  wire();
  // ?open=<id>: the draft My work names, else the one saved last.
  const named = new URLSearchParams(location.search).get('open');
  const last = named && drafts.load(named) ? named : drafts.last();
  const draft = last ? drafts.load(last) : null;
  history = createHistory(draft?.doc ?? blankPack(randomSeed()));
  baseline = history.current();
  render();
  setStatus(
    draft
      ? t('studio.status.restored', { id: draft.doc.id })
      : t('studio.status.new')
  );
  document.body.dataset.ready = 'true';
}

init();
