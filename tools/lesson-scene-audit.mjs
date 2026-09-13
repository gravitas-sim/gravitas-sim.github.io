#!/usr/bin/env node
// =============================================================================
// What every lesson step does with the main scene
// -----------------------------------------------------------------------------
//   npm run audit:scene              the readable report
//   npm run audit:scene -- --json    the machine-readable catalogue
//   npm run audit:scene -- --write   refresh the catalogue and the record
//   npm run audit:scene -- --check   fail if either is stale, or if the
//                                    hand-written acceptance map disagrees
//
// The question this answers is the one nobody could answer before writing it:
// which of the twenty-one lessons actually connect a student to an object in
// the simulation, and which put an instrument beside the text and leave the
// scene as wallpaper. It is deliberately not a judgement about quality. A
// standalone panel is the right tool for a step about a relationship nobody
// can see on a canvas, and several lessons that never touch a body are better
// for it. What the catalogue is for is knowing which is which, per step, so
// that a decision to connect one can be made from the facts.
//
// Seven things, and they are not the same thing
// -----------------------------------------------------------------------------
// The first version of this file had three categories and one bad habit: a
// step that declared `stage` or `bind` was recorded as scene-connected, which
// silently turned "the lesson stood two stars on the canvas" into "the student
// did an experiment". Those are opposite ends of an activity. Standing an
// object there is the author's work; changing it is the student's.
//
// So a step now carries a set drawn from seven kinds, and any step may have
// several:
//
//   scene-declared          the lesson staged objects, or bound names to
//                           bodies already there. On its own this means the
//                           scene is *available*, and nothing more. It is
//                           never evidence that anybody did anything.
//   student-changes-scene   there is an affordance on this screen that lets a
//                           reader select, place, re-stage or re-point a scene
//                           object, and the step's own answer depends on it.
//   engine-measurement      a number on this screen is read out of the running
//                           N-body integration.
//   model-result            a number on this screen is computed by a
//                           prescribed model - a waveform, an evolutionary
//                           track, an analytic relation - which the integrator
//                           does not produce and cannot check.
//   imported-data           a number or a trace on this screen comes from a
//                           stored dataset. Each one is named, and each says
//                           whether it is an observation or a computed grid,
//                           because a MIST track is imported and is not an
//                           observation.
//   panel-diagram           the instrument on this step is self-contained: it
//                           does not read the scene and the scene does not
//                           read it.
//   captured-evidence       something a reader produced is kept: a notebook
//                           field, a plot, a pinned snapshot, an import from
//                           the selection. Ticking a checklist box is not on
//                           this list, deliberately - a checkbox records that
//                           somebody clicked, not that anything was measured.
//
// A step with none of the seven is prose, and the catalogue says so rather
// than reaching for the nearest category.
//
// The loop
// -----------------------------------------------------------------------------
// Kepler's Laws is the shape the rest are measured against: predict where the
// star sits, run the thing, read the ellipse off the selected body, say what
// it means. Every step already declares a `type`, which is that vocabulary -
// predict, explore, measure, question - so the audit's job is not to invent a
// classification but to check the declared one against the machinery. A step
// typed `measure` with nothing to measure from is the finding; so is a
// `predict` that collects no commitment.
//
// How it decides, and what it will not guess
// -----------------------------------------------------------------------------
// Everything below is read off step data, widget declarations and module
// source, never inferred from prose. Where the data does not say, the entry
// says so rather than a plausible guess, because a catalogue that quietly
// invents is worse than a short one.
//
// The one piece of static analysis is the identifier scan: `ctx.*` calls,
// `ctx.find('X')` and `ctx.seenFrom(_, 'X')` are read out of the source text
// of a step's own functions and of the widget it names. Those two find calls
// are how a lesson names a body without binding it, and both are
// case-insensitive substring matches over every body in the world - which is
// why they are collected under `nameMatches` and flagged. js/lesson/binding.js
// is the exact-match replacement.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { allWidgets, whenWidgetsReady } from '../js/widgets.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE = resolve(ROOT, 'docs/lesson-scene-catalogue.json');
const RECORD = resolve(ROOT, 'docs/lesson-scene-record.md');
const ACCEPTANCE = resolve(ROOT, 'docs/lesson-acceptance.json');
const PROVENANCE = resolve(ROOT, 'js/data/investigations/provenance.js');

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const wantCheck = args.includes('--check');

/** The seven kinds. A step's `kinds` is a subset; several is normal. */
const KIND = {
  DECLARED: 'scene-declared',
  STUDENT: 'student-changes-scene',
  ENGINE: 'engine-measurement',
  MODEL: 'model-result',
  DATA: 'imported-data',
  DIAGRAM: 'panel-diagram',
  EVIDENCE: 'captured-evidence',
};

/**
 * Every key on the probe context, and what reaching for it means.
 *
 * `read`     live state of the running integration
 * `mutate`   changes a scene object; the student's control ends up here
 * `model`    a prescribed calculation that the integrator does not produce
 * `keep`     stores something a reader made
 * `format`   turns a number into a string; not a measurement of anything
 * `meta`     housekeeping - the mode, the scale, the stage key
 *
 * Hand-classified because the distinction is semantic, and checked against
 * usage below: a `ctx.something` in any lesson or widget that is missing from
 * this table fails the audit rather than being quietly ignored. That is the
 * only way the table cannot rot as js/investigations.js grows.
 */
const CTX = {
  // live reads
  selected: 'read',
  bodies: 'read',
  elements: 'read',
  energy: 'read',
  clock: 'read',
  flux: 'read',
  days: 'read',
  observerAngle: 'read',
  photometry: 'read',
  rotationCurve: 'read',
  cluster: 'read',
  haloOn: 'read',
  frame: 'read',
  seenFrom: 'read',
  find: 'read',
  role: 'read',
  roleStatus: 'read',
  roleOf: 'read',
  roles: 'read',
  barycentre: 'read',
  rvNow: 'read',
  conservation: 'read',
  transitGeometry: 'read',
  dominantPrimary: 'read',
  stagedSample: 'read',
  population: 'read',
  experiment: 'read',
  runMatchesScene: 'read',
  // a live read with a prescribed model applied on top of it
  habitability: 'model',
  holeFacts: 'model',
  remnantKindOf: 'model',
  // changes a scene object
  selectId: 'mutate',
  selectRole: 'mutate',
  restageStar: 'mutate',
  restageStarPair: 'mutate',
  restageBinary: 'mutate',
  restageHole: 'mutate',
  restagePopulation: 'mutate',
  becomeRemnant: 'mutate',
  placeBinary: 'mutate',
  setSourceMode: 'mutate',
  pulseSource: 'mutate',
  showEvolutionScene: 'mutate',
  clearEvolutionScene: 'mutate',
  showWavefronts: 'mutate',
  // keeps something
  pinSnapshot: 'keep',
  snapshots: 'keep',
  evidence: 'keep',
  // formatting and housekeeping
  distance: 'format',
  speed: 'format',
  time: 'format',
  mass: 'format',
  years: 'format',
  au: 'format',
  G: 'format',
  mode: 'meta',
  stageKey: 'meta',
  binaryScale: 'meta',
  seed: 'meta',
};

/**
 * Stored datasets, and what each one actually is.
 *
 * The distinction the `origin` field carries is the one an introductory
 * student is most often not told: MIST tracks are imported, and they are not
 * observations. They are a published grid of stellar structure calculations.
 * Calling both "real data" in the same catalogue would make the catalogue
 * useless for the one question it exists to answer.
 */
const DATASETS = {
  'js/data/gw/gw150914.js': {
    name: 'GW150914 strain, as published',
    origin: 'observation',
  },
  'js/data/trappist1.js': {
    name: 'TRAPPIST-1 system parameters',
    origin: 'observation',
  },
  'js/data/exoplanetSystems.js': {
    name: 'Published exoplanet system parameters',
    origin: 'observation',
  },
  'js/data/stellar/mistTracks.js': {
    name: 'MIST v1.2 evolutionary tracks',
    origin: 'computed-grid',
  },
};

/**
 * Members of a 2D drawing context, which is also conventionally called `ctx`.
 *
 * Only live widgets are handed the probe context at all, so a non-live
 * widget's `ctx.` is always the canvas and is never scanned. This list is the
 * safety net for the other direction: a helper inside a live family that
 * takes a drawing context under the same name. Without it the audit reported
 * `fillRect` as an unclassified probe key, which is noise that would train
 * somebody to ignore the one message this tool prints when it is genuinely
 * confused.
 */
const CANVAS_2D = new Set([
  'arc',
  'arcTo',
  'beginPath',
  'bezierCurveTo',
  'clearRect',
  'clip',
  'closePath',
  'createLinearGradient',
  'createPattern',
  'createRadialGradient',
  'drawImage',
  'ellipse',
  'fill',
  'fillRect',
  'fillStyle',
  'fillText',
  'filter',
  'font',
  'getImageData',
  'globalAlpha',
  'globalCompositeOperation',
  'imageSmoothingEnabled',
  'lineCap',
  'lineDashOffset',
  'lineJoin',
  'lineTo',
  'lineWidth',
  'measureText',
  'miterLimit',
  'moveTo',
  'putImageData',
  'quadraticCurveTo',
  'rect',
  'resetTransform',
  'restore',
  'rotate',
  'roundRect',
  'save',
  'scale',
  'setLineDash',
  'setTransform',
  'shadowBlur',
  'shadowColor',
  'stroke',
  'strokeRect',
  'strokeStyle',
  'strokeText',
  'textAlign',
  'textBaseline',
  'transform',
  'translate',
]);

// -----------------------------------------------------------------------------
// Reading the source, so that nothing here is a guess about prose
// -----------------------------------------------------------------------------

const fileCache = new Map();

/** One project file's text, read once. */
async function fileText(rel) {
  if (!fileCache.has(rel)) {
    fileCache.set(
      rel,
      await readFile(resolve(ROOT, rel), 'utf8').catch(() => '')
    );
  }
  return fileCache.get(rel);
}

/**
 * Every project file a module can reach.
 *
 * Every relative `.js` string literal counts, which picks up dynamic imports
 * as well as static ones. Over-inclusive on purpose: a module that mentions a
 * path in a comment gets counted, and the cost of that is a dataset
 * attribution that names one module too many, which the `via` field makes
 * visible. The opposite mistake - missing the lazily imported track grid, as
 * an earlier `from`-anchored pattern did - is the one that produces a wrong
 * answer instead of a wordy one.
 */
async function importsOf(rel) {
  const text = await fileText(rel);
  const out = [];
  for (const m of text.matchAll(/'(\.\.?\/[^']*\.js)'/g)) {
    out.push(relative(ROOT, resolve(dirname(resolve(ROOT, rel)), m[1])));
  }
  return out;
}

/** The names a module exports. */
async function exportsOf(rel) {
  const text = await fileText(rel);
  const out = new Set();
  const decl = /export\s+(?:async\s+)?(?:const|let|function|class)\s+([\w$]+)/g;
  for (const m of text.matchAll(decl)) out.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (name) out.add(name);
    }
  }
  return [...out];
}

/**
 * identifier -> {dataset, via} for every name that carries stored data.
 *
 * Built by walking out from each widget family and asking which modules can
 * reach a dataset at all; every name those modules export is then a name that
 * may be carrying the data. Scanning a widget's own functions for those names
 * is what attributes a dataset to a widget rather than to a whole family -
 * the difference between "the habitability widgets can see TRAPPIST-1" and
 * "hz-trappist draws it".
 */
async function datasetNames(familyModules) {
  const reach = new Map();
  const reaches = async (rel, seen = new Set()) => {
    if (reach.has(rel)) return reach.get(rel);
    if (seen.has(rel)) return new Set();
    seen.add(rel);
    const out = new Set();
    if (DATASETS[rel]) out.add(rel);
    for (const dep of await importsOf(rel)) {
      for (const d of await reaches(dep, seen)) out.add(d);
    }
    reach.set(rel, out);
    return out;
  };
  const byFamily = new Map();
  for (const fam of familyModules) {
    const names = new Map();
    byFamily.set(fam, names);
    const graph = new Set();
    const queue = [fam];
    while (queue.length) {
      const cur = queue.pop();
      if (graph.has(cur)) continue;
      graph.add(cur);
      for (const dep of await importsOf(cur)) queue.push(dep);
    }
    for (const mod of graph) {
      if (mod === fam) continue;
      const hits = await reaches(mod);
      if (!hits.size) continue;
      for (const name of await exportsOf(mod)) {
        if (!names.has(name)) {
          names.set(name, { datasets: [...hits], via: mod });
        }
      }
    }
  }
  return byFamily;
}

/** Which widget ids each family module contributes, for the dataset scan. */
async function widgetFamilies() {
  const text = await fileText('js/widgets.js');
  const out = new Map();
  for (const m of text.matchAll(/from\s*'\.\/(\w+Widgets\.js)'/g)) {
    const rel = `js/${m[1]}`;
    const mod = await import(`../${rel}`);
    for (const value of Object.values(mod)) {
      if (!Array.isArray(value)) continue;
      for (const widget of value) {
        if (widget && typeof widget.id === 'string') out.set(widget.id, rel);
      }
    }
  }
  return out;
}

/** The source text of every function a step carries, concatenated. */
function stepSource(step) {
  const parts = [];
  for (const key of ['probe', 'validate', 'importFromSelection', 'plot']) {
    const value = step[key];
    if (typeof value === 'function') parts.push(value.toString());
    else if (value && typeof value === 'object') {
      for (const inner of Object.values(value)) {
        if (typeof inner === 'function') parts.push(inner.toString());
      }
    }
  }
  for (const field of step.fields || []) {
    if (typeof field.compute === 'function')
      parts.push(field.compute.toString());
  }
  return parts.join('\n');
}

/**
 * A widget's controls, presets or buttons as a list.
 *
 * Several widgets compute one of the three from the current values - the
 * gravitational-wave lab's buttons change with the source, the stellar lab's
 * with what is pinned - so the declaration is a function. Called with an empty
 * value set to get the resting list, and any that refuses is recorded as
 * empty rather than guessed at.
 *
 * @param {Array|Function|undefined} value - A widget's declaration
 * @returns {Array} The list, possibly empty
 */
function listOf(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'function') return [];
  try {
    const out = value({});
    return Array.isArray(out) ? out : [];
  } catch {
    return [];
  }
}

/**
 * The source text of a widget's own functions.
 *
 * A live widget is the other half of a step's connection to the scene, and
 * leaving it out was the reason the population and evolution screens looked
 * inert in the catalogue: the step declares `tool`, and every `ctx.role(...)`
 * and `ctx.restagePopulation(...)` that makes the screen work lives in the
 * widget, not in the step.
 */
function widgetSource(widget) {
  if (!widget) return '';
  const parts = [];
  for (const key of ['compute', 'readout', 'draw', 'step', 'reset', 'act']) {
    if (typeof widget[key] === 'function') parts.push(widget[key].toString());
  }
  for (const key of ['controls', 'presets', 'actions']) {
    if (typeof widget[key] === 'function') parts.push(widget[key].toString());
  }
  for (const preset of listOf(widget.presets)) {
    if (typeof preset.apply === 'function') parts.push(preset.apply.toString());
    parts.push(JSON.stringify(preset.values ?? {}));
  }
  return parts.join('\n');
}

/**
 * Every top-level function in a module, by name, with its body.
 *
 * Brace-counted rather than parsed. A brace inside a string or a comment can
 * make one of these bodies run long, and the only consequence is that a
 * helper picks up the text of whatever follows it in the same file - which
 * adds probe keys that were already somewhere in that module. The opposite
 * error, stopping short, would lose them, so it counts generously on purpose.
 *
 * @param {string} text - A module's source
 * @returns {Map<string, string>} name -> body text
 */
function moduleFunctions(text) {
  const out = new Map();
  const decl =
    /(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(|(?:^|\n)(?:export\s+)?const\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>/g;
  for (const m of text.matchAll(decl)) {
    const name = m[1] || m[2];
    // Past the parameter list before looking for the body, because a default
    // value is an object literal often enough to matter: `function
    // syncSource(v, ctx, spec = {})` gave up its whole body to the `{}` in
    // its own signature, and every gravitational-wave screen was catalogued
    // as touching nothing.
    let cursor = m.index + m[0].length - 1;
    if (m[1]) {
      let parens = 0;
      for (; cursor < text.length; cursor++) {
        if (text[cursor] === '(') parens++;
        else if (text[cursor] === ')' && --parens === 0) break;
      }
    }
    const open = text.indexOf('{', cursor);
    if (open < 0) continue;
    let depth = 0;
    let end = open;
    for (; end < text.length; end++) {
      if (text[end] === '{') depth++;
      else if (text[end] === '}' && --depth === 0) break;
    }
    out.set(name, text.slice(open, end + 1));
  }
  return out;
}

/**
 * A widget's own source plus the bodies of the module helpers it calls.
 *
 * Without this the audit read the gravitational-wave and stellar screens as
 * inert: the step declares `tool`, the widget's `draw` calls `syncSource(v,
 * ctx)`, and every `ctx.setSourceMode` and `ctx.restageBinary` that makes
 * those screens change the scene lives one function away. Expanded three
 * deep, which reaches all of them today and terminates on anything mutually
 * recursive.
 *
 * @param {string} source - The widget's own function text
 * @param {Map<string, string>} fns - The family module's functions
 * @returns {string} Source plus everything it reaches
 */
function withHelpers(source, fns, depth = 3) {
  let text = source;
  const seen = new Set();
  for (let round = 0; round < depth; round++) {
    const before = seen.size;
    for (const [name, body] of fns) {
      if (seen.has(name)) continue;
      if (!new RegExp(`\\b${name}\\s*\\(`).test(text)) continue;
      seen.add(name);
      text += `\n${body}`;
    }
    if (seen.size === before) break;
  }
  return text;
}

/** Body names a step reaches for by substring match, the unbound way in. */
function nameMatchesIn(source) {
  const out = new Set();
  for (const m of source.matchAll(/\bctx\??\.find\(\s*'([^']*)'/g))
    out.add(m[1]);
  for (const m of source.matchAll(/\bctx\??\.find\(\s*"([^"]*)"/g))
    out.add(m[1]);
  for (const m of source.matchAll(/seenFrom\([^,]+,\s*'([^']*)'/g))
    out.add(m[1]);
  return [...out];
}

/** Which ctx keys a piece of source touches. */
function ctxKeysIn(source) {
  const out = new Set();
  // `ctx?.experiment?.()` is as common as `ctx.experiment()` in widgets that
  // have to work with no simulation loaded, and missing the optional form
  // read the whole chaos family as touching nothing.
  for (const m of source.matchAll(/\bctx\??\.([A-Za-z_]\w*)/g)) out.add(m[1]);
  return [...out].sort();
}

/** Those ctx keys, grouped by what reaching for them means. */
function ctxRoles(keys) {
  const out = { read: [], mutate: [], model: [], keep: [], unknown: [] };
  for (const key of keys) {
    if (CANVAS_2D.has(key)) continue;
    const role = CTX[key];
    if (role === 'format' || role === 'meta') continue;
    if (out[role]) out[role].push(key);
    else out.unknown.push(key);
  }
  return out;
}

/** How many objects a step's own stage stands on the canvas. */
function stagedCount(step) {
  if (!step.stage) return 0;
  if (step.stage.population) return step.stage.population.show ?? 0;
  // A binary stage names its two components by kind rather than listing them,
  // so counting `stars` alone recorded the gravitational-wave lessons as
  // staging nothing - a catalogue that said "no objects" about the two bodies
  // the whole lesson is spent selecting.
  if (step.stage.binary) return step.stage.binary.kinds?.length ?? 2;
  // A star pair names its two members by mass rather than listing them.
  if (step.stage.starPair) return 2;
  if (step.stage.hole) return 1 + (step.stage.hole.orbits?.length ?? 4);
  if (step.stage.equalMass) return 4;
  return step.stage.stars?.length ?? 0;
}

/**
 * Whether the world is running when this step is reached.
 *
 * Carried forward from the last step that named a setup, because that is how
 * the app behaves: `paused: false` starts it and the following steps inherit
 * a running world until something pauses it again. Reading only the step's
 * own setup catalogued "let it run for fifty conjunctions" as a step with
 * nothing to do.
 *
 * @returns {boolean|'inherited'} true, false, or inherited from before the lesson
 */
function runningAt(inv, index) {
  for (let i = index; i >= 0; i--) {
    const setup = inv.steps[i].setup;
    if (setup && setup.paused !== undefined) return setup.paused === false;
    if (inv.steps[i].pauseAt) return true;
  }
  return 'inherited';
}

/**
 * What a reader is allowed to touch here, lesson lock included.
 *
 * `lock.inspector === false` opens the inspector for a whole lesson, which is
 * how the retrograde lesson expects somebody to switch a reference frame -
 * an affordance that exists on every one of its steps and appears in none of
 * their declarations. Recorded apart from `kinds`, because being able to open
 * the inspector is not the same as the step's answer depending on it.
 */
function affordancesFor(step, inv) {
  const lock = inv.lock || {};
  return {
    inspector:
      step.allowInspector === true
        ? 'this step'
        : lock.inspector === false
          ? 'whole lesson'
          : 'locked',
    placement:
      step.allowPlacement === true
        ? 'this step'
        : lock.placement === true
          ? 'locked'
          : 'open',
    areaSweep: lock.areaSweep === false ? 'whole lesson' : 'locked',
  };
}

/** What kind of thing a stage stands there. */
function stageKind(stage) {
  if (stage.population) return 'population';
  if (stage.binary) return 'binary';
  if (stage.starPair) return 'star-pair';
  if (stage.hole) return 'black-hole';
  if (stage.equalMass) return 'equal-mass-pair';
  return 'named';
}

/**
 * What a student physically does on this step.
 *
 * A stage is not on this list and neither is a bind. Standing objects on the
 * canvas is the author's action, not the reader's, and recording it as one
 * was how the previous version of this file reported twenty-one lessons full
 * of experiments that nobody performs.
 */
function actionsFor(step, widget, ctxOf, running, affordances) {
  const out = [];
  if (step.type === 'predict') {
    out.push(
      step.options || step.answer !== undefined || step.fields?.length
        ? 'commit-a-prediction'
        : 'read-a-prediction-prompt-that-collects-nothing'
    );
  } else if (step.options) out.push('choose-an-option');
  if (step.kind === 'short' || step.rubric) out.push('answer-in-words');
  if (step.fields?.length) out.push('record-values');
  if (step.importFromSelection) out.push('import-from-the-selection');
  // The inspector is the affordance a lesson most often relies on without
  // declaring: `lock.inspector === false` opens it for the whole lesson, and
  // the retrograde lesson's "switch its Reference frame on in the inspector"
  // is written in prose on a step that declares nothing at all. Listed where
  // the step has a probe, which is where it would be used.
  if (
    step.allowInspector ||
    (affordances.inspector !== 'locked' && step.probe)
  ) {
    out.push('open-a-body-inspector');
  }
  if (step.allowPlacement) out.push('place-an-object');
  if (ctxOf.step.read.includes('selected')) out.push('select-a-body');
  if (ctxOf.step.mutate.length || ctxOf.widget.mutate.length) {
    out.push('change-a-scene-object');
  }
  if (listOf(widget?.controls).length) out.push('move-an-instrument-control');
  if (listOf(widget?.presets).length) out.push('press-an-instrument-preset');
  if (listOf(widget?.actions).length) out.push('press-an-instrument-button');
  // Letting the world run is not changing an object and it is not nothing
  // either: several of these lessons are built on "start it and watch". It
  // counts only where the step depends on the run, though - every step after
  // the first `paused: false` inherits a running world, and listing it
  // unconditionally made "read this paragraph" an experiment.
  const usesTheRun =
    step.probe ||
    step.tool ||
    step.fields?.length ||
    step.checklist?.length ||
    step.pauseAt ||
    step.lightCurve;
  if (running === true && usesTheRun) out.push('run-the-simulation');
  if (
    ctxOf.step.read.includes('experiment') ||
    ctxOf.widget.read.includes('experiment') ||
    ctxOf.step.read.includes('runMatchesScene') ||
    ctxOf.widget.read.includes('runMatchesScene')
  ) {
    out.push('run-a-bench-experiment');
  }
  if (step.pauseAt) out.push('run-to-an-armed-event');
  if (step.lightCurve) out.push('record-a-light-curve');
  if (step.plot) out.push('build-a-plot');
  if (step.showAreaSweep) out.push('watch-the-area-sweep');
  if (step.showBarycentre) out.push('watch-the-balance-point');
  if (step.explainView) out.push('read-the-labelled-appearance');
  if (step.observerAngle !== undefined) out.push('view-from-a-set-angle');
  // Deliberately last, and deliberately not evidence anywhere below: a tick
  // records that somebody clicked a box.
  if (step.checklist?.length) out.push('tick-a-checklist');
  return out.length ? out : ['read'];
}

/**
 * Which of the seven kinds apply.
 *
 * The one rule worth stating out loud, because it decides most of the table:
 * a live widget with no controls and no presets has nothing of its own to
 * vary, so everything it shows came out of the scene. A live widget that does
 * have controls is running a model beside the scene, and both belong in the
 * set. That is a property of the widget's declaration, not a hand-kept list,
 * which is what the previous by-module list could not manage.
 */
function kindsFor(step, widget, ctxOf, datasets) {
  const out = new Set();
  if (step.stage || step.bind) out.add(KIND.DECLARED);

  if (
    step.allowPlacement ||
    step.allowInspector ||
    step.importFromSelection ||
    ctxOf.step.read.includes('selected') ||
    ctxOf.step.mutate.length ||
    ctxOf.widget.mutate.length
  ) {
    out.add(KIND.STUDENT);
  }

  if (
    ctxOf.step.read.length ||
    ctxOf.widget.read.length ||
    step.pauseAt ||
    step.lightCurve ||
    step.showAreaSweep ||
    step.showBarycentre
  ) {
    out.add(KIND.ENGINE);
  }

  if (ctxOf.step.model.length || ctxOf.widget.model.length) {
    out.add(KIND.MODEL);
  }
  if (widget) {
    const ownModel =
      !widget.live ||
      listOf(widget.controls).length > 0 ||
      listOf(widget.presets).length > 0;
    if (ownModel) out.add(KIND.MODEL);
    if (!widget.live) out.add(KIND.DIAGRAM);
  }
  if (datasets.length) out.add(KIND.DATA);

  if (
    step.fields?.length ||
    step.plot ||
    step.importFromSelection ||
    step.tool?.capture ||
    ctxOf.step.keep.length
  ) {
    out.add(KIND.EVIDENCE);
  }
  return [...out];
}

/**
 * What, if anything, this step leaves behind.
 *
 * A checklist is not here. So is a `type: 'question'` with an answer key: the
 * reader's choice is marked and then forgotten, which is fine for a check of
 * understanding and is not a record of a measurement.
 */
function evidenceFor(step, ctxOf) {
  const out = [];
  if (step.fields?.length) out.push('notebook-fields');
  if (step.tool?.capture) out.push('instrument-capture');
  if (step.plot) out.push('plot');
  if (step.importFromSelection) out.push('imported-from-scene');
  if (ctxOf.step.keep.includes('pinSnapshot')) out.push('pinned-snapshot');
  return out;
}

/** Which datasets this step's instrument actually draws on. */
function datasetsFor(widget, source, names) {
  if (!widget) return [];
  const out = new Map();
  for (const [name, hit] of names) {
    if (!new RegExp(`\\b${name}\\b`).test(source)) continue;
    for (const key of hit.datasets) {
      if (!out.has(key)) {
        out.set(key, { ...DATASETS[key], dataset: key, via: hit.via });
      }
    }
  }
  return [...out.values()];
}

/** The four stations of the loop, as the step's own `type` claims them. */
const DECLARED_ROLE = {
  predict: 'predict',
  explore: 'experiment',
  measure: 'measure',
  question: 'interpret',
  read: 'read',
};

/** The stations the step's machinery can actually support. */
function actualRoles(step, kinds, actions, affordances, running) {
  const out = [];
  if (actions.includes('commit-a-prediction')) out.push('predict');
  if (
    kinds.includes(KIND.STUDENT) ||
    actions.includes('move-an-instrument-control') ||
    actions.includes('press-an-instrument-preset') ||
    actions.includes('press-an-instrument-button') ||
    actions.includes('run-to-an-armed-event') ||
    actions.includes('run-the-simulation') ||
    actions.includes('run-a-bench-experiment') ||
    (affordances.inspector !== 'locked' && step.probe) ||
    // Pause and run are never locked by a lesson, so a step with a live
    // readout and a world that is not held paused is one a reader takes a
    // measurement on by stopping it at the right moment. Weighing the Stars
    // says exactly that in its checklist - "Pause the sandbox and look at the
    // two dashed lines" - on a step that declares no instrument and closes
    // the inspector on purpose.
    (running !== false && step.probe && kinds.includes(KIND.ENGINE))
  ) {
    out.push('experiment');
  }
  // Two different ways to measure, and both count: reading a number off
  // something, and writing one down. A step with fields and no reader of its
  // own is a transcription of what the previous screen showed - real, and
  // recorded as `handTranscribed` so that nobody mistakes it for a probe.
  const reads = step.probe || step.tool || step.plot;
  const measures =
    kinds.includes(KIND.ENGINE) ||
    kinds.includes(KIND.MODEL) ||
    kinds.includes(KIND.DATA);
  if ((reads && measures) || step.fields?.length) out.push('measure');
  if (step.rubric || step.validate || step.answer !== undefined) {
    out.push('interpret');
  }
  return out.length ? out : ['read'];
}

/**
 * Where a step's declared type outruns what is on the screen.
 *
 * Four rules, and the one that is deliberately absent: a staged scene whose
 * measurement comes from a prescribed model rather than from the integrator
 * is not a defect. That is what the gravitational-wave and stellar screens
 * are, honestly labelled, and an earlier rule that flagged twenty of them
 * would have trained a reader to skip this list.
 */
function mismatchFor(step, declared, actual) {
  if (declared === 'predict' && !actual.includes('predict')) {
    return 'typed predict but collects no commitment';
  }
  if (declared === 'measure' && !actual.includes('measure')) {
    return 'typed measure but there is nothing to read and nowhere to write it';
  }
  if (declared === 'experiment' && !actual.includes('experiment')) {
    return (
      'typed explore, but nothing in the step, its instrument, its setup or ' +
      'its lesson lock offers anything to change, run or record - if there is ' +
      "an affordance it is in the app's own panels and the step never names it"
    );
  }
  if (declared === 'interpret' && !actual.includes('interpret')) {
    return 'typed question but no answer, rubric or validate to check it';
  }
  return null;
}

/**
 * The prediction/experiment/measurement/interpretation loops in one lesson.
 *
 * A loop opens on a step typed `predict` and closes on the first step typed
 * `question` that comes after something measurable. Everything between is the
 * experiment. A loop that never closes is reported as open rather than
 * quietly dropped, because an unanswered prediction is the most common way
 * one of these activities is left half-built.
 */
function loopsFor(steps) {
  const loops = [];
  let active = null;
  const pending = [];
  const close = loop => {
    // Two different things, and conflating them flattered the catalogue.
    // `closed` means the prediction was eventually returned to. `complete`
    // means a number came back before it was: predict, do, measure, answer,
    // in that order.
    loop.closed = Boolean(loop.interpret);
    loop.complete = Boolean(loop.interpret && loop.measuredBeforeAnswering);
    loops.push(loop);
  };
  const settle = (loop, s, byExperiment) => {
    loop.interpret = s.sid;
    // The settling step counts. A prediction held across later predictions
    // stops collecting steps of its own, so without this a loop answered by
    // the measurement it named would be recorded as having measured nothing.
    loop.measuredBeforeAnswering =
      loop.measure.length > 0 || s.loop.actual.includes('measure');
    loop.explained = s.asks.short;
    loop.answeredByTheExperiment = byExperiment;
  };
  for (const s of steps) {
    if (s.loop.declared === 'predict') {
      // A held prediction survives the next prediction. Closing on it, as an
      // earlier version did, reported the Lives of Stars opener as abandoned
      // when in fact it is answered twenty-nine steps later, at the step it
      // names - which is the whole point of holding it.
      if (active) {
        if (active.interpret || !active.heldUntil) close(active);
        else pending.push(active);
      }
      active = {
        predict: s.sid,
        predictCollects: s.loop.actual.includes('predict'),
        heldUntil: s.reveal,
        experiment: [],
        measure: [],
        evidence: [],
        interpret: null,
        measuredBeforeAnswering: false,
        explained: false,
        answeredByTheExperiment: false,
      };
      continue;
    }
    if (active) {
      if (s.loop.actual.includes('experiment')) active.experiment.push(s.sid);
      if (s.loop.actual.includes('measure')) active.measure.push(s.sid);
      if (s.kinds.includes(KIND.EVIDENCE)) active.evidence.push(s.sid);
      // A loop closes where the prediction is settled. Three ways: a step
      // typed `question`, a measurement step that ends in a short written
      // answer, or - best of the three - the step the prediction was held
      // for, where the result arrives and the reader is shown what they said
      // against what happened.
      if (
        !active.interpret &&
        (s.loop.declared === 'interpret' ||
          s.asks.short ||
          s.sid === active.heldUntil) &&
        (active.measure.length || active.experiment.length)
      ) {
        settle(active, s, s.sid === active.heldUntil);
      }
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].heldUntil !== s.sid) continue;
      settle(pending[i], s, true);
      close(pending.splice(i, 1)[0]);
    }
  }
  if (active) {
    if (active.interpret || !active.heldUntil) close(active);
    else pending.push(active);
  }
  for (const loop of pending) close(loop);
  // Written back in the order the predictions are made, because the record
  // reads them as a lesson's spine and a held one would otherwise appear at
  // the end.
  const order = new Map(steps.map((s, i) => [s.sid, i]));
  loops.sort((a, b) => order.get(a.predict) - order.get(b.predict));
  return loops;
}

/** What this step does to the world on the way in. */
function resetFor(step, inv, index) {
  const out = [];
  if (step.setup) {
    out.push(
      `rebuilds: scenario "${step.setup.scenario}"` +
        (step.setup.seed ? ` seed ${step.setup.seed}` : '') +
        (step.setup.camera ? ' + camera' : '') +
        (step.setup.settings ? ' + settings' : '')
    );
  } else if (index === 0) {
    out.push('inherits the world already on screen');
  }
  if (step.clearLightCurve) out.push('clears the recorded light curve');
  if (step.tool && step.tool.values) out.push('stamps instrument values');
  if (inv.lock) {
    const locked = Object.entries(inv.lock)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (locked.length) out.push(`lesson locks: ${locked.join(', ')}`);
  }
  return out;
}

/**
 * How a student gets out of trouble on this step.
 *
 * The five ways an activity strands somebody, and what answers each:
 *
 *   picked the wrong body   Re-selecting and importing again overwrites the
 *                           row, so a wrong click costs a click. A step whose
 *                           only path in is `ctx.selected` with no import and
 *                           no binding is harder: the reader has to know which
 *                           body was meant.
 *   missed the moment       An armed event stops the run at it, so catching
 *                           ingress or periapsis is not a reflex test. Without
 *                           one, the only recovery is to wait a whole period.
 *   the world reset         A step that names a setup rebuilds the scenario
 *                           when it is reached, which throws away a
 *                           part-finished measurement on the screen before it.
 *   nothing came back       A measurement can legitimately produce no number -
 *                           an unbound role, a body with no closed orbit, a
 *                           track that ends. A probe that has a branch for
 *                           that says so; one that does not prints a dash and
 *                           leaves the reader guessing whether they are the
 *                           problem.
 *   the answer was fuzzy    A tolerance says how close counts, but only where
 *                           something is being marked. A notebook field that
 *                           nothing judges is a record, not a fuzzy answer.
 *
 * Recorded per step rather than per lesson because it varies per step, and it
 * is the half of an activity that never gets designed until somebody is stuck.
 */
function recoveryFor(step, inv, index, ctxOf, source) {
  const out = [];
  const previous = inv.steps[index - 1];
  if (step.importFromSelection) {
    out.push('wrong body: select another and import again, which overwrites');
  } else if (step.bind) {
    out.push('wrong body: the step binds the object by name, so there is none');
  } else if (step.stage) {
    out.push('wrong body: the object list names what the step staged');
  } else if (ctxOf.step.read.includes('selected')) {
    out.push('wrong body: nothing names the intended one - prose only');
  }
  if (step.pauseAt) {
    out.push(
      `missed moment: an event watch stops the run at ${step.pauseAt.kind}`
    );
  } else if (step.fields?.length && !step.tool) {
    out.push(
      'missed moment: nothing stops the run here, so a reading that changes with time has to be caught by hand'
    );
  }
  if (step.setup?.scenario) {
    out.push(
      previous?.fields?.length
        ? "reset: rebuilds the scenario, discarding the previous step's scene"
        : 'reset: rebuilds the scenario on arrival'
    );
  }
  if (step.probe) {
    // Four ways a probe can answer "there is nothing to read", and they are
    // not equivalent. A named absence tells a reader they have not broken
    // anything; a dash tells them nothing at all. An earlier version of this
    // scan recognised only the `if (!body) return` form and reported
    // forty-nine probes as unguarded when most of them guard with a ternary.
    const spoken =
      /on the canvas|not found|no orbit|no runs|no overlap|unavailable|nothing selected|building the system|waiting for|click (a|the|\w+)|select (a|the|\w+)/i.test(
        source
      );
    const dash = /value:\s*['"][-\u2013\u2014]['"]/.test(source);
    const guarded = /if\s*\(\s*!/.test(source) || /\?\?/.test(source);
    out.push(
      spoken
        ? 'null result: the probe names what is missing'
        : dash
          ? 'null result: the probe prints a dash and does not say why'
          : guarded
            ? 'null result: guarded, but the fallback is not spelled out'
            : 'null result: no branch for a missing body or a missing orbit'
    );
  }
  if (step.fields?.length) {
    // A tolerance only means anything where something is being marked. Most
    // of these fields are a notebook: the reader writes a number down and
    // nothing judges it, and calling that "ambiguous" put ninety-four
    // findings in front of a reader that were not findings.
    // Where a step does mark what was typed, the recoverable question is not
    // whether a `tolerance` field exists - these checks carry their own
    // thresholds inline - but whether a refusal says anything. A validate
    // that returns false with no note tells a reader "no" and nothing else.
    const check = String(
      typeof step.validate === 'function' ? step.validate.toString() : ''
    );
    // The renderer takes {level, message} and shows the message in the check
    // slot; a validate that returns anything else is silently useless, and
    // one that refuses with no message tells a reader "no" and nothing else.
    const shape = /level:\s*'(ok|warn|error)'/.test(check);
    const speaks = /\bmessage\b/.test(check);
    out.push(
      !step.validate
        ? 'ambiguous result: nothing marks these, they are a record'
        : shape && speaks
          ? 'ambiguous result: the check says in words how close is close enough'
          : 'ambiguous result: the check refuses without saying why'
    );
  }
  return out;
}

/** Build the whole catalogue. */
async function audit() {
  const widgets = new Map(allWidgets().map(w => [w.id, w]));
  const families = await widgetFamilies();
  const names = await datasetNames([...new Set(families.values())]);
  const familyText = new Map();
  for (const rel of new Set(families.values())) {
    familyText.set(rel, moduleFunctions(await fileText(rel)));
  }
  const widgetSources = new Map(
    [...widgets].map(([id, w]) => [
      id,
      withHelpers(
        widgetSource(w),
        familyText.get(families.get(id)) ?? new Map()
      ),
    ])
  );
  const unknownCtx = new Set();

  const lessonHelpers = new Map();
  for (const inv of INVESTIGATIONS) {
    lessonHelpers.set(
      inv.id,
      moduleFunctions(await fileText(`js/data/investigations/${inv.id}.js`))
    );
  }

  const lessons = INVESTIGATIONS.map(inv => {
    const steps = inv.steps.map((step, index) => {
      // Lesson files factor their probes: half of Tides reads through one
      // `tideRows` helper and the transit lesson through `transitRows`. A scan
      // that stopped at the step's own arrow function reported both as having
      // no answer for a missing body, when the answer is one call away.
      const source = withHelpers(
        stepSource(step),
        lessonHelpers.get(inv.id) ?? new Map()
      );
      const widget = step.tool ? widgets.get(step.tool.id) : null;
      const wSource = widget ? widgetSources.get(widget.id) : '';
      const ctxOf = {
        step: ctxRoles(ctxKeysIn(source)),
        // Only a widget that declares `live` is handed the probe context, so
        // for every other one a `ctx.` in its source is a drawing context and
        // scanning it would invent a connection to the scene that the engine
        // in js/investigations.js does not make.
        widget: ctxRoles(widget?.live ? ctxKeysIn(wSource) : []),
      };
      for (const key of [...ctxOf.step.unknown, ...ctxOf.widget.unknown]) {
        unknownCtx.add(key);
      }
      const datasets = datasetsFor(
        widget,
        wSource,
        names.get(families.get(widget?.id)) ?? new Map()
      );
      const running = runningAt(inv, index);
      const affordances = affordancesFor(step, inv);
      const actions = actionsFor(step, widget, ctxOf, running, affordances);
      const kinds = kindsFor(step, widget, ctxOf, datasets);
      const declared = DECLARED_ROLE[step.type] || 'read';
      const actual = actualRoles(step, kinds, actions, affordances, running);
      const handTranscribed = Boolean(
        step.fields?.length &&
        !kinds.includes(KIND.ENGINE) &&
        !kinds.includes(KIND.MODEL) &&
        !kinds.includes(KIND.DATA)
      );
      return {
        sid: step.sid || null,
        index: index + 1,
        type: step.type || 'read',
        title: step.title || '',
        // Declarations, kept apart from everything else on purpose. Nothing
        // in this block is evidence that a reader did anything.
        declares: {
          stage: step.stage
            ? {
                objects: stagedCount(step),
                kind: stageKind(step.stage),
                scale: step.stage.scale || 'display',
                fits: Boolean(
                  step.stage.fit ??
                  step.stage.binary?.fit ??
                  step.stage.starPair?.fit
                ),
                anonymous: Boolean(step.stage.anonymous),
              }
            : null,
          bound: step.bind ? Object.keys(step.bind) : [],
          roles:
            step.stage?.stars?.map(x => x.role) ??
            step.stage?.binary?.kinds ??
            (step.stage?.starPair ? ['a', 'b'] : null) ??
            (step.bind ? Object.keys(step.bind) : null) ??
            [],
        },
        kinds,
        actions,
        requires: step.requires ?? [],
        // The step where this prediction is marked, when its marking waits
        // for the experiment. Null on a prediction that is graded the moment
        // it is committed, which is the pattern this field exists to replace.
        reveal: step.reveal ?? null,
        // What the step asks of a reader, and in what form. `short` is the
        // only one that gets an explanation in somebody's own words; the rest
        // are marked and forgotten.
        asks: {
          choice: step.kind === 'choice' || Boolean(step.options),
          numeric: step.kind === 'numeric',
          short: step.kind === 'short',
          rubric: Boolean(step.rubric),
          validated: Boolean(step.validate),
        },
        worldRunning: running,
        affordances,
        loop: {
          declared,
          actual,
          handTranscribed,
          mismatch: mismatchFor(step, declared, actual),
        },
        scene: {
          // Bodies this step names in code by substring rather than binding.
          nameMatches: nameMatchesIn(source),
          readsSelection: ctxOf.step.read.includes('selected'),
          importsFromSelection: Boolean(step.importFromSelection),
          engineReads: ctxOf.step.read,
          mutates: ctxOf.step.mutate,
          eventWatch: step.pauseAt
            ? { kind: step.pauseAt.kind, body: step.pauseAt.body ?? null }
            : null,
        },
        // The instrument's own shape is recorded once, under `instruments` at
        // the top of the file, because twelve steps naming `stellar-lab`
        // repeated its controls, its reads and its dataset twelve times and
        // doubled the size of the catalogue for nothing.
        instrument: step.tool
          ? { id: step.tool.id, capture: Boolean(step.tool.capture) }
          : null,
        evidence: evidenceFor(step, ctxOf),
        reset: resetFor(step, inv, index),
        recovery: recoveryFor(step, inv, index, ctxOf, source),
      };
    });
    return {
      id: inv.id,
      title: inv.title,
      lock: inv.lock || null,
      steps,
      loops: loopsFor(steps),
      totals: totalsFor(steps),
    };
  });

  if (unknownCtx.size) {
    console.error(
      `Unclassified probe-context keys: ${[...unknownCtx].sort().join(', ')}\n` +
        'Add each to the CTX table in tools/lesson-scene-audit.mjs, saying\n' +
        'whether it reads the engine, changes a scene object, applies a model,\n' +
        'keeps evidence, or only formats.'
    );
    process.exitCode = 1;
  }

  const used = new Set(
    INVESTIGATIONS.flatMap(inv => inv.steps.map(s => s.tool?.id)).filter(
      Boolean
    )
  );
  const instruments = {};
  for (const id of [...used].sort()) {
    const widget = widgets.get(id);
    if (!widget) {
      instruments[id] = { missing: true };
      continue;
    }
    const wSource = widgetSources.get(id);
    const roles = ctxRoles(widget.live ? ctxKeysIn(wSource) : []);
    instruments[id] = {
      live: Boolean(widget.live),
      controls: listOf(widget.controls).map(c => c.id),
      presets: listOf(widget.presets).length,
      buttons: listOf(widget.actions).map(a => a.id),
      engineReads: roles.read,
      mutates: roles.mutate,
      datasets: datasetsFor(
        widget,
        wSource,
        names.get(families.get(id)) ?? new Map()
      ),
    };
  }

  const all = lessons.flatMap(l => l.steps);
  return {
    generated: 'tools/lesson-scene-audit.mjs',
    kinds: Object.values(KIND),
    instruments,
    lessons,
    totals: {
      ...totalsFor(all),
      lessons: lessons.length,
      loops: lessons.reduce((n, l) => n + l.loops.length, 0),
      closedLoops: lessons.reduce(
        (n, l) => n + l.loops.filter(x => x.closed).length,
        0
      ),
      explainedLoops: lessons.reduce(
        (n, l) => n + l.loops.filter(x => x.explained).length,
        0
      ),
      heldLoops: lessons.reduce(
        (n, l) => n + l.loops.filter(x => x.answeredByTheExperiment).length,
        0
      ),
      completeLoops: lessons.reduce(
        (n, l) => n + l.loops.filter(x => x.complete).length,
        0
      ),
    },
  };
}

/** Counts, for the summary lines. */
function totalsFor(steps) {
  const count = pred => steps.filter(pred).length;
  const has = kind => count(s => s.kinds.includes(kind));
  return {
    steps: steps.length,
    declared: has(KIND.DECLARED),
    student: has(KIND.STUDENT),
    engine: has(KIND.ENGINE),
    model: has(KIND.MODEL),
    data: has(KIND.DATA),
    diagram: has(KIND.DIAGRAM),
    evidence: has(KIND.EVIDENCE),
    // The number the previous version of this file could not tell apart from
    // "staged something": a scene stood up and nobody able to touch it.
    declaredButInert: count(
      s => s.kinds.includes(KIND.DECLARED) && !s.kinds.includes(KIND.STUDENT)
    ),
    prose: count(s => s.kinds.length === 0),
    mismatched: count(s => s.loop.mismatch),
    rebuilds: count(s => s.reset.some(r => r.startsWith('rebuilds'))),
  };
}

/** The readable form. */
function report(data) {
  const pad = (s, n) => String(s).padEnd(n);
  const lines = [];
  lines.push('\nWhat each lesson step does with the main scene');
  lines.push(
    'A stage or a bind is a declaration. Only "student" means somebody can\n' +
      'change a scene object. Loops are complete/closed/total: closed means\n' +
      'the prediction was returned to, complete means a measurement came back\n' +
      'before it was answered.\n'
  );
  const head =
    `${pad('lesson', 26)} ${pad('steps', 6)} ${pad('decl', 5)} ${pad('inert', 6)} ` +
    `${pad('student', 8)} ${pad('engine', 7)} ${pad('model', 6)} ${pad('data', 5)} ` +
    `${pad('panel', 6)} ${pad('evid', 5)} ${pad('loops', 8)} mismatch`;
  lines.push(head);
  lines.push('-'.repeat(head.length));
  for (const l of data.lessons) {
    const t = l.totals;
    const done = l.loops.filter(x => x.complete).length;
    const shut = l.loops.filter(x => x.closed).length;
    lines.push(
      `${pad(l.id.slice(0, 25), 26)} ${pad(t.steps, 6)} ${pad(t.declared, 5)} ` +
        `${pad(t.declaredButInert, 6)} ${pad(t.student, 8)} ${pad(t.engine, 7)} ` +
        `${pad(t.model, 6)} ${pad(t.data, 5)} ${pad(t.diagram, 6)} ` +
        `${pad(t.evidence, 5)} ${pad(`${done}/${shut}/${l.loops.length}`, 8)} ${t.mismatched}`
    );
  }
  lines.push('-'.repeat(head.length));
  const t = data.totals;
  lines.push(
    `${pad('all', 26)} ${pad(t.steps, 6)} ${pad(t.declared, 5)} ${pad(t.declaredButInert, 6)} ` +
      `${pad(t.student, 8)} ${pad(t.engine, 7)} ${pad(t.model, 6)} ${pad(t.data, 5)} ` +
      `${pad(t.diagram, 6)} ${pad(t.evidence, 5)} ` +
      `${pad(`${t.completeLoops}/${t.closedLoops}/${t.loops}`, 8)} ${t.mismatched}`
  );
  lines.push(`\n${t.prose} step(s) carry none of the seven kinds: prose.`);

  const mismatches = data.lessons.flatMap(l =>
    l.steps.filter(s => s.loop.mismatch).map(s => [l.id, s])
  );
  if (mismatches.length) {
    lines.push('\nSteps whose declared type outruns their machinery:\n');
    for (const [id, s] of mismatches) {
      lines.push(`  ${pad(`${id}/${s.sid}`, 40)} ${s.loop.mismatch}`);
    }
  }

  const named = new Map();
  for (const l of data.lessons) {
    for (const s of l.steps) {
      for (const n of s.scene.nameMatches)
        named.set(n, (named.get(n) || 0) + 1);
    }
  }
  if (named.size) {
    lines.push(
      '\nBodies named in code, all of them by case-insensitive substring:\n'
    );
    for (const [name, n] of [...named].sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${pad(`"${name}"`, 20)} ${n} step(s)`);
    }
    lines.push(
      '\n  Each of these resolves through ctx.find, which returns the first\n' +
        '  body whose name CONTAINS the string and never says how many matched.\n' +
        '  js/lesson/binding.js is the exact-match replacement.'
    );
  }
  lines.push(`\nFull catalogue: ${relative(ROOT, CATALOGUE)}`);
  lines.push(`Acceptance map: ${relative(ROOT, ACCEPTANCE)}\n`);
  return lines.join('\n');
}

/**
 * The questions asked of every investigation, answered per lesson.
 *
 * The table above says how many steps are of each kind; this says what a
 * student does. Written as Markdown beside the JSON because the JSON is for
 * the --check comparison and nobody reads it, and these answers are the ones
 * a person reviewing an activity actually needs.
 */
function record(data, acceptance) {
  const out = ['# What each investigation does with the main scene', ''];
  out.push(
    'Generated by `npm run audit:scene -- --write`. Do not edit by hand.',
    '',
    'Seven kinds, and a step may carry several. `scene-declared` means the',
    'lesson stood objects on the canvas or bound names to bodies already',
    'there, and **nothing more** — it is never evidence that a reader did',
    'anything. `student-changes-scene` is the one that says somebody can.',
    '',
    'The hand-written, human-reviewed acceptance map is',
    '[`lesson-acceptance.json`](lesson-acceptance.json); `npm run',
    'audit:scene:check` fails if it disagrees with what is generated here.',
    ''
  );
  const t = data.totals;
  out.push(
    `Across ${t.lessons} investigations and ${t.steps} steps: ${t.declared} steps`,
    `declare a scene, ${t.student} let a reader change one, ${t.engine} read the`,
    `running integration, ${t.model} show a prescribed model result, ${t.data} draw`,
    `on a stored dataset, ${t.diagram} put a self-contained panel beside the text,`,
    `${t.evidence} keep something, and ${t.prose} are prose.`,
    `Of ${t.loops} prediction loops, ${t.closedLoops} are returned to,`,
    `${t.completeLoops} produce a measurement before they are answered, and`,
    `${t.explainedLoops} end in an explanation in the reader's own words.`,
    `${t.heldLoops} hold their marking until the experiment settles them.`,
    ''
  );
  for (const l of data.lessons) {
    const lt = l.totals;
    const steps = l.steps;
    const uniq = xs => [...new Set(xs.flat())].filter(Boolean);
    const actions = uniq(steps.map(s => s.actions));
    const evidence = uniq(steps.map(s => s.evidence));
    const instruments = uniq(
      steps.map(s => (s.instrument ? [s.instrument.id] : []))
    );
    const objects = uniq(steps.map(s => s.declares.roles));
    const datasets = uniq(
      steps.map(s =>
        (data.instruments[s.instrument?.id]?.datasets ?? []).map(
          d => `${d.name} (${d.origin})`
        )
      )
    );
    const recovery = uniq(steps.map(s => s.recovery));
    const rebuilds = steps.filter(s =>
      s.reset.some(r => r.startsWith('rebuilds'))
    );
    const map = acceptance?.lessons?.[l.id];
    out.push(
      `## ${l.title} (\`${l.id}\`)`,
      '',
      `- **Steps:** ${lt.steps}. Scene declared on ${lt.declared}; a reader can` +
        ` change something on ${lt.student}; ${lt.declaredButInert} declare a scene` +
        ' nobody on that step can touch.',
      `- **Where the numbers come from:** ${lt.engine} live engine, ${lt.model}` +
        ` prescribed model, ${lt.data} stored dataset, ${lt.diagram} self-contained panel.`,
      `- **What students do:** ${actions.join(', ')}.`,
      `- **Objects the steps declare:** ${objects.length ? objects.join(', ') : 'none'}.`,
      `- **Instruments:** ${instruments.length ? instruments.join(', ') : 'none'}.`,
      `- **Stored data:** ${datasets.length ? datasets.join('; ') : 'none'}.`,
      `- **Evidence kept:** ${
        evidence.length
          ? evidence.join(', ')
          : 'nothing — this lesson keeps nothing'
      }.`,
      `- **Prediction loops:** ${
        l.loops.length
          ? l.loops
              .map(
                x =>
                  `${x.predict} → ${x.measure.join(', ') || 'nothing measured'} → ` +
                  `${x.interpret || 'never answered'}` +
                  (x.complete
                    ? ''
                    : x.closed
                      ? ' (answered without a number)'
                      : ' (open)')
              )
              .join('; ')
          : 'none'
      }.`,
      `- **Recovery:** ${recovery.length ? recovery.join('; ') : 'nothing to recover from'}.`,
      `- **Scene rebuilds:** ${
        rebuilds.length
          ? `${rebuilds.length} step(s) on arrival (${rebuilds.map(s => s.sid).join(', ')})`
          : 'none'
      }.`
    );
    if (map) {
      out.push(
        `- **Accepted central experiment** (reviewed ${map.reviewed || acceptance.reviewed}):` +
          ` object \`${map.object}\`, control ${map.control}, measures ${map.quantity},` +
          ` evidence \`${map.evidence}\`, covered by \`${map.test}\`.`
      );
    } else {
      out.push('- **Accepted central experiment:** not yet reviewed.');
    }
    out.push('');
  }
  return out.join('\n');
}

/**
 * Does the acceptance map's `test` actually accept anything?
 *
 * It used to be a file name, and a file name proves nothing. Four lessons
 * pointed at e2e/investigations.spec.js and three at e2e/predictionLoops.spec.js,
 * so "this lesson has a test" meant "some test exists in a file that also has
 * tests for other lessons" - and one binding, gravity-assist, named a file that
 * never mentioned the lesson at all.
 *
 * A binding is now an id and a tag. Each lesson declares a durable
 * `centralExperimentId`, and one concrete test in the named file has to carry
 * `@accepts:<that id>` in its title. That test must not be skipped, and it has
 * to name the investigation it claims to accept, so a tag cannot be parked on
 * a test that never opens the lesson.
 *
 * @param {object} acceptance - The parsed acceptance map
 * @param {Array<object>} lessons - The generated catalogue
 * @returns {Promise<Array<string>>} Problems
 */
async function checkAcceptanceBindings(acceptance, lessons) {
  const problems = [];
  const seen = new Map();
  const fileCache = new Map();

  // What Playwright would actually collect.
  //
  // Reading the file answers "is the tag there". It cannot answer "does the tag
  // resolve", and three of the bindings are written into a generated title -
  // `@accepts:ce.${id}` inside a loop - so a loop that stopped covering a
  // lesson would leave the tag in the file and the lesson with nothing running.
  // Listing costs a few seconds and is the only thing that settles it.
  //
  // Not spawnable from Jest, which is why this lives here: Playwright detects a
  // Jest process and refuses, so a unit test asking the same question collects
  // nothing and reports every binding as missing.
  let collected = null;
  try {
    collected = execFileSync(
      'npx',
      ['playwright', 'test', '--list', '--project=chromium'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    );
  } catch {
    problems.push(
      'could not list the browser suite, so no acceptance binding was ' +
        'confirmed to resolve. Run `npx playwright test --list` to see why.'
    );
  }

  /** A spec file's text, read once. */
  const readSpec = async file => {
    if (!fileCache.has(file)) {
      fileCache.set(
        file,
        await readFile(resolve(ROOT, file), 'utf8').catch(() => null)
      );
    }
    return fileCache.get(file);
  };

  for (const lesson of lessons) {
    const entry = acceptance?.lessons?.[lesson.id];
    if (!entry) continue;

    const id = entry.centralExperimentId;
    if (!id) {
      problems.push(
        `${lesson.id}: acceptance entry has no centralExperimentId, so its ` +
          'central experiment is not bound to any test'
      );
      continue;
    }
    if (seen.has(id)) {
      problems.push(
        `${lesson.id}: centralExperimentId "${id}" is already used by ` +
          `${seen.get(id)}; ids have to be unique or a tag is ambiguous`
      );
      continue;
    }
    seen.set(id, lesson.id);

    const file = entry.test;
    const src = await readSpec(file);
    if (src === null) {
      problems.push(`${lesson.id}: acceptance test "${file}" does not exist`);
      continue;
    }

    const tag = `@accepts:${id}`;
    // A tag written into a generated title - `@accepts:ce.${loop.id}` inside a
    // template that loops over lesson ids - is a real binding and resolves to
    // this id at run time, so it counts. The loop still has to name the lesson,
    // which the check below insists on, so a template cannot claim a lesson it
    // never runs.
    const TEMPLATED = /@accepts:ce\.\$\{[^}]+\}/;
    const templated = TEMPLATED.test(src);
    if (!src.includes(tag) && !templated) {
      problems.push(
        `${lesson.id}: no test in ${file} is tagged ${tag}. A file name is ` +
          'not a binding: tag the one test that runs this central experiment'
      );
      continue;
    }

    // The line the tag is on, so a skipped or exclusive test can be caught.
    for (const line of src.split('\n')) {
      if (!line.includes(tag) && !TEMPLATED.test(line)) continue;
      if (/test\.skip\s*\(|test\.fixme\s*\(|it\.skip\s*\(/.test(line)) {
        problems.push(
          `${lesson.id}: the test tagged ${tag} is skipped, so nothing accepts ` +
            'this central experiment'
        );
      }
      if (/test\.only\s*\(|describe\.only\s*\(/.test(line)) {
        problems.push(
          `${lesson.id}: the test tagged ${tag} is marked .only, which would ` +
            'silence every other test in the run'
        );
      }
      if (/test\.fail\s*\(/.test(line)) {
        problems.push(
          `${lesson.id}: the test tagged ${tag} is an expected failure`
        );
      }
    }

    // And the tag has to resolve to a test Playwright will collect.
    if (collected !== null && !collected.includes(tag)) {
      problems.push(
        `${lesson.id}: ${tag} is in ${file} but Playwright collects no test ` +
          'carrying it, so nothing would run for this central experiment'
      );
    }

    // And it has to be about this lesson. A tag on a test that never opens the
    // investigation would be a binding to nothing.
    if (!src.includes(lesson.id)) {
      problems.push(
        `${lesson.id}: ${file} carries ${tag} but never names "${lesson.id}", ` +
          'so the test it tags does not identify the investigation it accepts'
      );
    }
  }

  return problems;
}

/**
 * Check the hand-written acceptance map against what was generated.
 *
 * The map is the human half and this is the machine half. A person writes
 * down which object, which control, which quantity, where the evidence lands
 * and which test drives it; this refuses to let any of those five drift into
 * naming something that no longer exists. It cannot check that the experiment
 * is a good one, and it does not pretend to.
 *
 * @returns {Array<string>} Problems, empty when the map holds
 */
async function checkAcceptance(data) {
  const problems = [];
  const raw = await readFile(ACCEPTANCE, 'utf8').catch(() => null);
  if (raw === null) {
    return [`${relative(ROOT, ACCEPTANCE)} is missing.`];
  }
  let map;
  try {
    map = JSON.parse(raw);
  } catch (err) {
    return [`${relative(ROOT, ACCEPTANCE)} is not valid JSON: ${err.message}`];
  }
  const widgets = new Map(allWidgets().map(w => [w.id, w]));
  const entries = map.lessons || {};
  for (const id of Object.keys(entries)) {
    if (!data.lessons.some(l => l.id === id)) {
      problems.push(`acceptance map names "${id}", which is not a lesson`);
    }
  }
  for (const lesson of data.lessons) {
    const entry = entries[lesson.id];
    if (!entry) {
      problems.push(`${lesson.id}: no acceptance entry`);
      continue;
    }
    for (const key of [
      'centralExperimentId',
      'evidenceFrom',
      'object',
      'control',
      'quantity',
      'evidence',
      'test',
      'loop',
    ]) {
      if (!entry[key])
        problems.push(`${lesson.id}: acceptance entry has no ${key}`);
    }
    // A provenance label is a claim a learner reads, so it has to be one the
    // lesson can support. `engine` on a lesson whose central loop never
    // measures anything the integrator produced would be telling a reader the
    // number came from a simulation when it came from a closed-form panel -
    // which is the exact confusion the black-hole lesson spends a screen
    // undoing. The audit already classifies every step, so the declaration is
    // checked against what those steps actually are.
    const NEEDS = {
      engine: 'engine-measurement',
      model: 'model-result',
      data: 'imported-data',
      illustration: 'panel-diagram',
    };
    if (entry.evidenceFrom) {
      const wanted = NEEDS[entry.evidenceFrom];
      if (!wanted) {
        problems.push(
          `${lesson.id}: evidenceFrom "${entry.evidenceFrom}" is not one of ` +
            Object.keys(NEEDS).join(', ')
        );
      } else {
        // The whole lesson, not only the three sids the loop records. Two
        // lessons - radial-velocity and lagrange-points - have loops made
        // entirely of captured-evidence steps, because the instrument that
        // produced the number sits just outside the prediction/measure/explain
        // triple. Checking the loop alone called their labels unsupported when
        // the evidence is right there in the lesson.
        //
        // Weaker than a per-step check and worth being clear about: it stops a
        // lesson claiming a kind of evidence it never produces - "data" for a
        // lesson that imports none - rather than proving the label describes
        // the one number the explanation cites.
        const present = new Set();
        for (const step of lesson.steps) {
          for (const kind of step.kinds || []) present.add(kind);
        }
        if (!present.has(wanted)) {
          problems.push(
            `${lesson.id}: evidenceFrom says "${entry.evidenceFrom}", but no ` +
              `step in the lesson is a ${wanted}. The label a learner reads ` +
              'has to be one the lesson can support.'
          );
        }
      }
    }

    const sids = new Set(lesson.steps.map(s => s.sid));
    for (const sid of entry.loop || []) {
      if (!sids.has(sid)) {
        problems.push(
          `${lesson.id}: acceptance loop names step "${sid}", which does not exist`
        );
      }
    }
    const objects = new Set(
      lesson.steps.flatMap(s => [...s.declares.roles, ...s.declares.bound])
    );
    // Black Holes by the Numbers stages nothing and is right not to: every
    // quantity in it is a scaling law, and there is no canvas object that
    // could carry one. Such a lesson names its central experiment's subject
    // as `panel:<widget-id>`, which is checked against the registry and
    // against the lesson's own use of that instrument.
    const panel = String(entry.object || '').match(/^panel:([\w-]+)$/);
    if (panel) {
      if (!widgets.has(panel[1])) {
        problems.push(
          `${lesson.id}: acceptance object names widget "${panel[1]}", which is not registered`
        );
      } else if (!lesson.steps.some(s => s.instrument?.id === panel[1])) {
        problems.push(
          `${lesson.id}: acceptance object names widget "${panel[1]}", which this lesson never opens`
        );
      }
    } else if (
      entry.object &&
      entry.object !== 'the selected body' &&
      !objects.has(entry.object)
    ) {
      problems.push(
        `${lesson.id}: acceptance object "${entry.object}" is not a role this lesson declares`
      );
    }
    const control = String(entry.control || '');
    const widgetControl = control.match(/^([\w-]+)\/([\w-]+)$/);
    if (widgetControl) {
      const [, widgetId, controlId] = widgetControl;
      const widget = widgets.get(widgetId);
      if (!widget) {
        problems.push(
          `${lesson.id}: acceptance control names widget "${widgetId}", which is not registered`
        );
      } else if (
        !listOf(widget.controls).some(c => c.id === controlId) &&
        !listOf(widget.actions).some(a => a.id === controlId)
      ) {
        problems.push(
          `${lesson.id}: widget "${widgetId}" has no control or button "${controlId}"`
        );
      }
    }
    const evidence = new Set(lesson.steps.flatMap(s => s.evidence));
    if (
      entry.evidence &&
      entry.evidence !== 'none' &&
      !evidence.has(entry.evidence)
    ) {
      problems.push(
        `${lesson.id}: acceptance evidence "${entry.evidence}" is not produced anywhere in the lesson` +
          ` (found: ${[...evidence].join(', ') || 'nothing'})`
      );
    }
    if (entry.test) {
      const text = await fileText(entry.test);
      if (!text)
        problems.push(
          `${lesson.id}: acceptance test "${entry.test}" does not exist`
        );
    }
  }
  // And the part a file name cannot answer: is there a concrete, running test
  // that says it accepts this lesson's central experiment?
  problems.push(...(await checkAcceptanceBindings(map, data.lessons)));
  return problems;
}

// Two panels keep their prose in the deferred catalogue, and this tool reads
// their labels. Without waiting, every run printed eleven message ids where the
// English and Spanish strings both exist.
if (!(await whenWidgetsReady())) {
  console.error(
    'The deferred message catalogue did not load, so widget labels would be ' +
      'reported as their own message ids. Refusing to audit against that.'
  );
  process.exit(1);
}

/** The browser-readable provenance module, built from the reviewed map. */
function provenanceModule(acceptance) {
  const rows = Object.entries(acceptance?.lessons || {})
    .map(([id, e]) => [id, e.evidenceFrom])
    .filter(([, v]) => v)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const body = rows.map(([id, v]) => `  '${id}': '${v}',`).join('\n');
  return `// Generated by tools/lesson-scene-audit.mjs --write. Do not edit.
//
// Where each investigation's central experiment gets its number from, for the
// line the explanation step shows a learner. Four sources, and the difference
// matters: a Schwarzschild radius comes from a closed-form panel and a period
// comes from the integrator, and a reader who thinks the first was simulated
// has learned something false about what this application does.
//
// Generated from the reviewed half - docs/lesson-acceptance.json - rather than
// typed into twenty-two lesson files, so there is one place to be right. The
// audit checks each value against the kinds it found in the lesson itself, so
// a label cannot claim evidence the lesson never produces; it caught three of
// the first twenty-two as unsupported.
export const EVIDENCE_FROM = Object.freeze({
${body}
});

/** @param {string} id - An investigation id @returns {?string} engine|model|data|illustration */
export const evidenceFrom = id => EVIDENCE_FROM[id] || null;
`;
}

const data = await audit();
if (wantJson) {
  console.log(JSON.stringify(data, null, 1));
} else if (wantCheck) {
  const acceptance = await readFile(ACCEPTANCE, 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  const wanted = `${JSON.stringify(data, null, 1)}\n`;
  const have = await readFile(CATALOGUE, 'utf8').catch(() => null);
  const wantedRecord = `${record(data, acceptance)}\n`;
  const haveRecord = await readFile(RECORD, 'utf8').catch(() => null);
  const wantedProvenance = provenanceModule(acceptance);
  const haveProvenance = await readFile(PROVENANCE, 'utf8').catch(() => null);
  if (
    have !== wanted ||
    haveRecord !== wantedRecord ||
    haveProvenance !== wantedProvenance
  ) {
    console.error(
      'The scene catalogue is out of date. Run `npm run audit:scene -- --write`.'
    );
    process.exit(1);
  }
  const problems = await checkAcceptance(data);
  if (problems.length) {
    console.error('The lesson acceptance map disagrees with the catalogue:\n');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(
    `Scene catalogue is current: ${data.totals.steps} steps, ` +
      `${data.totals.completeLoops} closed prediction loops, ` +
      `${data.lessons.length} accepted experiments.`
  );
} else {
  if (args.includes('--write')) {
    const acceptance = await readFile(ACCEPTANCE, 'utf8')
      .then(JSON.parse)
      .catch(() => null);
    await writeFile(CATALOGUE, `${JSON.stringify(data, null, 1)}\n`);
    await writeFile(RECORD, `${record(data, acceptance)}\n`);
    await writeFile(PROVENANCE, provenanceModule(acceptance));
  }
  console.log(report(data));
}
