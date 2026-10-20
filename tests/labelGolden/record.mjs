// =============================================================================
// The label golden: every number and unit a lesson's data prints
// -----------------------------------------------------------------------------
// Roadmap III Prompt 144 moves number formatting (toFixed, toPrecision) onto
// js/format.js and unit strings onto js/units/registry.js, family by family,
// and the rule is that a label that was right prints the same afterwards. This
// is what "the same" is measured against, for the first family: the lesson data
// under js/data/investigations/ (every lesson, every depth laid in), in
// English and Spanish.
//
// Two kinds of text are recorded, because a lesson prints two kinds.
//
//   static    what the data holds: every `unit` string, and every short string
//             that carries a digit (a field label "Planet 1: a", an axis
//             "a³ (AU³)"), by lesson, step id and path. The Spanish shadow is
//             laid over the English the way the application lays it.
//   dynamic   what the data's own functions print: a step's probe rows, its
//             validate messages, a derived field's value, and the row an
//             "import from selection" button fills. Each is called, with the
//             lesson's own code and nothing copied, against a fixed synthetic
//             world (the `ctx` the engine hands them, built in this file from
//             js/orbital.js, js/units.js and js/blackHolePhysics.js) and a fixed
//             set of field values. The set holds the signs and the
//             not-a-number case on purpose: js/format.js's fixed() writes a true
//             minus sign and an empty string where toFixed writes a hyphen and
//             "NaN", so a migration that swaps one for the other is not
//             identity, and only a recording that visits negative and missing
//             values can say so.
//
// Nothing here is random and nothing reads a clock: the values come from a
// generator seeded by the step id, the world is built from literals, and the
// recording is the same on every machine. The functions are lesson machinery,
// which the Spanish shadow never replaces, so their output cannot differ by
// locale today; both locales are run anyway, and a difference is recorded the
// day one appears (a migration that passes a locale on would show here first).
//
// Coverage is measured, not assumed: while recording, toFixed and toPrecision
// report the line that called them, and the recording says which of the
// family's call sites ran. A site no case reached is a site the golden cannot
// vouch for, and the report lists it.
// =============================================================================

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

export const LOCALES = Object.freeze(['en', 'es']);

/** The family this recording covers: where the call sites to reach live. */
export const FAMILY_DIR = 'js/data/investigations';

// --- Seeded values ------------------------------------------------------------

/** A 32-bit hash of a string: FNV-1a. */
export function hashText(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded generator, the same sequence everywhere. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The recorder rounds with the engine's own toPrecision as it was when this
// module loaded, so the call-site report (which wraps the prototype) counts
// the lessons' calls and not its own.
const toPrecisionOnce = Number.prototype.toPrecision;
const roundTo = (x, figures) => Number(toPrecisionOnce.call(x, figures));

/** A number written the same way on every engine, to twelve figures. */
export const num = x =>
  typeof x === 'number'
    ? Number.isFinite(x)
      ? String(roundTo(x, 12))
      : String(x)
    : x;

/**
 * The field values a step's functions are called with, for one step.
 *
 * Ten vectors, the same ten for every run: nothing measured (NaN, which is
 * what an empty field parses to), ones, a negative, and seven seeded values
 * spread over four decades, four of them sorted ascending so a step that
 * expects "closest approach below furthest distance" sees both orders. Every
 * numeric field also carries its `_text` twin the way the engine's
 * fieldValues() does, and a text field a fixed name.
 *
 * @param {object} step - A lesson step
 * @returns {Array<object>} Value maps
 */
export function valueVectors(step, pool = []) {
  const fields = step.fields || [];
  const ids = fields.map(f => f.id);
  const textual = new Set(fields.filter(f => f.kind === 'text').map(f => f.id));
  const make = pick => {
    const v = {};
    ids.forEach((id, i) => {
      if (textual.has(id)) {
        v[id] = NaN;
        v[`${id}_text`] = `Name ${i + 1}`;
      } else {
        const x = pick(i);
        v[id] = x;
        v[`${id}_text`] = Number.isNaN(x) ? '' : String(x);
      }
    });
    return v;
  };
  const out = [make(() => NaN), make(() => 1), make(() => -1.5), make(() => 0)];
  for (let j = 0; j < 7; j++) {
    const rand = seeded(hashText(`${step.sid ?? ''}#${j}`));
    // Spread over four decades by multiplication alone (no pow or log, whose
    // last digit can differ between engines), then rounded to four figures.
    const raw = ids.map(() => {
      const rung = LADDER[Math.floor(rand() * LADDER.length)];
      return roundTo(rung * (1 + Math.floor(rand() * 90) / 100), 4);
    });
    const values = j % 2 === 0 ? [...raw].sort((a, b) => a - b) : raw;
    out.push(make(i => values[i]));
  }
  // Values a careful student would read off this world: the selected body's own
  // distances, speeds, period and eccentricity, dealt out to the fields in three
  // strides, exactly and twelve per cent high. A check that compares what was
  // typed with what the simulation says only reaches its "matches" branch when
  // the typed number is near the truth, and a seeded guess never is.
  if (pool.length) {
    const n = pool.length;
    const seen = new Set();
    for (const high of [1, 1.12])
      for (const stride of [1, 2, 3])
        for (let j = 0; j < n; j++) {
          const vec = make(i => roundTo(pool[(i * stride + j) % n] * high, 6));
          const key = JSON.stringify(vec);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(vec);
        }
  }
  for (const given of EXTRA_CASES[step.sid]?.(pool) ?? []) {
    const vec = make(() => NaN);
    for (const [id, x] of Object.entries(given)) {
      vec[id] = x;
      vec[`${id}_text`] = String(x);
    }
    out.push(vec);
  }
  return out;
}

/**
 * Readings no seeded guess reaches, by step: a check against a constant the
 * lesson hard-codes (the published mass of TRAPPIST-1, the 10.9 km/s dividing
 * speed of its cannon, the a = P = 4 of its pair) is only run through its
 * "agrees" branches by values near that constant. Each case is a partial
 * reading; the fields it leaves out are not-a-number, which is what an empty
 * field reads as. `pool` is the selected body's readings (see valueVectors).
 */
const EXTRA_CASES = {
  // The eccentric orbiter, read at both ends: right, and a ratio near 1.
  'fast-and-slow-in-numbers': pool =>
    pool.length
      ? [
          { v_peri: pool[0], r_peri: pool[1], v_apo: pool[2], r_apo: pool[3] },
          {
            v_peri: pool[2] * 1.1,
            r_peri: pool[1],
            v_apo: pool[2],
            r_apo: pool[3],
          },
        ]
      : [],
  // TRAPPIST-1e: 0.02925 AU and 6.1 days, which is 0.0897 solar masses.
  'weigh-trappist-1-yourself': () => [
    { w_a: 0.02925, w_Pd: 6.1 },
    { w_a: 0.02925, w_Pd: 61 },
    { w_a: 2.925, w_Pd: 6.1 },
  ],
  'write-down-the-dividing-speed': () => [
    { back: 10.85, gone: 10.95 },
    { back: 10.5, gone: 11.3 },
  ],
  'weigh-the-pair': () => [
    { a: 4, p: 4 },
    { a: 4, p: 9 },
    { a: 9, p: 4 },
  ],
};

// --- The synthetic world --------------------------------------------------------

let worldPieces = null;
async function pieces() {
  if (worldPieces) return worldPieces;
  // One at a time: three imports in flight at once can deadlock on a cycle
  // among the modules they share (the same race tests/ has met under Jest).
  const units = await load('js/units.js');
  const orbital = await load('js/orbital.js');
  const bh = await load('js/blackHolePhysics.js');
  // The application's own gravitational constant (js/appState.js).
  units.setSimGravitationalConstant(2);
  worldPieces = { orbital, units, bh };
  return worldPieces;
}

const G = 2;
const STAR_MASS = 1000;

/** A body on an orbit about the star at the origin, by radius and speed ratio. */
function orbiter(name, r, ratio, mass, angle = 0) {
  const v = Math.sqrt((G * STAR_MASS) / r) * ratio;
  return {
    name,
    id: `body-${hashText(name).toString(16)}`,
    mass,
    massInSuns: mass / STAR_MASS,
    pos: { x: r * Math.cos(angle), y: r * Math.sin(angle) },
    vel: { x: -v * Math.sin(angle), y: v * Math.cos(angle) },
  };
}

const STAR = {
  name: 'Kepler Star',
  id: 'body-star',
  mass: STAR_MASS,
  massInSuns: 1,
  pos: { x: 0, y: 0 },
  vel: { x: 0, y: 0 },
};

/**
 * What each profile leaves selected, and what its derived readings say. Four
 * worlds, because a probe has a branch for nothing selected, and a message
 * has a branch for each side of the thing it checks.
 */
const PROFILES = [
  {
    name: 'empty',
    selected: null,
    named: false,
    drift: null,
    flux: 1,
    days: 0,
    phot: { baseline: 1, seen: 0, last: null, log: [] },
    curve: null,
    halo: false,
    frame: null,
    pair: null,
    rv: null,
    zone: null,
    transit: null,
    run: null,
  },
  {
    name: 'eccentric',
    selected: ['Eccentric Orbiter', 100, 1.2, 3],
    named: true,
    drift: 0.37,
    flux: 0.984567,
    days: 3.14159,
    phot: {
      baseline: 1.000123,
      seen: 3,
      last: { seq: 3, bottom: 0.984123, mid: 6.2832, depth: 0.016 },
      log: [
        { seq: 1, mid: 0.7854 },
        { seq: 2, mid: 3.6126 },
        { seq: 3, mid: 6.2832 },
      ],
    },
    curve: { exponent: -0.512 },
    halo: true,
    frame: { mode: 'body', name: 'Earth' },
    pair: { separation: 400, arms: [100, 300], mass: [2, 2] },
    rv: {
      name: 'HD 209458',
      velocity: -57.14159,
      held: false,
      towards: 'towards us',
      phaseDeg: 211.7,
      period: 140.5,
      observerAngleDeg: 90,
    },
    zone: {
      distanceAU: 1.234,
      insolation: 0.6543,
      innerAU: 0.95,
      outerAU: 1.67,
      label: 'inside the habitable zone',
    },
    transit: {
      name: 'HD 209458 b',
      phase: 'in front of the star',
      impact: 0.31,
    },
    run: { name: 'Sweep of the planet’s starting distance', stamp: 7 },
  },
  {
    name: 'circular',
    selected: ['Circular Orbiter', 100, 1, 0.003],
    named: true,
    drift: -0.42,
    flux: 1,
    days: 12.5,
    phot: {
      baseline: 0.999877,
      seen: 1,
      last: { seq: 1, bottom: 0.9921, mid: 1.5, depth: 0.0078 },
      log: [{ seq: 1, mid: 1.5 }],
    },
    curve: { exponent: -1.0 },
    halo: false,
    frame: { mode: 'world', name: null },
    pair: { separation: 400, arms: [100, 300], mass: [3, 1] },
    rv: {
      name: 'Star A',
      velocity: 12.04,
      held: false,
      towards: 'away from us',
      phaseDeg: 12.4,
      period: 70.1,
      observerAngleDeg: 0,
    },
    zone: {
      distanceAU: 0.0456,
      insolation: 14.2,
      innerAU: 0.1,
      outerAU: 0.3,
      label: 'inside the inner edge',
    },
    transit: { name: 'planet', phase: 'not in transit', impact: 1.8 },
    run: { name: '', stamp: 3 },
  },
  {
    name: 'far',
    selected: ['Far Orbiter', 250, 0.8, 0.0006],
    named: true,
    drift: 0.0004,
    flux: 0.5,
    days: 400,
    phot: {
      baseline: 1,
      seen: 2,
      last: { seq: 2, bottom: 0.97, mid: 20.25, depth: 0.03 },
      log: [
        { seq: 1, mid: 10.1 },
        { seq: 2, mid: 20.25 },
      ],
    },
    curve: null,
    halo: true,
    frame: { mode: 'body', name: 'Earth' },
    pair: { separation: 8, arms: [4, 4], mass: [1, 1] },
    rv: {
      name: 'Star',
      velocity: 0,
      held: true,
      towards: null,
      phaseDeg: 0,
      period: null,
      observerAngleDeg: 180,
    },
    zone: {
      distanceAU: 9.5,
      insolation: 0.011,
      innerAU: 0.8,
      outerAU: 1.4,
      label: 'outside the outer edge',
    },
    transit: null,
    run: null,
  },
];

/**
 * The `ctx` the engine hands a lesson's functions, for one profile.
 *
 * Every member a lesson reads is here with the shape the engine's own
 * (js/investigations.js probeContext) returns; the orbital members are the
 * engine's own functions run on the synthetic bodies. A member nobody here
 * knows answers null, which is what the engine's members answer for "not
 * there", so a lesson that reaches for something new degrades to its empty
 * branch rather than throwing.
 */
export async function syntheticContext(profile) {
  const { orbital, units, bh } = await pieces();
  const bodyOf = new Map();
  const make = (name, spec) => {
    if (!bodyOf.has(name)) bodyOf.set(name, orbiter(name, ...spec));
    return bodyOf.get(name);
  };
  const selected = profile.selected
    ? make(profile.selected[0], profile.selected.slice(1))
    : null;
  // A body answering to any name a lesson asks for: its orbit comes from the
  // name, so the same name is the same body in every call and different names
  // are different orbits (a circle, a moderate ellipse, a long one).
  const named = name => {
    if (!profile.named) return null;
    const h = hashText(String(name));
    return make(String(name), [
      80 + (h % 220),
      [1, 0.9, 1.15, 1.3][h % 4],
      [0.003, 3, 0.0006, 1][(h >> 3) % 4],
      ((h >> 5) % 628) / 100,
    ]);
  };
  const star = STAR;
  const allBodies = () => [star, ...bodyOf.values()];
  const elements = b => {
    const body = b || selected;
    return body && body !== star
      ? orbital.orbitalElements(body, star, G)
      : null;
  };
  const arms = profile.pair
    ? profile.pair.arms.map((r, i) => ({
        name: i === 0 ? 'Star A' : 'Star B',
        r,
        massSun: profile.pair.mass[i],
      }))
    : null;
  const truthPool = () => {
    const el = elements();
    if (!el || !el.bound) return [];
    const kms = v => (v * units.velocityUnitToMs()) / 1000;
    const speedAt = r => Math.sqrt(el.mu * (2 / r - 1 / el.a));
    return [
      kms(speedAt(el.periapsis)),
      el.periapsis * 0.01,
      kms(speedAt(el.apoapsis)),
      el.apoapsis * 0.01,
      el.a * 0.01,
      el.e,
      (el.period * units.timeUnitSeconds()) / 3.15576e7,
      kms(el.v),
      (1 + el.e) / (1 - el.e),
      1,
      selected.mass / STAR_MASS,
    ].filter(Number.isFinite);
  };
  const base = {
    selected,
    get bodies() {
      return allBodies();
    },
    G,
    truthPool,
    elements,
    energy: b => {
      const body = b || selected;
      return body && body !== star ? orbital.pairEnergy(body, star, G) : null;
    },
    distance: units.formatDistance,
    speed: units.formatSpeed,
    time: units.formatTime,
    mass: units.formatMass,
    clock: () => profile.days,
    years: t => (t * units.timeUnitSeconds()) / 3.15576e7,
    au: d => d * 0.01,
    flux: () => profile.flux,
    days: () => profile.days,
    observerAngle: () => 0.5,
    photometry: () => profile.phot,
    rotationCurve: () =>
      profile.curve
        ? {
            center: { x: 0, y: 0, mass: STAR_MASS },
            bodies: allBodies().slice(1),
            points: [
              { r: 40, speed: 6 },
              { r: 90, speed: 4.5 },
              { r: 200, speed: 3.1 },
            ],
            fit: profile.curve,
          }
        : null,
    haloOn: () => profile.halo,
    frame: () => profile.frame,
    seenFrom: (body, originName) => {
      const origin = allBodies().find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(originName).toLowerCase())
      );
      const from = origin || named(originName);
      if (!body || !from || body === from) return null;
      const dx = body.pos.x - from.pos.x;
      const dy = body.pos.y - from.pos.y;
      let lon = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (lon < 0) lon += 360;
      return { separation: Math.hypot(dx, dy), longitude: lon };
    },
    role: name => named(name),
    roles: () => (profile.named ? ['star', 'planet', 'hole', 'tracer'] : []),
    find: name => {
      const found = allBodies().find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(name).toLowerCase())
      );
      return found || named(name) || undefined;
    },
    holeFacts: m => bh.blackHoleFacts(m),
    barycenter: () =>
      arms ? { separation: profile.pair.separation, arms } : null,
    rvNow: () => profile.rv,
    habitability: planet => {
      const z = profile.zone;
      const p = planet || selected;
      if (!z || !p) return null;
      return {
        planet: p,
        star,
        starName: star.name,
        distanceAU: z.distanceAU,
        insolation: z.insolation,
        bounds: { innerAU: z.innerAU, outerAU: z.outerAU },
        model: 'conservative',
        label: z.label,
        status: z.label,
      };
    },
    conservation: () =>
      profile.drift === null
        ? null
        : {
            energyDrift: profile.drift,
            momentumDrift: profile.drift / 10,
            angularMomentumDrift: -profile.drift / 100,
          },
    transitGeometry: () => profile.transit,
    experiment: () => profile.run,
    runMatchesScene: run =>
      Number.isFinite(run?.stamp) ? run.stamp === 7 : null,
  };
  return new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      // Not a thenable: an awaited context must not wait for a `then` that
      // never calls back.
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return () => null;
    },
  });
}

export const profileNames = () => PROFILES.map(p => p.name);

/** One `ctx` per profile, in profile order. */
export async function syntheticContexts() {
  const out = [];
  for (const p of PROFILES) out.push(await syntheticContext(p));
  return out;
}

// --- Recording one step -------------------------------------------------------

/** What a call printed: its result, or the error it threw. */
function outcome(call) {
  try {
    return normalize(call());
  } catch (e) {
    return { threw: `${e.name}: ${String(e.message).slice(0, 80)}` };
  }
}

/** A result as plain JSON: numbers to twelve figures, functions dropped. */
function normalize(x) {
  if (typeof x === 'number') return num(x);
  if (x === undefined) return null;
  if (Array.isArray(x)) return x.map(normalize);
  if (x && typeof x === 'object') {
    const out = {};
    for (const k of Object.keys(x)) {
      if (typeof x[k] === 'function') continue;
      out[k] = normalize(x[k]);
    }
    return out;
  }
  return x;
}

const LADDER = [0.03, 0.2, 1.3, 4.7, 15, 88, 410, 2300];

/**
 * A many-case output as a digest of every distinct result, in order, with the
 * first two of each shape (the text with its digits masked) in the clear, so a
 * reviewer reads what is printed and the digest still moves when a single
 * digit anywhere does. A message that prints a different number of decimals,
 * or a different minus sign, is a different shape and always shown.
 */
function summarize(list) {
  const all = distinct(list);
  const byShape = new Map();
  for (const item of all) {
    const text = JSON.stringify(item);
    const shape = text.replace(/\d/g, '#');
    const kept = byShape.get(shape) ?? [];
    if (kept.length < 2) {
      kept.push(item);
      byShape.set(shape, kept);
    }
  }
  return {
    calls: list.length,
    distinct: all.length,
    digest: createHash('sha256')
      .update(JSON.stringify(all))
      .digest('hex')
      .slice(0, 16),
    samples: [...byShape.values()].flat(),
  };
}

/** The distinct outputs, in the order they first appeared. */
function distinct(list) {
  const seen = new Map();
  for (const item of list) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

/**
 * Everything one step's functions print.
 *
 * @param {object} step - A lesson step
 * @param {object[]} contexts - One `ctx` per profile
 * @returns {object|null} The distinct outputs by function, or null when the
 *   step has no function that prints
 */
export function recordStep(step, contexts) {
  const rec = {};
  const earlier = () => 1.5;
  const vectorsFor = ctx => valueVectors(step, ctx.truthPool());
  if (typeof step.probe === 'function') {
    rec.probe = distinct(contexts.map(c => outcome(() => step.probe(c))));
  }
  if (typeof step.importFromSelection === 'function') {
    rec.importFromSelection = distinct(
      contexts.map(c => outcome(() => step.importFromSelection(c)))
    );
  }
  if (typeof step.validate === 'function') {
    const out = [];
    for (const ctx of contexts)
      for (const v of vectorsFor(ctx))
        out.push(outcome(() => step.validate(v, ctx)));
    rec.validate = summarize(out);
  }
  // A derived field returns a number, and the engine prints it to the field's
  // `decimals` (static, recorded with the lesson). Only one that returns text
  // has printed anything itself.
  for (const f of (step.fields || []).filter(
    f => typeof f.compute === 'function'
  )) {
    const out = [];
    for (const ctx of contexts)
      for (const v of vectorsFor(ctx))
        out.push(outcome(() => f.compute(v, earlier)));
    const text = distinct(
      out.filter(x => typeof x === 'string' && !Number.isFinite(Number(x)))
    ).filter(x => !['NaN', 'Infinity', '-Infinity'].includes(x));
    if (text.length) (rec.compute ??= {})[f.id] = text;
  }
  return Object.keys(rec).length ? rec : null;
}

// --- Recording the static strings ---------------------------------------------

/** A short string with a digit in it that is a label, not machinery. */
const NUMBERED = /\d/;
const SHORT = 100;
/** Where a lesson prints a label that can carry a number or a unit. */
const LABEL_KEYS = new Set([
  'label',
  'xLabel',
  'yLabel',
  'placeholder',
  'hint',
]);

/**
 * What a numeric step holds: its answer, tolerance and unit, and how many
 * decimals a derived field is printed to. The precision check reads these.
 *
 * @param {object} lesson - A lesson with its depth laid in
 * @returns {{answers: Array<object>, decimals: Array<[string, number]>}}
 */
export function recordNumeric(lesson) {
  const answers = [];
  const decimals = [];
  for (const [i, step] of lesson.steps.entries()) {
    const sid = step.sid ?? `#${i}`;
    if (step.kind === 'numeric' && Number.isFinite(step.answer))
      answers.push({
        sid,
        answer: num(step.answer),
        tolerance: Number.isFinite(step.tolerance) ? num(step.tolerance) : null,
        unit: typeof step.unit === 'string' ? step.unit : null,
      });
    for (const f of step.fields || [])
      if (Number.isFinite(f.decimals))
        decimals.push([`${sid}.${f.id}`, f.decimals]);
  }
  return { answers, decimals };
}

/**
 * Every unit string and every short numbered label a lesson holds.
 *
 * @param {object} lesson - A lesson with its depth laid in, in one locale
 * @param {Set<string>} machinery - Keys whose strings are never words
 * @returns {{units: Array<[string, string]>, numbered: Array<[string, string]>}}
 */
export function recordStatic(lesson, machinery) {
  const units = [];
  const numbered = [];
  const walk = (value, at, key) => {
    if (typeof value === 'function') return;
    if (typeof value === 'string') {
      if (key === 'unit') units.push([at, value]);
      else if (
        LABEL_KEYS.has(key) &&
        !machinery.has(key) &&
        value.length <= SHORT &&
        NUMBERED.test(value)
      )
        numbered.push([at, value]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${at}.${i}`, key));
      return;
    }
    if (value && typeof value === 'object')
      for (const k of Object.keys(value)) walk(value[k], `${at}.${k}`, k);
  };
  const sids = lesson.steps.map(s => s.sid);
  lesson.steps.forEach((step, i) => walk(step, `steps.${sids[i] ?? i}`, ''));
  walk(
    Object.fromEntries(Object.entries(lesson).filter(([k]) => k !== 'steps')),
    'lesson',
    ''
  );
  return { units, numbered };
}

// --- Call-site coverage -------------------------------------------------------

const SITE_AT = new RegExp(
  `/(${FAMILY_DIR.replaceAll('/', '\\/')}/[^\\s():]+\\.js):(\\d+):(\\d+)\\)?$`
);

/**
 * Run `fn` while toFixed and toPrecision report which line called them.
 * @param {() => Promise<void>|void} fn
 * @returns {Promise<Set<string>>} `path:line` of every caller seen
 */
export async function withSiteCoverage(fn) {
  const sites = new Set();
  const { toFixed, toPrecision } = Number.prototype;
  const watch = original =>
    function watched(...args) {
      const frame = new Error().stack.split('\n')[2] ?? '';
      const m = SITE_AT.exec(frame.trim());
      if (m) sites.add(`${m[1]}:${m[2]}:${m[3]}`);
      return original.apply(this, args);
    };
  Number.prototype.toFixed = watch(toFixed);
  Number.prototype.toPrecision = watch(toPrecision);
  // Only the caller's frame is read, so only three are built: it is the
  // difference between a few seconds and a few minutes under Jest.
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 3;
  try {
    await fn();
  } finally {
    Error.stackTraceLimit = limit;
    Number.prototype.toFixed = toFixed;
    Number.prototype.toPrecision = toPrecision;
  }
  return sites;
}

/** The lines of the family's sources that call toFixed or toPrecision. */
export function familySites() {
  const out = [];
  const walk = rel => {
    for (const entry of readdirSync(path.join(ROOT, rel), {
      withFileTypes: true,
    })) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.name.endsWith('.js'))
        readFileSync(path.join(ROOT, next), 'utf8')
          .split('\n')
          .forEach((line, i) => {
            const code = line.replace(/\/\/.*$/, '');
            // The column V8 reports for a call is its method name.
            for (const m of code.matchAll(/\.(to(?:Fixed|Precision))\s*\(/g))
              out.push(`${next}:${i + 1}:${m.index + 2}`);
          });
    }
  };
  walk(FAMILY_DIR);
  return out.sort();
}

/**
 * The Spanish static strings that are not the English ones.
 *
 * Only the differences are kept: a short label with a digit mostly reads the
 * same in both. A path the Spanish has and the English lacks (a translation
 * that gains a digit) is listed with its value; one the Spanish lacks (it
 * lost one) is listed with null. An empty list means the Spanish lesson holds
 * exactly the English strings. Today that is so for every unit, because
 * `unit` is one of the keys a shadow can never replace (js/data/investigations/
 * i18n.js STRUCTURAL): the Spanish interface translates a unit by its text
 * when it draws it, not here.
 */
export function spanishOnly(en, es) {
  const out = {};
  for (const kind of ['units', 'numbered']) {
    const had = new Map(en[kind]);
    const has = new Map(es[kind]);
    out[kind] = [...has].filter(([at, value]) => had.get(at) !== value);
    for (const [at] of had) if (!has.has(at)) out[kind].push([at, null]);
  }
  return out;
}

// --- Precision: figures against the uncertainty the lesson states --------------

/** Digits after the decimal mark, in either locale's mark. */
const placesOf = (text, prose = false) => {
  const s = String(text).trim();
  // In English prose "10,000" is ten thousand, not ten to three places. Only
  // the English text is scanned: the Spanish repeats the same numbers, and its
  // "10.000" cannot be told from a decimal.
  if (prose && /^[1-9]\d{0,2}(?:,\d{3})+$/.test(s)) return 0;
  return (/[.,](\d+)$/.exec(s)?.[1] ?? '').length;
};

const UNCERTAIN = new RegExp(
  [
    // "1.234 ± 0.05", "1.234 +/- 0.05"
    String.raw`(-?\d+(?:[.,]\d+)?)\s*(?:±|\+/-)\s*(\d+(?:[.,]\d+)?)`,
    // "10.90 km/s, give or take 0.4"
    String.raw`(-?\d+(?:[.,]\d+)?)[^.;<]{0,24}?give or take\s+(\d+(?:[.,]\d+)?)`,
  ].join('|'),
  'g'
);

/**
 * Where a lesson states a number to more places than the uncertainty it states
 * beside it supports. Listed, never fixed here: whether a printed figure is
 * wrong is Carl's call, and a correction is a visible change.
 *
 *   answer-beyond-tolerance  a numeric answer written to more than one place
 *                            below the leading digit of its own tolerance
 *                            (4.07 ± 0.06 is fine, 3.605 ± 0.12 is not)
 *   value-beyond-uncertainty "x ± u" or "x, give or take u" where x has more
 *                            decimals than u
 *
 * @param {object} numeric - recordNumeric(lesson)
 * @param {Iterable<string>} texts - Every string the lesson prints
 * @returns {Array<object>} Findings, in order
 */
export function precisionFindings(numeric, texts) {
  const out = [];
  for (const { sid, answer, tolerance, unit } of numeric.answers) {
    const t = Math.abs(Number(tolerance));
    if (!(t > 0)) continue;
    const leading = Math.floor(Math.log10(t));
    if (placesOf(answer) > Math.max(0, 1 - leading))
      out.push({
        rule: 'answer-beyond-tolerance',
        at: sid,
        text: `${answer}${unit ? ` ${unit}` : ''} within ${tolerance}`,
      });
  }
  for (const text of new Set(texts))
    for (const m of text.matchAll(UNCERTAIN)) {
      const value = m[1] ?? m[3];
      const unc = m[2] ?? m[4];
      if (placesOf(value, true) > placesOf(unc, true))
        out.push({ rule: 'value-beyond-uncertainty', at: null, text: m[0] });
    }
  return out;
}

/** Every string in a value, however deep. */
function* stringsIn(value) {
  if (typeof value === 'string') yield value;
  else if (Array.isArray(value)) for (const x of value) yield* stringsIn(x);
  else if (value && typeof value === 'object')
    for (const x of Object.values(value)) yield* stringsIn(x);
}

// --- The whole family ---------------------------------------------------------

/**
 * Record every lesson, both locales, with its depth laid in.
 *
 * @param {{coverage?: boolean, toFixed?: Function}} [options] - `coverage:
 *   false` skips the call-site report, which makes toFixed and toPrecision
 *   slower to call; `toFixed` runs the whole recording with Number.prototype's
 *   toFixed replaced (`function (digits)`, `this` the number), which is how a
 *   candidate formatter is tried against the golden before any file changes
 * @returns {Promise<{lessons: Record<string, object>, reached: string[],
 *   sites: string[]}>}
 */
export async function recordAll({ coverage = true, toFixed = null } = {}) {
  const reg = await load('js/data/investigations/registry.js');
  const { withDepth } = await load('js/investigations/depth.js');
  const { STRUCTURAL } = await load('js/data/investigations/i18n.js');
  const profiles = await syntheticContexts();

  const lessons = {};
  const swapped = async fn => {
    if (!toFixed) return fn();
    const original = Number.prototype.toFixed;
    Number.prototype.toFixed = toFixed;
    try {
      return await fn();
    } finally {
      Number.prototype.toFixed = original;
    }
  };
  const watching = coverage
    ? withSiteCoverage
    : async fn => {
        await fn();
        return new Set();
      };
  const reached = await watching(async () =>
    swapped(async () => {
      for (const id of [...reg.investigationIds()].sort()) {
        const perLocale = {};
        for (const locale of LOCALES) {
          await reg.setLessonLocale(locale);
          const lesson = await withDepth(
            await reg.loadInvestigation(id, locale),
            locale
          );
          perLocale[locale] = {
            static: recordStatic(lesson, STRUCTURAL),
            numeric: recordNumeric(lesson),
            texts: [...stringsIn(lesson)],
            steps: Object.fromEntries(
              lesson.steps
                .map((step, i) => [
                  step.sid ?? `#${i}`,
                  recordStep(step, profiles),
                ])
                .filter(([, rec]) => rec)
            ),
          };
        }
        const en = perLocale.en;
        const es = perLocale.es;
        lessons[id] = {
          id,
          static: { en: en.static, es: spanishOnly(en.static, es.static) },
          // Numbers do not translate: the answers are the English lesson's.
          numeric: en.numeric,
          // Listed, not fixed (see precisionFindings).
          precision: precisionFindings(en.numeric, [
            ...en.texts,
            ...stringsIn(en.steps),
          ]),
          // The functions are the same in both languages today, and the file
          // says so by saying "same"; the day they are not, it holds both.
          steps: {
            en: en.steps,
            es:
              JSON.stringify(es.steps) === JSON.stringify(en.steps)
                ? 'same'
                : es.steps,
          },
        };
      }
      await reg.setLessonLocale('en');
    })
  );
  return {
    lessons,
    reached: [...reached].filter(s => s.startsWith(`${FAMILY_DIR}/`)).sort(),
    sites: familySites(),
  };
}
