// =============================================================================
// The initial state an experiment returns to
// -----------------------------------------------------------------------------
// An A/B experiment is only worth anything if Run B starts from exactly where
// Run A started. "Exactly" is the whole feature: a comparison between two runs
// that began from subtly different worlds measures the difference between the
// worlds, not the variable the student changed, and it does so silently.
//
// Rather than write a second serializer, this builds on the one the share links
// already use. `captureShareState()` in ui.js produces a payload that carries
// the scenario, the deterministic seed, the settings that differ from that
// scenario's defaults, the settings changed after generation, the camera, and -
// for a world that has been run - every body's position, velocity and mass.
// That payload is already the application's canonical description of a world,
// it is already versioned, and it is already exercised by the share-link tests.
// A parallel serializer would be a second thing to keep correct and the first
// one to go stale.
//
// What the share payload does not carry, because a link never needed it:
//
//   the simulated clock      a link opens a world at t=0; an experiment has to
//                            resume the clock so two runs share a time axis
//   stable object identities packBody() drops `id`, so a restored body is a
//                            new object as far as any measurement is concerned
//   the reference frame      view state for a link, but it decides what a
//                            position or a separation even means
//   the observer geometry    the same, for anything measured line-of-sight
//
// Those four ride in an `x` block appended to the same payload. Old clients
// ignore an unknown key, new clients tolerate its absence, and the payload
// stays one object with one version number.
//
// This module is deliberately pure: it transforms payload objects and never
// touches the simulation. js/experiments/bench.js is what calls ui.js. That is
// what lets every function here be unit-tested without a canvas.
// =============================================================================

/**
 * Version of the `x` block, independent of the share payload's own version.
 *
 * Bumped when the *shape* of the extras changes. Readers migrate forward; see
 * readExtras().
 */
export const EXTRAS_VERSION = 1;

/**
 * Settings that are not experimental variables.
 *
 * The rule this list encodes: a key belongs here only if changing it cannot
 * change a number the bench measures. Everything else counts as a variable,
 * because the failure that matters is the silent one - a student who changed
 * two things and was told they changed one.
 *
 * Note what is deliberately *absent*. `sim_speed` looks cosmetic and is not:
 * the render loop computes its timestep as `dt * sim_speed * 50 * DT`, so
 * halving the speed halves the integration step and changes the drift a run
 * reports. It is a numerical variable and the bench says so.
 */
export const COSMETIC_SETTINGS = new Set([
  'trail_length',
  'trail_style',
  'trail_colour_mode',
  'planet_base_color',
  'star_base_color',
  'star_density',
  'lensing_quality',
  'disk_doppler',
  'record_simulation',
  'input_object_type',
  'interactive_add',
  'dynamic_object_properties',
]);

/**
 * State that is emphatically not an experimental variable.
 *
 * Elapsed time, the timeline's recording buffers and anything about window
 * layout describe how long someone watched and how big their browser is. A
 * bench that counted those would warn about a second variable on every single
 * comparison, and a warning that always fires is a warning nobody reads.
 */
export const NON_VARIABLES = new Set([
  'elapsed',
  'sim_clock',
  'frame_count',
  'timeline_frames',
  'timeline_seconds',
  'paused',
  'camera',
  'zoom',
  'pan',
  'panel_layout',
  'rail_sections',
  'theme',
  'locale',
  'units',
]);

/** True for a settings key that counts as an independent variable. */
export const isVariableKey = key =>
  !key.startsWith('show_') &&
  !COSMETIC_SETTINGS.has(key) &&
  !NON_VARIABLES.has(key);

// --- Canonical JSON -----------------------------------------------------------

/**
 * JSON with sorted keys and rounded numbers.
 *
 * Two payloads describing the same world must produce the same string, or the
 * initial-state hash is decorative. Object key order is not guaranteed across
 * a save/load round trip, and a float that has been through a text format can
 * come back differing in the last bit, so both are normalised here.
 *
 * @param {*} value - Any JSON-compatible value
 * @returns {string} A stable serialization
 */
export function canonicalJson(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'null';
    // Twelve significant digits: far beyond any physical claim the simulation
    // makes, and short of the bit noise that survives a JSON round trip.
    const rounded = Number(value.toPrecision(12));
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value)
    .filter(k => value[k] !== undefined)
    .sort();
  return `{${keys
    .map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
    .join(',')}}`;
}

/**
 * A short, stable hash of an initial state.
 *
 * FNV-1a over the canonical JSON. Not a cryptographic digest and not trying to
 * be: its job is to let a student, or a marker reading an exported manifest,
 * see at a glance that two runs started from the same world. A 32-bit hash
 * collides once in four billion, which is a better guarantee than the eye.
 *
 * @param {Object} payload - A share payload, with or without extras
 * @returns {string} Eight lowercase hex characters
 */
export function hashState(payload) {
  const text = canonicalJson(stripVolatile(payload));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Drop the parts of a payload that describe the viewer rather than the world.
 *
 * The camera is the clearest case: two students who restored the same state
 * and scrolled differently have the same initial state, and a hash that said
 * otherwise would send them looking for a physics problem that is not there.
 *
 * @param {Object} payload - A share payload
 * @returns {Object} A copy without viewer state
 */
export function stripVolatile(payload) {
  const rest = { ...(payload || {}) };
  delete rest.c;
  delete rest.p;
  if (rest.x) {
    rest.x = { ...rest.x };
    delete rest.x.clock;
  }
  return rest;
}

// --- Extras -------------------------------------------------------------------

/**
 * Attach experiment extras to a share payload.
 *
 * @param {Object} payload - From buildPayload()
 * @param {Object} extras
 * @param {number} [extras.clock] - Simulated seconds on the clock
 * @param {Object} [extras.frame] - {mode, objectId} from referenceFrame.js
 * @param {Object} [extras.observer] - {positionAngle, inclination}
 * @param {Array<Object>} [extras.tools] - Active measurement tools
 * @returns {Object} The same payload with an `x` block
 */
export function withExtras(payload, extras = {}) {
  const x = { v: EXTRAS_VERSION };
  if (Number.isFinite(extras.clock) && extras.clock !== 0) {
    x.clock = Number(extras.clock.toPrecision(12));
  }
  if (extras.frame && extras.frame.mode && extras.frame.mode !== 'world') {
    // Tested against null rather than for truthiness: body ids start at zero,
    // so `objectId ? ...` dropped the target of a frame centred on the first
    // body in the world. It went unnoticed while only the A/B bench carried
    // frames, because the bench's own state names the body separately.
    const target = extras.frame.objectId;
    x.frame =
      target === null || target === undefined
        ? { m: extras.frame.mode }
        : { m: extras.frame.mode, o: target };
  }
  if (extras.observer) {
    const { positionAngle, inclination } = extras.observer;
    // Only when it has been moved off the default: an experiment that never
    // opened an observing panel should not carry two numbers about one.
    if (Number.isFinite(positionAngle) && positionAngle !== 0) {
      x.pa = Number(positionAngle.toPrecision(9));
    }
    if (Number.isFinite(inclination) && inclination !== 90) {
      x.inc = Number(inclination.toPrecision(9));
    }
  }
  if (Array.isArray(extras.tools) && extras.tools.length) {
    x.tools = [...extras.tools].sort();
  }
  // Which star the observing panels are pointed at. Only when it has been
  // pinned to something specific: with no star recorded the panels fall back to
  // the most luminous, which is what an older link means and what a reader who
  // never chose gets anyway.
  if (extras.observedStarId !== undefined && extras.observedStarId !== null) {
    x.star = extras.observedStarId;
  }
  // The distance the angular scale is computed from. Carried because it is an
  // assumption of the reader's, not a property of the system: two people
  // looking at the same simulation can honestly disagree about it, and a link
  // that dropped it would silently substitute the scenario's own value.
  if (Number.isFinite(extras.distancePc) && extras.distancePc > 0) {
    x.dpc = Number(extras.distancePc.toPrecision(9));
  }
  return { ...payload, x };
}

/**
 * Read the extras back, with defaults for a payload that has none.
 *
 * A share link made before this feature existed, or by an older build, simply
 * has no `x`. That is not an error: it describes a world at t=0 in the world
 * frame with an edge-on observer, which is exactly what the defaults say.
 *
 * @param {Object} payload - A decoded share payload
 * @returns {{version:number, clock:number, frame:{mode:string,objectId:*},
 *   observer:{positionAngle:number, inclination:number}, tools:Array<string>,
 *   observedStarId:?number, distancePc:?number}}
 *   The extras
 */
export function readExtras(payload) {
  const x = (payload && payload.x) || {};
  return {
    version: Number(x.v) || 0,
    clock: Number.isFinite(x.clock) ? x.clock : 0,
    frame: {
      mode: x.frame?.m || 'world',
      objectId: x.frame?.o ?? null,
    },
    observer: {
      positionAngle: Number.isFinite(x.pa) ? x.pa : 0,
      inclination: Number.isFinite(x.inc) ? x.inc : 90,
    },
    tools: Array.isArray(x.tools) ? [...x.tools] : [],
    // null rather than a default: "no star recorded" and "this star" are
    // different instructions, and only the first may fall back to the panel's
    // own choice.
    observedStarId: x.star ?? null,
    // null means "use whatever the scenario says", which is what every link
    // made before this field existed means.
    distancePc: Number.isFinite(x.dpc) ? x.dpc : null,
  };
}

// --- Effective settings and parameter diffs -----------------------------------

/**
 * The settings a payload actually describes.
 *
 * A payload splits its settings in two - `d` for what was set before the world
 * was generated, `a` for what the author changed afterwards - because the
 * order matters when rebuilding. For *comparing* two payloads the order does
 * not matter at all: what a student changed is the end state of both.
 *
 * @param {Object} payload - A share payload
 * @returns {Object} One flat settings object
 */
export function effectiveSettings(payload) {
  return { ...(payload?.d || {}), ...(payload?.a || {}) };
}

/**
 * What differs between the setups of two runs.
 *
 * Returns every difference it finds, split into the ones that are experimental
 * variables and the ones that are not, because both are worth showing: the
 * first is the answer to "what did I change", and the second is the answer to
 * "why is it warning me when I only moved the camera" - which is that it is
 * not.
 *
 * The seed and the scenario are compared alongside the settings and counted as
 * variables. Changing the seed changes the world, and a student who does it by
 * accident between runs has invalidated the comparison in the way hardest to
 * notice by eye.
 *
 * A payload only carries the settings that *differ* from its scenario's
 * defaults, so a key changed in one run and left alone in the other is absent
 * on one side. Reporting that as "— → 4" tells the student nothing; given the
 * scenario's baseline settings, it reads "2 → 4" instead, which is the
 * sentence they need for a lab report.
 *
 * @param {Object} a - Run A's initial-state payload
 * @param {Object} b - Run B's initial-state payload
 * @param {Object} [baseline] - The scenario's own settings, for absent keys
 * @returns {{variables: Array<{key:string, from:*, to:*}>,
 *   incidental: Array<{key:string, from:*, to:*}>,
 *   count: number, multivariable: boolean}} The difference
 */
export function parameterDiff(a, b, baseline = null) {
  const base = baseline || {};
  const from = { ...pick(base, a, b), ...effectiveSettings(a) };
  const to = { ...pick(base, a, b), ...effectiveSettings(b) };
  const variables = [];
  const incidental = [];

  const consider = (key, was, now) => {
    if (canonicalJson(was) === canonicalJson(now)) return;
    const entry = { key, from: was ?? null, to: now ?? null };
    if (isVariableKey(key)) variables.push(entry);
    else incidental.push(entry);
  };

  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    consider(key, from[key], to[key]);
  }

  // The two things outside the settings object that still change the world.
  consider('scenario', a?.s, b?.s);
  consider('seed', a?.seed, b?.seed);

  // Frame and observer decide what a measurement means rather than what the
  // world does, so they are reported without being counted as variables: a
  // student who measures the same run from two viewpoints has not run an
  // experiment on the physics, and should not be warned as though they had.
  const ax = readExtras(a);
  const bx = readExtras(b);
  const context = [];
  if (canonicalJson(ax.frame) !== canonicalJson(bx.frame)) {
    context.push({ key: 'reference_frame', from: ax.frame, to: bx.frame });
  }
  if (canonicalJson(ax.observer) !== canonicalJson(bx.observer)) {
    context.push({ key: 'observer', from: ax.observer, to: bx.observer });
  }

  variables.sort((p, q) => p.key.localeCompare(q.key));
  incidental.sort((p, q) => p.key.localeCompare(q.key));

  return {
    variables,
    incidental,
    context,
    count: variables.length,
    multivariable: variables.length > 1,
  };
}

/**
 * The baseline values for every key either payload mentions.
 *
 * Only those keys: a scenario's full settings object has a hundred entries and
 * spreading all of them would make every absent key look like a difference.
 *
 * @param {Object} baseline - The scenario's settings
 * @param {Object} a - Run A's payload
 * @param {Object} b - Run B's payload
 * @returns {Object} Baseline values for the mentioned keys
 */
function pick(baseline, a, b) {
  const keys = new Set([
    ...Object.keys(effectiveSettings(a)),
    ...Object.keys(effectiveSettings(b)),
  ]);
  const out = {};
  for (const key of keys) {
    if (key in baseline) out[key] = baseline[key];
  }
  return out;
}

/**
 * A one-line description of a parameter difference, for a table or a chart.
 * @param {Array<{key:string, from:*, to:*}>} variables - From parameterDiff
 * @returns {string} Human-readable summary
 */
export function describeDiff(variables) {
  if (!variables.length) return '';
  return variables
    .map(v => `${v.key}: ${formatValue(v.from)} → ${formatValue(v.to)}`)
    .join('; ');
}

/** Render a settings value compactly. @param {*} v - Value @returns {string} */
export function formatValue(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return String(Number(v.toPrecision(6)));
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (Array.isArray(v)) return `[${v.map(formatValue).join(', ')}]`;
  if (typeof v === 'object') return canonicalJson(v);
  return String(v);
}
