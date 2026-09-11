// =============================================================================
// Which object a lesson means
// -----------------------------------------------------------------------------
// A lesson step that says "click the Eccentric Orbiter" has to be able to say
// it to the rest of the application - to the canvas, to the accessible object
// list, to the inspector, to a plot - and every one of them has to arrive at
// the same body. Today it says it in prose, and the one place code says it,
// `ctx.find(name)`, is a case-insensitive substring match over every body in
// the world. "Eccentric" finds the Eccentric Orbiter, and it would just as
// happily find an Eccentric Comet somebody dropped in beside it, and it would
// find whichever came first in the list without saying that there were two.
//
// So this module is the identity rules, and nothing else. It is pure: values
// in, values out, no imports, no DOM, no clock, no object lists. What it knows
// is what makes two references to a body the same reference, and - much more
// important - when they are NOT the same and the honest answer is to refuse.
//
// Why an id is not enough
// -----------------------------------------------------------------------------
// Bodies carry a numeric `id`, and js/physics.js resets the counter to zero on
// every rebuild. Load a scenario, and the star is id 0. Load it again, and a
// different star is id 0. The id alone therefore identifies a body only within
// one world, which is why every binding here carries the world generation it
// was made in and is *stale*, not merely valid, when the world moves on.
// js/observingSession.js reached the same conclusion for recordings; this is
// the same rule, written down once.
//
// The three answers
// -----------------------------------------------------------------------------
// A binding resolves to exactly one of three things, and a caller must handle
// all three:
//
//   BOUND    the body is there, in this world, and is the one meant
//   STALE    the world was rebuilt under it; the id may now mean someone else
//   GONE     this world, but the body is not in it any more - merged, or
//            consumed, or deleted
//
// There is deliberately no fourth answer that guesses. A stale binding is not
// silently re-resolved by name, because the name is exactly what is not
// trustworthy across a rebuild: two runs of the same scenario name their stars
// from the same pool and a lesson would happily measure the wrong one.
// Re-resolving is a decision for whoever knows what the step meant, and it is
// made by asking for a fresh match against a matcher.
// =============================================================================

/** How a binding stands relative to the world it is being read in. */
export const BINDING = Object.freeze({
  BOUND: 'bound',
  STALE: 'stale',
  GONE: 'gone',
  UNBOUND: 'unbound',
});

/** Who is allowed to change an object's state. */
export const OWNER = Object.freeze({
  /** The N-body integrator, which is the ordinary case. */
  ENGINE: 'engine',
  /**
   * A prescribed scientific model - a stellar track, a waveform - which owns
   * the object's state for as long as the activity lasts. The integrator must
   * not also be moving or evolving it: two authors of one number is how a
   * lesson ends up reporting something no model computed.
   */
  MODEL: 'model',
});

/**
 * A reference to one body, good in one world.
 *
 * @param {object} spec - What is being recorded
 * @param {string} spec.role - What the lesson calls it: 'star', 'probe'
 * @param {number} spec.id - The body's id in that world
 * @param {number} spec.generation - The world generation it was bound in
 * @param {string} [spec.kind] - The body's type, checked on every resolve
 * @param {string} [spec.name] - What it was called, for messages only
 * @param {string} [spec.owner] - One of OWNER; defaults to the engine
 * @returns {object} A frozen binding
 */
export function makeBinding({
  role,
  id,
  generation,
  kind = null,
  name = null,
  owner = OWNER.ENGINE,
}) {
  return Object.freeze({
    role: String(role),
    id: Number(id),
    generation: Number(generation),
    kind,
    name,
    owner: owner === OWNER.MODEL ? OWNER.MODEL : OWNER.ENGINE,
  });
}

/**
 * How a binding stands, without looking at any body.
 *
 * Separated from the lookup because the world generation is the cheap check
 * and the honest one: if it does not match, no amount of searching the object
 * lists can turn the answer into BOUND.
 *
 * @param {?object} binding - From makeBinding, or null
 * @param {number} generation - The world generation now
 * @returns {string} One of BINDING
 */
export function bindingAge(binding, generation) {
  if (!binding) return BINDING.UNBOUND;
  return binding.generation === generation ? BINDING.BOUND : BINDING.STALE;
}

/**
 * Whether this body is the one the binding names.
 *
 * The kind is checked as well as the id, because ids are per-world counters
 * shared across every list: nothing stops a star and a planet holding the same
 * id in two different worlds, and a lesson that asked for a star and silently
 * got a planet is the failure this whole module exists to prevent.
 *
 * @param {?object} binding - From makeBinding
 * @param {?object} body - A candidate
 * @param {number} generation - The world generation now
 * @returns {boolean} True only when it is certainly the same object
 */
export function bindingMatches(binding, body, generation) {
  if (!binding || !body) return false;
  if (binding.generation !== generation) return false;
  if (body.id !== binding.id) return false;
  if (binding.kind && kindOf(body) !== binding.kind) return false;
  return body.alive !== false;
}

/**
 * What kind of body this is, as one string, in one vocabulary.
 *
 * There are two vocabularies in the engine and they disagree about exactly one
 * class. `obj_type` reads 'Planet', 'GasGiant', 'Asteroid', 'Comet' - and
 * 'StarObject', because the star class is named StarObject and passes its own
 * name through. The interface's selection, meanwhile, calls that same body a
 * 'Star': js/physics.js findObjectAtPosition returns `type: 'Star'`, and
 * js/render.js tests for it by that name.
 *
 * A lesson author writing `{kind: 'Star'}` means the thing the interface calls
 * a star, so the trailing 'Object' is dropped here rather than left for
 * everyone who writes a matcher to remember. One inconsistency, normalised in
 * one place, and it is a normalisation rather than a guess: nothing is
 * inferred from a name, and 'StarObject' and 'Star' are the same class.
 *
 * @param {?object} body - A body
 * @returns {?string} A type name
 */
export function kindOf(body) {
  if (!body) return null;
  const raw = body.obj_type || body.constructor?.name || null;
  if (!raw) return null;
  return raw.endsWith('Object') && raw.length > 6 ? raw.slice(0, -6) : raw;
}

/**
 * Every body that answers to a matcher, in list order.
 *
 * The rules, in the order they are applied, and all of them exact:
 *
 *   - `id` selects by identity and ignores everything else. This is what a
 *     re-resolve after a rebuild uses when the caller genuinely knows the id.
 *   - `kind` must equal the body's type exactly. 'Star' does not match
 *     'NeutronStar', which a substring match would have.
 *   - `name` must equal the body's name exactly, after trimming and case
 *     folding. Not a substring: `ctx.find('Eccentric')` matching an "Eccentric
 *     Comet" is the accident this replaces.
 *   - `index` is applied last, to whatever the above left, and is the only way
 *     to say "the second planet" - which a lesson should only do when the
 *     scenario's order is part of what it is teaching.
 *
 * Returning every match rather than the first is the point: the caller has to
 * decide what an ambiguous matcher means, and `resolveMatcher` refuses.
 *
 * @param {Array} bodies - Candidates, in a stable order
 * @param {object} matcher - {id, kind, name, index}
 * @returns {Array} Everything that matches
 */
export function candidatesFor(bodies, matcher = {}) {
  const list = Array.isArray(bodies) ? bodies : [];
  const wantName =
    matcher.name === undefined || matcher.name === null
      ? null
      : String(matcher.name).trim().toLowerCase();
  let out = list.filter(b => {
    if (!b || b.alive === false) return false;
    if (Number.isFinite(matcher.id) && b.id !== matcher.id) return false;
    if (matcher.kind && kindOf(b) !== matcher.kind) return false;
    if (wantName !== null) {
      const has = String(b.name ?? '')
        .trim()
        .toLowerCase();
      if (has !== wantName) return false;
    }
    return true;
  });
  if (Number.isFinite(matcher.index)) {
    out = out[matcher.index] ? [out[matcher.index]] : [];
  }
  return out;
}

/**
 * The one body a matcher means, or a reason there is not one.
 *
 * Never guesses. A matcher that finds nothing and a matcher that finds four
 * are both failures, and they are different failures: the first is usually a
 * lesson naming something the scenario does not build, and the second is
 * usually a lesson being less specific than it thinks it is. Both need the
 * author to know, so both come back with a message rather than a body.
 *
 * @param {Array} bodies - Candidates
 * @param {object} matcher - See candidatesFor
 * @returns {{body: ?object, reason: ?string, found: number}} The outcome
 */
export function resolveMatcher(bodies, matcher = {}) {
  const found = candidatesFor(bodies, matcher);
  if (found.length === 1) return { body: found[0], reason: null, found: 1 };
  const asked = describeMatcher(matcher);
  if (found.length === 0) {
    return {
      body: null,
      found: 0,
      reason: `nothing in this world matches ${asked}`,
    };
  }
  return {
    body: null,
    found: found.length,
    reason:
      `${found.length} bodies match ${asked} ` +
      `(${found
        .slice(0, 4)
        .map(b => `${kindOf(b)} "${b.name}" #${b.id}`)
        .join(', ')}${found.length > 4 ? ', …' : ''}). ` +
      'A lesson role has to name exactly one; add a kind, or an index if the ' +
      'order is part of what is being taught.',
  };
}

/** A matcher, in words, for a message. */
export function describeMatcher(matcher = {}) {
  const parts = [];
  if (Number.isFinite(matcher.id)) parts.push(`id ${matcher.id}`);
  if (matcher.kind) parts.push(`kind ${matcher.kind}`);
  if (matcher.name !== undefined && matcher.name !== null) {
    parts.push(`name "${matcher.name}"`);
  }
  if (Number.isFinite(matcher.index)) parts.push(`index ${matcher.index}`);
  return parts.length ? parts.join(' + ') : 'an empty matcher';
}

// -----------------------------------------------------------------------------
// The roster: every role a lesson has bound, and who owns each
// -----------------------------------------------------------------------------

/**
 * A fresh, empty roster.
 *
 * @returns {object} A roster
 */
export const createRoster = () => ({
  roles: new Map(),
  /** Why a role is not bound, keyed by role. Kept for the author to read. */
  problems: new Map(),
});

/**
 * Record that a role means this body, in this world.
 *
 * @param {object} roster - From createRoster
 * @param {string} role - The lesson's name for it
 * @param {object} body - The body
 * @param {number} generation - The world generation now
 * @param {string} [owner] - One of OWNER
 * @returns {object} The binding recorded
 */
export function bindRole(roster, role, body, generation, owner = OWNER.ENGINE) {
  const binding = makeBinding({
    role,
    id: body.id,
    generation,
    kind: kindOf(body),
    name: body.name ?? null,
    owner,
  });
  roster.roles.set(String(role), binding);
  roster.problems.delete(String(role));
  return binding;
}

/**
 * Record that a role could not be bound, and why.
 *
 * A role with a problem is not a role with no binding: the difference is that
 * somebody tried, and the reason is what an author needs to see.
 *
 * @param {object} roster - From createRoster
 * @param {string} role - The lesson's name for it
 * @param {string} reason - What went wrong
 * @returns {void}
 */
export function noteProblem(roster, role, reason) {
  roster.roles.delete(String(role));
  roster.problems.set(String(role), String(reason));
}

/** The binding for a role, or null. */
export const bindingFor = (roster, role) =>
  roster.roles.get(String(role)) || null;

/** Which role, if any, names this body. */
export function roleOfBody(roster, body, generation) {
  if (!body) return null;
  for (const [role, binding] of roster.roles) {
    if (bindingMatches(binding, body, generation)) return role;
  }
  return null;
}

/** Every role whose binding was made in an older world. */
export function staleRoles(roster, generation) {
  const out = [];
  for (const [role, binding] of roster.roles) {
    if (binding.generation !== generation) out.push(role);
  }
  return out;
}

/** Drop every binding. Used when a lesson closes. */
export function clearRoster(roster) {
  roster.roles.clear();
  roster.problems.clear();
}

/** Which roles a prescribed model owns. */
export function modelOwnedRoles(roster) {
  const out = [];
  for (const [role, binding] of roster.roles) {
    if (binding.owner === OWNER.MODEL) out.push(role);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Scopes: what a lesson borrowed, and giving it back
// -----------------------------------------------------------------------------

/**
 * A place to record what was true before a lesson changed it.
 *
 * Deliberately a bag of key-value pairs rather than a fixed set of fields:
 * what has to be put back differs by activity - a camera here, an overlay
 * there, the transport, the audio - and a fixed list would be a list that is
 * wrong for the next activity. What is fixed is the discipline: a value is
 * saved once, on entry, and the second save of the same key is ignored so that
 * a step change inside a scope cannot overwrite the original with a value the
 * lesson itself set.
 *
 * @param {string} name - What the scope is for, for messages
 * @returns {object} A scope
 */
export const createScope = name => ({
  name: String(name),
  entered: false,
  saved: new Map(),
});

/**
 * Enter a scope, saving what it is about to change.
 *
 * Idempotent: entering a scope that is already entered saves nothing more, so
 * a step change that re-enters cannot clobber the values from the first entry.
 * That is what makes "a normal step change preserves the experiment" true
 * rather than hopeful.
 *
 * @param {object} scope - From createScope
 * @param {object} values - What to remember, as key: value
 * @returns {boolean} True if this call is the one that entered
 */
export function enterScope(scope, values = {}) {
  const first = !scope.entered;
  scope.entered = true;
  for (const [key, value] of Object.entries(values)) {
    if (!scope.saved.has(key)) scope.saved.set(key, value);
  }
  return first;
}

/**
 * What was saved for one key, or a fallback.
 *
 * @param {object} scope - A scope
 * @param {string} key - What to read
 * @param {*} [fallback] - If nothing was saved
 * @returns {*} The saved value
 */
export const savedValue = (scope, key, fallback = undefined) =>
  scope.saved.has(key) ? scope.saved.get(key) : fallback;

/**
 * Leave a scope, handing back everything it saved.
 *
 * Returns the pairs rather than applying them, because applying them means
 * touching the camera, the transport and the overlays, and this module does
 * not know how to do any of that and should not. Leaving twice returns nothing
 * the second time.
 *
 * @param {object} scope - A scope
 * @returns {Array<[string, *]>} What to put back, in the order it was saved
 */
export function leaveScope(scope) {
  if (!scope.entered) return [];
  const out = [...scope.saved.entries()];
  scope.entered = false;
  scope.saved.clear();
  return out;
}

/**
 * Forget a scope without restoring it.
 *
 * For the case where the thing that was saved no longer exists to be put back:
 * a camera belonging to a world that has been torn down, a selection of a body
 * that has merged. Putting those back is worse than not.
 *
 * @param {object} scope - A scope
 * @returns {void}
 */
export function abandonScope(scope) {
  scope.entered = false;
  scope.saved.clear();
}
