// =============================================================================
// Adapting an activity, proven against the step graph (Prompt 175)
// -----------------------------------------------------------------------------
// An activity is a lesson's steps chosen by an instructor (./assignment.js).
// Adapting one is three more choices - the order the steps come in, a sentence
// of the instructor's own on a step, and a due line - and the one rule is that
// no adaptation may make a step mean something it did not mean in the lesson.
//
// "The step graph" is what the lesson already declares and the engine already
// acts on, and nothing is invented here:
//
//   requires  a step reads another's answer, measurement or action, so that one
//             has to be in the activity and come first;
//   reveal    a prediction's verdict is held until the step it names is reached,
//             so that step has to be in the activity and come after it;
//   when      a remediation step answers a graded one, so that one is there and
//             comes first;
//   setup     the world a step is about is the nearest step at or before it that
//             builds one (js/investigations.js setupInForceAt): the order must
//             leave every step under the world it had in the lesson;
//   scene     a step that stages nothing keeps the scene of the nearest step
//             before it that does, so it may not be moved under another scene.
//
// checkAdaptation() names each broken edge - the step and the one it needs - and
// reports only what the adaptation introduces: a cut that the builder made in
// lesson order is the baseline, so the instructor is never refused for a thing
// they did not change. The builder will not write a package that fails it.
//
// Pure: no DOM, no storage. The builder (./assignmentBuilder.js) and the page
// that opens an activity (./adapted.js) both read it, and tests/
// assignmentAdaptation.test.js runs it against every lesson in the catalogue.
// =============================================================================

import { assignmentIdFor, assignmentVersion, shortHash } from './assignment.js';

/** The most a student-facing sentence on one step may hold, in characters. */
export const MAX_NOTE = 600;
/** The most the due line may hold, in characters. */
export const MAX_DUE = 200;

const DEPTHS = ['core', 'quantitative', 'advanced'];
const depthOf = s => Math.max(0, DEPTHS.indexOf(s?.depth));

/** The sids of `list` in the order the lesson has them. */
export const lessonOrder = (lesson, list) => {
  const keep = new Set(list);
  return (lesson?.steps || []).map(s => s.sid).filter(sid => keep.has(sid));
};

/** The nearest step at or before `i` that builds or stages a world, or null. */
function sceneAt(steps, i) {
  for (let k = i; k >= 0; k--) if (steps[k].setup || steps[k].stage) return k;
  return null;
}

/** The nearest step at or before `i` that carries a setup, or null. */
function setupAt(steps, i) {
  for (let k = i; k >= 0; k--) if (steps[k].setup) return k;
  return null;
}

/** Every broken edge of one order of steps, as {rule, sid, needs, why}. */
function problemsOf(lesson, list, depth) {
  const byId = new Map((lesson?.steps || []).map(s => [s.sid, s]));
  const at = new Map(list.map((sid, i) => [sid, i]));
  const full = lesson?.steps || [];
  const fullAt = new Map(full.map((s, i) => [s.sid, i]));
  const steps = list.map(sid => byId.get(sid));
  const out = [];
  const add = (rule, sid, needs, why) => out.push({ rule, sid, needs, why });

  // A reference is satisfied when the step is there and on the right side.
  const edge = (rule, sid, i, ref, before) => {
    if (!ref || !byId.has(ref)) return;
    if (!at.has(ref)) return add(rule, sid, ref, 'absent');
    if (before ? at.get(ref) > i : at.get(ref) < i)
      add(rule, sid, ref, before ? 'later' : 'earlier');
  };

  steps.forEach((s, i) => {
    if (!s) return;
    if (depth && depthOf(s) > DEPTHS.indexOf(depth))
      add('depth', s.sid, null, depth);
    for (const ref of s.requires || []) edge('requires', s.sid, i, ref, true);
    edge('when', s.sid, i, s.when?.sid, true);
    edge('reveal', s.sid, i, s.reveal, false);

    // The world: the same walk the engine makes, against the lesson whole.
    const j = setupAt(steps, i);
    const k = setupAt(full, fullAt.get(s.sid));
    const found = j === null ? null : steps[j].sid;
    const wanted = k === null ? null : full[k].sid;
    if (found !== wanted) add('setup', s.sid, wanted ?? found, 'world');
  });
  return out;
}

const keyOf = p => `${p.rule}|${p.sid}|${p.needs}|${p.why}`;

/**
 * Whether an order of an activity's steps respects the lesson's step graph.
 *
 * @param {object} lesson - The merged lesson (at the depth being set)
 * @param {string[]} list - Sids in the order proposed
 * @param {object} [o]
 * @param {string[]} [o.base] - The cut in lesson order, the baseline; the
 *   default is `list` sorted into lesson order
 * @param {string} [o.depth] - The depth the activity is set at
 * @returns {{ok: boolean, problems: Array<{rule: string, sid: string,
 *   needs: ?string, why: string}>}} Only what the order introduces; each names
 *   the step and the step it needs
 */
export function checkAdaptation(lesson, order, { base, depth } = {}) {
  const known = new Set((lesson?.steps || []).map(s => s.sid));
  const list = order.filter(sid => known.has(sid));
  const baseline = (base || lessonOrder(lesson, list)).filter(sid =>
    known.has(sid)
  );
  const was = new Set(problemsOf(lesson, baseline, depth).map(keyOf));
  const problems = problemsOf(lesson, list, depth).filter(
    p => !was.has(keyOf(p))
  );
  // A scene is judged against the baseline, not the lesson: a stage-less step
  // is the same step in whatever order, as long as the scene it sits under is.
  const steps = new Map((lesson?.steps || []).map(s => [s.sid, s]));
  const sceneIn = order => {
    const row = order.map(sid => steps.get(sid));
    return new Map(
      row.map((s, i) => {
        const k = sceneAt(row, i);
        return [s?.sid, k === null ? null : row[k].sid];
      })
    );
  };
  const then = sceneIn(baseline);
  const now = sceneIn(list);
  for (const sid of list) {
    if (!then.has(sid) || then.get(sid) === now.get(sid)) continue;
    problems.push({
      rule: 'scene',
      sid,
      needs: then.get(sid) ?? now.get(sid),
      why: 'scene',
    });
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Move one step a place earlier (-1) or later (+1) in an order, or say why not.
 * @returns {{list: string[], problems: Array}} The new order, which is the
 *   old one when the move was refused
 */
export function moveStep(lesson, list, sid, by, o = {}) {
  const i = list.indexOf(sid);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return { list, problems: [] };
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  const { problems } = checkAdaptation(lesson, next, o);
  return problems.length ? { list, problems } : { list: next, problems };
}

/**
 * Keep an instructor's order through a change of selection: the steps still
 * there keep their places, and a step that arrived goes after the one that
 * precedes it in the lesson. An order that then fails the graph falls back to
 * the lesson's own, which always passes.
 * @returns {string[]} The new order
 */
export function mergeOrder(lesson, previous, resolved, o = {}) {
  if (!previous?.length) return resolved;
  const keep = new Set(resolved);
  const out = previous.filter(sid => keep.has(sid));
  const placed = new Set(out);
  const all = (lesson?.steps || []).map(s => s.sid);
  for (const sid of resolved) {
    if (placed.has(sid)) continue;
    let after = -1;
    for (let k = all.indexOf(sid) - 1; k >= 0 && after < 0; k--)
      after = out.indexOf(all[k]);
    out.splice(after + 1, 0, sid);
    placed.add(sid);
  }
  return checkAdaptation(lesson, out, { ...o, base: resolved }).ok
    ? out
    : resolved;
}

// --- The package ------------------------------------------------------------

/** One-language-or-both notes as the link carries them: {sid: [en, es?]}. */
export function cleanNotes(raw, sids) {
  const out = {};
  const ok = new Set(sids);
  for (const [sid, v] of Object.entries(
    raw && typeof raw === 'object' ? raw : {}
  )) {
    if (!ok.has(sid)) continue;
    const pair = (Array.isArray(v) ? v : [v]).map(x =>
      String(x ?? '')
        .trim()
        .slice(0, MAX_NOTE)
    );
    if (!pair[0] && !pair[1]) continue;
    out[sid] = pair[1] ? [pair[0], pair[1]] : [pair[0]];
  }
  return out;
}

/** The note a reader in `locale` sees on a step: theirs, else the other. */
export function noteFor(x, sid, locale) {
  const pair = x?.[sid];
  if (!Array.isArray(pair)) return '';
  const [en, es] = [pair[0], pair[1]].map(v =>
    typeof v === 'string' ? v : ''
  );
  return (locale === 'es' ? es || en : en || es) || '';
}

/** The due line as the link carries it, or '' for none. */
export const cleanDue = due =>
  String(due ?? '')
    .trim()
    .slice(0, MAX_DUE);

/**
 * Lay an adaptation over a built assignment (buildAssignment's result) without
 * touching how that is built. Written only when set, so an activity made without
 * any is byte for byte what it was, and a build that does not know the fields
 * opens the link and leaves them out.
 *
 * @param {object} built - From buildAssignment()
 * @param {object} o
 * @param {object} o.lesson - The merged lesson
 * @param {string[]} [o.order] - A permutation of built.s
 * @param {object} [o.notes] - {sid: string | [en, es]}
 * @param {string} [o.due] - The due line
 * @param {Function} o.fingerprint - stepFingerprint from progressBackup.js
 * @returns {object} The package
 */
export function applyAdaptation(
  built,
  { lesson, order, notes, due, fingerprint }
) {
  const same = new Set(built.s);
  const row =
    order?.length === built.s.length && order.every(sid => same.has(sid))
      ? order
      : built.s;
  const moved = row.some((sid, i) => sid !== built.s[i]);
  const byId = new Map((lesson?.steps || []).map(s => [s.sid, s]));
  const out = { ...built };
  if (moved) {
    // A reordered activity is another activity: its id comes from the order, as
    // an activity's id comes from its steps, so no saved answer is shared.
    out.s = row;
    out.f = row.map(sid => shortHash(fingerprint(byId.get(sid))));
    out.i = assignmentIdFor(
      { lesson: built.l, sids: row, title: built.t },
      new Date(`${built.c}T00:00:00Z`)
    );
  }
  const x = cleanNotes(notes, row);
  if (Object.keys(x).length) out.x = x;
  const u = cleanDue(due);
  if (u) out.u = u;
  return out;
}

// --- What an activity reads on opening -------------------------------------

/**
 * The adaptation a payload carries, cleaned: a link is untrusted input.
 * @returns {{x: object, u: string}}
 */
export function readAdaptation(assignment) {
  return {
    x: cleanNotes(assignment?.x, assignment?.s || []),
    u: typeof assignment?.u === 'string' ? cleanDue(assignment.u) : '',
  };
}

/**
 * What changed under an activity since it was made, from the step digests each
 * of its steps carries (`f`), the lesson as it is now, and the package pin.
 *
 * A digest is of a step's type, instrument, scenario, answer fields and the
 * shape of its answer, never its words, so "changed" means what a student
 * answers is not what was asked; the words alone moving changes nothing here.
 *
 * @param {object} assignment - A validated payload
 * @param {object} lesson - The merged lesson now
 * @param {{bindings: Array, missing: number, changed: number}} resolution -
 *   From stepBindings()
 * @param {object} pin - From packageBinding()
 * @returns {{missing: string[], changed: string[], graph: Array, pin: object,
 *   any: boolean}} Step titles, not ids
 */
export function whatChanged(assignment, lesson, resolution, pin) {
  const title = sid =>
    (lesson?.steps || []).find(s => s.sid === sid)?.title || sid;
  const of = status =>
    resolution.bindings.filter(b => b.status === status).map(b => b.sid);
  const missing = of('missing');
  const changed = of('changed');
  const present = resolution.bindings.filter(b => b.step).map(b => b.sid);
  // The graph as the lesson has it now, for the steps that are still there, in
  // the order the activity gives them.
  const graph = checkAdaptation(lesson, present, {
    base: [],
    depth: assignment.d,
  }).problems.map(p => ({
    ...p,
    step: title(p.sid),
    needsTitle: p.needs ? title(p.needs) : '',
  }));
  const moved = ['unpinned', 'major', 'moved'].includes(pin?.status);
  return {
    missing: missing.map(title),
    changed: changed.map(title),
    missingSids: missing,
    changedSids: changed,
    graph,
    pin,
    any: Boolean(missing.length || changed.length || graph.length || moved),
  };
}

/**
 * The reviewed way forward: the same activity re-pinned to the lesson as it is
 * now. Steps that are gone are dropped; steps that were rewritten get their new
 * digest, and the activity gets a new id, because the old one names answers to
 * questions that are no longer these (the rule ./assignment.js states and the
 * course pack's upgrade keeps: js/course/review.js upgradeCoursePack).
 *
 * @param {object} assignment - A validated payload
 * @param {object} lesson - The merged lesson now
 * @param {Function} fingerprint - stepFingerprint
 * @param {?{id: string, version: string}} provider - lessonProvider() now
 * @param {Date} [now]
 * @returns {object} The re-pinned payload
 */
export function repin(
  assignment,
  lesson,
  fingerprint,
  provider,
  now = new Date()
) {
  const byId = new Map((lesson?.steps || []).map(s => [s.sid, s]));
  const s = (assignment.s || []).filter(sid => byId.has(sid));
  const f = s.map(sid => shortHash(fingerprint(byId.get(sid))));
  const rest = { ...assignment };
  delete rest.p;
  const out = {
    ...rest,
    s,
    f,
    c: now.toISOString().slice(0, 10),
    ...(provider ? { p: [provider.id, provider.version] } : {}),
  };
  const x = cleanNotes(assignment.x, s);
  delete out.x;
  if (Object.keys(x).length) out.x = x;
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  out.i = `${stamp}${shortHash(`${out.l}|${s.join(',')}|${out.t || ''}|${f.join(',')}`)}`;
  out.v = assignmentVersion(out);
  return out;
}
