// =============================================================================
// Vetted relations: the arithmetic behind a question's variants
// -----------------------------------------------------------------------------
// A question in a bank can come in variants - the same question about a
// different star, a different orbit - and every variant's answer has to be
// right. An author cannot be asked to type a formula, because a formula is an
// expression and nothing an author writes is ever run. So the arithmetic is
// here, as a short list of relations Gravitas vouches for, and a bank names one
// by id: "kepler3, with a = 2 AU and M = 1 solar mass". The answer is computed
// by this code, never typed and never evaluated from text.
//
// Each relation says what its inputs are, in which unit, and within what range
// the relation (and the lesson that asks about it) makes sense; what it gives,
// in a unit js/answerParse.js reads; and how to compute it. The units are the
// ones a student types, so the answer a variant carries is in the unit its
// question asks for.
//
// Pure, with no imports: the Studio, the SDK and the tests share it.
// =============================================================================

/** 2 pi AU per year, in km/s: the Earth's orbital speed. */
const EARTH_ORBIT_KMS = (2 * Math.PI * 1.495978707e8) / (365.25 * 86400);
/** An Earth radius in solar radii (IAU nominal values). */
const EARTH_IN_SUN_RADII = 6.3781e3 / 6.957e5;

/**
 * @typedef {object} Relation
 * @property {Record<string, {unit: string, min: number, max: number}>} inputs
 * @property {{unit: string, dimension: ?string}} output - `dimension` is the
 *   answer parser's (js/answerParse.js UNITS), or null for a pure number
 * @property {(v: Record<string, number>) => number} compute
 */

/** @type {Readonly<Record<string, Relation>>} */
export const RELATIONS = Object.freeze({
  // Kepler's third law in solar units: P^2 = a^3 / M, P in years.
  kepler3: {
    inputs: {
      a: { unit: 'AU', min: 0.01, max: 1000 },
      M: { unit: 'Msun', min: 0.05, max: 100 },
    },
    output: { unit: 'yr', dimension: 'time' },
    compute: ({ a, M }) => Math.sqrt(a ** 3 / M),
  },
  // The speed of a circular orbit, v = sqrt(GM / r).
  circularSpeed: {
    inputs: {
      a: { unit: 'AU', min: 0.01, max: 1000 },
      M: { unit: 'Msun', min: 0.05, max: 100 },
    },
    output: { unit: 'km/s', dimension: 'speed' },
    compute: ({ a, M }) => EARTH_ORBIT_KMS * Math.sqrt(M / a),
  },
  // The escape speed from distance r, sqrt(2 GM / r).
  escapeSpeed: {
    inputs: {
      a: { unit: 'AU', min: 0.01, max: 1000 },
      M: { unit: 'Msun', min: 0.05, max: 100 },
    },
    output: { unit: 'km/s', dimension: 'speed' },
    compute: ({ a, M }) => Math.SQRT2 * EARTH_ORBIT_KMS * Math.sqrt(M / a),
  },
  // How much stronger gravity is at r1 than at r2: (r2 / r1)^2.
  inverseSquare: {
    inputs: {
      r1: { unit: 'AU', min: 0.01, max: 1000 },
      r2: { unit: 'AU', min: 0.01, max: 1000 },
    },
    output: { unit: '', dimension: null },
    compute: ({ r1, r2 }) => (r2 / r1) ** 2,
  },
  // A transit's depth, in percent: (Rp / Rs)^2, Rp in Earth radii and Rs in
  // solar radii.
  transitDepth: {
    inputs: {
      Rp: { unit: 'Rearth', min: 0.3, max: 25 },
      Rs: { unit: 'Rsun', min: 0.1, max: 10 },
    },
    output: { unit: '%', dimension: null },
    compute: ({ Rp, Rs }) => 100 * ((Rp * EARTH_IN_SUN_RADII) / Rs) ** 2,
  },
});

/** The relation ids, in the order a form offers them. */
export const RELATION_IDS = Object.freeze(Object.keys(RELATIONS));

/**
 * Round an answer to the precision a lesson states one to: three significant
 * figures, never fewer than the tolerance can tell apart.
 *
 * @param {number} value
 * @returns {number}
 */
export const roundAnswer = value =>
  Number.isFinite(value) && value !== 0 ? Number(value.toPrecision(3)) : value;

/**
 * Judge one set of inputs for a relation, and give its answer.
 *
 * @param {string} id - A relation id
 * @param {Record<string, unknown>} values - One variant's inputs
 * @returns {{ok: true, answer: number} | {ok: false, problems: Array<{input: ?string, code: string, vars: object}>}}
 */
export function evaluateRelation(id, values) {
  const r = Object.hasOwn(RELATIONS, id) ? RELATIONS[id] : null;
  if (!r)
    return {
      ok: false,
      problems: [{ input: null, code: 'relation', vars: { id } }],
    };
  const problems = [];
  const isObject = v =>
    v !== null && typeof v === 'object' && !Array.isArray(v);
  if (!isObject(values)) {
    return { ok: false, problems: [{ input: null, code: 'values', vars: {} }] };
  }
  for (const k of Object.keys(values)) {
    if (!Object.hasOwn(r.inputs, k))
      problems.push({ input: k, code: 'inputUnknown', vars: { input: k } });
  }
  for (const [k, spec] of Object.entries(r.inputs)) {
    const v = values[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      problems.push({ input: k, code: 'inputNumber', vars: { input: k } });
    } else if (v < spec.min || v > spec.max) {
      problems.push({
        input: k,
        code: 'inputRange',
        vars: { input: k, min: spec.min, max: spec.max, unit: spec.unit },
      });
    }
  }
  if (problems.length) return { ok: false, problems };
  const answer = roundAnswer(r.compute(values));
  if (!Number.isFinite(answer) || answer <= 0) {
    return { ok: false, problems: [{ input: null, code: 'answer', vars: {} }] };
  }
  return { ok: true, answer };
}
