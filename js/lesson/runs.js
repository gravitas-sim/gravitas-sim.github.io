// =============================================================================
// Controlled runs inside a lesson
// -----------------------------------------------------------------------------
// A step that declares `variation: {param, values, runFor, read, label}` lets a
// student run the lesson's own scene, change the one parameter, run it again,
// and read the declared rows side by side. Fetched only where a step declares
// one (js/investigations.js loadSeams).
//
// One run: the whole world is captured through the lesson's own entry-and-exit
// authority (`captureShareState` kind 'full', camera, experiment extras), the
// scene is rebuilt through the step's setup or stage with the parameter set, the
// integration step is pinned (`setFixedStep`, the experiment bench's call) so a
// frame is the same amount of simulated time at 30 and at 144 fps, the clock
// runs for a fixed number of frames, the declared probe rows are read from the
// varied world, the pin is lifted and the captured state is put back with
// `applyShareState`. Leaving the step, closing the lesson or pressing Cancel
// puts it back the same way.
//
// Not restored, and why a later reading does not depend on it: trails (drawn
// history, not state), the timeline buffer (a recording of frames, rebuilt by
// the next ones) and the random-number position (physics draws none after the
// world is built).
// =============================================================================

import { command, SETTINGS, state } from '../appState.js';
import { escapeHtml as escape } from '../lessonMarkup.js';
import { formatNumber } from '../format.js';
import { t } from '../i18n/index.js';
import { lessonText } from '../i18n/lesson.js';
import { announce } from '../notify.js';
import { DT, getSimulationTime } from '../physics.js';
import { setFixedStep } from '../render.js';
import { frameAdvance, STEP_SECONDS } from '../timestep.js';
import { timeUnitSeconds } from '../units.js';
import { allBodies, selectBody } from '../lessonScene.js';
import { adoptStage, applyStage, stageMemo } from './stageGate.js';
import { predictionState } from './held.js';

const applyShareState = command('applyShareState');
const captureShareState = command('captureShareState');

/** The most runs a table holds. */
export const MAX_RUNS = 4;
/** Stage kinds a controlled run can vary: engine-owned, so the integrator is the physics. */
const KINDS = ['starPair', 'system'];
/** Stage keys that are optional on their kind, and so may be varied though absent. */
const OPTIONAL = { system: ['starMassSun'] };
/** Frames with no clock movement before a run gives up. */
const STALL = 240;

const keys = ['param', 'values', 'runFor', 'read', 'label'];

/** The scene a step runs in: its own stage or setup, else the nearest earlier one. */
export function sceneIn(steps, step) {
  for (let i = steps.indexOf(step); i >= 0; i--) {
    const s = steps[i];
    if (s.stage || s.setup)
      return { stage: s.stage || null, setup: s.setup || null, owner: s };
  }
  return { stage: null, setup: null, owner: null };
}

/** Where `param` lives in a scene: {kind:'stage', name} or {kind:'setup'}, or null. */
export function locate(scene, param) {
  for (const name of KINDS) {
    const spec = scene.stage?.[name];
    if (spec && (param in spec || OPTIONAL[name]?.includes(param)))
      return { kind: 'stage', name };
  }
  if (scene.setup?.settings && param in scene.setup.settings)
    return scene.stage ? null : { kind: 'setup' };
  return null;
}

/**
 * What is wrong with a step's declaration, as sentences for an author.
 * @param {object} step - A step carrying `variation`
 * @param {object} scene - sceneIn() for it
 * @returns {Array<string>} Empty when the declaration can run
 */
export function variationProblems(step, scene) {
  const v = step.variation;
  const bad = [];
  if (!v || typeof v !== 'object') return ['variation is an object'];
  for (const k of Object.keys(v))
    if (!keys.includes(k))
      bad.push(`variation has no key "${k}" (one parameter only)`);
  if (typeof v.param !== 'string' || !v.param) bad.push('param names one key');
  else if (!locate(scene, v.param))
    bad.push(
      `param "${v.param}" is not a numeric key of the step's setup.settings or of a starPair or system stage in force`
    );
  const vals = v.values;
  if (!Array.isArray(vals) || vals.length < 2 || vals.length > MAX_RUNS)
    bad.push(`values lists 2 to ${MAX_RUNS} numbers`);
  else if (!vals.every(Number.isFinite) || new Set(vals).size !== vals.length)
    bad.push('values are distinct finite numbers');
  if (!(v.runFor > 0)) bad.push('runFor is simulated days, above zero');
  if (!Array.isArray(v.read) || !v.read.length || !v.read.every(Boolean))
    bad.push('read lists the probe row ids to take');
  if (typeof v.label !== 'string' || !v.label.trim())
    bad.push('label names the parameter');
  return bad;
}

/** The scene's stage with `param` set to `value` and no camera fit asked for. */
const variedStage = (scene, loc, param, value) => ({
  ...scene.stage,
  fit: false,
  [loc.name]: { ...scene.stage[loc.name], fit: false, [param]: value },
});

// --- Saved runs: ordinary responses, `<step>:run:<n>`, one JSON string each ---

const KEY = ':run:';
const parsed = raw => {
  try {
    return JSON.parse(raw) || null;
  } catch {
    return null;
  }
};

/** The runs a student has made on a step, in the order made. */
export const runsOf = (responses, id) =>
  Array.from({ length: MAX_RUNS }, (_, i) =>
    parsed(responses[`${id}${KEY}${i + 1}`])
  ).filter(Boolean);

const letter = n => String.fromCharCode(65 + n);

// --- A run -------------------------------------------------------------------

/** The run in flight: {id, memo, host, over}. */
let run = null;
/** The value index each step has selected, by response-key prefix. */
const chosen = new Map();
/** The frame source; tests replace it. */
let env = { raf: cb => requestAnimationFrame(cb), pin: setFixedStep };
export const setEnv = e => (env = { ...env, ...e });

/** Whether a run is under way. */
export const running = () => Boolean(run);

/**
 * Everything a run must be able to put back, taken before anything changes.
 * @returns {object} The memo
 */
function remember() {
  const selected = state.selectedObject?.object?.id ?? null;
  return {
    payload: captureShareState({
      kind: 'full',
      includeCamera: true,
      forExperiment: true,
    }),
    stage: stageMemo(),
    selected,
  };
}

/** Put the world back as `memo` found it, and bind the step's roles again. */
function putBack(memo, h, onStage) {
  env.pin(0);
  applyShareState(JSON.parse(JSON.stringify(memo.payload)));
  if (onStage) adoptStage(memo.stage, allBodies());
  else h.runs.bind();
  h.runs.applyLocks();
  const body = allBodies().find(b => b.id === memo.selected);
  if (body) selectBody(body);
}

/**
 * Stop the run in flight, if any, and put the scene back. Safe at any time,
 * and called before every step change and when the lesson closes.
 * @returns {boolean} Whether a run was stopped
 */
export function release() {
  const r = run;
  if (!r) return false;
  run = null;
  r.over = true;
  try {
    putBack(r.memo, r.host, r.onStage);
  } catch (err) {
    console.warn(err);
  }
  return true;
}

/** Let the clock run for `frames` pinned frames; false when over or stalled. */
function advance(r, frames) {
  const dt = frameAdvance(STEP_SECONDS, SETTINGS.sim_speed, DT);
  const start = getSimulationTime();
  let last = start;
  let idle = 0;
  return new Promise(resolve => {
    const tick = () => {
      if (r.over) return resolve(false);
      const now = getSimulationTime();
      if (now - start >= (frames - 0.5) * dt) return resolve(true);
      idle = now === last ? idle + 1 : 0;
      last = now;
      if (idle > STALL) return resolve(false);
      env.raf(tick);
    };
    env.raf(tick);
  });
}

/** The frames a run of `days` simulated days takes at the pinned step. */
export const framesFor = days =>
  Math.max(
    1,
    Math.round(
      (days * 86400) /
        timeUnitSeconds() /
        frameAdvance(STEP_SECONDS, SETTINGS.sim_speed, DT)
    )
  );

/**
 * One run with the parameter at values[index]. Resolves to the saved record, or
 * null when it was canceled, stalled or could not start; the scene is back
 * either way.
 */
export async function start(h, index) {
  const step = h.currentStep();
  const v = step.variation;
  const scene = sceneIn(h.steps(), step);
  const loc = locate(scene, v.param);
  if (run || !loc || variationProblems(step, scene).length) return null;
  if (loc.kind === 'stage' && !h.runs.stageUp()) return null;
  const id = h.stepId();
  const r = {
    id,
    host: h,
    memo: remember(),
    onStage: loc.kind === 'stage',
    over: false,
  };
  run = r;
  const value = v.values[index];
  let record = null;
  try {
    if (r.onStage)
      applyStage(variedStage(scene, loc, v.param, value), { force: true });
    else {
      applyShareState(
        h.runs.payloadFromSetup({
          ...scene.setup,
          settings: { ...scene.setup.settings, [v.param]: value },
          paused: false,
        })
      );
      h.runs.applyLocks();
      h.runs.bind();
    }
    state.paused = false;
    // The pin is what makes the result the same at any frame rate.
    env.pin(STEP_SECONDS);
    h.paint();
    const frames = framesFor(v.runFor);
    if (await advance(r, frames)) {
      const rows = (h.runs.probe(step) || []).map(printed);
      record = {
        v: value,
        f: frames,
        r: v.read.map(want => {
          const row = rows.find(x => x.id === want);
          return {
            r: want,
            l: String(row?.label ?? want).replace(/<[^>]*>/g, ''),
            x: row?.value ?? '',
          };
        }),
      };
    }
  } catch (err) {
    console.warn(err);
  }
  // Canceled from outside: release() has already put the scene back.
  if (run !== r) return null;
  run = null;
  putBack(r.memo, h, r.onStage);
  return record;
}

// --- Markup and wiring ---------------------------------------------------------

const said = rec => rec.r.map(x => `${x.l} ${x.x}`).join('; ');

/** The table of runs, empty when there are none. */
function table(step, rows) {
  if (!rows.length)
    return `<p class="inv-import-hint">${escape(t('inv.run.empty'))}</p>`;
  const head = rows[0].r
    .map(x => `<th scope="col">${escape(x.l)}</th>`)
    .join('');
  const body = rows
    .map(
      (rec, i) =>
        `<tr><th scope="row" tabindex="-1" data-run-row="${i + 1}">${letter(i)}</th><td>${escape(formatNumber(rec.v))}</td>${rec.r
          .map(x => `<td>${escape(x.x)}</td>`)
          .join('')}</tr>`
    )
    .join('');
  return `<div class="inv-plot-table-wrap"><table class="inv-plot-table"><caption>${escape(
    t('inv.run.caption', { param: step.variation.label })
  )}</caption><thead><tr><th scope="col">${escape(t('inv.run.col'))}</th><th scope="col">${escape(
    step.variation.label
  )}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/**
 * The selected value index: the student's choice, else the first value before
 * any run, else the value last run (so the next run needs a Change).
 */
function selection(step, id, rows) {
  const vals = step.variation.values;
  const at = chosen.get(id);
  if (at !== undefined && vals[at] !== undefined) return at;
  return rows.length ? Math.max(0, vals.indexOf(rows[rows.length - 1].v)) : 0;
}

/** The runs section's inner markup for the step as it stands. */
function inner(step, c) {
  const v = step.variation;
  const rows = runsOf(c.responses, c.id);
  const at = selection(step, c.id, rows);
  const used = rows.some(r => r.v === v.values[at]);
  const full = rows.length >= v.values.length;
  const before =
    predictionState(c.active?.steps, step, c.visited, c.responses) ===
    'uncommitted';
  const busy = Boolean(run && run.id === c.id);
  const why = busy
    ? t('inv.run.running', { run: letter(rows.length) })
    : before
      ? t('inv.run.predict')
      : full
        ? t('inv.run.all')
        : used
          ? t('inv.run.same', { param: v.label })
          : '';
  const off = (on, ...more) => (on || more.some(Boolean) ? ' disabled' : '');
  return `<p class="inv-import-hint" data-runs-value>${escape(
    t('inv.run.value', { param: v.label, value: formatNumber(v.values[at]) })
  )}</p><div class="inv-import-row"><button type="button" class="inv-import-btn" data-run-change${off(busy, before, full)}>${escape(
    t('inv.run.change', { param: v.label })
  )}</button><button type="button" class="inv-import-btn" data-run-go${off(busy, before, full, used)}>${escape(
    t('inv.run.go', { run: letter(rows.length) })
  )}</button>${
    busy
      ? `<button type="button" class="inv-import-btn" data-run-cancel>${escape(t('inv.run.cancel'))}</button>`
      : rows.length
        ? `<button type="button" class="inv-import-btn" data-run-clear>${escape(t('inv.run.clear'))}</button>`
        : ''
  }</div><p class="inv-import-hint" data-runs-status>${escape(why)}</p>${table(step, rows)}`;
}

/** The section a step with a variation carries, or ''. */
export const markup = (step, c) =>
  step.variation
    ? `<section class="inv-runs" data-runs aria-label="${escape(step.variation.label)}">${inner(step, c)}</section>`
    : '';

/** Wire the open step's section: change, run, cancel, clear. */
export function mount(h) {
  const step = h.currentStep();
  const v = step?.variation;
  const secEl = () => h.els().body.querySelector('[data-runs]');
  if (!v || !secEl()) return;
  const id = h.stepId();
  // Re-read each time: a run outlives the panel's redraws, and the section it
  // paints into is whichever one is on screen when it finishes.
  const paint = (focus = '[data-run-go]') => {
    const sec = secEl();
    if (!sec) return;
    sec.innerHTML = inner(step, {
      id,
      responses: h.responses(),
      active: { steps: h.steps() },
      visited: h.visited(),
    });
    wire(sec);
    sec.querySelector(focus)?.focus();
  };
  const wire = sec => {
    const on = (sel, fn) =>
      sec.querySelector(sel)?.addEventListener('click', fn);
    on('[data-run-change]', () => {
      const rows = runsOf(h.responses(), id);
      const left = v.values
        .map((_, i) => i)
        .filter(i => !rows.some(r => r.v === v.values[i]));
      const at = selection(step, id, rows);
      chosen.set(id, left[(left.indexOf(at) + 1) % left.length] ?? at);
      paint('[data-run-change]');
    });
    on('[data-run-go]', async () => {
      const n = runsOf(h.responses(), id).length;
      const at = selection(step, id, runsOf(h.responses(), id));
      const record = await start(
        { ...h, paint: () => paint('[data-run-cancel]') },
        at
      );
      // Canceled, or the student left the step: nothing to record or announce.
      if (h.stepId() !== id) return;
      if (!record) return paint();
      h.responses()[`${id}${KEY}${n + 1}`] = JSON.stringify(record);
      h.save();
      chosen.delete(id);
      paint(`[data-run-row="${n + 1}"]`);
      announce(t('inv.run.done', { run: letter(n), readings: said(record) }));
    });
    on('[data-run-cancel]', () => {
      release();
      paint('[data-run-go]');
      announce(t('inv.run.canceled'));
    });
    on('[data-run-clear]', () => {
      for (let i = 1; i <= MAX_RUNS; i++)
        delete h.responses()[`${id}${KEY}${i}`];
      chosen.delete(id);
      h.save();
      paint();
      announce(t('inv.run.cleared'));
    });
  };
  wire(secEl());
}

/** Mark values as lesson text once, so a probe's printed value translates. */
export const printed = row => ({
  ...row,
  label: lessonText(row.label),
  value: lessonText(String(row.value)),
});
