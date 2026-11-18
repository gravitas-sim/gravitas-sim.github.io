// =============================================================================
// Orbit geometry: the selected body's two-body ellipse, its markers and a ruler
// -----------------------------------------------------------------------------
// Fetched when the inspector's Orbit geometry toggle is first switched on, and
// registered with js/overlays.js rather than imported by the render loop.
// Every frame it asks js/orbitGeometry.js for the ellipse from the live state,
// with the engine's own source list (made valid first, so a world built paused
// is read before its first step) and the force law the engine has in force.
//
// The marker contract (named, selectable, two at most):
//   ids        focus-primary, focus-empty, periapsis, apoapsis
//   parts      ellipse; apsides (periapsis, apoapsis); foci (both foci). A
//              hidden part is absent from the canvas, the list, the readout
//              and the description.
//   pointer    a press within 12 CSS px of a marker's centre chooses it (a
//              24 px target), 22 px on touch (44 px); it never reaches the
//              placement underneath.
//   keyboard   the panel's list: Left and Right move, Enter or Space toggles,
//              Escape clears (INTERACTION.md section 1).
//   readout    "Distance between A and B: x" in formatDistance units,
//              announced when the second point is chosen.
// =============================================================================

import { registerOverlay } from './overlays.js';
import { state } from './appState.js';
import { familyName } from './sizeFacts.js';
import {
  world_to_screen,
  gravitySourcesFor,
  barycenterBodies,
  planets,
  gas_giants,
  asteroids,
  comets,
  stars,
  neutron_stars,
  white_dwarfs,
  bh_list,
  galaxies,
} from './physics.js';
import { twoBodySettings } from './engine/forces.js';
import {
  orbitGeometry,
  markerPoints,
  markerAt,
  toggleMarker,
  MARKERS,
  MARKER_PART,
} from './orbitGeometry.js';
import {
  t,
  onLocaleChange,
  getLocale,
  registerMessages,
} from './i18n/index.js';
import { formatDistance } from './units.js';
import { formatNumber } from './format.js';
import { announce } from './notify.js';
import { labelFont, pixelScale } from './bodyLabels.js';

// The panel's own rules, put in the page when it is first built, so a reader
// who never switches the overlay on does not download them. A chosen point is
// said by a tick and weight as well as by colour.
const STYLE = `.orbit-geometry-panel{width:300px;} .og-body{padding:0 var(--space-3);font-size:var(--text-sm);} .og-parts{display:flex;flex-wrap:wrap;gap:2px var(--space-3);margin:0 0 var(--space-2);padding:0;border:0;} .og-parts label, .og-option{display:flex;align-items:center;gap:6px;min-height:24px;} .og-option{padding:0 6px;border:1px solid transparent;border-radius:var(--radius-sm);cursor:pointer;} .og-option.is-active{border-color:var(--border);} .og-list:focus-visible .og-option.is-active{outline:2px solid var(--accent-primary, currentColor);} .og-option[aria-selected='true']{font-weight:600;background:var(--surface-2);} .og-option[aria-selected='true']::before{content:'\\2713';} @media (pointer:coarse){.og-parts label, .og-option{min-height:44px;}}`;

const INK = 'rgba(120, 222, 200, 0.95)';
const MARK = 'rgba(236, 244, 255, 0.98)';
const PARTS = ['ellipse', 'apsides', 'foci'];

let unregister = null;
let root = null;
let geometry = null;
let screenMarkers = {};
let active = 0;
let painted = {};

const og = () => state.orbitGeometry;
const esc = s =>
  String(s).replace(
    /[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

/** The body the overlay is about, wherever its list keeps it. */
function bodyById(id) {
  for (const list of [
    planets,
    gas_giants,
    asteroids,
    comets,
    stars,
    neutron_stars,
    white_dwarfs,
    bh_list,
    galaxies,
  ]) {
    const b = list.find(x => x.id === id);
    if (b) return b.alive === false ? null : b;
  }
  return null;
}

const primaryName = g =>
  g?.primary?.name ||
  familyName(g?.primary?.kind === 'StarObject' ? 'Star' : g?.primary?.kind) ||
  '';

/** A marker's name in the reader's language. */
export const markerName = (id, g = geometry) =>
  t(`orbitGeometry.marker.${id}`, { primary: primaryName(g) });

/** The lines the label says: what the curve is, or why there is none. */
function statusLines(g) {
  if (!g) return [];
  if (!g.ok) {
    return [
      t(`orbitGeometry.reason.${g.reason}`, {
        primary: primaryName(g),
        length: formatDistance(g.softening),
      }),
    ];
  }
  const lines = [t('orbitGeometry.label', { primary: primaryName(g) })];
  if (g.secondPull) {
    lines.push(
      t('orbitGeometry.second', {
        source:
          g.secondPull.name ||
          familyName(
            g.secondPull.kind === 'StarObject' ? 'Star' : g.secondPull.kind
          ),
        pct: formatNumber(g.secondPullPct, { sig: 2 }),
        primary: primaryName(g),
      })
    );
  }
  if (g.model.approximate) lines.push(t('orbitGeometry.approximate'));
  return lines;
}

/** The distance between the two chosen markers, or null. */
function distanceText(g) {
  const sel = og().selected;
  if (!g?.ok || sel.length !== 2) return null;
  const pts = markerPoints(g, og().parts);
  const [a, b] = sel.map(id => pts[id]);
  if (!a || !b) return null;
  return t('orbitGeometry.distance', {
    a: markerName(sel[0], g),
    b: markerName(sel[1], g),
    d: formatDistance(Math.hypot(a.x - b.x, a.y - b.y)),
  });
}

/** The sentence the canvas description carries while this is on. */
function summaryOf(body, g) {
  if (!g) return '';
  const parts = [...statusLines(g)];
  if (g.ok && og().parts.ellipse) {
    parts.push(
      t('orbitGeometry.elements', {
        a: formatDistance(g.a),
        e: formatNumber(g.e, { sig: 3 }),
      })
    );
  }
  const d = distanceText(g);
  if (d) parts.push(d);
  return t('orbitGeometry.summary', {
    name: body?.name || '',
    label: parts.join('; '),
  });
}

// --- Drawing -----------------------------------------------------------------

function drawMarker(ctx, id, s, chosen, k) {
  const r = 6 * k;
  ctx.save();
  ctx.lineWidth = 2 * k;
  ctx.strokeStyle = MARK;
  ctx.fillStyle = MARK;
  ctx.beginPath();
  if (id === 'focus-primary') {
    ctx.arc(s.x, s.y, r, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (id === 'focus-empty') {
    ctx.moveTo(s.x - r, s.y - r);
    ctx.lineTo(s.x + r, s.y + r);
    ctx.moveTo(s.x - r, s.y + r);
    ctx.lineTo(s.x + r, s.y - r);
    ctx.stroke();
  } else if (id === 'periapsis') {
    ctx.moveTo(s.x, s.y - r);
    ctx.lineTo(s.x + r, s.y + r * 0.8);
    ctx.lineTo(s.x - r, s.y + r * 0.8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.rect(s.x - r * 0.8, s.y - r * 0.8, r * 1.6, r * 1.6);
    ctx.fill();
  }
  if (chosen) {
    ctx.beginPath();
    ctx.lineWidth = 2.5 * k;
    ctx.strokeStyle = INK;
    ctx.arc(s.x, s.y, r + 5 * k, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.font = labelFont(11, 'sans-serif', chosen ? 'bold' : '');
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = MARK;
  ctx.fillText(markerName(id), s.x + r + 6 * k, s.y);
  ctx.restore();
}

function draw(ctx) {
  const cfg = og();
  if (!cfg.active) return;
  const body = bodyById(cfg.objectId);
  if (!body) {
    setOrbitGeometry(false);
    return;
  }
  // Refills the engine's source list if this world has not been stepped yet.
  barycenterBodies();
  const g = orbitGeometry(body, gravitySourcesFor(body), twoBodySettings());
  geometry = g;
  // A part hidden, or a geometry with no markers, takes its choices with it.
  const shown = markerPoints(g, cfg.parts);
  const kept = cfg.selected.filter(id => shown[id]);
  if (kept.length !== cfg.selected.length) cfg.selected = kept;

  const k = pixelScale() || 1;
  ctx.save();
  let top = null;
  if (g.ok && cfg.parts.ellipse) {
    ctx.setLineDash([10 * k, 6 * k]);
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    g.points.forEach((p, i) => {
      const s = world_to_screen(p);
      if (!top || s.y < top.y) top = s;
      if (i) ctx.lineTo(s.x, s.y);
      else ctx.moveTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  screenMarkers = {};
  for (const [id, p] of Object.entries(shown)) {
    screenMarkers[id] = world_to_screen(p);
    if (!top || screenMarkers[id].y < top.y) top = screenMarkers[id];
  }
  if (cfg.selected.length === 2) {
    const [a, b] = cfg.selected.map(id => screenMarkers[id]);
    ctx.setLineDash([4 * k, 4 * k]);
    ctx.lineWidth = 1.5 * k;
    ctx.strokeStyle = MARK;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const [id, s] of Object.entries(screenMarkers))
    drawMarker(ctx, id, s, cfg.selected.includes(id), k);

  // What the curve is (or why there is none), above it or above the body.
  const at = top || world_to_screen(body.pos);
  ctx.font = labelFont(13, 'sans-serif', 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = INK;
  const lines = statusLines(g);
  const step = 16 * k;
  lines.forEach((line, i) =>
    ctx.fillText(line, at.x, at.y - 10 * k - (lines.length - 1 - i) * step)
  );
  ctx.restore();

  paintPanel(body, g);
}

// --- The panel ---------------------------------------------------------------

/** The overlay's words, for the language in use (fetched with it). */
async function ensureMessages() {
  const locale = getLocale();
  const m =
    locale === 'es'
      ? await import('./i18n/es.orbitGeometry.js')
      : await import('./i18n/en.orbitGeometry.js');
  registerMessages(locale, m.ES_ORBITGEOMETRY || m.EN_ORBITGEOMETRY);
}

function mount() {
  if (root) return;
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.append(style);
  root = document.createElement('div');
  root.id = 'orbitGeometryPanel';
  root.className = 'obs-panel orbit-geometry-panel';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', 'ogTitle');
  root.hidden = true;
  document.body.append(root);
  build();
  onLocaleChange(() =>
    ensureMessages()
      .catch(() => {})
      .then(() => {
        build();
        painted = {};
      })
  );
}

function build() {
  root.innerHTML = `
    <div class="obs-panel-toolbar">
      <div class="obs-panel-meta">
        <span class="obs-panel-title" id="ogTitle">${esc(t('orbitGeometry.title'))}</span>
      </div>
      <div class="obs-panel-actions">
        <button id="ogClose" class="obs-panel-btn" type="button" aria-label="${esc(t('orbitGeometry.close'))}" title="${esc(t('orbitGeometry.close'))}">✕</button>
      </div>
    </div>
    <div class="og-body">
      <p id="ogStatus" class="og-status"></p>
      <fieldset class="og-parts"><legend>${esc(t('orbitGeometry.parts'))}</legend>
        ${PARTS.map(
          p =>
            `<label><input type="checkbox" data-part="${p}"> ${esc(t(`orbitGeometry.part.${p}`))}</label>`
        ).join('')}
      </fieldset>
      <p class="obs-panel-hint" id="ogListLabel">${esc(t('orbitGeometry.points'))}</p>
      <div id="ogList" class="og-list" role="listbox" tabindex="0" aria-multiselectable="true" aria-labelledby="ogListLabel" aria-describedby="ogKeys"></div>
      <p class="obs-panel-hint" id="ogKeys">${esc(t('orbitGeometry.keys'))}</p>
      <p id="ogDistance" class="og-distance"></p>
    </div>`;
  root.querySelector('#ogClose').onclick = () => setOrbitGeometry(false);
  root.querySelectorAll('[data-part]').forEach(box => {
    box.checked = og().parts[box.dataset.part] !== false;
    box.onchange = () => {
      og().parts = { ...og().parts, [box.dataset.part]: box.checked };
    };
  });
  const list = root.querySelector('#ogList');
  list.addEventListener('keydown', onListKey);
  list.addEventListener('click', e => {
    const opt = e.target.closest('[role=option]');
    if (!opt) return;
    const ids = visibleIds();
    active = Math.max(0, ids.indexOf(opt.dataset.id));
    choose(opt.dataset.id);
    list.focus();
  });
}

const visibleIds = () =>
  geometry?.ok
    ? MARKERS.filter(id => og().parts[MARKER_PART[id]] !== false)
    : [];

function onListKey(e) {
  const ids = visibleIds();
  if (!ids.length) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const d = e.key === 'ArrowRight' ? 1 : -1;
    active = (active + d + ids.length) % ids.length;
  } else if (e.key === 'Enter' || e.key === ' ') {
    choose(ids[Math.min(active, ids.length - 1)]);
  } else if (e.key === 'Escape') {
    if (!og().selected.length) return;
    og().selected = [];
    announce(t('orbitGeometry.cleared'));
  } else return;
  e.preventDefault();
  e.stopPropagation();
  painted.list = null;
  if (geometry) paintPanel(bodyById(og().objectId), geometry);
}

/** Toggle a marker and say what changed; the distance is said on the second. */
export function choose(id) {
  const before = og().selected;
  og().selected = toggleMarker(before, id);
  const d = distanceText(geometry);
  if (og().selected.includes(id)) {
    announce(d || t('orbitGeometry.chosen', { name: markerName(id) }));
  } else {
    announce(t('orbitGeometry.cleared'));
  }
  painted.list = null;
}

function paintPanel(body, g) {
  if (!root) return;
  const status = statusLines(g).join('. ');
  if (painted.status !== status) {
    painted.status = status;
    root.querySelector('#ogStatus').textContent = status;
  }
  const ids = visibleIds();
  if (active >= ids.length) active = Math.max(0, ids.length - 1);
  const listKey = `${ids.join()}|${og().selected.join()}|${active}|${primaryName(g)}`;
  if (painted.list !== listKey) {
    painted.list = listKey;
    const list = root.querySelector('#ogList');
    list.innerHTML = ids
      .map(
        (id, i) =>
          `<div role="option" id="og-${id}" data-id="${id}" aria-selected="${og().selected.includes(id)}" class="og-option${i === active ? ' is-active' : ''}">${esc(markerName(id, g))}</div>`
      )
      .join('');
    if (ids.length)
      list.setAttribute('aria-activedescendant', `og-${ids[active]}`);
    else list.removeAttribute('aria-activedescendant');
  }
  const dist = distanceText(g) || (g.ok ? t('orbitGeometry.pickTwo') : '');
  if (painted.dist !== dist) {
    painted.dist = dist;
    root.querySelector('#ogDistance').textContent = dist;
  }
  og().summary = summaryOf(body, g);
}

// --- Pointer -----------------------------------------------------------------

let swallowTouchEnd = false;

/** A press on a marker chooses it and goes no further. */
function onPress(e) {
  if (!og().active || !geometry?.ok) return;
  const touch = e.touches ? e.touches[0] : null;
  if (e.touches && e.touches.length !== 1) return;
  if (!touch && e.button !== 0) return;
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const pt = touch || e;
  const at = {
    x: (pt.clientX - rect.left) * sx,
    y: (pt.clientY - rect.top) * sx,
  };
  // D-R10-283-03: 24 px targets, 44 on touch, in CSS pixels.
  const id = markerAt(screenMarkers, at, (touch ? 44 : 24) * sx);
  if (!id) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (touch) swallowTouchEnd = true;
  active = Math.max(0, visibleIds().indexOf(id));
  choose(id);
}

function onTouchEnd(e) {
  if (!swallowTouchEnd) return;
  swallowTouchEnd = false;
  e.preventDefault();
  e.stopImmediatePropagation();
}

let canvasWired = null;
function wireCanvas(on) {
  const canvas = document.getElementById('simulationCanvas');
  if (on && canvas && canvasWired !== canvas) {
    canvas.addEventListener('mousedown', onPress, true);
    canvas.addEventListener('touchstart', onPress, {
      capture: true,
      passive: false,
    });
    canvas.addEventListener('touchend', onTouchEnd, {
      capture: true,
      passive: false,
    });
    canvasWired = canvas;
  } else if (!on && canvasWired) {
    canvasWired.removeEventListener('mousedown', onPress, true);
    canvasWired.removeEventListener('touchstart', onPress, true);
    canvasWired.removeEventListener('touchend', onTouchEnd, true);
    canvasWired = null;
  }
}

/**
 * Switch the overlay on for a body, or off.
 * @param {boolean} on - Whether to draw it
 * @param {Object} [body] - The body, when switching on
 */
export async function setOrbitGeometry(on, body) {
  const cfg = og();
  if (on && body) {
    await ensureMessages().catch(() => {});
    if (cfg.objectId !== body.id) cfg.selected = [];
    cfg.active = true;
    cfg.objectId = body.id;
    mount();
    root.hidden = false;
    painted = {};
    if (!unregister) unregister = registerOverlay(draw);
    wireCanvas(true);
    return;
  }
  cfg.active = false;
  cfg.selected = [];
  cfg.summary = '';
  geometry = null;
  screenMarkers = {};
  if (root) root.hidden = true;
  if (unregister) {
    unregister();
    unregister = null;
  }
  wireCanvas(false);
  // The inspector's switch says the same thing.
  const btn = document.getElementById('orbitGeometryToggleBtn');
  if (btn) {
    btn.setAttribute('data-state', 'off');
    btn.setAttribute('aria-checked', 'false');
    btn.textContent = t('settings.toggle.off');
  }
}
