// =============================================================================
// gravitas.artifact/1: one envelope for a scientific result, and one
// provenance vocabulary
// -----------------------------------------------------------------------------
// Every number Gravitas produces as a result - a measurement, a fit, a trial's
// summary, a guide's answer - says the same four things about itself: what
// made it, what it was made from, what may be done with it, and for each
// quantity its value, its unit, its uncertainty and what kind of number it is.
// Six vocabularies said the last of these six ways; PROVENANCE.md maps each
// onto ORIGINS and BASES below, with the rules for reversing a mapping.
//
// An envelope is data. Numbers are numbers and units are registry ids
// (js/units/registry.js): nothing in it is a string rendered for one reader
// in one language. A report or an export renders it, in the reader's locale,
// when it is read.
//
// sdk/schemas/artifact-1.schema.json is the same contract for an outside
// author; tests/artifact.test.js holds the two to agreement. This module is
// the authority, as js/platform/scenario.js is for scenario packs.
// =============================================================================

import { UNITS } from '../units/registry.js';

export const FORMAT = 'gravitas.artifact';
export const FORMAT_VERSION = 1;

/**
 * What kind of number a quantity is.
 *   measured  read off data, by a person or a pipeline
 *   derived   computed from other quantities by a stated relation
 *   assumed   taken as given by the analysis, not determined by it
 *   fitted    a free parameter a model was fitted for
 *   fixed     a model parameter held at a stated value during a fit
 *   truth     the value the simulation was built with
 *   analytic  from a closed-form result
 *   synthetic produced by a forward model, not observed (Prompt 84)
 */
export const ORIGINS = Object.freeze([
  'measured',
  'derived',
  'assumed',
  'fitted',
  'fixed',
  'truth',
  'analytic',
  'synthetic',
]);

/** How an uncertainty is given. */
export const UNCERTAINTY_KINDS = Object.freeze(['sigma', 'interval', 'none']);

/**
 * Where an uncertainty comes from.
 *   data     the scatter or the error bars of the data
 *   model    the model's own error, such as an integrator's
 *   assumed  stated, not estimated
 *   scaled   a data sigma rescaled, by reduced chi-square or a noise factor
 *   profile  from a likelihood profile (a Delta chi-square interval)
 */
export const BASES = Object.freeze([
  'data',
  'model',
  'assumed',
  'scaled',
  'profile',
]);

/** What made the result. */
export const SOURCE_KINDS = Object.freeze([
  'simulation',
  'observation',
  'data-pack',
  'pipeline',
  'inference',
  'experiment',
  'analysis',
  'guide',
  'forward-model',
]);

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim() !== '';

/**
 * Everything wrong with an envelope, as {path, code, message}.
 * @param {unknown} doc
 * @returns {Array<{path: string, code: string, message: string}>}
 */
export function validateArtifact(doc) {
  const problems = [];
  const need = (ok, path, code, message) => {
    if (!ok) problems.push({ path, code, message });
    return ok;
  };
  if (!need(isObject(doc), '', 'notObject', 'is not an object'))
    return problems;

  need(doc.format === FORMAT, 'format', 'format', `is not "${FORMAT}"`);
  need(
    doc.formatVersion === FORMAT_VERSION,
    'formatVersion',
    'version',
    `is not ${FORMAT_VERSION}`
  );
  need(isText(doc.id), 'id', 'required', 'is required');

  if (need(isObject(doc.made), 'made', 'required', 'is required')) {
    need(isText(doc.made.app), 'made.app', 'required', 'is required');
  }

  if (need(isObject(doc.source), 'source', 'required', 'is required')) {
    need(
      SOURCE_KINDS.includes(doc.source.kind),
      'source.kind',
      'enum',
      `is not one of ${SOURCE_KINDS.join(', ')}`
    );
    need(isText(doc.source.id), 'source.id', 'required', 'is required');
    if (doc.source.digest !== undefined)
      need(
        /^[0-9a-f]{8,64}$/.test(doc.source.digest),
        'source.digest',
        'digest',
        'is not a hex digest'
      );
  }

  if (doc.provenance !== undefined) {
    const p = doc.provenance;
    if (need(isObject(p), 'provenance', 'type', 'is not an object')) {
      for (const key of ['citations', 'reductions'])
        if (p[key] !== undefined)
          need(
            Array.isArray(p[key]),
            `provenance.${key}`,
            'type',
            'is not a list'
          );
      if (p.license !== undefined)
        need(
          isObject(p.license) && isText(p.license.status),
          'provenance.license.status',
          'required',
          'is required'
        );
    }
  }

  if (
    need(Array.isArray(doc.quantities), 'quantities', 'required', 'is a list')
  ) {
    const ids = new Set();
    doc.quantities.forEach((q, i) => {
      const at = `quantities[${i}]`;
      if (!need(isObject(q), at, 'type', 'is not an object')) return;
      if (need(isText(q.id), `${at}.id`, 'required', 'is required')) {
        need(!ids.has(q.id), `${at}.id`, 'duplicate', `repeats "${q.id}"`);
        ids.add(q.id);
      }
      need(
        typeof q.value === 'number' && Number.isFinite(q.value),
        `${at}.value`,
        'number',
        'is not a finite number'
      );
      // A registry id, exactly: the envelope is the canonical form, so a
      // spelling the registry would accept ("days") is not enough here. Null
      // is "not stated", which a unit is until someone states it; it is never
      // guessed, and '' would claim the number is dimensionless.
      need(
        q.unit === null ||
          (typeof q.unit === 'string' && Object.hasOwn(UNITS, q.unit)),
        `${at}.unit`,
        'unit',
        `"${q.unit}" is not an id of js/units/registry.js`
      );
      need(
        ORIGINS.includes(q.origin),
        `${at}.origin`,
        'enum',
        `is not one of ${ORIGINS.join(', ')}`
      );
      problems.push(...uncertaintyProblems(q.uncertainty, `${at}.uncertainty`));
    });
  }

  if (doc.warnings !== undefined)
    need(Array.isArray(doc.warnings), 'warnings', 'type', 'is not a list');
  return problems;
}

/** What is wrong with one quantity's uncertainty. */
function uncertaintyProblems(u, at) {
  const out = [];
  const need = (ok, path, code, message) => {
    if (!ok) out.push({ path, code, message });
  };
  if (!isObject(u)) {
    need(false, at, 'required', 'is required (kind none says there is none)');
    return out;
  }
  need(
    UNCERTAINTY_KINDS.includes(u.kind),
    `${at}.kind`,
    'enum',
    `is not one of ${UNCERTAINTY_KINDS.join(', ')}`
  );
  if (u.kind === 'none') return out;
  need(
    BASES.includes(u.basis),
    `${at}.basis`,
    'enum',
    `is not one of ${BASES.join(', ')}`
  );
  if (u.kind === 'sigma')
    need(u.sigma >= 0, `${at}.sigma`, 'number', 'is not a number >= 0');
  if (u.kind === 'interval') {
    need(
      Number.isFinite(u.lo) && Number.isFinite(u.hi) && u.lo <= u.hi,
      `${at}.lo`,
      'interval',
      'lo and hi are not an interval'
    );
    need(
      u.level === undefined || (u.level > 0 && u.level < 1),
      `${at}.level`,
      'number',
      'is not a probability between 0 and 1'
    );
  }
  return out;
}

/**
 * An envelope around quantities, with what every producer sets alike.
 * @param {{id: string, source: object, quantities: object[],
 *   provenance?: object, warnings?: string[], made?: object}} parts
 * @returns {object} The envelope; validateArtifact() says whether it is one
 */
export function artifact({
  id,
  source,
  quantities,
  provenance,
  warnings,
  made,
}) {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id,
    made: { app: 'gravitas', ...made },
    source,
    ...(provenance ? { provenance } : {}),
    quantities,
    ...(warnings?.length ? { warnings } : {}),
  };
}
