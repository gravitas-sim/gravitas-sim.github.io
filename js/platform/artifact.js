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
import { ID_ARTIFACT } from '../names.js';

export const FORMAT = ID_ARTIFACT;
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

/**
 * How an uncertainty is given. The first three are the 2.0.0 envelope's; the
 * rest are Prompt 150's, and a 2.0.0 reader refuses them in its own words
 * (FORMATS.md), so a writer that must reach one uses legacyView().
 *   sigma          one standard deviation
 *   interval       lo and hi around the value, not necessarily symmetric,
 *                  with the confidence `level` when it is stated
 *   none           nothing is stated: unknown
 *   not-constrained the data leave the value open (a degenerate direction)
 *   failed         there is no result, and `reason` says why
 *   assumed        taken as exact by the analysis: nothing was estimated
 *   model-limited  the model's own error `floor` bounds the precision, and
 *                  the statistical `sigma`, if given, is below it
 *   limit          a nondetection: the value is an upper or a lower `bound`
 */
export const UNCERTAINTY_KINDS = Object.freeze([
  'sigma',
  'interval',
  'none',
  'not-constrained',
  'failed',
  'assumed',
  'model-limited',
  'limit',
]);

/** The kinds a 2.0.0 reader knows. */
export const LEGACY_UNCERTAINTY_KINDS = Object.freeze(
  UNCERTAINTY_KINDS.slice(0, 3)
);

/** Why quantities are correlated, where an envelope says they are. */
export const CORRELATION_BASES = Object.freeze([
  'data',
  'calibration',
  'model',
  'fit',
]);

/**
 * Where an uncertainty comes from.
 *   data     the scatter or the error bars of the data
 *   model    the model's own error, such as an integrator's
 *   assumed  stated, not estimated
 *   scaled   a data sigma rescaled, by reduced chi-square or a noise factor
 *   profile  from a likelihood profile (a Delta chi-square interval)
 *   derived  propagated to first order from the inputs' own (Prompt 100)
 */
export const BASES = Object.freeze([
  'data',
  'model',
  'assumed',
  'scaled',
  'profile',
  'derived',
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
  'comparison',
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
      // A failed quantity has no value to state.
      need(
        (typeof q.value === 'number' && Number.isFinite(q.value)) ||
          (q.value === null && q.uncertainty?.kind === 'failed'),
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
    doc.quantities.forEach((q, i) => {
      if (isObject(q) && q.correlatedWith !== undefined)
        problems.push(...correlationProblems(q, `quantities[${i}]`, ids));
    });
  }
  if (doc.fit !== undefined)
    problems.push(...fitProblems(doc.fit, 'fit', doc.quantities));

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
  if (!UNCERTAINTY_KINDS.includes(u.kind) || u.kind === 'none') return out;
  const level = u.level === undefined || (u.level > 0 && u.level < 1);
  if (['sigma', 'interval', 'limit', 'model-limited'].includes(u.kind))
    need(
      BASES.includes(u.basis),
      `${at}.basis`,
      'enum',
      `is not one of ${BASES.join(', ')}`
    );
  if (u.kind === 'sigma')
    need(u.sigma >= 0, `${at}.sigma`, 'number', 'is not a number >= 0');
  if (u.kind === 'interval')
    need(
      Number.isFinite(u.lo) && Number.isFinite(u.hi) && u.lo <= u.hi,
      `${at}.lo`,
      'interval',
      'lo and hi are not an interval'
    );
  if (u.kind === 'limit')
    need(
      u.bound === 'upper' || u.bound === 'lower',
      `${at}.bound`,
      'enum',
      'is not upper or lower'
    );
  if (u.kind === 'model-limited') {
    need(u.floor >= 0, `${at}.floor`, 'number', 'is not a number >= 0');
    need(
      u.sigma === undefined || (u.sigma >= 0 && u.sigma <= u.floor),
      `${at}.sigma`,
      'number',
      'is not a number between 0 and the floor'
    );
  }
  if (u.kind === 'failed')
    need(isText(u.reason), `${at}.reason`, 'required', 'is required');
  need(level, `${at}.level`, 'number', 'is not a probability between 0 and 1');
  return out;
}

/** What is wrong with the correlations one quantity names. */
function correlationProblems(q, at, ids) {
  const out = [];
  const need = (ok, path, code, message) => {
    if (!ok) out.push({ path, code, message });
    return ok;
  };
  if (
    !need(
      Array.isArray(q.correlatedWith),
      `${at}.correlatedWith`,
      'type',
      'is not a list'
    )
  )
    return out;
  q.correlatedWith.forEach((c, i) => {
    const here = `${at}.correlatedWith[${i}]`;
    if (!need(isObject(c), here, 'type', 'is not an object')) return;
    need(
      ids.has(c.id) && c.id !== q.id,
      `${here}.id`,
      'reference',
      'is not another quantity of this envelope'
    );
    need(
      Number.isFinite(c.rho) && Math.abs(c.rho) <= 1,
      `${here}.rho`,
      'number',
      'is not a coefficient between -1 and 1'
    );
    need(
      c.basis === undefined || CORRELATION_BASES.includes(c.basis),
      `${here}.basis`,
      'enum',
      `is not one of ${CORRELATION_BASES.join(', ')}`
    );
  });
  return out;
}

/**
 * What is wrong with a fit-result record (Prompt 150): the model, which
 * parameters, their covariance in a stated order and units, the statistic, a
 * summary of the residuals, the data it read, the fitter's settings and seed,
 * whether it converged, and whether the data fix every parameter.
 */
function fitProblems(f, at, quantities) {
  const out = [];
  const need = (ok, path, code, message) => {
    if (!ok) out.push({ path: `${at}${path}`, code, message });
    return ok;
  };
  if (!need(isObject(f), '', 'type', 'is not an object')) return out;
  const ids = new Set((quantities ?? []).map(q => q?.id));
  const known = list => Array.isArray(list) && list.every(id => ids.has(id));
  if (
    need(
      isObject(f.model) && isText(f.model.id),
      '.model',
      'required',
      'needs an id'
    )
  )
    need(isText(f.model.version), '.model.version', 'required', 'is required');
  need(
    known(f.parameters),
    '.parameters',
    'reference',
    'is not a list of quantity ids'
  );
  if (f.covariance !== undefined && f.covariance !== null) {
    const c = f.covariance;
    if (need(isObject(c), '.covariance', 'type', 'is not an object or null')) {
      const n = Array.isArray(c.order) ? c.order.length : -1;
      need(
        known(c.order),
        '.covariance.order',
        'reference',
        'is not a list of quantity ids'
      );
      const square =
        Array.isArray(c.values) &&
        c.values.length === n &&
        c.values.every(
          r => Array.isArray(r) && r.length === n && r.every(Number.isFinite)
        );
      if (
        need(
          square,
          '.covariance.values',
          'matrix',
          'is not a square matrix of the order named'
        )
      ) {
        for (let i = 0; i < n; i++) {
          need(
            c.values[i][i] >= 0,
            `.covariance.values[${i}][${i}]`,
            'number',
            'is a negative variance'
          );
          for (let j = 0; j < i; j++)
            need(
              Math.abs(c.values[i][j] - c.values[j][i]) <=
                1e-9 * (Math.abs(c.values[i][j]) + Math.abs(c.values[j][i])),
              `.covariance.values[${i}][${j}]`,
              'matrix',
              'is not symmetric'
            );
        }
      }
      need(
        Array.isArray(c.units) &&
          c.units.length === n &&
          c.units.every(u => u === null || Object.hasOwn(UNITS, u)),
        '.covariance.units',
        'unit',
        'is not one registry unit (or null) per parameter in the order'
      );
    }
  }
  if (f.statistic !== undefined)
    need(
      isObject(f.statistic) &&
        isText(f.statistic.name) &&
        Number.isFinite(f.statistic.value) &&
        f.statistic.dof >= 0,
      '.statistic',
      'required',
      'needs a name, a value and degrees of freedom'
    );
  if (f.residuals !== undefined)
    need(
      isObject(f.residuals) && f.residuals.n >= 0 && f.residuals.rms >= 0,
      '.residuals',
      'required',
      'needs a count n and an rms'
    );
  if (f.convergence !== undefined)
    need(
      isObject(f.convergence) && typeof f.convergence.converged === 'boolean',
      '.convergence',
      'required',
      'needs converged: true or false'
    );
  if (f.rank !== undefined) {
    const r = f.rank;
    need(
      isObject(r) &&
        Number.isInteger(r.free) &&
        Number.isInteger(r.rank) &&
        r.rank >= 0 &&
        r.rank <= r.free &&
        (r.status === 'full' || r.status === 'deficient') &&
        known(r.notConstrained),
      '.rank',
      'required',
      'needs free, rank, a status of full or deficient and notConstrained ids'
    );
  }
  return out;
}

/**
 * The envelope as a 2.0.0 reader can open it. The extension (Prompt 150) is
 * written only where such a reader would not meet it; a writer that must
 * reach one calls this, which turns each state a 2.0.0 reader refuses into
 * `none` and lists what it did in the warnings, one `extended:<id>:<kind>`
 * each, so nothing is dropped without a trace. A limit, a floor and a failed
 * quantity keep their value but lose what made them one, which is the loss:
 * the mapping is exact for the three 2.0.0 kinds and for them alone, and
 * `fit` and `correlatedWith`, which a 2.0.0 reader would silently drop, are
 * left out here as well.
 * @param {object} doc - A valid envelope
 * @returns {object} A new envelope; `doc` is not changed
 */
export function legacyView(doc) {
  const warnings = [...(doc.warnings ?? [])];
  const rest = { ...doc };
  delete rest.fit;
  const quantities = doc.quantities.map(q => {
    const base = { ...q };
    delete base.correlatedWith;
    if (LEGACY_UNCERTAINTY_KINDS.includes(q.uncertainty.kind)) return base;
    warnings.push(`extended:${q.id}:${q.uncertainty.kind}`);
    return { ...base, uncertainty: { kind: 'none' } };
  });
  return {
    ...rest,
    quantities: quantities.filter(q => q.value !== null),
    ...(warnings.length ? { warnings } : {}),
  };
}

/**
 * An envelope around quantities, with what every producer sets alike.
 * @param {{id: string, source: object, quantities: object[],
 *   provenance?: object, warnings?: string[], made?: object,
 *   fit?: object}} parts
 * @returns {object} The envelope; validateArtifact() says whether it is one
 */
export function artifact({
  id,
  source,
  quantities,
  provenance,
  warnings,
  made,
  fit,
}) {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id,
    made: { app: 'gravitas', ...made },
    source,
    ...(provenance ? { provenance } : {}),
    quantities,
    ...(fit ? { fit } : {}),
    ...(warnings?.length ? { warnings } : {}),
  };
}
