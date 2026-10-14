// =============================================================================
// Adding bodies: placement by pointer and keyboard, and the object picker
// -----------------------------------------------------------------------------
// From js/ui.js: keyboard-aimed placement, placeBody and constructBody, the type
// names and the rail's type button, canvas pointer input with the trajectory
// preview, and the picker popover with its armed state and placement status.
// Part two (below) is the scenario panel loader, folded in to pay for this
// file's request.
//
// Never imports ui.js. The one thing it needs of it, the canvas, comes in as a
// context object passed to initPlacement(ctx) (CONTRIBUTING.md, Module
// boundaries); the speed and screenshot keys call js/captureMeasure.js.
// Nothing touches an element at import: initPlacement(ctx) and
// initObjectPicker() register the listeners where ui.js's own start-up code ran
// them, so listener order is unchanged. They live as long as the page, so there
// is no mount and no js/listeners.js.
// =============================================================================

import {
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  screen_to_world,
  Planet,
  StarObject,
  Asteroid,
  GasGiant,
  NeutronStar,
  WhiteDwarf,
  Comet,
  BlackHole,
  comets,
  planets,
  asteroids,
  gas_giants,
  SOLAR_MASS_UNIT,
  findObjectAtPosition,
} from './physics.js';
import { SETTINGS, state, current_scenario_name } from './appState.js';
import { announce } from './notify.js';
import { t, onLocaleChange } from './i18n/index.js';
import { registerShortcut } from './shortcuts.js';
import { glyphMarkup } from './inspectorView.js';
import {
  toolsPointerDown,
  toolsPointerMove,
  toolsPointerUp,
} from './sandboxTools.js';
import { showObjectInspector, hideObjectInspector } from './inspectorWindow.js';
import { worldToScreen, debugLog } from './utils.js';
import { resetFollowCamera } from './followCamera.js';
import {
  adjustSimSpeed,
  updateSpeedDisplay,
  takeScreenshot,
} from './captureMeasure.js';
import {
  ensureDeferredMessages,
  loadFragment,
  mountFragment,
  unmountFragment,
} from './i18n/deferredMessages.js';

let canvas = null; // set by initPlacement(ctx)

// No global annotation helpers in clean state
// Return attractors sorted by gravitational influence m/r^2
function getDominantAttractors(startPos, limit = 1) {
  const candidates = [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs];
  const G = SETTINGS.gravitational_constant;
  const scored = candidates
    .filter(b => b && b.alive)
    .map(b => {
      const dx = b.pos.x - startPos.x;
      const dy = b.pos.y - startPos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      return { body: b, influence: (G * b.mass) / r2 };
    })
    .sort((a, b) => b.influence - a.influence);
  return scored.slice(0, Math.max(1, limit)).map(s => s.body);
}

function computeCircularVelocity(startPos, body) {
  const G = SETTINGS.gravitational_constant;
  const dx = startPos.x - body.pos.x;
  const dy = startPos.y - body.pos.y;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  const v = Math.sqrt((G * body.mass) / dist);
  const angle = Math.atan2(startPos.y - body.pos.y, startPos.x - body.pos.x);
  const tangent = angle + Math.PI / 2;
  return { x: v * Math.cos(tangent), y: v * Math.sin(tangent) };
}

// Integrate a short trajectory preview under dominant attractors
function computeTrajectoryPreview(
  startPos,
  initialVel,
  useCircularSnap = false
) {
  const bodies = getDominantAttractors(startPos, 1);
  if (bodies.length === 0) return null;
  let vel = { x: initialVel.x, y: initialVel.y };
  // If snapping, replace initial velocity with circular around most influential body
  if (useCircularSnap && bodies[0]) {
    vel = computeCircularVelocity(startPos, bodies[0]);
  }
  const points = [];
  let p = { x: startPos.x, y: startPos.y };
  const dt = 0.12; // preview integration step in sim seconds
  // Adaptive number of steps: fewer when moving slowly, more when fast
  const vPreviewMag = Math.hypot(vel.x, vel.y);
  const stepsBase = 120;
  const stepsK = 0.8; // sensitivity; tune if needed
  const steps = Math.max(
    80,
    Math.min(300, Math.floor(stepsBase + stepsK * vPreviewMag))
  );
  const softening2 = 1e-3;
  const G = SETTINGS.gravitational_constant;
  for (let i = 0; i < steps; i++) {
    const b = bodies[0];
    const dx = b.pos.x - p.x;
    const dy = b.pos.y - p.y;
    const r2 = dx * dx + dy * dy + softening2;
    const invR = 1 / Math.sqrt(r2);
    const aMag = (G * b.mass) / r2;
    const ax = aMag * dx * invR;
    const ay = aMag * dy * invR;
    vel.x += ax * dt;
    vel.y += ay * dt;
    p.x += vel.x * dt;
    p.y += vel.y * dt;
    points.push({ x: p.x, y: p.y });
    // Early stop if far off-screen to save work
    if (Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6) break;
  }
  return { points, velSuggested: vel, attractor: bodies[0] };
}

// Update orbit helper preview during drag (reflects trajectory if released now)
export function updateOrbitHelper(shiftSnap) {
  if (!state.adding_mass || !state.orbit_helper.enabled) {
    state.orbit_helper.preview = null;
    return;
  }
  // Compute initial velocity from current drag vector (same scaling as placement)
  const current = screen_to_world(state.mouse);
  const initialVel = {
    x: (current.x - state.add_start_world.x) * 3,
    y: (current.y - state.add_start_world.y) * 3,
  };
  state.orbit_helper.preview = computeTrajectoryPreview(
    state.add_start_world,
    initialVel,
    !!shiftSnap
  );
}

// =============================================================================
// Placing a body without a pointer
// -----------------------------------------------------------------------------
// This drives the same state the drag does (`state.adding_mass`,
// `state.add_start_world/screen`, `state.mouse`, which js/render.js reads to
// draw the placement line and arrow), so the keyboard gets that preview and
// cannot drift from what a dragging reader sees. Committing calls placeBody(),
// with the same velocity scale as the mouse.
// =============================================================================

/** How far one arrow press moves the aim, in canvas pixels. */
const AIM_STEP = 24;
/** Shift for a bigger stride, Alt for a finer one. */
const AIM_COARSE = 4;
const AIM_FINE = 0.25;

/** Null when the keyboard is not placing anything. */
let keyboardAim = null;

/** @returns {boolean} Whether a keyboard placement is in progress */
export const keyboardPlacementActive = () => keyboardAim !== null;

/**
 * Start placing a body from the keyboard, aimed from the middle of the view.
 *
 * @returns {boolean} Whether it started
 */
export function beginKeyboardPlacement() {
  if (!placementArmed()) {
    announce(t('place.keyboard.notArmed'));
    return false;
  }
  if (keyboardAim) return true;
  // Canvas pixels, not CSS pixels. state.mouse and screen_to_world both work in
  // the backing store's coordinates, and the two have differed since the low
  // tier shipped at 0.7 - this placed the keyboard aim off-centre by the same
  // factor, and a device-pixel ratio above 1 widens the gap rather than
  // creating it. canvasPoint() converts the same way for pointer events.
  const at = { x: canvas.width / 2, y: canvas.height / 2 };
  state.add_start_screen = { ...at };
  state.add_start_world = screen_to_world(at);
  state.mouse.x = at.x;
  state.mouse.y = at.y;
  state.adding_mass = true;
  keyboardAim = { ...at };
  announce(
    t('place.keyboard.started', { type: typeName(SETTINGS.input_object_type) })
  );
  return true;
}

/** Stop without placing anything. */
export function cancelKeyboardPlacement({ quiet = false } = {}) {
  if (!keyboardAim) return false;
  keyboardAim = null;
  state.adding_mass = false;
  state.orbit_helper.preview = null;
  if (!quiet) announce(t('place.keyboard.canceled'));
  return true;
}

/**
 * Commit what is aimed.
 *
 * The velocity is the same expression the mouse path uses - the aim offset in
 * world units, times 1.5 - so a keyboard placement and a drag of the same
 * length produce the same orbit.
 *
 * @returns {?object} The body, or null
 */
export function commitKeyboardPlacement() {
  if (!keyboardAim) return null;
  const end = screen_to_world({ x: state.mouse.x, y: state.mouse.y });
  const vel = {
    x: (end.x - state.add_start_world.x) * 1.5,
    y: (end.y - state.add_start_world.y) * 1.5,
  };
  const at = { ...state.add_start_world };
  keyboardAim = null;
  state.adding_mass = false;
  state.orbit_helper.preview = null;
  const obj = placeBody(at, vel);
  if (obj) {
    announce(
      t('place.keyboard.placed', {
        type: typeName(SETTINGS.input_object_type),
        speed: Math.hypot(vel.x, vel.y).toFixed(1),
      })
    );
  }
  return obj;
}

/**
 * Move the aim, or the start point when nothing has been aimed yet.
 *
 * @param {number} dx - Horizontal, in steps
 * @param {number} dy - Vertical, in steps
 * @param {object} [opts] - {coarse, fine}
 */
function moveKeyboardAim(dx, dy, { coarse = false, fine = false } = {}) {
  if (!keyboardAim) return;
  const step = AIM_STEP * (coarse ? AIM_COARSE : fine ? AIM_FINE : 1);
  // Canvas pixels, like state.mouse, not the CSS box.
  const { width, height } = canvas;
  state.mouse.x = Math.max(0, Math.min(width, state.mouse.x + dx * step));
  state.mouse.y = Math.max(0, Math.min(height, state.mouse.y + dy * step));
}

/**
 * Make one body of the armed type, at a place, with a velocity, and file it.
 *
 * The one place that knows how the eight types are built and which list each
 * belongs in (it was written out twice, and both copies carried the same bug: a
 * hand-placed comet filed as an asteroid). The `instanceof` order is
 * load-bearing and asserted in tests/bodyPlacement.test.js: Comet before Planet,
 * every branch an `else if`.
 *
 * `mass` defaults to null, which every constructor but BlackHole's treats as
 * "randomize", so a click is unchanged to the bit. Only the precise-placement
 * dialog passes a number, in the unit js/place/preciseFields.js names for the
 * type (BlackHole takes simulation units, converted at that call site).
 *
 * @param {{x: number, y: number}} at - Where, in world coordinates
 * @param {{x: number, y: number}} vel - Initial velocity, world units
 * @param {string} [type] - One of the eight; defaults to what is armed
 * @param {?number} [mass] - In the type's own unit; null randomizes as a click does
 * @returns {?object} The body, already in its collection, or null
 */
export function placeBody(
  at,
  vel,
  type = SETTINGS.input_object_type,
  mass = null
) {
  if (
    !Number.isFinite(at?.x) ||
    !Number.isFinite(at?.y) ||
    !Number.isFinite(vel?.x) ||
    !Number.isFinite(vel?.y)
  ) {
    console.warn('Invalid coordinates during object placement:', { at, vel });
    return null;
  }

  const obj = constructBody(at, vel, type, mass);
  if (!obj) return null;

  // Announced rather than called directly: controls.js already imports ui.js,
  // and a direct call back would close an import cycle. The undo stack and the
  // double-tap guard both listen.
  window.dispatchEvent(
    new CustomEvent('gravitasObjectPlaced', { detail: { object: obj } })
  );
  return obj;
}

/**
 * placeBody() without the announcement, for the system builder: a toast and
 * an undo entry per body would describe placements nobody made.
 * @returns {?object} The body, already in its collection, or null
 */
export function constructBody(at, vel, type, mass) {
  // null everywhere it is not given, which is exactly what each constructor's
  // own default is - so this reads as the same call it was.
  const m = Number.isFinite(mass) ? mass : null;
  // Asteroid is the one class whose third argument defaults to 1.0 rather than
  // null, so passing null would change what a click builds. It keeps its own
  // default when nobody asked.
  let obj = null;
  if (type === 'Planet') obj = new Planet(at, vel, m);
  else if (type === 'Star') obj = new StarObject(at, vel, m);
  else if (type === 'Asteroid')
    obj = m === null ? new Asteroid(at, vel) : new Asteroid(at, vel, m);
  else if (type === 'GasGiant') obj = new GasGiant(at, vel, m);
  else if (type === 'NeutronStar') obj = new NeutronStar(at, vel, m, null);
  else if (type === 'WhiteDwarf') obj = new WhiteDwarf(at, vel, m);
  else if (type === 'Comet') obj = new Comet(at, vel, m);
  else if (type === 'BlackHole') {
    // Simulation units here, not solar masses: the caller converts.
    obj = new BlackHole(
      at,
      m === null ? generateRandomBlackHoleMass() : m,
      vel,
      true
    );
  }
  if (!obj) return null;

  // NB: Comet is checked before Asteroid and Planet and lands in `comets`.
  if (obj instanceof Comet) comets.push(obj);
  else if (obj instanceof Planet) planets.push(obj);
  else if (obj instanceof StarObject) stars.push(obj);
  else if (obj instanceof Asteroid) asteroids.push(obj);
  else if (obj instanceof GasGiant) gas_giants.push(obj);
  else if (obj instanceof NeutronStar) neutron_stars.push(obj);
  else if (obj instanceof WhiteDwarf) white_dwarfs.push(obj);
  else if (obj instanceof BlackHole) bh_list.push(obj);
  return obj;
}

const objectTypes = [
  { type: 'Star', label: 'objectType.stars' },
  { type: 'Planet', label: 'objectType.rockyPlanets' },
  { type: 'GasGiant', label: 'objectType.gasGiants' },
  { type: 'Asteroid', label: 'objectType.asteroids' },
  { type: 'Comet', label: 'objectType.comets' },
  { type: 'WhiteDwarf', label: 'objectType.whiteDwarfs' },
  { type: 'NeutronStar', label: 'objectType.neutronStars' },
  { type: 'BlackHole', label: 'objectType.blackHoles' },
];

/** Singular names, for a status line or an announcement. */
const OBJECT_NAME_KEY = Object.freeze({
  Star: 'objectName.star',
  Planet: 'objectName.planet',
  GasGiant: 'objectName.gasGiant',
  Asteroid: 'objectName.asteroid',
  Comet: 'objectName.comet',
  WhiteDwarf: 'objectName.whiteDwarf',
  NeutronStar: 'objectName.neutronStar',
  BlackHole: 'objectName.blackHole',
});

/** The name of a type on its own: 'Comet', not 'Add Comets'. */
export const typeName = type => t(OBJECT_NAME_KEY[type] || 'objectName.star');

/**
 * Which of the eight an object is.
 *
 * By instanceof rather than by obj_type: only four of the eight classes pass
 * an obj_type to the base constructor.
 *
 * @param {object} obj - A physics body
 * @returns {?string} A type key, or null for something not on the list
 */
export const typeKeyOf = obj => {
  if (obj instanceof Comet) return 'Comet';
  if (obj instanceof Planet) return 'Planet';
  if (obj instanceof GasGiant) return 'GasGiant';
  if (obj instanceof StarObject) return 'Star';
  if (obj instanceof Asteroid) return 'Asteroid';
  if (obj instanceof NeutronStar) return 'NeutronStar';
  if (obj instanceof WhiteDwarf) return 'WhiteDwarf';
  if (obj instanceof BlackHole) return 'BlackHole';
  return null;
};

let currentTypeIndex = 0;

// Function to generate random black hole mass based on existing black holes
const generateRandomBlackHoleMass = () => {
  // Find the largest black hole mass in the simulation
  let largestMass = SETTINGS.bh_mass * SOLAR_MASS_UNIT; // Default fallback

  if (bh_list.length > 0) {
    largestMass = Math.max(...bh_list.map(bh => bh.mass));
  }

  // Convert to solar masses for easier calculation
  const largestMassInSuns = largestMass / SOLAR_MASS_UNIT;

  // Generate random mass with normal distribution centered around largest mass
  // Use a wider spread for more variety (±50% of the largest mass)
  const spread = largestMassInSuns * 0.5;
  const minMass = Math.max(1.0, largestMassInSuns - spread); // At least 1 solar mass
  const maxMass = largestMassInSuns + spread;

  // Generate random value with bias toward center (using two random numbers for normal-ish distribution)
  const random1 = Math.random();
  const random2 = Math.random();
  const normalRandom = (random1 + random2) / 2; // Rough approximation of normal distribution

  const randomMassInSuns = minMass + (maxMass - minMass) * normalRandom;
  return randomMassInSuns * SOLAR_MASS_UNIT;
};

export const updateObjectTypeButton = () => {
  const btn = document.getElementById('objectTypeBtn');
  if (!btn) return; // Guard against missing button
  const currentType = objectTypes[currentTypeIndex];
  const armed = document.body.classList.contains('is-adding');
  // Armed, the caption says what the next click will do and how to stop; idle,
  // it says what the button opens. The emoji stays either way so the control
  // keeps its shape in the rail.
  // Idle, the button says what it opens rather than which type is loaded: it
  // is a picker now, and naming one of eight types on a control whose job is to
  // let you choose among them read as though that type were already committed.
  // The emoji still tracks the selection, so the current choice is visible
  // without the caption claiming to be it.
  btn.innerHTML = `${glyphMarkup(currentType.type)}<span></span>`;
  btn.querySelector('span').textContent = armed
    ? t('rail.objectType.placing')
    : t('rail.objectType.choose');
  btn.classList.toggle('is-armed', armed);
  btn.setAttribute('aria-pressed', String(armed));
  // Both captions were English regardless of locale, and the glyph is
  // aria-hidden, so armed the control has to name its type in the accessible
  // name rather than only in the picture.
  btn.title = armed
    ? t('rail.objectType.armedHint', { type: t(currentType.label) })
    : t('rail.objectType.hint');
  btn.setAttribute(
    'aria-label',
    armed
      ? t('rail.objectType.armedHint', { type: t(currentType.label) })
      : t('rail.objectType.label')
  );
  SETTINGS.input_object_type = currentType.type;
};

// --- Pointer input, and the one place CSS pixels become canvas pixels ---------
//
// The canvas backing store is set in js/render.js and can be smaller than its
// CSS box (the low quality tier), so a pointer event, which arrives in CSS
// pixels, is not a canvas coordinate. Everything downstream works in canvas
// pixels, so the conversion happens once, here, asking the canvas itself.
/**
 * A pointer event in canvas coordinates.
 *
 * @param {{clientX: number, clientY: number}} e - A mouse or touch point
 * @returns {{x: number, y: number}} The same point in canvas pixels
 */
export const canvasPoint = e => {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
};

/**
 * A pointer *movement* in canvas pixels.
 *
 * movementX/Y are CSS pixels, and state.pan is in canvas pixels, so a drag at
 * the low tier would move the view more slowly than the cursor without this.
 *
 * @param {{movementX: number, movementY: number}} e - A mouse move
 * @returns {{x: number, y: number}} The movement in canvas pixels
 */
const canvasMovement = e => {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: e.movementX * sx, y: e.movementY * sy };
};

/**
 * True when a key event came from somewhere that owns the keyboard.
 *
 * Kept local rather than imported from shortcuts.js: that module is loaded by
 * controls.js, which imports this one, and a static import here would close the
 * cycle for the sake of one predicate.
 *
 * @param {EventTarget} target - Event target
 * @returns {boolean} True if the user is typing
 */
const isTypingTarget = target => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

// --- Choosing what to add, and meaning to add it -----------------------------
//
// The button opens a picker, choosing a type arms placement, and only then does
// a click on empty space place anything: placement used to be always live, so
// missing a small planet by a few pixels created a star and perturbed the whole
// simulation. Touch already worked this way (a long press arms). Escape
// disarms, as does the button again or placing with `add_once`. The armed state
// is UI state, not a setting: not in a share link, and a rebuilt world starts
// disarmed.
let objectPicker = null;
let objectAddWrap = null;

/** Gap between the trigger and the popover, and from the viewport edge, in px. */
const PICKER_GAP = 8;

/** Below this, a side is too shallow to be worth opening into. */
const PICKER_MIN_USABLE = 140;

/**
 * Put the open picker beside its trigger, inside the viewport.
 *
 * Measured from the trigger's getBoundingClientRect() every time, because the
 * trigger moves: the rail scrolls, the window resizes, a phone rotates, and on
 * a narrow layout the rail slides in and out. Flips above or below depending on
 * which side has room, and caps its height so a long list scrolls internally
 * instead of running off the screen.
 */
const positionObjectPicker = () => {
  const btn = document.getElementById('objectTypeBtn');
  if (!objectPicker || objectPicker.hidden || !btn) return;

  const rect = btn.getBoundingClientRect();
  // clientWidth/clientHeight rather than innerWidth/innerHeight: these exclude
  // a classic scrollbar, which is the difference between "inside the viewport"
  // and "under the scrollbar" on a desktop browser that has one.
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;

  const above = rect.top - PICKER_GAP;
  const below = vh - rect.bottom - PICKER_GAP;

  // Measure unconstrained first: how tall it wants to be decides which side it
  // can use, and a max-height left over from the last placement would answer
  // the wrong question.
  objectPicker.style.maxHeight = 'none';
  const natural = objectPicker.offsetHeight;

  // Above by preference - that is where it has always opened, and the button
  // sits low in the rail - unless it fits below and does not fit above.
  const openUp = natural <= above || above >= below;
  const side = Math.max(0, openUp ? above : below);
  // On a viewport too short for either side, stop trying to dodge the trigger
  // and use the whole window: overlapping the button is a great deal better
  // than a popover the reader cannot see or scroll.
  // Never taller than the viewport, whichever side it opens into. The side
  // measurement alone is not enough: the trigger can be scrolled out of the
  // rail's visible box, in which case its rect reports a position below the
  // window and "the space above it" is larger than the window is.
  const viewportCap = Math.max(0, vh - PICKER_GAP * 2);
  const cap = Math.min(
    side >= PICKER_MIN_USABLE ? side : viewportCap,
    viewportCap
  );
  objectPicker.style.maxHeight = `${Math.round(cap)}px`;

  const height = objectPicker.offsetHeight;
  const width = objectPicker.offsetWidth;

  const left = Math.min(
    Math.max(PICKER_GAP, rect.left),
    Math.max(PICKER_GAP, vw - width - PICKER_GAP)
  );
  let top = openUp ? rect.top - PICKER_GAP - height : rect.bottom + PICKER_GAP;
  top = Math.min(
    Math.max(PICKER_GAP, top),
    Math.max(PICKER_GAP, vh - height - PICKER_GAP)
  );

  objectPicker.style.left = `${Math.round(left)}px`;
  objectPicker.style.top = `${Math.round(top)}px`;
};

/** Is placement currently armed, and with which type. */
let addArmed = false;

/** True while the picker is on screen. */
/**
 * The precise-placement form, fetched the first time somebody asks for it.
 *
 * Deferred for the same reason the dialog machinery is: it is not start-up
 * code, and the bundle it would otherwise sit in has very little room left.
 * placeBody is handed down rather than imported by the module, because a
 * feature module importing this coordinator back is the shape
 * tools/check-architecture.mjs exists to refuse.
 */
let precisePlacementModule = null;
async function openPrecisePlacementDialog(trigger) {
  precisePlacementModule ??= await import('./precisePlacement.js');
  await precisePlacementModule.openPrecisePlacement({ placeBody, trigger });
}

const objectPickerOpen = () => Boolean(objectPicker && !objectPicker.hidden);

const closeObjectPicker = () => {
  if (!objectPicker) return;
  objectPicker.hidden = true;
  document
    .getElementById('objectTypeBtn')
    ?.setAttribute('aria-expanded', 'false');
};

/**
 * Close the narrow-screen rail, now that the reader has chosen something.
 *
 * The rail's own "any button dismisses me" rule no longer fires for
 * `#objectTypeBtn`, because that button opens a menu rather than running a
 * command. Choosing from that menu is the command, so this is where the
 * dismissal moved to. It reads the DOM rather than closing over the rail's own
 * helper because that helper is defined a few hundred lines further down, with
 * the rest of the narrow-screen menu.
 *
 * A no-op on a wide screen: the rail is not in the `is-open` state there.
 */
const dismissRailAfterChoice = () => {
  const rail = document.querySelector('.ui-container');
  if (!rail || !rail.classList.contains('is-open')) return;
  rail.classList.remove('is-open');
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }
};

// The trigger moves with the rail and with the window, so the popover follows
// it. `true` on the scroll listener is the capture phase: the rail is the
// element that actually scrolls, and a scroll event on it does not bubble.
const repositionIfOpen = () => {
  if (objectPickerOpen()) positionObjectPicker();
};

/**
 * Arm or disarm placement.
 *
 * @param {boolean} on - Whether a click on empty canvas should place a body
 */
const setAddArmed = on => {
  // A lesson that locks the world sets interactive_add to false; arming has to
  // respect that rather than route around it.
  addArmed = Boolean(on) && SETTINGS.interactive_add !== false;
  document.body.classList.toggle('is-adding', addArmed);
  if (!addArmed) {
    state.adding_mass = false;
    state.isDragging = false;
    state.isHolding = false;
  }
  updateObjectTypeButton();
  syncPlacementStatus();
};

/** Whether a press on empty canvas should create something. */
export const placementArmed = () =>
  addArmed && SETTINGS.interactive_add !== false;

function syncPlacementStatus() {
  const el = document.getElementById('placementStatus');
  if (!el) return;
  const armed = placementArmed();
  el.hidden = !armed;
  if (!armed) return;
  const type = objectTypes[currentTypeIndex].type;
  const glyph = el.querySelector('.placement-status-glyph');
  if (glyph) glyph.innerHTML = glyphMarkup(type);
  const name = el.querySelector('.placement-status-type');
  if (name) name.textContent = typeName(type);
  positionPlacementStatus();
}

/** How far the status sits from whatever is below it. */
const STATUS_GAP = 8;

/**
 * Put the status above the transport bar, by measuring the bar.
 *
 * A CSS offset cannot do this. The bar's own distance from the bottom is not
 * one number - it changes at the tablet breakpoint and again in an embed - and
 * a status positioned from a guessed constant overlapped the bar by twenty
 * pixels at 768x1024, which is precisely the kind of thing this pass exists to
 * stop doing. So it is measured, the way the object picker is.
 *
 * If there is no room above the bar - a very short window, a lecture display
 * scaled down - the status goes to the top edge instead of on top of the
 * controls.
 */
function positionPlacementStatus() {
  const el = document.getElementById('placementStatus');
  if (!el || el.hidden) return;

  const vh = window.innerHeight || 0;
  const bar = document.getElementById('timelineBar');
  const barRect = bar?.getBoundingClientRect();
  const floor = barRect && barRect.height > 0 ? barRect.top : vh;

  el.style.top = '';
  el.style.bottom = `${Math.max(STATUS_GAP, vh - floor + STATUS_GAP)}px`;

  // Would it be off the top? Then there is no room above the bar, and the top
  // edge is the one place left that is neither a control nor the cursor.
  const rect = el.getBoundingClientRect();
  if (rect.top < STATUS_GAP) {
    el.style.bottom = 'auto';
    el.style.top = `${STATUS_GAP}px`;
  }
}

/**
 * Match the add control to whether placement is allowed at all.
 *
 * Exported for the lesson runner. A step that locks placement clears
 * interactive_add, and placementArmed() honors that on its own - but the
 * crosshair and the lit button would go on promising a click that now does
 * nothing, and the picker would still open, over the lesson panel it is
 * anchored beside on a narrow window. Disabling the button says the same thing
 * once, in the place the reader is looking.
 */
export const syncPlacementAvailability = () => {
  const locked = SETTINGS.interactive_add === false;
  const btn = document.getElementById('objectTypeBtn');
  if (btn) {
    btn.disabled = locked;
    btn.setAttribute('aria-disabled', String(locked));
  }
  if (locked) {
    closeObjectPicker();
    setAddArmed(false);
  }
};

const buildObjectPicker = () => {
  if (!objectPicker) return;
  objectPicker.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'object-picker-grid';
  objectTypes.forEach((entry, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'object-picker-item';
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute(
      'aria-checked',
      String(index === currentTypeIndex && addArmed)
    );
    item.dataset.objectType = entry.type;
    // The glyph is our own constant markup; the name is a translated string and
    // goes in as text.
    item.innerHTML = `${glyphMarkup(entry.type)}<span class="object-picker-name"></span>`;
    item.querySelector('.object-picker-name').textContent = t(entry.label);
    item.onclick = () => {
      currentTypeIndex = index;
      setAddArmed(true);
      closeObjectPicker();
      // Narrow screens only, and only now that a choice has been made: the
      // canvas is what the reader needs next, and the rail is covering it.
      dismissRailAfterChoice();
      // Choosing with the keyboard used to drop focus onto <body>, because the
      // item that had it was inside the popover that just closed. Escape
      // already gave focus back; a choice has to as well - and only when the
      // trigger is still on screen, which on a narrow window it is not.
      const trigger = document.getElementById('objectTypeBtn');
      if (trigger && trigger.offsetParent !== null) trigger.focus();
    };
    list.appendChild(item);
  });
  objectPicker.appendChild(list);

  const stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'object-picker-stop';
  stop.setAttribute('role', 'menuitem');
  stop.textContent = t('rail.objectType.stop');
  stop.onclick = () => {
    setAddArmed(false);
    closeObjectPicker();
    dismissRailAfterChoice();
  };
  objectPicker.appendChild(stop);
};
/**
 * Register the pointer, wheel and key listeners and the keyboard-placement
 * shortcut. Called once by ui.js, where its own start-up code ran them.
 *
 * @param {{canvas: HTMLCanvasElement}} ctx - From ui.js
 */
export function initPlacement(ctx) {
  ({ canvas } = ctx);

  // Its own listener, in the capture phase and before the general shortcut
  // handler, because while a placement is being aimed the arrow keys belong to it
  // rather than to whatever else uses them.
  window.addEventListener(
    'keydown',
    e => {
      if (!keyboardAim) return;
      if (isTypingTarget(e.target)) return;
      const arrows = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (arrows[e.key]) {
        const [dx, dy] = arrows[e.key];
        moveKeyboardAim(dx, dy, { coarse: e.shiftKey, fine: e.altKey });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Enter') {
        commitKeyboardPlacement();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'Escape') {
        cancelKeyboardPlacement();
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // The keyboard equivalent of a click-and-drag placement.
  //
  // Registered here rather than in js/controls.js, which is where the other
  // shortcuts live: controls.js is a feature module and this module is the
  // coordinator, so a shortcut there that reached for beginKeyboardPlacement()
  // would be an upward import - tools/check-architecture.mjs says so, and it is
  // right. The shortcut registry is the seam, and it points the other way.
  registerShortcut({
    keys: 'A',
    match: 'a',
    group: 'Editing',
    label: t('shortcut.placeKeyboard'),
    run: () => {
      if (keyboardPlacementActive()) commitKeyboardPlacement();
      else beginKeyboardPlacement();
    },
  });

  // Event handlers
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;

    // Mark that user has interacted with the page
    state.user_has_interacted = true;

    // Check if click is in UI area - improved detection with buffer zone
    const uiContainer = document.querySelector('.ui-container');
    const uiRect = uiContainer.getBoundingClientRect();
    const bufferZone = 5; // 5px buffer around UI elements

    // Check if click is within the UI container bounds (including buffer zone)
    if (
      e.clientX >= uiRect.left - bufferZone &&
      e.clientX <= uiRect.right + bufferZone &&
      e.clientY >= uiRect.top - bufferZone &&
      e.clientY <= uiRect.bottom + bufferZone
    ) {
      return;
    }

    // The measurement tools get first refusal on the press. A ruler end sitting
    // over a planet has to be grabbable, and without this the click would select
    // the planet underneath it instead - or, on empty space, start dragging a new
    // body into existence out of the handle the user meant to move.
    const pointer = canvasPoint(e);
    if (toolsPointerDown(pointer)) {
      state.isHolding = false;
      state.adding_mass = false;
      state.isDragging = false;
      return;
    }

    const worldPos = screen_to_world(pointer);
    const clickedObject = findObjectAtPosition(worldPos);

    if (clickedObject) {
      // Clicking an existing object should ONLY open inspector, never start add/hold
      state.isHolding = false;
      state.adding_mass = false;
      state.isDragging = false;
      showObjectInspector(clickedObject.object, clickedObject.type);
      return;
    }

    // Only close inspector if we clicked on empty space and inspector is open
    if (state.inspector_open && !clickedObject) {
      hideObjectInspector();
      // Do not add on this click when closing inspector
      return;
    }

    // Set before the guard below, because dragging to pan has to work whether or
    // not this press could place anything.
    state.mouse.down = true;

    // Armed placement only, and that governs the preview as well as the object:
    // a stray click on empty canvas (a near miss on a small body) created a mass
    // that perturbs everything there. The hold state below is part of the gate:
    // set on every press it left a dashed launch line hanging with no object
    // coming. A preview is a promise about what releasing the mouse will do.
    if (!placementArmed()) return;

    // Begin hold for orbit preview on empty space only
    state.isHolding = true;
    state.holdStart = { ...worldPos };
    state.holdCurrent = { ...worldPos };
    // Reset sticky orbit on new hold
    state.stickyOrbit.active = false;
    state.stickyOrbit.centralId = null;
    state.stickyOrbit.snappedVel = null;

    // Validate world coordinates before proceeding
    if (
      isNaN(worldPos.x) ||
      isNaN(worldPos.y) ||
      !isFinite(worldPos.x) ||
      !isFinite(worldPos.y)
    ) {
      console.warn('Invalid world coordinates:', worldPos);
      return;
    }

    state.adding_mass = true;
    state.add_start_screen = { ...pointer };
    state.add_start_world = worldPos;
    // Start drag preview
    state.isDragging = true;
    state.dragStart = { ...worldPos };
    state.dragCurrent = { ...worldPos };
  });

  window.addEventListener('mousemove', e => {
    const moved = canvasPoint(e);
    state.mouse.x = moved.x;
    state.mouse.y = moved.y;
    if (toolsPointerMove(moved)) return;
    if (state.mouse.down && !state.adding_mass) {
      const delta = canvasMovement(e);
      state.pan.x += delta.x;
      state.pan.y += delta.y;
      state.cameraTouchedAt = Date.now();
    }
    if (state.adding_mass) {
      updateOrbitHelper(e.shiftKey);
      // Update drag preview current
      const worldPos = screen_to_world(moved);
      state.dragCurrent = worldPos;
      if (state.isHolding) state.holdCurrent = { ...worldPos };
    }
  });

  window.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    if (toolsPointerUp()) {
      state.mouse.down = false;
      return;
    }
    state.mouse.down = false;
    if (state.adding_mass) {
      state.adding_mass = false;
      state.isDragging = false;
      const add_end_world = screen_to_world(canvasPoint(e));

      // Validate both start and end world coordinates
      if (
        isNaN(add_end_world.x) ||
        isNaN(add_end_world.y) ||
        !isFinite(add_end_world.x) ||
        !isFinite(add_end_world.y) ||
        isNaN(state.add_start_world.x) ||
        isNaN(state.add_start_world.y) ||
        !isFinite(state.add_start_world.x) ||
        !isFinite(state.add_start_world.y)
      ) {
        console.warn('Invalid world coordinates during object placement:', {
          start: state.add_start_world,
          end: add_end_world,
        });
        return;
      }

      let vel = {
        x: (add_end_world.x - state.add_start_world.x) * 1.5,
        y: (add_end_world.y - state.add_start_world.y) * 1.5,
      };
      // If sticky orbit was active at release, use the snapped velocity for stable orbit
      if (state.stickyOrbit.active && state.stickyOrbit.snappedVel) {
        vel = { ...state.stickyOrbit.snappedVel };
      }
      // Snap to circular around dominant body if Shift key is held
      if (state.orbit_helper.enabled && e.shiftKey) {
        const prev = state.orbit_helper.preview;
        if (prev && prev.attractor) {
          vel = computeCircularVelocity(state.add_start_world, prev.attractor);
        }
      }
      placeBody(state.add_start_world, vel);

      // Clear helper after placement
      state.orbit_helper.preview = null;
      // Clear holding flags
      state.isHolding = false;
      state.holdStart = null;
      state.holdCurrent = null;
      // Clear sticky state after placement
      state.stickyOrbit.active = false;
      state.stickyOrbit.centralId = null;
      state.stickyOrbit.snappedVel = null;
    }
  });

  window.addEventListener(
    'wheel',
    e => {
      if (e.target !== canvas) return;
      e.preventDefault();

      // Use a smaller zoom factor for smoother zooming
      const zoomFactor = 1.05; // Reduced from 1.1
      const oldZoom = state.zoom;
      let newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
      newZoom = Math.max(0.01, Math.min(newZoom, 100));

      // Get the world position at the mouse cursor (using current zoom and pan)
      const anchor = canvasPoint(e);
      const worldPos = screen_to_world(anchor);

      // Update zoom
      state.zoom = newZoom;
      state.cameraTouchedAt = Date.now();

      // Calculate where that world position should be on screen with the new zoom
      const newScreenPos = worldToScreen(worldPos, state, canvas);

      // Both in canvas pixels. Mixing the world-to-screen result with a raw
      // clientX here would anchor the zoom to the wrong point at the low tier.
      const deltaX = newScreenPos.x - anchor.x;
      const deltaY = newScreenPos.y - anchor.y;

      state.pan.x -= deltaX;
      state.pan.y -= deltaY;
    },
    { passive: false }
  );

  window.addEventListener('keydown', e => {
    // Typing into a field must not also drive the simulation. This handler binds
    // bare letters, so without the guard writing a planet's name into a lesson
    // answer pans the view on W, A, S and D, pauses on space and fires a
    // screenshot on P. shortcuts.js already guards its own registry the same way;
    // this listener predates it and was never given the check.
    if (isTypingTarget(e.target)) return;
    // A modifier means the key belongs to the browser or the OS, not to us.
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const panSpeed = 40 / state.zoom;
    // Space is deliberately not here: js/controls.js registers it as a shortcut
    // too, so one press ran both and toggled twice. The registered one stays (it
    // resumes from a scrubbed timeline, refreshes the transport bar and is in
    // the shortcuts overlay) and calls preventDefault() before it runs.
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
      state.pan.x += panSpeed;
    else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
      state.pan.x -= panSpeed;
    else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
      state.pan.y += panSpeed;
    else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
      state.pan.y -= panSpeed;
    else if (e.key.toLowerCase() === 'home') {
      state.zoom = 1.0;
      state.pan = { x: 0, y: 0 };
      resetFollowCamera(state);
    } else if (e.key === '-' || e.key === '_') {
      SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
      updateSpeedDisplay();
    } else if (e.key === '=' || e.key === '+') {
      SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
      updateSpeedDisplay();
    } else if (e.key.toLowerCase() === 'p') {
      takeScreenshot();
    } else if (e.key === 'Escape') {
      debugLog('Escape key pressed, inspector_open:', state.inspector_open);
      if (state.inspector_open) {
        hideObjectInspector();
      }
    }
  });
}

/**
 * Wire the object picker, the type button and the placement status. Called once
 * by ui.js, where its own start-up code ran them.
 */
export function initObjectPicker() {
  objectPicker = document.getElementById('objectTypePicker');
  objectAddWrap = document.getElementById('objectAdd');

  // The picker is moved out of the rail and parented to <body>: `.ui-container`
  // scrolls its own overflow, and an overflow container clips absolutely
  // positioned descendants, so the popover was cut off whenever the rail was
  // scrolled. Once at start-up, not on every open. The aria ids do not care
  // where the element lives.
  if (objectPicker && document.body) document.body.appendChild(objectPicker);

  document
    .getElementById('precisePlaceBtn')
    ?.addEventListener('click', event => {
      openPrecisePlacementDialog(event.currentTarget);
    });
  window.addEventListener('resize', repositionIfOpen);
  window.addEventListener('orientationchange', repositionIfOpen);
  window.addEventListener('scroll', repositionIfOpen, true);

  /**
   * Keep the on-canvas placement status matching whether placement is armed.
   *
   * The rail's button already changes when a type is chosen, but on a narrow
   * screen the rail dismisses itself the moment the choice is made, and on a wide
   * one the button is in the far corner from where the reader is about to click.
   * Either way the canvas itself said nothing about being armed, and the next
   * tap made a black hole.
   */
  // The bar it is measured against moves with the window.
  window.addEventListener('resize', () => positionPlacementStatus());
  window.addEventListener('orientationchange', () => positionPlacementStatus());

  // The status carries a translated type name, so it is rebuilt when the reader
  // changes language mid-placement rather than being left in the old one.
  onLocaleChange(() => syncPlacementStatus());

  document.getElementById('objectTypeBtn').onclick = event => {
    event.stopPropagation();
    if (!objectPicker) return;
    // Armed already: the button is the off switch, so a reader who armed by
    // accident can undo it with the control they just used.
    if (addArmed) {
      setAddArmed(false);
      closeObjectPicker();
      return;
    }
    const opening = objectPicker.hidden;
    if (opening) buildObjectPicker();
    objectPicker.hidden = !opening;
    document
      .getElementById('objectTypeBtn')
      ?.setAttribute('aria-expanded', String(opening));
    if (opening) {
      // Placed before focus: focusing an item inside a popover that is still at
      // its last position scrolls the page to wherever that was.
      positionObjectPicker();
      objectPicker.querySelector('.object-picker-item')?.focus();
    }
  };

  document.addEventListener('click', event => {
    if (!objectPickerOpen()) return;
    // Two containers now, because the popover is no longer inside the rail: a
    // click on the trigger is handled above, and a click inside the popover is a
    // choice, not an outside click.
    if (objectAddWrap?.contains(event.target)) return;
    if (objectPicker.contains(event.target)) return;
    closeObjectPicker();
  });

  /**
   * Arrow keys inside the picker.
   *
   * It carries role="menu" and its rows carry role="menuitemradio", which is a
   * promise that Up and Down move between them. Tab still works and still leaves
   * the popover, which is what a reader who wants out expects; this only adds
   * the movement the roles advertise.
   */
  if (objectPicker) {
    objectPicker.addEventListener('keydown', event => {
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const items = [
        ...objectPicker.querySelectorAll(
          '.object-picker-item, .object-picker-stop'
        ),
      ];
      if (!items.length) return;
      const at = items.indexOf(document.activeElement);
      let next;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else if (event.key === 'ArrowDown')
        next = at < 0 ? 0 : (at + 1) % items.length;
      else
        next =
          at < 0 ? items.length - 1 : (at - 1 + items.length) % items.length;
      event.preventDefault();
      items[next].focus();
    });
  }

  // Capture phase, and it stops the event when it handles it.
  //
  // Escape is also a registered shortcut, and that shortcut broadcasts
  // `gravitasEscape`, which among other things closes the narrow-screen rail. In
  // the bubble phase both ran: the picker closed and returned focus to its
  // trigger, and the rail then closed around that trigger, leaving the focus on
  // an element the reader cannot see or reach. Escape should close the topmost
  // thing and stop there, and while this popover is open, it is the topmost
  // thing.
  document.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Escape') return;
      if (objectPickerOpen()) {
        closeObjectPicker();
        document.getElementById('objectTypeBtn')?.focus();
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      // Disarming does not swallow the key: nothing is on screen to dismiss, and
      // a reader pressing Escape with a panel open as well means both.
      if (addArmed) setAddArmed(false);
    },
    true
  );
}

/** Whether a node is inside the picker popover (the rail's outside-click test). */
export const objectPickerContains = node =>
  Boolean(objectPicker && objectPicker.contains(node));

// =============================================================================
// Part two: a scenario's own instrument, loaded when that scenario loads
// (formerly js/scenarioPanelBridge.js, folded in to pay for this module's
// request). The binary-lab and gravity-assist panels mean nothing elsewhere, so
// the start-up path keeps a listener and the import happens with the scenario.
// =============================================================================

/**
 * Which scenarios pull in which chunk, and the host of a panel whose markup
 * ships with it (js/fragments/, INDEX_DECOMPOSITION.md).
 */
const PANELS = [
  {
    scenarios: ['binary-planet-lab', 'circumbinary-planet-lab'],
    // Its markup stays in index.html: lessons and tests drive this panel
    // directly, in the same task as the rebuild that fetches it.
    load: () => import('./binaryRunPanel.js'),
    init: m => m.initBinaryRun(),
  },
  {
    scenarios: ['gravity-assist-lab', 'gravity-assist-heliocentric'],
    host: 'assist',
    load: () => import('./assistPanel.js'),
    init: (m, opts) => m.initAssist(opts),
    teardown: m => m.teardownAssist(),
  },
  {
    scenarios: ['lagrange-point-lab'],
    load: () => import('./cr3bpPanel.js'),
    init: m => m.initCr3bp(),
  },
];

/** Chunks already fetched, so a rebuild does not import twice. */
const loaded = new WeakSet();

/**
 * Load whichever panel the current scenario needs, if any.
 *
 * The panel's own init() wires its DOM and subscribes it to the reset event,
 * so it takes over from here. It is called once per chunk: the panel then
 * handles every subsequent rebuild itself, which is the behavior it already
 * had when it was imported eagerly.
 *
 * @returns {Promise<void>}
 */
async function loadForScenario() {
  const name = current_scenario_name;
  for (const entry of PANELS) {
    if (!entry.scenarios.includes(name)) continue;
    // The strings for these panels are not in the start-up catalog.
    await ensureDeferredMessages().catch(() => {});
    const [mod, html] = await Promise.all([
      entry.load(),
      entry.host ? loadFragment(entry.host) : null,
    ]);
    if (!loaded.has(mod)) {
      loaded.add(mod);
      // Markup a page already has (a test's own) is wired as it stands.
      const signal = entry.host ? mountFragment(entry.host, html) : null;
      entry.init(mod, { signal: signal ?? undefined });
      // init() subscribes to the reset event, but the reset that triggered
      // this import has already been dispatched, so the first appearance has
      // to be asked for directly.
      mod.notifyScenarioReady?.();
    }
  }
}

/**
 * Unmount a scenario panel; its next scenario brings it back.
 * @param {string} host - 'assist'
 * @returns {Promise<boolean>} Whether it was mounted
 */
export async function unmountScenarioPanel(host) {
  const entry = PANELS.find(p => p.host === host);
  if (!entry) return false;
  const mod = await entry.load();
  if (!loaded.has(mod)) return false;
  entry.teardown(mod);
  loaded.delete(mod);
  return unmountFragment(host);
}

/** Start watching for scenarios that bring their own instrument. */
export function initScenarioPanels() {
  window.addEventListener('gravitasSimulationReset', () => {
    // Errors here must not stop the other reset listeners: a panel that fails
    // to load is a missing readout, not a broken simulation.
    loadForScenario().catch(err =>
      console.warn('A scenario panel failed to load:', err)
    );
  });
}
