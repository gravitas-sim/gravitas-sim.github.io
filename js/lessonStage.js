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
  neutron_stars,
  planets,
  resetPhysicsObjectCounter,
  stars,
  white_dwarfs,
} from './physics.js';
import { bindRoles, releaseModelOwnership, selectBody } from './lessonScene.js';
import { barycentreOf, circularBinary } from './lesson/barycentre.js';
import {
  stateAtAge,
  stateAtSample,
  trackBounds,
  trackIds,
} from './stellar/tracks.js';
import { hypotheticalAt } from './stellar/hr.js';
import { PACE, midMainSequenceFraction, populationOf } from './stellarLab.js';
import { applySelection } from './lesson/starState.js';
import { state } from './appState.js';

export { SCALE };

/**
 * What the model says a staged star is.
 *
 * Three ways for a step to name one, in the order a lesson tends to mean them:
 * a track and an age, which is a modelled star with a mass and a history; a
 * temperature and a luminosity, which is a *hypothetical* point with a radius
 * and nothing else; or a track alone, which is the middle of its main
 * sequence. Nothing is invented: a hypothetical star comes back with no mass
 * and no age, and stays that way all the way to the inspector.
 *
 * @param {object} spec - One entry from a stage's `stars`
 * @returns {?object} A selection, in the shape js/stellarLab.js produces
 */
function resolveStar(spec) {
  // A caller that already has the model's answer - the population stage does,
  // because the survey computed every star's mass and age when it drew them -
  // hands it straight over rather than having it estimated back.
  if (spec.model) return spec.model;
  if (Number.isFinite(spec.teffK) && Number.isFinite(spec.lumSun)) {
    const h = hypotheticalAt(spec.teffK, spec.lumSun);
    return { source: 'free', ...h };
  }
  if (!spec.track) return null;
  const bounds = trackBounds(spec.track);
  if (!bounds) return null;
  // Three ways to say where on the track, matching what the comparison stage
  // already accepts so that a staged star and a pinned one are the same star:
  // an age in years, a fraction of the way through the samples, or nothing,
  // which means part-way along.
  // 'ms' is the middle of the main sequence, defined by the same function the
  // comparison stage uses, so a staged star and a pinned one land in the same
  // place. A bare fraction of the track's span is not the same thing and is
  // not always on the main sequence at all - a forty-solar-mass track spends
  // very little of its length there.
  const s =
    spec.at === 'ms'
      ? stateAtSample(
          spec.track,
          midMainSequenceFraction(spec.track, PACE.PHASE)
        )
      : Number.isFinite(spec.at)
        ? stateAtSample(spec.track, spec.at)
        : stateAtAge(
            spec.track,
            Number.isFinite(spec.ageYr)
              ? spec.ageYr
              : bounds.startYr + (bounds.endYr - bounds.startYr) * 0.4
          );
  if (!s) return null;
  return {
    source: 'model',
    trackId: spec.track,
    teffK: s.teffK,
    luminositySun: s.luminositySun,
    radiusSun: s.radiusSun,
    massSun: s.currentMassSun,
    initialMassSun: s.initialMassSun,
    ageYr: s.ageYr,
    phase: s.phase,
    mainSequenceYr: s.mainSequenceYr,
  };
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
/** The hole declaration in force, so a mass change can restate it. */
let lastHole = null;
/** Labelled "then" copies a reader has pinned, in the order they took them. */
let snapshots = [];
/**
 * A fit that has been asked for and not yet performed.
 *
 * A stage is built during a step change, before the lesson panel and the
 * instrument have been laid out - and on the first step of all, before the
 * application has finished setting up its own camera, which then overwrites
 * whatever the fit did. So the request is recorded here and taken by whoever
 * is in a position to honour it: js/investigations.js calls takeFit() from the
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
  // Every list a stage can place into, not just `stars`. A binary stage puts
  // its two components in bh_list or neutron_stars and a remnant transition
  // moves a star into one of the three remnant lists, so looking only at
  // `stars` answered "no" for those the moment they were staged - which made
  // the panel's restore rebuild the world on every tick, and left the reader
  // watching a randomly named black hole regenerate under the lesson.
  const present = new Set([
    ...stars,
    ...bh_list,
    ...neutron_stars,
    ...white_dwarfs,
  ]);
  return staged.every(entry => present.has(entry.star));
}

/** The declaration the stage was built from, for a rebuild. @returns {?object} */
export const stagedDeclaration = () => lastDeclaration;

/** Which scale the stage is drawn at. @returns {string} */
export const stageScale = () => stagedScale;

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
  pendingFit = false;
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
  // star pair: what the orbiters do outside the horizon is Newtonian gravity,
  // which the integrator computes correctly and the lesson measures.
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
    lastPopulation = out;
    pendingFit = Boolean(stage.fit);
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
    star.massInSuns = massSun;
    star.radius = displayRadius(model.radiusSun, scale);
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

  pendingFit = Boolean(stage.fit);
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
  'white-dwarf': white_dwarfs,
  'neutron-star': neutron_stars,
  'black-hole': bh_list,
};

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
  const list = REMNANT_LISTS[endpoint.kind];
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

  const i = stars.indexOf(old);
  if (i !== -1) stars.splice(i, 1);
  entry.star = body;
  entry.remnantKind = endpoint.kind;
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
 * Pin a labelled copy of a staged star as it is right now.
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
  copy.radius = displayRadius(source.radiusInSuns, stagedScale);
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

/** Drop every pinned snapshot. */
export function clearSnapshots() {
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
export function applyBinaryStage(spec = {}) {
  const kinds = spec.kinds || ['bh', 'bh'];
  const masses = [spec.m1 ?? 36, spec.m2 ?? 29];
  clearWorld();
  stagedKey = JSON.stringify(['binary', kinds, masses]);
  lastDeclaration = { binary: spec };
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
  pendingFit = Boolean(spec.fit);
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
  pendingFit = Boolean(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), {});
  return { built: true, roles: bound.bound };
}

/**
 * Stand one black hole on the canvas, with bodies in orbit around it.
 *
 * The orbit radii are given in Schwarzschild radii of the hole's own mass, so
 * they stay outside the horizon whatever mass a step asks for - a lesson that
 * put a test body inside the horizon would be drawing an orbit that cannot
 * exist. Three R_s is the innermost stable circular orbit for a Schwarzschild
 * hole, so nothing is placed closer than that.
 *
 * Engine-owned. Outside the horizon the field is Newtonian to the accuracy
 * this sandbox works at, so the integrator is entitled to move these and the
 * lesson is entitled to measure what it does.
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
  // Radii in units of the *drawn* horizon, so an orbit is visibly outside the
  // dark disc at any mass. ISCO is the physical floor and is enforced below.
  const drawn = Math.max(hole.radius || 1, 1);
  (spec.orbits || [4.2, 6.4, 9.2, 12.6]).forEach((k, i) => {
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
  pendingFit = Boolean(spec.fit);
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
 * a student can vary except what sits at the centre, and the thing being
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
    { centre: hole, role: 'hole', label: 'Orbiting the black hole' },
    { centre: star, role: 'star', label: 'Orbiting the star' },
  ].forEach(({ centre, role, label }) => {
    const body = new Asteroid(
      { x: centre.pos.x + r, y: centre.pos.y },
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
  pendingFit = Boolean(spec.fit);
  fitAttempts = 0;
  fitApplied = null;
  const bound = bindRoles(rolesOfStage(), {});
  return { built: true, roles: bound.bound, orbitRadius: r };
}

/**
 * Stand two stars on the canvas, on circular orbits about their barycentre.
 *
 * Engine-owned on purpose. "Weighing the Stars" measures a period and a
 * separation off the main scene and puts them into Newton's form of Kepler's
 * third law, so the orbit a student times has to be one the integrator
 * actually produced - a prescribed one would be the lesson quoting its own
 * answer back at itself.
 *
 * The initial conditions come from js/lesson/barycentre.js and carry zero net
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
  pendingFit = Boolean(spec.fit);
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
 * The barycentre of the staged pair, and each star's distance from it.
 *
 * Read live off the bodies rather than from the declaration, so it is a
 * measurement of what the integrator is doing and not a restatement of what it
 * was asked to do. A pair that has drifted says so.
 *
 * @returns {?object} {x, y, arms: [{role, name, r}], separation}
 */
export function stagedBarycentre() {
  const pair = staged.filter(e => e.star && stars.includes(e.star));
  if (pair.length < 2) return null;
  const bodies = pair.map(e => e.star);
  const c = barycentreOf(bodies);
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
 * The components sit either side of the centre of mass in the mass ratio, which
 * is the one piece of orbital mechanics this picture does assert.
 *
 * @param {number} separationRs - Separation, in Schwarzschild radii
 * @param {number} phase - Orbital phase, radians
 * @param {object} [opts] - {m1, m2}
 * @returns {boolean} Whether anything moved
 */
export function placeBinary(separationRs, phase, { m1 = 1, m2 = 1 } = {}) {
  const a = staged.find(e => e.role === 'a');
  const b = staged.find(e => e.role === 'b');
  if (!a || !b || !Number.isFinite(separationRs) || !Number.isFinite(phase)) {
    return false;
  }
  const d = separationRs * UNITS_PER_RS;
  const total = m1 + m2 || 1;
  const ux = Math.cos(phase);
  const uy = Math.sin(phase);
  // Each component's distance from the centre of mass is the *other* one's
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
  if (!staged.length) {
    stagedKey = '';
    return;
  }
  releaseModelOwnership();
  const ours = new Set(staged.map(s => s.star));
  for (let i = stars.length - 1; i >= 0; i--) {
    if (ours.has(stars[i])) stars.splice(i, 1);
  }
  staged = [];
  stagedKey = '';
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
    entry.star.radius = displayRadius(entry.physicalRadiusSun, stagedScale);
  }
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
  const changed = applySelection(entry.star, model);
  entry.model = model;
  entry.physicalRadiusSun = model.radiusSun;
  entry.star.radius = displayRadius(model.radiusSun, stagedScale);
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
  threshold = null,
} = {}) {
  // populationOf answers with the whole synthetic survey - the stars it drew,
  // and what it had to leave out and why - not a bare array. `stars` is the
  // modelled subset, which is what can be put on a canvas or on a diagram; the
  // ones it could not model are counted in the object beside it and belong in
  // the readout rather than being quietly dropped into a total.
  const survey = populationOf({
    populationSeed: seed,
    populationCount: count,
  });
  const all = survey?.stars || [];
  const total = all.length;
  const requested = survey?.requested ?? count;
  const passing = Number.isFinite(threshold)
    ? all.filter(s => s.luminositySun >= threshold)
    : all;
  const wanted = Math.min(show, passing.length);
  const stride = wanted > 0 ? passing.length / wanted : 1;
  const shown = [];
  for (let i = 0; i < wanted; i++) shown.push(passing[Math.floor(i * stride)]);
  return { shown, total, visible: passing.length, requested };
}

/**
 * Stand a population subsample on the canvas.
 *
 * @param {object} spec - See populationSample, plus {spacing, perRow, scale}
 * @returns {{shown: number, total: number, visible: number}} What was staged
 */
export function applyPopulationStage(spec = {}) {
  const { shown, total, visible, requested } = populationSample(spec);
  const stage = {
    spacing: spec.spacing ?? 34,
    perRow: spec.perRow ?? 15,
    scale: spec.scale,
    // No captions: a hundred and twenty masses printed on top of each other is
    // not information. The inspector still gives every one of them in full,
    // and the survey's own counts are in the instrument's readout.
    anonymous: true,
    stars: shown.map((s, i) => ({
      role: `pop-${i}`,
      name: `Star ${s.index ?? i + 1}`,
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
  const key = stagedKey;
  applyStage(stage, { force: true });
  stagedKey = key;
  return { shown: shown.length, total, visible, requested };
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
  const panel = document.getElementById('investigationPanel');
  if (!panel || panel.hidden || !panel.getBoundingClientRect().width) {
    return false;
  }
  // Did the last attempt survive? js/world/build.js sets the camera to the
  // scenario's zoom and the origin whenever the world is rebuilt, and on a
  // first load that happens *after* the lesson has opened - so a single
  // attempt is applied and then silently undone, which is what it did.
  if (fitApplied && sameCamera(fitApplied)) {
    pendingFit = false;
    fitApplied = null;
    return false;
  }
  // Bounded, and small. Two and a half seconds of trying is enough to outlast
  // a boot; beyond that something else genuinely owns the camera and this must
  // stop, because a view that keeps snapping back is worse than one that never
  // moved.
  if (++fitAttempts > MAX_FIT_ATTEMPTS) {
    pendingFit = false;
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

/** Ask for a fit on the next tick. */
export const requestFit = () => {
  pendingFit = true;
  fitAttempts = 0;
  fitApplied = null;
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
  for (const id of ['investigationPanel', 'investigationTool']) {
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
 * nothing to track. It centres once, on request, which is what a reader who
 * has just selected a speck at true scale actually wants.
 *
 * @returns {boolean} Whether the camera moved
 */
export function centreOnSelected() {
  const body = state.selectedObject?.object;
  if (!body?.pos) return false;
  state.pan = { x: -body.pos.x * state.zoom, y: -body.pos.y * state.zoom };
  return true;
}

/** Every bundled track, lightest first, with its birth mass. For a stage. */
export const trackCatalogue = () =>
  trackIds().map(id => ({
    id,
    initialMassSun: trackBounds(id).initialMassSun,
  }));
