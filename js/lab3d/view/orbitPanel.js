// =============================================================================
// The orbit editor and the sky view in the 3-D lab: the panel
// -----------------------------------------------------------------------------
// Loaded when a reader presses "Orbit editor and sky view" (js/lab3dLab.js
// openOrbit) or a guide asks for it, so the lab carries none of it at
// start-up. Four instruments, on the running system, none of them a new
// renderer:
//
//   Orbit            a body's six elements about its primary, read through
//                    the orbital layer (js/orbital/layer.js: typed quantities,
//                    with the frame, the epoch and its time scale named, and a
//                    refusal when two of them do not mean the same thing), and
//                    edited: change one, press Apply, and the run goes on from
//                    this instant on the new orbit (instruments.js
//                    editElements, which only that body and what orbits it
//                    ever move). Uncertainties are shown when a fit supplies
//                    them (none of the lab's systems carries one yet)
//   Sky              the observer's view of an orbit: its apparent ellipse,
//                    where the body is now on the sky and in depth, and the
//                    transit chord, drawn from numbers and listed in a table
//   Between orbits   the angle between two orbits' planes, each from its
//                    elements in the reference plane chosen
//   Resonant pair    the resonant argument of two bodies about one primary,
//                    and the range it has covered while this panel watched
//
// It reaches the lab only through the page's labApi. It never integrates.
// =============================================================================

import { EN_LAB3DORBIT } from '../../i18n/en.lab3dOrbit.js';
import { roundSig, withUncertainty as formatted } from '../../format.js';
import { typedNumber } from '../../answerParse.js';
import {
  OrbitalLayerError,
  PHYSICAL_UNITS,
  degrees,
  dimensionless,
  gm,
  instant,
  keplerElements,
  elementsToState,
  length,
  makeState,
  simulationUnits,
  stateToElements,
  vector,
} from '../../orbital/layer.js';
import {
  apparentEllipse,
  skyExtent,
  between,
  editElements,
  elementsAbout,
  hierarchy,
  planeAxes,
  resonantArgument,
  skyPoint,
  transitOf,
} from './instruments.js';

const CATALOGS = { en: EN_LAB3DORBIT, es: {} };
const SVG = 'http://www.w3.org/2000/svg';
const DEG = Math.PI / 180;
const FIELDS = ['a', 'e', 'i', 'Omega', 'omega', 'M'];

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

/**
 * A value, with its standard uncertainty when one is supplied: `1.2345 ± 0.0012`.
 * Both are rounded to the digits the uncertainty makes meaningful (two
 * significant figures of it); with none, to five significant figures.
 */
export function withUncertainty(value, sigma) {
  if (!(sigma > 0)) return String(roundSig(value, 5));
  return formatted(value, sigma, { sig: 2, locale: 'en' });
}

/** The orbital layer's units and time scale for a system, named. */
export function unitsOf(system, G) {
  return system.units === 'solar'
    ? { units: PHYSICAL_UNITS['AU-day'], scale: 'elapsed', name: 'AU, day' }
    : {
        units: simulationUnits(G, 'code'),
        scale: 'code',
        name: 'code units, G = 1',
      };
}

/**
 * A body's elements about its primary through the orbital layer: the state
 * (relative to the primary, in the reference plane's axes) typed with its
 * frame, epoch and time scale, then read back as elements. Angles in degrees.
 */
export function layerElements(system, f, i, p, G, t) {
  const { units, scale } = unitsOf(system, G);
  const rel = [0, 1, 2].map(c => f.x[3 * i + c] - f.x[3 * p + c]);
  const relv = [0, 1, 2].map(c => f.v[3 * i + c] - f.v[3 * p + c]);
  const state = makeState({
    r: vector(rel, 'length', units),
    v: vector(relv, 'speed', units),
    frame: 'primary-reference',
    epoch: instant(t, units, scale),
  });
  const mu = gm(G * (f.m[i] + f.m[p]), units);
  const e = stateToElements(state, mu);
  return {
    a: e.a.value,
    e: e.e.value,
    i: e.i.value / DEG,
    Omega: e.Omega.value / DEG,
    omega: e.omega.value / DEG,
    M: e.anomaly.value.value / DEG,
    period:
      e.e.value < 1 ? 2 * Math.PI * Math.sqrt(e.a.value ** 3 / mu.value) : null,
    epoch: state.epoch,
    units,
    scale,
  };
}

/**
 * The same edit through the layer: elements typed and checked, turned into a
 * state at their epoch. Used to prove, in the tests, that the panel's typed
 * path and the kernel's own agree to the bit.
 */
export function layerState(system, G, el, t, mu) {
  const { units, scale } = unitsOf(system, G);
  const typed = keplerElements({
    dimension: 3,
    a: length(el.a, units),
    e: dimensionless(el.e),
    i: degrees(el.i),
    Omega: degrees(el.Omega),
    omega: degrees(el.omega),
    anomaly: { type: 'mean', value: degrees(el.M) },
    epoch: instant(t, units, scale),
    mu: gm(mu, units),
  });
  return elementsToState(typed);
}

/**
 * @param {HTMLElement} root - The page's orbit section (#l3-orbit-panel)
 * @param {object} lab - The page's labApi
 */
export function createOrbitPanel(root, lab) {
  const tr = (id, vars) => {
    const entry = CATALOGS[lab.language()]?.[id] ?? CATALOGS.en[id];
    if (entry === undefined) return id;
    return vars
      ? entry.replace(/\{(\w+)\}/g, (w, n) =>
          Object.hasOwn(vars, n) ? String(vars[n]) : w
        )
      : entry;
  };
  const fmt = v =>
    !Number.isFinite(v)
      ? '—'
      : lab.language() === 'es'
        ? String(roundSig(v, 5)).replace('.', ',')
        : String(roundSig(v, 5));
  const deg = v => `${fmt(v)}°`;

  const ui = { body: 0, other: 0, resBody: [1, 2], loaded: false };
  let uncertainty = null;
  const seen = { lo: Infinity, hi: -Infinity };

  const system = () => lab.exactSystem();
  const names = () => lab.read().ids;
  const orbiting = f => {
    const h = hierarchy(f);
    return names()
      .map((id, i) => [i, id])
      .filter(([i]) => h.primary[i] >= 0 && f.alive[i]);
  };

  function build() {
    root.hidden = false;
    root.replaceChildren(
      el('h2', { id: 'l3o-h', tabindex: '-1', text: tr('o.heading') }),
      el('p', { class: 'ui-note', text: tr('o.intro') }),
      el(
        'fieldset',
        { class: 'is-compact' },
        el('legend', { text: tr('o.orbit') }),
        el(
          'div',
          { class: 'ui-field' },
          el('label', { for: 'l3o-body', text: tr('o.body') }),
          el('select', { id: 'l3o-body', class: 'ui-select' })
        ),
        el('p', { id: 'l3o-frame', class: 'ui-note' }),
        el('div', { id: 'l3o-fields', class: 'ui-toolbar is-fields' }),
        el(
          'p',
          {},
          el('button', {
            id: 'l3o-load',
            type: 'button',
            class: 'ui-button',
            text: tr('o.load'),
          }),
          ' ',
          el('button', {
            id: 'l3o-apply',
            type: 'button',
            class: 'ui-button is-primary',
            text: tr('o.apply'),
          })
        ),
        el('p', {
          id: 'l3o-say',
          class: 'ui-note',
          role: 'status',
          'aria-live': 'polite',
        })
      ),
      el(
        'fieldset',
        { class: 'is-compact' },
        el('legend', { text: tr('o.sky') }),
        el(
          'div',
          { class: 'ui-toolbar is-fields' },
          el(
            'div',
            { class: 'ui-field' },
            el('label', { for: 'l3o-az', text: tr('o.az') }),
            el('input', {
              id: 'l3o-az',
              class: 'ui-input',
              type: 'number',
              step: 'any',
              value: String(lab.observer().az),
            })
          ),
          el(
            'div',
            { class: 'ui-field' },
            el('label', { for: 'l3o-el', text: tr('o.el') }),
            el('input', {
              id: 'l3o-el',
              class: 'ui-input',
              type: 'number',
              step: 'any',
              value: String(lab.observer().el),
            })
          )
        ),
        el(
          'p',
          {},
          el('button', {
            id: 'l3o-setobs',
            type: 'button',
            class: 'ui-button',
            text: tr('o.setObserver'),
          }),
          ' ',
          el('button', {
            id: 'l3o-observe',
            type: 'button',
            class: 'ui-button',
            text: tr('o.observe'),
          })
        ),
        el('div', { id: 'l3o-figures', class: 'l3o-figures' }),
        el(
          'div',
          {
            class: 'ui-table-wrap',
            tabindex: '0',
            role: 'region',
            'aria-label': tr('o.skyTable'),
          },
          el('table', { id: 'l3o-sky', class: 'ui-table is-numeric' })
        )
      ),
      el(
        'fieldset',
        { class: 'is-compact' },
        el('legend', { text: tr('o.pair') }),
        el(
          'div',
          { class: 'ui-field' },
          el('label', { for: 'l3o-other', text: tr('o.other') }),
          el('select', { id: 'l3o-other', class: 'ui-select' })
        ),
        el('p', { id: 'l3o-between', class: 'l3-readout' })
      ),
      el(
        'fieldset',
        { class: 'is-compact' },
        el('legend', { text: tr('o.resonance') }),
        el(
          'div',
          { class: 'ui-toolbar is-fields' },
          el(
            'div',
            { class: 'ui-field' },
            el('label', { for: 'l3o-res-in', text: tr('o.resIn') }),
            el('select', { id: 'l3o-res-in', class: 'ui-select' })
          ),
          el(
            'div',
            { class: 'ui-field' },
            el('label', { for: 'l3o-res-out', text: tr('o.resOut') }),
            el('select', { id: 'l3o-res-out', class: 'ui-select' })
          ),
          el(
            'div',
            { class: 'ui-field' },
            el('label', { for: 'l3o-res-j', text: tr('o.resJ') }),
            el('input', {
              id: 'l3o-res-j',
              class: 'ui-input',
              type: 'number',
              min: '2',
              max: '6',
              step: '1',
              value: '2',
            })
          )
        ),
        el('p', { id: 'l3o-res', class: 'l3-readout' }),
        el('button', {
          id: 'l3o-res-reset',
          type: 'button',
          class: 'ui-button',
          text: tr('o.resReset'),
        })
      )
    );
    const f = system();
    if (f) fillSelects(f);
    wire();
    ui.loaded = true;
    update();
  }

  function fillSelects(f) {
    const list = orbiting(f);
    const fill = (id, items, value) => {
      const sel = root.querySelector(`#${id}`);
      if (!sel) return;
      sel.replaceChildren(
        ...items.map(([v, label]) =>
          el('option', { value: String(v), 'data-i': String(v), text: label })
        )
      );
      if (items.some(([v]) => String(v) === String(value)))
        sel.value = String(value);
    };
    const all = names().map((id, i) => [i, id]);
    fill('l3o-body', list, ui.body);
    fill('l3o-other', list, ui.other);
    fill('l3o-res-in', all, ui.resBody[0]);
    fill('l3o-res-out', all, ui.resBody[1]);
    const first = list[0]?.[0] ?? 0;
    if (!list.some(([i]) => i === ui.body)) ui.body = first;
    const second = list.find(([i]) => i !== ui.body)?.[0] ?? ui.body;
    if (!list.some(([i]) => i === ui.other)) ui.other = second;
    root.querySelector('#l3o-body').value = String(ui.body);
    root.querySelector('#l3o-other').value = String(ui.other);
  }

  // --- The orbit ----------------------------------------------------------------

  /** The lab's numbers as the plane shows them, and the primary of body i. */
  function readOrbit(i) {
    const f = lab.exact();
    if (!f) return null;
    const p = hierarchy(f).primary[i];
    if (p < 0 || !f.alive[i]) return null;
    return { f, p, el: layerElements(lab.origin(), f, i, p, lab.G(), f.t) };
  }

  function drawFields() {
    const box = root.querySelector('#l3o-fields');
    const o = readOrbit(ui.body);
    const frame = root.querySelector('#l3o-frame');
    if (!o) {
      frame.textContent = tr('o.noPrimary');
      box.replaceChildren();
      return;
    }
    const { name, scale } = unitsOf(lab.origin(), lab.G());
    frame.textContent = tr('o.frame', {
      body: names()[ui.body],
      primary: names()[o.p],
      plane: tr(`o.plane.${lab.plane()}`),
      t: fmt(o.el.epoch.value),
      scale: tr(`o.scale.${scale}`),
      units: name,
    });
    const unit = { a: lab.origin().units === 'solar' ? 'AU' : tr('o.code') };
    const labels = {
      a: tr('o.a', { unit: unit.a }),
      e: tr('o.e'),
      i: tr('o.i'),
      Omega: tr('o.Omega'),
      omega: tr('o.omega'),
      M: tr('o.M'),
    };
    if (!box.children.length) {
      box.replaceChildren(
        ...FIELDS.map(k =>
          el(
            'div',
            { class: 'ui-field' },
            el('label', { for: `l3o-f-${k}`, text: labels[k] }),
            el('input', {
              id: `l3o-f-${k}`,
              class: 'ui-input',
              type: 'number',
              step: 'any',
              'data-k': k,
            })
          )
        ),
        el('p', { id: 'l3o-period', class: 'l3-readout' })
      );
      load(o.el);
    } else
      for (const k of FIELDS)
        box.querySelector(`label[for="l3o-f-${k}"]`).textContent = labels[k];
    // The readout beside the fields: the elements as they are now, with ± when
    // a fit gave them.
    const sig = uncertainty?.[names()[ui.body]] ?? {};
    const shown = FIELDS.map(
      k =>
        `${k === 'Omega' ? 'Ω' : k === 'omega' ? 'ω' : k} = ${withUncertainty(o.el[k], sig[k])}`
    ).join(', ');
    box.querySelector('#l3o-period').textContent =
      `${tr('o.now')} ${shown}${o.el.period ? `; ${tr('o.period')} ${fmt(o.el.period)}` : ''}`;
  }

  function load(e) {
    for (const k of FIELDS) {
      const input = root.querySelector(`#l3o-f-${k}`);
      if (input) input.value = String(roundSig(e[k], 10));
    }
  }

  const say = text => {
    const out = root.querySelector('#l3o-say');
    if (out) out.textContent = text;
  };

  async function apply() {
    const o = readOrbit(ui.body);
    if (!o) return say(tr('o.noPrimary'));
    const edits = {};
    for (const k of FIELDS) {
      const input = root.querySelector(`#l3o-f-${k}`);
      const typed = typedNumber(input.value, lab.language());
      if (input.value.trim() === '' || !Number.isFinite(typed))
        return say(tr('o.notNumber', { field: k }));
      // Only what the reader changed: a field left alone keeps its bits.
      if (typed !== roundSig(o.el[k], 10)) edits[k] = typed;
    }
    if (!Object.keys(edits).length) return say(tr('o.unchanged'));
    const R = lab.axes();
    let next;
    try {
      next = editElements(lab.now(), ui.body, edits, lab.G(), R);
    } catch (err) {
      return say(
        tr(`o.refused.${err.code}`) !== `o.refused.${err.code}`
          ? tr(`o.refused.${err.code}`)
          : tr('o.refused', { why: err.code })
      );
    }
    await lab.replace(next);
    ui.loaded = false;
    say(tr('o.applied', { body: names()[ui.body] }));
    root.querySelector('#l3o-fields').replaceChildren();
    update();
  }

  // --- The sky --------------------------------------------------------------------

  function drawSky() {
    const o = readOrbit(ui.body);
    const figures = root.querySelector('#l3o-figures');
    const table = root.querySelector('#l3o-sky');
    if (!o || !(o.el.e < 1)) {
      figures.replaceChildren(
        el('p', { class: 'ui-note', text: tr('o.noSky') })
      );
      table.replaceChildren();
      return;
    }
    const f = lab.exactSystem();
    const sys = lab.origin();
    const axes = planeAxes('sky', f, {
      units: sys.units,
      observer: lab.observer(),
    });
    // The elements of the orbit in the system's own axes, which the sky axes
    // are given in.
    const own = elementsAbout(f, ui.body, o.p, lab.G());
    const el0 = {
      a: own.a,
      e: own.e,
      i: own.i,
      Omega: own.Omega,
      omega: own.omega,
    };
    const ell = apparentEllipse(el0, axes);
    const rs = sys.bodies[o.p].radius ?? 0;
    const rp = sys.bodies[ui.body].radius ?? 0;
    const transit =
      rs + rp > 0 ? transitOf(el0, axes, { star: rs, planet: rp }) : null;
    const pts = [];
    for (let k = 0; k < 180; k++)
      pts.push(skyPoint(el0, axes, (2 * Math.PI * k) / 180));
    const here = [0, 1, 2].map(c => f.x[3 * ui.body + c] - f.x[3 * o.p + c]);
    const now = {
      u: axes[0][0] * here[0] + axes[0][1] * here[1] + axes[0][2] * here[2],
      w: axes[1][0] * here[0] + axes[1][1] * here[1] + axes[1][2] * here[2],
      depth: axes[2][0] * here[0] + axes[2][1] * here[1] + axes[2][2] * here[2],
    };
    const ext =
      Math.max(...pts.flatMap(p => [Math.abs(p.u), Math.abs(p.w)])) * 1.1 || 1;
    const orbit = svg('svg', {
      viewBox: `${-ext} ${-ext} ${2 * ext} ${2 * ext}`,
      role: 'img',
      'aria-label': tr('o.skyLabel', {
        body: names()[ui.body],
        primary: names()[o.p],
      }),
      class: 'l3o-sky',
    });
    // Up on the page is +w: the SVG's y runs down, so draw -w.
    const line = (d, dash) =>
      svg('path', {
        d,
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': ext / 150,
        ...(dash
          ? { 'stroke-dasharray': `${ext / 40} ${ext / 60}`, opacity: '0.55' }
          : {}),
      });
    // Near and far halves as separate runs, so the far half is dashed.
    const runs = (select, dash) => {
      let d = '';
      let on = false;
      for (let k = 0; k <= 180; k++) {
        const p = pts[k % 180];
        const ok = select(p);
        if (ok) {
          d += `${on ? 'L' : 'M'}${p.u} ${-p.w} `;
          on = true;
        } else on = false;
      }
      return d.trim() ? line(d, dash) : null;
    };
    const star = svg('circle', {
      cx: 0,
      cy: 0,
      r: Math.max(rs, ext / 60),
      fill: 'currentColor',
    });
    const body = svg('circle', {
      cx: now.u,
      cy: -now.w,
      r: Math.max(rp, ext / 90),
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': ext / 100,
    });
    orbit.append(
      ...[
        runs(p => p.depth > 0, false),
        runs(p => p.depth <= 0, true),
        star,
        body,
      ].filter(Boolean)
    );
    const blocks = [orbit];
    if (transit && rs > 0) {
      const w = (rs + rp) * 1.6;
      const chord = svg('svg', {
        viewBox: `${-w} ${-w} ${2 * w} ${2 * w}`,
        role: 'img',
        'aria-label': tr('o.chordLabel'),
        class: 'l3o-sky',
      });
      const half = Math.sqrt(Math.max(0, w * w - transit.impact ** 2));
      chord.append(
        svg('circle', {
          cx: 0,
          cy: 0,
          r: rs,
          fill: 'currentColor',
          opacity: '0.35',
        }),
        svg('line', {
          x1: -half,
          y1: -transit.impact,
          x2: half,
          y2: -transit.impact,
          stroke: 'currentColor',
          'stroke-width': w / 120,
          'stroke-dasharray': `${w / 25} ${w / 40}`,
        }),
        svg('circle', {
          cx: 0,
          cy: -transit.impact,
          r: Math.max(rp, w / 60),
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': w / 90,
        })
      );
      blocks.push(chord);
    }
    figures.replaceChildren(...blocks);
    const rows = [
      ['o.t.major', fmt(ell.major)],
      ['o.t.minor', fmt(ell.minor)],
      ['o.t.ratio', fmt(ell.minor / ell.major)],
      ['o.t.angle', deg(ell.angle / DEG)],
      ['o.t.top', fmt(skyExtent(el0, axes).w[1])],
      ['o.t.sep', fmt(Math.hypot(now.u, now.w))],
      ['o.t.depth', fmt(now.depth)],
      ['o.t.nearer', now.depth > 0 ? names()[ui.body] : names()[o.p]],
    ];
    if (transit) {
      rows.push(
        ['o.t.impact', fmt(transit.impact)],
        ['o.t.impactR', rs > 0 ? fmt(transit.impact / rs) : '—'],
        ['o.t.transits', tr(transit.transits ? 'o.yes' : 'o.no')],
        ['o.t.chord', transit.transits ? fmt(transit.chordHalf) : '—']
      );
    } else rows.push(['o.t.points', tr('o.noRadii')]);
    table.replaceChildren(
      el('caption', { text: tr('o.skyTable') }),
      ...rows.map(([k, v]) =>
        el(
          'tr',
          {},
          el('th', { scope: 'row', text: tr(k) }),
          el('td', { text: v })
        )
      )
    );
  }

  // --- Between two orbits and the resonant pair -------------------------------------

  function drawPair() {
    const f = lab.exact();
    const out = root.querySelector('#l3o-between');
    if (!f) return;
    const r = between(f, ui.body, ui.other, lab.G());
    out.textContent =
      ui.body === ui.other || !r
        ? tr('o.pairNone')
        : tr('o.pairRead', {
            a: names()[ui.body],
            b: names()[ui.other],
            angle: deg(r.angle / DEG),
            ia: deg(r.inclinations[0] / DEG),
            ib: deg(r.inclinations[1] / DEG),
            plane: tr(`o.plane.${lab.plane()}`),
          });
  }

  function drawResonance() {
    const f = lab.exact();
    const out = root.querySelector('#l3o-res');
    if (!f) return;
    const [i, o] = ui.resBody;
    const p = hierarchy(f).primary[i];
    const j = typedNumber(root.querySelector('#l3o-res-j').value) || 2;
    const phi =
      i !== o && p >= 0 && hierarchy(f).primary[o] === p
        ? resonantArgument(f, i, o, p, lab.G(), { j })
        : null;
    if (phi === null) {
      out.textContent = tr('o.resNone');
      return;
    }
    seen.lo = Math.min(seen.lo, phi);
    seen.hi = Math.max(seen.hi, phi);
    out.textContent = tr('o.resRead', {
      j,
      jm: j - 1,
      phi: fmt(phi),
      lo: fmt(seen.lo),
      hi: fmt(seen.hi),
      kind: tr(
        seen.hi - seen.lo < 2 * Math.PI - 0.5 ? 'o.librating' : 'o.circulating'
      ),
    });
  }

  // --- Wiring -----------------------------------------------------------------------

  function update() {
    if (root.hidden || !ui.loaded) return;
    drawFields();
    drawSky();
    drawPair();
    drawResonance();
  }

  /** The body index a select's chosen option carries. */
  const chosen = sel => parseInt(sel.selectedOptions[0]?.dataset.i ?? '0', 10);

  function wire() {
    const $ = id => root.querySelector(`#${id}`);
    $('l3o-body').addEventListener('change', e => {
      ui.body = chosen(e.target);
      $('l3o-fields').replaceChildren();
      update();
    });
    $('l3o-other').addEventListener('change', e => {
      ui.other = chosen(e.target);
      update();
    });
    for (const [id, k] of [
      ['l3o-res-in', 0],
      ['l3o-res-out', 1],
    ])
      $(id).addEventListener('change', e => {
        ui.resBody[k] = chosen(e.target);
        seen.lo = Infinity;
        seen.hi = -Infinity;
        update();
      });
    $('l3o-res-j').addEventListener('change', () => {
      seen.lo = Infinity;
      seen.hi = -Infinity;
      update();
    });
    $('l3o-res-reset').addEventListener('click', () => {
      seen.lo = Infinity;
      seen.hi = -Infinity;
      update();
    });
    $('l3o-load').addEventListener('click', () => {
      const o = readOrbit(ui.body);
      if (o) load(o.el);
      say(tr('o.loaded'));
    });
    $('l3o-apply').addEventListener('click', apply);
    $('l3o-setobs').addEventListener('click', () => {
      lab.setObserver($('l3o-az').value, $('l3o-el').value);
      say(tr('o.observerSet'));
      update();
    });
    $('l3o-observe').addEventListener('click', () => {
      lab.setObserver($('l3o-az').value, $('l3o-el').value);
      lab.set('plane', 'sky');
      say(tr('o.observing'));
    });
  }

  lab.onChange(() => update());

  return {
    show() {
      build();
      root.querySelector('#l3o-h').focus();
    },
    redraw() {
      if (!root.hidden && ui.loaded) build();
    },
    async loadLanguage(lang) {
      if (lang === 'es' && !Object.keys(CATALOGS.es).length)
        CATALOGS.es = (
          await import('../../i18n/es.lab3dOrbit.js')
        ).ES_LAB3DORBIT;
    },
    /** Supply fitted uncertainties, {bodyId: {a: sigma, ...}}, to show beside the elements. */
    setUncertainty(u) {
      uncertainty = u;
      update();
    },
  };
}

export { OrbitalLayerError };
