// =============================================================================
// The Exoplanet Observatory's guided investigations: the runner
// -----------------------------------------------------------------------------
// Loaded when a reader first opens "Guided investigations", or with
// ?guide=<id>[&path=advanced], so the page carries none of it at start-up.
// The investigations themselves are data (./guides/exoplanet.js); this draws
// one step at a time and checks it against the workspace:
//
//   read     text, and sometimes a panel of numbers computed from the data
//   do       something to do in the workspace, with a button that starts it
//            (open an observation, open a panel) and a check that looks for
//            the result: an observation open, a measurement, a fold, a fit
//   answer   a number to type, checked against what the data give
//   choose   an option, checked against the right one, or recorded when it is
//            a prediction a later step answers
//
// A reader may move on without passing a step; the progress list says which
// passed. After a wrong answer the right one can be shown, and the step then
// says it was shown rather than found. Progress is kept in this browser
// (localStorage, per guide) and the answers go to the notebook as an
// Observatory entry (js/notebook/observed.js), where the report can use them.
//
// It imports nothing the page starts with: the page lends what it needs, as it
// does the fit and measurement panels (js/observatory/fitPanel.js says why).
// =============================================================================

import {
  ADOPTED,
  ANSWERS,
  CORRECT,
  GUIDES,
  PATHS,
  RSUN_PER_RJUP,
  SIGNIFICANT,
  TARGETS,
  periodOf,
  stepsOn,
  transitOf,
} from './guides/exoplanet.js';
import { seriesOf } from './guides/science.js';
import { installedPack } from '../catalog/installed.js';
import { install } from '../catalog/install.js';
import { openStore } from '../catalog/store.js';
import { observedEntry } from '../notebook/observed.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from '../notebook/store.js';
import { EN_GUIDES } from '../i18n/en.guides.js';
import { ES_GUIDES } from '../i18n/es.guides.js';
import { EN_CATALOG } from '../i18n/en.catalog.js';
import { ES_CATALOG } from '../i18n/es.catalog.js';

export const GUIDE_VERSION = '1.0.0';
const STORAGE_KEY = 'gravitas_guides';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (v !== undefined && v !== null && v !== false)
      node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
};

/** A typed number, with a decimal comma as well as a point. */
export function parseAnswer(text) {
  const s = String(text ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  return Number(s);
}

/** Whether a typed answer is the expected one, to its tolerance. */
export function answerMatches(typed, expected, tolerance) {
  return (
    Number.isFinite(typed) &&
    Number.isFinite(expected) &&
    Math.abs(typed - expected) <= tolerance + 1e-9 * Math.abs(expected)
  );
}

const within = (v, [lo, hi]) =>
  Number.isFinite(v) && v >= lo - 1e-12 && v <= hi + 1e-12;

/** A fit document's value of a fitted or derived quantity. */
export function fitValue(doc, name) {
  const fit = doc?.results?.fit;
  const p =
    fit?.parameters?.find(q => q.name === name) ??
    fit?.derived?.find(q => q.name === name);
  return p && Number.isFinite(p.value) ? p.value : null;
}

/**
 * Does the workspace hold what a `do` step asks for? Pure, on plain data:
 * {source, changes, nodes, fits}. Returns {ok, evidence, value} or
 * {ok: false, why, vars}.
 */
export function evaluateCheck(check, w) {
  const id = TARGETS[check.target]?.observation;
  if (check.kind === 'opened') {
    return w.source?.id === id
      ? { ok: true, evidence: null, value: null }
      : { ok: false, why: 'notOpened' };
  }
  if (check.kind === 'folded') {
    if (w.source?.id !== id) return { ok: false, why: 'notOpened' };
    const fold = [...(w.changes || [])].reverse().find(c => c.op === 'fold');
    if (!fold) return { ok: false, why: 'noFold' };
    return within(fold.period, check.period)
      ? { ok: true, evidence: fold, value: fold.period }
      : { ok: false, why: 'foldPeriod', vars: { value: fold.period } };
  }
  if (check.kind === 'measured') {
    const mine = (w.nodes || []).filter(
      n =>
        n.tool === check.tool &&
        n.status === 'current' &&
        n.input?.observation === id &&
        Object.entries(check.params || {}).every(
          ([k, v]) => n.params?.[k] === v
        )
    );
    if (!mine.length) return { ok: false, why: 'noMeasurement' };
    const n = mine.at(-1);
    const v = n.quantities.find(q => q.id === check.quantity)?.value;
    return within(v, check.within)
      ? { ok: true, evidence: n, value: v }
      : { ok: false, why: 'outside', vars: { value: v } };
  }
  if (check.kind === 'fitted') {
    const mine = (w.fits || []).filter(d => d.data?.observation === id);
    if (!mine.length) return { ok: false, why: 'noFit' };
    const settled = mine.filter(d =>
      Object.entries(check.settings || {}).every(([k, range]) => {
        const s = d.settings || {};
        const v =
          k === 'dilution'
            ? (s.dilution ?? 0)
            : k === 'stellarRadius'
              ? s.stellarRadius?.value
              : k === 'stellarRadiusSigma'
                ? s.stellarRadius?.sigma
                : s[k];
        return within(v, range);
      })
    );
    if (!settled.length) return { ok: false, why: 'fitSettings' };
    const d = settled.at(-1);
    const v = fitValue(d, check.parameter);
    return within(v, check.within)
      ? { ok: true, evidence: d, value: v }
      : { ok: false, why: 'outside', vars: { value: v } };
  }
  return { ok: false, why: 'unknown' };
}

/**
 * @param {HTMLDetailsElement} root - The page's #obsGuidePanel
 * @param {object} ctx - What the page lends: t, number, registerMessages,
 *   open, status, state, openFixture, lightCurveObservation, nodes() (the
 *   measurement panel's, or none), showPanel(name)
 */
export function mountGuidePanel(root, ctx) {
  ctx.registerMessages({
    en: { ...EN_GUIDES, ...EN_CATALOG },
    es: { ...ES_GUIDES, ...ES_CATALOG },
  });
  const { t } = ctx;
  const saved = readSaved();
  const run = {
    guide: null,
    path: 'intro',
    at: 0,
    // Per step id: {value, ok, shown} | {choice, ok} | {passed, value}
    record: {},
    // The measurement node or fit document that passed a `do` step.
    evidence: {},
    feedback: null,
  };
  // Observations the guide has read, by target: {o, pack, series}.
  const seen = new Map();

  const words = {
    guide: g => t(`gd.${g.id}.title`),
    step: (s, part) => t(`gd.${run.guide.id}.${s.id}.${part}`),
    target: id => t(`gd.target.${id}`),
  };

  // --- What the answers are computed from -----------------------------------------

  function remember(target, o) {
    seen.set(target, {
      o,
      pack: o.pack ?? null,
      series: o.kind === 'time-series' ? seriesOf(o) : null,
    });
  }
  const context = {
    pack: target => seen.get(target)?.pack ?? null,
    series: target => seen.get(target)?.series ?? null,
    evidence: stepId => run.evidence[stepId] ?? null,
    quantity: (stepId, name) => {
      const e = run.evidence[stepId];
      if (!e) return run.record[stepId]?.values?.[name] ?? null;
      if (e.quantities) {
        const v = e.quantities.find(q => q.id === name)?.value;
        return Number.isFinite(v) ? v : null;
      }
      return fitValue(e, name);
    },
  };

  /** The observation for a target, without opening it; null if it is not here. */
  async function load(target, { installing = false } = {}) {
    if (seen.has(target)) return seen.get(target).o;
    const T = TARGETS[target];
    let o;
    if (T.fixture) o = await ctx.openFixture(T.fixture);
    else {
      let got = await installedPack(T.install);
      if (!got && installing) {
        await installFromCatalog(T.install);
        got = await installedPack(T.install);
      }
      if (!got) return null;
      o = await ctx.lightCurveObservation(got.module, {
        citations: got.citations,
        idPrefix: 'installed',
      });
    }
    remember(target, o);
    return o;
  }

  async function installFromCatalog(id) {
    const url = new URL('../catalog/catalog.json', document.baseURI);
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const catalog = await res.json();
    const entry = catalog.entries.find(e => e.id === id);
    if (!entry) throw new Error(`the catalog has no ${id}`);
    ctx.status(t('gd.installing', { title: entry.title?.en ?? id }));
    await install(entry, {
      catalog,
      store: await openStore(),
      fetchBytes: async u => {
        const r = await fetch(u, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return new Uint8Array(await r.arrayBuffer());
      },
      base: url,
    });
  }

  /** Read every target a step's answer or panel needs, quietly. */
  async function prepare(step) {
    const targets = new Set();
    if (step.target) targets.add(step.target);
    if (step.show === 'depths' || step.expect?.answer === 'depthRatio') {
      targets.add('kepler13-sap');
      targets.add('kepler13-pdcsap');
    }
    if (
      ['crowdsap', 'dilution', 'radiusRatioIfB'].includes(step.expect?.answer)
    )
      targets.add('kepler13-sap');
    if (step.show === 'crowding') targets.add('kepler13-sap');
    if (step.expect?.answer === 'qualityDropped' || step.show === 'count')
      targets.add('hd209458');
    for (const target of targets) {
      try {
        await load(target);
      } catch {
        /* the step says what it is missing */
      }
    }
  }

  // --- Checking -------------------------------------------------------------------

  const workspace = async () => ({
    source: ctx.state.source,
    changes: ctx.state.history.changes(),
    nodes: await ctx.nodes(),
    fits: ctx.state.fits,
  });

  async function checkDo(step, { quiet = false } = {}) {
    const r = evaluateCheck(step.check, await workspace());
    if (r.ok) {
      run.evidence[step.id] = r.evidence;
      run.record[step.id] = {
        passed: true,
        value: r.value,
        ...(r.evidence?.quantities || r.evidence?.results
          ? { values: valuesOf(r.evidence) }
          : {}),
      };
      save();
      say(true, words.step(step, 'ok'), { value: fmt(r.value) });
    } else if (!quiet) {
      say(
        false,
        t(`gd.check.${r.why}`, {
          target: words.target(step.check.target),
          value: fmt(r.vars?.value),
        })
      );
    }
    return r.ok;
  }

  // The numbers a later answer reads, kept with the progress so a reload does
  // not lose them (the evidence itself is not kept: a fit is large).
  function valuesOf(e) {
    if (e.quantities)
      return Object.fromEntries(e.quantities.map(q => [q.id, q.value]));
    const fit = e.results?.fit;
    return Object.fromEntries(
      [...(fit?.parameters || []), ...(fit?.derived || [])].map(p => [
        p.name,
        p.value,
      ])
    );
  }

  function expected(step) {
    const f = ANSWERS[step.expect.answer];
    const v = f ? f(context, step) : null;
    return Number.isFinite(v) ? v : null;
  }

  function correctOption(step) {
    if (step.correct === null) return null;
    if (typeof step.correct === 'string') return step.correct;
    return CORRECT[step.correct.answer]?.(context, step) ?? undefined;
  }

  async function checkAnswer(step, text) {
    await prepare(step);
    const typed = parseAnswer(text);
    if (typed === null) return say(false, t('gd.check.notANumber'));
    const want = expected(step);
    if (want === null) return say(false, t('gd.check.notYet'));
    const ok = answerMatches(typed, want, step.expect.tolerance);
    run.record[step.id] = { value: typed, ok, shown: false };
    save();
    if (ok) say(true, words.step(step, 'ok'), { value: fmt(typed) });
    else say(false, words.step(step, 'no'), {}, { reveal: true });
  }

  async function checkChoice(step, choice) {
    if (!choice) return say(false, t('gd.check.choose'));
    await prepare(step);
    const want = correctOption(step);
    if (want === null) {
      run.record[step.id] = { choice, ok: null };
      save();
      return say(true, t('gd.check.recorded'));
    }
    if (want === undefined) return say(false, t('gd.check.notYet'));
    const ok = choice === want;
    run.record[step.id] = { choice, ok };
    save();
    say(ok, words.step(step, ok ? 'ok' : 'no'), {}, { reveal: !ok });
  }

  async function reveal(step) {
    await prepare(step);
    if (step.kind === 'answer') {
      const want = expected(step);
      if (want === null) return say(false, t('gd.check.notYet'));
      run.record[step.id] = { ...(run.record[step.id] || {}), shown: true };
      save();
      say(
        null,
        t('gd.revealed', { value: fmt(want) }) + ' ' + words.step(step, 'ok'),
        {
          value: fmt(want),
        }
      );
    } else {
      const want = correctOption(step);
      if (!want) return say(false, t('gd.check.notYet'));
      run.record[step.id] = { ...(run.record[step.id] || {}), shown: true };
      save();
      say(
        null,
        t('gd.revealedChoice', { option: words.step(step, `opt.${want}`) }) +
          ' ' +
          words.step(step, 'ok')
      );
    }
  }

  // --- Doing ----------------------------------------------------------------------

  async function go(step) {
    const g = step.go;
    try {
      if (g.open) {
        const current = ctx.state.source?.id === TARGETS[g.open].observation;
        if (!current) {
          const o = await load(g.open, { installing: true });
          if (!o) throw new Error(t('gd.go.missing'));
          ctx.open(o);
        }
      }
      if (g.panel && !(await ctx.showPanel(g.panel)))
        throw new Error(t('gd.go.noPanel'));
      // Opening re-renders the page, which may already have passed the step.
      if (step.check && stateOf(step) !== 'done')
        await checkDo(step, { quiet: true });
    } catch (err) {
      say(false, t('gd.go.failed', { why: err.message }));
    }
  }

  // --- Words and numbers ----------------------------------------------------------

  function fmt(v) {
    return Number.isFinite(v) ? ctx.number(Number(v.toPrecision(6))) : '—';
  }
  const ppm = v => (Number.isFinite(v) ? Math.round(v * 1e6) : '—');

  /** The step's message, with its numbers, where the reader will hear it. */
  function say(ok, text, vars = {}, { reveal: canReveal = false } = {}) {
    const out = Object.keys(vars).length
      ? text.replace(/\{(\w+)\}/g, (w, k) => (k in vars ? vars[k] : w))
      : text;
    run.feedback = { ok, text: out, canReveal };
    renderFeedback();
    // A check that passed or failed changes a step's state in the list too.
    if (ui && run.guide) renderProgress();
    ctx.status(out);
  }

  // --- Progress -------------------------------------------------------------------

  function readSaved() {
    try {
      return (
        JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || '{}') || {}
      );
    } catch {
      return {};
    }
  }
  function save() {
    if (!run.guide) return;
    saved[run.guide.id] = {
      v: GUIDE_VERSION,
      path: run.path,
      at: run.at,
      record: run.record,
    };
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* progress lasts as long as the page, then */
    }
  }

  function start(id, path) {
    const g = GUIDES.find(x => x.id === id) ?? GUIDES[0];
    const kept = saved[g.id];
    run.guide = g;
    run.path = PATHS.includes(path) ? path : (kept?.path ?? 'intro');
    run.record = kept?.v === GUIDE_VERSION ? { ...kept.record } : {};
    run.evidence = {};
    run.at = Math.min(
      kept?.path === run.path ? kept.at : 0,
      stepsOn(g, run.path).length - 1
    );
    run.feedback = null;
    save();
    render();
  }

  const steps = () => stepsOn(run.guide, run.path);
  const stateOf = s => {
    const r = run.record[s.id];
    if (!r) return 'todo';
    if (r.passed || r.ok === true || (s.kind === 'choose' && r.ok === null))
      return r.shown ? 'shown' : 'done';
    return r.shown ? 'shown' : 'tried';
  };

  // --- Notebook -------------------------------------------------------------------

  function toNotebook() {
    const g = run.guide;
    const main = [...seen.values()].at(-1)?.o ?? ctx.state.source;
    const answered = steps().filter(
      s => s.kind === 'answer' && Number.isFinite(run.record[s.id]?.value)
    );
    const quantities = answered.map(s => ({
      id: s.id,
      value: run.record[s.id].value,
      unit: '',
      kind: 'measured',
    }));
    const rows = steps()
      .filter(s => s.kind !== 'read')
      .map(s => [words.step(s, 'title'), t(`gd.state.${stateOf(s)}`)]);
    const entry = observedEntry({
      node: {
        tool: `guide:${g.id}`,
        version: GUIDE_VERSION,
        params: { path: run.path },
        at: 0,
        quantities,
      },
      source: main ?? { id: g.id, title: words.guide(g) },
      digest: null,
      changes: [],
      title: t('gd.nb.title', { guide: words.guide(g) }),
      labels: {
        quantity: q =>
          words.step(
            steps().find(s => s.id === q.id),
            'title'
          ),
        note: q =>
          t(
            run.record[q.id]?.shown
              ? 'gd.nb.shown'
              : run.record[q.id]?.ok
                ? 'gd.nb.checked'
                : 'gd.nb.unchecked'
          ),
        rows,
      },
    });
    const loaded = loadNotebook();
    if (!loaded.ok)
      return say(false, t('gd.nb.failed', { why: loaded.reason }));
    const out = saveNotebook([...loaded.entries, entry]);
    say(
      out.ok,
      out.ok ? t('gd.nb.added') : t('gd.nb.failed', { why: out.reason })
    );
  }

  // --- Drawing --------------------------------------------------------------------

  let ui = null;
  function build() {
    const intro = el('p', { class: 'ow-hint', text: t('gd.intro') });
    const pick = el('select', { id: 'gdGuide' });
    for (const g of GUIDES)
      pick.append(el('option', { value: g.id, text: words.guide(g) }));
    const path = el('select', { id: 'gdPath' });
    for (const p of PATHS)
      path.append(el('option', { value: p, text: t(`gd.path.${p}`) }));
    const startBtn = el('button', {
      class: 'ui-button',
      type: 'button',
      id: 'gdStart',
      text: t('gd.start'),
    });
    startBtn.addEventListener('click', () => start(pick.value, path.value));
    const summary = el('p', { id: 'gdSummary', class: 'ow-hint' });
    const update = () => {
      const g = GUIDES.find(x => x.id === pick.value);
      summary.textContent = `${t(`gd.${g.id}.summary`)} ${t('gd.meta', {
        steps: stepsOn(g, path.value).length,
        minutes: g.minutes[path.value],
      })}`;
    };
    pick.addEventListener('change', update);
    path.addEventListener('change', update);
    const chooser = el(
      'div',
      { class: 'ow-grid' },
      el(
        'label',
        { class: 'ow-field' },
        el('span', { text: t('gd.pick') }),
        pick
      ),
      el(
        'label',
        { class: 'ow-field' },
        el('span', { text: t('gd.path') }),
        path
      ),
      el('div', {}, startBtn)
    );
    const card = el('section', {
      id: 'gdStep',
      class: 'ow-guide-step',
      'aria-labelledby': 'gdStepTitle',
      hidden: true,
    });
    const progress = el('ol', {
      id: 'gdProgress',
      class: 'ow-guide-progress',
      'aria-label': t('gd.progress'),
    });
    const back = el('a', {
      id: 'gdReturn',
      class: 'ow-guide-return',
      href: '#gdStep',
      hidden: true,
    });
    back.addEventListener('click', e => {
      e.preventDefault();
      card.scrollIntoView({ block: 'start' });
      card.querySelector('h3')?.focus();
    });
    const body = el(
      'div',
      { id: 'gdBody' },
      intro,
      chooser,
      summary,
      card,
      progress
    );
    root.append(body);
    // Inside the page's main landmark, where every part of the page belongs.
    (root.closest('main') ?? document.body).append(back);
    // The return link shows while a guide runs and its step is out of view.
    let visible = true;
    const observer =
      typeof globalThis.IntersectionObserver === 'function'
        ? new globalThis.IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            back.hidden = visible || !run.guide || !root.open;
          })
        : null;
    observer?.observe(card);
    return {
      body,
      pick,
      path,
      summary,
      card,
      progress,
      back,
      update,
      observer,
      get visible() {
        return visible;
      },
    };
  }

  function render() {
    if (!ui) return;
    if (run.guide) {
      ui.pick.value = run.guide.id;
      ui.path.value = run.path;
    }
    ui.update();
    if (!run.guide) {
      ui.card.hidden = true;
      return;
    }
    const list = steps();
    const step = list[run.at];
    ui.card.hidden = false;
    const heading = el('h3', {
      id: 'gdStepTitle',
      tabindex: '-1',
      text: t('gd.stepOf', {
        n: run.at + 1,
        of: list.length,
        title: words.step(step, 'title'),
      }),
    });
    const text = words
      .step(step, 'text')
      .split('\n\n')
      .map(p => el('p', { text: p }));
    const parts = [heading, ...text];
    if (step.path === 'advanced')
      parts.splice(
        1,
        0,
        el('p', { class: 'ow-guide-tag', text: t('gd.advanced') })
      );
    const show = el('div', { id: 'gdShow' });
    parts.push(show);
    if (step.show) drawShow(step, show);
    const actions = el('div', { class: 'ow-actions' });
    if (step.go) {
      const b = el('button', {
        class: 'ui-button',
        type: 'button',
        id: 'gdGo',
        'data-action': 'go',
        text: goText(step.go),
      });
      b.addEventListener('click', async () => {
        b.disabled = true;
        await go(step);
        b.disabled = false;
      });
      actions.append(b);
    }
    if (step.kind === 'do') {
      const b = el('button', {
        class: 'ui-button',
        type: 'button',
        id: 'gdCheck',
        text: t('gd.checkWork'),
      });
      b.addEventListener('click', () => checkDo(step));
      actions.append(b);
    }
    if (step.kind === 'answer') {
      const input = el('input', {
        id: 'gdAnswer',
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        value: run.record[step.id]?.value ?? '',
      });
      const b = el('button', {
        class: 'ui-button',
        type: 'button',
        id: 'gdCheck',
        text: t('gd.check'),
      });
      const submit = () => checkAnswer(step, input.value);
      b.addEventListener('click', submit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') submit();
      });
      parts.push(
        el(
          'label',
          { class: 'ow-field ow-guide-answer' },
          el('span', { text: t('gd.answer') }),
          input
        )
      );
      actions.append(b);
    }
    if (step.kind === 'choose') {
      const set = el(
        'fieldset',
        { id: 'gdChoices' },
        el('legend', { text: t('gd.choose') })
      );
      for (const o of step.options) {
        const input = el('input', {
          type: 'radio',
          name: 'gdChoice',
          value: o,
          checked: run.record[step.id]?.choice === o,
        });
        set.append(
          el(
            'label',
            { class: 'ow-guide-option' },
            input,
            el('span', { text: words.step(step, `opt.${o}`) })
          )
        );
      }
      const b = el('button', {
        class: 'ui-button',
        type: 'button',
        id: 'gdCheck',
        text: t(step.correct === null ? 'gd.record' : 'gd.check'),
      });
      b.addEventListener('click', () =>
        checkChoice(step, set.querySelector('input:checked')?.value)
      );
      parts.push(set);
      actions.append(b);
    }
    parts.push(actions);
    parts.push(
      el('p', { id: 'gdFeedback', class: 'ow-guide-feedback', role: 'status' })
    );
    const nav = el('div', { class: 'ow-actions' });
    const prev = el('button', {
      class: 'ui-button ow-small',
      type: 'button',
      id: 'gdPrev',
      text: t('gd.back'),
      disabled: run.at === 0,
    });
    prev.addEventListener('click', () => move(-1));
    const next = el('button', {
      class: 'ui-button ow-small',
      type: 'button',
      id: 'gdNext',
      text: t(run.at === list.length - 1 ? 'gd.finish' : 'gd.next'),
    });
    next.addEventListener('click', () =>
      run.at === list.length - 1 ? finish() : move(1)
    );
    nav.append(prev, next);
    if (step.id === 'wrap') {
      const nb = el('button', {
        class: 'ui-button ow-small',
        type: 'button',
        id: 'gdNotebook',
        text: t('gd.nb.add'),
      });
      nb.addEventListener('click', toNotebook);
      const link = el('a', {
        id: 'gdLink',
        href: `?guide=${encodeURIComponent(run.guide.id)}&path=${run.path}`,
        text: t('gd.link'),
      });
      nav.append(nb, link);
    }
    parts.push(nav);
    ui.card.replaceChildren(...parts);
    renderFeedback();
    renderProgress();
    ui.back.textContent = t('gd.return', { n: run.at + 1, of: list.length });
    ui.back.hidden = ui.visible || !root.open;
  }

  function goText(g) {
    if (g.open) {
      const T = TARGETS[g.open];
      return t(
        T.install && !seen.has(g.open) ? 'gd.go.install' : 'gd.go.open',
        {
          target: words.target(g.open),
        }
      );
    }
    return t(`gd.go.panel.${g.panel}`);
  }

  function renderFeedback() {
    const box = ui?.card.querySelector('#gdFeedback');
    if (!box) return;
    const f = run.feedback;
    box.replaceChildren();
    box.dataset.ok = f ? String(f.ok) : '';
    if (!f) return;
    box.append(f.text);
    if (f.canReveal) {
      const b = el('button', {
        class: 'ui-button ow-small',
        type: 'button',
        id: 'gdReveal',
        text: t('gd.reveal'),
      });
      b.addEventListener('click', () => reveal(steps()[run.at]));
      box.append(' ', b);
    }
  }

  function renderProgress() {
    const list = steps();
    ui.progress.replaceChildren(
      ...list.map((s, i) => {
        const b = el('button', {
          type: 'button',
          class: 'ow-guide-jump',
          'aria-current': i === run.at ? 'step' : null,
          'data-state': stateOf(s),
          text: `${words.step(s, 'title')} (${t(`gd.state.${stateOf(s)}`)})`,
        });
        b.addEventListener('click', () => {
          run.at = i;
          run.feedback = null;
          save();
          render();
          focusStep();
        });
        return el('li', {}, b);
      })
    );
  }

  function move(by) {
    run.at = Math.max(0, Math.min(steps().length - 1, run.at + by));
    run.feedback = null;
    save();
    render();
    focusStep();
  }
  function focusStep() {
    ui.card.querySelector('h3')?.focus();
  }
  function finish() {
    const list = steps().filter(s => s.kind !== 'read');
    const done = list.filter(s => stateOf(s) === 'done').length;
    say(true, t('gd.done', { done, of: list.length }));
  }

  // --- Panels of numbers -----------------------------------------------------------

  async function drawShow(step, box) {
    await prepare(step);
    const rows = [];
    const add = (label, value) => rows.push([label, value]);
    const k13 = ADOPTED.kepler13;
    if (step.show === 'crowding') {
      add(t('gd.show.crowdHd'), fmt(ADOPTED.hd209458.crowdsap.value));
      add(
        t('gd.show.crowdK13'),
        fmt(context.pack('kepler13-sap')?.crowding?.crowdsap)
      );
      add(t('gd.show.shareA'), fmt(ANSWERS.targetShare(context)));
    } else if (step.show === 'stellarRadius') {
      const r = ADOPTED.hd209458.stellarRadius;
      add(
        t('gd.show.adoptedRadius'),
        `${fmt(r.value)} ± ${fmt(r.sigma)} R☉ (${r.ref})`
      );
    } else if (step.show === 'depths') {
      const P = periodOf('kepler13');
      for (const target of ['kepler13-sap', 'kepler13-pdcsap']) {
        const d = transitOf(context, target, P)?.depth;
        add(
          t('gd.show.depthOf', { target: words.target(target) }),
          d
            ? t('gd.show.ppm', { value: ppm(d.depth), error: ppm(d.error) })
            : t('gd.show.notOpened')
        );
      }
      add(t('gd.show.period'), `${fmt(P)} d (${k13.period.ref})`);
    } else if (step.show === 'published') {
      for (const p of k13.published)
        add(
          p.ref,
          t('gd.show.published', {
            k: fmt(p.radiusRatio),
            rs: fmt(p.stellarRadius),
            rp: fmt(p.planetRadius),
          })
        );
    } else if (step.show === 'oddEven' || step.show === 'secondary') {
      const r = transitOf(context, step.target, periodOf(step.target));
      if (!r)
        add(
          t('gd.show.depthOf', { target: words.target(step.target) }),
          t('gd.show.notOpened')
        );
      else if (step.show === 'oddEven' && r.oddEven) {
        const oe = r.oddEven;
        add(
          t('gd.show.odd'),
          t('gd.show.ppm', {
            value: ppm(oe.odd.depth),
            error: ppm(oe.odd.error),
          })
        );
        add(
          t('gd.show.even'),
          t('gd.show.ppm', {
            value: ppm(oe.even.depth),
            error: ppm(oe.even.error),
          })
        );
        add(
          t('gd.show.apart'),
          t('gd.show.sigmas', { value: fmt(oe.sigmas), limit: SIGNIFICANT })
        );
      } else if (r.secondary) {
        add(
          t('gd.show.primary'),
          t('gd.show.ppm', {
            value: ppm(r.depth.depth),
            error: ppm(r.depth.error),
          })
        );
        add(
          t('gd.show.secondary'),
          t('gd.show.ppm', {
            value: ppm(r.secondary.depth),
            error: ppm(r.secondary.error),
          })
        );
        add(
          t('gd.show.significance'),
          t('gd.show.sigmas', {
            value: fmt(r.secondary.depth / r.secondary.error),
            limit: SIGNIFICANT,
          })
        );
      }
      if (r) add(t('gd.show.epoch'), `${fmt(r.epoch)} (BTJD)`);
    } else if (step.show === 'count') {
      const r = transitOf(context, 'hd209458', periodOf('hd209458'));
      add(
        t('gd.show.count'),
        r ? String(r.depth.cycles) : t('gd.show.notOpened')
      );
    } else if (step.show === 'simulation') {
      const s = ADOPTED.simulation;
      add(t('gd.show.simStar'), `${fmt(s.stellarRadius)} R☉`);
      add(t('gd.show.simPlanet'), `${fmt(s.planetRadius)} RJ`);
      add(t('gd.show.rsunRjup'), fmt(RSUN_PER_RJUP));
    }
    const dl = el('dl', { class: 'ow-meta' });
    for (const [a, b] of rows)
      dl.append(el('dt', { text: a }), el('dd', { text: b }));
    const parts = [dl];
    if (step.show === 'simulation')
      parts.push(
        el(
          'p',
          {},
          el('a', {
            href: `../#investigation=${encodeURIComponent(ADOPTED.simulation.lesson)}`,
            text: t('gd.show.simLink'),
          })
        )
      );
    parts.push(
      el('p', { class: 'ow-hint', text: t(`gd.show.how.${step.show}`) })
    );
    box.replaceChildren(...parts);
  }

  // --- The page's calls -------------------------------------------------------------

  ui = build();
  const params = new URLSearchParams(location.search);
  const asked = params.get('guide');
  if (asked && GUIDES.some(g => g.id === asked))
    start(asked, params.get('path'));
  else render();
  root.addEventListener('toggle', () => {
    ui.back.hidden = ui.visible || !run.guide || !root.open;
  });

  return {
    /** The workspace changed: remember what is open, and look at the step. */
    async update() {
      const o = ctx.state.source;
      const target = Object.keys(TARGETS).find(
        k => TARGETS[k].observation === o?.id
      );
      if (target && seen.get(target)?.o !== o) remember(target, o);
      if (!run.guide) return;
      const step = steps()[run.at];
      if (step.kind === 'do' && stateOf(step) !== 'done')
        await checkDo(step, { quiet: true });
    },
    rebuild() {
      ui.observer?.disconnect();
      ui.body.remove();
      ui.back.remove();
      ui = build();
      render();
    },
    /** The runner's state, for a test: never changed. */
    snapshot: () => ({
      guide: run.guide?.id ?? null,
      path: run.path,
      at: run.at,
      step: run.guide ? steps()[run.at].id : null,
      record: JSON.parse(JSON.stringify(run.record)),
    }),
  };
}
