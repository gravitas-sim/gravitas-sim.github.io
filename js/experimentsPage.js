// =============================================================================
// /experiments/: build an experiment, run it in Worker realms, read the result
// -----------------------------------------------------------------------------
// The bench's sweep, made into something that can be left running: the same
// laboratory scenarios and parameters, a seed set, and trials that run in
// parallel in disposable realms (js/experiments/scheduler.js) instead of one
// after another on the live world. Nothing here draws the simulation; this
// page never loads js/physics.js itself - only its Workers do.
//
// Before anything runs, one trial is planned in a realm and the whole
// experiment priced against this device's profile. An experiment that would
// outlast the device's budget or its memory is refused, with the reason, and
// the Run button stays off. A run can be canceled; a run that stops for any
// reason keeps what it finished, as a checkpoint, so Resume picks up the
// trials that are left. EXPERIMENTS.md describes all of it.
// =============================================================================

import {
  LANGUAGES,
  language,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './experiments/i18n.js';
import {
  EXPERIMENT_METRICS,
  FORMAT,
  FORMAT_VERSION,
  PLATFORM_RANGE,
  PROFILES,
  RESULT_FORMAT,
  RESULT_VERSION,
  STATUS,
  SWEEPABLE,
  concurrencyFor,
  defaultLimits,
  detectProfile,
  estimate,
  experimentHash,
  migrateExperiment,
  planTrials,
  refusals,
  reproducibility,
  resultCsv,
  summarizeExperiment,
  validateExperiment,
} from './experiments/experimentManifest.js';
import { RESUMABLE, createScheduler } from './experiments/scheduler.js';
import { METRIC_UNITS } from './experiments/metrics.js';

const $ = id => document.getElementById(id);
const CHECKPOINT = 'gravitas_experiment_checkpoint_';
const CHECKPOINT_MAX_CHARS = 1_500_000;
const nav = typeof navigator === 'undefined' ? {} : navigator;
const profile = detectProfile(nav);
let plan = null;
/** The manifest `plan` was priced for, so an unchanged form is not re-planned. */
let plannedHash = null;
let fingerprint = null;
let planToken = 0;
let running = null;
let lastResult = null;

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const spawn = () =>
  new Worker(new URL('./experiments/experimentWorker.js', import.meta.url), {
    type: 'module',
  });

/** The build this page belongs to, as the bench records it. */
function appVersion() {
  return (
    document.documentElement.dataset.build ||
    document.querySelector('meta[name="gravitas-build"]')?.content ||
    'dev'
  );
}

// --- The form ------------------------------------------------------------------

function fillScenarios() {
  const select = $('xpScenario');
  const keep = select.value;
  select.replaceChildren(
    ...Object.keys(SWEEPABLE).map(key => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = t(`exp.scenario.${slug(key)}`);
      return o;
    })
  );
  if (keep) select.value = keep;
}

function fillParameters() {
  const lab = SWEEPABLE[$('xpScenario').value];
  const select = $('xpParam');
  const keep = select.value;
  select.replaceChildren(
    ...lab.parameters.map(p => {
      const o = document.createElement('option');
      o.value = p.key;
      o.textContent = t(`exp.param.${p.key}`);
      return o;
    })
  );
  if (lab.parameters.some(p => p.key === keep)) select.value = keep;
}

function fillMetrics() {
  const select = $('xpMetric');
  const keep = select.value || 'distance_to_primary';
  select.replaceChildren(
    ...EXPERIMENT_METRICS.map(id => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = `${t(`exp.metric.${id}`)} (${METRIC_UNITS[id]})`;
      return o;
    })
  );
  select.value = keep;
}

/** Sensible bounds for the chosen parameter, inside its validated range. */
function resetRange() {
  const p = SWEEPABLE[$('xpScenario').value].parameters.find(
    x => x.key === $('xpParam').value
  );
  const lo = p.exclude && p.min < 0 ? p.exclude.to : p.min;
  $('xpFrom').value = String(lo);
  $('xpTo').value = String(p.max);
  $('xpFrom').min = $('xpTo').min = String(p.min);
  $('xpFrom').max = $('xpTo').max = String(p.max);
  $('xpRangeHint').textContent = t('exp.values.range', {
    min: p.min,
    max: p.max,
    exclude: p.exclude ? t('exp.values.exclude', p.exclude) : '',
  });
}

/** The manifest the form describes. */
function manifestFromForm() {
  const scenario = $('xpScenario').value;
  const seeds = Math.max(
    1,
    Math.min(20, Math.round(Number($('xpSeeds').value) || 1))
  );
  const base = ($('xpSeedBase').value || 'run').trim();
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    title: `${scenario}: ${t(`exp.param.${$('xpParam').value}`)}`,
    model: { scenario, platform: PLATFORM_RANGE },
    initial: { settings: {} },
    seeds: Array.from({ length: seeds }, (_, i) =>
      seeds === 1 ? base : `${base}-${i + 1}`
    ),
    vary: [
      {
        parameter: $('xpParam').value,
        from: Number($('xpFrom').value),
        to: Number($('xpTo').value),
        count: Math.round(Number($('xpCount').value)),
      },
    ],
    observables: {
      metrics: [$('xpMetric').value],
      roles: SWEEPABLE[scenario].roles,
    },
    stop: { duration: Number($('xpDuration').value), events: [] },
    numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
    limits: defaultLimits(profile, nav),
    summaries: ['mean', 'min', 'max', 'spread', 'status-counts'],
  };
}

// --- Planning: one trial built in a realm, then the whole priced -----------

function planOnce(manifest) {
  return new Promise((resolve, reject) => {
    const w = spawn();
    const timer = setTimeout(() => {
      w.terminate();
      reject(new Error(t('exp.plan.timeout')));
    }, 15_000);
    w.onmessage = e => {
      clearTimeout(timer);
      w.terminate();
      if (e.data?.type === 'plan') resolve(e.data);
      else reject(new Error(e.data?.message || t('exp.plan.failed')));
    };
    w.onerror = e => {
      clearTimeout(timer);
      w.terminate();
      e.preventDefault?.();
      reject(new Error(e.message || t('exp.plan.failed')));
    };
    w.postMessage({ type: 'plan', manifest, trial: planTrials(manifest)[0] });
  });
}

async function refresh() {
  const manifest = manifestFromForm();
  const token = ++planToken;
  const problems = validateExperiment(manifest);
  $('xpRun').disabled = true;
  showRefusals([]);
  if (problems.length) {
    $('xpEstimate').textContent = t('exp.invalid', {
      path: problems[0].path,
      message: problems[0].message,
    });
    return;
  }
  const hash = experimentHash(manifest);
  if (hash !== plannedHash || !plan) {
    $('xpEstimate').textContent = t('exp.plan.pending');
    try {
      const answer = await planOnce(manifest);
      if (token !== planToken) return;
      plan = answer.plan;
      fingerprint = answer.fingerprint;
      plannedHash = hash;
    } catch (err) {
      if (token !== planToken) return;
      $('xpEstimate').textContent = err.message;
      return;
    }
  }
  const est = estimate(manifest, plan, profile, manifest.limits.concurrency);
  const refused = refusals(est, manifest, profile);
  $('xpEstimate').textContent = t(
    est.timed ? 'exp.estimate' : 'exp.estimate.untimed',
    {
      trials: est.trials,
      bodies: est.bodies,
      steps: est.stepsPerTrial.toLocaleString(language()),
      seconds: Math.max(1, Math.round(est.wallMs / 1000)),
      realms: est.concurrency,
    }
  );
  showRefusals(refused);
  $('xpRun').disabled = refused.length > 0 || Boolean(running);
  const saved = loadCheckpoint(manifest);
  $('xpResume').hidden = !(saved && saved.length && !running);
  if (saved?.length)
    $('xpResume').textContent = t('exp.resume', {
      done: saved.length,
      total: est.trials,
    });
}

function showRefusals(list) {
  const ul = $('xpRefusals');
  ul.hidden = !list.length;
  ul.replaceChildren(
    ...list.map(r => {
      const li = document.createElement('li');
      li.textContent = t(`exp.refuse.${r.reason}`, formatDetail(r.detail));
      return li;
    })
  );
}

/** A refusal's numbers in the units its message uses: seconds and megabytes. */
function formatDetail(d) {
  if ('ms' in d)
    return { seconds: Math.round(d.ms / 1000), max: Math.round(d.max / 1000) };
  if ('bytes' in d)
    return { mb: (d.bytes / 1e6).toFixed(1), max: (d.max / 1e6).toFixed(1) };
  return d;
}

// --- Checkpoints ------------------------------------------------------------------

function loadCheckpoint(manifest) {
  try {
    const raw = window.localStorage?.getItem(
      CHECKPOINT + experimentHash(manifest)
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCheckpoint(manifest, trials) {
  try {
    // Only outcomes of the physics: a canceled or timed-out trial is run
    // again on Resume, so it is not something Resume has already done.
    const text = JSON.stringify(
      trials.filter(r => r && RESUMABLE.includes(r.status))
    );
    // A checkpoint that would crowd out everything else the site keeps is not
    // one worth keeping; the run still finishes, it just cannot be resumed.
    if (text.length > CHECKPOINT_MAX_CHARS) return false;
    window.localStorage?.setItem(CHECKPOINT + experimentHash(manifest), text);
    return true;
  } catch {
    return false;
  }
}

function dropCheckpoint(manifest) {
  try {
    window.localStorage?.removeItem(CHECKPOINT + experimentHash(manifest));
  } catch {
    /* nothing to drop */
  }
}

// --- Running ----------------------------------------------------------------------

async function run({ resume = false } = {}) {
  const manifest = manifestFromForm();
  if (validateExperiment(manifest).length || !plan) return;
  const trials = planTrials(manifest);
  const completed = resume ? loadCheckpoint(manifest) || [] : [];
  if (!resume) dropCheckpoint(manifest);
  const finished = [];
  for (const r of completed) finished[r.index] = r;
  let announced = 0;
  let lastAnnounce = 0;
  let checkpointOk = true;
  setRunning(true);
  const startedAt = new Date().toISOString();
  const scheduler = createScheduler({
    manifest,
    trials,
    spawn,
    concurrency: manifest.limits.concurrency,
    completed,
    now: () => performance.now(),
    onTrial: result => {
      finished[result.index] = result;
      if (checkpointOk) checkpointOk = saveCheckpoint(manifest, finished);
    },
    onProgress: state => {
      $('xpProgress').value = Math.round(state.fraction * 1000);
      // The live region is told at most once a second, and whenever a trial
      // finishes, so a screen reader hears progress rather than a torrent.
      const nowMs = performance.now();
      if (state.done !== announced || nowMs - lastAnnounce > 1000) {
        lastAnnounce = nowMs;
        announced = state.done;
        $('xpStatus').textContent = t('exp.progress', {
          done: state.done,
          total: state.total,
          running: state.running.length,
        });
      }
    },
  });
  running = scheduler;
  const out = await scheduler.run();
  running = null;
  setRunning(false);
  lastResult = {
    format: RESULT_FORMAT,
    formatVersion: RESULT_VERSION,
    hash: experimentHash(manifest),
    manifest,
    engine: { fingerprint, app: appVersion(), platform: '1.0.0' },
    environment: {
      profile,
      concurrency: manifest.limits.concurrency,
      cores: nav.hardwareConcurrency || null,
    },
    startedAt,
    finishedAt: new Date().toISOString(),
    status: out.status,
    stopReason: out.stopReason,
    resumedTrials: out.resumed,
    elapsedMs: Math.round(out.elapsedMs),
    trials: out.trials,
    summary: summarizeExperiment(manifest, out.trials),
  };
  if (out.status === 'complete') dropCheckpoint(manifest);
  $('xpStatus').textContent = t(`exp.done.${out.status}`, {
    total: out.trials.length,
    ok: lastResult.summary.statusCounts[STATUS.OK],
    seconds: (out.elapsedMs / 1000).toFixed(1),
    reason: out.stopReason || '',
  });
  if (!checkpointOk)
    $('xpStatus').textContent += ` ${t('exp.checkpoint.skipped')}`;
  renderResult(lastResult);
  refresh();
}

function setRunning(on) {
  $('xpRun').disabled = on;
  $('xpCancel').hidden = !on;
  $('xpResume').hidden = true;
  $('xpProgressBox').hidden = false;
  for (const id of [
    'xpScenario',
    'xpParam',
    'xpFrom',
    'xpTo',
    'xpCount',
    'xpSeeds',
    'xpSeedBase',
    'xpDuration',
    'xpMetric',
  ]) {
    $(id).disabled = on;
  }
}

// --- Reading the result --------------------------------------------------------

const fmt = v =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : Number(v.toPrecision(5)).toString();

function renderResult(result) {
  const m = result.manifest;
  const metric = m.observables.metrics[0];
  const key = m.vary[0].parameter;
  $('xpResults').hidden = false;
  const unit = METRIC_UNITS[metric];
  const groups = result.summary.metrics[metric];

  $('xpSummaryCaption').textContent = t('exp.summary.caption', {
    metric: t(`exp.metric.${metric}`),
    unit,
    seeds: m.seeds.length,
  });
  $('xpSummaryBody').replaceChildren(
    ...groups.map(g => {
      const tr = document.createElement('tr');
      for (const [i, v] of [
        g.params[key],
        g.mean,
        g.min,
        g.max,
        g.spread,
        g.n,
        g.partial + g.missing,
      ].entries()) {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = i >= 5 ? String(v) : fmt(v);
        tr.append(cell);
      }
      return tr;
    })
  );

  $('xpTrialsBody').replaceChildren(
    ...result.trials.map(tr => {
      const row = document.createElement('tr');
      const cells = [
        String(tr.index + 1),
        fmt(tr.params[key]),
        tr.seed,
        t(`exp.status.${tr.status}`),
        fmt(tr.results?.[metric]),
        (tr.steps || 0).toLocaleString(language()),
        String(tr.wallMs || 0),
      ];
      cells.forEach((text, i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = text;
        if (i === 3 && tr.status !== STATUS.OK) cell.className = 'xp-bad';
        row.append(cell);
      });
      if (tr.error) row.title = tr.error;
      return row;
    })
  );
  drawPlot(result, metric, key);
  $('xpManifest').textContent = JSON.stringify(m, null, 2);
}

/**
 * Each trial's value against the parameter, and each value's mean. An SVG,
 * so it scales and prints; the summary table beside it is the same numbers
 * for anybody who cannot see it, and the plot says so.
 */
function drawPlot(result, metric, key) {
  const svg = $('xpPlot');
  const W = 640;
  const H = 320;
  const pad = { l: 64, r: 16, t: 16, b: 44 };
  const pts = result.trials
    .filter(
      tr => tr.status === STATUS.OK && Number.isFinite(tr.results?.[metric])
    )
    .map(tr => [tr.params[key], tr.results[metric]]);
  const failed = result.trials.filter(
    tr => !(tr.status === STATUS.OK && Number.isFinite(tr.results?.[metric]))
  );
  const xs = result.trials.map(tr => tr.params[key]);
  const ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = ys.length ? Math.min(...ys) : 0;
  const y1 = ys.length ? Math.max(...ys) : 1;
  // A planet ejected at one value and bound at the next puts hundreds of AU
  // beside one: on a linear axis every bound orbit sits on the floor. Across
  // more than two orders of magnitude of positive values the axis is
  // logarithmic, and its label says so.
  const log = ys.length > 1 && y0 > 0 && y1 / y0 > 100;
  const f = log ? Math.log10 : v => v;
  const X = x => pad.l + ((x - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
  const Y = y =>
    H - pad.b - ((f(y) - f(y0)) / (f(y1) - f(y0) || 1)) * (H - pad.t - pad.b);
  const ns = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, text) => {
    const e = document.createElementNS(ns, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const kids = [
    el('line', {
      x1: pad.l,
      y1: H - pad.b,
      x2: W - pad.r,
      y2: H - pad.b,
      class: 'xp-axis',
    }),
    el('line', {
      x1: pad.l,
      y1: pad.t,
      x2: pad.l,
      y2: H - pad.b,
      class: 'xp-axis',
    }),
    el('text', { x: pad.l, y: H - 10, class: 'xp-tick' }, fmt(x0)),
    el(
      'text',
      { x: W - pad.r, y: H - 10, class: 'xp-tick', 'text-anchor': 'end' },
      fmt(x1)
    ),
    el('text', { x: 8, y: H - pad.b, class: 'xp-tick' }, fmt(y0)),
    el('text', { x: 8, y: pad.t + 10, class: 'xp-tick' }, fmt(y1)),
    el(
      'text',
      {
        x: (W + pad.l) / 2,
        y: H - 10,
        class: 'xp-label',
        'text-anchor': 'middle',
      },
      t(`exp.param.${key}`)
    ),
  ];
  if (log)
    kids.push(
      el(
        'text',
        { x: pad.l + 6, y: pad.t + 10, class: 'xp-tick' },
        t('exp.plot.log')
      )
    );
  for (const [x, y] of pts)
    kids.push(el('circle', { cx: X(x), cy: Y(y), r: 3.5, class: 'xp-point' }));
  const means = result.summary.metrics[metric].filter(g => g.mean !== null);
  if (means.length > 1) {
    kids.push(
      el('polyline', {
        points: means.map(g => `${X(g.params[key])},${Y(g.mean)}`).join(' '),
        class: 'xp-mean',
      })
    );
  }
  for (const tr of failed)
    kids.push(
      el(
        'text',
        {
          x: X(tr.params[key]),
          y: H - pad.b - 4,
          class: 'xp-fail',
          'text-anchor': 'middle',
        },
        '×'
      )
    );
  svg.replaceChildren(...kids);
  svg.setAttribute(
    'aria-label',
    t('exp.plot.label', {
      metric: t(`exp.metric.${metric}`),
      param: t(`exp.param.${key}`),
      ok: pts.length,
      failed: failed.length,
    })
  );
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- A saved result, checked against this build ---------------------------------

async function checkSaved() {
  const out = $('xpCheckOut');
  let parsed;
  try {
    parsed = JSON.parse($('xpCheckInput').value);
  } catch {
    out.textContent = t('exp.check.notJson');
    return;
  }
  if (parsed?.format === FORMAT || typeof parsed?.parameter === 'string') {
    const { manifest, error, notes } = migrateExperiment(parsed);
    out.textContent = error
      ? t('exp.check.cannot', { reason: error })
      : t('exp.check.manifest', { notes: notes.join('; ') || '—' });
    if (manifest) {
      const problems = validateExperiment(manifest);
      if (problems.length)
        out.textContent += ` ${t('exp.invalid', problems[0])}`;
    }
    return;
  }
  if (!fingerprint) {
    try {
      fingerprint = (await planOnce(manifestFromForm())).fingerprint;
    } catch {
      /* reported below as an unknown engine */
    }
  }
  const verdict = reproducibility(parsed, {
    engine: fingerprint,
    app: appVersion(),
  });
  out.textContent = verdict.reproducible
    ? t('exp.check.yes', { notes: verdict.notes.join('; ') || '—' })
    : t('exp.check.no', { reasons: verdict.reasons.join('; ') });
}

// --- Start ----------------------------------------------------------------------

function renderLanguageSwitch() {
  const box = $('langSwitch');
  box.replaceChildren(
    ...LANGUAGES.map(({ id, endonym }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-button';
      b.lang = id;
      b.textContent = endonym;
      b.setAttribute('aria-pressed', String(id === language()));
      b.addEventListener('click', () => {
        setLanguage(id);
        translateAll();
      });
      return b;
    })
  );
}

function translateAll() {
  translatePage();
  renderLanguageSwitch();
  fillScenarios();
  fillParameters();
  fillMetrics();
  $('xpDevice').textContent = t(`exp.device.${profile}`, {
    realms: concurrencyFor(profile, nav),
    cores: nav.hardwareConcurrency || '?',
    minutes: PROFILES[profile].maxWallMs / 60_000,
  });
  if (lastResult) renderResult(lastResult);
  refresh();
}

function start() {
  setLanguage(preferred());
  translatePage();
  renderLanguageSwitch();
  fillScenarios();
  fillParameters();
  fillMetrics();
  resetRange();
  $('xpDevice').textContent = t(`exp.device.${profile}`, {
    realms: concurrencyFor(profile, nav),
    cores: nav.hardwareConcurrency || '?',
    minutes: PROFILES[profile].maxWallMs / 60_000,
  });
  if (typeof Worker === 'undefined') {
    $('xpEstimate').textContent = t('exp.noWorkers');
    return;
  }
  let pending = 0;
  const later = () => {
    clearTimeout(pending);
    pending = setTimeout(refresh, 250);
  };
  $('xpScenario').addEventListener('change', () => {
    fillParameters();
    resetRange();
    later();
  });
  $('xpParam').addEventListener('change', () => {
    resetRange();
    later();
  });
  for (const id of [
    'xpFrom',
    'xpTo',
    'xpCount',
    'xpSeeds',
    'xpSeedBase',
    'xpDuration',
    'xpMetric',
  ]) {
    $(id).addEventListener('input', later);
  }
  $('xpForm').addEventListener('submit', e => {
    e.preventDefault();
    run();
  });
  $('xpResume').addEventListener('click', () => run({ resume: true }));
  $('xpCancel').addEventListener('click', () =>
    running?.cancel(t('exp.canceled'))
  );
  $('xpDownloadJson').addEventListener(
    'click',
    () =>
      lastResult &&
      download(
        `experiment-${lastResult.hash}.json`,
        `${JSON.stringify(lastResult, null, 2)}\n`,
        'application/json'
      )
  );
  $('xpDownloadCsv').addEventListener(
    'click',
    () =>
      lastResult &&
      download(
        `experiment-${lastResult.hash}.csv`,
        resultCsv(lastResult),
        'text/csv'
      )
  );
  $('xpCheckBtn').addEventListener('click', checkSaved);
  refresh();
}

start();
