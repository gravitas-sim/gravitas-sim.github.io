// SPIKE (Prompt 87), not production. A hand-written SVG horizon view, an
// equatorial map and the table that carries the same numbers. No WebGL, no canvas.
import { skyAt, loadStars } from './lib/sky.js';
import { julianDate, calendarDate } from '../../js/observingWindow.js';

const NS = 'http://www.w3.org/2000/svg';
const STR = {
  en: {
    title: 'Sky Lab spike', date: 'Date (UTC)', time: 'Time (UTC)', lat: 'Latitude (degrees north)', lon: 'Longitude (degrees east)',
    back1d: 'Back 1 day', back1h: 'Back 1 hour', fwd1h: 'Forward 1 hour', fwd1d: 'Forward 1 day', play: 'Play', pause: 'Pause',
    horizon: 'Horizon view', equatorial: 'Equatorial map', listCaption: 'Objects above the horizon', name: 'Name', type: 'Type',
    alt: 'Altitude (°)', az: 'Azimuth (°)', mag: 'Magnitude', airmass: 'Airmass', sortBy: 'Sort by', above: 'objects above the horizon',
    sun: 'Sun', moon: 'Moon', planet: 'Planet', star: 'Star', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', north: 'N', east: 'E', south: 'S', west: 'W', noStars: 'Star catalogue not loaded',
    summary: (n, sun, moon) => `Horizon view: ${n} objects above the horizon. Sun altitude ${sun.toFixed(1)} degrees. Moon altitude ${moon.toFixed(1)} degrees. The table below lists every object with the same numbers.`,
  },
  es: {
    title: 'Laboratorio del cielo (prototipo)', date: 'Fecha (UTC)', time: 'Hora (UTC)', lat: 'Latitud (grados norte)', lon: 'Longitud (grados este)',
    back1d: 'Atrás 1 día', back1h: 'Atrás 1 hora', fwd1h: 'Adelante 1 hora', fwd1d: 'Adelante 1 día', play: 'Reproducir', pause: 'Pausa',
    horizon: 'Vista del horizonte', equatorial: 'Mapa ecuatorial', listCaption: 'Objetos sobre el horizonte', name: 'Nombre', type: 'Tipo',
    alt: 'Altura (°)', az: 'Acimut (°)', mag: 'Magnitud', airmass: 'Masa de aire', sortBy: 'Ordenar por', above: 'objetos sobre el horizonte',
    sun: 'Sol', moon: 'Luna', planet: 'Planeta', star: 'Estrella', mercury: 'Mercurio', venus: 'Venus', mars: 'Marte', jupiter: 'Júpiter', saturn: 'Saturno', north: 'N', east: 'E', south: 'S', west: 'O', noStars: 'Catálogo de estrellas no cargado',
    summary: (n, sun, moon) => `Vista del horizonte: ${n} objetos sobre el horizonte. Altura del Sol ${sun.toFixed(1)} grados. Altura de la Luna ${moon.toFixed(1)} grados. La tabla de abajo lista cada objeto con los mismos números.`,
  },
};
export const STRINGS = STR;
const lang = new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'en';
const t = k => STR[lang][k];
document.documentElement.lang = lang;

const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const $ = id => document.getElementById(id);
const R = 470, CX = 500, CY = 500;
const NAME_LABELS = 30;

/** Azimuthal equidistant, zenith at the centre, north up, east left (the sky seen looking up). */
export function project(altDeg, azDeg) {
  const r = ((90 - altDeg) / 90) * R;
  const a = (azDeg * Math.PI) / 180;
  return [CX - r * Math.sin(a), CY - r * Math.cos(a)];
}
export function unproject(x, y) {
  const dx = CX - x, dy = CY - y;
  const r = Math.hypot(dx, dy);
  return { altDeg: 90 - (r / R) * 90, azDeg: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360 };
}

const state = { site: { latDeg: 33.6, lonDeg: -94.7 }, jdUt: julianDate(2026, 3, 20, 3), stars: [], nodes: new Map(), sort: { key: 'altDeg', dir: -1 }, last: null, playing: false };
const fmt2 = x => x.toFixed(2);
const nameOf = o => (o.type === 'star' ? o.name.replace(/^(\d+)(?=[A-Za-z])/, '$1 ').replace(/^(\d+ )?([A-Z][a-z]{2}\d?)(?=[A-Z][a-z]{2}$)/, '$1$2 ') : t(o.id));
const SIZE = m => (m == null ? 7 : Math.max(1.2, 6.2 - 1.05 * m));

function build(svg, objects) {
  svg.textContent = '';
  const g = el('g', {}, svg);
  el('circle', { cx: CX, cy: CY, r: R, class: 'dome' }, g);
  for (const alt of [30, 60]) el('circle', { cx: CX, cy: CY, r: ((90 - alt) / 90) * R, class: 'ring' }, g);
  for (const [k, az] of [['north', 0], ['east', 90], ['south', 180], ['west', 270]]) {
    const [x, y] = project(-6, az);
    const tx = el('text', { x, y, class: 'cardinal', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g);
    tx.textContent = t(k);
  }
  const named = objects.filter(o => o.type === 'star').slice(0, NAME_LABELS).map(o => o.id);
  for (const o of objects) {
    // one group per object, moved by one transform write per frame
    const g2 = el('g', { class: 'obj ' + o.type, id: 'o-' + o.id, 'data-id': o.id }, svg);
    el('circle', { r: o.type === 'sun' ? 12 : o.type === 'moon' ? 11 : o.type === 'planet' ? 5 : SIZE(o.mag), cx: 0, cy: 0 }, g2);
    let lab = null;
    if (o.type !== 'star' || named.includes(o.id)) { lab = el('text', { class: 'lab ' + o.type, 'aria-hidden': 'true', x: 9, y: -7 }, g2); lab.textContent = nameOf(o); }
    state.nodes.set(o.id, { c: g2, lab, shown: true });
  }
}

/** The per-frame write: one transform per visible object, nothing else. */
function draw(model) {
  for (const o of model.objects) {
    const n = state.nodes.get(o.id);
    if (!n) continue;
    if (o.altDeg <= 0) { if (n.shown) { n.c.style.display = 'none'; n.shown = false; } continue; }
    if (!n.shown) { n.c.style.display = ''; n.shown = true; }
    const [x, y] = project(o.altDeg, o.azDeg);
    n.c.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
  }
}

/** The settled write: the numbers the table carries, on the drawing too. */
function settle(model) {
  for (const o of model.objects) {
    if (o.altDeg <= 0) continue;
    const n = state.nodes.get(o.id);
    n.c.setAttribute('data-alt', fmt2(o.altDeg)); n.c.setAttribute('data-az', fmt2(o.azDeg));
  }
}

const EQ_W = 1000, EQ_H = 500;
const eqXY = (ra, dec) => [((360 - ra) / 360) * EQ_W, ((90 - dec) / 180) * EQ_H];
function drawEquatorial(svg, model, site) {
  svg.textContent = '';
  const g = el('g', {}, svg);
  el('rect', { x: 0, y: 0, width: EQ_W, height: EQ_H, class: 'dome' }, g);
  // celestial equator, and the horizon of this site as it is now
  const hor = [];
  const lst = model.lstDeg;
  for (let H = -180; H <= 180; H += 3) {
    const dec = Math.atan(-Math.cos((H * Math.PI) / 180) / Math.tan((site.latDeg * Math.PI) / 180)) * 180 / Math.PI;
    const ra = (((lst - H) % 360) + 360) % 360;
    hor.push([ra, dec]);
  }
  let d = '';
  hor.forEach(([ra, dec], i) => { const [x, y] = eqXY(ra, dec); const prev = hor[i - 1]; d += (i === 0 || (prev && Math.abs(ra - prev[0]) > 180) ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1); });
  el('path', { d, class: 'horizonline' }, g);
  el('line', { x1: 0, x2: EQ_W, y1: EQ_H / 2, y2: EQ_H / 2, class: 'ring' }, g);
  for (const o of model.objects) {
    if (o.type === 'star' && o.mag > 4.0) continue;
    const [x, y] = eqXY(o.raDeg, o.decDeg);
    el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: o.type === 'star' ? SIZE(o.mag) * 0.8 : 6, class: 'obj ' + o.type + (o.altDeg > 0 ? '' : ' below'), 'data-id': o.id }, svg);
  }
}

function typeLabel(o) { return t(o.type); }
function renderTable(model) {
  const body = $('rows');
  const rows = model.objects.filter(o => o.altDeg > 0);
  const { key, dir } = state.sort;
  rows.sort((a, b) => { const x = key === 'name' ? nameOf(a) : (a[key] ?? 99), y = key === 'name' ? nameOf(b) : (b[key] ?? 99); return typeof x === 'string' ? dir * x.localeCompare(y) : dir * (x - y); });
  const frag = document.createDocumentFragment();
  for (const o of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = o.id;
    const cells = [nameOf(o), typeLabel(o), fmt2(o.altDeg), fmt2(o.azDeg), o.mag == null ? '—' : o.mag.toFixed(2), o.airmass == null ? '—' : o.airmass.toFixed(2)];
    cells.forEach((v, i) => { const td = document.createElement(i === 0 ? 'th' : 'td'); if (i === 0) td.scope = 'row'; td.textContent = v; if (i >= 2) td.className = 'num'; tr.appendChild(td); });
    frag.appendChild(tr);
  }
  body.replaceChildren(frag);
  $('count').textContent = `${rows.length} ${t('above')}`;
  return rows.length;
}

export function update() {
  const t0 = performance.now();
  const model = skyAt(state.jdUt, state.site, state.stars);
  const t1 = performance.now();
  state.last = model;
  draw(model);
  state.profile = { compute: t1 - t0, dom: performance.now() - t1 };
  return model;
}
export function updateAll() {
  const model = update();
  settle(model);
  const n = renderTable(model);
  drawEquatorial($('eq'), model, state.site);
  $('horizon').setAttribute('aria-label', t('summary')(n, model.sun.altDeg, model.moon.altDeg));
  const c = calendarDate(state.jdUt);
  const pad = x => String(x).padStart(2, '0');
  $('date').value = `${String(c.year).padStart(4, '0')}-${pad(c.month)}-${pad(c.day)}`;
  $('time').value = `${pad(c.hours)}:${pad(c.minutes)}`;
  return model;
}

function readInputs() {
  const [y, m, d] = $('date').value.split('-').map(Number);
  const [hh, mm] = $('time').value.split(':').map(Number);
  state.jdUt = julianDate(y, m, d, hh + mm / 60);
  state.site = { latDeg: Number($('lat').value), lonDeg: Number($('lon').value) };
}

let timer = null;
function step(days) { state.jdUt += days; updateAll(); }
function loop() { if (!state.playing) return; state.jdUt += 10 / 1440; state.loopRedraws = (state.loopRedraws || 0) + 1; update(); schedTable(); requestAnimationFrame(loop); }
function schedTable() { clearTimeout(timer); timer = setTimeout(() => { if (state.last) { settle(state.last); const n = renderTable(state.last); drawEquatorial($('eq'), state.last, state.site); $('horizon').setAttribute('aria-label', t('summary')(n, state.last.sun.altDeg, state.last.moon.altDeg)); } }, 250); }

function setupHeaders() {
  const defs = [['name', 'name'], ['type', 'type'], ['altDeg', 'alt'], ['azDeg', 'az'], ['mag', 'mag'], ['airmass', 'airmass']];
  const tr = $('head');
  for (const [key, label] of defs) {
    const th = document.createElement('th'); th.scope = 'col'; th.dataset.key = key; th.setAttribute('aria-sort', key === state.sort.key ? 'descending' : 'none');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t(label); b.setAttribute('aria-label', `${t('sortBy')} ${t(label)}`);
    b.addEventListener('click', () => {
      state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : (key === 'name' || key === 'type' ? 1 : (key === 'altDeg' ? -1 : 1)) };
      for (const h of tr.children) h.setAttribute('aria-sort', h.dataset.key === key ? (state.sort.dir > 0 ? 'ascending' : 'descending') : 'none');
      renderTable(state.last);
    });
    th.appendChild(b); tr.appendChild(th);
  }
}

/** Keep label text at a fixed number of screen pixels whatever the drawing's width. */
function fit() {
  for (const id of ['horizon', 'eq']) {
    const svg = $(id); const w = svg.getBoundingClientRect().width || 1000;
    svg.style.setProperty('--px', String(1000 / w));
  }
}

export async function init(starsUrl = './stars.json', limit = 1000) {
  document.title = t('title');
  for (const [id, k] of [['l-date', 'date'], ['l-time', 'time'], ['l-lat', 'lat'], ['l-lon', 'lon'], ['h-horizon', 'horizon'], ['h-eq', 'equatorial']]) $(id).textContent = t(k);
  $('h1').textContent = t('title');
  $('cap').textContent = t('listCaption');
  for (const [id, k] of [['b-1d-', 'back1d'], ['b-1h-', 'back1h'], ['b-1h', 'fwd1h'], ['b-1d', 'fwd1d']]) $(id).textContent = t(k);
  $('play').textContent = t('play');
  try {
    const doc = await (await fetch(starsUrl)).json();
    state.stars = loadStars(doc).sort((a, b) => a.v - b.v).slice(0, limit);
  } catch { $('status').textContent = t('noStars'); }
  setupHeaders();
  fit(); window.addEventListener('resize', fit);
  $('lat').value = state.site.latDeg; $('lon').value = state.site.lonDeg;
  const model = skyAt(state.jdUt, state.site, state.stars);
  build($('horizon'), model.objects);
  updateAll();
  for (const id of ['date', 'time', 'lat', 'lon']) $(id).addEventListener('change', () => { readInputs(); updateAll(); });
  $('b-1d-').onclick = () => step(-1); $('b-1h-').onclick = () => step(-1 / 24); $('b-1h').onclick = () => step(1 / 24); $('b-1d').onclick = () => step(1);
  $('play').onclick = () => { state.playing = !state.playing; $('play').textContent = t(state.playing ? 'pause' : 'play'); $('play').setAttribute('aria-pressed', String(state.playing)); if (state.playing) loop(); else updateAll(); };
  window.skyLab = { state, update, updateAll, project, unproject, setTime: jd => { state.jdUt = jd; return updateAll(); }, setSite: (lat, lon) => { state.site = { latDeg: lat, lonDeg: lon }; return updateAll(); } };
  window.skyReady = true;
}
