// =============================================================================
// An investigation pack, compiled into the lesson the engine runs
// -----------------------------------------------------------------------------
// js/platform/investigation.js says what a pack may hold. This turns one into
// the two objects a lesson in the repository is: the English lesson (the
// default export of a js/data/investigations/<id>.js) and its Spanish shadow
// (js/data/investigations/es/<id>.js), whose arrays line up with the English
// by index. The pack keeps each text's languages side by side, so a step can
// be inserted without mis-aligning a translation; the index alignment exists
// only here, in the one place that writes it, and the tests hold it.
//
// Three things are decided here and recorded, never left to chance:
//
//   variants   a question drawn from the bank gets one variant, chosen by the
//              pack's seed and the item's id. A choice question's options are
//              shuffled and its answer follows them; a numeric question takes
//              its inputs from its list and its answer from the vetted relation
//              (js/platform/relations.js). The same pack always builds the same
//              lesson.
//   scoring    each graded step's points and which attempt counts, as the
//              bank item or the inline question declares them.
//   status     for every text, whether its Spanish is done, missing, or stale
//              - written from English that has since changed.
//
// Then judge() runs the checker every lesson in the repository passes
// (js/authoring/rules.js) over the result, so a pack is held to exactly the
// rules a hand-written lesson is. Pure: the page, the SDK and the tests share
// it, and nothing in a pack is ever run.
// =============================================================================

import { mulberry32 } from '../rng.js';
import {
  RELATIONS,
  evaluateRelation,
  roundAnswer,
} from '../platform/relations.js';

/** FNV-1a, as eight hex digits: the digest a translation records of its English. */
export function digest(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** A copy of plain data: a pack is JSON, so this loses nothing. */
const clone = v => JSON.parse(JSON.stringify(v));
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const en = t => (isObject(t) ? t.en : undefined);
const es = t =>
  isObject(t) && typeof t.es === 'string' && t.es.trim() ? t.es : null;

/** A number as a lesson in this locale writes it: a decimal comma in Spanish. */
export const localNumber = (v, locale) =>
  locale === 'es' ? String(v).replace('.', ',') : String(v);

/** Put a variant's inputs into a text's {name} placeholders. */
const fill = (text, values, locale) =>
  typeof text === 'string'
    ? text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (m, k) =>
        Object.hasOwn(values, k) ? localNumber(values[k], locale) : m
      )
    : text;

/**
 * Which variant of an item a pack's seed picks, and the order of a shuffled
 * item's options: a stream seeded by the pack's seed and the item's id, so two
 * items in one pack do not move together and one item moves only with the seed.
 */
export function variantStream(seed, itemId) {
  return mulberry32((seed ^ parseInt(digest(itemId), 16)) >>> 0);
}

/** Fisher-Yates, from a seeded stream: new position k holds old option order[k]. */
function shuffleOrder(n, next) {
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * One bank item, as the question step a lesson carries, with the variant the
 * seed picks.
 *
 * @returns {{step: object, words: object, variant: object}}
 */
export function realizeItem(item, seed) {
  const next = variantStream(seed, item.id);
  const step = { kind: item.kind };
  const words = {};
  const variant = { item: item.id, version: item.version, index: 0, count: 1 };
  let values = {};
  let order = null;

  if (item.kind === 'choice') {
    order = item.variants?.shuffle
      ? shuffleOrder(item.options.length, next)
      : [...item.options.keys()];
    if (item.variants?.shuffle) {
      // A permutation's index among all orders is not needed; the order is.
      variant.order = order;
      variant.count = factorial(item.options.length);
    }
    step.options = order.map(k => en(item.options[k]));
    words.options = order.map(k => es(item.options[k]));
    step.answer = order.indexOf(item.answer);
  } else if (item.kind === 'numeric') {
    const rel = item.variants?.relation;
    if (rel) {
      const list = item.variants.values;
      const k = Math.floor(next() * list.length);
      values = list[k];
      const got = evaluateRelation(rel, values);
      step.answer = got.ok ? got.answer : NaN;
      step.tolerance = roundAnswer(
        (step.answer * item.variants.tolerancePct) / 100
      );
      Object.assign(variant, {
        index: k,
        count: list.length,
        relation: rel,
        values,
      });
      if (RELATIONS[rel].output.unit) step.unit = RELATIONS[rel].output.unit;
    } else {
      step.answer = item.answer;
      step.tolerance = item.tolerance;
      if (item.unit !== undefined) step.unit = item.unit;
    }
    if (item.unit !== undefined) step.unit = item.unit;
    if (item.expect) step.expect = clone(item.expect);
    if (item.misconceptions) {
      step.misconceptions = item.misconceptions.map(m => {
        const out = { id: m.id, say: en(m.say) };
        if (m.factor !== undefined) out.factor = m.factor;
        if (m.equals !== undefined) out.equals = m.equals;
        return out;
      });
      words.misconceptions = item.misconceptions.map(m => ({ say: es(m.say) }));
    }
  }
  step.prompt = fill(en(item.prompt), values, 'en');
  words.prompt =
    es(item.prompt) === null ? null : fill(es(item.prompt), values, 'es');
  if (item.because) {
    step.because = en(item.because);
    words.because = es(item.because);
  }
  if (item.rubric) {
    step.rubric = en(item.rubric);
    words.rubric = es(item.rubric);
  }
  if (item.hints) {
    step.hints = {};
    words.hints = {};
    for (const k of ['concept', 'method']) {
      if (item.hints[k] === undefined) continue;
      step.hints[k] = fill(en(item.hints[k]), values, 'en');
      words.hints[k] =
        es(item.hints[k]) === null
          ? null
          : fill(es(item.hints[k]), values, 'es');
    }
  }
  if (item.worked) {
    step.worked = fill(en(item.worked), values, 'en');
    words.worked =
      es(item.worked) === null ? null : fill(es(item.worked), values, 'es');
  }
  return { step, words, variant };
}

const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));

/**
 * Compile a pack.
 *
 * @param {object} pack - A valid pack
 * @param {object} api
 * @param {Record<string, {thumbnail?: string}>} api.scenarios - SCENARIO_INFO
 * @param {Function} [api.scenarioId] - An id from any key a scenario has had
 * @returns {{lesson: object, shadow: ?object, scoring: object, variants: object}}
 */
export function compileInvestigation(pack, api) {
  const bank = new Map((pack.bank?.items || []).map(i => [i.id, i]));
  const scoring = {};
  const variants = {};
  const thumbFrom = pack.thumbnail ?? pack.steps[0]?.setup?.scenario;
  const lesson = {
    id: pack.id,
    title: en(pack.title),
    subtitle: en(pack.subtitle),
    duration: pack.duration,
    level: en(pack.level),
    summary: en(pack.summary),
    thumbnail:
      api.scenarios[api.scenarioId?.(thumbFrom) ?? thumbFrom]?.thumbnail ?? '',
    objectives: pack.objectives.map(en),
    steps: [],
  };
  const shadow = {
    title: es(pack.title),
    subtitle: es(pack.subtitle),
    duration: pack.duration,
    level: es(pack.level),
    summary: es(pack.summary),
    objectives: pack.objectives.map(es),
    steps: [],
  };

  for (const s of pack.steps) {
    const out = {
      sid: s.sid,
      type: s.type,
      title: en(s.title),
      body: en(s.body),
    };
    const w = { title: es(s.title), body: es(s.body) };
    if (s.tip) {
      out.tip = en(s.tip);
      w.tip = es(s.tip);
    }
    if (s.setup) {
      out.setup = { scenario: s.setup.scenario };
      if (s.setup.seed !== undefined) out.setup.seed = s.setup.seed;
      if (s.setup.paused !== undefined) out.setup.paused = s.setup.paused;
      if (s.setup.zoom !== undefined) out.setup.camera = { zoom: s.setup.zoom };
    }
    if (s.tool) out.tool = { id: s.tool.id };
    if (s.requires) out.requires = [...s.requires];
    if (s.when) out.when = { sid: s.when.sid, is: s.when.is };

    if (s.type === 'explore') {
      out.checklist = s.checklist.map(en);
      w.checklist = s.checklist.map(es);
    } else if (s.type === 'measure') {
      out.fields = s.fields.map(f => {
        const field = { id: f.id, label: en(f.label) };
        if (f.unit !== undefined) field.unit = f.unit;
        return field;
      });
      w.fields = s.fields.map(f => ({ label: es(f.label) }));
    } else if (s.type === 'predict') {
      Object.assign(out, {
        prompt: en(s.prompt),
        options: s.options.map(en),
        answer: s.answer,
        because: en(s.because),
        reveal: s.reveal,
      });
      Object.assign(w, {
        prompt: es(s.prompt),
        options: s.options.map(es),
        because: es(s.because),
      });
    } else if (s.type === 'question') {
      const item =
        s.from !== undefined
          ? bank.get(s.from)
          : { ...s, id: s.sid, version: 1 };
      const got = realizeItem(item, pack.seed);
      Object.assign(out, got.step);
      Object.assign(w, got.words);
      scoring[s.sid] = { ...item.scoring };
      if (s.from !== undefined) variants[s.sid] = got.variant;
    }
    lesson.steps.push(out);
    shadow.steps.push(w);
  }

  const translated = collectTexts(pack).some(t => t.es !== null);
  return { lesson, shadow: translated ? shadow : null, scoring, variants };
}

/**
 * Every text in a pack, with where it is and its translation status.
 *
 * @returns {Array<{path: string, en: string, es: ?string, status: 'done'|'missing'|'stale'}>}
 */
export function collectTexts(pack) {
  const out = [];
  const visit = (v, path) => {
    if (isObject(v) && typeof v.en === 'string') {
      const spanish = es(v);
      const status =
        spanish === null
          ? 'missing'
          : typeof v.esOf === 'string' && v.esOf !== digest(v.en)
            ? 'stale'
            : 'done';
      out.push({ path, en: v.en, es: spanish, status });
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`));
    else if (isObject(v))
      for (const [k, x] of Object.entries(v))
        visit(x, path ? `${path}.${k}` : k);
  };
  visit(pack, '');
  return out;
}

/** Words in a text a student reads, markup and entities aside. */
const wordCount = t =>
  typeof t === 'string'
    ? t
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

/**
 * How long it takes, and what it holds.
 *
 * Words read at 300 a minute, plus a time for each step by what a student
 * does there: half a minute to read one, two to explore, three to measure, a
 * minute for a prediction and a quarter for a question. Not a model of
 * reading: the allowances were fitted to the durations the 24 built-in
 * lessons declare, and against them the estimate's median is the declared
 * midpoint (1.0) with a spread from 0.6 to 2.2. So a warning is a prompt to
 * look, not a verdict; tests/composer.test.js holds the fit.
 *
 * @param {object} lesson - A compiled lesson
 * @returns {{minutes: number, words: number, steps: Record<string, number>, graded: number}}
 */
export function estimate(lesson) {
  const ACT = { read: 0.5, explore: 2, measure: 3, predict: 1, question: 0.25 };
  const steps = {};
  let words = 0;
  let acts = 0;
  let graded = 0;
  for (const s of lesson.steps) {
    const key = s.type === 'question' ? `question:${s.kind}` : s.type;
    steps[key] = (steps[key] || 0) + 1;
    for (const t of [s.title, s.body, s.tip, s.prompt, s.because, s.rubric])
      words += wordCount(t);
    for (const t of [...(s.options || []), ...(s.checklist || [])])
      words += wordCount(t);
    acts += ACT[s.type] ?? 0;
    if (s.type === 'predict' || (s.type === 'question' && s.kind !== 'short'))
      graded++;
  }
  return { minutes: Math.round(words / 300 + acts), words, steps, graded };
}

/** Whether an estimate is far enough from a declared range to say so. */
export function outsideDuration(minutes, duration) {
  const [lo, hi = lo] = String(duration).match(/\d+/g)?.map(Number) || [];
  if (lo === undefined) return false;
  return minutes < lo * 0.5 || minutes > hi * 2.2;
}

/**
 * Judge a compiled lesson with the repository's own lesson checker.
 *
 * @param {object} compiled - compileInvestigation(...)
 * @param {object} refs
 * @param {Function} refs.checkCatalog - js/authoring/rules.js
 * @param {object} refs.scenarios - SCENARIO_INFO
 * @param {Function} [refs.scenarioId] - An id from any key a scenario has had
 * @param {Array} refs.widgets - allWidgets()
 * @param {Set<string>} refs.settingKeys
 * @param {Function} refs.gradedSteps
 * @returns {Array<{level: string, rule: string, step: ?number, message: string}>}
 */
export function judge(compiled, refs) {
  const { lesson, shadow } = compiled;
  return refs.checkCatalog(
    {
      investigations: [lesson],
      manifests: {},
      instructor: {},
      scenarios: refs.scenarios,
      scenarioId: refs.scenarioId,
      settingKeys: refs.settingKeys,
      widgets: refs.widgets,
      translations: shadow
        ? { es: { [lesson.id]: { data: shadow, file: `es/${lesson.id}.js` } } }
        : {},
      sources: {},
      gradedSteps: refs.gradedSteps,
    },
    {
      skip: [
        'agree/manifest',
        'agree/counts',
        'agree/instructorIds',
        'agree/answerKey',
        'instructor/present',
        'instructor/sections',
        'instructor/expectations',
        'instructor/attribution',
      ],
    }
  );
}

/** A lesson or shadow as the module a maintainer adds to js/data/investigations/. */
export function lessonModule(object, { header }) {
  return `${header}\nexport default ${JSON.stringify(object, null, 2)};\n`;
}
