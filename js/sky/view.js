// =============================================================================
// The Sky Lab's two drawings: the horizon view and the equatorial map
// -----------------------------------------------------------------------------
// Hand-written SVG, no canvas and no WebGL (SKY_LAB_GATE.md: the renderer
// slice). The horizon view is an azimuthal equidistant projection with the
// zenith at the centre, north up and east to the left (the sky seen looking
// up); every object is one group moved by one transform write per frame, and
// the table beside it is redrawn only when the sky settles. The equatorial map
// is right ascension against declination, redrawn when settled. Both read the
// same model from js/kernels/sky/sky.js as the table does, so the drawing and
// the list cannot disagree.
//
// The drawing's own stylesheet is inside each SVG, so an exported file looks
// as it does on the page.
// =============================================================================

import { colourOfTemperature } from '../kernels/sky/stars.js';
import { round } from './fmt.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 470;
const CX = 500;
const CY = 500;
const EQ_W = 1000;
const EQ_H = 500;
const DEG = Math.PI / 180;

/** Styles carried inside each SVG. Colours are fixed: this is a night sky. */
export const SVG_STYLE = `
.dome{fill:#0d1b3a;stroke:#9fb1d8;stroke-width:2}
.ring{stroke:#6f82ad;stroke-width:1;fill:none;stroke-dasharray:6 6}
.horizonline{stroke:#ffb35c;fill:none;stroke-width:2}
.ecliptic{stroke:#7fd1a4;fill:none;stroke-width:1.5;stroke-dasharray:2 5}
.cardinal{fill:#f5f7ff;font:600 calc(16px * var(--px,1)) system-ui,sans-serif}
.lab{fill:#f5f7ff;font:calc(12px * var(--px,1)) system-ui,sans-serif}
.con{stroke:#5c74b0;stroke-width:1.2;fill:none}
.sun{fill:#ffd23f}.moon{fill:#e8e8e8}.planet{fill:#7fd1ff}
.below{opacity:.3}
`;

const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const starRadius = m => (m == null ? 7 : Math.max(1.2, 6.2 - 1.05 * m));
const rgb = tK => {
  const c = colourOfTemperature(tK);
  return `rgb(${c.r},${c.g},${c.b})`;
};

/** Azimuthal equidistant, zenith at the centre, north up, east left. */
export function project(altDeg, azDeg) {
  const r = ((90 - altDeg) / 90) * R;
  const a = azDeg * DEG;
  return [CX - r * Math.sin(a), CY - r * Math.cos(a)];
}
/** The inverse of project(). */
export function unproject(x, y) {
  const dx = CX - x;
  const dy = CY - y;
  return {
    altDeg: 90 - (Math.hypot(dx, dy) / R) * 90,
    azDeg: (Math.atan2(dx, dy) / DEG + 360) % 360,
  };
}
const eqXY = (ra, dec) => [
  ((360 - ra) / 360) * EQ_W,
  ((90 - dec) / 180) * EQ_H,
];

/**
 * The horizon view: build once for a list of objects, then draw(model) per
 * frame.
 * @param {SVGElement} svg
 * @param {{label: (o: object) => string, cardinals: string[], lines: Array<[string, string]>}} cfg
 *   label gives an object's name; cardinals are N, E, S, W; lines are pairs of object ids
 */
export function createHorizon(svg, cfg) {
  const nodes = new Map();
  const lineNodes = [];
  let showNames = true;
  let showLines = true;
  svg.textContent = '';
  el('style', {}, svg).textContent = SVG_STYLE;
  const g = el('g', {}, svg);
  el('circle', { cx: CX, cy: CY, r: R, class: 'dome' }, g);
  for (const alt of [30, 60])
    el(
      'circle',
      { cx: CX, cy: CY, r: ((90 - alt) / 90) * R, class: 'ring' },
      g
    );
  cfg.cardinals.forEach((txt, i) => {
    const [x, y] = project(-3, i * 90);
    const t = el(
      'text',
      {
        x,
        y,
        class: 'cardinal',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      },
      g
    );
    t.textContent = txt;
  });
  const lines = el('g', { class: 'lines' }, svg);
  for (const [a, b] of cfg.lines) {
    const ln = el('line', { class: 'con' }, lines);
    ln.style.display = 'none';
    lineNodes.push({ a, b, ln, shown: false });
  }
  const objs = el('g', {}, svg);
  return {
    /** Create a node per object; labels only for those in `named`. */
    build(objects, named, colours) {
      for (const o of objects) {
        const grp = el('g', { class: `obj ${o.type}`, 'data-id': o.id }, objs);
        const fill = o.type === 'star' ? rgb(colours.get(o.id)) : null;
        const c = el(
          'circle',
          {
            r:
              o.type === 'sun'
                ? 12
                : o.type === 'moon'
                  ? 11
                  : o.type === 'planet'
                    ? 5
                    : starRadius(o.mag),
            cx: 0,
            cy: 0,
          },
          grp
        );
        if (fill) c.setAttribute('fill', fill);
        let lab = null;
        if (o.type !== 'star' || named.has(o.id)) {
          lab = el(
            'text',
            { class: 'lab', 'aria-hidden': 'true', x: 9, y: -7 },
            grp
          );
          lab.textContent = cfg.label(o);
        }
        nodes.set(o.id, { grp, lab, shown: true, alt: null, az: null });
      }
    },
    setLayers({ names, lines: l }) {
      showNames = names;
      showLines = l;
      for (const n of nodes.values())
        if (n.lab) n.lab.style.display = showNames ? '' : 'none';
      if (!showLines) for (const l2 of lineNodes) l2.ln.style.display = 'none';
    },
    /** One transform write per visible object, and one line update per figure line. */
    draw(objects) {
      for (const o of objects) {
        const n = nodes.get(o.id);
        if (!n) continue;
        if (o.altDeg <= 0) {
          if (n.shown) {
            n.grp.style.display = 'none';
            n.shown = false;
          }
          n.x = null;
          continue;
        }
        if (!n.shown) {
          n.grp.style.display = '';
          n.shown = true;
        }
        const [x, y] = project(o.altDeg, o.azDeg);
        n.x = x;
        n.y = y;
        n.grp.setAttribute('transform', `translate(${round(x)} ${round(y)})`);
      }
      if (!showLines) return;
      for (const l of lineNodes) {
        const a = nodes.get(l.a);
        const b = nodes.get(l.b);
        const up = a && b && a.x != null && b.x != null;
        if (!up) {
          if (l.shown) {
            l.ln.style.display = 'none';
            l.shown = false;
          }
          continue;
        }
        if (!l.shown) {
          l.ln.style.display = '';
          l.shown = true;
        }
        l.ln.setAttribute('x1', round(a.x, 1));
        l.ln.setAttribute('y1', round(a.y, 1));
        l.ln.setAttribute('x2', round(b.x, 1));
        l.ln.setAttribute('y2', round(b.y, 1));
      }
    },
    /** The settled write: the numbers the table carries, on the drawing too. */
    settle(objects) {
      for (const o of objects) {
        if (o.altDeg <= 0) continue;
        const n = nodes.get(o.id);
        if (!n) continue;
        n.grp.setAttribute('data-alt', round(o.altDeg));
        n.grp.setAttribute('data-az', round(o.azDeg));
      }
    },
  };
}

/**
 * The equatorial map, drawn from scratch each time the sky settles.
 * @param {SVGElement} svg
 * @param {object} model - From skyAt
 * @param {{latDeg: number}} site
 * @param {{colours: Map<string, number>, lines: Array<[string, string]>, showLines: boolean,
 *   magLimit: number, obliquityDeg: number}} opts
 */
export function drawEquatorial(svg, model, site, opts) {
  svg.textContent = '';
  el('style', {}, svg).textContent = SVG_STYLE;
  const g = el('g', {}, svg);
  el('rect', { x: 0, y: 0, width: EQ_W, height: EQ_H, class: 'dome' }, g);
  el('line', { x1: 0, x2: EQ_W, y1: EQ_H / 2, y2: EQ_H / 2, class: 'ring' }, g);
  const path = (pts, cls) => {
    let d = '';
    pts.forEach(([ra, dec], i) => {
      const [x, y] = eqXY(ra, dec);
      const prev = pts[i - 1];
      d += `${i === 0 || (prev && Math.abs(ra - prev[0]) > 180) ? 'M' : 'L'}${round(x, 1)} ${round(y, 1)}`;
    });
    el('path', { d, class: cls }, g);
  };
  // The ecliptic, and this site's horizon as it is now.
  const ecl = [];
  for (let l = 0; l <= 360; l += 3) {
    const lam = l * DEG;
    const e = opts.obliquityDeg * DEG;
    ecl.push([
      (Math.atan2(Math.sin(lam) * Math.cos(e), Math.cos(lam)) / DEG + 360) %
        360,
      Math.asin(Math.sin(e) * Math.sin(lam)) / DEG,
    ]);
  }
  ecl.sort((a, b) => a[0] - b[0]);
  path(ecl, 'ecliptic');
  const hor = [];
  const tanLat = Math.tan(site.latDeg * DEG);
  if (Math.abs(site.latDeg) > 0.5) {
    for (let h = -180; h <= 180; h += 3) {
      const dec = Math.atan(-Math.cos(h * DEG) / tanLat) / DEG;
      hor.push([(((model.lstDeg - h) % 360) + 360) % 360, dec]);
    }
    path(hor, 'horizonline');
  }
  const pos = new Map();
  for (const o of model.objects) pos.set(o.id, o);
  if (opts.showLines) {
    for (const [a, b] of opts.lines) {
      const p = pos.get(a);
      const q = pos.get(b);
      if (!p || !q || Math.abs(p.raDeg - q.raDeg) > 180) continue;
      const [x1, y1] = eqXY(p.raDeg, p.decDeg);
      const [x2, y2] = eqXY(q.raDeg, q.decDeg);
      el(
        'line',
        {
          x1: round(x1, 1),
          y1: round(y1, 1),
          x2: round(x2, 1),
          y2: round(y2, 1),
          class: 'con',
        },
        g
      );
    }
  }
  for (const o of model.objects) {
    if (o.type === 'star' && o.mag > opts.magLimit) continue;
    const [x, y] = eqXY(o.raDeg, o.decDeg);
    const c = el(
      'circle',
      {
        cx: round(x),
        cy: round(y),
        r: o.type === 'star' ? starRadius(o.mag) * 0.8 : 6,
        class: `obj ${o.type}${o.altDeg > 0 ? '' : ' below'}`,
        'data-id': o.id,
      },
      g
    );
    if (o.type === 'star') c.setAttribute('fill', rgb(opts.colours.get(o.id)));
  }
}

/** An SVG element as a standalone file's text (its style travels inside it). */
export function svgFile(svg, title) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('width', '1000');
  clone.setAttribute(
    'height',
    svg.getAttribute('viewBox').endsWith('500') ? '500' : '1000'
  );
  const t = document.createElementNS(NS, 'title');
  t.textContent = title;
  clone.insertBefore(t, clone.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new globalThis.XMLSerializer().serializeToString(clone)}\n`;
}
