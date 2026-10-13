// =============================================================================
// Declarative scenario geometry: the constructs and their validator
// -----------------------------------------------------------------------------
// Pure, with no imports, so the Studio, the SDK and the tests share it with
// js/scenarioPack.js (which re-exports it). SCENARIO_GEOMETRY.md describes the
// constructs; the arithmetic is js/scenarios.js expandGeometry().
// =============================================================================

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const UNSAFE_KEY = new Set(['__proto__', 'constructor', 'prototype']);

// --- Declarative geometry (SCENARIO_GEOMETRY.md) ------------------------------
// {steps: [...]}, one construct a step: `body` (a type, a name, a mass in the
// type's own unit, a place or an `orbit` round an earlier body) or `rule` (a
// named rule with parameters). A pack carries only the plain `body`; the rest
// (a rule, a body reused from the generator, a distance in drawn radii, a
// barycentric, mutual, retrograde or random-phase orbit, a body built from a
// mass other than its own, the engine's own body properties) is engine code or
// reads engine state, so `validateGeometry(g, {rules: false})` refuses it and a
// pack that wants one names the built-in in `scenario`.
// The arithmetic is js/scenarios.js expandGeometry().

/** The most steps a geometry may hold. */
export const GEOMETRY_MAX_STEPS = 40;

/** The body types a geometry may make, and the unit each is massed in. */
export const GEOMETRY_TYPES = Object.freeze({
  Star: 'suns',
  Planet: 'earths',
  GasGiant: 'jupiters',
});

/** The look of a body, and nothing else, may be set after it is made. */
export const GEOMETRY_SET = Object.freeze({
  radius: 'positive',
  baseColor: 'color',
  persistent: 'bool',
});

/**
 * What a built-in may also set: the properties the engine's bodies carry and
 * the readouts, labels and renderers read (a star's true radius and
 * luminosity, a world's gravity and atmosphere). A kind is `positive` (a
 * number above 0), `nonneg` (0 or more), `text` or `bool`.
 */
export const GEOMETRY_ENGINE_SET = Object.freeze({
  radiusInSuns: 'positive',
  massInEarths: 'positive',
  radiusInEarths: 'positive',
  radiusInJupiters: 'positive',
  luminosityInSuns: 'positive',
  temperature: 'positive',
  spectralType: 'text',
  showHabitableZone: 'bool',
  isEarth: 'bool',
  isMoon: 'bool',
  diameter: 'positive',
  orbital_period: 'positive',
  rotation_period: 'positive',
  density: 'text',
  density_kg_m3: 'positive',
  gravity: 'positive',
  escape_velocity: 'positive',
  atmosphere: 'text',
  surface_pressure: 'nonneg',
  magnetic_field: 'nonneg',
  albedo: 'nonneg',
});

/**
 * The named rules, and what each takes. A parameter is a list of the values it
 * may have, `bool` (the only optional kind), `text`, `color`, `positive` (a
 * number above 0), or `{list: kind, length: n}`. The rule's arithmetic is in
 * js/world/build.js; its names, colors, drawn sizes and published numbers are
 * the parameters, and the settings a laboratory reads are the ones
 * SCENARIO_GEOMETRY.md lists for it.
 */
export const GEOMETRY_RULES = Object.freeze({
  'published-system': Object.freeze({
    system: Object.freeze([
      'galilean',
      'pluto-neptune',
      'jupiter-trojans',
      'trappist-1',
      'hd209458',
    ]),
    detuned: 'bool',
  }),
  'restricted-three-body': Object.freeze({
    primaryName: 'text',
    primaryColor: 'color',
    primaryRadiusInSuns: 'positive',
    secondaryName: 'text',
    secondaryColor: 'color',
    secondaryRadiusInSuns: 'positive',
    drawnSolarRadii: 'positive',
    tracerName: 'text',
    tracerColor: 'color',
    tracerRadius: 'positive',
  }),
  'circular-transfer': Object.freeze({
    starName: 'text',
    starDrawnSolarRadii: 'positive',
    probeName: 'text',
    probeColor: 'color',
    probeRadius: 'positive',
    targetName: 'text',
    targetColor: 'color',
    targetRadius: 'positive',
    targetMassRatio: 'positive',
  }),
  'binary-lab': Object.freeze({
    mode: Object.freeze(['circumstellar', 'circumbinary']),
    drawExaggeration: 'positive',
    starAName: 'text',
    starAColor: 'color',
    starBName: 'text',
    starBColor: 'color',
    planetName: 'text',
    planetColor: 'color',
    planetRadius: 'positive',
  }),
  'equilateral-stars': Object.freeze({
    circumradius: 'positive',
    massSuns: 'positive',
    starRadius: 'positive',
    names: Object.freeze({ list: 'text', length: 3 }),
    colors: Object.freeze({ list: 'color', length: 3 }),
  }),
  'gravity-assist': Object.freeze({
    starName: 'text',
    starColor: 'color',
    starRadius: 'positive',
    planetName: 'text',
    planetColor: 'color',
    planetRadius: 'positive',
    planetRadiusInSuns: 'positive',
    probeName: 'text',
    probeColor: 'color',
    probeRadius: 'positive',
  }),
});

/** The types whose generated bodies a geometry may `keep`: every population. */
export const GEOMETRY_KEEP_TYPES = Object.freeze([
  'Star',
  'Planet',
  'GasGiant',
  'BlackHole',
  'Asteroid',
  'Comet',
  'NeutronStar',
  'WhiteDwarf',
  'Debris',
]);

/** The types a body can be reused as (`from`): the generator's own lists. */
export const GEOMETRY_REUSE_TYPES = Object.freeze([
  'Star',
  'Planet',
  'GasGiant',
  'BlackHole',
]);

const GEOMETRY_LIMIT = 1e6;
const GEOMETRY_COLOR = /^#[0-9a-fA-F]{6}$/;
const GEOMETRY_NAME = /^[^<>\p{Cc}]{1,40}$/u;

/**
 * Every problem with a geometry, each naming its field; `rules: false` refuses
 * the `rule` construct, as a pack must.
 * @param {unknown} g - {steps: [...]}
 * @param {{rules?: boolean}} [opts]
 * @returns {Array<{path: string, why: string}>}
 */
export function validateGeometry(g, { rules = true } = {}) {
  const out = [];
  const bad = (path, why) => out.push({ path, why });
  if (!isObject(g)) return [{ path: '', why: 'a geometry is {steps: [...]}' }];
  for (const k of Object.keys(g))
    if (k !== 'steps' && k !== 'keep' && k !== 'recenter')
      bad(k, `"${k}" is not a geometry field`);
  // `recenter`: move the whole system into its center-of-mass frame once built.
  if (g.recenter !== undefined) {
    if (typeof g.recenter !== 'boolean') bad('recenter', 'true or false');
    else if (!rules)
      bad('recenter', 'a scenario pack may not recenter the system');
  }
  // `keep`: generated bodies of these types that no step reuses stay in the
  // world as the generator drew them, instead of being dropped.
  if (g.keep !== undefined && rules) {
    if (
      !Array.isArray(g.keep) ||
      new Set(g.keep).size !== g.keep.length ||
      g.keep.some(k => !GEOMETRY_KEEP_TYPES.includes(k))
    )
      bad('keep', `a list, once each, of ${GEOMETRY_KEEP_TYPES.join(', ')}`);
  } else if (g.keep !== undefined) {
    bad('keep', 'a scenario pack may not use generated bodies left in place');
  }
  if (!Array.isArray(g.steps) || g.steps.length === 0) {
    bad('steps', 'a list of at least one step');
    return out;
  }
  if (g.steps.length > GEOMETRY_MAX_STEPS)
    bad('steps', `at most ${GEOMETRY_MAX_STEPS} steps`);
  const names = new Set();
  const only = (o, path, allowed) => {
    for (const k of Object.keys(o))
      if (UNSAFE_KEY.has(k) || !allowed.includes(k))
        bad(`${path}.${k}`, `"${k}" is not allowed here`);
  };
  const num = (v, path, min, max, open) => {
    const ok =
      typeof v === 'number' &&
      Number.isFinite(v) &&
      (open ? v > min : v >= min) &&
      v <= max;
    if (!ok) bad(path, `a number from ${min} to ${max}`);
  };
  const unit = (v, path, kinds, min, max, open) => {
    if (!isObject(v) || Object.keys(v).length !== 1)
      return bad(path, `exactly one of ${kinds.join(', ')}, with a number`);
    const [k] = Object.keys(v);
    if (!kinds.includes(k))
      return bad(`${path}.${k}`, `one of ${kinds.join(', ')}`);
    num(v[k], `${path}.${k}`, min, max, open);
  };
  const xy = (v, path) => {
    if (!isObject(v)) return bad(path, 'an {x, y} pair');
    only(v, path, ['x', 'y']);
    num(v.x, `${path}.x`, -GEOMETRY_LIMIT, GEOMETRY_LIMIT);
    num(v.y, `${path}.y`, -GEOMETRY_LIMIT, GEOMETRY_LIMIT);
  };
  // What only a built-in may use: engine code or engine state.
  const engine = (path, what) => {
    if (!rules) bad(path, `a scenario pack may not use ${what}`);
    return rules;
  };
  const body = (b, p) => {
    if (!isObject(b)) return bad(p, 'a body: {type, name, mass, ...}');
    only(b, p, [
      'type',
      'name',
      'mass',
      'from',
      'born',
      'at',
      'velocity',
      'orbit',
      'set',
    ]);
    // `from` reuses a body the generator drew; a black hole can only be reused.
    let reuse = false;
    if (b.from !== undefined) {
      const f = b.from;
      reuse = engine(`${p}.from`, 'a body reused from the generator');
      if (!isObject(f)) bad(`${p}.from`, 'an object: {generated: index}');
      else if (reuse) {
        only(f, `${p}.from`, ['generated', 'ifMissing']);
        if (!Number.isInteger(f.generated) || f.generated < 0)
          bad(`${p}.from.generated`, 'the index of a generated body, from 0');
        if (
          f.ifMissing !== undefined &&
          !['make', 'skip'].includes(f.ifMissing)
        )
          bad(`${p}.from.ifMissing`, 'make or skip');
        if (f.ifMissing === 'make' && b.mass === undefined)
          bad(`${p}.from.ifMissing`, 'make needs a mass to make the body with');
      }
    }
    const unitName = GEOMETRY_TYPES[b.type];
    if (!unitName && !(reuse && GEOMETRY_REUSE_TYPES.includes(b.type)))
      bad(
        `${p}.type`,
        `one of ${(reuse ? GEOMETRY_REUSE_TYPES : Object.keys(GEOMETRY_TYPES)).join(', ')}`
      );
    if (typeof b.name !== 'string' || !GEOMETRY_NAME.test(b.name))
      bad(`${p}.name`, 'a plain name of 1 to 40 characters');
    else if (names.has(b.name))
      bad(`${p}.name`, `"${b.name}" names two bodies`);
    if (b.type === 'BlackHole') {
      if (b.mass !== undefined)
        bad(
          `${p}.mass`,
          'a reused black hole keeps the mass it was drawn with'
        );
    } else if (b.mass !== undefined || !reuse) {
      // A body built from another mass (`born`) may be massed in any unit, as
      // the literature gives it (a hot Jupiter, in Jupiter masses).
      const wide = b.born !== undefined && rules;
      unit(
        b.mass,
        `${p}.mass`,
        unitName && !wide ? [unitName] : Object.values(GEOMETRY_TYPES),
        0,
        1e9,
        true
      );
    }
    // `born`: the mass the constructor is handed, when it is not the body's own
    // (a constructor derives a radius and a density from it, and draws from the
    // generator for some), so a built-in's world is the one the code made.
    if (b.born !== undefined) {
      if (engine(`${p}.born`, 'a body built from another mass'))
        unit(b.born, `${p}.born`, Object.values(GEOMETRY_TYPES), 0, 1e9);
      if (b.mass === undefined) bad(`${p}.born`, 'needs a mass for the body');
    }
    if (b.orbit !== undefined) {
      if (b.at !== undefined || b.velocity !== undefined)
        bad(p, 'an orbit gives the place and velocity: no `at` or `velocity`');
      const o = b.orbit;
      const op = `${p}.orbit`;
      if (!isObject(o)) bad(op, 'an orbit: {around, distance, ...}');
      else {
        only(o, op, [
          'around',
          'distance',
          'eccentricity',
          'angle',
          'barycentric',
          'mutual',
          'retrograde',
        ]);
        if (typeof o.around !== 'string' || !names.has(o.around))
          bad(`${op}.around`, 'the name of a body made earlier');
        const radii = isObject(o.distance) && 'radii' in o.distance;
        if (radii && engine(`${op}.distance`, 'a distance in drawn radii'))
          unit(o.distance, `${op}.distance`, ['radii'], 0, 1e4, true);
        else if (!radii)
          unit(
            o.distance,
            `${op}.distance`,
            ['au', 'units'],
            0,
            GEOMETRY_LIMIT,
            true
          );
        if (o.barycentric !== undefined) {
          if (typeof o.barycentric !== 'boolean')
            bad(`${op}.barycentric`, 'true or false');
          else if (
            o.barycentric &&
            engine(`${op}.barycentric`, 'a barycentric orbit') &&
            o.eccentricity
          )
            bad(`${op}.eccentricity`, 'a barycentric orbit is circular');
        }
        // The pair's mass in the pull, and the other way round: a built-in's.
        for (const k of ['mutual', 'retrograde'])
          if (o[k] !== undefined) {
            if (typeof o[k] !== 'boolean') bad(`${op}.${k}`, 'true or false');
            else if (o[k] && engine(`${op}.${k}`, `a ${k} orbit`)) {
              if (k === 'mutual' && o.barycentric)
                bad(`${op}.mutual`, 'a barycentric orbit already counts both');
            }
          }
        if (
          o.eccentricity !== undefined &&
          !(
            typeof o.eccentricity === 'number' &&
            o.eccentricity >= 0 &&
            o.eccentricity < 1
          )
        )
          bad(`${op}.eccentricity`, 'from 0 up to, not including, 1');
        if (isObject(o.angle) && 'random' in o.angle) {
          if (
            engine(`${op}.angle`, 'a random angle') &&
            !(Object.keys(o.angle).length === 1 && o.angle.random === true)
          )
            bad(`${op}.angle`, 'exactly {random: true}');
        } else if (o.angle !== undefined)
          unit(o.angle, `${op}.angle`, ['deg', 'rad', 'pi'], -1e4, 1e4);
      }
    } else {
      if (b.at !== undefined) xy(b.at, `${p}.at`);
      if (b.velocity !== undefined) xy(b.velocity, `${p}.velocity`);
    }
    if (b.set !== undefined) {
      if (!isObject(b.set)) bad(`${p}.set`, 'an object');
      else {
        // An engine property is refused for a pack by name; any other key is
        // refused as not allowed here.
        for (const k of Object.keys(b.set)) {
          const at = `${p}.set.${k}`;
          if (UNSAFE_KEY.has(k)) bad(at, `"${k}" is not allowed here`);
          else if (Object.hasOwn(GEOMETRY_ENGINE_SET, k))
            engine(at, `an engine property (${k})`);
          else if (!Object.hasOwn(GEOMETRY_SET, k))
            bad(at, `"${k}" is not allowed here`);
        }
        for (const [k, v] of Object.entries(b.set)) {
          const engineKind = Object.hasOwn(GEOMETRY_ENGINE_SET, k);
          const kind = engineKind ? GEOMETRY_ENGINE_SET[k] : GEOMETRY_SET[k];
          const at = `${p}.set.${k}`;
          if (!kind || (engineKind && !rules)) continue;
          if (kind === 'bool' && typeof v !== 'boolean')
            bad(at, 'true or false');
          else if (kind === 'positive')
            num(v, at, 0, engineKind ? 1e9 : 1e4, true);
          else if (kind === 'nonneg') num(v, at, 0, 1e9);
          else if (
            kind === 'text' &&
            !(typeof v === 'string' && GEOMETRY_NAME.test(v))
          )
            bad(at, 'a short plain text');
          else if (
            kind === 'color' &&
            !(typeof v === 'string' && GEOMETRY_COLOR.test(v))
          )
            bad(at, 'a color such as #ffd86b');
        }
      }
    }
    if (typeof b.name === 'string') names.add(b.name);
  };
  const rule = (r, p) => {
    if (!rules) return bad(p, 'a scenario pack may not use a named rule');
    if (!isObject(r)) return bad(p, 'a rule: {name, params}');
    only(r, p, ['name', 'params']);
    const spec = GEOMETRY_RULES[r.name];
    if (!spec)
      return bad(
        `${p}.name`,
        `one of ${Object.keys(GEOMETRY_RULES).join(', ')}`
      );
    const params = r.params ?? {};
    if (!isObject(params)) return bad(`${p}.params`, 'an object');
    only(params, `${p}.params`, Object.keys(spec));
    // One parameter against its kind: a list of values, a kind, or a list of
    // a kind.
    const check = (v, kind, at) => {
      if (Array.isArray(kind)) {
        if (!kind.includes(v)) bad(at, `one of ${kind.join(', ')}`);
      } else if (kind === 'bool') {
        if (typeof v !== 'boolean') bad(at, 'true or false');
      } else if (kind === 'positive') num(v, at, 0, 1e9, true);
      else if (kind === 'text') {
        if (!(typeof v === 'string' && GEOMETRY_NAME.test(v)))
          bad(at, 'a short plain text');
      } else if (kind === 'color') {
        if (!(typeof v === 'string' && GEOMETRY_COLOR.test(v)))
          bad(at, 'a color such as #ffd86b');
      } else if (!Array.isArray(v) || v.length !== kind.length)
        bad(at, `a list of ${kind.length}`);
      else v.forEach((x, i) => check(x, kind.list, `${at}[${i}]`));
    };
    for (const [k, kind] of Object.entries(spec)) {
      if (params[k] === undefined) {
        if (kind !== 'bool') bad(`${p}.params.${k}`, 'is required');
      } else check(params[k], kind, `${p}.params.${k}`);
    }
    if (params.detuned && params.system !== 'galilean')
      bad(`${p}.params.detuned`, 'only the Galilean system can be detuned');
  };
  g.steps.forEach((step, i) => {
    const at = `steps[${i}]`;
    if (!isObject(step) || Object.keys(step).length !== 1)
      return bad(at, 'a step with exactly one construct: body or rule');
    const [kind] = Object.keys(step);
    if (kind === 'body') body(step.body, `${at}.body`);
    else if (kind === 'rule') rule(step.rule, `${at}.rule`);
    else bad(`${at}.${kind}`, 'a construct this build knows: body or rule');
  });
  return out;
}
