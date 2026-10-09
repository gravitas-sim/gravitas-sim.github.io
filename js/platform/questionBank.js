// =============================================================================
// gravitas.question-bank/1: questions an investigation can draw on, as data
// -----------------------------------------------------------------------------
// A bank item is one question - a choice, a number or a short written answer -
// with everything a lesson's own question step carries (its prompt, its
// answer, its tolerance and unit, its staged hints, its misconceptions, its
// rubric), and three things a step in a lesson file does not:
//
//   identity   a stable id and an integer version. The version goes up with
//              any change that could change a grade, so a recorded answer can
//              always be matched to the question it answered.
//   scoring    how many points it is worth, and whether the first attempt or
//              the best one counts. Explicit, because "correct" is not a score.
//   variants   controlled ways of asking the same question. A choice question
//              may shuffle its options; a numeric one may take its numbers from
//              a vetted relation (./relations.js) with a list of inputs, so
//              every variant's answer is computed by Gravitas and none is typed
//              or evaluated from text. Which variant a lesson gets is decided
//              by a recorded seed, so the same seed always builds the same
//              lesson (js/composer/compile.js).
//
// and accessibility metadata: whether the question can be answered from its
// text alone, and a note for a reader who cannot use the simulation.
//
// A bank is its own file, or embedded in an investigation pack
// (./investigation.js). Pure, so the Studio, the SDK and the tests share it;
// what it needs to know about Gravitas arrives as `api`.
// =============================================================================

import { RELATIONS, evaluateRelation } from './relations.js';
import { knownKeys } from './checker.js';

// The same lists as js/answerFeedback.js, written out here because this module
// serves routes that do not otherwise load the lesson engine's grader, and a
// shared import would cost each of them a request. tests/scaffoldRules.test.js
// holds the two equal.
export const FEEDBACK_CLASSES = Object.freeze([
  'correct',
  'close',
  'wrong-sign',
  'wrong-unit',
  'wrong-order-of-magnitude',
  'off',
]);
export const HINT_LIMIT = 3;

export const BANK_FORMAT = 'gravitas.question-bank';
export const BANK_FORMAT_VERSION = 1;

export const ITEM_KINDS = Object.freeze(['choice', 'numeric', 'short']);
export const ATTEMPT_RULES = Object.freeze(['first', 'best']);
export const MAX_ITEMS = 200;
export const MAX_POINTS = 10;
const MAX_OPTIONS = 6;
const MAX_VARIANTS = 12;
const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const ITEM_FIELDS = new Set([
  'id',
  'version',
  'kind',
  'prompt',
  'options',
  'answer',
  'because',
  'unit',
  'tolerance',
  'expect',
  'hints',
  'worked',
  'misconceptions',
  'feedback',
  'reflect',
  'rubric',
  'rubricCriteria',
  'scoring',
  'a11y',
  'variants',
]);

/** The {name} placeholders in a text. */
export const placeholders = text =>
  new Set(
    [...String(text).matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(m => m[1])
  );

/**
 * A `unit` field names a unit of the registry (`api.isUnit`), or is empty.
 * One error, one code, on the field's own path; an api without `isUnit`
 * (a caller that has no registry) is not asked.
 *
 * @param {unknown} unit - The field
 * @param {string} path - Where it sits
 * @param {object} ctx
 * @param {Function} ctx.need - (ok, path, code, message, vars) from the caller
 * @param {object} ctx.api - What Gravitas has: `isUnit` (text -> boolean)
 */
export function checkUnitName(unit, path, { need, api }) {
  if (typeof unit !== 'string' || unit.length > 16 || !api.isUnit) return;
  need(
    api.isUnit(unit),
    path,
    'unitUnknown',
    `"${unit}" is not a unit Gravitas knows (for example days, km/s or AU)`,
    { unit }
  );
}

/** A written answer's rubric criteria (Prompt 79, js/rubric.js): the shape only. */
function checkCriteria(list, path, { need, text }) {
  if (list === undefined) return;
  const ok = Array.isArray(list) && list.length > 0 && list.length < 7;
  need(ok, path, 'list', 'a list of one to six criteria');
  const obj = (v, at, names) =>
    isObject(v)
      ? knownKeys(need, v, names, at, 'a field here')
      : need(false, at, 'notObject', 'is not an object');
  (ok ? list : []).forEach((c, i) => {
    const at = `${path}[${i}]`;
    obj(c, at, ['name', 'levels']);
    if (!isObject(c)) return;
    text(c.name, `${at}.name`, true);
    const lv = Array.isArray(c.levels) ? c.levels : [];
    need(
      lv.length > 1 && lv.length < 6,
      `${at}.levels`,
      'list',
      'two to five levels, best first'
    );
    lv.forEach((l, j) => {
      const a = `${at}.levels[${j}]`;
      obj(l, a, ['label', 'text', 'points']);
      if (!isObject(l)) return;
      text(l.label, `${a}.label`, true);
      text(l.text, `${a}.text`, true);
      need(
        l.points === undefined || (Number.isFinite(l.points) && l.points >= 0),
        `${a}.points`,
        'number',
        'a number of points, from 0'
      );
    });
  });
}

/**
 * Judge one bank item.
 *
 * @param {unknown} item
 * @param {string} path - Where it sits, for the messages
 * @param {object} ctx
 * @param {Function} ctx.need - (ok, path, code, message, vars) from the caller
 * @param {Function} ctx.text - (value, path, required) from the caller
 * @param {object} ctx.api - What Gravitas has: `units` (dimension -> unit names)
 */
export function checkBankItem(item, path, { need, text, api }) {
  if (!isObject(item))
    return need(false, path, 'notObject', 'is not an object');
  knownKeys(need, item, [...ITEM_FIELDS], path, 'a bank-item field');
  need(
    typeof item.id === 'string' && PUBLIC_ID.test(item.id),
    `${path}.id`,
    'id',
    'a public id such as "kepler-period"'
  );
  need(
    Number.isInteger(item.version) && item.version >= 1,
    `${path}.version`,
    'itemVersion',
    'a whole number from 1, raised whenever a grade could change'
  );
  const kind = item.kind;
  need(
    ITEM_KINDS.includes(kind),
    `${path}.kind`,
    'kind',
    `one of ${ITEM_KINDS.join(', ')}`,
    {
      options: ITEM_KINDS.join(', '),
    }
  );
  text(item.prompt, `${path}.prompt`, true);
  text(item.because, `${path}.because`, kind !== 'short');
  text(item.worked, `${path}.worked`, false);

  need(
    kind === 'short' || item.rubricCriteria === undefined,
    `${path}.rubricCriteria`,
    'notHere',
    'only a written answer has them'
  );
  const v = item.variants;
  if (v !== undefined && !isObject(v))
    need(false, `${path}.variants`, 'notObject', 'is not an object');

  if (kind === 'choice') {
    const opts = Array.isArray(item.options) ? item.options : null;
    need(
      opts && opts.length >= 2 && opts.length <= MAX_OPTIONS,
      `${path}.options`,
      'options',
      `from 2 to ${MAX_OPTIONS} options`,
      { min: 2, max: MAX_OPTIONS }
    );
    (opts || []).forEach((o, i) => text(o, `${path}.options[${i}]`, true));
    need(
      Number.isInteger(item.answer) &&
        opts &&
        item.answer >= 0 &&
        item.answer < opts.length,
      `${path}.answer`,
      'choiceAnswer',
      'the number of the right option, counting from 0'
    );
    // A wrong option can name the mistake it is: `option` is its number, and
    // shuffled options have no fixed number.
    if (item.misconceptions !== undefined) {
      const list = Array.isArray(item.misconceptions)
        ? item.misconceptions
        : null;
      need(
        list && list.length <= 6 && !(isObject(v) && v.shuffle),
        `${path}.misconceptions`,
        'list',
        'a list of at most six, on options that are not shuffled'
      );
      (list || []).forEach((m, i) => {
        const at = `${path}.misconceptions[${i}]`;
        if (!isObject(m))
          return need(false, at, 'notObject', 'is not an object');
        knownKeys(
          need,
          m,
          ['id', 'option', 'say'],
          at,
          'a misconception field'
        );
        need(
          typeof m.id === 'string' && PUBLIC_ID.test(m.id),
          `${at}.id`,
          'id',
          'a public id'
        );
        need(
          Number.isInteger(m.option) &&
            opts &&
            m.option >= 0 &&
            m.option < opts.length &&
            m.option !== item.answer,
          `${at}.option`,
          'misconceptionOption',
          'the number of a wrong option, counting from 0'
        );
        text(m.say, `${at}.say`, true);
      });
    }
    if (isObject(v)) {
      knownKeys(need, v, ['shuffle'], `${path}.variants`, 'a choice variant');
      need(
        v.shuffle === true,
        `${path}.variants.shuffle`,
        'shuffle',
        'true, or leave variants out'
      );
    }
  } else if (kind === 'numeric') {
    need(
      item.options === undefined,
      `${path}.options`,
      'notHere',
      'a numeric question has no options'
    );
    const relation = isObject(v) ? v.relation : undefined;
    if (relation === undefined) {
      need(
        typeof item.answer === 'number' &&
          Number.isFinite(item.answer) &&
          item.answer !== 0,
        `${path}.answer`,
        'numericAnswer',
        'a number, not zero'
      );
      need(
        typeof item.tolerance === 'number' &&
          item.tolerance > 0 &&
          Number.isFinite(item.tolerance),
        `${path}.tolerance`,
        'tolerance',
        'a positive number, in the unit of the answer'
      );
    } else {
      checkRelationVariants(item, path, { need });
    }
    if (item.unit !== undefined)
      need(
        typeof item.unit === 'string' && item.unit.length <= 16,
        `${path}.unit`,
        'unit',
        'a unit such as "km/s"'
      );
    if (item.unit !== undefined)
      checkUnitName(item.unit, `${path}.unit`, { need, api });
    if (item.expect !== undefined)
      checkExpect(item.expect, `${path}.expect`, { need, api });
    if (item.feedback !== undefined) {
      if (!isObject(item.feedback))
        need(false, `${path}.feedback`, 'notObject', 'is not an object');
      else
        for (const k of Object.keys(item.feedback)) {
          need(
            FEEDBACK_CLASSES.includes(k),
            `${path}.feedback.${k}`,
            'feedbackClass',
            `one of ${FEEDBACK_CLASSES.join(', ')}`,
            { options: FEEDBACK_CLASSES.join(', ') }
          );
          text(item.feedback[k], `${path}.feedback.${k}`, true);
        }
    }
    if (item.misconceptions !== undefined) {
      const list = Array.isArray(item.misconceptions)
        ? item.misconceptions
        : null;
      need(
        list && list.length <= 6,
        `${path}.misconceptions`,
        'list',
        'a list of at most six'
      );
      (list || []).forEach((m, i) => {
        const at = `${path}.misconceptions[${i}]`;
        if (!isObject(m))
          return need(false, at, 'notObject', 'is not an object');
        knownKeys(
          need,
          m,
          ['id', 'factor', 'equals', 'say'],
          at,
          'a misconception field'
        );
        need(
          typeof m.id === 'string' && PUBLIC_ID.test(m.id),
          `${at}.id`,
          'id',
          'a public id'
        );
        need(
          (typeof m.factor === 'number' &&
            Number.isFinite(m.factor) &&
            m.factor > 0) !==
            (typeof m.equals === 'number' && Number.isFinite(m.equals)),
          at,
          'misconception',
          'either a factor the answer is off by, or the number it equals'
        );
        text(m.say, `${at}.say`, true);
      });
    }
  } else if (kind === 'short') {
    // A reflection has no rubric, because nothing marks it.
    if (item.reflect !== undefined)
      need(
        item.reflect === true &&
          item.rubric === undefined &&
          item.hints === undefined &&
          item.worked === undefined,
        `${path}.reflect`,
        'reflect',
        'true, on a written answer with no rubric, hints or worked answer'
      );
    else text(item.rubric, `${path}.rubric`, true);
    checkCriteria(item.rubricCriteria, `${path}.rubricCriteria`, {
      need,
      text,
    });
    for (const k of [
      'options',
      'answer',
      'tolerance',
      'unit',
      'expect',
      'misconceptions',
      'feedback',
    ])
      need(
        item[k] === undefined,
        `${path}.${k}`,
        'notHere',
        'a short answer is marked by its rubric, not checked'
      );
    need(
      v === undefined,
      `${path}.variants`,
      'notHere',
      'a short answer has no variants'
    );
  }

  if (item.hints !== undefined) {
    if (Array.isArray(item.hints)) {
      // The ladder: up to three, each shown when asked for.
      need(
        item.hints.length >= 1 && item.hints.length <= HINT_LIMIT,
        `${path}.hints`,
        'hintsLadder',
        `from one to ${HINT_LIMIT} hints`,
        { max: HINT_LIMIT }
      );
      item.hints.forEach((h, i) => text(h, `${path}.hints[${i}]`, true));
    } else if (!isObject(item.hints))
      need(false, `${path}.hints`, 'notObject', 'is not an object or a list');
    else {
      knownKeys(
        need,
        item.hints,
        ['concept', 'method'],
        `${path}.hints`,
        'a hint stage'
      );
      text(item.hints.concept, `${path}.hints.concept`, false);
      text(item.hints.method, `${path}.hints.method`, false);
      need(
        item.hints.method === undefined || item.hints.concept !== undefined,
        `${path}.hints`,
        'hintsOrder',
        'a method hint comes after a concept hint'
      );
    }
  }

  const s = item.scoring;
  if (!isObject(s))
    need(
      false,
      `${path}.scoring`,
      'scoring',
      'how many points, and which attempt counts'
    );
  else {
    knownKeys(
      need,
      s,
      ['points', 'attempts'],
      `${path}.scoring`,
      'a scoring field'
    );
    need(
      Number.isInteger(s.points) && s.points >= 1 && s.points <= MAX_POINTS,
      `${path}.scoring.points`,
      'points',
      `a whole number from 1 to ${MAX_POINTS}`,
      { max: MAX_POINTS }
    );
    need(
      ATTEMPT_RULES.includes(s.attempts),
      `${path}.scoring.attempts`,
      'attempts',
      'first or best'
    );
  }

  const a = item.a11y;
  if (!isObject(a))
    need(
      false,
      `${path}.a11y`,
      'a11y',
      'whether it can be answered from its text alone'
    );
  else {
    knownKeys(
      need,
      a,
      ['textOnly', 'note'],
      `${path}.a11y`,
      'an accessibility field'
    );
    need(
      typeof a.textOnly === 'boolean',
      `${path}.a11y.textOnly`,
      'bool',
      'true or false'
    );
    text(a.note, `${path}.a11y.note`, a.textOnly === false);
  }
}

/** The answer parser's unit expectation: a dimension, a unit and what else is accepted. */
function checkExpect(e, path, { need, api }) {
  if (!isObject(e)) return need(false, path, 'notObject', 'is not an object');
  knownKeys(need, e, ['dimension', 'unit', 'accept'], path, 'an expect field');
  const units = api.units?.[e.dimension];
  need(
    Boolean(units),
    `${path}.dimension`,
    'dimension',
    `one of ${Object.keys(api.units || {}).join(', ')}`,
    {
      options: Object.keys(api.units || {}).join(', '),
    }
  );
  if (!units) return;
  const known = u => units.includes(String(u).toLowerCase());
  need(
    known(e.unit),
    `${path}.unit`,
    'expectUnit',
    `a ${e.dimension} unit the parser reads`,
    { dimension: e.dimension }
  );
  if (e.accept !== undefined) {
    const list = Array.isArray(e.accept) ? e.accept : null;
    need(
      list && list.length <= 8,
      `${path}.accept`,
      'list',
      'a list of at most eight units'
    );
    // The parser takes only the units listed, so the graded one must be among
    // them, or a student who types it is told it is not a unit.
    need(
      !list ||
        list.some(
          u => String(u).toLowerCase() === String(e.unit).toLowerCase()
        ),
      `${path}.accept`,
      'acceptUnit',
      `must include "${e.unit}", the unit it is graded in`,
      { unit: String(e.unit) }
    );
    (list || []).forEach((u, i) =>
      need(
        known(u),
        `${path}.accept[${i}]`,
        'expectUnit',
        `a ${e.dimension} unit the parser reads`,
        { dimension: e.dimension }
      )
    );
  }
}

/** A numeric item's inputs, drawn from a vetted relation. */
function checkRelationVariants(item, itemPath, { need }) {
  const v = item.variants;
  const path = `${itemPath}.variants`;
  knownKeys(
    need,
    v,
    ['relation', 'values', 'tolerancePct'],
    path,
    'a numeric variant field'
  );
  const r = Object.hasOwn(RELATIONS, v.relation) ? RELATIONS[v.relation] : null;
  need(
    Boolean(r),
    `${path}.relation`,
    'relation',
    `one of ${Object.keys(RELATIONS).join(', ')}`,
    {
      options: Object.keys(RELATIONS).join(', '),
    }
  );
  need(
    typeof v.tolerancePct === 'number' &&
      v.tolerancePct >= 0.5 &&
      v.tolerancePct <= 25,
    `${path}.tolerancePct`,
    'tolerancePct',
    'a tolerance from 0.5 to 25 percent of the answer'
  );
  need(
    item.answer === undefined,
    `${itemPath}.answer`,
    'notHere',
    'the relation computes the answer'
  );
  need(
    item.tolerance === undefined,
    `${itemPath}.tolerance`,
    'notHere',
    'the tolerance is tolerancePct of the answer'
  );
  const list = Array.isArray(v.values) ? v.values : null;
  need(
    list && list.length >= 1 && list.length <= MAX_VARIANTS,
    `${path}.values`,
    'variantValues',
    `from 1 to ${MAX_VARIANTS} sets of inputs`,
    { max: MAX_VARIANTS }
  );
  if (!r || !list) return;
  need(
    r.output.unit === ''
      ? item.unit === undefined
      : item.unit === r.output.unit,
    `${itemPath}.unit`,
    'relationUnit',
    r.output.unit
      ? `"${r.output.unit}", the unit the relation answers in`
      : 'none: the relation answers with a pure number',
    { unit: r.output.unit }
  );
  const answers = [];
  list.forEach((values, i) => {
    const got = evaluateRelation(v.relation, values);
    if (!got.ok) {
      for (const p of got.problems)
        need(
          false,
          `${path}.values[${i}]${p.input ? `.${p.input}` : ''}`,
          p.code,
          'is not an input this relation takes',
          p.vars
        );
      return;
    }
    answers.push({ i, answer: got.answer });
  });
  // Every variant a different answer, and none close enough to another to be
  // marked right for it: a student copying a neighbour's number learns nothing.
  const tol = (v.tolerancePct || 0) / 100;
  for (let a = 0; a < answers.length; a++) {
    for (let b = a + 1; b < answers.length; b++) {
      const [x, y] = [answers[a].answer, answers[b].answer];
      need(
        Math.abs(x - y) > 2 * tol * Math.max(x, y),
        `${path}.values[${answers[b].i}]`,
        'variantsClose',
        'gives an answer within the tolerance of another variant',
        { other: answers[a].i + 1 }
      );
    }
  }
  // The prompt must say every input, in every language, or a variant asks a
  // question it has not stated.
  const names = Object.keys(r.inputs);
  for (const [locale, t] of Object.entries(
    isObject(item.prompt) ? item.prompt : {}
  )) {
    if (locale === 'esOf' || typeof t !== 'string') continue;
    const found = placeholders(t);
    for (const n of names)
      need(
        found.has(n),
        `${itemPath}.prompt.${locale}`,
        'placeholder',
        `must say {${n}}`,
        { name: n }
      );
    for (const n of found)
      need(
        names.includes(n),
        `${itemPath}.prompt.${locale}`,
        'placeholderUnknown',
        `{${n}} is not an input of this relation`,
        { name: n }
      );
  }
}

/**
 * Every problem with a question-bank file.
 *
 * @param {unknown} b - A parsed bank
 * @param {object} api - What Gravitas has (see ./checker.js makeChecker)
 * @param {Function} makeChecker - ./checker.js's, which owns the text
 *   rules both formats share
 * @returns {Array<{path: string, code: string, vars: object, message: string}>}
 */
export function validateQuestionBankWith(b, api, makeChecker) {
  const { out, need, text, guard } = makeChecker(b, api);
  if (!guard()) return out;
  if (!isObject(b)) return out;
  for (const k of Object.keys(b))
    need(
      [
        'format',
        'formatVersion',
        'id',
        'version',
        'locales',
        'title',
        'items',
      ].includes(k),
      k,
      'unknownField',
      `"${k}" is not a question-bank field`,
      { key: k }
    );
  need(
    b.format === BANK_FORMAT,
    'format',
    'format',
    `must be "${BANK_FORMAT}"`
  );
  need(
    b.formatVersion === BANK_FORMAT_VERSION,
    'formatVersion',
    'formatVersion',
    `must be ${BANK_FORMAT_VERSION}`
  );
  need(
    typeof b.id === 'string' && PUBLIC_ID.test(b.id),
    'id',
    'id',
    'a public id such as "orbits-bank"'
  );
  need(
    /^\d+\.\d+\.\d+$/.test(b.version || ''),
    'version',
    'version',
    'a version such as "1.0.0"'
  );
  text(b.title, 'title', true);
  checkItems(b.items, 'items', { need, text, api });
  return out;
}

/** A list of items with unique ids. */
export function checkItems(items, path, ctx) {
  const list = Array.isArray(items) ? items : null;
  ctx.need(
    list && list.length <= MAX_ITEMS,
    path,
    'list',
    `a list of at most ${MAX_ITEMS} items`,
    { max: MAX_ITEMS }
  );
  const seen = new Set();
  (list || []).forEach((item, i) => {
    checkBankItem(item, `${path}[${i}]`, ctx);
    if (isObject(item) && typeof item.id === 'string') {
      ctx.need(
        !seen.has(item.id),
        `${path}[${i}].id`,
        'repeat',
        'another item has this id'
      );
      seen.add(item.id);
    }
  });
}
