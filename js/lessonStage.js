// =============================================================================
// The main canvas as a comparison workspace
// -----------------------------------------------------------------------------
// A lesson step that says "these three stars" now puts those three stars on
// the canvas, where they can be clicked, inspected, plotted and measured, in
// the same places every time. This is the half that knows about the stellar
// model and the body classes; js/lesson/stage.js is the arithmetic, and it is
// pure.
//
// What a stage is, and is not
// -----------------------------------------------------------------------------
// It is a display. The stars stand still, they are not orbiting one another,
// and nothing about their arrangement is a claim: a row of eight stars spaced
// ninety units apart is a shelf, not a cluster. Saying so matters, because the
// application's whole premise is that what is on the canvas is being
// integrated - so a lesson that borrows the canvas for a display has to be
// explicit that this bit is not.
//
// The mechanism that makes it honest is the one from js/lessonScene.js: every
// staged star is handed to the stellar model, which owns its state, and the
// integrator is told to leave it alone. It still has mass and still pulls on
// anything else in the scene; it is simply not pushed back, and no force is
// computed for it at all, so a hundred display stars cost a hundred sources
// and no targets rather than ten thousand pair terms a frame.
//
// Determinism
// -----------------------------------------------------------------------------
// Every position, every property and every subsample is arithmetic over the
// step's own declaration and a named seed. Nothing here draws from the global
// generator - which js/rng.js patches while a world is being built, so a stage
// that consumed from it would move the bodies a seed produces. The population
// steps take a bounded, evenly-strided subsample of the seeded population, and
// the readout says how many of how many are on screen, because a subsample
// presented as a population is a lie about what a survey sees.
// =============================================================================

import { SCALE, displayRadius, fitCamera, rowLayout } from './lesson/stage.js';
import {
  Asteroid,
  BlackHole,
  accretion_disk_particles,
  getPhysicsSetting,
  EARTH_MASS_UNIT,
  Planet,
  NeutronStar,
  SOLAR_MASS_UNIT,
  StarObject,
  WhiteDwarf,
  asteroids,
  bh_list,
  bumpWorldGeneration,
  comets,
  gas_giants,
  gravity_ripples,
  neutron_stars,
  planets,
  resetPhysicsObjectCounter,
  stars,
  white_dwarfs,
} from './physics.js';
import { bindRoles, releaseModelOwnership, selectBody } from './lessonScene.js';
import { barycenterOf, circularBinary } from './lesson/barycenter.js';
import { trackBounds, trackIds } from './stellar/tracks.js';
import { populationOf, resolveStarSpec } from './stellarLab.js';
import { brightSubset } from './stellar/population.js';
import { applySelection } from './lesson/starState.js';
import { state } from './appState.js';

export { SCALE };

/**
 * What the model says a staged star is.
 *
 * Three ways for a step to name one, in the order a lesson tends to mean them:
 * a track and an age, which is a modeled star with a mass and a history; a
 * temperature and a luminosity, which is a *hypothetical* point with a radius
 * and nothing else; or a track alone, which is the middle of its main
 * sequence. Nothing is invented: a hypothetical star comes back with no mass
 * and no age, and stays that way all the way to the inspector.
 *
 * @param {object} spec - One entry from a stage's `stars`
 * @returns {?object} A selection, in the shape js/stellarLab.js produces
 */
/**
 * A lesson's star declaration, resolved.
 *
 * The arithmetic is js/stellarLab.js's `resolveStarSpec`, which is also what
 * the comparison stage seeds its pins from - so a star standing on the canvas
 * and the same star plotted on the H-R diagram are one resolution, not two
 * that have to be kept in step by hand. They were not in step: see the note
 * on `resolveStarSpec`.
 *
 * @param {object} spec - A star declaration from a lesson
 * @returns {?object} The resolved star
 */
function resolveStar(spec) {
  return resolveStarSpec(spec);
}

/** Everything the current stage put on the canvas, in declaration order. */
let staged = [];
let stagedKey = '';
let stagedScale = SCALE.DISPLAY;
/** What the last population stage put up, for the readout to quote. */
let lastPopulation = null;
/** The stage declaration in force, so it can be put back if it is wiped. */
let lastDeclaration = null;
/** The star-pair declaration in force, so a mass change can restate it. */
let lastStarPair = null;
/** The wave-source declaration in force, so a mode change can restate it. */
let lastSource = null;
/** The binary declaration in force, so a preset change can restate it. */
let lastBinary = null;
/** The hole declaration in force, so a mass change can restate it. */
let lastHole = null;
/** Labeled "then" copies a reader has pinned, in the order they took them. */
let snapshots = [];
/**
 * A fit that has been asked for and not yet performed.
 *
 * A stage is built during a step change, before the lesson panel and the
 * instrument have been laid out - and on the first step of all, before the
 * application has finished setting up its own camera, which then overwrites
 * whatever the fit did. So the request is recorded here and taken by whoever
 * is in a position to honor it: js/investigations.js calls takeFit() from the
 * panel's own tick, which runs after layout and after the boot has settled.
 */
let pendingFit = false;

/** What is on the stage now. @returns {Array} */
export const stagedStars = () => staged.slice();

/**
 * Whether the stage is still standing.
 *
 * It can stop being: the application rebuilds its own world on a cold load,
 * and that happens *after* a lesson opened from a link has staged its scene -
 * so the staged stars are cleared out from under it and replaced by whatever
 * scenario was current, and the reader is left looking at a randomly named
 * star the step knows nothing about. The panel's tick checks this and puts the
 * stage back, which is cheap because it only rebuilds when the answer is no.
 *
 * @returns {boolean} True when every staged star is still in the world
 */
export function stageIntact() {
  if (!staged.length) return true;
  // Every collection, from the shared inventory. Checking a subset is how this
  // went wrong twice: first `stars` alone, which made every binary stage
  // report itself missing, then `stars` plus the compact-object lists, which
  // did the same for the hole, equal-mass and system stages because their
  // orbiters and planets live in `asteroids` and `planets`. A subset here is
  // not a smaller check, it is a world rebuilt on every panel tick.
  const present = new Set(bodyCollections().flat());
  return staged.every(entry => present.has(entry.star));
}

/**
 * How much of the stage is still there.
 *
 * `stageIntact` answers a yes/no, and the panel needs one more distinction
 * before it decides to rebuild: a scene that has been replaced wholesale -
 * a scenario loaded, a world rebuilt under the lesson - is not the same event
 * as a reader deleting one body or firing one into a star. The first is
 * something to put back; the second is the reader experimenting, and undoing
 * it would be the application overruling them.
 *
 * @returns {{present: number, total: number, allGone: boolean}} What survived
 */
export function stagePresence() {
  const present = new Set(bodyCollections().flat());
  const alive = staged.filter(entry => present.has(entry.star)).length;
  return {
    present: alive,
    total: staged.length,
    // Nothing left at all is the signature of a replacement: a reader removing
    // bodies one at a time passes through states where some are still there,
    // and this only fires at the end of that. It is the conservative reading -
    // it never puts back a scene the reader was halfway through changing.
    allGone: staged.length > 0 && alive === 0,
  };
}

/** The declaration the stage was built from, for a rebuild. @returns {?object} */
/**
 * A cheap signature of what is on the stage.
 *
 * Changes exactly when the stage is rebuilt, so an instrument reading the
 * staged sample can memoise against it instead of re-deriving its own copy on
 * every probe tick.
 *
 * @returns {string} The current stage key
 */
export const stageKey = () => stagedKey;

export const stagedDeclaration = () => lastDeclaration;

/** Which scale the stage is drawn at. @returns {string} */
export const stageScale = () => stagedScale;

/**
 * Every body collection a stage can put something into.
 *
 * One list, because three separate functions used to keep their own and each
 * one was wrong in a different way. `stageIntact` looked only in `stars`, so a
 * hole stage with four asteroid orbiters reported itself gone the instant it
 * was built and the panel rebuilt the world four times a second forever;
 * `clearStage` also looked only in `stars`, so closing a lesson left the
 * orbiters, the planets and the remnants on the canvas; and `becomeRemnant`
 * spliced the old body out of `stars` alone, so a white dwarf that had been a
 * planet left a duplicate behind.
 *
 * A function returning the arrays rather than an array of arrays, because
 * js/physics.js reassigns these on a world rebuild and a captured reference
 * would describe a world that is gone.
 *
 * @returns {Array<Array<object>>} The live collections
 */
const bodyCollections = () => [
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  bh_list,
  neutron_stars,
  white_dwarfs,
];

/**
 * Take a body out of whichever collection holds it.
 *
 * @param {object} body - The body to remove
 * @returns {boolean} Whether it was found
 */
function removeBody(body) {
  for (const list of bodyCollections()) {
    const i = list.indexOf(body);
    if (i !== -1) {
      list.splice(i, 1);
      return true;
    }
  }
  return false;
}

/** Forget the stage. Tests only. */
export function resetStageForTests() {
  staged = [];
  stagedKey = '';
  stagedScale = SCALE.DISPLAY;
  lastPopulation = null;
  lastDeclaration = null;
  lastStarPair = null;
  lastHole = null;
  snapshots = [];
  requestFit(false);
  fitAttempts = 0;
  fitApplied = null;
}

/** How much of the population is on the canvas, and of how many. @returns {?object} */
export const stagedPopulation = () => lastPopulation;

/**
 * Put a step's stars on the canvas.
 *
 * Rebuilt only when the declaration changes, so moving between two steps that
 * show the same shelf keeps the same bodies with the same ids - which is what
 * lets a measurement taken on one step still refer to the same object on the
 * next. Changing the scale does not rebuild: it resizes.
 *
 * @param {object} stage - The step's `stage` declaration
 * @param {object} [opts] - Options
 * @param {boolean} [opts.force] - Rebuild even if the declaration is unchanged
 * @returns {{built: boolean, roles: Array<string>, problems: object}} What happened
 */
export function applyStage(stage, { force = false } = {}) {
  // Two stars the engine really integrates. Distinct from `binary` below, and
  // the distinction is the scientific one: there, a prescribed inspiral model
  // owns the positions and the integrator must not touch them; here the orbit
  // *is* the physics being taught, so the bodies are ordinary and the engine
  // moves them. Confusing the two would either freeze a lesson about orbits or
  // let the integrator overwrite a lesson about a model.
  // One black hole, with test bodies in orbit around it. Engine-owned like the
  // star pair: what the orbiters do is Newtonian gravity, which the integrator
  // computes correctly and the lesson measures. Not "outside the horizon" -
  // the canvas has no horizon, only a drawn disc. See applyHoleStage.
  if (stage?.hole) {
    const key = JSON.stringify(['hole', stage.hole]);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(x => x.role), problems: {} };
    }
    const out = applyHoleStage(stage.hole);
    stagedKey = key;
    lastHole = stage.hole;
    return { built: true, roles: out.roles, problems: {} };
  }
  // A star and a black hole of the same mass, each with a body in the same
  // orbit. The controlled comparison the lesson needs to make its point about
  // what changes outside a black hole, which is nothing.
  if (stage?.equalMass) {
    const key = JSON.stringify(['equalMass', stage.equalMass]);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(x => x.role), problems: {} };
    }
    const out = applyEqualMassStage(stage.equalMass);
    stagedKey = key;
    return { built: true, roles: out.roles, problems: {} };
  }
  // A star with planets on declared orbits, eccentricity included. The two
  // habitable-zone scenarios are deliberately circular - circles keep the
  // insolation measurement clean - so a lesson that wants a planet whose
  // distance changes round its year has to stand one up itself rather than
  // pretend one of those is elliptical.
  if (stage?.system) {
    const key = JSON.stringify(['system', stage.system]);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(x => x.role), problems: {} };
    }
    const out = applySystemStage(stage.system);
    stagedKey = key;
    return { built: true, roles: out.roles, problems: {} };
  }
  // A gravitational-wave source the reader can change the kind of. Three
  // alternatives on one declaration - a static mass, a spherically pulsing
  // one, and a binary - because the beginner lesson's argument is that only
  // the third radiates and it cannot make that argument by asking a reader to
  // imagine the other two while a binary sits on the canvas.
  if (stage?.gwSource) {
    const key = JSON.stringify(['gwSource', stage.gwSource]);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(x => x.role), problems: {} };
    }
    lastSource = stage.gwSource;
    const out = applySourceStage(stage.gwSource);
    stagedKey = key;
    return { built: true, roles: out.roles, problems: {} };
  }
  if (stage?.starPair) {
    const key = JSON.stringify(['starPair', stage.starPair]);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(x => x.role), problems: {} };
    }
    const out = applyStarPairStage(stage.starPair);
    stagedKey = key;
    return { built: true, roles: out.roles, problems: {} };
  }
  // A population stage names no stars: it names a seeded population and how
  // much of it to stand on the canvas.
  if (stage?.binary) {
    const key = JSON.stringify(['binary', stage.binary]);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(x => x.role), problems: {} };
    }
    const out = applyBinaryStage(stage.binary);
    stagedKey = key;
    return { built: true, roles: out.roles, problems: {} };
  }
  if (stage?.population) {
    const key = JSON.stringify(stage.population);
    if (!force && key === stagedKey) {
      return { built: false, roles: staged.map(s => s.role), problems: {} };
    }
    const out = applyPopulationStage(stage.population);
    stagedKey = key;
    lastDeclaration = stage;
    lastPopulation = {
      ...out,
      shownIds: stagedStars().map(e => e.spec?.populationId ?? null),
    };
    requestFit(stage.fit);
    fitAttempts = 0;
    fitApplied = null;
    return { built: true, roles: [], problems: {}, population: out };
  }
  if (!stage?.stars?.length) {
    clearStage();
    return { built: false, roles: [], problems: {} };
  }
  const key = JSON.stringify([stage.stars, stage.spacing, stage.perRow]);
  const scale = stage.scale === SCALE.TRUE ? SCALE.TRUE : SCALE.DISPLAY;
  if (!force && key === stagedKey) {
    if (scale !== stagedScale) setStageScale(scale);
    return { built: false, roles: staged.map(s => s.role), problems: {} };
  }

  clearWorld();
  stagedKey = key;
  stagedScale = scale;
  lastDeclaration = stage;

  const resolved = stage.stars.map(spec => ({
    spec,
    model: resolveStar(spec),
  }));
  const places = rowLayout(resolved.length, {
    spacing: stage.spacing ?? 90,
    perRow: stage.perRow ?? 0,
  });

  const problems = {};
  resolved.forEach(({ spec, model }, i) => {
    if (!model) {
      problems[spec.role] = `no model answers to ${JSON.stringify(spec)}`;
      return;
    }
    // Two masses, and they are not the same claim. `massSun` is what the body
    // has to weigh for the engine to have something to integrate; a
    // hypothetical point supplies none, so it falls back to a solar mass and
    // nothing is asserted by that. `massInSuns` is what the interface REPORTS
    // - the inspector, the object list, the comparison card, a capture - and
    // for a hypothetical point the answer is that nobody knows.
    //
    // Writing the fallback into the reported one is how a star the reader
    // placed on the diagram at twenty-five thousand kelvin and a hundredth of
    // a solar luminosity came to have a mass of exactly one solar mass in its
    // card, on the screen whose whole subject is that a position on the
    // diagram does not fix a mass.
    const massSun = Number.isFinite(model.massSun) ? model.massSun : 1;
    const star = new StarObject(places[i], { x: 0, y: 0 }, massSun);
    star.name = spec.name || spec.role;
    // The model owns its state, so it is written rather than estimated - and
    // a hypothetical point writes no mass and no age. See js/lesson/starState.
    applySelection(star, model);
    star.initialMassInSuns = Number.isFinite(model.initialMassSun)
      ? model.initialMassSun
      : null;
    star.mass = massSun * SOLAR_MASS_UNIT;
    if (Number.isFinite(model.massSun)) star.massInSuns = model.massSun;
    // Presentation only: see setStageScale. The engine radius stays whatever
    // StarObject computed from the mass, so a comparison shelf cannot change
    // what its stars would do to each other.
    star.stageRadius = displayRadius(model.radiusSun, scale);
    star.persistent = true;
    // A step that asks a reader to judge by eye gets no captions.
    star.anonymous = Boolean(stage.anonymous);
    stars.push(star);
    staged.push({
      role: spec.role,
      star,
      model,
      spec,
      physicalRadiusSun: model.radiusSun,
    });
  });

  // The object lists have changed under the physics caches.
  bumpWorldGeneration();

  requestFit(stage.fit);
  fitAttempts = 0;
  fitApplied = null;
  const roles = {};
  for (const entry of staged) roles[entry.role] = { id: entry.star.id };
  const bound = bindRoles(roles, { modelOwned: Object.keys(roles) });
  return { built: true, roles: bound.bound, problems };
}

/**
 * Empty the canvas so a stage can be the whole scene.
 *
 * A staged step declares everything on screen, so it starts from nothing
 * rather than from whatever scenario the reader arrived with. The id counter
 * goes back to zero with the lists, which makes a stage's ids deterministic -
 * the third star is id 2 on every machine - and the world generation is
 * bumped afterwards so that a binding made in the previous world reads as
 * stale rather than resolving to a stranger with the same number.
 *
 * @returns {void}
 */
function clearWorld() {
  releaseModelOwnership();
  staged = [];
  snapshots = [];
  for (const list of [
    bh_list,
    stars,
    planets,
    gas_giants,
    asteroids,
    comets,
    neutron_stars,
    white_dwarfs,
  ]) {
    list.length = 0;
  }
  resetPhysicsObjectCounter();
  bumpWorldGeneration();
}

// -----------------------------------------------------------------------------
// A star that becomes something else
// -----------------------------------------------------------------------------

/**
 * Which body class stands for each prescribed remnant.
 *
 * The kinds come from js/stellar/endpoints.js, which is the prescription - not
 * the track. A track stops where the model stops; what is left behind is a
 * separate statement with its own source, and 'unfinished' is a real answer
 * meaning the model ran out before the star did.
 */
const REMNANT_LISTS = {
  'white-dwarf': () => white_dwarfs,
  'neutron-star': () => neutron_stars,
  'black-hole': () => bh_list,
};

/**
 * The live collection a remnant kind belongs in.
 *
 * A function per kind rather than the array itself, because js/physics.js
 * reassigns these on some operations - the black-hole merge does
 * `bh_list = bh_list.filter(...)` - and a reference captured when this module
 * loaded then points at a detached copy. Pushing a white dwarf into one of
 * those puts it nowhere: it is not drawn, not integrated and not selectable,
 * and the star it replaced is already gone.
 *
 * @param {string} kind - From js/stellar/endpoints.js
 * @returns {?Array<object>} The collection, or null for an unknown kind
 */
const remnantList = kind => REMNANT_LISTS[kind]?.() ?? null;

/**
 * Turn a staged star into the remnant its track's prescription names.
 *
 * The hard part is not making the new body: it is that the reader has this
 * object selected, has an inspector open on it, and has a lesson step talking
 * about it. A remnant is a different class - a white dwarf is not a star with
 * different numbers - so the body has to be replaced, and everything pointing
 * at the old one has to be moved across in the same breath. The role keeps its
 * name, the binding is remade against the new body, and if the old one was
 * selected the new one is selected, so the card the reader is reading stays
 * open on the thing they were reading about.
 *
 * Returns the kind rather than the body, because the caller's next question is
 * always "what is it now" and 'unfinished' is one of the answers.
 *
 * @param {string} role - The staged star
 * @param {object} endpoint - From js/stellar/endpoints.js endpointFor
 * @returns {?string} The remnant kind, or null if nothing changed
 */
export function becomeRemnant(role, endpoint) {
  const entry = staged.find(e => e.role === role);
  if (!entry || !endpoint) return null;
  if (entry.remnantKind === endpoint.kind) return entry.remnantKind;
  // A model that stopped before the star did leaves the star on screen. There
  // is no remnant to draw, and drawing one would be inventing the answer the
  // prescription says nobody has.
  if (endpoint.kind === 'unfinished') {
    entry.remnantKind = 'unfinished';
    return 'unfinished';
  }
  const list = remnantList(endpoint.kind);
  if (!list) return null;

  const old = entry.star;
  const at = { x: old.pos.x, y: old.pos.y };
  const wasSelected = state.selectedObject?.object === old;
  // The prescription's mass, not the track's: for anything but a white dwarf
  // the track never gets there, and the range is the honest answer.
  const massSun = Number.isFinite(endpoint.remnantMassSun)
    ? endpoint.remnantMassSun
    : Number.isFinite(endpoint.remnantRange?.[0])
      ? (endpoint.remnantRange[0] + endpoint.remnantRange[1]) / 2
      : (old.massInSuns ?? 1);

  let body;
  if (endpoint.kind === 'black-hole') {
    body = new BlackHole(at, massSun * SOLAR_MASS_UNIT, { x: 0, y: 0 }, false);
  } else if (endpoint.kind === 'neutron-star') {
    body = new NeutronStar(at, { x: 0, y: 0 }, massSun);
  } else {
    body = new WhiteDwarf(at, { x: 0, y: 0 }, massSun);
  }
  body.name = old.name;
  body.model_owned = true;
  body.persistent = true;
  body.anonymous = old.anonymous;
  list.push(body);

  // Out of whichever collection actually held it. Splicing `stars` alone left
  // a duplicate behind for anything that had already become a remnant once -
  // a star that went to a neutron star and was then rewound and run forward
  // again ended up on the canvas twice, both of them model-owned and one of
  // them unreachable by role.
  removeBody(old);
  // The presentation size belongs to the star, not to what it turned into: a
  // white dwarf drawn at a red giant's compressed radius is a lie about the
  // one comparison this lesson exists to make.
  if (Number.isFinite(old.stageRadius)) delete old.stageRadius;
  entry.star = body;
  entry.remnantKind = endpoint.kind;
  // A remnant has no track radius, so nothing sizes it from the model. It
  // keeps whatever its own class chose, and the scale switch skips it because
  // physicalRadiusSun is null.
  entry.physicalRadiusSun = null;
  bumpWorldGeneration();
  // Re-bind under the same role, in this world, and carry the selection over
  // so the reader's card does not close on them.
  bindRoles(rolesOfStage(), { modelOwned: staged.map(e => e.role) });
  if (wasSelected) selectBody(body);
  return endpoint.kind;
}

/** The role-to-id map for whatever is currently staged. */
const rolesOfStage = () => {
  const out = {};
  for (const entry of staged) out[entry.role] = { id: entry.star.id };
  return out;
};

/** Whether a staged role has already become its remnant. @returns {?string} */
export const remnantKindOf = role =>
  staged.find(e => e.role === role)?.remnantKind ?? null;

/**
 * Pin a labeled copy of a staged star as it is right now.
 *
 * "Then and now" as two objects a reader can select and compare, rather than
 * one object and a memory. The copy is an ordinary staged star: model-owned,
 * inert, selectable, and carrying the state it was pinned with - so it does
 * not follow the protagonist onwards, which is the entire point of it.
 *
 * @param {string} role - Which staged star to copy
 * @param {string} label - What to call the copy
 * @param {object} [opts] - Options
 * @param {number} [opts.dy] - How far below the row to stand it
 * @returns {?object} The pinned body
 */
export function pinSnapshot(role, label, { dy = 110 } = {}) {
  const entry = staged.find(e => e.role === role);
  if (!entry) return null;
  const source = entry.star;
  const copy = new StarObject(
    { x: source.pos.x + snapshots.length * 95, y: source.pos.y + dy },
    { x: 0, y: 0 },
    source.massInSuns ?? 1
  );
  copy.name = label;
  copy.temperature = source.temperature;
  copy.luminosityInSuns = source.luminosityInSuns;
  copy.radiusInSuns = source.radiusInSuns;
  copy.ageYr = source.ageYr;
  copy.stellarPhase = source.stellarPhase;
  copy.initialMassInSuns = source.initialMassInSuns;
  // Presentation only, like every other comparison size on a stage: a pinned
  // copy is there to be looked at beside the original, and giving it a
  // collision radius of nine would make it a hazard rather than a record.
  copy.stageRadius = displayRadius(source.radiusInSuns, stagedScale);
  copy.model_owned = true;
  copy.persistent = true;
  stars.push(copy);
  const pinned = {
    role: `snapshot-${snapshots.length}`,
    star: copy,
    model: null,
    spec: { name: label },
    physicalRadiusSun: source.radiusInSuns,
    snapshot: true,
  };
  staged.push(pinned);
  snapshots.push(pinned);
  bumpWorldGeneration();
  bindRoles(rolesOfStage(), { modelOwned: staged.map(e => e.role) });
  return copy;
}

/** Every pinned snapshot, in the order they were taken. @returns {Array} */
export const pinnedSnapshots = () =>
  snapshots.map(s => ({ role: s.role, name: s.star.name, star: s.star }));

/**
 * Drop every pinned snapshot.
 *
 * A no-op when there are none, and that matters more than it looks: bumping
 * the world generation invalidates every binding in the step, and a caller
 * that clears snapshots on each step change would otherwise leave the
 * protagonist's own role stale on every screen that reuses its predecessor's
 * stage - which applyStage then declines to rebuild, because the declaration
 * has not changed.
 */
export function clearSnapshots() {
  if (!snapshots.length) return;
  for (const pin of snapshots) {
    const i = stars.indexOf(pin.star);
    if (i !== -1) stars.splice(i, 1);
    const j = staged.indexOf(pin);
    if (j !== -1) staged.splice(j, 1);
  }
  snapshots = [];
  bumpWorldGeneration();
}

// -----------------------------------------------------------------------------
// A binary, placed by a waveform model
// -----------------------------------------------------------------------------
//
// The gravitational-wave lesson used to run an unrelated GW150914 scenario
// behind its panel: two black holes spiralling in because the sandbox multiplies
// their orbit down every step, next to a waveform computed from entirely
// different numbers. Two pictures of two different things, side by side, in a
// lesson whose whole subject is telling a measurement from a model.
//
// These two bodies are the model's. Their separation and orbital phase come
// from the same timeline the waveform is drawn from - js/gw/timeline.js
// exposes both, and calls them schematic source geometry, which is exactly
// what they are. The integrator does not touch them.
//
// What the picture claims, and what it does not
// -----------------------------------------------------------------------------
// The *separation* is to scale, in Schwarzschild radii of the total mass, and
// it visibly tightens as the frequency climbs because that is what the model
// says happens. The *bodies* are markers at a fixed size: a black hole's
// horizon and a neutron star's surface are not the same kind of quantity, and
// drawing them to the same scale as the separation would put a claim about
// neutron-star radii into a lesson that has not earned one. The readout says
// both of those things rather than leaving a reader to guess.

/** World units per Schwarzschild radius of the total mass. A display choice. */
const UNITS_PER_RS = 3.2;

/** How big each component is drawn. A marker, not a radius. */
const COMPONENT_MARKER = 7;

/**
 * Stand a compact binary on the canvas, of the kinds a preset names.
 *
 * @param {object} spec - {preset, m1, m2, kinds: ['bh'|'ns', 'bh'|'ns']}
 * @returns {{built: boolean, roles: Array<string>}} What happened
 */
/**
 * One compact object, alone, for the screens that ask what does NOT radiate.
 *
 * The beginner lesson argues that motion is not the criterion for emitting
 * gravitational waves, and it cannot make that argument with a binary on
 * screen. Two of its three demonstrations need a single body: one sitting
 * still, and one pulsing in and out while staying exactly spherical. Both have
 * a gravitational field and neither radiates, and a reader has to be able to
 * select each of them and see the wave overlay stay empty.
 *
 * `pulsing` is a presentation state and nothing else. The body's drawn radius
 * is driven from the model clock by `pulseSource` below; its mass, its engine
 * radius and its position do not move, because a spherically symmetric change
 * is exactly the thing that leaves the external field alone.
 *
 * @param {object} spec - {kind, massSun, name, pulsing, fit}
 * @returns {{built: boolean, roles: object}} What was staged
 */
export function applySingleStage(spec = {}) {
  const kind = spec.kind || 'bh';
  const massSun = Number.isFinite(spec.massSun) ? spec.massSun : 36;
  clearWorld();
  stagedKey = JSON.stringify(['single', kind, massSun, Boolean(spec.pulsing)]);
  lastDeclaration = { single: spec };
  const body =
    kind === 'ns'
      ? new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, massSun)
      : new BlackHole(
          { x: 0, y: 0 },
          massSun * SOLAR_MASS_UNIT,
          { x: 0, y: 0 },
          false
        );
  body.name = spec.name || 'The source';
  body.massInSuns = massSun;
  body.initialMassInSuns = massSun;
  body.model_owned = true;
  body.persistent = true;
  body.radius = COMPONENT_MARKER;
  body.stageRadius = COMPONENT_MARKER;
  (kind === 'ns' ? neutron_stars : bh_list).push(body);
  staged.push({
    role: 'source',
    star: body,
    model: null,
    spec: { name: body.name },
    physicalRadiusSun: null,
    pulsing: Boolean(spec.pulsing),
  });
  bumpWorldGeneration();
  requestFit(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), { modelOwned: ['source'] });
  return { built: true, roles: bound.bound };
}

/**
 * Rebuild the staged binary with different components.
 *
 * What a preset change calls. The model's parameters are two masses and a
 * distance; what the two objects ARE is a separate claim, and the canvas has
 * to be able to follow it - a neutron-star preset that left two black holes
 * standing was showing the reader the wrong thing while the panel described
 * the right one.
 *
 * Only rebuilds when the components actually differ, because this throws the
 * bodies away and a rebuild four times a second would flicker.
 *
 * @param {object} spec - {kinds, m1, m2, names}
 * @returns {boolean} Whether the pair was rebuilt
 */
export function restageBinary(spec = {}) {
  const want = JSON.stringify([spec.kinds, spec.m1, spec.m2]);
  const have = JSON.stringify([
    lastBinary?.kinds,
    lastBinary?.m1,
    lastBinary?.m2,
  ]);
  if (want === have) return false;
  const next = { ...(lastBinary || {}), ...spec };
  applyBinaryStage(next);
  lastBinary = next;
  return true;
}

/**
 * Stand whichever of the three sources the current mode names.
 *
 * @param {object} spec - {mode, kinds, m1, m2, kind, massSun, fit}
 * @returns {{built: boolean, roles: object}} What was staged
 */
export function applySourceStage(spec = {}) {
  if (spec.mode === 'binary') {
    return applyBinaryStage({
      kinds: spec.kinds,
      m1: spec.m1,
      m2: spec.m2,
      names: spec.names,
      fit: spec.fit,
    });
  }
  return applySingleStage({
    kind: spec.kind ?? (spec.kinds?.[0] || 'bh'),
    massSun: spec.massSun ?? (spec.m1 ?? 36) + (spec.m2 ?? 29),
    name: spec.name,
    pulsing: spec.mode === 'pulsing',
    fit: spec.fit,
  });
}

/**
 * Change which source is on the canvas, keeping everything else.
 *
 * What the reader's own control calls. The parameters came from the step's
 * declaration and do not change; only which of the three arrangements is
 * standing there does.
 *
 * @param {string} mode - 'static', 'pulsing' or 'binary'
 * @returns {boolean} Whether the source changed
 */
export function setSourceMode(mode) {
  if (!lastSource || lastSource.mode === mode) return false;
  const next = { ...lastSource, mode };
  lastSource = next;
  applySourceStage(next);
  stagedKey = JSON.stringify(['gwSource', next]);
  return true;
}

/** Which of the three is on the canvas. @returns {?string} */
export const sourceMode = () => lastSource?.mode ?? null;

/**
 * Breathe the single source in and out.
 *
 * Presentation only, and that is the scientific point rather than a caveat:
 * the drawn radius changes and nothing else does. A spherically symmetric
 * body's external field depends on its mass and not on how big it is, so
 * squeezing and releasing one radiates nothing - which is what the screen
 * using this is for. Nothing here touches `radius`, which the engine collides
 * and merges on.
 *
 * @param {number} fraction - Where in the pulse, 0 to 1
 * @param {number} [depth] - How far the drawn radius swings, as a share
 * @returns {boolean} Whether a source was driven
 */
export function pulseSource(fraction, depth = 0.45) {
  const entry = staged.find(e => e.role === 'source');
  if (!entry || !Number.isFinite(fraction)) return false;
  const swing = Math.sin(fraction * Math.PI * 2);
  entry.star.stageRadius = COMPONENT_MARKER * (1 + depth * swing);
  return true;
}

export function applyBinaryStage(spec = {}) {
  const kinds = spec.kinds || ['bh', 'bh'];
  const masses = [spec.m1 ?? 36, spec.m2 ?? 29];
  clearWorld();
  stagedKey = JSON.stringify(['binary', kinds, masses]);
  lastDeclaration = { binary: spec };
  lastBinary = spec;
  ['a', 'b'].forEach((role, i) => {
    const massSun = masses[i];
    const body =
      kinds[i] === 'ns'
        ? new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, massSun)
        : new BlackHole(
            { x: 0, y: 0 },
            massSun * SOLAR_MASS_UNIT,
            { x: 0, y: 0 },
            false
          );
    body.name = spec.names?.[i] || (i === 0 ? 'Component 1' : 'Component 2');
    // The mass the model is describing, in the units the interface reports.
    // Without this the inspector and the object list had nothing to print for
    // either component while the panel beside them was entirely about their
    // masses - so a reader clicking a body to check what it weighed got a card
    // with the answer missing.
    body.massInSuns = massSun;
    body.initialMassInSuns = massSun;
    body.model_owned = true;
    body.persistent = true;
    body.radius = COMPONENT_MARKER;
    (kinds[i] === 'ns' ? neutron_stars : bh_list).push(body);
    staged.push({
      role,
      star: body,
      model: null,
      spec: { name: body.name },
      physicalRadiusSun: null,
      component: i,
    });
  });
  bumpWorldGeneration();
  requestFit(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), { modelOwned: ['a', 'b'] });
  return { built: true, roles: bound.bound };
}

/**
 * Stand a star with planets on it, on orbits with a declared eccentricity.
 *
 * Engine-owned: these are ordinary bodies and the integrator moves them, which
 * is what makes the periapsis and apoapsis a lesson stops at real turning
 * points rather than marks on a drawing.
 *
 * Each planet starts at apoapsis, moving perpendicular to the line to the
 * star - the standard two-body initial condition, so the orbit closes and the
 * semi-major axis it settles on is the one that was asked for. Masses are
 * Earth-sized and the star's is solar, so the planets do not perturb each
 * other measurably over the few years a lesson watches.
 *
 * @param {object} spec - {starName, luminositySun, planets: [{name, aAU, ecc, radius}]}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applySystemStage(spec = {}) {
  clearWorld();
  // The integrator's own constant, not the application's copy of it. The two
  // are synced while the app runs and are NOT synced anywhere else, so a stage
  // built from SETTINGS lays out an orbit for a gravity the engine is not
  // using - which is how a pair set up at apoapsis was found spiralling
  // outward instead of closing.
  const G = getPhysicsSetting('gravitational_constant');
  const AU = 100;
  const star = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
  star.name = spec.starName || 'Sun';
  star.mass = SOLAR_MASS_UNIT;
  star.massInSuns = 1;
  star.luminosityInSuns =
    Number(spec.luminositySun) > 0 ? spec.luminositySun : 1;
  star.temperature = Number(spec.teffK) > 0 ? spec.teffK : 5780;
  star.radius = 10;
  star.persistent = true;
  star.model_owned = false;
  stars.push(star);
  staged.push({
    role: 'star',
    star,
    model: null,
    spec: { name: star.name },
    physicalRadiusSun: null,
  });

  (spec.planets || []).forEach(w => {
    const a = Number(w.aAU) > 0 ? Number(w.aAU) * AU : AU;
    const e = Math.min(0.9, Math.max(0, Number(w.ecc) || 0));
    // Apoapsis: furthest point, slowest speed. The vis-viva speed there for an
    // ellipse of semi-major axis a is sqrt(GM (2/r - 1/a)).
    const r = a * (1 + e);
    const v = Math.sqrt(SOLAR_MASS_UNIT * G * (2 / r - 1 / a));
    const planet = new Planet({ x: r, y: 0 }, { x: 0, y: v }, 1);
    planet.name = w.name;
    planet.mass = EARTH_MASS_UNIT;
    planet.massInEarths = 1;
    planet.radius = Number(w.radius) > 0 ? Number(w.radius) : 4.5;
    if (w.color) planet.baseColor = w.color;
    planet.persistent = true;
    planet.model_owned = false;
    planets.push(planet);
    staged.push({
      role: w.role || w.name.toLowerCase(),
      star: planet,
      model: null,
      spec: { name: planet.name },
      physicalRadiusSun: null,
    });
  });
  bumpWorldGeneration();
  requestFit(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), {});
  return { built: true, roles: bound.bound };
}

/**
 * Stand one black hole on the canvas, with bodies in orbit around it.
 *
 * The orbit radii are multiples of the hole's *drawn* radius, and that is a
 * statement about the picture and nothing else.
 *
 * This used to say they were Schwarzschild radii and that the floor below was
 * the innermost stable circular orbit. Neither was true, and the pair of claims
 * was the exact misconception the lesson that calls this spends a screen
 * dismantling: the dark disc is drawn at whatever size lets four orbits fit in
 * a window, a real horizon at these masses is many orders of magnitude smaller
 * than that disc, and a multiple of the drawn radius is therefore not a
 * multiple of anything physical. The floor is a floor on the drawing - it keeps
 * the innermost orbiter visibly outside the disc at any mass - and calling it
 * the ISCO gave a display constant a relativistic justification it does not
 * have.
 *
 * Nothing here models the ISCO, and nothing needs to. The engine is Newtonian
 * everywhere and has no horizon at all; where this lesson talks about the
 * innermost stable circular orbit it reads the number off a closed-form panel,
 * which is also where the Schwarzschild radius, the Hawking temperature and the
 * evaporation lifetime come from. See js/blackHolePhysics.js.
 *
 * Engine-owned, and the thing being demonstrated is Newtonian: outside a
 * spherical body the field depends on the mass and nothing else. The integrator
 * is entitled to move these and the lesson is entitled to measure what it does.
 *
 * @param {object} spec - {massSun, orbits, fit}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyHoleStage(spec = {}) {
  const massSun = Number(spec.massSun) > 0 ? Number(spec.massSun) : 10;
  clearWorld();
  // The integrator's own constant, not the application's copy of it. The two
  // are synced while the app runs and are NOT synced anywhere else, so a stage
  // built from SETTINGS lays out an orbit for a gravity the engine is not
  // using - which is how a pair set up at apoapsis was found spiralling
  // outward instead of closing.
  const G = getPhysicsSetting('gravitational_constant');
  const mass = massSun * SOLAR_MASS_UNIT;
  const hole = new BlackHole({ x: 0, y: 0 }, mass, { x: 0, y: 0 }, false);
  hole.name = spec.name || 'Black Hole';
  hole.persistent = true;
  hole.model_owned = false;
  bh_list.push(hole);
  staged.push({
    role: 'hole',
    star: hole,
    model: null,
    spec: { name: hole.name, massSun },
    physicalRadiusSun: null,
  });
  // Radii in units of the drawn radius, so an orbit is visibly outside the dark
  // disc at any mass. Not the horizon: the drawn radius is a display size, and
  // the floor below is a floor on the picture rather than on the physics.
  const drawn = Math.max(hole.radius || 1, 1);
  (spec.orbits || [4.2, 6.4, 9.2, 12.6]).forEach((k, i) => {
    // Three drawn radii is the closest anything is placed. A drawing bound, so
    // the innermost orbiter reads as an orbit rather than as a rim on the
    // disc - it is not the ISCO, which is three *Schwarzschild* radii and is
    // not a length this canvas has.
    const r = Math.max(k * drawn, 3 * drawn);
    const body = new Asteroid(
      { x: r, y: 0 },
      { x: 0, y: Math.sqrt((G * mass) / r) }
    );
    body.name = `Orbiter ${i + 1}`;
    body.persistent = true;
    asteroids.push(body);
    staged.push({
      role: `orbiter-${i + 1}`,
      star: body,
      model: null,
      spec: { name: body.name },
      physicalRadiusSun: null,
    });
  });
  bumpWorldGeneration();
  requestFit(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), {});
  return { built: true, roles: bound.bound };
}

/**
 * Restand the hole with a different mass.
 *
 * @param {object} spec - {massSun}
 * @returns {boolean} Whether anything was restaged
 */
export function restageHole(spec = {}) {
  const next = { ...(lastHole || {}), ...spec };
  const key = JSON.stringify(['hole', next]);
  if (key === stagedKey) return false;
  applyHoleStage(next);
  stagedKey = key;
  lastHole = next;
  return true;
}

/**
 * A star and a black hole of the same mass, each with a body in the same orbit.
 *
 * The controlled comparison. Two systems side by side, identical in every way
 * a student can vary except what sits at the center, and the thing being
 * demonstrated is that the orbits are indistinguishable - because outside a
 * spherical body the field depends on the mass and nothing else, and a black
 * hole is not a special kind of gravity.
 *
 * The orbit radius is chosen outside *both* central bodies, which for a star
 * of a few solar masses means outside the star: that is the condition under
 * which the claim is true, and putting an orbit inside the star would be
 * comparing two different problems.
 *
 * @param {object} spec - {massSun, orbitUnits, fit}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyEqualMassStage(spec = {}) {
  const massSun = Number(spec.massSun) > 0 ? Number(spec.massSun) : 8;
  clearWorld();
  // The integrator's own constant, not the application's copy of it. The two
  // are synced while the app runs and are NOT synced anywhere else, so a stage
  // built from SETTINGS lays out an orbit for a gravity the engine is not
  // using - which is how a pair set up at apoapsis was found spiralling
  // outward instead of closing.
  const G = getPhysicsSetting('gravitational_constant');
  const mass = massSun * SOLAR_MASS_UNIT;
  // Far enough apart that neither system perturbs the other to the accuracy a
  // student could see over the few orbits the step lasts.
  const gap = Number(spec.gap) > 0 ? Number(spec.gap) : 900;
  const hole = new BlackHole(
    { x: -gap / 2, y: 0 },
    mass,
    { x: 0, y: 0 },
    false
  );
  hole.name = 'Black hole, 8 M☉';
  hole.persistent = true;
  hole.model_owned = false;
  bh_list.push(hole);

  const star = new StarObject({ x: gap / 2, y: 0 }, { x: 0, y: 0 }, massSun);
  star.name = 'Star, 8 M☉';
  star.mass = mass;
  star.massInSuns = massSun;
  star.persistent = true;
  star.model_owned = false;
  stars.push(star);

  // Outside both. The star is the larger of the two by a wide margin at any
  // stellar mass, so its drawn radius sets the floor.
  const r = Math.max(
    Number(spec.orbitUnits) > 0 ? Number(spec.orbitUnits) : 160,
    (star.radius || 9) * 3,
    (hole.radius || 9) * 3
  );
  const v = Math.sqrt((G * mass) / r);
  [
    { center: hole, role: 'hole', label: 'Orbiting the black hole' },
    { center: star, role: 'star', label: 'Orbiting the star' },
  ].forEach(({ center, role, label }) => {
    const body = new Asteroid(
      { x: center.pos.x + r, y: center.pos.y },
      { x: 0, y: v }
    );
    body.name = label;
    body.persistent = true;
    asteroids.push(body);
    staged.push({
      role: `${role}-orbiter`,
      star: body,
      model: null,
      spec: { name: body.name },
      physicalRadiusSun: null,
    });
  });
  staged.push(
    {
      role: 'hole',
      star: hole,
      model: null,
      spec: { name: hole.name, massSun },
      physicalRadiusSun: null,
    },
    {
      role: 'star',
      star,
      model: null,
      spec: { name: star.name, massSun },
      physicalRadiusSun: null,
    }
  );
  bumpWorldGeneration();
  requestFit(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), {});
  return { built: true, roles: bound.bound, orbitRadius: r };
}

/**
 * Stand two stars on the canvas, on circular orbits about their barycenter.
 *
 * Engine-owned on purpose. "Weighing the Stars" measures a period and a
 * separation off the main scene and puts them into Newton's form of Kepler's
 * third law, so the orbit a student times has to be one the integrator
 * actually produced - a prescribed one would be the lesson quoting its own
 * answer back at itself.
 *
 * The initial conditions come from js/lesson/barycenter.js and carry zero net
 * momentum, so the balance point stays where it is drawn instead of sliding
 * off the view over a few orbits.
 *
 * @param {object} spec - {m1, m2, separation, names, radius}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyStarPairStage(spec = {}) {
  const m1Sun = Number(spec.m1) > 0 ? Number(spec.m1) : 2;
  const m2Sun = Number(spec.m2) > 0 ? Number(spec.m2) : 2;
  const separation =
    Number(spec.separation) > 0 ? Number(spec.separation) : 400;
  clearWorld();
  // The integrator's own constant, not the application's copy of it. The two
  // are synced while the app runs and are NOT synced anywhere else, so a stage
  // built from SETTINGS lays out an orbit for a gravity the engine is not
  // using - which is how a pair set up at apoapsis was found spiralling
  // outward instead of closing.
  const G = getPhysicsSetting('gravitational_constant');
  const ic = circularBinary({
    m1: m1Sun * SOLAR_MASS_UNIT,
    m2: m2Sun * SOLAR_MASS_UNIT,
    separation,
    G,
  });
  if (!ic) return { built: false, roles: [] };
  const names = spec.names || ['Star A', 'Star B'];
  [m1Sun, m2Sun].forEach((massSun, i) => {
    // Solar masses, not engine units: the constructor multiplies by
    // SOLAR_MASS_UNIT itself. Handing it engine units built two stars of
    // several hundred solar masses, which check_stellar_collapse turned into
    // black holes on the first physics step.
    const star = new StarObject(
      { ...ic.positions[i] },
      { ...ic.velocities[i] },
      massSun
    );
    star.name = names[i];
    star.mass = massSun * SOLAR_MASS_UNIT;
    star.massInSuns = massSun;
    // Drawn at a fixed size rather than from the mass. The lesson's whole
    // method is reading the *arm lengths* off the picture, and a disc that
    // grew with mass would let a student answer "which is heavier" from the
    // drawing instead of from the geometry - which is the misconception the
    // see-saw screens exist to remove.
    star.radius = Number(spec.radius) > 0 ? Number(spec.radius) : 9;
    star.persistent = true;
    // Deliberately NOT model_owned: see the note on applyStage above.
    star.model_owned = false;
    stars.push(star);
    staged.push({
      role: i === 0 ? 'a' : 'b',
      star,
      model: null,
      spec: { name: star.name, massSun },
      physicalRadiusSun: null,
      component: i,
    });
  });
  bumpWorldGeneration();
  requestFit(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), {});
  return { built: true, roles: bound.bound, period: ic.period };
}

/**
 * Restand the pair with new masses, keeping the same separation.
 *
 * What a mass-ratio control on the main scene has to do. Changing a mass
 * in place would leave both stars on orbits that no longer close, so the pair
 * is rebuilt from the same arithmetic that built it - which is also the honest
 * picture: a different pair of masses is a different binary, not the same one
 * nudged.
 *
 * @param {object} spec - {m1, m2, separation}
 * @returns {boolean} Whether anything was restaged
 */
export function restageStarPair(spec = {}) {
  const current = lastStarPair;
  const next = {
    ...(current || {}),
    ...spec,
  };
  const key = JSON.stringify(['starPair', next]);
  if (key === stagedKey) return false;
  applyStarPairStage(next);
  stagedKey = key;
  lastStarPair = next;
  return true;
}

/**
 * The barycenter of the staged pair, and each star's distance from it.
 *
 * Read live off the bodies rather than from the declaration, so it is a
 * measurement of what the integrator is doing and not a restatement of what it
 * was asked to do. A pair that has drifted says so.
 *
 * @returns {?object} {x, y, arms: [{role, name, r}], separation}
 */
export function stagedBarycenter() {
  const pair = staged.filter(e => e.star && stars.includes(e.star));
  if (pair.length < 2) return null;
  const bodies = pair.map(e => e.star);
  const c = barycenterOf(bodies);
  if (!c) return null;
  const arms = pair.map(e => ({
    role: e.role,
    name: e.star.name,
    massSun: e.star.massInSuns,
    r: Math.hypot(e.star.pos.x - c.x, e.star.pos.y - c.y),
  }));
  return {
    x: c.x,
    y: c.y,
    arms,
    separation: Math.hypot(
      bodies[0].pos.x - bodies[1].pos.x,
      bodies[0].pos.y - bodies[1].pos.y
    ),
  };
}

/**
 * Put the two components where the model says they are.
 *
 * Called every frame from the lab, with the separation and orbital phase the
 * waveform is being drawn from, so the picture and the plot cannot drift apart.
 * The components sit either side of the center of mass in the mass ratio, which
 * is the one piece of orbital mechanics this picture does assert.
 *
 * @param {number} separationRs - Separation, in Schwarzschild radii
 * @param {number} phase - Orbital phase, radians
 * @param {object} [opts] - {m1, m2}
 * @returns {boolean} Whether anything moved
 */
export function placeBinary(
  separationRs,
  phase,
  { m1 = 1, m2 = 1, inclinationDeg = 0 } = {}
) {
  const a = staged.find(e => e.role === 'a');
  const b = staged.find(e => e.role === 'b');
  if (!a || !b || !Number.isFinite(separationRs) || !Number.isFinite(phase)) {
    return false;
  }
  const d = separationRs * UNITS_PER_RS;
  const total = m1 + m2 || 1;
  // The orbit seen from where the observer is. Face-on it is a circle; edge-on
  // it is a line; in between it is an ellipse squashed by cos(i). The
  // inclination changes the waveform - it is what turns the polarisation from
  // circular to linear - and until this was here it changed the plot and the
  // ring while the picture of the orbit stayed resolutely face-on, so the one
  // control whose effect is geometric was the one the geometry ignored.
  const squash = Math.abs(
    Math.cos(((Number(inclinationDeg) || 0) * Math.PI) / 180)
  );
  const ux = Math.cos(phase);
  const uy = Math.sin(phase) * squash;
  // Each component's distance from the center of mass is the *other* one's
  // share of the total, which is why the lighter one swings furthest.
  a.star.pos.x = ux * d * (m2 / total);
  a.star.pos.y = uy * d * (m2 / total);
  b.star.pos.x = -ux * d * (m1 / total);
  b.star.pos.y = -uy * d * (m1 / total);
  return true;
}

/** What the binary picture is drawn at, for a readout to quote. */
export const BINARY_SCALE = Object.freeze({
  unitsPerSchwarzschildRadius: UNITS_PER_RS,
  componentMarkerUnits: COMPONENT_MARKER,
});

/** Take the stage down and give the bodies back. */
export function clearStage() {
  if (!staged.length && !snapshots.length) {
    stagedKey = '';
    lastDeclaration = null;
    lastStarPair = null;
    lastHole = null;
    lastPopulation = null;
    return;
  }
  releaseModelOwnership();
  // Everything the stage put on the canvas, out of whichever collection holds
  // it. Removing from `stars` alone left a hole's four orbiters, a system's
  // planets and every remnant behind, so a reader closing a lesson was handed
  // a sandbox with somebody else's bodies in it.
  //
  // The pinned snapshots are staged bodies too - they are copies stood beside
  // the original for a then-and-now comparison - and they were never in
  // `staged`, so nothing removed them at all.
  for (const entry of staged) {
    entry.star.model_owned = false;
    entry.star.persistent = false;
    removeBody(entry.star);
  }
  for (const snap of snapshots) {
    if (!snap?.star) continue;
    snap.star.model_owned = false;
    snap.star.persistent = false;
    removeBody(snap.star);
  }
  // The effects those bodies produced. A staged black hole grows an accretion
  // disk and emits ripples, and a staged star that was pulled apart leaves
  // debris: none of it is in a body collection, so removing the bodies left
  // the reader's restored sandbox showing an accretion disk with no black hole
  // at the middle of it.
  //
  // Disk particles are matched by their parent rather than cleared wholesale,
  // because a hole the reader put there themselves may be accreting too and
  // its disk is not the lesson's to remove.
  const ours = new Set([
    ...staged.map(e => e.star),
    ...snapshots.map(sn => sn?.star).filter(Boolean),
  ]);
  for (let i = accretion_disk_particles.length - 1; i >= 0; i--) {
    const parent = accretion_disk_particles[i]?.parentBlackHole;
    // Ours, or orphaned. An orphan is a particle whose hole is no longer in
    // the world at all - which happens whenever a stage is rebuilt, because
    // the rebuild replaces the hole and nothing was clearing the disk that
    // belonged to the old one. Either way it is drawn around nothing.
    if (ours.has(parent) || (parent && !bh_list.includes(parent))) {
      accretion_disk_particles.splice(i, 1);
    }
  }
  for (const body of ours) {
    if (Array.isArray(body.disk_particles)) body.disk_particles.length = 0;
    // The trail is drawn from the body's own history, and a body that is
    // about to be handed back to the integrator - a remnant that reverted,
    // say - must not carry the path it took while the lesson owned it.
    if (Array.isArray(body.trail)) body.trail.length = 0;
  }
  // Ripples are positional and short-lived, and every one on screen during a
  // staged lesson was emitted by the stage.
  gravity_ripples.length = 0;

  staged = [];
  snapshots = [];
  stagedKey = '';
  stagedScale = SCALE.DISPLAY;
  lastDeclaration = null;
  lastStarPair = null;
  lastHole = null;
  lastPopulation = null;
  requestFit(false);
  fitAttempts = 0;
  fitApplied = null;
  bumpWorldGeneration();
}

/**
 * Redraw the stage at true or compressed scale.
 *
 * Positions do not move, only sizes, so the two pictures can be compared by
 * flicking between them - which is the only reason the switch exists.
 *
 * @param {string} scale - One of SCALE
 * @returns {void}
 */
export function setStageScale(scale) {
  stagedScale = scale === SCALE.TRUE ? SCALE.TRUE : SCALE.DISPLAY;
  for (const entry of staged) {
    // Only bodies the model gave a physical radius. A hole's orbiters, a
    // binary's markers and a system's planets have none: they are on the
    // canvas to be watched, not compared by size, and writing a stellar
    // display radius onto them changed the Goldilocks planet from 4.8 to 9 -
    // which is a collision radius, so it changed the physics too.
    if (!Number.isFinite(entry.physicalRadiusSun)) continue;
    // The presentation radius, not the engine radius. `radius` decides
    // collisions, tidal disruption, the hit test and every measured orbital
    // property, and a scale switch is a statement about the picture. When
    // these were the same field, flicking between true and compressed scale
    // silently changed what the bodies would do.
    entry.star.stageRadius = displayRadius(
      entry.physicalRadiusSun,
      stagedScale
    );
  }
}

/**
 * Put a star back where a remnant is.
 *
 * The inverse of becomeRemnant, and it has to be an inverse rather than an
 * approximation: the role, the name, the position and the reader's selection
 * all carry over, because from the reader's point of view this is the same
 * object being rewound rather than a new one appearing.
 *
 * @param {object} entry - The staged entry holding the remnant
 * @returns {object} The star now standing in its place
 */
function revertToStar(entry) {
  const old = entry.star;
  const wasSelected = state.selectedObject?.object === old;
  const massSun = Number.isFinite(old.massInSuns) ? old.massInSuns : 1;
  const star = new StarObject(
    { x: old.pos.x, y: old.pos.y },
    { x: 0, y: 0 },
    massSun
  );
  star.name = old.name;
  star.mass = massSun * SOLAR_MASS_UNIT;
  star.massInSuns = massSun;
  star.persistent = true;
  star.model_owned = true;
  removeBody(old);
  if (Number.isFinite(old.stageRadius)) delete old.stageRadius;
  stars.push(star);
  // The entry has to point at the new body before the roster is rebuilt:
  // rolesOfStage() reads entry.star, so binding first would re-bind the role
  // to the id of the remnant that has just been taken off the canvas.
  entry.star = star;
  entry.remnantKind = null;
  bumpWorldGeneration();
  bindRoles(rolesOfStage(), { modelOwned: staged.map(e => e.role) });
  if (wasSelected) selectBody(star);
  return star;
}

/**
 * Write a new model state onto one staged star.
 *
 * The path a control takes when a step lets a reader change a star: the model
 * answers, the body follows, and the drawn size follows the model's radius
 * rather than being set independently. Preserving a quantity the step is
 * holding fixed - a luminosity, while a temperature moves - is the caller's
 * business, because only the step knows which one it is holding.
 *
 * @param {string} role - Which staged star
 * @param {object} model - A selection, from the lab or resolveStar
 * @returns {boolean} Whether anything changed
 */
export function restageStar(role, model) {
  const entry = staged.find(s => s.role === role);
  if (!entry || !model) return false;
  // Rewinding past the endpoint. The body on the canvas is a WhiteDwarf, a
  // NeutronStar or a BlackHole, and the model being written onto it is a point
  // on a track - a star. Writing a temperature and a luminosity onto a white
  // dwarf leaves a white dwarf labeled main-sequence: the card says one
  // thing, the class says another, and the H-R point is plotted for a body
  // that is not there. So the remnant is taken back off and a star put back.
  if (entry.remnantKind && entry.remnantKind !== 'unfinished') {
    revertToStar(entry);
  }
  const changed = applySelection(entry.star, model);
  entry.model = model;
  entry.physicalRadiusSun = model.radiusSun;
  entry.star.stageRadius = displayRadius(model.radiusSun, stagedScale);
  // The engine mass follows the modeled one, or the two disagree: the card
  // would show the track's mass while gravity used the mass the star was
  // built with. A free point supplies none, and then the engine mass is left
  // alone rather than being invented - the body has to weigh something, and
  // what it weighs is no longer a claim the lesson is making.
  if (Number.isFinite(entry.star.massInSuns)) {
    entry.star.mass = entry.star.massInSuns * SOLAR_MASS_UNIT;
  }
  return changed;
}

/**
 * A bounded, evenly strided subsample of the seeded population.
 *
 * Four hundred stars is what the model generates and what the counts are made
 * of. Four hundred bodies on the canvas is not a picture, it is a smear, and
 * it would put four hundred sources into every force sum for no reason. So the
 * canvas gets a fixed number of them, taken at a constant stride through the
 * generated list rather than at random, and the readout says "one hundred and
 * twenty of four hundred" instead of letting the picture claim to be the
 * population.
 *
 * A stride rather than a random draw because the population is generated in no
 * particular order but *is* generated deterministically, so a stride is
 * reproducible and unbiased with respect to anything the lesson asks about.
 *
 * @param {object} spec - {seed, count, show, threshold}
 * @returns {{shown: Array, total: number, visible: number}} The subsample
 */
export function populationSample({
  seed = 'stellar-population-1',
  count = 400,
  show = 120,
  distancePc = 100,
  thresholdFlux = null,
} = {}) {
  // populationOf answers with the whole synthetic survey - the stars it drew,
  // and what it had to leave out and why - not a bare array. `stars` is the
  // modeled subset, which is what can be put on a canvas or on a diagram; the
  // ones it could not model are counted in the object beside it and belong in
  // the readout rather than being quietly dropped into a total.
  const survey = populationOf({
    populationSeed: seed,
    populationCount: count,
  });
  const all = survey?.stars || [];
  const total = all.length;
  const requested = survey?.requested ?? count;

  // The bounded canvas subsample, chosen ONCE from the whole modeled
  // population and never from the selection. This is the fix for the thing
  // that made the third loop unteachable: the stride used to be computed over
  // the stars that passed the cut, so moving the threshold did not add or
  // remove stars from a fixed shelf - it re-strided the whole shelf and put a
  // different hundred and twenty stars on the canvas. A reader lowering the
  // threshold to "bring the M dwarfs back" got a different sky.
  const wanted = Math.min(show, all.length);
  const stride = wanted > 0 ? all.length / wanted : 1;
  const subsample = [];
  for (let i = 0; i < wanted; i++) subsample.push(all[Math.floor(i * stride)]);

  // One selection function, the same one the panel uses, over the same
  // distance and the same definition of flux. It used to be an intrinsic
  // luminosity cut here and a flux cut there; they agreed at the values the
  // lesson shipped with and would have parted company the moment either moved.
  const selected = Number.isFinite(thresholdFlux)
    ? new Set(
        brightSubset(survey, { distancePc, thresholdFlux }).stars.map(s => s.id)
      )
    : null;
  const shown = selected
    ? subsample.filter(s => selected.has(s.id))
    : subsample;

  return {
    shown,
    total,
    requested,
    /** How many of the whole modeled population pass the cut. */
    visible: selected ? selected.size : total,
    /** How many stand on the canvas before the cut is applied. */
    subsample: subsample.length,
    distancePc,
    thresholdFlux: Number.isFinite(thresholdFlux) ? thresholdFlux : null,
  };
}

/**
 * Stand a population subsample on the canvas.
 *
 * @param {object} spec - See populationSample, plus {spacing, perRow, scale}
 * @returns {{shown: number, total: number, visible: number}} What was staged
 */
export function applyPopulationStage(spec = {}) {
  const sample = populationSample(spec);
  const { shown, total, visible, requested } = sample;
  const stage = {
    spacing: spec.spacing ?? 34,
    perRow: spec.perRow ?? 15,
    scale: spec.scale,
    // No captions: a hundred and twenty masses printed on top of each other is
    // not information. The inspector still gives every one of them in full,
    // and the survey's own counts are in the instrument's readout.
    anonymous: true,
    stars: shown.map((s, i) => ({
      // The star's own name, not its place in the row. A threshold that
      // removes half the shelf used to renumber everything left on it, so
      // "pop-7" was a different star before and after - and a selection, a
      // binding or a capture made against it silently moved to a stranger.
      role: `pop-${s.id ?? i}`,
      name: `Star ${s.index ?? i + 1}`,
      populationId: s.id ?? null,
      // The survey's own answer, not a re-estimate: these stars have a mass
      // and an age because the model drew them with one.
      model: {
        source: 'model',
        teffK: s.teffK,
        luminositySun: s.luminositySun,
        radiusSun: s.radiusSun,
        massSun: s.massSun,
        initialMassSun: s.massSun,
        ageYr: s.ageYr,
        phase: 'main-sequence',
      },
    })),
  };
  // A population stage is built by handing applyStage a list of stars, which
  // makes applyStage think a star shelf is what is on screen. Both of these
  // put that right: the stage key so the caller's own memoisation still
  // matches, and the declaration because a population is what has to be put
  // back when the reader moves the brightness cut. Losing the declaration made
  // the cut work exactly once and then stop, silently, with the panel still
  // moving - which is the failure this whole pass is about, arriving from the
  // other direction.
  const key = stagedKey;
  const declared = lastDeclaration;
  applyStage(stage, { force: true });
  stagedKey = key;
  lastDeclaration = declared;
  return {
    ...sample,
    shown: shown.length,
    total,
    visible,
    requested,
  };
}

/**
 * Re-apply the population stage under a new brightness cut.
 *
 * The scene half of the threshold slider. The panel used to move alone: the
 * stage baked its cut into the lesson's declaration, so a reader raising the
 * threshold watched the diagram empty while the canvas behind it stood
 * unchanged - and the step whose whole claim is "two views of one population"
 * showed two populations.
 *
 * The subsample is fixed and the selection is a filter over it, so a cut that
 * is lowered again brings back the same stars: same ids, same models, same
 * order. Nothing is re-rolled, and the population underneath is never touched.
 *
 * @param {object} [opts]
 * @param {?number} [opts.thresholdFlux] - The cut, or null for no cut
 * @returns {boolean} Whether the stage was re-applied
 */
export function restagePopulation({ thresholdFlux = null } = {}) {
  const decl = lastDeclaration?.population;
  if (!decl) return false;
  const want = Number.isFinite(thresholdFlux) ? thresholdFlux : null;
  const now = lastPopulation?.thresholdFlux ?? null;
  // A slider emits a value every few pixels and most of them select the same
  // stars. Rebuilding on each one would churn the world for no visible
  // change, so the guard is the selected set and not the number.
  const next = populationSample({ ...decl, thresholdFlux: want });
  const before = (lastPopulation?.shownIds ?? []).join(',');
  const after = next.shown.map(x => x.id).join(',');
  if (now === want && before === after) return false;
  const out = applyPopulationStage({ ...decl, thresholdFlux: want });
  lastPopulation = { ...out, shownIds: next.shown.map(x => x.id) };
  requestFit(lastDeclaration.fit);
  fitAttempts = 0;
  fitApplied = null;
  return true;
}

/**
 * Perform a fit that was asked for, once the panels are there to measure.
 *
 * Returns false when there is nothing pending or nothing to measure yet, so a
 * caller can poll it cheaply from a tick it already has.
 *
 * @returns {boolean} Whether a fit was performed
 */
export function takeFit() {
  if (!pendingFit || !staged.length) return false;
  if (typeof document === 'undefined') return false;
  // The reader owns the camera the moment they touch it. Without this the
  // retry below and a reader dragging the view fight each other for the first
  // few seconds of a staged step: they pan somewhere to look at a star, the
  // next tick decides the fit did not survive, and the view snaps back. The
  // retry exists for an application that resets the camera during boot, not
  // for a person who has decided to look somewhere else.
  if (state.cameraTouchedAt) {
    requestFit(false);
    fitApplied = null;
    return false;
  }
  const panel = document.getElementById('investigationPanel');
  if (!panel || panel.hidden || !panel.getBoundingClientRect().width) {
    return false;
  }
  // Did the last attempt survive? js/world/build.js sets the camera to the
  // scenario's zoom and the origin whenever the world is rebuilt, and on a
  // first load that happens *after* the lesson has opened - so a single
  // attempt is applied and then silently undone, which is what it did.
  if (fitApplied && sameCamera(fitApplied)) {
    requestFit(false);
    fitApplied = null;
    return false;
  }
  // Bounded, and small. Two and a half seconds of trying is enough to outlast
  // a boot; beyond that something else genuinely owns the camera and this must
  // stop, because a view that keeps snapping back is worse than one that never
  // moved.
  if (++fitAttempts > MAX_FIT_ATTEMPTS) {
    requestFit(false);
    fitApplied = null;
    return false;
  }
  const done = fitStage();
  fitApplied = done ? { zoom: state.zoom, pan: { ...state.pan } } : null;
  return done;
}

/**
 * How many ticks a fit may spend waiting for the boot to stop moving it.
 *
 * The panel ticks four times a second, so twenty-four is six seconds. It needs
 * to be that long because on a cold load the application rebuilds its own
 * world - and resets the camera with it - some way after the lesson panel has
 * opened, and a fit applied before that is silently undone. It also needs to
 * be bounded: past this the camera belongs to whoever else is moving it, and a
 * view that keeps snapping back is worse than one that never moved.
 */
const MAX_FIT_ATTEMPTS = 24;
let fitAttempts = 0;
let fitApplied = null;

/** Whether the camera is still where a fit put it. */
const sameCamera = was =>
  Math.abs(state.zoom - was.zoom) < 1e-6 &&
  Math.abs(state.pan.x - was.pan.x) < 0.5 &&
  Math.abs(state.pan.y - was.pan.y) < 0.5;

/**
 * Ask for a fit on the next tick, or cancel one.
 *
 * Two pieces of state have to move with `pendingFit` and one of them did not.
 * `fitAttempts` is module-level, and the nine assignments this now replaces
 * left it alone: once a step had spent its budget of retries, no later step in
 * the lesson could frame itself. And `cameraTouchedAt` has to be forgotten at
 * the start of each staged step, or the reader's first pan of a session would
 * cancel every fit after it.
 *
 * @param {boolean} [on] - Whether a fit is wanted; defaults to yes
 */
export const requestFit = (on = true) => {
  pendingFit = Boolean(on);
  fitAttempts = 0;
  fitApplied = null;
  if (on) state.cameraTouchedAt = 0;
};

/**
 * How much of the window the lesson's own furniture is covering.
 *
 * Measured rather than assumed, because the lesson panel and the instrument
 * are different widths in different languages and disappear entirely on a
 * narrow window, where they stack below the canvas instead of beside it. What
 * is left over is where the stage has to fit.
 *
 * @returns {{left: number, right: number, top: number, bottom: number}} Pixels
 */
function panelInset() {
  if (typeof document === 'undefined') return {};
  let left = 0;
  let right = 0;
  // The main control rail counts too. It floats over the canvas on the right
  // exactly as the lesson panel does on the left, and leaving it out put the
  // second star of a two-star shelf underneath it - on a step that asks the
  // reader to click that star.
  for (const id of [
    'investigationPanel',
    'investigationTool',
    'mainControls',
  ]) {
    const el = document.getElementById(id);
    if (!el || el.hidden) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    // Only furniture that is genuinely beside the canvas: a panel stacked
    // below it on a narrow window covers the bottom, not a side, and taking
    // its width off would leave nowhere to put anything.
    if (box.bottom < window.innerHeight * 0.5) continue;
    if (box.left < window.innerWidth * 0.5) left = Math.max(left, box.right);
    else right = Math.max(right, window.innerWidth - box.left);
  }
  return { left, right, top: 0, bottom: 0 };
}

/**
 * Frame the whole stage.
 *
 * Only ever on request - an action a reader presses, or a step that says it
 * fits on entry. A camera that re-fitted itself every frame would take the
 * view back every time somebody looked somewhere else, which is the single
 * most irritating thing an interface of this kind can do.
 *
 * @returns {boolean} Whether the camera moved
 */
export function fitStage() {
  const placed = staged.map(e => ({
    x: e.star.pos.x,
    y: e.star.pos.y,
    radius: e.star.radius,
  }));
  const view = {
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  };
  const camera = fitCamera(placed, view, { inset: panelInset() });
  if (!camera) return false;
  state.zoom = camera.zoom;
  state.pan = camera.pan;
  return true;
}

/**
 * Put the selected body in the middle of the view, at the zoom it is at.
 *
 * Deliberately not a follow *mode*: nothing on a stage moves, so there is
 * nothing to track. It centers once, on request, which is what a reader who
 * has just selected a speck at true scale actually wants.
 *
 * @returns {boolean} Whether the camera moved
 */
export function centerOnSelected() {
  const body = state.selectedObject?.object;
  if (!body?.pos) return false;
  state.pan = { x: -body.pos.x * state.zoom, y: -body.pos.y * state.zoom };
  return true;
}

/** Every bundled track, lightest first, with its birth mass. For a stage. */
export const trackCatalog = () =>
  trackIds().map(id => ({
    id,
    initialMassSun: trackBounds(id).initialMassSun,
  }));
