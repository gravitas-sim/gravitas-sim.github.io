// =============================================================================
// Frames to a light curve (Prompt 185, FRAME_PIPELINE.md)
// -----------------------------------------------------------------------------
// A synthetic sequence of the calibration lab's frames goes through the
// pipeline of js/measure/frameSeries.js, one step at a time on the page: the
// calibration, the marks, the registration, the photometry, the comparison
// stars and the light curve. Each step shows only its own numbers (its
// quantities, each marked measured, derived or assumed, and its warnings); the
// comparison stars are a table the reader can override; the light curve is
// drawn with its error bars and the fitted sinusoid, listed in a table, saved
// as CSV, kept in the ledger or opened in the Observatory like any light curve.
//
// A sequence of frames that cannot be registered, or whose target cannot be
// measured in some frame, makes no light curve: the page names the frames and
// offers to leave them out and run again. At most 256 frames are read, one at
// a time. Loaded when the panel first opens; nothing here takes a key: every
// control is a button, a box or a checkbox.
// =============================================================================

import {
  RULES,
  csvRows,
  maxPixels,
  observationOf,
  quantitiesOf,
  reductionOf,
  runSequence,
} from '../measure/frameSeries.js';
import { DEMO, demoSequence, digestOf } from '../measure/frameSource.js';
import { permits } from '../dataKinds/contract.js';
import { toCsv, num } from '../csv.js';
import { roundSig } from '../format.js';

const WORDS = {
  en: () => import('../i18n/en.imageSequence.js').then(m => m.EN_IMAGESEQUENCE),
  es: () => import('../i18n/es.imageSequence.js').then(m => m.ES_IMAGESEQUENCE),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const STEPS = [
  'calibrate',
  'marks',
  'register',
  'photometry',
  'comparison',
  'lightcurve',
];
const KINDS = ['measured', 'derived', 'assumed'];
const CSV_COLS = ['frame', 'time', 'dm', 'sigma', 'target', 'ensemble'];

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const settle = () => new Promise(r => setTimeout(r, 0));
const median = a => {
  const s = Array.from(a).sort((x, y) => x - y);
  return s[s.length >> 1];
};

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   createPlot: Function, open: Function}} ctx
 * @returns {Promise<{update: () => void}>}
 */
export async function mountSequence(box, ctx) {
  await words(ctx);
  const { t } = ctx;
  const fmt = (v, d = 4) =>
    Number.isFinite(v) ? ctx.number(roundSig(v, d)) : '—';
  const labelled = [];
  const word = (node, id, prop = 'textContent') => {
    labelled.push([node, id, prop]);
    node[prop] = t(id);
    return node;
  };
  const live = el('div', { role: 'status', className: 'visually-hidden' });
  const say = m => live.replaceChildren(el('p', { textContent: m }));
  const refusal = el('p', { className: 'ui-status is-error', hidden: true });
  const button = (id, onclick) => {
    const b = word(
      el('button', { type: 'button', className: 'ui-button is-small' }),
      id
    );
    b.onclick = onclick;
    return b;
  };
  const field = (id, control) =>
    el('label', { className: 'im-field' }, word(el('span'), id), control);
  const input = (value, min, max, step = 'any') =>
    el('input', {
      type: 'number',
      step,
      min,
      max,
      value,
      className: 'ui-input',
    });
  const check = (id, checked = false) => {
    const box = el('input', { type: 'checkbox', checked });
    return [
      box,
      el('label', { className: 'im-field' }, box, word(el('span'), id)),
    ];
  };

  const seedIn = el('input', {
    type: 'text',
    value: '1',
    className: 'ui-input',
  });
  const framesIn = input(DEMO.count, 5, RULES.frames, 1);
  const ampIn = input(DEMO.amplitude, 0, 1);
  const periodIn = input(DEMO.period, 0.02, 10);
  const jitterIn = input(DEMO.jitter, 0, 5);
  const [loseBox, loseField] = check('obs.sq.lose');
  const [varyBox, varyField] = check('obs.sq.vary');
  const runBtn = button('obs.sq.run', () => doRun({}));
  const stopBtn = button('obs.sq.stop', () => {
    stopped = true;
  });
  const out = el('div', { className: 'ph-readout' });
  const nav = el('div', { className: 'im-tools', role: 'group', hidden: true });
  nav.setAttribute('aria-label', t('obs.sq.steps'));
  const stepBox = el('div', { className: 'ph-readout' });
  const chooser = el('div', { className: 'im-tablewrap' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ow-plot');
  svg.setAttribute('role', 'img');
  svg.hidden = true;
  const plot = ctx.createPlot(svg, {
    number: ctx.number,
    labels: { notStated: t('obs.unit.notStated') },
  });
  const table = el('details', { className: 'ui-disclosure', hidden: true });
  const recompute = button('obs.sq.recompute', () => {
    const ids = [...chooser.querySelectorAll('input:checked')].map(
      b => b.dataset.star
    );
    doRun({ comparison: ids.length ? { ids } : undefined, again: true });
  });
  const excludeBtn = button('obs.sq.exclude', () => {
    const frames = last?.refused ?? [];
    doRun({ exclude: [...new Set([...(excluded ?? []), ...frames])] });
  });
  const csvBtn = button('obs.sq.csv', () => doCsv());
  const keepBtn = button('obs.sq.keep', () => doKeep());
  const openBtn = button('obs.sq.open', () => doOpen());
  const actions = el(
    'div',
    { className: 'im-tools' },
    recompute,
    excludeBtn,
    csvBtn,
    keepBtn,
    openBtn
  );
  box.replaceChildren(
    live,
    word(el('p', { className: 'ui-hint' }), 'obs.sq.help'),
    word(el('p', { className: 'ui-hint' }), 'obs.sq.limits'),
    refusal,
    el(
      'div',
      { className: 'im-tools' },
      field('obs.sq.seed', seedIn),
      field('obs.sq.frames', framesIn),
      field('obs.sq.amplitude', ampIn),
      field('obs.sq.period', periodIn),
      field('obs.sq.jitter', jitterIn),
      loseField,
      varyField
    ),
    el('div', { className: 'im-tools' }, runBtn, stopBtn),
    out,
    nav,
    stepBox,
    chooser,
    actions,
    svg,
    table
  );

  // ---- a run ---------------------------------------------------------------------------
  let seq = null;
  let last = null; // { res, params }
  let excluded = null;
  let running = false;
  let stopped = false;
  let step = 0;

  const specOf = () => {
    const count = Math.round(framesIn.valueAsNumber);
    return {
      seed: seedIn.value.trim() || '1',
      count,
      amplitude: ampIn.valueAsNumber,
      period: periodIn.valueAsNumber,
      jitter: jitterIn.valueAsNumber,
      lose: loseBox.checked,
      vary: varyBox.checked,
    };
  };
  const sequenceOf = s =>
    demoSequence(`${s.seed}`, {
      count: s.count,
      amplitude: s.amplitude,
      period: s.period,
      jitter: s.jitter,
      replace: s.lose && s.count > 12 ? { 10: 'turn', 11: 'turn' } : undefined,
      variables: s.vary
        ? [{ id: 'C2', period: 0.2, amplitude: 0.06, phase: 'seed' }]
        : [],
    });
  const why = r =>
    t(`obs.sq.no.${r.code}`, {
      count: r.count,
      limit: r.limit,
      used: r.used,
      need: r.need,
      name: r.name,
      frames: (r.frames ?? []).map(k => k + 1).join(', '),
    });
  const buttons = () => {
    const done = Boolean(last?.res?.ok);
    runBtn.disabled = running;
    stopBtn.disabled = !running;
    recompute.hidden = !last?.res?.comparison;
    recompute.disabled = running;
    excludeBtn.hidden = !last?.refused?.length;
    excludeBtn.disabled = running;
    for (const b of [csvBtn, keepBtn, openBtn]) b.disabled = !done || running;
  };

  async function doRun({ exclude, comparison, again }) {
    if (running) return;
    const s = again ? last.spec : specOf();
    if (!(s.count >= 5 && s.count <= RULES.frames)) {
      refusal.hidden = false;
      refusal.textContent = why({
        code: s.count > RULES.frames ? 'too-many-frames' : 'too-few-frames',
        count: s.count,
        limit: RULES.frames,
        used: s.count,
        need: RULES.minFrames,
      });
      return say(refusal.textContent);
    }
    seq = sequenceOf(s);
    excluded = exclude ?? (again ? last.params.exclude : undefined);
    const params = {
      target: { id: 'V' },
      marks: undefined,
      ...(excluded?.length ? { exclude: excluded } : {}),
      ...(comparison ? { comparison } : {}),
      ...(again && !comparison && last.params.comparison
        ? { comparison: last.params.comparison }
        : {}),
    };
    // The target is the variable star of the field: its place, not a name.
    params.target = { x: DEMO.stars[0].x, y: DEMO.stars[0].y };
    delete params.marks;
    for (const n of [out, stepBox, chooser, table]) n.replaceChildren();
    svg.hidden = true;
    table.hidden = true;
    nav.hidden = true;
    refusal.hidden = true;
    running = true;
    stopped = false;
    buttons();
    say(t('obs.sq.progress', { k: 0, n: s.count }));
    const res = await runSequence(seq, params, {
      check: permits,
      signal: {
        get aborted() {
          return stopped;
        },
      },
      onProgress: (k, n) => say(t('obs.sq.progress', { k, n })),
      yieldNow: settle,
    });
    running = false;
    if (res.cancelled) {
      last = null;
      buttons();
      return say(t('obs.sq.stopped'));
    }
    last = {
      res,
      params,
      spec: s,
      refused: res.ok ? [] : (res.frames ?? []),
    };
    renderAll();
    buttons();
    say(summary());
  }

  const summary = () => {
    const { res } = last;
    if (!res.ok) return why(res);
    const f = res.fit;
    return t(
      res.constant.variable ? 'obs.sq.said.done' : 'obs.sq.said.constant',
      {
        points: res.used.length,
        period: fmt(f.period, 4),
        sigmaPeriod: fmt(f.sigmaPeriod, 2),
        amplitude: fmt(f.amplitude, 3),
        sigmaAmplitude: fmt(f.sigmaAmplitude, 2),
      }
    );
  };

  // ---- the steps, one at a time -------------------------------------------------------------------
  const stepButtons = STEPS.map((id, i) => {
    const b = el('button', { type: 'button', className: 'ui-button is-small' });
    b.onclick = () => showStep(i);
    return b;
  });
  const prev = button('obs.sq.prev', () => showStep(step - 1));
  const next = button('obs.sq.next', () => showStep(step + 1));
  nav.append(prev, ...stepButtons, next);

  const quantityLabel = q => {
    const [star, what] = q.id.split('.');
    return what
      ? t('obs.sq.q.starStability', { id: star })
      : t(`obs.sq.q.${q.id}`);
  };
  const warningText = w =>
    t(`obs.sq.w.${w.code}`, {
      frame: (w.frame ?? 0) + 1,
      star: w.star,
      frames: w.frames,
      reason: w.reason,
      matched: w.matched,
      chi2red: fmt(w.chi2red, 3),
      p: fmt(w.p, 3),
      candidates: w.candidates,
    });
  function showStep(i) {
    if (!last) return;
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    const { res } = last;
    const nodes = res.nodes ?? [];
    const n = nodes.find(x => x.id === `frames-${STEPS[step]}`);
    stepButtons.forEach((b, k) => {
      b.textContent = `${k + 1}. ${t(`obs.sq.step.${STEPS[k]}`)}`;
      b.disabled = !nodes.some(x => x.id === `frames-${STEPS[k]}`);
      if (k === step) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    prev.disabled = step === 0;
    next.disabled = step === STEPS.length - 1;
    const head = el('h4', {
      textContent: t('obs.sq.stepOf', {
        k: step + 1,
        n: STEPS.length,
        name: t(`obs.sq.step.${STEPS[step]}`),
      }),
    });
    if (!n) {
      stepBox.replaceChildren(
        head,
        el('p', {
          className: 'ui-status is-error',
          textContent: t('obs.sq.notReached'),
        })
      );
      return;
    }
    stepBox.replaceChildren(
      head,
      el('p', { textContent: t(`obs.sq.what.${STEPS[step]}`) }),
      el(
        'table',
        { className: 'im-table' },
        el('caption', { textContent: t('obs.sq.quantities') }),
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            ...['quantity', 'value', 'error', 'kind'].map(k =>
              el('th', { scope: 'col', textContent: t(`obs.sq.col.${k}`) })
            )
          )
        ),
        el(
          'tbody',
          {},
          ...n.quantities
            .filter(q => !(q.value === null || q.value === undefined))
            .map(q =>
              el(
                'tr',
                {},
                el('th', { scope: 'row', textContent: quantityLabel(q) }),
                el('td', {
                  textContent: fmt(q.value, 5) + (q.unit ? ` ${q.unit}` : ''),
                }),
                el('td', {
                  textContent: Number.isFinite(q.error) ? fmt(q.error, 3) : '',
                }),
                el('td', {
                  textContent: KINDS.includes(q.kind)
                    ? t(`obs.sq.kind.${q.kind}`)
                    : q.kind,
                })
              )
            )
        )
      ),
      ...(n.warnings.length
        ? [
            el(
              'ul',
              { className: 'ui-hint' },
              ...n.warnings.map(w => el('li', { textContent: warningText(w) }))
            ),
          ]
        : []),
      ...(STEPS[step] === 'register' ? [registerTable(res)] : [])
    );
  }
  const registerTable = res => {
    const rows = [...res.frames.values()].sort((a, b) => a.k - b.k);
    return el(
      'details',
      { className: 'ui-disclosure' },
      el('summary', { textContent: t('obs.sq.perFrame') }),
      el(
        'div',
        { className: 'im-tablewrap' },
        el(
          'table',
          { className: 'im-table' },
          el('caption', { textContent: t('obs.sq.perFrame') }),
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ...['frame', 'dx', 'dy', 'turn', 'matched', 'rms', 'status'].map(
                k =>
                  el('th', { scope: 'col', textContent: t(`obs.sq.col.${k}`) })
              )
            )
          ),
          el(
            'tbody',
            {},
            ...rows.map(f => {
              const r = f.registration;
              return el(
                'tr',
                {},
                el('th', { scope: 'row', textContent: String(f.k + 1) }),
                el('td', { textContent: r.ok ? fmt(r.tx, 3) : '' }),
                el('td', { textContent: r.ok ? fmt(r.ty, 3) : '' }),
                el('td', { textContent: r.ok ? fmt(r.thetaDeg, 2) : '' }),
                el('td', { textContent: String(r.matched ?? '') }),
                el('td', { textContent: r.ok ? fmt(r.rms, 2) : '' }),
                el('td', {
                  textContent: r.ok
                    ? t('obs.sq.reg.ok')
                    : t(`obs.sq.reg.${r.code}`),
                })
              );
            })
          )
        )
      )
    );
  };

  // ---- the comparison stars, a table with an override ------------------------------------------
  function renderChooser() {
    chooser.replaceChildren();
    const { res } = last;
    if (!res.comparison) return;
    const marks = new Map(res.marks.map(m => [m.id, m]));
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    chooser.append(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.sq.chooser')),
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            ...[
              'use',
              'star',
              'x',
              'y',
              'flux',
              'snr',
              'chi2red',
              'status',
            ].map(k => cell('th', t(`obs.sq.col.${k}`), { scope: 'col' }))
          )
        ),
        el(
          'tbody',
          {},
          ...res.comparison.candidates.map(id => {
            const m = marks.get(id);
            const s = res.series[id];
            const st = res.comparison.stats[id];
            const box = el('input', {
              type: 'checkbox',
              checked: res.chosen.includes(id),
            });
            box.dataset.star = id;
            box.setAttribute('aria-label', t('obs.sq.useStar', { id }));
            return el(
              'tr',
              {},
              el('td', {}, box),
              cell('th', id, { scope: 'row' }),
              cell('td', fmt(m.x + 1, 4)),
              cell('td', fmt(m.y + 1, 4)),
              cell('td', fmt(median(s.net), 4)),
              cell('td', fmt(median(s.net.map((v, i) => v / s.sigma[i])), 3)),
              cell('td', fmt(st.chi2red, 3)),
              cell('td', t(`obs.sq.stab.${st.status}`))
            );
          })
        )
      )
    );
  }

  // ---- the light curve ------------------------------------------------------------------------------
  function renderCurve() {
    const { res } = last;
    table.replaceChildren();
    if (!res.ok) {
      svg.hidden = true;
      table.hidden = true;
      return;
    }
    const f = res.fit;
    const o = {
      kind: 'time-series',
      columns: [
        {
          id: 'time',
          name: t('obs.sq.axis.time'),
          unit: 'd',
          role: 'x',
          values: res.times,
        },
        {
          id: 'dm',
          name: t('obs.sq.axis.dm'),
          unit: 'mag',
          role: 'value',
          values: res.dm,
        },
        {
          id: 'dm-sigma',
          name: t('obs.sq.axis.sigma'),
          unit: 'mag',
          role: 'uncertainty',
          of: 'dm',
          values: res.dmSigma,
        },
      ],
      axes: { x: 'time', y: 'dm' },
      masks: [],
    };
    const t0 = res.times[0];
    const t1 = res.times[res.times.length - 1];
    const model = Array.from({ length: 240 }, (_, i) => {
      const x = t0 + ((t1 - t0) * i) / 239;
      const arg = (2 * Math.PI * x) / f.period;
      return [x, f.mean + f.a * Math.sin(arg) + f.b * Math.cos(arg)];
    });
    svg.hidden = false;
    plot.draw(o, {
      xColumn: 'time',
      yColumn: 'dm',
      overlays: [{ label: t('obs.sq.model'), points: model }],
    });
    svg.setAttribute('aria-label', t('obs.sq.plot'));
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    table.hidden = false;
    table.append(
      el('summary', { textContent: t('obs.sq.table') }),
      el(
        'div',
        { className: 'im-tablewrap' },
        el(
          'table',
          { className: 'im-table' },
          cell('caption', t('obs.sq.table')),
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              ...['frame', 'time', 'dm', 'sigma'].map(k =>
                cell('th', t(`obs.sq.col.${k}`), { scope: 'col' })
              )
            )
          ),
          el(
            'tbody',
            {},
            ...res.used.map((k, i) =>
              el(
                'tr',
                {},
                cell('th', String(k + 1), { scope: 'row' }),
                cell('td', fmt(res.times[i], 5)),
                cell('td', fmt(res.dm[i], 5)),
                cell('td', fmt(res.dmSigma[i], 3))
              )
            )
          )
        )
      )
    );
  }

  function renderAll() {
    if (!last) return;
    const { res } = last;
    const line = x => el('p', { textContent: x });
    out.replaceChildren();
    refusal.hidden = res.ok;
    if (!res.ok) refusal.textContent = why(res);
    else {
      const f = res.fit;
      out.append(
        line(summary()),
        line(
          t('obs.sq.fit', {
            chi2red: fmt(f.chi2red, 3),
            p: fmt(res.constant.p, 3),
          })
        ),
        el('p', {
          className: 'ui-hint',
          textContent: t('obs.sq.comparisonUsed', {
            stars: res.chosen.join(', '),
          }),
        })
      );
      if (f.sigmaPeriod !== null)
        out.append(
          el('p', { className: 'ui-hint', textContent: t('obs.sq.asymptotic') })
        );
    }
    nav.hidden = false;
    showStep(Math.min(step, (res.nodes?.length ?? 1) - 1));
    renderChooser();
    renderCurve();
  }

  // ---- the lists, the observation and the ledger -----------------------------------------------------
  const download = (text, name) => {
    const url = URL.createObjectURL(
      new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' })
    );
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  function doCsv() {
    if (!last?.res.ok) return;
    const rows = csvRows(
      last.res,
      CSV_COLS.map(k => t(`obs.sq.csvCol.${k}`)),
      num
    );
    download(toCsv(rows), `${seq.id.replace(/[^\w.-]+/g, '_')}-lightcurve.csv`);
    say(t('obs.sq.said.csv', { n: rows.length - 1 }));
  }
  const observation = () =>
    observationOf(last.res, seq, {
      title: t('obs.sq.obsTitle', { seed: last.spec.seed }),
      names: {
        time: t('obs.sq.axis.time'),
        dm: t('obs.sq.axis.dm'),
        sigma: t('obs.sq.axis.sigma'),
      },
    });
  function doOpen() {
    if (!last?.res.ok) return;
    ctx.open(observation());
    say(t('obs.sq.said.opened'));
  }
  async function doKeep() {
    if (!last?.res.ok) return;
    try {
      const { res, params } = last;
      const [{ artifact }, { artifactEntry }, { SOURCE }, nb] =
        await Promise.all([
          import('../platform/artifact.js'),
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
      const digest = await digestOf(seq);
      const envelope = artifact({
        id: `sequence-${last.spec.seed}`.slice(0, 120),
        source: { kind: 'observation', id: seq.id, digest },
        quantities: quantitiesOf(res),
        provenance: {
          reductions: [await reductionOf(seq, params, res, digestOf)],
        },
        made: { app: 'gravitas', tool: 'image-sequence' },
      });
      const entry = artifactEntry({
        source: SOURCE.IMAGE_SEQUENCE,
        envelope,
        title: t('obs.sq.ledgerEntry', { seed: last.spec.seed }),
        labels: {
          quantity: q => {
            const [a, b, c] = q.id.split('.');
            if (a === 'cmp') return t('obs.sq.q.starStability', { id: b });
            if (b === 't' || b === 'm')
              return t(`obs.sq.q.lc.${b}`, { frame: Number(c) + 1 });
            return t(`obs.sq.q.${b === 'mean' ? 'meanMagnitude' : b}`);
          },
        },
        context: { page: 'observatory', observation: { id: seq.id } },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = nb.save([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      say(t('obs.sq.said.kept'));
    } catch (err) {
      say(t('obs.sq.said.keepFailed', { why: err.message }));
    }
  }

  // ---- words, and the page's language -------------------------------------------------------------------
  function label() {
    for (const [n, id, prop] of labelled) n[prop] = t(id);
    nav.setAttribute('aria-label', t('obs.sq.steps'));
    if (last) renderAll();
  }
  new MutationObserver(async () => {
    await words(ctx);
    label();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  label();
  buttons();
  stepButtons.forEach((b, k) => {
    b.textContent = `${k + 1}. ${t(`obs.sq.step.${STEPS[k]}`)}`;
  });
  void maxPixels;
  return { update() {} };
}
