// =============================================================================
// The observatory's sky panel: Galactic projection and proper-motion vectors
// -----------------------------------------------------------------------------
// Loaded only when a reader opens it. For a table with right ascension and
// declination columns (ra, dec in degrees) it draws the sources on a
// Hammer-Aitoff map in Galactic coordinates (the kernel's own projection,
// js/kernels/galactic/coords.js); for one that also has proper motions (pmra,
// pmdec in mas/yr) it draws each source's proper motion as an arrow on the
// sky, right ascension increasing to the left, with the scale stated. The
// numbers are all in the table the panel sits beside: the picture is a view of
// those rows, never the only place a value is. Nothing leaves the page.
//
// Nothing from the page's own modules is imported here (see fitPanel.js): its
// translator arrives in `ctx`, and its words are registered by this panel.
// =============================================================================

import { icrsToGalactic, hammerAitoff } from '../kernels/galactic/coords.js';
import { EN_GALACTIC } from '../i18n/en.galactic.js';
import { ES_GALACTIC } from '../i18n/es.galactic.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const W = 720;
const H = 360;

/** Which of the panel's two views a table supports. */
export function skyViews(o) {
  const has = id => o.columns.some(c => c.id === id);
  return {
    galactic: has('ra') && has('dec'),
    vectors: has('ra') && has('dec') && has('pmra') && has('pmdec'),
  };
}

/** The sources' Galactic positions, for the map and for the tests. */
export function galacticPositions(o) {
  const c = id => o.columns.find(x => x.id === id).values;
  const ra = c('ra');
  const dec = c('dec');
  const out = [];
  for (let i = 0; i < ra.length; i++) {
    if (!Number.isFinite(ra[i] + dec[i])) continue;
    out.push({ i, ...icrsToGalactic(ra[i], dec[i]) });
  }
  return out;
}

export function mountSkyPanel(body, ctx) {
  ctx.registerMessages?.('en', EN_GALACTIC);
  ctx.registerMessages?.('es', ES_GALACTIC);
  const { t } = ctx;
  body.textContent = '';
  const row = document.createElement('div');
  row.className = 'ui-toolbar';
  const label = document.createElement('label');
  label.textContent = t('galW.sky.view');
  const select = document.createElement('select');
  select.className = 'ui-select';
  label.append(' ', select);
  row.append(label);
  const note = document.createElement('p');
  note.className = 'ui-hint';
  note.setAttribute('role', 'status');
  const fig = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    class: 'ow-sky',
  });
  fig.style.width = '100%';
  fig.style.maxWidth = '720px';
  body.append(row, fig, note);
  let obs = null;

  const colors = () => {
    const css = getComputedStyle(body);
    const pick = (v, f) => css.getPropertyValue(v).trim() || f;
    return {
      ink: pick('--text-primary', '#e9edf7'),
      muted: pick('--text-muted', '#8a8f9e'),
      grid: pick('--border-subtle', '#2a2f3d'),
      accent: pick('--accent', '#38bdf8'),
    };
  };

  function galactic() {
    const k = colors();
    const sx = (W - 40) / (4 * Math.SQRT2);
    const cx = W / 2;
    const cy = H / 2;
    const P = (l, b) => {
      const q = hammerAitoff(l, b);
      return [cx + q.x * sx, cy - q.y * sx];
    };
    fig.append(
      svg('ellipse', {
        cx,
        cy,
        rx: 2 * Math.SQRT2 * sx,
        ry: Math.SQRT2 * sx,
        fill: 'none',
        stroke: k.grid,
      })
    );
    let d = '';
    for (let l = 0; l <= 360; l += 5) {
      const [x, y] = P(l, 0);
      d += `${l === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    fig.append(svg('path', { d, fill: 'none', stroke: k.grid }));
    const pos = galacticPositions(obs);
    for (const p of pos) {
      const [x, y] = P(p.l, p.b);
      fig.append(
        svg('circle', {
          cx: x.toFixed(1),
          cy: y.toFixed(1),
          r: 2,
          fill: k.accent,
        })
      );
    }
    const text = svg('text', {
      x: 8,
      y: H - 8,
      fill: k.muted,
      'font-size': 12,
    });
    text.textContent = t('galW.sm.skyNote');
    fig.append(text);
    fig.setAttribute('aria-label', t('galW.sky.aria.map', { n: pos.length }));
    note.textContent = t('galW.sky.note.map', { n: pos.length });
  }

  function vectors() {
    const k = colors();
    const c = id => obs.columns.find(x => x.id === id).values;
    const ra = c('ra');
    const dec = c('dec');
    const pmra = c('pmra');
    const pmdec = c('pmdec');
    const idx = [];
    for (let i = 0; i < ra.length; i++)
      if (Number.isFinite(ra[i] + dec[i] + pmra[i] + pmdec[i])) idx.push(i);
    const lo = (a, f) => Math.min(...idx.map(i => a[i] * (f ?? 1)));
    const hi = (a, f) => Math.max(...idx.map(i => a[i] * (f ?? 1)));
    // Right ascension increases to the left; the plot's x is minus ra.
    const x0 = lo(ra, -1);
    const x1 = hi(ra, -1);
    const y0 = lo(dec);
    const y1 = hi(dec);
    const pad = 28;
    const ratio = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
    const spanX = Math.max((x1 - x0) * ratio, 1e-6);
    const spanY = Math.max(y1 - y0, 1e-6);
    const s = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    const X = r => pad + (-r - x0) * ratio * s;
    const Y = d => H - pad - (d - y0) * s;
    const mags = idx
      .map(i => Math.hypot(pmra[i], pmdec[i]))
      .sort((a, b) => a - b);
    const median = mags[mags.length >> 1] || 1;
    // A median arrow is about a twentieth of the picture wide.
    const per = (0.05 * Math.max(W, H)) / median;
    fig.append(
      svg('rect', {
        x: pad - 6,
        y: pad - 6,
        width: W - 2 * pad + 12,
        height: H - 2 * pad + 12,
        fill: 'none',
        stroke: k.grid,
      })
    );
    for (const i of idx) {
      const x = X(ra[i]);
      const y = Y(dec[i]);
      // Positive pmra moves toward larger ra: to the left on the sky.
      const dx = -pmra[i] * per;
      const dy = -pmdec[i] * per;
      fig.append(
        svg('line', {
          x1: x.toFixed(1),
          y1: y.toFixed(1),
          x2: (x + dx).toFixed(1),
          y2: (y + dy).toFixed(1),
          stroke: k.accent,
          'stroke-width': 1,
        })
      );
      fig.append(
        svg('circle', {
          cx: x.toFixed(1),
          cy: y.toFixed(1),
          r: 1.5,
          fill: k.ink,
        })
      );
    }
    const text = svg('text', {
      x: 8,
      y: H - 8,
      fill: k.muted,
      'font-size': 12,
    });
    text.textContent = t('galW.sky.scale', { v: median.toFixed(2) });
    fig.append(text);
    fig.setAttribute(
      'aria-label',
      t('galW.sky.aria.vectors', { n: idx.length })
    );
    note.textContent = t('galW.sky.note.vectors', {
      n: idx.length,
      v: median.toFixed(2),
    });
  }

  function draw() {
    fig.textContent = '';
    if (!obs) return;
    if (select.value === 'vectors' && skyViews(obs).vectors) vectors();
    else if (skyViews(obs).galactic) galactic();
  }
  select.addEventListener('change', draw);

  return {
    update(o) {
      obs = o;
      const v = skyViews(o);
      select.textContent = '';
      for (const [id, ok] of [
        ['galactic', v.galactic],
        ['vectors', v.vectors],
      ]) {
        if (!ok) continue;
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = t(`galW.sky.view.${id}`);
        select.append(opt);
      }
      draw();
    },
    destroy() {
      body.textContent = '';
    },
  };
}
