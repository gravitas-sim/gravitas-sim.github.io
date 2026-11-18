// Controlled runs (a step's `variation: {param, values, runFor, read, label}`):
// the student runs the lesson's own scene, changes the one parameter, runs it
// again and reads the declared rows side by side. Fetched only where a step
// declares one (js/investigations.js loadSeams); imports nothing, because a lazy
// module's imports move shared modules into chunks of their own on every lesson
// route. Words and helpers arrive by setKit (stepView.js runsModule), the world's
// functions with the host (`h.runs.world`).
//
// A run captures the full state (the lesson's own entry-and-exit authority),
// rebuilds the step's setup or stage with the parameter set, pins the step
// (`setFixedStep`, the bench's call: a frame is the same simulated time at any
// frame rate), runs a fixed number of frames, reads the probe rows, lifts the pin
// and applies the captured state. Cancel, leaving the step and closing the
// lesson do the same. Not restored (no later reading depends on them): trails,
// the timeline buffer, the random-number position.

let K = {};
export const setKit = k => (K = k);
const escape = x => K.escape(x);
const t = (...a) => K.t(...a);
const formatNumber = x => K.formatNumber(x);
const announce = m => K.announce(m);
const predictionState = (...a) => K.predictionState(...a);
/** The world's functions, from the host. */
let W = {};

/** The most runs a table holds. */
export const MAX_RUNS = 4;
/** Stage kinds a controlled run can vary: engine-owned, so the integrator is the physics. */
const KINDS = ['starPair', 'system'];
/** Stage keys that are optional on their kind, and so may be varied though absent. */
const OPTIONAL = { system: ['starMassSun'] };
/** Frames with no clock movement before a run gives up. */
const STALL = 240;

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

/** Whether a declaration can run (tools/authoring/variationRules.mjs says what is wrong). */
export const usable = (v, scene) =>
  Boolean(
    v &&
    locate(scene, v.param) &&
    Array.isArray(v.values) &&
    v.values.length >= 2 &&
    v.values.length <= MAX_RUNS &&
    v.values.every(Number.isFinite) &&
    v.runFor > 0 &&
    Array.isArray(v.read) &&
    v.read.length
  );

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
let env = { raf: cb => requestAnimationFrame(cb), pin: null };
export const setEnv = e => (env = { ...env, ...e });
/** Pin the integration step (the bench's call), or lift it with 0. */
const pin = s => (env.pin || W.setFixedStep)(s);

/** Whether a run is under way. */
export const running = () => Boolean(run);

/**
 * Everything a run must be able to put back, taken before anything changes.
 * @returns {object} The memo
 */
function remember() {
  const selected = W.state.selectedObject?.object?.id ?? null;
  return {
    payload: W.captureShareState({
      kind: 'full',
      includeCamera: true,
      forExperiment: true,
    }),
    stage: W.stageMemo(),
    selected,
    // A planet's surface class: drawn, but not in the share-link body codec.
    density: W.allBodies().flatMap(b =>
      b.density === undefined ? [] : [[b.id, b.density]]
    ),
  };
}

/** Put the world back as `memo` found it, and bind the step's roles again. */
function putBack(memo, h, onStage) {
  pin(0);
  W.applyShareState(JSON.parse(JSON.stringify(memo.payload)));
  if (onStage) W.adoptStage(memo.stage, W.allBodies());
  else h.runs.bind();
  h.runs.applyLocks();
  const all = W.allBodies();
  for (const [id, density] of memo.density) {
    const b = all.find(x => x.id === id);
    if (b) b.density = density;
  }
  const body = all.find(b => b.id === memo.selected);
  if (body) W.selectBody(body);
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
  const dt = W.frameSeconds();
  const start = W.getSimulationTime();
  let last = start;
  let idle = 0;
  return new Promise(resolve => {
    const tick = () => {
      if (r.over) return resolve(false);
      const now = W.getSimulationTime();
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
    Math.round((days * 86400) / W.timeUnitSeconds() / W.frameSeconds())
  );

/**
 * One run with the parameter at values[index]. Resolves to the saved record, or
 * null when it was canceled, stalled or could not start; the scene is back
 * either way.
 */
export async function start(h, index) {
  W = h.runs.world;
  const step = h.currentStep();
  const v = step.variation;
  const scene = sceneIn(h.steps(), step);
  const loc = locate(scene, v.param);
  if (run || !loc || !usable(v, scene)) return null;
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
      W.applyStage(variedStage(scene, loc, v.param, value), { force: true });
    else {
      W.applyShareState(
        h.runs.payloadFromSetup({
          ...scene.setup,
          settings: { ...scene.setup.settings, [v.param]: value },
          paused: false,
        })
      );
      h.runs.applyLocks();
      h.runs.bind();
    }
    // Every run starts its own clock at zero, and runs unpaused.
    W.setSimulationTime(0);
    W.state.paused = false;
    // The pin is what makes the result the same at any frame rate.
    pin(W.STEP_SECONDS);
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
      ? t('inv.take.predict')
      : full
        ? t('inv.run.all')
        : used
          ? t('inv.run.same', { param: v.label })
          : '';
  const off = (on, ...more) => (on || more.some(Boolean) ? ' disabled' : '');
  return `<p class="inv-import-hint" data-runs-value>${escape(
    `${v.label}: ${formatNumber(v.values[at])}`
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
  W = h.runs.world;
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
      announce(t('inv.run.empty'));
    });
  };
  wire(secEl());
}

/** Mark values as lesson text once, so a probe's printed value translates. */
export const printed = row => ({
  ...row,
  label: K.lessonText(row.label),
  value: K.lessonText(String(row.value)),
});
