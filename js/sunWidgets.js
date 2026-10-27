// =============================================================================
// The Sun instruments (Prompt 194 part 2, SUN_KERNEL.md Part 2)
// -----------------------------------------------------------------------------
// Three instruments for "The Turning Sun" and "The Sun's Power", each standing on
// the kernel in js/kernels/sun/ and the 14-day sequence in frames/sun-2024-05.json
// (fourteen SDO HMI continuum browse pictures, one a day, 4 to 17 May 2024, the
// geometry of each from JPL Horizons and the picture's limb, and the TSIS-1 TIM
// daily irradiance):
//
//   sun-frames     one picture a day, a crosshair the reader places (two sliders
//                  and a day), the heliographic position and its uncertainty, and
//                  the author's marks of two spot groups
//   sun-rotation   a group's marks to a rotation rate with its uncertainty, the
//                  Earth's correction, and the reference law beside it; the
//                  equatorial term fitted alone; all three coefficients refused
//   sun-power      the daily flux, its correction to 1 AU, and the Sun's luminosity
//                  and effective temperature
//
// No arithmetic of the kernel is repeated here: every number is its own, and
// tests/sunLessons.test.js recomputes each one a lesson states. The pictures are
// BROWSE pictures: display pictures that their source says are not for science
// analysis, so a position read from one is an instructional reading with its
// placement sigma, labeled not astrometry (D-R10-92). The marks drawn on them
// are the author's (a detector with a stated rule, SUN_KERNEL.md), not marks
// anyone else made. Nothing here is a count of NOAA regions (not retrieved).
//
// The sidecar (15 KB) arrives behind `sunReady`, which never rejects; a picture
// is fetched when first drawn, checked against its SHA-256, and kept by the
// service worker after that.
// =============================================================================

import './instrumentStartup.js';
import { t, registerMessages } from './i18n/index.js';
import { EN_SUN } from './i18n/en.sun.js';
import { ES_SUN } from './i18n/es.sun.js';
import { fixed } from './format.js';
import {
  surface,
  responsiveHeight,
  palette,
  TYPE,
  typeAt,
} from './widgetCanvas.js';
import { createChart } from './plot/mount.js';
import {
  MU_PRECISE,
  PRIMARY_LAW,
  diskOfDay,
  diskToHeliographic,
  fitRotationLaw,
  heliographicToDisk,
  lawRate,
  measuredIrradiance,
  positionSigma,
  summariseFluxSeries,
  summariseIrradiance,
  trackGroup,
} from './kernels/sun/index.js';

registerMessages('en', EN_SUN);
registerMessages('es', ES_SUN);

const fix = (v, d = 2) => (Number.isFinite(v) ? fixed(v, d) : '-');
const sgn = (v, d = 2) => `${v >= 0 ? '+' : '−'}${fixed(Math.abs(v), d)}`;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const clampIndex = (v, n) => clamp(Math.round(v ?? 0), 0, n - 1);

/** The two groups the lessons use, in the order the controls use. */
export const GROUPS = Object.freeze(['G1', 'G3']);
/** The day a lesson starts from, and how many frames there are. */
export const DAYS = 14;

// -----------------------------------------------------------------------------
// What arrives later: the sidecar, then a picture when one is drawn
// -----------------------------------------------------------------------------

let side = null;
let sideFailed = false;
const pictures = new Map();
let last = null;

/** A test or a page that already has the sidecar hands it in. */
export const provideSidecar = json => {
  side = json ?? null;
};

async function loadSidecar() {
  try {
    const res = await fetch('/frames/sun-2024-05.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    side = await res.json();
  } catch (err) {
    sideFailed = true;
    console.warn('The solar sequence could not be loaded:', err);
  }
}

/** Resolves true when the sidecar is in; never rejects. */
export const sunReady = loadSidecar().then(
  () => true,
  () => false
);

const hex = buf =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** The picture of day `i`: an image, or null while it loads (and a redraw when it lands). */
function pictureOf(i) {
  const have = pictures.get(i);
  if (have) return have.image ?? null;
  const entry = { image: null, failed: false };
  pictures.set(i, entry);
  (async () => {
    try {
      const d = side.days[i];
      const res = await fetch(`/${d.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength !== d.bytes)
        throw new Error('not the recorded size');
      const digest = hex(await crypto.subtle.digest('SHA-256', bytes));
      if (digest !== d.sha256) throw new Error('not the recorded picture');
      entry.image = await globalThis.createImageBitmap(
        new Blob([bytes], { type: 'image/jpeg' })
      );
      if (last) last.redraw();
    } catch (err) {
      entry.failed = true;
      console.warn('A solar picture could not be loaded:', err);
      if (last) last.redraw();
    }
  })();
  return null;
}

const statusRow = () => ({
  label: t('sunW.row.how'),
  value: t(sideFailed ? 'sunW.failed' : 'sunW.loading'),
});

// -----------------------------------------------------------------------------
// Words for a day and a position
// -----------------------------------------------------------------------------

const dateWords = date => {
  const [, m, d] = date.split('-').map(Number);
  return t('sunW.date', { d, month: t(`sunW.month.${m}`) });
};
const dayAt = v => clampIndex((v.day ?? 1) - 1, DAYS);

/** A position read from a picture: the kernel's conversion and its sigma. */
export function readPosition(day, x, y, sigmaPx = 1.5) {
  const disk = diskOfDay(side, day);
  const pos = diskToHeliographic(x, y, disk);
  if (pos.status === 'refused') return pos;
  const sg = positionSigma(x, y, disk, sigmaPx);
  return { ...pos, sigmaLonDeg: sg.sigmaLonDeg, sigmaLatDeg: sg.sigmaLatDeg };
}

// -----------------------------------------------------------------------------
// Controls
// -----------------------------------------------------------------------------

const bareControl = (id, labelKey, min, max, step, value, format) => ({
  id,
  get label() {
    return t(labelKey);
  },
  min,
  max,
  step,
  value,
  decimals: step < 1 ? 1 : 0,
  format,
});
const toggleControl = (id, labelKey, value = 1) =>
  bareControl(id, labelKey, 0, 1, 1, value, x =>
    t(x >= 0.5 ? 'sunW.on' : 'sunW.off')
  );
const dayControl = id =>
  bareControl(id, `sunW.control.${id}`, 1, DAYS, 1, id === 'last' ? 9 : 1, x =>
    side ? dateWords(side.days[clampIndex(x - 1, DAYS)].date) : fix(x, 0)
  );

const hosts = new WeakMap();
/** The plot component's host, mounted beside the tool canvas (which it hides). */
function hostOf(canvas, label) {
  let h = hosts.get(canvas);
  if (!h) {
    h = { el: document.createElement('div') };
    canvas.after(h.el);
    canvas.style.display = 'none';
    h.chart = createChart(h.el, {
      height: 260,
      legendMinHeight: 24,
      number: v => fixed(v, Math.abs(v) >= 100 ? 0 : 1),
      labels: { legend: label },
      theme: true,
    });
    hosts.set(canvas, h);
  }
  return h;
}
const SERIES = { blue: '#1c7ed6', orange: '#e8590c', green: '#2f9e44' };

// -----------------------------------------------------------------------------
// sun-frames
// -----------------------------------------------------------------------------

/** The disc's picture, the grid, the marks and the reader's crosshair. */
function drawFace(canvas, v) {
  const colors = palette();
  const side0 = Math.min(canvas.clientWidth || 420, responsiveHeight(360, 240));
  const { ctx: g, w } = surface(canvas, Math.max(120, Math.round(side0)));
  const ox = Math.max(0, (w - side0) / 2);
  g.fillStyle = '#05060a';
  g.fillRect(ox, 0, side0, side0);
  if (!side) {
    g.fillStyle = colors.muted;
    g.font = typeAt(TYPE.TICK);
    g.textBaseline = 'top';
    g.fillText(t(sideFailed ? 'sunW.failed' : 'sunW.loading'), ox + 8, 8);
    return;
  }
  const i = dayAt(v);
  const d = side.days[i];
  const k = side0 / d.width;
  const pic = pictureOf(i);
  if (pic) g.drawImage(pic, ox, 0, side0, side0);
  else {
    g.fillStyle = colors.muted;
    g.font = typeAt(TYPE.TICK);
    g.textBaseline = 'top';
    g.fillText(
      t(pictures.get(i)?.failed ? 'sunW.failed' : 'sunW.loading'),
      ox + 8,
      8
    );
  }
  const disk = diskOfDay(side, i);
  const at = (lat, lon) => {
    const p = heliographicToDisk(lat, lon, disk);
    return p.status === 'refused' ? null : { x: ox + p.x * k, y: p.y * k };
  };
  if ((v.grid ?? 0) >= 0.5) {
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    const line = pts => {
      g.beginPath();
      let pen = false;
      for (const p of pts) {
        if (!p) pen = false;
        else if (pen) g.lineTo(p.x, p.y);
        else {
          g.moveTo(p.x, p.y);
          pen = true;
        }
      }
      g.stroke();
    };
    for (const lat of [-60, -30, 0, 30, 60]) {
      const pts = [];
      for (let lon = -90; lon <= 90; lon += 3) pts.push(at(lat, lon));
      line(pts);
    }
    for (const lon of [-60, -30, 0, 30, 60]) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 3) pts.push(at(lat, lon));
      line(pts);
    }
  }
  if ((v.marks ?? 1) >= 0.5) {
    g.lineWidth = 2;
    g.font = typeAt(TYPE.LABEL, '600');
    g.textBaseline = 'middle';
    for (const id of GROUPS) {
      const m = side.marks[id].marks.find(q => q.day === i);
      if (!m) continue;
      g.strokeStyle = colors.good;
      g.fillStyle = colors.good;
      g.beginPath();
      g.arc(ox + m.x * k, m.y * k, 11, 0, 2 * Math.PI);
      g.stroke();
      g.fillText(id, ox + m.x * k + 14, m.y * k);
    }
  }
  const cx = clamp(Math.round(v.x ?? 452), 0, d.width - 1);
  const cy = clamp(Math.round(v.y ?? 422), 0, d.height - 1);
  g.strokeStyle = colors.warn;
  g.lineWidth = 1.5;
  const px = ox + cx * k;
  const py = cy * k;
  g.beginPath();
  g.moveTo(px - 12, py);
  g.lineTo(px - 4, py);
  g.moveTo(px + 4, py);
  g.lineTo(px + 12, py);
  g.moveTo(px, py - 12);
  g.lineTo(px, py - 4);
  g.moveTo(px, py + 4);
  g.lineTo(px, py + 12);
  g.stroke();
}

/** What the controls ask of the kernel for the reader's crosshair. Null while the sidecar loads. */
export function framesView(v) {
  if (!side) return null;
  const day = dayAt(v);
  const d = side.days[day];
  const x = clamp(Math.round(v.x ?? 452), 0, d.width - 1);
  const y = clamp(Math.round(v.y ?? 422), 0, d.height - 1);
  const pos = readPosition(day, x, y);
  const marks = GROUPS.map(id => {
    const m = side.marks[id].marks.find(q => q.day === day);
    if (!m) return { id, mark: null };
    return {
      id,
      mark: m,
      pos: readPosition(day, m.x, m.y, side.marks[id].sigmaPx),
    };
  });
  return { day, d, x, y, pos, marks };
}

const FRAMES = {
  id: 'sun-frames',
  get title() {
    return t('sunW.f.title');
  },
  get note() {
    return t('sunW.f.note');
  },
  animated: false,
  controls: [
    dayControl('day'),
    bareControl(
      'x',
      'sunW.f.control.x',
      0,
      1023,
      1,
      452,
      x => `${fix(x, 0)} px`
    ),
    bareControl(
      'y',
      'sunW.f.control.y',
      0,
      1023,
      1,
      422,
      x => `${fix(x, 0)} px`
    ),
    toggleControl('marks', 'sunW.f.control.marks'),
    toggleControl('grid', 'sunW.f.control.grid', 0),
  ],
  draw(canvas, v) {
    const run = () => drawFace(canvas, v);
    last = { canvas, redraw: run };
    run();
  },
  readout(v) {
    const f = framesView(v);
    if (!f) return [statusRow()];
    const d = f.d;
    const rows = [
      {
        label: t('sunW.row.picture'),
        value: t('sunW.alt', {
          date: dateWords(d.date),
          n: d.groupsRead,
        }),
      },
      {
        label: t('sunW.f.row.geometry'),
        value: t('sunW.f.value.geometry', {
          b0: sgn(d.b0Deg, 2),
          l0: fix(d.l0Deg, 2),
          r: fix(d.disc.radiusPx, 1),
          scale: fix(d.arcsecPerPixel, 2),
        }),
      },
    ];
    if (f.pos.status === 'refused')
      rows.push({
        label: t('sunW.f.row.cross', { x: f.x, y: f.y }),
        value: t('sunW.f.value.offdisc'),
        emphasis: true,
      });
    else {
      rows.push({
        label: t('sunW.f.row.cross', { x: f.x, y: f.y }),
        value: t('sunW.f.value.cross', {
          lat: sgn(f.pos.latDeg, 1),
          lon: sgn(f.pos.lonStonyDeg, 1),
          car: fix(f.pos.lonCarringtonDeg, 1),
          mu: fix(f.pos.mu, 2),
          sigma: fix(f.pos.sigmaLonDeg, 2),
        }),
        emphasis: true,
      });
      if (f.pos.mu < MU_PRECISE)
        rows.push({
          label: t('sunW.f.row.limb'),
          value: t('sunW.f.value.limb', { mu: fix(MU_PRECISE, 2) }),
          emphasis: true,
        });
    }
    for (const m of f.marks)
      rows.push({
        label: t('sunW.f.row.mark', { id: m.id }),
        value: m.mark
          ? t('sunW.f.value.mark', {
              lat: sgn(m.pos.latDeg, 1),
              lon: sgn(m.pos.lonStonyDeg, 1),
              mu: fix(m.pos.mu, 2),
              sigma: fix(m.pos.sigmaLonDeg, 2),
              x: fix(m.mark.x, 1),
              y: fix(m.mark.y, 1),
            })
          : t('sunW.f.value.nomark'),
      });
    rows.push({
      label: t('sunW.row.assumes'),
      value: t('sunW.f.assumes'),
    });
    return rows;
  },
};

// -----------------------------------------------------------------------------
// sun-rotation
// -----------------------------------------------------------------------------

/** One group's rotation for the days the controls choose. Null while the sidecar loads. */
export function rotationView(v) {
  if (!side) return null;
  const id = GROUPS[clampIndex(v.group, GROUPS.length)];
  const first = clamp(Math.round(v.first ?? 1), 1, DAYS) - 1;
  const last0 = clamp(Math.round(v.last ?? 9), 1, DAYS) - 1;
  const limb = (v.limb ?? 0) >= 0.5;
  const minMu = limb ? 0.25 : undefined;
  const track = trackGroup(side, id, { first, last: last0, minMu });
  const mode = clampIndex(v.mode, 3);
  const tracks = GROUPS.map(g =>
    trackGroup(side, g, { first, last: last0, minMu })
  );
  return { id, first, last: last0, limb, track, mode, tracks };
}

/** The tracers a rate-against-latitude fit uses: each group's sidereal rate, its sigma with the floor. */
export function tracersOf(tracks) {
  return tracks
    .filter(x => x.status !== 'refused')
    .map(x => ({
      latDeg: x.latitude.deg,
      rate: x.sidereal.rate,
      sigma: Math.hypot(x.sidereal.sigma, 0.3),
    }));
}

const ROTATION = {
  id: 'sun-rotation',
  get title() {
    return t('sunW.r.title');
  },
  get note() {
    return t('sunW.r.note');
  },
  animated: false,
  controls: [
    bareControl('group', 'sunW.r.control.group', 0, 1, 1, 0, x =>
      t(`sunW.group.${GROUPS[Math.round(x)]}`)
    ),
    dayControl('first'),
    dayControl('last'),
    toggleControl('limb', 'sunW.r.control.limb', 0),
    bareControl('mode', 'sunW.r.control.mode', 0, 2, 1, 0, x =>
      t(`sunW.mode.${Math.round(x)}`)
    ),
  ],
  draw(canvas, v) {
    const f = rotationView(v);
    const host = hostOf(canvas, t('sunW.r.title'));
    if (!f) return undefined;
    let spec;
    if (f.mode === 0) {
      const t0 = f.track;
      const pts = t0.status === 'refused' ? [] : t0.points;
      const jd0 = pts.length ? pts[0].jd : 0;
      const series = [
        {
          id: 'marks',
          label: t('sunW.r.legend.marks'),
          x: pts.map(p => p.jd - jd0),
          y: pts.map(p => p.lonStonyDeg),
          sigma: pts.map(p => p.sigmaLonDeg),
          color: SERIES.blue,
          mode: 'points',
          radius: 4,
        },
      ];
      if (t0.status !== 'refused') {
        const span = pts[pts.length - 1].jd - jd0;
        const at = x =>
          pts[0].lonStonyDeg - (pts[0].residualDeg ?? 0) + t0.synodic.rate * x;
        series.push({
          id: 'fit',
          label: t('sunW.r.legend.fit', { r: fix(t0.synodic.rate, 2) }),
          x: [0, span],
          y: [at(0), at(span)],
          color: SERIES.green,
          width: 2,
          dash: [5, 3],
          mode: 'line',
        });
      }
      spec = {
        label: t('sunW.r.title'),
        xTitle: t('sunW.r.axis.t'),
        yTitle: t('sunW.r.axis.lon'),
        xNumber: x => fix(x, 0),
        yNumber: y => fix(y, 0),
        series,
      };
    } else {
      const tr = tracersOf(f.tracks);
      const lats = Array.from({ length: 31 }, (_, i) => -35 + (70 * i) / 30);
      const series = [
        {
          id: 'law',
          label: t('sunW.r.legend.law'),
          x: lats,
          y: lats.map(l => lawRate(l)),
          color: SERIES.orange,
          width: 2,
          mode: 'line',
        },
        {
          id: 'groups',
          label: t('sunW.r.legend.groups'),
          x: tr.map(p => p.latDeg),
          y: tr.map(p => p.rate),
          sigma: tr.map(p => p.sigma),
          color: SERIES.blue,
          mode: 'points',
          radius: 4,
        },
      ];
      const fit = tr.length ? fitRotationLaw(tr, { free: ['A'] }) : null;
      if (fit && fit.status !== 'refused')
        series.push({
          id: 'fit',
          label: t('sunW.r.legend.fitA', { a: fix(fit.params.A.value, 2) }),
          x: lats,
          y: lats.map(l =>
            lawRate(l, { ...PRIMARY_LAW, A: fit.params.A.value })
          ),
          color: SERIES.green,
          width: 2,
          dash: [5, 3],
          mode: 'line',
        });
      spec = {
        label: t('sunW.r.title'),
        xTitle: t('sunW.r.axis.lat'),
        yTitle: t('sunW.r.axis.rate'),
        xNumber: x => fix(x, 0),
        yNumber: y => fix(y, 1),
        series,
      };
    }
    host.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = rotationView(v);
    if (!f) return [statusRow()];
    if (f.mode === 0) return trackRows(f);
    return lawRows(f);
  },
};

function trackRows(f) {
  const tr = f.track;
  const rows = [
    {
      label: t('sunW.r.row.group'),
      value: t(`sunW.group.${f.id}`),
    },
  ];
  if (tr.status === 'refused') {
    rows.push({
      label: t('sunW.r.row.synodic'),
      value: t(`sunW.refused.${tr.code}`),
      emphasis: true,
    });
    return rows;
  }
  const lo = fix(tr.sidereal.periodLo, 1);
  const hi = fix(tr.sidereal.periodHi, 1);
  rows.push(
    {
      label: t('sunW.r.row.positions'),
      value: t('sunW.r.value.positions', {
        n: tr.nUsed,
        lat: sgn(tr.latitude.deg, 1),
      }),
    },
    {
      label: t('sunW.r.row.synodic'),
      value: t('sunW.r.value.rate', {
        r: fix(tr.synodic.rate, 2),
        s: fix(tr.synodic.sigma, 2),
      }),
      emphasis: true,
    },
    {
      label: t('sunW.r.row.synodicPeriod'),
      value: t('sunW.r.value.period', { p: fix(tr.synodic.period, 1) }),
    },
    {
      label: t('sunW.r.row.earth'),
      value: t('sunW.r.value.earth', { r: fix(tr.earthRate, 2) }),
    },
    {
      label: t('sunW.r.row.sidereal'),
      value: t('sunW.r.value.rate', {
        r: fix(tr.sidereal.rate, 2),
        s: fix(tr.sidereal.sigma, 2),
      }),
      emphasis: true,
    },
    {
      label: t('sunW.r.row.siderealPeriod'),
      value: t('sunW.r.value.periodRange', {
        p: fix(tr.sidereal.period, 1),
        lo,
        hi,
      }),
      emphasis: true,
    },
    {
      label: t('sunW.r.row.law'),
      value: t('sunW.r.value.law', {
        predicted: fix(tr.law.predicted, 2),
        diff: sgn(tr.law.difference, 2),
        total: fix(tr.law.sigmaTotal, 2),
        z: sgn(tr.law.z, 1),
      }),
    },
    {
      label: t('sunW.r.row.birge'),
      value: t(
        tr.birge > 1.5 ? 'sunW.r.value.birgeHigh' : 'sunW.r.value.birge',
        {
          b: fix(tr.birge, 2),
        }
      ),
    }
  );
  for (const w of tr.warnings)
    rows.push({
      label: t('sunW.r.row.warning'),
      value: t(`sunW.warn.${w.code}`, { mu: fix(MU_PRECISE, 2) }),
      emphasis: true,
    });
  rows.push({ label: t('sunW.row.assumes'), value: t('sunW.r.assumes') });
  return rows;
}

function lawRows(f) {
  const tr = tracersOf(f.tracks);
  const rows = [
    {
      label: t('sunW.r.row.latitudes'),
      value: t('sunW.r.value.latitudes', {
        n: new Set(tr.map(p => Math.round(Math.abs(p.latDeg)))).size,
        list: tr.map(p => `${sgn(p.latDeg, 1)}°`).join(', '),
      }),
    },
  ];
  const free = f.mode === 1 ? ['A'] : ['A', 'B', 'C'];
  const fit = fitRotationLaw(tr, { free });
  if (fit.status === 'refused') {
    rows.push({
      label: t('sunW.r.row.fit'),
      value: t(`sunW.refused.${fit.code}`, {
        free: free.length,
        n: tr.length,
      }),
      emphasis: true,
    });
    rows.push({ label: t('sunW.row.assumes'), value: t('sunW.r.assumes.law') });
    return rows;
  }
  rows.push(
    {
      label: t('sunW.r.row.A'),
      value: t('sunW.r.value.A', {
        a: fix(fit.params.A.value, 2),
        s: fix(fit.params.A.sigma, 2),
        ref: fix(PRIMARY_LAW.A, 2),
      }),
      emphasis: true,
    },
    {
      label: t('sunW.r.row.held'),
      value: t('sunW.r.value.held', {
        b: fix(PRIMARY_LAW.B, 2),
        c: fix(PRIMARY_LAW.C, 2),
      }),
    },
    {
      label: t('sunW.r.row.chi2'),
      value: t('sunW.r.value.chi2', {
        chi2: fix(fit.chi2, 2),
        dof: fit.dof,
      }),
    }
  );
  fit.residuals.forEach(r =>
    rows.push({
      label: t('sunW.r.row.residual', { lat: sgn(r.latDeg, 1) }),
      value: t('sunW.r.value.residual', {
        res: sgn(r.residual, 2),
        z: sgn(r.z, 1),
      }),
    })
  );
  rows.push({ label: t('sunW.row.assumes'), value: t('sunW.r.assumes.law') });
  return rows;
}

// -----------------------------------------------------------------------------
// sun-power
// -----------------------------------------------------------------------------

/** The irradiance for the first `days` measured days, corrected or not. Null while the sidecar loads. */
export function powerView(v) {
  if (!side) return null;
  const rows = measuredIrradiance(side);
  const n = clamp(Math.round(v.days ?? rows.length), 1, rows.length);
  const correct = (v.correct ?? 1) >= 0.5;
  const used = rows.slice(0, n);
  const chain = correct
    ? summariseIrradiance(side, n)
    : summariseFluxSeries(
        used.map(r => ({ fluxWm2: r.fluxEarth })),
        { instrument: side.sources.irradiance.instrument }
      );
  const right = summariseIrradiance(side, n);
  const fills = side.irradiance.filter(r => r.fill).length;
  return { rows, used, n, correct, chain, right, fills };
}

const IAU_L = 3.828e26;
const IAU_T = 5772;

const POWER = {
  id: 'sun-power',
  get title() {
    return t('sunW.p.title');
  },
  get note() {
    return t('sunW.p.note');
  },
  animated: false,
  controls: [
    bareControl('days', 'sunW.p.control.days', 1, 6, 1, 6, x => `${fix(x, 0)}`),
    toggleControl('correct', 'sunW.p.control.correct'),
  ],
  draw(canvas, v) {
    const f = powerView(v);
    const host = hostOf(canvas, t('sunW.p.title'));
    if (!f) return undefined;
    const x = f.used.map((_, i) => i + 1);
    const series = [
      {
        id: 'earth',
        label: t('sunW.p.legend.earth'),
        x,
        y: f.used.map(r => r.fluxEarth),
        sigma: f.used.map(r => r.sigma),
        color: SERIES.orange,
        mode: 'both',
        radius: 4,
      },
    ];
    if (f.correct)
      series.push({
        id: 'au',
        label: t('sunW.p.legend.au'),
        x,
        y: f.used.map(r => r.fluxEarth * r.distanceAu ** 2),
        sigma: f.used.map(r => r.sigma),
        color: SERIES.blue,
        mode: 'both',
        radius: 4,
      });
    const spec = {
      label: t('sunW.p.title'),
      xTitle: t('sunW.p.axis.day'),
      yTitle: t('sunW.p.axis.flux'),
      xNumber: x0 => fix(x0, 0),
      yNumber: y => fix(y, 0),
      series,
    };
    host.chart.draw(spec);
    return spec;
  },
  readout(v) {
    const f = powerView(v);
    if (!f) return [statusRow()];
    const first = f.used[0];
    const lastRow = f.used[f.used.length - 1];
    const at1 = r => r.fluxEarth * r.distanceAu ** 2;
    const c = f.chain;
    const rows = [
      {
        label: t('sunW.p.row.instrument'),
        value: t('sunW.p.value.instrument', {
          name: side.sources.irradiance.instrument,
          n: f.n,
          from: dateWords(first.date),
          to: dateWords(lastRow.date),
        }),
      },
      {
        label: t('sunW.p.row.earth'),
        value: t('sunW.p.value.earth', {
          a: fix(first.fluxEarth, 2),
          b: fix(lastRow.fluxEarth, 2),
          fall: fix(first.fluxEarth - lastRow.fluxEarth, 2),
        }),
      },
      {
        label: t('sunW.p.row.distance'),
        value: t('sunW.p.value.distance', {
          a: fix(first.distanceAu, 5),
          b: fix(lastRow.distanceAu, 5),
        }),
      },
      {
        label: t('sunW.p.row.au'),
        value: t('sunW.p.value.au', {
          a: fix(at1(first), 2),
          b: fix(at1(lastRow), 2),
          fall: fix(at1(first) - at1(lastRow), 2),
        }),
        emphasis: true,
      },
    ];
    if (c.status === 'refused') {
      rows.push({
        label: t('sunW.p.row.luminosity'),
        value: t(`sunW.refused.${c.code}`),
        emphasis: true,
      });
      return rows;
    }
    rows.push(
      {
        label: t('sunW.p.row.mean'),
        value: t(f.correct ? 'sunW.p.value.mean' : 'sunW.p.value.meanRaw', {
          m: fix(c.meanFluxAt1Au, 2),
          s: fix(c.standardError, 2),
        }),
      },
      {
        label: t('sunW.p.row.luminosity'),
        value: t('sunW.p.value.luminosity', {
          l: fix(c.luminosityW / 1e26, 3),
          s: fix(c.sigmaLuminosityW / 1e22, 1),
          diff: sgn((100 * (c.luminosityW - IAU_L)) / IAU_L, 2),
        }),
        emphasis: true,
      },
      {
        label: t('sunW.p.row.teff'),
        value: t('sunW.p.value.teff', {
          k: fix(c.teffK, 1),
          s: fix(c.sigmaTeffK, 1),
          diff: sgn(c.teffK - IAU_T, 1),
        }),
        emphasis: true,
      }
    );
    if (!f.correct)
      rows.push({
        label: t('sunW.p.row.wrong'),
        value: t('sunW.p.value.wrong', {
          pct: fix(
            (100 * (f.right.luminosityW - c.luminosityW)) / f.right.luminosityW,
            1
          ),
        }),
        emphasis: true,
      });
    rows.push(
      {
        label: t('sunW.p.row.fill'),
        value: t('sunW.p.value.fill', { n: f.fills }),
      },
      { label: t('sunW.row.assumes'), value: t('sunW.p.assumes') }
    );
    return rows;
  },
};

export const SUN_WIDGETS = [FRAMES, ROTATION, POWER];
