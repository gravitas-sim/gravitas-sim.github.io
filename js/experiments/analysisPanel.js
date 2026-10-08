// =============================================================================
// /experiments/: the analysis laboratory
// -----------------------------------------------------------------------------
// A lazy chunk: js/experimentsPage.js imports it when "Analyze" is opened, and
// it brings everything it needs, so the page's first load does not grow. It
// reads the page's last result, or one saved from the page and opened here,
// and hands it to js/analysis/sweepAnalysis.js, then shows what came back:
//
//   - a summary in words, and the warnings: what the result does not say;
//   - every trial, as a plot and a table sharing one selection
//     (js/plot/select.js), so a drag across the plot selects the
//     rows and the summary of the selected trials follows;
//   - each setting's numbers with their intervals, the slopes and the shares,
//     and the distribution as a histogram with its counts in a table;
//   - the methods in words, and the analysis saved whole, the experiment's
//     manifest inside it.
//
// Before it runs, the analysis is priced (planSweepAnalysis, with a rate
// measured here), and refused past the device's limit. It yields to the page
// as it works, so Cancel is heard, and a canceled analysis leaves nothing.
// =============================================================================

import { EN_ANALYSIS } from '../i18n/en.analysis.js';
import { ES_ANALYSIS } from '../i18n/es.analysis.js';
import {
  ANALYSIS_FORMAT,
  LIMITS,
  analyzeSweep,
  calibrate,
  designOf,
  planSweepAnalysis,
  sameExperiment,
} from '../analysis/sweepAnalysis.js';
import { describe, meanInterval } from '../analysis/stats.js';
import { createPlot } from '../plot/plot.js';
import { createTable } from '../plot/table.js';
import { createSelection, interact } from '../plot/select.js';
import { histogram } from '../plot/bars.js';
import {
  analysisArtifact,
  experimentArtifact,
  observationText,
  readAnalysis,
  resultToObservation,
} from '../analysis/seams.js';
import { artifactEntry } from '../notebook/artifactEntry.js';
import { SOURCE } from '../notebook/entry.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from '../notebook/store.js';

// The page's own modules - its translator, the metrics' units, the CSV writer
// - arrive in `ctx`, as the Observatory's fit panel has them: a module both
// this chunk and the page's start-up reached would be split into a chunk of
// its own, one more request for every visitor (js/observatory/fitPanel.js).

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {HTMLElement} root - The panel's body
 * @param {{t: Function, language: Function, addMessages: Function,
 *   result: () => object|null, profile: string, metricUnits: object,
 *   toCsv: Function, rerun: (step: number) => void,
 *   download: (name: string, text: string, type: string) => void}} ctx
 */
export function mountAnalysis(root, ctx) {
  ctx.addMessages({ en: EN_ANALYSIS, es: ES_ANALYSIS });
  const { t } = ctx;
  const rate = calibrate();
  let opened = null;
  let analysis = null;
  /** Every result this panel has seen, by hash: the page's runs and files. */
  const seen = new Map();
  let reference = null;
  let lastRun = null;
  let job = null;
  let selection = null;

  const el = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else if (v !== undefined && v !== null && v !== false)
        e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...kids);
    return e;
  };
  const num = v =>
    v === null || v === undefined || !Number.isFinite(v)
      ? t('lab.none')
      : Number(v.toPrecision(4)).toLocaleString(ctx.language());
  const pct = v =>
    v === null || v === undefined ? t('lab.none') : (100 * v).toFixed(1);
  const paramName = k => t(`exp.param.${k}`);
  const metricName = m => t(`exp.metric.${m}`);
  const metricUnit = m => ctx.metricUnits[m] || '';

  // --- The controls ---------------------------------------------------------------
  const source = el('p', { id: 'labSource', class: 'ui-hint' });
  const file = el('input', {
    id: 'labFile',
    class: 'ui-file',
    type: 'file',
    accept: 'application/json,.json',
  });
  const metric = el('select', { id: 'labMetric', class: 'ui-select' });
  const resamples = el('input', {
    id: 'labResamples',
    class: 'ui-input',
    type: 'number',
    min: LIMITS.resamples.min,
    max: LIMITS.resamples.max,
    step: 100,
    value: LIMITS.resamples.default,
  });
  const seed = el('input', {
    id: 'labSeed',
    class: 'ui-input',
    type: 'text',
    value: 'analysis',
    maxlength: 24,
    spellcheck: 'false',
  });
  const axis = el('select', { id: 'labAxis', class: 'ui-select' });
  const axisField = el(
    'label',
    { class: 'ui-field', hidden: true },
    el('span', { text: t('lab.axis') }),
    axis
  );
  const forecast = el('p', {
    id: 'labForecast',
    class: 'ui-status',
    role: 'status',
    'aria-live': 'polite',
  });
  const refusals = el('ul', {
    id: 'labRefusals',
    class: 'ui-alert is-error',
    hidden: true,
  });
  const run = el('button', {
    id: 'labRun',
    class: 'ui-button',
    type: 'button',
    text: t('lab.run'),
  });
  const cancel = el('button', {
    id: 'labCancel',
    class: 'ui-button',
    type: 'button',
    hidden: true,
    text: t('lab.cancel'),
  });
  const saveObs = el('button', {
    id: 'labObservation',
    class: 'ui-button',
    type: 'button',
    hidden: true,
    text: t('lab.save.observation'),
  });
  const keepResult = el('button', {
    id: 'labKeepResult',
    class: 'ui-button',
    type: 'button',
    hidden: true,
    text: t('lab.nb.result'),
  });
  const progress = el('progress', {
    id: 'labProgress',
    max: 1000,
    value: 0,
    hidden: true,
  });
  const status = el('p', {
    id: 'labStatus',
    class: 'ui-status',
    role: 'status',
    'aria-live': 'polite',
  });
  const out = el('section', {
    id: 'labOut',
    hidden: true,
    'aria-label': t('lab.title'),
  });
  const refSelect = el('select', { id: 'labReference', class: 'ui-select' });
  const refFile = el('input', {
    id: 'labStepFile',
    class: 'ui-file',
    type: 'file',
    accept: 'application/json,.json',
  });
  const stepIntro = el('p', { class: 'ui-hint', text: t('lab.step.intro') });

  const field = (label, control) =>
    el('label', { class: 'ui-field' }, el('span', { text: label }), control);
  root.replaceChildren(
    el('p', { text: t('lab.intro') }),
    source,
    el(
      'div',
      { class: 'ui-grid' },
      field(t('lab.open'), file),
      field(t('lab.metric'), metric),
      field(t('lab.resamples'), resamples),
      field(t('lab.seed'), seed)
    ),
    stepIntro,
    el(
      'div',
      { class: 'ui-grid' },
      field(t('lab.step.compare'), refSelect),
      field(t('lab.step.open'), refFile)
    ),
    forecast,
    refusals,
    el('div', { class: 'ui-toolbar' }, run, cancel),
    el('div', { class: 'ui-toolbar' }, saveObs, keepResult),
    progress,
    status,
    out
  );

  const current = () => opened?.result ?? ctx.result();
  const stepText = f => (f > 0 ? `1/${Math.round(1 / f)} s` : '?');
  const stepOf = r => r?.manifest?.numerics?.frameSeconds ?? null;

  /** The same experiment at another step, among the results seen. */
  function fillReferences() {
    const r = current();
    const keep = refSelect.value;
    const options = [el('option', { value: '', text: t('lab.step.none') })];
    for (const [hash, other] of seen) {
      if (
        !r ||
        hash === r.hash ||
        stepOf(other) === stepOf(r) ||
        !sameExperiment(r.manifest, other.manifest)
      )
        continue;
      options.push(
        el('option', {
          value: hash,
          text: t('lab.step.option', { step: stepText(stepOf(other)), hash }),
        })
      );
    }
    refSelect.replaceChildren(...options);
    // A comparison the reader chose stays chosen; otherwise the first run
    // that can be compared is offered already selected.
    refSelect.value =
      keep && options.some(o => o.value === keep)
        ? keep
        : (options[1]?.value ?? '');
    reference = refSelect.value ? seen.get(refSelect.value) : null;
  }

  function describeSource() {
    const r = current();
    if (!r) {
      source.textContent = t('lab.source.none');
      return;
    }
    const vars = {
      title: r.manifest?.title ?? '',
      trials: r.trials?.length ?? 0,
      hash: r.hash ?? '',
    };
    source.textContent = opened
      ? t('lab.source.file', { ...vars, name: opened.name })
      : t('lab.source.run', vars);
  }

  function fillMetrics() {
    const r = current();
    const keep = metric.value;
    const ms = r?.manifest?.observables?.metrics || [];
    metric.replaceChildren(
      ...ms.map(m =>
        el('option', { value: m, text: `${metricName(m)} (${metricUnit(m)})` })
      )
    );
    if (ms.includes(keep)) metric.value = keep;
  }

  function price() {
    const r = current();
    refusals.hidden = true;
    if (!r) {
      forecast.textContent = '';
      run.disabled = true;
      return null;
    }
    const plan = planSweepAnalysis(r, {
      metric: metric.value || undefined,
      resamples: resamples.valueAsNumber,
      profile: ctx.profile,
      rate,
    });
    const seconds = plan.ms === null ? null : plan.ms / 1000;
    forecast.textContent = t('lab.forecast', {
      draws: plan.draws.toLocaleString(ctx.language()),
      time:
        seconds !== null && seconds >= 1
          ? t('lab.forecast.seconds', { seconds: Math.ceil(seconds) })
          : t('lab.forecast.instant'),
    });
    refusals.replaceChildren(
      ...plan.refusals.map(x =>
        el('li', {
          text: t(`lab.refuse.${x.reason}`, {
            ...x.detail,
            ...(x.detail.draws
              ? {
                  draws: x.detail.draws.toLocaleString(ctx.language()),
                  max: x.detail.max.toLocaleString(ctx.language()),
                }
              : {}),
          }),
        })
      )
    );
    refusals.hidden = !plan.refusals.length;
    run.disabled = plan.refusals.length > 0 || Boolean(job);
    return plan;
  }

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (parsed?.format === ANALYSIS_FORMAT) {
        openSaved(f.name, parsed);
        return;
      }
      if (parsed?.format !== 'gravitas.experiment-result' || !designOf(parsed))
        throw new Error(t('lab.refuse.notAResult'));
      opened = { name: f.name, result: parsed };
      seen.set(parsed.hash, parsed);
      status.textContent = '';
    } catch (err) {
      status.textContent = t('lab.open.bad', { reason: err.message });
      return;
    }
    update();
  });
  refFile.addEventListener('change', async () => {
    const f = refFile.files?.[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (parsed?.format !== 'gravitas.experiment-result' || !designOf(parsed))
        throw new Error(t('lab.refuse.notAResult'));
      seen.set(parsed.hash, parsed);
      status.textContent = '';
    } catch (err) {
      status.textContent = t('lab.open.bad', { reason: err.message });
      return;
    }
    fillReferences();
  });
  refSelect.addEventListener('change', () => {
    reference = refSelect.value ? seen.get(refSelect.value) : null;
  });
  metric.addEventListener('change', price);
  resamples.addEventListener('input', price);

  run.addEventListener('click', async () => {
    const r = current();
    const plan = price();
    if (!r || !plan || plan.refusals.length) return;
    job = new AbortController();
    run.disabled = true;
    cancel.hidden = false;
    progress.hidden = false;
    progress.value = 0;
    status.textContent = t('lab.running');
    const started = performance.now();
    try {
      const a = await analyzeSweep(r, {
        metric: metric.value,
        resamples: resamples.valueAsNumber,
        seed: seed.value.trim() || 'analysis',
        reference: reference ?? undefined,
        signal: job.signal,
        profile: ctx.profile,
        onProgress: f => {
          progress.value = Math.round(f * 1000);
        },
      });
      analysis = { a, result: r };
      status.textContent = t('lab.done', {
        trials: r.trials.length,
        cells: a.cells.length,
        seconds: ((performance.now() - started) / 1000).toFixed(1),
      });
      render();
    } catch (err) {
      status.textContent =
        err.name === 'AbortError'
          ? t('lab.canceled')
          : t('lab.failed', { why: err.message });
    } finally {
      job = null;
      cancel.hidden = true;
      progress.hidden = true;
      price();
    }
  });
  cancel.addEventListener('click', () => job?.abort());

  // --- What came back -------------------------------------------------------------
  function table(caption, head, rows, id) {
    return el(
      'div',
      {
        class: 'ui-table-wrap is-numeric',
        role: 'region',
        tabindex: 0,
        'aria-label': caption,
      },
      el(
        'table',
        id ? { id } : {},
        el('caption', { text: caption }),
        el(
          'thead',
          {},
          el('tr', {}, ...head.map(h => el('th', { scope: 'col', text: h })))
        ),
        el(
          'tbody',
          {},
          ...rows.map(cells =>
            el(
              'tr',
              {},
              ...cells.map((c, i) =>
                i === 0
                  ? el('th', { scope: 'row', text: c })
                  : el('td', { text: c })
              )
            )
          )
        )
      )
    );
  }

  function render() {
    const { a, result } = analysis;
    const m = a.options.metric;
    const unit = metricUnit(m);
    const keys = a.design.axes.map(x => x.parameter);
    const setting = c => keys.map(k => num(c.params[k])).join(', ');
    const kids = [];

    // What it says.
    kids.push(
      el('h3', { text: t('lab.h.summary') }),
      el('p', { id: 'labSummary', text: summaryText(a, keys, m, unit) })
    );

    // What it does not say.
    kids.push(
      el('h3', { text: t('lab.h.warnings') }),
      a.warnings.length
        ? el(
            'ul',
            { id: 'labWarnings' },
            ...a.warnings.map(w =>
              el('li', { 'data-code': w.code, text: warningText(w) })
            )
          )
        : el('p', { id: 'labWarnings', text: t('lab.noWarnings') })
    );

    // Every trial: a plot and a table, one selection.
    const trialsBox = el('div');
    kids.push(el('h3', { text: t('lab.h.trials') }), trialsBox);

    // Each setting.
    kids.push(
      el('h3', { text: t('lab.h.cells') }),
      table(
        t('lab.cells.caption', { metric: `${metricName(m)} (${unit})` }),
        [
          keys.length > 1
            ? `${paramName(keys[0])}, ${paramName(keys[1])}`
            : paramName(keys[0]),
          t('lab.col.trials'),
          t('lab.col.n'),
          t('lab.col.mean'),
          t('lab.col.meanCi'),
          t('lab.col.median'),
          t('lab.col.medianCi'),
          t('lab.col.range68'),
        ],
        a.cells.map(c => [
          setting(c),
          String(c.trials),
          String(c.n),
          num(c.mean),
          c.meanInterval
            ? `${num(c.meanInterval.lo)} – ${num(c.meanInterval.hi)}`
            : t('lab.none'),
          num(c.median),
          c.medianInterval
            ? `${num(c.medianInterval.lo)} – ${num(c.medianInterval.hi)}`
            : t('lab.none'),
          c.n ? `${num(c.q16)} – ${num(c.q84)}` : t('lab.none'),
        ]),
        'labCells'
      )
    );

    // The integration step.
    if (a.numerical?.comparable)
      kids.push(
        el('h3', { text: t('lab.h.step') }),
        ...stepView(a, keys, m, unit)
      );

    // Sensitivity.
    kids.push(
      el('h3', { text: t('lab.h.sensitivity') }),
      ...sensitivityView(a, keys, m, unit)
    );

    // Setting against seed.
    kids.push(el('h3', { text: t('lab.h.shares') }), ...sharesView(a, keys, m));

    // The distribution.
    kids.push(
      el('h3', { text: t('lab.h.distribution') }),
      ...distributionView(a, m, unit)
    );

    // Methods, and saving.
    const methods = t('lab.methods', {
      tool: a.tool.id,
      version: a.tool.version,
      hash: result.hash,
      metric: m,
      seed: a.options.seed,
      resamples: a.options.resamples,
      permutations: a.options.permutations,
    });
    const saveJson = el('button', {
      id: 'labJson',
      class: 'ui-button',
      type: 'button',
      text: t('lab.save.json'),
    });
    const saveCsv = el('button', {
      id: 'labCsv',
      class: 'ui-button',
      type: 'button',
      text: t('lab.save.csv'),
    });
    saveJson.addEventListener('click', () =>
      ctx.download(
        `analysis-${result.hash}.json`,
        `${JSON.stringify({ ...a, methods }, null, 2)}\n`,
        'application/json'
      )
    );
    saveCsv.addEventListener('click', () =>
      ctx.download(
        `analysis-${result.hash}.csv`,
        cellsCsv(a, keys, m),
        'text/csv'
      )
    );
    const keepAnalysis = el('button', {
      id: 'labKeepAnalysis',
      class: 'ui-button',
      type: 'button',
      text: t('lab.nb.analysis'),
    });
    keepAnalysis.addEventListener('click', () =>
      keep(
        SOURCE.SWEEP_ANALYSIS,
        analysisArtifact(a, { metricUnits: ctx.metricUnits }),
        t('lab.nb.title.analysis', {
          metric: metricName(m),
          title: a.source.manifest?.title || t('lab.nb.untitled'),
        }),
        m
      )
    );
    kids.push(
      el('h3', { text: t('lab.h.methods') }),
      el('p', { id: 'labMethods', text: methods }),
      el('div', { class: 'ui-toolbar' }, saveJson, saveCsv, keepAnalysis)
    );

    out.replaceChildren(...kids);
    out.hidden = false;
    trialsView(trialsBox, a, result, keys, m, unit);
  }

  function summaryText(a, keys, m, unit) {
    const parts = [];
    const cells = a.cells.filter(c => c.n > 0);
    const vars = { param: paramName(keys[0]), metric: metricName(m) };
    if (a.design.kind === 'grid-1d' && cells.length) {
      const tr = a.sensitivity.trend;
      parts.push(
        t('lab.summary.trend', {
          ...vars,
          values: a.design.axes[0].values.length,
          first: `${num(cells[0].mean)} ${unit}`,
          last: `${num(cells.at(-1).mean)} ${unit}`,
          slope: num(tr?.slope),
          se: num(tr?.se),
          unit,
        })
      );
    } else if (a.design.kind === 'grid-2d') {
      parts.push(
        t('lab.summary.trend2d', {
          ...vars,
          param2: paramName(keys[1]),
          values: a.cells.length,
          lo: `${num(a.pooled.min)} ${unit}`,
          hi: `${num(a.pooled.max)} ${unit}`,
        })
      );
    } else {
      const rho = a.sensitivity.spearman;
      parts.push(
        t('lab.summary.sampled', {
          ...vars,
          values: a.cells.length,
          lo: `${num(a.pooled.min)} ${unit}`,
          hi: `${num(a.pooled.max)} ${unit}`,
          rho: num(rho?.rho),
          rhoLo: num(rho?.lo),
          rhoHi: num(rho?.hi),
        })
      );
    }
    if (a.shares.split)
      parts.push(
        t('lab.summary.share2d', {
          param: paramName(keys[0]),
          param2: paramName(keys[1]),
          a: pct(a.shares.split[keys[0]]),
          b: pct(a.shares.split[keys[1]]),
          ab: pct(a.shares.split.interaction),
          seeds: pct(a.shares.split.seeds),
        })
      );
    else if (a.shares.p !== null)
      parts.push(
        t('lab.summary.share', {
          share: pct(a.shares.eta2),
          p: num(a.shares.p),
        })
      );
    else if (a.shares.replicates === 'identical')
      parts.push(t('lab.summary.identical'));
    else if (a.design.kind !== 'sampled') parts.push(t('lab.summary.noShare'));
    const left = a.cells.reduce((s, c) => s + c.left, 0);
    if (left)
      parts.push(
        t('lab.summary.left', {
          left,
          trials: a.cells.reduce((s, c) => s + c.trials, 0),
        })
      );
    return parts.join(' ');
  }

  function warningText(w) {
    const d = { ...w.detail };
    for (const k of ['p', 'lo', 'hi', 'from', 'to', 'at'])
      if (k in d) d[k] = num(d[k]);
    if ('share' in d) d.share = pct(d.share);
    if ('rel' in d) d.rel = pct(d.rel);
    for (const k of ['a', 'b']) if (k in d) d[k] = stepText(d[k]);
    if ('ratio' in d) d.ratio = num(d.ratio);
    if ('statuses' in d)
      d.statuses = d.statuses
        .split(', ')
        .map(s => t(`exp.status.${s}`))
        .join(', ');
    return t(`lab.warn.${w.code}`, d);
  }

  function stepView(a, keys, m, unit) {
    const [fa, fb] = a.numerical.frameSeconds;
    return [
      el('p', {
        id: 'labStep',
        text: t('lab.step.with', {
          step: stepText(fb),
          rel: pct(a.numerical.maxRel),
        }),
      }),
      table(
        t('lab.step.caption', {
          metric: `${metricName(m)} (${unit})`,
          a: stepText(fa),
          b: stepText(fb),
        }),
        [
          keys.map(paramName).join(', '),
          stepText(fa),
          stepText(fb),
          t('lab.col.diff'),
          t('lab.col.rel'),
        ],
        a.numerical.cells.map(r => [
          keys.map(k => num(r.params[k])).join(', '),
          num(r.value),
          num(r.other),
          num(r.diff),
          r.rel === null ? t('lab.none') : `${pct(r.rel)}%`,
        ]),
        'labStepTable'
      ),
    ];
  }

  function sensitivityView(a, keys, m, unit) {
    const s = a.sensitivity;
    const kids = [];
    const rho = s.spearman;
    if (s.kind === 'grid-2d') {
      for (const main of s.main) {
        const other = keys[1 - main.axis];
        kids.push(
          table(
            t('lab.main.caption', {
              metric: metricName(m),
              param: paramName(main.parameter),
              param2: paramName(other),
            }),
            [
              paramName(main.parameter),
              t('lab.col.effect'),
              t('lab.col.slopeSe'),
            ],
            main.effects.map(e => [num(e.value), num(e.mean), num(e.se)])
          )
        );
        if (main.trend)
          kids.push(
            el('p', {
              text: t('lab.trend.line', {
                slope: num(main.trend.slope),
                se: num(main.trend.se),
                unit,
              }),
            })
          );
      }
    } else {
      if (s.local.length)
        kids.push(
          table(
            t('lab.sens.caption', { unit }),
            [
              t('lab.col.at'),
              t('lab.col.slope'),
              t('lab.col.slopeSe'),
              t('lab.col.numErr'),
              t('lab.col.elasticity'),
              t('lab.col.resolved'),
            ],
            s.local.map(x => [
              num(x.at),
              num(x.slope),
              num(x.se),
              num(x.numericalError),
              num(x.elasticity),
              x.resolved === null
                ? t('lab.unknown')
                : t(x.resolved ? 'lab.yes' : 'lab.no'),
            ]),
            'labSensitivity'
          )
        );
      if (s.bins)
        kids.push(
          table(
            t('lab.bins.caption', {
              bins: s.bins.length,
              param: paramName(keys[0]),
            }),
            [
              t('lab.col.binLo'),
              t('lab.col.binHi'),
              t('lab.col.count'),
              t('lab.col.mean'),
              t('lab.col.slopeSe'),
            ],
            s.bins.map(b => [
              num(b.lo),
              num(b.hi),
              String(b.n),
              num(b.mean),
              num(b.se),
            ])
          )
        );
      if (s.trend)
        kids.push(
          el('p', {
            id: 'labTrend',
            text: t('lab.trend.line', {
              slope: num(s.trend.slope),
              se: num(s.trend.se),
              unit,
            }),
          })
        );
    }
    if (rho?.rho !== null && rho)
      kids.push(
        el('p', {
          id: 'labRho',
          text: t('lab.rho', {
            rho: num(rho.rho),
            lo: num(rho.lo),
            hi: num(rho.hi),
          }),
        })
      );
    return kids;
  }

  function sharesView(a, keys, m) {
    if (a.shares.split) {
      const sp = a.shares.split;
      return [
        table(
          t('lab.shares.caption', { metric: metricName(m) }),
          [t('lab.col.part'), t('lab.col.share')],
          [
            [paramName(keys[0]), `${pct(sp[keys[0]])}%`],
            [paramName(keys[1]), `${pct(sp[keys[1]])}%`],
            [t('lab.interaction'), `${pct(sp.interaction)}%`],
            [t('lab.seeds'), `${pct(sp.seeds)}%`],
          ],
          'labShares'
        ),
      ];
    }
    if (a.shares.eta2 === null || a.shares.p === null)
      return [
        el('p', {
          text: t(
            a.shares.replicates === 'identical'
              ? 'lab.summary.identical'
              : 'lab.summary.noShare'
          ),
        }),
      ];
    return [
      table(
        t('lab.shares.caption', { metric: metricName(m) }),
        [t('lab.col.part'), t('lab.col.share')],
        [
          [paramName(keys[0]), `${pct(a.shares.eta2)}%`],
          [t('lab.seeds'), `${pct(1 - a.shares.eta2)}%`],
        ],
        'labShares'
      ),
    ];
  }

  function distributionView(a, m, unit) {
    const h = a.pooled.histogram;
    if (!h) return [];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'xp-plot');
    svg.setAttribute('id', 'labHist');
    svg.setAttribute('role', 'img');
    const total = h.counts.reduce((s, c) => s + c, 0);
    svg.setAttribute(
      'aria-label',
      t('lab.hist.label', { metric: metricName(m), n: total })
    );
    histogram(svg, h, {
      number: num,
      xTitle: `${metricName(m)} (${unit})`,
      yTitle: t('lab.col.count'),
    });
    const p = a.pooled;
    return [
      el(
        'figure',
        {},
        svg,
        el('figcaption', {
          class: 'ui-hint',
          text: t('lab.hist.caption', {
            metric: metricName(m),
            bins: h.counts.length,
          }),
        })
      ),
      table(
        t('lab.hist.label', { metric: metricName(m), n: total }),
        [t('lab.col.binLo'), t('lab.col.binHi'), t('lab.col.count')],
        h.counts.map((c, i) => [
          num(h.edges[i]),
          num(h.edges[i + 1]),
          String(c),
        ]),
        'labHistTable'
      ),
      el('p', {
        id: 'labQuantiles',
        text: t('lab.quantiles', {
          q025: num(p.q025),
          q16: num(p.q16),
          q50: num(p.median),
          q84: num(p.q84),
          q975: num(p.q975),
        }),
      }),
    ];
  }

  /** The trials as an observation, for the workspace's plot and table. */
  function trialsView(box, a, result, keys, m, unit) {
    const trials = result.trials;
    if (!trials) {
      box.replaceChildren(
        el('p', { class: 'ui-hint', text: t('lab.trials.absent') })
      );
      return;
    }
    const known = ['AU', 'km/s', 'days', '%'].includes(unit);
    const o = {
      id: 'trials',
      axes: { x: keys[0], y: 'm' },
      masks: [],
      columns: [
        {
          id: 'trial',
          name: t('lab.col.trial'),
          unit: '',
          role: 'index',
          values: Float64Array.from(trials, tr => tr.index + 1),
        },
        ...keys.map(k => ({
          id: k,
          name: paramName(k),
          unit: '',
          role: k === keys[0] ? 'x' : 'value',
          values: Float64Array.from(trials, tr => tr.params?.[k] ?? NaN),
        })),
        {
          id: 'm',
          name: known ? metricName(m) : `${metricName(m)} (${unit})`,
          unit: known ? unit : '',
          role: 'value',
          values: Float64Array.from(trials, tr =>
            tr.status === 'ok' && Number.isFinite(tr.results?.[m])
              ? tr.results[m]
              : NaN
          ),
        },
      ],
    };
    const labels = {
      row: t('lab.row'),
      missing: t('lab.missing'),
      masked: t('lab.masked'),
      notStated: t('lab.notStated'),
    };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('id', 'labPlot');
    svg.setAttribute('class', 'ow-plot xp-plot');
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'application');
    svg.setAttribute('aria-roledescription', 'plot');
    svg.setAttribute('aria-label', `${metricName(m)}, ${paramName(keys[0])}`);
    const tbl = el('table', { id: 'labTrials' });
    const selected = el('p', {
      id: 'labSelected',
      class: 'ui-status',
      role: 'status',
      'aria-live': 'polite',
      text: t('lab.selected.none'),
    });
    const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
    const describeRow = i =>
      `${t('lab.col.trial')} ${i + 1}: ${keys.map(k => `${paramName(k)} ${num(trials[i].params?.[k])}`).join(', ')}, ${metricName(m)} ${
        Number.isFinite(o.columns.at(-1).values[i])
          ? `${num(o.columns.at(-1).values[i])} ${unit}`
          : t('lab.missing')
      }`;
    const hooks = {
      announce: text => (live.textContent = text),
      describe: describeRow,
      labels,
      number: num,
      range: vars => t('lab.table.rows', vars),
    };
    axisField.hidden = keys.length < 2;
    box.replaceChildren(
      ...(keys.length > 1 ? [axisField] : []),
      el(
        'figure',
        {},
        svg,
        el('figcaption', { class: 'ui-hint', text: t('lab.plot.caption') })
      ),
      selected,
      live,
      el(
        'div',
        {
          class: 'ui-table-wrap is-numeric is-scroll',
          role: 'region',
          tabindex: 0,
          'aria-label': t('lab.h.trials'),
        },
        tbl
      )
    );
    const plot = createPlot(svg, hooks);
    interact(plot, svg, hooks);
    const grid = createTable(tbl, hooks);
    selection = createSelection(trials.length);
    const draw = () => {
      const x = keys.length > 1 ? axis.value || keys[0] : keys[0];
      plot.draw(o, { xColumn: x, yColumn: 'm', selection });
      grid.draw(o, { selection, caption: t('lab.h.trials') });
    };
    axis.replaceChildren(
      ...keys.map(k => el('option', { value: k, text: paramName(k) }))
    );
    axis.onchange = draw;
    selection.subscribe(() => {
      plot.update();
      grid.update();
      const rows = selection.rows();
      if (!rows.length) {
        selected.textContent = t('lab.selected.none');
        return;
      }
      const d = describe(rows.map(i => o.columns.at(-1).values[i]));
      const ci = meanInterval(d);
      selected.textContent =
        t('lab.selected', {
          n: d.n,
          mean: num(d.mean),
          median: num(d.median),
          min: num(d.min),
          max: num(d.max),
        }) +
        (ci
          ? t('lab.selected.interval', { lo: num(ci.lo), hi: num(ci.hi) })
          : '');
    });
    draw();
  }

  function cellsCsv(a, keys, m) {
    const head = [
      ...keys,
      'trials',
      'finished',
      'mean',
      'mean_lo95',
      'mean_hi95',
      'median',
      'median_lo95',
      'median_hi95',
      'q16',
      'q84',
      'sd',
    ];
    const rows = a.cells.map(c => [
      ...keys.map(k => c.params[k]),
      c.trials,
      c.n,
      c.mean,
      c.meanInterval?.lo ?? null,
      c.meanInterval?.hi ?? null,
      c.median,
      c.medianInterval?.lo ?? null,
      c.medianInterval?.hi ?? null,
      c.q16,
      c.q84,
      c.sd,
    ]);
    const comment = [
      `# ${ANALYSIS_FORMAT}/${a.formatVersion} ${a.tool.id} ${a.tool.version}`,
      `# result ${a.source.hash}, metric ${m} (${metricUnit(m)}), seed ${a.options.seed}, ${a.options.resamples} resamples, 95% intervals`,
    ].join('\n');
    return `${comment}\n${ctx.toCsv([head, ...rows])}`;
  }

  /** A saved analysis, shown as it was written (it holds no trials). */
  function openSaved(name, doc) {
    const r = readAnalysis(doc);
    if (!r.ok) {
      status.textContent = t('lab.open.analysisBad', { reason: r.message });
      return;
    }
    const a = r.analysis;
    analysis = {
      a,
      result: {
        hash: a.source.hash,
        manifest: a.source.manifest,
        trials: null,
      },
    };
    status.textContent = t('lab.open.analysis', {
      name,
      cells: a.cells.length,
      metric: metricName(a.options.metric),
      hash: a.source.hash,
    });
    render();
  }

  const titleOf = r => r?.manifest?.title || t('lab.nb.untitled');
  /** A quantity id such as "mean|a=3" in the reader's words. */
  function quantityLabel(q, metricId) {
    const [head, ...pairs] = q.id.split('|');
    const where = pairs
      .map(p => {
        const [k, v] = p.split('=');
        return `${paramName(k)} ${num(Number(v))}`;
      })
      .join(', ');
    if (!pairs.length) return t(`lab.nb.q.${head}`);
    const what = metricId === null ? metricName(head) : t(`lab.nb.q.${head}`);
    return `${what}, ${where}`.slice(0, 80);
  }
  function keep(source, envelope, title, metricId) {
    try {
      const entry = artifactEntry({
        source,
        envelope,
        title,
        labels: {
          quantity: q => quantityLabel(q, metricId),
          note: q =>
            q.uncertainty.kind === 'interval' ? t('lab.nb.note.interval') : '',
        },
        context: { page: 'experiments' },
      });
      const loaded = loadNotebook();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = saveNotebook([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      status.textContent = t('lab.nb.added');
    } catch (err) {
      status.textContent = t('lab.nb.failed', { why: err.message });
    }
  }
  saveObs.addEventListener('click', () => {
    const r = current();
    if (!r) return;
    const ms = r.manifest.observables.metrics;
    const keys = r.manifest.vary.map(v => v.parameter);
    const o = resultToObservation(r, {
      metricUnits: ctx.metricUnits,
      names: {
        params: Object.fromEntries(keys.map(k => [k, paramName(k)])),
        metrics: Object.fromEntries(ms.map(m => [m, metricName(m)])),
      },
      title: r.manifest.title || undefined,
    });
    ctx.download(
      `experiment-${r.hash}.observation.json`,
      observationText(o),
      'application/json'
    );
    status.textContent = t('lab.observation.saved');
  });
  keepResult.addEventListener('click', () => {
    const r = current();
    if (!r) return;
    const m = metric.value || r.manifest.observables.metrics[0];
    keep(
      SOURCE.EXPERIMENT_RESULT,
      experimentArtifact(r, { metricUnits: ctx.metricUnits, metrics: [m] }),
      t('lab.nb.title.result', { title: titleOf(r), metric: metricName(m) }),
      null
    );
  });

  function update() {
    const r = ctx.result();
    if (r?.hash && r.hash !== lastRun) {
      // A new run on the page is what the reader means to analyze now.
      lastRun = r.hash;
      seen.set(r.hash, r);
      opened = null;
    }
    describeSource();
    fillMetrics();
    fillReferences();
    price();
    saveObs.hidden = keepResult.hidden = !current();
  }

  /** The language changed: every string again. */
  function rebuild() {
    run.textContent = t('lab.run');
    saveObs.textContent = t('lab.save.observation');
    keepResult.textContent = t('lab.nb.result');
    cancel.textContent = t('lab.cancel');
    root.firstElementChild.textContent = t('lab.intro');
    const labels = root.querySelectorAll('.ui-grid > .ui-field > span');
    stepIntro.textContent = t('lab.step.intro');
    [
      'lab.open',
      'lab.metric',
      'lab.resamples',
      'lab.seed',
      'lab.step.compare',
      'lab.step.open',
    ].forEach((id, i) => {
      if (labels[i]) labels[i].textContent = t(id);
    });
    axisField.firstElementChild.textContent = t('lab.axis');
    out.setAttribute('aria-label', t('lab.title'));
    update();
    if (analysis) render();
  }

  update();
  return { update, rebuild };
}
