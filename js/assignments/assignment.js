// =============================================================================
// A short assignment cut from a long investigation
// -----------------------------------------------------------------------------
// An instructor with fifty minutes cannot set a thirty-seven step lesson. What
// they can set is eight of its steps - and the difference between that being
// useful and being broken is whether the eight still make sense on their own.
//
// The problem this solves
// -----------------------------------------------------------------------------
// Steps are not independent. A question about the Solar System is unanswerable
// if the step that loaded the Solar System is not in the activity, and the
// student is left reading a question about a screen that shows something else.
// js/investigations.js already knows this rule - setupInForceAt() walks
// backwards from the current step to the nearest one carrying a `setup`,
// because that is the world the reader is looking at. So the same rule decides
// what an assignment has to include: pick step 20, and the step that built the
// world step 20 is about comes with it, whether or not it was ticked.
//
// Those additions are reported, never silent. An instructor who selects eight
// steps and gets ten should be told which two arrived and why, because the two
// are part of what they are assigning.
//
// What an assignment is not
// -----------------------------------------------------------------------------
// It carries no answers, no worked solutions, no hints, and no student
// responses. It is a lesson id, an ordered list of permanent step ids, a
// fingerprint per step, and some prose the instructor wrote. Everything a
// student sees is loaded from the catalogue at open time, which is what makes
// the link short and what makes it impossible for a link to leak an answer key
// even if somebody decodes it. There is a test for exactly that.
//
// Lessons change
// -----------------------------------------------------------------------------
// A lesson revised after an assignment was made can have steps removed,
// replaced, or rewritten into different questions under the same id. So each
// step travels with a short hash of the fingerprint from js/investigations/
// progressBackup.js - type, kind, tool, scenario, field ids, option count -
// and opening an assignment classifies every step as present, changed or
// missing rather than assuming the id still means what it meant.
//
// The dangerous case is the quiet one: a `question` step whose options were
// rewritten keeps its id, so a stored response would attach to a question it
// was never an answer to. That is why a changed step is not just flagged in
// the interface but has its stored response withheld - see stepBindings().
// =============================================================================

/** What kind of thing a payload claims to be. */
export const ASSIGNMENT_KIND = 'gravitas.assignment';

/**
 * The payload version.
 *
 * 1: lesson id, ordered sids, per-step fingerprint hashes, title and intro.
 */
export const ASSIGNMENT_SCHEMA = 1;

/** The tag that marks an assignment fragment, so a world link is never one. */
export const ASSIGNMENT_TAG = 'a';

/** Bounds on what an assignment may contain. */
export const MIN_STEPS = 1;
export const MAX_STEPS = 60;
export const MAX_TITLE = 120;
export const MAX_INTRO = 1200;

/** How a stored step id resolved against the lesson as it is now. */
export const BINDING = Object.freeze({
  /** Same id, same shape. Safe to show and to restore progress into. */
  PRESENT: 'present',
  /** Same id, different shape: the question was rewritten under its own id. */
  CHANGED: 'changed',
  /** The id is not in this lesson any more. */
  MISSING: 'missing',
});

/**
 * A short, stable hash of a step's fingerprint.
 *
 * The fingerprint itself is readable prose - "measure|-|ruler|Solar System|
 * p1_a+p1_P|-" - which is right for a backup file a person opens and wrong for
 * a link, where sixty of them would dominate the payload. Eight hex characters
 * is enough to notice a rewrite and short enough to carry.
 *
 * FNV-1a: not cryptographic and does not need to be. It is detecting an
 * authoring change, not resisting one.
 *
 * @param {string} fingerprint - From stepFingerprint()
 * @returns {string} Eight hex characters
 */
export function shortHash(fingerprint) {
  let h = 0x811c9dc5;
  const text = String(fingerprint ?? '');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * The step that establishes the world a given step is about.
 *
 * The same rule as setupInForceAt() in js/investigations.js: the nearest step
 * at or before this one that carries a `setup`.
 *
 * @param {object} lesson - The merged lesson
 * @param {number} index - Step index
 * @returns {number} Index of the setup step, or -1 if the lesson has none
 */
export function setupIndexFor(lesson, index) {
  const steps = lesson?.steps || [];
  for (let i = Math.min(index, steps.length - 1); i >= 0; i--) {
    if (steps[i]?.setup) return i;
  }
  return -1;
}

/**
 * Work out what a selection actually has to contain.
 *
 * Returns the steps in lesson order - an assignment is a subset of a sequence,
 * not a reordering of one, because the prose refers backwards ("the value you
 * measured above") and shuffling it would produce nonsense.
 *
 * @param {object} lesson - The merged lesson
 * @param {Array<string>} chosen - Sids the instructor ticked
 * @returns {{sids: Array<string>, added: Array<object>, unknown: Array<string>,
 *   ok: boolean}} The resolved selection
 */
export function resolveSelection(lesson, chosen) {
  const steps = lesson?.steps || [];
  const indexOf = new Map(steps.map((s, i) => [s.sid, i]));
  const wanted = new Set();
  const unknown = [];

  for (const sid of chosen || []) {
    if (!indexOf.has(sid)) {
      unknown.push(sid);
      continue;
    }
    wanted.add(sid);
  }

  // Pull in what each chosen step needs, and what THOSE need in turn.
  //
  // Two kinds of prerequisite, resolved to a fixed point rather than one level
  // deep. The first version pulled in each step's setup and stopped, so a step
  // whose question refers to a measurement made three steps earlier - "the
  // period you found above" - was handed to a student with the measurement
  // step missing, and the setup that measurement needed was never considered
  // either because it was reached through a step that had itself been added.
  //
  //   setup     the world the step is about, found by walking backwards.
  //   requires  a dependency the lesson declares by sid: a measurement a later
  //             step computes from, an import a later field is filled by.
  //
  // The loop runs until nothing new is added. A cycle cannot spin it, because
  // a sid is only ever added once.
  const added = [];
  const explain = (sid, reason, forSid, scenario = null) => {
    if (wanted.has(sid)) return;
    wanted.add(sid);
    added.push({ sid, reason, forSid, scenario });
  };

  let growing = true;
  while (growing) {
    growing = false;
    for (const sid of [...wanted]) {
      const index = indexOf.get(sid);
      if (index === undefined) continue;

      // Declared dependencies first: they are the reason a step is answerable
      // at all, and they may themselves sit under a different setup.
      for (const need of steps[index].requires || []) {
        if (!indexOf.has(need)) {
          if (!unknown.includes(need)) unknown.push(need);
          continue;
        }
        if (wanted.has(need)) continue;
        explain(need, 'requires', sid);
        growing = true;
      }

      const setupIndex = setupIndexFor(lesson, index);
      if (setupIndex < 0) continue;
      const setupSid = steps[setupIndex].sid;
      if (wanted.has(setupSid)) continue;
      explain(
        setupSid,
        'setup',
        sid,
        steps[setupIndex].setup?.scenario ?? null
      );
      growing = true;
    }
  }

  const sids = steps.map(s => s.sid).filter(sid => wanted.has(sid));
  return { sids, added, unknown, ok: sids.length >= MIN_STEPS };
}

/**
 * Why a selection cannot be turned into an assignment.
 *
 * @param {object} lesson - The merged lesson
 * @param {object} spec - chosen, title, intro
 * @returns {{ok: boolean, reason: ?string, detail: ?object}} The verdict
 */
export function validateSelection(lesson, spec) {
  const fail = (reason, detail = null) => ({ ok: false, reason, detail });
  if (!lesson?.steps?.length) return fail('noLesson');
  if (!Array.isArray(spec?.chosen) || !spec.chosen.length) {
    return fail('nothingSelected');
  }
  const resolved = resolveSelection(lesson, spec.chosen);
  if (resolved.unknown.length) {
    return fail('unknownSteps', { sids: resolved.unknown });
  }
  if (resolved.sids.length > MAX_STEPS) {
    return fail('tooManySteps', { max: MAX_STEPS, n: resolved.sids.length });
  }
  if ((spec.title || '').length > MAX_TITLE) {
    return fail('titleTooLong', { max: MAX_TITLE });
  }
  if ((spec.intro || '').length > MAX_INTRO) {
    return fail('introTooLong', { max: MAX_INTRO });
  }
  return { ok: true, reason: null, detail: null };
}

/**
 * Build the payload that becomes a link and a file.
 *
 * @param {object} params - lesson, chosen, title, intro, id, now, fingerprint
 * @returns {object} The assignment payload
 */
export function buildAssignment({
  lesson,
  chosen,
  title = '',
  intro = '',
  id = null,
  now = new Date(),
  fingerprint,
}) {
  const resolved = resolveSelection(lesson, chosen);
  const byId = new Map((lesson.steps || []).map(s => [s.sid, s]));
  return {
    // Short keys: this is a URL fragment before it is anything else.
    k: ASSIGNMENT_KIND,
    v: ASSIGNMENT_SCHEMA,
    i:
      id ||
      assignmentIdFor({ lesson: lesson.id, sids: resolved.sids, title }, now),
    l: lesson.id,
    t: String(title || '').slice(0, MAX_TITLE),
    n: String(intro || '').slice(0, MAX_INTRO),
    s: resolved.sids,
    // One hash per step, in the same order. Nothing about the content of a
    // step travels: this is enough to notice a change and useless for
    // reconstructing what changed.
    f: resolved.sids.map(sid => shortHash(fingerprint(byId.get(sid)))),
    c: now.toISOString().slice(0, 10),
  };
}

/**
 * An id for an assignment, derived from what is in it.
 *
 * Not random. A random id was the obvious choice and the wrong one: it gave
 * only a few thousand values a day, and two assignments that collide share a
 * progress namespace - which is precisely the thing this namespace exists to
 * keep apart. Two builds in one browser session collided in testing on the
 * first try.
 *
 * Deriving it from the lesson, the ordered step ids and the title means two
 * different activities cannot collide unless the hash does, and it has a
 * second useful property: reissuing the same activity produces the same id, so
 * a student who opens this term's copy of last term's worksheet keeps the work
 * they have already done on it. Change any step and the id changes with it,
 * which is what makes the link versioned.
 *
 * Short on purpose: it goes in a storage key and a printed header.
 *
 * @param {object} parts - lesson, sids, title
 * @param {Date} now - Timestamp, for the readable date prefix
 * @returns {string} The id
 */
export function assignmentIdFor({ lesson, sids, title }, now = new Date()) {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  const body = `${lesson}|${(sids || []).join(',')}|${title || ''}`;
  return `${stamp}${shortHash(body)}`;
}

/**
 * Check a payload that arrived from outside.
 *
 * A link is untrusted input: it can be truncated by a mail client, edited by
 * hand, or made by a newer build. Everything is checked before any of it is
 * used, and the failures are named so the reader is told which one happened.
 *
 * @param {*} data - Decoded payload
 * @returns {{ok: boolean, reason: ?string, detail: ?object}} The verdict
 */
export function validateAssignment(data) {
  const fail = (reason, detail = null) => ({ ok: false, reason, detail });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return fail('notAnObject');
  }
  if (data.k !== ASSIGNMENT_KIND) return fail('wrongKind');
  const version = Number(data.v);
  if (!Number.isInteger(version) || version < 1) return fail('badVersion');
  if (version > ASSIGNMENT_SCHEMA) return fail('newerVersion', { version });

  if (typeof data.l !== 'string' || !data.l || data.l.length > 80) {
    return fail('badLesson');
  }
  if (typeof data.i !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(data.i)) {
    return fail('badId');
  }
  if (!Array.isArray(data.s) || data.s.length < MIN_STEPS) {
    return fail('noSteps');
  }
  if (data.s.length > MAX_STEPS) {
    return fail('tooManySteps', { max: MAX_STEPS, n: data.s.length });
  }
  if (
    data.s.some(sid => typeof sid !== 'string' || !sid || sid.includes(':'))
  ) {
    // A colon would collide with the sub-key scheme progress uses.
    return fail('badStepId');
  }
  if (new Set(data.s).size !== data.s.length) return fail('duplicateSteps');
  if (data.f !== undefined) {
    if (!Array.isArray(data.f) || data.f.length !== data.s.length) {
      return fail('fingerprintMismatch');
    }
  }
  if (data.t !== undefined && typeof data.t !== 'string')
    return fail('badText');
  if (data.n !== undefined && typeof data.n !== 'string')
    return fail('badText');
  if ((data.t || '').length > MAX_TITLE) return fail('titleTooLong');
  if ((data.n || '').length > MAX_INTRO) return fail('introTooLong');

  // An assignment must not carry answers or anybody's work. Nothing here
  // writes such a field, so one arriving means the payload was made by
  // something else and should not be trusted to be an assignment at all.
  for (const banned of ['responses', 'answers', 'attempts', 'r', 'a']) {
    if (banned in data) return fail('unexpectedField', { field: banned });
  }
  return { ok: true, reason: null, detail: null };
}

/**
 * Resolve an assignment's steps against the lesson as it stands today.
 *
 * The heart of the compatibility story. Three outcomes per step, and the
 * middle one is the one that matters: an id that still exists but whose step
 * has been rewritten. Treating that as present would attach a student's stored
 * answer to a question that was never asked - the same id, a different
 * question - so it is called out and its progress is held back.
 *
 * @param {object} assignment - A validated payload
 * @param {object} lesson - The merged lesson, loaded now
 * @param {Function} fingerprint - stepFingerprint from progressBackup.js
 * @returns {{bindings: Array<object>, steps: Array<object>, present: number,
 *   changed: number, missing: number, usable: boolean}} The resolution
 */
export function stepBindings(assignment, lesson, fingerprint) {
  const byId = new Map((lesson?.steps || []).map(s => [s.sid, s]));
  const bindings = (assignment.s || []).map((sid, i) => {
    const step = byId.get(sid);
    if (!step) {
      return { sid, status: BINDING.MISSING, step: null, index: i };
    }
    const want = assignment.f?.[i];
    const have = shortHash(fingerprint(step));
    // No stored fingerprint means an older payload that did not carry them;
    // it is treated as present, because refusing every step of an assignment
    // made before fingerprints existed would be worse than the risk.
    const status = want && want !== have ? BINDING.CHANGED : BINDING.PRESENT;
    return { sid, status, step, index: i, expected: want, actual: have };
  });

  const count = st => bindings.filter(b => b.status === st).length;
  return {
    bindings,
    // Missing steps are dropped from the sequence; changed ones are kept,
    // because the question is still a question and a student can still answer
    // it. What they do not keep is the old answer.
    steps: bindings.filter(b => b.step).map(b => b.step),
    present: count(BINDING.PRESENT),
    changed: count(BINDING.CHANGED),
    missing: count(BINDING.MISSING),
    usable: bindings.some(b => b.step),
  };
}

/**
 * Which stored responses may be carried into this assignment.
 *
 * Only the steps that are present and unchanged. A changed step's key is
 * dropped rather than shown, so a rewritten question opens blank instead of
 * opening with an answer to its previous self.
 *
 * @param {object} resolution - From stepBindings
 * @param {object} responses - Stored responses, keyed by stepKey
 * @param {Function} keyFor - (sid) -> the response key for this lesson
 * @returns {{kept: object, dropped: Array<string>}} What survives
 */
export function filterResponses(resolution, responses, keyFor) {
  const safe = new Set(
    resolution.bindings
      .filter(b => b.status === BINDING.PRESENT)
      .map(b => keyFor(b.sid))
  );
  const kept = {};
  const dropped = [];
  for (const [key, value] of Object.entries(responses || {})) {
    // Sub-keys hang off a step's key with a further colon.
    const base = key.split(':').slice(0, 2).join(':');
    if (safe.has(base)) kept[key] = value;
    else dropped.push(key);
  }
  return { kept, dropped };
}

/**
 * Where this assignment's progress lives.
 *
 * Its own namespace, so that a student doing two assignments cut from one
 * lesson keeps two sets of answers, and neither disturbs the progress of
 * anybody working through the whole lesson on the same machine.
 *
 * @param {object} assignment - A validated payload
 * @returns {string} The storage key
 */
export const assignmentStorageKey = assignment =>
  `gravitas_assignment_${assignment.i}`;
