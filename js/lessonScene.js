// =============================================================================
// The seam between a lesson and the scene it is about
// -----------------------------------------------------------------------------
// A lesson step that measures something has four surfaces that all have to be
// talking about the same object: the canvas the student clicks, the object list
// they can reach from the keyboard, the inspector card, and whatever instrument
// the step docks beside the text. Until now they had no way to agree. A step
// said "click the Eccentric Orbiter" in prose, and the one place code said it -
// `ctx.find(name)` - was a case-insensitive substring search that returned
// whichever body came first and never mentioned that there had been two.
//
// This module is where a lesson says which object it means, once, and every
// surface reads the same answer. js/lesson/binding.js holds the identity rules,
// which are pure and testable in plain Node; this half knows where the bodies
// are, which world it is, how selection works and how to hand a body to a
// prescribed model. Lesson content never imports either: it reaches both
// through the `ctx` js/investigations.js builds.
//
// The four things it is responsible for
// -----------------------------------------------------------------------------
//   Bindings.   A role name to one body, checked against the world generation
//               as well as the id, because ids restart at zero on every
//               rebuild and a lesson `setup` always rebuilds. A binding that
//               cannot be resolved says so; nothing here guesses.
//
//   Ownership.  Which bodies a prescribed model drives rather than the
//               integrator. Setting PhysicsObject.model_owned is a one-line
//               job; releasing it reliably is the reason this is a module and
//               not a line at a call site.
//
//   Scope.      What the lesson borrowed - the selection, the transport, the
//               camera - and putting it back. Entering twice saves once, so a
//               step change inside an activity cannot overwrite the values
//               that were true before it started.
//
//   Evidence.   One immutable record of what was on screen when a measurement
//               was taken: which body, which model, which clock, which world.
//               Handed to the notebook, which owns the storage.
//
// What it deliberately does not do
// -----------------------------------------------------------------------------
// It does not re-resolve a stale binding by name. After a rebuild the name is
// exactly the thing that is not trustworthy - two runs of one scenario name
// their stars from the same pool - so a stale binding is reported and the
// caller re-runs the matcher against the new world, which is a different act
// with a different failure mode.
// =============================================================================

import {
  BINDING,
  OWNER,
  bindRole,
  bindingAge,
  bindingFor,
  bindingMatches,
  clearRoster,
  createRoster,
  createScope,
  enterScope,
  kindOf,
  leaveScope,
  modelOwnedRoles,
  noteProblem,
  resolveMatcher,
  roleOfBody,
  savedValue,
  staleRoles,
} from './lesson/binding.js';
import {
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  getWorldGeneration,
  getSimulationTime,
} from './physics.js';
import { state } from './appState.js';
import { selectBodyInScene, setBodySelector } from './widgetRuntime.js';

export { BINDING, OWNER };

/**
 * Every body in the world, in one order and always the same one.
 *
 * The order matters because a matcher may carry an index, and an index into a
 * list that reorders itself is not a binding. This is the same concatenation
 * js/investigations.js already uses for its probe context, kept here so there
 * is one definition of "every body" for the two of them to share.
 *
 * @returns {Array} Every live body
 */
export const allBodies = () => [
  ...bh_list,
  ...stars,
  ...planets,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
];

// One roster per page, because there is one lesson panel per page. Cleared on
// close rather than replaced, so a stale reference cannot outlive it.
const roster = createRoster();
const scope = createScope('lesson');
// Which bodies this module set model_owned on, by id, in which world. Kept so
// that release can find them again even after the roster has moved on.
let owned = [];

/**
 * Bind a lesson's roles to bodies in the world that is on screen now.
 *
 * Called after a setup has been applied, because a setup rebuilds the world
 * and every id in it. Each role is resolved independently and a role that
 * cannot be resolved does not stop the others: a lesson with one bad matcher
 * should still run, with one loud problem, rather than not run at all.
 *
 * @param {Object<string, object>} roles - Role name to matcher, see
 *   js/lesson/binding.js resolveMatcher for the matcher's shape
 * @param {object} [opts] - Options
 * @param {Array<string>} [opts.modelOwned] - Roles a prescribed model drives
 * @returns {{bound: Array<string>, problems: Object<string, string>}} What
 *   happened, for an author to read and for a test to assert on
 */
export function bindRoles(roles = {}, opts = {}) {
  const generation = getWorldGeneration();
  const bodies = allBodies();
  const wantModel = new Set(opts.modelOwned || []);
  releaseModelOwnership();
  clearRoster(roster);

  const bound = [];
  const problems = {};
  for (const [role, matcher] of Object.entries(roles)) {
    const { body, reason } = resolveMatcher(bodies, matcher);
    if (!body) {
      noteProblem(roster, role, reason);
      problems[role] = reason;
      continue;
    }
    const owner = wantModel.has(role) ? OWNER.MODEL : OWNER.ENGINE;
    bindRole(roster, role, body, generation, owner);
    if (owner === OWNER.MODEL) takeModelOwnership(body, generation);
    bound.push(role);
  }
  return { bound, problems };
}

/**
 * The body a role means, or null with a reason.
 *
 * The reason is the point. Three different nulls come out of here and a caller
 * that treats them the same will mislead somebody: a role nobody bound, a role
 * bound in a world that has since been rebuilt, and a role whose body has gone
 * - merged into something else, or consumed.
 *
 * @param {string} role - The lesson's name for it
 * @returns {{body: ?object, status: string, binding: ?object}} The outcome
 */
export function resolveRole(role) {
  const binding = bindingFor(roster, role);
  const generation = getWorldGeneration();
  const age = bindingAge(binding, generation);
  if (age !== BINDING.BOUND) return { body: null, status: age, binding };
  const body = allBodies().find(b => bindingMatches(binding, b, generation));
  return {
    body: body || null,
    status: body ? BINDING.BOUND : BINDING.GONE,
    binding,
  };
}

/** The body a role means, or null. The short form, for a probe. @returns {?object} */
export const roleBody = role => resolveRole(role).body;

/** Which role names this body, if any. @returns {?string} */
export const roleOf = body => roleOfBody(roster, body, getWorldGeneration());

/** Roles bound in an older world, which need re-binding. @returns {Array<string>} */
export const rolesNeedingRebind = () =>
  staleRoles(roster, getWorldGeneration());

/** Why a role could not be bound, if it could not. @returns {?string} */
export const roleProblem = role => roster.problems.get(String(role)) || null;

/** Every role currently bound, in binding order. @returns {Array<string>} */
export const boundRoles = () => [...roster.roles.keys()];

// -----------------------------------------------------------------------------
// Ownership of the state a prescribed model drives
// -----------------------------------------------------------------------------

/**
 * Hand a body's motion to a prescribed model.
 *
 * @param {object} body - The body
 * @param {number} generation - The world it belongs to
 * @returns {void}
 */
function takeModelOwnership(body, generation) {
  body.model_owned = true;
  owned.push({ id: body.id, generation });
}

/**
 * Give every model-owned body back to the integrator.
 *
 * Idempotent, and safe across a rebuild: a body from a previous world is not
 * in the lists any more, so there is nothing to clear and nothing to get
 * wrong. Called on rebinding and on leaving, which between them cover every
 * way an activity ends - including the one where the tab was closed on it and
 * the next visit rebuilds from a saved state.
 *
 * @returns {void}
 */
export function releaseModelOwnership() {
  if (!owned.length) return;
  const generation = getWorldGeneration();
  const byId = new Map(allBodies().map(b => [b.id, b]));
  for (const record of owned) {
    if (record.generation !== generation) continue;
    const body = byId.get(record.id);
    if (body) body.model_owned = false;
  }
  owned = [];
}

/** Whether a prescribed model is driving anything right now. @returns {boolean} */
export const hasModelOwnedBodies = () => owned.length > 0;

/** Which roles a prescribed model drives. @returns {Array<string>} */
export const prescribedRoles = () => modelOwnedRoles(roster);

/**
 * What to tell the reader about who is computing what.
 *
 * Short enough for a line under an instrument, and it never says "simulated"
 * about something a model prescribed. An activity that mixes the two says so,
 * because that is the case a reader is most likely to get wrong.
 *
 * @param {?string} [modelName] - What the prescribed model is, if any
 * @returns {{mode: string, model: ?string, roles: Array<string>}} A description
 */
export function modeDescription(modelName = null) {
  const prescribed = prescribedRoles();
  if (!prescribed.length) return { mode: 'nbody', model: null, roles: [] };
  const everything = prescribed.length === boundRoles().length;
  return {
    mode: everything ? 'model' : 'mixed',
    model: modelName,
    roles: prescribed,
  };
}

// -----------------------------------------------------------------------------
// Selection: one object, four surfaces
// -----------------------------------------------------------------------------

// Selection is js/ui.js's to perform - it opens the inspector in the same call
// - and js/ui.js is the coordinator, which this module must not import. The
// port lives in js/widgetRuntime.js, which is a zero-import leaf both sides can
// reach and which is in the initial download already; putting it there rather
// than having js/ui.js import this module keeps the bindings, the roster and
// the scope out of a first page load for readers who never open a lesson.
export { setBodySelector as setSelector } from './widgetRuntime.js';

/** Whichever body is selected, or null. @returns {?object} */
export const selectedBody = () => state.selectedObject?.object || null;

/**
 * Select the body a role names, as though the reader had clicked it.
 *
 * Returns false rather than throwing when the role is not bound: a keyboard
 * shortcut or a plot click that lands on a role whose body has merged should
 * do nothing quietly, not break the frame.
 *
 * @param {string} role - The lesson's name for it
 * @returns {boolean} True if something was selected
 */
export function selectRole(role) {
  const { body } = resolveRole(role);
  return selectBody(body);
}

/**
 * Select a body, whatever names it.
 *
 * @param {?object} body - The body
 * @returns {boolean} True if something was selected
 */
export function selectBody(body) {
  if (!body) return false;
  return selectBodyInScene(body, kindOf(body));
}

/**
 * Every body a reader could select, described for a list.
 *
 * The accessible half of "click the star": a list a keyboard can walk, naming
 * the same objects the canvas hit-testing would, in the same order the matcher
 * indices count in, with the lesson's own word for each where it has one.
 *
 * @returns {Array<{id: number, name: string, kind: string, role: ?string,
 *   selected: boolean}>} One entry per body
 */
export function selectableBodies() {
  const generation = getWorldGeneration();
  const chosen = selectedBody();
  return allBodies().map(body => ({
    id: body.id,
    name: String(body.name ?? kindOf(body) ?? 'Body'),
    kind: kindOf(body),
    role: roleOfBody(roster, body, generation),
    selected: body === chosen,
  }));
}

// -----------------------------------------------------------------------------
// Scope: what the lesson borrowed
// -----------------------------------------------------------------------------

/**
 * Enter the lesson's scope, remembering what it is about to change.
 *
 * Idempotent by design. A lesson enters on its first step and every step after
 * that; only the first call records anything, so what comes back on the way
 * out is what was true before the lesson started rather than what the lesson
 * itself set two steps ago.
 *
 * @param {object} values - Key to value, whatever the caller has to put back
 * @returns {boolean} True on the call that actually entered
 */
export const enterLessonScope = values => enterScope(scope, values);

/** What was saved under a key on entry. @returns {*} */
export const savedOnEntry = (key, fallback) => savedValue(scope, key, fallback);

/**
 * Leave the lesson's scope.
 *
 * Releases model ownership first, because a body still flagged when the
 * integrator resumes is a body that never moves again, and hands back
 * everything that was saved. The caller applies it: what "put the camera back"
 * means is js/ui.js's business, not this module's.
 *
 * @returns {Array<[string, *]>} The saved pairs, in the order they were saved
 */
export function leaveLessonScope() {
  releaseModelOwnership();
  clearRoster(roster);
  return leaveScope(scope);
}

/** Whether a lesson scope is open. @returns {boolean} */
export const inLessonScope = () => scope.entered;

// -----------------------------------------------------------------------------
// Evidence
// -----------------------------------------------------------------------------

/**
 * An immutable record of what was on screen when a reading was taken.
 *
 * Everything a later reader needs to decide whether two measurements can be
 * compared: which object, in which world, on which clock, under which model,
 * and at what scale. The world generation is in there for the same reason
 * js/observingSession.js puts it in a recording - without it, a reading of one
 * star and a reading of its replacement look identical.
 *
 * Frozen, and frozen deeply enough to matter: the caller gets a snapshot, not
 * a view of state that is about to move.
 *
 * @param {object} spec - What to record
 * @param {string} [spec.role] - The lesson's name for the object
 * @param {?object} [spec.body] - The body, if there is one
 * @param {?string} [spec.model] - The prescribed model, where one owns the state
 * @param {object} [spec.parameters] - The model's parameters at the moment
 * @param {object} [spec.measurement] - What was read
 * @param {?string} [spec.scaleMode] - Which scaling the reading was taken under
 * @returns {object} A frozen snapshot
 */
export function evidenceSnapshot({
  role = null,
  body = null,
  model = null,
  parameters = {},
  measurement = {},
  scaleMode = null,
} = {}) {
  const binding = role ? bindingFor(roster, role) : null;
  return Object.freeze({
    role,
    object: body
      ? Object.freeze({
          id: body.id,
          name: String(body.name ?? ''),
          kind: kindOf(body),
        })
      : null,
    binding: binding
      ? Object.freeze({ id: binding.id, generation: binding.generation })
      : null,
    owner: binding?.owner || (model ? OWNER.MODEL : OWNER.ENGINE),
    model,
    parameters: Object.freeze({ ...parameters }),
    measurement: Object.freeze({ ...measurement }),
    scaleMode,
    worldGeneration: getWorldGeneration(),
    // Two clocks, because they are not the same and a reading taken under a
    // prescribed model belongs to the model's, not the sandbox's.
    simulationTime: getSimulationTime(),
  });
}

/** Drop everything. Tests only: a page has one lesson panel. */
export function resetLessonSceneForTests() {
  releaseModelOwnership();
  clearRoster(roster);
  leaveScope(scope);
  owned = [];
  setBodySelector(null);
}
