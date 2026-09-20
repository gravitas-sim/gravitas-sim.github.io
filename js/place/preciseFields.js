// =============================================================================
// What a body needs, as numbers somebody can type
// -----------------------------------------------------------------------------
// Placing a body by pointer gives two things at once - where it starts, from
// where the press landed, and how fast it is thrown, from how far the drag
// went - and a third, its mass, not at all: the constructors randomize that
// when nobody says otherwise. This is the same three facts as a form.
//
// The keyboard was not locked out before this. js/ui.js has had
// beginKeyboardPlacement() for some time and it drives the same state a drag
// does, arrow keys moving an aim across the canvas. What it cannot do is take
// a number. The aim is in canvas pixels through screen_to_world, so where a
// body lands depends on the zoom and the pan; there is no way to say "at
// x = 140" and no way to set a mass at all. A reader who cannot see the canvas
// can operate that interface and still cannot build a specific system with it.
//
// So this module is the schema and the arithmetic, and nothing else. No DOM,
// no i18n, no physics: it says which fields a type has, what units they are
// in, and whether what was typed is usable. The dialog in
// js/precisePlacement.js renders it and js/ui.js's placeBody() - the one
// function all three placement paths already go through - builds the body.
// There is deliberately no second creation path and no second schema here.
//
// On units
// -----------------------------------------------------------------------------
// Position and velocity are in simulation units, which is what placeBody()
// takes, so nothing is converted on the way in and there is no second unit
// system to get wrong. The dialog shows the AU equivalent beside the position
// as read-only text, which orients a reader without giving them a second thing
// to type. Mass is in the physical unit each constructor already counts in -
// solar masses for a star, Earth masses for a planet, Halley masses for a
// comet - because that is the number the class stores and reports, and asking
// for it in simulation units would mean converting twice to get back where we
// started.
// =============================================================================

/** One simulation length unit as a fraction of an AU. 100 units = 1 AU. */
const SIM_UNITS_PER_AU = 100;

/**
 * The mass field for each type: which unit it is counted in, and what the
 * class does when nobody says.
 *
 * `perUnit` is how many simulation mass units one of them is, or the string
 * 'native' for the one class that is handed simulation units directly. Every
 * other class takes the physical number and converts internally, so the dialog
 * passes the physical number straight through.
 *
 * @type {Readonly<Record<string, {unit: string, min: number, max: number, placeholder: number}>>}
 */
export const MASS_FIELD = Object.freeze({
  Star: { unit: 'suns', min: 0.02, max: 150, placeholder: 1 },
  Planet: { unit: 'earths', min: 0.001, max: 4000, placeholder: 1 },
  GasGiant: { unit: 'jupiters', min: 0.01, max: 80, placeholder: 1 },
  Asteroid: { unit: 'ceres', min: 1e-6, max: 100, placeholder: 1 },
  Comet: { unit: 'halleys', min: 1e-6, max: 1000, placeholder: 0.01 },
  WhiteDwarf: { unit: 'suns', min: 0.1, max: 1.44, placeholder: 0.6 },
  NeutronStar: { unit: 'suns', min: 1.1, max: 2.9, placeholder: 1.4 },
  // Handed to the constructor in simulation units rather than solar masses,
  // unlike every other type. The dialog still asks for solar masses and
  // js/precisePlacement.js multiplies, so a reader is never asked to know that.
  BlackHole: { unit: 'suns', min: 1, max: 1e9, placeholder: 10 },
});

/** The types this form can build: exactly the eight placeBody() knows. */
export const PLACEABLE_TYPES = Object.freeze(Object.keys(MASS_FIELD));

/**
 * What to call each type, as a message key.
 *
 * The same keys the object inspector and the placement announcements already
 * use. Eight new strings would be eight more chances for the form to call a
 * white dwarf something the rest of the interface does not.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const TYPE_NAME_KEY = Object.freeze({
  Star: 'objectName.star',
  Planet: 'objectName.planet',
  GasGiant: 'objectName.gasGiant',
  Asteroid: 'objectName.asteroid',
  Comet: 'objectName.comet',
  WhiteDwarf: 'objectName.whiteDwarf',
  NeutronStar: 'objectName.neutronStar',
  BlackHole: 'objectName.blackHole',
});

/**
 * Position and velocity bounds.
 *
 * Wide enough not to be in anybody's way and narrow enough that a typo cannot
 * produce a body the integrator will spend the next minute chasing. 1e6 units
 * is ten thousand AU, well outside any scenario in the catalog; the velocity
 * bound is about forty times the circular speed at 1 AU about a solar mass,
 * which is fast enough to be unbound from anything here and slow enough that a
 * single step cannot jump the whole scene.
 */
export const LIMITS = Object.freeze({
  position: 1e6,
  velocity: 500,
});

/** The numeric fields every type has, in the order they are presented. */
export const STATE_FIELDS = Object.freeze([
  { key: 'x', kind: 'position' },
  { key: 'y', kind: 'position' },
  { key: 'vx', kind: 'velocity' },
  { key: 'vy', kind: 'velocity' },
]);

/**
 * Simulation length units as AU, for the read-only hint beside a position.
 *
 * @param {number} units - Simulation length units
 * @returns {number} The same distance in AU
 */
export const simToAu = units => units / SIM_UNITS_PER_AU;

/**
 * Read one number out of what somebody typed.
 *
 * Empty is its own answer rather than zero. A blank velocity means "at rest"
 * and a blank mass means "whatever the class would have chosen", and those are
 * different from each other and from a typo; collapsing any of them to 0 would
 * silently build a body nobody asked for - a zero-mass star, in the case that
 * matters.
 *
 * @param {string} raw - The field's value
 * @returns {{empty: boolean, value: number, bad: boolean}} What it is
 */
function readNumber(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { empty: true, value: 0, bad: false };
  // Number('') is 0 and Number(' ') is 0, both handled above; Number('1e3') is
  // 1000, which is a reasonable thing for somebody to type into a mass field.
  const value = Number(text);
  if (!Number.isFinite(value)) return { empty: false, value: 0, bad: true };
  return { empty: false, value, bad: false };
}

/**
 * Turn a filled-in form into arguments for placeBody(), or into complaints.
 *
 * Every complaint names the field it is about, so the dialog can attach it to
 * that input with aria-describedby rather than piling them into one summary a
 * reader has to match up by hand. The messages are keys, not sentences: this
 * module has no catalog and should not acquire one.
 *
 * @param {string} type - One of PLACEABLE_TYPES
 * @param {Record<string, string>} values - Raw field values, as typed
 * @returns {{ok: boolean, errors: Array<{field: string, key: string, vars: object}>,
 *   at: ?{x: number, y: number}, vel: ?{x: number, y: number}, mass: ?number}} The verdict
 */
export function validatePlacement(type, values = {}) {
  const errors = [];
  const fail = (field, key, vars = {}) => errors.push({ field, key, vars });

  if (!PLACEABLE_TYPES.includes(type)) {
    fail('type', 'place.precise.error.type', { type: String(type) });
    return { ok: false, errors, at: null, vel: null, mass: null };
  }

  const numbers = {};
  for (const { key, kind } of STATE_FIELDS) {
    const limit = LIMITS[kind];
    const read = readNumber(values[key]);
    if (read.bad) {
      fail(key, 'place.precise.error.number');
      continue;
    }
    // A blank position is the origin and a blank velocity is at rest. Both are
    // ordinary things to want and neither is a mistake.
    if (read.empty) {
      numbers[key] = 0;
      continue;
    }
    if (Math.abs(read.value) > limit) {
      fail(key, 'place.precise.error.range', { limit });
      continue;
    }
    numbers[key] = read.value;
  }

  const spec = MASS_FIELD[type];
  let mass = null;
  const massRead = readNumber(values.mass);
  if (massRead.bad) {
    fail('mass', 'place.precise.error.number');
  } else if (!massRead.empty) {
    if (massRead.value < spec.min || massRead.value > spec.max) {
      fail('mass', 'place.precise.error.massRange', {
        min: spec.min,
        max: spec.max,
      });
    } else {
      mass = massRead.value;
    }
  }

  if (errors.length) {
    return { ok: false, errors, at: null, vel: null, mass: null };
  }
  return {
    ok: true,
    errors,
    at: { x: numbers.x, y: numbers.y },
    vel: { x: numbers.vx, y: numbers.vy },
    // Null rather than a default, so placeBody() hands the constructor null and
    // the class randomizes exactly as it does on the pointer path. A blank mass
    // has to produce the same distribution as a click, or "indistinguishable
    // from a system built the normal way" is not true.
    mass,
  };
}
