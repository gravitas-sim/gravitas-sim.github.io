// =============================================================================
// The observatory's fit panel: a diagnostic harness for the inference core
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it, so the observatory's own route carries
// none of it. It fits the time series in view with a transit or an orbit
// (js/inference/), in disposable Worker realms through the shared scheduler,
// and shows every part of the answer the core gives, kept apart:
//
//   - fitted, fixed and derived parameters, each labeled as which;
//   - for each fitted one: the covariance's sigma, that sigma scaled when the
//     reduced chi-square says the error bars were too small, that again
//     inflated by the correlated-noise factor beta, and the Delta chi^2 = 1
//     profile interval, never merged into one number;
//   - the fit's statistics, its warnings, and what the model does not claim;
//   - the residuals, drawn by the observatory's own plot.
//
// A request too large for the device is priced first and refused with the
// reason (js/inference/manifest.js). This is not the student investigation:
// it is the harness that shows what the core does.
// =============================================================================

import { dataFrom } from '../inference/infer.js';
import { MODELS } from '../inference/models.js';
import { runInference } from '../inference/run.js';
import {
  deviceProfile,
  estimate,
  inferenceManifest,
  PROFILES,
  validateInference,
} from '../inference/manifest.js';
import { EN_INFERENCE } from '../i18n/en.inference.js';
import { ES_INFERENCE } from '../i18n/es.inference.js';

// Nothing from the page's own modules - its plot, selection, units and
// translator - is imported here: they arrive in `ctx`. esbuild puts a module
// in the chunk shared by exactly the entry points that reach it, and this
// panel is one (an import()), so a module both reached would leave the
// page's bundle for a chunk of its own, one more request for every visitor
// whether or not they ever open the panel.

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  node.append(...children);
  return node;
};

/**
 * Which models suit an observation: a transit for a flux, an orbit for a
 * velocity.
 * @param {object} o - gravitas.observation/1
 * @param {(unit: string|null) => string|null} dimensionOfText - The value
 *   column's dimension from its unit as written (the page's units module)
 */
export function modelsFor(o, dimensionOfText) {
  if (o.kind !== 'time-series') return [];
  const y = o.columns.find(c => c.id === o.axes.y);
  const dim = dimensionOfText(y?.unit ?? null);
  const out = [];
  if (dim === 'ratio' || dim === null) out.push('transit-quadratic');
  if (dim === 'velocity') out.push('rv-keplerian');
  return out;
}

/** Sensible starting bounds from the data itself. */
function defaults(modelId, data) {
  const x0 = data.x[0];
  const span = data.x[data.x.length - 1] - x0;
  if (modelId === 'transit-quadratic') {
    const Phi = Math.min(10, Math.max(1.2, span / 2));
    return { t0: { lo: x0, hi: x0 + Phi }, P: { lo: 1, hi: Phi } };
  }
  return {
    P: { lo: 1, hi: Math.max(2, span / 2) },
    tc: { lo: x0, hi: x0 + Math.max(2, span / 2) },
  };
}

/** The median spacing of the points: a binned series' exposure. */
function spacing(x) {
  const d = [];
  for (let i = 1; i < x.length; i++) d.push(x[i] - x[i - 1]);
  d.sort((a, b) => a - b);
  return d[d.length >> 1] || 0;
}

/**
 * Build the panel into a container.
 * @param {HTMLElement} root
 * @param {{t: Function, number: Function, observation: object,
 *   registerMessages: Function, createPlot: Function,
 *   createSelection: Function, dimensionOfText: Function}} ctx - The page's
 *   translator, number format and views, handed over rather than imported
 */
export function mountFitPanel(root, ctx) {
  const { t, number, createPlot, createSelection, dimensionOfText } = ctx;
  ctx.registerMessages({ en: EN_INFERENCE, es: ES_INFERENCE });
  let o = ctx.observation;
  let job = null;
  let last = null;
  const device = deviceProfile(
    typeof navigator !== 'undefined' ? navigator : {}
  );

  const modelSelect = el('select', { id: 'fitModel' });
  const table = el('table', { class: 'ow-fit-params' });
  const exposure = el('input', {
    id: 'fitExposure',
    type: 'number',
    step: 'any',
    min: '0',
  });
  const dilution = el('input', {
    id: 'fitDilution',
    type: 'number',
    step: 'any',
    min: '0',
    max: '0.99',
    value: '0',
  });
  const supersample = el('input', {
    id: 'fitSupersample',
    type: 'number',
    min: '1',
    max: '31',
    value: '5',
  });
  const profiles = el('input', { id: 'fitProfiles', type: 'checkbox' });
  profiles.checked = true;
  const run = el('button', {
    id: 'fitRun',
    class: 'ui-button',
    type: 'button',
    text: t('obs.fit.run'),
  });
  const cancel = el('button', {
    id: 'fitCancel',
    class: 'ui-button',
    type: 'button',
    text: t('obs.fit.cancel'),
  });
  cancel.hidden = true;
  const progress = el('progress', {
    id: 'fitProgress',
    max: '1000',
    value: '0',
  });
  progress.hidden = true;
  const status = el('p', {
    id: 'fitStatus',
    class: 'ow-hint',
    role: 'status',
    'aria-live': 'polite',
  });
  const refusals = el('ul', { id: 'fitRefusals', class: 'ow-problems' });
  const cost = el('p', { id: 'fitEstimate', class: 'ow-hint' });
  const results = el('div', { id: 'fitResults' });
  const exportBtn = el('button', {
    id: 'fitExport',
    class: 'ui-button',
    type: 'button',
    text: t('obs.fit.export'),
  });
  exportBtn.hidden = true;

  // A parameter's name in the reader's language, and its unit in the data's:
  // a model's times are the time column's, its velocities the value column's.
  const nameOf = p => t(`obs.fit.param.${p.name}`);
  const unitOf = (p, units) =>
    p.unit === 'd' ? units.x : p.unit === 'm/s' ? units.y : p.unit;
  const labelOf = (p, units) => {
    const u = unitOf(p, units);
    return u ? `${nameOf(p)} (${u})` : nameOf(p);
  };
  const label = (text, control) =>
    el('label', { class: 'ow-field' }, el('span', { text }), control);
  root.replaceChildren(
    el('p', { class: 'ow-hint', text: t('obs.fit.intro') }),
    el(
      'div',
      { class: 'ow-grid' },
      label(t('obs.fit.model'), modelSelect),
      label('', exposure),
      label(t('obs.fit.supersample'), supersample),
      label(t('obs.fit.dilution'), dilution),
      el(
        'label',
        { class: 'ow-field' },
        el('span', {}, profiles, ` ${t('obs.fit.profiles')}`)
      )
    ),
    el('p', {
      class: 'ow-hint',
      text: t('obs.fit.device', {
        profile: t(`obs.fit.profile.${device.profile}`),
        realms: device.concurrency,
      }),
    }),
    el('div', { class: 'ow-table-wrap' }, table),
    cost,
    refusals,
    el('div', { class: 'ow-actions' }, run, cancel, exportBtn),
    progress,
    status,
    results
  );

  function data() {
    return dataFrom(o);
  }

  function renderParams() {
    const id = modelSelect.value;
    const model = MODELS[id];
    const d = data();
    const seed = defaults(id, d);
    const head = el(
      'tr',
      {},
      el('th', { scope: 'col', text: t('obs.fit.col.parameter') }),
      el('th', { scope: 'col', text: t('obs.fit.col.mode') }),
      el('th', { scope: 'col', text: t('obs.fit.col.lo') }),
      el('th', { scope: 'col', text: t('obs.fit.col.hi') }),
      el('th', { scope: 'col', text: t('obs.fit.col.value') })
    );
    const rows = [...model.parameters, ...(model.nuisance || [])].map(p => {
      const lo = seed[p.name]?.lo ?? p.lo;
      const hi = seed[p.name]?.hi ?? p.hi;
      const mode = el('select', {
        id: `fitMode-${p.name}`,
        'aria-label': t('obs.fit.modeOf', { name: nameOf(p) }),
      });
      mode.append(
        el('option', { value: 'fitted', text: t('obs.fit.fitted') }),
        el('option', { value: 'fixed', text: t('obs.fit.fixed') })
      );
      const input = (k, v) =>
        el('input', {
          id: `fit${k}-${p.name}`,
          type: 'number',
          step: 'any',
          value: Number.isFinite(v) ? String(v) : '',
          'aria-label': t(`obs.fit.${k}Of`, { name: nameOf(p) }),
        });
      return el(
        'tr',
        {},
        el('th', { scope: 'row', text: labelOf(p, d.units) }),
        el('td', {}, mode),
        el('td', {}, input('Lo', lo)),
        el('td', {}, input('Hi', hi)),
        el('td', {}, input('Value', p.start))
      );
    });
    table.replaceChildren(
      el('caption', { text: t('obs.fit.paramsCaption') }),
      el('thead', {}, head),
      el('tbody', {}, ...rows)
    );
    exposure.value =
      id === 'transit-quadratic'
        ? String(Number(spacing(d.x).toPrecision(6)))
        : '';
    exposure.previousElementSibling.textContent = t('obs.fit.exposure', {
      unit: d.units.x || '—',
    });
    for (const c of [exposure, supersample, dilution])
      c.closest('label').hidden = id !== 'transit-quadratic';
    price();
  }

  function request() {
    const id = modelSelect.value;
    const model = MODELS[id];
    const parameters = {};
    for (const p of [...model.parameters, ...(model.nuisance || [])]) {
      const mode = document.getElementById(`fitMode-${p.name}`).value;
      const num = k => {
        const v = document.getElementById(`fit${k}-${p.name}`).value.trim();
        return v === '' ? undefined : Number(v);
      };
      parameters[p.name] =
        mode === 'fixed'
          ? { mode, value: num('Value') }
          : {
              mode,
              lo: num('Lo'),
              hi: num('Hi'),
              ...(num('Value') !== undefined ? { value: num('Value') } : {}),
            };
    }
    const settings =
      id === 'transit-quadratic'
        ? {
            exposure: Number(exposure.value) || 0,
            supersample: Math.round(Number(supersample.value)) || 5,
            annuli: 32,
            dilution: Number(dilution.value) || 0,
          }
        : {};
    return {
      model: { id },
      parameters,
      settings,
      algorithm: { profile: { points: 11 } },
    };
  }

  function manifest() {
    const d = data();
    return inferenceManifest(o, d, request(), {
      concurrency: device.concurrency,
      trialTimeoutMs: PROFILES[device.profile].trialTimeoutMs,
      totalTimeoutMs: PROFILES[device.profile].maxWallMs,
      maxResultBytes: 64_000_000,
    });
  }

  /** Price the request and say why it will not run, if it will not. */
  function price() {
    const m = manifest();
    const problems = validateInference(m);
    const e = problems.length
      ? null
      : estimate(m, m.data.used, device.profile, {
          profiles: profiles.checked,
          concurrency: device.concurrency,
        });
    cost.textContent = e
      ? t('obs.fit.estimate', {
          seconds: number(Math.max(1, Math.round(e.ms.total / 1000))),
          most: number(Math.max(1, Math.round(e.msMax.total / 1000))),
          evaluations: number(e.evaluations),
          rows: number(e.rows),
        })
      : '';
    const reasons = [
      ...problems.map(p => `${p.path} ${p.message}`),
      ...(e?.refusals || []).map(r =>
        t(`obs.fit.refuse.${r.reason}`, r.detail)
      ),
    ];
    refusals.replaceChildren(
      ...reasons.map(r =>
        el('li', { text: r, ...(problems.length ? { lang: 'en' } : {}) })
      )
    );
    refusals.hidden = !reasons.length;
    run.disabled = reasons.length > 0 || Boolean(job);
    return { m, reasons };
  }

  root.addEventListener('change', e => {
    if (e.target === modelSelect) renderParams();
    else price();
  });

  run.addEventListener('click', () => {
    const { m, reasons } = price();
    if (reasons.length) return;
    const d = data();
    run.disabled = true;
    cancel.hidden = false;
    progress.hidden = false;
    progress.value = 0;
    results.replaceChildren();
    exportBtn.hidden = true;
    status.textContent = t('obs.fit.running');
    // Against the page, /observatory/, rather than this module: in dist/ this
    // file is a hashed chunk in js/, in the sources it is in js/observatory/,
    // and the page is in the same place in both - on a fork's subpath too.
    const spawn = () =>
      new Worker(
        new URL('../js/inference/inferenceWorker.js', document.baseURI),
        { type: 'module' }
      );
    const started = performance.now();
    job = runInference({
      request: request(),
      data: {
        x: d.x,
        y: d.y,
        sigma: d.sigma,
        groups: d.groups,
        rows: d.rows,
        counts: d.counts,
        columns: d.columns,
        units: d.units,
        perDay: d.perDay,
      },
      spawn,
      concurrency: device.concurrency,
      limits: m.limits,
      profiles: profiles.checked,
      now: () => performance.now(),
      onProgress: p => {
        progress.value = Math.round(p.fraction * 1000);
      },
    });
    job.done.then(out => {
      job = null;
      cancel.hidden = true;
      progress.hidden = true;
      run.disabled = false;
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      if (out.status !== 'ok') {
        status.textContent = t('obs.fit.failed', {
          status: out.status,
          why: out.error || '',
        });
        price();
        return;
      }
      last = { manifest: m, out };
      status.textContent = t('obs.fit.done', { seconds });
      render(out, d);
      exportBtn.hidden = false;
      // The measurement pipeline lists a fit the reader ran, as exported.
      ctx.record?.(exported());
    });
  });

  cancel.addEventListener('click', () => job?.cancel(t('obs.fit.canceled')));

  /** The last fit as a gravitas.inference/1 document. */
  function exported() {
    const { manifest: m, out } = last;
    // The residuals are as long as the data and the model curve is for the
    // plot; the export keeps what reproduces and states the result.
    return {
      ...m,
      results: {
        fit: {
          ...omit(out.fit, ['residuals', 'fit', 'rows']),
          residualCount: out.fit.residuals.length,
        },
        profiles: out.profiles.map(p => omit(p, ['index', 'task', 'wallMs'])),
      },
    };
  }

  exportBtn.addEventListener('click', () => {
    if (!last) return;
    const doc = exported();
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(doc, null, 2)}\n`], {
        type: 'application/json',
      })
    );
    const a = el('a', {
      href: url,
      download: `${String(o.id).replace(/[^A-Za-z0-9._-]+/g, '-')}-${doc.model.id}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function omit(object, keys) {
    return Object.fromEntries(
      Object.entries(object).filter(([k]) => !keys.includes(k))
    );
  }

  function render(out, d) {
    const fit = out.fit;
    const profileOf = name => out.profiles.find(p => p.parameter === name);
    const fmt = v =>
      v === null || v === undefined || !Number.isFinite(v) ? '—' : number(v);
    const head = el(
      'tr',
      {},
      ...[
        'parameter',
        'kind',
        'value',
        'sigma',
        'sigmaScaled',
        'sigmaRed',
        'profile',
      ].map(k => el('th', { scope: 'col', text: t(`obs.fit.res.${k}`) }))
    );
    const row = (p, kind) => {
      const pr = profileOf(p.name);
      const interval = pr
        ? `${fmt(pr.interval[0])} … ${fmt(pr.interval[1])}`
        : '—';
      return el(
        'tr',
        {},
        el('th', { scope: 'row', text: labelOf(p, d.units) }),
        el('td', { text: t(`obs.fit.${kind}`) }),
        el('td', { text: fmt(p.value) }),
        el('td', { text: fmt(p.sigma) }),
        el('td', { text: fmt(p.sigmaScaled) }),
        el('td', { text: fmt(p.sigmaRed) }),
        el('td', { text: interval })
      );
    };
    const body = el(
      'tbody',
      {},
      ...fit.parameters.map(p => row(p, p.mode)),
      ...fit.derived.map(p => row(p, 'derived'))
    );
    const stats = el(
      'ul',
      { id: 'fitStats' },
      el('li', {
        text: t('obs.fit.stat.chi2', {
          chi2: fmt(fit.chi2),
          dof: fit.dof,
          reduced: fmt(fit.reducedChi2),
        }),
      }),
      el('li', { text: t('obs.fit.stat.rms', { rms: fmt(fit.residualRms) }) }),
      el('li', {
        text: fit.redNoise
          ? t('obs.fit.stat.beta', { beta: fmt(fit.redNoise.beta) })
          : t('obs.fit.stat.noBeta'),
      }),
      el('li', {
        text: t('obs.fit.stat.rows', {
          used: d.counts.used,
          total: d.counts.total,
          masked: d.counts.masked,
          missing: d.counts.missing,
        }),
      }),
      el('li', {
        text: t('obs.fit.stat.search', {
          evaluations: fit.evaluations,
          iterations: fit.iterations,
        }),
      })
    );
    const warnings = el(
      'ul',
      { id: 'fitWarnings', class: 'ow-problems' },
      ...fit.warnings.map(w =>
        el('li', {
          text: t(`obs.fit.warn.${w.code}`, {
            // By the names the table gives them, not the model's ids.
            parameter: w.parameter ? nameOf({ name: w.parameter }) : '',
            a: w.parameters ? nameOf({ name: w.parameters[0] }) : '',
            b: w.parameters ? nameOf({ name: w.parameters[1] }) : '',
            correlation: fmt(w.correlation),
            beta: fmt(w.beta),
            reduced: fmt(w.reducedChi2),
            rows: w.rows ?? '',
            snr: fmt(w.snr),
            why: w.why ?? '',
          }),
        })
      )
    );
    const notClaimed = el(
      'ul',
      { lang: 'en' },
      ...fit.notClaimed.map(n => el('li', { text: n }))
    );
    const assumptions = el(
      'ul',
      { lang: 'en' },
      ...fit.assumptions.map(n => el('li', { text: n }))
    );
    // The residuals, drawn by the observatory's own plot.
    const residualObs = {
      columns: [
        {
          id: 'x',
          name: t('obs.fit.res.x'),
          unit: d.units.x,
          role: 'x',
          values: d.x,
        },
        {
          id: 'r',
          name: t('obs.fit.res.residual'),
          unit: d.units.y,
          role: 'value',
          values: fit.residuals,
        },
      ],
      axes: { x: 'x', y: 'r' },
      masks: [],
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ow-plot');
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      t('obs.fit.res.plotLabel', { n: fit.residuals.length })
    );
    const plot = createPlot(svg, {
      announce: () => {},
      describe: () => '',
      number,
      labels: { notStated: t('obs.unit.notStated') },
    });
    plot.draw(residualObs, {
      xColumn: 'x',
      yColumn: 'r',
      selection: createSelection(fit.residuals.length),
    });
    results.replaceChildren(
      // Scrolls sideways on a narrow screen, so a keyboard must reach it.
      el(
        'div',
        {
          class: 'ow-table-wrap',
          tabindex: '0',
          role: 'region',
          'aria-label': t('obs.fit.res.caption'),
        },
        el(
          'table',
          { id: 'fitTable' },
          el('caption', { text: t('obs.fit.res.caption') }),
          el('thead', {}, head),
          body
        )
      ),
      el('p', { class: 'ow-hint', text: t('obs.fit.res.legend') }),
      stats,
      el('h3', { text: t('obs.fit.warnTitle') }),
      warnings,
      el('h3', { text: t('obs.fit.notClaimed') }),
      notClaimed,
      el('h3', { text: t('obs.fit.assumptions') }),
      assumptions,
      el('figure', {}, svg)
    );
  }

  return {
    /** Before the panel is replaced: stop what it started. */
    destroy() {
      job?.cancel('the panel was rebuilt');
    },
    /** A new observation (or the same one after a change). */
    update(next) {
      // A change to the data - a fold, a mask, another observation - leaves
      // a result, or a fit still running, describing data no longer shown.
      if (next !== o) {
        job?.cancel('the data changed');
        last = null;
        results.replaceChildren();
        exportBtn.hidden = true;
      }
      o = next;
      const ids = modelsFor(o, dimensionOfText);
      const keep = modelSelect.value;
      modelSelect.replaceChildren(
        ...ids.map(id =>
          el('option', { value: id, text: t(`obs.fit.model.${id}`) })
        )
      );
      if (ids.includes(keep)) modelSelect.value = keep;
      renderParams();
    },
  };
}
