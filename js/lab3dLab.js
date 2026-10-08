// =============================================================================
// The 3-D lab (/3d/)
// -----------------------------------------------------------------------------
// Small systems in three dimensions, run by the 3-D kernel (js/lab3d/,
// LAB3D.md) in a Worker of its own and drawn from its snapshots
// (js/lab3d/snapshot.js). The page never integrates. It keeps a clock in
// simulation time, asks the Worker for whole intervals ahead of it, and
// draws the moment between the two snapshots around the clock.
//
// Two views of one state: the picture (js/lab3d/view/scene.js, WebGL) and
// the tables under it (the hierarchy, positions and speeds, orbital
// elements, the events), which hold every number the picture shows and work
// with no WebGL at all. Every measurement is computed from numbers
// (js/lab3d/view/instruments.js), never from pixels.
// =============================================================================

/* global ResizeObserver */
import {
  LANGUAGES,
  language,
  loadLanguage,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './lab3d/view/i18n.js';
import { createLiveSession } from './lab3d/liveClient.js';
import { migrateSystem, validateSystem, gravityOf } from './lab3d/state.js';
import { REFERENCES } from './lab3d/references.js';
import { drawnAt, exactFrame, snapshotProblem } from './lab3d/snapshot.js';
import { restartFrom } from './lab3d/live.js';
import { toFrame, trailToFrame, frameKey } from './lab3d/view/frames.js';
import {
  bounds,
  niceLength,
  preset,
  project,
  scaleBar,
  worldPerPixel,
} from './lab3d/view/projection.js';
import {
  KM_S_PER_AU_DAY,
  angleAt,
  between,
  onTheSky,
  elementsAbout,
  hierarchy,
  relative,
} from './lab3d/view/instruments.js';
import { formatNumber } from './format.js';
import { chooseInterval } from './lab3d/view/tick.js';
import { createScene, PALETTE } from './lab3d/view/scene.js';

const $ = id => document.getElementById(id);
const spawn = () =>
  new Worker(new URL('./lab3d/worker.js', import.meta.url), {
    type: 'module',
  });
const MAX_FILE = 1024 * 1024;
const BASE_RATE = 60; // intervals a second at x1
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256];
const PRESETS = ['oblique', 'top', 'side', 'faceOn', 'edgeOn'];
const TOOLS = [
  'none',
  'distance',
  'angle',
  'elements',
  'relative',
  'sky',
  'between',
];
const SIZES = ['marker', 'radius10', 'radius'];
const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

const state = {
  system: null, // the validated system being played
  choice: 'R5',
  interval: 0.01,
  session: null,
  snaps: [], // the last few snapshots, oldest first
  pendingTrail: [], // [{t, row}] not yet drawn
  tau: 0, // the page clock, in simulation time
  playing: false,
  behind: false,
  frame: 'barycentric',
  follow: -1,
  camera: null,
  colors: [],
  scene: null,
  sceneError: null,
  trailPoints: 2000,
  trailTimes: [],
  events: [],
  lastTables: 0,
  lastLegend: 0,
  firstFrame: false,
  fileSystem: null,
  extras: new Map(), // id -> {id, make, label}: systems a guide brings
  listeners: new Set(), // the guide panel's, told when anything changes
};

// --- Small helpers ----------------------------------------------------------------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat())
    if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}
const num = (v, sig = 4) =>
  typeof v === 'number' && Number.isFinite(v) ? formatNumber(v, { sig }) : '—';
const deg = r => (Number.isFinite(r) ? `${num((r * 180) / Math.PI, 4)}°` : '—');
/** An angle that goes all the way round, on [0°, 360°), as elements are given. */
const turn = r => deg(((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
const solar = () => state.system?.units === 'solar';
const unitL = (v = 2) =>
  t(solar() ? 'l3.unit.au' : v === 1 ? 'l3.unit.length1' : 'l3.unit.length');
const unitT = (v = 2) =>
  t(solar() ? 'l3.unit.day' : v === 1 ? 'l3.unit.time1' : 'l3.unit.time');
const unitM = () => t(solar() ? 'l3.unit.msun' : 'l3.unit.mass');
const length = v => `${num(v)} ${unitL()}`;
/** A round number (1, 2 or 5 times a power of ten) as the round number it is. */
const round = (v, unit) => `${num(v, 1)} ${unit(v)}`;
const time = v => `${num(v)} ${unitT()}`;
const speed = v =>
  solar()
    ? t('l3.speed.solar', { au: num(v), km: num(v * KM_S_PER_AU_DAY) })
    : `${num(v)} ${t('l3.unit.speed')}`;
const nameOf = i => {
  const b = state.system?.bodies[i];
  return b ? b.name || b.id : '?';
};
const G = () => (state.system ? gravityOf(state.system) : 1);

function fillSelect(select, items, keep) {
  const was = keep ?? select.value;
  select.replaceChildren(
    ...items.map(([value, text]) => el('option', { value, text }))
  );
  if (items.some(([v]) => v === was)) select.value = was;
}

// --- The systems -----------------------------------------------------------------

/** A reference problem's system and the options it was validated with. */
function reference(id) {
  const made = REFERENCES.find(r => r.id === id).make();
  return { system: made.system, options: made.options };
}

function systemItems() {
  return [
    ...REFERENCES.map(r => [r.id, t(`l3.ref.${r.id}`)]),
    ...[...state.extras.values()].map(x => [x.id, x.label()]),
    ['file', t('l3.system.file')],
  ];
}

async function open(choice, { interval } = {}) {
  state.choice = choice;
  $('l3-file-row').hidden = choice !== 'file';
  let system;
  let options = {};
  if (choice === 'file') {
    if (!state.fileSystem) return notice(t('l3.status.chooseFile'), true);
    system = state.fileSystem;
  } else if (state.extras.has(choice)) {
    // A system a guide brought (js/lab3d/guides/), made from its numbers.
    system = state.extras.get(choice).make();
  } else ({ system, options } = reference(choice));
  const checked = validateSystem(system);
  if (checked.length)
    return notice(
      t('l3.status.refused', { why: checked[0].code }),
      false,
      'error'
    );
  await start(system, {
    interval,
    closeWithin: options.closeWithin,
    escapeBeyond: options.escapeBeyond,
    crossings: options.crossings,
  });
  const url = new URL(location.href);
  if (choice === 'file' || state.extras.has(choice))
    url.searchParams.delete('system');
  else url.searchParams.set('system', choice);
  history.replaceState(null, '', url);
}

async function start(system, extra = {}) {
  state.session?.stop();
  state.system = system;
  // A guide may play a system at its own tick (js/lab3d/guides/).
  state.interval = extra.interval || chooseInterval(system);
  state.snaps = [];
  state.pendingTrail = [];
  state.trailTimes = [];
  state.events = [];
  $('l3-events').replaceChildren();
  state.follow = -1;
  state.colors = system.bodies.map((_, i) => PALETTE[i % PALETTE.length]);
  state.options = { ...extra, interval: state.interval };
  const session = createLiveSession({ spawn }, system, state.options);
  state.session = session;
  status(t('l3.status.starting'));
  try {
    const { snapshot } = await session.ready;
    if (session !== state.session) return;
    accept(snapshot);
    state.tau = snapshot.t;
    state.t0 = snapshot.t;
  } catch (err) {
    if (session !== state.session) return;
    return notice(
      t('l3.status.refused', { why: err.problems?.[0]?.code || err.message }),
      false,
      'error'
    );
  }
  fillBodySelects();
  state.scene?.setBodies(
    system.bodies.map((b, i) => ({ id: b.id, color: state.colors[i] })),
    state.trailPoints
  );
  resetView();
  // With no picture, its notice stays: the tables are the lab.
  notice(state.scene ? null : t('l3.status.noWebgl'));
  updateTables(true);
  document.documentElement.dataset.ready = 'true';
  if (!reduced()) play(true);
  else play(false);
}

/** Keep a snapshot, and queue its trail rows in the display frame. */
function accept(snap) {
  const problem = snapshotProblem(snap);
  if (problem) throw new Error(`snapshot: ${problem}`);
  state.snaps.push(snap);
  if (state.snaps.length > 4) state.snaps.shift();
  const n = snap.m.length;
  const k = snap.trailT.length;
  if (k) {
    const rows = trailToFrame(snap.trail, k, snap, state.frame);
    for (let r = 0; r < k; r++)
      state.pendingTrail.push({
        t: snap.trailT[r],
        row: rows.subarray(r * 3 * n, (r + 1) * 3 * n),
      });
  }
  for (const e of snap.events) addEvent(e);
  for (const w of snap.warnings) addEvent({ kind: 'warning', ...w });
  if (snap.status) {
    // A session that ran its full length with every body still there goes
    // on by itself, from its own numbers, in the same slots: a Kozai cycle
    // is many sessions long. After a merger the slots change, so the reader
    // is asked instead (play() below).
    if (snap.status === 'ok' && snap.alive.every(Boolean)) {
      continueSession(snap);
      return;
    }
    play(false);
    addEvent({ kind: 'stopped', status: snap.status, t: snap.t });
  }
}

/** Go on from a finished session's last snapshot, keeping everything else. */
async function continueSession(last) {
  const next = restartFrom(state.system, last);
  state.session?.stop();
  state.system = next;
  const session = createLiveSession({ spawn }, next, state.options);
  state.session = session;
  try {
    const { snapshot } = await session.ready;
    if (session !== state.session) return;
    accept(snapshot);
    addEvent({ kind: 'continued', t: last.t });
  } catch (err) {
    if (session !== state.session) return;
    notice(t('l3.status.failed', { why: err.message }), false, 'error');
  }
}

// --- The clock --------------------------------------------------------------------

const reduced = () => $('l3-reduced').checked;
const rate = () => BASE_RATE * Number($('l3-speed').value || 1);

function play(on) {
  const last = state.snaps.at(-1);
  if (on && last?.status) {
    // A stopped session goes on as a new one from its last numbers.
    addEvent({ kind: 'continued', t: last.t });
    const next = restartFrom(state.system, last);
    start(next, state.options);
    return;
  }
  state.playing = Boolean(on);
  $('l3-play').textContent = t(state.playing ? 'l3.pause' : 'l3.play');
  $('l3-play').setAttribute('aria-pressed', String(state.playing));
  if (!state.playing) updateTables(true);
}

let pending = null;
function requestAhead() {
  if (pending || !state.session) return;
  const last = state.snaps.at(-1);
  if (!last || last.status) return;
  const lead = rate() * state.interval * 0.15;
  if (last.t >= state.tau + lead && state.playing) return;
  const want = state.playing
    ? Math.ceil((state.tau + 2 * lead - last.t) / state.interval)
    : 0;
  if (want < 1) return;
  const session = state.session;
  pending = session
    .advance(Math.min(256, want))
    .then(snap => {
      if (session === state.session) accept(snap);
    })
    .catch(err => {
      if (err.code !== 'stopped' && session === state.session)
        notice(t('l3.status.failed', { why: err.message }), false, 'error');
    })
    .finally(() => (pending = null));
}

async function stepOnce() {
  if (!state.session || pending) return;
  play(false);
  const k = Math.max(1, Math.round(rate() / 60));
  const session = state.session;
  pending = session.advance(k);
  try {
    const snap = await pending;
    if (session === state.session) {
      accept(snap);
      state.tau = snap.t;
    }
  } finally {
    pending = null;
  }
  updateTables(true);
}

// --- Drawing ------------------------------------------------------------------------

/** The snapshots around the clock, and the frame drawn between them. */
function currentFrame() {
  const snaps = state.snaps;
  if (!snaps.length) return null;
  let b = snaps.length - 1;
  while (b > 0 && snaps[b - 1].t >= state.tau) b--;
  const a = b > 0 ? snaps[b - 1] : null;
  return drawnAt(a, snaps[b], state.tau);
}

/**
 * The newest snapshot at or before the clock, as it is: what the tables,
 * the instruments and the framing read, so no number shown is interpolated.
 */
function numbersFrame() {
  const snaps = state.snaps;
  if (!snaps.length) return null;
  let i = snaps.length - 1;
  while (i > 0 && snaps[i].t > state.tau) i--;
  return exactFrame(snaps[i]);
}

function display(f) {
  const d = toFrame(f, state.frame);
  if (state.follow >= 0 && f.alive[state.follow]) {
    const o = [0, 1, 2].map(k => d.x[3 * state.follow + k]);
    return { ...d, offset: o };
  }
  return { ...d, offset: [0, 0, 0] };
}

function markerSizes(f) {
  const mode = $('l3-size').value;
  const cam = state.scene ? state.scene.readCamera() : state.camera;
  const h = $('l3-canvas').clientHeight || 400;
  const px = cam ? worldPerPixel(cam, h) : 0.01;
  const out = new Float64Array(f.m.length);
  for (let i = 0; i < f.m.length; i++) {
    const r = state.snaps.at(-1).radius[i];
    const marker = px * (f.m[i] > 0 ? 4 : 2.5);
    if (mode === 'radius') out[i] = r > 0 ? r : px * 1;
    else if (mode === 'radius10') out[i] = r > 0 ? 10 * r : px * 1;
    else out[i] = marker;
  }
  return out;
}

function arrowTips(d, alive) {
  if (!$('l3-arrows').checked) return null;
  let vmax = 0;
  for (let i = 0; i < alive.length; i++)
    if (alive[i])
      vmax = Math.max(
        vmax,
        Math.hypot(d.v[3 * i], d.v[3 * i + 1], d.v[3 * i + 2])
      );
  if (!(vmax > 0)) return null;
  // The fastest body's arrow is a fifth of the view's reach, at a round
  // number of time units, which the legend states.
  const reach = state.reach || bounds(d.x, alive).radius;
  const perTime = niceLength((0.2 * reach) / vmax) || (0.2 * reach) / vmax;
  state.arrowScale = perTime;
  const tips = new Float64Array(d.x.length);
  for (let k = 0; k < tips.length; k++) tips[k] = d.x[k] + d.v[k] * perTime;
  return tips;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (state.lastNow ?? now)) / 1000);
  state.lastNow = now;
  const last = state.snaps.at(-1);
  if (state.playing && last) {
    const want = state.tau + rate() * state.interval * dt;
    state.behind = want > last.t;
    state.tau = Math.min(want, last.t);
  }
  requestAhead();
  const f = currentFrame();
  if (!f) return;
  const d = display(f);
  // Trail rows up to the clock, never ahead of the bodies.
  const due = [];
  while (state.pendingTrail.length && state.pendingTrail[0].t <= state.tau)
    due.push(state.pendingTrail.shift());
  if (due.length && state.scene) {
    const n = f.m.length;
    const rows = new Float64Array(due.length * 3 * n);
    due.forEach((r, j) => rows.set(r.row, j * 3 * n));
    state.scene.pushTrail(rows, due.length, n);
  }
  for (const r of due) state.trailTimes.push(r.t);
  if (state.trailTimes.length > state.trailPoints)
    state.trailTimes.splice(0, state.trailTimes.length - state.trailPoints);

  if (state.scene && !state.scene.lost) {
    state.scene.setOffset?.(d.offset);
    state.scene.draw({
      x: d.x,
      alive: f.alive,
      sizes: markerSizes(f),
      arrows: arrowTips(d, f.alive),
      trails: $('l3-trails').checked,
      drops: $('l3-drops').checked,
      grid: $('l3-grid').checked,
      ...instrumentShape(f, d),
    });
    placeLabels(f, d);
    if (!state.firstFrame) {
      state.firstFrame = true;
      performance.mark('l3:first-frame');
    }
  }
  if (now - state.lastLegend > 250) {
    state.lastLegend = now;
    legend();
    clock();
    reading(numbersFrame());
    tell();
  }
  if (state.playing && $('l3-live').checked && now - state.lastTables > 1000) {
    state.lastTables = now;
    updateTables(false);
  }
}

function placeLabels(f, d) {
  const layer = $('l3-labels');
  if (!$('l3-labelson').checked || !state.scene) {
    layer.replaceChildren();
    return;
  }
  const cam = state.scene.readCamera();
  const w = layer.clientWidth;
  const h = layer.clientHeight;
  const spans = [];
  for (let i = 0; i < f.m.length; i++) {
    if (!f.alive[i]) continue;
    const p = [0, 1, 2].map(k => d.x[3 * i + k] - d.offset[k]);
    const s = project(p, cam, w, h);
    if (!s.visible) continue;
    spans.push(
      el('span', {
        class: 'l3-label',
        style: `left:${s.x.toFixed(1)}px;top:${s.y.toFixed(1)}px`,
        text: nameOf(i),
      })
    );
  }
  layer.replaceChildren(...spans);
}

// --- The view's choices ----------------------------------------------------------

function selectedOrbitNormal(f) {
  const i = Number($('l3-follow').value);
  const h = hierarchy(f);
  // The followed body's orbit, else the first body that orbits anything.
  const body =
    i >= 0 && h.primary[i] >= 0 ? i : h.primary.findIndex(p => p >= 0);
  if (body < 0) return null;
  return elementsAbout(f, body, h.primary[body], G())?.normal ?? null;
}

/**
 * How far from the view's center the system reaches: every live body where
 * it is now, and every bound body's apoapsis about its primary, so an
 * eccentric orbit that starts near periapsis is framed whole.
 */
function extent(f, d) {
  const at = i => [0, 1, 2].map(k => d.x[3 * i + k] - d.offset[k]);
  const h = hierarchy(f);
  // Following a body frames what orbits it: its own subsystem.
  const inView = new Set();
  const take = i => {
    inView.add(i);
    for (const c of h.children[i]) take(c);
  };
  if (state.follow >= 0 && h.children[state.follow]?.length) take(state.follow);
  else for (let i = 0; i < f.m.length; i++) inView.add(i);
  let r = 0;
  for (let i = 0; i < f.m.length; i++) {
    if (!f.alive[i] || !inView.has(i)) continue;
    r = Math.max(r, Math.hypot(...at(i)));
    const p = h.primary[i];
    // Only where the primary dominates: two comparable masses have no
    // two-body orbit worth framing (the figure-eight's would be ten times
    // too wide).
    if (p < 0 || !inView.has(p) || f.m[p] < 10 * f.m[i]) continue;
    const e = elementsAbout(f, i, p, G());
    if (e?.bound) r = Math.max(r, Math.hypot(...at(p)) + e.a * (1 + e.e));
  }
  return r > 0 ? r : 1;
}

function resetView() {
  const f = numbersFrame();
  if (!f) return;
  const d = display(f);
  const reach = extent(f, d);
  state.reach = reach;
  const cam = preset($('l3-preset').value, {
    target: [0, 0, 0],
    radius: reach,
    normal: selectedOrbitNormal(f),
    base: { mode: $('l3-projection').value },
  });
  state.camera = cam;
  state.scene?.setCamera(cam);
  // The reference plane: a round half-width past everything, in 20 squares.
  const half = 2 * niceLength(reach);
  state.gridStep = (2 * half) / 20;
  state.scene?.setGrid(2 * half, 20);
}

function changeFrame() {
  const v = $('l3-frame').value;
  if (v === 'inertial' || v === 'barycentric') state.frame = v;
  else if (v.startsWith('body:')) state.frame = { primary: Number(v.slice(5)) };
  else if (v.startsWith('pair:')) {
    const [i, j] = v.slice(5).split(',').map(Number);
    state.frame = { corotating: [i, j] };
  }
  // Trails were drawn in the old frame: start them again in the new one.
  state.scene?.clearTrails();
  state.pendingTrail = [];
  state.trailTimes = [];
  resetView();
}

function fillBodySelects() {
  const n = state.system.bodies.length;
  const bodies = state.system.bodies.map((_, i) => [String(i), nameOf(i)]);
  const f = numbersFrame();
  const h = f ? hierarchy(f) : null;
  const frames = [
    ['barycentric', t('l3.frame.barycentric')],
    ['inertial', t('l3.frame.inertial')],
    ...bodies.map(([i, name]) => [`body:${i}`, t('l3.frame.body', { name })]),
  ];
  if (h)
    for (let i = 0; i < n; i++) {
      const p = h.primary[i];
      if (p >= 0 && f.m[i] > 0)
        frames.push([
          `pair:${p},${i}`,
          t('l3.frame.corotating', { a: nameOf(p), b: nameOf(i) }),
        ]);
    }
  fillSelect($('l3-frame'), frames, 'barycentric');
  state.frame = 'barycentric';
  fillSelect($('l3-follow'), [['-1', t('l3.follow.none')], ...bodies], '-1');
  for (const id of ['l3-a', 'l3-v', 'l3-b'])
    fillSelect($(id), bodies, id === 'l3-b' ? String(Math.min(1, n - 1)) : '0');
  if (n > 2) $('l3-v').value = '1';
  if (n > 2) $('l3-b').value = '2';
}

function fillStaticSelects() {
  fillSelect($('l3-system'), systemItems(), state.choice);
  fillSelect(
    $('l3-speed'),
    SPEEDS.map(s => [String(s), t('l3.speed.x', { x: String(s) })]),
    $('l3-speed').value || '1'
  );
  fillSelect(
    $('l3-preset'),
    PRESETS.map(p => [p, t(`l3.preset.${p}`)]),
    $('l3-preset').value || 'oblique'
  );
  fillSelect(
    $('l3-projection'),
    [
      ['perspective', t('l3.projection.perspective')],
      ['orthographic', t('l3.projection.orthographic')],
    ],
    $('l3-projection').value || 'perspective'
  );
  fillSelect(
    $('l3-size'),
    SIZES.map(s => [s, t(`l3.size.${s}`)]),
    $('l3-size').value || 'marker'
  );
  fillSelect(
    $('l3-tool'),
    TOOLS.map(s => [s, t(`l3.tool.${s}`)]),
    $('l3-tool').value || 'none'
  );
  syncTool();
}

function syncTool() {
  const tool = $('l3-tool').value;
  $('l3-tool-bodies').hidden = tool === 'none';
  $('l3-v-row').hidden = tool !== 'angle';
  $('l3-b-row').hidden = tool === 'elements' || tool === 'none';
  // On the sky: body b as seen from the view's direction, against body a.
  $('l3-a-label').textContent = t(
    tool === 'angle' ? 'l3.tool.from' : 'l3.tool.a'
  );
}

// --- Instruments -----------------------------------------------------------------

function instrumentShape(f, d) {
  const tool = $('l3-tool').value;
  const a = Number($('l3-a').value);
  const b = Number($('l3-b').value);
  const v = Number($('l3-v').value);
  const at = i => [0, 1, 2].map(k => d.x[3 * i + k]);
  const live = (...ids) => ids.every(i => f.alive[i]);
  if (
    (tool === 'distance' || tool === 'relative' || tool === 'sky') &&
    a !== b &&
    live(a, b)
  )
    return { distance: [at(a), at(b)], angle: null };
  if (tool === 'angle' && a !== v && b !== v && live(a, v, b))
    return { distance: null, angle: [at(a), at(v), at(b)] };
  return { distance: null, angle: null };
}

function reading(f) {
  const tool = $('l3-tool').value;
  const a = Number($('l3-a').value);
  const b = Number($('l3-b').value);
  const v = Number($('l3-v').value);
  const out = $('l3-reading');
  let text = '';
  if (tool === 'distance' && a !== b) {
    const r = relative(f, a, b);
    text = t('l3.read.distance', {
      a: nameOf(a),
      b: nameOf(b),
      d: length(r.distance),
    });
  } else if (tool === 'relative' && a !== b) {
    const r = relative(f, a, b);
    text = t('l3.read.relative', {
      a: nameOf(a),
      b: nameOf(b),
      v: speed(r.speed),
      rate: speed(r.radialRate),
    });
  } else if (tool === 'angle' && a !== v && b !== v) {
    text = t('l3.read.angle', {
      a: nameOf(a),
      v: nameOf(v),
      b: nameOf(b),
      angle: deg(angleAt(f, a, v, b)),
    });
  } else if (tool === 'elements') {
    const h = hierarchy(f);
    const p = h.primary[a];
    if (p < 0) text = t('l3.read.noPrimary', { a: nameOf(a) });
    else {
      const e = elementsAbout(f, a, p, G());
      text = e
        ? t(e.bound ? 'l3.read.elements' : 'l3.read.unbound', {
            a: nameOf(a),
            p: nameOf(p),
            sma: length(e.a),
            e: num(e.e),
            i: deg(e.i),
            period: e.period ? time(e.period) : '—',
          })
        : '';
    }
  } else if (tool === 'sky' && a !== b) {
    const r = onTheSky(f, a, b, viewDirection());
    text = t('l3.read.sky', {
      a: nameOf(a),
      b: nameOf(b),
      across: length(r.across),
      along: length(Math.abs(r.along)),
      nearer: nameOf(r.nearer),
    });
  } else if (tool === 'between' && a !== b) {
    const r = between(f, a, b, G());
    text = r
      ? t('l3.read.between', {
          a: nameOf(a),
          b: nameOf(b),
          angle: deg(r.angle),
        })
      : t('l3.read.betweenNone');
  } else if (tool !== 'none') text = t('l3.read.pick');
  if (out.textContent !== text) out.textContent = text;
}

/** From the scene toward the viewer: the line of sight the sky reading uses. */
function viewDirection() {
  const cam = state.scene ? state.scene.readCamera() : state.camera;
  if (!cam) return [0, 0, 1];
  return cam.eye.map((q, k) => q - cam.target[k]);
}

// --- The legend, the clock and the tables ------------------------------------------

function legend() {
  const parts = [];
  parts.push(frameSentence());
  if (state.scene) {
    const cam = state.scene.readCamera();
    const bar = scaleBar(cam, $('l3-canvas').clientHeight || 400);
    parts.push(
      el(
        'span',
        {},
        el('span', {
          class: 'l3-bar',
          style: `width:${Math.round(bar.px)}px`,
        }),
        t(bar.exact ? 'l3.legend.scale' : 'l3.legend.scalePerspective', {
          len: round(bar.length, unitL),
        })
      )
    );
  }
  const size = $('l3-size').value;
  parts.push(t(`l3.legend.size.${size}`));
  if ($('l3-trails').checked && state.trailTimes.length > 1)
    parts.push(
      t('l3.legend.trails', {
        span: time(state.trailTimes.at(-1) - state.trailTimes[0]),
      })
    );
  if ($('l3-drops').checked) parts.push(t('l3.legend.drops'));
  if ($('l3-grid').checked && state.gridStep)
    parts.push(t('l3.legend.grid', { step: round(state.gridStep, unitL) }));
  if ($('l3-arrows').checked && state.arrowScale)
    parts.push(t('l3.legend.arrows', { per: round(state.arrowScale, unitT) }));
  const box = $('l3-legend');
  box.replaceChildren(...parts.map(p => el('div', {}, p)));
}

function clock() {
  const last = state.snaps.at(-1);
  if (!last) return;
  const shown = state.tau;
  let text = t('l3.clock', {
    t: time(shown),
    speed: t('l3.speed.x', { x: $('l3-speed').value }),
  });
  if (state.playing && state.behind) text += ` ${t('l3.clock.behind')}`;
  const c = $('l3-clock');
  if (c.textContent !== text) c.textContent = text;
}

function updateTables(force) {
  if (!force && !$('l3-live').checked) return;
  const f = numbersFrame();
  if (!f) return;
  const d = display(f);
  const h = hierarchy(f);
  const n = f.m.length;

  // The hierarchy, as a nested list.
  const item = i =>
    el(
      'li',
      {},
      el('span', {
        class: 'ui-swatch is-round',
        style: `background:${state.colors[i]}`,
        'aria-hidden': 'true',
      }),
      h.primary[i] >= 0
        ? t(f.m[i] > 0 ? 'l3.tree.orbits' : 'l3.tree.particle', {
            name: nameOf(i),
            primary: nameOf(h.primary[i]),
          })
        : t('l3.tree.root', { name: nameOf(i) }),
      h.children[i].length ? el('ul', {}, h.children[i].map(item)) : null
    );
  $('l3-tree').replaceChildren(...h.roots.map(item));
  const gone = [];
  for (let i = 0; i < n; i++) if (!f.alive[i]) gone.push(nameOf(i));
  if (gone.length)
    $('l3-tree').append(
      el('li', { text: t('l3.tree.merged', { names: gone.join(', ') }) })
    );

  // Positions and speeds in the display frame.
  const head = cols =>
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        cols.map(c => el('th', { scope: 'col', text: c }))
      )
    );
  const state_ = $('l3-state');
  const rows = [];
  for (let i = 0; i < n; i++) {
    if (!f.alive[i]) continue;
    const p = [0, 1, 2].map(k => d.x[3 * i + k]);
    const v = [0, 1, 2].map(k => d.v[3 * i + k]);
    rows.push(
      el(
        'tr',
        {},
        el('th', { scope: 'row', text: nameOf(i) }),
        el('td', { text: `${num(f.m[i])} ${unitM()}` }),
        el('td', { text: num(p[0]) }),
        el('td', { text: num(p[1]) }),
        el('td', { text: num(p[2]) }),
        el('td', { text: length(Math.hypot(...p)) }),
        el('td', { text: speed(Math.hypot(...v)) })
      )
    );
  }
  state_.replaceChildren(
    el('caption', {
      text: t('l3.table.state', { frame: frameSentence(), t: time(f.t) }),
    }),
    head([
      t('l3.col.body'),
      t('l3.col.mass'),
      `x (${unitL()})`,
      `y (${unitL()})`,
      `z (${unitL()})`,
      t('l3.col.fromOrigin'),
      t('l3.col.speed'),
    ]),
    el('tbody', {}, rows)
  );

  // Orbital elements about each body's primary.
  const erows = [];
  for (let i = 0; i < n; i++) {
    const p = h.primary[i];
    if (!f.alive[i] || p < 0) continue;
    const e = elementsAbout(f, i, p, G());
    if (!e) continue;
    erows.push(
      el(
        'tr',
        {},
        el('th', { scope: 'row', text: nameOf(i) }),
        el('td', { text: nameOf(p) }),
        el('td', { text: e.bound ? length(e.a) : t('l3.col.unbound') }),
        el('td', { text: num(e.e) }),
        el('td', { text: deg(e.i) }),
        el('td', { text: turn(e.Omega) }),
        el('td', { text: turn(e.omega) }),
        el('td', { text: e.period ? time(e.period) : '—' })
      )
    );
  }
  $('l3-elements').replaceChildren(
    el('caption', { text: t('l3.table.elements') }),
    head([
      t('l3.col.body'),
      t('l3.col.about'),
      t('l3.col.a'),
      t('l3.col.e'),
      t('l3.col.i'),
      t('l3.col.Omega'),
      t('l3.col.omega'),
      t('l3.col.period'),
    ]),
    el('tbody', {}, erows)
  );

  const last = state.snaps.at(-1);
  if (last) {
    const merged = state.events.some(e => e.kind === 'merger');
    $('l3-conserved').textContent = t(
      merged ? 'l3.conserved.merged' : 'l3.conserved',
      {
        e: num(last.errors.energy, 2),
        l: num(last.errors.angularMomentum, 2),
        p: num(last.errors.momentum, 2),
      }
    );
  }
}

function frameSentence() {
  const key = frameKey(state.frame);
  if (key.id === 'body')
    return t('l3.legend.frameBody', { name: nameOf(key.bodies[0]) });
  if (key.id === 'corotating')
    return t('l3.legend.frameCorotating', {
      a: nameOf(key.bodies[0]),
      b: nameOf(key.bodies[1]),
    });
  return t(`l3.legend.frame.${key.id}`);
}

function eventText(e) {
  const names = (e.bodies || []).map(id => {
    const i = state.system.bodies.findIndex(b => b.id === id);
    return i >= 0 ? nameOf(i) : id;
  });
  const at = time(e.t ?? state.tau);
  switch (e.kind) {
    case 'merger':
      return t('l3.event.merger', { a: names[0], b: names[1], t: at });
    case 'closeApproach':
      return t('l3.event.close', {
        a: names[0],
        b: names[1],
        d: length(e.distance),
        t: at,
      });
    case 'crossing':
      return t(`l3.event.crossing.${e.direction}`, { a: names[0], t: at });
    case 'escape':
      return t('l3.event.escape', {
        a: names[0],
        d: length(e.distance),
        t: at,
      });
    case 'warning':
      return e.code === 'unresolvedEncounter'
        ? t('l3.event.unresolved', { a: names[0], b: names[1] })
        : t('l3.event.nonSymplectic', { scheme: e.scheme });
    case 'stopped':
      return t('l3.event.stopped', { status: e.status, t: at });
    case 'continued':
      return t('l3.event.continued', { t: at });
    default:
      return e.kind;
  }
}

function addEvent(e) {
  state.events.push(e);
  const list = $('l3-events');
  list.append(el('li', { text: eventText(e) }));
  // A long run's crossings would fill the page: keep the latest 200.
  while (list.children.length > 200) list.firstElementChild.remove();
}

// --- Status and notices ------------------------------------------------------------

function status(text) {
  $('l3-clock').textContent = text;
}

function notice(text, keepRunning = true, kind = 'info') {
  const box = $('l3-notice');
  box.hidden = !text;
  box.textContent = text || '';
  box.dataset.kind = kind;
  if (!keepRunning) play(false);
}

// --- What a guide may read and do ---------------------------------------------------
//
// The guide panel (js/lab3d/view/guidePanel.js) is loaded only when a guide
// is opened, and drives the lab through this: it opens systems, sets the
// controls a reader would, and reads the page's own state and numbers. It
// never reaches the kernel or the scene.

function tell() {
  for (const fn of state.listeners) fn();
}

const CONTROLS = {
  preset: 'l3-preset',
  frame: 'l3-frame',
  projection: 'l3-projection',
  follow: 'l3-follow',
  size: 'l3-size',
  tool: 'l3-tool',
  a: 'l3-a',
  b: 'l3-b',
  v: 'l3-v',
  speed: 'l3-speed',
};

const labApi = Object.freeze({
  /** Systems a guide brings: [{id, make: () => system, label: () => text}]. */
  addSystems(list) {
    for (const x of list) state.extras.set(x.id, x);
    fillSelect($('l3-system'), systemItems(), state.choice);
  },
  async open(id, options) {
    $('l3-system').value = id;
    await open(id, options);
    tell();
  },
  /** Set a control as a reader would, by its name in CONTROLS. */
  set(name, value) {
    const el = $(CONTROLS[name]);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event('change'));
    tell();
  },
  play: on => play(on),
  /** The page's choices now, as plain values. */
  read: () => ({
    system: state.choice,
    ids: state.system ? state.system.bodies.map(b => b.id) : [],
    ...Object.fromEntries(
      Object.entries(CONTROLS).map(([k, id]) => [k, $(id).value])
    ),
    playing: state.playing,
    tau: state.tau,
    t0: state.t0 ?? 0,
  }),
  /** The newest snapshot at or before the clock, copied: what the tables show. */
  exact() {
    const f = numbersFrame();
    return (
      f && {
        t: f.t,
        m: Float64Array.from(f.m),
        x: Float64Array.from(f.x),
        v: Float64Array.from(f.v),
        alive: Uint8Array.from(f.alive),
      }
    );
  },
  G: () => G(),
  events: () => state.events.slice(),
  language: () => language(),
  onChange(fn) {
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  },
});

let guidePanel = null;
/** Open the guide panel, loading it the first time. */
async function openGuides(options = {}) {
  if (!guidePanel) {
    // By URL, so the build does not split the lab's bundle: in dist/ the
    // panel is a bundle of its own at this same path (build.js).
    const m = await import(
      new URL('./lab3d/view/guidePanel.js', import.meta.url).href
    );
    guidePanel = m.createGuidePanel($('l3-guide'), labApi);
  }
  await guidePanel.show(options);
}

// --- Setup ---------------------------------------------------------------------------

function setupScene() {
  const canvas = $('l3-canvas');
  try {
    state.scene = createScene(canvas, {
      low: $('l3-low').checked,
      reduced: reduced(),
      onLost: () => notice(t('l3.status.lost')),
      onRestored: () => {
        notice(null);
        resetView();
      },
    });
  } catch (err) {
    state.scene = null;
    state.sceneError = err;
    notice(t('l3.status.noWebgl'));
    return;
  }
  const size = () => {
    const r = canvas.getBoundingClientRect();
    state.scene.resize(r.width, r.height);
    state.scene.fit();
  };
  new ResizeObserver(size).observe(canvas);
  size();
}

function keyboard(e) {
  if (!state.scene) return;
  const step = e.shiftKey ? 0.05 : 0.08;
  const keys = {
    ArrowLeft: () =>
      e.shiftKey ? state.scene.pan(-step, 0) : state.scene.orbit(-0.08, 0),
    ArrowRight: () =>
      e.shiftKey ? state.scene.pan(step, 0) : state.scene.orbit(0.08, 0),
    ArrowUp: () =>
      e.shiftKey ? state.scene.pan(0, step) : state.scene.orbit(0, 0.08),
    ArrowDown: () =>
      e.shiftKey ? state.scene.pan(0, -step) : state.scene.orbit(0, -0.08),
    '+': () => state.scene.zoom(0.85),
    '=': () => state.scene.zoom(0.85),
    '-': () => state.scene.zoom(1 / 0.85),
    ' ': () => play(!state.playing),
    0: () => resetView(),
  };
  PRESETS.forEach((p, i) => {
    keys[String(i + 1)] = () => {
      $('l3-preset').value = p;
      resetView();
    };
  });
  const fn = keys[e.key];
  if (!fn) return;
  e.preventDefault();
  fn();
}

function languageSwitch() {
  const box = $('langSwitch');
  box.replaceChildren(
    ...LANGUAGES.map(l =>
      el('button', {
        type: 'button',
        class: 'ui-button',
        lang: l.id,
        'aria-pressed': String(l.id === language()),
        'data-lang': l.id,
        text: l.endonym,
      })
    )
  );
}

function retranslate() {
  translatePage();
  languageSwitch();
  fillStaticSelects();
  if (state.system) {
    const keep = [
      $('l3-frame').value,
      $('l3-follow').value,
      $('l3-a').value,
      $('l3-v').value,
      $('l3-b').value,
    ];
    fillBodySelects();
    [
      $('l3-frame').value,
      $('l3-follow').value,
      $('l3-a').value,
      $('l3-v').value,
      $('l3-b').value,
    ] = keep;
  }
  $('l3-play').textContent = t(state.playing ? 'l3.pause' : 'l3.play');
  updateTables(true);
  tell();
}

async function init() {
  // A Spanish reader's catalog, before anything is written in it.
  const lang = preferred();
  await loadLanguage(lang);
  setLanguage(lang);
  $('l3-reduced').checked = Boolean(reducedQuery?.matches);
  const weak =
    (navigator.hardwareConcurrency || 8) <= 2 ||
    (navigator.deviceMemory || 8) <= 2;
  $('l3-low').checked = weak;
  state.trailPoints = weak ? 400 : 2000;
  const asked = new URL(location.href).searchParams.get('system');
  if (asked && REFERENCES.some(r => r.id === asked)) state.choice = asked;
  retranslate();
  setupScene();

  $('langSwitch').addEventListener('click', async e => {
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    await loadLanguage(b.dataset.lang);
    await guidePanel?.loadLanguage(b.dataset.lang);
    setLanguage(b.dataset.lang);
    retranslate();
  });
  $('l3-system').addEventListener('change', e => open(e.target.value));
  $('l3-file').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE)
      return notice(t('l3.status.tooLarge'), false, 'error');
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return notice(t('l3.status.notJson'), false, 'error');
    }
    const m = migrateSystem(data);
    if (!m.ok)
      return notice(t('l3.status.refused', { why: m.code }), false, 'error');
    state.fileSystem = m.system;
    open('file');
  });
  $('l3-play').addEventListener('click', () => play(!state.playing));
  $('l3-step').addEventListener('click', stepOnce);
  $('l3-restart').addEventListener('click', () => open(state.choice));
  $('l3-frame').addEventListener('change', changeFrame);
  for (const id of ['l3-preset', 'l3-projection'])
    $(id).addEventListener('change', resetView);
  $('l3-follow').addEventListener('change', e => {
    state.follow = +e.target.value;
    state.scene?.clearTrails();
    resetView();
  });
  $('l3-tool').addEventListener('change', syncTool);
  $('l3-cleartrails').addEventListener('click', () => {
    state.scene?.clearTrails();
    state.trailTimes = [];
  });
  $('l3-low').addEventListener('change', e => {
    state.scene?.setLow(e.target.checked);
    state.trailPoints = e.target.checked ? 400 : 2000;
    if (state.system)
      state.scene?.setBodies(
        state.system.bodies.map((b, i) => ({
          id: b.id,
          color: state.colors[i],
        })),
        state.trailPoints
      );
  });
  $('l3-reduced').addEventListener('change', () =>
    state.scene?.setReduced?.(reduced())
  );
  $('l3-refresh').addEventListener('click', () => updateTables(true));
  $('l3-canvas').addEventListener('keydown', keyboard);
  $('l3-guides').addEventListener('click', () => openGuides());

  // For the browser tests: what the page believes, read-only.
  window.gravitasLab3d = Object.freeze({
    get tau() {
      return state.tau;
    },
    get playing() {
      return state.playing;
    },
    get seq() {
      return state.snaps.at(-1)?.seq ?? -1;
    },
    get lost() {
      return state.scene?.lost ?? null;
    },
    get webgl() {
      return Boolean(state.scene);
    },
    camera: () => state.scene?.readCamera() ?? null,
    frame: () => {
      const f = numbersFrame();
      return (
        f && {
          t: f.t,
          m: [...f.m],
          x: [...f.x],
          v: [...f.v],
          alive: [...f.alive],
        }
      );
    },
  });

  requestAnimationFrame(frame);
  const params = new URL(location.href).searchParams;
  const guide = params.get('guide');
  // A guide opens its own system, so the page does not open one first.
  if (guide) openGuides({ id: guide, path: params.get('path') });
  else open(state.choice);
}

init();
