#!/usr/bin/env node
// =============================================================================
// What every lesson step does with the main scene
// -----------------------------------------------------------------------------
//   npm run audit:scene              the readable report
//   npm run audit:scene -- --json    the machine-readable catalogue
//   npm run audit:scene -- --check   fail if the checked-in catalogue is stale
//
// The question this answers is the one nobody could answer before writing it:
// which of the twenty-one lessons actually connect a student to an object in
// the simulation, and which put an instrument beside the text and leave the
// scene as wallpaper. It is deliberately not a judgement about quality. A
// standalone diagram is the right tool for a step about a relationship nobody
// can see on a canvas, and several lessons that never touch a body are better
// for it. What the catalogue is for is knowing which is which, per step, so
// that a decision to connect one can be made from the facts.
//
// How it decides, and what it will not guess
// -----------------------------------------------------------------------------
// Everything below is read off the step data, never inferred from prose. Where
// the data does not say, the entry says "unknown" rather than a plausible
// guess, because a catalogue that quietly invents is worse than a short one.
//
// The one piece of static analysis is the binding scan: `ctx.find('X')` and
// `ctx.seenFrom(_, 'X')` are read out of the source text of the step's own
// functions. Those two calls are how a lesson names a body today, and both are
// case-insensitive substring matches over every body in the world - which is
// why they are collected here under `nameMatches` and flagged. They are the
// thing js/lesson/binding.js exists to replace.
// =============================================================================

import { writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE = resolve(ROOT, 'docs/lesson-scene-catalogue.json');
const RECORD = resolve(ROOT, 'docs/lesson-scene-record.md');

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const wantCheck = args.includes('--check');

/**
 * Where a step's numbers come from.
 *
 * Three answers, and they are the distinction the whole audit is for:
 *
 *   engine     read out of the running N-body simulation, live
 *   model      computed by a prescribed scientific model - a waveform, an
 *              evolutionary track, an analytic relation - which the integrator
 *              does not produce and cannot check
 *   diagram    a standalone illustration with no numbers to read off
 *
 * A step can be more than one. A step with a live probe and a modelled widget
 * beside it is both, and that is exactly the case worth knowing about.
 */
const SOURCE = { ENGINE: 'engine', MODEL: 'model', DIAGRAM: 'diagram' };

/**
 * Which widget families compute from a prescribed model rather than from the
 * running simulation.
 *
 * By module, because the distinction is a property of the family: everything
 * in js/gwWidgets.js evaluates a waveform, everything in js/stellarWidgets.js
 * evaluates a track. A widget that also reads the scene declares `live`, and
 * that is picked up separately below, so a widget can be both.
 */
const PRESCRIBED_WIDGETS = new Set([
  'gw-lab',
  'gw-real',
  'stellar-lab',
  'stellar-compare',
  'stellar-population',
  'stellar-evolution',
]);

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

/** Body names a step reaches for by substring match, today's only binding. */
function nameMatchesIn(source) {
  const out = new Set();
  for (const m of source.matchAll(/\bctx\.find\(\s*'([^']*)'/g)) out.add(m[1]);
  for (const m of source.matchAll(/\bctx\.find\(\s*"([^"]*)"/g)) out.add(m[1]);
  for (const m of source.matchAll(/seenFrom\([^,]+,\s*'([^']*)'/g))
    out.add(m[1]);
  return [...out];
}

/** Which ctx readers a step uses, which is what it reads from the engine. */
function engineReadsIn(source) {
  const out = new Set();
  for (const m of source.matchAll(/\bctx\.([A-Za-z_]+)/g)) out.add(m[1]);
  return [...out].sort();
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

/** What kind of thing a stage stands there. */
function stageKind(stage) {
  if (stage.population) return 'population';
  if (stage.binary) return 'binary';
  if (stage.starPair) return 'star-pair';
  if (stage.hole) return 'black-hole';
  if (stage.equalMass) return 'equal-mass-pair';
  return 'named';
}

/** What a student physically does on this step. */
function actionsFor(step) {
  const out = [];
  if (step.stage) out.push('select-a-staged-object');
  if (step.bind) out.push('select-a-bound-object');
  if (step.type === 'predict' || step.options) out.push('commit-a-prediction');
  if (step.kind === 'short' || step.kind === 'choice') out.push('answer');
  if (step.fields?.length) out.push('record-values');
  if (step.checklist?.length) out.push('work-through-a-checklist');
  if (step.importFromSelection) out.push('import-from-the-selected-body');
  if (step.tool) out.push('operate-an-instrument');
  if (step.plot) out.push('build-a-plot');
  if (step.pauseAt) out.push('arm-an-event-watch');
  if (step.lightCurve) out.push('watch-a-light-curve');
  if (step.showAreaSweep) out.push('see-the-area-sweep');
  if (step.showBarycentre) out.push('see-the-balance-point');
  if (step.explainView) out.push('read-the-labelled-appearance');
  if (step.allowInspector) out.push('open-the-inspector');
  if (step.allowPlacement) out.push('place-an-object');
  if (step.observerAngle !== undefined) out.push('observe-from-an-angle');
  return out.length ? out : ['read'];
}

/** Where this step's numbers come from, as a list. */
function sourcesFor(step, source) {
  const out = new Set();
  const reads = engineReadsIn(source);
  const liveReads = reads.filter(
    r => !['distance', 'speed', 'time', 'mass', 'au', 'years'].includes(r)
  );
  if (liveReads.length) out.add(SOURCE.ENGINE);
  if (
    step.pauseAt ||
    step.lightCurve ||
    step.showAreaSweep ||
    step.showBarycentre
  ) {
    out.add(SOURCE.ENGINE);
  }
  // A bound body is a body in the live world, so a step that binds one is
  // reading the engine whether or not its probe happens to call an accessor
  // this scan recognises.
  if (step.bind) out.add(SOURCE.ENGINE);
  // A stage is the main scene, and what it stands there is the model's
  // answer - so a staged step is scene-connected and prescribed at once,
  // which is the combination this whole pass exists to make possible.
  if (step.stage) out.add(SOURCE.MODEL);
  if (step.tool) {
    if (PRESCRIBED_WIDGETS.has(step.tool.id)) out.add(SOURCE.MODEL);
    else out.add(SOURCE.DIAGRAM);
  }
  return [...out];
}

/** What, if anything, this step leaves behind as evidence. */
function evidenceFor(step) {
  const out = [];
  if (step.fields?.length) out.push('notebook-fields');
  if (step.tool?.capture) out.push('instrument-capture');
  if (step.plot) out.push('plot');
  if (step.importFromSelection) out.push('imported-from-scene');
  return out;
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
 * The three ways an activity strands somebody, and what answers each:
 *
 *   picked the wrong body   Re-selecting and importing again overwrites the
 *                           row, so a wrong click costs a click. A step whose
 *                           only path in is `ctx.selected` with no import and
 *                           no object list is harder: the reader has to know
 *                           which body was meant.
 *   missed the moment       An armed event stops the run at it, so catching
 *                           ingress or periapsis is not a reflex test. Without
 *                           one, the only recovery is to wait a whole period.
 *   the world reset         A step that names a setup rebuilds the scenario
 *                           when it is reached, which throws away a
 *                           part-finished measurement on the screen before it.
 *
 * Recorded per step rather than per lesson because it varies per step, and it
 * is the half of an activity that never gets designed until somebody is stuck.
 */
function recoveryFor(step, inv, index) {
  const out = [];
  const previous = inv.steps[index - 1];
  if (step.importFromSelection) {
    out.push('wrong body: select another and import again, which overwrites');
  } else if (step.bind || step.stage) {
    out.push('wrong body: the object list names what the step means');
  } else if (String(stepSource(step)).includes('ctx.selected')) {
    out.push('wrong body: nothing names the intended one - prose only');
  }
  if (step.pauseAt) {
    out.push(
      `missed moment: an event watch stops the run at ${step.pauseAt.kind}`
    );
  } else if (step.fields?.length && !step.tool) {
    out.push(
      'missed moment: no event stop, so a reader waits for it to come round'
    );
  }
  if (step.setup?.scenario) {
    out.push(
      previous?.fields?.length
        ? "reset: rebuilds the scenario, discarding the previous step's scene"
        : 'reset: rebuilds the scenario on arrival'
    );
  }
  return out;
}

/** Build the whole catalogue. */
function audit() {
  const lessons = INVESTIGATIONS.map(inv => {
    const steps = inv.steps.map((step, index) => {
      const source = stepSource(step);
      const nameMatches = nameMatchesIn(source);
      const reads = engineReadsIn(source);
      return {
        sid: step.sid || null,
        index: index + 1,
        type: step.type || 'read',
        title: step.title || '',
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
        objects: {
          // Bodies this step names in code. Empty does not mean "no object":
          // most steps say "click the planet" in prose and read ctx.selected,
          // which is the `readsSelection` flag below.
          nameMatches,
          // What the step binds by exact name through js/lesson/binding.js.
          // A stable binding is the strongest connection to the scene there
          // is - stronger than a substring match, because it refuses rather
          // than guessing when a name is ambiguous - and the audit was blind
          // to it: a lesson that had been converted from ctx.find to bind
          // scored *worse* than before it was converted.
          bound: step.bind ? Object.keys(step.bind) : [],
          staged: stagedCount(step),
          roles:
            step.stage?.stars?.map(x => x.role) ??
            step.stage?.binary?.kinds ??
            (step.stage?.starPair ? ['a', 'b'] : null) ??
            (step.bind ? Object.keys(step.bind) : null) ??
            [],
          readsSelection: reads.includes('selected'),
          importsFromSelection: Boolean(step.importFromSelection),
          eventWatch: step.pauseAt
            ? { kind: step.pauseAt.kind, body: step.pauseAt.body ?? null }
            : null,
        },
        actions: actionsFor(step),
        sources: sourcesFor(step, source),
        engineReads: reads,
        instrument: step.tool
          ? {
              id: step.tool.id,
              prescribed: PRESCRIBED_WIDGETS.has(step.tool.id),
              capture: Boolean(step.tool.capture),
            }
          : null,
        evidence: evidenceFor(step),
        reset: resetFor(step, inv, index),
        recovery: recoveryFor(step, inv, index),
      };
    });
    return {
      id: inv.id,
      title: inv.title,
      lock: inv.lock || null,
      steps,
      totals: totalsFor(steps),
    };
  });
  return {
    generated: 'tools/lesson-scene-audit.mjs',
    lessons,
    totals: totalsFor(lessons.flatMap(l => l.steps)),
  };
}

/** Counts, for the summary lines. */
function totalsFor(steps) {
  const count = pred => steps.filter(pred).length;
  return {
    steps: steps.length,
    touchTheScene: count(
      s =>
        s.stage ||
        s.objects.readsSelection ||
        s.objects.nameMatches.length ||
        s.objects.bound.length ||
        s.objects.importsFromSelection ||
        s.objects.eventWatch ||
        s.sources.includes(SOURCE.ENGINE)
    ),
    staged: count(s => Boolean(s.stage)),
    nameMatched: count(
      s => s.objects.nameMatches.length > 0 || s.objects.bound.length > 0
    ),
    prescribed: count(s => s.instrument?.prescribed),
    diagramOnly: count(
      s => s.sources.length === 1 && s.sources[0] === SOURCE.DIAGRAM
    ),
    withEvidence: count(s => s.evidence.length > 0),
    rebuilds: count(s => s.reset.some(r => r.startsWith('rebuilds'))),
  };
}

/** The readable form. */
function report(data) {
  const pad = (s, n) => String(s).padEnd(n);
  const lines = [];
  lines.push('\nWhat each lesson does with the main scene\n');
  lines.push(
    `${pad('lesson', 26)} ${pad('steps', 6)} ${pad('scene', 6)} ${pad('staged', 7)} ${pad('named', 6)} ${pad('model', 6)} ${pad('diagram', 8)} ${pad('evidence', 9)} rebuilds`
  );
  lines.push('-'.repeat(92));
  for (const l of data.lessons) {
    const t = l.totals;
    lines.push(
      `${pad(l.id.slice(0, 25), 26)} ${pad(t.steps, 6)} ${pad(t.touchTheScene, 6)} ` +
        `${pad(t.staged, 7)} ${pad(t.nameMatched, 6)} ${pad(t.prescribed, 6)} ` +
        `${pad(t.diagramOnly, 8)} ${pad(t.withEvidence, 9)} ${t.rebuilds}`
    );
  }
  lines.push('-'.repeat(92));
  const t = data.totals;
  lines.push(
    `${pad('all', 26)} ${pad(t.steps, 6)} ${pad(t.touchTheScene, 6)} ${pad(t.staged, 7)} ` +
      `${pad(t.nameMatched, 6)} ${pad(t.prescribed, 6)} ${pad(t.diagramOnly, 8)} ` +
      `${pad(t.withEvidence, 9)} ${t.rebuilds}`
  );

  const named = new Map();
  for (const l of data.lessons) {
    for (const s of l.steps) {
      for (const n of s.objects.nameMatches) {
        const key = `${n}`;
        named.set(key, (named.get(key) || 0) + 1);
      }
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
  lines.push(`\nFull catalogue: ${CATALOGUE.replace(`${ROOT}/`, '')}\n`);
  return lines.join('\n');
}

/**
 * The five questions asked of every investigation, answered per lesson.
 *
 * The table above says how many steps touch the scene; this says what a
 * student does there. Written as Markdown beside the JSON because the JSON is
 * for the --check comparison and nobody reads it, and these five answers are
 * the ones a person reviewing an activity actually needs.
 */
function record(data) {
  const out = ['# What each investigation does with the main scene', ''];
  out.push(
    'Generated by `npm run audit:scene -- --write`. Five questions per lesson:',
    'what students do in the scene, what comes out of it, how the instrument',
    'and the scene share data, where the evidence goes, and how somebody gets',
    'out of trouble.',
    ''
  );
  for (const l of data.lessons) {
    const t = l.totals;
    const steps = l.steps;
    const uniq = xs => [...new Set(xs.flat())].filter(Boolean);
    const actions = uniq(steps.map(s => s.actions));
    const sources = uniq(steps.map(s => s.sources));
    const evidence = uniq(steps.map(s => s.evidence));
    const instruments = uniq(
      steps.map(s => (s.instrument ? [s.instrument.id] : []))
    );
    const roles = uniq(steps.map(s => s.objects.bound));
    const staged = uniq(steps.map(s => s.objects.roles));
    const recovery = uniq(steps.map(s => s.recovery));
    const rebuilds = steps.filter(s =>
      s.reset.some(r => r.startsWith('rebuilds'))
    );
    out.push(
      `## ${l.title} (\`${l.id}\`)`,
      '',
      `- **Scene-connected steps:** ${t.touchTheScene} of ${t.steps}` +
        (t.touchTheScene < t.steps
          ? ` — the rest are panel diagrams or text, which is a choice, not a gap.`
          : '.'),
      `- **What students do there:** ${actions.length ? actions.join(', ') : 'nothing yet'}.`,
      `- **Objects the steps name:** ${
        [...roles, ...staged].length
          ? [...new Set([...roles, ...staged])].join(', ')
          : 'none'
      }.`,
      `- **What the measurement comes from:** ${sources.length ? sources.join(', ') : 'nothing live'}.`,
      `- **Instruments:** ${instruments.length ? instruments.join(', ') : 'none'}.`,
      `- **Where evidence is stored:** ${
        evidence.length
          ? evidence.join(', ')
          : 'nowhere — this lesson captures nothing'
      }.`,
      `- **Recovery:** ${recovery.length ? recovery.join('; ') : 'nothing to recover from'}.`,
      `- **Scene rebuilds:** ${
        rebuilds.length
          ? `${rebuilds.length} step(s) rebuild a scenario on arrival (${rebuilds
              .map(s => s.sid)
              .join(', ')})`
          : 'none'
      }.`,
      ''
    );
  }
  return out.join('\n');
}

const data = audit();
if (wantJson) {
  console.log(JSON.stringify(data, null, 1));
} else if (wantCheck) {
  const wanted = `${JSON.stringify(data, null, 1)}\n`;
  const have = await readFile(CATALOGUE, 'utf8').catch(() => null);
  if (have !== wanted) {
    console.error(
      'The scene catalogue is out of date. Run `npm run audit:scene -- --write`.'
    );
    process.exit(1);
  }
  console.log(`Scene catalogue is current: ${data.totals.steps} steps.`);
} else {
  if (args.includes('--write')) {
    await writeFile(CATALOGUE, `${JSON.stringify(data, null, 1)}\n`);
    await writeFile(RECORD, `${record(data)}\n`);
  }
  console.log(report(data));
}
