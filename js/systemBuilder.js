// =============================================================================
// The Orbital System Builder
// -----------------------------------------------------------------------------
// A form for a hierarchical system. Each companion names what it orbits and
// the orbit it is on - semi-major axis, eccentricity, the direction of its
// periapsis, where along the orbit it starts and which way it goes round -
// and js/systemSpec.js turns that into the positions and velocities of
// a system whose barycenter is at rest. This file is the DOM around that
// module and nothing more: it keeps what was typed, shows the preview, the
// orbits and the checks as they change, and builds the world with the handful
// of js/ui.js internals the coordinator hands down. It never imports js/ui.js;
// a feature module reaching back up to the coordinator is the shape
// tools/check-architecture.mjs refuses.
//
// Loaded on demand, and it mounts its own dialog rather than keeping markup in
// index.html, so a visitor who never opens it pays for one button.
//
// Errors are attached to their own field through aria-describedby, as the
// precise-placement form does, and only once somebody has tried to build or
// save: a form that turns red while the first number is half typed is telling
// its reader nothing. The checks on the system as a whole - touching bodies, a
// moon outside its planet's Hill sphere, orbits that cross - are listed below
// the preview, in words, beside the table that is the preview's text
// equivalent.
// =============================================================================

import { t, getLocale, registerMessages } from './i18n/index.js';
import { openDialog, closeDialog } from './dialog.js';
import { announce } from './notify.js';
import { formatNumber } from './format.js';
import {
  state,
  SETTINGS,
  DEFAULT_SETTINGS,
  setSettings,
  setScenarioName,
} from './appState.js';
import {
  bumpWorldGeneration,
  updatePhysicsSettings,
  resetConservationBaseline,
} from './physics.js';
import { withSeed } from './rng.js';
import {
  BUILDER_TYPES,
  SYSTEM_TYPES,
  TYPE_NAME_KEY,
  MAX_BODIES,
  validateSystem,
  buildSystem,
  defaultRadius,
  systemSeed,
  systemToFile,
  systemFromFile,
  initialStateMatches,
} from './systemSpec.js';

/**
 * Bring in this panel's strings, for the locale in use.
 *
 * @returns {Promise<void>} Resolves once t() can answer
 */
export async function ensureBuilderMessages() {
  const locale = getLocale();
  const module =
    locale === 'es'
      ? await import('./i18n/es.builder.js')
      : await import('./i18n/en.builder.js');
  registerMessages(locale, module.ES_BUILDER || module.EN_BUILDER);
}

/**
 * Where to start. Real systems where the numbers are well known, so a reader
 * who opens one sees a system they can look up; the values are the published
 * elements, reduced to the plane.
 *
 * Sun, Earth, Moon: the Moon's orbit is 0.00257 AU, a quarter of a simulation
 * unit, so Earth and the Moon are given contact radii that fit inside it; the
 * class defaults are sized to be seen, not to be the Earth.
 * Kepler-16: Doyle et al. (2011). Alpha Centauri: the binary from Pourbaix
 * and Boffin (2016); the planet round A is hypothetical, at 1.2 AU.
 */
const TEMPLATES = Object.freeze({
  starPlanet: [
    { name: 'builder.name.star', type: 'Star', mass: 1 },
    { name: 'builder.name.planet', type: 'Planet', mass: 1, primary: 0, a: 1 },
  ],
  sunEarthMoon: [
    { name: 'builder.name.sun', type: 'Star', mass: 1 },
    {
      name: 'builder.name.earth',
      type: 'Planet',
      mass: 1,
      radius: 0.02,
      primary: 0,
      a: 1,
      e: 0.0167,
      omega: 102.9,
    },
    {
      name: 'builder.name.moon',
      type: 'Planet',
      mass: 0.0123,
      radius: 0.006,
      primary: 1,
      a: 0.00257,
      e: 0.0549,
    },
  ],
  giants: [
    { name: 'builder.name.sun', type: 'Star', mass: 1 },
    {
      name: 'builder.name.jupiter',
      type: 'GasGiant',
      mass: 1,
      primary: 0,
      a: 5.203,
      e: 0.0484,
      omega: 14.73,
    },
    {
      name: 'builder.name.saturn',
      type: 'GasGiant',
      mass: 0.299,
      primary: 0,
      a: 9.537,
      e: 0.0539,
      omega: 92.43,
      phase: 120,
    },
  ],
  kepler16: [
    { name: 'builder.name.kepler16a', type: 'Star', mass: 0.6897 },
    {
      name: 'builder.name.kepler16b',
      type: 'Star',
      mass: 0.20255,
      primary: 0,
      a: 0.22431,
      e: 0.15944,
      omega: 263.464,
    },
    {
      name: 'builder.name.kepler16planet',
      type: 'GasGiant',
      mass: 0.333,
      primary: 0,
      a: 0.7048,
      e: 0.0069,
      omega: 318,
    },
  ],
  alphaCen: [
    { name: 'builder.name.alphaCenA', type: 'Star', mass: 1.0788 },
    {
      name: 'builder.name.alphaCenPlanet',
      type: 'Planet',
      mass: 1,
      primary: 0,
      a: 1.2,
    },
    {
      name: 'builder.name.alphaCenB',
      type: 'Star',
      mass: 0.9092,
      primary: 0,
      a: 23.4,
      e: 0.5179,
      omega: 231.65,
    },
  ],
  triple: [
    { name: 'builder.name.tripleA', type: 'Star', mass: 1 },
    {
      name: 'builder.name.tripleB',
      type: 'Star',
      mass: 0.8,
      primary: 0,
      a: 0.5,
      e: 0.1,
    },
    {
      name: 'builder.name.tripleC',
      type: 'Star',
      mass: 0.6,
      primary: 0,
      a: 5,
      e: 0.2,
      phase: 90,
    },
  ],
});

/**
 * The dialog's own styles, which arrive with it so that the start-up
 * stylesheet carries none of them. Everything else - rows, notes, buttons and
 * the table - is the precise-placement and series-table styling it reuses.
 * A panel that sits in the viewport and scrolls inside itself, a fieldset per
 * body with its fields in a grid that folds to one column on a phone, and the
 * preview's marks in the theme's colors, so both themes read.
 */
const STYLE =
  '.builder-dialog{position:fixed;inset:var(--space-4);z-index:var(--z-modal);' +
  'max-width:56rem;margin:0 auto;overflow-y:auto;padding:var(--space-5);' +
  'background:var(--panel-bg);border:1px solid var(--border);' +
  'border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);' +
  'color:var(--text-primary)}' +
  '.builder-body{margin:0 0 var(--space-3);padding:var(--space-3);' +
  'border:1px solid var(--border);border-radius:var(--radius-md)}' +
  '.builder-fields{display:grid;' +
  'grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:0 var(--space-3)}' +
  '.builder-preview svg{display:block;width:100%;max-width:26rem;height:auto;' +
  'margin:var(--space-2) auto;background:var(--surface-inset);' +
  'border-radius:var(--radius-md)}' +
  '.builder-orbit,.builder-barycenter{fill:none;stroke:var(--text-muted);' +
  'stroke-width:1.25px;vector-effect:non-scaling-stroke}' +
  '.builder-dot{fill:var(--accent)}.builder-label{fill:var(--text-primary)}' +
  '.builder-checks li[data-level=error]{color:var(--danger,#e2555a);font-weight:600}';

const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const FIELDS = ['a', 'e', 'omega', 'phase'];

/** The system as typed: one row per body, every number still text. */
let rows = null;
let nextKey = 1;
/** What js/ui.js handed down, and the constant a built system runs at. */
let deps = null;
/** The latest evaluation: {input, verdict, built}. */
let current = null;
/** Field errors are shown once somebody has tried to build or save. */
let showErrors = false;
let refreshTimer = 0;

const fieldId = (key, field) => `sb-${key}-${field}`;
const errorId = (key, field) => `sb-${key}-${field}-error`;
const hintId = (key, field) => `sb-${key}-${field}-hint`;
const num = v => (v === undefined || v === null ? '' : String(v));
const fmt = (v, sig = 3) => formatNumber(v, { sig });

/** A row from a body description, whatever it came from. */
function rowFrom(body, keys) {
  const key = `b${nextKey++}`;
  keys.push(key);
  return {
    key,
    name: body.name ?? '',
    type: SYSTEM_TYPES.includes(body.type) ? body.type : 'Planet',
    mass: num(body.mass),
    radius: num(body.radius),
    primary: null,
    primaryIndex: body.primary,
    a: num(body.a),
    e: num(body.e ?? 0),
    omega: num(body.omega ?? 0),
    phase: num(body.phase ?? 0),
    retrograde: body.retrograde === true,
  };
}

/** Rows from a list of bodies whose primaries are indices. */
function rowsFrom(bodies) {
  const keys = [];
  const out = bodies.map(b => rowFrom(b, keys));
  out.forEach((row, i) => {
    // A primary that names no body stays unnamed, and is reported against its
    // field rather than quietly re-pointed at the root.
    row.primary = i === 0 ? null : (keys[row.primaryIndex] ?? null);
    delete row.primaryIndex;
  });
  return out;
}

/** A template's rows, with its names in the reader's language. */
function templateRows(id) {
  return rowsFrom(TEMPLATES[id].map(b => ({ ...b, name: t(b.name) })));
}

/** What a body is called when nobody named it. */
function displayName(row, index) {
  return (
    row.name.trim() ||
    t('builder.defaultName', { type: t(TYPE_NAME_KEY[row.type]), n: index + 1 })
  );
}

/** The system as systemSpec.js reads it. */
function toInput() {
  const index = new Map(rows.map((r, i) => [r.key, i]));
  return {
    bodies: rows.map((r, i) => ({
      name: displayName(r, i),
      type: r.type,
      mass: r.mass,
      radius: r.type === 'BlackHole' ? '' : r.radius,
      primary: i === 0 ? null : (index.get(r.primary) ?? -1),
      a: r.a,
      e: r.e,
      omega: r.omega,
      phase: r.phase,
      retrograde: r.retrograde,
    })),
  };
}

function evaluate() {
  const input = toInput();
  const verdict = validateSystem(input);
  const built = verdict.ok ? buildSystem(verdict.bodies, { G: deps.G }) : null;
  return { input, verdict, built };
}

// --- The form -----------------------------------------------------------------

/**
 * One labelled field, with a hint and somewhere for an error.
 *
 * @param {object} row - The body
 * @param {string} field - Field key
 * @param {string} label - Translated
 * @param {HTMLElement} control - The input or select
 * @param {string} [hint] - Translated, or ''
 * @returns {HTMLElement} The row
 */
function fieldRow(row, field, label, control, hint = '') {
  const wrap = document.createElement('div');
  wrap.className = 'precise-row';
  const lab = document.createElement('label');
  lab.htmlFor = fieldId(row.key, field);
  lab.textContent = label;
  control.id = fieldId(row.key, field);
  control.dataset.key = row.key;
  control.dataset.field = field;
  control.classList.add('precise-input');
  wrap.append(lab, control);
  const described = [];
  if (hint !== null) {
    const note = document.createElement('p');
    note.id = hintId(row.key, field);
    note.className = 'precise-hint';
    note.textContent = hint;
    note.hidden = !hint;
    wrap.append(note);
    if (hint) described.push(note.id);
  }
  const err = document.createElement('p');
  err.id = errorId(row.key, field);
  err.className = 'precise-error';
  err.hidden = true;
  wrap.append(err);
  control.dataset.describedBase = described.join(' ');
  if (described.length)
    control.setAttribute('aria-describedby', described.join(' '));
  return wrap;
}

function textInput(value) {
  const input = document.createElement('input');
  input.type = 'text';
  // Not type="number", for the reason js/precisePlacement.js gives: an
  // invalid number reads back to a screen reader as an empty field.
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.value = value;
  return input;
}

function select(options, value) {
  const el = document.createElement('select');
  for (const [v, label] of options) {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = label;
    el.append(option);
  }
  el.value = value;
  return el;
}

/** The hint under the radius field, which follows the type and the mass. */
function radiusHint(row) {
  const mass = Number(row.mass);
  const spec = BUILDER_TYPES[row.type];
  if (!(mass >= spec.min && mass <= spec.max)) return '';
  const radius = fmt(defaultRadius(row.type, mass));
  return row.type === 'BlackHole'
    ? t('builder.field.radiusBlackHole', { radius })
    : t('builder.field.radiusHint', { radius });
}

function bodyFieldset(row, index) {
  const set = document.createElement('fieldset');
  set.className = 'builder-body';
  set.dataset.key = row.key;
  const legend = document.createElement('legend');
  legend.textContent =
    index === 0
      ? t('builder.body.root')
      : t('builder.body.companion', { n: index + 1 });
  set.append(legend);

  const grid = document.createElement('div');
  grid.className = 'builder-fields';
  set.append(grid);

  const name = textInput(row.name);
  name.inputMode = 'text';
  name.placeholder = displayName({ ...row, name: '' }, index);
  grid.append(fieldRow(row, 'name', t('builder.field.name'), name, null));

  grid.append(
    fieldRow(
      row,
      'type',
      t('builder.field.type'),
      select(
        SYSTEM_TYPES.map(type => [type, t(TYPE_NAME_KEY[type])]),
        row.type
      ),
      null
    )
  );

  const spec = BUILDER_TYPES[row.type];
  grid.append(
    fieldRow(
      row,
      'mass',
      t('builder.field.mass', { unit: t(`builder.mass.${spec.unit}`) }),
      textInput(row.mass),
      t('builder.field.massHint', { min: spec.min, max: spec.max })
    )
  );

  const radius = textInput(row.type === 'BlackHole' ? '' : row.radius);
  radius.disabled = row.type === 'BlackHole';
  grid.append(
    fieldRow(row, 'radius', t('builder.field.radius'), radius, radiusHint(row))
  );

  if (index > 0) {
    grid.append(
      fieldRow(
        row,
        'primary',
        t('builder.field.primary'),
        select(
          rows.slice(0, index).map((r, i) => [r.key, displayName(r, i)]),
          row.primary
        ),
        null
      )
    );
    grid.append(
      fieldRow(row, 'a', t('builder.field.a'), textInput(row.a), null),
      fieldRow(row, 'e', t('builder.field.e'), textInput(row.e), null),
      fieldRow(
        row,
        'omega',
        t('builder.field.omega'),
        textInput(row.omega),
        t('builder.field.omegaHint')
      ),
      fieldRow(
        row,
        'phase',
        t('builder.field.phase'),
        textInput(row.phase),
        t('builder.field.phaseHint')
      ),
      fieldRow(
        row,
        'direction',
        t('builder.field.direction'),
        select(
          [
            ['prograde', t('builder.direction.prograde')],
            ['retrograde', t('builder.direction.retrograde')],
          ],
          row.retrograde ? 'retrograde' : 'prograde'
        ),
        null
      )
    );

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ui-button builder-remove';
    remove.dataset.remove = row.key;
    remove.textContent = t('builder.remove', { name: displayName(row, index) });
    set.append(remove);
  }
  return set;
}

/** Draw the body list from `rows`, keeping focus on the field that had it. */
function renderBodies() {
  const host = $('systemBuilderBodies');
  if (!host) return;
  const focused = document.activeElement?.id;
  host.textContent = '';
  rows.forEach((row, i) => host.append(bodyFieldset(row, i)));
  const add = $('systemBuilderAdd');
  if (add) add.disabled = rows.length >= MAX_BODIES;
  if (focused && $(focused)) $(focused).focus();
}

function setFieldError(key, field, message) {
  const input = $(fieldId(key, field));
  const err = $(errorId(key, field));
  if (!input || !err) return;
  err.textContent = message;
  err.hidden = !message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  const base = input.dataset.describedBase || '';
  const ids = message ? `${base} ${errorId(key, field)}`.trim() : base;
  if (ids) input.setAttribute('aria-describedby', ids);
  else input.removeAttribute('aria-describedby');
}

function showFieldErrors(verdict) {
  for (const row of rows) {
    for (const f of ['type', 'mass', 'radius', 'primary', ...FIELDS]) {
      setFieldError(row.key, f, '');
    }
  }
  if (!showErrors) return;
  for (const e of verdict.errors) {
    if (e.index < 0) continue;
    setFieldError(rows[e.index].key, e.field, t(e.key, e.vars));
  }
}

// --- The preview, the table and the checks ------------------------------------

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** The barycenter of some bodies of a built system. */
function centerOf(built, members) {
  let m = 0;
  let x = 0;
  let y = 0;
  for (const i of members) {
    const b = built.bodies[i];
    m += b.simMass;
    x += b.simMass * b.pos.x;
    y += b.simMass * b.pos.y;
  }
  return { x: x / m, y: y / m };
}

/**
 * The system as the canvas will show it: y up, so a prograde orbit turns
 * counter-clockwise here as it will there. Each companion's subtree follows an
 * ellipse about its pair's barycenter, with the inner system on the opposite,
 * smaller one; both are drawn where the second is large enough to see.
 */
function previewSvg(built, names) {
  const W = built.extent * 1.15;
  const svg = svgEl('svg', {
    viewBox: `${-W} ${-W} ${2 * W} ${2 * W}`,
    role: 'img',
    'aria-labelledby': 'systemBuilderPreviewLabel',
  });
  const orbit = (focus, a, e, angle) => {
    const b = a * Math.sqrt(1 - e * e);
    const cx = focus.x - a * e * Math.cos(angle);
    const cy = focus.y - a * e * Math.sin(angle);
    svg.append(
      svgEl('ellipse', {
        class: 'builder-orbit',
        cx,
        cy: -cy,
        rx: a,
        ry: b,
        transform: `rotate(${(-angle * 180) / Math.PI} ${cx} ${-cy})`,
      })
    );
  };
  for (const o of built.orbits) {
    const focus = centerOf(built, [...o.inner, ...o.outer]);
    const w = (o.omega * Math.PI) / 180;
    orbit(focus, (1 - o.massFraction) * o.a, o.e, w);
    if (o.massFraction * o.a > W / 150) {
      orbit(focus, o.massFraction * o.a, o.e, w + Math.PI);
    }
  }
  svg.append(
    svgEl('path', {
      class: 'builder-barycenter',
      d: `M ${-W / 40} 0 H ${W / 40} M 0 ${-W / 40} V ${W / 40}`,
    })
  );
  const labelled = [];
  built.bodies.forEach((b, i) => {
    const r = W / (i === 0 ? 45 : 70);
    svg.append(
      svgEl('circle', {
        class: `builder-dot builder-dot-${b.type}`,
        cx: b.pos.x,
        cy: -b.pos.y,
        r,
      })
    );
    // One label where bodies crowd together, so a moon does not print its
    // name over its planet's.
    if (labelled.some(p => Math.hypot(p.x - b.pos.x, p.y - b.pos.y) < W / 12)) {
      return;
    }
    labelled.push(b.pos);
    // Toward the middle, so a name near the edge is not cut off by it.
    const right = b.pos.x > W * 0.3;
    const text = svgEl('text', {
      class: 'builder-label',
      x: b.pos.x + (right ? -1.6 : 1.6) * r,
      y: -b.pos.y - r * 1.6,
      'font-size': W / 16,
      'text-anchor': right ? 'end' : 'start',
    });
    text.textContent = names[i];
    svg.append(text);
  });
  return svg;
}

/** A period in the unit a reader would quote it in. */
function periodText(days) {
  return days < 1000
    ? t('builder.period.days', { value: fmt(days) })
    : t('builder.period.years', { value: fmt(days / 365.25) });
}

const au = v => v / 100;

function renderTable(built, names) {
  const body = $('systemBuilderTableBody');
  if (!body) return;
  body.textContent = '';
  for (const o of built?.orbits ?? []) {
    const tr = document.createElement('tr');
    const primary =
      o.inner.length > 1
        ? t('builder.inner', { name: names[o.primary] })
        : names[o.primary];
    const cells = [
      String(o.order),
      names[o.index],
      primary,
      periodText(o.periodDays),
      fmt(au(o.periapsis)),
      fmt(au(o.apoapsis)),
      fmt(au(o.reflexA)),
    ];
    cells.forEach((text, i) => {
      const td = document.createElement(i === 1 ? 'th' : 'td');
      if (i === 1) td.scope = 'row';
      td.textContent = text;
      tr.append(td);
    });
    body.append(tr);
  }
}

/** A check or a system-wide complaint, in words. */
function checkText(check, names) {
  const vars = { ...check.vars };
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'number') vars[k] = fmt(v);
  }
  const [first, second] = check.bodies ?? [];
  vars.first = names[first];
  vars.second = names[second];
  let text = t(check.key, vars);
  if (check.vars?.inRange === false) text += ` ${t('builder.check.fitRange')}`;
  return t(
    check.level === 'error' ? 'builder.checks.error' : 'builder.checks.caution',
    { text }
  );
}

function renderChecks({ verdict, built }, names) {
  const list = $('systemBuilderChecks');
  if (!list) return;
  list.textContent = '';
  const items = [
    ...verdict.errors
      .filter(e => e.index < 0)
      .map(e => ({ level: 'error', key: e.key, vars: e.vars, bodies: [] })),
    ...(built?.checks ?? []),
  ];
  for (const check of items) {
    const li = document.createElement('li');
    li.dataset.level = check.level;
    li.textContent = checkText(check, names);
    list.append(li);
  }
  if (!items.length && built) {
    const li = document.createElement('li');
    li.textContent = t('builder.checks.none');
    list.append(li);
  }
  const settings = $('systemBuilderSettingsNote');
  if (settings) {
    settings.hidden = !built;
    if (built) {
      settings.textContent = t('builder.note.settings', {
        step: fmt(built.settings.max_timestep),
        soft: fmt(built.settings.min_interaction_distance),
      });
    }
  }
}

/** Recompute everything that follows from what is typed. */
function refresh() {
  clearTimeout(refreshTimer);
  if (!rows) return;
  current = evaluate();
  const { verdict, built } = current;
  showFieldErrors(verdict);
  const names = current.input.bodies.map(b => b.name);

  for (const row of rows) {
    const hint = $(hintId(row.key, 'radius'));
    if (hint) {
      hint.textContent = radiusHint(row);
      hint.hidden = !hint.textContent;
    }
  }

  const preview = $('systemBuilderPreview');
  const label = $('systemBuilderPreviewLabel');
  if (preview) {
    preview.textContent = '';
    if (built) {
      preview.append(previewSvg(built, names));
      if (label) {
        label.textContent = t('builder.preview.label', {
          count: built.bodies.length,
          width: fmt(au(2 * built.extent)),
        });
      }
    } else if (label) {
      label.textContent = t('builder.preview.none');
    }
  }
  renderTable(built, names);
  renderChecks(current, names);

  const residuals = $('systemBuilderResiduals');
  if (residuals) {
    residuals.hidden = !built;
    if (built) {
      residuals.textContent = t('builder.residuals', {
        worst: fmt(Math.max(built.residuals.a, built.residuals.e, 1e-16), 2),
        momentum: fmt(Math.max(built.residuals.momentum, 1e-16), 2),
      });
    }
  }
}

const scheduleRefresh = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 120);
};

function setStatus(message) {
  const status = $('systemBuilderStatus');
  if (status) status.textContent = message;
}

// --- Actions ------------------------------------------------------------------

/**
 * Validate for an action that needs a whole system, and say what stops it.
 * @returns {boolean} Whether the fields are all usable
 */
function readyOrExplain() {
  showErrors = true;
  refresh();
  const { verdict } = current;
  if (verdict.ok) return true;
  const first = verdict.errors.find(e => e.index >= 0);
  if (first) $(fieldId(rows[first.index].key, first.field))?.focus();
  else $('systemBuilderChecksHeading')?.focus();
  announce(t('builder.invalid', { count: verdict.errors.length }));
  return false;
}

function build() {
  if (!readyOrExplain()) return;
  const { verdict, built } = current;
  if (built.checks.some(c => c.level === 'error')) {
    announce(t('builder.blocked'));
    $('systemBuilderChecksHeading')?.focus();
    return;
  }
  const count = installSystem(
    {
      bodies: built.bodies,
      settings: built.settings,
      seed: systemSeed(verdict.bodies),
      extent: built.extent,
    },
    deps.kit
  );
  closeDialog($('systemBuilderDialog'), 'apply');
  announce(t('builder.built', { count }));
}

function saveFile() {
  if (!readyOrExplain()) return;
  const { verdict, built } = current;
  const data = systemToFile(verdict.bodies, built);
  const slug =
    (verdict.bodies[0].name || 'system')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'system';
  const file = `${slug}.gravitas-system.json`;
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus(t('builder.file.saved', { file }));
}

async function openFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    setStatus(t('builder.file.unreadable'));
    return;
  }
  const read = systemFromFile(data);
  if (!read.ok) {
    setStatus(t(read.key, read.vars));
    return;
  }
  rows = rowsFrom(read.system.bodies);
  showErrors = true;
  renderBodies();
  refresh();
  let message = t('builder.file.loaded', { count: rows.length });
  if (current.built && !initialStateMatches(data, current.built)) {
    message += ` ${t('builder.file.drift')}`;
  }
  setStatus(message);
}

function addCompanion() {
  if (rows.length >= MAX_BODIES) return;
  const root = rows[0].key;
  const widest = Math.max(
    0,
    ...rows.filter(r => r.primary === root).map(r => Number(r.a) || 0)
  );
  const [row] = rowsFrom([
    {
      type: 'Planet',
      mass: 1,
      a: widest ? Number((widest * 1.6).toPrecision(3)) : 1,
    },
  ]);
  row.primary = root;
  rows.push(row);
  renderBodies();
  refresh();
  $(fieldId(row.key, 'name'))?.focus();
}

function removeBody(key) {
  const index = rows.findIndex(r => r.key === key);
  if (index <= 0) return;
  const [gone] = rows.splice(index, 1);
  // Its companions go round what it went round, rather than being left
  // pointing at nothing.
  for (const r of rows) if (r.primary === key) r.primary = gone.primary;
  const name = displayName(gone, index);
  renderBodies();
  refresh();
  $('systemBuilderAdd')?.focus();
  setStatus(t('builder.removed', { name }));
}

/**
 * Replace the world with a built system.
 *
 * Settings start from the defaults rather than from whatever scenario was
 * open, because that is what a shared link of this world is measured against
 * (js/shareState.js's pristineSettingsFor('None')), and the system's own go
 * on top. The build then runs as a scenario's does - clock, conservation
 * baseline, absorption ledger and world generation all reset - under a seed
 * derived from the system, and each body is made by its own class from its
 * physical mass, so a star has the color and temperature that mass gives it.
 * Exported because Refresh Scenario builds a built system again through it.
 *
 * @param {object} system - {bodies, settings, seed, extent}
 * @param {object} kit - {rebuild, constructBody, finish} from js/ui.js. What
 *   the kit does rather than an import: js/vectorOverlay.js, say, lives in the
 *   render chunk every lesson loads, and a second importer would split it out.
 * @returns {number} How many bodies were built
 */
export function installSystem(system, kit) {
  setSettings({
    ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    quality_tier: SETTINGS.quality_tier ?? DEFAULT_SETTINGS.quality_tier,
    ...system.settings,
    preset_scenario: 'None',
  });
  setScenarioName('None');
  kit.rebuild(system.seed);
  $('scenarioInfoDisplay')?.classList.remove('visible');

  let count = 0;
  withSeed(system.seed, () => {
    for (const b of system.bodies) {
      const obj = kit.constructBody(
        { ...b.pos },
        { ...b.vel },
        b.type,
        b.constructorMass
      );
      if (!obj) continue;
      if (b.radiusGiven) obj.radius = b.radius;
      if (b.name) obj.name = b.name;
      // A wide system is the point of building one: the distance cull must
      // not delete its outer bodies when somebody zooms in on the inner ones.
      obj.persistent = true;
      count++;
    }
  });
  bumpWorldGeneration();
  updatePhysicsSettings(SETTINGS);
  resetConservationBaseline();

  const canvas = $('simulationCanvas');
  const span = Math.min(canvas?.width || 0, canvas?.height || 0);
  if (span > 0 && system.extent > 0) state.zoom = (0.42 * span) / system.extent;
  state.pan = { x: 0, y: 0 };
  state.paused = false;
  kit.finish(system);
  window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));
  return count;
}

// --- The dialog ---------------------------------------------------------------

function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else node.setAttribute(k, v);
  }
  if (text) node.textContent = text;
  return node;
}

/** Build the dialog once; its words are written by localize(). */
function mount() {
  let panel = $('systemBuilderDialog');
  if (panel) return panel;
  panel = el('div', {
    id: 'systemBuilderDialog',
    className: 'modal-panel builder-dialog hidden',
    role: 'dialog',
    'aria-labelledby': 'systemBuilderTitle',
    'aria-describedby': 'systemBuilderIntro',
  });
  panel.hidden = true;
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.append(style);

  const templateRow = el('div', { className: 'precise-row builder-template' });
  templateRow.append(
    el('label', {
      for: 'systemBuilderTemplate',
      id: 'systemBuilderTemplateLabel',
    }),
    el('select', { id: 'systemBuilderTemplate', className: 'precise-input' }),
    el('button', {
      id: 'systemBuilderTemplateApply',
      type: 'button',
      className: 'ui-button',
    })
  );

  const tableScroll = el('div', {
    className: 'export-table-scroll',
    tabindex: '0',
    'aria-labelledby': 'systemBuilderTableHeading',
  });
  const table = el('table', { className: 'series-table' });
  const caption = el('caption', {
    id: 'systemBuilderTableCaption',
    className: 'export-table-caption',
  });
  const head = el('thead');
  const headRow = el('tr', { id: 'systemBuilderTableHead' });
  head.append(headRow);
  table.append(caption, head, el('tbody', { id: 'systemBuilderTableBody' }));
  tableScroll.append(table);

  const actions = el('div', { className: 'precise-actions' });
  const fileInput = el('input', {
    id: 'systemBuilderFile',
    type: 'file',
    accept: 'application/json,.json',
    hidden: '',
  });
  actions.append(
    el('button', {
      id: 'systemBuilderBuild',
      type: 'button',
      className: 'ui-button is-primary',
    }),
    el('button', {
      id: 'systemBuilderSave',
      type: 'button',
      className: 'ui-button',
    }),
    el('button', {
      id: 'systemBuilderOpen',
      type: 'button',
      className: 'ui-button',
    }),
    el('button', {
      id: 'systemBuilderClose',
      type: 'button',
      className: 'ui-button',
    }),
    fileInput
  );

  panel.append(
    el('h2', { id: 'systemBuilderTitle' }),
    el('p', { id: 'systemBuilderIntro', className: 'precise-intro' }),
    templateRow,
    el('div', { id: 'systemBuilderBodies' }),
    el('button', {
      id: 'systemBuilderAdd',
      type: 'button',
      className: 'ui-button',
    }),
    el('h3', { id: 'systemBuilderPreviewHeading' }),
    el('p', { id: 'systemBuilderPreviewCaption', className: 'precise-hint' }),
    el('p', { id: 'systemBuilderPreviewLabel', className: 'precise-hint' }),
    el('div', { id: 'systemBuilderPreview', className: 'builder-preview' }),
    el('h3', { id: 'systemBuilderTableHeading' }),
    tableScroll,
    el('p', { id: 'systemBuilderResiduals', className: 'precise-hint' }),
    el('h3', { id: 'systemBuilderChecksHeading', tabindex: '-1' }),
    el('ul', { id: 'systemBuilderChecks', className: 'builder-checks' }),
    el('p', { id: 'systemBuilderOsculating', className: 'precise-hint' }),
    el('p', { id: 'systemBuilderProof', className: 'precise-hint' }),
    el('p', { id: 'systemBuilderSettingsNote', className: 'precise-hint' }),
    el('p', {
      id: 'systemBuilderStatus',
      className: 'precise-status',
      role: 'status',
      'aria-live': 'polite',
    }),
    actions
  );
  document.body.append(panel);

  const bodies = $('systemBuilderBodies');
  bodies.addEventListener('input', event => {
    const { key, field } = event.target.dataset;
    const row = rows.find(r => r.key === key);
    if (!row || event.target.tagName !== 'INPUT') return;
    row[field] = event.target.value;
    scheduleRefresh();
  });
  bodies.addEventListener('change', event => {
    const { key, field } = event.target.dataset;
    const row = rows.find(r => r.key === key);
    if (!row) return;
    if (field === 'direction')
      row.retrograde = event.target.value === 'retrograde';
    else row[field] = event.target.value;
    // A new type changes the mass unit and the radius rule; a new name
    // changes every list that offers this body as a primary.
    if (field === 'type' || field === 'name') renderBodies();
    refresh();
  });
  bodies.addEventListener('click', event => {
    const key = event.target.closest?.('[data-remove]')?.dataset.remove;
    if (key) removeBody(key);
  });

  $('systemBuilderTemplateApply').addEventListener('click', () => {
    const id = $('systemBuilderTemplate').value;
    if (!TEMPLATES[id]) return;
    rows = templateRows(id);
    showErrors = false;
    renderBodies();
    refresh();
    setStatus(
      t('builder.template.applied', { name: t(`builder.template.${id}`) })
    );
  });
  $('systemBuilderAdd').addEventListener('click', addCompanion);
  $('systemBuilderBuild').addEventListener('click', build);
  $('systemBuilderSave').addEventListener('click', saveFile);
  $('systemBuilderOpen').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) openFile(file);
  });
  $('systemBuilderClose').addEventListener('click', () =>
    closeDialog(panel, 'close')
  );
  return panel;
}

/** Write every fixed word in the dialog, in the locale now in use. */
function localize() {
  const text = {
    systemBuilderTitle: 'builder.title',
    systemBuilderIntro: 'builder.intro',
    systemBuilderTemplateLabel: 'builder.template.label',
    systemBuilderTemplateApply: 'builder.template.apply',
    systemBuilderAdd: 'builder.add',
    systemBuilderPreviewHeading: 'builder.preview.heading',
    systemBuilderPreviewCaption: 'builder.preview.caption',
    systemBuilderTableHeading: 'builder.table.heading',
    systemBuilderTableCaption: 'builder.table.caption',
    systemBuilderChecksHeading: 'builder.checks.heading',
    systemBuilderOsculating: 'builder.note.osculating',
    systemBuilderProof: 'builder.note.proof',
    systemBuilderBuild: 'builder.build',
    systemBuilderSave: 'builder.export',
    systemBuilderOpen: 'builder.import',
    systemBuilderClose: 'builder.close',
  };
  for (const [id, key] of Object.entries(text)) {
    const node = $(id);
    if (node) node.textContent = t(key);
  }
  const templates = $('systemBuilderTemplate');
  const chosen = templates.value || 'starPlanet';
  templates.textContent = '';
  for (const id of Object.keys(TEMPLATES)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = t(`builder.template.${id}`);
    templates.append(option);
  }
  templates.value = chosen;
  const head = $('systemBuilderTableHead');
  head.textContent = '';
  for (const key of [
    'order',
    'body',
    'primary',
    'period',
    'periapsis',
    'apoapsis',
    'offset',
  ]) {
    head.append(el('th', { scope: 'col' }, t(`builder.col.${key}`)));
  }
}

/**
 * Open the Orbital System Builder.
 *
 * @param {object} opts - What the coordinator hands down
 * @param {object} opts.kit - {rebuild, constructBody, finish} from js/ui.js
 * @param {HTMLElement} [opts.trigger] - What to give focus back to
 */
export async function openSystemBuilder({ kit, trigger } = {}) {
  if (!kit) return;
  // The sandbox default, whatever the scenario on screen happens to run at.
  deps = { kit, G: DEFAULT_SETTINGS.gravitational_constant };
  await ensureBuilderMessages().catch(() => {});
  const panel = mount();
  localize();
  rows ??= templateRows('starPlanet');
  setStatus('');
  renderBodies();
  refresh();
  openDialog(panel, { trigger, initialFocus: '#systemBuilderTemplate' });
}
