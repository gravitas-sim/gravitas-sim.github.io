// =============================================================================
// The lesson standard as mechanical checks (section 7.6 of the lesson
// improvement standard: leak rules L2 to L4, task rule T1, and the stale
// reference and vocabulary patterns the audits found by hand)
// -----------------------------------------------------------------------------
// Node-only, like tools/authoring/modelChecked.mjs: the rules read the
// headless grader and the depth layouts, and the Composer route carries none
// of it. Each rule only looks for a pattern a person would otherwise find by
// reading. None of them judges prose quality, and none of them says a lesson
// is good: a lesson with no finding has avoided these patterns and nothing
// more.
//
// Every rule reports by lesson and step. How many findings each lesson may
// carry is held by tools/lesson-standard.mjs and its committed ratchet file:
// a count may fall and never rise.
//
//   leak/instrument-at-answer       L2  the instrument opens at an accepted value
//   leak/prediction-stated-earlier  L3  a predicted answer already stated (report only)
//   leak/question-states-answer     L4  a numeric question's body holds its answer
//   task/measure-all-computed       T1  a core measure step with nothing typed
//   text/internal-vocabulary        a student reads the project's own bookkeeping
//   text/step-reference             "step N" or "screen N" names the wrong step
//   content/completion              no depth's layout ends on a graded step
// =============================================================================

import {
  checkCatalog,
  emptyProbeContext,
  leaksAnswer,
} from '../../js/authoring/rules.js';
import {
  DEPTHS,
  inDepth,
  lessonAt,
  layDepth,
} from '../../js/investigations/depthPure.js';

export const STANDARD_RULES = {
  'leak/instrument-at-answer':
    "A step's instrument does not open at a value its validator accepts",
  'leak/prediction-stated-earlier':
    'A predicted option, or a number in its explanation, is not already in an earlier body, tip or checklist (report only)',
  'leak/question-states-answer':
    "A numeric question's body does not contain the value the step accepts",
  'task/measure-all-computed':
    'A core measure step has at least one field the student types',
  'text/internal-vocabulary':
    'Student text carries no prompt numbers, gate talk, NOT RUN, file names or leg ids',
  'text/step-reference':
    'A "step N" or "screen N" names a step that exists, is not the step itself, and is the same step at every depth',
  'content/completion':
    'No depth layout of a lesson ends on a question, measure or predict step',
};

/** Rules whose findings are listed and counted but never fail the command on their own. */
export const REPORT_ONLY = new Set(['leak/prediction-stated-earlier']);

/** The rules that say a held answer reached the screen (the acceptance map's `leakFree`). */
export const LEAK_RULES = [
  'leak/instrument-at-answer',
  'leak/prediction-stated-earlier',
  'leak/question-states-answer',
];

// ---- Reading a step as a student does ---------------------------------------

/** HTML and entities out, one line of words. */
export const plain = text =>
  String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** A lesson-level or step-level value as a list of strings. */
const strings = v =>
  (Array.isArray(v) ? v : [v]).filter(x => typeof x === 'string');

/**
 * Every string a student reads on a step, each with where it is. Instructor
 * strings (rubric) and machinery (ids, kinds, units, scene names) are left out.
 *
 * @param {object} step - A step, in either language
 * @returns {Array<[string, string]>} [where, text] pairs
 */
export function studentTexts(step) {
  const out = [];
  const add = (where, v) => strings(v).forEach(t => out.push([where, t]));
  if (!step || typeof step !== 'object') return out;
  for (const k of [
    'title',
    'body',
    'tip',
    'prompt',
    'because',
    'worked',
    'explain',
    'importLabel',
  ])
    add(k, step[k]);
  add('quote', step.quote?.text);
  add('option', step.options);
  add('checklist', step.checklist);
  if (Array.isArray(step.hints)) add('hint', step.hints);
  else if (step.hints && typeof step.hints === 'object')
    add('hint', [step.hints.concept, step.hints.method]);
  add('feedback', Object.values(step.feedback || {}));
  for (const m of step.misconceptions || []) add('misconception', m?.say);
  for (const f of step.fields || []) add('field', f?.label);
  add('plot', [step.plot?.title, step.plot?.note]);
  add('figure', [step.figure?.alt, step.figure?.caption]);
  return out;
}

/** The lesson-level strings a student reads before any step. */
export function lessonTexts(lesson) {
  const out = [];
  for (const k of ['title', 'subtitle', 'summary'])
    strings(lesson?.[k]).forEach(t => out.push([k, t]));
  strings(lesson?.objectives).forEach(t => out.push(['objective', t]));
  return out;
}

/**
 * One lesson laid out for the rules.
 *
 * @param {object} lesson - The lesson with every depth's steps laid in
 * @param {object} [shadows] - `{ lesson, steps }`: the Spanish lesson-level
 *   words and an array parallel to `lesson.steps` (null where there is none)
 * @returns {object} The view the rules read
 */
export function makeView(lesson, shadows = {}) {
  return {
    id: lesson.id,
    lesson,
    steps: lesson.steps,
    es: shadows.steps ?? [],
    esLesson: shadows.lesson ?? null,
  };
}

const found = (rule, view, i, message, lang = 'en') => ({
  rule,
  lesson: view.id,
  step: i,
  sid: i === null ? null : (view.steps[i]?.sid ?? null),
  lang,
  message,
});

const depthOf = step => step?.depth ?? 'core';
const isCore = step => depthOf(step) === 'core';

// ---- (a) the instrument opens at the accepted value --------------------------

const gradeAt = (step, values, ctx) => {
  const r = { ...values };
  for (const f of step.fields) {
    if (typeof f.compute !== 'function') continue;
    try {
      r[f.id] = Number(f.compute(r));
    } catch {
      return false;
    }
  }
  try {
    return step.validate(r, ctx)?.level === 'ok';
  } catch {
    return false;
  }
};

/**
 * Whether the declared opening values of the instrument, put into the
 * response fields, are an answer the validator accepts.
 *
 * The headless grader is the step's own `validate`, handed the same stub
 * context the authoring rules use. The instrument's numbers are put into the
 * typed fields every way they fit (a control called `v` seldom shares a name
 * with the field that asks for it), and an assignment counts only when the
 * validator also refuses at least one of that assignment doubled or halved,
 * so a validator that accepts any number does not call every instrument a leak.
 */
export function openingAccepted(step, ctx = emptyProbeContext()) {
  const values = Object.entries(step?.tool?.values ?? {}).filter(
    ([, v]) => typeof v === 'number' && Number.isFinite(v)
  );
  const typed = (step?.fields ?? []).filter(
    f => typeof f.compute !== 'function' && f.id
  );
  if (typeof step?.validate !== 'function' || !values.length || !typed.length)
    return null;
  const distinct = [...new Set(values.map(([, v]) => v))].slice(0, 6);
  const assignments = [];
  const direct = Object.fromEntries(
    typed
      .filter(f => values.some(([k]) => k === f.id))
      .map(f => [f.id, values.find(([k]) => k === f.id)[1]])
  );
  if (Object.keys(direct).length === typed.length) assignments.push(direct);
  if (typed.length <= 3) {
    const walk = (i, acc) => {
      if (i === typed.length) return assignments.push({ ...acc });
      for (const v of distinct) walk(i + 1, { ...acc, [typed[i].id]: v });
    };
    walk(0, {});
  } else {
    for (const v of distinct)
      assignments.push(Object.fromEntries(typed.map(f => [f.id, v])));
  }
  for (const a of assignments) {
    if (!gradeAt(step, a, ctx)) continue;
    const scaled = k =>
      Object.fromEntries(Object.entries(a).map(([id, v]) => [id, v * k]));
    if (!gradeAt(step, scaled(2), ctx) || !gradeAt(step, scaled(0.5), ctx))
      return a;
  }
  return null;
}

function instrumentAtAnswer(view) {
  const out = [];
  view.steps.forEach((step, i) => {
    const hit = openingAccepted(step);
    if (!hit) return;
    out.push(
      found(
        'leak/instrument-at-answer',
        view,
        i,
        `the instrument opens at ${JSON.stringify(step.tool.values)}, and the validator accepts ${JSON.stringify(hit)}`
      )
    );
  });
  return out;
}

// ---- (b) a prediction already stated -----------------------------------------

/** The words of a text as one lower-case line, for finding one text inside another. */
const squash = text =>
  plain(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.,\s%-]/gu, '')
    .replace(/[.,;:]+(\s|$)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** Numbers of at least two significant digits, as strings ('0.37', '12', '4.5'). */
function bigNumbers(text) {
  const out = new Set();
  for (const m of plain(text).matchAll(/\d+(?:[.,]\d+)?/g)) {
    const t = m[0].replace(',', '.');
    const digits = t.replace('.', '').replace(/^0+/, '').replace(/0+$/, '');
    if (digits.length >= 2) out.add(String(Number(t)));
  }
  return out;
}

function predictionStated(view) {
  const out = [];
  view.steps.forEach((step, i) => {
    if (step.type !== 'predict') return;
    const earlier = view.steps
      .slice(0, i)
      .filter(s => inDepth(s, depthOf(step)))
      .flatMap(s => [s.body, s.tip, ...(s.checklist ?? [])]);
    if (!earlier.length) return;
    const before = earlier.map(squash);
    const options = Array.isArray(step.options) ? step.options : [];
    const right = Number.isInteger(step.answer)
      ? [options[step.answer]]
      : options;
    for (const o of right) {
      const t = squash(o);
      if (
        t.split(' ').length >= 3 &&
        t.length >= 12 &&
        before.some(b => b.includes(t))
      )
        out.push(
          found(
            'leak/prediction-stated-earlier',
            view,
            i,
            `the option "${plain(o).slice(0, 60)}" already appears in an earlier body, tip or checklist`
          )
        );
    }
    const stated = new Set(earlier.flatMap(t => [...bigNumbers(t)]));
    const echoed = [...bigNumbers(step.because)].filter(n => stated.has(n));
    if (echoed.length)
      out.push(
        found(
          'leak/prediction-stated-earlier',
          view,
          i,
          `the explanation's ${echoed.slice(0, 3).join(', ')} already appear${echoed.length === 1 ? 's' : ''} in an earlier body, tip or checklist`
        )
      );
  });
  return out;
}

// ---- (c) a measure step with nothing typed -----------------------------------

function measureAllComputed(view) {
  const out = [];
  view.steps.forEach((step, i) => {
    if (step.type !== 'measure' || !isCore(step)) return;
    const fields = step.fields ?? [];
    if (fields.length && fields.every(f => typeof f.compute === 'function'))
      out.push(
        found(
          'task/measure-all-computed',
          view,
          i,
          `every one of its ${fields.length} field(s) is computed, so the student records nothing`
        )
      );
  });
  return out;
}

// ---- (d) the project's own vocabulary in student text ------------------------

/**
 * What a student should never read. Each entry is a name for the finding and a
 * pattern. False positives are expected from `gate` (a logic gate, a toll
 * gate) and from a leg id that is also a real label; the ratchet counts them
 * and an author who has a real use rewrites the sentence.
 */
export const VOCABULARY = [
  ['prompt number', /\bPrompts? \d+/],
  ['gate', /\bgates?\b/i],
  ['NOT RUN', /\bNOT RUN\b/],
  ['file name', /\b[\w-]+\.md\b/],
  ['leg id', /\b[Ll]egs? [A-Z]\d+\b|\([A-Z]\d+ NOT RUN\)/],
];

function internalVocabulary(view) {
  const out = [];
  const scan = (i, lang, pairs) => {
    const seen = new Set();
    for (const [where, text] of pairs) {
      const t = plain(text);
      for (const [name, re] of VOCABULARY) {
        const m = re.exec(t);
        if (!m || seen.has(name)) continue;
        seen.add(name);
        out.push(
          found(
            'text/internal-vocabulary',
            view,
            i,
            `the ${where} says "${m[0]}" (${name})`,
            lang
          )
        );
      }
    }
  };
  scan(null, 'en', lessonTexts(view.lesson));
  scan(null, 'es', lessonTexts(view.esLesson));
  view.steps.forEach((step, i) => {
    scan(i, 'en', studentTexts(step));
    scan(i, 'es', studentTexts(view.es[i]));
  });
  return out;
}

// ---- (e) a "step N" or "screen N" that names the wrong step ------------------

const REFERENCE = {
  en: /\b(?:step|steps|screen|screens)\s+(\d+)(?:\s*(?:and|to|–|-)\s*(\d+))?(?![.,]?\d)/gi,
  es: /\b(?:paso|pasos|pantalla|pantallas)\s+(\d+)(?:\s*(?:y|a|–|-)\s*(\d+))?(?![.,]?\d)/gi,
};

/** The step numbers a text refers to, leaving out a numbered walk-through ("Step 1. Cube it"). */
export function referencesIn(text, lang = 'en') {
  const out = new Set();
  const raw = String(text ?? '').replace(/&#?\w+;/g, ' ');
  for (const m of raw.matchAll(REFERENCE[lang])) {
    const before = raw.slice(Math.max(0, m.index - 12), m.index);
    const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 2);
    const heading =
      /(?:<strong>|<b>|\*\*|\n\s*|^)$/.test(before) &&
      /^(?:<\/|[.:])/.test(after);
    if (heading && !m[2]) continue;
    out.add(Number(m[1]));
    if (m[2]) out.add(Number(m[2]));
  }
  return [...out];
}

function stepReferences(view) {
  const out = [];
  const at = Object.fromEntries(
    DEPTHS.map(d => [d, view.steps.filter(s => inDepth(s, d))])
  );
  view.steps.forEach((step, i) => {
    const shown = DEPTHS.filter(d => inDepth(step, d));
    for (const lang of ['en', 'es']) {
      const source = lang === 'en' ? step : view.es[i];
      const refs = new Set(
        studentTexts(source)
          .filter(([where]) => where !== 'field')
          .flatMap(([, t]) => referencesIn(t, lang))
      );
      for (const n of [...refs].sort((a, b) => a - b)) {
        let why = null;
        for (const d of shown) {
          const list = at[d];
          if (n < 1 || n > list.length)
            why = `there is no step ${n} at ${d} depth (${list.length} steps)`;
          else if (list[n - 1] === step)
            why = `step ${n} is this step at ${d} depth`;
          else if (isCore(step) && list[n - 1] !== at.core[n - 1])
            why = `step ${n} is "${list[n - 1].sid}" at ${d} depth and "${at.core[n - 1]?.sid}" at core`;
          if (why) break;
        }
        if (why)
          out.push(
            found(
              'text/step-reference',
              view,
              i,
              `it refers to step ${n}, but ${why}`,
              lang
            )
          );
      }
    }
  });
  return out;
}

// ---- (f) a numeric question whose body holds the answer ----------------------

function questionStatesAnswer(view) {
  const out = [];
  const scan = (i, lang, source) => {
    if (!source) return;
    const step = view.steps[i];
    if (step.type !== 'question' || step.kind !== 'numeric') return;
    const body = plain(source.body);
    if (leaksAnswer(body, step))
      out.push(
        found(
          'leak/question-states-answer',
          view,
          i,
          `the body contains a number the step accepts as its answer (${step.answer})`,
          lang
        )
      );
  };
  view.steps.forEach((_, i) => {
    scan(i, 'en', view.steps[i]);
    scan(i, 'es', view.es[i]);
  });
  return out;
}

/**
 * Every pattern rule over one lesson.
 *
 * @param {object} view - From makeView()
 * @returns {Array<object>} Findings: rule, lesson, step (an index), sid, lang, message
 */
export function viewFindings(view) {
  return [
    ...instrumentAtAnswer(view),
    ...predictionStated(view),
    ...questionStatesAnswer(view),
    ...measureAllComputed(view),
    ...internalVocabulary(view),
    ...stepReferences(view),
  ];
}

// ---- (g) a depth layout that ends on a graded step ---------------------------

/** Every rule that is not content/ is skipped: only the completion rule is wanted here. */
const SKIP_FOR_COMPLETION = [
  'agree/',
  'i18n/',
  'instructor/',
  'id/',
  'ref/',
  'setup/',
  'answer/',
  'interaction/',
  'content/lesson',
  'content/objectives',
  'content/duration',
  'content/step',
  'content/prompt',
  'content/placeholder',
  'content/hint',
  'content/feedback',
  'content/reflect',
];

/**
 * The lesson at each depth, judged by the authoring rule `content/completion`
 * (the one that warns when the last step is graded). One finding per layout
 * that ends on a question, measure or predict step.
 *
 * @param {object} inputs - From loadAuthoringInputs()
 * @param {object} laid - A lesson with its deeper steps laid in
 * @returns {Array<object>} Findings
 */
export function completionFindings(inputs, laid) {
  const out = [];
  for (const depth of DEPTHS) {
    const layout = lessonAt(laid, depth);
    for (const f of checkCatalog(
      { ...inputs, investigations: [layout] },
      { skip: SKIP_FOR_COMPLETION }
    )) {
      if (f.rule === 'content/completion' && f.level === 'warn')
        out.push({
          rule: 'content/completion',
          lesson: laid.id,
          step: layout.steps.length - 1,
          sid: layout.steps.at(-1)?.sid ?? null,
          lang: 'en',
          message: `at ${depth} depth ${f.message}`,
        });
    }
  }
  return out;
}

/**
 * The lesson with its deeper steps laid in, and the Spanish words laid
 * alongside, ready for makeView().
 *
 * @param {object} core - A lesson from the catalog
 * @param {object} loaders - `{ depthSources, shadow }`
 * @returns {Promise<{laid: object, shadows: object}>}
 */
export async function layOut(core, { depthSources, depthLessons, shadow }) {
  let laid = core;
  let deeper = [];
  let words = null;
  if (core.depths || depthLessons.includes(core.id)) {
    ({ steps: deeper, words } = await depthSources(core.id).catch(() => ({
      steps: [],
      words: null,
    })));
    laid = layDepth(core, deeper);
  }
  const es = shadow?.data?.steps ?? [];
  const coreIndex = new Map(core.steps.map((s, i) => [s, i]));
  const deepIndex = new Map(deeper.map((s, i) => [s, i]));
  const steps = laid.steps.map(s =>
    coreIndex.has(s)
      ? (es[coreIndex.get(s)] ?? null)
      : (words?.steps?.[deepIndex.get(s)] ?? null)
  );
  return { laid, shadows: { lesson: shadow?.data ?? null, steps } };
}
