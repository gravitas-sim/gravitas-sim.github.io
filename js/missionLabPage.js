// =============================================================================
// The mission lab (/mission/lab/)
// -----------------------------------------------------------------------------
// One mission to Mars on JPL's DE441 ephemeris (MISSION_LAB.md): a plan the
// reader edits (the maneuver editor), what the Worker makes of it (the
// patched-conic design, the spacecraft flown directly, the delta-v and
// propellant it costs), an interactive timeline, three geometry views with
// every number also in tables, the 2026 transfer window, the reference
// cases, and three guides beside it that check the reader against their own
// lab. The page never computes an orbit: js/mission/labWorker.js does.
// =============================================================================

import {
  LANGUAGES,
  language,
  loadLanguage,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './mission/lab/i18n.js';
import { MISSION_API, createMission } from './mission/api.js';
import { DEFAULT_PLAN, PULLER_IDS } from './mission/lab/defaults.js';
import { DEFAULT_WINDOW, bestOf, turnCost } from './mission/lab/curriculum.js';
import { createGuidePanel } from './mission/lab/guidePanel.js';
import { JD_J2000, dateOfJd } from './mission/ephemeris.js';
import { planBytes, planFile } from './mission/plan.js';

const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const AU = 149597870.7;
const lab = createMission({
  spawn: () =>
    new Worker(new URL('./mission/labWorker.js', import.meta.url), {
      type: 'module',
    }),
});
const clone = x => JSON.parse(JSON.stringify(x));
const state = { plan: clone(DEFAULT_PLAN), mission: null, window: null };
let windowRun = null;
let guide = null;

// --- Building blocks ------------------------------------------------------------

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
const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};
const num = (v, digits = 5) =>
  typeof v !== 'number' || !Number.isFinite(v)
    ? '–'
    : v === 0
      ? '0'
      : Math.abs(v) >= 1e-3 && Math.abs(v) < 1e9
        ? new Intl.NumberFormat(language(), {
            maximumSignificantDigits: digits,
          }).format(v)
        : v.toExponential(digits - 1);
const ms = kms => t('ml.unit.ms', { v: num(kms * 1000, 5) });
const kms = v => t('ml.unit.kms', { v: num(v) });
const km = v => t('ml.unit.km', { v: num(v, 6) });
const kg = v => t('ml.unit.kg', { v: num(v, 5) });
const days = v => t('ml.unit.days', { v: num(v, 4) });
const date = jd => dateOfJd(jd);

function table(caption, head, rows) {
  return el(
    'table',
    { class: 'ui-table' },
    el('caption', { text: caption }),
    el(
      'thead',
      {},
      el(
        'tr',
        {},
        head.map(h => el('th', { scope: 'col', text: h }))
      )
    ),
    el(
      'tbody',
      {},
      rows.map(r =>
        el(
          'tr',
          {},
          r.map((c, i) =>
            i === 0
              ? el('th', { scope: 'row', text: c })
              : c !== null && typeof c === 'object'
                ? el('td', {}, c)
                : el('td', { text: c })
          )
        )
      )
    )
  );
}
const facts = (caption, pairs) =>
  table(caption, [t('ml.col.quantity'), t('ml.col.value')], pairs);

// --- The plan, as the editor holds it --------------------------------------------

const FIELDS = {
  'parking.altitude': 'ml-parking',
  'depot.altitude': 'ml-depot',
  'depot.phaseDeg': 'ml-phase',
  'depart.date': 'ml-date',
  'depart.tofDays': 'ml-tof',
  'arrive.periapsisAltitude': 'ml-peri',
  'arrive.apoapsisAltitude': 'ml-apo',
  'correct.day': 'ml-correct-day',
  'vehicle.dryKg': 'ml-dry',
  'vehicle.ispS': 'ml-isp',
};
const numberIn = id => {
  const s = $(id).value.trim().replace(',', '.');
  return s === '' ? NaN : Number(s);
};

function readPlan() {
  return {
    parking: { altitude: numberIn('ml-parking') },
    depot: { altitude: numberIn('ml-depot'), phaseDeg: numberIn('ml-phase') },
    depart: { date: $('ml-date').value.trim(), tofDays: numberIn('ml-tof') },
    arrive: {
      periapsisAltitude: numberIn('ml-peri'),
      apoapsisAltitude: numberIn('ml-apo'),
    },
    correct: $('ml-correct-on').checked
      ? { day: numberIn('ml-correct-day') }
      : null,
    vehicle: { dryKg: numberIn('ml-dry'), ispS: numberIn('ml-isp') },
    direct: {
      bodies: PULLER_IDS.filter(id => $(`ml-body-${id}`).checked),
      start:
        document.querySelector('input[name="ml-start"]:checked')?.value ??
        'periapsis',
    },
  };
}

function writePlan(p) {
  const set = (id, v) => ($(id).value = String(v));
  set('ml-parking', p.parking.altitude);
  set('ml-depot', p.depot.altitude);
  set('ml-phase', p.depot.phaseDeg);
  set('ml-date', p.depart.date);
  set('ml-tof', p.depart.tofDays);
  set('ml-peri', p.arrive.periapsisAltitude);
  set('ml-apo', p.arrive.apoapsisAltitude);
  $('ml-correct-on').checked = !!p.correct;
  if (p.correct) set('ml-correct-day', p.correct.day);
  set('ml-dry', p.vehicle.dryKg);
  set('ml-isp', p.vehicle.ispS);
  for (const id of PULLER_IDS)
    $(`ml-body-${id}`).checked = p.direct.bodies.includes(id);
  for (const r of document.querySelectorAll('input[name="ml-start"]'))
    r.checked = r.value === p.direct.start;
}

function markProblems(problems = []) {
  for (const id of Object.values(FIELDS)) $(id).removeAttribute('aria-invalid');
  for (const p of problems) {
    const id = FIELDS[p.path];
    if (id) $(id).setAttribute('aria-invalid', 'true');
  }
}

// --- Computing ------------------------------------------------------------------

async function compute() {
  const plan = readPlan();
  $('ml-go').disabled = true;
  $('ml-status').textContent = t('ml.status.working');
  try {
    const result = await lab.solve({ kind: 'mission', plan }).done;
    state.plan = plan;
    if (!result.ok) {
      state.mission = result;
      markProblems();
      $('ml-status').textContent = t('ml.status.refused', {
        why: t(`ml.refused.${result.status}`),
      });
    } else {
      state.mission = result;
      markProblems();
      $('ml-status').textContent = t('ml.status.done');
      $('ml-save-plan').disabled = false;
    }
  } catch (err) {
    state.plan = plan;
    state.mission = null;
    markProblems(err.problems);
    $('ml-status').textContent = err.problems
      ? t('ml.status.refused', {
          why: err.problems
            .map(p =>
              t('ml.problem', {
                field: t(`ml.field.${p.path}`),
                why: t(`ml.problem.${p.code}`),
              })
            )
            .join(' '),
        })
      : t('ml.status.failed', { why: err.message });
  } finally {
    $('ml-go').disabled = false;
    render();
  }
}

/** What a guide's "Show me" or the reference run does: a plan patch, or a window. */
async function apply(patch) {
  const { window: w, ...planPatch } = patch;
  if (w) await computeWindow(w);
  if (Object.keys(planPatch).length) {
    writePlan({ ...readPlan(), ...clone(planPatch) });
    await compute();
  }
}

// --- The timeline ---------------------------------------------------------------

function renderTimeline() {
  const m = state.mission?.ok ? state.mission : null;
  const slider = $('ml-slider');
  if (!m) {
    $('ml-timeline').replaceChildren();
    slider.disabled = true;
    return;
  }
  slider.disabled = false;
  slider.max = String(state.plan.depart.tofDays);
  if (slider.valueAsNumber > state.plan.depart.tofDays) slider.value = '0';
  const burn = Object.fromEntries(m.burns.map(b => [b.id, b]));
  const rows = m.events.map(e => {
    const day = e.jd - m.patched.departJd;
    const go =
      day >= 0
        ? (() => {
            const b = el('button', {
              type: 'button',
              class: 'ui-link',
              text: t('ml.timeline.show'),
            });
            b.addEventListener('click', () => {
              slider.value = String(Math.round(day));
              moved();
            });
            return b;
          })()
        : '';
    return [
      t(`ml.event.${e.id}`),
      date(e.jd),
      burn[e.id] ? ms(burn[e.id].dv) : '',
      go,
    ];
  });
  $('ml-timeline').replaceChildren(
    table(
      t('ml.timeline.caption'),
      [t('ml.col.event'), t('ml.col.date'), t('ml.col.dv'), t('ml.col.view')],
      rows
    )
  );
}

/** Where things are on a sampled path at a fraction of it. */
function along(points, f) {
  const list = points.filter(Boolean);
  const x = Math.max(0, Math.min(1, f)) * (list.length - 1);
  const i = Math.min(list.length - 2, Math.floor(x));
  const u = x - i;
  return list[i].map((c, k) => c + (list[i + 1][k] - c) * u);
}

function moved() {
  const m = state.mission?.ok ? state.mission : null;
  if (!m) return;
  const day = Number($('ml-slider').value);
  const f = day / state.plan.depart.tofDays;
  const v = m.views;
  const at = {
    earth: along(v.earth, f),
    mars: along(v.mars, f),
    patched: along(
      v.arc.map(p => p.r),
      f
    ),
    direct: along(
      v.direct.map(p => p.r),
      f
    ),
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  $('ml-slider-out').textContent = t('ml.timeline.at', {
    day,
    date: date(m.patched.departJd + day),
    patched: km(dist(at.patched, at.mars)),
    direct: km(dist(at.direct, at.mars)),
  });
  $('ml-positions').replaceChildren(
    table(
      t('ml.views.positions', { date: date(m.patched.departJd + day) }),
      [t('ml.col.body'), t('ml.col.sun'), t('ml.col.mars')],
      ['earth', 'mars', 'patched', 'direct'].map(id => [
        t(`ml.views.${id}`),
        t('ml.unit.au', { v: num(Math.hypot(...at[id]) / AU, 5) }),
        id === 'mars' ? '' : km(dist(at[id], at.mars)),
      ])
    )
  );
  drawViews(at);
}

// --- Geometry views --------------------------------------------------------------

const COLORS = {
  earth: '#5ab0ff',
  mars: '#ff7a59',
  patched: '#f5d76e',
  direct: '#9be38a',
  sun: '#ffd24a',
};
const Z_STRETCH = 20;
/** The departure view's half-width, in periapsis radii. */
const DEPARTURE_FRAME = 10;

function view(title, caption, paths, markers, project, extent) {
  const size = 300;
  const s = svg('svg', {
    viewBox: `0 0 ${size} ${size}`,
    role: 'img',
    'aria-label': caption,
  });
  const map = p => {
    const [a, b] = project(p);
    return [
      size / 2 + (a / extent) * (size / 2 - 10),
      size / 2 - (b / extent) * (size / 2 - 10),
    ];
  };
  for (const [id, pts, dash] of paths) {
    const list = pts.filter(Boolean).map(map);
    if (list.length < 2) continue;
    s.append(
      svg('polyline', {
        points: list.map(p => p.map(x => x.toFixed(1)).join(',')).join(' '),
        fill: 'none',
        stroke: COLORS[id],
        'stroke-width': 1.5,
        ...(dash ? { 'stroke-dasharray': '4 3' } : {}),
      })
    );
  }
  for (const [id, p, r] of markers) {
    const [x, y] = map(p);
    s.append(
      svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: COLORS[id] })
    );
  }
  return el('figure', {}, s, el('figcaption', { text: title }));
}

function drawViews(at) {
  const m = state.mission;
  const v = m.views;
  const all = [
    ...v.earth,
    ...v.mars,
    ...v.arc.map(p => p.r),
    ...v.direct.map(p => p.r),
  ].filter(Boolean);
  const extent = Math.max(...all.map(p => Math.hypot(p[0], p[1]))) * 1.08;
  const paths = [
    ['earth', v.earth],
    ['mars', v.mars],
    ['patched', v.arc.map(p => p.r)],
    ['direct', v.direct.map(p => p.r), true],
  ];
  const markers = [
    ['sun', [0, 0, 0], 4],
    ['earth', at.earth, 3.5],
    ['mars', at.mars, 3.5],
    ['patched', at.patched, 3],
    ['direct', at.direct, 3],
  ];
  const dep = v.departure;
  // Ten periapsis radii: the depot orbit is seen, and the hyperbola leaves
  // the frame along its way out (the caption gives the scale).
  const depExtent = DEPARTURE_FRAME * dep.rp;
  $('ml-views').replaceChildren(
    view(
      t('ml.views.top'),
      t('ml.views.topAlt'),
      paths,
      markers,
      p => [p[0], p[1]],
      extent
    ),
    view(
      t('ml.views.side', { k: Z_STRETCH }),
      t('ml.views.sideAlt', { k: Z_STRETCH }),
      paths,
      markers,
      p => [p[0], p[2] * Z_STRETCH],
      extent
    ),
    view(
      t('ml.views.departure', { k: DEPARTURE_FRAME }),
      t('ml.views.departureAlt', { rp: km(dep.rp), vc: kms(dep.vc) }),
      [
        ['earth', dep.circle],
        ['patched', dep.hyperbola],
      ],
      [['earth', [0, 0, 0], 4]],
      p => [p[0], p[1]],
      depExtent
    )
  );
  $('ml-legend').replaceChildren(
    ...['earth', 'mars', 'patched', 'direct'].map(id =>
      el(
        'span',
        {},
        el('span', { class: 'ui-swatch', style: `background:${COLORS[id]}` }),
        t(`ml.views.${id}`)
      )
    )
  );
}

// --- Results -------------------------------------------------------------------

function renderResults() {
  const m = state.mission?.ok ? state.mission : null;
  if (!m) {
    $('ml-results').replaceChildren();
    $('ml-views').replaceChildren();
    $('ml-positions').replaceChildren();
    $('ml-legend').replaceChildren();
    $('ml-slider-out').textContent = '';
    return;
  }
  const p = m.patched;
  const d = m.direct;
  const r = m.rendezvous;
  const out = [
    facts(t('ml.results.earthOrbit'), [
      [
        t('ml.results.lead'),
        t('ml.unit.deg', { v: num((r.lead * 180) / Math.PI, 4) }),
      ],
      [t('ml.results.wait'), t('ml.unit.min', { v: num(r.wait / 60, 4) })],
      [t('ml.results.rvTime'), t('ml.unit.min', { v: num(r.tof / 60, 4) })],
      [t('ml.results.rvTotal'), ms(r.total)],
      [t('ml.results.turn5'), t('ml.unit.ms', { v: num(turnCost(state), 5) })],
    ]),
    facts(t('ml.results.patched'), [
      [t('ml.results.depart'), date(p.departJd)],
      [t('ml.results.arrive'), date(p.arriveJd)],
      [t('ml.results.c3'), t('ml.unit.c3', { v: num(p.c3) })],
      [t('ml.results.vinfDep'), kms(p.vinfDep)],
      [
        t('ml.results.declination'),
        t('ml.unit.deg', { v: num((p.declination * 180) / Math.PI, 4) }),
      ],
      [t('ml.results.vinfArr'), kms(p.vinfArr)],
      [t('ml.results.departDv'), ms(p.departDv)],
      [t('ml.results.captureDv'), ms(p.captureDv)],
      [
        t('ml.results.captureOrbit'),
        t('ml.unit.h', { v: num(p.captureOrbitPeriod / 3600, 4) }),
      ],
    ]),
    facts(t('ml.results.direct'), [
      [
        t('ml.results.bodies'),
        d.bodies.length
          ? d.bodies.map(b => t(`ml.body.${b}`)).join(', ')
          : t('ml.results.sunOnly'),
      ],
      [
        t('ml.results.start'),
        t(`ml.plan.start${d.start === 'center' ? 'Center' : 'Periapsis'}`),
      ],
      [t('ml.results.miss'), km(d.missKm)],
      ...(d.closestKm !== null
        ? [
            [
              t('ml.results.closest'),
              t('ml.results.closestValue', {
                km: km(d.closestKm),
                date: date(p.departJd + d.closestDay),
              }),
            ],
          ]
        : []),
      ...(d.marsDriftKm !== null
        ? [[t('ml.results.drift'), km(d.marsDriftKm)]]
        : []),
    ]),
  ];
  if (m.correction)
    out.push(
      facts(t('ml.results.correction'), [
        [t('ml.results.correctionDay'), days(m.correction.day)],
        [t('ml.results.correctionDv'), ms(m.correction.dv)],
        [t('ml.results.aims'), String(m.correction.aims)],
        [t('ml.results.missAfter'), km(m.correction.missKm)],
      ])
    );
  const b = m.budget;
  const rows = [...b.earthOrbit.rows, ...b.interplanetary.rows].map(r => [
    t(`ml.event.${r.id}`),
    date(r.jd),
    ms(r.dv),
    kg(r.propellant),
    kg(r.massBefore),
  ]);
  out.push(
    table(
      t('ml.results.budget'),
      [
        t('ml.col.burn'),
        t('ml.col.date'),
        t('ml.col.dv'),
        t('ml.col.propellant'),
        t('ml.col.massBefore'),
      ],
      [
        ...rows,
        [
          t('ml.results.total'),
          '',
          ms(b.total),
          kg(b.earthOrbit.propellantKg + b.interplanetary.propellantKg),
          '',
        ],
      ]
    ),
    facts(t('ml.results.resources'), [
      [t('ml.results.launchLoad'), kg(b.earthOrbit.propellantKg)],
      [t('ml.results.depotLoad'), kg(b.interplanetary.propellantKg)],
      [t('ml.results.exhaust'), kms(b.interplanetary.exhaustKmS)],
    ]),
    facts(t('ml.results.solver'), [
      [t('ml.results.solverStatus'), t('ml.results.solverOk')],
      [t('ml.results.iterations'), String(p.solver.iterations)],
      [t('ml.results.residual'), num(p.solver.residual, 2)],
      [t('ml.results.solverMiss'), num(p.solver.miss, 2)],
    ])
  );
  $('ml-results').replaceChildren(...out);
  moved();
}

function render() {
  renderTimeline();
  renderResults();
  guide?.render();
  window.__missionLab = {
    plan: state.plan,
    mission: state.mission,
    window: state.window && {
      status: state.window.status,
      best: state.window.best,
      rows: state.window.rows,
    },
  };
}

// --- The launch window -----------------------------------------------------------

const RAMP = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];
function colour(f) {
  const x = Math.min(1, Math.max(0, f)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const u = x - i;
  return `rgb(${RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * u)).join(',')})`;
}

function candidates(w) {
  const o = w.options;
  const cells = [];
  for (let i = 0; i < w.rows; i++)
    for (let j = 0; j < o.tofSteps; j++) {
      const k = i * o.tofSteps + j;
      if (w.cellStatus[k] !== 0) continue;
      cells.push({
        depart: o.departStart + (o.departSpan * i) / (o.departSteps - 1),
        tof: o.tofMin + ((o.tofMax - o.tofMin) * j) / (o.tofSteps - 1),
        c3: w.c3[k],
        vinf: w.vinf[k],
        total: w.total[k],
      });
    }
  const by = f => cells.reduce((a, c) => (f(c) < f(a) ? c : a));
  const cheap = by(c => c.total);
  const fast = cells
    .filter(c => c.total <= cheap.total * 1.1)
    .reduce((a, c) => (c.tof < a.tof ? c : a));
  return [
    ['cheapest', cheap],
    ['lowC3', by(c => c.c3)],
    ['lowVinf', by(c => c.vinf)],
    ['fastest', fast],
  ];
}

function drawWindow(w) {
  const o = w.options;
  const c = $('ml-window-canvas');
  const ctx = c.getContext('2d');
  const [W, H] = [c.width, c.height];
  ctx.fillStyle = '#0b0d17';
  ctx.fillRect(0, 0, W, H);
  const lo = w.best.total;
  const xs = i => Math.round((i * W) / o.departSteps);
  const ys = j => H - Math.round((j * H) / o.tofSteps);
  for (let i = 0; i < w.rows; i++)
    for (let j = 0; j < o.tofSteps; j++) {
      const k = i * o.tofSteps + j;
      ctx.fillStyle =
        w.cellStatus[k] !== 0 ? '#3a3f52' : colour((w.total[k] - lo) / lo);
      ctx.fillRect(xs(i), ys(j + 1), xs(i + 1) - xs(i), ys(j) - ys(j + 1));
    }
  c.hidden = false;
  const b = bestOf(w);
  c.setAttribute(
    'aria-label',
    t('ml.window.alt', {
      d1: date(JD_J2000 + o.departStart),
      d2: date(JD_J2000 + o.departStart + o.departSpan),
      t1: o.tofMin,
      t2: o.tofMax,
      best: kms(b.total),
      date: b.date,
      tof: b.tofDays,
    })
  );
  $('ml-window-legend').replaceChildren(
    el(
      'span',
      {},
      el('span', { class: 'ui-swatch', style: `background:${colour(0)}` }),
      t('ml.window.cheap', { v: kms(lo) })
    ),
    el(
      'span',
      {},
      el('span', { class: 'ui-swatch', style: `background:${colour(1)}` }),
      t('ml.window.dear', { v: kms(2 * lo) })
    ),
    el('span', { text: t('ml.window.axes') })
  );
  $('ml-window-out').replaceChildren(
    table(
      t('ml.window.candidates'),
      [
        t('ml.col.choice'),
        t('ml.col.date'),
        t('ml.col.tof'),
        t('ml.col.c3'),
        t('ml.col.vinf'),
        t('ml.col.total'),
        t('ml.col.use'),
      ],
      candidates(w).map(([id, c]) => {
        const use = el('button', {
          type: 'button',
          class: 'ui-button',
          text: t('ml.window.use'),
        });
        use.addEventListener('click', () =>
          apply({
            depart: {
              date: date(JD_J2000 + c.depart),
              tofDays: Math.round(c.tof),
            },
          })
        );
        return [
          t(`ml.window.${id}`),
          date(JD_J2000 + c.depart),
          days(c.tof),
          t('ml.unit.c3', { v: num(c.c3) }),
          kms(c.vinf),
          kms(c.total),
          use,
        ];
      })
    )
  );
}

async function computeWindow(options = DEFAULT_WINDOW) {
  const o = {
    ...options,
    fromAltitude: state.plan.depot.altitude,
    toAltitude: state.plan.arrive.periapsisAltitude,
  };
  $('ml-window-go').disabled = true;
  $('ml-window-cancel').disabled = false;
  $('ml-window-status').textContent = t('ml.status.working');
  try {
    windowRun = lab.window(o, {
      onProgress: f => {
        $('ml-window-progress').value = f;
        $('ml-window-status').textContent = t('ml.window.running', {
          percent: Math.round(f * 100),
        });
      },
    });
    const w = await windowRun.done;
    state.window = w;
    $('ml-window-progress').value = 1;
    if (w.best) drawWindow(w);
    $('ml-window-status').textContent = t(`ml.window.${w.status}`, {
      n: num(w.rows * o.tofSteps, 6),
    });
  } catch (err) {
    $('ml-window-status').textContent = err.problems
      ? t('ml.status.refused', {
          why: err.problems.map(p => t(`ml.problem.${p.code}`)).join(' '),
        })
      : t('ml.status.failed', { why: err.message });
  } finally {
    windowRun = null;
    $('ml-window-go').disabled = false;
    $('ml-window-cancel').disabled = true;
    render();
  }
}

// --- The reference cases ---------------------------------------------------------

async function check() {
  $('ml-check-go').disabled = true;
  $('ml-check-status').textContent = t('ml.status.working');
  try {
    const r = await lab.validate(null).done;
    const rows = r.cases.flatMap(c =>
      c.measures.map(m => [
        c.id,
        m.name,
        typeof m.value === 'number' ? num(m.value, 4) : String(m.value),
        typeof m.expected === 'number'
          ? `${num(m.expected, 5)} ± ${num(m.tolerance, 2)}`
          : `= ${m.expected}`,
        m.ok ? t('ml.check.pass') : t('ml.check.fail'),
      ])
    );
    $('ml-check-out').replaceChildren(
      table(
        t('ml.check.caption'),
        [
          t('ml.check.case'),
          t('ml.check.measure'),
          t('ml.col.value'),
          t('ml.check.expected'),
          t('ml.check.result'),
        ],
        rows
      )
    );
    $('ml-check-status').textContent = t('ml.check.done', {
      n: rows.length,
      failed: rows.filter(x => x[4] !== t('ml.check.pass')).length,
    });
    window.__missionLabCheck = r;
  } catch (err) {
    $('ml-check-status').textContent = t('ml.status.failed', {
      why: err.message,
    });
  } finally {
    $('ml-check-go').disabled = false;
  }
}

// --- Start-up --------------------------------------------------------------------

const LIMITS = [
  'impulsive',
  'soi',
  'pullers',
  'moon',
  'shape',
  'relativity',
  'ephemeris',
  'aiming',
  'launch',
  'operations',
];

function fillControls() {
  $('ml-bodies').replaceChildren(
    ...PULLER_IDS.map(id => {
      const box = el('input', { id: `ml-body-${id}`, type: 'checkbox' });
      box.checked = readBodies().includes(id);
      return el(
        'label',
        { class: 'ui-choice', for: `ml-body-${id}` },
        box,
        ` ${t(`ml.body.${id}`)}`
      );
    })
  );
  $('ml-limits').replaceChildren(
    ...LIMITS.map(k => el('li', { text: t(`ml.limits.${k}`) }))
  );
}
/** The bodies the editor has ticked, or the plan's before the editor exists. */
const readBodies = () => {
  const boxes = PULLER_IDS.map(id => $(`ml-body-${id}`));
  return boxes.every(Boolean)
    ? PULLER_IDS.filter(id => $(`ml-body-${id}`).checked)
    : state.plan.direct.bodies;
};

function languageSwitch() {
  $('langSwitch').replaceChildren(
    ...LANGUAGES.map(({ id, endonym }) => {
      const b = el('button', {
        type: 'button',
        class: 'ui-button',
        lang: id,
        text: endonym,
      });
      b.setAttribute('aria-pressed', String(language() === id));
      b.addEventListener('click', async () => {
        await loadLanguage(id);
        useLanguage(id);
      });
      return b;
    })
  );
}

function useLanguage(id) {
  setLanguage(id);
  translatePage();
  document.title = t('ml.doc.title');
  languageSwitch();
  fillControls();
  if (state.window?.best) drawWindow(state.window);
  render();
}

$('ml-go').addEventListener('click', compute);
$('ml-slider').addEventListener('input', moved);
$('ml-window-go').addEventListener('click', () => computeWindow());
$('ml-window-cancel').addEventListener('click', () => windowRun?.cancel());
$('ml-check-go').addEventListener('click', check);
$('ml-save-plan').addEventListener('click', () => {
  if (!state.mission?.ok) return;
  // The plan keeps the results; the views are for the page.
  const result = { ...state.mission };
  delete result.views;
  const plan = planFile(
    'missionLab',
    state.plan,
    {
      ...result,
      burns: state.mission.burns.map(b => ({
        at: (b.jd - state.mission.patched.departJd) * 86400,
        dv: b.dv,
      })),
    },
    {
      bodies: ['sun', 'earth', 'mars', ...state.plan.direct.bodies],
      version: MISSION_API,
    }
  );
  const blob = new Blob([planBytes(plan)], { type: 'application/json' });
  const a = el('a', {
    href: URL.createObjectURL(blob),
    download: 'gravitas-mission-lab-plan.json',
  });
  document.body.append(a);
  a.click();
  a.remove();
});

// A Spanish reader's catalog, before anything is written in it.
loadLanguage(preferred()).then(() => {
  setLanguage(preferred());
  fillControls();
  writePlan(state.plan);
  guide = createGuidePanel({
    els: {
      pick: $('ml-guide-pick'),
      step: $('ml-step'),
      list: $('ml-step-list'),
      name: $('ml-name'),
      report: $('ml-report'),
    },
    t,
    lab: { state: () => state, apply, language, num: v => num(v, 6) },
  });
  const params = new URLSearchParams(location.search);
  guide.open(
    params.get('guide') || 'ml-orbit',
    params.get('path') === 'advanced' ? 'advanced' : 'intro'
  );
  useLanguage(language());
  compute().then(() => (document.documentElement.dataset.ready = 'true'));
});
