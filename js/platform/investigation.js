// =============================================================================
// gravitas.investigation-pack/1: a guided investigation, as data
// -----------------------------------------------------------------------------
// A lesson in Gravitas is a module in js/data/investigations/, and most of what
// is in one is data: titles, bodies, prompts, options, answers, tolerances,
// hints, rubrics, the scenario a step opens and the instrument it docks. Some
// of it is code - a measure step's feedback, a live readout, a computed field -
// and code only a reviewed commit may add (STUDIO_ROUNDTRIP_GATE.md). An
// investigation pack is exactly the data part, with the step types the engine
// already runs and the answer checks it already has, and nothing else:
//
//   read      words, and the scenario or instrument they are about
//   predict   a held prediction, marked at a later step it names (`reveal`)
//   explore   something to do, as a checklist
//   measure   numbers to record from the instrument, each with its unit
//   question  a choice, a number or a short written answer - inline, or drawn
//             from a question bank (./questionBank.js) by id
//
// Any step may be remediation: shown only when an earlier graded step was
// answered wrongly (or rightly), which is the one branch this format has
// (`when`, one level deep - see checkWhen below).
//
// Text is {en, es?, esOf?}: the English, the Spanish, and a digest of the
// English the Spanish was written from, so a translation is known to be stale
// the moment its English changes. Lesson prose may use the four tags and the
// entities the lesson renderer knows (js/lessonMarkup.js) and nothing more:
// no other markup, no links, no script.
//
// js/composer/compile.js turns a pack into the lesson object and Spanish
// shadow the engine runs, and js/authoring/rules.js - the same checker every
// lesson in the repository passes - judges the result. This file is the
// format's own rules, and it is pure: what it needs to know about Gravitas
// arrives as `api`.
// =============================================================================

import { isObject, makeChecker } from './checker.js';
import { checkItems } from './questionBank.js';

export { makeChecker };

export const FORMAT = 'gravitas.investigation-pack';
export const FORMAT_VERSION = 1;

export const STEP_TYPES = Object.freeze([
  'read',
  'predict',
  'explore',
  'measure',
  'question',
]);
export const QUESTION_KINDS = Object.freeze(['choice', 'numeric', 'short']);
export const WHEN_STATES = Object.freeze(['incorrect', 'correct']);

const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const DURATION = /^\d+(-\d+)?\s*min$/;
const FIELD_ID = /^[a-z][a-zA-Z0-9]{0,31}$/;
const MAX_STEPS = 80;
/** A step id as js/investigations/progressSchema.js isValidSid takes it. */
export const isValidSid = sid =>
  typeof sid === 'string' &&
  sid.length <= 80 &&
  PUBLIC_ID.test(sid) &&
  !/^\d+$/.test(sid);

const PACK_FIELDS = new Set([
  'format',
  'formatVersion',
  'id',
  'version',
  'locales',
  'title',
  'subtitle',
  'summary',
  'level',
  'duration',
  'thumbnail',
  'objectives',
  'prerequisites',
  'seed',
  'bank',
  'steps',
]);
const COMMON_STEP = [
  'sid',
  'type',
  'title',
  'body',
  'tip',
  'setup',
  'tool',
  'when',
  'requires',
];
const STEP_FIELDS = {
  read: [],
  explore: ['checklist'],
  measure: ['fields'],
  predict: ['prompt', 'options', 'answer', 'because', 'reveal'],
  question: [
    'kind',
    'from',
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
    'rubric',
    'scoring',
  ],
};

/**
 * Every problem with an investigation pack, each naming the field it is about.
 *
 * `code` and `vars` let a page say it in the reader's language; `message` is
 * the English the SDK and the tests print.
 *
 * @param {unknown} p - A parsed pack
 * @param {object} api - What Gravitas has
 * @param {string[]} api.locales - The interface's locales
 * @param {string[]} api.entities - Entity names lesson prose may use
 * @param {string[]} api.scenarios - Scenario names a step may open
 * @param {string[]} api.widgets - Instrument ids a step may dock
 * @param {string[]} api.lessons - Built-in lesson ids, which a pack may not reuse
 * @param {Record<string, string[]>} api.units - Answer-parser units by dimension
 * @returns {Array<{path: string, code: string, vars: object, message: string}>}
 */
export function validateInvestigationPack(p, api) {
  const { out, need, text, guard, locales } = makeChecker(p, api);
  if (!guard()) return out;

  for (const k of Object.keys(p))
    need(
      PACK_FIELDS.has(k),
      k,
      'unknownField',
      `"${k}" is not an investigation-pack field`,
      { key: k }
    );
  need(p.format === FORMAT, 'format', 'format', `must be "${FORMAT}"`);
  need(
    p.formatVersion === FORMAT_VERSION,
    'formatVersion',
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(
    PUBLIC_ID.test(p.id || ''),
    'id',
    'id',
    'a public id such as "reading-an-orbit"'
  );
  need(
    !(api.lessons || []).includes(p.id),
    'id',
    'idTaken',
    'is the id of a lesson Gravitas already has'
  );
  need(
    SEMVER.test(p.version || ''),
    'version',
    'version',
    'a version such as "1.0.0"'
  );
  need(
    Array.isArray(p.locales) && p.locales.includes('en'),
    'locales',
    'localesEn',
    'must include "en"'
  );
  (Array.isArray(p.locales) ? p.locales : []).forEach((l, i) =>
    need(
      api.locales.includes(l),
      `locales[${i}]`,
      'locale',
      `Gravitas has no "${l}" interface`,
      {
        locale: String(l),
      }
    )
  );
  for (const k of ['title', 'subtitle', 'summary', 'level'])
    text(p[k], k, true);
  need(
    DURATION.test(p.duration || ''),
    'duration',
    'duration',
    'a range such as "20-25 min"'
  );
  if (p.thumbnail !== undefined)
    need(
      api.scenarios.includes(p.thumbnail),
      'thumbnail',
      'scenario',
      'a scenario, whose picture the card shows'
    );
  need(
    Number.isInteger(p.seed) && p.seed >= 0 && p.seed <= 0xffffffff,
    'seed',
    'seed',
    'a whole number from 0 to 4294967295'
  );

  const objectives = Array.isArray(p.objectives) ? p.objectives : null;
  need(
    objectives && objectives.length >= 1 && objectives.length <= 8,
    'objectives',
    'objectives',
    'from one to eight objectives'
  );
  (objectives || []).forEach((o, i) => text(o, `objectives[${i}]`, true));

  if (p.prerequisites !== undefined) {
    const list = Array.isArray(p.prerequisites) ? p.prerequisites : null;
    need(
      list && list.length <= 6,
      'prerequisites',
      'list',
      'a list of at most six'
    );
    (list || []).forEach((r, i) => {
      const at = `prerequisites[${i}]`;
      if (!isObject(r)) return need(false, at, 'notObject', 'is not an object');
      const keys = Object.keys(r);
      need(
        keys.length === 1 && ['lesson', 'text'].includes(keys[0]),
        at,
        'prerequisite',
        'either a lesson or a text'
      );
      if ('lesson' in r)
        need(
          (api.lessons || []).includes(r.lesson),
          `${at}.lesson`,
          'lesson',
          'a lesson Gravitas has'
        );
      if ('text' in r) text(r.text, `${at}.text`, true);
    });
  }

  const bankIds = new Map();
  if (p.bank !== undefined) {
    if (!isObject(p.bank)) need(false, 'bank', 'notObject', 'is not an object');
    else {
      for (const k of Object.keys(p.bank))
        need(
          k === 'items',
          `bank.${k}`,
          'unknownField',
          `"${k}" is not a bank field`,
          { key: k }
        );
      checkItems(p.bank.items, 'bank.items', { need, text, api });
      for (const item of Array.isArray(p.bank.items) ? p.bank.items : [])
        if (isObject(item) && typeof item.id === 'string')
          bankIds.set(item.id, item);
    }
  }

  const steps = Array.isArray(p.steps) ? p.steps : null;
  need(
    steps && steps.length >= 2 && steps.length <= MAX_STEPS,
    'steps',
    'steps',
    `from 2 to ${MAX_STEPS} steps`,
    {
      max: MAX_STEPS,
    }
  );
  const list = steps || [];
  const sidAt = new Map();
  list.forEach((s, i) => {
    if (isObject(s) && typeof s.sid === 'string') {
      need(
        !sidAt.has(s.sid),
        `steps[${i}].sid`,
        'repeat',
        'another step has this id'
      );
      if (!sidAt.has(s.sid)) sidAt.set(s.sid, i);
    }
  });
  const usedItems = new Set();
  list.forEach((s, i) =>
    checkStep(s, `steps[${i}]`, i, {
      need,
      text,
      api,
      steps: list,
      sidAt,
      bankIds,
      usedItems,
      locales,
    })
  );
  // A lesson closes on a summary, not on a question (js/authoring/rules.js
  // content/completion, which says so as a warning; here it is the format).
  const last = list.at(-1);
  if (isObject(last))
    need(
      last.type === 'read' || last.type === 'explore',
      `steps[${list.length - 1}].type`,
      'closing',
      'the last step closes the lesson: a read or an explore step'
    );
  return out;
}

/** Is step `i` a graded step a `when` may name? */
const graded = s =>
  isObject(s) &&
  (s.type === 'predict' ||
    (s.type === 'question' &&
      (s.from !== undefined || s.kind === 'choice' || s.kind === 'numeric')));

function checkStep(s, path, index, ctx) {
  const { need, text, api, steps, sidAt, bankIds, usedItems } = ctx;
  if (!isObject(s)) return need(false, path, 'notObject', 'is not an object');
  need(
    STEP_TYPES.includes(s.type),
    `${path}.type`,
    'stepType',
    `one of ${STEP_TYPES.join(', ')}`,
    {
      options: STEP_TYPES.join(', '),
    }
  );
  const allowed = new Set([...COMMON_STEP, ...(STEP_FIELDS[s.type] || [])]);
  for (const k of Object.keys(s))
    need(
      allowed.has(k),
      `${path}.${k}`,
      'unknownField',
      `"${k}" is not a field of a ${s.type} step`,
      { key: k }
    );
  need(
    isValidSid(s.sid),
    `${path}.sid`,
    'sid',
    'a step id: up to 80 lowercase letters, digits and single hyphens, not only digits'
  );
  const fromBank = s.type === 'question' && s.from !== undefined;
  text(s.title, `${path}.title`, true);
  text(s.body, `${path}.body`, true);
  text(s.tip, `${path}.tip`, false);

  if (s.setup !== undefined) checkSetup(s.setup, `${path}.setup`, ctx);
  if (index === 0)
    need(
      s.setup !== undefined,
      `${path}.setup`,
      'firstSetup',
      'the first step opens a scenario'
    );
  if (s.tool !== undefined) {
    if (!isObject(s.tool))
      need(false, `${path}.tool`, 'notObject', 'is not an object');
    else {
      for (const k of Object.keys(s.tool))
        need(
          k === 'id',
          `${path}.tool.${k}`,
          'unknownField',
          `"${k}" is not a tool field`,
          { key: k }
        );
      need(
        api.widgets.includes(s.tool.id),
        `${path}.tool.id`,
        'widget',
        'an instrument Gravitas has'
      );
    }
  }
  if (s.requires !== undefined) {
    const list = Array.isArray(s.requires) ? s.requires : null;
    need(
      list && list.length <= 6,
      `${path}.requires`,
      'list',
      'a list of at most six'
    );
    (list || []).forEach((sid, j) =>
      need(
        sidAt.has(sid) && sidAt.get(sid) < index,
        `${path}.requires[${j}]`,
        'earlier',
        'an earlier step'
      )
    );
  }
  if (s.when !== undefined) checkWhen(s, path, index, ctx);

  if (s.type === 'explore') {
    const list = Array.isArray(s.checklist) ? s.checklist : null;
    need(
      list && list.length >= 1 && list.length <= 8,
      `${path}.checklist`,
      'checklist',
      'from one to eight things to do'
    );
    (list || []).forEach((c, j) => text(c, `${path}.checklist[${j}]`, true));
  }
  if (s.type === 'measure') {
    const list = Array.isArray(s.fields) ? s.fields : null;
    need(
      list && list.length >= 1 && list.length <= 6,
      `${path}.fields`,
      'fields',
      'from one to six numbers to record'
    );
    const seen = new Set();
    (list || []).forEach((f, j) => {
      const at = `${path}.fields[${j}]`;
      if (!isObject(f)) return need(false, at, 'notObject', 'is not an object');
      for (const k of Object.keys(f))
        need(
          ['id', 'label', 'unit'].includes(k),
          `${at}.${k}`,
          'unknownField',
          `"${k}" is not a field of a measurement`,
          { key: k }
        );
      need(
        FIELD_ID.test(f.id || '') && !seen.has(f.id),
        `${at}.id`,
        'fieldId',
        'a short name such as "period", used once'
      );
      seen.add(f.id);
      text(f.label, `${at}.label`, true);
      if (f.unit !== undefined)
        need(
          typeof f.unit === 'string' && f.unit.length <= 16,
          `${at}.unit`,
          'unit',
          'a unit such as "days"'
        );
    });
  }
  if (s.type === 'predict') {
    text(s.prompt, `${path}.prompt`, true);
    const opts = Array.isArray(s.options) ? s.options : null;
    need(
      opts && opts.length >= 2 && opts.length <= 6,
      `${path}.options`,
      'options',
      'from 2 to 6 options',
      { min: 2, max: 6 }
    );
    (opts || []).forEach((o, j) => text(o, `${path}.options[${j}]`, true));
    need(
      Number.isInteger(s.answer) &&
        opts &&
        s.answer >= 0 &&
        s.answer < opts.length,
      `${path}.answer`,
      'choiceAnswer',
      'the number of the right option, counting from 0'
    );
    text(s.because, `${path}.because`, true);
    need(
      sidAt.has(s.reveal) && sidAt.get(s.reveal) > index,
      `${path}.reveal`,
      'reveal',
      'a later step, where the prediction is marked'
    );
    const target = steps[sidAt.get(s.reveal)];
    need(
      !isObject(target) || target.when === undefined,
      `${path}.reveal`,
      'revealConditional',
      'a step every student reaches: not a remediation step'
    );
  }
  if (s.type === 'question') {
    if (fromBank) {
      for (const k of STEP_FIELDS.question)
        if (k !== 'from')
          need(
            s[k] === undefined,
            `${path}.${k}`,
            'notHere',
            'the bank item says this'
          );
      need(
        bankIds.has(s.from),
        `${path}.from`,
        'bankItem',
        "an item in the pack's bank"
      );
      need(
        !usedItems.has(s.from),
        `${path}.from`,
        'bankRepeat',
        'another step asks this item'
      );
      usedItems.add(s.from);
    } else {
      // An inline question is a bank item without a bank: the same rules.
      const item = { ...s, id: 'inline', version: 1 };
      for (const k of COMMON_STEP) delete item[k];
      delete item.from;
      // Its complaints on the step's own paths, not on the list's.
      const onStep = at => at.replace(`${path}[0]`, path);
      checkItems(
        [{ a11y: { textOnly: true }, ...item, scoring: s.scoring }],
        path,
        {
          ...ctx,
          need: (ok, at, code, message, vars) =>
            need(ok, onStep(at), code, message, vars),
          text: (v, at, required) => text(v, onStep(at), required),
        }
      );
      need(
        s.variants === undefined,
        `${path}.variants`,
        'notHere',
        'variants belong to a bank item'
      );
    }
  }
}

/** Where a step starts: a built-in scenario, its seed, and how it is framed. */
function checkSetup(setup, path, { need, api }) {
  if (!isObject(setup))
    return need(false, path, 'notObject', 'is not an object');
  for (const k of Object.keys(setup))
    need(
      ['scenario', 'seed', 'paused', 'zoom'].includes(k),
      `${path}.${k}`,
      'unknownField',
      `"${k}" is not a setup field`,
      { key: k }
    );
  need(
    api.scenarios.includes(setup.scenario),
    `${path}.scenario`,
    'scenario',
    'a scenario Gravitas has'
  );
  // A lesson's seed is a word a teacher can say aloud ("kepler-3"), which the
  // engine hashes (js/rng.js normalizeSeed).
  if (setup.seed !== undefined)
    need(
      typeof setup.seed === 'string' &&
        /^[A-Za-z0-9][A-Za-z0-9-]{0,39}$/.test(setup.seed),
      `${path}.seed`,
      'setupSeed',
      'a word such as "kepler-3": letters, digits and hyphens'
    );
  if (setup.paused !== undefined)
    need(
      typeof setup.paused === 'boolean',
      `${path}.paused`,
      'bool',
      'true or false'
    );
  if (setup.zoom !== undefined)
    need(
      typeof setup.zoom === 'number' && setup.zoom > 0 && setup.zoom <= 1000,
      `${path}.zoom`,
      'zoom',
      'a zoom greater than 0 and at most 1000'
    );
}

/**
 * Remediation, bounded: a step shown only when an earlier graded step was
 * answered a certain way. One level deep - the step it names is one every
 * student reaches - so a lesson's path is the straight line with optional
 * detours, never a maze, and every student can still reach its end. On a held
 * prediction it comes no earlier than the step where the prediction is marked.
 */
function checkWhen(s, path, index, { need, steps, sidAt }) {
  const w = s.when;
  const at = `${path}.when`;
  if (!isObject(w)) return need(false, at, 'notObject', 'is not an object');
  for (const k of Object.keys(w))
    need(
      ['sid', 'is'].includes(k),
      `${at}.${k}`,
      'unknownField',
      `"${k}" is not a when field`,
      { key: k }
    );
  need(
    WHEN_STATES.includes(w.is),
    `${at}.is`,
    'whenIs',
    'incorrect or correct'
  );
  const i = sidAt.get(w.sid);
  need(i !== undefined && i < index, `${at}.sid`, 'earlier', 'an earlier step');
  if (i === undefined || i >= index) return;
  const target = steps[i];
  need(
    graded(target),
    `${at}.sid`,
    'whenGraded',
    'a graded step: a prediction, or a choice or numeric question'
  );
  need(
    !isObject(target) || target.when === undefined,
    `${at}.sid`,
    'whenNested',
    'a step every student reaches: remediation is one level deep'
  );
  // A held prediction has no verdict until the step it is marked at. Shown or
  // passed over before then, a step that follows it would be the verdict, and
  // the answer key, not the experiment, would settle the prediction.
  const marked =
    isObject(target) && typeof target.reveal === 'string'
      ? sidAt.get(target.reveal)
      : undefined;
  need(
    marked === undefined || index >= marked,
    `${at}.sid`,
    'whenHeld',
    `a prediction already marked: this one is marked at step ${marked + 1}, so remediation on it comes after that`,
    { n: marked + 1 }
  );
  need(
    index !== steps.length - 1,
    at,
    'whenLast',
    'the last step is one every student reaches'
  );
}

/**
 * Read a file: an investigation pack of this version or one this build can
 * migrate.
 *
 * @param {unknown} p - Parsed JSON
 * @returns {{ok: boolean, pack?: object, code?: string, vars?: object}}
 */
export function migrateInvestigationPack(p) {
  if (!isObject(p) || p.format !== FORMAT)
    return { ok: false, code: 'notPack' };
  const v = p.formatVersion;
  if (!Number.isInteger(v) || v < 1) return { ok: false, code: 'notPack' };
  if (v > FORMAT_VERSION)
    return { ok: false, code: 'newer', vars: { version: v } };
  return { ok: true, pack: p };
}
