// =============================================================================
// What the detector misses: completeness by injection (Prompt 184, INJECTION.md)
// -----------------------------------------------------------------------------
// Sources of chosen magnitudes are added to a copy of the image, through the
// width of a star the reader gives (or measures from the image), the same source
// finder looks again, and the share it finds by magnitude is drawn as a curve with
// its table, saved as CSV and kept in the ledger as a fit-result record. The
// arithmetic is js/measure/inject.js over js/measure/detect.js; this is the page
// around it.
//   width   a box, or Measure it from this image (the stars of the detection tool)
//   range   both magnitudes, or both empty (signal to noise 12 down to 2.5)
//   run     one trial at a time, so Stop works and the page stays alive
// A frame whose pixels are not a measure of light, or not in electrons, refuses in
// words. A curve says what it was measured under and that it is not the chance of
// detection for any other width or sky. Nothing here takes a key: every control is
// a button, a box or a disclosure. Loaded when the panel first opens; it reaches
// js/observatory/imageMarks.js (the frames and the contract's `permits`) by
// import() so no chunk is shared with it.
// =============================================================================

import { adapt } from '../measure/photometry.js';
import {
  DEFAULTS as DETECT,
  detectIn,
  measurePsf,
  selectStars,
} from '../measure/detect.js';
import {
  DEFAULTS,
  LIMITS,
  csvRows,
  curveOf,
  quantitiesOf,
  reductionOf,
  start,
  step,
} from '../measure/inject.js';
import { toCsv, num } from '../csv.js';
import { roundSig } from '../format.js';
import { sha256Hex } from '../hash.js';

const WORDS = {
  en: () => import('../i18n/en.imageInject.js').then(m => m.EN_IMAGEINJECT),
  es: () => import('../i18n/es.imageInject.js').then(m => m.ES_IMAGEINJECT),
};
const have = new Set();
const words = async ctx => {
  const id = ctx.language();
  if (have.has(id) || !WORDS[id]) return;
  ctx.registerMessages({ [id]: await WORDS[id]() });
  have.add(id);
};

const CSV_COLS = ['id', 'x', 'y', 'm', 'flux', 'found', 'fx', 'fy'];

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const digestOf = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );
const settle = () => new Promise(r => setTimeout(r, 0));

/**
 * Mount the tool in `box`, once for the page's life.
 * @param {HTMLElement} box
 * @param {{t: Function, number: Function, language: Function, registerMessages: Function,
 *   createPlot: Function, state: {view: object}}} ctx
 * @returns {Promise<{update: () => void}>}
 */
export async function mountInject(box, ctx) {
  await words(ctx);
  const { framesOf, permits } = await import('./imageMarks.js');
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
  const input = (value, min, step = 'any', max) =>
    el('input', {
      type: 'number',
      step,
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
      value,
      className: 'ui-input',
    });

  const fwhmIn = input(DETECT.fwhm, LIMITS.fwhm[0], 'any', LIMITS.fwhm[1]);
  const brightIn = input('', undefined);
  const faintIn = input('', undefined);
  word(brightIn, 'obs.inj.auto', 'placeholder');
  word(faintIn, 'obs.inj.auto', 'placeholder');
  const countIn = input(DEFAULTS.count, 1, 1, LIMITS.countPerTrial);
  const trialsIn = input(DEFAULTS.trials, 1, 1, LIMITS.trials);
  const seedIn = el('input', {
    type: 'text',
    value: '1',
    className: 'ui-input',
  });
  const binIn = input(DEFAULTS.binWidth, 0.01);
  const settings = el(
    'details',
    { className: 'ui-disclosure' },
    word(el('summary'), 'obs.inj.settings'),
    el('div', { className: 'im-tools' }, field('obs.inj.bin', binIn)),
    word(el('p', { className: 'ui-hint' }), 'obs.inj.settingsNote')
  );
  const out = el('div', { className: 'ph-readout' });
  const table = el('div', { className: 'im-tablewrap' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ow-plot');
  svg.setAttribute('role', 'img');
  svg.hidden = true;
  const plot = ctx.createPlot(svg, {
    number: ctx.number,
    labels: { notStated: t('obs.unit.notStated') },
  });
  const psfBtn = button('obs.inj.measure', () => doPsf());
  const runBtn = button('obs.inj.run', () => doRun());
  const stopBtn = button('obs.inj.stop', () => {
    stopped = true;
  });
  const csvBtn = button('obs.inj.csv', () => doCsv());
  const keepBtn = button('obs.inj.keep', () => doKeep());
  box.replaceChildren(
    live,
    word(el('p', { className: 'ui-hint' }), 'obs.inj.help'),
    refusal,
    el(
      'div',
      { className: 'im-tools' },
      field('obs.inj.psf', fwhmIn),
      psfBtn,
      field('obs.inj.bright', brightIn),
      field('obs.inj.faint', faintIn),
      field('obs.inj.count', countIn),
      field('obs.inj.trials', trialsIn),
      field('obs.inj.seed', seedIn)
    ),
    settings,
    el('div', { className: 'im-tools' }, runBtn, stopBtn, csvBtn, keepBtn),
    out,
    svg,
    table,
    word(el('p', { className: 'ui-hint' }), 'obs.inj.limits')
  );

  // ---- the frame and its contract ---------------------------------------------------
  let cur = null;
  let result = null;
  let psfSource = 'entered';
  let running = false;
  let stopped = false;
  fwhmIn.addEventListener('input', () => {
    psfSource = 'entered';
  });
  const why = r =>
    t(`obs.inj.no.${r.code}`, {
      missing: (r.missing ?? []).join(', '),
      name: r.name,
      unit: r.unit,
      bytes: r.bytes,
      limit: r.limit,
      allowed: fmt(r.allowed, 3),
    });
  const refresh = () => {
    const o = ctx.state.view;
    if (o?.kind !== 'image') return (cur = null);
    if (cur?.o === o) return cur;
    const [frame] = framesOf(o);
    cur = { o, frame, a: adapt(frame, permits) };
    result = null;
    for (const n of [out, table]) n.replaceChildren();
    svg.hidden = true;
    return cur;
  };
  function update() {
    const c = refresh();
    refusal.hidden = !c || c.a.ok;
    if (c && !c.a.ok) refusal.textContent = why(c.a);
    for (const b of [psfBtn, runBtn]) b.disabled = !c?.a.ok || running;
    stopBtn.disabled = !running;
    csvBtn.disabled = !result || running;
    keepBtn.disabled = !result || running;
  }

  // ---- the width of the stars, from the image --------------------------------------------
  async function doPsf() {
    const c = refresh();
    if (!c?.a.ok || running) return;
    say(t('obs.inj.measuring'));
    await settle();
    const det = detectIn(c.a, { fwhm: fwhmIn.valueAsNumber });
    const r = det.ok
      ? measurePsf(c.a, det, selectStars(det), { model: 'gaussian' })
      : det;
    if (!r.ok) return say(det.ok ? t('obs.inj.psfFail') : why(det));
    fwhmIn.value = String(roundSig(r.fwhm.mean, 4));
    psfSource = 'measured';
    say(t('obs.inj.psfDone', { fwhm: fmt(r.fwhm.mean, 4), n: r.stars.length }));
  }

  // ---- a run ------------------------------------------------------------------------------
  async function doRun() {
    const c = refresh();
    if (!c?.a.ok || running) return;
    const lo = brightIn.value.trim();
    const hi = faintIn.value.trim();
    if ((lo === '') !== (hi === '')) {
      refusal.hidden = false;
      refusal.textContent = t('obs.inj.no.range');
      return say(t('obs.inj.no.range'));
    }
    const spec = {
      seed: seedIn.value.trim() || '1',
      count: countIn.valueAsNumber,
      trials: trialsIn.valueAsNumber,
      fwhm: fwhmIn.valueAsNumber,
      psfSource,
      binWidth: binIn.valueAsNumber,
      ...(lo === ''
        ? {}
        : {
            magnitude: {
              min: Number(lo.replace(',', '.')),
              max: Number(hi.replace(',', '.')),
            },
          }),
    };
    result = null;
    out.replaceChildren();
    table.replaceChildren();
    svg.hidden = true;
    const r = start(c.a, spec);
    if (!r.ok) {
      refusal.hidden = false;
      refusal.textContent = why(r);
      update();
      return say(why(r));
    }
    refusal.hidden = true;
    running = true;
    stopped = false;
    update();
    const trials = [];
    for (let k = 0; k < r.spec.trials && !stopped; k++) {
      say(t('obs.inj.progress', { t: k + 1, n: r.spec.trials }));
      await settle();
      const s = step(r, k);
      if (!s.ok) {
        running = false;
        refusal.hidden = false;
        refusal.textContent = why(s);
        update();
        return say(why(s));
      }
      trials.push(s);
    }
    running = false;
    if (!trials.length) return update();
    const curve = curveOf(trials, r.spec);
    result = { ...r, trials, curve };
    brightIn.value = String(roundSig(r.spec.magnitude.min, 4));
    faintIn.value = String(roundSig(r.spec.magnitude.max, 4));
    renderResult();
    update();
    say(
      stopped
        ? t('obs.inj.said.stopped', { t: trials.length })
        : curve.m50.m === null
          ? t('obs.inj.said.doneNoHalf', {
              injected: curve.injected,
              recovered: curve.recovered,
            })
          : t('obs.inj.said.done', {
              injected: curve.injected,
              recovered: curve.recovered,
              m: fmt(curve.m50.m, 3),
            })
    );
  }

  /** "Half are found at magnitude m (between lo and hi)", or the reason there is no such magnitude. */
  const crossingLine = (id, c, level) =>
    c.m === null
      ? t(`${id}.never`)
      : c.lo !== null && c.hi !== null
        ? t(id, {
            m: fmt(c.m, 3),
            lo: fmt(Math.min(c.lo, c.m), 3),
            hi: fmt(Math.max(c.hi, c.m), 3),
            level: fmt(100 * level, 4),
          })
        : t(`${id}.open`, { m: fmt(c.m, 3) });
  function renderResult() {
    if (!result) return;
    const { curve, conditions, trials } = result;
    const line = x => el('p', { textContent: x });
    out.replaceChildren(
      line(
        t('obs.inj.result', {
          injected: curve.injected,
          trials: trials.length,
          recovered: curve.recovered,
        })
      ),
      line(crossingLine('obs.inj.m50', curve.m50, curve.level)),
      line(crossingLine('obs.inj.m90', curve.m90, curve.level)),
      line(t('obs.inj.extra', { x: fmt(curve.extraPerTrial, 3) })),
      ...(curve.unplaced
        ? [line(t('obs.inj.unplaced', { n: curve.unplaced }))]
        : []),
      el('p', {
        className: 'ui-hint',
        textContent: t('obs.inj.conditions', {
          fwhm: fmt(conditions.psf.fwhm, 4),
          source: t(`obs.inj.source.${conditions.psf.source}`),
          noise: fmt(conditions.noise, 3),
          sigma: fmt(conditions.detection.sigma, 3),
          area: conditions.detection.minArea,
        }),
      })
    );
    const live = curve.bins.filter(b => b.n);
    const o = {
      kind: 'time-series',
      columns: [
        {
          id: 'm',
          name: t('obs.inj.axis.m'),
          unit: 'mag',
          role: 'x',
          values: live.map(b => b.center),
        },
        {
          id: 'p',
          name: t('obs.inj.axis.p'),
          unit: '',
          role: 'value',
          values: live.map(b => b.p),
        },
      ],
      axes: { x: 'm', y: 'p' },
      masks: [],
    };
    svg.hidden = false;
    plot.draw(o, {
      xColumn: 'm',
      yColumn: 'p',
      overlays: [
        {
          label: t('obs.inj.lower'),
          points: live.map(b => [b.center, b.interval.lo]),
        },
        {
          label: t('obs.inj.upper'),
          points: live.map(b => [b.center, b.interval.hi]),
        },
      ],
    });
    svg.setAttribute('aria-label', t('obs.inj.plot'));
    const cell = (tag, text, extra = {}) =>
      el(tag, { textContent: text, ...extra });
    table.replaceChildren(
      el(
        'table',
        { className: 'im-table' },
        cell('caption', t('obs.inj.table')),
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            ...['range', 'n', 'k', 'p', 'lo', 'hi'].map(k =>
              cell('th', t(`obs.inj.col.${k}`), { scope: 'col' })
            )
          )
        ),
        el(
          'tbody',
          {},
          ...live.map(b =>
            el(
              'tr',
              {},
              cell('th', `${fmt(b.lo, 4)} – ${fmt(b.hi, 4)}`, { scope: 'row' }),
              ...[
                String(b.n),
                String(b.k),
                fmt(b.p, 3),
                fmt(b.interval.lo, 3),
                fmt(b.interval.hi, 3),
              ].map(v => cell('td', v))
            )
          )
        )
      )
    );
  }

  // ---- the lists, and the ledger ---------------------------------------------------------------
  function doCsv() {
    if (!result) return;
    const rows = csvRows(
      result.trials,
      CSV_COLS.map(k => t(`obs.inj.csvCol.${k}`)),
      num
    );
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
    );
    const a = el('a', { href: url, download: `${cur.o.id}-injection.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say(t('obs.inj.said.csv', { n: rows.length - 1 }));
  }
  async function doKeep() {
    if (!result || !cur) return;
    try {
      const { frame, o } = cur;
      const [{ artifact }, { artifactEntry }, { SOURCE }, nb] =
        await Promise.all([
          import('../platform/artifact.js'),
          import('../notebook/artifactEntry.js'),
          import('../notebook/entry.js'),
          import('../notebook/store.js'),
        ]);
      const d = await digestOf(frame);
      const bins = result.curve.bins;
      const envelope = artifact({
        id: `injection-${o.id}`.slice(0, 120),
        source: { kind: 'observation', id: o.id, digest: d },
        quantities: quantitiesOf(result.curve),
        provenance: { reductions: [reductionOf(frame, d, result)] },
        made: { app: 'gravitas', tool: 'image-injection' },
      });
      const entry = artifactEntry({
        source: SOURCE.IMAGE_INJECTION,
        envelope,
        title: t('obs.inj.ledgerEntry', { title: o.id }),
        labels: {
          quantity: q => {
            const [, kind, i] = q.id.split('.');
            return kind === 'bin'
              ? t('obs.inj.q.bin', {
                  lo: fmt(bins[Number(i)].lo, 4),
                  hi: fmt(bins[Number(i)].hi, 4),
                })
              : t(`obs.inj.q.${kind}`);
          },
        },
        context: { page: 'observatory', observation: { id: o.id } },
      });
      const loaded = nb.load();
      if (!loaded.ok) throw new Error(loaded.reason);
      const saved = nb.save([...loaded.entries, entry]);
      if (!saved.ok) throw new Error(saved.reason);
      say(t('obs.inj.said.kept'));
    } catch (err) {
      say(t('obs.inj.said.keepFailed', { why: err.message }));
    }
  }

  // ---- words, and the page's language ---------------------------------------------------------
  function label() {
    for (const [n, id, prop] of labelled) n[prop] = t(id);
    if (cur && !cur.a.ok) refusal.textContent = why(cur.a);
    renderResult();
  }
  new MutationObserver(async () => {
    await words(ctx);
    label();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
  label();
  update();
  return { update };
}
