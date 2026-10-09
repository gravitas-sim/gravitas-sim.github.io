// =============================================================================
// Remixing a built-in investigation into an investigation pack
// -----------------------------------------------------------------------------
// Prompt 78 (REMIX.md). An instructor adapts a built-in investigation without
// touching source: this turns the lesson into a gravitas.investigation-pack/1
// that starts as a faithful copy of everything the format can carry, records
// what it was made from (`derivedFrom`: the lesson's id, its version and a
// digest of its steps), and says what it cannot carry. What a pack cannot carry
// - a probe, a validate, a computed field, a plot - stays in the original, and
// the compiled remix calls it there by reference, so the science is the
// original's and no edit can reach it.
//
// Three functions, all pure (a lesson and a pack in, data out):
//
//   remixInvestigation  lesson (and its Spanish) -> pack, and the list of what
//                       the pack cannot carry
//   checkRemix          a remix against its original: every edit to an expected
//                       value, a scenario, a seed or an instrument is refused,
//                       naming the field
//   compileRemix        the lesson the engine runs: the original's steps with
//                       the pack's words laid over them
//
// What a remix may change, and what it may not, is one table (REMIX_FIELDS),
// and the documentation, the Studio's panel and the tests read that table
// rather than restating it.
// =============================================================================

import { digest, compileInvestigation } from '../composer/compile.js';
import { shortHash } from '../assignments/assignment.js';
import { stepFingerprint } from '../investigations/progressBackup.js';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A copy of plain data. */
const clone = v => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What a remix may and may not do to each part of a step. One table: the
 * refusals in checkRemix, the panel the Studio shows and REMIX.md follow it.
 * `status` is 'editable', 'kept' (carried by the original, shown but not
 * editable here) or 'refused' (a change is an error naming the field).
 */
export const REMIX_FIELDS = Object.freeze([
  ['title, body, tip, prompt, because, worked, rubric', 'editable', 'words'],
  [
    'rubricCriteria (names, levels and their points)',
    'editable',
    'words and points',
  ],
  ['options (the text of each)', 'editable', 'reword, translate'],
  ['hints, feedback, misconception notes', 'editable', 'words'],
  ['checklist of an explore step', 'editable', 'add, remove, reword'],
  ['measure field labels', 'editable', 'words'],
  ['depth', 'editable', 'core, quantitative or advanced'],
  ['step order and which steps remain', 'editable', 'reorder, remove'],
  ['added steps', 'editable', 'read, explore and question steps'],
  ['paused, zoom of a step’s setup', 'editable', 'framing'],
  ['English and Spanish of every text', 'editable', 'both'],
  ['setup.scenario, setup.seed', 'refused', 'the world the step opens'],
  [
    'tool (the instrument and its settings)',
    'refused',
    'the instrument’s model',
  ],
  ['answer, tolerance, unit, expect', 'refused', 'the expected value'],
  ['the number or order of options', 'refused', 'the answer is an index'],
  ['misconception factors and targets', 'refused', 'what a wrong answer is'],
  ['measure field ids, units and order', 'refused', 'what is recorded'],
  ['step type, question kind, reveal', 'refused', 'what the step is'],
  [
    'probe, validate, compute, plot, start, bind...',
    'kept',
    'lesson code, by reference',
  ],
]);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * A step's science, as the engine pins it: its fingerprint's short hash. The
 * same hash an assignment and a course pin record (js/course/review.js), so a
 * remix is judged against the original by the measure the platform already
 * uses for "this lesson changed".
 */
export const stepHash = step => shortHash(stepFingerprint(step));

/**
 * The digest of a lesson's steps: each step's id and fingerprint hash, in
 * order, over every depth. It moves when a step is added, removed, reordered
 * or its answer, instrument, scenario or fields change, and not when only its
 * prose does.
 *
 * @param {object} lesson - The English lesson with every depth laid in
 */
export const originalDigest = lesson =>
  shortHash(lesson.steps.map(s => `${s.sid}=${stepHash(s)}`).join('\n'));

/** The id the engine knows a remix by: namespaced by pack id and version. */
export const remixLessonId = pack =>
  `rx-${pack.id}-${String(pack.version).replaceAll('.', '-')}`;

/**
 * What a compiled lesson records of the pack it came from (`lesson.pack`): the
 * report, the submission token and the review page read it, and nothing else
 * does. A remix adds what it was made from.
 */
export const packIdentity = pack => ({
  id: pack.id,
  version: pack.version,
  ...(isObject(pack.derivedFrom)
    ? {
        from: {
          id: pack.derivedFrom.id,
          version: pack.derivedFrom.version,
          digest: pack.derivedFrom.digest,
        },
      }
    : {}),
});

/** Whether an engine lesson id is a remix's. */
export const isRemixId = id => /^rx-[a-z0-9-]+-\d+-\d+-\d+$/.test(String(id));

/**
 * The pack and version a remix lesson id names.
 * @returns {{id: string, version: string}|null}
 */
export function remixIdentity(lessonId) {
  const m = /^rx-([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)-(\d+)-(\d+)$/.exec(
    String(lessonId)
  );
  return m ? { id: m[1], version: `${m[2]}.${m[3]}.${m[4]}` } : null;
}

// ---------------------------------------------------------------------------
// Lesson -> pack
// ---------------------------------------------------------------------------

/** The text of an English string with the Spanish beside it, when there is one. */
function text(en, es) {
  if (typeof en !== 'string') return undefined;
  const out = { en };
  if (typeof es === 'string' && es.trim() && es !== en) {
    out.es = es;
    out.esOf = digest(en);
  }
  return out;
}

/** A lesson's tree of strings (rubric criteria) as texts, numbers as they are. */
const textTree = (en, es) =>
  typeof en === 'string'
    ? text(en, es)
    : Array.isArray(en)
      ? en.map((x, i) => textTree(x, es?.[i]))
      : isObject(en)
        ? Object.fromEntries(
            Object.entries(en).map(([k, x]) => [k, textTree(x, es?.[k])])
          )
        : en;

/** A list of strings as a list of texts. */
const texts = (list, spanish) =>
  Array.isArray(list) ? list.map((x, i) => text(x, spanish?.[i])) : undefined;

/** The keys a step's pack form accounts for, by type, in lesson terms. */
const CARRIED = {
  common: [
    'sid',
    'type',
    'title',
    'body',
    'tip',
    'setup',
    'tool',
    'requires',
    'when',
    'depth',
  ],
  read: [],
  explore: ['checklist'],
  measure: ['fields'],
  predict: ['prompt', 'options', 'answer', 'because', 'reveal'],
  question: [
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
  ],
};

/** The keys of a lesson the pack carries; every other one stays in the original. */
const LESSON_CARRIED = [
  'id',
  'title',
  'subtitle',
  'duration',
  'level',
  'summary',
  'thumbnail',
  'objectives',
  'steps',
];

/** A pack's setup from a lesson step's. Only what the format can say. */
function setupOf(setup) {
  const out = { scenario: setup.scenario };
  if (typeof setup.seed === 'string') out.seed = setup.seed;
  if (typeof setup.paused === 'boolean') out.paused = setup.paused;
  const zoom = setup.camera?.zoom;
  if (typeof zoom === 'number' && zoom > 0 && zoom <= 1000) out.zoom = zoom;
  return out;
}

/** The pack form of one step, and what of the step it leaves in the original. */
function stepToPack(s, es = {}) {
  const out = { sid: s.sid, type: s.type };
  const kept = [];
  const put = (k, v) => v !== undefined && (out[k] = v);
  put('title', text(s.title, es.title));
  put('body', text(s.body, es.body));
  put('tip', text(s.tip, es.tip));
  if (s.depth && s.depth !== 'core') out.depth = s.depth;
  if (isObject(s.setup)) {
    out.setup = setupOf(s.setup);
    const extra = Object.keys(s.setup).filter(
      k => !['scenario', 'seed', 'paused', 'camera'].includes(k)
    );
    if (isObject(s.setup.camera) && Object.keys(s.setup.camera).length > 1)
      extra.push('camera');
    if (extra.length) kept.push(...extra.map(k => `setup.${k}`));
  }
  if (isObject(s.tool)) {
    out.tool = { id: s.tool.id };
    for (const k of Object.keys(s.tool)) if (k !== 'id') kept.push(`tool.${k}`);
  }
  if (Array.isArray(s.requires)) out.requires = [...s.requires];
  if (isObject(s.when)) out.when = { sid: s.when.sid, is: s.when.is };

  if (s.type === 'explore') out.checklist = texts(s.checklist, es.checklist);
  else if (s.type === 'measure') {
    out.fields = (s.fields || []).map((f, i) => {
      const field = { id: f.id, label: text(f.label, es.fields?.[i]?.label) };
      if (f.unit !== undefined) field.unit = f.unit;
      for (const k of Object.keys(f))
        if (!['id', 'label', 'unit'].includes(k))
          kept.push(`fields[${i}].${k}`);
      return field;
    });
  } else if (s.type === 'predict') {
    put('prompt', text(s.prompt, es.prompt));
    out.options = texts(s.options, es.options);
    out.answer = s.answer;
    put('because', text(s.because, es.because));
    out.reveal = s.reveal;
  } else if (s.type === 'question') {
    out.kind = s.kind;
    put('prompt', text(s.prompt, es.prompt));
    if (s.options) out.options = texts(s.options, es.options);
    if (s.answer !== undefined) out.answer = s.answer;
    put('because', text(s.because, es.because));
    if (s.unit !== undefined) out.unit = s.unit;
    if (s.tolerance !== undefined) out.tolerance = s.tolerance;
    if (s.expect !== undefined) out.expect = clone(s.expect);
    if (Array.isArray(s.hints)) out.hints = texts(s.hints, es.hints);
    else if (isObject(s.hints)) {
      out.hints = {};
      for (const k of ['concept', 'method'])
        if (typeof s.hints[k] === 'string')
          out.hints[k] = text(s.hints[k], es.hints?.[k]);
    }
    put('worked', text(s.worked, es.worked));
    put('rubric', text(s.rubric, es.rubric));
    if (Array.isArray(s.rubricCriteria))
      out.rubricCriteria = textTree(s.rubricCriteria, es.rubricCriteria);
    if (s.reflect) out.reflect = true;
    if (Array.isArray(s.misconceptions))
      out.misconceptions = s.misconceptions.map((m, i) => {
        const o = { id: m.id };
        if (m.option !== undefined) o.option = m.option;
        if (m.factor !== undefined) o.factor = m.factor;
        if (m.equals !== undefined) o.equals = m.equals;
        o.say = text(m.say, es.misconceptions?.[i]?.say);
        return o;
      });
    if (isObject(s.feedback)) {
      out.feedback = {};
      for (const [k, v] of Object.entries(s.feedback))
        out.feedback[k] = text(v, es.feedback?.[k]);
    }
    out.scoring = { points: 1, attempts: 'first' };
  }
  const known = new Set([...CARRIED.common, ...(CARRIED[s.type] || [])]);
  for (const k of Object.keys(s)) if (!known.has(k)) kept.push(k);
  return { step: out, kept };
}

/**
 * Remix a built-in investigation: the lesson as a pack.
 *
 * @param {object} lesson - The English lesson, every depth laid in
 * @param {object|null} spanish - The same lesson merged with its Spanish, or null
 * @param {object} options
 * @param {string} options.id - The new pack's id
 * @param {string} [options.version] - The new pack's version, 1.0.0 unless said
 * @param {string} [options.from] - The original's version (its package's, or 1.0.0)
 * @param {{en: string, es?: string}} [options.summary] - The card's summary,
 *   which the lesson itself does not hold (js/data/investigations/summaries.js)
 * @param {number} [options.seed] - The pack's variant seed
 * @returns {{pack: object, kept: Array<{sid: string|null, fields: string[]}>}}
 *   `kept` lists, per step and for the lesson itself (sid null), what the pack
 *   cannot carry and the original keeps.
 */
export function remixInvestigation(lesson, spanish, options) {
  const es = spanish || {};
  const steps = [];
  const kept = [];
  lesson.steps.forEach((s, i) => {
    const got = stepToPack(s, es.steps?.[i]);
    steps.push(got.step);
    if (got.kept.length) kept.push({ sid: s.sid, fields: got.kept });
  });
  const lessonKept = Object.keys(lesson).filter(
    k => !LESSON_CARRIED.includes(k) && k !== 'depthLaid'
  );
  if (lessonKept.length) kept.unshift({ sid: null, fields: lessonKept });
  const pack = {
    format: 'gravitas.investigation-pack',
    formatVersion: 1,
    id: options.id,
    version: options.version || '1.0.0',
    derivedFrom: {
      id: lesson.id,
      version: options.from || '1.0.0',
      digest: originalDigest(lesson),
    },
    locales: ['en', 'es'],
    title: text(lesson.title, es.title),
    subtitle: text(lesson.subtitle, es.subtitle),
    // From the summaries file when it was given: a lesson holds none of its
    // own, but js/data/investigations.js writes the English one onto every
    // lesson object it imports, and a Spanish lesson built afterwards from
    // that object carries the English summary as its own.
    summary: text(
      options.summary?.en ?? lesson.summary,
      options.summary?.es ?? (es.summary !== lesson.summary ? es.summary : '')
    ),
    level: text(lesson.level, es.level),
    duration: lesson.duration,
    objectives: texts(lesson.objectives, es.objectives),
    seed: options.seed ?? 0,
    steps,
  };
  // A pack is JSON: an absent text is absent, not undefined.
  return { pack: clone(pack), kept };
}

// ---------------------------------------------------------------------------
// A remix as a link: the pack minus what the original already says
// ---------------------------------------------------------------------------
// A faithful copy of a built-in is 40 to 110 KB of JSON, three to ten times
// what a link may carry (js/shareState.js MAX_INFLATED_BYTES). But the original
// is in the application, so a link carries only what differs from the faithful
// copy: the identity, the pack's own fields that changed, and the steps in
// order - a step the author left alone as its id alone, one that changed as
// its id and the fields that changed, one the author added in full. The
// reader makes the faithful copy again from its own build and lays the
// difference over it, which gives back the pack exactly (the tests hold it).

const TOP_SKIP = new Set([
  'format',
  'formatVersion',
  'id',
  'version',
  'derivedFrom',
  'steps',
]);

/** The fields of `b` that differ from `a`, a removed field as null. */
function changed(a, b, skip = new Set()) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    if (!skip.has(k) && !same(a[k], b[k]))
      out[k] = b[k] === undefined ? null : b[k];
  return out;
}

/**
 * A remix's pack as the difference from the faithful copy of its original.
 *
 * @param {object} pack - A remix pack
 * @param {object} base - remixInvestigation()'s pack for the same original
 * @returns {{id: string, version: string, from: object, top?: object, steps: Array}}
 */
export function remixDelta(pack, base) {
  const own = new Map(base.steps.map(s => [s.sid, s]));
  const top = changed(base, pack, TOP_SKIP);
  return {
    id: pack.id,
    version: pack.version,
    from: pack.derivedFrom,
    ...(Object.keys(top).length ? { top } : {}),
    steps: pack.steps.map(s => {
      const b = own.get(s.sid);
      if (!b) return s;
      const patch = changed(b, s, new Set(['sid']));
      return Object.keys(patch).length ? { sid: s.sid, ...patch } : s.sid;
    }),
  };
}

/**
 * The pack a delta stands for. A delta is what a link carries, so it is
 * checked for shape before anything is read from it; the pack it makes goes
 * through the format's own validator like any other.
 *
 * @param {unknown} delta - From a link
 * @param {object} base - remixInvestigation()'s pack for the original it names
 * @returns {{ok: true, pack: object}|{ok: false, path: string, message: string}}
 */
export function applyDelta(delta, base) {
  const bad = (path, message) => ({ ok: false, path, message });
  if (!isObject(delta)) return bad('', 'is not an object');
  const known = ['id', 'version', 'from', 'top', 'steps'];
  for (const k of Object.keys(delta))
    if (!known.includes(k)) return bad(k, `"${k}" is not a link field`);
  if (typeof delta.id !== 'string' || typeof delta.version !== 'string')
    return bad('id', 'a pack id and version');
  if (!isObject(delta.from)) return bad('from', 'what it was made from');
  if (!Array.isArray(delta.steps) || delta.steps.length > 200)
    return bad('steps', 'a list of steps');
  if (delta.top !== undefined && !isObject(delta.top))
    return bad('top', 'is not an object');
  const own = new Map(base.steps.map(s => [s.sid, s]));
  const lay = (b, patch) => {
    const out = { ...b };
    for (const [k, v] of Object.entries(patch))
      if (v === null) delete out[k];
      else out[k] = v;
    return out;
  };
  const steps = [];
  for (const [i, s] of delta.steps.entries()) {
    if (typeof s === 'string') {
      if (!own.has(s))
        return bad(`steps[${i}]`, `"${s}" is not a step of the original`);
      steps.push(clone(own.get(s)));
    } else if (isObject(s) && own.has(s.sid)) {
      const { sid, ...patch } = s;
      steps.push(lay(clone(own.get(sid)), patch));
    } else if (isObject(s)) steps.push(s);
    else return bad(`steps[${i}]`, 'is not a step');
  }
  const pack = lay(clone(base), delta.top || {});
  Object.assign(pack, {
    id: delta.id,
    version: delta.version,
    derivedFrom: delta.from,
    steps,
  });
  return { ok: true, pack };
}

// ---------------------------------------------------------------------------
// Validity: a remix against its original
// ---------------------------------------------------------------------------

/** Step types a remix may add: no world, no instrument, no expected value of the original's. */
export const ADDABLE = Object.freeze(['read', 'explore', 'question']);

/**
 * Every way a remix changes what it may not, each naming the field.
 *
 * Needs the original: the same lesson `remixInvestigation` was given. The
 * format's own rules (validateInvestigationPack) are the caller's to run too;
 * this adds only what a derivation means.
 *
 * @param {object} pack - A parsed pack
 * @param {object} original - The English lesson, every depth laid in
 * @param {object} [api]
 * @param {Function} [api.scenarioId] - A scenario's id from any key it has had
 * @returns {Array<{path: string, code: string, vars: object, message: string}>}
 */
export function checkRemix(pack, original, api = {}) {
  const out = [];
  const need = (ok, path, code, message, vars = {}) =>
    ok || out.push({ path, code, vars, message });
  const scen = k => api.scenarioId?.(k) ?? k;
  const d = pack?.derivedFrom;
  if (d === undefined) return out;
  if (!isObject(d)) return out;
  if (!original) {
    need(
      false,
      'derivedFrom.id',
      'noOriginal',
      `Gravitas has no investigation "${d.id}" to remix`,
      { id: String(d.id) }
    );
    return out;
  }
  need(
    d.id === original.id,
    'derivedFrom.id',
    'originalId',
    `is "${d.id}", not "${original.id}", the investigation this was checked against`,
    { id: String(d.id), expected: original.id }
  );
  const now = originalDigest(original);
  need(
    d.digest === now,
    'derivedFrom.digest',
    'originalChanged',
    `the original has changed since this was remixed (its steps are ${now}, the pack was made from ${d.digest}); remix it again`,
    { now, was: String(d.digest) }
  );

  const byOriginal = new Map(original.steps.map(s => [s.sid, s]));
  const steps = Array.isArray(pack.steps) ? pack.steps : [];
  steps.forEach((s, i) => {
    if (!isObject(s)) return;
    const at = `steps[${i}]`;
    const o = byOriginal.get(s.sid);
    if (!o) return checkAdded(s, at, need);
    const refuse = (field, code, what) =>
      need(
        false,
        `${at}.${field}`,
        code,
        `${what}: this step is the original's "${s.sid}", whose ${field} is not editable in a remix`,
        { sid: String(s.sid), field }
      );
    if (s.type !== o.type)
      refuse('type', 'remixType', `is "${s.type}", not "${o.type}"`);
    if (o.type === 'question') {
      if (s.from !== undefined)
        refuse('from', 'remixFrom', 'draws a question from the bank');
      if (s.kind !== o.kind)
        refuse('kind', 'remixKind', `is "${s.kind}", not "${o.kind}"`);
    }
    // The world.
    if (o.setup === undefined)
      need(
        s.setup === undefined,
        `${at}.setup`,
        'remixSetup',
        `opens a scenario, but the original "${s.sid}" opens none: a remix does not change the world`,
        { sid: String(s.sid) }
      );
    else if (!isObject(s.setup))
      refuse('setup', 'remixSetup', 'no longer opens its scenario');
    else {
      need(
        scen(s.setup.scenario) === scen(o.setup.scenario),
        `${at}.setup.scenario`,
        'remixScenario',
        `is "${s.setup.scenario}", but the original "${s.sid}" opens "${o.setup.scenario}": a remix does not change the scenario`,
        { sid: String(s.sid), expected: String(o.setup.scenario) }
      );
      need(
        s.setup.seed === o.setup.seed,
        `${at}.setup.seed`,
        'remixSeed',
        `is ${JSON.stringify(s.setup.seed)}, but the original "${s.sid}" uses ${JSON.stringify(o.setup.seed)}: a remix does not change the seed`,
        { sid: String(s.sid) }
      );
    }
    // The instrument.
    if (o.tool === undefined)
      need(
        s.tool === undefined,
        `${at}.tool`,
        'remixTool',
        `docks an instrument, but the original "${s.sid}" docks none: a remix does not change an instrument`,
        { sid: String(s.sid) }
      );
    else
      need(
        isObject(s.tool) && s.tool.id === o.tool.id,
        `${at}.tool.id`,
        'remixTool',
        `is ${JSON.stringify(s.tool?.id)}, but the original "${s.sid}" docks "${o.tool.id}": a remix does not change an instrument or its model`,
        { sid: String(s.sid), expected: o.tool.id }
      );
    // The expected value.
    for (const k of ['answer', 'tolerance', 'unit', 'expect', 'reveal']) {
      if (o[k] === undefined && s[k] === undefined) continue;
      if (!same(o[k], s[k]))
        need(
          false,
          `${at}.${k}`,
          'remixValue',
          `is ${show(s[k])}, but the original "${s.sid}" expects ${show(o[k])}: a remix does not change an expected value`,
          { sid: String(s.sid), field: k }
        );
    }
    if (o.reflect !== undefined || s.reflect !== undefined)
      need(
        Boolean(o.reflect) === Boolean(s.reflect),
        `${at}.reflect`,
        'remixValue',
        `differs from the original "${s.sid}": a remix does not change whether a question is marked`,
        { sid: String(s.sid), field: 'reflect' }
      );
    // The answer is an index, so the options keep their number and order.
    if (Array.isArray(o.options))
      need(
        Array.isArray(s.options) && s.options.length === o.options.length,
        `${at}.options`,
        'remixOptions',
        `has ${Array.isArray(s.options) ? s.options.length : 0} options, but the original "${s.sid}" has ${o.options.length}: the answer is the number of an option, so options may be reworded but not added, removed or moved`,
        { sid: String(s.sid), n: o.options.length }
      );
    if (Array.isArray(o.misconceptions)) {
      const mine = Array.isArray(s.misconceptions) ? s.misconceptions : [];
      need(
        mine.length === o.misconceptions.length &&
          o.misconceptions.every((m, j) =>
            ['id', 'option', 'factor', 'equals'].every(
              k => m[k] === mine[j]?.[k]
            )
          ),
        `${at}.misconceptions`,
        'remixMisconceptions',
        `differs from the original "${s.sid}": a misconception names an option or a factor of the answer, which a remix does not change (its wording is editable)`,
        { sid: String(s.sid) }
      );
    } else
      need(
        s.misconceptions === undefined,
        `${at}.misconceptions`,
        'remixMisconceptions',
        `adds misconceptions to the original "${s.sid}", which has none`,
        { sid: String(s.sid) }
      );
    // What a measure step records.
    if (Array.isArray(o.fields))
      need(
        Array.isArray(s.fields) &&
          s.fields.length === o.fields.length &&
          o.fields.every(
            (f, j) => f.id === s.fields[j]?.id && f.unit === s.fields[j]?.unit
          ),
        `${at}.fields`,
        'remixFields',
        `differs from the original "${s.sid}" in a field's id, unit or order: a remix does not change what is recorded (a label is editable)`,
        { sid: String(s.sid) }
      );
  });
  return out;
}

/**
 * The format's rules are an author's: a field id of a short word, a checklist
 * of at most eight things, a first step that opens a scenario. A built-in
 * lesson was written before them and keeps what it has, so a problem the
 * format reports about something a step inherits unchanged is not the
 * remix's. This says which of the format's errors that is: the error is on an
 * inherited step, and what it complains of is what the original has.
 *
 * @param {{path: string, code: string}} err - From validateInvestigationPack
 * @param {object} pack
 * @param {object} original - The English lesson, every depth laid in
 * @returns {boolean} Whether the original's own shape explains it
 */
export function excusedByOriginal(err, pack, original) {
  if (err.path === 'objectives')
    return (
      (pack.objectives || []).length === (original.objectives || []).length
    );
  const m = /^steps\[(\d+)\](?:\.(\w+))?(?:\[(\d+)\])?(?:\.(\w+))?/.exec(
    err.path
  );
  if (!m) return false;
  const s = pack.steps?.[Number(m[1])];
  const o = original.steps.find(x => x.sid === s?.sid);
  if (!o) return false;
  const [, , field, index, sub] = m;
  const at = index === undefined ? undefined : Number(index);
  switch (err.code) {
    // The first step opens a scenario: the original's first step did not.
    case 'firstSetup':
      return o.setup === undefined;
    // A required text the original does not have.
    case 'text':
    case 'textMissing':
      if (field === 'misconceptions' && sub === 'say')
        return o.misconceptions?.[at]?.say === undefined;
      return field !== undefined && o[field] === undefined;
    // A misconception the original names by id alone, which its own code reads.
    case 'misconception': {
      const m = o.misconceptions?.[at];
      return (
        m !== undefined && m.factor === undefined && m.equals === undefined
      );
    }
    // A step type only the original's engine code knows (the ellipse, the wedges).
    case 'stepType':
      return field === 'type' && o.type === s.type;
    case 'checklist':
      return (
        (s.checklist || []).length <= Math.max(8, (o.checklist || []).length)
      );
    case 'fields':
      return (s.fields || []).length === (o.fields || []).length;
    case 'fieldId':
      return o.fields?.[at]?.id === s.fields?.[at]?.id;
    case 'unit':
    case 'unitUnknown':
      return field === 'fields'
        ? o.fields?.[at]?.unit === s.fields?.[at]?.unit
        : o.unit === s.unit;
    case 'id':
      return (
        field === 'misconceptions' &&
        sub === 'id' &&
        o.misconceptions?.[at]?.id === s.misconceptions?.[at]?.id
      );
    default:
      return false;
  }
}

function checkAdded(s, at, need) {
  need(
    ADDABLE.includes(s.type),
    `${at}.type`,
    'remixAdded',
    `a remix adds read, explore and question steps, not a ${s.type} step: an instrument and its scenario are the original's`,
    { type: String(s.type) }
  );
  need(
    s.setup === undefined,
    `${at}.setup`,
    'remixAddedSetup',
    'an added step opens no scenario: it reads the world already on screen'
  );
  need(
    s.tool === undefined,
    `${at}.tool`,
    'remixAddedTool',
    'an added step docks no instrument'
  );
}

const show = v => (v === undefined ? 'nothing' : JSON.stringify(v));

// ---------------------------------------------------------------------------
// Pack -> the lesson the engine runs
// ---------------------------------------------------------------------------

/**
 * The Spanish words of a part of a lesson: its strings that differ from the
 * English, by the same keys and indices, and nothing else. A translation is a
 * shadow of words (js/data/investigations/i18n.js), and the merged Spanish
 * lesson also holds the original's functions and numbers, which a shadow must
 * not.
 *
 * @returns {*} The shadow of `en`, or undefined when nothing in it is translated
 */
export function spanishWords(en, es) {
  if (typeof en === 'string')
    return typeof es === 'string' && es !== en ? es : undefined;
  if (Array.isArray(en)) {
    if (!Array.isArray(es)) return undefined;
    const list = en.map((x, i) => spanishWords(x, es[i]) ?? null);
    return list.some(x => x !== null) ? list : undefined;
  }
  if (isObject(en) && isObject(es)) {
    const out = {};
    for (const k of Object.keys(en)) {
      const w = spanishWords(en[k], es[k]);
      if (w !== undefined) out[k] = w;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

/**
 * Compile a remix: the original's steps, with the pack's words laid over them.
 *
 * The pack's own compile (compileInvestigation) builds each step from the
 * pack; for a step that is the original's, this lays that step over the
 * original and restores everything a remix may not change - the scenario and
 * seed, the instrument, the expected value, the fields' ids and units - and
 * everything the pack cannot carry, which is the original's code. So a
 * probe, a validate or a computed field the original has is the original's
 * own function, not a copy.
 *
 * The Spanish shadow starts from the original's Spanish, step by step, so
 * words a pack does not carry (a quote, a preset's label) keep theirs, then
 * takes the pack's.
 *
 * @param {object} pack - A pack that passed validateInvestigationPack and checkRemix
 * @param {object} original - The English lesson, every depth laid in
 * @param {object|null} originalEs - The same lesson merged with its Spanish
 * @param {object} api - As compileInvestigation takes it
 * @returns {{lesson: object, shadow: ?object, scoring: object, variants: object}}
 */
export function compileRemix(pack, original, originalEs, api) {
  const base = compileInvestigation(pack, api);
  const byOriginal = new Map(original.steps.map((s, i) => [s.sid, i]));
  const lesson = {
    ...original,
    ...base.lesson,
    id: remixLessonId(pack),
    pack: packIdentity(pack),
  };
  delete lesson.depths;
  if (base.lesson.depths) lesson.depths = base.lesson.depths;
  lesson.depthLaid = true;
  // The card's picture: the pack's choice of scenario, else the original's own.
  if (pack.thumbnail === undefined) lesson.thumbnail = original.thumbnail;

  const shadow = {};
  const es = originalEs || {};
  for (const k of ['title', 'subtitle', 'level', 'summary', 'objectives'])
    if (base.shadow?.[k] != null) shadow[k] = base.shadow[k];
    else {
      const w = spanishWords(original[k], es[k]);
      if (w !== undefined) shadow[k] = w;
    }
  // What else the lesson says in words (its series, say) keeps its Spanish.
  for (const k of Object.keys(original))
    if (
      !(k in shadow) &&
      !['id', 'steps', 'summary', 'depthLaid'].includes(k)
    ) {
      const w = spanishWords(original[k], es[k]);
      if (w !== undefined) shadow[k] = w;
    }
  shadow.duration = pack.duration;
  shadow.steps = [];

  lesson.steps = base.lesson.steps.map((compiled, i) => {
    const at = byOriginal.get(compiled.sid);
    const words = base.shadow?.steps?.[i] || {};
    if (at === undefined) {
      shadow.steps.push(words);
      return compiled;
    }
    const o = original.steps[at];
    const step = { ...o, ...compiled };
    // Not the pack's: the world, the instrument and the expected value.
    for (const k of [
      'setup',
      'tool',
      'fields',
      'answer',
      'tolerance',
      'unit',
      'expect',
      'reveal',
      'reflect',
      'kind',
      'misconceptions',
    ]) {
      if (o[k] === undefined) delete step[k];
      else step[k] = o[k];
    }
    if (isObject(o.setup)) {
      const p = pack.steps[i].setup || {};
      step.setup = { ...o.setup };
      if (typeof p.paused === 'boolean') step.setup.paused = p.paused;
      else delete step.setup.paused;
      if (typeof p.zoom === 'number')
        step.setup.camera = { ...o.setup.camera, zoom: p.zoom };
      else if (isObject(step.setup.camera)) {
        step.setup.camera = { ...step.setup.camera };
        delete step.setup.camera.zoom;
        if (!Object.keys(step.setup.camera).length) delete step.setup.camera;
      }
    }
    if (Array.isArray(o.fields))
      step.fields = o.fields.map((f, j) => ({
        ...f,
        label: compiled.fields?.[j]?.label ?? f.label,
      }));
    if (Array.isArray(o.misconceptions))
      step.misconceptions = o.misconceptions.map((m, j) => ({
        ...m,
        say: compiled.misconceptions?.[j]?.say ?? m.say,
      }));
    // The pack is the authority on what it carries and leaves out; what it
    // cannot carry (a rubric on an explore step, say) stays the original's.
    const carried = new Set([...CARRIED.common, ...(CARRIED[o.type] || [])]);
    for (const k of [
      'tip',
      'worked',
      'rubric',
      'rubricCriteria',
      'because',
      'hints',
      'feedback',
      'checklist',
    ])
      if (
        carried.has(k) &&
        (compiled[k] === undefined || compiled[k].length === 0)
      ) {
        delete step[k];
        delete words[k];
      }
    if (compiled.depth === undefined) delete step.depth;
    if (compiled.requires === undefined) delete step.requires;
    if (compiled.when === undefined) delete step.when;
    const spanish = spanishWords(o, es.steps?.[at]) || {};
    const sw = { ...spanish, ...words };
    // A text the pack has no Spanish for falls back to the original's.
    for (const k of Object.keys(words))
      if (words[k] === null || words[k] === undefined)
        if (spanish[k] !== undefined && compiled[k] === o[k])
          sw[k] = spanish[k];
        else delete sw[k];
    if (Array.isArray(o.fields) && Array.isArray(spanish.fields))
      sw.fields = o.fields.map((f, j) => ({
        ...spanish.fields[j],
        ...(words.fields?.[j]?.label ? { label: words.fields[j].label } : {}),
      }));
    if (
      Array.isArray(o.misconceptions) &&
      Array.isArray(spanish.misconceptions)
    )
      sw.misconceptions = o.misconceptions.map((m, j) => ({
        ...spanish.misconceptions[j],
        ...(words.misconceptions?.[j]?.say
          ? { say: words.misconceptions[j].say }
          : {}),
      }));
    shadow.steps.push(sw);
    return step;
  });
  const hasSpanish =
    Boolean(originalEs) ||
    base.shadow !== null ||
    shadow.steps.some(w => Object.keys(w).length);
  return {
    lesson,
    shadow: hasSpanish ? shadow : null,
    scoring: base.scoring,
    variants: base.variants,
  };
}
