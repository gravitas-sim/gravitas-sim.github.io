// =============================================================================
// Evidence and observing in the 3-D lab: the panel
// -----------------------------------------------------------------------------
// Loaded when a reader presses "Evidence and observing", so the lab carries
// none of it at start-up (js/lab3dLab.js openEvidence). Three things, each
// built on a module that has no DOM and is tested alone:
//
//   Keep a measurement   the instrument under the view, or one of the run's
//                        events, becomes an envelope (../evidence.js) and an
//                        entry in the evidence notebook, where the report
//                        cites it and My work lists it
//   Save this system     the system's own numbers, from its start or from the
//                        moment now, to My work (js/myWork/made.js) or a file
//                        that the lab opens as it opens any other
//   What would an        the system observed, from the line of sight of the
//   observer record?     current view or from chosen angles, through the
//                        platform's own forward models (js/forward/system3d.js)
//
// It reaches the lab only through the page's labApi (js/lab3dLab.js): the
// system, the frame the tables show, the instrument choices, the events, and
// the direction the view looks from. It never integrates.
// =============================================================================

import { EN_LAB3DEVIDENCE } from '../../i18n/en.lab3dEvidence.js';
import { parseNumber } from '../../answerParse.js';
import {
  eventEnvelope,
  forwardEnvelope,
  readingEnvelope,
} from '../evidence.js';
import {
  anglesOfSight,
  observeSystem3d,
  stateFromSystem3d,
} from '../../forward/system3d.js';
import { FORWARD_MODELS } from '../../forward/index.js';
import { observationJson } from '../../observatory/export.js';
import { artifactEntry } from '../../notebook/artifactEntry.js';
import { SOURCE } from '../../notebook/entry.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from '../../notebook/store.js';
import { saveMade, system3dRecord } from '../../myWork/made.js';

const CATALOGS = { en: EN_LAB3DEVIDENCE, es: {} };
const loadSpanish = async () => {
  if (!Object.keys(CATALOGS.es).length)
    CATALOGS.es = (
      await import('../../i18n/es.lab3dEvidence.js')
    ).ES_LAB3DEVIDENCE;
};

const MODELS = ['transit', 'radial-velocity'];
const EVENT_KINDS = ['merger', 'closeApproach', 'crossing', 'escape'];
const SVG = 'http://www.w3.org/2000/svg';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c) node.append(c);
  return node;
};
const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const download = (json, name) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob(
      [typeof json === 'string' ? json : JSON.stringify(json, null, 2)],
      {
        type: 'application/json',
      }
    )
  );
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const slug = s =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'system';

/**
 * @param {HTMLElement} root - The section the panel fills
 * @param {object} lab - The page's labApi (js/lab3dLab.js)
 * @returns {{show: Function, hide: Function, loadLanguage: Function}}
 */
export function createEvidencePanel(root, lab) {
  /** A number the reader typed, in the page's language; NaN when it is not one. */
  const typed = input => {
    const r = parseNumber(input.value, lab.language());
    return r.ok ? r.value : NaN;
  };
  /** A pixel position to a tenth, for a path. */
  const tenth = v => Math.round(v * 10) / 10;
  const t = (id, vars) => {
    const entry = CATALOGS[lab.language()]?.[id] ?? CATALOGS.en[id];
    if (entry === undefined) return id;
    return vars
      ? entry.replace(/\{(\w+)\}/g, (w, n) =>
          Object.hasOwn(vars, n) ? String(vars[n]) : w
        )
      : entry;
  };
  const num = (v, sig = 4) =>
    Number.isFinite(v)
      ? new Intl.NumberFormat(lab.language(), {
          maximumSignificantDigits: sig,
        }).format(v)
      : '-';
  const name = i => {
    const b = lab.origin()?.bodies[i];
    return b ? b.name || b.id : '?';
  };
  let observed = null;
  let drawn = false;

  // --- Keeping a measurement -----------------------------------------------
  const keepStatus = el('p', {
    class: 'ui-hint',
    role: 'status',
    id: 'l3e-keep-status',
  });
  const readingText = el('p', { class: 'l3-readout' });
  const keepReading = el('button', {
    type: 'button',
    class: 'ui-button',
    id: 'l3e-keep-reading',
  });
  const eventSelect = el('select', { class: 'ui-select', id: 'l3e-event' });
  const keepEvent = el('button', {
    type: 'button',
    class: 'ui-button',
    id: 'l3e-keep-event',
  });

  /** What the instrument asks for now, in the lab's own terms. */
  function currentReading() {
    const r = lab.reading();
    if (r.tool === 'none') return null;
    const env = readingEnvelope(lab.origin(), lab.exact(), r, r.frame);
    return env && { r, env };
  }

  function titleFor(r) {
    return t(`l3e.title.${r.tool}`, {
      a: name(r.a),
      b: name(r.b),
      v: name(r.v),
      p: name(lab.primaryOf(r.a)),
    });
  }

  function labels() {
    return {
      quantity: q => {
        const id = `l3e.q.${q.id}`;
        return t(id) === id ? (observed?.names?.[q.id] ?? q.id) : t(id);
      },
      note: q =>
        q.origin === 'assumed'
          ? t('l3e.obs.note.assumed')
          : q.origin === 'truth'
            ? t('l3e.obs.note.truth')
            : '',
    };
  }

  function keep(envelope, title) {
    try {
      const entry = artifactEntry({
        source: SOURCE.LAB3D,
        envelope,
        title,
        labels: labels(),
        context: { page: 'lab3d' },
      });
      const loaded = loadNotebook();
      if (!loaded.ok) throw new Error(t('l3e.keep.whyUnavailable'));
      const saved = saveNotebook([...loaded.entries, entry]);
      if (!saved.ok)
        throw new Error(
          saved.reason === 'unavailable'
            ? t('l3e.keep.whyUnavailable')
            : t('l3e.keep.whyFull')
        );
      return true;
    } catch (err) {
      keepStatus.textContent = t('l3e.keep.failed', { why: err.message });
      return false;
    }
  }

  function syncReading() {
    const now = currentReading();
    keepReading.disabled = !now;
    keepReading.textContent = t('l3e.keep.button');
    readingText.textContent = now
      ? t('l3e.keep.reading', { what: titleFor(now.r) })
      : t('l3e.keep.none');
    const events = lab.events().filter(e => EVENT_KINDS.includes(e.kind));
    const labelsNow = events.map(eventLabel);
    // Redrawn only when it changed: a list rebuilt each second would close a
    // dropdown a reader has open.
    const key = `${lab.language()}|${labelsNow.join('|')}`;
    if (eventSelect.dataset.key !== key) {
      eventSelect.dataset.key = key;
      const keepValue = eventSelect.value;
      eventSelect.replaceChildren(
        ...(events.length
          ? labelsNow.map((text, i) => el('option', { value: String(i), text }))
          : [el('option', { value: '', text: t('l3e.keep.eventNone') })])
      );
      if (keepValue && events[Number(keepValue)]) eventSelect.value = keepValue;
    }
    keepEvent.disabled = !events.length;
    keepEvent.textContent = t('l3e.keep.eventButton');
  }

  const idIndex = id => lab.origin().bodies.findIndex(b => b.id === id);
  const eventNames = e => {
    const n = (e.bodies ?? []).map(id => name(idIndex(id)));
    return { a: n[0] ?? '?', b: n[1] ?? '?' };
  };
  const eventLabel = e =>
    `${t(`l3e.title.${e.kind}`, eventNames(e))}, ${num(e.t)}`;

  keepReading.addEventListener('click', () => {
    const now = currentReading();
    if (!now) return;
    keepStatus.textContent = keep(now.env, titleFor(now.r))
      ? t('l3e.keep.kept')
      : keepStatus.textContent;
  });
  keepEvent.addEventListener('click', () => {
    const e = lab.events().filter(x => EVENT_KINDS.includes(x.kind))[
      typed(eventSelect)
    ];
    const env = e && eventEnvelope(lab.origin(), e);
    if (!env) return;
    if (keep(env, t(`l3e.title.${e.kind}`, eventNames(e))))
      keepStatus.textContent = t('l3e.keep.kept');
  });

  // --- Saving the system -------------------------------------------------------
  const nameInput = el('input', {
    class: 'ui-input',
    id: 'l3e-name',
    type: 'text',
    maxlength: '120',
  });
  const when = ['start', 'now'].map(v =>
    el('input', { type: 'radio', name: 'l3e-when', value: v })
  );
  when[0].checked = true;
  const saveStatus = el('p', {
    class: 'ui-hint',
    role: 'status',
    id: 'l3e-save-status',
  });
  const chosenSystem = () =>
    when[1].checked ? lab.now() : (lab.origin() ?? lab.system());
  const saveButton = el('button', {
    type: 'button',
    class: 'ui-button',
    id: 'l3e-save',
  });
  const downloadButton = el('button', {
    type: 'button',
    class: 'ui-button',
    id: 'l3e-download',
  });
  saveButton.addEventListener('click', () => {
    const system = chosenSystem();
    if (!system) {
      saveStatus.textContent = t('l3e.system.tooFew');
      return;
    }
    const record = system3dRecord({
      name: nameInput.value.trim() || t('l3e.system.defaultName'),
      system,
      from: when[1].checked ? 'now' : 'start',
    });
    const out = saveMade(record);
    saveStatus.textContent = out.ok
      ? t('l3e.system.saved')
      : t('l3e.system.failed', { why: out.reason });
  });
  downloadButton.addEventListener('click', () => {
    const system = chosenSystem();
    if (!system) {
      saveStatus.textContent = t('l3e.system.tooFew');
      return;
    }
    download(
      system,
      `${slug(nameInput.value || t('l3e.system.defaultName'))}.system3d.json`
    );
  });

  // --- Observing -----------------------------------------------------------------
  const field = (label, control) =>
    el(
      'div',
      { class: 'ui-field' },
      el('label', { for: control.id, text: label }),
      control
    );
  const modelSelect = el('select', { class: 'ui-select', id: 'l3e-model' });
  const starSelect = el('select', { class: 'ui-select', id: 'l3e-star' });
  const sightView = el('input', {
    type: 'radio',
    name: 'l3e-sight',
    value: 'view',
  });
  const sightAngles = el('input', {
    type: 'radio',
    name: 'l3e-sight',
    value: 'angles',
  });
  sightView.checked = true;
  const sightNow = el('p', { class: 'ui-hint' });
  const incl = el('input', {
    class: 'ui-input',
    id: 'l3e-incl',
    type: 'number',
    min: '0',
    max: '180',
    step: 'any',
    value: '90',
  });
  const azim = el('input', {
    class: 'ui-input',
    id: 'l3e-azim',
    type: 'number',
    min: '0',
    max: '360',
    step: 'any',
    value: '0',
  });
  const teff = el('input', {
    class: 'ui-input',
    id: 'l3e-teff',
    type: 'number',
    min: '1000',
    step: 'any',
    value: '5772',
  });
  const dist = el('input', {
    class: 'ui-input',
    id: 'l3e-dist',
    type: 'number',
    min: '0.001',
    step: 'any',
    value: '10',
  });
  const sizes = el('div', { class: 'ui-toolbar is-fields', id: 'l3e-sizes' });
  const span = el('input', {
    class: 'ui-input',
    id: 'l3e-span',
    type: 'number',
    min: '0',
    step: 'any',
  });
  const count = el('input', {
    class: 'ui-input',
    id: 'l3e-count',
    type: 'number',
    min: '2',
    max: '5000',
    step: '1',
    value: '200',
  });
  const noise = el('input', {
    class: 'ui-input',
    id: 'l3e-noise',
    type: 'number',
    min: '0',
    step: 'any',
    value: '0',
  });
  const noiseLabel = el('label', { for: 'l3e-noise' });
  const go = el('button', {
    type: 'button',
    class: 'ui-button is-primary',
    id: 'l3e-go',
  });
  const obsStatus = el('p', {
    class: 'ui-hint',
    role: 'status',
    id: 'l3e-obs-status',
  });
  const plot = el('div', { id: 'l3e-plot' });
  const truth = el('div', { id: 'l3e-truth' });
  const keepObs = el('button', {
    type: 'button',
    class: 'ui-button',
    id: 'l3e-keep-obs',
    hidden: true,
  });
  const downloadObs = el('button', {
    type: 'button',
    class: 'ui-button',
    id: 'l3e-download-obs',
    hidden: true,
  });

  const sizeInputs = new Map();
  function drawSizes(warnings = []) {
    const need = warnings.filter(
      w => w === 'noStarRadius' || w.startsWith('noRadius:')
    );
    const kept = new Map([...sizeInputs].map(([k, input]) => [k, input.value]));
    sizeInputs.clear();
    sizes.replaceChildren(
      ...need.map(w => {
        const key = w === 'noStarRadius' ? 'star' : w.slice(9);
        const input = el('input', {
          class: 'ui-input',
          id: `l3e-size-${key}`,
          type: 'number',
          min: '0',
          step: 'any',
          value: kept.get(key) ?? '',
        });
        sizeInputs.set(key, input);
        return field(
          key === 'star'
            ? t('l3e.obs.starRadius')
            : t('l3e.obs.planetRadius', { id: key }),
          input
        );
      })
    );
  }

  /** The line of sight the choices describe, as a unit vector. */
  function sightDirection() {
    if (sightAngles.checked) {
      const i = (typed(incl) * Math.PI) / 180;
      const a = (typed(azim) * Math.PI) / 180;
      return [
        Math.sin(i) * Math.cos(a),
        Math.sin(i) * Math.sin(a),
        Math.cos(i),
      ];
    }
    return lab.sightDirection();
  }

  function options() {
    const sizesGiven = {};
    const radiusEarth = {};
    for (const [key, input] of sizeInputs) {
      const v = typed(input);
      if (!(v > 0)) continue;
      if (key === 'star') sizesGiven.radiusSun = v;
      else radiusEarth[key] = v;
    }
    return {
      star: starSelect.value || undefined,
      observer: { direction: sightDirection() },
      starProps: {
        teffK: typed(teff) > 0 ? typed(teff) : undefined,
        distancePc: typed(dist) > 0 ? typed(dist) : undefined,
        ...sizesGiven,
      },
      radiusEarth,
    };
  }

  function draw(observation, model) {
    const x = observation.columns.find(c => c.role === 'x').values;
    const y = observation.columns.find(c => c.role === 'value').values;
    const W = 640;
    const H = 220;
    const m = { l: 56, r: 12, t: 12, b: 34 };
    const lo = Math.min(...y);
    const hi = Math.max(...y);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
    const [y0, y1] = [lo - pad, hi + pad];
    const sx = v =>
      m.l + ((v - x[0]) / (x.at(-1) - x[0] || 1)) * (W - m.l - m.r);
    const sy = v => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const what = t(`l3e.obs.what.${model}`);
    const chart = svg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      class: 'l3e-chart',
      'aria-label': t('l3e.obs.plot', { what, n: y.length }),
    });
    chart.append(
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: 'none' }),
      svg('polyline', {
        points: [...x]
          .map((v, i) => `${tenth(sx(v))},${tenth(sy(y[i]))}`)
          .join(' '),
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.5',
      })
    );
    for (const [v, px, py, anchor] of [
      [y0, m.l - 6, sy(y0), 'end'],
      [y1, m.l - 6, sy(y1), 'end'],
      [x[0], sx(x[0]), H - 12, 'start'],
      [x.at(-1), sx(x.at(-1)), H - 12, 'end'],
    ]) {
      const label = svg('text', {
        x: px,
        y: py,
        'text-anchor': anchor,
        'font-size': '11',
        fill: 'currentColor',
      });
      label.textContent = num(v, 4);
      chart.append(label);
    }
    const rows = [...x]
      .slice(0, 12)
      .map((v, i) =>
        el(
          'tr',
          {},
          el('td', { text: num(v, 6) }),
          el('td', { text: num(y[i], 6) })
        )
      );
    plot.replaceChildren(
      chart,
      el(
        'details',
        { class: 'ui-disclosure' },
        el('summary', { text: t('l3e.obs.table') }),
        el(
          'div',
          {
            class: 'ui-table-wrap',
            tabindex: '0',
            role: 'region',
            'aria-label': t('l3e.obs.table'),
          },
          el(
            'table',
            { class: 'ui-table is-numeric' },
            el(
              'thead',
              {},
              el(
                'tr',
                {},
                el('th', { scope: 'col', text: t('l3e.obs.col.time') }),
                el('th', { scope: 'col', text: t('l3e.obs.col.value') })
              )
            ),
            el('tbody', {}, ...rows)
          )
        )
      )
    );
  }

  function observe() {
    const system = lab.origin();
    const model = modelSelect.value;
    const o = options();
    // Radii the lab's system lacks are asked for by name before a transit.
    const bridge = stateFromSystem3d(system, o);
    if (!bridge.ok) return refuse(bridge);
    drawSizes(model === 'transit' ? bridge.warnings : []);
    const duration = typed(span);
    const epochs = Math.round(typed(count));
    if (!(duration > 0) || !(epochs >= 2))
      return refuse({ code: 'setup', why: t('l3e.obs.span') });
    const sigma = Math.max(0, typed(noise) || 0);
    const setup = {
      format: 'gravitas.observing-setup',
      formatVersion: 1,
      seed: 'lab3d',
      epochs: { kind: 'regular', unit: 'd', start: 0, duration, count: epochs },
      noise:
        sigma > 0
          ? model === 'transit'
            ? { white: { sigma: sigma * 1e-6, unit: '' } }
            : { white: { sigma, unit: 'm/s' } }
          : {},
      instrument: { kind: model === 'transit' ? 'photometer' : 'spectrograph' },
    };
    let got;
    try {
      got = observeSystem3d(system, model, setup, o);
    } catch (err) {
      return refuse({ code: 'setup', why: err.message });
    }
    if (!got.ok) return refuse(got);
    const { observation } = got;
    const a = got.bridge.observer;
    observed = {
      model,
      setup,
      got,
      names: Object.fromEntries(
        observation.synthetic.truth.parameters.map(p => [p.id, p.name])
      ),
    };
    obsStatus.textContent =
      t('l3e.obs.done', {
        n: epochs,
        incl: num(a.inclinationDeg, 4),
        az: num(a.positionAngleDeg, 4),
      }) +
      ' ' +
      got.bridge.warnings
        .filter(w => !w.startsWith('no'))
        .map(w => {
          const [code, id] = w.split(':');
          return t(`l3e.obs.warn.${code}`, { id });
        })
        .join(' ');
    draw(observation, model);
    truth.replaceChildren(
      el('h4', { text: t('l3e.obs.truth') }),
      el(
        'ul',
        {},
        ...observation.synthetic.truth.parameters.map(p =>
          el('li', {
            text: `${p.name}: ${num(p.value, 6)}${p.unit ? ` ${p.unit}` : ''}`,
          })
        )
      )
    );
    keepObs.hidden = false;
    downloadObs.hidden = false;
  }

  function refuse(r) {
    observed = null;
    plot.replaceChildren();
    truth.replaceChildren();
    keepObs.hidden = true;
    downloadObs.hidden = true;
    const known = [
      'needsScale',
      'noStar',
      'massless',
      'badObserver',
      'noPlanet',
      'needsRadii',
      'eccentricTransit',
    ];
    obsStatus.textContent = known.includes(r.code)
      ? t(`l3e.obs.refused.${r.code}`)
      : r.code === 'setup'
        ? t('l3e.obs.refused.setup', { why: r.why })
        : t('l3e.obs.refused.other', { code: r.code });
  }

  go.addEventListener('click', observe);
  keepObs.addEventListener('click', () => {
    if (!observed) return;
    const { model, setup, got } = observed;
    const envelope = forwardEnvelope(lab.origin(), got.observation, {
      observer: got.bridge.observer,
      setup,
      warnings: got.bridge.warnings,
      model,
      version: FORWARD_MODELS[model].VERSION,
    });
    if (
      keep(
        envelope,
        t('l3e.title.forward', { model: t(`l3e.obs.model.${model}`) })
      )
    )
      obsStatus.textContent = t('l3e.obs.kept');
  });
  downloadObs.addEventListener('click', () => {
    if (!observed) return;
    const o = observed.got.observation;
    download(
      observationJson(o, { source: o, changes: [] }),
      `${slug(`${lab.originId()}-${observed.model}`)}.observation.json`
    );
  });

  // --- Layout ----------------------------------------------------------------------
  const closeButton = el('button', {
    type: 'button',
    class: 'ui-button is-small',
    id: 'l3e-close',
  });
  closeButton.addEventListener('click', () => hide());

  function build() {
    const sightRow = (input, text) =>
      el('label', { class: 'ui-choice' }, input, ' ', el('span', { text }));
    root.replaceChildren(
      el('h2', { id: 'l3e-h', text: t('l3e.heading'), tabindex: '-1' }),
      el('p', { text: t('l3e.intro') }),
      el('h3', { text: t('l3e.keep.heading') }),
      readingText,
      keepReading,
      field(t('l3e.keep.event'), eventSelect),
      keepEvent,
      keepStatus,
      el('h3', { text: t('l3e.system.heading') }),
      field(t('l3e.system.name'), nameInput),
      el(
        'div',
        { class: 'ui-toolbar' },
        sightRow(when[0], t('l3e.system.start')),
        sightRow(when[1], t('l3e.system.now'))
      ),
      el(
        'div',
        { class: 'ui-toolbar' },
        saveButton,
        downloadButton,
        el('a', {
          class: 'ui-button',
          href: '/my-work/',
          text: t('l3e.system.open'),
        })
      ),
      el('p', { class: 'ui-hint', text: t('l3e.system.note') }),
      saveStatus,
      el('h3', { text: t('l3e.obs.heading') }),
      el('p', { text: t('l3e.obs.intro') }),
      el(
        'div',
        { class: 'ui-toolbar is-fields' },
        field(t('l3e.obs.model'), modelSelect),
        field(t('l3e.obs.star'), starSelect)
      ),
      el(
        'fieldset',
        { class: 'is-compact' },
        el('legend', { text: t('l3e.obs.sight') }),
        sightRow(sightView, t('l3e.obs.sight.view')),
        sightNow,
        sightRow(sightAngles, t('l3e.obs.sight.angles')),
        el(
          'div',
          { class: 'ui-toolbar is-fields' },
          field(t('l3e.obs.inclination'), incl),
          field(t('l3e.obs.azimuth'), azim)
        )
      ),
      el(
        'div',
        { class: 'ui-toolbar is-fields' },
        field(t('l3e.obs.teff'), teff),
        field(t('l3e.obs.distance'), dist)
      ),
      sizes,
      el(
        'div',
        { class: 'ui-toolbar is-fields' },
        field(t('l3e.obs.span'), span),
        field(t('l3e.obs.count'), count),
        el('div', { class: 'ui-field' }, noiseLabel, noise)
      ),
      go,
      obsStatus,
      plot,
      truth,
      el('div', { class: 'ui-toolbar' }, keepObs, downloadObs),
      closeButton
    );
    go.textContent = t('l3e.obs.go');
    keepObs.textContent = t('l3e.obs.keep');
    downloadObs.textContent = t('l3e.obs.download');
    saveButton.textContent = t('l3e.system.save');
    downloadButton.textContent = t('l3e.system.download');
    closeButton.textContent = t('l3e.close');
    nameInput.placeholder = t('l3e.system.defaultName');
  }

  /** Fill the choices that depend on the system and the language. */
  function fill() {
    const model = modelSelect.value || MODELS[0];
    modelSelect.replaceChildren(
      ...MODELS.map(m =>
        el('option', { value: m, text: t(`l3e.obs.model.${m}`) })
      )
    );
    modelSelect.value = model;
    noiseLabel.textContent = t(`l3e.obs.noise.${modelSelect.value}`);
    const system = lab.origin();
    const keepStar = starSelect.value;
    starSelect.replaceChildren(
      ...(system?.bodies ?? []).map(b =>
        el('option', { value: b.id, text: b.name || b.id })
      )
    );
    const heaviest = (system?.bodies ?? []).reduce(
      (best, b) => (b.m > best.m ? b : best),
      { m: -1 }
    );
    starSelect.value = keepStar || heaviest.id || '';
    refreshSight();
    syncReading();
  }

  function refreshSight() {
    const a = anglesOfSight(lab.sightDirection());
    sightNow.textContent = t('l3e.obs.sight.now', {
      incl: num(a.inclinationDeg, 4),
      az: num(a.positionAngleDeg, 4),
    });
  }

  modelSelect.addEventListener('change', () => {
    noiseLabel.textContent = t(`l3e.obs.noise.${modelSelect.value}`);
  });
  sightView.addEventListener('change', fill);
  sightAngles.addEventListener('change', fill);
  starSelect.addEventListener('change', () => drawSizes());

  /** The default time span: two and a bit of the shortest period. */
  function defaultSpan() {
    const b = stateFromSystem3d(lab.origin(), options());
    if (!b.ok) return 10;
    const shortest = Math.min(...b.state.planets.map(p => p.periodDays));
    return Math.round(shortest * 2.2 * 1000) / 1000;
  }

  // The instrument's own controls belong to the page, so the panel listens to
  // them, and looks again each second for what the run adds (events) and for
  // where the view now looks from.
  const WATCHED = ['l3-tool', 'l3-a', 'l3-b', 'l3-v'];
  const onControl = () => syncReading();
  let timer = null;
  let unsubscribe = null;
  function show() {
    root.hidden = false;
    if (!drawn) {
      build();
      drawn = true;
      fill();
      span.value = String(defaultSpan());
    }
    unsubscribe ??= lab.onChange(syncReading);
    for (const id of WATCHED)
      document.getElementById(id)?.addEventListener('change', onControl);
    timer ??= setInterval(() => {
      refreshSight();
      syncReading();
    }, 1000);
    root.querySelector('#l3e-h')?.focus();
  }
  function hide() {
    root.hidden = true;
    unsubscribe?.();
    unsubscribe = null;
    for (const id of WATCHED)
      document.getElementById(id)?.removeEventListener('change', onControl);
    clearInterval(timer);
    timer = null;
    document.getElementById('l3-evidence')?.focus();
  }
  return {
    show,
    hide,
    /** The catalog of a language, before the page switches to it. */
    async loadLanguage(lang) {
      if (lang === 'es') await loadSpanish();
    },
    /** The page switched: the words are redrawn, what was typed is kept. */
    redraw() {
      if (!drawn) return;
      const saved = { name: nameInput.value, span: span.value };
      build();
      fill();
      nameInput.value = saved.name;
      span.value = saved.span;
    },
  };
}
