// =============================================================================
// The mission-design diagnostics page (/mission/)
// -----------------------------------------------------------------------------
// A harness for the mission core (js/mission/, MISSION.md), not a curriculum:
// each section asks the Worker one question (a transfer between circular
// orbits, a rendezvous, Lambert's problem, a patched-conic transfer, a
// transfer window, a flyby) and shows the answer as tables: the solver's own
// report, a delta-v budget and an event timeline, or the reason it refused.
// Every answer can be saved as a plan file (gravitas.mission-plan/1). The
// page never computes an orbit: every solve, and the reference cases, are
// the Worker's.
// =============================================================================

import {
  LANGUAGES,
  language,
  preferred,
  setLanguage,
  t,
  translatePage,
} from './mission/i18n.js';
import { MISSION_API, createMission } from './mission/api.js';
import { BODIES, CENTRAL, PLANETS, dateOf, daysOf } from './mission/bodies.js';
import { budgetOf, planBytes, planFile, timelineOf } from './mission/plan.js';

const $ = id => document.getElementById(id);
const DEG = Math.PI / 180;
const mission = createMission({
  spawn: () =>
    new Worker(new URL('./mission/worker.js', import.meta.url), {
      type: 'module',
    }),
});
/** What each section last showed, to draw again in another language. */
const shown = {};
const plans = {};
let windowRun = null;
let windowResult = null;

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
const num = (v, digits = 5) =>
  typeof v !== 'number' || !Number.isFinite(v)
    ? '–'
    : v === 0
      ? '0'
      : Math.abs(v) >= 1e-3 && Math.abs(v) < 1e7
        ? new Intl.NumberFormat(language(), {
            maximumSignificantDigits: digits,
          }).format(v)
        : v.toExponential(digits - 1);
const kms = v => t('mission.unit.kms', { v: num(v) });
const km = v => t('mission.unit.km', { v: num(v, 6) });
const deg = v => t('mission.unit.deg', { v: num(v / DEG, 4) });
/** A duration in the unit a reader would use. */
function time(s) {
  if (!Number.isFinite(s)) return t('mission.unit.forever');
  if (Math.abs(s) < 7200) return t('mission.unit.min', { v: num(s / 60, 4) });
  if (Math.abs(s) < 3 * 86400)
    return t('mission.unit.h', { v: num(s / 3600, 4) });
  return t('mission.unit.d', { v: num(s / 86400, 4) });
}
const vector = v => `(${v.map(x => num(x, 6)).join('; ')})`;

function table(caption, head, rows) {
  return el(
    'table',
    { class: 'mn-table' },
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
              : el('td', { text: c })
          )
        )
      )
    )
  );
}
/** A two-column table of named values. */
const facts = (caption, pairs) =>
  table(caption, [t('mission.col.quantity'), t('mission.col.value')], pairs);

/** A number the reader typed; a comma may be the decimal mark. */
const read = id => {
  const s = $(id).value.trim().replace(',', '.');
  return s === '' ? NaN : Number(s);
};
/**
 * A vector the reader typed: three numbers separated by commas, or by
 * semicolons when commas are decimal marks.
 */
const readVector = id => {
  const s = $(id).value.trim();
  const parts = s.includes(';')
    ? s.split(';').map(p => p.replace(',', '.'))
    : s.split(',');
  const v = parts.map(p => (p.trim() === '' ? NaN : Number(p.trim())));
  return v.length === 3 && v.every(Number.isFinite) ? v : null;
};
const say = (sid, text) => ($(`${sid}-status`).textContent = text);

function refusedText(err) {
  const problems = err?.problems || [];
  if (problems.length)
    return t('mission.status.refused', {
      why: problems.map(p => t(`mission.problem.${p.code}`, p.vars)).join(' '),
    });
  return t('mission.status.failed', { why: err?.message || String(err) });
}

/** The budget and timeline tables of a result with burns. */
function budgetTables(kind, result) {
  const b = budgetOf(result);
  const out = [
    table(
      t('mission.budget.caption'),
      [
        t('mission.budget.burn'),
        t('mission.budget.at'),
        t('mission.budget.dv'),
        t('mission.budget.di'),
      ],
      [
        ...b.rows.map(r => [
          t('mission.budget.n', { n: r.burn }),
          time(r.at),
          kms(r.dv),
          deg(r.di),
        ]),
        [t('mission.budget.total'), '', kms(b.total), ''],
      ]
    ),
  ];
  const events = timelineOf(kind, result);
  if (events.length)
    out.push(
      table(
        t('mission.timeline.caption'),
        [t('mission.timeline.t'), t('mission.timeline.event')],
        events.map(e => [
          time(e.t),
          t(`mission.event.${e.event}`, {
            n: e.index ?? '',
            dv: e.value === undefined ? '' : kms(e.value),
          }),
        ])
      )
    );
  return out;
}

/** Remember a section's plan, and let it be saved. */
function offer(sid, kind, inputs, result, bodies) {
  plans[sid] = planFile(kind, inputs, result, { bodies, version: MISSION_API });
  $(`${sid}-export`).disabled = false;
}
function save(sid) {
  const plan = plans[sid];
  if (!plan) return;
  const blob = new Blob([planBytes(plan)], { type: 'application/json' });
  const a = el('a', {
    href: URL.createObjectURL(blob),
    download: `gravitas-mission-${plan.kind}.json`,
  });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Run one section: ask the Worker, draw the answer, keep it for a redraw. */
async function section(sid, ask, draw) {
  $(`${sid}-go`).disabled = true;
  $(`${sid}-export`).disabled = true;
  delete plans[sid];
  say(sid, t('mission.status.working'));
  try {
    const answer = await ask();
    shown[sid] = () => draw(answer);
    shown[sid]();
  } catch (err) {
    shown[sid] = () => {
      $(`${sid}-out`).replaceChildren();
      say(sid, refusedText(err));
    };
    shown[sid]();
  } finally {
    $(`${sid}-go`).disabled = false;
  }
}
/** A solver's refusal of the problem it was given. */
const refusal = (sid, r) => {
  $(`${sid}-out`).replaceChildren();
  say(
    sid,
    t('mission.status.refused', { why: t(`mission.refused.${r.status}`) })
  );
};

// --- Transfers between circular orbits -------------------------------------------

function transfer() {
  const body = $('mn-transfer-body').value;
  const R = BODIES[body].radius;
  const inputs = {
    body,
    altitude1: read('mn-transfer-h1'),
    altitude2: read('mn-transfer-h2'),
    intermediateAltitude: read('mn-transfer-hb'),
    planeChangeDeg: read('mn-transfer-di'),
    units: 'km, degrees',
  };
  const r1 = R + inputs.altitude1;
  const r2 = R + inputs.altitude2;
  const di = inputs.planeChangeDeg * DEG;
  section(
    'mn-transfer',
    () =>
      Promise.all([
        mission.solve({ kind: 'hohmann', body, r1, r2 }).done,
        mission.solve({
          kind: 'biElliptic',
          body,
          r1,
          r2,
          rb: R + inputs.intermediateAltitude,
        }).done,
        mission.solve({
          kind: 'planeChange',
          body,
          r1,
          r2,
          di,
          split: 'optimal',
        }).done,
        mission.solve({ kind: 'planeChange', body, r1, r2, di, split: 0 }).done,
      ]),
    ([h, b, best, apo]) => {
      if (!h.ok) return refusal('mn-transfer', h);
      const rows = [
        [t('mission.transfer.hohmann'), kms(h.total), time(h.tof)],
        b.ok
          ? [t('mission.transfer.biElliptic'), kms(b.total), time(b.tof)]
          : [
              t('mission.transfer.biElliptic'),
              t(`mission.refused.${b.status}`),
              '',
            ],
        ...(b.ok
          ? [[t('mission.transfer.limit'), kms(b.limit), time(Infinity)]]
          : []),
      ];
      const out = [
        table(
          t('mission.transfer.caption'),
          [
            t('mission.col.transfer'),
            t('mission.col.dv'),
            t('mission.col.time'),
          ],
          rows
        ),
      ];
      const withPlane = Math.abs(di) > 0 && best.ok;
      if (withPlane) {
        out.push(
          facts(t('mission.plane.caption'), [
            [t('mission.plane.apoapsis'), kms(apo.total)],
            [t('mission.plane.best'), kms(best.total)],
            [t('mission.plane.split'), deg(best.split * di)],
            [
              t('mission.plane.search'),
              t('mission.plane.searchValue', { n: best.search.iterations }),
            ],
          ])
        );
      }
      const chosen = withPlane ? best : h;
      out.push(...budgetTables(withPlane ? 'planeChange' : 'hohmann', chosen));
      $('mn-transfer-out').replaceChildren(...out);
      say('mn-transfer', t('mission.status.done'));
      offer(
        'mn-transfer',
        withPlane ? 'planeChange' : 'hohmann',
        inputs,
        chosen,
        [body]
      );
    }
  );
}

// --- Rendezvous and phasing ---------------------------------------------------------

function meet() {
  const body = $('mn-meet-body').value;
  const R = BODIES[body].radius;
  const inputs = {
    body,
    altitude1: read('mn-meet-h1'),
    altitude2: read('mn-meet-h2'),
    targetAheadDeg: read('mn-meet-phase'),
    laps: Math.round(read('mn-meet-laps')),
    units: 'km, degrees',
  };
  const same = inputs.altitude1 === inputs.altitude2;
  const kind = same ? 'phasing' : 'rendezvous';
  const problem = same
    ? {
        kind,
        body,
        r: R + inputs.altitude1,
        ahead: inputs.targetAheadDeg * DEG,
        laps: inputs.laps,
      }
    : {
        kind,
        body,
        r1: R + inputs.altitude1,
        r2: R + inputs.altitude2,
        phase: inputs.targetAheadDeg * DEG,
      };
  section(
    'mn-meet',
    () => mission.solve(problem).done,
    r => {
      if (!r.ok) return refusal('mn-meet', r);
      const pairs = same
        ? [
            [t('mission.meet.kind'), t('mission.meet.phasing')],
            [
              t('mission.meet.orbit'),
              t('mission.meet.orbitValue', {
                a: km(r.a),
                other: km(r.otherApse - R),
              }),
            ],
            [t('mission.meet.duration'), time(r.tof)],
          ]
        : [
            [t('mission.meet.kind'), t('mission.meet.rendezvous')],
            [t('mission.meet.lead'), deg(r.lead)],
            [t('mission.meet.wait'), time(r.wait)],
            [t('mission.meet.synodic'), time(r.synodic)],
            [t('mission.meet.transfer'), time(r.tof)],
          ];
      $('mn-meet-out').replaceChildren(
        facts(t('mission.meet.caption'), pairs),
        ...budgetTables(kind, r)
      );
      say('mn-meet', t('mission.status.done'));
      offer('mn-meet', kind, inputs, r, [body]);
    }
  );
}

// --- Lambert's problem ------------------------------------------------------------

function lambertSection() {
  const body = $('mn-lambert-body').value;
  const r1 = readVector('mn-lambert-r1');
  const r2 = readVector('mn-lambert-r2');
  const tof = read('mn-lambert-tof');
  const direction = $('mn-lambert-dir').value;
  const inputs = { body, r1, r2, tof, direction, units: 'km, s' };
  if (!r1 || !r2) {
    $('mn-lambert-out').replaceChildren();
    return say(
      'mn-lambert',
      t('mission.status.refused', { why: t('mission.problem.vector') })
    );
  }
  section(
    'mn-lambert',
    () => mission.solve({ kind: 'lambert', body, r1, r2, tof, direction }).done,
    s => {
      if (!s.ok) return refusal('mn-lambert', s);
      $('mn-lambert-out').replaceChildren(
        facts(t('mission.lambert.caption'), [
          [
            t('mission.lambert.v1'),
            `${vector(s.v1)} ${t('mission.unit.kmsBare')}`,
          ],
          [
            t('mission.lambert.v2'),
            `${vector(s.v2)} ${t('mission.unit.kmsBare')}`,
          ],
          [t('mission.lambert.conic'), t(`mission.conic.${s.conic}`)],
          [t('mission.lambert.a'), km(s.a)],
          [t('mission.lambert.angle'), deg(s.transferAngle)],
          [t('mission.lambert.branch'), t(`mission.branch.${s.branch}`)],
        ]),
        facts(t('mission.solver.caption'), [
          [t('mission.solver.status'), t('mission.solver.ok')],
          [t('mission.solver.iterations'), String(s.iterations)],
          [t('mission.solver.residual'), num(s.residual, 2)],
          [t('mission.solver.miss'), num(s.miss, 2)],
          [t('mission.solver.condition'), num(s.condition, 3)],
        ])
      );
      say('mn-lambert', t('mission.status.done'));
      offer('mn-lambert', 'lambert', inputs, s, [body]);
    }
  );
}

// --- Between planets -------------------------------------------------------------

function planets() {
  const inputs = {
    from: $('mn-planets-from').value,
    to: $('mn-planets-to').value,
    fromAltitude: read('mn-planets-h1'),
    toAltitude: read('mn-planets-h2'),
    units: 'km',
  };
  section(
    'mn-planets',
    () => mission.solve({ kind: 'interplanetary', ...inputs }).done,
    r => {
      if (!r.ok) return refusal('mn-planets', r);
      const end = (label, e) => [
        [t(`mission.planets.${label}.vinf`), kms(e.vinf)],
        [t(`mission.planets.${label}.dv`), kms(e.dv)],
        [t(`mission.planets.${label}.soi`), km(e.soi)],
      ];
      $('mn-planets-out').replaceChildren(
        facts(t('mission.planets.caption'), [
          [t('mission.planets.tof'), time(r.tof)],
          ...end('depart', r.departure),
          ...end('arrive', r.arrival),
          [t('mission.budget.total'), kms(r.total)],
        ]),
        table(
          t('mission.timeline.caption'),
          [t('mission.timeline.t'), t('mission.timeline.event')],
          timelineOf('interplanetary', r).map(e => [
            time(e.t),
            t(`mission.event.${e.event}`, { n: '', dv: kms(e.value) }),
          ])
        )
      );
      say('mn-planets', t('mission.status.done'));
      offer('mn-planets', 'interplanetary', inputs, r, [
        'sun',
        inputs.from,
        inputs.to,
      ]);
    }
  );
}

// --- Transfer windows ------------------------------------------------------------

/** A refused cell: a hole in the plot, the same gray as its legend. */
const REFUSED = '#3a3f52';
const COLORS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];
/** A colour for a fraction 0..1 of the scale, from dark (cheap) to bright. */
function colour(f) {
  const x = Math.min(1, Math.max(0, f)) * (COLORS.length - 1);
  const i = Math.min(COLORS.length - 2, Math.floor(x));
  const u = x - i;
  const [a, b] = [COLORS[i], COLORS[i + 1]];
  return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * u)).join(',')})`;
}

function drawWindow(r) {
  const o = r.options;
  const nd = o.departSteps;
  const nt = o.tofSteps;
  const canvas = $('mn-window-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#0b0d17';
  ctx.fillRect(0, 0, W, H);
  const lo = r.best ? r.best.total : 0;
  const span = Math.max(lo, 1e-9); // the scale runs from the best to twice it
  // Cells on whole pixels: a cell's edges are the rounded multiples, so
  // neighbors meet exactly and no seam of background shows between them.
  const cw = W / nd;
  const ch = H / nt;
  const xs = i => Math.round(i * cw);
  const ys = j => H - Math.round(j * ch);
  for (let i = 0; i < r.rows; i++) {
    for (let j = 0; j < nt; j++) {
      const k = i * nt + j;
      ctx.fillStyle =
        r.cellStatus[k] !== 0 ? REFUSED : colour((r.total[k] - lo) / span);
      ctx.fillRect(xs(i), ys(j + 1), xs(i + 1) - xs(i), ys(j) - ys(j + 1));
    }
  }
  if (r.best) {
    const i = Math.floor(r.best.index / nt);
    const j = r.best.index % nt;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      (i + 0.5) * cw,
      H - (j + 0.5) * ch,
      Math.max(4, Math.min(cw, ch)),
      0,
      2 * Math.PI
    );
    ctx.stroke();
  }
  canvas.setAttribute(
    'aria-label',
    t('mission.window.alt', {
      from: t(`mission.bodyName.${o.from}`),
      to: t(`mission.bodyName.${o.to}`),
      d1: dateOf(o.departStart),
      d2: dateOf(o.departStart + o.departSpan),
      t1: num(o.tofMin, 4),
      t2: num(o.tofMax, 4),
      best: r.best ? kms(r.best.total) : '–',
    })
  );
  $('mn-window-legend').replaceChildren(
    el(
      'span',
      {},
      el('span', { class: 'mn-swatch', style: `background:${colour(0)}` }),
      t('mission.window.cheap', { v: kms(lo) })
    ),
    el(
      'span',
      {},
      el('span', { class: 'mn-swatch', style: `background:${colour(1)}` }),
      t('mission.window.dear', { v: kms(2 * lo) })
    ),
    el(
      'span',
      {},
      el('span', { class: 'mn-swatch mn-refused' }),
      t('mission.window.refusedCell')
    ),
    el('span', { text: t('mission.window.axes') })
  );
  $('mn-window-plot').hidden = false;
}

function windowTables(r) {
  const o = r.options;
  const counts = Object.entries(r.counts).filter(([, n]) => n > 0);
  const out = [];
  if (r.best)
    out.push(
      facts(t('mission.window.bestCaption'), [
        [t('mission.window.depart'), dateOf(r.best.depart)],
        [t('mission.window.tof'), time(r.best.tof * 86400)],
        [t('mission.window.c3'), t('mission.unit.c3', { v: num(r.best.c3) })],
        [t('mission.window.vinf'), kms(r.best.vinf)],
        [t('mission.window.total'), kms(r.best.total)],
      ])
    );
  out.push(
    table(
      t('mission.window.countsCaption', { n: num(r.rows * o.tofSteps, 6) }),
      [t('mission.col.status'), t('mission.col.cells')],
      counts.map(([s, n]) => [t(`mission.cell.${s}`), String(n)])
    )
  );
  return out;
}

async function windowSection() {
  const sid = 'mn-window';
  const steps = Math.round(read('mn-window-steps'));
  const tof1 = read('mn-window-tof1');
  const inputs = {
    from: $('mn-window-from').value,
    to: $('mn-window-to').value,
    departStart: daysOf($('mn-window-start').value.trim()),
    departSpan: read('mn-window-span'),
    departSteps: steps,
    tofMin: tof1,
    tofMax: read('mn-window-tof2'),
    tofSteps: steps,
    fromAltitude: 300,
    toAltitude: 300,
  };
  if (!Number.isFinite(inputs.departStart)) {
    $(`${sid}-out`).replaceChildren();
    return say(
      sid,
      t('mission.status.refused', { why: t('mission.problem.date') })
    );
  }
  $(`${sid}-go`).disabled = true;
  $(`${sid}-cancel`).disabled = false;
  $(`${sid}-export`).disabled = true;
  $('mn-window-csv').disabled = true;
  $('mn-window-progress').value = 0;
  delete plans[sid];
  windowResult = null;
  say(sid, t('mission.status.working'));
  const started = performance.now();
  try {
    windowRun = mission.window(inputs, {
      onProgress: f => {
        $('mn-window-progress').value = f;
        say(sid, t('mission.window.running', { percent: Math.round(f * 100) }));
      },
    });
    const r = await windowRun.done;
    windowResult = r;
    const seconds = (performance.now() - started) / 1000;
    shown[sid] = () => {
      drawWindow(r);
      $(`${sid}-out`).replaceChildren(...windowTables(r));
      say(
        sid,
        t(`mission.window.${r.status}`, {
          s: num(seconds, 3),
          n: num(r.rows * inputs.tofSteps, 6),
        })
      );
    };
    shown[sid]();
    $('mn-window-progress').value = 1;
    $('mn-window-csv').disabled = false;
    // The plan keeps the summary; the grid itself is the CSV.
    const summary = { ...r };
    for (const k of ['c3', 'vinf', 'total', 'cellStatus']) delete summary[k];
    offer(
      sid,
      'window',
      inputs,
      { ...summary, cells: r.rows * inputs.tofSteps },
      ['sun', inputs.from, inputs.to]
    );
    window.__missionWindow = {
      ...summary,
      cellsComputed: r.rows * inputs.tofSteps,
    };
  } catch (err) {
    shown[sid] = () => {
      $(`${sid}-out`).replaceChildren();
      say(sid, refusedText(err));
    };
    shown[sid]();
  } finally {
    windowRun = null;
    $(`${sid}-go`).disabled = false;
    $(`${sid}-cancel`).disabled = true;
  }
}

function windowCsv() {
  const r = windowResult;
  if (!r) return;
  const o = r.options;
  const lines = [
    'departure,tof_days,c3_km2_s2,vinf_arrival_km_s,total_dv_km_s,status',
  ];
  for (let i = 0; i < r.rows; i++)
    for (let j = 0; j < o.tofSteps; j++) {
      const k = i * o.tofSteps + j;
      const d =
        o.departSteps === 1
          ? o.departStart
          : o.departStart + (o.departSpan * i) / (o.departSteps - 1);
      const tof =
        o.tofSteps === 1
          ? o.tofMin
          : o.tofMin + ((o.tofMax - o.tofMin) * j) / (o.tofSteps - 1);
      const f = x => (Number.isFinite(x) ? String(x) : '');
      lines.push(
        [
          dateOf(d),
          f(tof),
          f(r.c3[k]),
          f(r.vinf[k]),
          f(r.total[k]),
          cellName(r.cellStatus[k]),
        ].join(',')
      );
    }
  const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv' });
  const a = el('a', {
    href: URL.createObjectURL(blob),
    download: `gravitas-window-${o.from}-${o.to}.csv`,
  });
  document.body.append(a);
  a.click();
  a.remove();
}
const CELL_NAMES = [
  'ok',
  'collinear',
  'antipodal',
  'branchAmbiguous',
  'tooFast',
  'noConvergence',
  'checkFailed',
  'input',
];
const cellName = code => CELL_NAMES[code] ?? 'input';

// --- Flybys ---------------------------------------------------------------------

function flybySection() {
  const body = $('mn-flyby-body').value;
  const inputs = {
    body,
    vinf: read('mn-flyby-vinf'),
    altitude: read('mn-flyby-alt'),
    side: Number($('mn-flyby-side').value),
    units: 'km/s, km',
  };
  const rp = BODIES[body].radius + inputs.altitude;
  section(
    'mn-flyby',
    () =>
      mission.solve({
        kind: 'flyby',
        body,
        vinf: inputs.vinf,
        rp,
        side: inputs.side,
      }).done,
    f => {
      if (!f.ok) return refusal('mn-flyby', f);
      $('mn-flyby-out').replaceChildren(
        facts(t('mission.flyby.caption'), [
          [t('mission.flyby.e'), num(f.e)],
          [t('mission.flyby.turn'), deg(f.delta)],
          [t('mission.flyby.dv'), kms(f.dvEquivalent)],
          [t('mission.flyby.vp'), kms(f.periapsisSpeed)],
          [
            t('mission.flyby.out'),
            `${vector(f.vinfOut)} ${t('mission.unit.kmsBare')}`,
          ],
          [t('mission.flyby.soi'), km(f.soi)],
        ])
      );
      say('mn-flyby', t('mission.status.done'));
      offer('mn-flyby', 'flyby', inputs, f, [body]);
    }
  );
}

// --- The reference cases ---------------------------------------------------------

async function check() {
  $('mn-check-go').disabled = true;
  $('mn-check-status').textContent = t('mission.status.working');
  const started = performance.now();
  try {
    const r = await mission.validate(null, {
      onProgress: f =>
        ($('mn-check-status').textContent = t('mission.window.running', {
          percent: Math.round(f * 100),
        })),
    }).done;
    const seconds = (performance.now() - started) / 1000;
    const draw = () => {
      const rows = r.cases.flatMap(c =>
        c.measures.map(m => [
          c.id,
          t(`mission.kind.${c.kind}`),
          m.name,
          typeof m.value === 'number' ? num(m.value, 4) : String(m.value),
          typeof m.expected === 'number'
            ? `${num(m.expected, 5)} ± ${num(m.tolerance, 2)}`
            : `= ${m.expected}`,
          m.ok ? t('mission.check.pass') : t('mission.check.fail'),
        ])
      );
      $('mn-check-out').replaceChildren(
        table(
          t('mission.check.caption'),
          [
            t('mission.check.case'),
            t('mission.check.kind'),
            t('mission.check.measure'),
            t('mission.col.value'),
            t('mission.check.expected'),
            t('mission.check.result'),
          ],
          rows
        )
      );
      const failed = rows.filter(
        row => row[5] !== t('mission.check.pass')
      ).length;
      $('mn-check-status').textContent = t('mission.check.done', {
        n: rows.length,
        failed,
        s: num(seconds, 3),
      });
    };
    shown['mn-check'] = draw;
    draw();
    window.__missionCheck = r;
  } catch (err) {
    $('mn-check-status').textContent = refusedText(err);
  } finally {
    $('mn-check-go').disabled = false;
  }
}

// --- Controls, language and start-up ---------------------------------------------

const SUPPORTED = [
  'hohmann',
  'biElliptic',
  'plane',
  'meet',
  'lambert',
  'patched',
  'window',
  'flyby',
];
const UNSUPPORTED = [
  'multiRev',
  'lowThrust',
  'ephemeris',
  'nBody',
  'poweredFlyby',
  'bPlane',
  'navigation',
];

function options(id, values, label, keep) {
  const s = $(id);
  const was = s.value || keep;
  s.replaceChildren(
    ...values.map(v => el('option', { value: v, text: label(v) }))
  );
  if (values.includes(was)) s.value = was;
}

function fillControls() {
  const name = id => t(`mission.bodyName.${id}`);
  options('mn-transfer-body', PLANETS, name, 'earth');
  options('mn-meet-body', PLANETS, name, 'earth');
  options('mn-lambert-body', CENTRAL, name, 'earth');
  options(
    'mn-lambert-dir',
    ['prograde', 'retrograde'],
    v => t(`mission.direction.${v}`),
    'prograde'
  );
  options('mn-planets-from', PLANETS, name, 'earth');
  options('mn-planets-to', PLANETS, name, 'mars');
  options('mn-window-from', PLANETS, name, 'earth');
  options('mn-window-to', PLANETS, name, 'mars');
  options('mn-flyby-body', PLANETS, name, 'jupiter');
  options(
    'mn-flyby-side',
    ['1', '-1'],
    v => t(`mission.flyby.side.${v === '1' ? 'left' : 'right'}`),
    '1'
  );
  $('mn-scope-yes').replaceChildren(
    ...SUPPORTED.map(k => el('li', { text: t(`mission.scope.yes.${k}`) }))
  );
  $('mn-scope-no').replaceChildren(
    ...UNSUPPORTED.map(k => el('li', { text: t(`mission.scope.no.${k}`) }))
  );
}

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
      b.addEventListener('click', () => useLanguage(id));
      return b;
    })
  );
}

function useLanguage(id) {
  setLanguage(id);
  translatePage();
  document.title = t('mission.doc.title');
  languageSwitch();
  fillControls();
  for (const draw of Object.values(shown)) draw();
}

$('mn-transfer-go').addEventListener('click', transfer);
$('mn-meet-go').addEventListener('click', meet);
$('mn-lambert-go').addEventListener('click', lambertSection);
$('mn-planets-go').addEventListener('click', planets);
$('mn-window-go').addEventListener('click', windowSection);
$('mn-window-cancel').addEventListener('click', () => windowRun?.cancel());
$('mn-window-csv').addEventListener('click', windowCsv);
$('mn-flyby-go').addEventListener('click', flybySection);
$('mn-check-go').addEventListener('click', check);
for (const sid of [
  'mn-transfer',
  'mn-meet',
  'mn-lambert',
  'mn-planets',
  'mn-window',
  'mn-flyby',
])
  $(`${sid}-export`).addEventListener('click', () => save(sid));
useLanguage(preferred());
document.documentElement.dataset.ready = 'true';
