// =============================================================================
// /sky/: the Sky Lab
// -----------------------------------------------------------------------------
// Roadmap II Prompt 88 (SKY_LAB.md). What is up, where, and when, for any place
// and time from 1900 to 2100: a horizon view and an equatorial map drawn from
// the sky kernel (js/kernels/sky/), a table of everything above the horizon
// that reads the same model, and five instruments. Nothing leaves the browser:
// "My location" asks the browser once, uses the answer here and keeps it
// nowhere. The kernel never reads a clock; the "Now" button does, when pressed.
// The page's prose is in its markup in both languages; the strings built here
// come as English/Spanish pairs.
// =============================================================================

import { julianDate, calendarDate } from './kernels/sky/time.js';
import { meanObliquityDeg } from './kernels/sky/time.js';
import { skyAt } from './kernels/sky/sky.js';
import { loadStars } from './kernels/sky/stars.js';
import { loadStarFile, loadConstellations } from './kernels/sky/packs.js';
import { mountShell } from './shell.js';
import { createHorizon, drawEquatorial, svgFile } from './sky/view.js';
import { fmt, round, prettyDesignation } from './sky/fmt.js';

const $ = id => document.getElementById(id);
const es = () => document.documentElement.lang.startsWith('es');
/** A string in the page's language. */
const L = (en, sp) => (es() ? sp : en);

const SITES = [
  {
    id: 'nac',
    en: 'Nacogdoches, Texas',
    es: 'Nacogdoches, Texas',
    lat: 31.6,
    lon: -94.65,
  },
  {
    id: 'gre',
    en: 'Greenwich, England',
    es: 'Greenwich, Inglaterra',
    lat: 51.4769,
    lon: -0.0005,
  },
  {
    id: 'mk',
    en: 'Mauna Kea, Hawaii',
    es: 'Mauna Kea, Hawái',
    lat: 19.82,
    lon: -155.47,
  },
  {
    id: 'par',
    en: 'Cerro Paranal, Chile',
    es: 'Cerro Paranal, Chile',
    lat: -24.627,
    lon: -70.404,
  },
  {
    id: 'uio',
    en: 'Quito, Ecuador (on the equator)',
    es: 'Quito, Ecuador (en el ecuador)',
    lat: -0.18,
    lon: -78.47,
  },
  {
    id: 'syd',
    en: 'Sydney, Australia',
    es: 'Sídney, Australia',
    lat: -33.87,
    lon: 151.21,
  },
  {
    id: 'tro',
    en: 'Tromsø, Norway',
    es: 'Tromsø, Noruega',
    lat: 69.65,
    lon: 18.96,
  },
];
const PLANET_NAMES = {
  mercury: ['Mercury', 'Mercurio'],
  venus: ['Venus', 'Venus'],
  mars: ['Mars', 'Marte'],
  jupiter: ['Jupiter', 'Júpiter'],
  saturn: ['Saturn', 'Saturno'],
};
/** The key the constellation figures use: "9 Alp CMa" is "Alp CMa". */
const figureKey = d => {
  const t = d.split(' ');
  return t.length === 3 ? t.slice(1).join(' ') : d;
};

const state = {
  site: { latDeg: 31.6, lonDeg: -94.65, name: null },
  jdUt: julianDate(2026, 3, 20, 3),
  stars: [],
  all: [],
  figures: [],
  lines: [],
  model: null,
  sort: { key: 'altDeg', dir: -1 },
  playing: false,
  layers: { lines: true, names: true, magLimit: 4.0 },
  instruments: null,
  built: false,
};
let horizon = null;
let timer = null;

const starName = s =>
  s.name ?? (s.desig ? prettyDesignation(s.desig) : `HR ${s.hr}`);
const planetName = id => PLANET_NAMES[id][es() ? 1 : 0];
const nameOf = o => {
  if (o.type === 'sun') return L('Sun', 'Sol');
  if (o.type === 'moon') return L('Moon', 'Luna');
  if (o.type === 'planet') return planetName(o.id);
  const s = state.byId.get(o.id);
  return s ? starName(s) : o.id;
};
const typeName = t =>
  ({
    sun: L('Sun', 'Sol'),
    moon: L('Moon', 'Luna'),
    planet: L('Planet', 'Planeta'),
    star: L('Star', 'Estrella'),
  })[t];
const f2 = x => fmt(x, 2);
const pad = n => String(n).padStart(2, '0');

function saveFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function visibleStars() {
  return state.all.filter(s => s.v <= state.layers.magLimit);
}

function compute() {
  const stars = visibleStars();
  state.byId = new Map(state.all.map(s => [`hr${s.hr}`, s]));
  state.model = skyAt(state.jdUt, state.site, stars);
  return state.model;
}

function buildHorizon() {
  const stars = visibleStars();
  const ids = new Set(stars.map(s => `hr${s.hr}`));
  const named = new Set(
    stars
      .filter(s => s.name)
      .slice(0, 30)
      .map(s => `hr${s.hr}`)
  );
  const colours = new Map(stars.map(s => [`hr${s.hr}`, s.colourTempK]));
  const model = compute();
  horizon = createHorizon($('skyHorizon'), {
    label: nameOf,
    cardinals: [L('N', 'N'), L('E', 'E'), L('S', 'S'), L('W', 'O')],
    lines: state.lines.filter(([a, b]) => ids.has(a) && ids.has(b)),
  });
  horizon.build(model.objects, named, colours);
  horizon.setLayers(state.layers);
  state.built = true;
}

function summary(rows) {
  const m = state.model;
  return L(
    `Horizon view: ${rows} objects above the horizon. The Sun is ${f2(m.sun.altDeg)} degrees above the horizon and the Moon ${f2(m.moon.altDeg)}. The table below lists every object with the same numbers.`,
    `Vista del horizonte: ${rows} objetos sobre el horizonte. El Sol está a ${f2(m.sun.altDeg)} grados y la Luna a ${f2(m.moon.altDeg)}. La tabla de abajo lista cada objeto con los mismos números.`
  );
}

/** The table: every object above the horizon, with the numbers the drawing uses. */
function renderTable() {
  const m = state.model;
  const rows = m.objects.filter(o => o.altDeg > 0);
  const { key, dir } = state.sort;
  const val = o =>
    key === 'name'
      ? nameOf(o)
      : key === 'type'
        ? typeName(o.type)
        : (o[key] ?? 99);
  rows.sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return typeof x === 'string' ? dir * x.localeCompare(y) : dir * (x - y);
  });
  const frag = document.createDocumentFragment();
  for (const o of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = o.id;
    const cells = [
      nameOf(o),
      typeName(o.type),
      f2(o.altDeg),
      f2(o.azDeg),
      o.mag == null ? '—' : fmt(o.mag, 2),
      o.airmass == null ? '—' : fmt(o.airmass, 2),
    ];
    cells.forEach((v, i) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) td.scope = 'row';
      else if (i >= 2) td.className = 'num';
      td.textContent = v;
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  }
  $('skyRows').replaceChildren(frag);
  $('skyCount').textContent = L(
    `${rows.length} objects above the horizon`,
    `${rows.length} objetos sobre el horizonte`
  );
  $('skyHorizon').setAttribute('aria-label', summary(rows.length));
  return rows;
}

function drawMap() {
  const colours = new Map(state.all.map(s => [`hr${s.hr}`, s.colourTempK]));
  drawEquatorial($('skyEq'), state.model, state.site, {
    colours,
    lines: state.lines,
    showLines: state.layers.lines,
    magLimit: state.layers.magLimit,
    obliquityDeg: meanObliquityDeg(state.model.jdTt),
  });
  $('skyEq').setAttribute(
    'aria-label',
    L(
      "Equatorial map of the same sky: right ascension against declination, with the ecliptic and this place's horizon. The table lists every object above the horizon.",
      'Mapa ecuatorial del mismo cielo: ascensión recta contra declinación, con la eclíptica y el horizonte de este lugar. La tabla lista cada objeto sobre el horizonte.'
    )
  );
}

function readout() {
  const c = calendarDate(state.jdUt);
  $('skyDate').value =
    `${String(c.year).padStart(4, '0')}-${pad(c.month)}-${pad(c.day)}`;
  $('skyTime').value = `${pad(c.hours)}:${pad(c.minutes)}`;
  $('skyLat').value = String(round(state.site.latDeg, 4));
  $('skyLon').value = String(round(state.site.lonDeg, 4));
  const lst = state.model.lstDeg / 15;
  const hh = Math.floor(lst);
  const mm = Math.floor((lst - hh) * 60);
  $('skyStatus').textContent = L(
    `${state.site.name ?? L('Custom place', 'Lugar propio')}: latitude ${f2(state.site.latDeg)}°, longitude ${f2(state.site.lonDeg)}°; ${pad(c.year)}-${pad(c.month)}-${pad(c.day)} ${pad(c.hours)}:${pad(c.minutes)} UTC; local sidereal time ${pad(hh)}h ${pad(mm)}m.`,
    `${state.site.name ?? 'Lugar propio'}: latitud ${f2(state.site.latDeg)}°, longitud ${f2(state.site.lonDeg)}°; ${pad(c.year)}-${pad(c.month)}-${pad(c.day)} ${pad(c.hours)}:${pad(c.minutes)} UTC; tiempo sideral local ${pad(hh)}h ${pad(mm)}m.`
  );
  const note = state.model.planetsInRange
    ? ''
    : L(
        'Planet positions are only drawn from 1800 to 2050, where the series is valid.',
        'Las posiciones de los planetas solo se dibujan de 1800 a 2050, donde la serie es válida.'
      );
  $('skyNote').textContent = note;
}

/** The per-frame update: positions only. */
function frame() {
  compute();
  horizon.draw(state.model.objects);
}

/** Everything, once the sky has settled. */
function settle() {
  if (!state.model) return;
  horizon.settle(state.model.objects);
  renderTable();
  drawMap();
  readout();
  state.instruments?.update();
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(settle, state.playing ? 250 : 0);
}
function update() {
  frame();
  schedule();
}

function readInputs() {
  const [y, mo, d] = $('skyDate').value.split('-').map(Number);
  const [hh, mm] = $('skyTime').value.split(':').map(Number);
  if ([y, mo, d, hh, mm].every(Number.isFinite))
    state.jdUt = clampJd(julianDate(y, mo, d, hh + mm / 60));
  const lat = $('skyLat').valueAsNumber;
  const lon = $('skyLon').valueAsNumber;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    state.site = {
      latDeg: Math.max(-89.9, Math.min(89.9, lat)),
      lonDeg: Math.max(-180, Math.min(180, lon)),
      name: null,
    };
    $('skySite').value = 'custom';
  }
}
const JD_MIN = julianDate(1900, 1, 1, 0);
const JD_MAX = julianDate(2100, 12, 31, 23.99);
const clampJd = jd => Math.max(JD_MIN, Math.min(JD_MAX, jd));

function step(days) {
  state.jdUt = clampJd(state.jdUt + days);
  update();
}

function loop() {
  if (!state.playing) return;
  state.jdUt = clampJd(state.jdUt + 10 / 1440);
  frame();
  schedule();
  requestAnimationFrame(loop);
}

function setPlaying(on) {
  state.playing = on;
  $('skyPlay').textContent = on ? L('Pause', 'Pausa') : L('Play', 'Reproducir');
  $('skyPlay').setAttribute('aria-pressed', String(on));
  if (on) requestAnimationFrame(loop);
  else settle();
}

function fillSites() {
  const sel = $('skySite');
  sel.replaceChildren(
    ...SITES.map(s =>
      Object.assign(document.createElement('option'), {
        value: s.id,
        textContent: L(s.en, s.es),
      })
    ),
    Object.assign(document.createElement('option'), {
      value: 'custom',
      textContent: L(
        'A place of my own (type its latitude and longitude)',
        'Un lugar propio (escribe su latitud y longitud)'
      ),
    })
  );
}
function siteFromSelect() {
  const s = SITES.find(x => x.id === $('skySite').value);
  if (s) state.site = { latDeg: s.lat, lonDeg: s.lon, name: L(s.en, s.es) };
}

function myLocation() {
  const out = $('skyGeoNote');
  if (!navigator.geolocation) {
    out.textContent = L(
      'This browser cannot say where you are. Type a latitude and longitude instead.',
      'Este navegador no puede decir dónde estás. Escribe una latitud y una longitud.'
    );
    return;
  }
  out.textContent = L('Asking your browser…', 'Preguntando a tu navegador…');
  navigator.geolocation.getCurrentPosition(
    p => {
      state.site = {
        latDeg: p.coords.latitude,
        lonDeg: p.coords.longitude,
        name: L('My location', 'Mi ubicación'),
      };
      $('skySite').value = 'custom';
      out.textContent = L(
        'Using your location here only. It is not sent anywhere and not saved.',
        'Usando tu ubicación solo aquí. No se envía a ningún lugar ni se guarda.'
      );
      update();
    },
    () => {
      out.textContent = L(
        'Your browser did not give a location (you may have declined). Choose a place from the list or type one.',
        'Tu navegador no dio una ubicación (quizá la rechazaste). Elige un lugar de la lista o escribe uno.'
      );
    },
    { maximumAge: 600000, timeout: 15000 }
  );
}

function setupHeaders() {
  const defs = [
    ['name', L('Name', 'Nombre')],
    ['type', L('Type', 'Tipo')],
    ['altDeg', L('Altitude (°)', 'Altura (°)')],
    ['azDeg', L('Azimuth (°)', 'Acimut (°)')],
    ['mag', L('Magnitude', 'Magnitud')],
    ['airmass', L('Airmass', 'Masa de aire')],
  ];
  const tr = $('skyHead');
  tr.replaceChildren();
  for (const [key, label] of defs) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.dataset.key = key;
    th.setAttribute(
      'aria-sort',
      key === state.sort.key
        ? state.sort.dir > 0
          ? 'ascending'
          : 'descending'
        : 'none'
    );
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-label', L(`Sort by ${label}`, `Ordenar por ${label}`));
    b.addEventListener('click', () => {
      state.sort = {
        key,
        dir:
          state.sort.key === key
            ? -state.sort.dir
            : key === 'name' || key === 'type'
              ? 1
              : key === 'altDeg'
                ? -1
                : 1,
      };
      for (const h of tr.children)
        h.setAttribute(
          'aria-sort',
          h.dataset.key === key
            ? state.sort.dir > 0
              ? 'ascending'
              : 'descending'
            : 'none'
        );
      renderTable();
    });
    th.appendChild(b);
    tr.appendChild(th);
  }
}

/** Keep label text at a fixed number of screen pixels whatever the drawing's width. */
function fit() {
  for (const id of ['skyHorizon', 'skyEq']) {
    const svg = $(id);
    const w = svg.getBoundingClientRect().width || 1000;
    svg.style.setProperty('--px', String(1000 / w));
  }
}

async function exportTable() {
  const { toCsv } = await import('./csv.js');
  const m = state.model;
  const head = [
    'id',
    'name',
    'type',
    'altitude_deg',
    'azimuth_deg',
    'magnitude',
    'airmass',
    'ra_deg',
    'dec_deg',
  ];
  const rows = [head];
  for (const o of m.objects.filter(x => x.altDeg > 0)) {
    rows.push([
      o.id,
      nameOf(o),
      o.type,
      round(o.altDeg, 4),
      round(o.azDeg, 4),
      o.mag ?? '',
      o.airmass == null ? '' : round(o.airmass, 4),
      round(o.raDeg, 4),
      round(o.decDeg, 4),
    ]);
  }
  const c = calendarDate(state.jdUt);
  const meta = `# Gravitas Sky Lab: latitude ${state.site.latDeg}, longitude ${state.site.lonDeg}, UT ${c.year}-${pad(c.month)}-${pad(c.day)} ${pad(c.hours)}:${pad(c.minutes)}, JD ${state.jdUt}; stars: Yale Bright Star Catalogue (Hoffleit and Warren), CDS V/50`;
  saveFile('sky-lab-table.csv', `${toCsv(rows)}${meta}\r\n`, 'text/csv');
}

async function openInstruments() {
  if (state.instruments) return;
  const host = $('skyInstrumentHost');
  host.textContent = L(
    'Loading the instruments…',
    'Cargando los instrumentos…'
  );
  const { mountInstruments } = await import('./sky/instruments.js');
  host.textContent = '';
  state.instruments = mountInstruments(host, {
    state,
    L,
    saveFile,
    stars: state.all,
    starName,
    planetName,
  });
  state.instruments.update();
}

async function init() {
  mountShell({
    onLanguage: () => {
      if (!state.built) return;
      fillSitesKeep();
      setupHeaders();
      buildHorizon();
      settle();
      frame();
    },
  });
  fillSites();
  siteFromSelect();
  setupHeaders();
  fit();
  window.addEventListener('resize', fit);
  const reduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (reduced) {
    $('skyPlay').disabled = true;
    $('skyReduced').hidden = false;
  }
  let doc;
  try {
    doc = await loadStarFile();
  } catch {
    $('skyStatus').textContent = L(
      'The star catalogue could not be loaded. The Sun, Moon and planets are still drawn.',
      'No se pudo cargar el catálogo de estrellas. El Sol, la Luna y los planetas se dibujan igual.'
    );
    doc = { stars: [] };
  }
  state.all = loadStars(doc);
  state.byId = new Map(state.all.map(s => [`hr${s.hr}`, s]));
  const { CONSTELLATIONS } = await loadConstellations();
  state.figures = CONSTELLATIONS;
  const byKey = new Map(state.all.map(s => [figureKey(s.desig), `hr${s.hr}`]));
  state.lines = CONSTELLATIONS.flatMap(c =>
    c.lines.map(([a, b]) => [byKey.get(a), byKey.get(b)])
  ).filter(([a, b]) => a && b);
  buildHorizon();
  settle();
  frame();
  wire();
  window.skyLab = { state, update, settle };
  window.skyReady = true;
}
function fillSitesKeep() {
  const v = $('skySite').value;
  fillSites();
  $('skySite').value = v;
}

function wire() {
  $('skySite').addEventListener('change', () => {
    siteFromSelect();
    update();
  });
  for (const id of ['skyDate', 'skyTime', 'skyLat', 'skyLon']) {
    $(id).addEventListener('change', () => {
      readInputs();
      update();
    });
  }
  $('skyBack1d').onclick = () => step(-1);
  $('skyBack1h').onclick = () => step(-1 / 24);
  $('skyFwd1h').onclick = () => step(1 / 24);
  $('skyFwd1d').onclick = () => step(1);
  $('skyNow').onclick = () => {
    state.jdUt = clampJd(Date.now() / 86400000 + 2440587.5);
    update();
  };
  $('skyPlay').onclick = () => setPlaying(!state.playing);
  $('skyGeo').onclick = myLocation;
  $('skyLines').addEventListener('change', () => {
    state.layers.lines = $('skyLines').checked;
    horizon.setLayers(state.layers);
    update();
  });
  $('skyNames').addEventListener('change', () => {
    state.layers.names = $('skyNames').checked;
    horizon.setLayers(state.layers);
  });
  $('skyMag').addEventListener('change', () => {
    state.layers.magLimit = Number($('skyMag').value);
    buildHorizon();
    update();
  });
  $('skyExportHorizon').onclick = () =>
    saveFile(
      'sky-lab-horizon.svg',
      svgFile(
        $('skyHorizon'),
        L('Sky Lab horizon view', 'Laboratorio del cielo: vista del horizonte')
      ),
      'image/svg+xml'
    );
  $('skyExportMap').onclick = () =>
    saveFile(
      'sky-lab-map.svg',
      svgFile(
        $('skyEq'),
        L('Sky Lab equatorial map', 'Laboratorio del cielo: mapa ecuatorial')
      ),
      'image/svg+xml'
    );
  $('skyExportTable').onclick = exportTable;
  const det = $('skyInstruments');
  det.addEventListener('toggle', () => {
    if (det.open) openInstruments();
  });
  if (det.open) openInstruments();
}

init();
