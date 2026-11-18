// =============================================================================
// Figures drawn from the model's own numbers
// -----------------------------------------------------------------------------
// A step declares `figure: {from: 'orbit' | 'transit', params, lengthUnit?, withhold?}`
// (js/lesson/figureSpec.js) and this module, loaded by dynamic import only when
// a step does, returns the SVG, its text alternative and its caption from the
// same numbers. Pure: no DOM, no engine, no stored field.
//
// Nothing here repeats a closed form. An orbit's foci, apsides, semi-major
// axis and eccentricity come from orbitGeometry (js/orbitGeometry.js), asked
// about the recorded state, or about the state the lesson's constants imply
// (the body at periapsis at the speed vis-viva gives it); a transit's sky
// separation comes from the observer geometry (js/observerGeometry.js). What
// is drawn on top of those is scaling and labels.
//
// Every number a drawn shape stands for is on that shape as a data attribute,
// at full precision, so tests/modelFigures.test.js can read the picture and
// compare it with values derived from the integrator's state.
//
// The words say what is modelled, what is schematic and that this is an
// illustration. `withhold` removes a quantity from the words (a step whose
// task is to find it); a shape cannot be hidden, so the author chooses.
// =============================================================================

import { orbitGeometry } from './orbitGeometry.js';
import {
  geometryFor,
  lineOfSightDepth,
  projectPositionToSky,
} from './observerGeometry.js';
import { formatNumber, NBSP } from './format.js';
import { getLocale } from './i18n/index.js';
import { escapeHtml as esc } from './lessonMarkup.js';
import { FIGURES, shownQuantities } from './lesson/figureSpec.js';

const { Math } = globalThis;
const W = 320;
const H = 240;
const full = v => String(Number(v.toPrecision(15)));

const WORDS = {
  en: {
    orbit:
      'Schematic of an orbit drawn from the model: an ellipse with the primary at one focus, the other focus empty, and the nearest and farthest points marked on the long axis.',
    transit:
      'Schematic of a transit drawn from the model: a large disc for the star and a small disc for the planet at three moments on a straight path across it, first contact, middle and last contact.',
    names: {
      a: 'semi-major axis',
      e: 'eccentricity',
      periapsis: 'periapsis distance',
      apoapsis: 'apoapsis distance',
      focalSeparation: 'distance between the foci',
      k: 'radius ratio (planet over star)',
      b: 'impact parameter',
      contactLength: 'first to last contact',
      innerLength: 'second to third contact',
    },
    scene: 'Lengths are in scene units.',
    stellar: 'Lengths are in stellar radii.',
    state: 'Drawn from the state the scene held at one moment.',
    consts: 'Drawn from the lesson’s own constants.',
    orbitNote:
      'Modelled: the ellipse the body would follow if only its primary pulled. Schematic: the dots are not to scale.',
    transitNote:
      'Modelled: two discs and the impact parameter shown. Schematic: the path across the star is drawn straight.',
    big: 'The planet’s disc is enlarged to stay visible.',
    ill: 'An illustration of the model, not a measurement.',
    marks: [
      'periapsis',
      'apoapsis',
      'primary at a focus',
      'empty focus',
      'first contact',
      'middle',
      'last contact',
      'b',
    ],
  },
  es: {
    orbit:
      'Esquema de una órbita dibujado desde el modelo: una elipse con el astro principal en un foco, el otro foco vacío y los puntos más cercano y más lejano marcados en el eje mayor.',
    transit:
      'Esquema de un tránsito dibujado desde el modelo: un disco grande para la estrella y uno pequeño para el planeta en tres momentos de una trayectoria recta, primer contacto, mitad y último contacto.',
    names: {
      a: 'semieje mayor',
      e: 'excentricidad',
      periapsis: 'distancia al periastro',
      apoapsis: 'distancia al apoastro',
      focalSeparation: 'distancia entre los focos',
      k: 'cociente de radios (planeta entre estrella)',
      b: 'parámetro de impacto',
      contactLength: 'del primer al último contacto',
      innerLength: 'del segundo al tercer contacto',
    },
    scene: 'Las longitudes están en unidades de la escena.',
    stellar: 'Las longitudes están en radios estelares.',
    state: 'Dibujado desde el estado que tenía la escena en un instante.',
    consts: 'Dibujado desde las constantes de la propia lección.',
    orbitNote:
      'Modelado: la elipse que seguiría el cuerpo si solo tirara de él su astro principal. Esquemático: los puntos no están a escala.',
    transitNote:
      'Modelado: dos discos y el parámetro de impacto indicado. Esquemático: la trayectoria sobre la estrella se dibuja recta.',
    big: 'El disco del planeta está agrandado para que se vea.',
    ill: 'Una ilustración del modelo, no una medición.',
    marks: [
      'periastro',
      'apoastro',
      'astro principal en un foco',
      'foco vacío',
      'primer contacto',
      'mitad',
      'último contacto',
      'b',
    ],
  },
};

const STYLE =
  '<style>.mf-c{fill:none;stroke:var(--accent);stroke-width:1.5}.mf-f{fill:var(--accent);stroke:var(--accent)}' +
  '.mf-d{fill:none;stroke:var(--text-muted);stroke-width:1;stroke-dasharray:4 3}' +
  '.mf-o{fill:none;stroke:var(--text-primary);stroke-width:1.5}.mf-s{fill:var(--text-primary);stroke:var(--text-primary)}' +
  '.mf-t{fill:var(--text-primary);font:11px/1 system-ui,sans-serif;stroke:var(--surface-1);stroke-width:3px;paint-order:stroke}' +
  '.mf-d2{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5}</style>';

const wrap = (alt, body) =>
  `<svg style="display:block;width:100%;max-width:30rem;height:auto;margin:0 auto" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(alt)}" xmlns="http://www.w3.org/2000/svg">${STYLE}${body}</svg>`;

/** The two-body state a figure draws, as the engine's own record would hold it. */
function orbitState(p) {
  if (p.state) return p.state;
  const { a, e } = p;
  const w = ((p.omegaDeg || 0) * Math.PI) / 180;
  const rp = a * (1 - e);
  const vp = Math.sqrt((1 + e) / rp);
  return {
    G: 1,
    primary: { x: 0, y: 0, vx: 0, vy: 0, m: 1 },
    body: {
      x: rp * Math.cos(w),
      y: rp * Math.sin(w),
      vx: -vp * Math.sin(w),
      vy: vp * Math.cos(w),
      m: 0,
    },
  };
}

/** The orbit's numbers and marker positions, from orbitGeometry. */
function orbitValues(p) {
  const s = orbitState(p);
  const mk = (o, kind) => ({
    kind,
    mass: o.m,
    pos: { x: o.x, y: o.y },
    vel: { x: o.vx, y: o.vy },
  });
  const primary = mk(s.primary, 'StarObject');
  const g = orbitGeometry(mk(s.body, 'Planet'), [primary], {
    gravitational_constant: s.G,
    mutual_gravity: !!s.mutual,
    star_only_gravity: false,
    bh_behavior: 'Orbiting',
    softening: 0,
    mondA0: 0,
    haloAt: null,
  });
  if (!g.ok) return null;
  return {
    a: g.a,
    e: g.e,
    periapsis: g.a * (1 - g.e),
    apoapsis: g.a * (1 + g.e),
    focalSeparation: 2 * g.a * g.e,
    omega: g.omega,
    at: {
      focus: g.foci['focus-primary'],
      empty: g.foci['focus-empty'],
      periapsis: g.apsides.periapsis,
      apoapsis: g.apsides.apoapsis,
    },
  };
}

/** A label's width in viewBox units: 11 px system type, generously. */
const textWidth = t => t.length * 6.3 + 2;

function drawOrbit(v, w) {
  const bAxis = v.a * Math.sqrt(1 - v.e * v.e);
  const c = Math.cos(v.omega);
  const s = Math.sin(v.omega);
  const hx = Math.hypot(v.a * c, bAxis * s);
  const hy = Math.hypot(v.a * s, bAxis * c);
  const k0 = Math.min((W / 2 - 40) / hx, (H / 2 - 34) / hy);
  const mid = {
    x: (v.at.periapsis.x + v.at.apoapsis.x) / 2,
    y: (v.at.periapsis.y + v.at.apoapsis.y) / 2,
  };
  const out = c >= 0 ? 1 : -1;
  const m = w.marks;
  const round = v.e < 0.03;
  // Where each label goes at scale k: apsides along the axis, away from the
  // body; the two foci's labels below and above, anchored toward the middle.
  const labelsAt = (k, flip) => {
    const px = p => W / 2 + k * (p.x - mid.x);
    const py = p => H / 2 - k * (p.y - mid.y);
    const focus = (p, text, dy) => {
      const dx = px(p) - W / 2;
      const near = Math.abs(dx) < 40;
      return {
        text,
        x: px(p) + (near ? 0 : dx > 0 ? -8 : 8),
        y: py(p) + dy,
        anchor: near ? 'middle' : dx > 0 ? 'end' : 'start',
      };
    };
    return [
      {
        text: m[0],
        x: px(v.at.periapsis) + out * 12,
        y: py(v.at.periapsis) + 4,
        anchor: out > 0 ? 'start' : 'end',
      },
      {
        text: m[1],
        x: px(v.at.apoapsis) - out * 12,
        y: py(v.at.apoapsis) + 4,
        anchor: out > 0 ? 'end' : 'start',
      },
      focus(v.at.focus, m[2], flip ? -13 : 21),
      ...(round ? [] : [focus(v.at.empty, m[3], flip ? 21 : -13)]),
    ];
  };
  const span = l => {
    const wd = textWidth(l.text);
    const x0 =
      l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - wd : l.x - wd / 2;
    return [x0, x0 + wd];
  };
  const box = l => {
    const [x0, x1] = span(l);
    return [x0, l.y - 12, x1, l.y + 4];
  };
  /** Which side the focus labels go (false: primary below), or null if no side fits at k. */
  const fits = k => {
    for (const flip of [false, true]) {
      const ls = labelsAt(k, flip).map(box);
      const inside = ls.every(
        ([x0, y0, x1, y1]) => x0 >= 3 && x1 <= W - 3 && y0 >= 1 && y1 <= H - 1
      );
      const clear = ls.every((a, i) =>
        ls.every(
          (b, j) =>
            j <= i ||
            a[2] <= b[0] ||
            b[2] <= a[0] ||
            a[3] <= b[1] ||
            b[3] <= a[1]
        )
      );
      if (inside && clear) return flip;
    }
    return null;
  };
  // Shrink the ellipse until every label fits the box and clears the others, down to a floor.
  let k = k0;
  let flip;
  while ((flip = fits(k)) === null && k > 0.3 * k0) k *= 0.97;
  const px = p => W / 2 + k * (p.x - mid.x);
  const py = p => H / 2 - k * (p.y - mid.y);
  const q = p => `cx="${px(p).toFixed(1)}" cy="${py(p).toFixed(1)}"`;
  const data = (p, name, d) =>
    `data-q="${name}" data-x="${full(p.x)}" data-y="${full(p.y)}" data-value="${full(d)}"`;
  // A label that still overruns the box (the floor) is pushed back inside.
  const label = l => {
    const [x0, x1] = span(l);
    const shift = x0 < 3 ? 3 - x0 : x1 > W - 3 ? W - 3 - x1 : 0;
    return `<text class="mf-t" x="${(l.x + shift).toFixed(1)}" y="${Math.min(H - 3, Math.max(11, l.y)).toFixed(1)}" text-anchor="${l.anchor}">${esc(l.text)}</text>`;
  };
  return (
    `<ellipse class="mf-c" cx="${W / 2}" cy="${H / 2}" rx="${(k * v.a).toFixed(1)}" ry="${(k * bAxis).toFixed(1)}" transform="rotate(${((-v.omega * 180) / Math.PI).toFixed(3)} ${W / 2} ${H / 2})" data-q="ellipse" data-a="${full(v.a)}" data-e="${full(v.e)}"/>` +
    `<line class="mf-d" x1="${px(v.at.periapsis).toFixed(1)}" y1="${py(v.at.periapsis).toFixed(1)}" x2="${px(v.at.apoapsis).toFixed(1)}" y2="${py(v.at.apoapsis).toFixed(1)}"/>` +
    `<rect class="mf-s" x="${(px(v.at.periapsis) - 4).toFixed(1)}" y="${(py(v.at.periapsis) - 4).toFixed(1)}" width="8" height="8" ${data(v.at.periapsis, 'periapsis', v.periapsis)}/>` +
    `<path class="mf-s" d="M${px(v.at.apoapsis).toFixed(1)} ${(py(v.at.apoapsis) - 5.5).toFixed(1)}l5.5 5.5-5.5 5.5-5.5-5.5z" ${data(v.at.apoapsis, 'apoapsis', v.apoapsis)}/>` +
    (round
      ? ''
      : `<circle class="mf-o" ${q(v.at.empty)} r="4" ${data(v.at.empty, 'empty-focus', v.focalSeparation)}/>`) +
    `<circle class="mf-f" ${q(v.at.focus)} r="5" ${data(v.at.focus, 'focus', 0)}/>` +
    labelsAt(k, flip === true)
      .map(label)
      .join('')
  );
}

/** The transit's numbers: constants, or the sky separation of a recorded state. */
function transitValues(p) {
  let k = p.k;
  let b = p.b;
  if (p.state) {
    const { star, planet, observer } = p.state;
    k = planet.r / star.r;
    const rel = { x: planet.x - star.x, y: planet.y - star.y };
    const geo = geometryFor(observer.phiDeg, observer.incDeg);
    // Behind the star, or a body with no size: there is no transit to draw.
    if (!(star.r > 0 && planet.r > 0) || lineOfSightDepth(rel, geo) <= 0)
      return null;
    const sky = projectPositionToSky(rel, geo);
    b = Math.hypot(sky.x, sky.y) / star.r;
  }
  const half = q => (q > 0 ? 2 * Math.sqrt(q) : null);
  return {
    k,
    b,
    contactLength: half((1 + k) ** 2 - b * b),
    innerLength: half((1 - k) ** 2 - b * b),
  };
}

const transitScale = v =>
  Math.min((W / 2 - 24) / (1 + v.k), (H / 2 - 18) / Math.max(1, v.b + v.k));

function drawTransit(v, w) {
  const R = transitScale(v);
  const cx = W / 2;
  const cy = H / 2 + 4;
  const y = cy - v.b * R;
  const rp = Math.max(v.k * R, 3);
  const xc = Math.sqrt(Math.max(0, (1 + v.k) ** 2 - v.b ** 2)) * R;
  const xi = v.innerLength ? (v.innerLength / 2) * R : 0;
  const m = w.marks;
  const ly = y - rp - 7 >= 16 ? y - rp - 7 : y + rp + 14;
  const f = n => n.toFixed(1);
  const disc = (x, cls, extra = '') =>
    `<circle class="${cls}" cx="${f(cx + x)}" cy="${f(y)}" r="${f(rp)}"${extra}/>`;
  return (
    `<circle class="mf-d2" cx="${cx}" cy="${f(cy)}" r="${f(R)}" data-q="star" data-value="1"/>` +
    `<line class="mf-d" x1="${f(cx - xc - 14)}" y1="${f(y)}" x2="${f(cx + xc + 14)}" y2="${f(y)}" data-q="path" data-value="${full(v.contactLength)}"/>` +
    (xi
      ? `<line class="mf-o" x1="${f(cx - xi)}" y1="${f(y)}" x2="${f(cx + xi)}" y2="${f(y)}" data-q="inner" data-value="${full(v.innerLength)}"/>`
      : '') +
    `<line class="mf-d" x1="${cx}" y1="${f(cy)}" x2="${cx}" y2="${f(y)}" data-q="impact" data-value="${full(v.b)}"/>` +
    disc(-xc, 'mf-c') +
    disc(xc, 'mf-c') +
    disc(0, 'mf-f', ` data-q="planet" data-value="${full(v.k)}"`) +
    `<text class="mf-t" x="${f(cx - xc)}" y="${f(ly)}" text-anchor="middle">${esc(m[4])}</text>` +
    `<text class="mf-t" x="${cx}" y="${f(ly)}" text-anchor="middle">${esc(m[5])}</text>` +
    `<text class="mf-t" x="${f(cx + xc)}" y="${f(ly)}" text-anchor="middle">${esc(m[6])}</text>` +
    (v.b > 0.15
      ? `<text class="mf-t" x="${cx - 5}" y="${f((cy + y) / 2 + 4)}" text-anchor="end">${esc(m[7])}</text>`
      : '')
  );
}

/**
 * One figure: its SVG, text alternative and caption, from the same numbers.
 *
 * A figure with a `withhold` ships no numeric data attributes (they would
 * hand over what the step asks for); `opts.keepData` keeps them for the tests.
 *
 * @param {Object} f - A step's `figure` declaration
 * @param {string} [locale] - 'en' or 'es'; the page's when omitted
 * @param {{keepData?: boolean}} [opts]
 * @returns {{ok: true, svg: string, alt: string, numbers: string, caption: string, values: Object}|{ok: false, reason: string}}
 */
export function figureFor(f, locale = getLocale(), opts = {}) {
  const w = WORDS[locale] || WORDS.en;
  const spec = FIGURES[f?.from];
  if (!spec || !f.params) return { ok: false, reason: 'figure' };
  const p = f.params;
  const v = f.from === 'orbit' ? orbitValues(p) : transitValues(p);
  if (!v || (f.from === 'transit' && !(v.b >= 0 && v.b < 1 + v.k)))
    return { ok: false, reason: 'state' };
  const stellar = f.from === 'transit';
  const unit = f.lengthUnit ? `${NBSP}${f.lengthUnit}` : '';
  const shown = shownQuantities(f, v);
  const fmt = q =>
    formatNumber(v[q], { sig: 3, locale }) + (stellar || q === 'e' ? '' : unit);
  const words = shown
    .map(q => `${w.names[q]} ${fmt(q)}`)
    .join('; ')
    .replace(/^./, c => c.toUpperCase());
  const lengths = stellar ? w.stellar : f.lengthUnit ? '' : w.scene;
  const alt = `${w[f.from]}${words ? ` ${words}.` : ''} ${lengths}`.trim();
  let drawn = stellar ? drawTransit(v, w) : drawOrbit(v, w);
  if (f.withhold?.length && !opts.keepData)
    drawn = drawn.replace(/ data-(?:q|x|y|value|a|e)="[^"]*"/g, '');
  const small = stellar && v.k * transitScale(v) < 3;
  return {
    ok: true,
    svg: wrap(alt, drawn),
    alt,
    numbers: `${words}${words ? '. ' : ''}${lengths}`.trim(),
    caption: `${stellar ? w.transitNote : w.orbitNote} ${small ? `${w.big} ` : ''}${p.state ? w.state : w.consts} ${w.ill}`,
    values: v,
  };
}

/**
 * Draw a step's figure under its body text, once its module has loaded.
 * Draws nothing if the text it was to follow is gone from the page, or if
 * this step's figure is already there (two renders while the import was
 * pending).
 *
 * @param {Element} at - The step panel's `.inv-step-body`
 * @param {Object} step - The step, with its `sid` and `figure`
 * @param {string} [locale] - The page's when omitted
 */
export function fill(at, step, locale) {
  if (
    !at.isConnected ||
    at.nextElementSibling?.dataset.modelFigure === step.sid
  )
    return;
  const r = figureFor(step.figure, locale);
  if (!r.ok) return;
  const el = document.createElement('figure');
  el.className = 'inv-figure';
  el.dataset.modelFigure = step.sid;
  el.innerHTML =
    `${r.svg}<figcaption><span class="inv-figure-caption">${esc(r.caption)}</span>` +
    `<span class="inv-figure-caption inv-figure-readout">${esc(r.numbers)}</span></figcaption>`;
  at.after(el);
}
