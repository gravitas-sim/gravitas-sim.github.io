// =============================================================================
// gravitas.scenario-pack/1: a scenario, as data
// -----------------------------------------------------------------------------
// A built-in scenario is a row of the preset table (js/scenarios.js), usually
// with hand-built geometry in js/world/build.js as well: code, which only a
// reviewed commit may add. A scenario pack is the part of a scenario that is
// content - the settings it runs under, the bodies it starts with, the seed
// that makes it the same world every time, the instruments it opens with, and
// a title and summary in every language it declares - and nothing else. It
// names settings by key, instruments by id and body types by class, and it
// carries no code, no URLs and no markup.
//
// Where it runs: the Scenario Studio (/studio/) authors one, the SDK
// validates, tests and archives one (sdk/lib/scenario.mjs re-exports this),
// and js/scenarioPack.js compiles one into the share link the application
// already knows how to open. A pack never becomes a registry entry in the
// running application: opening one is opening a link.
//
// Pure, with no imports, so the page, the tools and the SDK share it. What it
// needs to know about Gravitas - the default settings, the scenario tags, and
// how to judge an orbital system or a typed body - arrives as `api`.
// =============================================================================

export const FORMAT = 'gravitas.scenario-pack';
export const FORMAT_VERSION = 1;

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const MAX_TEXT = 2000;
const MAX_BODIES = 40;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Anything a string could smuggle: markup, a script URL, a link. */
const UNSAFE = /<[a-z!/]|javascript:|data:|https?:\/\//i;
/** Nothing a pack names may be a way into an object's prototype. */
const UNSAFE_KEY = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * The instruments a scenario may open with: the rail's observing panels and
 * its measuring tools, by the id the share link carries.
 */
export const STARTING_PANELS = Object.freeze([
  'lightCurve',
  'radialVelocity',
  'rotationCurve',
  'astrometry',
  'pauseAtEvent',
  'view3d',
]);
export const STARTING_TOOLS = Object.freeze([
  'ruler',
  'protractor',
  'stopwatch',
]);

/**
 * The settings a scenario may set, and what each may be.
 *
 * The Settings panel's own list (js/settingsSchema.js) is a list of sliders
 * for a reader, and its bounds are the slider's: the built-in scenarios step
 * outside them (the Earth-Moon system runs at G = 9000, the Dyson swarm has
 * 150 stars). These are the bounds an author may write, wide enough for every
 * built-in preset and narrow enough that nothing typed can stall the engine.
 * The option lists are the panel's, and tests/scenarioPack.test.js holds them
 * to it.
 *
 * Grouped as the Studio shows them. A key not listed here cannot be set by a
 * pack: settings the engine reads for one hand-built scenario (the lab
 * variables, a lesson's staging switches) mean nothing without that code.
 */
export const SETTING_RULES = Object.freeze({
  // Physics
  gravitational_constant: {
    group: 'physics',
    kind: 'number',
    min: 0.01,
    max: 10000,
  },
  mutual_gravity: { group: 'physics', kind: 'bool' },
  star_only_gravity: { group: 'physics', kind: 'bool' },
  integrator: { group: 'physics', kind: 'option', options: 'integrators' },
  max_timestep: { group: 'physics', kind: 'number', min: 0, max: 100 },
  min_interaction_distance: {
    group: 'physics',
    kind: 'number',
    min: 0,
    max: 100,
  },
  enable_star_merging: { group: 'physics', kind: 'bool' },
  bh_behavior: {
    group: 'physics',
    kind: 'option',
    options: ['Static', 'Orbiting'],
  },
  orbit_decay_rate: { group: 'physics', kind: 'number', min: 0, max: 0.1 },
  // Population, generated under the seed
  placement: {
    group: 'population',
    kind: 'option',
    options: ['Circular', 'Multi-Ring', 'Random', 'Grid', 'Empty'],
  },
  sim_size: {
    group: 'population',
    kind: 'option',
    options: ['Small', 'Medium', 'Large', 'Huge'],
  },
  num_black_holes: { group: 'population', kind: 'int', min: 0, max: 20 },
  bh_mass: { group: 'population', kind: 'number', min: 0.1, max: 1e9 },
  num_stars: { group: 'population', kind: 'int', min: 0, max: 300 },
  num_neutron_stars: { group: 'population', kind: 'int', min: 0, max: 50 },
  num_white_dwarfs: { group: 'population', kind: 'int', min: 0, max: 50 },
  num_planets: { group: 'population', kind: 'int', min: 0, max: 500 },
  num_gas_giants: { group: 'population', kind: 'int', min: 0, max: 100 },
  enable_asteroids: { group: 'population', kind: 'bool' },
  num_asteroids: { group: 'population', kind: 'int', min: 0, max: 1000 },
  num_comets: { group: 'population', kind: 'int', min: 0, max: 200 },
  use_individual_bh_masses: { group: 'population', kind: 'bool' },
  bh_masses: {
    group: 'population',
    kind: 'numbers',
    min: 0.1,
    max: 1e9,
    maxItems: 20,
  },
  num_micro_stars: { group: 'population', kind: 'int', min: 0, max: 1000 },
  micro_star_high_velocity: { group: 'population', kind: 'bool' },
  test_star_slingshot: { group: 'population', kind: 'bool' },
  bh_layout: {
    group: 'population',
    kind: 'option',
    options: [null, 'parabolic-flyby'],
  },
  init_velocity: { group: 'population', kind: 'number', min: 0, max: 500 },
  velocity_stddev: { group: 'population', kind: 'number', min: 0, max: 100 },
  // Time and display
  sim_speed: { group: 'display', kind: 'number', min: 0, max: 10000 },
  show_trails: { group: 'display', kind: 'bool' },
  trail_style: {
    group: 'display',
    kind: 'option',
    options: ['Cloud', 'Simple', 'Glow'],
  },
  trail_length: { group: 'display', kind: 'int', min: 5, max: 3000 },
  show_velocity_vectors: { group: 'display', kind: 'bool' },
  show_acceleration_vectors: { group: 'display', kind: 'bool' },
  show_potential_well: { group: 'display', kind: 'bool' },
  show_scale_bar: { group: 'display', kind: 'bool' },
  show_elapsed_time: { group: 'display', kind: 'bool' },
  show_conservation_diagnostics: { group: 'display', kind: 'bool' },
  star_density: { group: 'display', kind: 'int', min: 0, max: 30000 },
  preset_zoom: { group: 'display', kind: 'number', min: 0.001, max: 1000 },
  bh_environment: {
    group: 'display',
    kind: 'option',
    options: ['quiescent', 'accreting', 'jet'],
  },
  bh_disk_inclination: { group: 'display', kind: 'number', min: 0, max: 90 },
  show_bh_glow: { group: 'display', kind: 'bool' },
  show_accretion_disk: { group: 'display', kind: 'bool' },
  show_bh_jets: { group: 'display', kind: 'bool' },
  dynamic_object_properties: { group: 'display', kind: 'bool' },
});

/** The settings that generate a population, which explicit bodies replace. */
export const POPULATION_COUNTS = Object.freeze([
  'num_black_holes',
  'num_stars',
  'num_neutron_stars',
  'num_white_dwarfs',
  'num_planets',
  'num_gas_giants',
  'num_asteroids',
  'num_comets',
]);

const FIELDS = new Set([
  'format',
  'formatVersion',
  'id',
  'version',
  'locales',
  'title',
  'summary',
  'tags',
  'seed',
  'scenario',
  'settings',
  'camera',
  'paused',
  'observer',
  'open',
  'tools',
  'system',
  'bodies',
]);

/**
 * Every problem with a scenario pack, each naming the field it is about.
 *
 * `code` and `vars` let a page say it in the reader's language; `message` is
 * the English the SDK and the tests print.
 *
 * @param {unknown} s - A parsed scenario pack
 * @param {object} api - What Gravitas has
 * @param {object} api.defaults - DEFAULT_SETTINGS
 * @param {string[]} api.locales - The interface's locales
 * @param {string[]} api.tags - The scenario tags
 * @param {string[]} api.integrators - The integrator names
 * @param {string[]} [api.scenarios] - The built-in scenarios' public ids
 * @param {Function} [api.validateSystem] - js/systemSpec.js's, for `system`
 * @param {Function} [api.validateBody] - For one entry of `bodies`
 * @param {Function} [api.explain] - A message key and its values, in English
 * @returns {Array<{path: string, code: string, vars: object, message: string}>}
 */
export function validateScenarioPack(s, api) {
  const out = [];
  const need = (ok, path, code, message, vars = {}) =>
    ok || out.push({ path, code, vars, message });
  if (!isObject(s)) {
    return [
      { path: '', code: 'notObject', vars: {}, message: 'is not an object' },
    ];
  }
  for (const k of Object.keys(s))
    need(
      FIELDS.has(k),
      k,
      'unknownField',
      `"${k}" is not a scenario-pack field`,
      { key: k }
    );
  need(s.format === FORMAT, 'format', 'format', `must be "${FORMAT}"`);
  need(
    s.formatVersion === FORMAT_VERSION,
    'formatVersion',
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(
    PUBLIC_ID.test(s.id || ''),
    'id',
    'id',
    'a public id such as "three-body-figure-eight"'
  );
  need(
    SEMVER.test(s.version || ''),
    'version',
    'version',
    'a version such as "1.0.0"'
  );

  // Locales and text, as a course pack has them.
  const locales = Array.isArray(s.locales) ? s.locales : [];
  need(locales.includes('en'), 'locales', 'localesEn', 'must include "en"');
  locales.forEach((l, i) =>
    need(
      api.locales.includes(l),
      `locales[${i}]`,
      'locale',
      `Gravitas has no "${l}" interface; it has ${api.locales.join(', ')}`,
      { locale: String(l) }
    )
  );
  const text = (v, path, required) => {
    if (v === undefined && !required) return;
    if (!isObject(v)) {
      need(false, path, 'text', 'an object with a string per locale');
      return;
    }
    for (const l of locales) {
      const t = v[l];
      if (typeof t !== 'string' || !t.trim()) {
        need(
          false,
          `${path}.${l}`,
          'textMissing',
          'is missing: every declared locale needs it',
          { locale: l }
        );
        continue;
      }
      need(
        t.length <= MAX_TEXT,
        `${path}.${l}`,
        'textLong',
        `is longer than ${MAX_TEXT} characters`,
        { max: MAX_TEXT }
      );
      need(
        !UNSAFE.test(t),
        `${path}.${l}`,
        'textUnsafe',
        'contains markup or a URL; a pack is plain text'
      );
    }
    for (const l of Object.keys(v))
      need(
        locales.includes(l),
        `${path}.${l}`,
        'textLocale',
        `"${l}" is not one of the pack's locales`,
        { locale: l }
      );
  };
  text(s.title, 'title', true);
  text(s.summary, 'summary', true);

  if (s.tags !== undefined) {
    const tags = Array.isArray(s.tags) ? s.tags : null;
    need(tags && tags.length <= 4, 'tags', 'tags', 'at most four tags');
    (tags || []).forEach((t, i) =>
      need(
        api.tags.includes(t),
        `tags[${i}]`,
        'tag',
        `"${t}" is not a scenario tag`,
        { tag: String(t) }
      )
    );
    need(
      !tags || new Set(tags).size === tags.length,
      'tags',
      'tagsRepeat',
      'a tag is listed twice'
    );
  }

  need(
    Number.isInteger(s.seed) && s.seed >= 0 && s.seed <= 0xffffffff,
    'seed',
    'seed',
    'an unsigned 32-bit integer'
  );

  // Settings: known keys, the type the default has, inside the bounds.
  const settings = s.settings ?? {};
  if (!isObject(settings))
    need(false, 'settings', 'settings', 'an object of settings');
  else {
    for (const [key, value] of Object.entries(settings)) {
      const at = `settings.${key}`;
      const rule = SETTING_RULES[key];
      if (UNSAFE_KEY.has(key) || !rule || !(key in api.defaults)) {
        need(
          false,
          at,
          'settingUnknown',
          `"${key}" is not a setting a scenario pack can set`,
          { key }
        );
        continue;
      }
      if (rule.kind === 'bool') {
        need(typeof value === 'boolean', at, 'bool', 'true or false');
      } else if (rule.kind === 'numbers') {
        const ok =
          Array.isArray(value) &&
          value.length <= rule.maxItems &&
          value.every(
            n => Number.isFinite(n) && n >= rule.min && n <= rule.max
          );
        need(
          ok,
          at,
          'numbers',
          `a list of at most ${rule.maxItems} numbers from ${rule.min} to ${rule.max}`,
          { max: rule.maxItems, low: rule.min, high: rule.max }
        );
      } else if (rule.kind === 'option') {
        const options =
          rule.options === 'integrators' ? api.integrators : rule.options;
        need(
          options.includes(value),
          at,
          'option',
          `one of ${options.join(', ')}`,
          { options: options.join(', ') }
        );
      } else {
        const ok =
          typeof value === 'number' &&
          Number.isFinite(value) &&
          (rule.kind !== 'int' || Number.isInteger(value));
        need(
          ok,
          at,
          rule.kind === 'int' ? 'int' : 'number',
          rule.kind === 'int' ? 'a whole number' : 'a number'
        );
        if (ok) {
          need(
            value >= rule.min && value <= rule.max,
            at,
            'range',
            `from ${rule.min} to ${rule.max}`,
            { min: rule.min, max: rule.max }
          );
        }
      }
    }
  }

  if (s.camera !== undefined) {
    const c = s.camera;
    need(
      isObject(c) && Number.isFinite(c.zoom) && c.zoom > 0 && c.zoom <= 1000,
      'camera.zoom',
      'zoom',
      'a zoom greater than 0 and at most 1000'
    );
    if (isObject(c) && c.pan !== undefined) {
      need(
        isObject(c.pan) && Number.isFinite(c.pan.x) && Number.isFinite(c.pan.y),
        'camera.pan',
        'pan',
        'an {x, y} pan in pixels'
      );
    }
  }
  if (s.paused !== undefined)
    need(typeof s.paused === 'boolean', 'paused', 'bool', 'true or false');
  if (s.observer !== undefined) {
    const o = s.observer;
    need(
      isObject(o),
      'observer',
      'observer',
      'an {inclination, positionAngle} object'
    );
    if (isObject(o)) {
      need(
        o.inclination === undefined ||
          (Number.isFinite(o.inclination) &&
            o.inclination >= 0 &&
            o.inclination <= 180),
        'observer.inclination',
        'range',
        'from 0 to 180 degrees',
        { min: 0, max: 180 }
      );
      need(
        o.positionAngle === undefined ||
          (Number.isFinite(o.positionAngle) &&
            o.positionAngle >= 0 &&
            o.positionAngle < 360),
        'observer.positionAngle',
        'range',
        'from 0 to 360 degrees',
        { min: 0, max: 360 }
      );
    }
  }
  const list = (v, path, allowed) => {
    if (v === undefined) return;
    if (!Array.isArray(v)) return need(false, path, 'list', 'a list');
    v.forEach((id, i) =>
      need(
        allowed.includes(id),
        `${path}[${i}]`,
        'instrument',
        `"${id}" is not one of ${allowed.join(', ')}`,
        { id: String(id) }
      )
    );
    need(
      new Set(v).size === v.length,
      path,
      'listRepeat',
      'an entry is listed twice'
    );
  };
  list(s.open, 'open', STARTING_PANELS);
  list(s.tools, 'tools', STARTING_TOOLS);

  // Bodies. A pack either generates its population under the seed or brings
  // its own: a world opened with its own bodies has its generated ones
  // replaced, so a count left on would describe bodies nobody sees.
  const hasSystem = s.system !== undefined && s.system !== null;
  const hasBodies = Array.isArray(s.bodies) && s.bodies.length > 0;
  if (hasSystem) {
    const bodies = isObject(s.system) ? s.system.bodies : null;
    need(
      Array.isArray(bodies),
      'system.bodies',
      'system',
      'an orbital system: {bodies: [...]}'
    );
    if (Array.isArray(bodies) && api.validateSystem) {
      for (const e of api.validateSystem({ bodies }).errors) {
        const at =
          e.index >= 0
            ? `system.bodies[${e.index}].${e.field}`
            : 'system.bodies';
        need(
          false,
          at,
          e.key,
          `the orbital system: ${api.explain?.(e.key, e.vars) ?? e.key}`,
          e.vars
        );
      }
    }
  }
  if (s.bodies !== undefined) {
    need(Array.isArray(s.bodies), 'bodies', 'list', 'a list of bodies');
    if (Array.isArray(s.bodies)) {
      need(
        s.bodies.length <= MAX_BODIES,
        'bodies',
        'tooMany',
        `at most ${MAX_BODIES} bodies`,
        { max: MAX_BODIES }
      );
      s.bodies.forEach((b, i) => {
        if (!isObject(b))
          return need(false, `bodies[${i}]`, 'notObject', 'is not an object');
        if (typeof b.name === 'string') {
          need(
            b.name.length <= 40 && !UNSAFE.test(b.name),
            `bodies[${i}].name`,
            'name',
            'a plain name of at most 40 characters'
          );
        }
        for (const e of api.validateBody ? api.validateBody(b) : []) {
          need(
            false,
            `bodies[${i}].${e.field}`,
            e.key,
            `a body: ${api.explain?.(e.key, e.vars) ?? e.key}`,
            e.vars
          );
        }
      });
    }
  }
  // A built-in to start from, by id: its world, geometry included, under the
  // pack's seed and settings. The bodies are its own, so the pack brings none.
  if (s.scenario !== undefined) {
    need(
      (api.scenarios || []).includes(s.scenario) && !hasSystem && !hasBodies,
      'scenario',
      'scenario',
      'a built-in scenario id, such as "solar-system", and then no bodies of its own',
      { scenario: String(s.scenario) }
    );
  }
  if (hasSystem || hasBodies) {
    for (const key of POPULATION_COUNTS) {
      const set = key in settings;
      const n = set ? settings[key] : api.defaults[key];
      need(
        !(n > 0),
        `settings.${key}`,
        'populationWithBodies',
        set
          ? 'must be 0: a scenario with its own bodies does not also generate them'
          : `${key} is ${n} by default; a scenario with its own bodies sets it to 0`,
        { key, n }
      );
    }
  }
  return out;
}

/**
 * Read a pack of any version this build understands, or say why not.
 *
 * One version exists. The function is here so a second one arrives as a
 * migration rather than as a reader that guesses: a newer version is refused,
 * as js/experiments/store.js refuses a newer record.
 *
 * @param {unknown} s - Parsed JSON
 * @returns {{ok: boolean, pack?: object, code?: string, vars?: object}}
 */
export function migrateScenarioPack(s) {
  if (!isObject(s) || s.format !== FORMAT)
    return { ok: false, code: 'notPack' };
  const v = s.formatVersion;
  if (!Number.isInteger(v) || v < 1) return { ok: false, code: 'notPack' };
  if (v > FORMAT_VERSION)
    return { ok: false, code: 'newer', vars: { version: v } };
  return { ok: true, pack: s };
}
