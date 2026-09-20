// =============================================================================
// Building a system by typing it
// -----------------------------------------------------------------------------
// The keyboard could already place a body - js/ui.js has beginKeyboardPlacement()
// and it drives the same state a drag does - but only by aiming. Arrow keys move
// a point across the canvas, the point becomes a world position through
// screen_to_world, and so where the body lands depends on the zoom and the pan.
// There is no way to say "at x = 140, moving at 2.4" and no way to set a mass at
// all. That interface is operable without a pointer and still not usable without
// sight, which are different things.
//
// This is the form. It asks for the same three facts the pointer path produces -
// position, velocity, mass - and hands them to placeBody(), which is the single
// function the mouse, the touch and the keyboard-aim paths all already call. No
// second creation path, no second schema, nothing here that knows how a Comet
// differs from an Asteroid. js/place/preciseFields.js holds the field list and
// the validation and is pure; this file is the DOM around it.
//
// Loaded on demand. It is worth a few kilobytes and nobody who never opens it
// should pay for it, which matters more than usual here: the deferred bundle
// has only a little headroom left and this is not the feature to spend it on by
// default.
//
// placeBody is passed in rather than imported. It lives in js/ui.js, which is
// the coordinator; a feature module reaching back up to it would be, in the
// words of tools/check-architecture.mjs, "the same tangle with an extra file".
// The coordinator loads this module and hands the function down, which is the
// direction the dependency is supposed to run.
//
// Errors are attached to their own field through aria-describedby rather than
// gathered into a summary at the top. A reader who tabs into a broken field
// hears what is wrong with THAT field, which is the difference between a form
// that tells you something and one that tells you there are three problems
// somewhere.
// =============================================================================

import { t, getLocale, registerMessages } from './i18n/index.js';
import { openDialog, closeDialog } from './dialog.js';
import { announce } from './notify.js';
import { SETTINGS } from './appState.js';
import { SOLAR_MASS_UNIT } from './physics.js';
import {
  LIMITS,
  MASS_FIELD,
  PLACEABLE_TYPES,
  STATE_FIELDS,
  TYPE_NAME_KEY,
  simToAu,
  validatePlacement,
} from './place/preciseFields.js';

/**
 * Bring in this feature's own strings, for the locale in use.
 *
 * They are not in the deferred catalog, and that is deliberate: four separate
 * bundles embed that catalog, so fifty strings added there are downloaded four
 * times by the reader who needs them and three times by readers who cannot
 * reach the feature at all. That accounted for the whole of a deferred-budget
 * overrun when these strings first landed. The same split js/i18n/en.activities.js
 * made, for the same reason.
 *
 * @returns {Promise<void>} Resolves once t() can answer
 */
export async function ensurePlacementMessages() {
  const locale = getLocale();
  const module =
    locale === 'es'
      ? await import('./i18n/es.placement.js')
      : await import('./i18n/en.placement.js');
  registerMessages(locale, module.ES_PLACEMENT || module.EN_PLACEMENT);
}

const $ = id => document.getElementById(id);

/** The last values, so reopening the form does not throw away a near-miss. */
let remembered = null;

/** Field ids are stable so a label, an error and a test can all find them. */
const fieldId = key => `precisePlace-${key}`;
const errorId = key => `precisePlace-${key}-error`;

/**
 * One labelled number input, with somewhere for its error to go.
 *
 * @param {string} key - Field key, e.g. 'x' or 'mass'
 * @param {string} label - Already translated
 * @param {string} hint - Already translated, or ''
 * @param {string} value - Initial value
 * @returns {HTMLElement} The row
 */
function numberRow(key, label, hint, value) {
  const row = document.createElement('div');
  row.className = 'precise-row';

  const lab = document.createElement('label');
  lab.htmlFor = fieldId(key);
  lab.textContent = label;

  const input = document.createElement('input');
  input.id = fieldId(key);
  input.type = 'text';
  // Not type="number". A spin button announces itself as one and then refuses
  // to tell a screen reader what is wrong with what was typed, because an
  // invalid number in a number field reads back as an empty value - the reader
  // is told the field is blank when it plainly is not. inputmode gets the right
  // keypad on a phone without any of that.
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.className = 'precise-input';
  input.value = value ?? '';
  input.dataset.field = key;

  const err = document.createElement('p');
  err.id = errorId(key);
  err.className = 'precise-error';
  err.hidden = true;

  const described = [];
  if (hint) {
    const note = document.createElement('p');
    note.id = `${fieldId(key)}-hint`;
    note.className = 'precise-hint';
    note.textContent = hint;
    described.push(note.id);
    row.append(lab, input, note, err);
  } else {
    row.append(lab, input, err);
  }
  // The hint is always described; the error joins it only when there is one, so
  // a clean field does not announce an empty paragraph.
  input.dataset.describedBase = described.join(' ');
  if (described.length)
    input.setAttribute('aria-describedby', described.join(' '));
  return row;
}

/**
 * Put an error on a field, or take it off.
 *
 * @param {string} key - Field key
 * @param {string} message - Translated text, or '' to clear
 */
function setFieldError(key, message) {
  const input = $(fieldId(key));
  const err = $(errorId(key));
  if (!input || !err) return;
  err.textContent = message;
  err.hidden = !message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  const base = input.dataset.describedBase || '';
  const ids = message ? `${base} ${errorId(key)}`.trim() : base;
  if (ids) input.setAttribute('aria-describedby', ids);
  else input.removeAttribute('aria-describedby');
}

/** What is typed right now, by field key. */
function readForm() {
  const values = {};
  for (const { key } of STATE_FIELDS)
    values[key] = $(fieldId(key))?.value ?? '';
  values.mass = $(fieldId('mass'))?.value ?? '';
  return values;
}

/** Update the read-only "= n AU" text under the position fields. */
function refreshAuHint() {
  const el = $('precisePlaceAu');
  if (!el) return;
  const x = Number($(fieldId('x'))?.value);
  const y = Number($(fieldId('y'))?.value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    el.textContent = '';
    return;
  }
  el.textContent = t('place.precise.auHint', {
    x: simToAu(x).toFixed(3),
    y: simToAu(y).toFixed(3),
  });
}

/** Build the whole form for the currently chosen type. */
function renderFields(type) {
  const host = $('precisePlaceFields');
  if (!host) return;
  host.textContent = '';

  const unitLabel = kind =>
    kind === 'position'
      ? t('place.precise.unit.length')
      : t('place.precise.unit.speed');

  // The bound is stated on the first field of each pair rather than on all
  // four: a reader tabbing through does not need to be told the same number
  // twice, and the error message repeats it if they hit it anyway.
  for (const [index, { key, kind }] of STATE_FIELDS.entries()) {
    const firstOfKind = STATE_FIELDS.findIndex(f => f.kind === kind) === index;
    host.append(
      numberRow(
        key,
        t(`place.precise.field.${key}`, { unit: unitLabel(kind) }),
        firstOfKind
          ? t('place.precise.limitHint', { limit: LIMITS[kind] })
          : '',
        remembered?.[key] ?? '0'
      )
    );
  }

  const au = document.createElement('p');
  au.id = 'precisePlaceAu';
  au.className = 'precise-hint';
  host.append(au);

  const spec = MASS_FIELD[type];
  host.append(
    numberRow(
      'mass',
      t('place.precise.field.mass', {
        unit: t(`place.precise.mass.${spec.unit}`),
      }),
      t('place.precise.massHint', {
        min: spec.min,
        max: spec.max,
        placeholder: spec.placeholder,
      }),
      remembered?.mass ?? ''
    )
  );

  for (const input of host.querySelectorAll('input')) {
    input.addEventListener('input', () => {
      setFieldError(input.dataset.field, '');
      refreshAuHint();
    });
  }
  refreshAuHint();
}

/** Fill the type selector from the same eight types placeBody() knows. */
function renderTypes(select) {
  select.textContent = '';
  for (const type of PLACEABLE_TYPES) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = t(TYPE_NAME_KEY[type]);
    select.append(option);
  }
  select.value = PLACEABLE_TYPES.includes(SETTINGS.input_object_type)
    ? SETTINGS.input_object_type
    : 'Planet';
}

/**
 * Validate, and either place a body or report what is wrong.
 *
 * @param {Function} placeBody - js/ui.js's placeBody, handed down by the coordinator
 */
function submit(placeBody) {
  const type = $('precisePlaceType')?.value;
  const values = readForm();
  remembered = { ...values };

  for (const { key } of STATE_FIELDS) setFieldError(key, '');
  setFieldError('mass', '');

  const verdict = validatePlacement(type, values);
  if (!verdict.ok) {
    for (const e of verdict.errors) setFieldError(e.field, t(e.key, e.vars));
    const first = verdict.errors[0];
    // Focus the first broken field. A reader who submits and is left where they
    // were has to hunt for what happened.
    $(fieldId(first.field))?.focus();
    announce(t('place.precise.invalid', { count: verdict.errors.length }));
    return;
  }

  // BlackHole is the one constructor that counts in simulation units. Converted
  // here and nowhere else, which is what js/place/preciseFields.js says.
  const mass =
    verdict.mass === null
      ? null
      : type === 'BlackHole'
        ? verdict.mass * SOLAR_MASS_UNIT
        : verdict.mass;

  const obj = placeBody(verdict.at, verdict.vel, type, mass);
  if (!obj) {
    setFieldError('x', t('place.precise.error.failed'));
    announce(t('place.precise.error.failed'));
    return;
  }

  // Same event the pointer path fires, so the undo stack has it: placeBody
  // dispatches it, and nothing extra is needed here.
  announce(
    t('place.precise.placed', {
      type: t(TYPE_NAME_KEY[type]),
      x: verdict.at.x,
      y: verdict.at.y,
    })
  );
  const status = $('precisePlaceStatus');
  if (status) {
    status.textContent = t('place.precise.placedShort', {
      type: t(TYPE_NAME_KEY[type]),
      x: verdict.at.x,
      y: verdict.at.y,
    });
  }
  // The dialog stays open. Building a system means placing several bodies, and
  // a form that closes after each one turns a three-body system into three
  // trips through the same menu.
  $(fieldId('x'))?.focus();
}

/**
 * Open the precise-placement dialog.
 *
 * @param {object} deps - What the coordinator hands down
 * @param {Function} deps.placeBody - js/ui.js's placeBody, the one creation path
 * @param {HTMLElement} [deps.trigger] - What to give focus back to
 */
export async function openPrecisePlacement({ placeBody, trigger } = {}) {
  const panel = $('precisePlaceDialog');
  if (!panel || typeof placeBody !== 'function') return;
  // Awaited before anything is rendered: a form whose labels are message ids
  // for a moment is worse than one that takes a moment to appear.
  await ensurePlacementMessages().catch(() => {});

  const select = $('precisePlaceType');
  if (select && !select.dataset.ready) {
    renderTypes(select);
    select.addEventListener('change', () => {
      // Keep what was typed; only the mass unit and its bounds change.
      remembered = { ...readForm() };
      renderFields(select.value);
    });
    select.dataset.ready = '1';
  }
  renderFields(select?.value || 'Planet');

  const status = $('precisePlaceStatus');
  if (status) status.textContent = '';

  // Wired once. openPrecisePlacement runs on every open, so registering these
  // each time would add a listener per previous open and place that many bodies
  // on the next submit. The first version of this also passed `submit` straight
  // to addEventListener, which handed it the click event as its placeBody
  // argument - it threw "placeBody is not a function" on the first real use.
  if (!panel.dataset.wired) {
    $('precisePlaceSubmit')?.addEventListener('click', () => submit(placeBody));
    $('precisePlaceClose')?.addEventListener('click', () =>
      closeDialog(panel, 'close')
    );
    // Enter anywhere in the form submits, which is what a form does.
    panel.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target?.tagName === 'INPUT') {
        event.preventDefault();
        submit(placeBody);
      }
    });
    panel.dataset.wired = '1';
  }

  openDialog(panel, { trigger, initialFocus: '#precisePlaceType' });
}
